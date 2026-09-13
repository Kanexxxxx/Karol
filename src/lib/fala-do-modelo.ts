/**
 * O que o modelo escreve nem sempre é fala. Aqui a gente separa.
 *
 * ---------------------------------------------------------------------
 * O defeito que criou este arquivo
 * ---------------------------------------------------------------------
 *
 * Na bancada de provas de 12–13/09, rodando os casos difíceis contra a API
 * de verdade, dois modelos mandaram ISTO como texto puro, no lugar de uma
 * chamada de ferramenta:
 *
 *     <｜｜DSML｜｜tool_calls>
 *     <｜｜DSML｜｜invoke name="remarcar">
 *     <｜｜DSML｜｜parameter name="id" string="true">1111...
 *
 * É o formato interno que o modelo usa pra pedir uma ferramenta. Ele
 * vazou como texto — e o assistente, que confia no texto, mandava aquilo
 * inteiro pro WhatsApp da Karol. Era isso que ela via quando disse que "o
 * diálogo dele é horrível".
 *
 * ---------------------------------------------------------------------
 * Por que vazou, e por que a limpeza continua necessária
 * ---------------------------------------------------------------------
 *
 * Sempre na ÚLTIMA rodada, a única em que o assistente tira as
 * ferramentas da mesa de propósito (senão o modelo fica lendo pra sempre
 * e a Karol nunca recebe resposta). Sem ferramenta declarada, o modelo
 * ainda quer chamar uma — e escreve a chamada à mão.
 *
 * A rodada a mais que ganhamos junto com este arquivo faz o caso comum
 * caber antes disso. Mas "cabe quase sempre" não é garantia: enquanto
 * existir uma rodada sem ferramentas, existe a chance do vazamento. Esta
 * é a rede embaixo — e ela é burra de propósito, só olha o texto.
 *
 * ⚠️ NA DÚVIDA, CALA A BOCA. Uma resposta honesta de "não consegui" é
 * melhor do que despejar marcação na tela de quem está trabalhando.
 */

/*
  As marcas de chamada de ferramenta que já vimos ou que são comuns.

  Os `｜` do DeepSeek não são barras verticais comuns (U+007C): são
  FULLWIDTH VERTICAL LINE, U+FF5C. Colar de olho aqui não funciona — por
  isso o padrão aceita as duas, e também os delimitadores de outros
  modelos, que custam nada e podem aparecer no dia que o provedor mudar.
*/
const MARCAS = [
  /<[|｜]{1,2}\s*DSML/i,
  /<[|｜][^>]{0,40}[|｜]>/,
  /<\/?tool_call[s]?\b/i,
  /<\/?function_call[s]?\b/i,
  /<\/?invoke\b/i,
  /<\/?antml:/i,
  /^\s*functions\.\w+\s*\(/,
];

/** O texto é marcação de ferramenta vazada, e não uma fala? */
export function vazouMarcacao(texto: string): boolean {
  return MARCAS.some((m) => m.test(texto));
}

/**
 * A fala pronta pra mandar — ou `null`, se não sobrou fala nenhuma.
 *
 * Quando a marcação aparece no MEIO de uma resposta boa, o que vem antes
 * dela costuma ser uma frase inteira e útil ("Vou passar a Ana pra
 * segunda."). Essa parte a gente aproveita; do primeiro sinal de
 * marcação em diante, corta.
 */
export function limparFala(texto: string | null | undefined): string | null {
  if (!texto) return null;

  let limpo = texto;
  for (const marca of MARCAS) {
    const achou = limpo.search(marca);
    if (achou >= 0) limpo = limpo.slice(0, achou);
  }

  limpo = limpo.trim();

  /*
    Sobrou pouco demais pra ser uma resposta. O corte costuma deixar um
    resto sem sentido ("Vou", "Certo,"), e mandar isso é pior que não
    mandar: a Karol responde ao resto achando que ele entendeu.
  */
  if (limpo.length < 12) return null;

  return limpo;
}
