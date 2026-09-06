/**
 * O código curto do agendamento — o que a cliente manda no WhatsApp e a
 * Karol digita no painel pra achar de quem se trata.
 *
 * DERIVA DO UUID, não é coluna nova. O `id` já é único, já está gravado em
 * todo agendamento que existe, e já tem índice (é a chave primária). Uma
 * coluna `codigo` seria uma segunda fonte da verdade capaz de divergir, com
 * geração, unicidade e migração pra manter — tudo isso pra guardar algo que
 * já está lá.
 *
 * Seis caracteres de hexadecimal = 16,7 milhões de combinações. No volume da
 * Karol (algumas centenas por ano) a chance de duas baterem é desprezível, e
 * mesmo assim a busca devolve LISTA, não item: se um dia colidir, ela vê os
 * dois e escolhe. Nada quebra.
 *
 * Hexadecimal também resolve a ambiguidade de graça: `0-9a-f` não tem O nem
 * I, então não existe o problema clássico de confundir 0 com O ao ditar o
 * código por telefone.
 */

/** Quantos caracteres o código tem. */
export const TAMANHO_CODIGO = 6;

/**
 * O código de um agendamento: os primeiros seis dígitos do UUID, em maiúsculo.
 *
 * `8c6377a1-...` vira `8C6377`.
 */
export function codigoDoAgendamento(id: string): string {
  return id.replace(/-/g, "").slice(0, TAMANHO_CODIGO).toUpperCase();
}

/**
 * Limpa o que a pessoa digitou e devolve o código, ou `null` se não for um.
 *
 * Aceita bagunça de propósito: a Karol vai copiar do WhatsApp e pode vir
 * com `#`, espaço, minúscula. O que não dá pra aceitar é tamanho errado —
 * aí não é código, é outra coisa (nome, telefone), e quem chama trata.
 */
export function normalizarCodigo(bruto: string): string | null {
  const limpo = bruto.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
  return limpo.length === TAMANHO_CODIGO ? limpo : null;
}

/**
 * A faixa de UUIDs que começam com esse código.
 *
 * Serve pra procurar no banco por comparação de intervalo (`>=` e `<=`), que
 * usa o índice da chave primária. A alternativa seria `like` no texto do id,
 * que obriga o Postgres a converter uuid em texto linha por linha e varre a
 * tabela inteira.
 *
 * O uuid é comparado byte a byte no Postgres, então a ordem bate exatamente
 * com a ordem do hexadecimal escrito.
 */
export function faixaDoCodigo(codigo: string): { de: string; ate: string } {
  const c = codigo.toLowerCase();
  // O UUID tem o formato 8-4-4-4-12. O código cobre os 6 primeiros dígitos,
  // então os 26 restantes variam de todos-zeros a todos-f.
  return {
    de: `${c}00-0000-0000-0000-000000000000`,
    ate: `${c}ff-ffff-ffff-ffff-ffffffffffff`,
  };
}
