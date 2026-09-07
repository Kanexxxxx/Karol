/**
 * Ponte com o `tstzrange` do Postgres.
 *
 * O Supabase devolve o range como texto e espera texto na escrita. Este
 * módulo é só string e Date — sem `server-only`, pra qualquer lado usar.
 */

/**
 * Lê o range que o Postgres manda como texto.
 * Ex.: `["2026-09-01 08:00:00+00","2026-09-01 09:00:00+00")`
 *
 * Aceita `unknown` de propósito: o que entra aqui vem de uma linha do
 * banco, tipada na mão com `as string`. Se o campo vier nulo ou ausente —
 * consulta que não trouxe a coluna, linha em formato inesperado — a versão
 * anterior estourava `Cannot read properties of undefined` no meio de uma
 * ação do painel. Devolver `null` deixa quem chama tratar.
 */
export function lerPeriodo(texto: unknown): { inicio: Date; fim: Date } | null {
  if (typeof texto !== "string") return null;
  const m = texto.match(/\[?"?([^",]+)"?,"?([^")]+)"?\)?/);
  if (!m) return null;
  const inicio = new Date(m[1]);
  const fim = new Date(m[2]);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return null;
  return { inicio, fim };
}

/** Monta o literal `[inicio,fim)` que o Postgres aceita. */
export function montarPeriodo(inicio: Date, fim: Date): string {
  return `[${inicio.toISOString()},${fim.toISOString()})`;
}
