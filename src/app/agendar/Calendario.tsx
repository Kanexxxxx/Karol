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

/**
 * Uma célula do calendário.
 *
 * ⚠️ São QUATRO estados, não três. O quarto — "já passou" — foi o defeito:
 * dia vencido e dia em que ela não trabalha caíam na mesma célula cinza,
 * com a mesma legenda "não atende".
 *
 * O estrago aparecia justo na segunda-feira. Segunda é dia útil dela em
 * Pereira Barreto, mas o dia de hoje nunca é agendável (ela pediu
 * antecedência de um dia), então o calendário dizia "não atende" num dia
 * em que ela atende. Quem abrisse o site numa segunda via a primeira
 * semana inteira apagada, com a legenda afirmando que ela não trabalha
 * naqueles dias, e concluía que a agenda estava fechada.
 *
 * O risco de dizer errado aqui é maior do que parece: é a única tela onde
 * o site fala sobre a disponibilidade dela, e uma cliente que conclui
 * "ela não atende" fecha a aba.
 */
function Dia({ dia, base }: { dia: DiaDoMes; base: string }) {
  const esgotado = dia.atende && !dia.cedoDemais && dia.total > 0 && dia.vagas === 0;
  const livre = dia.vagas > 0;

  if (!livre) {
    // "Cedo demais" num dia que ela ATENDE é hoje (ou dentro da
    // antecedência). Num dia que ela não atende, o que manda é o "não
    // atende" — dizer "cedo demais" sobre um domingo não ajudaria ninguém.
    const vencido = dia.passou || (dia.cedoDemais && dia.atende);

    return (
      <span
        aria-label={
          esgotado
            ? `Dia ${dia.numero}, esgotado`
            : dia.passou
              ? `Dia ${dia.numero}, já passou`
              : vencido
                ? `Dia ${dia.numero}, cedo demais — ela marca a partir de amanhã`
                : `Dia ${dia.numero}, ela não atende nesse dia`
        }
        className={`flex aspect-square flex-col items-center justify-center gap-0.5 border border-linha/60 text-[15px] ${
          esgotado
            ? "bg-creme/50 text-tinta-3"
            : vencido
              ? "text-tinta-3/40 [background:linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--color-linha)_calc(50%-0.5px),var(--color-linha)_calc(50%+0.5px),transparent_calc(50%+0.5px))]"
              : "text-tinta-3/45"
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
        <span
          aria-hidden="true"
          className="size-2.5 border border-linha [background:linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--color-linha)_calc(50%-0.5px),var(--color-linha)_calc(50%+0.5px),transparent_calc(50%+0.5px))]"
        />
        já passou
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
