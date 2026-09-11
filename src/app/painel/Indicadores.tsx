import { FOCO, NUMERO } from "./estilos";

/**
 * Os mostradores — números pra ler de relance, sem rolar a tela.
 *
 * É o "painel de avião" que o Kainã pediu: não no visual, na leitura. Cada
 * mostrador responde UMA pergunta que a Karol faz quando pega o celular
 * entre uma cliente e outra, com o número grande e o rótulo pequeno em cima.
 *
 * O desenho vem da faixa `.stats` de um cartão do uiverse.io
 * (uiverse-io/galaxy, `Cards/JaydipPrajapati1910_kind-lionfish-71.html`):
 * células de largura igual, rótulo em caixa alta miúdo, valor forte
 * embaixo, um fio fino entre elas.
 *
 * ⚠️ Lá o fio é `border-left` na 2ª e na 3ª célula. Aqui é `gap-px` sobre
 * fundo `linha`: no celular a grade quebra em duas linhas, e um
 * `border-left` fixo deixaria fio sobrando na beirada e faltando entre as
 * linhas. Com o vão de 1 px, o fio aparece certo em qualquer arranjo.
 */
export function Indicadores({
  rotulo,
  className = "",
  children,
}: {
  /** Nome da faixa pra leitor de tela ("Resumo da agenda"). */
  rotulo: string;
  /** As colunas da grade — cada tela arruma do seu jeito. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={rotulo}>
      <ul className={`grid gap-px border border-linha bg-linha ${className}`}>{children}</ul>
    </section>
  );
}

export function Indicador({
  rotulo,
  valor,
  nota,
  tom = "normal",
  href,
  className = "",
}: {
  rotulo: string;
  valor: React.ReactNode;
  nota?: React.ReactNode;
  /**
   * `destaque`: o número principal da tela (o faturamento).
   * `alerta`: pede ação dela (PIX pra conferir). Mesmo fundo dourado, mas
   * só acende quando há o que fazer — alerta aceso o tempo todo vira
   * paisagem e ninguém mais olha.
   */
  tom?: "normal" | "destaque" | "alerta";
  /** Quando existe, a célula inteira vira link (ex.: pula pra lista). */
  href?: string;
  className?: string;
}) {
  const aceso = tom !== "normal";

  const miolo = (
    <>
      <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase leading-snug tracking-[0.16em] text-tinta-2">
        {tom === "alerta" && (
          <span aria-hidden="true" className="size-1.5 shrink-0 bg-ouro motion-safe:animate-pulse" />
        )}
        {rotulo}
      </p>
      <p
        className={`mt-2.5 text-[34px] leading-none ${NUMERO} ${aceso ? "text-ouro" : "text-tinta"}`}
      >
        {valor}
      </p>
      {nota && <p className="mt-2 text-[12.5px] leading-snug text-tinta-2">{nota}</p>}
    </>
  );

  return (
    <li className={`min-w-0 ${aceso ? "bg-ouro-fundo" : "bg-papel"} ${className}`}>
      {href ? (
        <a
          href={href}
          className={`block h-full p-4 transition-colors hover:bg-ouro-luz/40 focus-visible:-outline-offset-2 ${FOCO}`}
        >
          {miolo}
        </a>
      ) : (
        <div className="h-full p-4">{miolo}</div>
      )}
    </li>
  );
}
