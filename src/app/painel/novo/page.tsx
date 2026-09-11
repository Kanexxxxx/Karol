import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { CabecalhoPainel, LARGURA, RodapePainel } from "../Moldura";
import { Formulario } from "./Formulario";

export const metadata: Metadata = { title: "Marcar horário", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Novo() {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  return (
    <main className="flex min-h-dvh flex-col bg-osso">
      <CabecalhoPainel titulo="Marcar horário" detalhe="Feito por você, fora do site" marcar={false} />

      <div className={`${LARGURA} py-6 sm:py-8`}>
        <div className="max-w-[640px]">
          {!bancoConfigurado() ? (
            <p className="border border-linha bg-papel p-6 text-tinta-2">
              Banco não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e
              SUPABASE_SERVICE_ROLE_KEY.
            </p>
          ) : (
            <>
              <p className="mb-6 text-[14.5px] leading-relaxed text-tinta-2">
                Aqui você escolhe qualquer horário, não só os que aparecem no site —
                é pra encaixar alguém da família ou quem te ligou. Se já houver
                atendimento naquela hora, o sistema recusa.
              </p>
              <Formulario />
            </>
          )}
        </div>
      </div>

      <RodapePainel />
    </main>
  );
}
