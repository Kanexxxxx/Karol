import { REGRAS } from "@/data/negocio";
import { formatarPreco, pedeSinalPorValor } from "@/data/servicos";
import { paraChave } from "@/lib/agenda";
import { podeLembrar, type Agendamento } from "@/lib/agendamentos";
import { DIA_POR_EXTENSO, HORA } from "@/lib/datas";
import { formatarWhatsapp } from "@/lib/telefone";
import { AcoesAgendamento } from "./AcoesAgendamento";
import { Lembrete } from "./Lembrete";
import { Remarcar } from "./Remarcar";
import { NUMERO } from "./estilos";

/**
 * Um agendamento no painel.
 *
 * Estava escrito direto dentro da lista da agenda. Virou componente quando a
 * busca apareceu: os dois lugares mostram a MESMA coisa, e duas cópias do
 * cartão significariam consertar botão em dois arquivos pelo resto da vida.
 *
 * O desenho é o de uma linha de horário: a hora numa coluna própria à
 * esquerda, grande, e a cliente do lado. É a ordem em que a Karol lê a
 * agenda — "às 14h é quem?" — e a coluna alinhada deixa a hora de todos os
 * cartões do dia na mesma vertical, fácil de correr o olho.
 *
 * As três faixas (dados / botões / lembrete) são a estrutura
 * cabeçalho-conteúdo-rodapé do `Card` do 21st.dev (serafimcloud/21st,
 * `components/ui/card.tsx`), separadas por fio em vez de sombra.
 */

/**
 * Quanto de sinal esse agendamento pede, em CENTAVOS. Zero se não pede.
 *
 * Calculado do preço GRAVADO no agendamento, e não do serviço na tabela de
 * hoje: se o preço mudou depois que a cliente marcou, o PIX que ela recebeu
 * foi do valor antigo. É a mesma regra de `valorDoSinal` em
 * `data/servicos.ts` — lá ela pede o objeto do serviço, aqui só há o valor.
 */
export function sinalDoAgendamento(ag: Pick<Agendamento, "servicoPreco">): number {
  if (!pedeSinalPorValor(ag.servicoPreco)) return 0;
  return Math.round((ag.servicoPreco * REGRAS.sinal.porcentagem) / 100);
}

/*
  O selo segue a lógica das variantes do `Badge` do 21st.dev
  (`components/ui/badge.tsx`): um mapa de situação → estilo.

  A diferença é de propósito: o estado NORMAL é o mais quieto. "Confirmado"
  é o que quase todo cartão tem; se ele gritasse (era dourado cheio), o
  pendente — o único que pede ação — não teria como se destacar.
*/
const SELO: Record<Agendamento["situacao"], { texto: string; classe: string }> = {
  pendente: { texto: "Aguardando sinal", classe: "border-ouro-claro bg-ouro-fundo text-tinta" },
  confirmado: { texto: "Confirmado", classe: "border-linha text-tinta-2" },
  concluido: { texto: "Atendida", classe: "border-transparent bg-creme text-tinta-2" },
  cancelado: { texto: "Cancelado", classe: "border-transparent bg-[#f0e2df] text-[#9d3b2f]" },
  faltou: { texto: "Faltou", classe: "border-transparent bg-[#f0e2df] text-[#9d3b2f]" },
};

export function Cartao({
  ag,
  comData = false,
  ordem = 0,
}: {
  ag: Agendamento;
  /** A agenda já agrupa por dia; a busca não, então lá o dia entra no cartão. */
  comData?: boolean;
  /** Posição na lista — só pro atraso da entrada. */
  ordem?: number;
}) {
  const pendente = ag.situacao === "pendente";
  const desfeito = ag.situacao === "cancelado" || ag.situacao === "faltou";
  const encerrado = desfeito || ag.situacao === "concluido";
  const sinal = pendente ? sinalDoAgendamento(ag) : 0;
  // Pendente sem sinal só acontece com aprovação manual ligada — aí não é
  // PIX que ela espera, e o selo não pode dizer que é.
  const selo = pendente && sinal === 0 ? "Aguardando" : SELO[ag.situacao].texto;

  // A mesma condição com que o `Lembrete` decide sumir. Conferida aqui pra
  // não sobrar a faixa vazia com fio em cima quando não há lembrete.
  const temLembrete = podeLembrar(ag) || ag.avisado30minEm !== null;

  return (
    <li
      id={`ag-${ag.id}`}
      /*
        A entrada escalonada é a do `AnimatedList` do reactbits (cada item
        chega com um pequeno atraso a mais que o anterior), com o desfoque
        do `FadeContent`. Lá é `motion` e `gsap`; aqui é `@starting-style`
        (`starting:` no Tailwind), que o navegador faz sozinho e só na
        PRIMEIRA vez que o cartão aparece — confirmar um agendamento
        re-renderiza a lista, e o cartão não pisca de novo.

        O atraso para no 8º cartão: numa agenda de 60 dias, o último
        esperaria segundos pra aparecer.
      */
      style={{ transitionDelay: `${Math.min(ordem, 8) * 45}ms` }}
      className={`scroll-mt-4 border transition-[opacity,translate,filter] duration-500 ease-marca starting:translate-y-2 starting:opacity-0 starting:blur-[2px] motion-reduce:transition-none ${
        pendente
          ? "border-ouro-claro border-l-[3px] border-l-ouro bg-papel"
          : encerrado
            ? "border-linha bg-osso"
            : "border-linha bg-papel"
      }`}
    >
      <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3.5 p-4 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-x-5 sm:p-5">
        <div>
          <p
            className={`text-[27px] leading-none sm:text-[31px] ${NUMERO} ${
              desfeito ? "text-tinta-3 line-through decoration-1" : "text-ouro"
            }`}
          >
            <time dateTime={ag.inicio.toISOString()}>{HORA.format(ag.inicio)}</time>
          </p>
          <p className="mt-1.5 text-[11.5px] text-tinta-2 lining-nums">até {HORA.format(ag.fim)}</p>
        </div>

        <div className="min-w-0">
          {comData && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-tinta-2 first-letter:uppercase">
              {DIA_POR_EXTENSO.format(ag.inicio)}
            </p>
          )}

          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            {/* `break-words`: nome comprido sem espaço ("MariaEduardaSouza")
                é o que empurrava o cartão pra fora da tela no celular. */}
            <p className="min-w-0 break-words font-titulo text-[22px] leading-tight sm:text-[24px]">
              {ag.clienteNome}
            </p>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${SELO[ag.situacao].classe}`}
            >
              {pendente && (
                <span aria-hidden="true" className="size-1.5 bg-ouro motion-safe:animate-pulse" />
              )}
              {selo}
            </span>
          </div>

          <p className="mt-1 text-[14px] text-tinta">
            {ag.servicoNome}
            <span className="text-tinta-2 lining-nums"> · {formatarPreco(ag.servicoPreco / 100)}</span>
          </p>

          {/* O código sumiu daqui também. A Karol acha a cliente pelo nome
              ou pelo telefone, que é o que ela tem na conversa. O código
              continua existindo por baixo, só como chave do link que abre
              este agendamento — ninguém digita, ninguém vê. */}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-tinta-2">
            <span>{ag.cidade}</span>
            <span aria-hidden="true" className="text-linha">
              |
            </span>
            {/* Marcado pelo painel pra alguém da família, o WhatsApp pode
                vir vazio — e `wa.me/` sem número abre uma tela de erro. */}
            {ag.clienteWhatsapp ? (
              <a
                href={`https://wa.me/${ag.clienteWhatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ouro underline decoration-ouro-claro underline-offset-2 lining-nums hover:decoration-ouro"
              >
                {formatarWhatsapp(ag.clienteWhatsapp)}
              </a>
            ) : (
              <span>sem WhatsApp</span>
            )}
          </p>

          {ag.observacao && (
            <p className="mt-2.5 border-l-2 border-linha pl-3 text-[13px] leading-snug text-tinta-2">
              {ag.observacao}
            </p>
          )}

          {pendente && (
            <p className="mt-3 bg-ouro-fundo px-3 py-2 text-[13px] leading-snug text-tinta">
              {sinal > 0 ? (
                <>
                  Esperando o sinal de <b className="lining-nums">{formatarPreco(sinal / 100)}</b>.
                  Confirme quando o comprovante do PIX chegar.
                </>
              ) : (
                <>Esperando você confirmar.</>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-2 border-t border-linha px-4 py-3 sm:px-5">
        <AcoesAgendamento id={ag.id} situacao={ag.situacao} />
        <Remarcar id={ag.id} diaAtual={paraChave(ag.inicio)} horaAtual={HORA.format(ag.inicio)} />
      </div>

      {/*
        O lembrete fica numa faixa própria, separado por fio: os botões de
        cima MUDAM o agendamento, este só manda uma mensagem. Ter "Cancelar"
        e "Lembrar agora" colados, do mesmo tamanho e da mesma cor, é
        convite pra toque errado no celular.

        `podeEnviar` é decidido AQUI, no servidor, e não dentro do
        componente de cliente. Comparar com `new Date()` no navegador daria
        resultado diferente do servidor na primeira renderização — é o
        clássico erro de hidratação — e ainda usaria o fuso do celular dela
        em vez do FUSO do negócio.
      */}
      {temLembrete && (
        <div className="border-t border-linha px-4 py-2 sm:px-5">
          <Lembrete
            id={ag.id}
            enviadoAs={ag.avisado30minEm ? HORA.format(ag.avisado30minEm) : null}
            podeEnviar={podeLembrar(ag)}
          />
        </div>
      )}
    </li>
  );
}
