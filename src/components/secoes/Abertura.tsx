import Image from "next/image";
import { CIDADES, NEGOCIO, type CidadeId } from "@/data/negocio";
import { FOTOS } from "@/data/fotos";
import { faixaDeDias } from "@/lib/agenda";
import { Botao, Env } from "../ui";

/**
 * No celular: foto inteira com a chamada por cima, embaixo.
 * No computador: retrato de um lado, chamada do outro.
 *
 * O enquadramento é alto de propósito (object-position 12%) pra o rosto
 * dela nunca ser cortado nem coberto por texto.
 */
export function Abertura() {
  return (
    <div className="relative isolate lg:bg-creme">
      <div className="lg:grid lg:min-h-[74vh] lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
        {/*
          `overflow-hidden` não é enfeite: a foto abaixo tem `scale(1.055)` no
          respiro, e um transform que passa da borda faz a PÁGINA rolar de
          lado no celular — dava pra arrastar o site uns pixels pro lado.
        */}
        <div className="relative overflow-hidden lg:h-full">
          <Image
            src={FOTOS.capa.arquivo}
            alt={FOTOS.capa.alt}
            width={FOTOS.capa.largura}
            height={FOTOS.capa.altura}
            priority
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="aspect-3/4 w-full object-cover object-[center_12%] motion-safe:animate-[respiro_26s_var(--ease-marca)_infinite_alternate] lg:aspect-auto lg:h-full lg:object-[center_14%]"
          />
          {/*
            Véus só no celular, onde o texto fica sobre a foto.

            O de baixo sobe até 74% e mantém força no meio (via-black/45)
            porque é ali que o título cai. Com o via fraco de antes, o
            título disputava com a foto — some numa capa de fundo claro e
            fica no limite mesmo numa de fundo escuro.
          */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[24%] bg-linear-to-b from-black/55 to-transparent lg:hidden" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[74%] bg-linear-to-t from-black/88 via-black/45 to-transparent lg:hidden" />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 pb-[34px] text-white lg:static lg:flex lg:flex-col lg:justify-center lg:py-15 lg:text-tinta">
          <Env>
            <h1 className="font-titulo text-[clamp(29px,8.6vw,60px)] leading-[1.02] font-light text-balance lg:text-[clamp(52px,4.6vw,74px)]">
              Sobrancelha, maquiagem
              <br />e um pouco de{" "}
              <em className="text-ouro-luz italic lg:text-ouro">autoestima</em>.
            </h1>

            <p className="mt-3 max-w-[44ch] text-[clamp(13.5px,3.6vw,16px)] text-[#F0E6D6] lg:mt-4 lg:max-w-[46ch] lg:text-[17px] lg:text-tinta-2">
              Design, henna, brow lamination, maquiagem social e curso de
              automaquiagem em {NEGOCIO.atuacaoCidades.replace(", São Paulo", "")}.
            </p>

            {/*
              Um botão de cada, com a cor mudando no breakpoint: no celular
              ele fica sobre a foto (claro), no computador sobre o creme
              (dourado).

              Antes eram DOIS de cada, um escondido por `hidden lg:inline-flex`
              — e os dois apareciam no celular, porque `Botao` fixa
              `inline-flex` nas classes base e o `hidden` não vence isso.
            */}
            <div className="mt-6 flex flex-wrap gap-2.5 lg:mt-7">
              <Botao href="/agendar" variante="claro" className="lg:bg-ouro lg:text-white">
                Agendar horário
              </Botao>
              <Botao
                href="/#servicos"
                variante="vazado-claro"
                className="lg:border-ouro-claro lg:text-ouro lg:hover:bg-ouro-fundo"
              >
                Ver preços
              </Botao>
            </div>
          </Env>
        </div>
      </div>
    </div>
  );
}

/** Faixa dourada logo abaixo: cidade, dia e regra de atendimento. */
export function Faixa() {
  const porCidade = (Object.entries(CIDADES) as [CidadeId, (typeof CIDADES)[CidadeId]][]).map(
    ([id, cidade]) => ({ nome: cidade.nome, dias: faixaDeDias(id) }),
  );

  return (
    <div className="bg-ouro text-white">
      <Env className="grid grid-cols-1 md:grid-cols-3">
        {porCidade.map((c, i) => (
          <div
            key={c.nome}
            className={`flex items-baseline justify-center gap-2.5 px-5 py-4 text-center md:flex-col md:items-center md:gap-1.5 md:px-4 md:py-5 ${
              i > 0 ? "border-t border-white/20 md:border-t-0 md:border-l" : ""
            }`}
          >
            <b className="text-[10.5px] font-bold uppercase tracking-[0.2em]">{c.nome}</b>
            <span className="text-[12.5px] text-[#F6E9CE]">{c.dias}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-center gap-2.5 border-t border-white/20 px-5 py-4 text-center md:flex-col md:items-center md:gap-1.5 md:border-t-0 md:border-l md:px-4 md:py-5">
          <b className="text-[10.5px] font-bold uppercase tracking-[0.2em]">Atendimento</b>
          <span className="text-[12.5px] text-[#F6E9CE]">Uma cliente por vez</span>
        </div>
      </Env>
    </div>
  );
}
