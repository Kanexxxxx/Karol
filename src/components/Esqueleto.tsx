/**
 * Peças de esqueleto — o desenho cinza que ocupa a tela enquanto a página
 * de verdade é montada no servidor.
 *
 * Por que isto existe: o projeto tinha UM `loading.tsx`, no `/agendar`.
 * Todas as outras rotas — painel, relatório, bloqueios, `/sobre` — não
 * tinham nenhum. Sem `loading.tsx`, o Next segura a tela ANTIGA congelada
 * até a nova ficar pronta, e o único sinal de vida é a barra de 3 px no
 * topo. O toque parece não ter pego, a pessoa toca de novo, e o site passa
 * a impressão de travado sem estar.
 *
 * O painel é o caso mais grave: ele é `force-dynamic` e puxa 60 dias de
 * agendamento do Supabase a cada abertura. É também a tela que a Karol usa
 * no celular, no meio do atendimento.
 *
 * A regra do esqueleto: ele imita o ESQUELETO da página, não a página. Se
 * ficar parecido demais, a troca pelo conteúdo real vira um susto; se ficar
 * genérico demais, não conta nada sobre o que está vindo.
 */

/** Um retângulo pulsando. É a única peça — o resto é composição. */
export function Bloco({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-linha ${className}`} />;
}

/**
 * A faixa branca do topo das telas do painel.
 *
 * O título vai em texto de verdade, não em bloco cinza: ele é a única coisa
 * que a gente JÁ SABE antes de o banco responder, e ver o nome da tela
 * certa chegando na hora é o que diz "seu toque pegou, é aqui mesmo".
 */
export function CabecalhoEsqueleto({ titulo }: { titulo: string }) {
  return (
    <header className="border-b border-linha bg-papel">
      <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="font-titulo text-xl uppercase tracking-[0.14em]">{titulo}</p>
          <Bloco className="mt-1.5 h-2.5 w-24" />
        </div>
        <Bloco className="h-3 w-16" />
      </div>
    </header>
  );
}

/** Um cartão de agendamento, do tamanho aproximado do real. */
export function CartaoEsqueleto() {
  return (
    <li className="border border-linha bg-papel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Bloco className="h-5 w-[62%] max-w-[260px]" />
          <Bloco className="mt-2.5 h-3 w-[46%] max-w-[190px]" />
          <Bloco className="mt-2 h-2.5 w-[34%] max-w-[140px]" />
        </div>
        <Bloco className="h-5 w-20 shrink-0" />
      </div>
      <div className="mt-3.5 flex gap-2">
        <Bloco className="h-7 w-24" />
        <Bloco className="h-7 w-20" />
      </div>
    </li>
  );
}
