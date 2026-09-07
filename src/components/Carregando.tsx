"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A espera entre uma tela e outra.
 *
 * ---------------------------------------------------------------------
 * Por que NÃO é uma barra no topo
 * ---------------------------------------------------------------------
 *
 * Era. O Kainã reclamou duas vezes: primeiro porque ela mal se movia (a
 * animação levava 9 segundos pra atravessar a tela, então em meio segundo
 * de navegação tinha andado 7%), e depois porque, mesmo consertada,
 * continuava sendo o fio de 3 px que todo site do mundo tem.
 *
 * Ele tinha razão nas duas. E tinha razão numa terceira coisa que não
 * chegou a dizer: no celular, o topo da tela é onde fica a barra de
 * endereço do navegador — que é exatamente onde ninguém está olhando
 * depois de tocar em alguma coisa.
 *
 * Agora é **uma sobrancelha sendo desenhada**, no meio da tela, sobre um
 * vidro fosco. Ninguém mais tem essa espera, porque ela só faz sentido no
 * site de uma designer de sobrancelhas.
 *
 * A técnica do traço vem dos `loaders` do uiverse.io: `stroke-dasharray`
 * do tamanho do caminho e `stroke-dashoffset` animado até zero. Lá é um
 * círculo girando; aqui é um arco que se desenha da esquerda pra direita,
 * na direção em que se desenha uma sobrancelha de verdade.
 *
 * ---------------------------------------------------------------------
 * Como ela sabe que começou e que terminou
 * ---------------------------------------------------------------------
 *
 * COMEÇOU: escuta o clique em qualquer link interno, na fase de captura.
 * Não dá pra usar o `useLinkStatus` do Next — aquele hook só funciona
 * dentro de um `<Link>`, ou seja, daria um indicador por link, e aqui a
 * gente quer um só, valendo pro site inteiro.
 *
 * TERMINOU: a rota mudou. "Rota" aqui inclui a query string, porque o
 * agendamento inteiro anda por query (`?servico=…&cidade=…&dia=…`).
 *
 * ⚠️ Ela é `pointer-events: none`. Uma espera que bloqueia o toque
 * transforma um segundo de carregamento em um segundo de tela travada de
 * verdade — o oposto do que ela existe pra resolver.
 */

function Espera() {
  const caminho = usePathname();
  const busca = useSearchParams();
  const rotaAtual = `${caminho}?${busca}`;

  /** A rota de onde saímos. `null` = nada em andamento. */
  const [saindoDe, setSaindoDe] = useState<string | null>(null);

  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      // deixa passar: botão do meio, abrir em nova aba, já cancelado
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = (e.target as HTMLElement | null)?.closest?.("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      if (!link.getAttribute("href")) return;

      const destino = new URL(link.href, location.href);
      if (destino.origin !== location.origin) return;
      // âncora na mesma página não navega
      if (destino.pathname === location.pathname && destino.search === location.search) return;

      setSaindoDe(`${location.pathname}?${new URLSearchParams(location.search)}`);
    };

    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  /*
    Chegamos quando a rota deixou de ser a de partida.

    ⚠️ Isto é DERIVADO na renderização, não guardado em estado. Zerar o
    `saindoDe` dentro de um efeito funcionaria, mas dispara uma renderização
    em cascata a cada navegação — e o lint reprova, com razão. O valor já
    está todo aqui: a rota de partida e a de agora.

    O `saindoDe` continua apontando pra rota antiga depois de chegar, e
    tudo bem: o próximo clique sobrescreve antes de qualquer coisa aparecer.
  */
  const chegou = saindoDe !== null && saindoDe !== rotaAtual;
  if (saindoDe === null || chegou) return null;

  return (
    <div
      role="progressbar"
      aria-label="Carregando a página"
      aria-valuemin={0}
      aria-valuemax={100}
      className="espera pointer-events-none fixed inset-0 z-[100] grid place-items-center"
    >
      {/* o véu: quase nada de cor, só o suficiente pra a página de trás
          recuar e o desenho ficar sendo a coisa em foco */}
      <div className="absolute inset-0 bg-osso/45" />

      <div className="vidro relative grid size-[104px] place-items-center rounded-full border border-linha/60 shadow-[0_10px_40px_-12px_rgba(51,43,34,0.28)]">
        <svg
          viewBox="0 0 100 46"
          className="w-[62px]"
          aria-hidden="true"
          fill="none"
        >
          {/* o traço de cima: o corpo da sobrancelha */}
          <path
            className="espera__traco"
            d="M8 34 C 22 12, 52 6, 92 18"
          />
          {/* o de baixo, mais fino: é o que faz virar sobrancelha em vez
              de um arco solto */}
          <path
            className="espera__traco espera__traco--fino"
            d="M14 39 C 30 27, 56 25, 84 27"
          />
        </svg>
      </div>
    </div>
  );
}

export function Carregando() {
  // `useSearchParams` exige fronteira de Suspense pra não impedir a
  // renderização estática das páginas pré-geradas.
  return (
    <Suspense fallback={null}>
      <Espera />
    </Suspense>
  );
}
