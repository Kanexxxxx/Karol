import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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
  /**
   * O id da FOTO (ou PDF) que ela mandou, quando mandou uma.
   *
   * ⚠️ Sem isto o comprovante do PIX sumia. O webhook lia texto e botão e
   * ignorava o resto — e comprovante é foto. A cliente mandava, ninguém
   * via, e ela ficava esperando a confirmação.
   *
   * O id serve pra REENVIAR a mesma mídia pra Karol sem baixar nem
   * hospedar nada: a Meta aceita `image: { id }` no envio.
   */
  midiaId?: string;
  tipoMidia?: "image" | "document";
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
          image?: { id?: unknown; caption?: unknown };
          document?: { id?: unknown; caption?: unknown };
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

        // Foto ou PDF — quase sempre o comprovante do PIX.
        if (msg.type === "image" && typeof msg.image?.id === "string") {
          return {
            ...base,
            texto: typeof msg.image.caption === "string" ? msg.image.caption : "",
            midiaId: msg.image.id,
            tipoMidia: "image",
          };
        }
        if (msg.type === "document" && typeof msg.document?.id === "string") {
          return {
            ...base,
            texto: typeof msg.document.caption === "string" ? msg.document.caption : "",
            midiaId: msg.document.id,
            tipoMidia: "document",
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
export type Intencao = "cancelar" | "remarcar" | "confirmar" | "outro";

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
  /*
    ⚠️ Existia aqui uma intenção "codigo": se a cliente digitasse os seis
    caracteres do agendamento, o robô respondia o horário dela.

    O código saiu do projeto. Quem manda qualquer outra coisa cai em
    "outro", e "outro" é silêncio de propósito — quem responde conversa de
    verdade é a Karol. Robô chutando resposta em pergunta que ele não
    entendeu é pior que robô calado.
  */
  return "outro";
}

/**
 * Uma entrega que a Meta recusou DEPOIS de ter aceitado o envio.
 *
 * ---------------------------------------------------------------------
 * Por que isto existe
 * ---------------------------------------------------------------------
 *
 * ⚠️ ESTE ARQUIVO CHAMAVA `statuses` DE "recibo de entrega, não é
 * mensagem" E JOGAVA FORA. Era ali que estava a resposta que faltou o dia
 * inteiro de 13/09.
 *
 * O envio pela Meta tem DOIS momentos, e é isso que confunde:
 *
 * 1. **Aceitar.** A API responde 200 na hora e devolve um id. Isso quer
 *    dizer "recebi o pedido", e não "entreguei".
 * 2. **Entregar.** Minutos ou segundos depois, a Meta manda um webhook
 *    dizendo `sent`, `delivered`, `read` — ou **`failed`**, com o motivo.
 *
 * O Kainã marcou pelo site pra dois números. Os dois foram ACEITOS (por
 * isso nenhum alerta de falha saiu) e nenhum dos dois foi ENTREGUE. O
 * porquê chegou aqui, no passo 2, e a gente descartou sem olhar.
 *
 * Só `failed` interessa. `sent`, `delivered` e `read` chegam o tempo todo
 * e não são problema de ninguém.
 */
export type EntregaFalhou = {
  /** Pra quem a mensagem ia, só dígitos. */
  para: string;
  /** O código da Meta: 131030, 131026, 470… */
  codigo: number | null;
  /** O texto curto que a Meta dá. Em inglês. */
  motivo: string;
};

export function lerFalhaDeEntrega(payload: unknown): EntregaFalhou | null {
  const valor = primeiroValor(payload);
  const status = (valor?.statuses as Record<string, unknown>[] | undefined)?.[0];
  if (!status || status.status !== "failed") return null;

  const erro = (status.errors as Record<string, unknown>[] | undefined)?.[0];
  const detalhes = erro?.error_data as { details?: string } | undefined;

  return {
    para: String(status.recipient_id ?? "").replace(/\D/g, ""),
    codigo: typeof erro?.code === "number" ? erro.code : null,
    // `details` é sempre mais específico que `title`: "Message failed to
    // send because more than 24 hours have passed" contra "Re-engagement
    // message".
    motivo: String(detalhes?.details ?? erro?.title ?? erro?.message ?? "sem motivo"),
  };
}

/** O `value` do primeiro evento do payload, que é onde tudo mora. */
function primeiroValor(payload: unknown): Record<string, unknown> | null {
  const p = payload as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] };
  return p?.entry?.[0]?.changes?.[0]?.value ?? null;
}
