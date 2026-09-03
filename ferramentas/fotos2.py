"""
Seleção e preparo das fotos do site, a partir da varredura completa do
Instagram (feita com a conta logada, 50 imagens em resolução original).

Regra que não muda: só REDUZ, nunca amplia. Reduzir preserva detalhe;
ampliar inventa, e é a ampliação que deixa cara de IA.

Cada serviço recebe uma cliente diferente. A galeria e as alunas não
repetem ninguém.
"""

import os
from PIL import Image, ImageEnhance, ImageFilter

ORIG = "hd/lote"
SAIDA = "img2"

os.makedirs(SAIDA, exist_ok=True)


def preparar(arquivo, nome, largura, proporcao=None, foco=0.5, nitidez=1.0, saturacao=1.0):
    im = Image.open(os.path.join(ORIG, arquivo)).convert("RGB")

    if proporcao:
        alvo = proporcao[0] / proporcao[1]
        L, A = im.size
        if L / A > alvo:
            nova = int(A * alvo)
            e = (L - nova) // 2
            im = im.crop((e, 0, e + nova, A))
        else:
            nova = int(L / alvo)
            c = max(0, min(int((A - nova) * foco), A - nova))
            im = im.crop((0, c, L, c + nova))

    if im.width > largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)

    if saturacao != 1.0:
        im = ImageEnhance.Color(im).enhance(saturacao)
    if nitidez > 0:
        im = im.filter(ImageFilter.UnsharpMask(radius=1.1, percent=int(78 * nitidez), threshold=4))

    destino = os.path.join(SAIDA, f"{nome}.jpg")
    im.save(destino, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"{nome:22} {im.width}x{im.height}  {os.path.getsize(destino)/1024:5.0f} KB")


# ---------- retrato dela ----------
preparar("31.jpg", "karol-capa", 1200, nitidez=0.9)
preparar("12.jpg", "karol-retrato", 780, proporcao=(4, 5), foco=0.30)

# ---------- antes e depois / processo ----------
preparar("01.jpg", "antes-depois", 860, nitidez=1.1)
preparar("04.jpg", "processo", 780, proporcao=(3, 4), foco=0.30, nitidez=1.1)
preparar("19.jpg", "processo-2", 780, proporcao=(3, 4), foco=0.30, nitidez=1.1)
preparar("40.jpg", "processo-3", 780, proporcao=(3, 4), foco=0.25, nitidez=1.1)

# ---------- um serviço, uma cliente ----------
preparar("16.jpg", "serv-design", 780, proporcao=(3, 4), foco=0.35)
preparar("03.jpg", "serv-henna", 780, proporcao=(3, 4), foco=0.32)
preparar("08.jpg", "serv-masculino", 780, proporcao=(3, 4), foco=0.30)
preparar("17.jpg", "serv-lamination", 780, proporcao=(3, 4), foco=0.32)
preparar("05.jpg", "serv-maquiagem", 780, proporcao=(3, 4), foco=0.30)
preparar("47.jpg", "serv-curso", 780, proporcao=(3, 4), foco=0.20)

# ---------- galeria: clientes diferentes ----------
GALERIA = [
    ("14.jpg", 0.34), ("18.jpg", 0.34), ("24.jpg", 0.30), ("25.jpg", 0.32),
    ("26.jpg", 0.32), ("27.jpg", 0.30), ("32.jpg", 0.30), ("34.jpg", 0.30),
    ("35.jpg", 0.30), ("37.jpg", 0.28), ("42.jpg", 0.34), ("45.jpg", 0.30),
    ("20.jpg", 0.32), ("21.jpg", 0.28), ("28.jpg", 0.32), ("39.jpg", 0.28),
    ("02.jpg", 0.28), ("30.jpg", 0.28), ("33.jpg", 0.28), ("15.jpg", 0.30),
]
for i, (arq, foco) in enumerate(GALERIA, start=1):
    preparar(arq, f"trab-{i:02d}", 780, proporcao=(3, 4), foco=foco)

# ---------- alunas: seis pessoas diferentes ----------
ALUNAS = [
    ("47.jpg", 0.20), ("09.jpg", 0.18), ("48.jpg", 0.18),
    ("44.jpg", 0.20), ("46.jpg", 0.20), ("49.jpg", 0.20),
]
for i, (arq, foco) in enumerate(ALUNAS, start=1):
    preparar(arq, f"aluna-{i:02d}", 780, proporcao=(3, 4), foco=foco)

print("\npronto")
