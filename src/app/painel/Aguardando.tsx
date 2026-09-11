import { formatarPreco } from "@/data/servicos";
import type { Agendamento } from "@/lib/agendamentos";
import { DIA_CURTO, HORA } from "@/lib/datas";
import { AcoesAgendamento } from "./AcoesAgendamento";
import { sinalDoAgendamento } from "./Cartao";
import { BOTAO } from "./estilos";

/**
 * Quem marcou e ainda não pagou o sinal.
 *
 * É a única coisa do painel que depende de a Karol FAZER algo: serviço de
 * R$ 80 ou mais entra como pendente, a cliente recebe o PIX de 50%, e o
 * horário fica preso até ela ver o comprovante e confirmar. Espalhados na
 * agenda por dia, esses cartões se perdiam no meio dos confirmados — ela
 * tinha que rolar 60 dias procurando o selo "Aguardando".
 *
 * Por isso a caixa vem no topo, antes dos dias, e SÓ aparece quando tem
 * alguém esperando. Os botões são os mesmos do cartão (`alterarSituacao`),
 * não uma ação nova: confirmar aqui e confirmar lá embaixo é a mesma coisa.
 */
export function Aguardando({ itens }: { itens: Agendamento[] }) {
  if (itens.length === 0) return null;

  return (
    <section
      id="aguardando"
      aria-labelledby="titulo-aguardando"
      className="scroll-mt-4 border border-ouro-claro bg-papel"
    >
      <div className="border-b border-ouro-claro bg-ouro-fundo px-4 py-3.5 sm:px-5">
        <h2
          id="titulo-aguardando"
          className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-tinta"
        >
          <span aria-hidden="true" className="size-2 bg-ouro motion-safe:animate-pulse" />
          Aguardando o sinal · {itens.length}
        </h2>
        {/* ⚠️ Esta frase já prometeu "a cliente recebe a confirmação no
            WhatsApp". Não é sempre verdade: com a conversa fechada, a
            mensagem só sai por template aprovado na Meta — e se falhar,
            nada avisa. A Karol lendo a promessa deixaria de avisar a
            cliente. O que o toque garante é o horário fechado; é isso
            que fica dito. */}
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-tinta">
          Chegou o comprovante do PIX? Toque em <b>Confirmar</b> e o horário fica
          fechado no nome dela.
        </p>
      </div>

      <ul className="divide-y divide-linha">
        {itens.map((ag) => {
          const sinal = sinalDoAgendamento(ag);
          return (
            <li
              key={ag.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-5"
            >
              <div className="min-w-0">
                <p className="break-words font-titulo text-[21px] leading-tight">
                  {ag.clienteNome}
                </p>
                <p className="mt-0.5 text-[13px] text-tinta-2 lining-nums first-letter:uppercase">
                  {DIA_CURTO.format(ag.inicio)} · {HORA.format(ag.inicio)} · {ag.servicoNome}
                </p>
                {sinal > 0 && (
                  <p className="mt-1 text-[13px] font-semibold text-tinta lining-nums">
                    Sinal de {formatarPreco(sinal / 100)}
                  </p>
                )}
              </div>

              {/* Confirmar vem primeiro: no celular os três botões quebram
                  em duas linhas, e a de cima tem que ser a da ação. */}
              <div className="flex flex-wrap items-center gap-2">
                <AcoesAgendamento id={ag.id} situacao={ag.situacao} />
                {ag.clienteWhatsapp && (
                  <a
                    href={`https://wa.me/${ag.clienteWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir a conversa com ${ag.clienteNome} no WhatsApp`}
                    className={BOTAO.secundario}
                  >
                    Conversa
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
