import "server-only";

import { banco } from "./banco";
import {
  blocoDoAgendamento,
  deChave,
  horariosLivres,
  paraChave,
  primeiroDiaDisponivel,
  type Horario,
  type Intervalo,
} from "./agenda";
import { buscarServico, type Servico } from "@/data/servicos";
import { CIDADES } from "@/data/negocio";

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

/** Lê o que já está ocupado num intervalo de dias, agrupado por data. */
async function ocupadosNoPeriodo(
  de: Date,
  ate: Date,
): Promise<Record<string, Intervalo[]>> {
  const bd = banco();
  if (!bd) return {};

  const janela = `[${de.toISOString()},${ate.toISOString()})`;

  const [ags, blqs] = await Promise.all([
    bd
      .from("agendamentos")
      .select("periodo")
      .in("situacao", ["pendente", "confirmado", "concluido"])
      .overlaps("periodo", janela),
    bd.from("bloqueios").select("periodo").overlaps("periodo", janela),
  ]);

  const porDia: Record<string, Intervalo[]> = {};

  const somar = (periodo: string) => {
    // formato do Postgres: ["2026-09-01 08:00:00+00","2026-09-01 09:00:00+00")
    const m = periodo.match(/\[?"?([^",]+)"?,"?([^")]+)"?\)?/);
    if (!m) return;
    const inicio = new Date(m[1]);
    const fim = new Date(m[2]);
    const chave = paraChave(inicio);
    const minutos = (d: Date) => d.getHours() * 60 + d.getMinutes();
    (porDia[chave] ??= []).push({ inicio: minutos(inicio), fim: minutos(fim) });
  };

  (ags.data ?? []).forEach((r) => somar(r.periodo as string));
  (blqs.data ?? []).forEach((r) => somar(r.periodo as string));

  return porDia;
}

/** Dias com vaga para um serviço, já consultando o que está ocupado. */
export async function diasComVaga(servico: Servico, quantidade = 21) {
  const de = primeiroDiaDisponivel();
  const ate = new Date(de);
  ate.setDate(ate.getDate() + 60);

  const ocupados = await ocupadosNoPeriodo(de, ate);
  const dias: { chave: string; data: Date; vagas: number }[] = [];

  for (let i = 0; i < 60 && dias.length < quantidade; i++) {
    const data = new Date(de);
    data.setDate(de.getDate() + i);
    const chave = paraChave(data);
    const vagas = horariosLivres({
      data,
      servico,
      ocupados: ocupados[chave] ?? [],
    }).length;
    if (vagas > 0) dias.push({ chave, data, vagas });
  }

  return dias;
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
      periodo: `[${inicio.toISOString()},${fim.toISOString()})`,
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

  return { ok: true, id: data.id, quando: inicio, cidade: CIDADES[cidade].nome };
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
    .overlaps("periodo", `[${de.toISOString()},${ate.toISOString()})`)
    .order("periodo", { ascending: true });

  return (data ?? []).map((r) => {
    const m = (r.periodo as string).match(/\[?"?([^",]+)"?,"?([^")]+)"?\)?/);
    return {
      id: r.id,
      clienteNome: r.cliente_nome,
      clienteWhatsapp: r.cliente_whatsapp,
      servicoId: r.servico_id,
      servicoNome: r.servico_nome,
      servicoPreco: r.servico_preco,
      cidade: r.cidade,
      inicio: m ? new Date(m[1]) : new Date(),
      fim: m ? new Date(m[2]) : new Date(),
      situacao: r.situacao,
      observacao: r.observacao,
    };
  });
}
