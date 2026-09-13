import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A conferência da foto que a cliente manda.
 *
 * ⚠️ TODO TESTE AQUI É SOBRE ERRAR PRO LADO CERTO.
 *
 * A pergunta que este módulo responde é barata de errar num sentido e
 * cara no outro. Chamar de "comprovante" uma foto de sobrancelha
 * aborrece a Karol por dois segundos. Chamar de "outra coisa" um
 * comprovante de verdade faz ela ignorar um pagamento — e a cliente
 * chega no studio sem horário, tendo pago.
 *
 * Por isso o padrão é `nao-sei`, que quem chama trata como comprovante:
 * sem chave, sem token, imagem grande, modelo que não enxerga, resposta
 * estranha. Só uma resposta clara de "OUTRA" vira `outra-coisa`.
 */

vi.mock("server-only", () => ({}));
vi.mock("./ia", () => ({
  iaConfigurada: vi.fn(() => true),
  perguntar: vi.fn(async () => ({ texto: "COMPROVANTE", chamadas: [] })),
}));

import { iaConfigurada, perguntar } from "./ia";
import { analisarComprovante } from "./comprovante";

const perguntarMock = vi.mocked(perguntar);
const configuradaMock = vi.mocked(iaConfigurada);

/** A Meta responde duas vezes: os dados da mídia, e depois os bytes. */
function metaResponde({
  tipo = "image/jpeg",
  bytes = 1024,
  falhaNoInfo = false,
  falhaNoArquivo = false,
}: { tipo?: string; bytes?: number; falhaNoInfo?: boolean; falhaNoArquivo?: boolean } = {}) {
  const fetchFalso = vi.fn(async (url: string | URL) => {
    const alvo = String(url);
    if (alvo.includes("graph.facebook.com")) {
      if (falhaNoInfo) return { ok: false, status: 404 } as unknown as Response;
      return {
        ok: true,
        json: async () => ({ url: "https://lookaside.meta/arquivo", mime_type: tipo }),
      } as unknown as Response;
    }
    if (falhaNoArquivo) return { ok: false, status: 500 } as unknown as Response;
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(bytes),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

beforeEach(() => {
  vi.clearAllMocks();
  configuradaMock.mockReturnValue(true);
  process.env.META_TOKEN = "token-de-mentira";
  perguntarMock.mockResolvedValue({ texto: "COMPROVANTE", chamadas: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.META_TOKEN;
});

describe("lendo a resposta do modelo", () => {
  it.each([
    ["COMPROVANTE", "comprovante"],
    ["comprovante", "comprovante"],
    ["  COMPROVANTE.  ", "comprovante"],
    ["OUTRA", "outra-coisa"],
    ["Outra coisa", "outra-coisa"],
  ])("%s vira %s", async (resposta, esperado) => {
    metaResponde();
    perguntarMock.mockResolvedValue({ texto: resposta, chamadas: [] });

    expect(await analisarComprovante("m1")).toBe(esperado);
  });

  /*
    O modelo pode devolver qualquer coisa: uma frase, um pedido de
    desculpas, vazio. Nada disso é "não é comprovante" — é "não deu".
  */
  it.each(["", "não sei dizer", "Desculpe, não posso ajudar", "🤔"])(
    "resposta estranha (%s) vira nao-sei",
    async (resposta) => {
      metaResponde();
      perguntarMock.mockResolvedValue({ texto: resposta, chamadas: [] });

      expect(await analisarComprovante("m1")).toBe("nao-sei");
    },
  );

  /*
    ⚠️ O modelo que não enxerga responde exatamente isto. Se um dia
    alguém trocar `IA_MODELO` pro `v4-pro`, a análise inteira tem que
    degradar pro comportamento antigo em vez de chamar todo comprovante
    de "outra coisa".
  */
  it("modelo que não enxerga imagem vira nao-sei, não outra-coisa", async () => {
    metaResponde();
    perguntarMock.mockResolvedValue({ texto: "NAO VEJO", chamadas: [] });

    expect(await analisarComprovante("m1")).toBe("nao-sei");
  });

  it("modelo fora do ar vira nao-sei", async () => {
    metaResponde();
    perguntarMock.mockResolvedValue(null);

    expect(await analisarComprovante("m1")).toBe("nao-sei");
  });
});

describe("quando nem dá pra olhar a foto", () => {
  it("sem chave de IA nem tenta baixar nada", async () => {
    const f = metaResponde();
    configuradaMock.mockReturnValue(false);

    expect(await analisarComprovante("m1")).toBe("nao-sei");
    expect(f).not.toHaveBeenCalled();
  });

  it("sem token da Meta não dá pra baixar", async () => {
    metaResponde();
    delete process.env.META_TOKEN;

    expect(await analisarComprovante("m1")).toBe("nao-sei");
    expect(perguntarMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a Meta não acha a mídia", { falhaNoInfo: true }],
    ["o arquivo não baixa", { falhaNoArquivo: true }],
    ["o arquivo vem vazio", { bytes: 0 }],
    ["o arquivo é grande demais", { bytes: 9 * 1024 * 1024 }],
  ])("%s vira nao-sei", async (_, opcoes) => {
    metaResponde(opcoes);

    expect(await analisarComprovante("m1")).toBe("nao-sei");
    expect(perguntarMock).not.toHaveBeenCalled();
  });

  /*
    PDF e áudio não vão pro modelo. Um comprovante em PDF existe e é
    válido — só não dá pra olhar por aqui, então segue como sempre seguiu.
  */
  it("o que não é imagem nem é olhado", async () => {
    metaResponde({ tipo: "application/pdf" });

    expect(await analisarComprovante("m1")).toBe("nao-sei");
    expect(perguntarMock).not.toHaveBeenCalled();
  });

  it("a rede caindo no meio não derruba o atendimento", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("rede caiu");
    }));

    await expect(analisarComprovante("m1")).resolves.toBe("nao-sei");
  });
});

describe("o que é mandado pro modelo", () => {
  it("a imagem vai junto com a pergunta, como data url", async () => {
    metaResponde({ tipo: "image/png" });

    await analisarComprovante("m1");

    const [mensagens] = perguntarMock.mock.calls[0];
    const conteudo = mensagens[0].content as { type: string; image_url?: { url: string } }[];

    expect(conteudo[0].type).toBe("text");
    expect(conteudo[1].type).toBe("image_url");
    expect(conteudo[1].image_url!.url).toMatch(/^data:image\/png;base64,/);
  });

  /*
    A instrução de desempate é o coração do módulo: sem ela o modelo
    hesita em print cortado e foto tremida, que é justamente como
    comprovante de verdade costuma chegar.
  */
  it("a pergunta manda responder COMPROVANTE na dúvida", async () => {
    metaResponde();

    await analisarComprovante("m1");

    const [mensagens] = perguntarMock.mock.calls[0];
    const texto = (mensagens[0].content as { type: string; text?: string }[])[0].text ?? "";
    expect(texto).toContain("Na dúvida, responda COMPROVANTE");
  });

  it("não oferece ferramenta nenhuma — é só uma pergunta", async () => {
    metaResponde();

    await analisarComprovante("m1");

    expect(perguntarMock.mock.calls[0][1]).toEqual([]);
  });
});
