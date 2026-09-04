import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (k: string) => (k === "x-forwarded-for" ? "9.9.9.9" : null),
  })),
}));
vi.mock("@/lib/agendamentos", () => ({ criarAgendamento: vi.fn() }));
vi.mock("@/lib/limite", () => ({ dentroDoLimite: vi.fn(() => true) }));

import { redirect } from "next/navigation";
import { criarAgendamento } from "@/lib/agendamentos";
import { dentroDoLimite } from "@/lib/limite";
import { agendar } from "./acoes";

const criar = vi.mocked(criarAgendamento);
const limite = vi.mocked(dentroDoLimite);
const irPara = vi.mocked(redirect);

function form(over: Record<string, string> = {}) {
  const fd = new FormData();
  const base: Record<string, string> = {
    servicoId: "design-simples",
    chaveDia: "2026-12-15",
    inicioMin: "420",
    nome: "Fulana de Tal",
    whatsapp: "(18) 99999-8888",
    observacao: "",
    carimbo: String(Date.now() - 5000),
    site: "",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  criar.mockReset().mockResolvedValue({ ok: true, id: "ag-9", quando: new Date(), cidade: "Pereira Barreto" });
  limite.mockReset().mockReturnValue(true);
  irPara.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("agendar — barreiras anti-robô", () => {
  it("recusa quando o honeypot veio preenchido", async () => {
    const r = await agendar({}, form({ site: "http://spam" }));
    expect(r.erro).toBeTruthy();
    expect(criar).not.toHaveBeenCalled();
  });

  it("recusa envio instantâneo (carimbo < 2s)", async () => {
    const r = await agendar({}, form({ carimbo: String(Date.now()) }));
    expect(r.erro).toBeTruthy();
    expect(criar).not.toHaveBeenCalled();
  });

  it("recusa formulário velho (carimbo > 2h) ou sem carimbo", async () => {
    expect((await agendar({}, form({ carimbo: String(Date.now() - 3 * 3600 * 1000) }))).erro).toBeTruthy();
    expect((await agendar({}, form({ carimbo: "" }))).erro).toBeTruthy();
    expect(criar).not.toHaveBeenCalled();
  });

  it("respeita o freio por IP", async () => {
    limite.mockReturnValue(false);
    const r = await agendar({}, form());
    expect(r.erro).toMatch(/vários agendamentos/i);
    expect(criar).not.toHaveBeenCalled();
  });
});

describe("agendar — validação de campos", () => {
  it("cobra nome e WhatsApp", async () => {
    const r = await agendar({}, form({ nome: "x", whatsapp: "123" }));
    expect(r.campos?.nome).toBeTruthy();
    expect(r.campos?.whatsapp).toBeTruthy();
    expect(criar).not.toHaveBeenCalled();
  });

  it("limita o recado a 500 caracteres", async () => {
    const r = await agendar({}, form({ observacao: "a".repeat(501) }));
    expect(r.campos?.observacao).toBeTruthy();
  });

  it("devolve o que foi digitado quando dá erro", async () => {
    const r = await agendar({}, form({ nome: "x" }));
    expect(r.valores?.whatsapp).toBe("(18) 99999-8888");
  });
});

describe("agendar — caminho feliz", () => {
  it("normaliza os dados, grava e redireciona pra confirmação", async () => {
    await agendar({}, form({ nome: "  Fulana  ", whatsapp: "(18) 99999-8888" }));

    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({
        servicoId: "design-simples",
        inicioMin: 420,
        nome: "Fulana",
        whatsapp: "18999998888",
      }),
    );
    expect(irPara).toHaveBeenCalledWith("/agendar/confirmado?ag=ag-9");
  });

  it("repassa o erro do banco sem redirecionar", async () => {
    criar.mockResolvedValue({ ok: false, erro: "Esse horário acabou de ser ocupado. Escolha outro." });
    const r = await agendar({}, form());
    expect(r.erro).toMatch(/ocupado/i);
    expect(irPara).not.toHaveBeenCalled();
  });
});
