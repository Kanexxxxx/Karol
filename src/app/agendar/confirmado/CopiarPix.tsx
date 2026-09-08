'use client';

import { useState } from 'react';

export function CopiarPix({ chave }: { chave: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      // fallback
    }
  }

  return (
    <button
      type='button'
      onClick={copiar}
      className='inline-flex min-h-[42px] items-center justify-center border border-ouro/40 bg-ouro/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ouro transition-colors hover:bg-ouro hover:text-white cursor-pointer'
    >
      {copiado ? 'Chave copiada! ✓' : 'Copiar chave PIX'}
    </button>
  );
}
