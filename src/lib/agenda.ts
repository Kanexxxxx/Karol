/**
 * Motor de horários.
 *
 * Regras, todas vindas do briefing que a Karol respondeu em 29/08/2026:
 *
 * - o expediente muda por dia E por cidade (seg a sex em Pereira Barreto,
 *   sábado em Bandeirantes). É a regra que quebra qualquer agenda genérica.
 * - cada serviço ocupa a sua duração máxima mais 10 minutos de intervalo.
 * - uma cliente por vez: dois agendamentos nunca se sobrepõem.
 * - nada no mesmo dia — só a partir do dia seguinte.
 *
 * Tudo aqui é função pura sobre minutos do dia, sem fuso e sem Date por
 * dentro. Quem lida com data é quem chama.
 */

import { EXPEDIENTE, REGRAS, type CidadeId, type DiaSemana, type Expediente } from "@/data/negocio";
import { blocoNaAgenda, type Servico } from "@/data/servicos";

export type Intervalo = { inicio: number; fim: number };

export type Horario = {
  /** minutos desde a meia-noite */
  inicio: number;
  /** "08:30" */
  rotulo: string;
  cidade: CidadeId;
};

/**
 * Passo da grade de horários oferecidos — de hora em hora, em hora cheia.
 *
 * ---------------------------------------------------------------------
 * Por que deixou de ser 15 minutos
 * ---------------------------------------------------------------------
 *
 * Pedido da Karol, 16/09/2026, pelo Kainã: *"pra cliente agendar tá lá
 * uma hora, ou 1h15, ou 1h30, ou 1h45. Será que teria como deixar só
 * 1h, 2h, 3h — e não horário quebrado?"*
 *
 * ⚠️ E O PEDIDO DELA É MAIS CERTO DO QUE PARECE, porque a grade de 15
 * minutos era uma ilusão de capacidade. Um design leva 50 minutos com o
 * intervalo. Oferecer 07:00, 07:15, 07:30 e 07:45 não dava quatro vagas:
 * quem pegasse 07:00 derrubava as outras três. A tela mostrava treze
 * horários numa manhã em que cabiam quatro clientes.
 *
 * Então a mudança não custa vaga nenhuma — devolve a verdade. A manhã de
 * Pereira (7h–11h) oferece 07:00, 08:00, 09:00 e 10:00, que é exatamente
 * o que cabe.
 *
 * ---------------------------------------------------------------------
 * ⚠️ HORA CHEIA NÃO É SÓ O PASSO
 * ---------------------------------------------------------------------
 *
 * O turno da noite abre às **18:30**. Contando de hora em hora a partir
 * da abertura, sairia 18:30, 19:30, 20:30 — quebrado do mesmo jeito, e o
 * pedido dela continuaria sem resposta.
 *
 * Por isso o laço começa na primeira hora cheia DEPOIS da abertura. A
 * noite oferece 19:00, 20:00 e 21:00.
 *
 * O preço são os trinta minutos entre 18:30 e 19:00, que deixam de ser
 * ofertados pelo site. Ela continua podendo encaixar ali pelo painel, que
 * é onde ela decide sabendo o que quer.
 */
const PASSO_MIN = 60;

/**
 * A primeira hora CHEIA de um turno — onde a grade começa a oferecer.
 *
 * ⚠️ EXISTE PRA SER USADA NOS DOIS LUGARES, e esse é o ponto dela.
 *
 * O turno da noite abre 18:30 no `EXPEDIENTE`, mas a grade só oferece
 * 19:00. Quem MOSTRA o horário pra cliente (`horarioDaCidade`) e quem
 * GERA as vagas (`gradeDoDia`) têm que concordar — senão o site anuncia
 * "18h30 às 22h" e não tem 18:30 pra clicar, e o assistente chega a se
 * contradizer na mesma frase: "18:30 não cabe — o horário é 18h30 às 22h".
 *
 * Isso aconteceu de verdade, em 17/09/2026, por eu ter mudado a grade e
 * esquecido do texto.
 */
function primeiraHoraOferecida(inicioDoTurno: number): number {
  return Math.ceil(inicioDoTurno / PASSO_MIN) * PASSO_MIN;
}

export function paraRotulo(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function diaDaSemana(data: Date): DiaSemana {
  return data.getDay() as DiaSemana;
}

/** Data no formato AAAA-MM-DD, no fuso local — sem passar por UTC. */
export function paraChave(data: Date): string {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

export function deChave(chave: string): Date {
  const [a, m, d] = chave.split("-").map(Number);
  return new Date(a, m - 1, d);
}

/** As janelas de trabalho daquele dia (pode ter mais de uma, ex: manhã e noite). */
export function expedientesDoDia(data: Date): Expediente[] {
  const dia = diaDaSemana(data);
  return EXPEDIENTE.filter((e) => e.dia === dia);
}

/**
 * Primeira janela de trabalho do dia, mantida para compatibilidade.
 * @deprecated Prefira `expedientesDoDia(data)` para contemplar todos os turnos.
 */
export function expedienteDoDia(data: Date): Expediente | null {
  return expedientesDoDia(data)[0] ?? null;
}

/** Primeiro dia que aceita agendamento (hoje + antecedência mínima). */
export function primeiroDiaDisponivel(hoje = new Date()): Date {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  d.setDate(d.getDate() + REGRAS.antecedenciaMinimaDias);
  return d;
}

function seSobrepoe(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

/** Um horário da grade, sabendo se ainda dá pra pegar. */
export type VagaNaGrade = Horario & { livre: boolean };

/**
 * A grade inteira do dia, marcando o que está livre e o que já foi tomado.
 *
 * Mostrar o que está ocupado é escolha, não descuido: uma agenda que só
 * exibe o que sobrou parece vazia justamente quando está cheia, e não dá
 * à cliente noção nenhuma do movimento. `horariosLivres` é esta grade
 * filtrada — as duas telas partem do mesmo cálculo, então não há como
 * uma discordar da outra.
 */
export function gradeDoDia({
  data,
  servico,
  ocupados = [],
  agora = new Date(),
  cidade,
}: {
  data: Date;
  servico: Servico;
  ocupados?: Intervalo[];
  agora?: Date;
  cidade?: CidadeId;
}): VagaNaGrade[] {
  const expedientes = expedientesDoDia(data).filter(
    (e) => !cidade || e.cidade === cidade,
  );
  if (expedientes.length === 0) return [];

  // nunca no mesmo dia, nem antes
  const limite = primeiroDiaDisponivel(agora);
  if (data < limite) return [];

  const bloco = blocoNaAgenda(servico);
  const grade: VagaNaGrade[] = [];

  for (const expediente of expedientes) {
    // Ver `primeiraHoraOferecida`: sem isto, o turno da noite (18:30)
    // ofereceria 18:30, 19:30, 20:30.
    const primeiraHoraCheia = primeiraHoraOferecida(expediente.inicio);

    for (let inicio = primeiraHoraCheia; inicio + bloco <= expediente.fim; inicio += PASSO_MIN) {
      const candidato = { inicio, fim: inicio + bloco };
      grade.push({
        inicio,
        rotulo: paraRotulo(inicio),
        cidade: expediente.cidade,
        livre: !ocupados.some((o) => seSobrepoe(candidato, o)),
      });
    }
  }

  return grade.sort((a, b) => a.inicio - b.inicio);
}

/**
 * Horários livres para um serviço num dia.
 *
 * `ocupados` são os blocos já reservados naquele dia, já incluindo o
 * intervalo entre clientes.
 */
export function horariosLivres(argumentos: Parameters<typeof gradeDoDia>[0]): Horario[] {
  return gradeDoDia(argumentos).filter((v) => v.livre);
}

/** Os próximos N dias que têm pelo menos um horário livre. */
export function proximosDiasComVaga({
  servico,
  ocupadosPorDia = {},
  quantidade = 14,
  agora = new Date(),
}: {
  servico: Servico;
  ocupadosPorDia?: Record<string, Intervalo[]>;
  quantidade?: number;
  agora?: Date;
}): { chave: string; data: Date; vagas: number }[] {
  const dias: { chave: string; data: Date; vagas: number }[] = [];
  const cursor = primeiroDiaDisponivel(agora);

  // olha até 60 dias à frente pra achar as datas pedidas
  for (let i = 0; i < 60 && dias.length < quantidade; i++) {
    const data = new Date(cursor);
    data.setDate(cursor.getDate() + i);
    const chave = paraChave(data);
    const vagas = horariosLivres({
      data,
      servico,
      ocupados: ocupadosPorDia[chave] ?? [],
      agora,
    }).length;
    if (vagas > 0) dias.push({ chave, data, vagas });
  }

  return dias;
}

/** O bloco que um agendamento ocupa, já com o intervalo somado. */
export function blocoDoAgendamento(inicio: number, servico: Servico): Intervalo {
  return { inicio, fim: inicio + blocoNaAgenda(servico) };
}

/** Minutos num dia inteiro. Um bloqueio de dia fechado vai de 0 a 1440. */
export const MINUTOS_NO_DIA = 24 * 60;

/**
 * Recorta um período em fatias de um dia, em minutos.
 *
 * O motor raciocina em minutos dentro de um dia, mas um período do banco
 * pode atravessar a meia-noite — férias de uma semana são um `tstzrange` só.
 * Achatar esse período com `getHours()` nas duas pontas devolvia `{0, 0}`
 * para um dia fechado (a ponta final cai à meia-noite do dia SEGUINTE), ou
 * seja: um intervalo vazio, que não colidia com nada. Feriado e férias não
 * bloqueavam a agenda.
 *
 * Aqui cada dia tocado pelo período vira uma fatia própria, e a meia-noite
 * do dia seguinte vira 1440 em vez de 0.
 */
export function fatiarPorDia(
  inicio: Date,
  fim: Date,
): { chave: string; inicio: number; fim: number }[] {
  const fatias: { chave: string; inicio: number; fim: number }[] = [];
  if (!(fim > inicio)) return fatias;

  const minutos = (d: Date) => d.getHours() * 60 + d.getMinutes();
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());

  // limite de segurança: um bloqueio absurdo não pode virar laço infinito
  for (let i = 0; cursor < fim && i < 400; i++) {
    const amanha = new Date(cursor);
    amanha.setDate(amanha.getDate() + 1);

    const de = inicio > cursor ? inicio : cursor;
    const ate = fim < amanha ? fim : amanha;

    if (ate > de) {
      fatias.push({
        chave: paraChave(cursor),
        inicio: minutos(de),
        // a meia-noite que FECHA o dia é o fim dele, não o começo
        fim: ate.getTime() === amanha.getTime() ? MINUTOS_NO_DIA : minutos(ate),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return fatias;
}

const NOMES_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const maiuscula = (t: string) => t.replace(/^./, (c) => c.toUpperCase());

/**
 * "Segunda a sexta", "Sábado" — os dias em que ela atende numa cidade.
 *
 * A home e a seção de local mostravam a mesma frase, cada uma com a sua
 * cópia da lógica e a sua lista de nomes de dia. Agora sai daqui, junto do
 * EXPEDIENTE que é a fonte da verdade.
 */
export function faixaDeDias(cidade: CidadeId): string {
  const dias = Array.from(
    new Set(EXPEDIENTE.filter((e) => e.cidade === cidade).map((e) => e.dia)),
  ).sort((a, b) => a - b);

  if (dias.length === 0) return "";
  if (dias.length === 1) return maiuscula(NOMES_DIA[dias[0]]);

  // Segunda a sexta (1..5) e domingo (0)
  const temSegASex = [1, 2, 3, 4, 5].every((d) => dias.includes(d as DiaSemana));
  if (temSegASex && dias.includes(0) && dias.length === 6) {
    return "Segunda a sexta e domingo";
  }
  if (temSegASex && dias.length === 5) {
    return "Segunda a sexta";
  }

  return `${maiuscula(NOMES_DIA[dias[0]])} a ${NOMES_DIA[dias[dias.length - 1]]}`;
}

/** "19h", "7h", "22h" — hora enxuta, do jeito que se fala. */
function hh(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/**
 * Domingo por último.
 *
 * `Date.getDay()` põe domingo como 0, então ordenar pelo número cru faz o
 * domingo aparecer antes da segunda — "domingo 8h às 18h · seg a sex 7h
 * às 11h", que é como ninguém fala.
 */
const ordemDoDia = (d: DiaSemana) => (d === 0 ? 7 : d);

/** "Seg a sex", "Domingo", "Sábado" — o rótulo de um conjunto de dias. */
function rotuloDeDias(dias: DiaSemana[]): string {
  const ordenados = [...new Set(dias)].sort((a, b) => ordemDoDia(a) - ordemDoDia(b));
  if (ordenados.length === 1) return maiuscula(NOMES_DIA[ordenados[0]]);

  const ehSegASex =
    ordenados.length === 5 && [1, 2, 3, 4, 5].every((d) => ordenados.includes(d as DiaSemana));
  if (ehSegASex) return "Seg a sex";

  /*
    Desde que o domingo passou a ter os mesmos turnos da semana, esta
    função caía no último caso e escrevia "Seg, ter, qua, qui, sex, dom" —
    seis abreviações seguidas que ninguém lê. Estes dois atalhos existem
    porque são os agrupamentos que a agenda dela produz de verdade.
  */
  if (ordenados.length === 7) return "Todo dia";
  if (ordenados.length === 6 && !ordenados.includes(6)) return "Seg a sex e domingo";

  return maiuscula(ordenados.map((d) => NOMES_DIA[d].slice(0, 3)).join(", "));
}

/**
 * O horário de atendimento de uma cidade, por extenso e completo.
 *
 * ⚠️ ISTO É DERIVADO DO `EXPEDIENTE`, e tem que continuar sendo.
 *
 * Uma versão anterior chumbou a string de Pereira Barreto dentro da função
 * quando os turnos da noite e do domingo entraram — `if (cidade ===
 * "pereira-barreto") return "7h às 11h e 18h30 às 22h · Dom: 8h às 18h"`.
 * Funciona no dia em que se escreve e vira mentira no dia em que ela muda
 * o horário: a agenda passa a oferecer uma coisa e o site a dizer outra,
 * sem nada quebrar pra denunciar.
 *
 * Este projeto já pagou esse preço antes — o domínio chumbado em três
 * arquivos, a frase "Segunda a sexta" calculada duas vezes. Uma fonte da
 * verdade só, sempre.
 *
 * Como monta: agrupa as janelas por CONJUNTO DE DIAS e escreve um trecho
 * por grupo. Ela tem dois turnos de semana e um domingo diferente, então
 * sai "Seg a sex, 7h às 11h e 18h30 às 22h · Domingo, 8h às 18h".
 */
export function horarioDaCidade(cidade: CidadeId): string {
  const daCidade = EXPEDIENTE.filter((e) => e.cidade === cidade);
  if (daCidade.length === 0) return "";

  // dia -> as janelas daquele dia, já em texto
  const porDia = new Map<DiaSemana, string[]>();
  for (const e of daCidade) {
    // ⚠️ `primeiraHoraOferecida` e não `e.inicio`: o texto tem que dizer o
    // que dá pra clicar. A noite abre 18:30 pra ELA, e começa 19:00 pra
    // cliente. Ver a nota da função.
    const abre = hh(primeiraHoraOferecida(e.inicio));
    porDia.set(e.dia, [...(porDia.get(e.dia) ?? []), `${abre} às ${hh(e.fim)}`]);
  }

  // agrupa os dias que têm exatamente o mesmo conjunto de janelas
  const porHorario = new Map<string, DiaSemana[]>();
  for (const [dia, janelas] of porDia) {
    const chave = janelas.join(" e ");
    porHorario.set(chave, [...(porHorario.get(chave) ?? []), dia]);
  }

  return [...porHorario.entries()]
    .sort(
      (a, b) =>
        Math.min(...a[1].map(ordemDoDia)) - Math.min(...b[1].map(ordemDoDia)),
    )
    .map(([horario, dias]) => `${rotuloDeDias(dias)}, ${horario}`)
    .join(" · ");
}
