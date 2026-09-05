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
