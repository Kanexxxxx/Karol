import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { normalizarCodigo } from "./codigo";

/**
 * O que chega da Meta no webhook — leitura e conferência de assinatura.
 *
 * Fica separado da rota de propósito: assinatura e formato de payload são
 * exatamente o que precisa de teste, e testar isto pela rota exigiria montar
 * `Request` a cada caso. Aqui é função pura sobre bytes e objeto.
 *
 * Formato do payload, resumido (a Meta aninha bastante):
 *
 *   { entry: [ { changes: [ { value: {
 *       messages: [ { from, id, type, text: { body } } ],
 *       statuses: [ ... ]        // recibo de entrega, não é mensagem
 *   } } ] } ] }
 */

export type MensagemRecebida = {
  /** Número de quem mandou, só dígitos, com DDI. */
  de: string;
  /** Texto puro. Vazio quando a pessoa mandou foto, áudio ou figurinha. */
  texto: string;
  /** Id da mensagem na Meta. Serve pra não processar a mesma duas vezes. */
  id: string;
  /**
   * O `id` do botão, quando ela TOCOU num em vez de escrever.
   *
   * Vale mais que o texto: é escolha de uma lista, não linguagem que
   * precisa ser adivinhada. Quando existe, `lerIntencao` decide por ele.
   */
  botao?: string;
};

/**
 * Confere o `X-Hub-Signature-256`.
 *
 * ⚠️ Isto não é opcional. A URL do webhook é pública por definição — a Meta
 * precisa alcançá-la. Sem conferir assinatura, qualquer um que descubra o
 * endereço manda um POST dizendo ser a cliente e mexe na agenda.
 *
 * O HMAC é sobre os BYTES CRUS do corpo, não sobre o JSON reserializado:
 * `JSON.parse` seguido de `JSON.stringify` reordena chave e muda espaço, e
 * aí a assinatura nunca bate. Por isso a rota lê `req.text()` antes de
 * qualquer parse.
 *
 * Falha fechado: sem `META_APP_SECRET` no ambiente, nada passa.
 */
export function assinaturaConfere(
  corpoBruto: string,
  cabecalho: string | null,
  segredo: string | undefined,
): boolean {
  if (!segredo || !cabecalho) return false;

  const esperado =
    "sha256=" + createHmac("sha256", segredo).update(corpoBruto, "utf8").digest("hex");

  return igualEmTempoConstante(cabecalho, esperado);
}

/** Resposta do handshake de verificação (o GET que a Meta faz uma vez). */
export function respostaDaVerificacao(
  params: URLSearchParams,
  segredo: string | undefined,
): { ok: true; desafio: string } | { ok: false } {
  const modo = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const desafio = params.get("hub.challenge");

  if (!segredo || modo !== "subscribe" || !desafio || !token) return { ok: false };
  // Passa pelo SHA-256 antes de comparar: iguala o tamanho dos dois lados,
  // que é o que `timingSafeEqual` exige, sem sair mais cedo por comprimento
  // diferente — sair mais cedo já entregaria o tamanho do segredo.
  if (!igualEmTempoConstante(token, segredo)) return { ok: false };

  return { ok: true, desafio };
}

function igualEmTempoConstante(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(a, "utf8").digest(),
    createHash("sha256").update(b, "utf8").digest(),
  );
}

/**
 * Tira a mensagem de texto do payload, se houver uma.
 *
 * Devolve `null` — e não erro — para tudo que não seja mensagem de texto de
 * pessoa: recibo de entrega, foto, áudio, payload de outro formato. O
 * webhook recebe muito mais recibo do que mensagem, e recibo não é problema.
 */
export function lerMensagem(payload: unknown): MensagemRecebida | null {
  if (!payload || typeof payload !== "object") return null;

  const entradas = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entradas)) return null;

  for (const entrada of entradas) {
    const mudancas = (entrada as { changes?: unknown })?.changes;
    if (!Array.isArray(mudancas)) continue;

    for (const mudanca of mudancas) {
      const valor = (mudanca as { value?: unknown })?.value as
        | { messages?: unknown }
        | undefined;
      const mensagens = valor?.messages;
      if (!Array.isArray(mensagens)) continue;

      for (const m of mensagens) {
        const msg = m as {
          from?: unknown;
          id?: unknown;
          type?: unknown;
          text?: { body?: unknown };
          // toque em botão de mensagem interativa
          interactive?: {
            type?: unknown;
            button_reply?: { id?: unknown; title?: unknown };
            list_reply?: { id?: unknown; title?: unknown };
          };
          // toque em botão de TEMPLATE (formato diferente, mesma ideia)
          button?: { payload?: unknown; text?: unknown };
        };
        if (typeof msg.from !== "string" || typeof msg.id !== "string") continue;

        const de = msg.from.replace(/\D/g, "");
        if (!/^[0-9]{10,15}$/.test(de)) continue;
        const base = { de, id: msg.id };

        if (msg.type === "text") {
          const texto = typeof msg.text?.body === "string" ? msg.text.body.slice(0, 2000) : "";
          return { ...base, texto };
        }

        // Ela tocou num botão nosso. Guardamos o título como `texto` pra o
        // log e o aviso da Karol continuarem legíveis.
        if (msg.type === "interactive" && msg.interactive?.type === "button_reply") {
          const r = msg.interactive.button_reply;
          if (typeof r?.id !== "string") continue;
          return {
            ...base,
            botao: r.id,
            texto: typeof r.title === "string" ? r.title : r.id,
          };
        }

        // Escolha numa LISTA (os horários da remarcação). Mesmo tratamento
        // do botão: o `id` é o que manda, o título só serve pra log.
        if (msg.type === "interactive" && msg.interactive?.type === "list_reply") {
          const r = msg.interactive.list_reply;
          if (typeof r?.id !== "string") continue;
          return {
            ...base,
            botao: r.id,
            texto: typeof r.title === "string" ? r.title : r.id,
          };
        }

        if (msg.type === "button" && typeof msg.button?.payload === "string") {
          return {
            ...base,
            botao: msg.button.payload,
            texto: typeof msg.button.text === "string" ? msg.button.text : msg.button.payload,
          };
        }
      }
    }
  }

  return null;
}

/** O que a cliente quis dizer. */
export type Intencao = "codigo" | "cancelar" | "remarcar" | "confirmar" | "outro";

const CANCELAR = /\b(cancelar|cancela|desmarcar|desmarca|nao vou|não vou)\b/i;
const REMARCAR = /\b(remarcar|remarca|trocar|mudar|adiar|outro hor)/i;
const CONFIRMAR = /\b(confirmar|confirmo|confirmado|sim,? confirmo|ok|beleza)\b/i;

/**
 * Classifica a mensagem.
 *
 * A ordem importa: "quero cancelar o 8C6377" tem código E intenção de
 * cancelar, e o que a Karol precisa saber é que a pessoa quer cancelar. O
 * código sozinho é a pergunta mais comum — "que horas mesmo é o meu?".
 */
export function lerIntencao(texto: string, botao?: string): Intencao {
  // Botão vence texto, sempre. É escolha de uma lista curta, não linguagem
  // que precisa ser adivinhada — "quero cancelar o horário de amanhã, mas
  // se der pra remarcar eu prefiro" é ambíguo pra qualquer regex, e o
  // toque no botão não é.
  if (botao) {
    if (botao === "cancelar") return "cancelar";
    if (botao === "remarcar") return "remarcar";
    if (botao === "confirmar") return "confirmar";
  }

  if (CANCELAR.test(texto)) return "cancelar";
  if (REMARCAR.test(texto)) return "remarcar";
  if (CONFIRMAR.test(texto)) return "confirmar";
  // `normalizarCodigo` exige o tamanho exato, então um telefone inteiro não
  // vira "código" por acaso.
  if (normalizarCodigo(texto)) return "codigo";
  return "outro";
}
