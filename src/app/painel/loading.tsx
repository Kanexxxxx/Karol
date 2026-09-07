import { Bloco, CabecalhoEsqueleto, CartaoEsqueleto } from "@/components/Esqueleto";

/**
 * A espera do painel.
 *
 * Vale pra `/painel` e, por herança, pra toda tela do painel que não tenha
 * o seu próprio — bloqueios, marcar, notificações. Por isso o desenho é o
 * denominador comum: faixa do topo, um campo largo, e blocos de conteúdo.
 * O relatório tem forma bem diferente e ganhou o dele.
 *
 * A agenda é `force-dynamic` e lê 60 dias do Supabase toda vez que abre.
 * Era a tela onde o congelamento aparecia mais, e é a que a Karol usa no
 * celular no meio do atendimento.
 */
export default function Carregando() {
  return (
    <main className="min-h-dvh bg-osso">
      <CabecalhoEsqueleto titulo="Painel" />

      <div className="mx-auto max-w-[900px] px-5 py-8">
        {/* o campo de busca */}
        <div className="mb-8 flex gap-2">
          <Bloco className="h-[44px] flex-1" />
          <Bloco className="h-[44px] w-28 shrink-0" />
        </div>

        <div className="flex flex-col gap-9">
          {[3, 2].map((quantos, i) => (
            <section key={i}>
              <Bloco className="mb-3 h-3 w-40" />
              <ul className="flex flex-col gap-2.5">
                {Array.from({ length: quantos }).map((_, j) => (
                  <CartaoEsqueleto key={j} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
