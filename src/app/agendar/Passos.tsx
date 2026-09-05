/**
 * Trilha dos 5 passos do agendamento.
 *
 * A página `/agendar` avança por query string
 * (`?servico=…&cidade=…&dia=…&hora=…`), então o passo atual é o primeiro
 * que ainda não foi preenchido. Puramente visual — quem controla o fluxo
 * é a página.
 */

const PASSOS = ["Serviço", "Cidade", "Dia", "Hora", "Seus dados"] as const;

export function Passos({
  temServico,
  temCidade,
  temDia,
  temHora,
}: {
  temServico: boolean;
  temCidade: boolean;
  temDia: boolean;
  temHora: boolean;
}) {
  const preenchidos = [temServico, temCidade, temDia, temHora, false];
  const atual = preenchidos.findIndex((p) => !p);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]">
      {PASSOS.map((rotulo, i) => {
        const feito = i < atual;
        const ativo = i === atual;
        return (
          <li key={rotulo} className="flex items-center gap-2">
            <span
              className={`grid size-5 place-items-center rounded-full border text-[10px] tabular-nums ${
                feito
                  ? "border-ouro bg-ouro text-white"
                  : ativo
                    ? "border-ouro text-ouro"
                    : "border-linha text-tinta-3"
              }`}
            >
              {feito ? "✓" : i + 1}
            </span>
            <span className={ativo ? "text-ouro" : feito ? "text-tinta-2" : "text-tinta-3"}>
              {rotulo}
            </span>
            {i < PASSOS.length - 1 && (
              <span aria-hidden="true" className="mx-1 h-px w-5 bg-linha sm:w-8" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
