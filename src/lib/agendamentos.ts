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
import { faixaDoCodigo, normalizarCodigo } from "./codigo";
import { normalizarWhatsapp } from "./telefone";
import { buscarServico, type Servico } from "@/data/servicos";
import { CIDADES, NEGOCIO, type CidadeId } from "@/data/negocio";

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

/**
 * Procura agendamento pelo que a Karol tem na mão.
 *
 * Ela chega aqui vindo do WhatsApp, com uma dessas três coisas: o código que
 * a cliente mandou, o nome que aparece na conversa, ou o número. Um campo só
 * atende os três — obrigar a escolher "buscar por…" antes de digitar é
 * fricção que não paga o que resolve.
 *
 * Busca no histórico inteiro, não só nos próximos 30 dias: quem pergunta
 * "quando foi meu último atendimento?" precisa do passado.
 */
export async function procurarAgendamentos(termo: string): Promise<Agendamento[]> {
  const bd = banco();
  if (!bd) return [];

  const limpo = termo.trim();
  if (limpo.length < 3) return [];

  const codigo = normalizarCodigo(limpo);
  if (codigo) {
    // Comparação de intervalo no uuid: usa o índice da chave primária.
    const { de, ate } = faixaDoCodigo(codigo);
    const { data } = await bd
      .from("agendamentos")
      .select("*")
      .gte("id", de)
      .lte("id", ate)
      .order("periodo", { ascending: false })
      .limit(LIMITE_BUSCA);
    return (data ?? []).map(linhaParaAgendamento);
  }

  const digitos = limpo.replace(/\D/g, "");
  // Quatro dígitos é o mínimo que distingue alguém — menos que isso casa com
  // meia agenda e a Karol acha mais rápido rolando a tela.
  const coluna = digitos.length >= 4 ? "cliente_whatsapp" : "cliente_nome";
  const alvo = digitos.length >= 4 ? digitos : limpo;

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    // `%` e `_` são curingas do LIKE: sem escapar, um nome com underline
    // vira busca genérica. `\` escapa os dois no Postgres.
    .ilike(coluna, `%${alvo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
    .order("periodo", { ascending: false })
    .limit(LIMITE_BUSCA);

  return (data ?? []).map(linhaParaAgendamento);
}

/** Teto de resultados da busca. Ela procura UMA cliente, não relatório. */
const LIMITE_BUSCA = 25;

/**
 * O próximo atendimento marcado deste número.
 *
 * Serve o webhook do WhatsApp: a cliente escreve, e o que ela quase sempre
 * quer saber é do horário que ainda vai acontecer. Cancelado e concluído
 * ficam de fora — quem pergunta "que horas é o meu?" não está falando do
 * que já passou.
 */
export async function proximoAgendamentoDe(whatsapp: string): Promise<Agendamento | null> {
  const bd = banco();
  if (!bd) return null;
  if (!/^[0-9]{10,15}$/.test(whatsapp)) return null;

  // `overlaps` e não `gte`: `periodo` é um tstzrange, e comparar range com
  // timestamp não é a mesma operação. O overlaps ainda usa o índice gist.
  const agora = new Date();
  const limite = new Date(agora);
  limite.setFullYear(limite.getFullYear() + 1);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .eq("cliente_whatsapp", whatsapp)
    .in("situacao", ["pendente", "confirmado"])
    .overlaps("periodo", montarPeriodo(agora, limite))
    .order("periodo", { ascending: true })
    .limit(1);

  const linha = (data ?? [])[0];
  return linha ? linhaParaAgendamento(linha) : null;
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

/* ------------------------------------------------------------------ */
/* O que a Karol faz pelo painel                                       */
/* ------------------------------------------------------------------ */

/** Constrói o período de um atendimento a partir do dia e da hora. */
function periodoDe(chaveDia: string, horaMin: number, servico: Servico) {
  const dia = deChave(chaveDia);
  const bloco = blocoDoAgendamento(horaMin, servico);
  return { inicio: emData(dia, bloco.inicio), fim: emData(dia, bloco.fim) };
}

/** "08:30" → 510. Devolve null se não for hora válida. */
export function horaEmMinutos(hora: string): number | null {
  const m = hora.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Agendamento criado pela própria Karol, no painel.
 *
 * Difere do fluxo da cliente de propósito: aqui ela escolhe QUALQUER
 * horário, não só os da grade. É pra encaixar a mãe, o pai, uma cliente
 * que ligou — casos que não cabem no passo de 15 minutos.
 *
 * A segurança contra choque continua sendo a mesma do site: a restrição
 * `sem_choque` no banco. Ela é quem recusa sobreposição, aqui e lá.
 */
export async function criarAgendamentoNoPainel(dados: {
  servicoId: string;
  cidade: CidadeId;
  chaveDia: string;
  hora: string;
  nome: string;
  whatsapp: string;
  observacao?: string;
}): Promise<{ ok: boolean; id?: string; erro?: string }> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "Banco não configurado." };

  const servico = buscarServico(dados.servicoId);
  if (!servico) return { ok: false, erro: "Serviço não encontrado." };

  const horaMin = horaEmMinutos(dados.hora);
  if (horaMin === null) return { ok: false, erro: "Hora no formato HH:MM." };

  const nome = dados.nome.trim();
  if (nome.length < 2 || nome.length > 120) {
    return { ok: false, erro: "Escreva o nome (2 a 120 letras)." };
  }

  // Vazio é permitido aqui (encaixe da família, sem WhatsApp). Preenchido,
  // tem que sair com DDI — ver a explicação em lib/telefone.ts.
  const bruto = dados.whatsapp.trim();
  const whatsapp = bruto ? normalizarWhatsapp(bruto) : "";
  if (bruto && !whatsapp) {
    return { ok: false, erro: "WhatsApp com DDD, só números." };
  }

  const { inicio, fim } = periodoDe(dados.chaveDia, horaMin, servico);
  if (Number.isNaN(inicio.getTime())) return { ok: false, erro: "Data inválida." };

  const { data, error } = await bd
    .from("agendamentos")
    .insert({
      cliente_nome: nome,
      // sem WhatsApp (encaixe da família, por exemplo) o CHECK do banco
      // recusaria vazio, então guarda o número dela mesma
      cliente_whatsapp: whatsapp || NEGOCIO.whatsapp.numero,
      servico_id: servico.id,
      servico_nome: servico.nome,
      servico_preco: servico.preco * 100,
      cidade: CIDADES[dados.cidade].nome,
      periodo: montarPeriodo(inicio, fim),
      observacao: dados.observacao?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23P01") {
      return { ok: false, erro: "Já existe atendimento nesse horário." };
    }
    return { ok: false, erro: "Não consegui salvar agora." };
  }

  return { ok: true, id: data.id };
}

/**
 * Remarca um atendimento: muda o dia e a hora, mantendo o resto.
 *
 * O bloco é recalculado pela duração do serviço gravado, não pela duração
 * antiga — se o serviço mudou de duração no meio do caminho, o horário
 * remarcado sai com o tempo certo.
 */
export async function remarcarAgendamento(
  id: string,
  chaveDia: string,
  hora: string,
): Promise<{ ok: boolean; erro?: string }> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "Banco não configurado." };
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return { ok: false, erro: "Agendamento inválido." };

  const horaMin = horaEmMinutos(hora);
  if (horaMin === null) return { ok: false, erro: "Hora no formato HH:MM." };

  const atual = await buscarAgendamento(id);
  if (!atual) return { ok: false, erro: "Agendamento não encontrado." };

  const servico = buscarServico(atual.servicoId);
  if (!servico) return { ok: false, erro: "Serviço do agendamento não existe mais." };

  const { inicio, fim } = periodoDe(chaveDia, horaMin, servico);
  if (Number.isNaN(inicio.getTime())) return { ok: false, erro: "Data inválida." };

  const { error } = await bd
    .from("agendamentos")
    .update({ periodo: montarPeriodo(inicio, fim) })
    .eq("id", id);

  if (error) {
    if ((error as { code?: string }).code === "23P01") {
      return { ok: false, erro: "Já existe atendimento nesse horário." };
    }
    return { ok: false, erro: "Não consegui remarcar agora." };
  }

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Relatório do mês                                                    */
/* ------------------------------------------------------------------ */

export type LinhaRelatorio = { nome: string; quantidade: number; total: number };

/** Quem não apareceu — com o contato, pra ela poder cobrar ou remarcar. */
export type Falta = {
  id: string;
  cliente: string;
  whatsapp: string;
  servico: string;
  quando: Date;
  valorPerdido: number;
};

export type Relatorio = {
  atendidas: number;
  faltaram: number;
  canceladas: number;
  /** confirmados que ainda vão acontecer (ou não foram marcados ainda) */
  pendentes: number;
  /** em centavos, só do que ela marcou como Atendida */
  faturamento: number;
  /** em centavos */
  ticketMedio: number;
  /** % de faltas sobre o que já passou (atendidas + faltas) */
  taxaFalta: number;
  /** quanto deixou de entrar por causa das faltas, em centavos */
  perdidoComFaltas: number;
  porServico: LinhaRelatorio[];
  porCidade: LinhaRelatorio[];
  /** as faltas do mês, da mais recente pra mais antiga */
  faltas: Falta[];
};

/**
 * Números do mês, para o painel.
 *
 * **O faturamento conta só o que ela marcou como Atendida.** Agendamento
 * confirmado que ainda não aconteceu não vira dinheiro no relatório — senão
 * o número sobe no começo do mês e cai quando alguém falta, o que confunde
 * mais do que informa.
 *
 * ⚠️ O valor vem do preço da tabela **no momento do agendamento**, que fica
 * congelado na linha. Se ela cobrar diferente na hora (desconto pra amiga,
 * combinado à parte), o relatório não sabe.
 */
export async function relatorioDoMes(ano: number, mes: number): Promise<Relatorio> {
  const vazio: Relatorio = {
    atendidas: 0, faltaram: 0, canceladas: 0, pendentes: 0,
    faturamento: 0, ticketMedio: 0, taxaFalta: 0, perdidoComFaltas: 0,
    porServico: [], porCidade: [], faltas: [],
  };

  const bd = banco();
  if (!bd) return vazio;

  const primeiro = new Date(ano, mes, 1);
  const depoisDoUltimo = new Date(ano, mes + 1, 1);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .overlaps("periodo", montarPeriodo(primeiro, depoisDoUltimo))
    .order("periodo", { ascending: true });

  const linhas = (data ?? []).map(linhaParaAgendamento);
  if (linhas.length === 0) return vazio;

  const r = { ...vazio, porServico: [], porCidade: [], faltas: [] } as Relatorio;
  const servicos = new Map<string, LinhaRelatorio>();
  const cidades = new Map<string, LinhaRelatorio>();

  for (const a of linhas) {
    if (a.situacao === "cancelado") { r.canceladas++; continue; }
    if (a.situacao === "faltou") {
      r.faltaram++;
      r.perdidoComFaltas += a.servicoPreco;
      r.faltas.push({
        id: a.id,
        cliente: a.clienteNome,
        whatsapp: a.clienteWhatsapp,
        servico: a.servicoNome,
        quando: a.inicio,
        valorPerdido: a.servicoPreco,
      });
      continue;
    }
    if (a.situacao !== "concluido") { r.pendentes++; continue; }

    r.atendidas++;
    r.faturamento += a.servicoPreco;

    for (const [mapa, chave] of [
      [servicos, a.servicoNome],
      [cidades, a.cidade],
    ] as const) {
      const atual = mapa.get(chave) ?? { nome: chave, quantidade: 0, total: 0 };
      atual.quantidade++;
      atual.total += a.servicoPreco;
      mapa.set(chave, atual);
    }
  }

  const passadas = r.atendidas + r.faltaram;
  r.ticketMedio = r.atendidas > 0 ? Math.round(r.faturamento / r.atendidas) : 0;
  r.taxaFalta = passadas > 0 ? Math.round((r.faltaram / passadas) * 100) : 0;

  // da falta mais recente pra mais antiga: a de ontem importa mais
  r.faltas.sort((a, b) => b.quando.getTime() - a.quando.getTime());

  const porTotal = (a: LinhaRelatorio, b: LinhaRelatorio) => b.total - a.total;
  r.porServico = [...servicos.values()].sort(porTotal);
  r.porCidade = [...cidades.values()].sort(porTotal);

  return r;
}
