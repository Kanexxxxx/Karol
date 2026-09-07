import Image from "next/image";
import type { Metadata } from "next";
import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Botao, Env, Revela, Rotulo } from "@/components/ui";
import { FOTOS } from "@/data/fotos";
import { CIDADES, NEGOCIO, type CidadeId } from "@/data/negocio";
import { SERVICOS, formatarPreco } from "@/data/servicos";
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
 * ---------------------------------------------------------------------
 * A reforma de 07/09/2026 — o que estava errado e não pode voltar
 * ---------------------------------------------------------------------
 *
 * 1. **As fotos estavam cortadas.** `karol-paleta.jpg` é 1200×800 (3:2) e a
 *    página forçava `aspect-4/3` — o corte comia a paleta que ela segura na
 *    borda direita, que é o assunto da foto. Agora as duas aparecem na
 *    proporção do arquivo, sem `object-cover` decidindo o enquadramento.
 *
 * 2. **A faixa de números saiu.** "2 Cidades · 6 Serviços · 1 Cliente por
 *    vez" era número trivial vestido de conquista, e era o que mais dava
 *    cara de site genérico. No lugar entrou informação que a cliente usa:
 *    onde ela está em cada dia da semana, tirado do motor da agenda.
 *
 * 3. **O ritmo era o mesmo seis vezes.** Rótulo → título → parágrafo, de
 *    cima a baixo. Agora a página tem quatro andamentos diferentes: capa,
 *    fita em movimento, matéria de leitura com citação estourando a
 *    margem, e tijolos.
 *
 * A linguagem visual veio das referências que o Kainã mandou (uiverse.io,
 * 21st.dev, reactbits.dev), **reescrita em CSS na mão**. Nenhuma biblioteca
 * entrou: as três servem componente React que traz `framer-motion` ou `gsap`
 * junto, e isso são centenas de KB no celular de uma cliente pra fazer uma
 * palavra subir na tela. O projeto tem quatro dependências e continua com
 * quatro.
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
        <Capa />
        <Fita />
        <Materia />
        <Tijolos />
        <Fecho />
      </main>
      <Rodape />
      <BarraMobile />
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Capa de revista: nome grande à esquerda, retrato INTEIRO à direita.
 *
 * ⚠️ A foto não é cortada. É um retrato de corpo inteiro de estúdio, e
 * espremer isso num quadrado era o que fazia a página parecer descuidada.
 * O `bg-creme` com respiro em volta é o que dá o ar de página impressa —
 * a moldura faz o trabalho que o corte fazia, sem perder a foto.
 *
 * No celular a foto vem primeiro (`order`), porque é ela que segura a
 * atenção antes de qualquer texto.
 */
function Capa() {
  const foto = FOTOS.capaReserva;

  return (
    <section className="bg-osso">
      <Env className="grid items-end gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
        <Revela className="lg:order-2">
          <div className="bg-creme p-4 outline outline-linha lg:p-7">
            <Image
              src={foto.arquivo}
              alt={foto.alt}
              width={foto.largura}
              height={foto.altura}
              priority
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="h-auto w-full"
            />
          </div>
        </Revela>

        <Revela className="lg:order-1">
          <Rotulo>Quem faz</Rotulo>
          <h1 className="mt-3.5 mb-0 font-titulo text-[clamp(56px,13vw,124px)] leading-[0.84] font-light tracking-[-0.015em]">
            Karol
            {/* o sobrenome recua: é o desalinho de capa de revista, e é o
                único gesto tipográfico da página — o resto é alinhado */}
            <em className="ml-[0.12em] block text-ouro italic">Carvalho</em>
          </h1>

          <p className="mt-6 max-w-[30ch] border-t border-linha pt-5 font-titulo text-[clamp(19px,2.4vw,26px)] leading-[1.38] text-tinta-2">
            {NEGOCIO.frase}
          </p>

          <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-[9.5px] font-bold uppercase tracking-[0.2em] text-tinta-3">
            {cidades.map(([id, c]) => (
              <span key={id}>{c.nome}</span>
            ))}
            <span>São Paulo</span>
          </p>
        </Revela>
      </Env>
    </section>
  );
}

/**
 * A frase dela correndo numa fita dourada.
 *
 * Reaproveita o `desliza` da esteira de fotos da home — mesma animação,
 * mesmo vocabulário de movimento. É o único movimento contínuo da página, e
 * leva palavra dela, não decoração.
 *
 * O trilho é duplicado e anda até -50%: é o que faz o laço não ter emenda
 * visível. `aria-hidden` porque a mesma frase é lida logo abaixo, e um
 * leitor de tela repetindo texto em loop é ruído.
 */
function Fita() {
  const frase = NEGOCIO.lema;

  return (
    <section className="overflow-hidden bg-ouro py-4 lg:py-5">
      <div
        aria-hidden="true"
        className="flex w-max motion-safe:animate-[desliza_38s_linear_infinite]"
      >
        {[0, 1].map((i) => (
          <p
            key={i}
            className="m-0 whitespace-nowrap font-titulo text-[clamp(24px,3.6vw,40px)] leading-tight font-light italic text-osso"
          >
            {frase}
            <span className="px-[0.7em] not-italic text-ouro-luz">✦</span>
            {frase}
            <span className="px-[0.7em] not-italic text-ouro-luz">✦</span>
          </p>
        ))}
      </div>
    </section>
  );
}

/**
 * A matéria: coluna de leitura estreita, com o nome dela deitado num
 * trilho fixo ao lado.
 *
 * O trilho só existe no computador. No celular ele roubaria largura da
 * leitura, que é a única coisa que importa nesta seção.
 */
function Materia() {
  return (
    <section className="py-14 lg:py-20">
      <Env className="grid gap-7 lg:grid-cols-[108px_minmax(0,1fr)] lg:gap-13">
        <p
          aria-hidden="true"
          className="hidden text-[10px] font-bold uppercase tracking-[0.42em] whitespace-nowrap text-tinta-3 lg:sticky lg:top-24 lg:block lg:self-start lg:[writing-mode:vertical-rl]"
        >
          {NEGOCIO.profissional} · {NEGOCIO.nome}
        </p>

        <div className="max-w-[62ch]">
          <Revela>
            <Rotulo>O começo</Rotulo>

            {/* A capitular é o detalhe que muda o caráter do primeiro
                parágrafo inteiro, e custa uma linha de CSS. */}
            <p className="mt-4 text-[17px] leading-[1.72] text-tinta-2 first-letter:float-left first-letter:pt-[0.06em] first-letter:pr-[0.11em] first-letter:font-titulo first-letter:text-[4.15em] first-letter:leading-[0.78] first-letter:text-ouro">
              Ela começou como aluna. Fez o curso de design de sobrancelha sem
              saber direito onde aquilo ia dar, e hoje é ela quem assina o
              certificado no fim — uma aluna por vez, do zero até a pessoa
              conseguir se maquiar sozinha em casa.
            </p>
          </Revela>

          {/*
            A citação ESTOURA a coluna de leitura pela esquerda. É o gesto
            que separa uma página composta de uma página empilhada — e usa
            palavra dela, não texto meu.
          */}
          <Revela>
            <blockquote className="my-10 max-w-[20ch] border-l-2 border-ouro-claro pl-6.5 lg:-ml-[6%]">
              <p className="m-0 font-titulo text-[clamp(27px,4.4vw,46px)] leading-[1.16] font-light text-balance italic">
                {NEGOCIO.lemaCurso}
              </p>
              <cite className="mt-3.5 block text-[9.5px] font-bold uppercase not-italic tracking-[0.28em] text-ouro">
                Karol Carvalho
              </cite>
            </blockquote>
          </Revela>

          <Revela>
            <p className="mb-[1.15em] text-[17px] leading-[1.72] text-tinta-2">
              É a mesma coisa que ela faz na cadeira, do outro lado. Sobrancelha
              e maquiagem não são o produto: o que sai dali é a pessoa se
              olhando no espelho de outro jeito. Por isso ela atende sozinha,
              uma cliente por vez, do começo ao fim de cada atendimento — e por
              isso a agenda do site só oferece horário que existe de verdade.
            </p>
            <p className="text-[17px] leading-[1.72] text-tinta-2">
              Atende mulheres e homens. O design masculino tem lugar próprio na
              tabela, não é adaptação de outra coisa.
            </p>
          </Revela>

          <Onde />
        </div>
      </Env>
    </section>
  );
}

/**
 * Onde ela está em cada dia da semana.
 *
 * ⚠️ Isto substituiu a faixa de números ("2 Cidades · 6 Serviços · 1
 * Cliente por vez"). Aquilo era número trivial vestido de conquista; isto
 * é a informação que a cliente precisa antes de marcar — e a única
 * particularidade de verdade do negócio dela, que é atender em duas
 * cidades diferentes conforme o dia.
 *
 * Os dias e as horas vêm do MOTOR da agenda, não de texto solto. Se o
 * expediente mudar em `data/negocio.ts`, esta seção muda junto.
 */
function Onde() {
  return (
    <Revela>
      <section className="mt-13 border-t border-linha pt-6.5">
        <Rotulo>Onde ela está, em cada dia</Rotulo>
        <ul className="mt-4.5 grid gap-px bg-linha outline outline-linha sm:grid-cols-2">
          {cidades.map(([id, cidade]) => (
            <li key={id} className="bg-papel px-6 py-5.5">
              <p className="font-titulo text-[27px] leading-tight font-light">
                {cidade.nome}
              </p>
              <p className="mt-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ouro">
                {faixaDeDias(id)} · {janelaDaCidade(id)}
              </p>
              <p className="mt-1.5 text-[13.5px] text-tinta-3">
                {cidade.local ??
                  "O endereço vai no seu WhatsApp depois de marcar"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </Revela>
  );
}

/**
 * Os tijolos: a foto larga, a tabela e o curso, em tamanhos diferentes.
 *
 * ⚠️ A foto da paleta aparece na PROPORÇÃO DELA (1200×800). Era aqui que
 * estava o corte que o Kainã viu: a página forçava `aspect-4/3`, e como a
 * paleta que ela segura fica quase na borda direita, o corte comia
 * justamente o assunto da foto.
 *
 * O clarão que aparece ao passar o ponteiro é CSS puro, sem rastrear
 * posição — a versão com JS exigiria transformar isto num componente de
 * cliente, e no celular, que é onde a cliente está, não existe ponteiro
 * nenhum pra rastrear.
 */
function Tijolos() {
  const brilho =
    "relative overflow-hidden bg-papel outline outline-linha transition-colors duration-300 hover:outline-ouro-claro " +
    "after:pointer-events-none after:absolute after:inset-0 after:opacity-0 after:transition-opacity after:duration-300 " +
    "after:bg-[radial-gradient(340px_circle_at_50%_0%,rgba(199,165,94,0.18),transparent_62%)] hover:after:opacity-100";

  return (
    <section className="pb-4">
      <Env>
        <div className="grid gap-3.5 lg:grid-cols-3">
          <Revela className="lg:col-span-2">
            <figure className={`m-0 h-full ${brilho}`}>
              <Image
                src={FOTOS.paleta.arquivo}
                alt={FOTOS.paleta.alt}
                width={FOTOS.paleta.largura}
                height={FOTOS.paleta.altura}
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="h-auto w-full"
              />
            </figure>
          </Revela>

          <Revela>
            <article className={`h-full p-6 lg:p-7.5 ${brilho}`}>
              <Rotulo>O curso</Rotulo>
              <h2 className="mt-3 mb-2.5 font-titulo text-[clamp(24px,2.8vw,34px)] leading-[1.08] font-light">
                Uma aluna por vez
              </h2>
              <p className="text-[14.5px] leading-[1.62] text-tinta-2">
                Ela começou como aluna e hoje é ela quem assina o certificado.
                Do zero até você conseguir se maquiar sozinha em casa. A data é
                combinada entre vocês duas — é só chamar ela no WhatsApp.
              </p>
            </article>
          </Revela>

          <Revela className="lg:col-span-2">
            <article className={`h-full p-6 lg:p-7.5 ${brilho}`}>
              <Rotulo>O que ela faz</Rotulo>
              <ul className="mt-4">
                {SERVICOS.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-baseline justify-between gap-3 border-b border-linha py-2.5 text-[14.5px] last:border-b-0"
                  >
                    <span>{s.nome}</span>
                    <b className="font-semibold tabular-nums text-ouro">
                      {formatarPreco(s.preco)}
                    </b>
                  </li>
                ))}
              </ul>
            </article>
          </Revela>

          <Revela>
            <figure className={`m-0 h-full ${brilho}`}>
              <Image
                src={FOTOS.atendimento.arquivo}
                alt={FOTOS.atendimento.alt}
                width={FOTOS.atendimento.largura}
                height={FOTOS.atendimento.altura}
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="h-auto w-full"
              />
            </figure>
          </Revela>
        </div>
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
    <section className="mt-14 bg-ouro py-14 text-center text-white lg:mt-20 lg:py-20">
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
