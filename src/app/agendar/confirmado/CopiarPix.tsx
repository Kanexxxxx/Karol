"use client";

import { useState } from "react";

/**
 * Botão de copiar — serve pra chave PIX e pro código "copia e cola".
 *
 * ⚠️ `navigator.clipboard` falha em mais lugar do que parece: navegador
 * embutido do Instagram, página aberta sem HTTPS, permissão negada. A
 * versão anterior engolia o erro em silêncio — a pessoa tocava, nada
 * acontecia, e ela achava que o botão estava quebrado.
 *
 * Agora, quando a cópia automática não rola, o texto aparece selecionável
 * logo embaixo com a instrução de segurar e copiar. Ninguém fica sem
 * conseguir pagar por causa de uma permissão do navegador.
 */
export function CopiarPix({
  texto,
  rotulo,
  rotuloCopiado = "Copiado ✓",
}: {
  texto: string;
  rotulo: string;
  rotuloCopiado?: string;
}) {
  const [estado, setEstado] = useState<"parado" | "copiado" | "falhou">("parado");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
      setTimeout(() => setEstado("parado"), 3000);
    } catch {
      setEstado("falhou");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copiar}
        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center border border-ouro/40 bg-ouro/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ouro transition-colors hover:bg-ouro hover:text-white"
      >
        {estado === "copiado" ? rotuloCopiado : rotulo}
      </button>

      {estado === "falhou" && (
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] text-tinta-3">
            Seu navegador não deixou copiar sozinho. Segure o dedo no texto abaixo e copie:
          </p>
          <p className="select-all break-all border border-linha bg-papel p-2.5 font-mono text-[11px] text-tinta">
            {texto}
          </p>
        </div>
      )}
    </div>
  );
}
