import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A regra da v2, escrita como teste: **este site não publica o rosto de
 * nenhuma cliente.**
 *
 * ---------------------------------------------------------------------
 * Por que isto é um teste, e não um combinado
 * ---------------------------------------------------------------------
 *
 * A v1 tinha 44 fotos de gente e um comentário no topo do `fotos.ts`
 * avisando que eram rostos de clientes reais e que valia conferir com a
 * Karol uma por uma. O comentário estava certo, ficou lá meses, e nunca
 * impediu nada — comentário não impede.
 *
 * O jeito de uma foto de cliente voltar pro ar não é alguém decidir
 * desfazer a v2. É alguém com pressa, no meio de outra tarefa, jogando um
 * arquivo em `public/fotos/` porque "ficou um buraco na seção". Este
 * teste transforma esse gesto de dez segundos numa conversa: a suíte fica
 * vermelha e alguém tem que responder de quem é aquele rosto.
 *
 * Se um dia a resposta existir de verdade — autorização escrita daquela
 * pessoa, guardada fora do código —, o caminho é acrescentar o arquivo na
 * lista abaixo, com o nome de quem autorizou e quando. Não é apagar o
 * teste.
 */

const RAIZ = join(__dirname, "..", "..");

/**
 * As únicas imagens de gente que podem existir no site.
 *
 * Todas são a KAROL: ela é dona do próprio rosto e do próprio negócio, e
 * é a única pessoa cujo consentimento este projeto tem como garantir.
 */
const PESSOAS_PERMITIDAS = [
  "karol-capa.jpg", // abertura da home (ensaio dela)
  "karol-capa-laranja.jpg", // a mesma escolha, versão que aparece em /sobre
  "karol-paleta.png", // ela se maquiando, faixa da página dela
  "instagram.jpg", // ela com o próprio perfil na mão
];

/** Como se chamavam os arquivos da v1. Serve pra dar erro EXPLICANDO. */
const CHEIRO_DE_V1 = /^(trab|aluna|serv|antes-depois|processo)/;

function arquivosDe(pasta: string): string[] {
  try {
    return readdirSync(pasta).filter((nome) => statSync(join(pasta, nome)).isFile());
  } catch {
    return [];
  }
}

/** Todo `.ts`/`.tsx` de `src/`, menos os próprios testes. */
function fontes(pasta = join(RAIZ, "src"), achados: string[] = []): string[] {
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) fontes(caminho, achados);
    else if (/\.tsx?$/.test(nome) && !nome.includes(".test.")) achados.push(caminho);
  }
  return achados;
}

describe("public/fotos — quem aparece", () => {
  it("só tem foto da Karol", () => {
    const encontrados = arquivosDe(join(RAIZ, "public", "fotos"));
    const intrusos = encontrados.filter((nome) => !PESSOAS_PERMITIDAS.includes(nome));

    expect(
      intrusos,
      "Apareceu foto nova em public/fotos. Se for a Karol, acrescente na lista " +
        "PESSOAS_PERMITIDAS. Se for cliente ou aluna, ela não pode ir pro ar sem " +
        "autorização escrita dessa pessoa — ver o cabeçalho deste arquivo.",
    ).toEqual([]);
  });

  it("nenhum arquivo com cara de galeria da v1 voltou", () => {
    const voltaram = arquivosDe(join(RAIZ, "public", "fotos")).filter((n) => CHEIRO_DE_V1.test(n));

    expect(
      voltaram,
      "Estes nomes são da galeria da v1 (trabalhos, alunas, fotos de serviço). " +
        "Eles ficaram na branch main de propósito.",
    ).toEqual([]);
  });

  it("as texturas são texturas — nenhuma delas é foto de pessoa", () => {
    const texturas = arquivosDe(join(RAIZ, "public", "texturas"));

    /*
      Não dá pra um teste olhar uma imagem e dizer se tem gente nela. O que
      dá é cobrar que a pasta não vire depósito: tudo aqui é gerado, e o
      nome de cada arquivo é o MATERIAL que ele mostra. Nome de pessoa,
      nome de cliente e nome tipo "antes-depois" não entram.

      ⚠️ ACRESCENTAR AQUI É O PEDÁGIO DE ACRESCENTAR TEXTURA, e é barato:
      quem põe um arquivo novo escreve o nome dele nesta lista e, ao
      escrever, responde a pergunta "isso é material ou é gente?".
    */
    const MATERIAIS = [
      "compacto",
      "ferramentas",
      "henna-tigela",
      "linho",
      "papel",
      "pinca",
      "pincel-macro",
      "pinceis",
      "seda-larga",
      "swatches",
      "toalhas",
      "traco-henna",
      "traco-ouro",
    ];

    expect(texturas.length).toBeGreaterThan(0);

    const foraDaLista = texturas.filter(
      (nome) => !MATERIAIS.includes(nome.replace(/\.[a-z]+$/, "")),
    );
    expect(
      foraDaLista,
      "Textura nova em public/texturas. Se for material (pigmento, pincel, " +
        "tecido), acrescente o nome em MATERIAIS. Se tiver pessoa, ela não " +
        "entra — nem gerada por IA, nem foto de verdade.",
    ).toEqual([]);
  });
});

describe("o código não aponta pra foto que não existe mais", () => {
  it("nenhuma fonte cita um arquivo de /fotos/ fora da lista", () => {
    const citacoes: string[] = [];

    for (const caminho of fontes()) {
      const texto = readFileSync(caminho, "utf8");
      for (const [, arquivo] of texto.matchAll(/\/fotos\/([\w.-]+)/g)) {
        if (!PESSOAS_PERMITIDAS.includes(arquivo)) {
          citacoes.push(`${relative(RAIZ, caminho).split(sep).join("/")} → ${arquivo}`);
        }
      }
    }

    expect(citacoes).toEqual([]);
  });

  /*
    ⚠️ ISTO É SOBRE CONSTRUIR MENTIRA, não sobre privacidade.

    A tentação óbvia, com o site sem fotos, é gerar por IA uma sobrancelha
    "antes e depois" e pôr no lugar. Ninguém é fotografado, ninguém é
    exposto — e o site passa a exibir resultado de um atendimento que não
    aconteceu, pra uma pessoa decidir marcar horário.

    Quem pagaria por essa foto é a Karol, na cadeira, com uma cliente que
    chegou esperando aquilo. As texturas existem justamente porque
    pigmento e seda não prometem resultado nenhum.
  */
  it("nenhuma textura é vendida como antes e depois", () => {
    const proibido = /antes[- ]?e[- ]?depois|resultado (do|da) (atendimento|cliente)/i;

    for (const caminho of fontes()) {
      const texto = readFileSync(caminho, "utf8");
      // O `alt` é o que o leitor de tela vai ouvir, e o que o Google lê.
      for (const [, alt] of texto.matchAll(/alt[=:]\s*["'`]([^"'`]{4,})["'`]/g)) {
        expect(alt, `alt em ${relative(RAIZ, caminho)}`).not.toMatch(proibido);
      }
    }
  });
});
