import { vi } from "vitest";

/**
 * Fake mínimo do cliente Supabase pros testes.
 *
 * Cobre só o que as libs usam: `from().select()/insert()/update()/delete()`
 * encadeado com `eq/in/overlaps/order/gte/lte/lt/ilike/limit` e terminando em
 * `single/maybeSingle` ou no próprio `await` (o builder do PostgREST é
 * "thenable").
 *
 * Os filtros ficam gravados em `Chamada.filtros`. Isso importa em consulta
 * cujo VALOR está certo mas o FILTRO pode estar errado — a busca por código,
 * por exemplo, tem que virar intervalo em `id`, e a busca por nome tem que
 * escapar os curingas do LIKE. Sem gravar, o teste só veria a lista vazia
 * dos dois jeitos e passaria com a consulta errada.
 */

/*
  `count` existe porque o PostgREST devolve contagem quando quem chama pede
  `select("id", { count: "exact", head: true })` — é assim que o teto de
  horários por pessoa conta sem trazer as linhas.
*/
type Resposta = { data?: unknown; error?: unknown; count?: number };

/** Um `.eq("id", x)` vira `{ metodo: "eq", coluna: "id", valor: x }`. */
export type Filtro = { metodo: string; coluna?: string; valor?: unknown };

type Handlers = {
  select?: (tabela: string) => Resposta;
  insert?: (tabela: string, valores: Record<string, unknown>) => Resposta;
  update?: (tabela: string, valores: Record<string, unknown>) => Resposta;
  upsert?: (tabela: string, valores: Record<string, unknown>) => Resposta;
  delete?: (tabela: string) => Resposta;
};

export type Chamada = {
  tabela: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  valores?: Record<string, unknown>;
  filtros: Filtro[];
};

export function mockBanco(handlers: Handlers = {}) {
  const chamadas: Chamada[] = [];

  function from(tabela: string) {
    let op: Chamada["op"] = "select";
    let valores: Record<string, unknown> | undefined;
    const filtros: Filtro[] = [];

    const anota =
      (metodo: string) =>
      (coluna?: string, valor?: unknown) => (filtros.push({ metodo, coluna, valor }), builder);

    const resolver = (): Promise<Resposta> => {
      chamadas.push({ tabela, op, valores, filtros });
      const r =
        op === "insert"
          ? handlers.insert?.(tabela, valores ?? {})
          : op === "update"
            ? handlers.update?.(tabela, valores ?? {})
            : op === "upsert"
              ? handlers.upsert?.(tabela, valores ?? {})
              : op === "delete"
                ? handlers.delete?.(tabela)
                : handlers.select?.(tabela);
      return Promise.resolve(r ?? { data: op === "select" ? [] : null, error: null });
    };

    /** Como `resolver`, mas com o default de linha única: `null`. */
    const umSo = async (): Promise<Resposta> => {
      const r = await resolver();
      return Array.isArray(r.data) && r.data.length === 0 ? { ...r, data: null } : r;
    };

    const builder = {
      select: () => builder,
      insert: (v: Record<string, unknown>) => ((op = "insert"), (valores = v), builder),
      update: (v: Record<string, unknown>) => ((op = "update"), (valores = v), builder),
      upsert: (v: Record<string, unknown>) => ((op = "upsert"), (valores = v), builder),
      delete: () => ((op = "delete"), builder),
      eq: anota("eq"),
      // `is` é o filtro de NULL do PostgREST. Entrou com o lembrete de 30
      // minutos, que foi arrancado do projeto em 13/09/2026 — ficou porque
      // é uma linha e o próximo `is null` que alguém escrever já vai poder
      // ser testado.
      is: anota("is"),
      in: anota("in"),
      overlaps: anota("overlaps"),
      order: anota("order"),
      gte: anota("gte"),
      lte: anota("lte"),
      // `lt` entrou com a expiração de pendente não pago, que compara
      // `criado_em` com a meia-noite de hoje.
      lt: anota("lt"),
      ilike: anota("ilike"),
      limit: (n: number) => (filtros.push({ metodo: "limit", valor: n }), builder),
      // `single`/`maybeSingle` devolvem UM objeto ou null no PostgREST de
      // verdade, nunca lista. O default do resolver é `[]` (que serve pro
      // select comum), e devolver `[]` aqui fazia o teste ver uma "linha"
      // vazia que o código real nunca receberia.
      single: () => umSo(),
      maybeSingle: () => umSo(),
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
