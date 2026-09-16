import { describe, expect, it } from "vitest";
import { CHAVE_DA_KAROL, PIX_DE_TESTE, REGRAS } from "./negocio";

/**
 * Pra onde vai o dinheiro das clientes.
 *
 * ---------------------------------------------------------------------
 * Este arquivo mudou de papel em 16/09/2026
 * ---------------------------------------------------------------------
 *
 * Até aqui ele testava o AVISO, não a chave. A lógica era: enquanto o
 * Kainã estivesse testando pagamento, a chave TINHA que ser a dele, e um
 * teste que reprovasse por isso seria desligado no primeiro dia. Quem
 * segurava o erro era uma tarja vermelha no topo do painel.
 *
 * A tarja saiu. Pedido dele na entrega, e ele tem razão duas vezes:
 *
 *   1. quem lê o painel é a KAROL. Pra ela, "o PIX está indo pra outra
 *      conta, trocar em src/data/negocio.ts" não é aviso — é susto sem
 *      nada que ela possa fazer;
 *   2. aviso na tela depende de alguém olhar. Teste não depende.
 *
 * Então a proteção mudou de lugar: saiu da tela dela e virou o teste
 * abaixo, que roda antes de todo deploy.
 *
 * ---------------------------------------------------------------------
 * ⚠️ SE VOCÊ VEIO PARAR AQUI PORQUE ESTE TESTE FICOU VERMELHO
 * ---------------------------------------------------------------------
 *
 * Alguém trocou a chave PIX por uma conta de teste e não devolveu. **O
 * site está mandando o dinheiro das clientes da Karol pra outra pessoa.**
 *
 * O conserto é uma linha em `data/negocio.ts`:
 *
 *     chavePix: CHAVE_DA_KAROL,
 *     banco: "Nubank",
 *     favorecido: "Karolaine Carvalho",
 *
 * NÃO desligue este teste pra fazer a suíte passar. Ele é a única coisa
 * que separa "testando" de "cliente pagando na conta errada" — e já houve
 * quatro dias, de 12 a 16/09/2026, em que a chave ficou errada porque o
 * que lembrava era um comentário.
 *
 * Testar com outra conta é legítimo: troque, teste, devolva. O vermelho
 * é o lembrete de devolver.
 */
describe("o dinheiro vai pra conta da Karol", () => {
  it("a chave em uso é a DELA", () => {
    expect(REGRAS.sinal.chavePix).toBe(CHAVE_DA_KAROL);
  });

  it("o banco e o favorecido são os dela", () => {
    // O nome aparece no aplicativo da cliente na hora de pagar. Se vier
    // outro, ela desconfia e não paga — e está certa em desconfiar.
    expect(REGRAS.sinal.banco).toBe("Nubank");
    expect(REGRAS.sinal.favorecido).toBe("Karolaine Carvalho");
  });

  it("a chave da Karol é a que estava no briefing dela", () => {
    // Se esta linha mudar, mudou o destino do dinheiro. Tem que ser
    // deliberado, e não efeito colateral de outra mexida.
    expect(CHAVE_DA_KAROL).toBe("18997525291");
  });

  /*
    `PIX_DE_TESTE` sobreviveu à tarja porque continua sendo a conta certa
    ("a chave em uso é diferente da dela?"). Hoje ninguém o usa pra
    desenhar nada; ele existe pra quem for escrever o próximo aviso — e
    pra este teste não depender de comparar duas strings à mão.
  */
  it("e o projeto sabe disso", () => {
    expect(PIX_DE_TESTE).toBe(false);
  });
});
