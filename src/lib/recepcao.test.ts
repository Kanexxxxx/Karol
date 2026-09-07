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
vi.mock("./notificacoes", () => ({ whatsappDaKarol: vi.fn(() => "5518997525291") }));

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
