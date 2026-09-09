/**
 * QR Code — do zero, sem biblioteca.
 *
 * ---------------------------------------------------------------------
 * Por que escrever isto em vez de instalar um pacote
 * ---------------------------------------------------------------------
 *
 * Porque o que vai dentro deste QR é **dinheiro**. É o BR Code do PIX da
 * Karol com o valor do sinal já embutido: se um bit sair errado, a cliente
 * abre o banco, o app diz "código inválido" e ela desiste de pagar — ou,
 * pior, o app aceita e manda o valor errado.
 *
 * Um pacote de terceiro resolveria em uma linha, mas traria código que eu
 * não leio, que atualiza sozinho e que ninguém aqui vai auditar. Este
 * arquivo é o contrário: 300 linhas que fazem uma coisa só, e que estão
 * conferidas **matriz por matriz** contra o `segno` (gerador independente,
 * em Python) em `qr.test.ts`. Se um dia alguém mexer aqui e errar um bit,
 * o teste acusa antes de ir pro ar.
 *
 * O projeto tem cinco dependências. Continua tendo cinco.
 *
 * ---------------------------------------------------------------------
 * O que está implementado
 * ---------------------------------------------------------------------
 *
 * Modo BYTE, versões 1 a 15, os quatro níveis de correção. É de sobra pro
 * PIX (o payload dela tem ~170 caracteres, que cabe na versão 8 no nível
 * M) e o suficiente pra qualquer outra coisa que este site venha a
 * precisar. Versão 16+ exigiria mais linhas de tabela e nenhum uso real.
 *
 * Referência: ISO/IEC 18004. Os nomes das etapas seguem a norma, em
 * português, pra quem for conferir conseguir achar a seção correspondente.
 */

export type NivelCorrecao = "L" | "M" | "Q" | "H";

/**
 * Tabela de correção de erro, versões 1..15.
 *
 * Cada entrada: [códigos de correção por bloco, blocos do grupo 1, dados
 * por bloco do grupo 1, blocos do grupo 2, dados por bloco do grupo 2].
 *
 * ⚠️ Números da norma, digitados à mão. É a parte mais fácil de errar do
 * arquivo inteiro e a mais difícil de perceber no olho — um bloco a mais
 * numa versão que você não usa fica quieto durante meses. Por isso o teste
 * compara TODAS as versões e TODOS os níveis contra o segno, e não só o
 * caso do PIX.
 */
const CORRECAO: Record<NivelCorrecao, [number, number, number, number, number][]> = {
  L: [
    [7, 1, 19, 0, 0],
    [10, 1, 34, 0, 0],
    [15, 1, 55, 0, 0],
    [20, 1, 80, 0, 0],
    [26, 1, 108, 0, 0],
    [18, 2, 68, 0, 0],
    [20, 2, 78, 0, 0],
    [24, 2, 97, 0, 0],
    [30, 2, 116, 0, 0],
    [18, 2, 68, 2, 69],
    [20, 4, 81, 0, 0],
    [24, 2, 92, 2, 93],
    [26, 4, 107, 0, 0],
    [30, 3, 115, 1, 116],
    [22, 5, 87, 1, 88],
  ],
  M: [
    [10, 1, 16, 0, 0],
    [16, 1, 28, 0, 0],
    [26, 1, 44, 0, 0],
    [18, 2, 32, 0, 0],
    [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0],
    [18, 4, 31, 0, 0],
    [22, 2, 38, 2, 39],
    [22, 3, 36, 2, 37],
    [26, 4, 43, 1, 44],
    [30, 1, 50, 4, 51],
    [22, 6, 36, 2, 37],
    [22, 8, 37, 1, 38],
    [24, 4, 40, 5, 41],
    [24, 5, 41, 5, 42],
  ],
  Q: [
    [13, 1, 13, 0, 0],
    [22, 1, 22, 0, 0],
    [18, 2, 17, 0, 0],
    [26, 2, 24, 0, 0],
    [18, 2, 15, 2, 16],
    [24, 4, 19, 0, 0],
    [18, 2, 14, 4, 15],
    [22, 4, 18, 2, 19],
    [20, 4, 16, 4, 17],
    [24, 6, 19, 2, 20],
    [28, 4, 22, 4, 23],
    [26, 4, 20, 6, 21],
    [24, 8, 20, 4, 21],
    [20, 11, 16, 5, 17],
    [30, 5, 24, 7, 25],
  ],
  H: [
    [17, 1, 9, 0, 0],
    [28, 1, 16, 0, 0],
    [22, 2, 13, 0, 0],
    [16, 4, 9, 0, 0],
    [22, 2, 11, 2, 12],
    [28, 4, 15, 0, 0],
    [26, 4, 13, 1, 14],
    [26, 4, 14, 2, 15],
    [24, 4, 12, 4, 13],
    [28, 6, 15, 2, 16],
    [24, 3, 12, 8, 13],
    [28, 7, 14, 4, 15],
    [22, 12, 11, 4, 12],
    [24, 11, 12, 5, 13],
    [24, 11, 12, 7, 13],
  ],
};

/** Centros dos padrões de alinhamento, versões 1..15. */
const ALINHAMENTO: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
];

/** Bits indicadores do nível, na ordem da norma (não é L<M<Q<H). */
const BITS_NIVEL: Record<NivelCorrecao, number> = { L: 1, M: 0, Q: 3, H: 2 };

// ---------------------------------------------------------------------
// Aritmética em GF(256) — a base do Reed-Solomon
// ---------------------------------------------------------------------

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    // polinômio primitivo 0x11D, o que a norma manda pro QR
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

function multiplicar(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Polinômio gerador de grau `grau`, para o Reed-Solomon. */
function gerador(grau: number): Uint8Array {
  let poli = new Uint8Array([1]);
  for (let i = 0; i < grau; i++) {
    const proximo = new Uint8Array(poli.length + 1);
    for (let j = 0; j < poli.length; j++) {
      proximo[j] ^= poli[j];
      proximo[j + 1] ^= multiplicar(poli[j], EXP[i]);
    }
    poli = proximo;
  }
  return poli;
}

/** Os códigos de correção de um bloco de dados. */
function correcaoDoBloco(dados: Uint8Array, quantos: number): Uint8Array {
  const g = gerador(quantos);
  const resto = new Uint8Array(quantos);

  for (const byte of dados) {
    const fator = byte ^ resto[0];
    resto.copyWithin(0, 1);
    resto[quantos - 1] = 0;
    if (fator !== 0) {
      for (let i = 0; i < quantos; i++) {
        resto[i] ^= multiplicar(g[i + 1], fator);
      }
    }
  }

  return resto;
}

// ---------------------------------------------------------------------
// Codificação dos dados
// ---------------------------------------------------------------------

/** Quantos bytes de dados cabem nesta versão e nível. */
function capacidade(versao: number, nivel: NivelCorrecao): number {
  const [, b1, d1, b2, d2] = CORRECAO[nivel][versao - 1];
  const totalDados = b1 * d1 + b2 * d2;
  // 4 bits de modo + o contador de caracteres, ambos saem do orçamento
  const bitsCabecalho = 4 + (versao < 10 ? 8 : 16);
  return totalDados - Math.ceil(bitsCabecalho / 8);
}

/** A menor versão que aguenta estes bytes. */
function menorVersao(bytes: number, nivel: NivelCorrecao): number {
  for (let v = 1; v <= 15; v++) {
    if (bytes <= capacidade(v, nivel)) return v;
  }
  throw new Error(
    `QR: ${bytes} bytes não cabem no nível ${nivel} até a versão 15`,
  );
}

/**
 * Monta o fluxo de códigos: cabeçalho, dados, terminador, preenchimento,
 * correção de erro, e a intercalação dos blocos.
 */
function codificar(
  dados: Uint8Array,
  versao: number,
  nivel: NivelCorrecao,
): Uint8Array {
  const [ecPorBloco, b1, d1, b2, d2] = CORRECAO[nivel][versao - 1];
  const totalDados = b1 * d1 + b2 * d2;

  // --- fluxo de bits ---
  const bits: number[] = [];
  const empurrar = (valor: number, quantos: number) => {
    for (let i = quantos - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
  };

  empurrar(0b0100, 4); // modo byte
  empurrar(dados.length, versao < 10 ? 8 : 16);
  for (const b of dados) empurrar(b, 8);

  // terminador: até 4 zeros, e só se sobrar espaço
  const capacidadeBits = totalDados * 8;
  for (let i = 0; i < 4 && bits.length < capacidadeBits; i++) bits.push(0);
  // fecha o último byte
  while (bits.length % 8 !== 0) bits.push(0);

  const codigos = new Uint8Array(totalDados);
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codigos[i / 8] = byte;
  }
  // enchimento alternado 0xEC / 0x11, como manda a norma
  for (let i = bits.length / 8; i < totalDados; i++) {
    codigos[i] = i % 2 === bits.length / 8 % 2 ? 0xec : 0x11;
  }

  // --- blocos ---
  const blocosDados: Uint8Array[] = [];
  const blocosCorrecao: Uint8Array[] = [];
  let posicao = 0;
  for (const [quantos, tamanho] of [
    [b1, d1],
    [b2, d2],
  ]) {
    for (let i = 0; i < quantos; i++) {
      const bloco = codigos.subarray(posicao, posicao + tamanho);
      posicao += tamanho;
      blocosDados.push(bloco);
      blocosCorrecao.push(correcaoDoBloco(bloco, ecPorBloco));
    }
  }

  // --- intercalação ---
  // Os bytes saem em colunas, não em blocos: primeiro byte de cada bloco,
  // depois o segundo de cada, e assim por diante. É o que faz um borrão
  // no papel estragar um pedacinho de vários blocos em vez de destruir um
  // bloco inteiro.
  const saida: number[] = [];
  const maiorDados = Math.max(d1, d2);
  for (let i = 0; i < maiorDados; i++) {
    for (const bloco of blocosDados) {
      if (i < bloco.length) saida.push(bloco[i]);
    }
  }
  for (let i = 0; i < ecPorBloco; i++) {
    for (const bloco of blocosCorrecao) saida.push(bloco[i]);
  }

  return new Uint8Array(saida);
}

// ---------------------------------------------------------------------
// A matriz
// ---------------------------------------------------------------------

type Matriz = {
  /** true = módulo escuro */
  celulas: boolean[][];
  /** true = função (não pode receber dado nem máscara) */
  reservado: boolean[][];
  lado: number;
};

function matrizVazia(lado: number): Matriz {
  return {
    celulas: Array.from({ length: lado }, () => new Array<boolean>(lado).fill(false)),
    reservado: Array.from({ length: lado }, () => new Array<boolean>(lado).fill(false)),
    lado,
  };
}

function pintar(m: Matriz, y: number, x: number, escuro: boolean) {
  m.celulas[y][x] = escuro;
  m.reservado[y][x] = true;
}

function desenharFuncoes(m: Matriz, versao: number) {
  const lado = m.lado;

  // localizadores (os três quadrados dos cantos) + separadores
  for (const [cy, cx] of [
    [0, 0],
    [0, lado - 7],
    [lado - 7, 0],
  ]) {
    for (let y = -1; y <= 7; y++) {
      for (let x = -1; x <= 7; x++) {
        const py = cy + y;
        const px = cx + x;
        if (py < 0 || py >= lado || px < 0 || px >= lado) continue;
        const borda = y === 0 || y === 6 || x === 0 || x === 6;
        const miolo = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        const dentro = y >= 0 && y <= 6 && x >= 0 && x <= 6;
        pintar(m, py, px, dentro && (borda || miolo));
      }
    }
  }

  // linhas de tempo
  for (let i = 8; i < lado - 8; i++) {
    pintar(m, 6, i, i % 2 === 0);
    pintar(m, i, 6, i % 2 === 0);
  }

  /*
    Alinhamento.

    ⚠️ OS TRÊS QUE NÃO EXISTEM são só os que cairiam EM CIMA DOS
    LOCALIZADORES: primeiro×primeiro, primeiro×último e último×primeiro.
    Nenhum outro é pulado.

    A versão anterior deste trecho pulava qualquer centro que já estivesse
    reservado — o que parece a mesma coisa e não é. A partir da versão 7 a
    lista tem um centro no meio, e os pares (6, meio) e (meio, 6) caem em
    cima da LINHA DE TEMPO, que também está reservada. Eles são padrões
    legítimos, e estavam sumindo.

    O sintoma era cruel: versões 1 a 6 saíam perfeitas e da 7 em diante o
    código inteiro ficava ilegível. Como o PIX da Karol dá versão 8, era
    exatamente o caso que importava.
  */
  const centros = ALINHAMENTO[versao - 1];
  const primeiro = centros[0];
  const ultimo = centros[centros.length - 1];
  const noLocalizador = (cy: number, cx: number) =>
    (cy === primeiro && cx === primeiro) ||
    (cy === primeiro && cx === ultimo) ||
    (cy === ultimo && cx === primeiro);

  for (const cy of centros) {
    for (const cx of centros) {
      if (noLocalizador(cy, cx)) continue;
      for (let y = -2; y <= 2; y++) {
        for (let x = -2; x <= 2; x++) {
          const anel = Math.max(Math.abs(y), Math.abs(x));
          pintar(m, cy + y, cx + x, anel !== 1);
        }
      }
    }
  }

  // módulo sempre escuro
  pintar(m, lado - 8, 8, true);

  // espaço do formato (preenchido depois, com a máscara escolhida)
  for (let i = 0; i < 9; i++) {
    if (!m.reservado[8][i]) pintar(m, 8, i, false);
    if (!m.reservado[i][8]) pintar(m, i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!m.reservado[8][lado - 1 - i]) pintar(m, 8, lado - 1 - i, false);
    if (!m.reservado[lado - 1 - i][8]) pintar(m, lado - 1 - i, 8, false);
  }

  // versão (só a partir da 7)
  if (versao >= 7) {
    let resto = versao;
    for (let i = 0; i < 12; i++) resto = (resto << 1) ^ ((resto >>> 11) * 0x1f25);
    const bits = (versao << 12) | resto;
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + lado - 11;
      pintar(m, b, a, bit);
      pintar(m, a, b, bit);
    }
  }
}

function colocarDados(m: Matriz, codigos: Uint8Array) {
  const lado = m.lado;
  let i = 0;
  let subindo = true;

  for (let parX = lado - 1; parX > 0; parX -= 2) {
    // a coluna 6 é a linha de tempo vertical: pula inteira
    if (parX === 6) parX--;

    for (let passo = 0; passo < lado; passo++) {
      const y = subindo ? lado - 1 - passo : passo;
      for (const x of [parX, parX - 1]) {
        if (m.reservado[y][x]) continue;
        const bit = i < codigos.length * 8
          ? ((codigos[i >>> 3] >>> (7 - (i & 7))) & 1) === 1
          : false;
        m.celulas[y][x] = bit;
        i++;
      }
    }
    subindo = !subindo;
  }
}

const MASCARAS: ((y: number, x: number) => boolean)[] = [
  (y, x) => (y + x) % 2 === 0,
  (y) => y % 2 === 0,
  (_y, x) => x % 3 === 0,
  (y, x) => (y + x) % 3 === 0,
  (y, x) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (y, x) => ((y * x) % 2) + ((y * x) % 3) === 0,
  (y, x) => (((y * x) % 2) + ((y * x) % 3)) % 2 === 0,
  (y, x) => (((y + x) % 2) + ((y * x) % 3)) % 2 === 0,
];

function aplicarMascara(m: Matriz, mascara: number) {
  const teste = MASCARAS[mascara];
  for (let y = 0; y < m.lado; y++) {
    for (let x = 0; x < m.lado; x++) {
      if (!m.reservado[y][x] && teste(y, x)) m.celulas[y][x] = !m.celulas[y][x];
    }
  }
}

function escreverFormato(m: Matriz, nivel: NivelCorrecao, mascara: number) {
  const dados = (BITS_NIVEL[nivel] << 3) | mascara;
  let resto = dados;
  for (let i = 0; i < 10; i++) resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
  const bits = ((dados << 10) | resto) ^ 0x5412;

  const lado = m.lado;

  /*
    ⚠️ A ORDEM AQUI É DO BIT MAIS SIGNIFICATIVO PRO MENOS.

    `i = 0` é o bit 14 (o mais à esquerda da cadeia de 15), e ele vai em
    (8,0). Escrever ao contrário — `bits >>> i`, que é o reflexo natural —
    grava a cadeia espelhada: o QR sai com desenho perfeito, tamanho
    certo, localizadores no lugar, e **nenhum leitor abre**, porque o
    campo que diz qual máscara foi usada está invertido.
  */
  const bitDoFormato = (i: number) => ((bits >>> (14 - i)) & 1) === 1;

  for (let i = 0; i < 15; i++) {
    const bit = bitDoFormato(i);

    // cópia em L, em volta do localizador superior esquerdo
    if (i < 6) m.celulas[8][i] = bit;
    else if (i === 6) m.celulas[8][7] = bit;
    else if (i === 7) m.celulas[8][8] = bit;
    else if (i === 8) m.celulas[7][8] = bit;
    else m.celulas[14 - i][8] = bit;

    // cópia partida, embaixo e à direita
    if (i < 7) m.celulas[lado - 1 - i][8] = bit;
    else m.celulas[8][lado - 15 + i] = bit;
  }
}

/**
 * Nota de penalidade da norma. Quanto menor, melhor o QR se lê.
 *
 * As quatro regras existem por motivos físicos: sequências longas confundem
 * o alinhamento, blocos 2x2 viram borrão, o padrão 1:1:3:1:1 imita um
 * localizador e engana o leitor, e escuridão demais ou de menos estraga o
 * contraste.
 */
function penalidade(m: Matriz): number {
  const lado = m.lado;
  let nota = 0;

  // regra 1 — sequências de 5 ou mais
  for (let i = 0; i < lado; i++) {
    for (const pegar of [
      (j: number) => m.celulas[i][j],
      (j: number) => m.celulas[j][i],
    ]) {
      let corrida = 1;
      for (let j = 1; j < lado; j++) {
        if (pegar(j) === pegar(j - 1)) {
          corrida++;
          if (corrida === 5) nota += 3;
          else if (corrida > 5) nota += 1;
        } else corrida = 1;
      }
    }
  }

  // regra 2 — blocos 2x2 da mesma cor
  for (let y = 0; y < lado - 1; y++) {
    for (let x = 0; x < lado - 1; x++) {
      const c = m.celulas[y][x];
      if (c === m.celulas[y][x + 1] && c === m.celulas[y + 1][x] && c === m.celulas[y + 1][x + 1]) {
        nota += 3;
      }
    }
  }

  // regra 3 — o padrão que imita um localizador
  const alvo = [true, false, true, true, true, false, true];
  const claros = [false, false, false, false];
  const combina = (pegar: (j: number) => boolean, j: number, seq: boolean[]) =>
    seq.every((v, k) => pegar(j + k) === v);

  for (let i = 0; i < lado; i++) {
    for (const pegar of [
      (j: number) => m.celulas[i][j],
      (j: number) => m.celulas[j][i],
    ]) {
      for (let j = 0; j + 10 < lado; j++) {
        if (combina(pegar, j, alvo) && combina(pegar, j + 7, claros)) nota += 40;
        if (combina(pegar, j, claros) && combina(pegar, j + 4, alvo)) nota += 40;
      }
    }
  }

  // regra 4 — proporção de escuro longe da metade
  let escuros = 0;
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) if (m.celulas[y][x]) escuros++;
  }
  const porcento = (escuros * 100) / (lado * lado);
  nota += Math.floor(Math.abs(porcento - 50) / 5) * 10;

  return nota;
}

export type OpcoesQr = {
  nivel?: NivelCorrecao;
  /** Fixa a versão. Sem isto, usa a menor que couber. */
  versao?: number;
  /** Fixa a máscara (0..7). Sem isto, escolhe a de menor penalidade. */
  mascara?: number;
};

/**
 * Gera a matriz do QR. `true` = módulo escuro.
 *
 * Sem margem: quem desenha decide a borda. A norma pede 4 módulos de
 * silêncio em volta, e tanto o SVG quanto o PNG deste projeto colocam.
 */
export function gerarMatriz(texto: string, opcoes: OpcoesQr = {}): boolean[][] {
  const nivel = opcoes.nivel ?? "M";
  const dados = new TextEncoder().encode(texto);
  const versao = opcoes.versao ?? menorVersao(dados.length, nivel);

  if (dados.length > capacidade(versao, nivel)) {
    throw new Error(
      `QR: ${dados.length} bytes não cabem na versão ${versao} nível ${nivel}`,
    );
  }

  const codigos = codificar(dados, versao, nivel);
  const lado = 17 + versao * 4;

  const construir = (mascara: number) => {
    const m = matrizVazia(lado);
    desenharFuncoes(m, versao);
    colocarDados(m, codigos);
    aplicarMascara(m, mascara);
    escreverFormato(m, nivel, mascara);
    return m;
  };

  if (opcoes.mascara !== undefined) return construir(opcoes.mascara).celulas;

  let melhor = construir(0);
  let melhorNota = penalidade(melhor);
  for (let mascara = 1; mascara < 8; mascara++) {
    const tentativa = construir(mascara);
    const nota = penalidade(tentativa);
    if (nota < melhorNota) {
      melhor = tentativa;
      melhorNota = nota;
    }
  }
  return melhor.celulas;
}

/**
 * O QR como SVG, pronto pra jogar dentro de um `dangerouslySetInnerHTML`
 * ou pra virar um data URI.
 *
 * Um `<path>` só, com um `M x y h w v h h -w z` por módulo escuro. Fica
 * muito menor que um `<rect>` por módulo (o QR do PIX tem ~600 módulos
 * escuros) e o navegador desenha de uma vez.
 */
export function qrParaSvg(
  texto: string,
  opcoes: OpcoesQr & { margem?: number; escuro?: string; claro?: string } = {},
): string {
  const matriz = gerarMatriz(texto, opcoes);
  const margem = opcoes.margem ?? 4;
  const lado = matriz.length + margem * 2;

  let caminho = "";
  for (let y = 0; y < matriz.length; y++) {
    for (let x = 0; x < matriz.length; x++) {
      if (matriz[y][x]) caminho += `M${x + margem} ${y + margem}h1v1h-1z`;
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges">`,
    `<rect width="${lado}" height="${lado}" fill="${opcoes.claro ?? "#ffffff"}"/>`,
    `<path d="${caminho}" fill="${opcoes.escuro ?? "#000000"}"/>`,
    `</svg>`,
  ].join("");
}
