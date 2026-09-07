import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { NOTIFICACOES } from "@/data/negocio";
import { conversasAbertas, type Conversa } from "@/lib/conversas";
import { formatarWhatsapp } from "@/lib/telefone";
import {
  avisosDesviadosPara,
  metaConfigurada,
  notificadorConfigurado,
  recebimentoConfigurado,
  whatsappDaKarol,
} from "@/lib/notificacoes";
import { Disparar } from "./Disparar";

/**
 * Mensagens.
 *
 * ⚠️ Esta tela era uma lista de variável de ambiente com bolinha do lado.
 * Dizia se `META_TOKEN` existe, se `CRON_SECRET` existe — coisas que a
 * Karol não pode fazer nada a respeito e que não respondem nenhuma
 * pergunta que ela tenha. O Kainã chamou de "informação inútil" e estava
 * certo.
 *
 * Agora ela responde as duas perguntas que a Karol faz de verdade:
 *
 * 1. "Com quem eu posso falar de graça agora?" — a janela de 24 h. Isso é
 *    dinheiro: dentro dela, mensagem é livre e sem template; fora, a Meta
 *    recusa ou cobra. Ela nunca teve como saber — descobria tentando.
 * 2. "Os avisos estão indo pra mim mesmo?" — o desvio do `KAROL_WHATSAPP`,
 *    que é a armadilha mais cara do projeto.
 *
 * O lembrete de cada cliente saiu daqui: ele mora no cartão dela, no
 * painel. Ver `painel/Lembrete.tsx`.
 *
 * O diagnóstico técnico continua existindo, no rodapé, escrito em
 * português — ele serve pra quem for consertar, não pra ela.
 */

export const metadata: Metadata = { title: "Mensagens", robots: { index: false } };
export const dynamic = "force-dynamic";

const AVISOS: { chave: keyof typeof NOTIFICACOES; texto: string }[] = [
  { chave: "avisaKarolNoWhatsapp", texto: "Aviso pra você quando entra um agendamento" },
  { chave: "confirmacaoNaHora", texto: "Confirmação pra cliente na hora de agendar" },
  { chave: "lembreteUmDiaAntes", texto: "Lembrete pra cliente um dia antes" },
  { chave: "lembrete30MinAntes", texto: "Lembrete pra cliente ~30 min antes" },
  { chave: "agradecimentoDepois", texto: "Agradecimento depois do atendimento" },
];

export default async function Notificacoes() {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  const desviado = avisosDesviadosPara();
  const conversas = bancoConfigurado() ? await conversasAbertas() : [];

  return (
    <main className="min-h-dvh bg-osso">
      <header className="border-b border-linha bg-papel">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-4 px-5 py-4">
          <h1 className="font-titulo text-xl uppercase tracking-[0.14em]">Mensagens</h1>
          <Link
            href="/painel"
            className="inline-flex min-h-[44px] items-center text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3 hover:text-ouro"
          >
            ← Agenda
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[720px] flex-col gap-9 px-5 py-8">
        {desviado && <Desvio numero={desviado} />}

        <ConversasAbertas conversas={conversas} />

        <section>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">
            Lembretes do dia
          </h2>
          <p className="mb-3 text-[13.5px] text-tinta-2">
            Roda sozinho todo dia de manhã: manda o lembrete pra quem tem horário
            amanhã e o agradecimento pra quem você atendeu ontem. Aqui você força
            na hora, se precisar.
          </p>
          <p className="mb-3 text-[13px] text-tinta-3">
            O lembrete de meia hora antes não é este — ele sai sozinho perto do
            horário, e o botão dele fica no cartão de cada cliente, na agenda.
          </p>
          <Disparar />
        </section>

        <Diagnostico />
      </div>
    </main>
  );
}

/**
 * O aviso que mais importa nesta tela.
 *
 * Enquanto `KAROL_WHATSAPP` existir na Vercel, a Karol não recebe
 * agendamento nenhum — tudo cai no telefone de quem estava testando. Isso
 * some sem ninguém perceber por semanas, porque nada quebra.
 */
function Desvio({ numero }: { numero: string }) {
  return (
    <section className="border-l-2 border-[#c0632f] bg-[#fbf1ea] px-4 py-3.5">
      <p className="text-[14px] leading-relaxed text-tinta">
        <b>⚠️ Os avisos NÃO estão indo pra Karol.</b> Estão indo pro{" "}
        {formatarWhatsapp(numero)}, por causa da variável <code>KAROL_WHATSAPP</code>,
        usada pra testar sem incomodar ela. Enquanto isso estiver aqui,{" "}
        <b>ela não recebe agendamento nenhum</b>. Apague a variável na Vercel
        quando for pra valer.
      </p>
    </section>
  );
}

/**
 * Quem está com a janela de 24 h aberta.
 *
 * A regra da Meta: mensagem só é livre e grátis nas 24 h seguintes à última
 * mensagem DA PESSOA. Cada mensagem nova dela reabre por mais 24 h. Fora
 * disso só passa template aprovado, e template custa.
 *
 * Por isso o tempo restante aparece: é a diferença entre resolver agora, de
 * graça, e ter que esperar a pessoa escrever de novo.
 */
function ConversasAbertas({ conversas }: { conversas: Conversa[] }) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">
        Conversas abertas
      </h2>
      <p className="mb-3 text-[13.5px] text-tinta-2">
        Quem te escreveu nas últimas 24 horas. Enquanto a conversa está aberta,
        você pode mandar mensagem por aqui à vontade, sem custo nenhum.
      </p>

      {conversas.length === 0 ? (
        <p className="border border-linha bg-papel p-5 text-[14px] text-tinta-2">
          Nenhuma conversa aberta agora. Elas aparecem aqui assim que alguma
          cliente te manda mensagem.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversas.map((c) => (
            <li
              key={c.whatsapp}
              className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border border-linha bg-papel px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-titulo text-[19px] leading-tight">
                  {formatarWhatsapp(c.whatsapp)}
                </p>
                {c.ultimaMensagem && (
                  <p className="mt-1 line-clamp-2 border-l-2 border-linha pl-2.5 text-[13px] text-tinta-2">
                    {c.ultimaMensagem}
                  </p>
                )}
                <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-tinta-3">
                  Fecha em {tempoRestante(c.minutosRestantes)}
                </p>
              </div>
              <a
                href={`https://wa.me/${c.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] shrink-0 items-center border border-linha px-4 text-[10.5px] font-bold uppercase tracking-[0.12em] text-tinta-2 transition-colors hover:border-ouro-claro hover:text-ouro"
              >
                Responder
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "3 h 20 min", "45 min". Sem segundos — ninguém decide nada com segundo. */
function tempoRestante(minutos: number): string {
  if (minutos < 60) return `${Math.max(minutos, 1)} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * O rodapé técnico. Fica por último e fica fechado.
 *
 * Isto não é pra Karol — é pra quem for consertar quando ela disser "a
 * cliente não recebeu". Deixar aberto no meio da tela era o que fazia a
 * página inteira parecer painel de servidor.
 */
function Diagnostico() {
  const temMeta = metaConfigurada();
  const temWebhook = notificadorConfigurado();

  return (
    <details className="border border-linha bg-papel">
      <summary className="cursor-pointer list-none px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-tinta-3 hover:text-ouro">
        Se alguma mensagem não estiver chegando ▾
      </summary>

      <div className="border-t border-linha px-5 py-4">
        <ul className="flex flex-col gap-2 text-[13.5px]">
          <Estado ok={temMeta || temWebhook}>
            {temMeta
              ? "As mensagens saem pelo WhatsApp oficial"
              : temWebhook
                ? "As mensagens saem por um serviço externo"
                : "Nada está saindo — falta ligar o WhatsApp (META_TOKEN)"}
          </Estado>
          <Estado ok={recebimentoConfigurado()}>
            {recebimentoConfigurado()
              ? "O que a cliente responde chega até aqui"
              : "O que a cliente responde NÃO chega (falta META_APP_SECRET)"}
          </Estado>
          <Estado ok={Boolean(process.env.CRON_SECRET)}>
            {process.env.CRON_SECRET
              ? "Os lembretes automáticos estão habilitados"
              : "Os lembretes automáticos estão desligados (falta CRON_SECRET)"}
          </Estado>
        </ul>

        <p className="mt-4 mb-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-tinta-3">
          Mensagens ligadas
        </p>
        <ul className="flex flex-col gap-1.5 text-[13.5px]">
          {AVISOS.map((a) => (
            <Estado key={a.chave} ok={NOTIFICACOES[a.chave]}>
              {a.texto}
            </Estado>
          ))}
        </ul>

        <p className="mt-4 text-[12.5px] text-tinta-3">
          {avisosDesviadosPara()
            ? "Os avisos estão desviados — ver o quadro laranja no topo."
            : `Os avisos vão pro ${formatarWhatsapp(whatsappDaKarol())}.`}{" "}
          Para mudar o que é enviado, edite <code>NOTIFICACOES</code> em{" "}
          <code>src/data/negocio.ts</code>.
        </p>
      </div>
    </details>
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
