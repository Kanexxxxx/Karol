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
import { criarAgendamentoNoPainel, mudarSituacao, remarcarAgendamento } from "./agendamentos";

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
});
