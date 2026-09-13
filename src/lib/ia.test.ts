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

import { iaConfigurada, perguntar, provedorAtual } from "./ia";

type Corpo = Record<string, unknown>;

/** Guarda o que foi enviado em cada ida, pra poder conferir depois. */
const enviados: Corpo[] = [];
/** E pra onde foi cada uma — é o que diz qual provedor atendeu. */
const enderecos: string[] = [];

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
function apiResponde(...respostas: (Response | Error)[]) {
  let n = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { body: string }) => {
      enderecos.push(String(url));
      enviados.push(JSON.parse(init.body));
      const r = respostas[Math.min(n++, respostas.length - 1)];
      if (r instanceof Error) throw r;
      return r;
    }),
  );
}

beforeEach(() => {
  enviados.length = 0;
  enderecos.length = 0;
  delete process.env.OPENAI_API_KEY;
  delete process.env.IA_PROVEDOR;
  vi.clearAllMocks();
  process.env.DEEPSEEK_API_KEY = "sk-de-mentira";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.IA_PROVEDOR;
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

/**
 * Dois provedores, um cobrindo o outro.
 *
 * ⚠️ NÃO É PRA FICAR MAIS ESPERTO — É PRA NÃO FICAR MUDO. Quando a API do
 * DeepSeek cai, ou a conta seca, o assistente hoje responde "não consegui
 * pensar agora" e a Karol fica sem agenda no meio do expediente. Com o
 * segundo provedor, ela nem percebe.
 */
describe("quando um provedor cai, o outro assume", () => {
  it("só com a chave do DeepSeek, fala só com ele", async () => {
    apiResponde(resposta());

    await perguntar(pergunta, []);

    expect(enderecos).toHaveLength(1);
    expect(enderecos[0]).toContain("api.deepseek.com");
    expect(provedorAtual()).toBe("deepseek");
  });

  it("com os dois, o DeepSeek caindo passa a bola pra OpenAI", async () => {
    process.env.OPENAI_API_KEY = "sk-openai-de-mentira";
    apiResponde(new Error("deepseek fora do ar"), resposta({ texto: "respondi eu" }));

    const r = await perguntar(pergunta, []);

    expect(enderecos[0]).toContain("api.deepseek.com");
    expect(enderecos[1]).toContain("api.openai.com");
    expect(r?.texto).toBe("respondi eu");
  });

  /*
    Resposta ruim NÃO é falha. A gente já pagou por ela; chamar o segundo
    seria pagar duas vezes pela mesma pergunta, e a Karol esperar o dobro.
  */
  it("resposta fraca não faz trocar de provedor", async () => {
    process.env.OPENAI_API_KEY = "sk-openai-de-mentira";
    apiResponde(resposta({ texto: "sei lá" }));

    await perguntar(pergunta, []);

    expect(enderecos).toHaveLength(1);
    expect(enderecos[0]).toContain("api.deepseek.com");
  });

  it("IA_PROVEDOR=openai põe a OpenAI na frente", async () => {
    process.env.OPENAI_API_KEY = "sk-openai-de-mentira";
    process.env.IA_PROVEDOR = "openai";
    apiResponde(resposta());

    await perguntar(pergunta, []);

    expect(enderecos[0]).toContain("api.openai.com");
    expect(provedorAtual()).toBe("openai");
  });

  /*
    ⚠️ `thinking` é coisa da DeepSeek. Mandar isso pra OpenAI é 400 — e
    seria um 400 nascido justamente na hora em que o assistente está
    tentando se recuperar de uma resposta vazia.
  */
  it("a OpenAI nunca recebe o parâmetro de pensamento", async () => {
    process.env.OPENAI_API_KEY = "sk-openai-de-mentira";
    process.env.IA_PROVEDOR = "openai";
    apiResponde(resposta({ texto: "", motivo: "length" }), resposta({ texto: "agora foi" }));

    await perguntar(pergunta, []);

    for (const corpo of enviados) expect(corpo.thinking).toBeUndefined();
  });

  it("sem chave nenhuma, a IA está desligada", async () => {
    apiResponde(resposta());
    delete process.env.DEEPSEEK_API_KEY;

    expect(iaConfigurada()).toBe(false);
    expect(provedorAtual()).toBeNull();
    expect(await perguntar(pergunta, [])).toBeNull();
    expect(enderecos).toHaveLength(0);
  });

  it("os dois caindo devolve null, e não uma resposta inventada", async () => {
    process.env.OPENAI_API_KEY = "sk-openai-de-mentira";
    apiResponde(new Error("caiu"), new Error("caiu também"));

    expect(await perguntar(pergunta, [])).toBeNull();
    expect(enderecos).toHaveLength(2);
  });
});

/**
 * Ele escreveu a chamada de ferramenta à mão, em vez de chamá-la.
 *
 * ⚠️ ERA ISTO QUE O KAINÃ LIA COMO ASSISTENTE BURRO. Em vez de texto vem
 * `<｜｜DSML｜｜invoke name="ver_agenda">`. O filtro de `fala-do-modelo.ts`
 * barra antes de chegar na Karol — e o que sobra é "Não consegui
 * responder isso".
 *
 * Medido em 13/09: acontece justamente nas mensagens de CONVERSA ("nossa
 * que dia cheio, tô morta"), onde não existe ferramenta pra chamar e ele
 * inventa uma. É a pior hora pra ficar mudo: é quando ela não está
 * pedindo nada, só falando.
 */
describe("quando ele escreve a marcação em vez de chamar", () => {
  const VAZAMENTO = '<｜｜DSML｜｜tool_calls>\n<｜｜DSML｜｜invoke name="ver_agenda">';

  it("tenta de novo sem pensar, e a resposta boa é a que vale", async () => {
    apiResponde(
      resposta({ texto: VAZAMENTO }),
      resposta({ texto: "Ai, dia puxado mesmo 😩 Quer que eu confira a agenda?" }),
    );

    const r = await perguntar(pergunta, []);

    expect(enviados).toHaveLength(2);
    expect(enviados[1].thinking).toEqual({ type: "disabled" });
    expect(r?.texto).toContain("dia puxado");
  });

  /*
    Marcação COM chamada de ferramenta de verdade junto não repete: o
    pedido dela já foi atendido, e insistir poderia trocar a ferramenta
    escolhida por outra.
  */
  it("não repete se ele também chamou uma ferramenta de verdade", async () => {
    apiResponde(
      resposta({
        texto: VAZAMENTO,
        chamadas: [{ id: "c1", type: "function", function: { name: "ver_agenda", arguments: "{}" } }],
      }),
    );

    await perguntar(pergunta, []);

    expect(enviados).toHaveLength(1);
  });

  it("texto normal não faz repetir", async () => {
    apiResponde(resposta({ texto: "Sexta você tem 3 clientes." }));

    await perguntar(pergunta, []);

    expect(enviados).toHaveLength(1);
  });
});
