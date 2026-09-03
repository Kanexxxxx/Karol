"""
Injeta as fotos da Karol nos protótipos.

Uso:  python build.py entrada.tpl.html saida.html

Dois marcadores:

  {{IMG:nome}}    -> vira um data: URI direto no src.
                     Use quando a foto aparece UMA vez na página.

  {{FOTO:nome}}   -> vira  src="<gif transparente>" class="f-nome"
                     e a foto de verdade entra UMA vez só, num bloco de
                     estilo, como background da classe.
                     Use quando a mesma foto se repete (esteira, galeria).

O segundo existe porque data: URI não é cacheado entre tags: cada
{{IMG:}} repetido copia os bytes inteiros de novo no arquivo. A esteira
sozinha estava triplicando o peso da página.

O CSP dos Artifacts bloqueia imagem de host externo, por isso tudo
precisa ser embutido.
"""

import base64
import os
import re
import sys

PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "img")

# gif 1x1 transparente: segura o lugar enquanto o background pinta a foto
VAZIO = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"


def data_uri(nome: str) -> str:
    with open(os.path.join(PASTA, f"{nome}.jpg"), "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("ascii")


def build(entrada: str, saida: str) -> None:
    html = open(entrada, encoding="utf-8").read()

    diretas = set()
    classes = set()

    def troca_img(m):
        nome = m.group(1)
        diretas.add(nome)
        return data_uri(nome)

    def troca_foto(m):
        nome = m.group(1)
        classes.add(nome)
        return f'src="{VAZIO}" class="f-{nome}"'

    html = re.sub(r"\{\{FOTO:([a-z0-9\-]+)\}\}", troca_foto, html)
    html = re.sub(r"\{\{IMG:([a-z0-9\-]+)\}\}", troca_img, html)

    sobrou = re.findall(r"\{\{(?:IMG|FOTO):([a-z0-9\-]+)\}\}", html)
    if sobrou:
        raise SystemExit(f"marcadores nao resolvidos: {sobrou}")

    if classes:
        regras = ["[class^='f-']{background-size:cover;background-position:center;background-repeat:no-repeat}"]
        for nome in sorted(classes):
            regras.append(f".f-{nome}{{background-image:url({data_uri(nome)})}}")
        bloco = "<style>\n" + "\n".join(regras) + "\n</style>\n"
        html = bloco + html

    # declara a codificação no próprio arquivo: sem isso o navegador chuta
    # e os acentos viram lixo na pré-visualização local
    html = '<meta charset="utf-8">\n' + html

    open(saida, "w", encoding="utf-8", newline="\n").write(html)

    kb = os.path.getsize(saida) / 1024
    print(f"{saida} — {kb:.0f} KB — {len(classes)} por classe, {len(diretas)} diretas")


if __name__ == "__main__":
    build(sys.argv[1], sys.argv[2])
