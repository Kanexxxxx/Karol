import "server-only";

import { banco } from "./banco";

/**
 * A janela de 24 h do WhatsApp.
 *
 * A Meta só aceita texto livre — e de graça — nas 24 h seguintes à última
 * mensagem DA CLIENTE. Fora dela, recusa com `131047` e exige template
 * aprovado, que é pago. Ver `supabase/migracao-02-conversas.sql`.
 *
 * Quem abre a janela é o webhook, quando chega mensagem dela.
 */

/** 24 h em milissegundos. É o prazo da Meta, não uma escolha nossa. */
export const JANELA_MS = 24 * 60 * 60 * 1000;

/**
 * Registra que a cliente falou: a janela reabre por mais 24 h.
 *
 * Nunca lança. Isto roda dentro do webhook, e a Meta reenvia o evento
 * quando o webhook responde erro — perder o registro da janela é bem melhor
 * do que entrar num laço de reentrega.
 */
export async function abrirJanela(whatsapp: string, mensagem: string): Promise<void> {
  const bd = banco();
  if (!bd) return;
  if (!/^[0-9]{10,15}$/.test(whatsapp)) return;

  const { error } = await bd.from("conversas").upsert(
    {
      whatsapp,
      janela_ate: new Date(Date.now() + JANELA_MS).toISOString(),
      ultima_mensagem: mensagem.slice(0, 500),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "whatsapp" },
  );

  if (error) console.error("não consegui abrir a janela de conversa:", error.message);
}

/**
 * A janela deste número está aberta agora?
 *
 * ⚠️ `false` aqui significa "não sei" tanto quanto "está fechada": se a
 * tabela nunca foi preenchida (webhook ainda não configurado), toda janela
 * parece fechada. Por isso quem chama trata como AVISO, não como bloqueio —
 * ver `enviarEvento` em notificacoes.ts.
 */
export async function janelaAberta(whatsapp: string): Promise<boolean> {
  const bd = banco();
  if (!bd) return false;

  const { data } = await bd
    .from("conversas")
    .select("janela_ate")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  const ate = data?.janela_ate as string | undefined;
  return Boolean(ate && new Date(ate).getTime() > Date.now());
}
