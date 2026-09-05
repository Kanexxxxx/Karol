import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
// So a espera e trocada: o freio e a leitura do IP continuam os de verdade.
vi.mock("@/lib/limite", async (real) => ({
  ...(await real<typeof import("@/lib/limite")>()),
  pausaLogin: vi.fn(async () => {}),
}));
vi.mock("@/lib/sessao", async (real) => ({
  ...(await real<typeof import("@/lib/sessao")>()),
  criarSessao: vi.fn(async () => {}),
}));

let ipAtual = "203.0.113.1";
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (k: string) => (k === "x-real-ip" ? ipAtual : null),
  })),
}));

import { entrar } from "./acoes";

const SENHA = "senha-de-teste-123";

function form(senha: string) {
  const fd = new FormData();
  fd.set("senha", senha);
  return fd;
}

beforeEach(() => {
  // A action espera 400 ms de propósito, pra resposta não denunciar o
  // caminho. Sem adiantar o relógio, estes cinco casos sozinhos custavam
  // 10 s do `npm test`.
  process.env.SENHA_PAINEL = SENHA;
  process.env.SESSAO_SECRET = "segredo-de-teste";
  // cada caso com o seu IP: o freio guarda estado entre chamadas
  ipAtual = `203.0.113.${Math.floor(Math.random() * 250) + 1}-${Math.random()}`;
});

afterEach(() => {
  delete process.env.SENHA_PAINEL;
  delete process.env.SESSAO_SECRET;
});

describe("entrar", () => {
  it("recusa a senha errada", async () => {
    expect(await entrar({}, form("errada"))).toEqual({ erro: "Senha incorreta." });
  });

  /**
   * A regressão que isto protege: antes havia só uma espera de 400 ms, sem
   * contagem nenhuma. Um script tenta ~2 senhas por segundo por conexão e
   * abre quantas quiser em paralelo. Quem passa daqui vê nome e WhatsApp de
   * todas as clientes.
   */
  it("barra depois de tentativas demais do mesmo IP", async () => {
    for (let i = 0; i < 8; i++) {
      expect((await entrar({}, form("errada"))).erro).toBe("Senha incorreta.");
    }
    const bloqueado = await entrar({}, form("errada"));
    expect(bloqueado.erro).toMatch(/Muitas tentativas/);
  });

  it("o bloqueio vale mesmo pra quem acerta a senha depois", async () => {
    for (let i = 0; i < 9; i++) await entrar({}, form("errada"));
    const r = await entrar({}, form(SENHA));
    expect(r.erro).toMatch(/Muitas tentativas/);
  });

  it("um IP travado não trava os outros", async () => {
    for (let i = 0; i < 9; i++) await entrar({}, form("errada"));
    ipAtual = "198.51.100.7-outro";
    expect((await entrar({}, form("errada"))).erro).toBe("Senha incorreta.");
  });

  it("explica quando o painel não foi configurado", async () => {
    delete process.env.SENHA_PAINEL;
    expect((await entrar({}, form("x"))).erro).toMatch(/não foi configurado/);
  });
});
