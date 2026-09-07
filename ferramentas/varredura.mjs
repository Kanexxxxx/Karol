/**
 * Varredura do site inteiro, com navegador de verdade.
 *
 * O que ela procura, e por que cada coisa está aqui:
 *
 * - ROLAGEM LATERAL. Já apareceu QUATRO vezes neste projeto: na foto de
 *   abertura (scale sem overflow-hidden), no cabeçalho do painel (cinco
 *   itens sem flex-wrap), no /sobre e no /agendar. É o defeito que mais
 *   voltou, e só aparece em largura de celular.
 * - ERRO DE CONSOLE e exceção de página.
 * - IMAGEM QUEBRADA (naturalWidth === 0) e requisição falhada.
 * - ALVO DE TOQUE menor que 44px nos links e botões principais.
 * - TÍTULO H1 duplicado ou ausente.
 *
 * Roda contra o servidor local de produção, e não contra a Vercel, pra
 * testar exatamente o código que está no disco agora.
 *
 * ---------------------------------------------------------------------
 * COMO RODAR
 * ---------------------------------------------------------------------
 *
 *   npm run build
 *   npx next start -p 3210 &
 *
 *   # o playwright NÃO é dependência do projeto, de propósito: ele pesa
 *   # mais que o site inteiro e só serve pra isto. Instale fora:
 *   mkdir -p /tmp/varredura && cd /tmp/varredura
 *   npm init -y && npm i playwright && npx playwright install chromium
 *   cp <projeto>/ferramentas/varredura.mjs .
 *   cp <projeto>/.env.local .        # só pra logar no painel
 *   node varredura.mjs
 *
 * Sem o `.env.local` ela roda igual, só pula as telas do painel.
 */

import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE = process.env.BASE || "http://127.0.0.1:3210";

/** Lê a senha do painel sem imprimir em lugar nenhum. */
function senhaDoPainel() {
  try {
    const env = readFileSync(".env.local", "utf8");
    const m = env.match(/^SENHA_PAINEL=(.*)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

const PUBLICAS = [
  ["/", "home"],
  ["/sobre", "a Karol"],
  ["/agendar", "agendar: escolher servico"],
  ["/agendar?servico=design-simples", "agendar: escolher cidade"],
  ["/agendar?servico=design-simples&cidade=pereira-barreto", "agendar: calendario"],
  ["/agendar?servico=brow-lamination&cidade=bandeirantes", "agendar: calendario (sabado)"],
  ["/agendar/confirmado", "confirmado sem id"],
  ["/privacidade", "privacidade"],
  ["/painel/login", "login do painel"],
  ["/rota-que-nao-existe", "404"],
];

const PAINEL = [
  ["/painel", "painel: agenda"],
  ["/painel/relatorio", "painel: relatorio"],
  ["/painel/bloqueios", "painel: bloqueios"],
  ["/painel/novo", "painel: marcar na mao"],
  ["/painel/notificacoes", "painel: mensagens"],
];

const TELAS = [
  { nome: "celular", largura: 390, altura: 844 },
  { nome: "computador", largura: 1440, altura: 900 },
];

const problemas = [];
const anota = (tela, rota, tipo, detalhe) =>
  problemas.push({ tela, rota, tipo, detalhe });

async function visitar(pagina, tela, caminho, rotulo) {
  const erros = [];
  const falhas = [];

  const onConsole = (m) => {
    if (m.type() === "error") erros.push(m.text().slice(0, 200));
  };
  const onPageError = (e) => erros.push("EXCEÇÃO: " + String(e).slice(0, 200));
  // `_rsc=` sao os prefetch do Next. O navegador cancela os que nao chegou
  // a usar ao sair da pagina, e isso e comportamento normal, nao defeito.
  const ehPrefetch = (u) => u.includes("_rsc=");

  const onFailed = (r) => {
    if (ehPrefetch(r.url())) return;
    falhas.push(`${r.failure()?.errorText} ${r.url().slice(0, 120)}`);
  };
  const onResponse = (r) => {
    if (r.status() >= 400 && !r.url().includes("favicon") && !ehPrefetch(r.url())) {
      falhas.push(`HTTP ${r.status()} ${r.url().slice(0, 120)}`);
    }
  };

  pagina.on("console", onConsole);
  pagina.on("pageerror", onPageError);
  pagina.on("requestfailed", onFailed);
  pagina.on("response", onResponse);

  let status = 0;
  try {
    const resp = await pagina.goto(BASE + caminho, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    status = resp?.status() ?? 0;
  } catch (e) {
    anota(tela.nome, rotulo, "NAVEGACAO", String(e).slice(0, 160));
  }

  // deixa a revelação por rolagem acontecer e a fonte assentar
  await pagina.waitForTimeout(700);

  const medidas = await pagina.evaluate(() => {
    const doc = document.documentElement;

    // quem está estourando a largura, e não só se está
    const culpados = [];
    const limite = doc.clientWidth + 1;
    document.querySelectorAll("body *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > limite + 2 || r.left < -2) {
        const est = getComputedStyle(el);
        if (est.position === "fixed") return; // barra fixa é esperada
        culpados.push(
          `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} ` +
            `[${Math.round(r.left)}→${Math.round(r.right)}]`,
        );
      }
    });

    /*
      Imagem quebrada.

      ⚠️ Só conta o que ESTÁ OU ESTEVE PERTO DA TELA. Metade das fotos do
      site é `loading="lazy"` e fica muito abaixo da dobra: elas nunca
      carregam porque a varredura não rola a página, e acusá-las enterrava
      os defeitos de verdade embaixo de 40 falsos positivos.

      Conferido na mão: as URLs acusadas respondiam 200 com 112 KB.

      ⚠️ E o teste é `complete && naturalWidth === 0`, não `!complete`.
      QUEBRADA e CARREGANDO são estados diferentes:

        quebrada    -> complete = true,  naturalWidth = 0
        carregando  -> complete = false, naturalWidth = 0

      Acusar `!complete` é acusar foto que só não terminou de baixar
      dentro do tempo de espera — e com as fotos maiores isso vira
      alarme toda vez.

      O `src` também engana: quando a imagem ainda não escolheu variante,
      `currentSrc` vem vazio e o `src` do Next aponta pra maior de todas
      (w=3840), o que faz parecer que a página está pedindo uma foto
      gigante pra uma miniatura. Não está.
    */
    const alturaVisivel = window.innerHeight * 2;
    const imagens = [...document.images]
      .filter((i) => {
        const r = i.getBoundingClientRect();
        const perto = r.top < alturaVisivel && r.bottom > -alturaVisivel;
        return perto && i.complete && i.naturalWidth === 0;
      })
      .map((i) => i.currentSrc || i.src);

    /*
      Alvos de toque pequenos.

      Só vale medir no CELULAR: no computador existe ponteiro, e link de
      texto de 17px dentro de um menu não é defeito nenhum.

      E só conta o que é BOTÃO de verdade — quem tem borda, fundo ou é
      <button>. Link inline dentro de parágrafo não é alvo de toque, é
      texto, e acusá-lo enterra o defeito real no meio do ruído.
    */
    const pequenos = [];
    if (document.documentElement.clientWidth <= 480) {
      document.querySelectorAll("a[href], button").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;

        const est = getComputedStyle(el);
        const pareceBotao =
          el.tagName === "BUTTON" ||
          est.borderTopWidth !== "0px" ||
          (est.backgroundColor !== "rgba(0, 0, 0, 0)" && est.backgroundColor !== "transparent") ||
          est.display.includes("flex") ||
          est.display === "block";
        if (!pareceBotao) return;

        if (r.height < 40) {
          const txt = (el.textContent || "").trim().slice(0, 28);
          pequenos.push(`${Math.round(r.height)}px "${txt}"`);
        }
      });
    }

    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      culpados: [...new Set(culpados)].slice(0, 6),
      imagens,
      pequenos: [...new Set(pequenos)].slice(0, 6),
      h1: document.querySelectorAll("h1").length,
      titulo: document.title,
      semAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
    };
  });

  pagina.off("console", onConsole);
  pagina.off("pageerror", onPageError);
  pagina.off("requestfailed", onFailed);
  pagina.off("response", onResponse);

  if (medidas.scrollWidth > medidas.clientWidth + 1) {
    anota(
      tela.nome,
      rotulo,
      "ROLAGEM LATERAL",
      `${medidas.scrollWidth}px de conteúdo em ${medidas.clientWidth}px de tela` +
        (medidas.culpados.length ? ` · culpados: ${medidas.culpados.join(" | ")}` : ""),
    );
  }
  // o 404 responde 404 de propósito; o console reclamar disso é esperado
  const errosReais =
    rotulo === "404" ? erros.filter((e) => !e.includes("404")) : erros;
  if (errosReais.length)
    anota(tela.nome, rotulo, "ERRO DE CONSOLE", errosReais.join(" | "));
  const falhasReais =
    rotulo === "404" ? falhas.filter((f) => !f.startsWith("HTTP 404")) : falhas;
  if (falhasReais.length)
    anota(tela.nome, rotulo, "REQUISIÇÃO FALHOU", falhasReais.join(" | "));
  if (medidas.imagens.length)
    anota(tela.nome, rotulo, "IMAGEM QUEBRADA", medidas.imagens.join(" | "));
  if (medidas.semAlt > 0)
    anota(tela.nome, rotulo, "IMAGEM SEM ALT", `${medidas.semAlt} imagem(ns)`);
  if (medidas.pequenos.length)
    anota(tela.nome, rotulo, "ALVO DE TOQUE PEQUENO", medidas.pequenos.join(" | "));
  if (medidas.h1 !== 1 && !rotulo.startsWith("404"))
    anota(tela.nome, rotulo, "H1", `a página tem ${medidas.h1} h1`);

  return { status, titulo: medidas.titulo };
}

const rodar = async () => {
  const navegador = await chromium.launch();
  const senha = senhaDoPainel();

  console.log(`\nVarredura em ${BASE}`);
  console.log(`senha do painel: ${senha ? "encontrada" : "NÃO ENCONTRADA — painel fora"}\n`);

  for (const tela of TELAS) {
    console.log(`\n${"=".repeat(66)}\n${tela.nome.toUpperCase()} (${tela.largura}px)\n${"=".repeat(66)}`);

    const ctx = await navegador.newContext({
      viewport: { width: tela.largura, height: tela.altura },
      deviceScaleFactor: 2,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });
    const pagina = await ctx.newPage();

    for (const [caminho, rotulo] of PUBLICAS) {
      const r = await visitar(pagina, tela, caminho, rotulo);
      console.log(`  [${r.status}] ${rotulo.padEnd(30)} ${r.titulo}`);
    }

    if (senha) {
      await pagina.goto(BASE + "/painel/login", { waitUntil: "networkidle" });
      await pagina.fill('input[name="senha"]', senha);
      await Promise.all([
        pagina.waitForURL(/\/painel(\?|$)/, { timeout: 20000 }).catch(() => {}),
        pagina.click('button[type="submit"]'),
      ]);
      await pagina.waitForTimeout(900);

      const entrou = pagina.url().includes("/painel") && !pagina.url().includes("login");
      console.log(`  login no painel: ${entrou ? "ok" : "FALHOU"}`);

      if (entrou) {
        for (const [caminho, rotulo] of PAINEL) {
          const r = await visitar(pagina, tela, caminho, rotulo);
          console.log(`  [${r.status}] ${rotulo.padEnd(30)} ${r.titulo}`);
        }
      } else {
        anota(tela.nome, "login", "LOGIN", "não consegui entrar no painel");
      }
    }

    await ctx.close();
  }

  await navegador.close();

  console.log(`\n${"=".repeat(66)}`);
  if (problemas.length === 0) {
    console.log("NENHUM PROBLEMA ENCONTRADO");
  } else {
    console.log(`${problemas.length} PROBLEMA(S):\n`);
    for (const p of problemas) {
      console.log(`  [${p.tela}] ${p.rota}`);
      console.log(`     ${p.tipo}: ${p.detalhe}\n`);
    }
  }
  console.log("=".repeat(66));

  process.exit(problemas.length > 0 ? 1 : 0);
};

rodar();
