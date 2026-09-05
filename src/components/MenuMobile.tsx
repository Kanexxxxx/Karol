"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Menu do celular. No computador o menu fica na barra; aqui ele abre num
 * painel abaixo do cabeçalho. Fecha ao tocar num link, no Esc e no toque fora.
 */
export function MenuMobile({
  itens,
  claro,
}: {
  itens: { href: string; texto: string }[];
  claro: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);

  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", aoTeclar);

    // Sem isto, rolar com o menu aberto move a página atrás dele — no
    // celular dá a impressão de que o toque "vazou" pro conteúdo.
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagem;
    };
  }, [aberto]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={`-ml-2 grid size-11 place-items-center ${
          claro ? "text-white [filter:drop-shadow(0_1px_8px_rgba(0,0,0,0.5))]" : "text-tinta"
        }`}
      >
        <span className="relative block h-3.5 w-5">
          <span
            className={`absolute left-0 block h-[2px] w-5 bg-current transition-transform duration-300 ${
              aberto ? "top-1.5 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-1.5 block h-[2px] w-5 bg-current transition-opacity duration-200 ${
              aberto ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-[2px] w-5 bg-current transition-transform duration-300 ${
              aberto ? "top-1.5 -rotate-45" : "top-3"
            }`}
          />
        </span>
      </button>

      {aberto && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={fechar}
            className="fixed inset-0 top-[72px] z-40 cursor-default bg-tinta/20"
          />
          <nav className="absolute inset-x-0 top-full z-50 border-y border-linha bg-osso">
            <ul className="flex flex-col">
              {itens.map((item) => (
                <li key={item.href} className="border-b border-linha last:border-b-0">
                  <Link
                    href={item.href}
                    onClick={fechar}
                    className="block px-[22px] py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-tinta-2 transition-colors hover:text-ouro"
                  >
                    {item.texto}
                  </Link>
                </li>
              ))}
              <li className="p-[22px]">
                <Link
                  href="/agendar"
                  onClick={fechar}
                  className="block bg-ouro py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white"
                >
                  Agendar meu horário
                </Link>
              </li>
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
