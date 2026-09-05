import Image from "next/image";
import Link from "next/link";
import { SERVICOS, formatarDuracao, formatarPreco } from "@/data/servicos";
import { FOTO_DO_SERVICO } from "@/data/fotos";
import { Cabeca, Env, Revela } from "../ui";

export function Servicos() {
  return (
    <section id="servicos" className="py-15 lg:py-23">
      <Env>
        <Revela>
          <Cabeca
            rotulo="Tabela"
            titulo="Serviços e preços"
            texto="Tudo aberto, com o tempo de cada um. Você não precisa perguntar nada."
          />
        </Revela>

        <Revela>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-[22px]">
            {SERVICOS.map((servico) => {
              const foto = FOTO_DO_SERVICO[servico.id];
              const destino = servico.categoria === "curso" ? "/#curso" : `/agendar?servico=${servico.id}`;

              return (
                <li key={servico.id}>
                  <Link
                    href={destino}
                    className="group relative block overflow-hidden bg-creme outline outline-offset-[-1px] outline-linha focus-visible:outline-2 focus-visible:outline-ouro"
                  >
                    <Image
                      src={foto.arquivo}
                      alt={foto.alt}
                      width={foto.largura}
                      height={foto.altura}
                      sizes="(min-width: 1024px) 33vw, 50vw"
                      className="aspect-3/4 w-full object-cover object-top transition-transform duration-[620ms] ease-marca group-hover:scale-105"
                    />

                    {/* moldura fina, marca da casa */}
                    <span className="pointer-events-none absolute inset-[9px] z-20 border border-white/40" />

                    {foto.etiqueta && (
                      <span className="absolute top-[18px] left-1/2 z-30 -translate-x-1/2 bg-osso px-3 py-[5px] text-[8.5px] font-bold uppercase tracking-[0.2em] whitespace-nowrap text-tinta">
                        {foto.etiqueta}
                      </span>
                    )}

                    <span className="absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-[#181209]/90 via-[#181209]/5 to-transparent px-3.5 pt-12 pb-4 text-center text-white">
                      <span className="block font-titulo text-[clamp(19px,2.4vw,26px)] leading-[1.08]">
                        {servico.nome}
                      </span>
                      <span className="mt-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.2em] opacity-80">
                        {formatarDuracao(servico)}
                      </span>
                      <span className="mt-2 block font-titulo text-[clamp(20px,2.5vw,28px)] tabular-nums text-ouro-luz">
                        {formatarPreco(servico.preco)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Revela>
      </Env>
    </section>
  );
}
