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

/** Uma conversa aberta, do jeito que o painel mostra. */
export type Conversa = {
  whatsapp: string;
  /** Última coisa que a pessoa escreveu. Pode vir vazio. */
  ultimaMensagem: string | null;
  /** Quando a janela de 24 h fecha. */
  janelaAte: Date;
  /** Minutos que faltam. Zero ou menos = fechada. */
  minutosRestantes: number;
};

/**
 * As conversas com janela ABERTA agora.
 *
 * Isto é informação de dinheiro, não enfeite: enquanto a janela está
 * aberta, mandar mensagem pra essa pessoa é de graça e sem template. Fora
 * dela a Meta recusa (`131047`) ou cobra. A Karol nunca teve como saber
 * disso — ela abria o WhatsApp e descobria na tentativa.
 *
 * Ordenado por quem fecha primeiro: é a fila de urgência de verdade.
 */
export async function conversasAbertas(limite = 20): Promise<Conversa[]> {
  const bd = banco();
  if (!bd) return [];

  const agora = new Date();

  const { data } = await bd
    .from("conversas")
    .select("*")
    .gte("janela_ate", agora.toISOString())
    .order("janela_ate", { ascending: true })
    .limit(limite);

  return (data ?? []).map((r: Record<string, unknown>) => {
    const janelaAte = new Date(r.janela_ate as string);
    return {
      whatsapp: r.whatsapp as string,
      ultimaMensagem: (r.ultima_mensagem as string | null) ?? null,
      janelaAte,
      minutosRestantes: Math.floor((janelaAte.getTime() - agora.getTime()) / 60_000),
    };
  });
}

/* ------------------------------------------------------------------ */
/* A memória do assistente da Karol                                    */
/* ------------------------------------------------------------------ */

/** Uma fala guardada. Só o essencial — isto vira token pago. */
export type Fala = { papel: "user" | "assistant"; texto: string };

/**
 * Quantas falas ficam guardadas.
 *
 * Oito é o suficiente pra "cancela a segunda" saber a que lista o "segunda"
 * se refere, e curto o bastante pra conversa de ontem não voltar do nada
 * nem inflar a conta. Ver `migracao-05-assistente.sql`.
 */
export const FALAS_GUARDADAS = 8;

/** O que já foi dito com este número. Vazio quando não há nada. */
export async function historicoDe(whatsapp: string): Promise<Fala[]> {
  const bd = banco();
  if (!bd) return [];

  const { data } = await bd
    .from("conversas")
    .select("historico")
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  const bruto = data?.historico;
  if (!Array.isArray(bruto)) return [];

  // Vem de coluna jsonb, que aceita qualquer forma. Filtrar aqui evita
  // mandar lixo pro modelo se alguém editar a linha na mão no Supabase.
  return bruto
    .filter(
      (f): f is Fala =>
        Boolean(f) &&
        typeof f === "object" &&
        (f.papel === "user" || f.papel === "assistant") &&
        typeof f.texto === "string",
    )
    .slice(-FALAS_GUARDADAS);
}

/**
 * Acrescenta o que foi dito agora, jogando fora o que passou do limite.
 *
 * Nunca lança: perder a memória de uma conversa é bem menos grave do que
 * derrubar o webhook e fazer a Meta reenviar tudo.
 */
export async function guardarFalas(whatsapp: string, novas: Fala[]): Promise<void> {
  const bd = banco();
  if (!bd || novas.length === 0) return;

  const anterior = await historicoDe(whatsapp);
  const historico = [...anterior, ...novas]
    .slice(-FALAS_GUARDADAS)
    .map((f) => ({ papel: f.papel, texto: f.texto.slice(0, 1000) }));

  const { error } = await bd
    .from("conversas")
    .update({ historico })
    .eq("whatsapp", whatsapp);

  if (error) console.error("não consegui guardar o histórico:", error.message);
}

/** Zera a memória — o "esquece tudo" da Karol. */
export async function limparHistorico(whatsapp: string): Promise<void> {
  const bd = banco();
  if (!bd) return;
  await bd.from("conversas").update({ historico: [] }).eq("whatsapp", whatsapp);
}
