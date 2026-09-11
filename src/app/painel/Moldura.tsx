import Link from "next/link";
import { sair } from "./acoes";
import { BOTAO, FOCO } from "./estilos";

/** A mesma largura em todas as telas do painel — topo, conteúdo e rodapé. */
export const LARGURA = "mx-auto w-full max-w-[960px] px-5";

type Aba = "agenda" | "relatorio" | "bloqueios";

/*
  "Mensagens" (/painel/notificacoes) NÃO entra aqui. Saiu do menu dela a
  pedido do Kainã: a tela mostra números sem nome e diagnóstico técnico.
  Continua existindo pelo endereço, como ferramenta de quem for consertar.
*/
const ABAS: { id: Aba; href: string; rotulo: string }[] = [
  { id: "agenda", href: "/painel", rotulo: "Agenda" },
  { id: "relatorio", href: "/painel/relatorio", rotulo: "Relatório" },
  { id: "bloqueios", href: "/painel/bloqueios", rotulo: "Bloqueios" },
];

/**
 * O topo de todas as telas do painel.
 *
 * Antes cada tela desenhava o seu: a agenda tinha cinco itens soltos numa
 * linha (que quebrava de qualquer jeito no celular), e as outras só um
 * "← Agenda". Pra ir do relatório aos bloqueios, a Karol voltava à agenda
 * primeiro.
 *
 * As três seções ficam num controle segmentado — a ideia do `TabsList` do
 * 21st.dev (serafimcloud/21st, `components/ui/tabs.tsx`): uma faixa de
 * fundo neutro com a aba ativa "levantada" em fundo claro e sombra curta.
 * Aqui em canto reto e nas cores do site. São LINKS, não abas de
 * JavaScript: cada seção é uma página, e o voltar do celular continua
 * fazendo o que se espera.
 *
 * "Sair" desceu pro rodapé. A sessão dura 7 dias, é o botão que ela menos
 * usa, e no topo ele disputava espaço — e toque — com o "Marcar".
 */
export function CabecalhoPainel({
  titulo,
  detalhe,
  aba,
  marcar = true,
}: {
  titulo: string;
  /** A linha pequena embaixo do título: a data de hoje, o mês do relatório. */
  detalhe?: React.ReactNode;
  /** Qual seção acende. Sem aba, nenhuma acende (ex.: marcar horário). */
  aba?: Aba;
  /** Esconde o "+ Marcar" na própria tela de marcar. */
  marcar?: boolean;
}) {
  return (
    <header className="border-b border-linha bg-papel">
      <div className={`${LARGURA} pt-4 pb-3.5`}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-ouro">
              Karol Carvalho · Painel
            </p>
            <h1 className="mt-1 font-titulo text-[28px] leading-none tracking-[0.01em]">
              {titulo}
            </h1>
            {detalhe && (
              <p className="mt-1.5 text-[12.5px] text-tinta-2 lining-nums first-letter:uppercase">
                {detalhe}
              </p>
            )}
          </div>

          {marcar && (
            <Link href="/painel/novo" className={`${BOTAO.primario} shrink-0`}>
              <span aria-hidden="true" className="text-[15px] leading-none">
                +
              </span>
              Marcar
            </Link>
          )}
        </div>

        <nav aria-label="Seções do painel" className="mt-4">
          {/* `grid-cols-3` no celular: as três dividem a largura em partes
              iguais e nunca empurram a página pro lado. */}
          <ul className="grid grid-cols-3 gap-1 border border-linha bg-osso p-1 sm:inline-grid sm:w-[420px]">
            {ABAS.map((a) => {
              const ativa = a.id === aba;
              return (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    aria-current={ativa ? "page" : undefined}
                    className={`flex min-h-[44px] items-center justify-center px-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${FOCO} ${
                      ativa
                        ? "bg-papel text-tinta shadow-[0_1px_3px_rgb(51_43_34/0.14)]"
                        : "text-tinta-2 hover:bg-papel/70 hover:text-ouro"
                    }`}
                  >
                    {a.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** O pé das telas do painel: voltar ao site e sair. */
export function RodapePainel() {
  return (
    <footer className={`${LARGURA} mt-auto pt-14 pb-10`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linha pt-4">
        <Link
          href="/"
          className={`inline-flex min-h-[44px] items-center text-[12.5px] text-tinta-2 underline decoration-linha underline-offset-4 hover:text-ouro ${FOCO}`}
        >
          Ver o site
        </Link>
        <form action={sair}>
          <button type="submit" className={BOTAO.secundario}>
            Sair do painel
          </button>
        </form>
      </div>
    </footer>
  );
}
