"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { encerrarSessao, sessaoAtiva } from "@/lib/sessao";
import {
  buscarAgendamento,
  marcarLembreteEnviado,
  mudarSituacao,
} from "@/lib/agendamentos";
import { paraDados } from "@/lib/lembretes";
import { enviarEvento } from "@/lib/notificacoes";

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

export type EstadoLembrete = { erro?: string; enviado?: boolean };

/**
 * Manda o lembrete de "seu horário é daqui a pouco" AGORA, na mão.
 *
 * Existe porque o automático pode falhar de três jeitos que a Karol não
 * controla: o cron externo caiu, a janela de 24 h da cliente fechou e não
 * havia template aprovado, ou a Meta recusou por algum motivo dela. Nesses
 * casos a alternativa era a Karol abrir a conversa e digitar tudo à mão.
 *
 * O botão fica no CARTÃO de cada agendamento, e não numa tela separada de
 * notificações: a decisão de lembrar é sobre UMA cliente específica, e é
 * olhando pra ela na agenda que a Karol percebe que o lembrete não saiu.
 *
 * Reenviar de propósito é permitido — `forcar` pula a marca de "já
 * avisei". É ela quem está olhando pro cartão e sabe se a cliente recebeu.
 */
export async function lembrarAgora(
  _estado: EstadoLembrete,
  form: FormData,
): Promise<EstadoLembrete> {
  if (!(await sessaoAtiva())) {
    return { erro: "Sessão expirada. Recarregue a página." };
  }

  const id = String(form.get("id") ?? "");
  const forcar = form.get("forcar") === "1";

  const ag = await buscarAgendamento(id);
  if (!ag) return { erro: "Não achei esse agendamento." };

  // Sem `forcar`, a marca é a trava: se ela tocar duas vezes sem querer, a
  // cliente recebe uma mensagem só.
  if (!forcar && !(await marcarLembreteEnviado(id))) {
    return { erro: "O lembrete já saiu pra essa cliente." };
  }
  if (forcar) await marcarLembreteEnviado(id);

  await enviarEvento("lembrete-curto", paraDados(ag));

  revalidatePath("/painel");
  return { enviado: true };
}

export async function sair() {
  await encerrarSessao();
  redirect("/painel/login");
}
