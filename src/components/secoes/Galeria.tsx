import Image from "next/image";
import { FAIXA_DE_TEXTURAS } from "@/data/fotos";
import { NEGOCIO } from "@/data/negocio";
import { Cabeca, Env, Revela } from "../ui";

/**
 * O lugar onde ficava a galeria.
 *
 * ---------------------------------------------------------------------
 * ⚠️ ISTO NÃO É GALERIA DE TRABALHOS, E O TEXTO NÃO PODE SUGERIR QUE SEJA
 * ---------------------------------------------------------------------
 *
 * A v1 tinha duas seções aqui: 24 trabalhos ("clientes de verdade, sem
 * filtro e sem retoque") e 6 alunas com o certificado na mão. Trinta
 * rostos. As duas saíram inteiras na v2 — não dava pra encolher, porque o
 * problema não era a quantidade.
 *
 * O que ficou é uma faixa de três texturas e uma frase que diz a verdade:
 * o trabalho existe, e ele está no Instagram dela, onde quem aparece
 * escolheu aparecer.
 *
 * ⚠️ Se alguém for mexer no texto: nada aqui pode dar a entender que as
 * imagens são trabalho dela. São pigmento, henna e seda — material, não
 * resultado. A legenda de cada uma diz exatamente o que é.
 */
export function Trabalhos() {
  return (
    <section id="galeria" className="py-15 lg:py-23">
      <Env>
        <Revela>
          <Cabeca
            rotulo="O que a gente usa"
            titulo="Henna, pigmento e paciência"
            texto="O trabalho pronto sai no Instagram, com o rosto de quem escolheu aparecer. Aqui ficam os materiais."
          />
        </Revela>

        <Revela>
          <ul className="grid grid-cols-3 gap-2 md:gap-4">
            {FAIXA_DE_TEXTURAS.map((foto) => (
              <li key={foto.arquivo}>
                <figure className="relative m-0 overflow-hidden bg-creme">
                  <Image
                    src={foto.arquivo}
                    alt={foto.alt}
                    width={foto.largura}
                    height={foto.altura}
                    sizes="(min-width: 768px) 33vw, 33vw"
                    loading="lazy"
                    className="aspect-square w-full object-cover md:aspect-4/3"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#16110C]/75 to-transparent px-2.5 pt-8 pb-2 text-[9.5px] font-bold uppercase tracking-[0.13em] text-white md:px-3 md:text-[10.5px]">
                    {foto.legenda}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Revela>

        <Revela>
          <p className="mx-auto mt-7 max-w-[560px] text-center text-[14.5px] text-tinta-2">
            Trabalho novo toda semana em{" "}
            <a
              href={`https://instagram.com/${NEGOCIO.instagram.studio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ouro underline decoration-ouro-claro underline-offset-2 hover:decoration-ouro"
            >
              @{NEGOCIO.instagram.studio}
            </a>
            .
          </p>
        </Revela>
      </Env>
    </section>
  );
}

/*
  ⚠️ `Alunas` NÃO EXISTE MAIS, e some daqui de propósito.

  Eram seis fotos de alunas com o certificado — cada uma com o NOME
  COMPLETO escrito à mão no papel, o que obrigou a v1 a ter um script
  (`ferramentas/anonimizar.py`) só pra pixelizar a metade de baixo de cada
  certificado antes de publicar.

  Esse script é a melhor prova de que a seção não cabia num site que não
  quer guardar dado de ninguém: ele existia pra apagar, de dentro de uma
  foto, o dado que não devia estar lá. Na v2 a foto não entra, e o
  problema não precisa de solução.

  A prova do curso continua no texto da seção `Curso` e no Instagram dela.
*/
