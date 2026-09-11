import { Bloco } from "@/components/Esqueleto";
import { CabecalhoPainel, LARGURA } from "../Moldura";

/**
 * A espera do relatório.
 *
 * Ganhou esqueleto próprio porque a forma dele não se parece com nada do
 * resto do painel: a grade de meses, os quatro números grandes e a
 * tabela. Herdar o esqueleto da agenda aqui mostraria cartões que nunca
 * vão aparecer — esqueleto que mente é pior que esqueleto nenhum.
 *
 * O topo é o real, com "Relatório" já aceso: é pra cá que ela está indo.
 *
 * O relatório varre o mês inteiro e soma no servidor, então é das telas
 * mais lentas do painel.
 */
export default function Carregando() {
  return (
    <main className="flex min-h-dvh flex-col bg-osso">
      <CabecalhoPainel titulo="Relatório" aba="relatorio" />

      <div className={`${LARGURA} py-6 sm:py-8`}>
        {/* a grade de meses */}
        <div className="mb-8 grid grid-cols-4 gap-px border border-linha bg-linha sm:grid-cols-6 lg:grid-cols-12">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="grid h-[52px] place-items-center bg-papel">
              <Bloco className="h-3 w-8" />
            </div>
          ))}
        </div>

        {/* os quatro números */}
        <div className="grid grid-cols-2 gap-px border border-linha bg-linha sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-papel p-4">
              <Bloco className="h-2.5 w-20" />
              <Bloco className="mt-3.5 h-8 w-24" />
            </div>
          ))}
        </div>

        <Bloco className="mt-4 h-3 w-[70%] max-w-[420px]" />

        {/* a tabela */}
        <div className="mt-10">
          <div className="mb-3 border-b border-linha pb-2.5">
            <Bloco className="h-3 w-28" />
          </div>
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
