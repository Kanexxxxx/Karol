"""
Apaga os dados pessoais dos certificados nas fotos das alunas.

Cada certificado traz o NOME COMPLETO da aluna escrito à mão, a data do curso
e a assinatura. É dado pessoal de terceiro e o site é público — não pode ir ao
ar, nem ficar versionado.

Como acha o certificado: ele é a maior mancha CLARA e SEM COR da foto (papel
branco). O script monta uma máscara de "quase branco", limpa ruído, pega o
maior componente e usa a caixa dele. Isso é bem mais confiável do que eu chutar
frações de altura olhando miniatura — foi assim que da primeira vez eu borrei
o rosto de uma aluna e deixei dois nomes legíveis.

Como apaga: pixelização destrutiva, não desfoque. A faixa é reduzida a poucos
pixels e reampliada em NEAREST. Desfoque gaussiano pode ser parcialmente
revertido; reduzir a 10 px de largura joga a informação fora de vez.

O que sobra: a parte de cima do certificado (o monograma e a palavra
CERTIFICADO), que é o que dá sentido à foto. Some o nome, a data e as
assinaturas, que ficam sempre na metade de baixo.

Uso:  python ferramentas/anonimizar.py [--originais] [--conferir]

  sem argumento  -> as fotos publicadas em public/fotos
  --originais    -> os originais em alta de ferramentas/originais
  --conferir     -> so mostra as faixas, nao grava
"""

import os
import sys
from PIL import Image, ImageFilter

PASTA = "public/fotos"

# Medida manual, em fração da altura, pra foto onde a detecção falha.
# aluna-05 usa uma regata listrada clara que encosta no papel: o componente
# vira um só e o script (com razão) recusa em vez de chutar.
MANUAL = {
    # regata listrada clara encosta no papel: a detecção junta os dois e recusa
    "aluna-05.jpg": (0.80, 1.00),
    # a detecção mede o papel curto e sobra a assinatura da aluna embaixo
    "aluna-02.jpg": (0.62, 1.00),
}

# Os originais que trazem certificado. Conferidos um a um: as outras 44 fotos
# de ferramentas/originais/ nao tem documento nenhum (a deteccao acusa fundo
# claro e print de reel, que sao falso positivo).
#
# As faixas vão até o rodapé de propósito. Original é arquivo morto, não
# vitrine: não custa nada apagar papel demais, e a assinatura da aluna fica
# sempre abaixo do nome — foi o que quase escapou na primeira passada.
ORIGINAIS = {
    "09.jpg": (0.60, 1.00),
    "44.jpg": (0.68, 1.00),
    "46.jpg": (0.79, 1.00),  # regata listrada clara: a deteccao nao separa
    "47.jpg": (0.44, 0.74),  # duas pessoas em pé, certificado no meio do quadro
    "48.jpg": (0.70, 1.00),
    "49.jpg": (0.74, 1.00),
}

ALVOS = [
    "aluna-01.jpg",
    "aluna-02.jpg",
    "aluna-03.jpg",
    "aluna-04.jpg",
    "aluna-05.jpg",
    "aluna-06.jpg",
    "serv-curso.jpg",
]

# fração da altura do certificado que fica preservada, contada do topo dele.
# 0.30 mantém o monograma e a palavra CERTIFICADO; o nome vem logo abaixo.
PRESERVA_TOPO = 0.30

# largura em pixels a que a faixa é reduzida. 10 px não deixa nem a forma
# das letras.
GRAO = 10

# margem de segurança em volta da caixa detectada, em fração da altura da foto.
FOLGA = 0.02


def caixa_do_certificado(im: Image.Image):
    """
    Bounding box do certificado. None se não achar com confiança.

    Duas restrições evitam o erro que a primeira versão cometeu — grudar no
    fundo claro (cortina, parede) ou na roupa branca da aluna:

    - só procura abaixo de 28% da altura: o papel está sempre na mão, na
      frente do tronco, nunca na altura da testa;
    - descarta componente mais alto que 50% da foto: isso é fundo ou roupa
      clara colada no papel, não o papel sozinho.
    """
    P = 200  # trabalha pequeno: é máscara, não precisa de resolução
    pequena = im.resize((P, round(im.height * P / im.width)), Image.BILINEAR)
    px = pequena.load()
    L, A = pequena.size
    PISO = int(A * 0.28)

    marcados = [[False] * L for _ in range(A)]
    for y in range(PISO, A):
        for x in range(L):
            r, g, b = px[x, y]
            claro = (r + g + b) / 3 > 165
            sem_cor = max(r, g, b) - min(r, g, b) < 42
            marcados[y][x] = claro and sem_cor

    # maior componente conexo, por varredura em largura
    visto = [[False] * L for _ in range(A)]
    melhor, melhor_area = None, 0
    for y0 in range(A):
        for x0 in range(L):
            if not marcados[y0][x0] or visto[y0][x0]:
                continue
            fila = [(x0, y0)]
            visto[y0][x0] = True
            xmin = xmax = x0
            ymin = ymax = y0
            area = 0
            while fila:
                x, y = fila.pop()
                area += 1
                xmin, xmax = min(xmin, x), max(xmax, x)
                ymin, ymax = min(ymin, y), max(ymax, y)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < L and 0 <= ny < A and marcados[ny][nx] and not visto[ny][nx]:
                        visto[ny][nx] = True
                        fila.append((nx, ny))
            alto_demais = (ymax - ymin) > A * 0.50
            if area > melhor_area and not alto_demais:
                melhor_area, melhor = area, (xmin, ymin, xmax, ymax)

    # menos de 4% da foto não é um certificado na mão de alguém
    if melhor is None or melhor_area < L * A * 0.04:
        return None

    e = im.width / L
    x0, y0, x1, y1 = melhor
    return (x0 * e, y0 * e, (x1 + 1) * e, (y1 + 1) * e)


def apagar(im: Image.Image, y0: int, y1: int) -> Image.Image:
    L = im.width
    y0 = max(0, y0)
    y1 = min(im.height, y1)
    if y1 <= y0:
        return im
    faixa = im.crop((0, y0, L, y1))
    altura = max(1, round(faixa.height * GRAO / faixa.width))
    faixa = faixa.resize((GRAO, altura), Image.BOX).resize(faixa.size, Image.NEAREST)
    faixa = faixa.filter(ImageFilter.GaussianBlur(radius=6))
    im.paste(faixa, (0, y0))
    return im


def processar(arquivo: str, conferir: bool, pasta: str = PASTA, manual=None) -> None:
    caminho = os.path.join(pasta, arquivo)
    if not os.path.exists(caminho):
        print(f"{arquivo:18} NAO ENCONTRADO")
        return

    im = Image.open(caminho).convert("RGB")

    medida = manual if manual is not None else MANUAL.get(arquivo)
    if medida:
        topo, base = medida
        inicio, fim = int(im.height * topo), int(im.height * base)
        origem = "manual"
    else:
        caixa = caixa_do_certificado(im)
        if caixa is None:
            print(f"{arquivo:18} certificado NAO detectado — medir a mao e por em MANUAL")
            return
        _, cy0, _, cy1 = caixa
        inicio = int(cy0 + (cy1 - cy0) * PRESERVA_TOPO)
        fim = int(cy1 + im.height * FOLGA)
        origem = "detectado"

    if conferir:
        pct = lambda v: f"{v / im.height:.0%}"
        print(f"{arquivo:18} {origem:10} apaga {pct(inicio)}–{pct(min(fim, im.height))}")
        return

    im = apagar(im, inicio, fim)
    im.save(caminho, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"{arquivo:18} apagado de {inicio / im.height:.0%} até {min(fim, im.height) / im.height:.0%}")


if __name__ == "__main__":
    conferir = "--conferir" in sys.argv

    if "--originais" in sys.argv:
        # Os originais em alta ficam versionados pra sobreviver à formatação da
        # máquina. Só podem entrar no Git depois de passar por aqui.
        for arquivo, medida in ORIGINAIS.items():
            processar(arquivo, conferir, "ferramentas/originais", medida)
    else:
        for arquivo in ALVOS:
            processar(arquivo, conferir)

    print("\npronto")
