import "server-only";

/**
 * Freio simples contra abuso do agendamento — em memória, por instância.
 *
 * Não é à prova de bala (reinicia a cada deploy, não conversa entre
 * instâncias do serverless), mas segura um script ingênuo que tenta lotar a
 * agenda com horários falsos. Junto com o honeypot e o carimbo de tempo do
 * formulário, resolve o caso comum sem depender de serviço externo.
 */

type Registro = { contagem: number; inicio: number };

const mapa = new Map<string, Registro>();
const JANELA_MS = 60 * 60 * 1000; // 1 hora
const MAX_PADRAO = 5;

/** true se `chave` ainda pode agir; conta a tentativa quando permite. */
export function dentroDoLimite(chave: string, max = MAX_PADRAO, janelaMs = JANELA_MS): boolean {
  const agora = Date.now();
  const r = mapa.get(chave);

  if (!r || agora - r.inicio > janelaMs) {
    mapa.set(chave, { contagem: 1, inicio: agora });
    varrer(janelaMs);
    return true;
  }
  if (r.contagem >= max) return false;

  r.contagem += 1;
  return true;
}

/** Remove janelas velhas pra o Map não crescer sem limite. */
function varrer(janelaMs: number) {
  const agora = Date.now();
  for (const [chave, r] of mapa) {
    if (agora - r.inicio > janelaMs) mapa.delete(chave);
  }
}
