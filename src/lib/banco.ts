import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Acesso ao banco. Só do servidor.
 *
 * A chave de serviço passa por cima do RLS, então ela nunca pode chegar ao
 * navegador — por isso o `server-only` no topo: se algum componente de
 * cliente importar este arquivo, o build quebra em vez de vazar a chave.
 *
 * Enquanto o Supabase não estiver configurado, `banco()` devolve null e a
 * página de agendamento mostra um aviso em vez de estourar. Isso deixa o
 * site institucional no ar mesmo antes do banco existir.
 */

let cliente: SupabaseClient | null = null;

export function bancoConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function banco(): SupabaseClient | null {
  if (!bancoConfigurado()) return null;
  if (cliente) return cliente;

  cliente = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cliente;
}
