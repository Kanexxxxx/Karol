import "server-only";

import { NEGOCIO, NOTIFICACOES, SITE_URL } from "@/data/negocio";
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

export type Evento =
  | "novo-agendamento"
  | "confirmacao"
  | "remarcado"
  | "cancelado"
  | "lembrete"
  | "agradecimento";

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

/** true quando o webhook de RECEBIMENTO está de pé. Ver app/api/whatsapp. */
export function recebimentoConfigurado(): boolean {
  return Boolean(process.env.META_VERIFY_TOKEN && process.env.META_APP_SECRET);
}

/**
 * O número pra onde os avisos da Karol estão indo, quando NÃO é o dela.
 *
 * `KAROL_WHATSAPP` existe pra testar sem incomodar a Karol — foi assim que
 * o fluxo inteiro foi testado em 06/09/2026. O problema é que é exatamente
 * o tipo de coisa que fica esquecida: com ela preenchida, a Karol nunca
 * recebe aviso de agendamento nenhum e ninguém descobre por semanas.
 *
 * Por isso o painel mostra isso na cara quando está desviado.
 */
export function avisosDesviadosPara(): string | null {
  const configurado = whatsappDaKarol();
  const dela = NEGOCIO.whatsapp.numero.replace(/\D/g, "");
  return configurado === dela ? null : configurado;
}

export function textoParaKarol(a: DadosAgendamento): string {
  return [
    "📅 Novo agendamento pelo site",
    "",
    `👤 *${a.cliente}*`,
    `💄 ${a.servico} — ${formatarPreco(a.valorCentavos / 100)}`,
    `🗓️ ${quando(a.inicioISO)}`,
    `📍 ${a.cidade}`,
    "",
    `Chamar no WhatsApp: https://wa.me/${a.whatsappCliente}`,
    "",
    // Link, e não código pra digitar. Ela toca e cai no painel com este
    // agendamento já aberto. O código continua existindo como chave do
    // link — ninguém digita, ninguém vê. O Kainã achou o código escrito
    // estranho pra um studio de beleza, e tinha razão.
    linkDoPainel(a.id),
  ].join("\n");
}

/** Abre o painel da Karol já filtrado neste agendamento. */
export function linkDoPainel(id: string): string {
  return `${SITE_URL}/painel?q=${codigoDoAgendamento(id)}`;
}

export function textoConfirmacao(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}! Seu horário está confirmado no ${NEGOCIO.nome}. ✨`,
    "",
    `💄 ${a.servico}`,
    `🗓️ ${quando(a.inicioISO)}`,
    `📍 ${a.cidade}`,
    `💵 ${formatarPreco(a.valorCentavos / 100)}`,
    "",
    "Antes de vir: venha sem maquiagem. Se for trazer acompanhante, no máximo uma pessoa. 🤍",
  ].join("\n");
}

export function textoLembrete(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}! Passando pra lembrar do seu horário amanhã. 💛`,
    "",
    `💄 ${a.servico}`,
    `🗓️ ${quando(a.inicioISO)}`,
    `📍 ${a.cidade}`,
    "",
    "Não esquece de vir sem maquiagem. 🤍",
    "",
    "Se surgiu alguma coisa e você não vai conseguir, me avisa hoje — assim dá tempo de encaixar outra pessoa nesse horário. 🙏",
  ].join("\n");
}

export function textoAgradecimento(a: DadosAgendamento): string {
  return [
    `Foi ótimo te atender, ${primeiroNome(a.cliente)}! 🥰`,
    "",
    "Qualquer dúvida sobre os cuidados, é só me chamar por aqui.",
    "",
    `Se você gostou, me marca nas fotos: @${NEGOCIO.instagram.studio} 📸`,
  ].join("\n");
}

/**
 * O horário MUDOU — quem mudou foi a Karol, pelo painel.
 *
 * Sem esta mensagem, remarcar deixava a agenda dela dizendo uma coisa e a
 * cliente sabendo outra: a pessoa aparecia no dia e na hora antigos.
 */
export function textoRemarcado(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}! Precisei mudar o seu horário. 💛`,
    "",
    "Ficou assim:",
    `💄 ${a.servico}`,
    `🗓️ ${quando(a.inicioISO)}`,
    `📍 ${a.cidade}`,
    "",
    "Se esse novo horário não der, me avisa por aqui que a gente acha outro. 🤍",
  ].join("\n");
}

/** A Karol cancelou pelo painel. A cliente não pode descobrir na porta. */
export function textoCancelado(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}. Precisei cancelar o seu horário, me desculpa. 🙏`,
    "",
    `💄 ${a.servico}`,
    `🗓️ ${quando(a.inicioISO)}`,
    "",
    "Me chama por aqui que a gente acha outro dia — tenho horário essa semana. 💛",
  ].join("\n");
}

const TEXTO: Record<Evento, (a: DadosAgendamento) => string> = {
  "novo-agendamento": textoParaKarol,
  confirmacao: textoConfirmacao,
  remarcado: textoRemarcado,
  cancelado: textoCancelado,
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

/**
 * Os botões que a cliente vê embaixo da confirmação.
 *
 * O `id` é o que volta no webhook quando ela toca — é por ele que
 * `lerIntencao` decide, sem depender de adivinhar o que ela escreveu.
 *
 * ⚠️ O título tem limite de **20 caracteres** na Meta, e emoji fora do
 * plano básico conta 2. "💬 Falar com a Karol" dá exatamente 20 e a Meta
 * recusa por um fio — por isso os títulos aqui são curtos.
 */
export const BOTOES_CLIENTE = [
  { id: "confirmar", titulo: "✅ Confirmar" },
  { id: "remarcar", titulo: "📅 Remarcar" },
  { id: "cancelar", titulo: "❌ Cancelar" },
] as const;

/**
 * Manda texto com botões de resposta rápida.
 *
 * ⚠️ Só funciona **dentro da janela de 24 h**, igual ao texto livre. Fora
 * dela quem resolve é template com botões — ver TEMPLATES-WHATSAPP.md.
 */
async function enviarComBotoes(
  para: string,
  texto: string,
  botoes: readonly { id: string; titulo: string }[],
): Promise<Response> {
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
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: texto.slice(0, 1024) },
          action: {
            buttons: botoes.slice(0, 3).map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.titulo.slice(0, 20) },
            })),
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
}

/** Texto + botões, sem lançar. Devolve false quando não deu. */
export async function enviarTextoComBotoes(
  para: string,
  texto: string,
  botoes: readonly { id: string; titulo: string }[] = BOTOES_CLIENTE,
): Promise<boolean> {
  if (!metaConfigurada()) return false;
  try {
    const resp = await enviarComBotoes(para, texto, botoes);
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`botões pro ${para}: ${resp.status} ${detalhe.slice(0, 300)}`);
    }
    return resp.ok;
  } catch (e) {
    console.error(`botões pro ${para} falharam:`, e);
    return false;
  }
}

/**
 * Manda uma LISTA de opções — o menu que abre quando ela toca no botão.
 *
 * Botão só cabe 3; lista cabe 10. Pra oferecer horários de remarcação, 3 é
 * pouco: se nenhum dos três servir, a conversa morre e sobra pra Karol.
 *
 * Limites da Meta, todos cortados aqui porque estourar qualquer um faz a
 * mensagem inteira ser recusada: título da linha 24, descrição 72, texto do
 * botão que abre a lista 20, corpo 1024.
 */
async function enviarLista(
  para: string,
  texto: string,
  textoDoBotao: string,
  linhas: readonly { id: string; titulo: string; descricao?: string }[],
): Promise<Response> {
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
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: texto.slice(0, 1024) },
          action: {
            button: textoDoBotao.slice(0, 20),
            sections: [
              {
                title: "Horários livres",
                rows: linhas.slice(0, 10).map((l) => ({
                  id: l.id,
                  title: l.titulo.slice(0, 24),
                  ...(l.descricao ? { description: l.descricao.slice(0, 72) } : {}),
                })),
              },
            ],
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
}

/** Lista de opções, sem lançar. Devolve false quando não deu. */
export async function enviarTextoComLista(
  para: string,
  texto: string,
  textoDoBotao: string,
  linhas: readonly { id: string; titulo: string; descricao?: string }[],
): Promise<boolean> {
  if (!metaConfigurada() || linhas.length === 0) return false;
  try {
    const resp = await enviarLista(para, texto, textoDoBotao, linhas);
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`lista pro ${para}: ${resp.status} ${detalhe.slice(0, 300)}`);
    }
    return resp.ok;
  } catch (e) {
    console.error(`lista pro ${para} falhou:`, e);
    return false;
  }
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

  // A confirmação da cliente vai COM BOTÕES: ela acabou de marcar e é o
  // momento em que ainda pode querer trocar alguma coisa. Botão é escolha
  // de lista — não obriga ninguém a escrever nem a gente a adivinhar.
  // O aviso da Karol não leva botão: ele leva o link do painel, que é onde
  // ela resolve de verdade.
  const comBotoes = evento === "confirmacao";

  try {
    const resp = metaConfigurada()
      ? comBotoes
        ? await enviarComBotoes(para, texto, BOTOES_CLIENTE)
        : await enviarPelaMeta(para, texto)
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
    // Remarcar e cancelar não têm interruptor de propósito: são mudanças
    // que a Karol fez no horário de alguém. Não avisar não é uma opção.
    case "remarcado":
    case "cancelado":
      return true;
    case "lembrete":
      return NOTIFICACOES.lembreteUmDiaAntes;
    case "agradecimento":
      return NOTIFICACOES.agradecimentoDepois;
  }
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}
