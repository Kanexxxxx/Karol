import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * O que estes casos protegem: na Vercel o processo roda em UTC e `TZ` é um
 * nome de variável reservado, então não dá pra corrigir pelo painel. Se os
 * formatadores dependessem do fuso do processo, a agenda mostraria 04:00
 * onde a Karol trabalha às 07:00 — sem erro nenhum na tela.
 *
 * Por isso o fuso vai explícito em `datas.ts`, e aqui a gente carrega o
 * módulo com o processo em UTC pra provar que ele não se deixa levar.
 */

const FUSO_ORIGINAL = process.env.TZ;

afterEach(() => {
  process.env.TZ = FUSO_ORIGINAL;
  vi.resetModules();
});

/** Carrega `datas.ts` do zero, com o processo no fuso pedido. */
async function comFusoDoProcesso(tz: string) {
  process.env.TZ = tz;
  vi.resetModules();
  return import("./datas");
}

// 10:00 UTC é 07:00 em São Paulo — o começo do expediente dela.
const INSTANTE = new Date("2026-09-07T10:00:00Z");

describe("formatadores de data", () => {
  it("mostram a hora da Karol com o processo em UTC", async () => {
    const { HORA } = await comFusoDoProcesso("UTC");
    expect(HORA.format(INSTANTE)).toBe("07:00");
  });

  it("dão o mesmo resultado em qualquer fuso do processo", async () => {
    const emUtc = await comFusoDoProcesso("UTC");
    const utc = {
      hora: emUtc.HORA.format(INSTANTE),
      dia: emUtc.DIA_POR_EXTENSO.format(INSTANTE),
    };

    // Tóquio, do outro lado do mundo, pra não haver dúvida.
    const emToquio = await comFusoDoProcesso("Asia/Tokyo");
    expect(emToquio.HORA.format(INSTANTE)).toBe(utc.hora);
    expect(emToquio.DIA_POR_EXTENSO.format(INSTANTE)).toBe(utc.dia);
  });

  it("não deixam a data virar por causa do fuso", async () => {
    // 23:00 em São Paulo é 02:00 do dia SEGUINTE em UTC.
    const noiteBrasileira = new Date("2026-09-08T02:00:00Z");
    const { DIA_COM_ANO } = await comFusoDoProcesso("UTC");
    expect(DIA_COM_ANO.format(noiteBrasileira)).toContain("07");
  });
});
