import { describe, expect, it } from "vitest";
import { dentroDoLimite } from "./limite";

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
    const chave = `j-${Math.random()}`;
    expect(dentroDoLimite(chave, 1, 10)).toBe(true);
    expect(dentroDoLimite(chave, 1, 10)).toBe(false);
    return new Promise((r) => setTimeout(r, 20)).then(() => {
      expect(dentroDoLimite(chave, 1, 10)).toBe(true);
    });
  });
});
