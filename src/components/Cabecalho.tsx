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
 * `sobreHero` = a home no celular, onde o cabeçalho fica transparente por
 * cima da foto de abertura, em branco. Nas outras páginas (e sempre no
 * computador) é uma barra sólida com texto escuro.
 */
export function Cabecalho({ sobreHero = false }: { sobreHero?: boolean }) {
  const posicao = sobreHero
    ? "absolute inset-x-0 top-0 lg:relative lg:border-b lg:border-linha lg:bg-osso"
    : "relative border-b border-linha bg-osso";

  return (
    <header className={`z-50 ${posicao}`}>
      <Env className="flex h-[72px] items-center justify-between gap-3 lg:h-20">
        <div className="flex items-center gap-1.5">
          <MenuMobile itens={MENU} claro={sobreHero} />
          <Link
            href="/"
            className={`font-titulo text-2xl uppercase tracking-[0.16em] ${
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
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-linha bg-osso/95 px-4 py-[10px] pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <Botao href="/agendar" className="w-full">
        Agendar meu horário
      </Botao>
    </div>
  );
}
