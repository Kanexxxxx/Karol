import { formatarPreco } from "@/data/servicos";
import { paraChave } from "@/lib/agenda";
import type { Agendamento } from "@/lib/agendamentos";
import { codigoDoAgendamento } from "@/lib/codigo";
import { DIA_POR_EXTENSO, HORA } from "@/lib/datas";
import { formatarWhatsapp } from "@/lib/telefone";
import { AcoesAgendamento } from "./AcoesAgendamento";
import { Remarcar } from "./Remarcar";

/**
 * Um agendamento no painel.
 *
 * Estava escrito direto dentro da lista da agenda. Virou componente quando a
 * busca apareceu: os dois lugares mostram a MESMA coisa, e duas cópias do
 * cartão significariam consertar botão em dois arquivos pelo resto da vida.
 */

export const SITUACAO_ROTULO: Record<
  Agendamento["situacao"],
  { texto: string; classe: string }
> = {
  pendente: { texto: "Aguardando", classe: "bg-[#f3e7cd] text-[#8a6a1f]" },
  confirmado: { texto: "Confirmado", classe: "bg-ouro text-white" },
  concluido: { texto: "Atendida", classe: "bg-[#e3ded3] text-tinta-2" },
  cancelado: { texto: "Cancelado", classe: "bg-[#f0e2df] text-[#9d3b2f]" },
  faltou: { texto: "Faltou", classe: "bg-[#f0e2df] text-[#9d3b2f]" },
};

export function Cartao({
  ag,
  comData = false,
}: {
  ag: Agendamento;
  /** A agenda já agrupa por dia; a busca não, então lá o dia entra no cartão. */
  comData?: boolean;
}) {
  return (
    <li className="border border-linha bg-papel p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {comData && (
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-tinta-3 first-letter:uppercase">
              {DIA_POR_EXTENSO.format(ag.inicio)}
            </p>
          )}
          <p className="font-titulo text-[20px] leading-tight">
            <span className="tabular-nums text-ouro">{HORA.format(ag.inicio)}</span>{" "}
            {ag.servicoNome}
          </p>
          <p className="mt-0.5 text-[14px] text-tinta-2">
            {ag.clienteNome} ·{" "}
            <a
              href={`https://wa.me/${ag.clienteWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ouro underline decoration-ouro-claro underline-offset-2"
            >
              {formatarWhatsapp(ag.clienteWhatsapp)}
            </a>
          </p>
          <p className="mt-0.5 text-[12px] uppercase tracking-[0.1em] text-tinta-3">
            {ag.cidade} · {formatarPreco(ag.servicoPreco / 100)} ·{" "}
            {/* O mesmo código que a cliente recebeu. É por ele que a Karol
                confere que abriu o agendamento certo. */}
            <span className="font-mono tracking-[0.12em] text-tinta-2">
              {codigoDoAgendamento(ag.id)}
            </span>
          </p>
          {ag.observacao && (
            <p className="mt-1.5 border-l-2 border-linha pl-2.5 text-[13px] text-tinta-2">
              {ag.observacao}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] ${SITUACAO_ROTULO[ag.situacao].classe}`}
        >
          {SITUACAO_ROTULO[ag.situacao].texto}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <AcoesAgendamento id={ag.id} situacao={ag.situacao} />
        <Remarcar id={ag.id} diaAtual={paraChave(ag.inicio)} horaAtual={HORA.format(ag.inicio)} />
      </div>
    </li>
  );
}

