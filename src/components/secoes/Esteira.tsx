import { Env } from "../ui";

/**
 * O filme de henna e ouro é o único fundo desta faixa. Ele é curto, sem áudio
 * e otimizado para a web; o fundo escuro cobre o tempo de carregamento.
 */
export function Esteira() {
  return (
    <section
      aria-label="Precisão e movimento"
      className="relative isolate min-h-[300px] overflow-hidden bg-[#24160f] text-white sm:min-h-[390px] lg:min-h-[470px]"
    >
      <video
        aria-hidden="true"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 -z-20 size-full object-cover"
      >
        <source src="/motion/henna-ouro-loop.mp4" type="video/mp4" />
      </video>

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(25,14,9,.88)_0%,rgba(25,14,9,.56)_48%,rgba(25,14,9,.16)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-3 border border-white/20 sm:inset-5"
      />

      <Env className="flex min-h-[300px] items-end py-10 sm:min-h-[390px] sm:py-14 lg:min-h-[470px] lg:items-center">
        <div className="max-w-[650px]">
          <p className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.28em] text-[#ead8b2] sm:text-[11px]">
            <span className="h-px w-10 bg-ouro-claro" aria-hidden="true" />
            Matéria, método e movimento
          </p>
          <h2 className="mt-4 font-titulo text-[clamp(38px,7vw,78px)] leading-[0.96] font-light text-balance">
            Precisão começa
            <br />
            <em className="text-[#e7c77f] italic">antes do traço.</em>
          </h2>
          <p className="mt-5 max-w-[42ch] text-[14px] leading-relaxed text-white/76 sm:text-[16px]">
            Cada atendimento combina leitura, técnica e cuidado para chegar
            a um desenho que faça sentido no seu rosto.
          </p>
        </div>
      </Env>
    </section>
  );
}
