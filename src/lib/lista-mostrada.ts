/**
 * O que o assistente acabou de mostrar pra ela — com os ids.
 *
 * ---------------------------------------------------------------------
 * O buraco
 * ---------------------------------------------------------------------
 *
 * A memória da conversa guarda só o TEXTO das falas. O resultado das
 * leituras, que é onde estão os ids dos agendamentos, nunca era gravado.
 *
 * Então acontecia isto, e é o caso mais comum do dia dela:
 *
 *     ela  — quem vem sexta?
 *     ele  — 07:30 Ana, 09:00 Beatriz, 19:00 Clara.      ← ids existiam
 *     ela  — cancela a segunda                            ← ids sumiram
 *
 * Na segunda mensagem o modelo não tem mais os ids. Ou ele lê a agenda de
 * novo, o que custa uma ida inteira à API, ou ele INVENTA — que foi o que
 * a bancada pegou os três modelos fazendo.
 *
 * ---------------------------------------------------------------------
 * O conserto, e o quanto ele rendeu
 * ---------------------------------------------------------------------
 *
 * Junto com a resposta, vai pra memória uma linha `[sistema]` com a lista
 * e os ids. Medido na bancada (`bancada-de-provas.test.ts`), quatro
 * pedidos seguidos do tipo "cancela a segunda", com o modelo de produção:
 *
 *                          acertos   idas à API   tokens   tempo
 *   sem os ids (era assim)   4/4          8       39.847   3,2 s
 *   com os ids               4/4          4       20.127   2,0 s
 *
 * Mesmo acerto, METADE das idas e dos tokens, e 38% mais rápido. O acerto
 * não subiu porque, sem os ids, o modelo se salvava relendo a agenda — o
 * que ele nem sempre lembra de fazer, e aí inventa.
 *
 * ⚠️ SÓ A LISTA MAIS NOVA VALE. Duas listas na memória são dois conjuntos
 * de ids, e o modelo não tem como saber qual é o de agora — seria trocar
 * um jeito de errar por outro. Quem apaga as antigas é o `descartar` do
 * `guardarFalas`, com `ehLembreteDeLista` como peneira.
 */

/** Um agendamento como ele aparece pro modelo. Só o que serve pra apontar. */
export type ItemMostrado = {
  id: string;
  cliente: string;
  servico: string;
  quando: string;
};

/*
  A marca que identifica estas linhas na memória.

  Ela precisa ser estável: é por ela que a linha velha é reconhecida e
  jogada fora. Mudar este texto sem mudar `ehLembreteDeLista` junto deixa
  listas antigas acumulando na memória pra sempre.
*/
const MARCA = "[sistema] Última lista que mostrei a ela";

/**
 * Quantos itens entram no lembrete.
 *
 * A memória inteira são 30 falas, e esta linha ocupa UMA. Uma agenda de
 * sábado cheio passa fácil de 40 atendimentos — despejar tudo aqui
 * empurraria a conversa de verdade pra fora da janela. Dez cobre o que
 * ela costuma apontar ("a segunda", "a última"); acima disso ela chama
 * pelo nome, e aí o modelo procura.
 */
const MAXIMO = 10;

/** A linha pra guardar na memória, ou `null` se não há o que lembrar. */
export function lembreteDaLista(itens: ItemMostrado[]): string | null {
  if (itens.length === 0) return null;

  const linhas = itens
    .slice(0, MAXIMO)
    .map((i, n) => `${n + 1}) ${i.cliente} — ${i.servico}, ${i.quando} — id ${i.id}`);

  const sobrando =
    itens.length > MAXIMO ? `\n(e mais ${itens.length - MAXIMO}, que não couberam aqui)` : "";

  return `${MARCA} (use estes ids; não monte id a partir de nome ou data):\n${linhas.join("\n")}${sobrando}`;
}

/** Esta fala é um lembrete de lista? Serve pra descartar os velhos. */
export function ehLembreteDeLista(texto: string): boolean {
  return texto.startsWith(MARCA);
}

/**
 * Junta os agendamentos que vieram numa leitura.
 *
 * O resultado da leitura é um objeto solto — vem de `executarLeitura`, que
 * devolve formas diferentes por ferramenta. Aqui a gente só olha se tem
 * uma lista de `agendamentos` dentro e pega o que interessa; qualquer
 * outra forma passa direto sem reclamar.
 *
 * Repetidos são descartados pelo id: pedir "quem vem sexta" e depois
 * "procura a Ana" traz a Ana duas vezes, e uma lista com a mesma pessoa
 * em duas posições estraga justamente o "cancela a segunda".
 */
export function juntarMostrados(acumulado: ItemMostrado[], dados: unknown): void {
  if (!dados || typeof dados !== "object") return;

  const lista = (dados as { agendamentos?: unknown }).agendamentos;
  if (!Array.isArray(lista)) return;

  const jaTem = new Set(acumulado.map((i) => i.id));

  for (const bruto of lista) {
    if (!bruto || typeof bruto !== "object") continue;
    const a = bruto as Record<string, unknown>;
    if (typeof a.id !== "string" || jaTem.has(a.id)) continue;

    acumulado.push({
      id: a.id,
      cliente: String(a.cliente ?? "?"),
      servico: String(a.servico ?? "?"),
      quando: String(a.quando ?? "?"),
    });
    jaTem.add(a.id);
  }
}
