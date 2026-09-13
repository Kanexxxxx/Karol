import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O transporte até o modelo.
 *
 * ---------------------------------------------------------------------
 * O defeito que criou este arquivo
 * ---------------------------------------------------------------------
 *
 * Em 13/09/2026 a Karol e o Kainã viram o assistente responder "Não
 * consegui responder isso. Tenta de outro jeito?" a um pedido comprido, e
 * uma outra resposta chegou **cortada no meio da frase**.
 *
 * Pareceu burrice do modelo. Não era: era configuração nossa. O modelo
 * PENSA antes de responder, e o pensamento sai do mesmo `max_tokens` da
 * resposta. Medido com o pedido real dele:
 *
 *     max_tokens=700   -> 700 tokens pensando, ZERO de resposta
 *     max_tokens=2000  -> 2000 pensando,       ZERO de resposta
 *     pensamento desligado -> resposta inteira
 *
 * Numa pergunta simples o pensamento já come 161 dos 215 tokens. O teto
 * era 700.
 *
 * ⚠️ Desligar o pensamento sempre NÃO é a saída: medido na bancada, sem
 * pensar o modelo cai de 16/16 pra 13/16 nos casos difíceis. Por isso ele
 * pensa por padrão, e o desligamento é rede pro caso em que ele pensou
 * até acabar o papel.
 */

vi.mock("server-only", () => ({}));

import { perguntar } from "./ia";

type Corpo = Record<string, unknown>;

/** Guarda o que foi enviado em cada ida, pra poder conferir depois. */
const enviados: Corpo[] = [];

/** Uma resposta da API, do jeito que ela vem. */
function resposta({
  texto = "tudo certo",
  motivo = "stop",
  chamadas = [] as unknown[],
}: { texto?: string | null; motivo?: string; chamadas?: unknown[] } = {}) {
  return {
    ok: true,
    json: async () => ({
      choices: [
        {
          finish_reason: motivo,
          message: { content: texto, tool_calls: chamadas.length ? chamadas : undefined },
        },
      ],
    }),
  } as unknown as Response;
}

/** Encadeia respostas: a primeira ida recebe a primeira, e assim por diante. */
function apiResponde(...respostas: Response[]) {
  let n = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: { body: string }) => {
      enviados.push(JSON.parse(init.body));
      return respostas[Math.min(n++, respostas.length - 1)];
    }),
  );
}

beforeEach(() => {
  enviados.length = 0;
  vi.clearAllMocks();
  process.env.DEEPSEEK_API_KEY = "sk-de-mentira";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DEEPSEEK_API_KEY;
});

const pergunta = [{ role: "user" as const, content: "e aí?" }];

describe("quando ele pensa até acabar o papel", () => {
  /*
    O caso exato do WhatsApp dela: `finish_reason: "length"`, conteúdo
    vazio, nenhuma ferramenta. Sem a segunda ida, isto vira o "Não
    consegui responder isso" na cara da Karol.
  */
  it("tenta de novo sem pensar, e é essa resposta que vale", async () => {
    apiResponde(
      resposta({ texto: "", motivo: "length" }),
      resposta({ texto: "Marquei sim, era isso?" }),
    );

    const r = await perguntar(pergunta, []);

    expect(enviados).toHaveLength(2);
    expect(enviados[0].thinking).toBeUndefined();
    expect(enviados[1].thinking).toEqual({ type: "disabled" });
    expect(r?.texto).toBe("Marquei sim, era isso?");
  });

  /*
    Uma ida só no caso normal. A segunda custa tempo e dinheiro, e o
    assistente já é lento — ela não pode virar rotina.
  */
  it.each([
    ["a resposta veio inteira", { texto: "pronto", motivo: "stop" }],
    ["cortou no fim mas escreveu algo", { texto: "pronto", motivo: "length" }],
  ])("não tenta de novo quando %s", async (_, primeira) => {
    apiResponde(resposta(primeira));

    await perguntar(pergunta, []);

    expect(enviados).toHaveLength(1);
  });

  /*
    Chamar ferramenta É responder. Se ele pediu `procurar` e parou por
    tamanho, o pedido está lá e vale — repetir sem pensar poderia trocar
    a ferramenta escolhida por outra.
  */
  it("não tenta de novo quando ele chamou uma ferramenta", async () => {
    apiResponde(
      resposta({
        texto: "",
        motivo: "length",
        chamadas: [{ id: "c1", type: "function", function: { name: "procurar", arguments: "{}" } }],
      }),
    );

    const r = await perguntar(pergunta, []);

    expect(enviados).toHaveLength(1);
    expect(r?.chamadas).toHaveLength(1);
  });

  /*
    Se a segunda também não trouxer nada, fica com a primeira. Devolver
    `null` aqui apagaria o pouco que a primeira tivesse — e quem chama
    trata `null` como "a IA caiu", que é outra história.
  */
  it("se a segunda também vier vazia, fica com a primeira", async () => {
    apiResponde(resposta({ texto: "", motivo: "length" }), resposta({ texto: "", motivo: "stop" }));

    const r = await perguntar(pergunta, []);

    expect(enviados).toHaveLength(2);
    expect(r).not.toBeNull();
    expect(r?.motivo).toBe("length");
  });
});

describe("o que vai no pedido", () => {
  it("o teto de tokens dá espaço pro pensamento", async () => {
    apiResponde(resposta());

    await perguntar(pergunta, []);

    // Eram 700, e 700 era o defeito. O número exato pode mudar; o que
    // não pode é voltar pra perto do que cortava as respostas.
    expect(Number(enviados[0].max_tokens)).toBeGreaterThanOrEqual(2000);
  });

  it("sem chave, não fala com ninguém", async () => {
    apiResponde(resposta());
    delete process.env.DEEPSEEK_API_KEY;

    expect(await perguntar(pergunta, [])).toBeNull();
    expect(enviados).toHaveLength(0);
  });

  it("a rede caindo devolve null em vez de explodir", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("caiu");
    }));

    await expect(perguntar(pergunta, [])).resolves.toBeNull();
  });
});
