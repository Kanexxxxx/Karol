import "server-only";

import { NEGOCIO, NOTIFICACOES } from "@/data/negocio";
import { formatarPreco } from "@/data/servicos";
import { DIA_HORA_POR_EXTENSO } from "./datas";
import { codigoDoAgendamento } from "./codigo";

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
    // O código é o que ela digita na busca do painel pra abrir este
    // agendamento. Sem ele, achar a pessoa certa é rolar a agenda no olho.
    `Código ${codigoDoAgendamento(a.id)}`,
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
    "",
    `Seu código: ${codigoDoAgendamento(a.id)}`,
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
/** true quando a Cloud API da Meta está configurada. */
export function metaConfigurada(): boolean {
  return Boolean(process.env.META_TOKEN && process.env.META_PHONE_NUMBER_ID);
}

/**
 * Manda pela Cloud API da Meta.
 *
 * Texto livre, sem template. Isso só funciona dentro da **janela de 24 h**,
 * que abre quando a cliente manda mensagem primeiro — e é de graça. Fora da
 * janela a Meta recusa com `131047`, e é esperado: quem cai aí é o lembrete
 * da véspera, que precisaria de template aprovado e é pago.
 *
 * Ver WHATSAPP.md.
 */
async function enviarPelaMeta(para: string, texto: string): Promise<Response> {
  return fetch(
    `https://graph.facebook.com/v23.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.META_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: para,
        type: "text",
        text: { body: texto },
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
}

/** Manda pro webhook configurável, que repassa. Caminho antigo, ainda vale. */
async function enviarPeloWebhook(
  url: string,
  evento: Evento,
  a: DadosAgendamento,
  para: string,
  texto: string,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      evento,
      agendamento: a,
      mensagem: {
        para,
        destinatario: evento === "novo-agendamento" ? "karol" : "cliente",
        texto,
      },
    }),
    signal: AbortSignal.timeout(5000),
  });
}

/**
 * Manda um texto solto pra um número.
 *
 * É o que o webhook usa pra responder a cliente. Diferente de `enviarEvento`,
 * aqui não há evento nem interruptor em `NOTIFICACOES`: é resposta a uma
 * mensagem que a pessoa acabou de mandar, dentro da janela de 24 h que o
 * próprio ato dela abriu — o caso em que a Meta cobra zero.
 *
 * Nunca lança: quem chama é o webhook, e webhook que responde erro faz a
 * Meta reenviar o evento.
 */
export async function enviarTexto(para: string, texto: string): Promise<boolean> {
  if (!metaConfigurada()) return false;
  try {
    const resp = await enviarPelaMeta(para, texto);
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`resposta pro ${para}: ${resp.status} ${detalhe.slice(0, 300)}`);
    }
    return resp.ok;
  } catch (e) {
    console.error(`resposta pro ${para} falhou:`, e);
    return false;
  }
}

export async function enviarEvento(evento: Evento, a: DadosAgendamento): Promise<void> {
  if (!ligado(evento)) return;

  const para = evento === "novo-agendamento" ? whatsappDaKarol() : a.whatsappCliente;
  const texto = TEXTO[evento](a);
  const webhook = process.env.NOTIFICADOR_WEBHOOK_URL;

  // A Meta primeiro: é o caminho direto. O webhook fica pra quem preferir
  // resolver o envio por fora (n8n, Make). Sem nenhum dos dois, a mensagem
  // é montada e simplesmente não sai — e nada quebra.
  if (!metaConfigurada() && !webhook) return;

  try {
    const resp = metaConfigurada()
      ? await enviarPelaMeta(para, texto)
      : await enviarPeloWebhook(webhook!, evento, a, para, texto);

    if (!resp.ok) {
      // O corpo da Meta diz o motivo: 131047 é janela fechada, 130497 é
      // restrição de país. Sem isso o log só diz "deu erro".
      const detalhe = await resp.text().catch(() => "");
      console.error(`notificação ${evento}: ${resp.status} ${detalhe.slice(0, 300)}`);
    }
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
