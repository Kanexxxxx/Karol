import Image from "next/image";
import { INSTAGRAM } from "@/data/fotos";
import { NEGOCIO } from "@/data/negocio";
import { Env, Revela, Rotulo } from "../ui";

/**
 * Convite pro Instagram, antes do rodapé.
 *
 * O Instagram dela é onde o trabalho aparece novo toda semana — o site
 * mostra um recorte, o perfil mostra o dia a dia. Quem chegou até aqui e
 * ainda não marcou horário costuma querer ver mais antes de decidir.
 *
 * O convite ("ME SIGA NO INSTAGRAM") já vem escrito na foto: foi ela quem
 * montou, e a letra é a do feed dela. Por isso o texto ao lado não repete
 * a frase — repetir faria a foto parecer legenda de si mesma.
 */
export function Instagram() {
  const perfis = [
    { arroba: NEGOCIO.instagram.studio, papel: "o studio e os trabalhos" },
    { arroba: NEGOCIO.instagram.pessoal, papel: "o dia a dia dela" },
  ];

  return (
    <section className="border-t border-linha bg-creme py-15 lg:py-23">
      <Env className="grid items-center gap-9 lg:grid-cols-[0.9fr_1fr] lg:gap-16">
        <Revela>
          <Image
            src={INSTAGRAM.arquivo}
            alt={INSTAGRAM.alt}
            width={INSTAGRAM.largura}
            height={INSTAGRAM.altura}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="w-full outline outline-linha"
          />
        </Revela>

        <Revela>
          <Rotulo>Instagram</Rotulo>
          <h2 className="mt-2.5 mb-[18px] font-titulo text-[clamp(30px,5.8vw,52px)] leading-[1.02] font-light text-balance">
            Tem trabalho novo toda semana
          </h2>
          <p className="mb-7 text-tinta-2">
            Aqui no site está um recorte. No Instagram sai o que saiu do
            atendimento naquele dia — antes e depois, bastidor, as alunas que
            acabaram de terminar o curso.
          </p>

          <ul className="flex flex-col gap-3">
            {perfis.map((p) => (
              <li key={p.arroba}>
                <a
                  href={`https://instagram.com/${p.arroba}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-[56px] items-center justify-between gap-4 border border-linha bg-papel px-5 py-3 transition-colors hover:border-ouro-claro focus-visible:outline-2 focus-visible:outline-ouro"
                >
                  <span className="min-w-0">
                    <span className="block font-titulo text-[19px] leading-tight text-tinta">
                      @{p.arroba}
                    </span>
                    <span className="block text-[12.5px] text-tinta-3">{p.papel}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[18px] text-ouro-claro transition-transform group-hover:translate-x-0.5"
                  >
                    →
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
