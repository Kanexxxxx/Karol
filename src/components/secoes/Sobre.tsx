import Image from "next/image";
import Link from "next/link";
import { FOTOS } from "@/data/fotos";
import { Env, Revela, Rotulo } from "../ui";

/**
 * Chamada pra página dela, na home.
 *
 * A página `/sobre` só existe de verdade se alguém chegar nela. O menu leva,
 * mas quase ninguém lê menu no celular — quem rola a home tem que esbarrar.
 *
 * ⚠️ Este bloco NÃO repete as citações dela de propósito: o `lema` está no
 * `Frase`, logo acima, e a `frase` abre a `/sobre`. Repetir aqui faria a
 * página dela parecer que já foi lida.
 */
export function Sobre() {
  return (
    <section className="border-y border-linha bg-papel py-14 lg:py-20">
      <Env className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <Revela>
          <Image
            src={FOTOS.paleta.arquivo}
            alt={FOTOS.paleta.alt}
            width={FOTOS.paleta.largura}
            height={FOTOS.paleta.altura}
            loading="lazy"
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="aspect-4/3 w-full object-cover outline outline-linha"
          />
        </Revela>

        <Revela>
          <Rotulo>A Karol</Rotulo>
          <h2 className="mt-2.5 mb-[18px] font-titulo text-[clamp(28px,5.6vw,46px)] leading-[1.04] font-light text-balance">
            Quem vai te atender
          </h2>
          <p className="mb-6 text-tinta-2">
            Ela começou como aluna. Hoje é ela quem assina o certificado — e
            atende sozinha, em duas cidades, uma cliente por vez.
          </p>
          <Link
            href="/sobre"
            className="group inline-flex min-h-[44px] items-center gap-2.5 border-b border-ouro-claro pb-1 text-[11.5px] font-bold uppercase tracking-[0.2em] text-ouro transition-colors hover:border-ouro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro"
          >
            Conhecer a Karol
            <span
              aria-hidden="true"
              className="text-[15px] transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </Revela>
      </Env>
    </section>
  );
}
