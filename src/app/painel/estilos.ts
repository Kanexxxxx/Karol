/**
 * As classes que se repetem no painel inteiro, num lugar só.
 *
 * Cada botão do painel era escrito à mão no próprio arquivo, e cada cópia
 * saía um pouco diferente: letra de 10.5px num, 11px no outro, espaçamento
 * de 0.12em aqui e 0.16em ali, altura de 34px no "Salvar" do remarcar. Nada
 * ERRADO — tudo meio desalinhado. É isso que fazia o painel parecer
 * "básico" perto do site.
 *
 * ⚠️ Arquivo comum, sem "use client" e sem "use server": é importado pelos
 * dois lados. Só strings aqui — nada que dependa de React.
 *
 * ⚠️ NÃO "complete" estas classes com outra da mesma propriedade no
 * `className` (`${CAMPO} px-3`, `${BOTAO.primario} min-h-[52px]`). Quando
 * duas utilitárias mexem na mesma propriedade, quem ganha é a ordem no CSS
 * gerado pelo Tailwind — não a ordem no `className`. Às vezes funciona, às
 * vezes não, e muda sem aviso. Precisou de outro tamanho? Crie a variante
 * aqui.
 */

/**
 * Anel de foco de teclado.
 *
 * `focus-visible`, não `focus`: o toque no celular não acende o anel, o
 * teclado acende. Sem `outline-none` junto — no Tailwind 4 ele zera a
 * variável do estilo do contorno, e aí o `outline-2` do foco não aparece.
 */
export const FOCO =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro";

/*
  O `active:translate-y-px` é o "afundar" do toque: um pixel só. Em tela de
  celular não existe hover, e sem nenhuma resposta física a Karol não sabe
  se o toque pegou antes de a ação do servidor voltar.
*/
const TOQUE = `inline-flex items-center justify-center gap-2 font-bold uppercase transition-[background-color,border-color,color,opacity,translate] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 ${FOCO}`;
const MEDIO = "min-h-[44px] px-4 text-[11px] tracking-[0.14em]";
const GRANDE = "min-h-[52px] px-8 text-[12px] tracking-[0.2em]";

export const BOTAO = {
  /** A ação principal do lugar. Uma por lugar, no máximo. */
  primario: `${TOQUE} ${MEDIO} border border-ouro bg-ouro text-white hover:opacity-90`,
  /** O botão que envia um formulário inteiro (marcar, bloquear, entrar). */
  enviar: `${TOQUE} ${GRANDE} border border-ouro bg-ouro text-white hover:opacity-90`,
  secundario: `${TOQUE} ${MEDIO} border border-linha bg-papel text-tinta-2 hover:border-ouro-claro hover:text-ouro`,
  /** Recusar, faltou: muda o agendamento pra pior. Vermelho discreto. */
  aviso: `${TOQUE} ${MEDIO} border border-[#d9b9b3] bg-papel text-[#9d3b2f] hover:bg-[#f7ecea]`,
  /** Sem caixa: fechar, desistir. Não compete com o botão ao lado. */
  fantasma: `${TOQUE} ${MEDIO} text-tinta-2 hover:text-ouro`,
} as const;

/**
 * Campo de formulário — a parte comum, sem fundo nem recuo lateral.
 *
 * O foco ganha um halo dourado além da borda. Só a borda mudando de bege
 * pra dourado (como era) quase não se via no sol, no celular.
 */
export const CAMPO_BASE =
  "min-h-[48px] w-full border border-linha text-[15px] text-tinta outline-none transition-[border-color,background-color,box-shadow] placeholder:text-tinta-3 focus:border-ouro focus:bg-papel focus:shadow-[0_0_0_3px_rgb(199_165_94/0.25)]";

/** O campo de sempre, dentro de uma caixa branca. */
export const CAMPO = `${CAMPO_BASE} bg-osso px-4`;

/** Data e hora: o seletor nativo já ocupa espaço, o recuo é menor. */
export const CAMPO_CURTO = `${CAMPO_BASE} bg-osso px-3`;

/** O rótulo em cima de cada campo. */
export const ROTULO_CAMPO =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-2";

/** O rótulo dourado, em caixa alta, que abre cada seção. */
export const ROTULO_SECAO = "text-[11px] font-bold uppercase tracking-[0.2em] text-ouro";

/**
 * Número em Cormorant.
 *
 * ⚠️ `lining-nums proportional-nums`, NUNCA `tabular-nums`. Com largura
 * tabular, o 1 da Cormorant ganha um vão enorme dos lados e "11:15" vira
 * "1 1:15". Já aconteceu no site.
 */
export const NUMERO = "font-titulo lining-nums proportional-nums";
