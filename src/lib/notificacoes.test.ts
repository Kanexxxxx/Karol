import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enviarEvento,
  notificadorConfigurado,
  textoAgradecimento,
  textoConfirmacao,
  textoLembrete,
  textoParaKarol,
  whatsappDaKarol,
  type DadosAgendamento,
} from "./notificacoes";

const AG: DadosAgendamento = {
  id: "ag-1",
  cliente: "Maria Silva Souza",
  whatsappCliente: "5518999998888",
  servico: "Design com henna",
  cidade: "Pereira Barreto",
  inicioISO: "2026-09-10T10:00:00.000Z",
  valorCentavos: 3000,
};

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("templates", () => {
  it("aviso pra Karol tem serviço, valor, cliente e WhatsApp", () => {
    const t = textoParaKarol(AG);
    expect(t).toContain("Design com henna");
    expect(t).toContain("Maria Silva Souza");
    expect(t).toContain("5518999998888");
    expect(t).toMatch(/R\$\s?30/);
  });

  it("mensagens pra cliente usam só o primeiro nome", () => {
    expect(textoConfirmacao(AG)).toContain("Maria");
    expect(textoConfirmacao(AG)).not.toContain("Maria Silva Souza");
    expect(textoLembrete(AG)).toMatch(/amanhã/i);
    expect(textoAgradecimento(AG)).toContain("Maria");
  });
});

describe("whatsappDaKarol", () => {
  it("prioriza a env e devolve só dígitos", () => {
    process.env.KAROL_WHATSAPP = "+55 (18) 90000-0000";
    expect(whatsappDaKarol()).toBe("5518900000000");
  });
  it("cai pro número do site quando a env está vazia", () => {
    delete process.env.KAROL_WHATSAPP;
    expect(whatsappDaKarol()).toMatch(/^\d{12,13}$/);
  });
});

describe("enviarEvento", () => {
  it("não chama o webhook quando não há URL", async () => {
    delete process.env.NOTIFICADOR_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await enviarEvento("lembrete", AG);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(notificadorConfigurado()).toBe(false);
  });

  it("posta o evento no webhook com o corpo esperado", async () => {
    process.env.NOTIFICADOR_WEBHOOK_URL = "https://hook.exemplo/karol";
    const fetchMock = vi.fn<(u: string, i: RequestInit) => Promise<{ ok: boolean; status: number }>>(
      () => Promise.resolve({ ok: true, status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await enviarEvento("confirmacao", AG);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hook.exemplo/karol");
    const corpo = JSON.parse(init.body as string);
    expect(corpo.evento).toBe("confirmacao");
    expect(corpo.agendamento.id).toBe("ag-1");
    expect(corpo.mensagem.destinatario).toBe("cliente");
    expect(corpo.mensagem.para).toBe("5518999998888");
    expect(corpo.mensagem.texto).toContain("Maria");
  });

  it("manda o aviso de novo-agendamento pra Karol", async () => {
    process.env.NOTIFICADOR_WEBHOOK_URL = "https://hook.exemplo/karol";
    process.env.KAROL_WHATSAPP = "5518911112222";
    const fetchMock = vi.fn<(u: string, i: RequestInit) => Promise<{ ok: boolean; status: number }>>(
      () => Promise.resolve({ ok: true, status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await enviarEvento("novo-agendamento", AG);

    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(corpo.mensagem.destinatario).toBe("karol");
    expect(corpo.mensagem.para).toBe("5518911112222");
  });

  it("engole erro de rede sem lançar", async () => {
    process.env.NOTIFICADOR_WEBHOOK_URL = "https://hook.exemplo/karol";
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("sem rede");
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(enviarEvento("lembrete", AG)).resolves.toBeUndefined();
  });
});

describe("envio pela Cloud API da Meta", () => {
  const dados = {
    id: "ag-1",
    cliente: "Maria da Silva",
    whatsappCliente: "5516991557552",
    servico: "Design de sobrancelha",
    cidade: "Pereira Barreto",
    inicioISO: "2026-09-08T10:00:00.000Z",
    valorCentavos: 2500,
  };

  beforeEach(() => {
    process.env.META_TOKEN = "token-de-teste";
    process.env.META_PHONE_NUMBER_ID = "1232997019905897";
    delete process.env.NOTIFICADOR_WEBHOOK_URL;
  });

  afterEach(() => {
    delete process.env.META_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;
  });

  it("chama a Meta com o Phone Number ID na URL, não o telefone", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await enviarEvento("confirmacao", dados);

    const [url, opcoes] = buscar.mock.calls[0];
    expect(String(url)).toContain("/1232997019905897/messages");
    const corpo = JSON.parse(String((opcoes as RequestInit).body));
    expect(corpo).toMatchObject({
      messaging_product: "whatsapp",
      to: "5516991557552",
      type: "text",
    });
    expect(corpo.text.body).toContain("Maria");
    buscar.mockRestore();
  });

  it("o aviso de novo agendamento vai pra Karol, não pra cliente", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await enviarEvento("novo-agendamento", dados);

    const corpo = JSON.parse(String((buscar.mock.calls[0][1] as RequestInit).body));
    expect(corpo.to).not.toBe(dados.whatsappCliente);
    buscar.mockRestore();
  });

  /**
   * 131047 é janela de 24h fechada — acontece de verdade com o lembrete da
   * véspera. Não pode derrubar o cron nem o agendamento.
   */
  it("engole o erro de janela fechada sem lançar", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 131047 } }), { status: 400 }),
    );
    await expect(enviarEvento("lembrete", dados)).resolves.toBeUndefined();
    buscar.mockRestore();
  });

  it("prefere a Meta quando as duas configurações existem", async () => {
    process.env.NOTIFICADOR_WEBHOOK_URL = "https://webhook.exemplo/nao-deve-ser-usado";
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await enviarEvento("confirmacao", dados);
    expect(String(buscar.mock.calls[0][0])).toContain("graph.facebook.com");
    buscar.mockRestore();
  });

  it("sem Meta e sem webhook, não chama ninguém", async () => {
    delete process.env.META_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    await enviarEvento("confirmacao", dados);
    expect(buscar).not.toHaveBeenCalled();
    buscar.mockRestore();
  });
});
