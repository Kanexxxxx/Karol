import { describe, expect, it } from "vitest";

import { SERVICOS, sinalPorValor, valorDoSinal } from "./servicos";

/**
 * O sinal tem UMA conta: `sinalPorValor`. Já houve três cópias dela.
 *
 * Estes testes não conferem o número contra outra conta minha — conferem
 * que as portas de entrada dão a mesma resposta, e que a regra dela (50%,
 * só a partir de R$ 80) sai daquela única função.
 */
describe("o sinal", () => {
  it("é metade do valor a partir de R$ 80", () => {
    expect(sinalPorValor(8000)).toBe(4000);
    expect(sinalPorValor(12000)).toBe(6000);
  });

  it("não existe abaixo de R$ 80", () => {
    expect(sinalPorValor(7999)).toBe(0);
    expect(sinalPorValor(2500)).toBe(0);
  });

  it("dá o mesmo pelo serviço e pelo valor, pra toda a tabela", () => {
    for (const s of SERVICOS) {
      expect(valorDoSinal(s)).toBe(sinalPorValor(s.preco * 100));
    }
  });
});
