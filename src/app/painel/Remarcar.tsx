"use client";

import { useActionState, useState } from "react";
import { remarcar, type EstadoRemarcar } from "./novo/acoes";
import { BOTAO, CAMPO_CURTO, ROTULO_CAMPO } from "./estilos";

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
      <button type="button" onClick={() => setAberto(true)} className={BOTAO.secundario}>
        Remarcar
      </button>
    );
  }

  // `basis-full`: aberto, o formulário ocupa a linha inteira da faixa de
  // botões em vez de se espremer ao lado deles — no celular os campos de
  // data ficavam com 90 px e o dia não cabia.
  return (
    <form action={acao} className="flex basis-full flex-wrap items-end gap-2 pt-1">
      <input type="hidden" name="id" value={id} />
      <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1.5">
        <span className={ROTULO_CAMPO}>Novo dia</span>
        <input type="date" name="dia" defaultValue={diaAtual} required className={CAMPO_CURTO} />
      </label>
      <label className="flex w-[7.5rem] flex-col gap-1.5">
        <span className={ROTULO_CAMPO}>Hora</span>
        <input type="time" name="hora" defaultValue={horaAtual} required className={CAMPO_CURTO} />
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={enviando} className={BOTAO.primario}>
          {enviando ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className={BOTAO.fantasma}
        >
          Fechar
        </button>
      </div>

      {estado.erro && (
        <p role="alert" className="w-full text-[12.5px] text-[#9d3b2f]">
          {estado.erro}
        </p>
      )}
      {estado.okId === id && (
        <p role="status" className="w-full text-[12.5px] text-ouro">
          Remarcado.
        </p>
      )}
    </form>
  );
}
