import Image from "next/image";
import type { Metadata } from "next";
import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Botao, Env, Revela, Rotulo } from "@/components/ui";
import { FOTOS } from "@/data/fotos";
import { CIDADES, NEGOCIO, REGRAS, type CidadeId } from "@/data/negocio";
import { SERVICOS } from "@/data/servicos";
import { faixaDeDias, janelaDaCidade } from "@/lib/agenda";

/**
 * A página da Karol.
 *
 * O resto do site mostra o trabalho dela. Faltava mostrar ELA — num negócio
 * em que a cliente senta numa cadeira e entrega o rosto, saber quem vai
 * atender pesa tanto quanto qualquer antes e depois.
 *
 * ⚠️ Tudo que está escrito aqui saiu da boca dela: as duas citações são de
 * reels do perfil, e o parágrafo de abertura é a resposta literal dela no
 * briefing à pergunta "o que você faz?". Não invente biografia nesta
 * página. Se for preciso acrescentar (ano em que começou, quantas alunas já
 * formou), pergunte a ela primeiro — é a página que leva o nome dela.
 *
 * As duas fotos são do mesmo ensaio de estúdio: a capa que ela não escolheu
 * pra abertura (`capaReserva`) e a da paleta, que a Karol pediu pra tirar do
 * cartão do curso.
 */

export const metadata: Metadata = {
  title: "A Karol",
  description: `${NEGOCIO.profissional}, maquiadora e designer de sobrancelhas em ${NEGOCIO.atuacaoCidades}. Uma cliente por vez, do começo ao fim.`,
  openGraph: {
    title: `A Karol · ${NEGOCIO.nome}`,
    description: NEGOCIO.frase,
    images: [FOTOS.capaReserva.arquivo],
  },
};

const cidades = Object.entries(CIDADES) as [CidadeId, (typeof CIDADES)[CidadeId]][];

export default function Sobre() {
  return (
    <>
      <Cabecalho />
      <main className="flex-1 pb-20 lg:pb-0">
        <Abertura />
        <Comeco />
        <Trabalho />
        <Numeros />
        <Assinatura />
        <Fecho />
      </main>
      <Rodape />
      <BarraMobile />
    </>
  );
}

/** Nome, foto inteira e a frase dela. No celular a foto vem primeiro. */
function Abertura() {
  const foto = FOTOS.capaReserva;

  return (
    <section className="bg-creme">
      <Env className="grid items-center gap-8 py-10 lg:grid-cols-[1fr_0.82fr] lg:gap-16 lg:py-20">
        {/* `order` inverte só no computador: no celular a foto abre a página. */}
        <Revela className="lg:order-2">
          <Image
            src={foto.arquivo}
            alt={foto.alt}
            width={foto.largura}
            height={foto.altura}
            priority
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="aspect-4/5 w-full object-cover object-[center_18%] outline outline-linha lg:aspect-auto"
          />
        </Revela>

        <Revela className="lg:order-1">
          <Rotulo>Quem faz</Rotulo>
          <h1 className="mt-3 mb-5 font-titulo text-[clamp(40px,10vw,84px)] leading-[0.95] font-light">
            Karol
            <br />
            <em className="text-ouro italic">Carvalho</em>
          </h1>
          <p className="max-w-[46ch] text-[clamp(15.5px,4vw,19px)] leading-relaxed text-tinta-2">
            {NEGOCIO.frase}
          </p>
          {/* Fecha a coluna: sem isto o texto fica boiando ao lado da foto. */}
          <p className="mt-7 border-t border-linha pt-5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-tinta-3">
            {NEGOCIO.atuacaoCidades.replace(", São Paulo", "")}
          </p>
        </Revela>
      </Env>
    </section>
  );
}

/** De onde ela veio — na frase dela, que é melhor que qualquer texto meu. */
function Comeco() {
  return (
    <section className="border-y border-linha bg-osso py-14 lg:py-20">
      <Env>
        <Revela className="mx-auto max-w-[720px]">
          <Rotulo>O começo</Rotulo>
          <blockquote className="mt-4 mb-7 font-titulo text-[clamp(26px,6vw,46px)] leading-[1.14] font-light italic text-balance">
            “{NEGOCIO.lemaCurso}”
          </blockquote>
          <div className="flex flex-col gap-4 text-[16.5px] leading-relaxed text-tinta-2">
            <p>
              Ela começou como aluna. Hoje é ela quem assina o certificado — e o
              curso de automaquiagem que ela dá é individual, uma aluna por vez,
              do zero até a pessoa conseguir se maquiar sozinha.
            </p>
            <p>
              É a mesma coisa que ela faz na cadeira, do outro lado: sobrancelha
              e maquiagem não são o produto. O que sai dali é a pessoa se
              olhando no espelho de outro jeito.
            </p>
          </div>
        </Revela>
      </Env>
    </section>
  );
}

/** Como ela trabalha — os dias vêm do motor da agenda, não de texto solto. */
function Trabalho() {
  return (
    <section className="py-14 lg:py-20">
      <Env className="grid items-center gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <Revela>
          <Image
            src={FOTOS.paleta.arquivo}
            alt={FOTOS.paleta.alt}
            width={FOTOS.paleta.largura}
            height={FOTOS.paleta.altura}
            sizes="(min-width: 1024px) 54vw, 100vw"
            /* A foto tem muito fundo cinza sobrando dos lados. O 4/3 corta
               isso no CSS, sem mexer no arquivo — o navegador continua
               baixando os 1200 px e ela ocupa mais o quadro. */
            className="aspect-4/3 w-full object-cover outline outline-linha"
          />
        </Revela>

        <Revela>
          <Rotulo>Como ela atende</Rotulo>
          <h2 className="mt-2.5 mb-5 font-titulo text-[clamp(28px,5.6vw,44px)] leading-[1.05] font-light text-balance">
            Duas cidades, uma cliente por vez
          </h2>
          <p className="mb-6 text-tinta-2">
            Sobrancelha feminina e masculina, henna, brow lamination, maquiagem
            social e o curso. Ela atende sozinha, do começo ao fim de cada
            atendimento — por isso a agenda do site só oferece horário que
            existe de verdade.
          </p>

          <dl className="flex flex-col gap-px bg-linha outline outline-linha">
            {cidades.map(([id, cidade]) => (
              <div key={id} className="bg-papel px-5 py-4">
                <dt className="font-titulo text-[23px] leading-tight font-light">
                  {cidade.nome}
                </dt>
                <dd className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ouro">
                  {faixaDeDias(id)} · {janelaDaCidade(id)}
                </dd>
              </div>
            ))}
          </dl>
        </Revela>
      </Env>
    </section>
  );
}

/**
 * Três números, todos tirados dos dados — nada de "mais de 500 clientes".
 *
 * Se um serviço for criado ou uma cidade entrar, o número muda sozinho.
 */
function Numeros() {
  const numeros = [
    { valor: String(cidades.length), rotulo: "Cidades" },
    { valor: String(SERVICOS.length), rotulo: "Serviços" },
    { valor: String(REGRAS.atendimentosSimultaneos), rotulo: "Cliente por vez" },
  ];

  return (
    <div className="border-y border-linha bg-papel">
      <Env>
        <dl className="grid grid-cols-3">
          {numeros.map((n, i) => (
            <div
              key={n.rotulo}
              className={`px-2 py-8 text-center lg:py-11 ${i > 0 ? "border-l border-linha" : ""}`}
            >
              <dt className="font-titulo text-[clamp(38px,9vw,60px)] leading-none font-light text-ouro">
                {n.valor}
              </dt>
              <dd className="mt-2 text-[9.5px] font-bold uppercase tracking-[0.18em] text-tinta-2">
                {n.rotulo}
              </dd>
            </div>
          ))}
        </dl>
      </Env>
    </div>
  );
}

/** A frase que ela usa pra se apresentar. É o fecho da história. */
function Assinatura() {
  return (
    <section className="bg-creme py-16 text-center lg:py-24">
      <Env>
        <Revela>
          <blockquote className="mx-auto max-w-[20ch] font-titulo text-[clamp(30px,7.4vw,58px)] leading-[1.1] font-light italic text-balance">
            {NEGOCIO.lema}
          </blockquote>
          <p className="mt-6 text-[9.5px] font-bold uppercase tracking-[0.28em] text-ouro">
            Karol Carvalho
          </p>
        </Revela>
      </Env>
    </section>
  );
}

/** Sair daqui pra algum lugar: marcar horário ou seguir o perfil. */
function Fecho() {
  const perfis = [
    { arroba: NEGOCIO.instagram.studio, papel: "o studio" },
    { arroba: NEGOCIO.instagram.pessoal, papel: "o dia a dia dela" },
  ];

  return (
    <section className="bg-ouro py-14 text-center text-white lg:py-20">
      <Env>
        <Revela>
          <h2 className="mb-3.5 font-titulo text-[clamp(32px,6.4vw,54px)] leading-none font-light">
            Quer marcar com ela?
          </h2>
          <p className="mx-auto mb-7 max-w-[42ch] text-[#F4E7CC]">
            Escolha o serviço, a cidade e o horário. Leva menos de um minuto.
          </p>
          <Botao href="/agendar" variante="claro">
            Agendar meu horário
          </Botao>

          {/*
            Dois blocos tocáveis em vez de dois links de texto: no celular o
            arroba dela é comprido e um link solto vira alvo pequeno demais.
          */}
          <ul className="mx-auto mt-10 grid max-w-[520px] gap-2.5 border-t border-white/25 pt-8 sm:grid-cols-2">
            {perfis.map((p) => (
              <li key={p.arroba}>
                <a
                  href={`https://instagram.com/${p.arroba}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[58px] flex-col items-center justify-center gap-0.5 border border-white/35 px-4 py-3 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span className="text-[13.5px] leading-tight break-all text-white">
                    @{p.arroba}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#EBD9B4]">
                    {p.papel}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Revela>
      </Env>
    </section>
  );
}
