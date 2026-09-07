/**
 * Dados do negócio da Karol.
 *
 * Fonte: respostas dela no briefing (29/08/2026) + confirmações por WhatsApp.
 * O que ainda não foi validado com ela está marcado A_CONFIRMAR.
 */

export const NEGOCIO = {
  nome: "Studio Karol Carvalho",
  profissional: "Karol Carvalho Nunes",
  atuacao: "Maquiadora e designer de sobrancelhas",
  atuacaoCidades: "Pereira Barreto e Bandeirantes D'Oeste, São Paulo",

  /** Frase dela num reel. Vira a citação da home. */
  lema: "Nem de humanas, nem de exatas. Eu sou da autoestima.",

  /** Também dela, num reel. Vende o curso melhor que qualquer texto meu. */
  lemaCurso:
    "Um dia decidi fazer curso de design de sobrancelha, e hoje isso paga as minhas contas.",

  /** Resposta dela: "o que você faz?". Vira a primeira frase do site. */
  frase:
    "Trabalho na área da maquiagem social, faço sobrancelhas femininas e masculinas e também ministro cursos de automaquiagem.",

  whatsapp: {
    numero: "5518997525291",
    exibicao: "(18) 99752-5291",
  },

  instagram: {
    studio: "studio_karol_carvalho_",
    pessoal: "karolcarvalhomakeup_",
  },

  /** Ela não tem MEI. */
  temCnpj: false,
} as const;

/**
 * Fuso em que a Karol atende.
 *
 * O motor de horários raciocina em hora local e assume que ela é a do
 * Brasil. Aplicado em `src/instrumentation.ts` e declarado explicitamente
 * nos formatadores de `lib/datas.ts`.
 */
export const FUSO = "America/Sao_Paulo";

/**
 * Endereço público do site — sitemap, robots e prévia de link.
 *
 * Estava chumbado em três arquivos. Quando o domínio definitivo existir,
 * basta definir NEXT_PUBLIC_SITE_URL na Vercel; até lá vale o provisório.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://karolcarvalho.vercel.app"
).replace(/\/$/, "");

export type CidadeId = "pereira-barreto" | "bandeirantes";

/**
 * Ela não quis endereço completo no site — só a cidade e o nome do local.
 */
export const CIDADES: Record<
  CidadeId,
  { nome: string; local: string | null }
> = {
  "pereira-barreto": {
    nome: "Pereira Barreto",
    local: "Studio Karol Carvalho",
  },
  bandeirantes: {
    nome: "Bandeirantes D'Oeste",
    // Ela ainda não passou o local; combinado é publicar só a cidade e
    // acrescentar depois. `local: null` some do site sem deixar buraco.
    local: null,
  },
};

/** 0 = domingo, 6 = sábado (mesmo índice de Date.getDay()) */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Expediente = {
  dia: DiaSemana;
  cidade: CidadeId;
  /** minutos desde a meia-noite */
  inicio: number;
  fim: number;
};

const h = (hora: number, min = 0) => hora * 60 + min;

/**
 * CONFIRMADO por ela: segunda a sexta é de manhã mesmo, 7h às 11h.
 *
 * Consequência importante: a janela útil é de 240 min. Com o intervalo de
 * 10 min, cabem no máximo 2 brow laminations (100 min cada) ou 4 designs
 * simples (50 min cada) por dia de semana. O sábado em Bandeirantes é que
 * carrega o volume.
 *
 * DOMINGO ela não atende — confirmado por ela.
 */
export const EXPEDIENTE: Expediente[] = [
  { dia: 1, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 2, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 3, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 4, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 5, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 6, cidade: "bandeirantes", inicio: h(11), fim: h(22) },
];

export const REGRAS = {
  /** Intervalo entre uma cliente e outra, em minutos. */
  intervaloMin: 10,

  /** Ela atende uma cliente por vez. */
  atendimentosSimultaneos: 1,

  /** "Só a partir do dia seguinte" — nunca no mesmo dia. */
  antecedenciaMinimaDias: 1,

  /** Ela não para pro almoço. */
  pausaAlmoco: null,

  /**
   * A_CONFIRMAR — o que ela quis dizer com "sinal".
   *
   * No formulário ela respondeu "sim, quero desde já" pra pergunta sobre
   * PIX DE SINAL (entrada pra segurar o horário), e depois escreveu
   * "a questão do agendamento com sinal" como a única coisa que gostaria
   * de resolver. As duas respostas parecem se referir à mesma coisa.
   *
   * Não construir nada aqui antes de confirmar com ela em palavras dela.
   */
  sinal: {
    ativo: false,
    valorPorServico: null,
    prazoDevolucaoHoras: 24,
    chavePix: null,
  },

  /**
   * Ela pediu pra aprovar cada agendamento na mão. Ver seção 04 do briefing:
   * a recomendação é deixar desligado e o sinal fazer o filtro, com este
   * botão disponível no painel caso ela prefira.
   */
  aprovacaoManual: false,

  /** Ela não quer que a cliente desmarque sozinha pelo site. */
  clientePodeCancelar: false,
} as const;

/** Resposta dela: o que a cliente precisa saber antes de chegar. */
export const ANTES_DE_VIR = [
  "Venha sem maquiagem.",
  // A regra é dela ("no máximo 1 acompanhante"). O "porque o espaço é
  // pequeno" era acréscimo meu e saiu: a regra sozinha se sustenta, e
  // pedir desculpa pelo próprio studio na primeira mensagem vende mal.
  "Se for trazer acompanhante, no máximo uma pessoa.",
];

/** Mensagens automáticas que ela pediu. */
export const NOTIFICACOES = {
  confirmacaoNaHora: true,
  lembreteUmDiaAntes: true,
  agradecimentoDepois: true,
  lembreteHorasAntes: false,
  avisoEndereco: false,
  avisaKarolNoWhatsapp: true,
} as const;
