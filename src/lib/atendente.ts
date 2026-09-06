import "server-only";

import { NEGOCIO, SITE_URL } from "@/data/negocio";
import { proximoAgendamentoDe, type Agendamento } from "./agendamentos";
import { codigoDoAgendamento } from "./codigo";
import { abrirJanela } from "./conversas";
import { DIA_HORA_POR_EXTENSO } from "./datas";
import { enviarTexto, whatsappDaKarol } from "./notificacoes";
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

  const intencao = lerIntencao(m.texto);

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
 * Recibo pra cliente.
 *
 * Sem ele, ela fica sem saber se a mensagem chegou em alguém e manda de
 * novo — e o custo disso é a Karol respondendo três vezes a mesma pessoa.
 */
function reciboDoPedido(ag: Agendamento, pedido: "cancelar" | "remarcar"): string {
  return [
    `Recebi seu pedido pra ${pedido}. Já avisei a ${primeiroNome(NEGOCIO.profissional)} e ela te responde por aqui.`,
    "",
    `${ag.servicoNome} — ${DIA_HORA_POR_EXTENSO.format(ag.inicio)}`,
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
    `Código ${codigoDoAgendamento(ag.id)}`,
    `"${original.slice(0, 200)}"`,
  ].join("\n");
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}
