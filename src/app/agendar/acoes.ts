"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { criarAgendamento } from "@/lib/agendamentos";
import { dentroDoLimite, ipDoPedido } from "@/lib/limite";

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

/** Mensagem genérica pra tentativa que cheira a robô — sem entregar o motivo. */
const RECUSA_SILENCIOSA =
  "Não consegui validar o envio. Recarregue a página e tente de novo.";

export async function agendar(
  _estado: EstadoAgendar,
  form: FormData,
): Promise<EstadoAgendar> {
  const servicoId = String(form.get("servicoId") ?? "");
  const chaveDia = String(form.get("chaveDia") ?? "");
  const inicioMin = Number(form.get("inicioMin"));

  // Teto antes de qualquer processamento. Os campos eram lidos, aparados e
  // passados por regex ANTES da checagem de tamanho — um POST de alguns MB
  // fazia o servidor trabalhar de graça a cada requisição. Os limites reais
  // (2..120, 500) são conferidos logo abaixo; aqui é só o teto de sanidade.
  const nome = String(form.get("nome") ?? "").slice(0, 200).trim();
  const whatsapp = String(form.get("whatsapp") ?? "").slice(0, 40).trim();
  const observacao = String(form.get("observacao") ?? "").slice(0, 1000).trim();
  const valores = { nome, whatsapp, observacao };

  // 1. Honeypot: campo escondido que só robô preenche.
  if (String(form.get("site") ?? "") !== "") return { erro: RECUSA_SILENCIOSA };

  // 2. Carimbo de tempo do formulário: humano não preenche em < 2s,
  //    e um formulário aberto há horas está velho demais.
  const carimbo = Number(form.get("carimbo"));
  const idade = Date.now() - carimbo;
  if (!Number.isFinite(carimbo) || idade < 2_000 || idade > 2 * 60 * 60 * 1000) {
    return { erro: RECUSA_SILENCIOSA };
  }

  // 3. Freio por IP. Ver ipDoPedido: o primeiro valor de x-forwarded-for
  //    é o que quem chama controla, então não serve de chave.
  const ip = ipDoPedido(await headers());
  if (!dentroDoLimite(`agendar:${ip}`)) {
    return {
      erro: "Você fez vários agendamentos seguidos. Aguarde um pouco ou fale no WhatsApp.",
      valores,
    };
  }

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
