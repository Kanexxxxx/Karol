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
 * Endereço público do site — sitemap, robots, prévia de link, e o link do
 * painel que vai no WhatsApp da Karol.
 *
 * ⚠️ ESTA CONSTANTE JÁ ESTEVE ERRADA EM PRODUÇÃO. O padrão era
 * `karolcarvalho.vercel.app`, um domínio que **nunca existiu** — a Vercel
 * criou o projeto como `karol-zeta`. Resultado: o sitemap mandava o Google
 * pra um 404, e o link "abrir no painel" que chegava no WhatsApp dela não
 * abria nada. Passou despercebido porque nada quebra: 404 não é exceção.
 *
 * Por isso a ordem abaixo tem `VERCEL_PROJECT_PRODUCTION_URL` no meio: a
 * Vercel injeta essa variável sozinha, com o domínio de produção de
 * verdade, sem ninguém configurar nada. É a rede de segurança pra quando
 * alguém esquecer de preencher a de cima.
 *
 * `NEXT_PUBLIC_SITE_URL` continua vencendo, porque é ela que vai apontar
 * pro domínio próprio (karolcarvalho.com.br) quando ele existir.
 */
function enderecoDoSite(): string {
  const escolhido = process.env.NEXT_PUBLIC_SITE_URL;
  if (escolhido) return escolhido;

  // A Vercel manda só o host, sem `https://`.
  const daVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (daVercel) return `https://${daVercel}`;

  // Último recurso: o domínio real de hoje. Se um dia mudar e ninguém
  // atualizar, as duas variáveis acima já terão resolvido antes.
  return "https://karol-zeta.vercel.app";
}

export const SITE_URL = enderecoDoSite().replace(/\/$/, "");

export type CidadeId = "pereira-barreto" | "bandeirantes";

/**
 * Ela não quis endereço completo no site — só a cidade e o nome do local.
 */
export const CIDADES: Record<
  CidadeId,
  {
    nome: string;
    /** O que aparece no SITE PÚBLICO. `null` = só a cidade. */
    local: string | null;
    /**
     * ⚠️ NUNCA vai pro site. Só entra na mensagem de WhatsApp de quem já
     * marcou — ela pediu assim, e são endereços residenciais.
     */
    enderecoCompleto: string;
  }
> = {
  "pereira-barreto": {
    nome: "Pereira Barreto",
    local: "Studio Karol Carvalho",
    enderecoCompleto: "Rua Atlântico, 884 (Condomínio da Praia) — esperar no portão da academia",
  },
  bandeirantes: {
    nome: "Bandeirantes D'Oeste",
    // Ela ainda não passou o local; combinado é publicar só a cidade e
    // acrescentar depois. `local: null` some do site sem deixar buraco.
    local: null,
    enderecoCompleto: "Rua 2 de Fevereiro, 274 (casa da mãe)",
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
 * Atualizado com as respostas e confirmações em áudio da Karol (07/09/2026):
 * - Segunda a sexta em Pereira Barreto: das 7h às 11h e das 18h30 às 22h.
 * - Sábado em Bandeirantes D'Oeste: das 11h às 22h.
 * - Domingo em Pereira Barreto: dia inteiro (8h às 18h).
 */
export const EXPEDIENTE: Expediente[] = [
  // Pereira Barreto — Segunda a sexta (Manhã: 7h às 11h)
  { dia: 1, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 2, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 3, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 4, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },
  { dia: 5, cidade: "pereira-barreto", inicio: h(7), fim: h(11) },

  // Pereira Barreto — Segunda a sexta (Noite: 18h30 às 22h)
  { dia: 1, cidade: "pereira-barreto", inicio: h(18, 30), fim: h(22) },
  { dia: 2, cidade: "pereira-barreto", inicio: h(18, 30), fim: h(22) },
  { dia: 3, cidade: "pereira-barreto", inicio: h(18, 30), fim: h(22) },
  { dia: 4, cidade: "pereira-barreto", inicio: h(18, 30), fim: h(22) },
  { dia: 5, cidade: "pereira-barreto", inicio: h(18, 30), fim: h(22) },

  // Bandeirantes D'Oeste — Sábado (11h às 22h)
  { dia: 6, cidade: "bandeirantes", inicio: h(11), fim: h(22) },

  // Pereira Barreto — Domingo (8h às 18h)
  { dia: 0, cidade: "pereira-barreto", inicio: h(8), fim: h(18) },
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
   * O SINAL — respondido por ela no formulário final (07/09/2026).
   *
   * ⚠️ Esta seção passou o projeto inteiro como A_CONFIRMAR porque havia
   * uma ambiguidade real: "sinal" podia ser dinheiro ou aviso. Ela
   * respondeu **"as duas coisas"**, e detalhou:
   *
   * - "se for o sinal eu cobro 50% do valor do procedimento"
   * - Chave PIX: 18997525291 (telefone, Nubank, Karolaine)
   * - "Não volta — é justamente pra ela não desmarcar"
   * - Segura o horário "até o fim do dia" esperando o comprovante
   * - Só nos serviços "de R$ 80 ou mais (brow lamination, maquiagem, curso)"
   *
   * ⚠️ A DEVOLUÇÃO É A LINHA MAIS PERIGOSA DAQUI. Uma versão anterior
   * escreveu que o sinal volta se a cliente avisar com 24 h — o contrário
   * do que ela respondeu — e isso foi pro ar como promessa de dinheiro na
   * tela de confirmação. Se alguém for mudar, tem que ser com resposta
   * dela por escrito, não por dedução.
   */
  sinal: {
    ativo: true,

    /** Metade do valor do serviço. Palavra dela. */
    porcentagem: 50,

    /**
     * Só serviços a partir deste valor pedem sinal.
     *
     * Ela escolheu "só os de R$ 80 ou mais", que na tabela de hoje são
     * brow lamination, maquiagem social e o curso. Um design de R$ 25 com
     * sinal de R$ 12,50 daria mais trabalho de conferir comprovante do que
     * o horário vale.
     *
     * Em centavos, que é a unidade em que o preço vive no banco.
     */
    minimoCentavos: 80 * 100,

    /*
      ⚠️ CHAVE DE TESTE — É A DO KAINÃ, NÃO A DA KAROL.
      Trocada em 12/09/2026 a pedido dele, pra dar pra testar o pagamento
      de ponta a ponta sem mexer no dinheiro dela.

      ANTES DE ENTREGAR, VOLTAR PARA:
        chavePix: "18997525291"
        banco: "Nubank"
        favorecido: "Karolaine Carvalho"

      Enquanto isto estiver aqui, todo QR e todo copia e cola do site
      apontam pra conta dele. Nada avisa sozinho — é este comentário.
    */
    chavePix: "16991557552",
    tipoChave: "Telefone",
    banco: "Inter",
    favorecido: "Kaina Rodrigues Pinto",

    /**
     * NÃO devolve. Resposta literal: "Não volta — é justamente pra ela não
     * desmarcar". O site não pode prometer o contrário em lugar nenhum.
     */
    devolve: false,

    /**
     * Até quando o horário fica segurado esperando o comprovante.
     * Ela escolheu "até o fim do dia".
     */
    seguraAte: "o fim do dia",
  },

  /**
   * Ela pediu pra aprovar cada agendamento na mão. Ver seção 04 do briefing:
   * a recomendação é deixar desligado e o sinal fazer o filtro, com este
   * botão disponível no painel caso ela prefira.
   * Com o sinal ativo, o agendamento pelo site entra como "pendente" até a
   * Karol conferir o comprovante e confirmar pelo painel ou WhatsApp.
   */
  /**
   * ⚠️ NÃO é mais um interruptor global — é consequência do sinal.
   *
   * Ela respondeu "Não, pode valer na hora e eu só recebo o aviso". Mas
   * também pediu sinal nos serviços de R$ 80 ou mais, e sinal só faz
   * sentido se o horário ESPERAR o comprovante.
   *
   * As duas respostas não brigam: quem marca um design de R$ 25 confirma
   * na hora; quem marca brow lamination fica `pendente` até ela conferir
   * o PIX. Quem decide é `precisaDeSinal()` em `data/servicos.ts`, não uma
   * chave booleana aqui.
   *
   * Esta constante fica como o que sobrou: se um dia ela quiser aprovar
   * TODOS na mão, é aqui que liga.
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

  /**
   * O lembrete curto, ~30 min antes — "está na hora de sair".
   *
   * ⚠️ TENSÃO COM O BRIEFING, e é de propósito. Na pergunta sobre avisos a
   * Karol marcou que NÃO queria "lembrete de horas antes". Este foi pedido
   * pelo Kainã depois, e é outra coisa na prática: horas antes é redundante
   * com o da véspera, meia hora antes é o empurrão pra pessoa sair de casa
   * — que é justamente o que evita a falta em cima da hora, o problema que
   * ela relatou (1 a 2 por semana).
   *
   * Fica aqui como interruptor porque, se ela reclamar, desligar é UMA
   * linha e não uma cirurgia. Ver `agendamentosParaLembrar`.
   */
  lembrete30MinAntes: true,
} as const;
