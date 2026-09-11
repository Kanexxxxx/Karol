import { Bloco, CartaoEsqueleto } from "@/components/Esqueleto";
import { CabecalhoPainel, LARGURA } from "./Moldura";

/**
 * A espera do painel.
 *
 * Vale pra `/painel` e, por herança, pra toda tela do painel que não tenha
 * o seu próprio — bloqueios, marcar, notificações. Por isso o desenho é o
 * denominador comum: o topo, um campo largo, a faixa de mostradores e
 * blocos de conteúdo. O relatório tem forma bem diferente e ganhou o dele.
 *
 * O topo é o DE VERDADE, não um esqueleto dele: não depende do banco, e ver
 * o menu já no lugar é o que diz "seu toque pegou". Sem aba acesa porque
 * este arquivo não sabe pra qual seção ela está indo.
 *
 * A agenda é `force-dynamic` e lê 60 dias do Supabase toda vez que abre.
 * Era a tela onde o congelamento aparecia mais, e é a que a Karol usa no
 * celular no meio do atendimento.
 */
export default function Carregando() {
  return (
    <main className="flex min-h-dvh flex-col bg-osso">
      <CabecalhoPainel titulo="Painel" />

      <div className={`${LARGURA} flex flex-col gap-8 py-6 sm:py-8`}>
        {/* o campo de busca */}
        <Bloco className="h-[48px]" />

        {/* os mostradores */}
        <div className="grid grid-cols-3 gap-px border border-linha bg-linha sm:grid-cols-[1.7fr_1fr_1fr_1fr]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`bg-papel p-4 ${i === 0 ? "col-span-3 sm:col-span-1" : ""}`}>
              <Bloco className="h-2.5 w-16" />
              <Bloco className="mt-3.5 h-8 w-12" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-10">
          {[3, 2].map((quantos, i) => (
            <section key={i}>
              <div className="mb-3 border-b border-linha pb-2.5">
                <Bloco className="h-2.5 w-14" />
                <Bloco className="mt-2 h-5 w-40" />
              </div>
              <ul className="flex flex-col gap-3">
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
