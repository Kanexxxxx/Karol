import Image from "next/image";
import { FOTOS } from "@/data/fotos";
import { NEGOCIO } from "@/data/negocio";
import { Botao, Env, Revela, Rotulo } from "../ui";

/**
 * Antes e depois.
 *
 * A foto dela já vem montada em duas metades, uma em cima da outra — é o
 * formato que ela produz no Instagram. Só as etiquetas marcam qual é qual;
 * nada de linha cortando o rosto no meio.
 */
export function Prova() {
  return (
    <section id="trabalhos" className="bg-creme py-15 lg:py-23">
      <Env className="grid items-center gap-9 lg:grid-cols-[0.82fr_1fr] lg:gap-16">
        <Revela>
          <div className="relative mx-auto w-full max-w-[420px]">
            <span className="absolute top-0 left-0 z-10 bg-osso px-3.5 py-[7px] text-[9.5px] font-bold uppercase tracking-[0.24em] text-tinta">
              Antes
            </span>
            <Image
              src={FOTOS.antesDepois.arquivo}
              alt={FOTOS.antesDepois.alt}
              width={FOTOS.antesDepois.largura}
              height={FOTOS.antesDepois.altura}
              sizes="(min-width: 1024px) 420px, 100vw"
              className="w-full outline outline-linha"
            />
            <span className="absolute bottom-0 left-0 z-10 bg-osso px-3.5 py-[7px] text-[9.5px] font-bold uppercase tracking-[0.24em] text-tinta">
              Depois
            </span>
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
            Toda cliente sai com o antes e depois no celular.
          </p>
          <Botao href="/agendar" variante="vazado">
            Quero o meu
          </Botao>
        </Revela>
      </Env>
    </section>
  );
}

/** Citação dela, em destaque entre duas seções. */
export function Frase() {
  return (
    <div className="bg-osso py-14 text-center">
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
