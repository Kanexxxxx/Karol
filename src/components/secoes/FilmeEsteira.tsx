"use client";

import { useEffect, useRef, useState } from "react";

const REDUZ_MOVIMENTO = "(prefers-reduced-motion: reduce)";

/**
 * Só cria o vídeo quando a seção está perto da tela e o visitante aceita
 * movimento. Esconder um `<video autoPlay>` por CSS não basta: o navegador
 * ainda pode baixar e decodificar o arquivo, mesmo sem mostrar um pixel.
 */
export function FilmeEsteira() {
  const area = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [movimentoPermitido, setMovimentoPermitido] = useState(false);
  const [pertoDaTela, setPertoDaTela] = useState(false);
  const [pedidoPeloVisitante, setPedidoPeloVisitante] = useState(false);
  const [pausadoPeloVisitante, setPausadoPeloVisitante] = useState(false);
  const [reproduzindo, setReproduzindo] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const preferencia = window.matchMedia(REDUZ_MOVIMENTO);
    const sincronizar = () => setMovimentoPermitido(!preferencia.matches);

    sincronizar();
    preferencia.addEventListener("change", sincronizar);
    return () => preferencia.removeEventListener("change", sincronizar);
  }, []);

  useEffect(() => {
    const elemento = area.current;
    if (!elemento) return;

    if (typeof IntersectionObserver === "undefined") {
      const proximoQuadro = requestAnimationFrame(() => setPertoDaTela(true));
      return () => cancelAnimationFrame(proximoQuadro);
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        setPertoDaTela(entrada.isIntersecting);
        if (!entrada.isIntersecting) setReproduzindo(false);
      },
      { rootMargin: "320px 0px" },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  function alternar() {
    if (reproduzindo) {
      video.current?.pause();
      setPausadoPeloVisitante(true);
      return;
    }

    // Quem escolheu reduzir movimento ainda pode iniciar o filme por vontade
    // própria. O clique é um gesto do usuário, aceito pela política de autoplay.
    setPedidoPeloVisitante(true);
    setPausadoPeloVisitante(false);
    setPertoDaTela(true);
    if (video.current) void video.current.play().catch(() => setReproduzindo(false));
  }

  return (
    <>
      <div ref={area} aria-hidden="true" className="absolute inset-0 -z-20">
        {pertoDaTela && (movimentoPermitido || pedidoPeloVisitante) && !erro && (
          <video
            ref={video}
            autoPlay={!pausadoPeloVisitante}
            loop
            muted
            playsInline
            preload="none"
            onPlay={() => setReproduzindo(true)}
            onPause={() => setReproduzindo(false)}
            onError={() => setErro(true)}
            className="size-full object-cover"
          >
            <source src="/motion/henna-ouro-loop.mp4" type="video/mp4" />
          </video>
        )}
      </div>
      <button
        type="button"
        onClick={alternar}
        disabled={erro}
        aria-label={erro ? "Vídeo indisponível" : reproduzindo ? "Pausar vídeo" : "Reproduzir vídeo"}
        className="absolute top-5 right-5 z-20 inline-flex min-h-11 items-center rounded-full border border-white/45 bg-[#26170e]/55 px-4 text-[11px] font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl transition-colors hover:bg-[#26170e]/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {erro ? "Vídeo indisponível" : reproduzindo ? "Pausar vídeo" : "Ver vídeo"}
      </button>
    </>
  );
}
