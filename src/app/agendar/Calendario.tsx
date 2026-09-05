import Link from "next/link";
import type { DiaDoMes } from "@/lib/agendamentos";

/**
 * Calendário do mês, para escolher o dia.
 *
 * Antes era uma lista de 21 fichas de dia, que a cliente lia de cima a
 * baixo pra achar o que queria. Calendário é a forma que todo mundo já
 * sabe ler — e mostra os dias em que ela NÃO atende, que a lista escondia.
 *
 * Os dias esgotados aparecem marcados, não somem: agenda que só mostra o
 * que sobrou parece vazia justamente quando está cheia.
 *
 * É Server Component de propósito. A navegação entre meses é link comum,
 * então funciona sem JavaScript e cada mês chega com a disponibilidade já
 * conferida no banco — não há estado no navegador pra ficar desatualizado.
 */

const CABECA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MES_POR_EXTENSO = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function Calendario({
  dias,
  ano,
  mes,
  base,
  temAnterior,
  temSeguinte,
}: {
  dias: DiaDoMes[];
  ano: number;
  mes: number;
  /** querystring com serviço e cidade já escolhidos */
  base: string;
  temAnterior: boolean;
  temSeguinte: boolean;
}) {
  // Quantas casas vazias antes do dia 1, pra ele cair na coluna certa.
  const vaziasNoInicio = new Date(ano, mes, 1).getDay();
  const semanas: (DiaDoMes | null)[][] = [];
  let semana: (DiaDoMes | null)[] = Array(vaziasNoInicio).fill(null);

  for (const dia of dias) {
    semana.push(dia);
    if (semana.length === 7) {
      semanas.push(semana);
      semana = [];
    }
  }
  if (semana.length > 0) {
    semanas.push([...semana, ...Array(7 - semana.length).fill(null)]);
  }

  const mesLink = (deslocamento: number) => {
    const d = new Date(ano, mes + deslocamento, 1);
    return `/agendar?${base}&mes=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-[560px] border border-linha bg-papel">
      <div className="flex items-center justify-between border-b border-linha px-3 py-3">
        <Seta href={temAnterior ? mesLink(-1) : null} rotulo="Mês anterior">
          ‹
        </Seta>
        <p className="font-titulo text-[21px] capitalize lg:text-[24px]">
          {MES_POR_EXTENSO.format(new Date(ano, mes, 1))}
        </p>
        <Seta href={temSeguinte ? mesLink(1) : null} rotulo="Próximo mês">
          ›
        </Seta>
      </div>

      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">
          Dias disponíveis em {MES_POR_EXTENSO.format(new Date(ano, mes, 1))}
        </caption>
        <thead>
          <tr>
            {CABECA.map((d) => (
              <th
                key={d}
                scope="col"
                className="py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-tinta-3"
              >
                <span aria-hidden="true">{d}</span>
                <span className="sr-only">{d}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((s, i) => (
            <tr key={i}>
              {s.map((dia, j) => (
                <td key={j} className="p-0 align-top">
                  {dia ? <Dia dia={dia} base={base} /> : <span className="block aspect-square" />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <Legenda />
    </div>
  );
}

function Dia({ dia, base }: { dia: DiaDoMes; base: string }) {
  const esgotado = dia.atende && !dia.cedoDemais && dia.total > 0 && dia.vagas === 0;
  const livre = dia.vagas > 0;

  if (!livre) {
    return (
      <span
        aria-label={
          esgotado
            ? `Dia ${dia.numero}, esgotado`
            : `Dia ${dia.numero}, sem atendimento`
        }
        className={`flex aspect-square flex-col items-center justify-center gap-0.5 border border-linha/60 text-[15px] ${
          esgotado ? "bg-creme/50 text-tinta-3" : "text-tinta-3/45"
        }`}
      >
        <span className={esgotado ? "line-through decoration-tinta-3/60" : ""}>
          {dia.numero}
        </span>
        {esgotado && (
          <span className="text-[8px] font-bold uppercase tracking-[0.1em]">Cheio</span>
        )}
      </span>
    );
  }

  return (
    <Link
      href={`/agendar?${base}&dia=${dia.chave}`}
      aria-label={`Dia ${dia.numero}, ${dia.vagas} ${dia.vagas === 1 ? "horário livre" : "horários livres"}`}
      className="grid aspect-square place-items-center border border-linha/60 text-[17px] font-medium text-tinta transition-colors hover:bg-ouro hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ouro"
    >
      {dia.numero}
    </Link>
  );
}

function Legenda() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-linha px-3 py-3 text-[11px] text-tinta-3">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 border border-ouro bg-papel" />
        livre
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 border border-linha bg-creme/50" />
        cheio
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 border border-linha bg-papel opacity-45" />
        não atende
      </li>
    </ul>
  );
}

function Seta({
  href,
  rotulo,
  children,
}: {
  href: string | null;
  rotulo: string;
  children: React.ReactNode;
}) {
  const classe =
    "grid size-11 place-items-center font-titulo text-[24px] leading-none transition-colors";

  if (!href) {
    return (
      <span aria-hidden="true" className={`${classe} text-tinta-3/30`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={rotulo}
      className={`${classe} text-tinta-2 hover:text-ouro focus-visible:outline-2 focus-visible:outline-ouro`}
    >
      {children}
    </Link>
  );
}
