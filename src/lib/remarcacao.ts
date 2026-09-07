import "server-only";

import { banco } from "./banco";
import { buscarAgendamento, gradeDoDiaNaAgenda, type Agendamento } from "./agendamentos";
import { paraChave, primeiroDiaDisponivel } from "./agenda";
import { buscarServico } from "@/data/servicos";
import { CIDADES, type CidadeId } from "@/data/negocio";

/**
 * Remarcar pelo WhatsApp — o pedido que atravessa várias mensagens.
 *
 * O webhook é sem memória: cada mensagem chega sozinha. Remarcar são quatro
 * momentos com espera humana entre eles, então o estado mora no banco. Ver
 * `supabase/migracao-03-remarcacoes.sql`.
 *
 *   cliente toca "Remarcar"  →  oferecerHorarios()   situação: oferecido
 *   cliente escolhe da lista →  registrarEscolha()   situação: aguardando-karol
 *   Karol confirma           →  confirmar()          situação: feito
 *   Karol recusa             →  recusar()            situação: recusado
 *
 * ⚠️ O horário só muda no passo 3, e quem aperta é a Karol. A cliente
 * escolhe, não decide — é a regra dela no briefing
 * (`REGRAS.clientePodeCancelar` é `false`).
 */

/** Quantos horários cabem numa lista do WhatsApp. O limite da Meta é 10. */
const MAX_OPCOES = 8;

/** Quantos dias pra frente procurar antes de desistir. */
const DIAS_PROCURADOS = 14;

export type Opcao = {
  /** ISO do início. É o que vira o novo período se a Karol confirmar. */
  inicioISO: string;
  /** "Qua 09/09 às 07:15" — o que a cliente lê na lista. */
  rotulo: string;
};

export type Remarcacao = {
  id: string;
  agendamentoId: string;
  whatsapp: string;
  opcoes: Opcao[];
  escolhidoISO: string | null;
  situacao: "oferecido" | "aguardando-karol" | "feito" | "recusado" | "expirado";
};

const DIA_CURTO = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const HORA_CURTA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/**
 * Rótulo curto o suficiente pra caber na linha da lista.
 *
 * ⚠️ O título de uma linha tem limite de **24 caracteres** na Meta.
 * "quarta-feira, 09 de setembro às 07:15" tem 37 e seria recusado.
 */
export function rotuloCurto(d: Date): string {
  const dia = DIA_CURTO.format(d).replace(".", "");
  return `${dia} ${HORA_CURTA.format(d)}`.slice(0, 24);
}

function linhaParaRemarcacao(r: Record<string, unknown>): Remarcacao {
  return {
    id: r.id as string,
    agendamentoId: r.agendamento_id as string,
    whatsapp: r.whatsapp as string,
    opcoes: (r.opcoes as Opcao[]) ?? [],
    escolhidoISO: (r.escolhido as string | null) ?? null,
    situacao: r.situacao as Remarcacao["situacao"],
  };
}

/**
 * Os próximos horários livres pro MESMO serviço, na MESMA cidade.
 *
 * Mesma cidade de propósito: o expediente dela depende de onde ela está no
 * dia, então oferecer sábado em Bandeirantes pra quem marcou em Pereira
 * Barreto seria mandar a pessoa pra outra cidade sem avisar.
 */
export async function horariosParaOferecer(ag: Agendamento): Promise<Opcao[]> {
  const servico = buscarServico(ag.servicoId);
  if (!servico) return [];

  const cidadeId = (Object.entries(CIDADES).find(([, c]) => c.nome === ag.cidade)?.[0] ??
    null) as CidadeId | null;

  const opcoes: Opcao[] = [];
  const dia = primeiroDiaDisponivel();

  for (let i = 0; i < DIAS_PROCURADOS && opcoes.length < MAX_OPCOES; i++) {
    const data = new Date(dia);
    data.setDate(dia.getDate() + i);
    const grade = await gradeDoDiaNaAgenda(servico, paraChave(data));

    for (const vaga of grade) {
      if (opcoes.length >= MAX_OPCOES) break;
      if (!vaga.livre) continue;
      if (cidadeId && vaga.cidade !== cidadeId) continue;

      const quando = new Date(data);
      quando.setHours(0, vaga.inicio, 0, 0);
      // Não oferecer o horário que ela já tem: escolher o mesmo não é
      // remarcar, e confirmá-lo bateria na trava do banco contra ela mesma.
      if (quando.getTime() === ag.inicio.getTime()) continue;

      opcoes.push({ inicioISO: quando.toISOString(), rotulo: rotuloCurto(quando) });
    }
  }

  return opcoes;
}

/**
 * Abre o pedido e guarda o que foi oferecido.
 *
 * Fecha qualquer pedido anterior do mesmo número: se ela tocou em
 * "Remarcar" duas vezes, a lista velha não pode continuar valendo — os
 * índices apontariam pra horários que já não estão na tela dela.
 */
export async function abrirPedido(
  ag: Agendamento,
  opcoes: Opcao[],
): Promise<Remarcacao | null> {
  const bd = banco();
  if (!bd || opcoes.length === 0) return null;

  await bd
    .from("remarcacoes")
    .update({ situacao: "expirado" })
    .eq("whatsapp", ag.clienteWhatsapp)
    .in("situacao", ["oferecido", "aguardando-karol"]);

  const { data, error } = await bd
    .from("remarcacoes")
    .insert({
      agendamento_id: ag.id,
      whatsapp: ag.clienteWhatsapp,
      opcoes,
      situacao: "oferecido",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("não consegui abrir a remarcação:", error?.message);
    return null;
  }
  return linhaParaRemarcacao(data);
}

/** O pedido em aberto deste número, se houver. */
export async function pedidoAberto(whatsapp: string): Promise<Remarcacao | null> {
  const bd = banco();
  if (!bd) return null;

  const { data } = await bd
    .from("remarcacoes")
    .select("*")
    .eq("whatsapp", whatsapp)
    .in("situacao", ["oferecido", "aguardando-karol"])
    .order("criado_em", { ascending: false })
    .limit(1);

  const linha = (data ?? [])[0];
  return linha ? linhaParaRemarcacao(linha) : null;
}

export async function buscarPedido(id: string): Promise<Remarcacao | null> {
  const bd = banco();
  if (!bd) return null;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return null;

  const { data } = await bd.from("remarcacoes").select("*").eq("id", id).maybeSingle();
  return data ? linhaParaRemarcacao(data) : null;
}

/**
 * A cliente escolheu. Agora é a vez da Karol.
 *
 * O índice é conferido contra o que FOI OFERECIDO: sem isso, uma resposta
 * com índice inventado moveria o horário pra qualquer lugar.
 */
export async function registrarEscolha(
  pedido: Remarcacao,
  indice: number,
): Promise<Opcao | null> {
  const bd = banco();
  const opcao = pedido.opcoes[indice];
  if (!bd || !opcao) return null;

  const { error } = await bd
    .from("remarcacoes")
    .update({ escolhido: opcao.inicioISO, situacao: "aguardando-karol" })
    .eq("id", pedido.id)
    .eq("situacao", "oferecido");

  if (error) {
    console.error("não consegui registrar a escolha:", error.message);
    return null;
  }
  return opcao;
}

/** Fecha o pedido — chamado depois que a Karol decidiu. */
export async function fechar(
  id: string,
  situacao: "feito" | "recusado",
): Promise<void> {
  const bd = banco();
  if (!bd) return;
  await bd.from("remarcacoes").update({ situacao }).eq("id", id);
}

/** O agendamento por trás do pedido, pra montar as mensagens. */
export async function agendamentoDoPedido(p: Remarcacao): Promise<Agendamento | null> {
  return buscarAgendamento(p.agendamentoId);
}
