import Link from "next/link";
import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Env } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <>
      <Cabecalho />
      <main className="flex flex-1 items-center bg-osso py-24 pb-40 lg:pb-24">
        <Env className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-ouro">Erro 404</p>
          <h1 className="mx-auto mt-3 mb-4 max-w-[16ch] font-titulo text-[clamp(34px,7vw,56px)] leading-[1.05] font-light">
            Essa página não existe
          </h1>
          <p className="mx-auto mb-8 max-w-[42ch] text-tinta-2">
            O link pode estar quebrado ou a página pode ter mudado de lugar.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-[50px] items-center justify-center bg-ouro px-8 py-4 text-[11.5px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
          >
            Voltar ao início
          </Link>
        </Env>
      </main>
      <Rodape />
      <BarraMobile />
    </>
  );
}
