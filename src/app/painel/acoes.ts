"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { encerrarSessao, sessaoAtiva } from "@/lib/sessao";
import { mudarSituacao } from "@/lib/agendamentos";

export type EstadoPainel = { erro?: string; okId?: string };

/**
 * Muda a situação de um agendamento. `id` e `situacao` vêm do formulário
 * (o botão clicado carrega o valor). A sessão é conferida de novo aqui —
 * o proxy não conta como autorização.
 */
export async function alterarSituacao(
  _estado: EstadoPainel,
  form: FormData,
): Promise<EstadoPainel> {
  if (!(await sessaoAtiva())) {
    return { erro: "Sessão expirada. Recarregue a página." };
  }

  const id = String(form.get("id") ?? "");
  const situacao = String(form.get("situacao") ?? "");

  const r = await mudarSituacao(id, situacao);
  if (!r.ok) return { erro: r.erro };

  revalidatePath("/painel");
  return { okId: id };
}

export async function sair() {
  await encerrarSessao();
  redirect("/painel/login");
}
