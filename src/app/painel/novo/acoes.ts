"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { criarAgendamentoNoPainel, remarcarAgendamento } from "@/lib/agendamentos";
import { CIDADES, type CidadeId } from "@/data/negocio";

export type EstadoNovo = {
  erro?: string;
  ok?: boolean;
  valores?: Record<string, string>;
};

/** Revalida as duas telas que mostram a agenda. */
function revalidar() {
  revalidatePath("/painel");
  revalidatePath("/agendar");
}

/**
 * Agendamento criado pela Karol.
 *
 * Como toda ação do painel, reconfere a sessão aqui dentro: o proxy não
 * conta como autorização, e Server Action é um POST na própria rota.
 */
export async function agendarNoPainel(
  _estado: EstadoNovo,
  form: FormData,
): Promise<EstadoNovo> {
  if (!(await sessaoAtiva())) return { erro: "Sessão expirada. Recarregue a página." };

  const texto = (campo: string) => String(form.get(campo) ?? "").trim();
  const valores = {
    servicoId: texto("servicoId"),
    cidade: texto("cidade"),
    chaveDia: texto("chaveDia"),
    hora: texto("hora"),
    nome: texto("nome"),
    whatsapp: texto("whatsapp"),
    observacao: texto("observacao"),
  };

  if (!(valores.cidade in CIDADES)) return { erro: "Escolha a cidade.", valores };

  const r = await criarAgendamentoNoPainel({
    servicoId: valores.servicoId,
    cidade: valores.cidade as CidadeId,
    chaveDia: valores.chaveDia,
    hora: valores.hora,
    nome: valores.nome,
    whatsapp: valores.whatsapp,
    observacao: valores.observacao || undefined,
  });

  if (!r.ok) return { erro: r.erro, valores };

  revalidar();
  return { ok: true };
}

export type EstadoRemarcar = { erro?: string; okId?: string };

/** Muda o dia e a hora de um atendimento que já existe. */
export async function remarcar(
  _estado: EstadoRemarcar,
  form: FormData,
): Promise<EstadoRemarcar> {
  if (!(await sessaoAtiva())) return { erro: "Sessão expirada. Recarregue a página." };

  const id = String(form.get("id") ?? "");
  const dia = String(form.get("dia") ?? "");
  const hora = String(form.get("hora") ?? "");

  const r = await remarcarAgendamento(id, dia, hora);
  if (!r.ok) return { erro: r.erro };

  revalidar();
  return { okId: id };
}

export async function voltarPraAgenda() {
  if (!(await sessaoAtiva())) redirect("/painel/login");
  redirect("/painel");
}
