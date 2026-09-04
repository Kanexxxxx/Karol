import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `sessao.ts` importa `next/headers`; nos testes só exercitamos as funções
// puras (assinar/validar token e conferir senha), que não tocam em cookies.
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

const ENV = { ...process.env };

beforeEach(() => {
  process.env.SESSAO_SECRET = "segredo-de-teste-bem-longo-1234567890";
  process.env.SENHA_PAINEL = "senha-secreta";
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ENV };
});

async function mod() {
  return import("./sessao");
}

describe("painelConfigurado", () => {
  it("exige as duas variáveis", async () => {
    const { painelConfigurado } = await mod();
    expect(painelConfigurado()).toBe(true);

    delete process.env.SENHA_PAINEL;
    vi.resetModules();
    const outro = await mod();
    expect(outro.painelConfigurado()).toBe(false);
  });
});

describe("token de sessão", () => {
  it("aceita um token recém-emitido", async () => {
    const { emitirToken, tokenValido } = await mod();
    const t = emitirToken()!;
    expect(tokenValido(t)).toBe(true);
  });

  it("rejeita token adulterado, vazio ou sem assinatura", async () => {
    const { emitirToken, tokenValido } = await mod();
    const t = emitirToken()!;
    expect(tokenValido(t.slice(0, -3) + "xxx")).toBe(false);
    expect(tokenValido("")).toBe(false);
    expect(tokenValido("payloadsemponto")).toBe(false);
    expect(tokenValido(undefined)).toBe(false);
  });

  it("rejeita token de outro segredo", async () => {
    const { emitirToken } = await mod();
    const t = emitirToken()!;

    process.env.SESSAO_SECRET = "outro-segredo-completamente-diferente";
    vi.resetModules();
    const { tokenValido } = await mod();
    expect(tokenValido(t)).toBe(false);
  });

  it("rejeita token expirado", async () => {
    const { tokenValido } = await mod();
    const payload = Buffer.from(JSON.stringify({ exp: Date.now() - 1000 })).toString("base64url");
    const { createHmac } = await import("node:crypto");
    const sig = createHmac("sha256", process.env.SESSAO_SECRET!).update(payload).digest("base64url");
    expect(tokenValido(`${payload}.${sig}`)).toBe(false);
  });

  it("sem SESSAO_SECRET, não emite nem valida", async () => {
    delete process.env.SESSAO_SECRET;
    vi.resetModules();
    const { emitirToken, tokenValido } = await mod();
    expect(emitirToken()).toBeNull();
    expect(tokenValido("qualquer.coisa")).toBe(false);
  });
});

describe("senhaConfere", () => {
  it("aceita a senha certa e recusa o resto", async () => {
    const { senhaConfere } = await mod();
    expect(senhaConfere("senha-secreta")).toBe(true);
    expect(senhaConfere("senha-errada")).toBe(false);
    expect(senhaConfere("")).toBe(false);
    expect(senhaConfere("senha-secreta ")).toBe(false);
  });

  it("sem SENHA_PAINEL, recusa tudo", async () => {
    delete process.env.SENHA_PAINEL;
    vi.resetModules();
    const { senhaConfere } = await mod();
    expect(senhaConfere("")).toBe(false);
    expect(senhaConfere("qualquer")).toBe(false);
  });
});
