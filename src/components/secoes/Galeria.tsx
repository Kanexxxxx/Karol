import Image from "next/image";
import type { Foto } from "@/data/fotos";
import { ALUNAS, GALERIA } from "@/data/fotos";
import { Cabeca, Env, Revela } from "../ui";

function Peca({ foto }: { foto: Foto }) {
  return (
    <figure className="group relative m-0 overflow-hidden bg-creme">
      <Image
        src={foto.arquivo}
        alt={foto.alt}
        width={foto.largura}
        height={foto.altura}
        sizes="(min-width: 768px) 25vw, 50vw"
        loading="lazy"
        className="aspect-3/4 w-full object-cover transition-transform duration-[620ms] ease-marca group-hover:scale-105"
      />
      {foto.etiqueta && (
        <span className="absolute top-[9px] left-[9px] bg-osso px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.16em] text-tinta">
          {foto.etiqueta}
        </span>
      )}
      {foto.legenda && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#16110C]/85 to-transparent px-3 pt-8 pb-2.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-white">
          {foto.legenda}
        </figcaption>
      )}
    </figure>
  );
}

export function Trabalhos() {
  return (
    <section id="galeria" className="py-15 lg:py-23">
      <Env>
        <Revela>
          <Cabeca
            rotulo="Galeria"
            titulo="Mais trabalhos"
            texto={`${GALERIA.length} clientes de verdade, sem filtro e sem retoque.`}
          />
        </Revela>
        <Revela>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3.5">
            {GALERIA.map((foto) => (
              <Peca key={foto.arquivo} foto={foto} />
            ))}
          </div>
        </Revela>
      </Env>
    </section>
  );
}

export function Alunas() {
  return (
    <section className="pb-15 lg:pb-23">
      <Env>
        <Revela>
          <Cabeca
            rotulo="Alunas"
            titulo="Quem já fez o curso"
            texto="Cada aluna sai com o certificado na mão."
          />
        </Revela>
        <Revela>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3.5">
            {ALUNAS.map((foto) => (
              <Peca key={foto.arquivo} foto={foto} />
            ))}
          </div>
        </Revela>
      </Env>
    </section>
  );
}
