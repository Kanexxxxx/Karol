import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockBanco } from "../../test/mock-banco";
import { paraChave } from "./agenda";

vi.mock("./banco", () => ({
  banco: vi.fn(),
  bancoConfigurado: vi.fn(() => true),
}));

import { banco } from "./banco";
import {
  buscarAgendamento,
  criarAgendamento,
  criarAgendamentoNoPainel,
  horaEmMinutos,
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
    expect(r.ok === false && r.erro).toMatch(/ocupado/i);
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
   * não só nos múltiplos de 15 que o site oferece. Quem impede choque é a
   * trava do banco, então liberdade aqui não custa segurança.
   */
  it("aceita horário fora da grade de 15 em 15", async () => {
    usarBanco({ insert: () => ({ data: { id: "ag-encaixe" } }) });
    const r = await criarAgendamentoNoPainel({ ...base, hora: "07:07" });
    expect(r.ok).toBe(true);
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

describe("procurarAgendamentos", () => {
  /** Os filtros da última consulta, achatados pra facilitar a asserção. */
  function filtrosDa(m: ReturnType<typeof usarBanco>) {
    return m.chamadas.at(-1)!.filtros.map((f) => `${f.metodo}:${f.coluna ?? ""}=${f.valor}`);
  }

  it("procura por código como intervalo de uuid, não como texto", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    await procurarAgendamentos("8C6377");

    const filtros = filtrosDa(m);
    expect(filtros).toContain("gte:id=8c637700-0000-0000-0000-000000000000");
    expect(filtros).toContain("lte:id=8c6377ff-ffff-ffff-ffff-ffffffffffff");
    // se cair no ilike, a consulta varre a tabela convertendo uuid em texto
    expect(filtros.some((f) => f.startsWith("ilike:"))).toBe(false);
  });

  it("aceita o código sujo, do jeito que vem colado do WhatsApp", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    await procurarAgendamentos("  #8c6377 ");
    expect(filtrosDa(m)).toContain("gte:id=8c637700-0000-0000-0000-000000000000");
  });

  it("procura por telefone quando vêm 4 dígitos ou mais", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    await procurarAgendamentos("(18) 99752-5291");
    expect(filtrosDa(m)).toContain("ilike:cliente_whatsapp=%18997525291%");
  });

  it("procura por nome quando não é código nem telefone", async () => {
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

  it("devolve LISTA: se dois códigos colidirem, a Karol escolhe", async () => {
    const m = usarBanco({
      select: () => ({
        data: [
          linhaFalsa("8c6377a1-0000-4000-8000-000000000001", "Ana"),
          linhaFalsa("8c6377b2-0000-4000-8000-000000000002", "Bia"),
        ],
        error: null,
      }),
    });
    const achados = await procurarAgendamentos("8C6377");
    expect(achados.map((a) => a.clienteNome)).toEqual(["Ana", "Bia"]);
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
