"use client";

import { useActionState, useEffect, useRef } from "react";
import { adicionarBloqueio, type EstadoBloqueio } from "./acoes";
import { BOTAO, CAMPO_CURTO, ROTULO_CAMPO, ROTULO_SECAO } from "../estilos";

const INICIAL: EstadoBloqueio = {};

export function Formulario() {
  const [estado, acao, enviando] = useActionState(adicionarBloqueio, INICIAL);
  const ref = useRef<HTMLFormElement>(null);

  // Limpa os campos depois de salvar. Só mexe no DOM — nada de estado.
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);

  return (
    <form ref={ref} action={acao} className="flex flex-col gap-4 border border-linha bg-papel p-5 sm:p-6">
      <h2 className={ROTULO_SECAO}>Novo bloqueio</h2>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="De" nome="dataInicio" tipo="date" required />
        <Campo rotulo="Até" nome="dataFim" tipo="date" required />
      </div>

      {/*
        O interruptor revela as horas via CSS (`group-has`), sem estado.

        Era uma caixinha de marcar de 16 px com a frase do lado — pequena
        demais pro dedo, e "senão bloqueia o dia inteiro" entre parênteses
        pedia pra ser lida duas vezes. Virou o interruptor do uiverse.io
        (uiverse-io/galaxy, `Toggle-switches/AbanoubMagdy1_pink-panda-32.html`):
        o checkbox continua lá, escondido, e o trilho com o botão que corre
        é desenhado pelo `peer-checked`. Quadrado, pra combinar com o resto
        do site, onde nada é arredondado.

        O `_intervalo` não é lido pelo servidor — só existe pra acender as
        horas. Quem decide dia inteiro ou intervalo é ter hora preenchida.
      */}
      <div className="group flex flex-col gap-4">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
          <input type="checkbox" name="_intervalo" className="peer sr-only" />
          <span
            aria-hidden="true"
            className="relative h-6 w-11 shrink-0 border border-linha bg-osso transition-colors duration-200 after:absolute after:top-[3px] after:left-[3px] after:size-4 after:bg-tinta-3 after:transition-[translate,background-color] after:duration-200 after:ease-marca peer-checked:border-ouro peer-checked:bg-ouro peer-checked:after:translate-x-5 peer-checked:after:bg-papel peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ouro motion-reduce:after:transition-none"
          />
          <span className="text-[14px] leading-snug text-tinta">
            Só um intervalo do dia
            <span className="block text-[12.5px] text-tinta-2">Desligado, fecha o dia inteiro.</span>
          </span>
        </label>

        <div className="hidden grid-cols-2 gap-3 group-has-[input:checked]:grid">
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
      {estado.ok && (
        <p role="status" className="text-[13px] text-ouro">
          Bloqueio salvo.
        </p>
      )}

      <button type="submit" disabled={enviando} className={BOTAO.enviar}>
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
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={ROTULO_CAMPO}>{rotulo}</span>
      <input name={nome} type={tipo} className={CAMPO_CURTO} {...input} />
    </label>
  );
}
