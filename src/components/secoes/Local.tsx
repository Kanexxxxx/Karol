import Image from "next/image";
import { CIDADES, type CidadeId } from "@/data/negocio";
import { TEXTURAS } from "@/data/fotos";
import { horarioDaCidade } from "@/lib/agenda";
import { Botao, Cabeca, Env, Revela } from "../ui";

export function Local() {
  const cidades = Object.entries(CIDADES) as [CidadeId, (typeof CIDADES)[CidadeId]][];

  return (
    <section id="local" className="py-15 lg:py-23">
      <Env>
        <Revela>
          <Cabeca
            rotulo="Endereço"
            titulo="Local de atendimento"
            texto="Duas cidades, dias diferentes. O site já mostra só os horários da cidade certa."
          />
        </Revela>

        {/*
          A foto entrou na v2 pra esta seção parar de ser dois retângulos de
          texto no meio do creme. Ela mostra o que a cliente vai encontrar —
          toalha limpa dobrada, potinho, luz de janela — sem mostrar o
          endereço nem ninguém.

          ⚠️ NÃO É O STUDIO DELA. É uma imagem gerada, decorativa, e o
          `alt` diz o que ela é. A Karol não quis endereço completo no site
          (ver `CIDADES` em data/negocio.ts), e uma foto do lugar
          contrariaria isso pela porta dos fundos.
        */}
        <Revela>
          <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_0.85fr] lg:gap-10">
            <div className="grid gap-px self-start bg-linha outline outline-linha md:grid-cols-2 lg:grid-cols-1">
              {cidades.map(([id, cidade]) => (
                <div key={id} className="bg-osso px-7 py-9 text-center lg:text-left">
                  <h3 className="mb-2 font-titulo text-[32px] font-light">{cidade.nome}</h3>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-ouro">
                    {horarioDaCidade(id)}
                  </p>
                  {cidade.local && (
                    <p className="mt-3.5 text-[14.5px] text-tinta-2">{cidade.local}</p>
                  )}
                </div>
              ))}
            </div>

            <Image
              src={TEXTURAS.toalhas.arquivo}
              alt={TEXTURAS.toalhas.alt}
              width={TEXTURAS.toalhas.largura}
              height={TEXTURAS.toalhas.altura}
              sizes="(min-width: 1024px) 42vw, 100vw"
              loading="lazy"
              className="h-full w-full object-cover outline outline-linha"
            />
          </div>
        </Revela>
      </Env>
    </section>
  );
}

export function ChamadaFinal() {
  return (
    <section className="bg-ouro py-15 text-center text-white lg:py-23">
      <Env>
        <Revela>
          <h2 className="mb-3.5 font-titulo text-[clamp(36px,7vw,62px)] leading-none font-light">
            Vamos marcar?
          </h2>
          <p className="mb-7 text-[#F4E7CC]">
            Escolha o serviço, o dia e o horário. Leva menos de um minuto.
          </p>
          <Botao href="/agendar" variante="claro">
            Agendar meu horário
          </Botao>
        </Revela>
      </Env>
    </section>
  );
}
