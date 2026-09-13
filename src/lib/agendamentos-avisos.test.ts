import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockBanco } from "../../test/mock-banco";
import { paraChave } from "./agenda";

/**
 * O que a cliente fica sabendo quando a KAROL mexe na agenda.
 *
 * Durante semanas nada disso existia: o site avisava, o painel não. Ela
 * encaixava alguém e a pessoa nunca recebia confirmação; remarcava e a
 * pessoa aparecia na hora antiga; cancelava e a pessoa descobria na porta.
 *
 * Cada `it` aqui é um desses buracos fechado.
 */

vi.mock("./banco", () => ({ banco: vi.fn(), bancoConfigurado: vi.fn(() => true) }));
vi.mock("./notificacoes", () => ({ enviarEvento: vi.fn(async () => {}) }));

import { banco } from "./banco";
import { enviarEvento } from "./notificacoes";
import {
  criarAgendamento,
  criarAgendamentoNoPainel,
  mudarSituacao,
  pendentesVencidos,
  remarcarAgendamento,
} from "./agendamentos";

const bancoMock = vi.mocked(banco);
const avisar = vi.mocked(enviarEvento);

function usarBanco(handlers: Parameters<typeof mockBanco>[0]) {
  const m = mockBanco(handlers);
  bancoMock.mockReturnValue(m.cliente as never);
  return m;
}

/** Dia útil bem no futuro — o motor recusa hoje e fim de semana. */
function diaUtilFuturo(daquiADias = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daquiADias);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return paraChave(d);
}

/** Linha crua, como o PostgREST devolve. */
function linha(inicio: Date, situacao = "confirmado") {
  const fim = new Date(inicio.getTime() + 50 * 60000);
  return {
    id: "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
    cliente_nome: "Maria da Silva",
    cliente_whatsapp: "5518999998888",
    servico_id: "design-simples",
    servico_nome: "Design de sobrancelha",
    servico_preco: 2500,
    cidade: "Pereira Barreto",
    periodo: `["${inicio.toISOString()}","${fim.toISOString()}")`,
    situacao,
    observacao: null,
  };
}

const daquiATresDias = () => new Date(Date.now() + 3 * 24 * 3600_000);
const tresDiasAtras = () => new Date(Date.now() - 3 * 24 * 3600_000);

/** Os eventos disparados, na ordem. */
const eventos = () => avisar.mock.calls.map((c) => c[0]);

beforeEach(() => {
  bancoMock.mockReset();
  avisar.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe("Karol marca alguém pelo painel", () => {
  const base = {
    servicoId: "design-simples",
    cidade: "pereira-barreto" as const,
    hora: "08:00",
    nome: "Maria da Silva",
    whatsapp: "18999998888",
  };

  it("a cliente recebe a confirmação, igual a quem marcou pelo site", async () => {
    usarBanco({ insert: () => ({ data: { id: "ag-1" }, error: null }) });
    await criarAgendamentoNoPainel({ ...base, chaveDia: diaUtilFuturo() });

    expect(eventos()).toEqual(["confirmacao"]);
    expect(avisar.mock.calls[0][1]).toMatchObject({
      cliente: "Maria da Silva",
      // com DDI: é o formato que a Meta entende e que o webhook casa
      whatsappCliente: "5518999998888",
    });
  });

  it("NÃO avisa a Karol — quem marcou foi ela", async () => {
    usarBanco({ insert: () => ({ data: { id: "ag-1" }, error: null }) });
    await criarAgendamentoNoPainel({ ...base, chaveDia: diaUtilFuturo() });
    expect(eventos()).not.toContain("novo-agendamento");
  });

  it("sem WhatsApp (encaixe da família) não manda nada", async () => {
    // a linha guarda o número DELA nesse caso; mandar seria avisar ela mesma
    usarBanco({ insert: () => ({ data: { id: "ag-1" }, error: null }) });
    await criarAgendamentoNoPainel({ ...base, whatsapp: "", chaveDia: diaUtilFuturo() });
    expect(eventos()).toEqual([]);
  });

  it("não avisa quando o banco recusou o horário", async () => {
    usarBanco({ insert: () => ({ data: null, error: { code: "23P01" } }) });
    const r = await criarAgendamentoNoPainel({ ...base, chaveDia: diaUtilFuturo() });
    expect(r.ok).toBe(false);
    expect(eventos()).toEqual([]);
  });
});

describe("Karol remarca", () => {
  it("a cliente é avisada do horário NOVO", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: null }),
    });
    const r = await remarcarAgendamento(
      "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
      diaUtilFuturo(40),
      "09:30",
    );

    expect(r.ok).toBe(true);
    expect(eventos()).toEqual(["remarcado"]);
    // o horário da mensagem é o novo, não o antigo
    const enviado = avisar.mock.calls[0][1];
    expect(new Date(enviado.inicioISO).getHours()).toBe(9);
    expect(new Date(enviado.inicioISO).getMinutes()).toBe(30);
  });

  it("não avisa quando o horário novo colidiu", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: { code: "23P01" } }),
    });
    const r = await remarcarAgendamento(
      "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
      diaUtilFuturo(40),
      "09:30",
    );
    expect(r.ok).toBe(false);
    expect(eventos()).toEqual([]);
  });
});

describe("Karol muda a situação", () => {
  const id = "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b";

  it("cancelar um horário futuro avisa a cliente", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: null }),
    });
    await mudarSituacao(id, "cancelado");
    expect(eventos()).toEqual(["cancelado"]);
  });

  it("marcar como atendida ou faltou NÃO manda mensagem", async () => {
    // é registro do que já passou; mensagem aí seria constrangedora
    for (const situacao of ["concluido", "faltou", "confirmado"]) {
      avisar.mockClear();
      usarBanco({
        select: () => ({ data: linha(tresDiasAtras()), error: null }),
        update: () => ({ error: null }),
      });
      await mudarSituacao(id, situacao);
      expect(eventos(), `situação ${situacao}`).toEqual([]);
    }
  });

  it("cancelar algo que JÁ PASSOU não avisa ninguém", async () => {
    // ninguém precisa saber que o horário de semana passada foi arquivado
    usarBanco({
      select: () => ({ data: linha(tresDiasAtras()), error: null }),
      update: () => ({ error: null }),
    });
    await mudarSituacao(id, "cancelado");
    expect(eventos()).toEqual([]);
  });

  it("cancelar o que já estava cancelado não manda de novo", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias(), "cancelado"), error: null }),
      update: () => ({ error: null }),
    });
    await mudarSituacao(id, "cancelado");
    expect(eventos()).toEqual([]);
  });

  it("não avisa quando o banco recusou a mudança", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: { code: "23P01" } }),
    });
    const r = await mudarSituacao(id, "cancelado");
    expect(r.ok).toBe(false);
    expect(eventos()).toEqual([]);
  });

  it("aprovar agendamento que estava PENDENTE manda confirmação pra cliente", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias(), "pendente"), error: null }),
      update: () => ({ error: null }),
    });
    const r = await mudarSituacao(id, "confirmado");
    expect(r.ok).toBe(true);
    expect(eventos()).toEqual(["confirmacao"]);
  });
});

/**
 * QUEM entra na lista de horários a soltar por falta de pagamento.
 *
 * ⚠️ A LISTA É O PERIGO, não o cancelamento. Quem cancela só obedece: se
 * alguém errado entrar aqui, o horário de uma cliente some sozinho de
 * madrugada e ela descobre na porta do studio.
 *
 * Por isso quase todos os casos abaixo são sobre quem NÃO pode entrar.
 */
describe("horários presos por falta de pagamento", () => {
  /** Uma linha crua com serviço e data de criação escolhidos. */
  function pendenteCriadoEm(criadoEm: Date, servicoId: string, inicio: Date) {
    return {
      ...linha(inicio, "pendente"),
      servico_id: servicoId,
      servico_preco: servicoId === "design-simples" ? 2500 : 12000,
      criado_em: criadoEm.toISOString(),
    };
  }

  const ontem = () => new Date(Date.now() - 24 * 3600_000);

  it("entra quem marcou ontem um serviço com entrada e não pagou", async () => {
    usarBanco({
      select: () => ({
        data: [pendenteCriadoEm(ontem(), "brow-lamination", daquiATresDias())],
        error: null,
      }),
    });

    expect(await pendentesVencidos()).toHaveLength(1);
  });

  /*
    ⚠️ O CASO QUE MAIS ASSUSTA. Com aprovação manual ligada, um design de
    R$ 25 também fica `pendente` — mas esse está esperando a KAROL olhar,
    não a cliente pagar. Cancelar por falta de pagamento um horário que
    nunca pediu pagamento é apagar o trabalho dela.
  */
  it("NÃO entra serviço que nem pede entrada", async () => {
    usarBanco({
      select: () => ({
        data: [pendenteCriadoEm(ontem(), "design-simples", daquiATresDias())],
        error: null,
      }),
    });

    expect(await pendentesVencidos()).toEqual([]);
  });

  /*
    Cancelar um horário que já passou não libera nada, e manda pra cliente
    um "seu horário foi cancelado" depois de ela já ter ido — ou não ido.
  */
  it("NÃO entra horário que já aconteceu", async () => {
    usarBanco({
      select: () => ({
        data: [pendenteCriadoEm(tresDiasAtras(), "brow-lamination", tresDiasAtras())],
        error: null,
      }),
    });

    expect(await pendentesVencidos()).toEqual([]);
  });

  /*
    O prazo é feito no banco, com `criado_em < hoje 00:00`. O teste prova
    que o filtro FOI PEDIDO — sem ele, quem marcou agora mesmo e ainda
    está com o aplicativo do banco aberto perderia o horário.
  */
  it("pede ao banco só o que foi criado antes de hoje", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });

    await pendentesVencidos();

    const lt = m.chamadas
      .find((c) => c.op === "select")
      ?.filtros?.find((f) => f.metodo === "lt");
    expect(lt?.coluna).toBe("criado_em");

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    expect(lt?.valor).toBe(hoje.toISOString());
  });

  it("pede ao banco só quem está pendente", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });

    await pendentesVencidos();

    const eq = m.chamadas
      .find((c) => c.op === "select")
      ?.filtros?.find((f) => f.metodo === "eq");
    expect(eq?.coluna).toBe("situacao");
    expect(eq?.valor).toBe("pendente");
  });

  it("banco fora do ar devolve lista vazia, e ninguém é cancelado", async () => {
    usarBanco({ select: () => ({ data: null, error: { message: "caiu" } }) });

    expect(await pendentesVencidos()).toEqual([]);
  });
});

/**
 * O teto de horários futuros por pessoa.
 *
 * ⚠️ O ERRO CARO AQUI É O CONTRÁRIO DO USUAL: não é deixar passar quem
 * não devia, é BARRAR cliente de verdade. Quem é barrada some — ela não
 * chama no WhatsApp pra reclamar de um site, ela desiste. Por isso os
 * casos abaixo cobrem principalmente quem TEM que passar.
 */
describe("teto de horários por pessoa", () => {
  const pedido = {
    servicoId: "design-simples",
    chaveDia: diaUtilFuturo(),
    inicioMin: 7 * 60,
    nome: "Maria da Silva",
    whatsapp: "18999998888",
  };

  /** Responde a contagem do teto e deixa o resto do fluxo seguir. */
  function comContagem(quantos: number | null, erro: unknown = null) {
    return usarBanco({
      select: () => ({ data: [], error: null, count: quantos ?? undefined, ...(erro ? { error: erro } : {}) }),
      insert: () => ({ data: null, error: { message: "parou depois do teto" } }),
    });
  }

  it("barra quem já tem cinco horários marcados", async () => {
    comContagem(5);

    const r = await criarAgendamento(pedido);

    expect(r.ok).toBe(false);
    expect(r).toHaveProperty("erro");
    if (!r.ok) {
      // A saída tem que estar na mensagem: barrar sem dizer o que fazer
      // é a pessoa fechando o site.
      expect(r.erro).toContain("WhatsApp");
    }
  });

  it("quatro ainda passa — a mãe com duas filhas e o horário dela", async () => {
    comContagem(4);

    const r = await criarAgendamento(pedido);

    // Passou do teto e morreu adiante, no insert de mentira. O que
    // importa é que NÃO foi barrada pelo teto.
    if (!r.ok) expect(r.erro).not.toContain("WhatsApp");
  });

  /*
    ⚠️ NA DÚVIDA, DEIXA PASSAR. Se a contagem falhar, barrar cliente de
    verdade por causa de um erro nosso é o pior desfecho — e o que se
    perde é um teto que nem existia até ontem.
  */
  it("banco falhando na contagem não barra ninguém", async () => {
    comContagem(null, { message: "caiu" });

    const r = await criarAgendamento(pedido);

    if (!r.ok) expect(r.erro).not.toContain("WhatsApp");
  });
});
