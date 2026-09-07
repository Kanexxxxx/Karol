"""
Regerar as fotos publicadas com mais qualidade, SEM mudar o enquadramento.

---------------------------------------------------------------------
O problema
---------------------------------------------------------------------

`fotos2.py` gerou o acervo com `largura=780` e `quality=82`. Nos números:

- 780 px de largura num celular moderno (3x de densidade) é METADE da
  resolução que a tela pede numa foto de largura total. O navegador
  amplia, e ampliação é o que deixa pele com aspecto de plástico.
- `quality=82` num assunto que é PELE E SOBRANCELHA come justamente o
  detalhe fino que é o produto dela.

E as duas fotos mais visíveis do site eram as piores do acervo: os
retratos de capa saíram com 56 e 65 KB por megapixel, contra ~160 da
média das outras.

---------------------------------------------------------------------
Por que não é só reencodar o que está publicado
---------------------------------------------------------------------

Perda de JPEG não volta. Salvar de novo com qualidade maior só produz um
arquivo maior com os mesmos defeitos. O detalhe só existe no ORIGINAL.

Só que rodar `fotos2.py` de novo não serve: o script está defasado em
relação ao que está no ar (`trab-21` a `trab-24` e a capa laranja não
estão nele), e rodá-lo trocaria fotos de lugar no site.

---------------------------------------------------------------------
O que este script faz
---------------------------------------------------------------------

Para cada foto publicada:

 1. Descobre de qual original ela veio, comparando miniaturas.
 2. Descobre QUAL RECORTE foi usado, testando os focos possíveis e
    ficando com o que mais se parece com a foto publicada.
 3. Regera a partir do original, com o mesmo recorte, mais larga e com
    menos compressão.

O enquadramento sai idêntico. O que muda é só a quantidade de informação.

⚠️ NUNCA AMPLIA. Se o original for menor que o alvo, sai no tamanho do
original. Ampliar inventa detalhe, e é a ampliação que dá cara de IA —
é a mesma regra do `fotos2.py`, e ela não muda.

⚠️ Os originais das alunas JÁ ESTÃO ANONIMIZADOS (commit 393fbbf): a
pixelização foi gravada NO PRÓPRIO ORIGINAL, não só na versão publicada.
Por isso regerar não traz nome nenhum de volta.

Isto NÃO é conferido automaticamente aqui. Se um dia entrarem originais
novos, rode `anonimizar.py --originais` ANTES deste script — a ordem
importa, e ao contrário publica nome de aluna em site público.

Uso:
    python ferramentas/requalificar.py --conferir   # só mostra o plano
    python ferramentas/requalificar.py              # grava
"""

import os
import sys

from PIL import Image, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGINAIS = os.path.join(RAIZ, "ferramentas", "originais")
PUBLICADAS = os.path.join(RAIZ, "public", "fotos")

# A qualidade nova. 82 -> 90 é onde o ganho ainda é visível em pele sem o
# arquivo dobrar de tamanho; acima de 92 o JPEG cresce muito e devolve
# quase nada aos olhos.
QUALIDADE = 90

# Teto de largura. Os originais chegam a 2000 px; 1400 cobre um celular
# 3x numa foto de largura total e ainda dá margem pro Next/Image cortar as
# versões menores do `srcset`.
LARGURA_ALVO = 1400

# A capa é a única que ocupa a tela inteira num computador.
LARGURA_CAPA = 1700

# Fotos que NAO levam recorte de proporcao.
#
# ⚠️ A capa e uma delas, e descobrir isso custou uma foto errada. A razao
# dela (0.8197) fica a 0.0197 de 4:5, dentro da tolerancia de
# `proporcao_de` — entao o script recortou pra 4:5 exato e comeu 2,4% da
# altura. Numa foto de corpo inteiro em que o pe dela ja encosta na borda,
# 2,4% e o pe.
#
# `fotos2.py` gerava a capa sem proporcao nenhuma: a razao de saida e a do
# original. Esta lista devolve esse comportamento.
SEM_RECORTE = ("karol-capa",)

# Fotos que este script NAO PODE TOCAR.
#
# ⚠️ As seis fotos de aluna vem de originais que estao ANONIMIZADOS em
# `ferramentas/originais/` — o mosaico sobre o certificado esta gravado no
# arquivo de arquivo morto, de proposito.
#
# Rodar este script sobre elas puxa o mosaico de volta pra dentro do site,
# e foi exatamente isso que aconteceu em 07/09/2026: o acervo inteiro foi
# regerado e as alunas voltaram com uma tarja cinza cobrindo um terco da
# foto. O Kaina viu no site e reclamou.
#
# As versoes publicadas hoje vieram dos originais LIMPOS, recuperados do
# commit `fa55dfa` (anterior a anonimizacao), com autorizacao dele em
# 07/09/2026. Elas ja estao em 1400 px e nao precisam deste script.
NAO_MEXER = tuple(f"aluna-{i:02d}" for i in range(1, 7))

# Focos que o `fotos2.py` usou. O recorte é procurado entre eles.
FOCOS = [round(0.14 + i * 0.02, 2) for i in range(20)]  # 0.14 .. 0.52


def miniatura(im, lado=48):
    """Assinatura visual: cinza, pequena, sem contraste local."""
    return im.convert("L").resize((lado, lado), Image.LANCZOS)


def distancia(a, b):
    """Diferença média entre duas miniaturas. Zero = iguais."""
    pa, pb = a.load(), b.load()
    total = 0
    for y in range(a.height):
        for x in range(a.width):
            total += abs(pa[x, y] - pb[x, y])
    return total / (a.width * a.height)


def recortar(im, proporcao, foco):
    """O mesmo recorte do `fotos2.py`: centraliza em X, `foco` em Y."""
    alvo = proporcao[0] / proporcao[1]
    L, A = im.size
    if L / A > alvo:
        nova = int(A * alvo)
        e = (L - nova) // 2
        return im.crop((e, 0, e + nova, A))
    nova = int(L / alvo)
    c = max(0, min(int((A - nova) * foco), A - nova))
    return im.crop((0, c, L, c + nova))


def proporcao_de(im):
    """A proporção da foto publicada, arredondada pras que o script usa."""
    r = im.width / im.height
    candidatas = {(3, 4): 0.75, (4, 5): 0.8, (2, 3): 2 / 3, (3, 2): 1.5}
    nome, _ = min(candidatas.items(), key=lambda kv: abs(kv[1] - r))
    # se nenhuma bate de perto, é foto sem recorte de proporção
    return nome if abs(candidatas[nome] - r) < 0.02 else None


def carregar_originais():
    caches = []
    for nome in sorted(os.listdir(ORIGINAIS)):
        if not nome.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        caminho = os.path.join(ORIGINAIS, nome)
        with Image.open(caminho) as im:
            caches.append((nome, im.convert("RGB").copy()))
    return caches


def achar_fonte(pub, originais):
    """
    Devolve (nome do original, proporção, foco) que melhor reproduz `pub`.

    A comparação é sobre miniatura em cinza: ela sobrevive à nitidez, à
    saturação e à compressão que o `fotos2.py` aplicou depois do recorte.
    """
    prop = proporcao_de(pub)
    alvo = miniatura(pub)

    melhor = None
    for nome, orig in originais:
        # sem proporção declarada, compara a imagem inteira
        tentativas = [(None, recortar(orig, prop, f)) for f in FOCOS] if prop else [(None, orig)]
        focos = FOCOS if prop else [None]

        for foco, recorte in zip(focos, [t[1] for t in tentativas]):
            d = distancia(alvo, miniatura(recorte))
            if melhor is None or d < melhor[0]:
                melhor = (d, nome, prop, foco)

    return melhor


def preparar(orig, prop, foco, largura, destino):
    im = orig
    if prop:
        im = recortar(im, prop, foco)
    if im.width > largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    # a mesma máscara de nitidez do fotos2.py: raio curto e limiar alto,
    # que realça o fio da sobrancelha sem marcar o poro da pele
    im = im.filter(ImageFilter.UnsharpMask(radius=1.1, percent=70, threshold=4))
    im.save(destino, "JPEG", quality=QUALIDADE, optimize=True, progressive=True)
    return im


def main():
    conferir = "--conferir" in sys.argv

    originais = carregar_originais()
    print(f"{len(originais)} originais carregados\n")

    publicadas = sorted(
        n for n in os.listdir(PUBLICADAS) if n.lower().endswith(".jpg")
    )

    ganho_total = 0
    for nome in publicadas:
        caminho = os.path.join(PUBLICADAS, nome)
        with Image.open(caminho) as im:
            pub = im.convert("RGB").copy()
        antes_kb = os.path.getsize(caminho) / 1024

        if nome.rsplit(".", 1)[0] in NAO_MEXER:
            print(f"  {nome:<24} PULADO de proposito (ver NAO_MEXER)")
            continue

        d, fonte, prop, foco = achar_fonte(pub, originais)

        if nome.rsplit(".", 1)[0] in SEM_RECORTE:
            prop, foco = None, None

        # distância alta = não achei o original. Melhor não mexer do que
        # trocar a foto de uma cliente por outra parecida.
        if d > 12:
            print(f"  {nome:<24} PULADO (não achei o original, dist={d:.1f})")
            continue

        largura = LARGURA_CAPA if nome.startswith("karol-capa") else LARGURA_ALVO
        largura = min(largura, max(pub.width, largura))

        orig = dict(originais)[fonte]
        alvo_largura = min(largura, orig.width if not prop else recortar(orig, prop, foco).width)

        if alvo_largura <= pub.width:
            print(f"  {nome:<24} já está no máximo do original ({pub.width}px)")
            continue

        rotulo = f"{fonte} prop={prop} foco={foco} dist={d:.1f}"
        if conferir:
            print(f"  {nome:<24} {pub.width}px -> {alvo_largura}px   [{rotulo}]")
            continue

        nova = preparar(orig, prop, foco, alvo_largura, caminho)
        depois_kb = os.path.getsize(caminho) / 1024
        ganho_total += depois_kb - antes_kb
        print(
            f"  {nome:<24} {pub.width}x{pub.height} -> {nova.width}x{nova.height}   "
            f"{antes_kb:5.0f} -> {depois_kb:5.0f} KB   [{rotulo}]"
        )

    if not conferir:
        print(f"\nacervo cresceu {ganho_total/1024:.1f} MB")
        print("ATENCAO: confira as dimensoes declaradas em src/data/fotos.ts.")


if __name__ == "__main__":
    main()
