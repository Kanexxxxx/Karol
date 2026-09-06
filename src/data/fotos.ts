/**
 * Acervo de fotos do site.
 *
 * Origem: varredura completa dos posts públicos da Karol feita com a conta
 * logada (311 posts na grade, 50 imagens baixadas em resolução original,
 * de 1280 a 3505 px de largura). Todas foram apenas REDUZIDAS — nunca
 * ampliadas, porque ampliar é o que deixa cara de inteligência artificial.
 *
 * Originais em `ferramentas/originais/`, processamento em
 * `ferramentas/fotos2.py`.
 *
 * ATENÇÃO: são rostos de clientes reais. A Karol autorizou o uso em geral
 * no briefing ("pode usar todas"), mas antes de publicar vale conferir com
 * ela cliente por cliente.
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
const RETRATO = { largura: 780, altura: 1040 };

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
    largura: 1200,
    altura: 1464,
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
  retrato: {
    arquivo: `${P}/karol-retrato.jpg`,
    alt: "Sobrancelha desenhada pela Karol",
    largura: 780,
    altura: 975,
  },
  antesDepois: {
    arquivo: `${P}/antes-depois.jpg`,
    alt: "Sobrancelha de uma cliente antes e depois do design",
    largura: 860,
    altura: 1146,
  },
  atendimento: {
    arquivo: `${P}/processo.jpg`,
    alt: "Karol modelando a sobrancelha de uma cliente durante o atendimento",
    ...RETRATO,
  },
} as const;

/** Uma cliente diferente por serviço — nada se repete na tabela. */
export const FOTO_DO_SERVICO: Record<string, Foto> = {
  "design-simples": {
    arquivo: `${P}/serv-design.jpg`,
    alt: "Sobrancelha depois do design",
    ...RETRATO,
  },
  "design-henna": {
    arquivo: `${P}/serv-henna.jpg`,
    alt: "Sobrancelha depois do design com henna",
    ...RETRATO,
    etiqueta: "Mais pedido",
  },
  "design-masculino": {
    arquivo: `${P}/serv-masculino.jpg`,
    alt: "Design de sobrancelha masculino",
    ...RETRATO,
  },
  "brow-lamination": {
    arquivo: `${P}/serv-lamination.jpg`,
    alt: "Sobrancelha alinhada com brow lamination",
    ...RETRATO,
  },
  "maquiagem-social": {
    arquivo: `${P}/serv-maquiagem.jpg`,
    alt: "Maquiagem social feita pela Karol",
    ...RETRATO,
    etiqueta: "Festa e formatura",
  },
  "curso-automaquiagem": {
    arquivo: `${P}/karol-paleta.jpg`,
    alt: "Karol demonstrando uma técnica de maquiagem com a paleta na mão",
    largura: 1200,
    altura: 800,
    etiqueta: "Com certificado",
  },
};

const trabalho = (n: number, legenda: string, etiqueta?: string): Foto => ({
  arquivo: `${P}/trab-${String(n).padStart(2, "0")}.jpg`,
  alt: `${legenda} feito pela Karol`,
  ...RETRATO,
  legenda,
  etiqueta,
});

/** Galeria de trabalhos: 20 clientes, nenhuma repetida. */
export const GALERIA: Foto[] = [
  {
    arquivo: FOTOS.antesDepois.arquivo,
    alt: FOTOS.antesDepois.alt,
    largura: 860,
    altura: 1146,
    legenda: "Design com henna",
    etiqueta: "Antes e depois",
  },
  trabalho(1, "Design com henna"),
  trabalho(2, "Design de sobrancelha"),
  trabalho(3, "Maquiagem social"),
  trabalho(4, "Brow lamination"),
  trabalho(5, "Maquiagem social"),
  trabalho(6, "Design de sobrancelha"),
  trabalho(7, "Brow lamination"),
  trabalho(8, "Design de sobrancelha"),
  trabalho(9, "Maquiagem social"),
  trabalho(10, "Design de sobrancelha"),
  trabalho(11, "Brow lamination", "Durante"),
  trabalho(12, "Maquiagem social"),
  trabalho(13, "Design com henna"),
  trabalho(15, "Design de sobrancelha"),
  trabalho(16, "Design de sobrancelha"),
  trabalho(17, "Maquiagem social"),
  trabalho(18, "Maquiagem social"),
  trabalho(19, "Maquiagem social"),
  trabalho(20, "Maquiagem social"),
  trabalho(21, "Design de sobrancelha", "Antes e depois"),
  trabalho(22, "Maquiagem social"),
  trabalho(23, "Maquiagem social"),
  trabalho(24, "Maquiagem social"),
  {
    arquivo: `${P}/processo.jpg`,
    alt: "Karol modelando a sobrancelha de uma cliente",
    ...RETRATO,
    legenda: "No atendimento",
    etiqueta: "Durante",
  },
  {
    arquivo: `${P}/processo-3.jpg`,
    alt: "Brow lamination sendo aplicada na sobrancelha",
    ...RETRATO,
    legenda: "Brow lamination",
    etiqueta: "Durante",
  },
];

/** Seis alunas diferentes, todas com o certificado na mão. */
export const ALUNAS: Foto[] = [
  {
    arquivo: `${P}/aluna-01.jpg`,
    alt: "Karol e a aluna com o certificado do curso",
    ...RETRATO,
    legenda: "Com a Karol",
  },
  { arquivo: `${P}/aluna-02.jpg`, alt: "Aluna com o certificado do curso", ...RETRATO, legenda: "Certificada" },
  { arquivo: `${P}/aluna-03.jpg`, alt: "Aluna com o certificado do curso", ...RETRATO, legenda: "Certificada" },
  { arquivo: `${P}/aluna-04.jpg`, alt: "Aluna com o certificado do curso", ...RETRATO, legenda: "Certificada" },
  { arquivo: `${P}/aluna-05.jpg`, alt: "Aluna com o certificado do curso", ...RETRATO, legenda: "Certificada" },
  { arquivo: `${P}/aluna-06.jpg`, alt: "Aluna com o certificado do curso", ...RETRATO, legenda: "Certificada" },
];

/** Sequência da esteira do topo — mistura resultado, maquiagem e processo. */
/**
 * Escolhe por nome de arquivo, não por índice.
 *
 * Antes era `GALERIA[1], GALERIA[3]…`: tirar uma foto do meio da galeria
 * deslocava todas as seguintes e a esteira passava a mostrar outras, sem
 * ninguém perceber. Aconteceu quando a Karol pediu pra tirar a trab-14.
 */
const naGaleria = (arquivo: string): Foto => {
  const foto = GALERIA.find((f) => f.arquivo.endsWith(`/${arquivo}`));
  if (!foto) throw new Error(`Foto da esteira não está na galeria: ${arquivo}`);
  return foto;
};

/** Foto do convite pro Instagram — o texto já vem escrito nela. */
export const INSTAGRAM = {
  arquivo: `${P}/instagram.jpg`,
  alt: "Karol olhando o próprio perfil do Instagram no celular",
  largura: 900,
  altura: 1201,
};

export const ESTEIRA: Foto[] = [
  "trab-01.jpg", "trab-03.jpg", "trab-06.jpg", "trab-11.jpg",
  "trab-09.jpg", "trab-13.jpg", "trab-16.jpg", "trab-20.jpg",
  "trab-02.jpg", "trab-05.jpg",
].map(naGaleria);
