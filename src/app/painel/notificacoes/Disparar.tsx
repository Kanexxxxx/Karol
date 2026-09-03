"use client";

import { useActionState } from "react";
import { dispararLembretes, type EstadoLembretes } from "./acoes";

const INICIAL: EstadoLembretes = {};

export function Disparar() {
  const [estado, acao, ocupado] = useActionState(dispararLembretes, INICIAL);

  return (
    <form action={acao} className="flex flex-col items-start gap-2">
      <button
        type="submit"
        disabled={ocupado}
        className="inline-flex min-h-[44px] items-center justify-center border border-ouro-claro px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ouro transition-colors hover:bg-ouro-fundo disabled:opacity-60"
      >
        {ocupado ? "Enviando…" : "Disparar agora"}
      </button>

      {estado.resultado && (
        <p className="text-[13px] text-tinta-2">
          {estado.resultado.lembretes} lembrete(s) e {estado.resultado.agradecimentos}{" "}
          agradecimento(s) enviados.
        </p>
      )}
      {estado.erro && (
        <p role="alert" className="text-[13px] text-[#9d3b2f]">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
