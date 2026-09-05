import "server-only";

import { banco } from "./banco";
import {
  blocoDoAgendamento,
  deChave,
  expedienteDoDia,
  fatiarPorDia,
  gradeDoDia,
  horariosLivres,
  paraChave,
  primeiroDiaDisponivel,
  type Horario,
  type Intervalo,
  type VagaNaGrade,
} from "./agenda";
import { lerPeriodo, montarPeriodo } from "./periodo";
import { enviarEvento } from "./notificacoes";
import { buscarServico, type Servico } from "@/data/servicos";
import { CIDADES, type CidadeId } from "@/data/negocio";

export type Agendamento = {
  id: string;
  clienteNome: string;
  clienteWhatsapp: string;
  servicoId: string;
  servicoNome: string;
  servicoPreco: number;
  cidade: string;
  inicio: Date;
  fim: Date;
  situacao: "pendente" | "confirmado" | "cancelado" | "concluido" | "faltou";
  observacao: string | null;
};

/** Converte minutos do dia numa data completa, no fuso local do servidor. */
function emData(dia: Date, minutos: number): Date {
  const d = new Date(dia);
  d.setHours(0, minutos, 0, 0);
  return d;
}

/** Converte uma linha da tabela `agendamentos` no tipo usado pela aplicação. */
function linhaParaAgendamento(r: Record<string, unknown>): Agendamento {
  const p = lerPeriodo(r.periodo as string);
  return {
    id: r.id as string,
    clienteNome: r.cliente_nome as string,
    clienteWhatsapp: r.cliente_whatsapp as string,
    servicoId: r.servico_id as string,
    servicoNome: r.servico_nome as string,
    servicoPreco: r.servico_preco as number,
    cidade: r.cidade as string,
    inicio: p?.inicio ?? new Date(),
    fim: p?.fim ?? new Date(),
    situacao: r.situacao as Agendamento["situacao"],
    observacao: (r.observacao as string | null) ?? null,
  };
}

/** Lê o que já está ocupado num intervalo de dias, agrupado por data. */
async function ocupadosNoPeriodo(
  de: Date,
  ate: Date,
): Promise<Record<string, Intervalo[]>> {
  const bd = banco();
  if (!bd) return {};

  const janela = montarPeriodo(de, ate);

  const [ags, blqs] = await Promise.all([
    bd
      .from("agendamentos")
      .select("periodo")
      .in("situacao", ["pendente", "confirmado", "concluido"])
      .overlaps("periodo", janela),
    bd.from("bloqueios").select("periodo").overlaps("periodo", janela),
  ]);

  const porDia: Record<string, Intervalo[]> = {};

  // Um período pode atravessar a meia-noite (férias são um range só), então
  // ele é recortado dia a dia. Achatar as duas pontas com getHours() fazia
  // todo bloqueio de dia fechado virar intervalo vazio — ver fatiarPorDia.
  const somar = (periodo: string) => {
    const p = lerPeriodo(periodo);
    if (!p) return;
    for (const fatia of fatiarPorDia(p.inicio, p.fim)) {
      (porDia[fatia.chave] ??= []).push({ inicio: fatia.inicio, fim: fatia.fim });
    }
  };

  (ags.data ?? []).forEach((r) => somar(r.periodo as string));
  (blqs.data ?? []).forEach((r) => somar(r.periodo as string));

  return porDia;
}

/**
 * Dias com vaga para um serviço, já consultando o que está ocupado.
 *
 * Devolve a CIDADE junto: ela muda com o dia da semana (Pereira Barreto de
 * segunda a sexta, Bandeirantes no sábado) e sem isso a cliente escolhia o
 * dia sem saber pra onde ia — descobria só no passo seguinte.
 */
export async function diasComVaga(servico: Servico, quantidade = 21) {
  const de = primeiroDiaDisponivel();
  const ate = new Date(de);
  ate.setDate(ate.getDate() + 60);

  const ocupados = await ocupadosNoPeriodo(de, ate);
  const dias: { chave: string; data: Date; vagas: number; cidade: CidadeId }[] = [];

  for (let i = 0; i < 60 && dias.length < quantidade; i++) {
    const data = new Date(de);
    data.setDate(de.getDate() + i);
    const chave = paraChave(data);
    const livres = horariosLivres({ data, servico, ocupados: ocupados[chave] ?? [] });
    if (livres.length > 0) {
      dias.push({ chave, data, vagas: livres.length, cidade: livres[0].cidade });
    }
  }

  return dias;
}

/**
 * Um mês inteiro, dia a dia, para uma cidade.
 *
 * A tela de escolher o dia é um calendário: precisa saber o que existe em
 * TODOS os dias do mês, inclusive nos que ela não atende e nos que já
 * lotaram — e não só a lista dos que sobraram.
 *
 * Uma consulta só cobre o mês inteiro. Fazer uma por dia seriam trinta
 * idas ao banco pra desenhar uma tela.
 */
export type DiaDoMes = {
  chave: string;
  data: Date;
  /** dia do mês, 1 a 31 */
  numero: number;
  /** ela atende nesse dia da semana, nessa cidade */
  atende: boolean;
  /** cedo demais: hoje ou antes da antecedência mínima */
  cedoDemais: boolean;
  vagas: number;
  total: number;
};

export async function mesDeVagas(
  servico: Servico,
  cidade: CidadeId,
  ano: number,
  mes: number,
): Promise<DiaDoMes[]> {
  const primeiro = new Date(ano, mes, 1);
  const depoisDoUltimo = new Date(ano, mes + 1, 1);

  const ocupados = await ocupadosNoPeriodo(primeiro, depoisDoUltimo);
  const limite = primeiroDiaDisponivel();

  const dias: DiaDoMes[] = [];
  for (let d = new Date(primeiro); d < depoisDoUltimo; d.setDate(d.getDate() + 1)) {
    const data = new Date(d);
    const chave = paraChave(data);
    const expediente = expedienteDoDia(data);
    const atende = expediente?.cidade === cidade;
    const cedoDemais = data < limite;

    const grade =
      atende && !cedoDemais
        ? gradeDoDia({ data, servico, ocupados: ocupados[chave] ?? [] })
        : [];

    dias.push({
      chave,
      data,
      numero: data.getDate(),
      atende,
      cedoDemais,
      vagas: grade.filter((v) => v.livre).length,
      total: grade.length,
    });
  }

  return dias;
}

/** A grade de um dia, com o que está livre e o que já foi tomado. */
export async function gradeDoDiaNaAgenda(
  servico: Servico,
  chave: string,
): Promise<VagaNaGrade[]> {
  const data = deChave(chave);
  const fim = new Date(data);
  fim.setDate(fim.getDate() + 1);
  const ocupados = await ocupadosNoPeriodo(data, fim);
  return gradeDoDia({ data, servico, ocupados: ocupados[chave] ?? [] });
}

/** Horários livres de um dia específico. */
export async function horariosDoDia(
  servico: Servico,
  chave: string,
): Promise<Horario[]> {
  const data = deChave(chave);
  const fim = new Date(data);
  fim.setDate(fim.getDate() + 1);

  const ocupados = await ocupadosNoPeriodo(data, fim);
  return horariosLivres({ data, servico, ocupados: ocupados[chave] ?? [] });
}

export type ResultadoAgendamento =
  | { ok: true; id: string; quando: Date; cidade: string }
  | { ok: false; erro: string };

/**
 * Grava o agendamento.
 *
 * A checagem de conflito é feita pelo banco, não por aqui: a restrição
 * `sem_choque` recusa qualquer sobreposição. Conferir antes e gravar depois
 * abriria uma janela pra duas clientes pegarem o mesmo horário no mesmo
 * instante — o banco fecha essa janela.
 */
export async function criarAgendamento(dados: {
  servicoId: string;
  chaveDia: string;
  inicioMin: number;
  nome: string;
  whatsapp: string;
  observacao?: string;
}): Promise<ResultadoAgendamento> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "O agendamento online ainda não está ligado." };

  const servico = buscarServico(dados.servicoId);
  if (!servico) return { ok: false, erro: "Serviço não encontrado." };

  const dia = deChave(dados.chaveDia);
  const livres = await horariosDoDia(servico, dados.chaveDia);
  if (!livres.some((h) => h.inicio === dados.inicioMin)) {
    return { ok: false, erro: "Esse horário acabou de ser ocupado. Escolha outro." };
  }

  const bloco = blocoDoAgendamento(dados.inicioMin, servico);
  const inicio = emData(dia, bloco.inicio);
  const fim = emData(dia, bloco.fim);
  const cidade = livres.find((h) => h.inicio === dados.inicioMin)!.cidade;

  const { data, error } = await bd
    .from("agendamentos")
    .insert({
      cliente_nome: dados.nome.trim(),
      cliente_whatsapp: dados.whatsapp.replace(/\D/g, ""),
      servico_id: servico.id,
      servico_nome: servico.nome,
      servico_preco: servico.preco * 100,
      cidade: CIDADES[cidade].nome,
      periodo: montarPeriodo(inicio, fim),
      observacao: dados.observacao?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    // 23P01 = violação da restrição de exclusão: alguém pegou o horário antes
    if (error.code === "23P01") {
      return { ok: false, erro: "Esse horário acabou de ser ocupado. Escolha outro." };
    }
    return { ok: false, erro: "Não consegui salvar agora. Tente de novo em instantes." };
  }

  // Avisa a Karol e confirma pra cliente. Não bloqueia nem quebra o
  // agendamento se falhar (enviarEvento engole o erro).
  const notif = {
    id: data.id,
    cliente: dados.nome.trim(),
    whatsappCliente: dados.whatsapp.replace(/\D/g, ""),
    servico: servico.nome,
    cidade: CIDADES[cidade].nome,
    inicioISO: inicio.toISOString(),
    valorCentavos: servico.preco * 100,
  };
  await Promise.all([
    enviarEvento("novo-agendamento", notif),
    enviarEvento("confirmacao", notif),
  ]);

  return { ok: true, id: data.id, quando: inicio, cidade: CIDADES[cidade].nome };
}

/** Confirmados que começam amanhã — base do lembrete de 1 dia antes. */
export async function agendamentosDeAmanha(): Promise<Agendamento[]> {
  const bd = banco();
  if (!bd) return [];

  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .eq("situacao", "confirmado")
    .overlaps("periodo", montarPeriodo(inicio, fim))
    .order("periodo", { ascending: true });

  return (data ?? []).map(linhaParaAgendamento);
}

/** Atendimentos marcados como concluídos ontem — base do agradecimento. */
export async function agendamentosConcluidosOntem(): Promise<Agendamento[]> {
  const bd = banco();
  if (!bd) return [];

  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .eq("situacao", "concluido")
    .overlaps("periodo", montarPeriodo(inicio, fim))
    .order("periodo", { ascending: true });

  return (data ?? []).map(linhaParaAgendamento);
}

/** Um agendamento pelo id — tela de confirmação da cliente e painel da Karol. */
export async function buscarAgendamento(id: string): Promise<Agendamento | null> {
  const bd = banco();
  if (!bd) return null;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return null;

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ? linhaParaAgendamento(data) : null;
}

export type SituacaoAgendamento = Agendamento["situacao"];

const SITUACOES: SituacaoAgendamento[] = [
  "pendente",
  "confirmado",
  "cancelado",
  "concluido",
  "faltou",
];

/**
 * Muda a situação de um agendamento (painel da Karol).
 *
 * Reativar um cancelado pode esbarrar na trava `sem_choque` se o horário já
 * foi retomado — nesse caso o Postgres recusa e devolvemos o motivo.
 */
export async function mudarSituacao(
  id: string,
  situacao: string,
): Promise<{ ok: boolean; erro?: string }> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "Banco não configurado." };
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return { ok: false, erro: "Agendamento inválido." };
  if (!SITUACOES.includes(situacao as SituacaoAgendamento)) {
    return { ok: false, erro: "Situação inválida." };
  }

  const { error } = await bd.from("agendamentos").update({ situacao }).eq("id", id);
  if (error) {
    if (error.code === "23P01") {
      return { ok: false, erro: "Esse horário já foi retomado por outra cliente." };
    }
    return { ok: false, erro: "Não consegui salvar agora." };
  }
  return { ok: true };
}

/** Agenda da Karol, para o painel. */
export async function agendaDaKarol(deDias = 0, ateDias = 30): Promise<Agendamento[]> {
  const bd = banco();
  if (!bd) return [];

  const hoje = new Date();
  const de = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + deDias);
  const ate = new Date(de);
  ate.setDate(ate.getDate() + ateDias);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .overlaps("periodo", montarPeriodo(de, ate))
    .order("periodo", { ascending: true });

  return (data ?? []).map(linhaParaAgendamento);
}
