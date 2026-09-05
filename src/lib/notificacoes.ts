import "server-only";

import { NEGOCIO, NOTIFICACOES } from "@/data/negocio";
import { formatarPreco } from "@/data/servicos";
import { DIA_HORA_POR_EXTENSO } from "./datas";

/**
 * Notificações.
 *
 * A Karol pediu (ver `NOTIFICACOES` em data/negocio.ts): aviso pra ela quando
 * entra agendamento, confirmação pra cliente na hora, lembrete um dia antes e
 * agradecimento depois.
 *
 * O envio em si (WhatsApp/SMS) precisa de um provedor externo. Aqui a gente
 * **monta a mensagem** e **empurra o evento** pra um webhook configurável
 * (`NOTIFICADOR_WEBHOOK_URL`) — que pode ser um n8n, Make, Zapier, uma função
 * própria, o que for. Sem webhook, nada quebra: o evento só não sai.
 *
 * O que dispara cada evento:
 * - `novo-agendamento` (pra Karol) + `confirmacao` (pra cliente):
 *   `criarAgendamento`, na hora.
 * - `lembrete` / `agradecimento`: a rota `/api/lembretes`, chamada 1x/dia
 *   por um cron (ver vercel.json).
 */

export type DadosAgendamento = {
  id: string;
  cliente: string;
  /** só dígitos, com DDI+DDD */
  whatsappCliente: string;
  servico: string;
  cidade: string;
  /** início do atendimento, ISO */
  inicioISO: string;
  valorCentavos: number;
};

export type Evento = "novo-agendamento" | "confirmacao" | "lembrete" | "agradecimento";

function quando(iso: string): string {
  return DIA_HORA_POR_EXTENSO.format(new Date(iso));
}

/** Número da Karol pras notificações: env tem prioridade sobre o do site. */
export function whatsappDaKarol(): string {
  return (process.env.KAROL_WHATSAPP || NEGOCIO.whatsapp.numero).replace(/\D/g, "");
}

/** true se existe um webhook pra onde mandar os eventos. */
export function notificadorConfigurado(): boolean {
  return Boolean(process.env.NOTIFICADOR_WEBHOOK_URL);
}

export function textoParaKarol(a: DadosAgendamento): string {
  return [
    "📅 Novo agendamento pelo site",
    "",
    `${a.servico} — ${formatarPreco(a.valorCentavos / 100)}`,
    quando(a.inicioISO),
    a.cidade,
    "",
    `${a.cliente} · ${a.whatsappCliente}`,
  ].join("\n");
}

export function textoConfirmacao(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}! Seu horário no ${NEGOCIO.nome} está confirmado. ✨`,
    "",
    `${a.servico}`,
    `${quando(a.inicioISO)} — ${a.cidade}`,
    "",
    "Venha sem maquiagem. Qualquer coisa, é só me chamar por aqui.",
  ].join("\n");
}

export function textoLembrete(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}! Passando pra lembrar do seu horário amanhã. 💛`,
    "",
    `${a.servico}`,
    `${quando(a.inicioISO)} — ${a.cidade}`,
    "",
    "Se precisar remarcar, me avise hoje.",
  ].join("\n");
}

export function textoAgradecimento(a: DadosAgendamento): string {
  return [
    `Foi ótimo te atender hoje, ${primeiroNome(a.cliente)}! 🥰`,
    "Qualquer dúvida sobre os cuidados, estou por aqui.",
    "Se puder, me conta o que achou — e marque o Studio nas fotos!",
  ].join("\n");
}

const TEXTO: Record<Evento, (a: DadosAgendamento) => string> = {
  "novo-agendamento": textoParaKarol,
  confirmacao: textoConfirmacao,
  lembrete: textoLembrete,
  agradecimento: textoAgradecimento,
};

/**
 * Empurra o evento pro webhook externo, se houver. Nunca lança — notificação
 * não pode derrubar o fluxo que a disparou.
 */
export async function enviarEvento(evento: Evento, a: DadosAgendamento): Promise<void> {
  if (!ligado(evento)) return;

  const url = process.env.NOTIFICADOR_WEBHOOK_URL;
  if (!url) return;

  const paraCliente = evento !== "novo-agendamento";
  const corpo = {
    evento,
    agendamento: a,
    mensagem: {
      para: paraCliente ? a.whatsappCliente : whatsappDaKarol(),
      destinatario: paraCliente ? "cliente" : "karol",
      texto: TEXTO[evento](a),
    },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) console.error(`notificação ${evento}: webhook respondeu ${resp.status}`);
  } catch (e) {
    console.error(`notificação ${evento} falhou:`, e);
  }
}

/** Respeita os interruptores em `NOTIFICACOES`. */
function ligado(evento: Evento): boolean {
  switch (evento) {
    case "novo-agendamento":
      return NOTIFICACOES.avisaKarolNoWhatsapp;
    case "confirmacao":
      return NOTIFICACOES.confirmacaoNaHora;
    case "lembrete":
      return NOTIFICACOES.lembreteUmDiaAntes;
    case "agradecimento":
      return NOTIFICACOES.agradecimentoDepois;
  }
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}
