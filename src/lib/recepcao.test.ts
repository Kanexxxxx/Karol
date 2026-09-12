import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MensagemRecebida } from "./webhook-meta";

/**
 * Quem atende quem.
 *
 * ⚠️ Este arquivo guarda a fronteira mais importante que o projeto tem
 * hoje. Pelo mesmo número entram as clientes e a própria Karol, e os dois
 * caminhos têm poderes diferentes: o assistente dela pode mudar a agenda,
 * o atendimento da cliente não pode — nem por engano, nem por refatoração
 * distraída daqui a seis meses.
 *
 * Um erro de roteamento aqui não daria erro nenhum na tela. Ele daria a
 * uma cliente qualquer o poder de cancelar horário conversando com um robô.
 */

vi.mock("./atendente", () => ({ atender: vi.fn(async () => ({ fez: "nada", motivo: "x" })) }));
vi.mock("./assistente", () => ({
  assistente: vi.fn(async () => ({ fez: "respondeu" })),
  decisaoDoBotao: vi.fn(async () => ({ fez: "recusou" })),
  PREFIXO_BOTAO: "a:",
}));
vi.mock("./conversas", () => ({ abrirJanela: vi.fn(async () => {}) }));
vi.mock("./notificacoes", () => ({
  whatsappDaKarol: vi.fn(() => "5518997525291"),
  BOTAO_TEMPLATE: {
    confirmar: "confirmar",
    remarcar: "remarcar",
    falar: "falar",
    pix: "pix",
    feedback: "feedback",
    notaOtimo: "nota_otimo",
    notaBom: "nota_bom",
    notaRuim: "nota_ruim",
  },
}));

import { atender } from "./atendente";
import { assistente, decisaoDoBotao } from "./assistente";
import { abrirJanela } from "./conversas";
import { ehAKarol, receber } from "./recepcao";

const KAROL = "5518997525291";
const CLIENTE = "5518999998888";

function mensagem(de: string, texto = "oi", botao?: string): MensagemRecebida {
  return { id: "wamid.1", de, texto, botao } as MensagemRecebida;
}

beforeEach(() => vi.clearAllMocks());

describe("de quem é a mensagem", () => {
  it("reconhece a Karol", () => {
    expect(ehAKarol(KAROL)).toBe(true);
  });

  it("não confunde cliente com a Karol", () => {
    expect(ehAKarol(CLIENTE)).toBe(false);
  });

  /**
   * O número da Karol vem de `NEGOCIO.whatsapp.numero` já formatado em
   * alguns lugares, e cru do payload da Meta em outros. Comparar sem
   * normalizar faria "(18) 99752-5291" nunca bater com "5518997525291" —
   * e o assistente dela simplesmente nunca responderia.
   */
  it("compara só os dígitos", () => {
    expect(ehAKarol("+55 (18) 99752-5291")).toBe(true);
  });
});

describe("o roteamento", () => {
  it("cliente vai pro atendimento, nunca pro assistente", async () => {
    await receber(mensagem(CLIENTE, "quero cancelar"));

    expect(atender).toHaveBeenCalledTimes(1);
    expect(assistente).not.toHaveBeenCalled();
    expect(decisaoDoBotao).not.toHaveBeenCalled();
  });

  it("a Karol escrevendo vai pro assistente", async () => {
    const r = await receber(mensagem(KAROL, "quantas clientes amanhã?"));

    expect(assistente).toHaveBeenCalledWith(KAROL, "quantas clientes amanhã?");
    expect(atender).not.toHaveBeenCalled();
    expect(r).toMatchObject({ quem: "karol", fez: "respondeu" });
  });

  it("botão do assistente vai pra decisão dela", async () => {
    await receber(mensagem(KAROL, "", "a:ok:aaaa"));

    expect(decisaoDoBotao).toHaveBeenCalledWith(KAROL, "a:ok:aaaa");
    expect(assistente).not.toHaveBeenCalled();
  });

  /**
   * O caso que quebraria uma coisa que já funciona.
   *
   * Os botões `k:` são da remarcação da CLIENTE esperando o aval da Karol.
   * Eles vêm do número dela, então a regra "é a Karol → assistente" os
   * pegaria — e a remarcação por WhatsApp, testada com celular de verdade,
   * pararia de existir sem nenhum teste reclamar.
   */
  it("botão de remarcação da cliente continua indo pro atendimento", async () => {
    await receber(mensagem(KAROL, "", "k:ok:pedido-1"));

    expect(atender).toHaveBeenCalledTimes(1);
    expect(assistente).not.toHaveBeenCalled();
    expect(decisaoDoBotao).not.toHaveBeenCalled();
  });
});

describe("a janela de 24 h", () => {
  /**
   * `atender()` abre a janela na primeira linha. O caminho da Karol não
   * passa mais por lá, e sem isso as respostas do assistente sairiam da
   * janela e a Meta começaria a recusar com 131047.
   */
  it("abre também pra Karol, que não passa mais pelo atendente", async () => {
    await receber(mensagem(KAROL, "oi"));
    expect(abrirJanela).toHaveBeenCalledWith(KAROL, "oi");
  });

  it("não abre duas vezes pra cliente — quem abre é o atendente", async () => {
    await receber(mensagem(CLIENTE, "oi"));
    expect(abrirJanela).not.toHaveBeenCalled();
  });
});

/**
 * Botão de cliente nunca vira conversa com a IA.
 *
 * ⚠️ ISTO ACONTECEU DE VERDADE, em 12/09/2026. Com `KAROL_WHATSAPP`
 * apontando pro número do Kainã (o desvio que existe pra testar sem
 * incomodar a Karol), ele tocou em "Confirmar" numa mensagem de CLIENTE.
 * A rota é pelo número, o número era o mesmo pros dois papéis, e o
 * assistente respondeu "Prontinho, Karol! Design da Kaina cancelado ✅".
 *
 * Não cancelou nada — só escreveu que sim. É o pior tipo de erro que este
 * projeto pode ter: a Karol lê que está feito e não está.
 *
 * Estes payloads só existem em template e em mensagem de cliente. Quem
 * toca neles está agindo como cliente, venha de onde vier.
 */
describe("botão de cliente, mesmo vindo do número da Karol", () => {
  for (const botao of ["confirmar", "remarcar", "cancelar", "pix", "falar", "feedback"]) {
    it(`"${botao}" vai pro atendimento, nunca pro assistente`, async () => {
      const r = await receber(mensagem(KAROL, "✅", botao));

      expect(atender).toHaveBeenCalled();
      expect(assistente).not.toHaveBeenCalled();
      expect(decisaoDoBotao).not.toHaveBeenCalled();
      expect(r.quem).toBe("cliente");
    });
  }

  it("os botões DELA continuam indo pro assistente", async () => {
    // o prefixo "a:" é o dos botões que o próprio assistente cria
    const r = await receber(mensagem(KAROL, "✅", "a:1234"));

    expect(decisaoDoBotao).toHaveBeenCalled();
    expect(atender).not.toHaveBeenCalled();
    expect(r.quem).toBe("karol");
  });

  it("texto solto dela continua indo pro assistente", async () => {
    const r = await receber(mensagem(KAROL, "cancela a ana"));

    expect(assistente).toHaveBeenCalled();
    expect(atender).not.toHaveBeenCalled();
    expect(r.quem).toBe("karol");
  });
});
