/**
 * PIX — o "copia e cola" e o QR, com o valor já dentro.
 *
 * ---------------------------------------------------------------------
 * Respondendo a pergunta do Kainã
 * ---------------------------------------------------------------------
 *
 * Ele perguntou: "só gera um QR code do PIX dela né, que é o telefone. Eu
 * acho que não dá pra fazer um QR code do PIX com o valor definido já né?"
 *
 * Dá. É o **BR Code**, o formato que o Banco Central publicou pro PIX
 * (Manual de Padrões para Iniciação do PIX), que por baixo é o EMV®QRCPS
 * — o mesmo padrão de QR de pagamento usado no mundo inteiro. O valor é o
 * campo 54. Quando ele está presente, o app do banco abre já com o valor
 * preenchido e a cliente não consegue digitar errado.
 *
 * Isso muda o fluxo do sinal de verdade. Sem valor, a cliente tem que ler
 * "R$ 40,00" numa mensagem e digitar no app — e é aí que entra o erro de
 * R$ 4,00, o de R$ 400,00, e a conversa de conferir comprovante. Com
 * valor, ela escaneia (ou cola) e confirma.
 *
 * ---------------------------------------------------------------------
 * O formato, em uma frase
 * ---------------------------------------------------------------------
 *
 * Uma sequência de campos `ID + tamanho em 2 dígitos + valor`, alguns
 * deles com campos dentro. O último é sempre o CRC16 dos bytes anteriores.
 *
 *   00 02 01                          formato do payload
 *   26 ..                             conta do recebedor
 *      00 14 br.gov.bcb.pix           domínio fixo do PIX
 *      01 ..  <chave>
 *   52 04 0000                        categoria do comerciante (nenhuma)
 *   53 03 986                         moeda: 986 = real
 *   54 ..  <valor>                    ⟵ é este que responde a pergunta
 *   58 02 BR                          país
 *   59 ..  <nome do recebedor>        até 25
 *   60 ..  <cidade>                   até 15
 *   62 ..                             dados adicionais
 *      05 ..  <identificador>         "***" quando não há
 *   63 04 <CRC16>
 *
 * ---------------------------------------------------------------------
 * ⚠️ Cuidado com o que entra aqui
 * ---------------------------------------------------------------------
 *
 * Nome e cidade vão SEM ACENTO e SEM CEDILHA. A norma manda ASCII, e os
 * apps de banco brasileiros divergem no que aceitam: alguns mostram o
 * acento errado, outros recusam o código inteiro. "Karolaine Carvalho"
 * não tem acento, mas o normalizador está aqui porque o dado vem de
 * `data/negocio.ts` e um dia pode virar outro nome.
 */

import { REGRAS } from "@/data/negocio";

/**
 * CRC16/CCITT-FALSE — polinômio 0x1021, valor inicial 0xFFFF, sem
 * inversão. É o que o manual do BC especifica, e é o campo que faz o app
 * do banco recusar o código na cara da cliente se estiver errado por um
 * bit.
 */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** `ID + tamanho em dois dígitos + conteúdo`. */
function campo(id: string, valor: string): string {
  return id + String(valor.length).padStart(2, "0") + valor;
}

/**
 * Tira acento, cedilha e qualquer coisa fora do ASCII imprimível, e corta
 * no tamanho máximo do campo.
 *
 * Cortar em silêncio é aceitável aqui e em quase nenhum outro lugar deste
 * projeto: nome e cidade são rótulos que o app mostra, não são o
 * pagamento. Um nome cortado ainda paga certo; um código recusado por
 * exceder o tamanho não paga nada.
 */
function ascii(texto: string, maximo: number): string {
  return texto
    .normalize("NFD")
    // as marcas de acento que o NFD soltou do caractere de base
    .replace(/[̀-ͯ]/g, "")
    // e tudo que não for ASCII imprimível (ç virou c acima; ✨ some aqui)
    .replace(/[^\x20-\x7e]/g, "")
    .trim()
    .slice(0, maximo);
}

/**
 * A chave, no formato que o BR Code exige.
 *
 * Telefone vai com `+55` na frente e só dígitos depois. A chave dela está
 * guardada como "18997525291" (que é como ela escreveu no formulário), e
 * mandar isso cru gera um código que o banco não reconhece como chave
 * nenhuma.
 */
export function normalizarChave(chave: string, tipo: string): string {
  const limpa = chave.trim();
  const tipoMinusculo = tipo.toLowerCase();

  if (tipoMinusculo.includes("telefone") || tipoMinusculo.includes("celular")) {
    const digitos = limpa.replace(/\D/g, "");
    // já vem com o país? senão, é número brasileiro
    const comPais = digitos.startsWith("55") && digitos.length > 11 ? digitos : `55${digitos}`;
    return `+${comPais}`;
  }

  if (tipoMinusculo.includes("cpf") || tipoMinusculo.includes("cnpj")) {
    return limpa.replace(/\D/g, "");
  }

  // e-mail e chave aleatória vão como estão; e-mail em minúsculas
  return tipoMinusculo.includes("mail") ? limpa.toLowerCase() : limpa;
}

export type DadosPix = {
  chave: string;
  tipoChave: string;
  favorecido: string;
  cidade: string;
  /** Em centavos. `0` ou ausente = QR sem valor, a pessoa digita. */
  valorCentavos?: number;
  /**
   * Identificador da cobrança, até 25 caracteres alfanuméricos. Aparece no
   * extrato dela e é como ela liga o PIX ao agendamento.
   */
  identificador?: string;
};

/**
 * Monta o BR Code — a mesma string que vira o QR e o "copia e cola".
 */
export function montarBrCode(dados: DadosPix): string {
  const chave = normalizarChave(dados.chave, dados.tipoChave);

  const conta = campo("00", "br.gov.bcb.pix") + campo("01", chave);

  /*
    O identificador: letras e números, até 25. Qualquer outra coisa (traço,
    espaço, acento) faz parte dos bancos recusar. "***" é o valor que a
    norma reserva pra "não tem identificador".
  */
  const identificador =
    (dados.identificador ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  const partes = [
    campo("00", "01"),
    campo("26", conta),
    campo("52", "0000"),
    campo("53", "986"),
  ];

  /*
    O VALOR. Ponto como separador decimal, sempre duas casas, sem separador
    de milhar — "40.00", nunca "40,00" nem "R$ 40,00".

    Só entra quando existe. Um QR sem o campo 54 abre no app pedindo pra
    pessoa digitar o valor, que é o comportamento certo pra um "me manda
    quanto quiser" e o errado pro sinal.
  */
  const centavos = Math.round(dados.valorCentavos ?? 0);
  if (centavos > 0) {
    partes.push(campo("54", (centavos / 100).toFixed(2)));
  }

  partes.push(
    campo("58", "BR"),
    campo("59", ascii(dados.favorecido, 25)),
    campo("60", ascii(dados.cidade, 15)),
    campo("62", campo("05", identificador)),
  );

  // O CRC entra por último e cobre tudo que veio antes, incluindo o
  // próprio "6304" — por isso ele é concatenado antes de calcular.
  const semCrc = `${partes.join("")}6304`;
  return semCrc + crc16(semCrc);
}

/**
 * O BR Code do sinal da Karol, pronto.
 *
 * Uma função só pra isto porque o resto do site não deve saber montar
 * PIX: se cada tela montar o seu, um dia uma delas esquece o valor ou usa
 * a chave errada.
 */
export function brCodeDoSinal(valorCentavos: number, identificador?: string): string {
  return montarBrCode({
    chave: REGRAS.sinal.chavePix,
    tipoChave: REGRAS.sinal.tipoChave,
    favorecido: REGRAS.sinal.favorecido,
    // A cidade do recebedor. Vai no código, e é onde ela atende.
    cidade: "PEREIRA BARRETO",
    valorCentavos,
    identificador,
  });
}
