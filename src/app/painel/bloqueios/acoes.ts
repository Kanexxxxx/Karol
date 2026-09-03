"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { criarBloqueio, removerBloqueio } from "@/lib/bloqueios";

export type EstadoBloqueio = { erro?: string; ok?: boolean };

function revalidar() {
  revalidatePath("/painel/bloqueios");
  revalidatePath("/painel");
}

export async function adicionarBloqueio(
  _estado: EstadoBloqueio,
  form: FormData,
): Promise<EstadoBloqueio> {
  if (!(await sessaoAtiva())) return { erro: "Sessão expirada. Recarregue a página." };

  const r = await criarBloqueio({
    dataInicio: String(form.get("dataInicio") ?? ""),
    dataFim: String(form.get("dataFim") ?? ""),
    horaInicio: String(form.get("horaInicio") ?? "") || undefined,
    horaFim: String(form.get("horaFim") ?? "") || undefined,
    motivo: String(form.get("motivo") ?? ""),
  });

  if (!r.ok) return { erro: r.erro };
  revalidar();
  return { ok: true };
}

export async function apagarBloqueio(id: string) {
  if (!(await sessaoAtiva())) redirect("/painel/login");
  await removerBloqueio(id);
  revalidar();
}
