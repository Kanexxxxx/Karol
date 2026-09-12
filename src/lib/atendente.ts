import "server-only";

import { NEGOCIO, SITE_URL } from "@/data/negocio";
import {
  proximoAgendamentoDe,
  remarcarAgendamento,
  type Agendamento,
} from "./agendamentos";
import { abrirJanela, janelaAberta } from "./conversas";
import { DIA_HORA_POR_EXTENSO, HORA } from "./datas";
import {
  BOTAO_TEMPLATE,
  enviarCodigoDoSinal,
  enviarPedidoDeSinal,
  enviarQrDoSinal,
  reenviarMidia,
  enviarTexto,
  enviarTextoComBotoes,
  enviarTextoComLista,
  esperandoSinal,
  linkDoPainel,
  paraDados,
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
import { formatarWhatsapp } from "./telefone";
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
  | { fez: "respondeu-horario" }
  | { fez: "mandou-pro-site" }
  | { fez: "pediu-sinal"; valorCentavos: number }
  | { fez: "encaminhou-pra-karol" }
  | { fez: "repassou-pra-karol" }
  | { fez: "recebeu-comprovante" }
  | { fez: "avisou-karol"; pedido: "cancelar" | "remarcar" };

export async function atender(m: MensagemRecebida): Promise<Desfecho> {
  /*
    ⚠️ ESTA PERGUNTA VEM ANTES DE ABRIR A JANELA, e a ordem é o truque
    inteiro: depois do `abrirJanela` abaixo, toda janela está aberta e não
    dá mais pra saber se ela já estava.

    "A janela estava fechada" é a definição prática de "esta pessoa está
    chegando agora" — foi ao site, marcou, e tocou no botão que abre a
    conversa. É o único momento em que a gente sabe que ela acabou de
    marcar sem precisar adivinhar pelo texto.
  */
  const chegandoAgora = !(await janelaAberta(m.de));

  // E sempre: registrar que ela falou. Mesmo que o resto não faça nada, é
  // este registro que libera as mensagens grátis pelas próximas 24 h. Ver
  // lib/conversas.ts.
  await abrirJanela(m.de, m.texto);

  /*
    O PEDIDO DO SINAL — e este é o motivo de todo o resto existir.

    Quem marca pelo site NUNCA falou com a Karol antes, então a janela de
    24 h está fechada e a Meta recusa qualquer texto livre. É exatamente o
    que aconteceu no teste com o marido dela.

    Por isso a tela de confirmação termina num botão que abre o WhatsApp
    com a mensagem já escrita: a cliente toca, a mensagem sai DELA, a
    janela abre — e é aqui, uma fração de segundo depois, que o PIX com
    valor, o QR e o copia e cola saem de graça.

    Sem isto, o sinal dependia de a Karol digitar a chave na mão toda vez.
  */
  if (chegandoAgora) {
    const pendente = await proximoAgendamentoDe(m.de);
    if (pendente) {
      const dados = paraDados(pendente);
      if (esperandoSinal(dados)) {
        await enviarPedidoDeSinal(dados);
        return { fez: "pediu-sinal", valorCentavos: dados.valorCentavos };
      }
    }
  }

  /*
    Quem mandou pode ser a KAROL, não uma cliente. Ela responde no mesmo
    número, e o webhook é um só.

    Sem esta separação, um "ok" dela viraria `proximoAgendamentoDe(número da
    Karol)` e o robô responderia o horário DELA como se ela fosse cliente.
  */
  if (m.botao?.startsWith("k:")) return decisaoDaKarol(m);

  // A cliente escolheu um horário na lista de remarcação.
  if (m.botao?.startsWith("h:")) return escolhaDaCliente(m);

  /*
    O COMPROVANTE.

    ⚠️ Foto mandada pra cá sumia. O webhook lia texto e botão e ignorava o
    resto — e comprovante de PIX é foto. A cliente mandava, ninguém via, e
    ela ficava esperando uma confirmação que não vinha.

    O reenvio usa o id da mídia que veio no webhook: a Meta já tem o
    arquivo, então nada é baixado nem hospedado aqui.
  */
  if (m.midiaId) {
    const ag = await proximoAgendamentoDe(m.de);
    const quem = ag ? ag.clienteNome : formatarWhatsapp(m.de);
    const oQue = ag ? `${ag.servicoNome} — ${DIA_HORA_POR_EXTENSO.format(ag.inicio)}` : "";

    await reenviarMidia(
      whatsappDaKarol(),
      m.tipoMidia ?? "image",
      m.midiaId,
      [`📎 Comprovante de ${quem}`, oQue, formatarWhatsapp(m.de), linkDoPainel(m.de)]
        .filter(Boolean)
        .join("\n"),
    );
    await enviarTexto(
      m.de,
      "Recebi, obrigada! 💛 Vou conferir e te confirmo por aqui.",
    );
    return { fez: "recebeu-comprovante" };
  }

  /*
    Como ela quer receber o PIX: QR ou copia e cola.

    Um de cada vez, e só o que ela pediu. Antes saíam três mensagens
    seguidas (texto, QR e código) — o Kainã leu e disse que era
    informação demais pra cliente, e é.
  */
  if (m.botao && (m.botao === BOTAO_TEMPLATE.pixQr || m.botao === BOTAO_TEMPLATE.pixCodigo)) {
    const pendente = await proximoAgendamentoDe(m.de);
    if (pendente) {
      const dados = paraDados(pendente);
      if (esperandoSinal(dados)) {
        if (m.botao === BOTAO_TEMPLATE.pixQr) await enviarQrDoSinal(dados);
        else await enviarCodigoDoSinal(dados);
        return { fez: "pediu-sinal", valorCentavos: dados.valorCentavos };
      }
    }
  }

  /*
    "Receber o PIX", o botão do template `pedido_sinal`.

    Na primeira mensagem da conversa o PIX já saiu lá em cima, no bloco do
    `chegandoAgora`. Aqui é o caso de ela tocar de novo com a conversa
    aberta — perdeu a mensagem, apagou, quer o QR outra vez. Pedido
    explícito: manda de novo.
  */
  /*
    ⚠️ O `m.botao &&` não é enfeite. Sem ele, `m.botao === BOTAO_TEMPLATE.x`
    fica `undefined === undefined` quando a constante não chega — e TODA
    mensagem de texto cai neste ramo. Aconteceu: mensagem comum de cliente
    recebendo "que bom que você gostou!".
  */
  if (m.botao && m.botao === BOTAO_TEMPLATE.pix) {
    const pendente = await proximoAgendamentoDe(m.de);
    if (pendente && esperandoSinal(paraDados(pendente))) {
      await enviarPedidoDeSinal(paraDados(pendente));
      return { fez: "pediu-sinal", valorCentavos: pendente.servicoPreco };
    }
  }

  /*
    "Falar com a Karol", o botão dos templates.

    ⚠️ ESTE NÚMERO NÃO TEM CAIXA DE ENTRADA. É o chip da API — ninguém abre
    ele num celular. Mensagem que a cliente manda pra cá só existe pro
    webhook, e a Karol nunca lê. Então "falar com a Karol" aqui só pode
    ser uma coisa: entregar o WhatsApp de verdade dela.
  */
  /*
    A AVALIAÇÃO do pós-atendimento.

    As chaves são as strings literais, e não `BOTAO_TEMPLATE.x`, de
    propósito: é o payload que veio da Meta que está sendo procurado aqui,
    e comparar com uma constante que pode chegar indefinida já causou um
    bug neste arquivo (toda mensagem caindo no ramo errado).

    A nota ruim recebe resposta diferente — e chega na Karol com aviso.
    Cliente insatisfeita respondendo a um robô simpático é como se perde
    uma cliente sem nem saber.
  */
  const nota = m.botao ? NOTAS[m.botao] : undefined;
  if (nota) {
    await repassarParaKarol(m.de, `${nota.aviso} (avaliação do atendimento)`);
    await enviarTexto(m.de, nota.resposta);
    return { fez: "repassou-pra-karol" };
  }

  // "Amei", o botão antigo do pós-atendimento. Fica por compatibilidade:
  // template aprovado na Meta não muda sozinho quando o código muda.
  if (m.botao && m.botao === BOTAO_TEMPLATE.feedback) {
    await repassarParaKarol(m.de, m.texto || "(tocou em Amei)");
    await enviarTexto(
      m.de,
      "Aaah, que bom que você gostou! 💛 Obrigada de verdade. Se quiser me contar mais, é só escrever aqui.",
    );
    return { fez: "repassou-pra-karol" };
  }

  if (m.botao && m.botao === BOTAO_TEMPLATE.falar) {
    await enviarTexto(m.de, encaminhamento());
    return { fez: "encaminhou-pra-karol" };
  }

  const intencao = lerIntencao(m.texto, m.botao);

  /*
    Conversa de verdade ("você atende sábado?", "posso levar minha filha?").

    O robô continua sem chutar resposta — isso não mudou. O que mudou é o
    silêncio. Antes esta linha só devolvia "nada", e como este número não
    tem caixa de entrada, a pergunta ia pra um buraco: nem o robô
    respondia, nem a Karol via. A cliente ficava falando sozinha.

    Agora a primeira mensagem livre de cada conversa recebe o WhatsApp
    dela. Só a primeira — da segunda em diante a cliente já tem o link, e
    repetir viraria spam.
  */
  if (intencao === "outro") {
    // O robô não responde a pergunta — mas a Karol precisa VER que
    // perguntaram. Sem isto, o pós-atendimento pergunta "o que você
    // achou?" e a resposta morre num número que ninguém abre.
    await repassarParaKarol(m.de, m.texto);
    if (chegandoAgora) {
      await enviarTexto(m.de, encaminhamento());
      return { fez: "encaminhou-pra-karol" };
    }
    return { fez: "repassou-pra-karol" };
  }

  const ag = await proximoAgendamentoDe(m.de);
  if (!ag) return semAgendamento(m, intencao);

  switch (intencao) {
    case "confirmar":
      await enviarTexto(m.de, textoDoHorario(ag));
      return { fez: "respondeu-horario" };

    case "remarcar":
      return oferecerHorarios(ag, m);

    case "cancelar":
      await enviarTexto(m.de, reciboDoPedido(ag, "cancelar"));
      await enviarTexto(whatsappDaKarol(), avisoParaKarol(ag, "cancelar", m.texto));
      return { fez: "avisou-karol", pedido: "cancelar" };
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
    return { fez: "avisou-karol", pedido: "remarcar" };
  }

  await enviarTextoComLista(
    m.de,
    [
      // ⚠️ "hoje" aqui queria dizer "o de agora", e a cliente lia como o
      // dia. O Kainã viu num sábado: "Seu horário hoje é domingo, 13 de
      // setembro" — a frase se contradizendo em sete palavras.
      `Sem problema! Seu horário atual é ${DIA_HORA_POR_EXTENSO.format(ag.inicio)}.`,
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
  const karol = whatsappDaKarol().replace(/\D/g, "");
  if (!karol || m.de.replace(/\D/g, "") !== karol) {
    return { fez: "nada", motivo: "conversa-de-verdade" };
  }

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
 * Só "confirmar" merece resposta: quem escreve "confirmo" está tentando
 * confirmar ALGUMA coisa, e ficar sem resposta nenhuma é o pior desfecho.
 *
 * "Cancelar" e "remarcar" sem agendamento é quase sempre número trocado ou
 * horário que a Karol já resolveu na mão — responder ali confundiria.
 *
 * ⚠️ Esta resposta já foi um bug caro: com o número gravado sem DDI, ela
 * caía em quem TINHA acabado de marcar. Ver `lib/telefone.ts`.
 */
async function semAgendamento(m: MensagemRecebida, intencao: Intencao): Promise<Desfecho> {
  if (intencao !== "confirmar") return { fez: "nada", motivo: "sem-agendamento" };

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
    // Ela toca e cai no painel com esta cliente aberta, sem digitar nada.
    // O filtro é o telefone: o código de seis caracteres saiu do projeto.
    linkDoPainel(ag.clienteWhatsapp),
  ].join("\n");
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

/**
 * O WhatsApp de verdade da Karol, pra quem escreveu no número da API.
 *
 * Diz com todas as letras que este número é de avisos — senão a cliente
 * continua escrevendo aqui e achando que foi ignorada.
 */
function encaminhamento(): string {
  return [
    `Oi! Este número é só dos avisos automáticos do ${NEGOCIO.nome} 💛`,
    "",
    `Pra falar com a Karol, é no WhatsApp dela: ${NEGOCIO.whatsapp.exibicao}`,
    linkWhatsapp("Oi Karol!"),
  ].join("\n");
}

/**
 * Entrega pra Karol o que a cliente escreveu no número automático.
 *
 * ⚠️ Este número não tem caixa de entrada. Tudo o que chega nele e não é
 * repassado some — e "some" incluía elogio, dúvida sobre cuidado e
 * "cheguei, estou na porta".
 *
 * Nunca lança: quem chama é o webhook, e webhook que responde erro faz a
 * Meta reenviar o evento. Se a janela dela estiver fechada, o envio falha
 * em silêncio — o mesmo que já acontece com os outros avisos.
 */
/** O que cada botão de avaliação responde, e o que a Karol lê. */
const NOTAS: Record<string, { resposta: string; aviso: string }> = {
  nota_otimo: {
    resposta:
      "Aaah, que alegria ler isso! 💛 Obrigada de verdade. Se quiser me contar mais, escreve aqui.",
    aviso: "⭐ AMOU o resultado",
  },
  nota_bom: {
    resposta:
      "Que bom que você gostou! 💛 Se tiver alguma coisa que eu possa melhorar, me conta aqui — eu leio tudo.",
    aviso: "🙂 Achou bom",
  },
  nota_ruim: {
    resposta:
      "Poxa, obrigada por me falar — sério. Me conta aqui o que não ficou bom que eu quero acertar com você. 💛",
    aviso: "⚠️ NÃO gostou — vale falar com ela",
  },
};

async function repassarParaKarol(de: string, texto: string): Promise<void> {
  await enviarTexto(
    whatsappDaKarol(),
    [
      "💬 Uma cliente escreveu no número automático",
      "",
      formatarWhatsapp(de),
      `"${texto.slice(0, 300)}"`,
      "",
      `Responder: https://wa.me/${de}`,
      linkDoPainel(de),
    ].join("\n"),
  );
}
