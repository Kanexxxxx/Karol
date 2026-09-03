import Link from "next/link";
import type { Metadata } from "next";
import { painelConfigurado } from "@/lib/sessao";
import { Formulario } from "./Formulario";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-osso px-6 py-16">
      <div className="w-full max-w-[380px]">
        <p className="text-center font-titulo text-2xl uppercase tracking-[0.16em] text-tinta">
          Karol Carvalho
        </p>
        <p className="mt-1 mb-8 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-ouro">
          Painel
        </p>

        <div className="border border-linha bg-papel p-7">
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

        <p className="mt-6 text-center text-[13px] text-tinta-3">
          <Link href="/" className="underline decoration-linha underline-offset-4 hover:text-ouro">
            Voltar ao site
          </Link>
        </p>
      </div>
    </main>
  );
}
