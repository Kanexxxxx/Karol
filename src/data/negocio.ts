/**
 * Dados do negócio da Karol.
 *
 * Fonte: respostas dela no briefing (29/08/2026) + confirmações por WhatsApp.
 * Os itens marcados com A_CONFIRMAR ainda não foram validados COM ELA —
 * não subir pro ar antes de fechar.
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
    // A_CONFIRMAR: onde ela atende em Bandeirantes?
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
 * DOMINGO ficou de fora de propósito — ver comentário em DOMINGO_PENDENTE.
 */
export const EXPEDIENTE: Expediente[] = [
  { dia: 1, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 2, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 3, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 4, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 5, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 6, cidade: "bandeirantes", inicio: h(11), fim: h(22) },
];

/**
 * A_CONFIRMAR — domingo.
 *
 * No formulário ela marcou "Pereira Barreto" no domingo mas não informou
 * horário, e marcou alguma cidade em todos os 7 dias sem nunca usar
 * "não atendo" (típico de quem preenche a grade inteira por hábito).
 *
 * Fica FORA da agenda até ela confirmar em palavras. Se entrar por suposição
 * e ela não atender no domingo, o site marca cliente num dia que ela não
 * trabalha — que é justamente o problema que esse projeto existe pra resolver.
 */
export const DOMINGO_PENDENTE = {
  suposicao: { cidade: "pereira-barreto" as CidadeId, inicio: h(8), fim: h(18) },
  confirmado: false,
};

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
  "Se for trazer acompanhante, no máximo uma pessoa — o espaço é pequeno.",
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
