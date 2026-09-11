import Link from "next/link";
import { Botao, Env } from "./ui";
import { MenuMobile } from "./MenuMobile";

const MENU = [
  { href: "/sobre", texto: "A Karol" },
  { href: "/#servicos", texto: "Serviços" },
  { href: "/#trabalhos", texto: "Trabalhos" },
  { href: "/#curso", texto: "Curso" },
  { href: "/#local", texto: "Onde fica" },
];

/**
 * O material do cabeçalho: VIDRO, o translúcido do iPhone.
 *
 * Ele gruda no topo e a página passa por baixo desfocada, em vez de sumir
 * atrás de uma barra opaca. É o mesmo material da barra de baixo do
 * celular (`.vidro` no globals.css), só que escrito em utilitários do
 * Tailwind — por dois motivos:
 *
 * 1. precisa variar por largura (`lg:`), e classe própria no globals.css
 *    não ganha variante;
 * 2. CSS fora de `@layer` vence os utilitários, e já mordeu este projeto
 *    antes. Utilitário contra utilitário não tem essa briga.
 *
 * O fundo começa quase opaco (92%) e só fica translúcido (60%) onde o
 * navegador sabe desfocar. Sem desfoque, 60% de transparência deixaria o
 * texto da página brigando com o menu.
 */
const VIDRO =
  "bg-osso/92 supports-[backdrop-filter:blur(1px)]:bg-osso/60 backdrop-blur-xl backdrop-saturate-150";
const VIDRO_LG =
  "lg:bg-osso/92 lg:supports-[backdrop-filter:blur(1px)]:bg-osso/60 lg:backdrop-blur-xl lg:backdrop-saturate-150";

/**
 * `sobreHero` = a home no celular, onde o cabeçalho fica transparente por
 * cima da foto de abertura, em branco, e vai embora com a rolagem — ali a
 * foto é o assunto e a barra de baixo já leva o "Agendar". No computador,
 * e em todas as outras páginas, é o vidro grudado no topo.
 */
export function Cabecalho({ sobreHero = false }: { sobreHero?: boolean }) {
  const posicao = sobreHero
    ? `absolute inset-x-0 top-0 lg:sticky lg:border-b lg:border-linha/60 ${VIDRO_LG}`
    : `sticky top-0 border-b border-linha/60 ${VIDRO}`;

  return (
    <header className={`z-50 ${posicao}`}>
      <Env className="flex h-[72px] items-center justify-between gap-3 lg:h-20">
        <div className="flex items-center gap-1.5">
          <MenuMobile itens={MENU} claro={sobreHero} />
          <Link
            href="/"
            // No celular o nome ia pra duas linhas e o cabeçalho ficava com o
            // dobro da altura, comendo a tela. Fonte e espaçamento menores
            // até 640 px fazem caber numa linha só, ao lado do menu e do botão.
            // ⚠️ E numa linha só o link ficou com 29 px de altura — abaixo dos
            // 44 px de alvo de toque. Em duas linhas passava por acaso. A
            // altura mínima vem do próprio link, não do tamanho da letra.
            className={`inline-flex min-h-[44px] items-center whitespace-nowrap font-titulo text-[19px] uppercase tracking-[0.1em] sm:text-2xl sm:tracking-[0.16em] ${
              sobreHero
                ? "text-white [text-shadow:0_1px_14px_rgba(0,0,0,0.5)] lg:text-tinta lg:[text-shadow:none]"
                : "text-tinta"
            }`}
          >
            Karol Carvalho
          </Link>
        </div>

        <nav className="hidden gap-[30px] lg:flex">
          {MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-tinta-2 transition-colors hover:text-ouro"
            >
              {item.texto}
            </Link>
          ))}
        </nav>

        <Link
          href="/agendar"
          className={`inline-flex min-h-[44px] items-center px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-90 lg:bg-ouro lg:px-6 lg:text-[11px] lg:text-white ${
            sobreHero
              ? "border border-white/60 bg-white/15 text-white backdrop-blur-sm lg:border-0 lg:backdrop-blur-none"
              : "bg-ouro text-white"
          }`}
        >
          Agendar
        </Link>
      </Env>
    </header>
  );
}

/** Barra fixa no rodapé do celular. Some no computador. */
export function BarraMobile() {
  return (
    /* vidro de verdade: o conteúdo passa por baixo desfocado em vez de
       sumir atrás de um bloco quase opaco. Ver `.vidro` no globals.css. */
    <div className="vidro fixed inset-x-0 bottom-0 z-50 border-t border-linha/70 px-4 py-[10px] pb-[calc(10px+env(safe-area-inset-bottom))] lg:hidden">
      <Botao href="/agendar" className="w-full">
        Agendar meu horário
      </Botao>
    </div>
  );
}
