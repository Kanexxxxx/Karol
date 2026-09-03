"use client";

import { useActionState, useEffect, useRef } from "react";
import { adicionarBloqueio, type EstadoBloqueio } from "./acoes";

const INICIAL: EstadoBloqueio = {};

export function Formulario() {
  const [estado, acao, enviando] = useActionState(adicionarBloqueio, INICIAL);
  const ref = useRef<HTMLFormElement>(null);

  // Limpa os campos depois de salvar. Só mexe no DOM — nada de estado.
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);

  return (
    <form ref={ref} action={acao} className="flex flex-col gap-4 border border-linha bg-papel p-5">
      <p className="font-titulo text-[20px]">Novo bloqueio</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="De" nome="dataInicio" tipo="date" required />
        <Campo rotulo="Até" nome="dataFim" tipo="date" required />
      </div>

      {/* O checkbox revela as horas via CSS (`group-has`), sem estado. */}
      <div className="group flex flex-col gap-4">
        <label className="flex items-center gap-2 text-[13px] text-tinta-2">
          <input type="checkbox" name="_intervalo" className="size-4 accent-[#96702b]" />
          Só um intervalo do dia (senão bloqueia o dia inteiro)
        </label>

        <div className="hidden grid-cols-1 gap-4 group-has-[input:checked]:grid sm:grid-cols-2">
          <Campo rotulo="Das" nome="horaInicio" tipo="time" />
          <Campo rotulo="Às" nome="horaFim" tipo="time" />
        </div>
      </div>

      <Campo
        rotulo="Motivo"
        nome="motivo"
        tipo="text"
        placeholder="Férias, feriado, curso…"
        required
        maxLength={200}
      />

      {estado.erro && (
        <p role="alert" className="text-[13px] text-[#9d3b2f]">
          {estado.erro}
        </p>
      )}
      {estado.ok && <p className="text-[13px] text-ouro">Bloqueio salvo.</p>}

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex min-h-[44px] items-center justify-center bg-ouro px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Salvando…" : "Bloquear"}
      </button>
    </form>
  );
}

function Campo({
  rotulo,
  nome,
  tipo,
  ...input
}: {
  rotulo: string;
  nome: string;
  tipo: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-3">
        {rotulo}
      </span>
      <input
        name={nome}
        type={tipo}
        className="border border-linha bg-osso px-3 py-2.5 text-[15px] text-tinta outline-none transition-colors focus:border-ouro-claro"
        {...input}
      />
    </label>
  );
}
