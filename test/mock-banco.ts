import { vi } from "vitest";

/**
 * Fake mínimo do cliente Supabase pros testes.
 *
 * Cobre só o que as libs usam: `from().select()/insert()/update()/delete()`
 * encadeado com `eq/in/overlaps/order` e terminando em `single/maybeSingle`
 * ou no próprio `await` (o builder do PostgREST é "thenable").
 */

type Resposta = { data?: unknown; error?: unknown };

type Handlers = {
  select?: (tabela: string) => Resposta;
  insert?: (tabela: string, valores: Record<string, unknown>) => Resposta;
  update?: (tabela: string, valores: Record<string, unknown>) => Resposta;
  delete?: (tabela: string) => Resposta;
};

export type Chamada = {
  tabela: string;
  op: "select" | "insert" | "update" | "delete";
  valores?: Record<string, unknown>;
};

export function mockBanco(handlers: Handlers = {}) {
  const chamadas: Chamada[] = [];

  function from(tabela: string) {
    let op: Chamada["op"] = "select";
    let valores: Record<string, unknown> | undefined;

    const resolver = (): Promise<Resposta> => {
      chamadas.push({ tabela, op, valores });
      const r =
        op === "insert"
          ? handlers.insert?.(tabela, valores ?? {})
          : op === "update"
            ? handlers.update?.(tabela, valores ?? {})
            : op === "delete"
              ? handlers.delete?.(tabela)
              : handlers.select?.(tabela);
      return Promise.resolve(r ?? { data: op === "select" ? [] : null, error: null });
    };

    const builder = {
      select: () => builder,
      insert: (v: Record<string, unknown>) => ((op = "insert"), (valores = v), builder),
      update: (v: Record<string, unknown>) => ((op = "update"), (valores = v), builder),
      delete: () => ((op = "delete"), builder),
      eq: () => builder,
      in: () => builder,
      overlaps: () => builder,
      order: () => builder,
      single: () => resolver(),
      maybeSingle: () => resolver(),
      then: (ok: (v: Resposta) => unknown, err?: (e: unknown) => unknown) =>
        resolver().then(ok, err),
    };
    return builder;
  }

  return { cliente: { from } as unknown, chamadas };
}

/** Atalho: mocka `@/lib/banco` já configurado, com os handlers dados. */
export function instalarBanco(handlers: Handlers = {}) {
  const { cliente, chamadas } = mockBanco(handlers);
  return { cliente, chamadas, bancoMock: vi.fn(() => cliente) };
}
