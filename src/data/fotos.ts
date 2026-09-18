/**
 * Acervo de imagens do site — v2.
 *
 * ---------------------------------------------------------------------
 * ⚠️ AQUI NÃO ENTRA ROSTO DE CLIENTE. É A REGRA DA V2.
 * ---------------------------------------------------------------------
 *
 * A v1 tinha 44 fotos de gente: 24 trabalhos, 6 alunas com certificado,
 * antes e depois, fotos de serviço, bastidor. Era o melhor argumento de
 * venda do site — e era rosto de terceiro num site público, com o
 * consentimento existindo só como uma frase dela no briefing ("pode usar
 * todas"), sem registro por pessoa.
 *
 * A v2 não tem nenhuma. Sobrou:
 *
 * - a KAROL, que é dona da própria imagem e do próprio negócio;
 * - TEXTURA e MATERIAL — pigmento, traço de henna, pincel, seda —, que é
 *   o que o trabalho dela é feito, sem ser o rosto de ninguém.
 *
 * As texturas foram geradas por IA (Higgsfield, modelo z_image, em
 * 16/09/2026) e são decorativas de propósito. Elas NÃO mostram resultado
 * de atendimento, e isso não é detalhe: uma foto gerada de sobrancelha
 * pronta seria prova falsa de um trabalho que não aconteceu, e quem
 * marcasse por causa dela estaria marcando por uma mentira.
 *
 * Pigmento e seda não prometem nada.
 *
 * ---------------------------------------------------------------------
 * O que fazer quando a Karol mandar fotos novas
 * ---------------------------------------------------------------------
 *
 * Se um dia entrar foto de cliente aqui, ela precisa de autorização
 * ESCRITA daquela pessoa, guardada fora do código — e o teste
 * `sem-rosto-de-cliente.test.ts` vai ficar vermelho até alguém assumir
 * isso de propósito. O teste é a conversa, não o obstáculo.
 */

export type Foto = {
  arquivo: string;
  alt: string;
  largura: number;
  altura: number;
  legenda?: string;
  etiqueta?: string;
};

const P = "/fotos";
const T = "/texturas";

/**
 * Qual foto abre o site.
 *
 * São duas versões esperando a escolha da Karol — é a pergunta 1 do
 * `briefing/criar-formulario-2.gs`. Trocar aqui muda a abertura inteira,
 * no celular e no computador; nada mais depende disto.
 */
const CAPA: "branca" | "laranja" = "branca";

const CAPAS = {
  branca: {
    arquivo: `${P}/karol-capa.jpg`,
    alt: "Karol Carvalho, maquiadora e designer de sobrancelhas",
    largura: 1440,
    altura: 1757,
  },
  laranja: {
    arquivo: `${P}/karol-capa-laranja.jpg`,
    alt: "Karol Carvalho, maquiadora e designer de sobrancelhas",
    largura: 1200,
    altura: 1500,
  },
} as const;

export const FOTOS = {
  capa: CAPAS[CAPA],

  /**
   * A capa que ela NÃO escolheu, aproveitada na página dela.
   *
   * São duas fotos boas do mesmo ensaio e só uma abre o site. Amarrando a
   * segunda ao `CAPA` acima, trocar a escolha dela troca as duas de lugar
   * sozinho — e a mesma foto nunca aparece na abertura e em `/sobre` ao
   * mesmo tempo.
   */
  capaReserva: CAPA === "branca" ? CAPAS.laranja : CAPAS.branca,

  /*
    ⚠️ `.png`, E NÃO `.jpg` POR DESCUIDO.

    O Kainã trocou esta foto em 13/09/2026 por uma versão mais larga, e o
    arquivo que chegou era um PNG salvo com o nome terminando em `.jpg`.
    Isso não é frescura de nome: o servidor decide o cabeçalho
    `Content-Type` pela EXTENSÃO, então a foto sairia anunciada como JPEG
    sendo PNG — e o site manda `X-Content-Type-Options: nosniff`, que
    proíbe o navegador de corrigir isso por conta própria.

    Renomear resolve e não mexe num pixel. Se um dia alguém quiser o
    arquivo mais leve (são 1,8 MB, contra uns 300 KB que um JPEG bom teria
    aqui), o caminho é exportar de novo como JPEG — não renomear de volta.
  */
  paleta: {
    arquivo: `${P}/karol-paleta.png`,
    alt: "Karol Carvalho aplicando maquiagem em si mesma, com a paleta na mão",
    largura: 2048,
    altura: 768,
  },
} as const;

/** Foto do convite pro Instagram — o texto já vem escrito nela. */
export const INSTAGRAM = {
  arquivo: `${P}/instagram.jpg`,
  alt: "Karol olhando o próprio perfil do Instagram no celular",
  largura: 900,
  altura: 1201,
};

/**
 * As texturas que sustentam o site sem fotografar ninguém.
 *
 * ⚠️ O `alt` de cada uma descreve o que a imagem É, nunca o que ela
 * sugere. "Pigmento dourado sobre papel" e não "resultado de maquiagem":
 * quem usa leitor de tela tem que receber a mesma informação que quem vê
 * — e quem vê está vendo pigmento sobre papel.
 *
 * Todas são decorativas. Onde uma delas não acrescenta informação nenhuma
 * ao texto do lado, o componente passa `alt=""` e deixa o leitor de tela
 * pular — que é o certo, e é melhor do que inventar descrição.
 */
export const TEXTURAS = {
  /** Seda em faixa larga — divisor e fundo de citação. */
  sedaLarga: {
    arquivo: `${T}/seda-larga.jpg`,
    alt: "Tecido de seda cor de creme em dobras suaves",
    largura: 1800,
    altura: 1012,
  },
  /** O traço de henna. É o material do serviço mais pedido dela. */
  tracoHenna: {
    arquivo: `${T}/traco-henna.jpg`,
    alt: "Traço largo de henna sobre papel artesanal cor de creme",
    largura: 1200,
    altura: 900,
  },
  ferramentas: {
    arquivo: `${T}/ferramentas.jpg`,
    alt: "Pincel, pinça e paleta de maquiagem sobre linho cor de creme",
    largura: 1200,
    altura: 900,
  },
  pinceis: {
    arquivo: `${T}/pinceis.jpg`,
    alt: "Três pincéis de maquiagem num pote de cerâmica sobre linho",
    largura: 1200,
    altura: 900,
  },

  /* ------------------------------------------------------------------ */
  /* Segunda leva (17/09/2026) — o material do trabalho, mais de perto   */
  /* ------------------------------------------------------------------ */

  /**
   * ⚠️ A MAIS ESPECÍFICA DO ACERVO, e por isso a mais valiosa: é henna de
   * verdade na tigela, com o pincel de aplicação. O serviço mais pedido
   * dela tem, enfim, uma imagem que fala dele sem mostrar ninguém.
   */
  hennaTigela: {
    arquivo: `${T}/henna-tigela.jpg`,
    alt: "Tigela de cerâmica com pasta de henna e pincel de aplicação",
    largura: 1200,
    altura: 900,
  },
  pincelMacro: {
    arquivo: `${T}/pincel-macro.jpg`,
    alt: "Cerdas de um pincel de maquiagem em close, com virola dourada",
    largura: 1200,
    altura: 900,
  },
  pinca: {
    arquivo: `${T}/pinca.jpg`,
    alt: "Pinça de sobrancelha sobre linho, com luz de janela",
    largura: 1200,
    altura: 900,
  },
  compacto: {
    arquivo: `${T}/compacto.jpg`,
    alt: "Estojo dourado de pó compacto aberto, sobre linho",
    largura: 1200,
    altura: 900,
  },
  /** Duas passadas de pigmento no papel — nude e dourado. */
  swatches: {
    arquivo: `${T}/swatches.jpg`,
    alt: "Duas passadas de pigmento, uma nude e uma dourada, sobre papel",
    largura: 1200,
    altura: 900,
  },
  toalhas: {
    arquivo: `${T}/toalhas.jpg`,
    alt: "Toalhas de linho dobradas ao lado de um potinho de cerâmica",
    largura: 1200,
    altura: 900,
  },

  /* ---- as três de FUNDO: quase vazias, pra texto cair por cima ---- */

  /**
   * ⚠️ ESTAS TRÊS NÃO SÃO PRA OLHAR, SÃO PRA FICAR ATRÁS.
   *
   * O critério delas é o contrário do resto do acervo: quanto menos
   * acontece na imagem, melhor. Texto por cima de textura movimentada é
   * texto ilegível, e num site de agendamento a legibilidade ganha da
   * beleza toda vez.
   *
   * Quem usa sempre põe um véu (`bg-osso/72`, por exemplo) entre a
   * imagem e o texto. Sem o véu, o contraste passa a depender da região
   * da foto que calhou de ficar atrás da palavra.
   */
  papel: {
    arquivo: `${T}/papel.jpg`,
    alt: "",
    largura: 1800,
    altura: 1012,
  },
  linho: {
    arquivo: `${T}/linho.jpg`,
    alt: "",
    largura: 1200,
    altura: 675,
  },
  /** Um traço dourado no canto de baixo; o resto é parede lisa. */
  tracoOuro: {
    arquivo: `${T}/traco-ouro.jpg`,
    alt: "",
    largura: 1800,
    altura: 1012,
  },
} as const;

/**
 * A faixa de texturas que ocupa o lugar da antiga galeria.
 *
 * ⚠️ NÃO É GALERIA DE TRABALHOS, e o texto da seção não pode sugerir que
 * seja. A galeria da v1 mostrava 24 clientes; esta faixa mostra pigmento,
 * henna e seda. Chamar isso de "meus trabalhos" seria vender textura como
 * resultado.
 */
export const FAIXA_DE_TEXTURAS: Foto[] = [
  { ...TEXTURAS.hennaTigela, legenda: "A henna" },
  { ...TEXTURAS.tracoHenna, legenda: "O traço" },
  { ...TEXTURAS.pincelMacro, legenda: "O pincel" },
  { ...TEXTURAS.swatches, legenda: "O pigmento" },
  { ...TEXTURAS.pinca, legenda: "A pinça" },
  { ...TEXTURAS.compacto, legenda: "O acabamento" },
];
