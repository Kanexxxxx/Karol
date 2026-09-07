import { Bloco, CabecalhoEsqueleto } from "@/components/Esqueleto";

/**
 * A espera do relatório.
 *
 * Ganhou esqueleto próprio porque a forma dele não se parece com nada do
 * resto do painel: a fileira de meses, os quatro números grandes e a
 * tabela. Herdar o esqueleto da agenda aqui mostraria cartões que nunca
 * vão aparecer — esqueleto que mente é pior que esqueleto nenhum.
 *
 * O relatório varre o mês inteiro e soma no servidor, então é das telas
 * mais lentas do painel.
 */
export default function Carregando() {
  return (
    <main className="min-h-dvh bg-osso">
      <CabecalhoEsqueleto titulo="Relatório" />

      <div className="mx-auto max-w-[900px] px-5 py-8">
        {/* o seletor de meses */}
        <div className="mb-8 flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Bloco key={i} className="h-[30px] w-[74px]" />
          ))}
        </div>

        {/* os quatro números */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-linha bg-papel p-4">
              <Bloco className="h-2.5 w-20" />
              <Bloco className="mt-3 h-7 w-24" />
            </div>
          ))}
        </div>

        <Bloco className="mt-4 h-3 w-[70%] max-w-[420px]" />

        {/* a tabela */}
        <div className="mt-8">
          <Bloco className="mb-3 h-3 w-28" />
          <div className="border border-linha bg-papel">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-linha px-4 py-3 last:border-b-0"
              >
                <Bloco className="h-3.5 w-[45%] max-w-[200px]" />
                <Bloco className="h-3.5 w-14 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
