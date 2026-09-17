import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockBanco } from "../../test/mock-banco";
import { paraChave } from "./agenda";

vi.mock("./banco", () => ({
  banco: vi.fn(),
  bancoConfigurado: vi.fn(() => true),
}));

import { banco } from "./banco";
import {
  agendamentosConcluidosOntem,
  agendamentosDeAmanha,
  buscarAgendamento,
  mesDeVagas,
  criarAgendamento,
  criarAgendamentoNoPainel,
  horaEmMinutos,
  marcarAvisoEnviado,
  mudarSituacao,
  procurarAgendamentos,
  relatorioDoMes,
  remarcarAgendamento,
} from "./agendamentos";

const bancoMock = vi.mocked(banco);

/** Uma chave de dia útil bem no futuro (o motor recusa hoje e fim de semana). */
function diaUtilFuturo(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return paraChave(d);
}

function usarBanco(handlers: Parameters<typeof mockBanco>[0]) {
  const m = mockBanco(handlers);
  bancoMock.mockReturnValue(m.cliente as never);
  return m;
}

beforeEach(() => {
  delete process.env.NOTIFICADOR_WEBHOOK_URL; // notificações viram no-op
  bancoMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("criarAgendamento", () => {
  it("grava quando o horário está livre", async () => {
    const m = usarBanco({
      select: () => ({ data: [], error: null }), // nada ocupado
      insert: () => ({ data: { id: "ag-novo" }, error: null }),
    });

    const r = await criarAgendamento({
      servicoId: "design-simples",
      chaveDia: diaUtilFuturo(),
      inicioMin: 7 * 60,
      nome: "  Fulana de Tal  ",
      whatsapp: "(18) 99999-8888",
    });

    expect(r).toMatchObject({ ok: true, id: "ag-novo" });
    const insert = m.chamadas.find((c) => c.op === "insert");
    expect(insert?.tabela).toBe("agendamentos");
    expect(insert?.valores).toMatchObject({
      cliente_nome: "Fulana de Tal",
      cliente_whatsapp: "18999998888",
      servico_id: "design-simples",
      servico_preco: 2500,
    });
  });

  /**
   * ⚠️ QUEM ESPERA E QUEM CONFIRMA NA HORA.
   *
   * Ela deu duas respostas que pareciam brigar: "pode valer na hora e eu só
   * recebo o aviso" E "cobro 50% de sinal nos de R$ 80 ou mais". As duas
   * valem — cada uma pra uma faixa de preço.
   *
   * Uma versão anterior punha TODO agendamento como `pendente`, inclusive o
   * design de R$ 25. A cliente marcava e ficava no vácuo esperando uma
   * aprovação que a Karol nem sabia que precisava dar.
   */
  it("serviço abaixo do mínimo confirma na hora", async () => {
    const m = usarBanco({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: { id: "ag-novo" }, error: null }),
    });

    await criarAgendamento({
      servicoId: "design-simples", // R$ 25
      chaveDia: diaUtilFuturo(),
      inicioMin: 7 * 60,
      nome: "Fulana de Tal",
      whatsapp: "(18) 99999-8888",
    });

    const insert = m.chamadas.find((c) => c.op === "insert");
    expect(insert?.valores).toMatchObject({ situacao: "confirmado" });
  });

  it("serviço que pede sinal fica pendente até ela conferir o PIX", async () => {
    const m = usarBanco({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: { id: "ag-novo" }, error: null }),
    });

    await criarAgendamento({
      servicoId: "brow-lamination", // R$ 80
      chaveDia: diaUtilFuturo(),
      inicioMin: 7 * 60,
      nome: "Fulana de Tal",
      whatsapp: "(18) 99999-8888",
    });

    const insert = m.chamadas.find((c) => c.op === "insert");
    expect(insert?.valores).toMatchObject({ situacao: "pendente" });
  });

  it("recusa serviço inexistente", async () => {
    usarBanco({});
    const r = await criarAgendamento({
      servicoId: "nao-existe",
      chaveDia: diaUtilFuturo(),
      inicioMin: 420,
      nome: "Fulana",
      whatsapp: "18999998888",
    });
    expect(r).toEqual({ ok: false, erro: "Serviço não encontrado." });
  });

  it("recusa horário que não está na grade livre", async () => {
    usarBanco({ select: () => ({ data: [], error: null }) });
    const r = await criarAgendamento({
      servicoId: "design-simples",
      chaveDia: diaUtilFuturo(),
      inicioMin: 3 * 60, // 03:00 — fora do expediente
      nome: "Fulana",
      whatsapp: "18999998888",
    });
    expect(r).toMatchObject({ ok: false });
    expect(r.ok === false && r.erro).toMatch(/não está mais disponível/i);
  });

  /*
    ⚠️ O CASO QUE A MUDANÇA DE 16/09/2026 CRIOU.

    A grade passou de 15 em 15 pra hora cheia. Quem estivesse com a página
    de agendamento aberta na hora do deploy continuava vendo 07:15 na tela
    — um horário que o servidor não oferece mais.

    O POST tinha que ser recusado, e é: a conferência é contra a grade
    viva, não contra o que a tela mostrava. Este teste existe pra ninguém
    "consertar" isso passando a aceitar qualquer minuto — seria abrir uma
    porta de encaixe sem a Karol saber.
  */
  it("recusa 07:15 de uma página velha: a grade só tem hora cheia", async () => {
    usarBanco({ select: () => ({ data: [], error: null }) });
    const r = await criarAgendamento({
      servicoId: "design-simples",
      chaveDia: diaUtilFuturo(),
      inicioMin: 7 * 60 + 15, // 07:15 — dentro do expediente, fora da grade
      nome: "Fulana",
      whatsapp: "18999998888",
    });
    expect(r).toMatchObject({ ok: false });
    // e a frase manda recarregar, que é o que resolve pra ela
    expect(r.ok === false && r.erro).toMatch(/recarregue/i);
  });

  it("traduz o choque do banco (23P01) numa mensagem amigável", async () => {
    usarBanco({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: { code: "23P01" } }),
    });
    const r = await criarAgendamento({
      servicoId: "design-simples",
      chaveDia: diaUtilFuturo(),
      inicioMin: 7 * 60,
      nome: "Fulana",
      whatsapp: "18999998888",
    });
    expect(r).toMatchObject({ ok: false });
    expect(r.ok === false && r.erro).toMatch(/ocupado/i);
  });
});

describe("mudarSituacao", () => {
  it("recusa id e situação inválidos sem tocar no banco", async () => {
    usarBanco({});
    expect(await mudarSituacao("nao-e-uuid", "confirmado")).toMatchObject({ ok: false });
    expect(await mudarSituacao("0".repeat(36), "aprovado")).toMatchObject({ ok: false });
  });

  it("atualiza quando id e situação são válidos", async () => {
    const m = usarBanco({ update: () => ({ error: null }) });
    const r = await mudarSituacao("0".repeat(36), "concluido");
    expect(r).toEqual({ ok: true });
    expect(m.chamadas.find((c) => c.op === "update")?.valores).toEqual({ situacao: "concluido" });
  });

  it("explica o 23P01 ao reativar num horário já retomado", async () => {
    usarBanco({ update: () => ({ error: { code: "23P01" } }) });
    const r = await mudarSituacao("0".repeat(36), "confirmado");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/retomad/i);
  });
});

describe("buscarAgendamento", () => {
  it("devolve null pra id malformado sem consultar", async () => {
    const m = usarBanco({});
    expect(await buscarAgendamento("abc")).toBeNull();
    expect(m.chamadas).toHaveLength(0);
  });

  it("mapeia a linha do banco pro tipo da aplicação", async () => {
    usarBanco({
      select: () => ({
        data: {
          id: "0".repeat(36),
          cliente_nome: "Joana",
          cliente_whatsapp: "5518999990000",
          servico_id: "design-henna",
          servico_nome: "Design com henna",
          servico_preco: 3000,
          cidade: "Pereira Barreto",
          periodo: "[2026-09-10T10:00:00.000Z,2026-09-10T11:00:00.000Z)",
          situacao: "confirmado",
          observacao: null,
        },
        error: null,
      }),
    });

    const ag = await buscarAgendamento("0".repeat(36));
    expect(ag).toMatchObject({
      clienteNome: "Joana",
      servicoNome: "Design com henna",
      situacao: "confirmado",
    });
    expect(ag!.inicio.toISOString()).toBe("2026-09-10T10:00:00.000Z");
  });
});

describe("horaEmMinutos", () => {
  it("converte hora válida", () => {
    expect(horaEmMinutos("07:00")).toBe(420);
    expect(horaEmMinutos("8:30")).toBe(510);
    expect(horaEmMinutos("23:59")).toBe(1439);
  });

  it("recusa o que não é hora", () => {
    for (const ruim of ["24:00", "07:60", "sete", "", "7", "07:0"]) {
      expect(horaEmMinutos(ruim)).toBeNull();
    }
  });
});

describe("criarAgendamentoNoPainel", () => {
  const base = {
    servicoId: "design-simples",
    cidade: "pereira-barreto" as const,
    chaveDia: diaUtilFuturo(),
    hora: "07:00",
    nome: "Mãe da Karol",
    whatsapp: "",
  };

  it("grava e devolve o id", async () => {
    const m = usarBanco({ insert: () => ({ data: { id: "ag-painel" } }) });
    const r = await criarAgendamentoNoPainel(base);
    expect(r).toEqual({ ok: true, id: "ag-painel" });
    expect(m.chamadas.find((c) => c.op === "insert")?.tabela).toBe("agendamentos");
  });

  /**
   * O ponto do formulário do painel: ela pode encaixar em QUALQUER horário,
   * não só nas horas cheias que o site oferece. Quem impede choque é a
   * trava do banco, então liberdade aqui não custa segurança.
   *
   * ⚠️ ESTE TESTE FICOU MAIS IMPORTANTE em 16/09/2026. Com a grade de hora
   * cheia, os 18:30 e os 07:15 saíram da tela da cliente — e é AQUI que
   * eles continuam existindo. Se este teste cair, ela perdeu o encaixe.
   */
  it("aceita horário fora da grade de hora cheia", async () => {
    usarBanco({ insert: () => ({ data: { id: "ag-encaixe" } }) });
    const r = await criarAgendamentoNoPainel({ ...base, hora: "07:07" });
    expect(r.ok).toBe(true);
  });

  /**
   * ⚠️ EXPEDIENTE VALE PRO PAINEL TAMBÉM, decisão do Kainã em 12/09.
   *
   * Uma auditoria apontou que nem o painel nem o assistente olhavam o
   * expediente na hora de gravar. No assistente era grave (quem propõe é
   * um modelo); no painel, um toque errado marcava alguém às 3 da manhã
   * sem nada reclamar.
   */
  it("recusa horário fora do expediente, sem gravar nada", async () => {
    const m = usarBanco({ insert: () => ({ data: { id: "nao-deveria" } }) });
    const r = await criarAgendamentoNoPainel({ ...base, hora: "03:00" });

    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/fora do expediente/i);
    expect(m.chamadas.find((c) => c.op === "insert")).toBeUndefined();
  });

  it("recusa horário em cima de um bloqueio", async () => {
    const m = usarBanco({
      select: (tabela) => (tabela === "bloqueios" ? { data: [{ motivo: "viagem" }] } : { data: [] }),
      insert: () => ({ data: { id: "nao-deveria" } }),
    });
    const r = await criarAgendamentoNoPainel(base);

    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/bloqueado.*viagem/i);
    expect(m.chamadas.find((c) => c.op === "insert")).toBeUndefined();
  });

  it("sem WhatsApp usa o número da própria Karol, que o banco exige", async () => {
    const m = usarBanco({ insert: () => ({ data: { id: "x" } }) });
    await criarAgendamentoNoPainel({ ...base, whatsapp: "" });
    const gravado = m.chamadas.find((c) => c.op === "insert")?.valores;
    expect(String(gravado?.cliente_whatsapp)).toMatch(/^\d{10,13}$/);
  });

  it("recusa choque com mensagem de gente", async () => {
    usarBanco({ insert: () => ({ error: { code: "23P01" } }) });
    const r = await criarAgendamentoNoPainel(base);
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/já existe atendimento/i);
  });

  it("recusa hora e nome inválidos antes de tocar no banco", async () => {
    const m = usarBanco({ insert: () => ({ data: { id: "x" } }) });
    expect((await criarAgendamentoNoPainel({ ...base, hora: "25:00" })).ok).toBe(false);
    expect((await criarAgendamentoNoPainel({ ...base, nome: "A" })).ok).toBe(false);
    expect((await criarAgendamentoNoPainel({ ...base, whatsapp: "123" })).ok).toBe(false);
    expect(m.chamadas.filter((c) => c.op === "insert")).toHaveLength(0);
  });
});

describe("remarcarAgendamento", () => {
  const linha = (periodo: string) => ({
    id: "0".repeat(36),
    cliente_nome: "Fulana",
    cliente_whatsapp: "5518999998888",
    servico_id: "design-simples",
    servico_nome: "Design de sobrancelha",
    servico_preco: 2500,
    cidade: "Pereira Barreto",
    periodo,
    situacao: "confirmado",
    observacao: null,
  });

  it("muda o período mantendo o resto", async () => {
    const m = usarBanco({
      select: () => ({ data: linha('["2099-06-01 10:00:00+00","2099-06-01 10:50:00+00")') }),
      update: () => ({}),
    });
    const r = await remarcarAgendamento("0".repeat(36), diaUtilFuturo(), "09:00");
    expect(r.ok).toBe(true);
    const gravado = m.chamadas.find((c) => c.op === "update")?.valores;
    expect(Object.keys(gravado ?? {})).toEqual(["periodo"]);
  });

  it("recusa choque ao remarcar", async () => {
    usarBanco({
      select: () => ({ data: linha('["2099-06-01 10:00:00+00","2099-06-01 10:50:00+00")') }),
      update: () => ({ error: { code: "23P01" } }),
    });
    const r = await remarcarAgendamento("0".repeat(36), diaUtilFuturo(), "09:00");
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/já existe atendimento/i);
  });

  it("recusa id e hora inválidos", async () => {
    usarBanco({ select: () => ({ data: null }) });
    expect((await remarcarAgendamento("nao-e-uuid", "2099-06-01", "09:00")).ok).toBe(false);
    expect((await remarcarAgendamento("0".repeat(36), "2099-06-01", "9h")).ok).toBe(false);
  });
});

describe("relatorioDoMes", () => {
  const linha = (situacao: string, preco: number, servico: string, cidade: string) => ({
    id: "0".repeat(36),
    cliente_nome: "Fulana",
    cliente_whatsapp: "5518999998888",
    servico_id: "design-simples",
    servico_nome: servico,
    servico_preco: preco,
    cidade,
    periodo: '["2026-09-08 10:00:00+00","2026-09-08 10:50:00+00")',
    situacao,
    observacao: null,
  });

  /**
   * O ponto que decide o relatório: faturamento conta só o que ela marcou
   * como Atendida. Confirmado que ainda não aconteceu não é dinheiro.
   */
  it("só soma o que foi concluído", async () => {
    usarBanco({
      select: () => ({
        data: [
          linha("concluido", 2500, "Design de sobrancelha", "Pereira Barreto"),
          linha("concluido", 10000, "Maquiagem social", "Pereira Barreto"),
          linha("confirmado", 8000, "Brow lamination", "Pereira Barreto"), // não conta
          linha("faltou", 2500, "Design de sobrancelha", "Pereira Barreto"), // não conta
          linha("cancelado", 2500, "Design de sobrancelha", "Pereira Barreto"), // não conta
        ],
      }),
    });

    const r = await relatorioDoMes(2026, 8);
    expect(r.faturamento).toBe(12500);
    expect(r.atendidas).toBe(2);
    expect(r.faltaram).toBe(1);
    expect(r.canceladas).toBe(1);
    expect(r.pendentes).toBe(1);
  });

  it("ticket médio é sobre as atendidas, não sobre tudo", async () => {
    usarBanco({
      select: () => ({
        data: [
          linha("concluido", 2500, "Design de sobrancelha", "Pereira Barreto"),
          linha("concluido", 10000, "Maquiagem social", "Pereira Barreto"),
          linha("confirmado", 99999, "Brow lamination", "Pereira Barreto"),
        ],
      }),
    });
    const r = await relatorioDoMes(2026, 8);
    expect(r.ticketMedio).toBe(6250); // (2500 + 10000) / 2
  });

  it("taxa de falta é sobre o que já passou, não sobre o mês todo", async () => {
    usarBanco({
      select: () => ({
        data: [
          linha("concluido", 2500, "Design de sobrancelha", "Pereira Barreto"),
          linha("faltou", 2500, "Design de sobrancelha", "Pereira Barreto"),
          // dez confirmados que ainda vão acontecer não podem diluir a taxa
          ...Array.from({ length: 10 }, () =>
            linha("confirmado", 2500, "Design de sobrancelha", "Pereira Barreto"),
          ),
        ],
      }),
    });
    const r = await relatorioDoMes(2026, 8);
    expect(r.taxaFalta).toBe(50); // 1 falta de 2 que passaram
  });

  it("agrupa por serviço e por cidade, do que mais rende pro que menos", async () => {
    usarBanco({
      select: () => ({
        data: [
          linha("concluido", 2500, "Design de sobrancelha", "Pereira Barreto"),
          linha("concluido", 2500, "Design de sobrancelha", "Pereira Barreto"),
          linha("concluido", 10000, "Maquiagem social", "Bandeirantes D'Oeste"),
        ],
      }),
    });
    const r = await relatorioDoMes(2026, 8);
    expect(r.porServico[0]).toEqual({ nome: "Maquiagem social", quantidade: 1, total: 10000 });
    expect(r.porServico[1]).toEqual({ nome: "Design de sobrancelha", quantidade: 2, total: 5000 });
    expect(r.porCidade.map((c) => c.nome)).toEqual(["Bandeirantes D'Oeste", "Pereira Barreto"]);
  });

  it("mês sem nada devolve zeros, não quebra", async () => {
    usarBanco({ select: () => ({ data: [] }) });
    const r = await relatorioDoMes(2026, 8);
    expect(r).toMatchObject({ atendidas: 0, faturamento: 0, ticketMedio: 0, taxaFalta: 0 });
    expect(r.porServico).toEqual([]);
  });
});

/**
 * O furo silencioso do relatório.
 *
 * O faturamento conta só quem foi marcada como Atendida, e a Karol marca no
 * fim do dia, quando lembra. Cada esquecimento é dinheiro que aconteceu e
 * não aparece — e o relatório errava pra baixo sem nenhum sinal na tela de
 * que estava errando.
 */
describe("relatório: atendimentos sem marcação", () => {
  /**
   * ⚠️ As datas aqui são RELATIVAS a agora, de propósito. Com data fixa,
   * "está no futuro" vira "está no passado" quando o calendário alcança o
   * teste, e ele passa a falhar sozinho meses depois sem ninguém ter
   * mexido em nada.
   */
  const linhaEm = (horasDaqui: number, situacao: string, preco = 2500) => {
    const inicio = new Date(Date.now() + horasDaqui * 3600_000);
    const fim = new Date(inicio.getTime() + 50 * 60_000);
    return {
      id: "0".repeat(36),
      cliente_nome: "Fulana",
      cliente_whatsapp: "5518999998888",
      servico_id: "design-simples",
      servico_nome: "Design de sobrancelha",
      servico_preco: preco,
      cidade: "Pereira Barreto",
      periodo: `["${inicio.toISOString()}","${fim.toISOString()}")`,
      situacao,
      observacao: null,
    };
  };

  const hoje = new Date();
  const doMesAtual = () => relatorioDoMes(hoje.getFullYear(), hoje.getMonth());

  it("lista o confirmado cuja hora já passou", async () => {
    usarBanco({ select: () => ({ data: [linhaEm(-3, "confirmado", 8000)] }) });

    const r = await doMesAtual();
    expect(r.aMarcar).toHaveLength(1);
    expect(r.aMarcarValor).toBe(8000);
    expect(r.aMarcar[0].valor).toBe(8000);
  });

  it("não lista o confirmado que ainda vai acontecer", async () => {
    usarBanco({ select: () => ({ data: [linhaEm(+3, "confirmado")] }) });

    const r = await doMesAtual();
    expect(r.aMarcar).toHaveLength(0);
    expect(r.aMarcarValor).toBe(0);
    // continua contando como pendente, que é o que ele é
    expect(r.pendentes).toBe(1);
  });

  it("não lista o que já foi resolvido", async () => {
    usarBanco({
      select: () => ({
        data: [linhaEm(-5, "concluido"), linhaEm(-4, "faltou"), linhaEm(-3, "cancelado")],
      }),
    });

    const r = await doMesAtual();
    expect(r.aMarcar).toHaveLength(0);
  });
});

/**
 * Novas contra as que voltaram.
 *
 * O relatório precisa de três consultas pra montar isso, e elas saem na
 * ordem: o mês, o mês anterior, o histórico de quem foi atendida. O mock
 * devolve por ORDEM DE CHAMADA porque as três batem na mesma tabela e o
 * handler não vê os filtros.
 */
describe("relatório: quem já tinha vindo antes", () => {
  const atendida = (whatsapp: string, preco = 2500) => ({
    id: "0".repeat(36),
    cliente_nome: "Fulana",
    cliente_whatsapp: whatsapp,
    servico_id: "design-simples",
    servico_nome: "Design de sobrancelha",
    servico_preco: preco,
    cidade: "Pereira Barreto",
    periodo: '["2026-09-08 10:00:00+00","2026-09-08 10:50:00+00")',
    situacao: "concluido",
    observacao: null,
  });

  /** Devolve uma resposta diferente pra cada select, na ordem. */
  function emSequencia(respostas: unknown[][]) {
    let i = 0;
    usarBanco({ select: () => ({ data: respostas[i++] ?? [] }) });
  }

  it("separa quem já tinha vindo de quem é nova", async () => {
    emSequencia([
      [atendida("5518911111111"), atendida("5518922222222")], // o mês
      [], // mês anterior: sem histórico
      [{ cliente_whatsapp: "5518911111111" }], // só a primeira já tinha vindo
    ]);

    const r = await relatorioDoMes(2026, 8);
    expect(r.retornaram).toBe(1);
    expect(r.novas).toBe(1);
  });

  /**
   * Quem faz sobrancelha volta de 15 em 15 dias, então a MESMA pessoa
   * aparece duas vezes no mesmo mês. Contando por atendimento em vez de
   * por pessoa, ela inflaria o número de "novas" sozinha.
   */
  it("conta a mesma pessoa uma vez, mesmo com dois atendimentos no mês", async () => {
    emSequencia([
      [atendida("5518911111111"), atendida("5518911111111")],
      [],
      [], // nunca tinha vindo antes
    ]);

    const r = await relatorioDoMes(2026, 8);
    expect(r.novas).toBe(1);
    expect(r.retornaram).toBe(0);
    expect(r.atendidas).toBe(2); // dois atendimentos, uma cliente
  });

  it("traz o mês anterior pra comparar", async () => {
    emSequencia([
      [atendida("5518911111111", 10000)],
      [{ servico_preco: 2500 }, { servico_preco: 2500 }],
      [],
    ]);

    const r = await relatorioDoMes(2026, 8);
    expect(r.anterior).toEqual({ faturamento: 5000, atendidas: 2 });
  });

  it("mês anterior vazio não vira zero, vira nulo", async () => {
    emSequencia([[atendida("5518911111111")], [], []]);

    // Zero e "não sei" são coisas diferentes: com zero a tela mostraria
    // "+100% que agosto" num mês que simplesmente não tem histórico.
    const r = await relatorioDoMes(2026, 8);
    expect(r.anterior).toBeNull();
  });
});

describe("procurarAgendamentos", () => {
  /** Os filtros da última consulta, achatados pra facilitar a asserção. */
  function filtrosDa(m: ReturnType<typeof usarBanco>) {
    return m.chamadas.at(-1)!.filtros.map((f) => `${f.metodo}:${f.coluna ?? ""}=${f.valor}`);
  }

  /**
   * ⚠️ A busca por CÓDIGO foi removida do projeto.
   *
   * Existia um caminho que lia seis caracteres hexadecimais e os traduzia
   * num intervalo de uuid. Saiu a pedido do Kainã: era mais uma coisa pra
   * Karol decorar e explicar pra cliente, e ela já tem na mão as duas que
   * resolvem — o nome e o telefone de quem está falando com ela.
   *
   * Este teste existe pra o caminho não voltar por engano: seis caracteres
   * hexadecimais têm que cair na busca por NOME, como qualquer outro texto.
   */
  it("o que parecia código não vira mais consulta por id", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    await procurarAgendamentos("8C6377");

    const filtros = filtrosDa(m);
    // nada de intervalo de uuid: esse caminho não existe mais
    expect(filtros.some((f) => f.startsWith("gte:id"))).toBe(false);
    expect(filtros.some((f) => f.startsWith("lte:id"))).toBe(false);
    // "8C6377" tem cinco dígitos, então cai na busca por telefone, que é
    // o comportamento de qualquer texto com número — sem caso especial.
    expect(filtros).toContain("ilike:cliente_whatsapp=%86377%");
  });

  it("procura por telefone quando vêm 4 dígitos ou mais", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    await procurarAgendamentos("(18) 99752-5291");
    expect(filtrosDa(m)).toContain("ilike:cliente_whatsapp=%18997525291%");
  });

  it("procura por nome quando não são 4 dígitos ou mais", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    await procurarAgendamentos("Maria");
    expect(filtrosDa(m)).toContain("ilike:cliente_nome=%Maria%");
  });

  it("escapa os curingas do LIKE no nome", async () => {
    // sem escapar, "%" casaria com a agenda inteira
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    await procurarAgendamentos("100%");
    expect(filtrosDa(m)).toContain("ilike:cliente_nome=%100\\%%");
  });

  it("nem toca no banco com termo curto demais", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    expect(await procurarAgendamentos("ab")).toEqual([]);
    expect(await procurarAgendamentos("   ")).toEqual([]);
    expect(m.chamadas).toHaveLength(0);
  });

  /**
   * Duas clientes com o mesmo primeiro nome é o caso comum, não a exceção.
   * A busca devolve as duas e a Karol escolhe — devolver "a primeira" seria
   * o sistema decidindo por ela sem avisar.
   */
  it("devolve LISTA quando o nome casa com mais de uma", async () => {
    const m = usarBanco({
      select: () => ({
        data: [
          linhaFalsa("8c6377a1-0000-4000-8000-000000000001", "Ana Paula"),
          linhaFalsa("8c6377b2-0000-4000-8000-000000000002", "Ana Clara"),
        ],
        error: null,
      }),
    });
    const achados = await procurarAgendamentos("Ana");
    expect(achados.map((a) => a.clienteNome)).toEqual(["Ana Paula", "Ana Clara"]);
    expect(m.chamadas).toHaveLength(1);
  });

  it("põe teto no resultado", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    await procurarAgendamentos("Maria");
    expect(filtrosDa(m).some((f) => f.startsWith("limit:"))).toBe(true);
  });
});

/** Linha crua da tabela, como o PostgREST devolveria. */
function linhaFalsa(id: string, nome: string) {
  return {
    id,
    cliente_nome: nome,
    cliente_whatsapp: "5518999998888",
    servico_id: "design-simples",
    servico_nome: "Design de sobrancelha",
    servico_preco: 2500,
    cidade: "Pereira Barreto",
    periodo: '["2026-10-05 10:00:00+00","2026-10-05 10:50:00+00")',
    situacao: "confirmado",
    observacao: null,
  };
}

/**
 * O calendário do `/agendar`.
 *
 * O bug que este bloco existe pra impedir apareceu em produção no dia
 * 07/09/2026, uma segunda-feira: quem abriu o site viu a primeira semana
 * inteira apagada, com a legenda dizendo "não atende" — e concluiu que a
 * agenda estava fechada.
 *
 * Segunda é dia útil dela em Pereira Barreto. O que estava errado não era
 * a disponibilidade, era a FRASE: dia vencido e dia em que ela não
 * trabalha caíam na mesma célula cinza, com o mesmo rótulo.
 */
describe("mesDeVagas: o que o calendário tem que saber dizer", () => {
  const hoje = new Date();

  function usarBancoVazio() {
    usarBanco({ select: () => ({ data: [] }) });
  }

  /** O dia de hoje, dentro do mês de hoje. */
  async function diasDesteMes(cidade: "pereira-barreto" | "bandeirantes") {
    usarBancoVazio();
    const servico = buscarServicoDeTeste();
    return mesDeVagas(servico, cidade, hoje.getFullYear(), hoje.getMonth());
  }

  function buscarServicoDeTeste() {
    return {
      id: "design-simples",
      nome: "Design de sobrancelha",
      preco: 25,
      duracaoMinMin: 30,
      duracaoMaxMin: 40,
      descricao: "",
      categoria: "sobrancelha" as const,
      agendavel: true,
    };
  }

  it("marca o que já passou como passou, não como dia sem atendimento", async () => {
    const dias = await diasDesteMes("pereira-barreto");
    const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);

    // só vale se ontem caiu no mesmo mês
    if (ontem.getMonth() !== hoje.getMonth()) return;

    const d = dias.find((x) => x.numero === ontem.getDate())!;
    expect(d.passou).toBe(true);
  });

  it("hoje NÃO é 'passou' — é cedo demais, que é outra coisa", async () => {
    const dias = await diasDesteMes("pereira-barreto");
    const d = dias.find((x) => x.numero === hoje.getDate())!;

    expect(d.passou).toBe(false);
    // ela pediu antecedência de 1 dia: hoje nunca é agendável
    expect(d.cedoDemais).toBe(true);
  });

  /**
   * O coração do bug. Num dia de semana, `atende` tem que continuar
   * verdadeiro mesmo com o dia vencido — é isso que permite a tela dizer
   * "já passou" em vez de "ela não atende".
   */
  it("num dia de semana, 'atende' continua verdadeiro mesmo já tendo passado", async () => {
    const dias = await diasDesteMes("pereira-barreto");

    const diaUtilVencido = dias.find(
      (d) => (d.passou || d.cedoDemais) && d.data.getDay() >= 1 && d.data.getDay() <= 5,
    );
    if (!diaUtilVencido) return; // mês que começou no fim de semana

    expect(diaUtilVencido.atende).toBe(true);
  });

  it("domingo atende em Pereira Barreto e não em Bandeirantes", async () => {
    const pb = await diasDesteMes("pereira-barreto");
    const bd = await diasDesteMes("bandeirantes");

    const domingoPB = pb.filter((d) => d.data.getDay() === 0);
    const domingoBD = bd.filter((d) => d.data.getDay() === 0);

    expect(domingoPB.length).toBeGreaterThan(0);
    expect(domingoBD.length).toBeGreaterThan(0);
    expect(domingoPB.every((d) => d.atende === true)).toBe(true);
    expect(domingoBD.every((d) => d.atende === false)).toBe(true);
  });

  it("sábado atende em Bandeirantes e não em Pereira Barreto", async () => {
    const pb = await diasDesteMes("pereira-barreto");
    const bd = await diasDesteMes("bandeirantes");

    const sabadoPB = pb.filter((d) => d.data.getDay() === 6);
    const sabadoBD = bd.filter((d) => d.data.getDay() === 6);

    expect(sabadoPB.every((d) => d.atende === false)).toBe(true);
    expect(sabadoBD.every((d) => d.atende === true)).toBe(true);
  });
});

/**
 * As duas varreduras de aviso, e a marca que impede a repetição.
 *
 * ---------------------------------------------------------------------
 * Por que o filtro é testado aqui e não em `lembretes.test.ts`
 * ---------------------------------------------------------------------
 *
 * Lá o módulo inteiro é mockado — a consulta ao banco não existe. Quem
 * testa a costura é lá; quem testa a CONSULTA é aqui, e sem isto o
 * `is("lembrete_enviado_em", null)` podia sumir num refactor sem nenhum
 * teste ficar vermelho.
 *
 * O defeito real: em 07/09/2026 a mesma cliente recebeu o mesmo lembrete
 * às 7:03 e às 7:46, porque o botão do painel chama a mesma varredura que
 * o cron e nada marcava quem já tinha sido avisado.
 */
describe("varreduras de aviso: não pegar quem já foi avisado", () => {
  const filtrosDe = (c: { filtros: { metodo: string; coluna?: string; valor?: unknown }[] }) =>
    c.filtros.map((f) => `${f.metodo}:${f.coluna}=${String(f.valor)}`);

  it("o lembrete da véspera só pega quem ainda não recebeu", async () => {
    const m = usarBanco({ select: () => ({ data: [] }) });

    await agendamentosDeAmanha();

    expect(filtrosDe(m.chamadas[0])).toContain("is:lembrete_enviado_em=null");
    // E continua pegando só confirmado: lembrar quem cancelou é pior que
    // não lembrar ninguém.
    expect(filtrosDe(m.chamadas[0])).toContain("eq:situacao=confirmado");
  });

  it("o agradecimento tem o filtro DELE, não o do lembrete", async () => {
    const m = usarBanco({ select: () => ({ data: [] }) });

    await agendamentosConcluidosOntem();

    /*
      ⚠️ Copiar a linha do lembrete pra cá é o erro fácil, e ele não
      quebra nada: as duas consultas são quase idênticas. O agradecimento
      passaria a depender da marca do lembrete — quem recebeu o lembrete
      da véspera nunca receberia o agradecimento.
    */
    expect(filtrosDe(m.chamadas[0])).toContain("is:agradecimento_enviado_em=null");
    expect(filtrosDe(m.chamadas[0])).not.toContain("is:lembrete_enviado_em=null");
    expect(filtrosDe(m.chamadas[0])).toContain("eq:situacao=concluido");
  });
});

describe("marcarAvisoEnviado", () => {
  it("grava a hora na coluna do lembrete, na linha certa", async () => {
    const m = usarBanco({ update: () => ({ data: null }) });

    await marcarAvisoEnviado("11111111-1111-1111-1111-111111111111", "lembrete");

    const c = m.chamadas[0];
    expect(c.op).toBe("update");
    expect(Object.keys(c.valores ?? {})).toEqual(["lembrete_enviado_em"]);
    expect(c.filtros).toContainEqual({
      metodo: "eq",
      coluna: "id",
      valor: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("o agradecimento vai na coluna dele", async () => {
    const m = usarBanco({ update: () => ({ data: null }) });

    await marcarAvisoEnviado("22222222-2222-2222-2222-222222222222", "agradecimento");

    expect(Object.keys(m.chamadas[0].valores ?? {})).toEqual(["agradecimento_enviado_em"]);
  });

  /*
    Guarda QUANDO, não `true`. São os mesmos 8 bytes, e responde a pergunta
    que a Karol faz quando a cliente não aparece: "será que ela recebeu?".
  */
  it("grava um instante, não um booleano", async () => {
    const m = usarBanco({ update: () => ({ data: null }) });

    await marcarAvisoEnviado("11111111-1111-1111-1111-111111111111", "lembrete");

    const quando = (m.chamadas[0].valores ?? {}).lembrete_enviado_em;
    expect(typeof quando).toBe("string");
    expect(Number.isNaN(Date.parse(quando as string))).toBe(false);
  });

  /*
    Sem banco configurado ela não pode explodir: quem chama está no meio
    da varredura, e uma exceção aqui derrubaria os avisos dos outros.
  */
  it("sem banco, não explode", async () => {
    bancoMock.mockReturnValue(null as never);

    await expect(
      marcarAvisoEnviado("11111111-1111-1111-1111-111111111111", "lembrete"),
    ).resolves.toBeUndefined();
  });
});
