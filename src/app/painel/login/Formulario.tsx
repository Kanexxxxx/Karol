"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./acoes";

const INICIAL: EstadoLogin = {};

export function Formulario() {
  const [estado, acao, enviando] = useActionState(entrar, INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Senha
        </span>
        <input
          type="password"
          name="senha"
          autoComplete="current-password"
          autoFocus
          required
          className="border border-linha bg-osso px-4 py-3 text-[15px] text-tinta outline-none transition-colors focus:border-ouro-claro"
        />
      </label>

      {estado.erro && (
        <p role="alert" className="text-[13px] text-[#9d3b2f]">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-1 inline-flex min-h-[48px] items-center justify-center bg-ouro px-7 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
