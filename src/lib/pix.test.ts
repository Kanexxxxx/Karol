import { describe, expect, it } from "vitest";

import { brCodeDoSinal, crc16, montarBrCode, normalizarChave } from "./pix";
import { REGRAS } from "@/data/negocio";

/**
 * O BR Code do PIX.
 *
 * Este arquivo guarda dinheiro. Um campo com o tamanho errado faz o app do
 * banco recusar o código; um valor mal formatado faz a cliente pagar outra
 * coisa. Por isso quase todo teste aqui **desmonta** a string de volta em
 * campos, em vez de comparar com um texto que eu mesmo escrevi.
 *
 * Conferência externa já feita (09/09/2026): os códigos gerados aqui foram
 * desenhados como QR e lidos de volta por um decodificador independente
 * (OpenCV), byte por byte, e o CRC foi recalculado por uma implementação
 * separada em Python. Ver `src/lib/qr.test.ts` pro lado do desenho.
 */

/**
 * Desmonta `ID + tamanho + valor` de volta em pares, NA ORDEM.
 *
 * ⚠️ A ordem importa e por isso isto devolve uma lista, e não um objeto.
 * Os IDs do BR Code são "00", "26", "52"... e o JavaScript reordena chaves
 * que parecem número inteiro: num objeto, "26" e "52" pulam pra frente e
 * "00" cai pro fim. O teste de remontagem passava a impressão de que o
 * código estava fora de ordem quando o errado era o desmonte.
 */
function pares(codigo: string): [string, string][] {
  const saida: [string, string][] = [];
  let i = 0;
  while (i < codigo.length) {
    const id = codigo.slice(i, i + 2);
    const tamanho = Number(codigo.slice(i + 2, i + 4));
    saida.push([id, codigo.slice(i + 4, i + 4 + tamanho)]);
    i += 4 + tamanho;
  }
  return saida;
}

/** O mesmo, indexado por ID, pra quando a ordem não importa. */
function desmontar(codigo: string): Record<string, string> {
  return Object.fromEntries(pares(codigo));
}

describe("CRC16", () => {
  it("bate com o valor de conferência publicado do CCITT-FALSE", () => {
    // "123456789" → 0x29B1 é o vetor de teste canônico deste CRC, o mesmo
    // que qualquer implementação do mundo publica. Se esta linha passa, o
    // polinômio, o valor inicial e a ausência de inversão estão certos.
    expect(crc16("123456789")).toBe("29B1");
  });

  it("sempre devolve quatro dígitos hexadecimais maiúsculos", () => {
    // Um CRC que desse "1D3D" em um caso e "d3d" em outro geraria um
    // código de tamanho errado — e o erro só apareceria no app da cliente.
    for (const t of ["", "a", "PIX", "x".repeat(500)]) {
      expect(crc16(t)).toMatch(/^[0-9A-F]{4}$/);
    }
  });
});

describe("a chave", () => {
  it("põe +55 no telefone, que é o caso da Karol", () => {
    // Ela escreveu "18997525291" no formulário. Mandar assim gera um código
    // que o banco não reconhece como chave nenhuma.
    expect(normalizarChave("18997525291", "Telefone")).toBe("+5518997525291");
    expect(normalizarChave("(18) 99752-5291", "Telefone")).toBe("+5518997525291");
  });

  it("não duplica o 55 de quem já digitou com o país", () => {
    expect(normalizarChave("5518997525291", "Telefone")).toBe("+5518997525291");
  });

  it("deixa CPF só com dígitos e e-mail em minúsculas", () => {
    expect(normalizarChave("123.456.789-00", "CPF")).toBe("12345678900");
    expect(normalizarChave("Karol@Email.COM", "E-mail")).toBe("karol@email.com");
  });

  it("não mexe na chave aleatória", () => {
    const aleatoria = "123e4567-e89b-12d3-a456-426614174000";
    expect(normalizarChave(aleatoria, "Aleatória")).toBe(aleatoria);
  });
});

describe("o BR Code", () => {
  const codigo = brCodeDoSinal(4000, "AG7K2M");
  const campos = desmontar(codigo);

  it("fecha com o CRC do próprio conteúdo", () => {
    expect(codigo.slice(-8, -4)).toBe("6304");
    expect(crc16(codigo.slice(0, -4))).toBe(codigo.slice(-4));
  });

  it("leva o valor DENTRO do código, que é a resposta à pergunta do Kainã", () => {
    // Campo 54 = valor da transação. É ele que faz o app abrir com
    // "R$ 40,00" já preenchido, em vez de a cliente digitar.
    expect(campos["54"]).toBe("40.00");
  });

  it("escreve o valor com ponto e duas casas, sempre", () => {
    // "40,00" ou "40" fazem parte dos bancos recusar o código.
    expect(desmontar(brCodeDoSinal(12750))["54"]).toBe("127.50");
    expect(desmontar(brCodeDoSinal(8000))["54"]).toBe("80.00");
    expect(desmontar(brCodeDoSinal(1))["54"]).toBe("0.01");
  });

  it("omite o campo do valor quando não há valor", () => {
    // Um QR sem o 54 abre pedindo pra pessoa digitar — certo pra "me manda
    // quanto quiser", errado pro sinal.
    expect(desmontar(brCodeDoSinal(0))["54"]).toBeUndefined();
  });

  it("aponta pra chave e pro domínio do PIX", () => {
    const conta = desmontar(campos["26"]);
    expect(conta["00"]).toBe("br.gov.bcb.pix");
    expect(conta["01"]).toBe("+5518997525291");
  });

  it("usa a chave que está em negocio.ts, e não uma cópia", () => {
    // Já houve uma versão deste projeto em que `chavePix` acabou `null`
    // por causa de chave duplicada no objeto. Se isso voltar, o código
    // gerado deixa de bater com a fonte e este teste cai.
    const conta = desmontar(campos["26"]);
    expect(conta["01"]).toContain(REGRAS.sinal.chavePix.replace(/\D/g, ""));
  });

  it("declara real, Brasil e o favorecido", () => {
    expect(campos["53"]).toBe("986");
    expect(campos["58"]).toBe("BR");
    expect(campos["59"]).toBe("Karolaine Carvalho");
    expect(campos["60"]).toBe("PEREIRA BARRETO");
  });

  it("carrega o identificador da cobrança", () => {
    expect(desmontar(campos["62"])["05"]).toBe("AG7K2M");
  });

  it("usa *** quando não há identificador", () => {
    expect(desmontar(desmontar(brCodeDoSinal(4000))["62"])["05"]).toBe("***");
  });
});

describe("o que estraga um BR Code", () => {
  it("tira acento e cedilha do nome e da cidade", () => {
    // A norma pede ASCII. Alguns apps mostram lixo, outros recusam.
    const campos = desmontar(
      montarBrCode({
        chave: "18997525291",
        tipoChave: "Telefone",
        favorecido: "Karolaine Conceição",
        cidade: "SÃO PAULO",
        valorCentavos: 8000,
      }),
    );
    expect(campos["59"]).toBe("Karolaine Conceicao");
    expect(campos["60"]).toBe("SAO PAULO");
  });

  it("corta nome em 25 e cidade em 15", () => {
    const campos = desmontar(
      montarBrCode({
        chave: "18997525291",
        tipoChave: "Telefone",
        favorecido: "Karolaine Carvalho Nunes de Souza Pereira",
        cidade: "Bandeirantes D'Oeste do Norte",
        valorCentavos: 8000,
      }),
    );
    expect(campos["59"].length).toBe(25);
    expect(campos["60"].length).toBe(15);
  });

  it("limpa o identificador, que só aceita letra e número", () => {
    // Um traço ou um espaço aqui faz vários bancos recusarem tudo.
    const campos = desmontar(
      montarBrCode({
        chave: "18997525291",
        tipoChave: "Telefone",
        favorecido: "Karol",
        cidade: "PEREIRA BARRETO",
        identificador: "AG-7K 2M/çã",
      }),
    );
    expect(desmontar(campos["62"])["05"]).toBe("AG7K2M");
  });

  it("continua um código válido mesmo com emoji no nome", () => {
    const codigo = montarBrCode({
      chave: "18997525291",
      tipoChave: "Telefone",
      favorecido: "Karol ✨💛",
      cidade: "PEREIRA BARRETO",
      valorCentavos: 4000,
    });
    // se o emoji tivesse passado, o tamanho declarado no campo não bateria
    // com o número de caracteres e o desmonte sairia do lugar
    expect(crc16(codigo.slice(0, -4))).toBe(codigo.slice(-4));
    expect(desmontar(codigo)["59"]).toBe("Karol");
  });

  it("todo campo declara o tamanho certo do próprio conteúdo", () => {
    // O desmonte só chega ao fim se cada tamanho estiver correto; se um
    // estiver errado, a leitura sai de sincronia e sobra lixo no fim.
    for (const centavos of [0, 1, 4000, 12750, 999999]) {
      const codigo = brCodeDoSinal(centavos, "TESTE");
      const remontado = pares(codigo)
        .map(([id, v]) => id + String(v.length).padStart(2, "0") + v)
        .join("");
      expect(remontado).toBe(codigo);
    }
  });
});
