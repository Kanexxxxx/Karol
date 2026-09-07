import "server-only";

import { NEGOCIO, SITE_URL } from "@/data/negocio";
import {
  proximoAgendamentoDe,
  remarcarAgendamento,
  type Agendamento,
} from "./agendamentos";
import { codigoDoAgendamento } from "./codigo";
import { abrirJanela } from "./conversas";
import { DIA_HORA_POR_EXTENSO, HORA } from "./datas";
import {
  enviarTexto,
  enviarTextoComBotoes,
  enviarTextoComLista,
  linkDoPainel,
  whatsappDaKarol,
} from "./notificacoes";
import { paraChave } from "./agenda";
import {
  abrirPedido,
  agendamentoDoPedido,
  buscarPedido,
  fechar,
  horariosParaOferecer,
  pedidoAberto,
  registrarEscolha,
} from "./remarcacao";
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
 * ⚠️ A AGENDA SÓ MUDA NUM LUGAR: `decisaoDaKarol`, depois de ela tocar em
 * "Confirmar". Em nenhum outro caminho — nem a cliente escrevendo, nem a
 * cliente escolhendo horário na lista — a agenda se move.
 *
 * A Karol respondeu no briefing que a cliente não desmarca sozinha
 * (`REGRAS.clientePodeCancelar` está `false`). A remarcação respeita isso:
 * a cliente **escolhe**, a Karol **decide**. Entre uma coisa e outra o
 * horário antigo continua valendo.
 *
 * Cancelar continua sem tocar em nada: vira aviso pra ela e recibo pra
 * cliente, e quem cancela é a Karol pelo painel.
 */

/** O que o atendimento automático fez. Serve pro log e pros testes. */
export type Desfecho =
  | {
      fez: "nada";
      motivo: "conversa-de-verdade" | "sem-agendamento" | "pedido-expirado" | "horario-tomado";
    }
  | { fez: "ofereceu-horarios"; quantos: number }
  | { fez: "aguardando-karol"; quando: string }
  | { fez: "remarcado"; quando: string }
  | { fez: "karol-recusou" }
  | { fez: "respondeu-horario"; codigo: string }
  | { fez: "mandou-pro-site" }
  | { fez: "avisou-karol"; pedido: "cancelar" | "remarcar"; codigo: string };

export async function atender(m: MensagemRecebida): Promise<Desfecho> {
  // Primeiro de tudo, e sempre: registrar que ela falou. Mesmo que o resto
  // não faça nada, é este registro que libera as mensagens grátis pelas
  // próximas 24 h. Ver lib/conversas.ts.
  await abrirJanela(m.de, m.texto);

  /*
    Quem mandou pode ser a KAROL, não uma cliente. Ela responde no mesmo
    número, e o webhook é um só.

    Sem esta separação, um "ok" dela viraria `proximoAgendamentoDe(número da
    Karol)` e o robô responderia o horário DELA como se ela fosse cliente.
  */
  if (m.botao?.startsWith("k:")) return decisaoDaKarol(m);

  // A cliente escolheu um horário na lista de remarcação.
  if (m.botao?.startsWith("h:")) return escolhaDaCliente(m);

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

    case "remarcar":
      return oferecerHorarios(ag, m);

    case "cancelar":
      await enviarTexto(m.de, reciboDoPedido(ag, "cancelar"));
      await enviarTexto(whatsappDaKarol(), avisoParaKarol(ag, "cancelar", m.texto));
      return { fez: "avisou-karol", pedido: "cancelar", codigo: codigoDoAgendamento(ag.id) };
  }
}

/* ------------------------------------------------------------------ */
/* Remarcar: os quatro momentos                                        */
/* ------------------------------------------------------------------ */

/**
 * 1. A cliente tocou em "Remarcar" — o site oferece os horários livres.
 *
 * Se não sobrar nenhum (agenda cheia, serviço longo), cai no caminho antigo
 * de avisar a Karol. Lista vazia seria pior que não oferecer nada.
 */
async function oferecerHorarios(ag: Agendamento, m: MensagemRecebida): Promise<Desfecho> {
  const opcoes = await horariosParaOferecer(ag);
  const pedido = opcoes.length > 0 ? await abrirPedido(ag, opcoes) : null;

  if (!pedido) {
    await enviarTexto(m.de, reciboDoPedido(ag, "remarcar"));
    await enviarTexto(whatsappDaKarol(), avisoParaKarol(ag, "remarcar", m.texto));
    return { fez: "avisou-karol", pedido: "remarcar", codigo: codigoDoAgendamento(ag.id) };
  }

  await enviarTextoComLista(
    m.de,
    [
      `Sem problema! Seu horário hoje é ${DIA_HORA_POR_EXTENSO.format(ag.inicio)}.`,
      "",
      `Estes são os próximos livres pra ${ag.servicoNome}. Escolha um e eu confirmo com a ${primeiroNome(NEGOCIO.profissional)}. 💛`,
    ].join("\n"),
    "Ver horários",
    // O índice vai no id: a escolha é conferida contra o que FOI oferecido,
    // então uma resposta com índice inventado não move nada.
    opcoes.map((o, i) => ({ id: `h:${i}`, titulo: o.rotulo, descricao: ag.cidade })),
  );

  return { fez: "ofereceu-horarios", quantos: opcoes.length };
}

/** 2. Ela escolheu um da lista. Agora é a Karol quem decide. */
async function escolhaDaCliente(m: MensagemRecebida): Promise<Desfecho> {
  const indice = Number(m.botao!.slice(2));
  const pedido = await pedidoAberto(m.de);

  if (!pedido || pedido.situacao !== "oferecido") {
    // Lista velha: ela tocou num horário de uma conversa que já fechou.
    await enviarTexto(
      m.de,
      "Essa lista de horários já expirou. Me manda “remarcar” de novo que eu te mostro os horários de agora. 🤍",
    );
    return { fez: "nada", motivo: "pedido-expirado" };
  }

  const opcao = await registrarEscolha(pedido, indice);
  const ag = await agendamentoDoPedido(pedido);
  if (!opcao || !ag) return { fez: "nada", motivo: "pedido-expirado" };

  await enviarTexto(
    m.de,
    [
      `Anotei: *${opcao.rotulo}*. ✨`,
      "",
      `Vou confirmar com a ${primeiroNome(NEGOCIO.profissional)} e te aviso assim que ela aprovar.`,
      "",
      "Seu horário atual continua valendo até lá, pode ficar tranquila. 💛",
    ].join("\n"),
  );

  await enviarTextoComBotoes(
    whatsappDaKarol(),
    [
      "🔄 Pedido pra REMARCAR",
      "",
      `👤 *${ag.clienteNome}*`,
      `💄 ${ag.servicoNome}`,
      `📍 ${ag.cidade}`,
      "",
      `De:  ${DIA_HORA_POR_EXTENSO.format(ag.inicio)}`,
      `Pra: *${DIA_HORA_POR_EXTENSO.format(new Date(opcao.inicioISO))}*`,
    ].join("\n"),
    [
      { id: `k:ok:${pedido.id}`, titulo: "✅ Confirmar" },
      { id: `k:no:${pedido.id}`, titulo: "❌ Recusar" },
    ],
  );

  return { fez: "aguardando-karol", quando: opcao.rotulo };
}

/**
 * 3 e 4. A Karol decidiu.
 *
 * ⚠️ É AQUI, e só aqui, que a agenda muda — e quem apertou foi ela. A
 * cliente escolheu, não decidiu.
 */
async function decisaoDaKarol(m: MensagemRecebida): Promise<Desfecho> {
  const [, acao, id] = m.botao!.split(":");
  const pedido = await buscarPedido(id ?? "");
  if (!pedido || pedido.situacao !== "aguardando-karol") {
    return { fez: "nada", motivo: "pedido-expirado" };
  }

  const ag = await agendamentoDoPedido(pedido);
  if (!ag || !pedido.escolhidoISO) return { fez: "nada", motivo: "pedido-expirado" };
  const novo = new Date(pedido.escolhidoISO);

  if (acao !== "ok") {
    await fechar(pedido.id, "recusado");
    await enviarTexto(
      pedido.whatsapp,
      [
        `Oi! Esse horário acabou não dando pra ${primeiroNome(NEGOCIO.profissional)}. 🙏`,
        "",
        `Seu horário de ${DIA_HORA_POR_EXTENSO.format(ag.inicio)} continua valendo.`,
        "",
        `Se quiser tentar outro, fala com ela por aqui: ${linkWhatsapp()}`,
      ].join("\n"),
    );
    return { fez: "karol-recusou" };
  }

  const r = await remarcarAgendamento(ag.id, paraChave(novo), HORA.format(novo));

  if (!r.ok) {
    // Entre a escolha e a confirmação alguém pode ter pego o horário.
    await fechar(pedido.id, "recusado");
    await enviarTexto(whatsappDaKarol(), `Não deu pra remarcar: ${r.erro}`);
    await enviarTexto(
      pedido.whatsapp,
      `Esse horário acabou de ser ocupado. 😔 Me manda “remarcar” de novo que eu te mostro os que sobraram.`,
    );
    return { fez: "nada", motivo: "horario-tomado" };
  }

  await fechar(pedido.id, "feito");
  // `remarcarAgendamento` já manda o "seu horário mudou" pra cliente.
  await enviarTexto(
    whatsappDaKarol(),
    `✅ Remarcado. ${ag.clienteNome} avisada: ${DIA_HORA_POR_EXTENSO.format(novo)}.`,
  );
  return { fez: "remarcado", quando: DIA_HORA_POR_EXTENSO.format(novo) };
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
