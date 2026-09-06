import type { NextRequest } from "next/server";
import { atender } from "@/lib/atendente";
import { assinaturaConfere, lerMensagem, respostaDaVerificacao } from "@/lib/webhook-meta";

/**
 * Webhook do WhatsApp — o que a cliente responde chega aqui.
 *
 * Esta rota só cuida do transporte: conferir assinatura, ler o payload e não
 * processar a mesma mensagem duas vezes. **A decisão do que responder está
 * em `lib/atendente.ts`**, que é importável e por isso testável — a rota
 * não é.
 *
 * Duas coisas acontecem quando a cliente escreve:
 *
 * 1. **Abre a janela de 24 h**, que é o que torna todo o resto grátis.
 *    Ver `lib/conversas.ts` e WHATSAPP.md, seção 2.
 * 2. **A resposta automática sai**, quando dá pra responder com certeza.
 *
 * Configuração na Meta: Webhooks → Callback URL `<site>/api/whatsapp`,
 * Verify token = `META_VERIFY_TOKEN`, assinar o campo `messages`.
 * Sem `META_APP_SECRET` no ambiente, esta rota recusa tudo.
 */

export const dynamic = "force-dynamic";

/** Handshake: a Meta faz um GET só, na hora de salvar a URL no painel. */
export async function GET(req: NextRequest) {
  const r = respostaDaVerificacao(req.nextUrl.searchParams, process.env.META_VERIFY_TOKEN);
  if (!r.ok) return new Response("não autorizado", { status: 403 });

  // A Meta espera o desafio de volta em texto puro, sem JSON em volta.
  return new Response(r.desafio, { status: 200, headers: { "content-type": "text/plain" } });
}

export async function POST(req: NextRequest) {
  // ⚠️ Ler como TEXTO antes de qualquer parse: o HMAC da Meta é sobre os
  // bytes crus. `JSON.parse` + `JSON.stringify` reordena chave e muda
  // espaçamento, e aí a assinatura nunca mais bate.
  const bruto = await req.text();

  if (
    !assinaturaConfere(bruto, req.headers.get("x-hub-signature-256"), process.env.META_APP_SECRET)
  ) {
    // A URL do webhook é pública por definição — a Meta precisa alcançá-la.
    // Sem esta conferência, qualquer um que a descubra manda POST fingindo
    // ser a cliente.
    return new Response("assinatura inválida", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bruto);
  } catch {
    return Response.json({ ok: true, ignorado: "json inválido" });
  }

  const mensagem = lerMensagem(payload);
  // Recibo de entrega, foto, figurinha: chega muito mais disso do que
  // mensagem de texto, e nada disso é problema.
  if (!mensagem) return Response.json({ ok: true, ignorado: true });

  if (jaProcessada(mensagem.id)) return Response.json({ ok: true, repetida: true });

  try {
    const desfecho = await atender(mensagem);
    return Response.json({ ok: true, ...desfecho });
  } catch (e) {
    // 200 mesmo com erro, de propósito: a Meta reenvia o evento quando o
    // webhook responde erro, e um defeito nosso viraria laço de reentrega
    // com a cliente recebendo a mesma resposta várias vezes.
    console.error("webhook do WhatsApp falhou:", e);
    return Response.json({ ok: true, erro: true });
  }
}

/**
 * Não responder duas vezes a mesma mensagem.
 *
 * A Meta reenvia o evento quando não recebe 200 rápido o bastante, então a
 * mesma `wamid` chega repetida com alguma frequência.
 *
 * ⚠️ Isto é memória do processo: some no deploy e não é compartilhado entre
 * instâncias do serverless. É quebra-galho — como o freio por IP em
 * `lib/limite.ts`. O pior caso é a cliente receber a mesma resposta duas
 * vezes, que é chato e não é grave. Uma tabela resolveria de verdade; não
 * vale a coluna enquanto o volume for este.
 */
const VISTAS = new Set<string>();
const TETO_VISTAS = 500;

function jaProcessada(id: string): boolean {
  if (VISTAS.has(id)) return true;
  if (VISTAS.size >= TETO_VISTAS) {
    // Set em JS mantém ordem de inserção: o primeiro é o mais antigo.
    VISTAS.delete(VISTAS.values().next().value!);
  }
  VISTAS.add(id);
  return false;
}
