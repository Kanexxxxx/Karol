import "server-only";

import { banco } from "./banco";

/**
 * As ações que a IA propôs e estão esperando o toque da Karol.
 *
 * ⚠️ Isto é a trava de segurança do assistente. A IA nunca escreve na
 * agenda: ela descreve o que entendeu, a proposta fica gravada aqui, e a
 * Karol recebe dois botões. Só o toque dela executa.
 *
 * O motivo está no modo como um LLM erra. Ele não trava nem devolve erro —
 * acerta a forma e erra o alvo com confiança total. "Cancela a de amanhã",
 * com dois atendimentos amanhã, tem metade de chance de apagar o horário
 * errado, e a cliente descobre na porta do studio.
 *
 * Ver `supabase/migracao-05-assistente.sql`.
 */

export type AcaoPendente = {
  id: string;
  whatsapp: string;
  ferramenta: string;
  argumentos: Record<string, unknown>;
  /** A frase que a Karol leu antes de confirmar. */
  descricao: string;
};

/**
 * Guarda a proposta e devolve o id, que vira o `id` do botão.
 *
 * `null` quando não deu — sem banco, ou a gravação falhou. Quem chama
 * responde à Karol sem botão nenhum em vez de oferecer um botão que não
 * vai funcionar.
 */
export async function guardarAcao(
  a: Omit<AcaoPendente, "id">,
): Promise<string | null> {
  const bd = banco();
  if (!bd) return null;

  const { data, error } = await bd
    .from("acoes_pendentes")
    .insert({
      whatsapp: a.whatsapp,
      ferramenta: a.ferramenta,
      argumentos: a.argumentos,
      descricao: a.descricao.slice(0, 500),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("não consegui guardar a ação:", error?.message);
    return null;
  }
  return data.id as string;
}

/**
 * Busca uma ação que ainda pode ser executada.
 *
 * Confere TRÊS coisas, e nenhuma é redundante:
 *
 * - `situacao = aguardando` — não executar duas vezes se ela tocar duas
 *   vezes no mesmo botão, que no WhatsApp acontece o tempo todo.
 * - `expira_em > agora` — confirmar de manhã o que foi pedido de noite
 *   mudaria a agenda com base num estado que não existe mais.
 * - `whatsapp` bate — o botão vem do payload da Meta, e o payload diz de
 *   quem é a mensagem. Sem esta conferência, alguém que descobrisse um id
 *   de ação poderia executá-la a partir de outro número.
 */
export async function buscarAcao(
  id: string,
  whatsapp: string,
): Promise<AcaoPendente | null> {
  const bd = banco();
  if (!bd) return null;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return null;

  const { data } = await bd
    .from("acoes_pendentes")
    .select("*")
    .eq("id", id)
    .eq("whatsapp", whatsapp)
    .eq("situacao", "aguardando")
    .gte("expira_em", new Date().toISOString())
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    whatsapp: data.whatsapp as string,
    ferramenta: data.ferramenta as string,
    argumentos: (data.argumentos as Record<string, unknown>) ?? {},
    descricao: data.descricao as string,
  };
}

/** Fecha a ação. `resultado` fica gravado pro log. */
export async function fecharAcao(
  id: string,
  situacao: "feita" | "recusada" | "expirada",
  resultado?: string,
): Promise<void> {
  const bd = banco();
  if (!bd) return;

  await bd
    .from("acoes_pendentes")
    .update({ situacao, resultado: resultado?.slice(0, 500) ?? null })
    .eq("id", id);
}
