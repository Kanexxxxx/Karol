import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { Formulario } from "./Formulario";

export const metadata: Metadata = { title: "Marcar horário", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Novo() {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  return (
    <main className="min-h-dvh bg-osso">
      <header className="border-b border-linha bg-papel">
        <div className="mx-auto flex max-w-[720px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
          <div>
            <p className="font-titulo text-xl uppercase tracking-[0.14em]">Marcar horário</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3">
              você mesma
            </p>
          </div>
          <Link
            href="/painel"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3 hover:text-ouro"
          >
            ← Agenda
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[720px] px-5 py-8">
        {!bancoConfigurado() ? (
          <p className="border border-linha bg-papel p-6 text-tinta-2">
            Banco não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e
            SUPABASE_SERVICE_ROLE_KEY.
          </p>
        ) : (
          <>
            <p className="mb-6 text-[14.5px] text-tinta-2">
              Aqui você escolhe qualquer horário, não só os que aparecem no site —
              é pra encaixar alguém da família ou quem te ligou. Se já houver
              atendimento naquela hora, o sistema recusa.
            </p>
            <Formulario />
          </>
        )}
      </div>
    </main>
  );
}
