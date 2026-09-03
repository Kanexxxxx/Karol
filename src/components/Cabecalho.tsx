import Link from "next/link";
import { Botao, Env } from "./ui";

const MENU = [
  { href: "/#servicos", texto: "Serviços" },
  { href: "/#trabalhos", texto: "Trabalhos" },
  { href: "/#curso", texto: "Curso" },
  { href: "/#local", texto: "Onde fica" },
];

/**
 * No celular fica por cima da foto de abertura, em branco.
 * No computador vira uma barra sólida com o menu.
 */
export function Cabecalho() {
  return (
    <header className="absolute inset-x-0 top-0 z-50 lg:relative lg:border-b lg:border-linha lg:bg-osso">
      <Env className="flex h-[72px] items-center justify-between gap-4 lg:h-20">
        <Link
          href="/"
          className="font-titulo text-2xl uppercase tracking-[0.16em] text-white [text-shadow:0_1px_14px_rgba(0,0,0,0.5)] lg:text-tinta lg:[text-shadow:none]"
        >
          Karol Carvalho
        </Link>

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
          className="inline-flex min-h-[42px] items-center border border-white/60 bg-white/15 px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-opacity hover:opacity-90 lg:min-h-[44px] lg:border-0 lg:bg-ouro lg:px-6 lg:text-[11px] lg:backdrop-blur-none"
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
