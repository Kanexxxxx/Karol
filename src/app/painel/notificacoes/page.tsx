import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { NOTIFICACOES } from "@/data/negocio";
import { notificadorConfigurado, whatsappDaKarol } from "@/lib/notificacoes";
import { Disparar } from "./Disparar";

export const metadata: Metadata = { title: "Notificações", robots: { index: false } };
export const dynamic = "force-dynamic";

const AVISOS: { chave: keyof typeof NOTIFICACOES; texto: string }[] = [
  { chave: "avisaKarolNoWhatsapp", texto: "Aviso pra você quando entra um agendamento" },
  { chave: "confirmacaoNaHora", texto: "Confirmação pra cliente na hora de agendar" },
  { chave: "lembreteUmDiaAntes", texto: "Lembrete pra cliente um dia antes" },
  { chave: "agradecimentoDepois", texto: "Agradecimento depois do atendimento" },
];

export default async function Notificacoes() {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  const temWebhook = notificadorConfigurado();
  const temCron = Boolean(process.env.CRON_SECRET);

  return (
    <main className="min-h-dvh bg-osso">
      <header className="border-b border-linha bg-papel">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-4 px-5 py-4">
          <p className="font-titulo text-xl uppercase tracking-[0.14em]">Notificações</p>
          <Link
            href="/painel"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3 hover:text-ouro"
          >
            ← Agenda
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[720px] flex-col gap-8 px-5 py-8">
        <section className="border border-linha bg-papel p-5">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">
            Ligação com o WhatsApp
          </h2>
          <ul className="flex flex-col gap-2 text-[14px]">
            <Estado ok={temWebhook}>
              {temWebhook
                ? "Webhook de envio configurado"
                : "Sem webhook de envio (NOTIFICADOR_WEBHOOK_URL) — as mensagens são montadas mas não saem"}
            </Estado>
            <Estado ok={temCron}>
              {temCron
                ? "Cron diário habilitado"
                : "Sem CRON_SECRET — o disparo automático de lembretes fica fechado"}
            </Estado>
          </ul>
          <p className="mt-3 text-[13px] text-tinta-3">
            Os avisos vão pro número {formatar(whatsappDaKarol())}. Detalhes de
            configuração no <code>PROGRESSO.md</code> e no <code>.env.example</code>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">
            O que está ligado
          </h2>
          <ul className="flex flex-col gap-2 border border-linha bg-papel p-5 text-[14px]">
            {AVISOS.map((a) => (
              <Estado key={a.chave} ok={NOTIFICACOES[a.chave]}>
                {a.texto}
              </Estado>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-tinta-3">
            Para mudar, edite <code>NOTIFICACOES</code> em{" "}
            <code>src/data/negocio.ts</code>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">
            Lembretes de hoje
          </h2>
          <p className="mb-3 text-[13px] text-tinta-2">
            Roda sozinho todo dia. Aqui você força na hora — manda o lembrete pra
            quem tem horário amanhã e o agradecimento pra quem foi atendida ontem.
          </p>
          <Disparar />
        </section>
      </div>
    </main>
  );
}

function Estado({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className={`mt-0.5 text-[13px] ${ok ? "text-ouro" : "text-tinta-3"}`}
      >
        {ok ? "●" : "○"}
      </span>
      <span className={ok ? "text-tinta" : "text-tinta-2"}>{children}</span>
    </li>
  );
}

function formatar(numero: string): string {
  const m = numero.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+${m[1]} (${m[2]}) ${m[3]}-${m[4]}` : numero;
}
