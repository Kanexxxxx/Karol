"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarAgendamento } from "@/lib/agendamentos";

/**
 * Estado do formulário de agendamento, lido pelo `useActionState`.
 *
 * `campos` guarda o erro de cada campo; `valores` devolve o que a cliente
 * digitou pra ela não perder o preenchimento quando algo dá errado.
 */
export type EstadoAgendar = {
  erro?: string;
  campos?: { nome?: string; whatsapp?: string; observacao?: string };
  valores?: { nome: string; whatsapp: string; observacao: string };
};

export const ESTADO_INICIAL: EstadoAgendar = {};

export async function agendar(
  _estado: EstadoAgendar,
  form: FormData,
): Promise<EstadoAgendar> {
  const servicoId = String(form.get("servicoId") ?? "");
  const chaveDia = String(form.get("chaveDia") ?? "");
  const inicioMin = Number(form.get("inicioMin"));

  const nome = String(form.get("nome") ?? "").trim();
  const whatsapp = String(form.get("whatsapp") ?? "").trim();
  const observacao = String(form.get("observacao") ?? "").trim();
  const valores = { nome, whatsapp, observacao };

  if (!servicoId || !chaveDia || !Number.isFinite(inicioMin)) {
    return {
      erro: "Faltou o serviço, o dia ou o horário. Volte um passo e escolha de novo.",
      valores,
    };
  }

  const soDigitos = whatsapp.replace(/\D/g, "");
  const campos: NonNullable<EstadoAgendar["campos"]> = {};
  if (nome.length < 2 || nome.length > 120) campos.nome = "Escreva seu nome completo.";
  if (!/^\d{10,13}$/.test(soDigitos)) campos.whatsapp = "WhatsApp com DDD, só números.";
  if (observacao.length > 500) campos.observacao = "Mensagem longa demais (máx. 500 caracteres).";

  if (Object.keys(campos).length > 0) return { campos, valores };

  const r = await criarAgendamento({
    servicoId,
    chaveDia,
    inicioMin,
    nome,
    whatsapp: soDigitos,
    observacao: observacao || undefined,
  });

  if (!r.ok) return { erro: r.erro, valores };

  // A tela de confirmação lê a disponibilidade do banco; força o recálculo.
  revalidatePath("/agendar");
  redirect(`/agendar/confirmado?ag=${r.id}`);
}
