import { REGRAS } from "./negocio";

export type Servico = {
  id: string;
  nome: string;
  /** Em reais. Ela optou por mostrar todos os preços no site. */
  preco: number;
  duracaoMinMin: number;
  duracaoMaxMin: number;
  /**
   * Texto de apoio. RASCUNHO — precisa da aprovação da Karol antes
   * de ir ao ar. São afirmações sobre o trabalho dela.
   */
  descricao: string;
  categoria: "sobrancelha" | "maquiagem" | "curso";
  /**
   * Aparece na lista de agendar pelo site.
   *
   * O curso não aparece: são 130 min numa janela de 240 min de dia útil, ou
   * seja, ele come mais da metade do dia e some da agenda assim que existe
   * qualquer outro atendimento na manhã. Além disso a data é combinada
   * entre as duas — não é escolher horário numa grade.
   *
   * Ele continua no site inteiro (preço, descrição, seção própria); o que
   * muda é que a conversa começa no WhatsApp da Karol.
   */
  agendavel: boolean;
};

/** Preços e durações informados por ela no briefing de 29/08/2026. */
export const SERVICOS: Servico[] = [
  {
    id: "design-simples",
    nome: "Design de sobrancelha",
    preco: 25,
    duracaoMinMin: 30,
    duracaoMaxMin: 40,
    descricao:
      "Modelagem da sobrancelha de acordo com o formato do seu rosto.",
    categoria: "sobrancelha",
    agendavel: true,
  },
  {
    id: "design-henna",
    nome: "Design com henna",
    preco: 30,
    duracaoMinMin: 40,
    duracaoMaxMin: 60,
    descricao:
      "A modelagem com aplicação de henna, que preenche as falhas e marca o desenho.",
    categoria: "sobrancelha",
    agendavel: true,
  },
  {
    id: "design-masculino",
    nome: "Design masculino",
    preco: 25,
    duracaoMinMin: 30,
    duracaoMaxMin: 40,
    descricao:
      "Modelagem masculina, com acabamento discreto e natural.",
    categoria: "sobrancelha",
    agendavel: true,
  },
  {
    id: "brow-lamination",
    nome: "Brow lamination",
    preco: 80,
    duracaoMinMin: 60,
    duracaoMaxMin: 90,
    descricao:
      "Alinhamento dos fios, que deixa a sobrancelha mais cheia e penteada.",
    categoria: "sobrancelha",
    agendavel: true,
  },
  {
    id: "maquiagem-social",
    nome: "Maquiagem social",
    preco: 100,
    duracaoMinMin: 40,
    duracaoMaxMin: 60,
    descricao:
      "Maquiagem para festa, casamento, formatura e ensaio.",
    categoria: "maquiagem",
    agendavel: true,
  },
  {
    id: "curso-automaquiagem",
    nome: "Curso de automaquiagem",
    preco: 120,
    duracaoMinMin: 120,
    duracaoMaxMin: 120,
    descricao:
      "Aula individual e presencial pra você aprender a se maquiar sozinha. Você sai com certificado.",
    categoria: "curso",
    agendavel: false,
  },
];

/**
 * Quanto o serviço ocupa de fato na agenda: a duração máxima mais o
 * intervalo que ela pediu entre uma cliente e outra. É este número que o
 * motor de horários usa, não a duração crua.
 */
export function blocoNaAgenda(servico: Servico): number {
  return servico.duracaoMaxMin + REGRAS.intervaloMin;
}

export function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });
}

export function formatarDuracao(servico: Servico): string {
  const { duracaoMinMin: min, duracaoMaxMin: max } = servico;
  const rotulo = (m: number) =>
    m >= 60 && m % 60 === 0 ? `${m / 60}h` : m >= 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m} min`;
  return min === max ? rotulo(max) : `${rotulo(min)} a ${rotulo(max)}`;
}

export function buscarServico(id: string): Servico | undefined {
  return SERVICOS.find((s) => s.id === id);
}

/**
 * Os serviços que a cliente escolhe no `/agendar`.
 *
 * O site inteiro continua usando `SERVICOS` — preço, rodapé, seções. Só a
 * grade de horários usa esta lista menor. Ver o comentário de `agendavel`.
 */
export const SERVICOS_AGENDAVEIS: Servico[] = SERVICOS.filter((s) => s.agendavel);

/** Como `buscarServico`, mas recusa o que não se marca pelo site. */
export function buscarServicoAgendavel(id: string): Servico | undefined {
  const s = buscarServico(id);
  return s?.agendavel ? s : undefined;
}

/* ------------------------------------------------------------------ */
/* O sinal                                                             */
/* ------------------------------------------------------------------ */

/**
 * Este serviço pede sinal adiantado?
 *
 * ⚠️ A regra é do VALOR, não do serviço. Ela respondeu "só os de R$ 80 ou
 * mais (brow lamination, maquiagem, curso)" — que é exatamente o que sai
 * deste corte na tabela de hoje. Amarrando ao preço em vez de a uma lista
 * de ids, um serviço novo caro já nasce pedindo sinal e um reajuste não
 * exige lembrar de mexer aqui.
 *
 * É isto que reconcilia as duas respostas dela que pareciam brigar: ela
 * quer sinal, E quer que o agendamento valha na hora. As duas valem —
 * cada uma pra uma faixa de preço. Design de R$ 25 confirma na hora; brow
 * lamination espera o comprovante.
 */
/**
 * A regra em CENTAVOS — a unidade que o banco e as notificações usam.
 *
 * ⚠️ Existe separada de `precisaDeSinal` porque quem monta a mensagem do
 * WhatsApp só tem o valor, não o objeto do serviço. Uma versão anterior
 * calculou 50% de qualquer agendamento pendente sem conferir o mínimo, e
 * um design de R$ 30 aparecia pedindo R$ 15 de sinal — num serviço em que
 * ela não quer sinal nenhum.
 */
export function pedeSinalPorValor(centavos: number): boolean {
  return REGRAS.sinal.ativo && centavos >= REGRAS.sinal.minimoCentavos;
}

export function precisaDeSinal(servico: Servico): boolean {
  return pedeSinalPorValor(servico.preco * 100);
}

/** Quanto de sinal, em CENTAVOS. Zero quando o serviço não pede. */
export function valorDoSinal(servico: Servico): number {
  if (!precisaDeSinal(servico)) return 0;
  return Math.round((servico.preco * 100 * REGRAS.sinal.porcentagem) / 100);
}
