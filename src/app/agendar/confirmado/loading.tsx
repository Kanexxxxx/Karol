import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Env } from "@/components/ui";
import { Bloco } from "@/components/Esqueleto";

/**
 * A espera da tela de confirmação.
 *
 * É o segundo mais tenso do site inteiro: a cliente acabou de apertar
 * "confirmar horário" e ainda não sabe se deu certo. A página é
 * `force-dynamic` e vai ao banco buscar o agendamento pelo id, então tem
 * espera de verdade aqui — e era exatamente onde não havia nada na tela.
 *
 * Por isso o texto de topo é de verdade, não bloco cinza: "Pronto" chegando
 * na hora responde a única pergunta que ela tem na cabeça, antes mesmo de o
 * banco responder.
 */
export default function Carregando() {
  return (
    <>
      <Cabecalho />
      <main className="flex-1 bg-osso pb-24 lg:pb-0">
        <Env className="py-14 lg:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-ouro">
            Pronto
          </p>
          <Bloco className="mt-4 h-11 w-[85%] max-w-[520px]" />
          <Bloco className="mt-3 h-4 w-[60%] max-w-[340px]" />

          <div className="mt-9 max-w-[560px] border border-linha bg-papel p-6">
            {["w-[72%]", "w-[54%]", "w-[44%]", "w-[62%]"].map((largura, i) => (
              <div key={i} className={i > 0 ? "mt-4" : ""}>
                <Bloco className="h-2.5 w-16" />
                <Bloco className={`mt-2 h-4 ${largura}`} />
              </div>
            ))}
          </div>

          <Bloco className="mt-8 h-[50px] w-full max-w-[300px]" />
        </Env>
      </main>
      <BarraMobile />
    </>
  );
}
