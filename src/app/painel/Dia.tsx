import { Fragment } from "react";
import { FUSO } from "@/data/negocio";
import type { Agendamento } from "@/lib/agendamentos";
import { HORA } from "@/lib/datas";
import { Cartao } from "./Cartao";
import { NUMERO, ROTULO_SECAO } from "./estilos";

const DIA_E_MES = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: FUSO });

/** Ainda vale: ocupa o horário, ou já foi atendida. */
export const emPe = (a: Agendamento) => a.situacao !== "cancelado" && a.situacao !== "faltou";

/**
 * Um dia da agenda: o rótulo ("Hoje", "Amanhã", "sábado"), a data por
 * extenso, quantos atendimentos, e os cartões na ordem do horário.
 *
 * O rótulo relativo vem antes da data porque é assim que ela pensa a
 * semana — "amanhã tem três" —, e a data grande embaixo desfaz a dúvida
 * quando o dia é mais longe.
 */
export function Dia({
  chave,
  data,
  itens,
  rotulo,
  agora,
}: {
  chave: string;
  data: Date;
  itens: Agendamento[];
  rotulo: string;
  /** Só no dia de hoje: onde passa o marcador de "agora". */
  agora: Date | null;
}) {
  const valendo = itens.filter(emPe).length;
  // Quantos já começaram: o marcador entra logo depois deles.
  const passaram = agora ? itens.filter((a) => a.inicio <= agora).length : -1;

  return (
    <section aria-labelledby={`dia-${chave}`}>
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-linha pb-2.5">
        <h2 id={`dia-${chave}`} className="min-w-0">
          <span className={`block ${ROTULO_SECAO} first-letter:uppercase`}>{rotulo}</span>
          <span className={`mt-1 block text-[22px] leading-none ${NUMERO}`}>
            {DIA_E_MES.format(data)}
          </span>
        </h2>
        <p className="shrink-0 text-[12.5px] text-tinta-2 lining-nums">
          {valendo === 1 ? "1 atendimento" : `${valendo} atendimentos`}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {itens.map((ag, i) => (
          <Fragment key={ag.id}>
            {agora && i === passaram && <Agora hora={agora} />}
            <Cartao ag={ag} ordem={i} />
          </Fragment>
        ))}
        {agora && passaram === itens.length && <Agora hora={agora} />}
      </ul>
    </section>
  );
}

/**
 * A linha do "agora", no meio da lista de hoje.
 *
 * É o cursor de reprodução (playhead) da `Timeline` publicada no 21st.dev
 * (nparashar150/21st, `packages/timeline/src/components/timeline.tsx`): um
 * fio que marca o instante atual sobre as faixas. Lá ele corre na
 * horizontal sobre clipes de vídeo; aqui é um fio dourado entre o cartão
 * que já começou e o que ainda vem.
 *
 * Responde de relance "onde eu estou no dia", sem ela comparar horários de
 * cabeça. Não anda sozinho — é a hora em que a página abriu, e está escrita
 * do lado pra ninguém achar que é relógio.
 */
function Agora({ hora }: { hora: Date }) {
  return (
    <li className="flex items-center gap-2.5 py-0.5" aria-label={`Agora, ${HORA.format(hora)}`}>
      <span aria-hidden="true" className="size-2 shrink-0 bg-ouro" />
      <span
        aria-hidden="true"
        className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.18em] text-ouro lining-nums"
      >
        Agora · {HORA.format(hora)}
      </span>
      <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-ouro-claro" />
    </li>
  );
}
