import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ehONumeroDaKarol } from "@/lib/notificacoes";
import { NEGOCIO } from "@/data/negocio";

/**
 * A ÚLTIMA PORTA DO LAÇO DAS 97 MENSAGENS.
 *
 * ---------------------------------------------------------------------
 * O que este teste guarda
 * ---------------------------------------------------------------------
 *
 * A guarda contra "a cliente é a própria Karol" mora em `enviarEvento`.
 * O aviso de falha de entrega, em `api/whatsapp/route.ts`, NÃO passa por
 * lá — chama `enviarTexto` direto. Ficou de fora, e ninguém percebeu por
 * três dias.
 *
 * O que acontecia: dos 11 agendamentos que a Karol cadastrou com o número
 * dela, uma falha de entrega mandava PRA ELA o recado "a cliente não
 * recebeu, chama ela por aqui: wa.me/5518997525291" — o número dela.
 * Mandar ela ligar pra si mesma. E essa mensagem falha também, pela mesma
 * janela de 24 h fechada, e a Meta devolve nova falha de entrega.
 *
 * ---------------------------------------------------------------------
 * ⚠️ POR QUE LENDO O ARQUIVO, E NÃO CHAMANDO A ROTA
 * ---------------------------------------------------------------------
 *
 * A rota é um handler do Next que precisa de assinatura da Meta, banco e
 * variáveis de ambiente. Montar tudo isso pra provar UMA linha daria um
 * teste frágil, que quebra por motivo errado.
 *
 * Ler o texto do arquivo prova o que importa: que a guarda está lá, ANTES
 * do envio pra ela. Se alguém apagar a linha num refactor, isto fica
 * vermelho. É o mesmo padrão de `acoes-servidor.test.ts`.
 */
const ROTA = resolve(process.cwd(), "src/app/api/whatsapp/route.ts");
const texto = readFileSync(ROTA, "utf8");

describe("falha de entrega não vira mensagem pra própria Karol", () => {
  it("a rota chama a guarda", () => {
    expect(texto).toContain("ehONumeroDaKarol(falha.para)");
  });

  it("a guarda vem ANTES do aviso pra ela — depois não serviria de nada", () => {
    const guarda = texto.indexOf("ehONumeroDaKarol(falha.para)");
    const avisoPraEla = texto.indexOf("O WhatsApp NÃO entregou a mensagem pra essa cliente");

    expect(guarda).toBeGreaterThan(-1);
    expect(avisoPraEla).toBeGreaterThan(-1);
    expect(guarda).toBeLessThan(avisoPraEla);
  });

  it("e ela corta o fluxo, em vez de só marcar", () => {
    const depois = texto.slice(texto.indexOf("ehONumeroDaKarol(falha.para)"));
    expect(depois.slice(0, 260)).toContain("return");
  });

  /*
    O diagnóstico técnico CONTINUA indo pro Kainã — ele é quem conserta.
    Uma guarda cega deixaria ele sem saber que a entrega falhou.
  */
  it("o aviso pro técnico continua existindo", () => {
    expect(texto).toContain("whatsappDoTecnico()");
    expect(texto).toContain("Falha de entrega no WhatsApp da Karol");
  });

  it("o número real da Karol é reconhecido pela guarda", () => {
    expect(ehONumeroDaKarol(NEGOCIO.whatsapp.numero)).toBe(true);
    expect(ehONumeroDaKarol("5518997525291")).toBe(true);
    expect(ehONumeroDaKarol("18997525291")).toBe(true);
    expect(ehONumeroDaKarol("5511988887777")).toBe(false);
  });
});
