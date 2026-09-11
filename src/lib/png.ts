import { deflateSync } from "node:zlib";

/**
 * PNG em preto e branco, escrito na mão.
 *
 * Serve pra uma coisa só: transformar a matriz do QR do PIX numa imagem
 * que o WhatsApp aceite. A Meta manda a imagem por URL — ela busca o
 * arquivo e reenvia —, então precisa ser um PNG de verdade, com cabeçalho
 * e CRC, e não um SVG (que o WhatsApp não exibe) nem um data URI.
 *
 * São 60 linhas porque um PNG de 1 bit por pixel é quase o formato mais
 * simples que existe: assinatura, um cabeçalho, os pixels comprimidos com
 * zlib (que o Node já tem) e um encerramento. Não vale trazer uma
 * biblioteca de imagem pra isto.
 *
 * ⚠️ `node:zlib` só existe no runtime Node. A rota que usa isto precisa
 * ficar fora do runtime Edge.
 */

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[i] = c >>> 0;
  }
  return tabela;
})();

function crc32(dados: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of dados) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Um pedaço do PNG: tamanho, nome, conteúdo e o CRC dos dois últimos. */
function pedaco(nome: string, conteudo: Uint8Array): Buffer {
  const cabecalho = Buffer.alloc(8);
  cabecalho.writeUInt32BE(conteudo.length, 0);
  cabecalho.write(nome, 4, "ascii");

  const paraCrc = Buffer.concat([cabecalho.subarray(4), conteudo]);
  const fim = Buffer.alloc(4);
  fim.writeUInt32BE(crc32(paraCrc), 0);

  return Buffer.concat([cabecalho, conteudo, fim]);
}

/**
 * A matriz do QR virando PNG.
 *
 * `escala` é quantos pixels tem cada módulo, e `margem` quantos MÓDULOS de
 * silêncio ficam em volta — a norma pede 4, e sem eles muitos leitores não
 * acham o código.
 */
export function qrParaPng(
  matriz: boolean[][],
  { escala = 10, margem = 4 }: { escala?: number; margem?: number } = {},
): Buffer {
  const modulos = matriz.length + margem * 2;
  const lado = modulos * escala;

  // Escala de cinza, 8 bits. Uma linha de filtro 0 por linha de pixel.
  const linhas = Buffer.alloc((lado + 1) * lado, 0xff);
  for (let y = 0; y < lado; y++) {
    const inicio = y * (lado + 1);
    linhas[inicio] = 0; // filtro "nenhum"
    const linhaModulo = Math.floor(y / escala) - margem;
    if (linhaModulo < 0 || linhaModulo >= matriz.length) continue;

    for (let x = 0; x < lado; x++) {
      const colunaModulo = Math.floor(x / escala) - margem;
      if (colunaModulo < 0 || colunaModulo >= matriz.length) continue;
      if (matriz[linhaModulo][colunaModulo]) linhas[inicio + 1 + x] = 0x00;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // bits por amostra
  ihdr[9] = 0; // tipo de cor: escala de cinza
  ihdr[10] = 0; // compressão
  ihdr[11] = 0; // filtro
  ihdr[12] = 0; // sem entrelaçamento

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pedaco("IHDR", ihdr),
    pedaco("IDAT", deflateSync(linhas, { level: 9 })),
    pedaco("IEND", new Uint8Array(0)),
  ]);
}
