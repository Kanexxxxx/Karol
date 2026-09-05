import Image from "next/image";
import { FOTO_DO_SERVICO } from "@/data/fotos";
import { NEGOCIO } from "@/data/negocio";
import { buscarServico, formatarPreco } from "@/data/servicos";
import { linkWhatsapp } from "@/lib/whatsapp";
import { Env, Revela, Rotulo } from "../ui";

export function Curso() {
  const curso = buscarServico("curso-automaquiagem");
  const foto = FOTO_DO_SERVICO["curso-automaquiagem"];
  if (!curso) return null;

  return (
    <section id="curso" className="border-y border-linha bg-papel py-15 lg:py-23">
      <Env className="grid items-center gap-9 lg:grid-cols-[0.85fr_1fr] lg:gap-16">
        <Revela>
          <div className="relative">
            <Image
              src={foto.arquivo}
              alt={foto.alt}
              width={foto.largura}
              height={foto.altura}
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="aspect-4/5 w-full object-cover outline outline-linha"
            />
            <span className="absolute top-3.5 left-3.5 bg-osso px-[11px] py-1.5 text-[9px] font-bold uppercase tracking-[0.2em]">
              Com certificado
            </span>
          </div>
        </Revela>

        <Revela>
          <Rotulo>Curso</Rotulo>
          <h2 className="mt-2.5 mb-4 font-titulo text-[clamp(32px,5.8vw,52px)] leading-[1.02] font-light text-balance">
            Você aprende a fazer em você mesma
          </h2>
          <p className="mb-[18px] text-tinta-2">
            Uma aula individual e presencial, no seu ritmo, do zero. A gente
            marca a data junto e no fim você sai com o certificado na mão — e
            sabendo se maquiar sozinha pra qualquer ocasião.
          </p>

          <blockquote className="mb-6 border-l-2 border-ouro-claro pl-4 font-titulo text-[19px] leading-[1.4] italic">
            {NEGOCIO.lemaCurso}
            <cite className="mt-2.5 block font-corpo text-[9.5px] font-bold uppercase not-italic tracking-[0.22em] text-ouro">
              Karol Carvalho
            </cite>
          </blockquote>

          <dl className="mb-[26px] grid grid-cols-3 border-y border-linha">
            <Ficha valor={formatarPreco(curso.preco)} rotulo="Valor" />
            <Ficha valor="2h" rotulo="Duração" comBorda />
            <Ficha valor="1" rotulo="Aluna" comBorda />
          </dl>

          {/*
            O curso NÃO passa pela agenda. Ele é uma aula individual de 2h com
            data combinada entre as duas — mandar a aluna pro fluxo de
            agendamento fazia ela escolher um horário que não existe pra isso.
            Aqui a conversa começa direto no WhatsApp.
          */}
          <a
            href={linkWhatsapp(
              "Oi Karol! Vim pelo site e quero fazer o curso de automaquiagem. " +
                "Como funciona e quais datas você tem?",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[50px] items-center justify-center bg-ouro px-[30px] py-4 text-[11.5px] font-bold uppercase tracking-[0.2em] text-white transition-opacity duration-300 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro"
          >
            Falar sobre o curso
          </a>
        </Revela>
      </Env>
    </section>
  );
}

function Ficha({
  valor,
  rotulo,
  comBorda = false,
}: {
  valor: string;
  rotulo: string;
  comBorda?: boolean;
}) {
  return (
    <div className={`px-2 py-5 text-center ${comBorda ? "border-l border-linha" : ""}`}>
      <dt className="font-titulo text-[30px] font-light">{valor}</dt>
      <dd className="text-[9px] font-semibold uppercase tracking-[0.18em] text-tinta-2">
        {rotulo}
      </dd>
    </div>
  );
}
