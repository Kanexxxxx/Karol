import Image from "next/image";
import { TEXTURAS } from "@/data/fotos";
import { NEGOCIO } from "@/data/negocio";
import { Botao, Env, Revela, Rotulo } from "../ui";

/**
 * O trabalho.
 *
 * ---------------------------------------------------------------------
 * ⚠️ AQUI FICAVA O ANTES E DEPOIS, e ele não vai voltar (v2)
 * ---------------------------------------------------------------------
 *
 * A v1 abria esta seção com a montagem que ela mesma faz no Instagram: o
 * rosto de uma cliente, metade antes e metade depois. Era a foto que mais
 * vendia o site inteiro — e é exatamente por isso que a decisão de tirar
 * custa: é rosto de uma pessoa específica, publicado num site que não
 * pergunta nada a ela.
 *
 * O que entrou no lugar NÃO é um antes e depois falso. Isso foi
 * considerado e recusado: uma sobrancelha gerada por IA seria prova de um
 * trabalho que não aconteceu, e quem marcasse por causa dela estaria
 * marcando por uma mentira que a Karol teria que sustentar na cadeira.
 *
 * É o material do trabalho — um traço de henna no papel. Ele não promete
 * resultado nenhum, e o texto ao lado passou a carregar sozinho o que a
 * foto carregava. A prova real continua existindo, em dois lugares que
 * são dela: o Instagram e o celular de quem já foi atendida.
 */
export function Prova() {
  const foto = TEXTURAS.tracoHenna;

  return (
    <section id="trabalhos" className="bg-creme py-15 lg:py-23">
      <Env className="grid items-center gap-9 lg:grid-cols-[0.82fr_1fr] lg:gap-16">
        <Revela>
          <div className="relative mx-auto w-full max-w-[460px]">
            <Image
              src={foto.arquivo}
              alt={foto.alt}
              width={foto.largura}
              height={foto.altura}
              sizes="(min-width: 1024px) 460px, 100vw"
              className="w-full outline outline-linha"
            />
            {/*
              A moldura fina por dentro é a marca da casa — o mesmo detalhe
              que a v1 usava nos cartões de serviço. Ela dá borda de
              impressão à textura e impede que a imagem pareça um fundo
              solto no meio da seção.
            */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 border border-white/50" />
          </div>
        </Revela>

        <Revela>
          <Rotulo>O trabalho</Rotulo>
          <h2 className="mt-2.5 mb-[18px] font-titulo text-[clamp(32px,5.8vw,52px)] leading-[1.02] font-light text-balance">
            O desenho muda o rosto inteiro
          </h2>
          <p className="mb-3.5 text-tinta-2">
            Não é só tirar pelo. É achar o formato que combina com o seu rosto e
            devolver o que o espelho tinha parado de mostrar.
          </p>
          <p className="mb-6 text-tinta-2">
            Toda cliente sai com o antes e depois no celular — e é no{" "}
            <a
              href={`https://instagram.com/${NEGOCIO.instagram.studio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-ouro-claro underline-offset-2 hover:text-ouro"
            >
              Instagram do studio
            </a>{" "}
            que esse trabalho aparece, com o rosto de quem escolheu aparecer.
          </p>
          <Botao href="/agendar" variante="vazado">
            Quero o meu
          </Botao>
        </Revela>
      </Env>
    </section>
  );
}

/**
 * Citação dela, em destaque entre duas seções.
 *
 * A seda entrou atrás na v2. Sem as fotos, a página virou uma sequência
 * de blocos de cor chapada, e a citação — que é o momento mais humano do
 * site — era só texto no meio de creme. O véu por cima existe pro
 * contraste não depender da textura: o tecido é claro, mas tem regiões
 * douradas, e texto escuro sobre dourado claro fica no limite.
 */
export function Frase() {
  return (
    <div className="relative isolate overflow-hidden bg-osso py-16 text-center lg:py-20">
      <Image
        src={TEXTURAS.sedaLarga.arquivo}
        alt=""
        aria-hidden="true"
        width={TEXTURAS.sedaLarga.largura}
        height={TEXTURAS.sedaLarga.altura}
        sizes="100vw"
        loading="lazy"
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-osso/72" />
      <Env>
        <Revela>
          <blockquote className="mx-auto max-w-[22ch] font-titulo text-[clamp(24px,4.4vw,40px)] leading-[1.24] font-light italic text-balance">
            {NEGOCIO.lema}
          </blockquote>
          <p className="mt-[18px] text-[9.5px] font-bold uppercase tracking-[0.28em] text-ouro">
            Karol Carvalho
          </p>
        </Revela>
      </Env>
    </div>
  );
}
