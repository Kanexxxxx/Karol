import { afterEach, describe, expect, it, vi } from "vitest";
import { dentroDoLimite, ipDoPedido } from "./limite";

afterEach(() => vi.useRealTimers());

describe("dentroDoLimite", () => {
  it("libera até o máximo e barra o excedente", () => {
    const chave = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(dentroDoLimite(chave, 3)).toBe(true);
    expect(dentroDoLimite(chave, 3)).toBe(false);
    expect(dentroDoLimite(chave, 3)).toBe(false);
  });

  it("conta cada chave separadamente", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(dentroDoLimite(a, 1)).toBe(true);
    expect(dentroDoLimite(a, 1)).toBe(false);
    expect(dentroDoLimite(b, 1)).toBe(true);
  });

  it("reabre depois que a janela passa", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T12:00:00-03:00"));
    const chave = `j-${Math.random()}`;
    expect(dentroDoLimite(chave, 1, 10)).toBe(true);
    expect(dentroDoLimite(chave, 1, 10)).toBe(false);
    vi.advanceTimersByTime(10);
    expect(dentroDoLimite(chave, 1, 10)).toBe(true);
  });

  it("não encurta uma janela longa ao limpar outra chave", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-20T12:00:00-03:00"));

    const agendamento = `agendar-${Math.random()}`;
    const login = `login-${Math.random()}`;
    expect(dentroDoLimite(agendamento, 1, 60 * 60 * 1000)).toBe(true);

    // Criar uma chave de 15 min depois de 16 min aciona a limpeza. A chave
    // de agendamento ainda deve continuar bloqueada por sua própria hora.
    vi.advanceTimersByTime(16 * 60 * 1000);
    expect(dentroDoLimite(login, 1, 15 * 60 * 1000)).toBe(true);
    expect(dentroDoLimite(agendamento, 1, 60 * 60 * 1000)).toBe(false);
  });
});

describe("ipDoPedido", () => {
  const cab = (mapa: Record<string, string>) => ({
    get: (n: string) => mapa[n] ?? null,
  });

  it("prefere x-real-ip, que é a borda quem escreve", () => {
    expect(ipDoPedido(cab({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" })))
      .toBe("203.0.113.9");
  });

  // A regressão: o primeiro item da cadeia é o que quem chama controla.
  it("ignora o que foi prependido em x-forwarded-for", () => {
    expect(ipDoPedido(cab({ "x-forwarded-for": "9.9.9.9, 203.0.113.9" })))
      .toBe("203.0.113.9");
  });

  it("um só valor continua valendo", () => {
    expect(ipDoPedido(cab({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("sem cabeçalho nenhum, cai numa chave fixa", () => {
    expect(ipDoPedido(cab({}))).toBe("sem-ip");
    expect(ipDoPedido(cab({ "x-forwarded-for": " , " }))).toBe("sem-ip");
  });
});
