import Image from "next/image";
import { ESTEIRA } from "@/data/fotos";

/**
 * Esteira de fotos deslizando da direita pra esquerda, em loop.
 *
 * A lista é duplicada e a animação anda exatamente -50%, então a emenda
 * cai num ponto idêntico e o laço fica invisível. Para quando o ponteiro
 * encosta, e não anda para quem pediu menos movimento.
 */
export function Esteira() {
  const fotos = [...ESTEIRA, ...ESTEIRA];

  return (
    <div
      aria-hidden="true"
      className="group overflow-hidden border-y border-linha bg-creme py-3.5 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
    >
      <div className="flex w-max gap-3 motion-safe:animate-[desliza_42s_linear_infinite] group-hover:[animation-play-state:paused]">
        {fotos.map((foto, i) => (
          <div key={`${foto.arquivo}-${i}`} className="w-[130px] shrink-0 md:w-[180px]">
            <Image
              src={foto.arquivo}
              alt=""
              width={foto.largura}
              height={foto.altura}
              sizes="180px"
              className="aspect-3/4 w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
