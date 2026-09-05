"use client";

import { useEffect } from "react";

/**
 * Faz os blocos marcados com [data-revelar] subirem e aparecerem ao rolar.
 *
 * A opacidade zero só é aplicada aqui, pelo JS. Se o script não rodar, a
 * página fica visível do mesmo jeito — conteúdo invisível nunca é uma opção
 * num site de cliente. E ainda existe um prazo de segurança que revela tudo
 * caso o observador não dispare por qualquer motivo.
 */
export function Revelar() {
  useEffect(() => {
    const alvos = Array.from(
      document.querySelectorAll<HTMLElement>("[data-revelar]"),
    );
    if (alvos.length === 0) return;

    const revelar = (el: HTMLElement) => el.classList.add("dentro");

    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (parado || !("IntersectionObserver" in window)) {
      alvos.forEach(revelar);
      return;
    }

    alvos.forEach((el) => el.setAttribute("data-revelando", ""));

    const olho = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (e.isIntersecting) {
            revelar(e.target as HTMLElement);
            olho.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    alvos.forEach((el) => olho.observe(el));

    const rede = window.setTimeout(() => alvos.forEach(revelar), 2500);
    const aoImprimir = () => alvos.forEach(revelar);
    window.addEventListener("beforeprint", aoImprimir);

    return () => {
      olho.disconnect();
      window.clearTimeout(rede);
      window.removeEventListener("beforeprint", aoImprimir);
    };
  }, []);

  return null;
}
