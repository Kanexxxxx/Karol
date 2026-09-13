import { describe, expect, it } from "vitest";
import { CHAVE_DA_KAROL, PIX_DE_TESTE, REGRAS } from "./negocio";

/**
 * O aviso de que o PIX está apontando pra conta errada.
 *
 * ⚠️ NÃO É UM TESTE QUE PROTEGE A CHAVE. Ele não pode ser: enquanto o
 * Kainã estiver testando pagamento, a chave TEM que ser a dele, e um
 * teste que reprovasse por isso seria desligado no primeiro dia.
 *
 * O que ele protege é o AVISO. `PIX_DE_TESTE` é o que faz a tarja
 * vermelha aparecer no painel, e é fácil alguém "simplificar" aquilo pra
 * um `false` fixo sem perceber o que está desligando. Aqui a conta é
 * refeita à mão, e o resultado tem que bater.
 */
describe("o painel sabe quando o PIX não é o da Karol", () => {
  it("a conta é a comparação com a chave dela, e nada mais", () => {
    // `as string` pelo mesmo motivo de `negocio.ts` — o literal muda.
    expect(PIX_DE_TESTE).toBe((REGRAS.sinal.chavePix as string) !== CHAVE_DA_KAROL);
  });

  it("a chave da Karol é a que estava no briefing dela", () => {
    // Se esta linha mudar, mudou o destino do dinheiro. Tem que ser
    // deliberado, e não efeito colateral de outra mexida.
    expect(CHAVE_DA_KAROL).toBe("18997525291");
  });

  /*
    O estado de HOJE, escrito com todas as letras. Quando o Kainã
    devolver a chave dela, este teste reprova — e é isso mesmo: a
    reprovação é o lembrete de vir aqui, apagar este bloco e conferir que
    o aviso sumiu do painel.
  */
  it("hoje a chave é a de teste, e por isso o painel avisa", () => {
    expect(PIX_DE_TESTE).toBe(true);
    expect(REGRAS.sinal.favorecido).toBe("Kaina Rodrigues Pinto");
  });
});
