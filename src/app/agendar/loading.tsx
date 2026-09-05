import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Env } from "@/components/ui";

/** Esqueleto enquanto a disponibilidade é consultada no banco. */
export default function Carregando() {
  return (
    <>
      <Cabecalho />
      <main className="flex-1 bg-osso pb-24 lg:pb-0">
        <Env className="pt-10 lg:pt-16">
          <div className="h-3 w-40 animate-pulse bg-linha" />
          <div className="mt-6 h-10 w-3/4 max-w-[420px] animate-pulse bg-linha" />
          <div className="mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse border border-linha bg-papel" />
            ))}
          </div>
        </Env>
      </main>
      <BarraMobile />
    </>
  );
}
