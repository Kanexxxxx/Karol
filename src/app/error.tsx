"use client";

import { useEffect } from "react";
import { NEGOCIO } from "@/data/negocio";

/**
 * Fronteira de erro global. Client Component por exigência do Next.
 * Fala como gente e oferece dois caminhos: tentar de novo ou o WhatsApp.
 */
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-osso px-6 py-16 text-center">
      <div className="max-w-[440px]">
        <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-ouro">Ops</p>
        <h1 className="mt-3 mb-4 font-titulo text-[clamp(30px,6vw,44px)] leading-[1.1] font-light">
          Algo deu errado por aqui
        </h1>
        <p className="mb-8 text-tinta-2">
          Já anotei o problema. Você pode tentar de novo — ou falar comigo direto
          no WhatsApp que eu resolvo.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[48px] items-center justify-center bg-ouro px-7 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
          >
            Tentar de novo
          </button>
          <a
            href={`https://wa.me/${NEGOCIO.whatsapp.numero}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center border border-ouro-claro px-7 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.2em] text-ouro transition-colors hover:bg-ouro-fundo"
          >
            Chamar no WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}
