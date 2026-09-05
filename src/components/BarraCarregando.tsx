"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Barra de progresso no topo, durante a navegação.
 *
 * Por que existe: cada passo do agendamento (serviço → dia → hora) é uma
 * página nova que consulta o Supabase antes de renderizar. Sem nada na tela,
 * o toque parece não ter funcionado e a pessoa toca de novo — o site passa
 * a impressão de lento sem estar.
 *
 * Por que não é o `useLinkStatus` do Next: aquele hook só funciona dentro de
 * um `<Link>`, ou seja, daria um indicador por link. Aqui queremos uma barra
 * só, no topo, valendo pro site inteiro.
 *
 * Como sabe que começou: escuta o clique em qualquer link interno, na fase
 * de captura. Como sabe que terminou: a rota mudou — e "rota" aqui inclui a
 * query string, porque o agendamento inteiro anda por query.
 *
 * O avanço é animação de CSS, não intervalo em JS: além de mais suave, evita
 * mexer em estado dentro de efeito a cada quadro.
 */

function Barra() {
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

  if (saindoDe === null) return null;

  // Chegamos quando a rota deixou de ser a de partida.
  const chegou = saindoDe !== rotaAtual;

  return (
    <div
      role="progressbar"
      aria-label="Carregando a página"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={chegou ? 100 : undefined}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className={chegou ? "barra-carregando-fim" : "barra-carregando"}
        // some sozinha quando o desaparecer termina — sem timer em efeito
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && chegou) setSaindoDe(null);
        }}
      />
    </div>
  );
}

export function BarraCarregando() {
  // `useSearchParams` exige fronteira de Suspense pra não impedir a
  // renderização estática das páginas pré-geradas.
  return (
    <Suspense fallback={null}>
      <Barra />
    </Suspense>
  );
}
