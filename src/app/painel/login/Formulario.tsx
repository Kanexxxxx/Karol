"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./acoes";
import { BOTAO, CAMPO, ROTULO_CAMPO } from "../estilos";

const INICIAL: EstadoLogin = {};

export function Formulario() {
  const [estado, acao, enviando] = useActionState(entrar, INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={ROTULO_CAMPO}>Senha</span>
        <input
          type="password"
          name="senha"
          autoComplete="current-password"
          autoFocus
          required
          className={CAMPO}
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
        className={`${BOTAO.enviar} mt-1`}
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
