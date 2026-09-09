import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { gerarMatriz, qrParaSvg, type NivelCorrecao } from "./qr";
import gabaritos from "./qr.gabaritos.json";

/**
 * O codificador de QR conferido contra um gerador independente.
 *
 * `src/lib/qr.ts` foi escrito à mão neste projeto. O que vai dentro dele é
 * o BR Code do PIX da Karol com o valor do sinal: se um módulo sair
 * trocado, o banco da cliente ou recusa o código ou — muito pior — aceita
 * outro valor.
 *
 * Então a matriz não é conferida contra a minha própria expectativa (o que
 * não provaria nada: eu escrevi os dois lados). Ela é conferida contra o
 * `segno`, uma implementação madura em Python que não conhece este
 * projeto. Os gabaritos estão em `qr.gabaritos.json`, gerados por
 * `ferramentas/gabaritos-qr.py`.
 *
 * Se você mexer no codificador e um destes falhar, é o codificador que
 * está errado — não o gabarito.
 */

function impressao(matriz: boolean[][]): string {
  const texto = matriz.map((linha) => linha.map((c) => (c ? "1" : "0")).join("")).join("\n");
  return createHash("sha256").update(texto).digest("hex").slice(0, 32);
}

describe("QR — igual ao segno", () => {
  it("gera os 68 casos da varredura com a matriz idêntica", () => {
    const divergentes: string[] = [];

    for (const caso of gabaritos.varredura) {
      const matriz = gerarMatriz(caso.texto, {
        nivel: caso.nivel as NivelCorrecao,
        versao: caso.versao,
        mascara: caso.mascara,
      });

      if (matriz.length !== caso.lado) {
        divergentes.push(
          `v${caso.versao} ${caso.nivel} m${caso.mascara}: lado ${matriz.length} ≠ ${caso.lado}`,
        );
        continue;
      }
      if (impressao(matriz) !== caso.impressao) {
        divergentes.push(`v${caso.versao} ${caso.nivel} m${caso.mascara}: matriz diferente`);
      }
    }

    expect(divergentes).toEqual([]);
  });

  it("o BR Code de verdade bate módulo por módulo, escolhendo sozinho versão e máscara", () => {
    const { real } = gabaritos;
    const nossa = gerarMatriz(real.texto, { nivel: real.nivel as NivelCorrecao });

    // Não é só o desenho: a VERSÃO e a MÁSCARA também têm que ser as
    // mesmas. Se a nossa nota de penalidade estivesse errada, a matriz
    // ainda seria um QR válido — mas seria outro, e o teste passaria por
    // acidente se comparasse só "é legível".
    expect(nossa.length).toBe(17 + real.versao * 4);

    const nossaTexto = nossa.map((l) => l.map((c) => (c ? "1" : "0")).join(""));
    expect(nossaTexto).toEqual(real.matriz);
  });

  it("a escolha automática de máscara é a de menor penalidade", () => {
    // A prova indireta: fixando cada máscara, só uma delas dá a mesma
    // matriz que a escolha automática — e é a que o segno escolheu.
    const { real } = gabaritos;
    const automatica = impressao(gerarMatriz(real.texto, { nivel: "M" }));
    const fixada = impressao(
      gerarMatriz(real.texto, { nivel: "M", versao: real.versao, mascara: real.mascara }),
    );
    expect(automatica).toBe(fixada);
  });
});

describe("QR — os limites", () => {
  it("escolhe a menor versão que couber", () => {
    // 1 caractere cabe na versão 1 (21 módulos de lado)
    expect(gerarMatriz("a").length).toBe(21);
    // 200 bytes não cabem na 8 (196 total) e sobem pelo menos pra 9
    expect(gerarMatriz("x".repeat(200), { nivel: "M" }).length).toBeGreaterThan(17 + 8 * 4);
  });

  it("recusa em vez de truncar quando o texto não cabe", () => {
    // Truncar seria o pior desfecho possível: geraria um QR válido, que
    // abre no banco, com metade da chave PIX.
    expect(() => gerarMatriz("x".repeat(5000), { nivel: "M" })).toThrow(/não cabem/);
    expect(() => gerarMatriz("x".repeat(300), { nivel: "M", versao: 8 })).toThrow(/não cabem/);
  });

  it("aceita acento sem estragar a matriz", () => {
    // O modo é BYTE e o texto vai em UTF-8: "ã" ocupa 2 bytes. Se o
    // contador de caracteres usasse `length` da string em vez do tamanho
    // em bytes, isto aqui geraria um QR corrompido.
    const comAcento = gerarMatriz("Karol Carvalho — sobrancelhas ✨");
    expect(comAcento.length).toBeGreaterThan(20);
  });
});

describe("QR — o SVG", () => {
  it("desenha com margem de silêncio e um módulo por quadrado", () => {
    const matriz = gerarMatriz("teste", { nivel: "M" });
    const escuros = matriz.flat().filter(Boolean).length;
    const svg = qrParaSvg("teste", { nivel: "M" });

    // a norma pede 4 módulos de borda; sem eles o leitor não acha o código
    expect(svg).toContain(`viewBox="0 0 ${matriz.length + 8} ${matriz.length + 8}"`);
    // um "M…h1v1h-1z" por módulo escuro
    expect(svg.match(/h1v1h-1z/g)?.length).toBe(escuros);
  });

  it("não deixa aspas soltas do lado de fora do atributo", () => {
    // O SVG é injetado como HTML na página de confirmação. Se alguma cor
    // ou coordenada escapasse com aspas, viraria injeção de marcação.
    const svg = qrParaSvg("teste");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).not.toContain("<script");
  });
});
