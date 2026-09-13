import { describe, expect, it } from "vitest";
import { limparFala, vazouMarcacao } from "./fala-do-modelo";

/**
 * A rede que impede marcação interna de chegar no WhatsApp da Karol.
 *
 * O caso do meio deste arquivo não é inventado: é o texto exato que a API
 * devolveu na bancada de 12–13/09, com os caracteres largos e tudo. Se algum
 * dia alguém "arrumar" o padrão trocando `｜` por `|` comum, este teste
 * reprova — que é justamente o ponto.
 */

/** O que dois modelos mandaram como texto, no lugar de chamar a ferramenta. */
const VAZAMENTO_REAL =
  '<｜｜DSML｜｜tool_calls>\n<｜｜DSML｜｜invoke name="remarcar">\n' +
  '<｜｜DSML｜｜parameter name="id" string="true">11111111-1111-1111-1111-111111111111';

describe("reconhecer marcação de ferramenta", () => {
  it("pega o vazamento que aconteceu de verdade", () => {
    expect(vazouMarcacao(VAZAMENTO_REAL)).toBe(true);
    expect(limparFala(VAZAMENTO_REAL)).toBeNull();
  });

  it.each([
    ["barra vertical comum", '<||DSML||invoke name="marcar">'],
    ["formato de outros modelos", "<tool_call>{\"name\": \"remarcar\"}</tool_call>"],
    ["chamada em python", "functions.ver_agenda({'de_dias': 1})"],
    ["marcador solto", "<|im_start|>assistant"],
  ])("pega também %s", (_, texto) => {
    expect(vazouMarcacao(texto)).toBe(true);
  });

  it.each([
    "Sexta você tem três: 07:30 Ana, 09:00 Beatriz e 19:00 Clara. 💛",
    "Passei a Ana pra segunda às 19h. Confere no botão?",
    "Amanhã está livre o dia todo — quer que eu encaixe alguém?",
    "O faturamento do mês até agora é R$ 1.840,00.",
  ])("deixa passar fala de gente: %s", (texto) => {
    expect(vazouMarcacao(texto)).toBe(false);
    expect(limparFala(texto)).toBe(texto);
  });
});

describe("limpar antes de mandar", () => {
  /*
    O caso que vale a pena salvar: o modelo respondeu direito e só depois
    grudou a marcação. A frase de antes é uma resposta inteira, e jogar
    ela fora seria deixar a Karol sem resposta à toa.
  */
  it("aproveita a frase boa que veio antes da marcação", () => {
    const bruto =
      "Vou passar a Ana pra segunda às 19h.\n" +
      '<｜｜DSML｜｜invoke name="remarcar">\n<｜｜DSML｜｜parameter name="id">1111';

    expect(limparFala(bruto)).toBe("Vou passar a Ana pra segunda às 19h.");
  });

  /*
    E o caso em que NÃO vale: sobrou um toco. "Certo," não responde nada,
    e mandar isso faz ela achar que ele entendeu e responder em cima.
    Melhor calar e deixar o assistente cair na resposta de desculpa.
  */
  it("descarta o que sobrou quando o corte deixa um toco", () => {
    expect(limparFala("Certo, <｜｜DSML｜｜tool_calls>")).toBeNull();
    expect(limparFala("Vou <tool_call>")).toBeNull();
  });

  it("nada vira nada", () => {
    expect(limparFala(null)).toBeNull();
    expect(limparFala(undefined)).toBeNull();
    expect(limparFala("   ")).toBeNull();
  });

  it("tira o espaço em volta", () => {
    expect(limparFala("  Amanhã você tem duas clientes.  ")).toBe(
      "Amanhã você tem duas clientes.",
    );
  });
});
