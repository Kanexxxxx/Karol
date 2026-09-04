import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockBanco } from "../../test/mock-banco";

vi.mock("./banco", () => ({ banco: vi.fn(), bancoConfigurado: vi.fn(() => true) }));

import { banco } from "./banco";
import { criarBloqueio, listarBloqueios, removerBloqueio } from "./bloqueios";
import { montarPeriodo } from "./periodo";

const bancoMock = vi.mocked(banco);
const uuid = "0".repeat(36);

function usarBanco(handlers: Parameters<typeof mockBanco>[0]) {
  const m = mockBanco(handlers);
  bancoMock.mockReturnValue(m.cliente as never);
  return m;
}

beforeEach(() => bancoMock.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("criarBloqueio — validação", () => {
  it("recusa motivo curto ou datas fora de ordem, sem tocar no banco", async () => {
    const m = usarBanco({});
    expect(await criarBloqueio({ dataInicio: "2026-09-07", dataFim: "2026-09-07", motivo: "x" })).toMatchObject({ ok: false });
    expect(
      await criarBloqueio({ dataInicio: "2026-09-10", dataFim: "2026-09-05", motivo: "Férias" }),
    ).toMatchObject({ ok: false });
    expect(m.chamadas).toHaveLength(0);
  });

  it("recusa quando só uma das horas foi preenchida", async () => {
    usarBanco({});
    const r = await criarBloqueio({
      dataInicio: "2026-09-07",
      dataFim: "2026-09-07",
      horaInicio: "13:00",
      motivo: "Curso",
    });
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/duas horas/i);
  });
});

describe("criarBloqueio — grava", () => {
  it("dia inteiro: [00:00 do 1º dia, 00:00 do dia seguinte ao último)", async () => {
    const m = usarBanco({ insert: () => ({ error: null }) });
    const r = await criarBloqueio({ dataInicio: "2026-12-20", dataFim: "2027-01-05", motivo: "Férias" });
    expect(r).toEqual({ ok: true });

    const valores = m.chamadas.find((c) => c.op === "insert")?.valores as { periodo: string; motivo: string };
    expect(valores.motivo).toBe("Férias");
    expect(valores.periodo).toMatch(/^\[2026-12-20T03:00:00.000Z,2027-01-06T03:00:00.000Z\)$/);
  });

  it("intervalo com hora usa exatamente as horas dadas", async () => {
    const m = usarBanco({ insert: () => ({ error: null }) });
    await criarBloqueio({
      dataInicio: "2026-09-15",
      dataFim: "2026-09-15",
      horaInicio: "13:00",
      horaFim: "17:00",
      motivo: "Compromisso",
    });
    const p = (m.chamadas.find((c) => c.op === "insert")?.valores as { periodo: string }).periodo;
    expect(p).toBe("[2026-09-15T16:00:00.000Z,2026-09-15T20:00:00.000Z)");
  });
});

describe("listarBloqueios", () => {
  it("descarta os que já terminaram e marca diaInteiro", async () => {
    const ontem = new Date(Date.now() - 24 * 3600 * 1000);
    const amanha = new Date(Date.now() + 24 * 3600 * 1000);
    const semana = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    usarBanco({
      select: () => ({
        data: [
          { id: "velho", periodo: montarPeriodo(ontem, ontem), motivo: "passado" },
          {
            id: "b1",
            periodo: "[2099-01-10T03:00:00.000Z,2099-01-11T03:00:00.000Z)",
            motivo: "Feriado",
          },
          { id: "b2", periodo: montarPeriodo(amanha, semana), motivo: "Viagem" },
        ],
        error: null,
      }),
    });

    const lista = await listarBloqueios();
    // "velho" some; o resto vem ordenado por início (b2 = amanhã antes de b1 = 2099)
    expect(lista.map((b) => b.id)).toEqual(["b2", "b1"]);
    expect(lista.find((b) => b.id === "b1")!.diaInteiro).toBe(true);
    expect(lista.find((b) => b.id === "b2")!.diaInteiro).toBe(false);
  });
});

describe("removerBloqueio", () => {
  it("recusa id malformado sem consultar", async () => {
    const m = usarBanco({});
    expect(await removerBloqueio("nope")).toMatchObject({ ok: false });
    expect(m.chamadas).toHaveLength(0);
  });

  it("apaga quando o id é válido", async () => {
    const m = usarBanco({ delete: () => ({ error: null }) });
    expect(await removerBloqueio(uuid)).toEqual({ ok: true });
    expect(m.chamadas.find((c) => c.op === "delete")?.tabela).toBe("bloqueios");
  });
});
