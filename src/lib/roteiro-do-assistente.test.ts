import { describe, expect, it } from "vitest";
import { roteiroDoAssistente } from "./roteiro-do-assistente";

/**
 * O roteiro que o modelo recebe.
 *
 * ---------------------------------------------------------------------
 * Por que testar um texto
 * ---------------------------------------------------------------------
 *
 * Quase nada neste projeto depende de frase no prompt — a regra é que
 * prompt não é validação, e o que precisa ser garantido vira código com
 * teste. Mas algumas coisas SÓ existem no roteiro, porque são sobre como
 * o modelo fala, e falar é a única coisa que ele faz sozinho.
 *
 * Um roteiro é editado com frequência, e regra em texto some fácil: basta
 * alguém reescrever um parágrafo "pra ficar mais limpo". Estes testes não
 * provam que o modelo obedece — provam que a instrução ainda está lá.
 */
describe("o jeito de falar com a Karol", () => {
  const roteiro = roteiroDoAssistente();

  /*
    ⚠️ ESTE TESTE NASCEU DE UM ESCORREGÃO REAL.

    14/09/2026, conversa de verdade:

        assistente: "Foi não, amor."
        Karol:      "Pq vc tá me chamando de amor ?"

    Ele pediu desculpa e voltou a fazer em outra conversa, porque nada no
    roteiro proibia. O Kainã trouxe na entrega: "ele não pode ser muito
    abusado, tem que ser carinhoso (...) não pode ficar extrapolando".

    O modelo escorrega pra esse registro sozinho: o resto do roteiro é
    informal e interiorano, e "amor" é vizinho desse tom. Por isso a
    proibição é explícita e por isso ela é testada.
  */
  it("proíbe apelido afetuoso, com as palavras que ele usou de verdade", () => {
    const proibidos = ["amor", "querida", "linda", "flor", "benhê"];
    for (const palavra of proibidos) {
      expect(roteiro.toLowerCase()).toContain(palavra);
    }
    // E a proibição é uma proibição, não uma sugestão.
    expect(roteiro).toMatch(/NUNCA chame a Karol de amor/);
  });

  it("diz o que fazer no lugar, e não só o que não fazer", () => {
    // Instrução que só proíbe deixa o modelo sem registro pra usar. Ele
    // precisa saber que o substituto é "você" ou o nome dela.
    expect(roteiro).toMatch(/pelo nome|por 'você'|Trate por/i);
  });

  /*
    A outra metade do pedido: carinhoso, sim. Se alguém "consertar" o tom
    tirando a informalidade junto com o apelido, o assistente vira um
    formulário — e a Karol respondeu no briefing que queria conversa, não
    sistema.
  */
  it("continua pedindo conversa de WhatsApp, não formulário", () => {
    expect(roteiro).toMatch(/conversa de WhatsApp/i);
    expect(roteiro).toMatch(/curto, direto/i);
  });
});

/**
 * A regra que mudou com o botão único (16/09/2026).
 *
 * Ela dizia "UMA MUDANÇA POR VEZ", e era o que prendia a Karol num
 * vaivém de confirmações. O código foi consertado para juntar tudo num
 * botão; se a regra voltar ao que era, o modelo fatia de novo por conta
 * própria e o conserto some sem nada quebrar.
 */
describe("pedir várias coisas de uma vez", () => {
  const roteiro = roteiroDoAssistente();

  it("manda chamar todas as ferramentas na mesma resposta", () => {
    expect(roteiro).toMatch(/CHAME TODAS DE UMA VEZ/);
    expect(roteiro).toMatch(/MESMA resposta/);
  });

  it("não voltou a mandar fazer uma por vez", () => {
    expect(roteiro).not.toMatch(/UMA MUDANÇA POR VEZ/);
  });
});
