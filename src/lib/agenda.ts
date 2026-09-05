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

import { EXPEDIENTE, REGRAS, type CidadeId, type DiaSemana } from "@/data/negocio";
import { blocoNaAgenda, type Servico } from "@/data/servicos";

export type Intervalo = { inicio: number; fim: number };

export type Horario = {
  /** minutos desde a meia-noite */
  inicio: number;
  /** "08:30" */
  rotulo: string;
  cidade: CidadeId;
};

/** Passo da grade de horários oferecidos. */
const PASSO_MIN = 15;

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

/** A janela de trabalho daquele dia, ou null se ela não atende. */
export function expedienteDoDia(data: Date) {
  const dia = diaDaSemana(data);
  return EXPEDIENTE.find((e) => e.dia === dia) ?? null;
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

/**
 * Horários livres para um serviço num dia.
 *
 * `ocupados` são os blocos já reservados naquele dia, já incluindo o
 * intervalo entre clientes.
 */
export function horariosLivres({
  data,
  servico,
  ocupados = [],
  agora = new Date(),
}: {
  data: Date;
  servico: Servico;
  ocupados?: Intervalo[];
  agora?: Date;
}): Horario[] {
  const expediente = expedienteDoDia(data);
  if (!expediente) return [];

  // nunca no mesmo dia, nem antes
  const limite = primeiroDiaDisponivel(agora);
  if (data < limite) return [];

  const bloco = blocoNaAgenda(servico);
  const livres: Horario[] = [];

  for (let inicio = expediente.inicio; inicio + bloco <= expediente.fim; inicio += PASSO_MIN) {
    const candidato = { inicio, fim: inicio + bloco };
    if (ocupados.some((o) => seSobrepoe(candidato, o))) continue;
    livres.push({
      inicio,
      rotulo: paraRotulo(inicio),
      cidade: expediente.cidade,
    });
  }

  return livres;
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
  const dias = EXPEDIENTE.filter((e) => e.cidade === cidade)
    .map((e) => e.dia)
    .sort((a, b) => a - b);

  if (dias.length === 0) return "";
  if (dias.length === 1) return maiuscula(NOMES_DIA[dias[0]]);
  return `${maiuscula(NOMES_DIA[dias[0]])} a ${NOMES_DIA[dias[dias.length - 1]]}`;
}

/** "das 07h às 11h" — a janela de atendimento daquela cidade. */
export function janelaDaCidade(cidade: CidadeId): string {
  const janela = EXPEDIENTE.find((e) => e.cidade === cidade);
  if (!janela) return "";
  const hh = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
  return `das ${hh(janela.inicio)} às ${hh(janela.fim)}`;
}
