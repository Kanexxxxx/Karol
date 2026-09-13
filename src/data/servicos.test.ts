import { describe, expect, it } from "vitest";

import { prazoDoSinal, SERVICOS, sinalPorValor, valorDoSinal } from "./servicos";
import { REGRAS } from "./negocio";

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

/**
 * O prazo pra pagar a entrada — a conta que o cronômetro da tela mostra.
 *
 * ⚠️ O QUE ESTE ARQUIVO PROTEGE É UMA PROMESSA. O número que aparece na
 * tela é o mesmo que decide, lá no servidor, quando o horário volta pra
 * agenda. Se as duas contas divergirem, a cliente vê "faltam 4 minutos"
 * num horário que já foi embora — ou paga confiando num relógio que
 * mentiu pra ela.
 */
describe("prazo pra pagar a entrada", () => {
  const nasceu = new Date("2026-09-20T14:00:00.000Z");
  const minutos = (n: number) => nasceu.getTime() + n * 60_000;

  it("vence exatamente os minutos combinados depois de criado", () => {
    const { venceEm } = prazoDoSinal(nasceu, nasceu.getTime());

    expect(venceEm.getTime()).toBe(minutos(REGRAS.sinal.minutosParaPagar));
  });

  it("no instante em que nasce, sobra o prazo inteiro", () => {
    const { restanteSeg } = prazoDoSinal(nasceu, nasceu.getTime());

    expect(restanteSeg).toBe(REGRAS.sinal.minutosParaPagar * 60);
  });

  it("na metade do caminho, sobra a metade", () => {
    const metade = REGRAS.sinal.minutosParaPagar / 2;
    const { restanteSeg } = prazoDoSinal(nasceu, minutos(metade));

    expect(restanteSeg).toBe(metade * 60);
  });

  /*
    ⚠️ O PRAZO É DO AGENDAMENTO, NÃO DA PÁGINA. Recarregar não pode dar
    mais tempo — e é isso que este caso prova: com o mesmo `criadoEm`, um
    `agora` mais tarde devolve menos tempo, sempre.
  */
  it("recarregar mais tarde mostra MENOS tempo, nunca mais", () => {
    const cedo = prazoDoSinal(nasceu, minutos(2)).restanteSeg;
    const tarde = prazoDoSinal(nasceu, minutos(10)).restanteSeg;

    expect(tarde).toBeLessThan(cedo);
    // E o instante de vencimento não se move entre as duas leituras.
    expect(prazoDoSinal(nasceu, minutos(2)).venceEm.getTime()).toBe(
      prazoDoSinal(nasceu, minutos(10)).venceEm.getTime(),
    );
  });

  /*
    "Faltam -400 segundos" não quer dizer nada pra quem desenha a tela, e
    um número negativo formatado vira "-6:-40" na cara da cliente.
  */
  it("depois de vencido para em zero, e não fica negativo", () => {
    expect(prazoDoSinal(nasceu, minutos(REGRAS.sinal.minutosParaPagar)).restanteSeg).toBe(0);
    expect(prazoDoSinal(nasceu, minutos(999)).restanteSeg).toBe(0);
  });
});
