import Link from "next/link";
import type { Metadata } from "next";
import { painelConfigurado } from "@/lib/sessao";
import { FOCO } from "../estilos";
import { Formulario } from "./Formulario";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-osso px-5 py-16">
      <div className="w-full max-w-[380px]">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.28em] text-ouro">
          Painel
        </p>
        <h1 className="mt-2 mb-8 text-center font-titulo text-[30px] leading-none text-tinta">
          Karol Carvalho
        </h1>

        {/* O fio dourado no topo é o mesmo acento das caixas que pedem ação
            dentro do painel: a entrada já avisa de onde ela é. */}
        <div className="border border-linha border-t-2 border-t-ouro bg-papel p-6 sm:p-7">
          {painelConfigurado() ? (
            <Formulario />
          ) : (
            <div className="text-[14px] text-tinta-2">
              <p className="mb-3 font-titulo text-[20px] text-tinta">Painel não configurado</p>
              <p className="mb-2">
                Defina no ambiente do servidor (ou em <code>.env.local</code>):
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li><code>SENHA_PAINEL</code></li>
                <li><code>SESSAO_SECRET</code></li>
              </ul>
              <p className="mt-3">Veja <code>.env.example</code>.</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[13px] text-tinta-2">
          <Link
            href="/"
            className={`inline-flex min-h-[44px] items-center underline decoration-linha underline-offset-4 hover:text-ouro ${FOCO}`}
          >
            Voltar ao site
          </Link>
        </p>
      </div>
    </main>
  );
}
