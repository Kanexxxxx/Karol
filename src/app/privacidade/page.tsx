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
    "Como o Studio Karol Carvalho trata os dados que você informa ao agendar pelo site, conforme a LGPD.",
};

/**
 * Política de privacidade (LGPD, Lei 13.709/2018).
 *
 * ⚠️ ESTE TEXTO PRECISA ACOMPANHAR O CÓDIGO. Na revisão de 11/09/2026 ele
 * estava dizendo menos do que o site faz: não citava a Meta (que entrega
 * as mensagens), nem o PIX, nem o assistente de IA — e o assistente manda
 * nome e telefone de cliente pra DeepSeek, uma empresa na China. A LGPD
 * exige que transferência internacional seja informada (art. 33).
 *
 * Se entrar um fornecedor novo que recebe dado de cliente, ele entra na
 * seção "Com quem os dados passam" — e a data de atualização muda.
 *
 * O que NÃO está aqui de propósito: afirmações que eu não consigo
 * sustentar, como a região exata dos servidores de cada fornecedor ou o
 * que cada um faz internamente com o dado. Está escrito o que é verdade
 * sobre ESTE site.
 */
const ATUALIZADO = "11 de setembro de 2026";

export default function Privacidade() {
  return (
    <>
      <Cabecalho />
      <main className="flex-1 bg-osso pb-24 lg:pb-0">
        <Env className="py-14 lg:py-20">
          <article className="mx-auto max-w-[680px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-ouro">
              Política de privacidade · LGPD
            </p>
            <h1 className="mt-2.5 mb-2 font-titulo text-[clamp(32px,6vw,48px)] leading-[1.05] font-light">
              Seus dados no agendamento
            </h1>
            <p className="mb-10 text-[13px] text-tinta-3">Atualizada em {ATUALIZADO}</p>

            <Secao titulo="Em poucas palavras">
              <p>
                Você informa seu nome e seu WhatsApp pra marcar um horário. Eles
                servem pra isso e pra mais nada: confirmar, lembrar e falar com
                você sobre o atendimento. Não tem propaganda, não tem venda de
                dados, não tem rastreamento.
              </p>
            </Secao>

            <Secao titulo="Quem é a responsável">
              <p>
                {NEGOCIO.profissional} ({NEGOCIO.nome}), maquiadora e designer de
                sobrancelhas em {NEGOCIO.atuacaoCidades}, é a controladora dos
                dados. O contato pra qualquer assunto sobre eles é o WhatsApp{" "}
                {NEGOCIO.whatsapp.exibicao}, atendido direto por ela.
              </p>
            </Secao>

            <Secao titulo="O que é coletado">
              <ul>
                <li><b>Nome</b> e <b>número de WhatsApp</b>, que você digita ao agendar;</li>
                <li>o <b>serviço, dia, horário e cidade</b> escolhidos;</li>
                <li>um <b>recado</b>, se você escrever um (é opcional);</li>
                <li>as <b>mensagens que você troca</b> com o studio pelo WhatsApp.</li>
              </ul>
              <p>
                O site <b>não</b> usa cookies de rastreamento, ferramentas de
                análise nem redes de anúncio. O único cookie que existe é o de
                login do painel, e ele só é criado pra própria Karol.
              </p>
            </Secao>

            <Secao titulo="Pagamento do sinal">
              <p>
                Alguns serviços pedem um sinal por PIX. O pagamento é feito no
                app do seu banco, direto pra conta da Karol — o site só mostra a
                chave e o QR Code com o valor. <b>Nenhum dado bancário seu passa
                pelo site ou fica guardado nele.</b> O comprovante que você manda
                pelo WhatsApp fica na conversa, como qualquer outra mensagem.
              </p>
            </Secao>

            <Secao titulo="Para que é usado, e com que base">
              <p>
                Pra marcar e cuidar do seu atendimento: confirmar o horário,
                mandar o lembrete na véspera e perto da hora, avisar se algo
                mudar e agradecer depois. A base legal é a execução do serviço
                que você pediu (LGPD, art. 7º, inciso V). Você não recebe
                propaganda por ter agendado.
              </p>
            </Secao>

            <Secao titulo="Com quem os dados passam">
              <p>
                Ninguém compra nem recebe seus dados pra fins comerciais. Pro
                site funcionar, alguns fornecedores precisam tocar neles, só
                pra fazer o serviço deles:
              </p>
              <ul>
                <li><b>Supabase</b> — o banco de dados onde a agenda fica guardada;</li>
                <li><b>Vercel</b> — onde o site fica hospedado;</li>
                <li><b>Meta (WhatsApp)</b> — que entrega as mensagens de confirmação e lembrete;</li>
                <li>
                  <b>DeepSeek</b> — um assistente de inteligência artificial que a
                  Karol usa pra consultar e organizar a própria agenda pelo
                  WhatsApp. Quando ela pergunta algo, nome, telefone e horário
                  das clientes daquele dia podem ser enviados a ele pra montar a
                  resposta.
                </li>
              </ul>
              <p>
                Esses fornecedores têm servidores <b>fora do Brasil</b> — a
                DeepSeek, na China. Essa transferência internacional acontece só
                pra prestar o serviço descrito aqui (LGPD, art. 33).
              </p>
            </Secao>

            <Secao titulo="Por quanto tempo">
              <p>
                O histórico de agendamentos fica guardado enquanto você for
                cliente, pra Karol saber o que já foi feito em você. Você pode
                pedir a exclusão quando quiser.
              </p>
            </Secao>

            <Secao titulo="Seus direitos">
              <p>
                Você pode pedir pra ver, corrigir ou apagar seus dados, saber com
                quem eles foram compartilhados, ou tirar qualquer dúvida sobre
                este texto (LGPD, art. 18). É só{" "}
                <a
                  href={linkWhatsapp("Oi Karol! Tenho uma dúvida sobre os meus dados no site.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-ouro underline decoration-ouro-claro underline-offset-2"
                >
                  chamar no WhatsApp
                </a>
                . Se achar que seus direitos não foram respeitados, você também
                pode reclamar na Autoridade Nacional de Proteção de Dados (ANPD).
              </p>
            </Secao>

            <Secao titulo="Segurança">
              <p>
                A agenda só é acessível pelo painel, com senha, e a conexão com o
                site é sempre criptografada (HTTPS). O banco de dados não aceita
                leitura pública: só o servidor do site consegue consultar.
              </p>
            </Secao>

            <Secao titulo="Mudanças">
              <p>
                Se este texto mudar, a data no topo é atualizada. A versão que
                vale é sempre a desta página.
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
