import Link from "next/link";
import type { Metadata } from "next";
import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Env } from "@/components/ui";
import { NEGOCIO } from "@/data/negocio";
import { linkWhatsapp } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Privacidade",
  description:
    "Como o Studio Karol Carvalho trata os dados que você informa ao agendar pelo site.",
};

const ATUALIZADO = "3 de setembro de 2026";

export default function Privacidade() {
  return (
    <>
      <Cabecalho />
      <main className="flex-1 bg-osso pb-24 lg:pb-0">
        <Env className="py-14 lg:py-20">
          <article className="mx-auto max-w-[680px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-ouro">
              Política de privacidade
            </p>
            <h1 className="mt-2.5 mb-2 font-titulo text-[clamp(32px,6vw,48px)] leading-[1.05] font-light">
              Seus dados no agendamento
            </h1>
            <p className="mb-10 text-[13px] text-tinta-3">Atualizada em {ATUALIZADO}</p>

            <Secao titulo="Quem trata os dados">
              <p>
                {NEGOCIO.profissional} ({NEGOCIO.nome}), maquiadora e designer de
                sobrancelhas em {NEGOCIO.atuacaoCidades}. Contato pelo WhatsApp{" "}
                {NEGOCIO.whatsapp.exibicao}.
              </p>
            </Secao>

            <Secao titulo="O que é coletado">
              <p>Só o necessário para marcar e cuidar do seu horário:</p>
              <ul>
                <li><b>Nome</b> e <b>número de WhatsApp</b>, informados por você no agendamento;</li>
                <li>o <b>serviço, dia, horário e cidade</b> escolhidos;</li>
                <li>um <b>recado</b>, se você escrever um (campo opcional).</li>
              </ul>
              <p>
                O site não usa cookies de rastreamento, nem ferramentas de
                análise, nem redes de anúncio. Não há perfilamento.
              </p>
            </Secao>

            <Secao titulo="Para que é usado">
              <p>
                Para confirmar o agendamento, te lembrar do horário no dia
                anterior e falar com você sobre esse atendimento. Nada além
                disso. Você não recebe propaganda por ter agendado.
              </p>
            </Secao>

            <Secao titulo="Com quem é compartilhado">
              <p>
                Com ninguém para fins comerciais. Os dados ficam num banco de
                dados em nuvem (Supabase) usado só para a agenda, e as mensagens
                de confirmação e lembrete são enviadas pelo WhatsApp. Não há
                venda nem troca de dados com terceiros.
              </p>
            </Secao>

            <Secao titulo="Por quanto tempo">
              <p>
                O histórico de agendamentos é mantido enquanto a relação de
                atendimento existir, para referência de atendimentos anteriores.
                Você pode pedir a exclusão a qualquer momento.
              </p>
            </Secao>

            <Secao titulo="Seus direitos">
              <p>
                Você pode pedir para ver, corrigir ou apagar seus dados, ou tirar
                dúvidas sobre este texto. É só{" "}
                <a
                  href={linkWhatsapp("Oi Karol! Tenho uma dúvida sobre os meus dados no site.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-ouro underline decoration-ouro-claro underline-offset-2"
                >
                  chamar no WhatsApp
                </a>
                . O atendimento é direto com a Karol.
              </p>
            </Secao>

            <Secao titulo="Mudanças">
              <p>
                Se este texto mudar, a data no topo é atualizada. A versão
                vigente é sempre a que está nesta página.
              </p>
            </Secao>

            <p className="mt-12 border-t border-linha pt-6 text-[13px] text-tinta-3">
              <Link href="/agendar" className="text-ouro underline decoration-ouro-claro underline-offset-2">
                Voltar para o agendamento
              </Link>
            </p>
          </article>
        </Env>
      </main>
      <Rodape />
      <BarraMobile />
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2.5 font-titulo text-[24px] font-light">{titulo}</h2>
      <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-tinta-2 [&_li]:ml-4 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}
