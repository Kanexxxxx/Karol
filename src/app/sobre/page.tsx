import Image from "next/image";
import type { Metadata } from "next";
import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Botao, Env, Rotulo } from "@/components/ui";
import { FOTOS } from "@/data/fotos";
import { NEGOCIO } from "@/data/negocio";

/**
 * A página da Karol.
 *
 * ---------------------------------------------------------------------
 * ⚠️ O ERRO QUE DERRUBOU AS DUAS VERSÕES ANTERIORES
 * ---------------------------------------------------------------------
 *
 * As duas primeiras tentativas trouxeram pra cá a tabela de preços, as
 * duas cidades e o cartão do curso. **As três já estão na home** —
 * `Servicos`, `Local` e `Curso` em `app/page.tsx`. Quem chegava aqui
 * depois de rolar a home lia a mesma página duas vezes, e foi por isso
 * que ela pareceu repetitiva.
 *
 * A regra desta página, então: **ela só fala DELA.** Nada de preço, nada
 * de horário, nada de cidade, nada de vender o curso. Quem quer marcar
 * tem o botão no fim; quem quer saber quanto custa tem a home.
 *
 * ---------------------------------------------------------------------
 * De onde veio o desenho
 * ---------------------------------------------------------------------
 *
 * Das três referências que o Kainã mandou, e desta vez lendo o código
 * delas, não a lembrança:
 *
 * - **reactbits.dev → `CurvedLoop`**: texto correndo sobre um caminho SVG
 *   curvo (`<textPath>`). Aqui virou a frase dela em arco. O original
 *   anima o `startOffset` num `requestAnimationFrame`; a versão daqui é
 *   estática, porque o movimento não é o que faz a ideia funcionar — a
 *   curva é — e estática ela custa zero de JavaScript.
 *
 * - **reactbits.dev → `ScrollStack`**: cartões que empilham enquanto a
 *   página rola. O original usa `Lenis` e rAF; aqui são três `position:
 *   sticky` com `top` escalonado, que dá o mesmo efeito sem uma linha de
 *   JavaScript. É a espinha da página e é a coisa mais nova do site.
 *
 * - **reactbits.dev → `SplitText`**: entrada palavra a palavra. Virou
 *   `animation-delay` inline em spans (`.palavra` no globals.css).
 *
 * - **uiverse.io → categoria `Patterns`**: fundo feito de
 *   `linear-gradient` empilhado com `background-size`. Virou a `.trama`.
 *
 * - **21st.dev → seções `hero` / `scroll`**: a abertura assimétrica com a
 *   foto sangrando pra fora da margem, que é o único lugar do site em que
 *   uma imagem escapa do `Env`.
 *
 * ⚠️ Nenhuma biblioteca entrou. As três servem componente React que traz
 * `framer-motion`, `gsap` ou `lenis` junto — centenas de KB no celular de
 * uma cliente. O projeto tem quatro dependências e continua com quatro.
 *
 * ---------------------------------------------------------------------
 * ⚠️ O que não pode voltar
 * ---------------------------------------------------------------------
 *
 * 1. **Nada de biografia inventada.** Tudo escrito aqui saiu da boca
 *    dela: as duas citações são de reels do perfil e o parágrafo de
 *    abertura é a resposta literal do briefing. Ano em que começou,
 *    quantas alunas formou, cidade natal — pergunte a ela primeiro.
 * 2. **Tipografia nunca cobre o rosto dela.** Vale pro site inteiro.
 * 3. **Foto não é cortada em proporção que não é a dela.** A da paleta é
 *    3:2 e já foi espremida em 4:3 uma vez — o corte comia a paleta.
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

export default function Sobre() {
  return (
    <>
      <Cabecalho />
      <main className="flex-1 pb-20 lg:pb-0">
        <Retrato />
        <Curva />
        <Historia />
        <Maos />
        <Fecho />
      </main>
      <Rodape />
      <BarraMobile />
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * A abertura: nome à esquerda, retrato sangrando pela direita.
 *
 * A foto **escapa da margem** — é o único lugar do site em que uma imagem
 * sai do `Env`. Isso é de propósito: o resto do site é todo contido, e
 * essa fuga é o que faz a página dela parecer outra coisa sem precisar de
 * cor nova nem de fonte nova.
 *
 * O nome entra palavra a palavra (`.palavra`), no carregamento. É a única
 * animação de entrada da página e ela acontece uma vez.
 */
function Retrato() {
  const foto = FOTOS.capaReserva;
  const palavras = ["Karol", "Carvalho"];

  return (
    <section className="trama relative overflow-hidden border-b border-linha">
      <Env className="grid items-center gap-9 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:py-0">
        <div className="lg:py-20">
          <Rotulo>Quem faz</Rotulo>

          <h1 className="mt-4 font-titulo text-[clamp(54px,12.5vw,116px)] leading-[0.86] font-light tracking-[-0.02em]">
            {palavras.map((p, i) => (
              <span
                key={p}
                className="palavra block"
                // o atraso é o que transforma duas palavras num gesto
                style={{ animationDelay: `${0.08 + i * 0.13}s` }}
              >
                {i === 0 ? p : <em className="text-ouro italic">{p}</em>}
              </span>
            ))}
          </h1>

          <p className="mt-7 max-w-[34ch] border-t border-linha pt-6 text-[clamp(16px,2vw,19px)] leading-[1.62] text-tinta-2">
            {NEGOCIO.frase}
          </p>
        </div>

        {/*
          `-mr` negativo no computador: a foto atravessa o respiro lateral
          do `Env` e encosta na borda da janela. No celular ela fica
          contida, porque lá não sobra margem pra sangrar.
        */}
        <div className="lg:-mr-[46px] lg:-mb-px xl:-mr-[calc((100vw-1220px)/2+46px)]">
          <Image
            src={foto.arquivo}
            alt={foto.alt}
            width={foto.largura}
            height={foto.altura}
            priority
            sizes="(min-width: 1024px) 56vw, 100vw"
            className="h-auto w-full"
          />
        </div>
      </Env>
    </section>
  );
}

/**
 * A frase dela, escrita em dois arcos.
 *
 * Vem do `CurvedLoop` do reactbits: texto sobre um caminho SVG, via
 * `<textPath>`. Lá o caminho é `M-100,40 Q500,{curva} 1540,40` e o texto
 * corre animando o `startOffset` num `requestAnimationFrame`.
 *
 * Três decisões que mudam em relação ao original, e o porquê de cada uma:
 *
 * 1. **Está parado.** A home já tem uma esteira de fotos correndo; uma
 *    faixa de texto correndo aqui seria a terceira coisa deslizando no
 *    mesmo site — exatamente a repetição que derrubou as versões
 *    anteriores desta página. O que faz a ideia ser bonita é a curva, não
 *    o movimento. E parada ela custa zero de JavaScript.
 *
 * 2. **São DOIS arcos, não um.** A frase inteira tem 53 caracteres. Numa
 *    linha só, atravessando a tela de um celular de 390 px, cada letra
 *    ficaria com 7 px — ilegível. Quebrada no ponto final, são 30 e 21
 *    caracteres, e a letra dobra de tamanho. O primeiro arco sobe e o
 *    segundo desce: as duas curvas juntas formam uma lente, que compõe
 *    melhor do que um arco solitário.
 *
 * 3. **Sem `preserveAspectRatio="none"`.** Era o que eu ia fazer pra
 *    esticar o arco na largura da tela, e teria achatado a itálica pela
 *    metade no celular — a escala horizontal e a vertical ficam
 *    diferentes. Com a proporção preservada, o `max-w` é que segura o
 *    tamanho no computador.
 *
 * `text-anchor="middle"` com `startOffset="50%"` centraliza cada linha no
 * seu arco sem precisar medir texto — que é justamente o que obriga o
 * componente original a rodar no cliente.
 */
function Curva() {
  const [primeira, segunda] = NEGOCIO.lema.split(/(?<=\.)\s+/);

  return (
    <section className="border-y border-linha bg-creme py-10 lg:py-14">
      <svg
        viewBox="0 0 600 250"
        className="mx-auto h-auto w-full max-w-[720px]"
        role="img"
        aria-label={`${NEGOCIO.lema} — ${NEGOCIO.profissional}`}
      >
        <defs>
          <path id="arco-cima" d="M40,130 Q300,26 560,130" fill="none" />
          <path id="arco-baixo" d="M40,150 Q300,254 560,150" fill="none" />
        </defs>

        <g
          className="fill-tinta font-titulo italic"
          fontSize="42"
          fontWeight="300"
          textAnchor="middle"
        >
          <text>
            <textPath href="#arco-cima" startOffset="50%">
              {primeira}
            </textPath>
          </text>
          <text>
            <textPath href="#arco-baixo" startOffset="50%">
              {segunda}
            </textPath>
          </text>
        </g>
      </svg>

      <p className="mt-2 text-center text-[9.5px] font-bold uppercase tracking-[0.3em] text-ouro">
        Karol Carvalho
      </p>
    </section>
  );
}

/** Os três momentos da história dela. Texto dela primeiro, sempre. */
const CAPITULOS = [
  {
    rotulo: "O começo",
    titulo: "Ela começou como aluna",
    texto: [
      "Fez o curso de design de sobrancelha sem saber direito onde aquilo ia dar. Hoje é ela quem assina o certificado no fim.",
    ],
    citacao: NEGOCIO.lemaCurso,
    fundo: "bg-papel",
  },
  {
    rotulo: "O que ela vende",
    titulo: "Não é sobrancelha",
    texto: [
      "Sobrancelha e maquiagem são o que ela faz com as mãos. O que sai da cadeira é outra coisa: a pessoa se olhando no espelho de um jeito diferente do que entrou.",
      "É por isso que ela atende sozinha, uma cliente por vez, do começo ao fim — e não porque não daria conta de duas.",
    ],
    citacao: NEGOCIO.lema,
    fundo: "bg-creme",
  },
  {
    rotulo: "Pra quem",
    titulo: "Mulheres e homens",
    texto: [
      "O design masculino tem lugar próprio na tabela dela, com preço próprio. Não é adaptação de outra coisa nem favor de fim de expediente.",
      "E o curso é individual: uma aluna por vez, do zero até a pessoa conseguir se maquiar sozinha em casa.",
    ],
    citacao: null,
    fundo: "bg-ouro-fundo",
  },
] as const;

/**
 * A história, em cartões que empilham enquanto a página rola.
 *
 * É o `ScrollStack` do reactbits — só que lá são ~300 linhas de
 * `requestAnimationFrame` mexendo em `transform` com o `Lenis` por baixo,
 * e aqui são três `position: sticky` com `top` escalonado. O navegador
 * faz o trabalho sozinho, na thread de composição, e continua funcionando
 * com o JavaScript desligado.
 *
 * ⚠️ Cada cartão precisa de **fundo opaco**. Sem isso eles ficam
 * transparentes uns sobre os outros e o texto se sobrepõe — é o defeito
 * clássico dessa técnica.
 *
 * ⚠️ E nenhum ancestral pode ter `overflow: hidden`, senão `sticky` para
 * de grudar. Por isso esta seção não leva `overflow-hidden`, mesmo estando
 * entre duas que levam.
 */
function Historia() {
  return (
    <section className="bg-osso py-14 lg:py-20">
      <Env>
        <ul className="flex flex-col gap-6 lg:gap-8">
          {CAPITULOS.map((c, i) => (
            <li
              key={c.rotulo}
              className={`sticky outline outline-linha ${c.fundo}`}
              style={{
                // cada um para um pouco mais abaixo que o anterior, e é
                // essa diferença que deixa a borda do de baixo aparecendo
                top: `calc(5.5rem + ${i * 1.35}rem)`,
              }}
            >
              <div className="grid gap-6 p-7 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-11 lg:p-12">
                {/*
                  O número do capítulo é informação de verdade: são três
                  momentos em ordem, e a ordem importa (ela foi aluna
                  ANTES de ensinar). Não é enfeite de "01 / 02 / 03".
                */}
                <p
                  aria-hidden="true"
                  className="font-titulo text-[clamp(40px,7vw,72px)] leading-none font-light text-ouro-claro"
                >
                  {i + 1}
                </p>

                <div>
                  <Rotulo>{c.rotulo}</Rotulo>
                  <h2 className="mt-2.5 mb-4 font-titulo text-[clamp(28px,5vw,46px)] leading-[1.04] font-light text-balance">
                    {c.titulo}
                  </h2>

                  <div className="flex max-w-[54ch] flex-col gap-3.5 text-[16.5px] leading-[1.66] text-tinta-2">
                    {c.texto.map((t) => (
                      <p key={t}>{t}</p>
                    ))}
                  </div>

                  {c.citacao && (
                    <blockquote className="mt-6 border-l-2 border-ouro-claro pl-5">
                      <p className="max-w-[30ch] font-titulo text-[clamp(21px,3vw,30px)] leading-[1.2] font-light italic text-tinta">
                        {c.citacao}
                      </p>
                    </blockquote>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Env>
    </section>
  );
}

/**
 * A foto dela trabalhando, em largura total.
 *
 * A página inteira fala do que ela faz; esta é a única imagem em que dá
 * pra ver acontecendo. Vai sem moldura e sem legenda por cima — a foto
 * já diz o que precisa.
 */
function Maos() {
  const foto = FOTOS.atendimento;

  return (
    <section className="relative">
      <Image
        src={foto.arquivo}
        alt={foto.alt}
        width={foto.largura}
        height={foto.altura}
        sizes="100vw"
        className="h-[52vh] w-full object-cover object-[center_28%] lg:h-[64vh]"
      />
    </section>
  );
}

/** Sair daqui: marcar horário ou seguir o perfil. */
function Fecho() {
  const perfis = [
    { arroba: NEGOCIO.instagram.studio, papel: "o studio" },
    { arroba: NEGOCIO.instagram.pessoal, papel: "o dia a dia dela" },
  ];

  return (
    <section className="bg-ouro py-14 text-center text-white lg:py-20">
      <Env>
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
      </Env>
    </section>
  );
}
