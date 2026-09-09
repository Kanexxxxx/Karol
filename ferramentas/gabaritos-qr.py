# -*- coding: utf-8 -*-
"""
Gera os gabaritos do QR Code a partir de um gerador INDEPENDENTE.

Por que isto existe
-------------------

`src/lib/qr.ts` é um codificador de QR escrito à mão neste projeto, porque
o que vai dentro dele é o PIX da Karol com valor — um bit errado é dinheiro
que não entra. Código escrito à mão precisa de uma segunda opinião.

A segunda opinião é o `segno`: uma implementação madura, em Python, que não
tem nada a ver com a nossa. Este script pede a ele a matriz de uma porção de
casos e grava o resultado em `src/lib/qr.gabaritos.json`. O teste
`qr.test.ts` compara a nossa matriz com a dele, módulo por módulo.

Se as duas concordam em todas as versões, todos os níveis e todas as
máscaras, não sobra muito espaço pra estar errado.

Como rodar (só quando mexer no codificador):

    python -m pip install segno
    python ferramentas/gabaritos-qr.py

O JSON entra no git. O `segno` NÃO vira dependência do projeto — ele só é
usado aqui, na hora de gerar o gabarito.
"""

import hashlib
import json
import pathlib

import segno
import segno.consts
import segno.encoder


# ---------------------------------------------------------------------
# ⚠️ CORREÇÃO DE UM DEFEITO DO PRÓPRIO SEGNO (versão 1.6.6)
# ---------------------------------------------------------------------
#
# O `write_padding_bits` dele preenche até a fronteira do codeword assim:
#
#     buff.extend([0] * (8 - (length % 8)))
#
# Quando o fluxo JÁ está alinhado (`length % 8 == 0`), isso escreve
# `8 - 0 = 8` zeros — um codeword inteiro de enchimento que a norma não
# manda escrever. E no modo byte o fluxo está SEMPRE alinhado nesse ponto:
# são 4 bits de modo + 8 (ou 16) de contagem + 8 por caractere + 4 de
# terminador, o que sempre fecha em múltiplo de 8.
#
# Resultado: todo QR de texto que o segno gera carrega um 0x00 a mais e um
# codeword de enchimento a menos. O código continua VÁLIDO e legível — os
# zeros extras caem depois do terminador, onde o leitor já parou —, então
# ninguém percebe. Mas a matriz fica diferente da de um codificador que
# segue a norma à risca, e era exatamente essa diferença que estava
# fazendo os 68 casos deste gabarito falharem.
#
# A norma (ISO/IEC 18004, 7.4.10) diz: "If the bit stream length is such
# that it does NOT end at a codeword boundary, padding bits [...] shall be
# added". Ou seja, alinhado é para não acrescentar nada.
#
# Aqui o comportamento é corrigido antes de gerar o gabarito, para o
# oráculo comparar a norma com a norma. Nada disto vai pro site: é só
# ferramenta de conferência.
def _preenchimento_conforme_a_norma(buff, version, length):
    if version not in (segno.consts.VERSION_M1, segno.consts.VERSION_M3):
        buff.extend([0] * (-length % 8))


segno.encoder.write_padding_bits = _preenchimento_conforme_a_norma

SAIDA = pathlib.Path(__file__).resolve().parent.parent / "src" / "lib" / "qr.gabaritos.json"

# O BR Code de verdade: PIX da Karol, chave telefone, sinal de R$ 40,00 de
# uma maquiagem de R$ 80. É o caso que precisa estar certo.
PIX_REAL = (
    "00020126360014br.gov.bcb.pix0114+551899752529152040000"
    "5303986540540.005802BR5918KAROLAINE CARVALHO6015PEREIRA BARRETO"
    "62070503***6304"
)


def linhas(qr):
    """A matriz do segno como lista de strings de '0' e '1'."""
    return ["".join(str(c) for c in linha) for linha in qr.matrix]


def impressao(m):
    return hashlib.sha256("\n".join(m).encode()).hexdigest()[:32]


def main():
    varredura = []

    # Todas as versões de 1 a 15, em todos os níveis, com máscara fixa.
    # Máscara fixa porque aqui o que está sendo conferido é a TABELA de
    # correção de erro e o desenho da matriz, não a escolha de máscara.
    for versao in range(1, 16):
        for nivel in "lmqh":
            # um texto que enche a versão sem estourar
            capacidade = segno.make(
                "a", version=versao, error=nivel, boost_error=False
            ).symbol_size()
            texto = ("Studio Karol Carvalho " * 40)[: max(1, versao * 2)]
            qr = segno.make(
                texto, version=versao, error=nivel, mask=3, boost_error=False
            )
            varredura.append(
                {
                    "texto": texto,
                    "versao": versao,
                    "nivel": nivel.upper(),
                    "mascara": 3,
                    "impressao": impressao(linhas(qr)),
                    "lado": len(qr.matrix),
                }
            )
            del capacidade

    # Todas as oito máscaras, numa versão que já usa alinhamento e bloco
    # duplo (a 8 no nível M tem dois grupos de blocos de tamanhos
    # diferentes — é onde a intercalação pode dar errado sem aparecer).
    for mascara in range(8):
        qr = segno.make(PIX_REAL, version=8, error="m", mask=mascara, boost_error=False)
        varredura.append(
            {
                "texto": PIX_REAL,
                "versao": 8,
                "nivel": "M",
                "mascara": mascara,
                "impressao": impressao(linhas(qr)),
                "lado": len(qr.matrix),
            }
        )

    # O caso real, inteiro e legível: versão e máscara escolhidas
    # automaticamente pelos dois lados. Se a nossa escolha de máscara
    # divergir da dele, este é o teste que acusa.
    auto = segno.make(PIX_REAL, error="m", boost_error=False)
    real = {
        "texto": PIX_REAL,
        "nivel": "M",
        "versao": auto.version,
        "mascara": auto.mask,
        "matriz": linhas(auto),
    }

    SAIDA.write_text(
        json.dumps(
            {
                "gerador": f"segno {segno.__version__}",
                "varredura": varredura,
                "real": real,
            },
            indent=1,
        ),
        encoding="utf-8",
    )
    print(f"{len(varredura)} casos + o real (versão {auto.version}, máscara {auto.mask})")
    print(f"gravado em {SAIDA}")


if __name__ == "__main__":
    main()
