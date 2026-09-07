import "server-only";

import { NEGOCIO, SITE_URL } from "@/data/negocio";
import { proximoAgendamentoDe, type Agendamento } from "./agendamentos";
import { codigoDoAgendamento } from "./codigo";
import { abrirJanela } from "./conversas";
import { DIA_HORA_POR_EXTENSO } from "./datas";
import { enviarTexto, linkDoPainel, whatsappDaKarol } from "./notificacoes";
import { linkWhatsapp } from "./whatsapp";
import { lerIntencao, type Intencao, type MensagemRecebida } from "./webhook-meta";

/**
 * O que fazer com a mensagem que a cliente mandou.
 *
 * Fica FORA da rota de propósito. A rota cuida de assinatura, parse e
 * repetição; aqui mora a decisão. Foi um bug de costura entre duas partes
 * certas que derrubou os bloqueios de dia inteiro (ver PROGRESSO.md, etapa
 * 11) — a lição foi testar a junção, e só dá pra testar a junção se ela
 * estiver num módulo que o teste consegue importar.
 *
 * ⚠️ NADA AQUI MUDA A AGENDA. A Karol respondeu no briefing que a cliente
 * não desmarca sozinha (`REGRAS.clientePodeCancelar` está `false`). Pedido
 * de cancelar ou remarcar vira aviso pra ela e recibo pra cliente; quem
 * decide continua sendo a Karol. Se ela mudar de ideia depois de usar, é
 * decisão dela — e aí muda aqui.
 */

/** O que o atendimento automático fez. Serve pro log e pros testes. */
export type Desfecho =
  | { fez: "nada"; motivo: "conversa-de-verdade" | "sem-agendamento" }
  | { fez: "respondeu-horario"; codigo: string }
  | { fez: "mandou-pro-site" }
  | { fez: "avisou-karol"; pedido: "cancelar" | "remarcar"; codigo: string };

export async function atender(m: MensagemRecebida): Promise<Desfecho> {
  // Primeiro de tudo, e sempre: registrar que ela falou. Mesmo que o resto
  // não faça nada, é este registro que libera as mensagens grátis pelas
  // próximas 24 h. Ver lib/conversas.ts.
  await abrirJanela(m.de, m.texto);

  const intencao = lerIntencao(m.texto, m.botao);

  // Conversa de verdade ("você atende sábado?") é da Karol. Robô chutando
  // resposta em pergunta que ele não entendeu é pior do que robô calado.
  if (intencao === "outro") return { fez: "nada", motivo: "conversa-de-verdade" };

  const ag = await proximoAgendamentoDe(m.de);
  if (!ag) return semAgendamento(m, intencao);

  switch (intencao) {
    case "codigo":
    case "confirmar":
      await enviarTexto(m.de, textoDoHorario(ag));
      return { fez: "respondeu-horario", codigo: codigoDoAgendamento(ag.id) };

    case "cancelar":
    case "remarcar":
      await enviarTexto(m.de, reciboDoPedido(ag, intencao));
      await enviarTexto(whatsappDaKarol(), avisoParaKarol(ag, intencao, m.texto));
      return { fez: "avisou-karol", pedido: intencao, codigo: codigoDoAgendamento(ag.id) };
  }
}

/**
 * Ela mandou algo objetivo mas não tem horário marcado neste número.
 *
 * Só o código merece resposta aqui: quem digitou um código espera achar
 * alguma coisa. "Cancelar" sem agendamento é quase sempre número trocado ou
 * horário que a Karol já resolveu na mão — responder ali confundiria.
 */
async function semAgendamento(m: MensagemRecebida, intencao: Intencao): Promise<Desfecho> {
  if (intencao !== "codigo") return { fez: "nada", motivo: "sem-agendamento" };

  await enviarTexto(
    m.de,
    `Não achei nenhum horário marcado nesse número. Pra marcar é pelo site: ${SITE_URL}/agendar`,
  );
  return { fez: "mandou-pro-site" };
}

function textoDoHorario(ag: Agendamento): string {
  return [
    "Seu horário está marcado. ✨",
    "",
    ag.servicoNome,
    `${DIA_HORA_POR_EXTENSO.format(ag.inicio)} — ${ag.cidade}`,
    "",
    "Venha sem maquiagem. Qualquer coisa, é só me chamar por aqui.",
  ].join("\n");
}

/**
 * Recibo pra cliente — e o caminho pra resolver.
 *
 * Sem recibo ela fica sem saber se a mensagem chegou em alguém e manda de
 * novo, e o custo disso é a Karol respondendo três vezes a mesma pessoa.
 *
 * E vai junto o **WhatsApp pessoal da Karol**, decisão do Kainã: quem quer
 * desmarcar resolve falando com ela, não com um robô. Este número aqui é o
 * chip da automação — a Karol não fica olhando ele.
 */
function reciboDoPedido(ag: Agendamento, pedido: "cancelar" | "remarcar"): string {
  const verbo = pedido === "cancelar" ? "cancelar" : "remarcar";
  return [
    `Recebi seu pedido pra ${verbo}, já avisei a ${primeiroNome(NEGOCIO.profissional)}. 💛`,
    "",
    `${ag.servicoNome} — ${DIA_HORA_POR_EXTENSO.format(ag.inicio)}`,
    "",
    `Pra resolver mais rápido, fala direto com ela aqui: ${linkWhatsapp()}`,
  ].join("\n");
}

/** O aviso que chega no WhatsApp da Karol, com o código pra achar no painel. */
function avisoParaKarol(
  ag: Agendamento,
  pedido: "cancelar" | "remarcar",
  original: string,
): string {
  return [
    pedido === "cancelar" ? "⚠️ Pedido de CANCELAMENTO" : "🔄 Pedido pra REMARCAR",
    "",
    `${ag.clienteNome} · ${ag.clienteWhatsapp}`,
    `${ag.servicoNome} — ${DIA_HORA_POR_EXTENSO.format(ag.inicio)}`,
    ag.cidade,
    "",
    `"${original.slice(0, 200)}"`,
    "",
    // Link em vez de código escrito: ela toca e cai no painel com esta
    // cliente aberta, sem digitar nada.
    linkDoPainel(ag.id),
  ].join("\n");
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}
