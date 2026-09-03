"""
Prepara as fotos da Karol para o site.

Regra: NADA de ampliação por IA. Todas as imagens saem de originais grandes
(1280 a 3505 px de largura) baixados das páginas dos posts, e só são REDUZIDAS.
Reduzir preserva detalhe; ampliar inventa. É por isso que não sobra rastro artificial.

Cadeia por foto:
  1. recorte de enquadramento (quando precisa)
  2. redução com Lanczos, direto do original para o tamanho final
  3. máscara de nitidez leve, para repor o micro-contraste que a redução come
  4. JPEG progressivo com qualidade alta

O tamanho final é o DOBRO do tamanho em que a foto aparece na tela,
para não ficar borrada em celular retina.
"""

import os
from PIL import Image, ImageEnhance, ImageFilter

ORIG = "hd/raw"
SAIDA = "img"


def preparar(
    arquivo: str,
    nome: str,
    largura: int,
    recorte: tuple | None = None,
    proporcao: tuple | None = None,
    foco: float = 0.5,
    nitidez: float = 1.0,
    contraste: float = 1.0,
    saturacao: float = 1.0,
) -> None:
    im = Image.open(os.path.join(ORIG, arquivo)).convert("RGB")

    if recorte:
        e, c, d, b = recorte
        L, A = im.size
        im = im.crop((int(L * e), int(A * c), int(L * d), int(A * b)))

    # recorte para a proporção pedida, mantendo o ponto de foco vertical
    if proporcao:
        alvo = proporcao[0] / proporcao[1]
        L, A = im.size
        if L / A > alvo:                       # largo demais: corta nas laterais
            nova = int(A * alvo)
            e = (L - nova) // 2
            im = im.crop((e, 0, e + nova, A))
        else:                                   # alto demais: corta em cima/embaixo
            nova = int(L / alvo)
            c = int((A - nova) * foco)
            c = max(0, min(c, A - nova))
            im = im.crop((0, c, L, c + nova))

    if im.width > largura:
        altura = round(im.height * largura / im.width)
        im = im.resize((largura, altura), Image.LANCZOS)

    if contraste != 1.0:
        im = ImageEnhance.Contrast(im).enhance(contraste)
    if saturacao != 1.0:
        im = ImageEnhance.Color(im).enhance(saturacao)

    # máscara de nitidez: raio pequeno, força moderada, limiar alto.
    # o limiar evita realçar ruído em áreas lisas como a pele.
    if nitidez > 0:
        im = im.filter(
            ImageFilter.UnsharpMask(radius=1.1, percent=int(78 * nitidez), threshold=4)
        )

    destino = os.path.join(SAIDA, f"{nome}.jpg")
    im.save(destino, "JPEG", quality=82, optimize=True, progressive=True)
    kb = os.path.getsize(destino) / 1024
    print(f"{nome:20} {im.width}x{im.height}  {kb:6.0f} KB")


os.makedirs(SAIDA, exist_ok=True)

# --- retrato dela: capa e avatar ---
preparar("09.jpg", "karol-capa", 1200, nitidez=0.9)
preparar("08.jpg", "karol-retrato", 780, proporcao=(4, 5), foco=0.10, nitidez=0.9)

# --- antes e depois (o split que ela mesma monta) ---
preparar("01.jpg", "antes-depois", 860, recorte=(0, 0.085, 1, 0.915), nitidez=1.1)

# --- resultados de sobrancelha ---
preparar("03.jpg", "brow-1", 780, proporcao=(3, 4), foco=0.42)
preparar("04.jpg", "brow-2", 780, proporcao=(3, 4), foco=0.42)
preparar("00.jpg", "brow-3", 780, proporcao=(3, 4), foco=0.40)
preparar("02.jpg", "processo", 780, proporcao=(3, 4), foco=0.35, nitidez=1.1)
preparar("05.jpg", "masculino", 780, proporcao=(3, 4), foco=0.30)

# --- maquiagem ---
preparar("06.jpg", "maquiagem-1", 780, proporcao=(3, 4), foco=0.35)
preparar("07.jpg", "maquiagem-2", 780, proporcao=(3, 4), foco=0.35)

# --- curso ---
preparar("11.jpg", "curso-karol", 780, proporcao=(3, 4), foco=0.20)   # ela com a aluna
preparar("10.jpg", "curso-aluna", 780, proporcao=(3, 4), foco=0.18)
preparar("12.jpg", "curso-aluna-2", 780, proporcao=(3, 4), foco=0.18)

print("\npronto")
