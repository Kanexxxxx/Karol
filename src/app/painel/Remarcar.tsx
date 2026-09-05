"use client";

import { useActionState, useState } from "react";
import { remarcar, type EstadoRemarcar } from "./novo/acoes";

const INICIAL: EstadoRemarcar = {};

/**
 * Muda o dia e a hora de um atendimento que já existe.
 *
 * Fica fechado por padrão: a agenda é pra ler rápido, e um par de campos
 * de data aberto em cada cartão viraria ruído. Abre no toque.
 *
 * A hora é livre, como no formulário de marcar — quem impede choque é a
 * trava do banco, não a grade da tela.
 */
export function Remarcar({
  id,
  diaAtual,
  horaAtual,
}: {
  id: string;
  /** AAAA-MM-DD */
  diaAtual: string;
  /** HH:MM */
  horaAtual: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, enviando] = useActionState(remarcar, INICIAL);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="min-h-[34px] border border-linha px-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-tinta-2 transition-colors hover:border-ouro-claro hover:text-ouro"
      >
        Remarcar
      </button>
    );
  }

  return (
    <form action={acao} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-tinta-3">
          Dia
        </span>
        <input
          type="date"
          name="dia"
          defaultValue={diaAtual}
          required
          className="border border-linha bg-osso px-2.5 py-1.5 text-[14px]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-tinta-3">
          Hora
        </span>
        <input
          type="time"
          name="hora"
          defaultValue={horaAtual}
          required
          className="border border-linha bg-osso px-2.5 py-1.5 text-[14px]"
        />
      </label>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-[34px] bg-ouro px-3.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
      >
        {enviando ? "…" : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="min-h-[34px] px-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-tinta-3 hover:text-ouro"
      >
        Cancelar
      </button>

      {estado.erro && (
        <p role="alert" className="w-full text-[12.5px] text-[#9d3b2f]">
          {estado.erro}
        </p>
      )}
      {estado.okId === id && (
        <p className="w-full text-[12.5px] text-ouro">Remarcado.</p>
      )}
    </form>
  );
}
