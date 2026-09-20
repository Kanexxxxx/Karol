import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assinaturaConfere: vi.fn(() => true),
  lerFalhaDeEntrega: vi.fn(),
  lerMensagem: vi.fn(() => null),
  receber: vi.fn(),
  enviarTexto: vi.fn(async () => true),
  ehDestinoDeAlerta: vi.fn(() => false),
  ehONumeroDaKarol: vi.fn(() => false),
  temTecnicoSeparado: vi.fn(() => true),
  whatsappDaKarol: vi.fn(() => "5518997525291"),
  whatsappDoTecnico: vi.fn(() => "5516991557552"),
  avisarTecnico: vi.fn(async () => undefined),
}));

vi.mock("@/lib/recepcao", () => ({ receber: mocks.receber }));
vi.mock("@/lib/webhook-meta", () => ({
  assinaturaConfere: mocks.assinaturaConfere,
  lerFalhaDeEntrega: mocks.lerFalhaDeEntrega,
  lerMensagem: mocks.lerMensagem,
  respostaDaVerificacao: vi.fn(),
}));
vi.mock("@/lib/notificacoes", () => ({
  avisarTecnico: mocks.avisarTecnico,
  ehDestinoDeAlerta: mocks.ehDestinoDeAlerta,
  ehONumeroDaKarol: mocks.ehONumeroDaKarol,
  enviarTexto: mocks.enviarTexto,
  temTecnicoSeparado: mocks.temTecnicoSeparado,
  whatsappDaKarol: mocks.whatsappDaKarol,
  whatsappDoTecnico: mocks.whatsappDoTecnico,
}));

import { POST } from "./route";

function pedido(payload: unknown = {}): NextRequest {
  const bruto = JSON.stringify(payload);
  return {
    text: vi.fn(async () => bruto),
    headers: { get: vi.fn(() => "sha256=teste") },
  } as unknown as NextRequest;
}

describe("webhook de falha de entrega", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assinaturaConfere.mockReturnValue(true);
    mocks.ehDestinoDeAlerta.mockReturnValue(false);
    mocks.temTecnicoSeparado.mockReturnValue(true);
    mocks.enviarTexto.mockResolvedValue(true);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("não responde com novos WhatsApps quando o alerta interno falha", async () => {
    mocks.lerFalhaDeEntrega.mockReturnValue({
      para: "5516991557552",
      codigo: 131047,
      motivo: "janela encerrada",
    });
    mocks.ehDestinoDeAlerta.mockReturnValue(true);

    const resposta = await POST(pedido());

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toMatchObject({
      ok: true,
      entregaFalhou: 131047,
      alertaIgnorado: "destino interno",
    });
    expect(mocks.enviarTexto).not.toHaveBeenCalled();
  });

  it("continua avisando técnico e Karol quando a mensagem da cliente falha", async () => {
    mocks.lerFalhaDeEntrega.mockReturnValue({
      para: "5518999998888",
      codigo: 131047,
      motivo: "janela encerrada",
    });

    const resposta = await POST(pedido());

    expect(resposta.status).toBe(200);
    expect(mocks.enviarTexto).toHaveBeenCalledTimes(2);
    expect(mocks.enviarTexto).toHaveBeenNthCalledWith(
      1,
      "5516991557552",
      expect.any(String),
    );
    expect(mocks.enviarTexto).toHaveBeenNthCalledWith(
      2,
      "5518997525291",
      expect.any(String),
    );
  });
});
