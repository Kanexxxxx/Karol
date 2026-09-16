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
 * ---------------------------------------------------------------------
 * ⚠️ O QUE NÃO PODE SAIR DAQUI, por mais que assuste
 * ---------------------------------------------------------------------
 *
 * Em 16/09/2026 o Kainã pediu pra deixar esta página "bonita e acessível,
 * sem mencionar nada". A metade boa do pedido está feita: o texto foi
 * reescrito pra ser calmo, curto e legível por qualquer pessoa.
 *
 * A outra metade não dá, e o motivo é proteger a KAROL:
 *
 * - **transferência internacional** (art. 33) e
 * - **o tratamento por inteligência artificial**, que recebe nome e
 *   horário de cliente,
 *
 * são informações que a lei obriga a declarar. Quem responde por isso é
 * ela, como controladora. Uma política que escondeu é muito pior, numa
 * reclamação na ANPD, do que uma que disse.
 *
 * O que MUDOU foi o jeito de dizer. Antes: "esses fornecedores têm
 * servidores fora do Brasil — a DeepSeek, na China". Verdadeiro e
 * assustador pra quem só quer marcar sobrancelha. Agora a mesma
 * informação aparece com o PORQUÊ do lado, que é o que tira o susto sem
 * tirar a verdade.
 *
 * ---------------------------------------------------------------------
 * Este texto precisa acompanhar o código
 * ---------------------------------------------------------------------
 *
 * Se entrar um fornecedor novo que toque em dado de cliente, ele entra na
 * seção "Quem ajuda o site a funcionar" — e a data muda.
 *
 * O que continua fora de propósito: afirmação que não dá pra sustentar,
 * como a região exata dos servidores de cada empresa. Está escrito o que
 * é verdade sobre ESTE site.
 */
const ATUALIZADO = "16 de setembro de 2026";

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
            <h1 className="mt-2.5 mb-3 font-titulo text-[clamp(32px,6vw,48px)] leading-[1.05] font-light">
              O que acontece com os seus dados
            </h1>
            <p className="mb-9 text-[13px] text-tinta-3">
              Atualizada em {ATUALIZADO} · Lei Geral de Proteção de Dados (13.709/2018)
            </p>

            {/*
              O RESUMO VEM PRIMEIRO, e é a mudança que mais importa nesta
              página. Quase ninguém lê política de privacidade inteira —
              quem abre quer saber três coisas e ir embora tranquila.

              Se ela ler só este quadro, já sabe o essencial. O resto está
              abaixo pra quem quiser conferir.
            */}
            <div className="mb-11 border-l-2 border-ouro-claro bg-creme px-5 py-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ouro">
                Em três linhas
              </p>
              <ul className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-tinta">
                <li>
                  Pedimos só <b>nome e WhatsApp</b> — o necessário pra marcar e
                  falar com você.
                </li>
                <li>
                  Servem <b>só pro seu atendimento</b>. Sem propaganda, sem venda
                  de dados, sem rastreamento.
                </li>
                <li>
                  Você pode <b>ver, corrigir ou apagar</b> tudo quando quiser. É
                  só pedir no WhatsApp.
                </li>
              </ul>
            </div>

            <Secao titulo="Quem cuida disso">
              <p>
                {NEGOCIO.profissional}, do {NEGOCIO.nome}, em{" "}
                {NEGOCIO.atuacaoCidades}. É ela quem responde por esses dados, e
                quem fala com você sobre eles — pelo WhatsApp{" "}
                <b>{NEGOCIO.whatsapp.exibicao}</b>.
              </p>
            </Secao>

            <Secao titulo="O que a gente guarda">
              <ul>
                <li>seu <b>nome</b> e seu <b>WhatsApp</b>;</li>
                <li>o <b>serviço, o dia, a hora e a cidade</b> que você escolheu;</li>
                <li>o <b>recado</b>, se você escrever um — é opcional;</li>
                <li>as <b>mensagens</b> que você troca com o studio.</li>
              </ul>
              <p>
                Só isso. O site não usa cookie de rastreamento, não tem
                ferramenta de análise e não tem anúncio.
              </p>
            </Secao>

            <Secao titulo="Pra que usamos">
              <p>
                Pra cuidar do seu horário: confirmar, lembrar na véspera, avisar
                se algo mudar e agradecer depois. Nada além disso — você não
                entra em lista de propaganda por ter marcado.
              </p>
              <p className="text-[13.5px] text-tinta-3">
                Na linguagem da lei: é o necessário pra executar o serviço que
                você pediu (art. 7º, V).
              </p>
            </Secao>

            <Secao titulo="O pagamento da entrada">
              <p>
                Alguns serviços pedem uma entrada por PIX. Você paga no
                aplicativo do seu banco, direto pra conta da Karol — o site só
                mostra a chave e o QR Code.
              </p>
              <p>
                <b>Nenhum dado do seu banco passa pelo site nem fica guardado
                aqui.</b>
              </p>
            </Secao>

            {/*
              ⚠️ A SEÇÃO QUE A LEI OBRIGA, dita sem susto.

              O nome das empresas e o fato de os servidores ficarem fora do
              Brasil precisam estar aqui (art. 33). O que muda é que cada
              uma vem com o PORQUÊ do lado — "onde a agenda fica guardada"
              explica mais a uma cliente do que o nome "Supabase", e
              transforma uma lista de empresas estrangeiras numa lista de
              coisas que fazem o horário dela funcionar.
            */}
            <Secao titulo="Quem ajuda o site a funcionar">
              <p>
                Ninguém compra nem recebe seus dados pra vender nada. Algumas
                empresas participam porque sem elas o site não existe:
              </p>
              <ul>
                <li>
                  quem <b>guarda a agenda</b> e mantém o site no ar;
                </li>
                <li>
                  o <b>WhatsApp</b>, que entrega as mensagens de confirmação e
                  lembrete;
                </li>
                <li>
                  um <b>assistente de inteligência artificial</b>, que ajuda a
                  Karol a organizar a agenda. Quando ela pergunta sobre um dia,
                  o nome e o horário de quem tem hora marcada podem aparecer na
                  resposta.
                </li>
              </ul>
              <p className="text-[13.5px] text-tinta-3">
                Essas empresas são <b>Supabase</b>, <b>Vercel</b>, <b>Meta</b> e{" "}
                <b>DeepSeek</b>, e seus servidores ficam fora do Brasil — o que a
                lei chama de transferência internacional (art. 33). Acontece só
                pra fazer o que está descrito aqui.
              </p>
            </Secao>

            <Secao titulo="Por quanto tempo">
              <p>
                O histórico fica guardado enquanto você for cliente, pra Karol
                saber o que já foi feito em você e cuidar melhor do próximo
                atendimento. Quiser apagar antes, é só pedir.
              </p>
            </Secao>

            <Secao titulo="O que você pode pedir">
              <p>
                Ver seus dados, corrigir, apagar, ou saber com quem foram
                compartilhados (art. 18). Sem burocracia e sem precisar
                justificar:
              </p>
              <p>
                <a
                  href={linkWhatsapp("Oi Karol! Tenho uma dúvida sobre os meus dados no site.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center border border-ouro-claro bg-papel px-5 text-[14px] font-semibold text-ouro transition-colors hover:bg-ouro-fundo"
                >
                  Falar com a Karol no WhatsApp
                </a>
              </p>
              <p className="text-[13.5px] text-tinta-3">
                Se achar que seus direitos não foram respeitados, você também
                pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).
              </p>
            </Secao>

            <Secao titulo="Segurança">
              <p>
                A conexão com o site é criptografada, e a agenda só pode ser
                aberta pela Karol, com senha.
              </p>
            </Secao>

            <Secao titulo="Se este texto mudar">
              <p>
                A data lá em cima muda junto. A versão que vale é sempre a desta
                página.
              </p>
            </Secao>

            <p className="mt-12 border-t border-linha pt-6 text-[13px] text-tinta-3">
              <Link
                href="/agendar"
                className="text-ouro underline decoration-ouro-claro underline-offset-2"
              >
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
    <section className="mb-9">
      <h2 className="mb-2.5 font-titulo text-[24px] font-light">{titulo}</h2>
      <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-tinta-2 [&_li]:ml-4 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}
