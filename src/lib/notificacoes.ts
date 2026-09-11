import "server-only";

import { ANTES_DE_VIR, CIDADES, NEGOCIO, NOTIFICACOES, REGRAS, SITE_URL } from "@/data/negocio";
import { formatarPreco, pedeSinalPorValor } from "@/data/servicos";
import { DIA_HORA_POR_EXTENSO, HORA } from "./datas";
import { brCodeDoSinal } from "./pix";
import type { Agendamento } from "./agendamentos";
import { formatarWhatsapp } from "./telefone";

/**
 * Notificações.
 *
 * A Karol pediu (ver `NOTIFICACOES` em data/negocio.ts): aviso pra ela quando
 * entra agendamento, confirmação pra cliente na hora, lembrete um dia antes e
 * agradecimento depois.
 *
 * O envio em si (WhatsApp/SMS) precisa de um provedor externo. Aqui a gente
 * **monta a mensagem** e **empurra o evento** pra um webhook configurável
 * (`NOTIFICADOR_WEBHOOK_URL`) — que pode ser um n8n, Make, Zapier, uma função
 * própria, o que for. Sem webhook, nada quebra: o evento só não sai.
 *
 * O que dispara cada evento:
 * - `novo-agendamento` (pra Karol) + `confirmacao` (pra cliente):
 *   `criarAgendamento`, na hora.
 * - `lembrete` / `agradecimento`: a rota `/api/lembretes`, chamada 1x/dia
 *   por um cron (ver vercel.json).
 */

export type DadosAgendamento = {
  id: string;
  cliente: string;
  /** só dígitos, com DDI+DDD */
  whatsappCliente: string;
  servico: string;
  cidade: string;
  /** início do atendimento, ISO */
  inicioISO: string;
  valorCentavos: number;
  situacao?: string;
  /**
   * O recado que a cliente escreveu no fim do agendamento.
   *
   * ⚠️ Isto passou o projeto inteiro sendo gravado no banco, aparecendo
   * no painel, e NÃO CHEGANDO NA KAROL. O campo existe no site desde o
   * começo e o aviso de novo agendamento nunca o carregou.
   *
   * O estrago é do tipo silencioso: a cliente escreve "estou grávida,
   * cuidado com a henna" ou "tenho alergia a X", a mensagem entra no
   * banco, e a Karol só descobre se abrir o painel antes de atender.
   */
  observacao?: string | null;
};

/**
 * Converte um agendamento do banco no que as mensagens precisam.
 *
 * Mora aqui, e não em `lembretes.ts` como antes, porque o tipo de destino
 * é daqui — e porque agora três caminhos diferentes precisam dela: os
 * lembretes, o botão do painel e o atendimento automático.
 *
 * ⚠️ `situacao` faz parte. Sem ela, `esperandoSinal()` acha que ninguém
 * está devendo PIX e o pedido do sinal nunca sai.
 */
export function paraDados(a: Agendamento): DadosAgendamento {
  return {
    id: a.id,
    cliente: a.clienteNome,
    whatsappCliente: a.clienteWhatsapp,
    servico: a.servicoNome,
    cidade: a.cidade,
    inicioISO: a.inicio.toISOString(),
    valorCentavos: a.servicoPreco,
    situacao: a.situacao,
    observacao: a.observacao,
  };
}

export type Evento =
  | "novo-agendamento"
  | "confirmacao"
  | "remarcado"
  | "cancelado"
  | "lembrete"
  | "lembrete-curto"
  | "agradecimento";

function quando(iso: string): string {
  return DIA_HORA_POR_EXTENSO.format(new Date(iso));
}

/** Número da Karol pras notificações: env tem prioridade sobre o do site. */
export function whatsappDaKarol(): string {
  return (process.env.KAROL_WHATSAPP || NEGOCIO.whatsapp.numero).replace(/\D/g, "");
}

/** true se existe um webhook pra onde mandar os eventos. */
export function notificadorConfigurado(): boolean {
  return Boolean(process.env.NOTIFICADOR_WEBHOOK_URL);
}

/** true quando o webhook de RECEBIMENTO está de pé. Ver app/api/whatsapp. */
export function recebimentoConfigurado(): boolean {
  return Boolean(process.env.META_VERIFY_TOKEN && process.env.META_APP_SECRET);
}

/**
 * O número pra onde os avisos da Karol estão indo, quando NÃO é o dela.
 *
 * `KAROL_WHATSAPP` existe pra testar sem incomodar a Karol — foi assim que
 * o fluxo inteiro foi testado em 06/09/2026. O problema é que é exatamente
 * o tipo de coisa que fica esquecida: com ela preenchida, a Karol nunca
 * recebe aviso de agendamento nenhum e ninguém descobre por semanas.
 *
 * Por isso o painel mostra isso na cara quando está desviado.
 */
export function avisosDesviadosPara(): string | null {
  const configurado = whatsappDaKarol();
  const dela = NEGOCIO.whatsapp.numero.replace(/\D/g, "");
  return configurado === dela ? null : configurado;
}

/**
 * O endereço completo da cidade.
 *
 * ⚠️ NUNCA vai pro site. Só entra em mensagem de quem JÁ marcou — são
 * endereços residenciais, um deles a casa da mãe dela.
 */
function enderecoPorCidade(cidadeNome: string): string {
  const norm = (cidadeNome || "").toLowerCase();
  if (norm.includes("bandeirantes")) {
    return CIDADES.bandeirantes.enderecoCompleto;
  }
  return CIDADES["pereira-barreto"].enderecoCompleto;
}

/** "sexta-feira, 12 de setembro, 19:00" com a primeira letra maiúscula. */
function quandoBonito(iso: string): string {
  const texto = quando(iso);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** O sinal deste agendamento, em centavos. 0 = não pede sinal. */
export function sinalDoAgendamento(a: DadosAgendamento): number {
  if (!pedeSinalPorValor(a.valorCentavos)) return 0;
  return Math.round((a.valorCentavos * REGRAS.sinal.porcentagem) / 100);
}

/** Está esperando o PIX pra fechar? */
export function esperandoSinal(a: DadosAgendamento): boolean {
  return a.situacao === "pendente" && sinalDoAgendamento(a) > 0;
}

/**
 * O aviso que chega no celular da Karol quando alguém marca.
 *
 * ---------------------------------------------------------------------
 * O que esta mensagem tem que resolver
 * ---------------------------------------------------------------------
 *
 * Ela vai ler isto no meio de um atendimento, com a mão suja de pigmento,
 * pela prévia da notificação. Então a ordem é: **quem e quando** primeiro,
 * o resto depois. Nome e horário são o que ela precisa pra saber se
 * aquilo muda alguma coisa no dia dela.
 *
 * O que NÃO entra: nada que ela já saiba (o nome do studio), nada que ela
 * não possa usar (identificador interno), e nada de aviso técnico. A
 * versão anterior começava com "📅 Novo agendamento pelo site" — quatro
 * palavras gastas antes da primeira útil.
 */
export function textoParaKarol(a: DadosAgendamento): string {
  const faltaSinal = esperandoSinal(a);
  const valorSinal = formatarPreco(sinalDoAgendamento(a) / 100);

  return [
    faltaSinal ? "🔑 *Pedido de horário — falta o sinal*" : "💛 *Novo agendamento*",
    "",
    `*${a.cliente}*`,
    quandoBonito(a.inicioISO),
    "",
    `${a.servico} · ${a.cidade}`,
    faltaSinal
      ? `${formatarPreco(a.valorCentavos / 100)} · sinal de *${valorSinal}*`
      : formatarPreco(a.valorCentavos / 100),

    // ⚠️ O RECADO vem antes dos links, e não depois. É a única informação
    // da mensagem que ela não consegue adivinhar sozinha, e pode mudar o
    // que ela separa antes de a cliente chegar.
    // ⚠️ a linha em branco que separa este bloco do próximo vai DENTRO do
    // ternário. Fora dele, ela soma com a de cima e abre um buraco no meio
    // da mensagem sempre que não há recado.
    ...(a.observacao ? ["", "📝 *Recado dela:*", `"${a.observacao}"`] : []),

    ...(faltaSinal
      ? [
          "",
          `Já mandei o PIX de ${valorSinal} pra ela. O horário fica guardado até ${REGRAS.sinal.seguraAte}.`,
          "Quando o comprovante chegar, é só confirmar na agenda.",
        ]
      : []),

    "",
    `Falar com ${primeiroNome(a.cliente)}: https://wa.me/${a.whatsappCliente}`,
    // Ela toca e cai no painel já filtrado nesta cliente. Sem código, sem
    // digitar nada.
    `Ver na agenda: ${linkDoPainel(a.whatsappCliente)}`,
  ].join("\n");
}

/**
 * Abre o painel da Karol já filtrado nesta cliente.
 *
 * ⚠️ Filtra pelo TELEFONE, não mais por um código.
 *
 * O código de seis caracteres saiu do projeto: era mais uma coisa pra ela
 * decorar, e a busca do painel já aceita as duas que ela tem na mão — o
 * nome e o número de quem está falando com ela. O telefone é o melhor dos
 * dois aqui porque vem pronto do agendamento, sem depender de a cliente ter
 * escrito o nome do mesmo jeito.
 *
 * Se a pessoa tiver mais de um horário, a busca devolve os dois e ela
 * escolhe — que é o comportamento certo, não um problema.
 */
export function linkDoPainel(whatsappCliente: string): string {
  return `${SITE_URL}/painel?q=${encodeURIComponent(whatsappCliente)}`;
}

/**
 * A imagem do QR do PIX deste agendamento.
 *
 * É uma URL pública porque a Meta busca a imagem pra reenviar — ela não
 * aceita arquivo colado na requisição. O identificador do agendamento é
 * um UUID, então a URL não é adivinhável, e a rota deriva o valor do
 * banco: ninguém consegue mandar gerar um QR de R$ 5.000 na chave dela só
 * mexendo no endereço. Ver `app/api/pix/[id]/route.ts`.
 */
export function linkDoQrPix(id: string): string {
  return `${SITE_URL}/api/pix/${encodeURIComponent(id)}`;
}

/** As três linhas de "antes de vir", como texto de WhatsApp. */
function antesDeVir(): string[] {
  return ["*Antes de vir:*", ...ANTES_DE_VIR.map((aviso) => `• ${aviso}`)];
}

/**
 * A confirmação de quem JÁ está fechado — serviço barato, sem sinal.
 */
export function textoConfirmacao(a: DadosAgendamento): string {
  if (esperandoSinal(a)) return textoDoSinal(a);

  return [
    `Oi, ${primeiroNome(a.cliente)}! Seu horário está confirmado 💛`,
    "",
    `💄 ${a.servico}`,
    `🗓️ ${quandoBonito(a.inicioISO)}`,
    `📍 ${a.cidade} — ${enderecoPorCidade(a.cidade)}`,
    `💵 ${formatarPreco(a.valorCentavos / 100)}`,
    "",
    ...antesDeVir(),
    "",
    "Qualquer coisa é só me chamar por aqui. Te espero! 🤍",
  ].join("\n");
}

/**
 * A MENSAGEM DO SINAL — a que faz a pessoa pagar.
 *
 * ---------------------------------------------------------------------
 * Por que ela é escrita assim
 * ---------------------------------------------------------------------
 *
 * Pedir dinheiro adiantado é o momento em que a cliente pode desistir. O
 * texto tem que derrubar as quatro perguntas que aparecem na cabeça dela,
 * na ordem em que aparecem:
 *
 * 1. "Quanto?"           → o valor em negrito, sozinho numa linha.
 * 2. "É a mais?"         → *desconta do valor final*. É a objeção mais
 *                          comum e a mais fácil de resolver: ninguém está
 *                          cobrando nada além do combinado.
 * 3. "Como pago?"        → chave + QR com valor + copia e cola. Três
 *                          caminhos, porque cada pessoa usa o banco de um
 *                          jeito.
 * 4. "E se eu desistir?" → a verdade, dita antes de ela perguntar.
 *
 * ⚠️ SOBRE O ITEM 4: a Karol respondeu, com estas palavras, que o sinal
 * **não volta** — "é justamente pra ela não desmarcar". Uma versão
 * anterior deste projeto escreveu o contrário na tela de confirmação, e
 * foi pro ar prometendo devolução em 24 h. Promessa de dinheiro não é
 * detalhe de texto: quem ia ter que honrar era ela.
 *
 * A regra fica aqui escrita de um jeito que explica em vez de ameaçar —
 * o sinal é o que segura o horário —, e sempre acompanhada da saída real:
 * remarcar, avisando antes, continua valendo.
 */
export function textoDoSinal(a: DadosAgendamento): string {
  const sinal = sinalDoAgendamento(a);
  const resta = a.valorCentavos - sinal;

  return [
    `Oi, ${primeiroNome(a.cliente)}! Recebi seu pedido de horário ✨`,
    "",
    `💄 ${a.servico}`,
    `🗓️ ${quandoBonito(a.inicioISO)}`,
    `📍 ${a.cidade}`,
    `💵 ${formatarPreco(a.valorCentavos / 100)} no total`,
    "",
    `Pra esse horário ficar guardado no seu nome, peço um sinal de *${formatarPreco(sinal / 100)}*.`,
    `Ele *desconta do valor final* — no dia você paga só os outros ${formatarPreco(resta / 100)}.`,
    "",
    `*PIX (${REGRAS.sinal.tipoChave.toLowerCase()}):* ${REGRAS.sinal.chavePix}`,
    `${REGRAS.sinal.favorecido} · ${REGRAS.sinal.banco}`,
    "",
    "Me manda o comprovante aqui que eu confirmo na hora 💛",
    "",
    `_Guardo o horário até ${REGRAS.sinal.seguraAte}._`,
    ...(REGRAS.sinal.devolve
      ? []
      : [
          "_O sinal não volta em caso de desistência — é ele que garante que o horário não vai pra outra pessoa. Se precisar mudar de dia, me avisa antes que a gente ajeita._",
        ]),
  ].join("\n");
}

/**
 * A legenda da imagem do QR.
 *
 * Curta de propósito: no WhatsApp a legenda fica colada embaixo da foto e
 * texto comprido ali vira um bloco que ninguém lê. O que importa é dizer
 * que o valor já está dentro — é a diferença entre escanear e digitar.
 */
export function legendaDoQr(a: DadosAgendamento): string {
  return `Aponte a câmera do seu banco aqui — o valor de ${formatarPreco(
    sinalDoAgendamento(a) / 100,
  )} já vai preenchido, você só confirma.`;
}

/**
 * O aviso de que a mensagem seguinte é só o código.
 *
 * O "copia e cola" vai numa mensagem SOZINHA, sem mais nada junto. É o que
 * deixa a pessoa segurar o dedo e copiar a mensagem inteira de uma vez —
 * com texto em volta, ela tem que selecionar na mão e sempre sobra ou
 * falta um pedaço, e código de PIX pela metade não abre no banco.
 */
export const AVISO_COPIA_E_COLA =
  "Ou copie o código abaixo e cole no seu banco, em *PIX Copia e Cola* 👇";

export function textoLembrete(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}! Passando pra lembrar do seu horário amanhã 💛`,
    "",
    `💄 ${a.servico}`,
    `🗓️ ${quandoBonito(a.inicioISO)}`,
    // ⚠️ UMA linha de local, com cidade E endereço. Esta mensagem já saiu
    // com a cidade repetida em duas linhas seguidas, uma delas sem o
    // endereço — sobra de uma edição antiga.
    `📍 ${a.cidade} — ${enderecoPorCidade(a.cidade)}`,
    "",
    "Não esquece de vir sem maquiagem 🤍",
    "",
    "Se surgiu alguma coisa e você não vai conseguir, me avisa hoje — assim dá tempo de encaixar outra pessoa nesse horário. 🙏",
  ].join("\n");
}

/**
 * O lembrete curto, ~30 min antes. É o empurrão pra sair de casa.
 *
 * Deliberadamente MAIS CURTO que o da véspera: quem recebe isto está se
 * arrumando, provavelmente lendo a prévia da notificação sem abrir o
 * WhatsApp. Hora, cidade e endereço cabem na prévia; o resto não seria
 * lido.
 *
 * Não repete o "venha sem maquiagem" — a essa altura ou ela já tirou, ou
 * não dá mais tempo, e o aviso só faria a pessoa se sentir mal na saída.
 */
export function textoLembreteCurto(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}! Seu horário é daqui a pouco ⏰`,
    "",
    `🕐 ${HORA.format(new Date(a.inicioISO))} — ${a.servico}`,
    `📍 ${a.cidade} — ${enderecoPorCidade(a.cidade)}`,
    "",
    "Te espero! 💛",
  ].join("\n");
}

export function textoAgradecimento(a: DadosAgendamento): string {
  return [
    `Foi muito bom te atender, ${primeiroNome(a.cliente)}! 🥰`,
    "",
    "Se ficar qualquer dúvida sobre os cuidados, é só me chamar por aqui.",
    "",
    `E se você gostou, me marca nas fotos: @${NEGOCIO.instagram.studio} 📸`,
  ].join("\n");
}

/**
 * O horário MUDOU — quem mudou foi a Karol, pelo painel.
 *
 * Sem esta mensagem, remarcar deixava a agenda dela dizendo uma coisa e a
 * cliente sabendo outra: a pessoa aparecia no dia e na hora antigos.
 */
export function textoRemarcado(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}! Precisei mudar o seu horário, me desculpa 💛`,
    "",
    "Ficou assim:",
    `💄 ${a.servico}`,
    `🗓️ ${quandoBonito(a.inicioISO)}`,
    `📍 ${a.cidade} — ${enderecoPorCidade(a.cidade)}`,
    "",
    "Se esse novo horário não der, me avisa por aqui que a gente acha outro 🤍",
  ].join("\n");
}

/** A Karol cancelou pelo painel. A cliente não pode descobrir na porta. */
export function textoCancelado(a: DadosAgendamento): string {
  return [
    `Oi, ${primeiroNome(a.cliente)}. Precisei cancelar o seu horário, me desculpa 🙏`,
    "",
    `💄 ${a.servico}`,
    `🗓️ ${quandoBonito(a.inicioISO)}`,
    "",
    "Me chama por aqui que a gente acha outro dia — tenho horário essa semana 💛",
  ].join("\n");
}

const TEXTO: Record<Evento, (a: DadosAgendamento) => string> = {
  "novo-agendamento": textoParaKarol,
  confirmacao: textoConfirmacao,
  remarcado: textoRemarcado,
  cancelado: textoCancelado,
  lembrete: textoLembrete,
  "lembrete-curto": textoLembreteCurto,
  agradecimento: textoAgradecimento,
};

/**
 * Empurra o evento pro webhook externo, se houver. Nunca lança — notificação
 * não pode derrubar o fluxo que a disparou.
 */
/** true quando a Cloud API da Meta está configurada. */
export function metaConfigurada(): boolean {
  return Boolean(process.env.META_TOKEN && process.env.META_PHONE_NUMBER_ID);
}

/**
 * Manda pela Cloud API da Meta.
 *
 * Texto livre, sem template. Isso só funciona dentro da **janela de 24 h**,
 * que abre quando a cliente manda mensagem primeiro — e é de graça. Fora da
 * janela a Meta recusa com `131047`, e é esperado: quem cai aí é o lembrete
 * da véspera, que precisaria de template aprovado e é pago.
 *
 * Ver WHATSAPP.md.
 */
async function enviarPelaMeta(para: string, texto: string): Promise<Response> {
  return fetch(
    `https://graph.facebook.com/v23.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.META_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: para,
        type: "text",
        text: { body: texto },
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
}

export type ComponenteTemplate =
  | {
      type: "body";
      parameters: { type: "text"; text: string }[];
    }
  | {
      type: "button";
      sub_type: "url" | "quick_reply";
      index: string;
      parameters: ({ type: "text"; text: string } | { type: "payload"; payload: string })[];
    };

/**
 * Os botões de resposta rápida de um template, com o PAYLOAD de cada um.
 *
 * ⚠️ Sem payload, o que volta no webhook quando a cliente toca é o TEXTO
 * do botão ("✅ Confirmar"), e `lerIntencao` tinha que adivinhar pelo
 * texto. Com payload volta o id exato ("confirmar"), igual aos botões
 * interativos. A ORDEM aqui tem que ser a ordem dos botões cadastrados na
 * Meta, e a QUANTIDADE também — a Meta recusa o envio se sobrar ou faltar
 * payload. Ver TEMPLATES-WHATSAPP.md.
 */
function botoesRapidos(ids: readonly string[]): ComponenteTemplate[] {
  return ids.map((id, i) => ({
    type: "button" as const,
    sub_type: "quick_reply" as const,
    index: String(i),
    parameters: [{ type: "payload" as const, payload: id }],
  }));
}

/** Os ids que voltam do toque nos botões dos templates. */
export const BOTAO_TEMPLATE = {
  confirmar: "confirmar",
  remarcar: "remarcar",
  falar: "falar",
  pix: "pix",
} as const;

/**
 * Manda mensagem usando TEMPLATE aprovado na Meta.
 *
 * Necessário quando a janela de 24 h da conversa está fechada (ex: cliente
 * marcou pelo site e nunca conversou antes, ou lembrete de véspera).
 *
 * Ver TEMPLATES-WHATSAPP.md.
 */
export async function enviarTemplatePelaMeta(
  para: string,
  nomeTemplate: string,
  componentes: ComponenteTemplate[],
  idioma = "pt_BR",
): Promise<Response> {
  return fetch(
    `https://graph.facebook.com/v23.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.META_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: para,
        type: "template",
        template: {
          name: nomeTemplate,
          language: { code: idioma },
          components: componentes,
        },
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
}

/**
 * Monta os componentes do template correspondente ao evento, se houver um.
 */
export function templateDoEvento(
  evento: Evento,
  a: DadosAgendamento,
): { nome: string; components: ComponenteTemplate[] } | null {
  switch (evento) {
    case "confirmacao":
      /*
        ⚠️ QUEM DEVE O SINAL NÃO RECEBE "SEU HORÁRIO ESTÁ RESERVADO".

        Com a janela fechada (o caso de quase toda cliente nova), era o
        template de confirmação que saía — dizendo "reservado", com o preço
        cheio e sem uma palavra sobre o PIX. A cliente lia que estava tudo
        certo e não pagava.

        `pedido_sinal` diz o valor do sinal e tem o botão "Receber o PIX":
        o toque é uma mensagem DELA, abre a janela, e o `atendente.ts`
        responde com o texto, o QR e o copia e cola, de graça.
      */
      if (esperandoSinal(a)) {
        return {
          nome: "pedido_sinal",
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: primeiroNome(a.cliente) },
                { type: "text", text: a.servico },
                { type: "text", text: quando(a.inicioISO) },
                { type: "text", text: a.cidade },
                { type: "text", text: formatarPreco(sinalDoAgendamento(a) / 100) },
              ],
            },
            ...botoesRapidos([BOTAO_TEMPLATE.pix, BOTAO_TEMPLATE.falar]),
          ],
        };
      }
      return {
        nome: "confirmacao_agendamento",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: primeiroNome(a.cliente) },
              { type: "text", text: a.servico },
              { type: "text", text: quando(a.inicioISO) },
              { type: "text", text: a.cidade },
              { type: "text", text: formatarPreco(a.valorCentavos / 100) },
            ],
          },
          ...botoesRapidos([BOTAO_TEMPLATE.confirmar, BOTAO_TEMPLATE.remarcar, BOTAO_TEMPLATE.falar]),
        ],
      };

    case "lembrete":
      return {
        nome: "lembrete_vespera",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: primeiroNome(a.cliente) },
              { type: "text", text: a.servico },
              { type: "text", text: quando(a.inicioISO) },
              { type: "text", text: a.cidade },
            ],
          },
          ...botoesRapidos([BOTAO_TEMPLATE.confirmar, BOTAO_TEMPLATE.remarcar, BOTAO_TEMPLATE.falar]),
        ],
      };

    case "novo-agendamento":
      return {
        nome: "aviso_karol_novo_agendamento",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: a.servico },
              { type: "text", text: formatarPreco(a.valorCentavos / 100) },
              { type: "text", text: quando(a.inicioISO) },
              { type: "text", text: a.cidade },
              {
                type: "text",
                text: `${a.cliente} · ${formatarWhatsapp(a.whatsappCliente)}`,
              },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: a.whatsappCliente }],
          },
        ],
      };

    default:
      return null;
  }
}

/**
 * Os botões que a cliente vê embaixo da confirmação.
 *
 * O `id` é o que volta no webhook quando ela toca — é por ele que
 * `lerIntencao` decide, sem depender de adivinhar o que ela escreveu.
 *
 * ⚠️ O título tem limite de **20 caracteres** na Meta, e emoji fora do
 * plano básico conta 2. "💬 Falar com a Karol" dá exatamente 20 e a Meta
 * recusa por um fio — por isso os títulos aqui são curtos.
 */
export const BOTOES_CLIENTE = [
  { id: "confirmar", titulo: "✅ Confirmar" },
  { id: "remarcar", titulo: "📅 Remarcar" },
  { id: "cancelar", titulo: "❌ Cancelar" },
] as const;

/**
 * Manda texto com botões de resposta rápida.
 *
 * ⚠️ Só funciona **dentro da janela de 24 h**, igual ao texto livre. Fora
 * dela quem resolve é template com botões — ver TEMPLATES-WHATSAPP.md.
 */
async function enviarComBotoes(
  para: string,
  texto: string,
  botoes: readonly { id: string; titulo: string }[],
): Promise<Response> {
  return fetch(
    `https://graph.facebook.com/v23.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.META_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: para,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: texto.slice(0, 1024) },
          action: {
            buttons: botoes.slice(0, 3).map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.titulo.slice(0, 20) },
            })),
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
}

/** Texto + botões, sem lançar. Devolve false quando não deu. */
export async function enviarTextoComBotoes(
  para: string,
  texto: string,
  botoes: readonly { id: string; titulo: string }[] = BOTOES_CLIENTE,
): Promise<boolean> {
  if (!metaConfigurada()) return false;
  try {
    const resp = await enviarComBotoes(para, texto, botoes);
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`botões pro ${para}: ${resp.status} ${detalhe.slice(0, 300)}`);
    }
    return resp.ok;
  } catch (e) {
    console.error(`botões pro ${para} falharam:`, e);
    return false;
  }
}

/**
 * Manda uma LISTA de opções — o menu que abre quando ela toca no botão.
 *
 * Botão só cabe 3; lista cabe 10. Pra oferecer horários de remarcação, 3 é
 * pouco: se nenhum dos três servir, a conversa morre e sobra pra Karol.
 *
 * Limites da Meta, todos cortados aqui porque estourar qualquer um faz a
 * mensagem inteira ser recusada: título da linha 24, descrição 72, texto do
 * botão que abre a lista 20, corpo 1024.
 */
async function enviarLista(
  para: string,
  texto: string,
  textoDoBotao: string,
  linhas: readonly { id: string; titulo: string; descricao?: string }[],
): Promise<Response> {
  return fetch(
    `https://graph.facebook.com/v23.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.META_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: para,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: texto.slice(0, 1024) },
          action: {
            button: textoDoBotao.slice(0, 20),
            sections: [
              {
                title: "Horários livres",
                rows: linhas.slice(0, 10).map((l) => ({
                  id: l.id,
                  title: l.titulo.slice(0, 24),
                  ...(l.descricao ? { description: l.descricao.slice(0, 72) } : {}),
                })),
              },
            ],
          },
        },
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
}

/** Lista de opções, sem lançar. Devolve false quando não deu. */
export async function enviarTextoComLista(
  para: string,
  texto: string,
  textoDoBotao: string,
  linhas: readonly { id: string; titulo: string; descricao?: string }[],
): Promise<boolean> {
  if (!metaConfigurada() || linhas.length === 0) return false;
  try {
    const resp = await enviarLista(para, texto, textoDoBotao, linhas);
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`lista pro ${para}: ${resp.status} ${detalhe.slice(0, 300)}`);
    }
    return resp.ok;
  } catch (e) {
    console.error(`lista pro ${para} falhou:`, e);
    return false;
  }
}

/** Manda pro webhook configurável, que repassa. Caminho antigo, ainda vale. */
async function enviarPeloWebhook(
  url: string,
  evento: Evento,
  a: DadosAgendamento,
  para: string,
  texto: string,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      evento,
      agendamento: a,
      mensagem: {
        para,
        destinatario: evento === "novo-agendamento" ? "karol" : "cliente",
        texto,
      },
    }),
    signal: AbortSignal.timeout(5000),
  });
}

/**
 * Manda um texto solto pra um número.
 *
 * É o que o webhook usa pra responder a cliente. Diferente de `enviarEvento`,
 * aqui não há evento nem interruptor em `NOTIFICACOES`: é resposta a uma
 * mensagem que a pessoa acabou de mandar, dentro da janela de 24 h que o
 * próprio ato dela abriu — o caso em que a Meta cobra zero.
 *
 * Nunca lança: quem chama é o webhook, e webhook que responde erro faz a
 * Meta reenviar o evento.
 */
export async function enviarTexto(para: string, texto: string): Promise<boolean> {
  if (!metaConfigurada()) return false;
  try {
    const resp = await enviarPelaMeta(para, texto);
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`resposta pro ${para}: ${resp.status} ${detalhe.slice(0, 300)}`);
    }
    return resp.ok;
  } catch (e) {
    console.error(`resposta pro ${para} falhou:`, e);
    return false;
  }
}

/**
 * Manda uma IMAGEM pela Cloud API.
 *
 * ⚠️ A Meta busca a imagem na URL — ela não aceita o arquivo colado na
 * requisição. Então o endereço precisa ser público, responder `image/png`
 * ou `image/jpeg` e não estar atrás de login. É por isso que o QR do PIX
 * tem uma rota própria em vez de virar um data URI.
 *
 * O tempo limite aqui é maior que o das mensagens de texto: quem espera
 * não somos nós, é a Meta indo buscar o arquivo, e o primeiro acesso pode
 * cair numa função fria.
 */
async function enviarImagemPelaMeta(
  para: string,
  link: string,
  legenda?: string,
): Promise<Response> {
  return fetch(
    `https://graph.facebook.com/v23.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.META_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: para,
        type: "image",
        image: { link, ...(legenda ? { caption: legenda.slice(0, 1024) } : {}) },
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
}

/** Imagem por URL, sem lançar. Devolve false quando não deu. */
export async function enviarImagem(
  para: string,
  link: string,
  legenda?: string,
): Promise<boolean> {
  if (!metaConfigurada()) return false;
  try {
    const resp = await enviarImagemPelaMeta(para, link, legenda);
    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`imagem pro ${para}: ${resp.status} ${detalhe.slice(0, 300)}`);
    }
    return resp.ok;
  } catch (e) {
    console.error(`imagem pro ${para} falhou:`, e);
    return false;
  }
}

/**
 * O PEDIDO DO SINAL, inteiro: três mensagens em sequência.
 *
 * ---------------------------------------------------------------------
 * Por que três e não uma
 * ---------------------------------------------------------------------
 *
 * 1. O TEXTO — o valor, o que ele desconta, a chave, o prazo e a regra da
 *    devolução. É o que convence.
 * 2. O QR com o valor dentro — quem tem dois aparelhos, ou vai pagar pelo
 *    computador, resolve aqui sem digitar nada.
 * 3. O "copia e cola" SOZINHO numa mensagem, sem uma palavra em volta.
 *
 * O item 3 é o detalhe que faz diferença de verdade no Brasil: com o
 * código sozinho, a pessoa segura o dedo, toca em "copiar" e leva a
 * mensagem inteira. Se houver qualquer texto junto, ela tem que selecionar
 * na mão — e código de PIX copiado pela metade não abre no banco, só dá
 * "código inválido" e a sensação de que o problema é a Karol.
 *
 * Cada envio é independente: se o QR falhar (a Meta não conseguiu buscar a
 * imagem, por exemplo), o texto e o copia e cola já foram e a cliente
 * ainda consegue pagar. Devolve `true` se ao menos o texto saiu.
 */
export async function enviarPedidoDeSinal(a: DadosAgendamento): Promise<boolean> {
  const sinal = sinalDoAgendamento(a);
  if (sinal <= 0) return false;

  const foiOTexto = await enviarTexto(a.whatsappCliente, textoDoSinal(a));

  await enviarImagem(a.whatsappCliente, linkDoQrPix(a.id), legendaDoQr(a));

  await enviarTexto(a.whatsappCliente, AVISO_COPIA_E_COLA);
  await enviarTexto(a.whatsappCliente, brCodeDoSinal(sinal, a.id));

  return foiOTexto;
}

export async function enviarEvento(evento: Evento, a: DadosAgendamento): Promise<void> {
  if (!ligado(evento)) return;

  const para = evento === "novo-agendamento" ? whatsappDaKarol() : a.whatsappCliente;
  const texto = TEXTO[evento](a);
  const webhook = process.env.NOTIFICADOR_WEBHOOK_URL;

  // A Meta primeiro: é o caminho direto. O webhook fica pra quem preferir
  // resolver o envio por fora (n8n, Make). Sem nenhum dos dois, a mensagem
  // é montada e simplesmente não sai — e nada quebra.
  if (!metaConfigurada() && !webhook) return;

  /*
    O PEDIDO DO SINAL não é uma mensagem, são três (texto, QR e o copia e
    cola sozinho). Sai por um caminho próprio.

    Se o primeiro texto não passar, quase sempre é a janela de 24 h
    fechada — o caso normal de quem marcou pelo site e nunca escreveu pra
    ela. Aí a sequência inteira é abandonada e o fluxo cai no template
    logo abaixo, que é o único jeito de alcançar essa pessoa.

    ⚠️ Mandar QR e copia e cola por template não dá: template tem texto
    fixo e aprovado. Quem resolve isso é o botão da tela de confirmação —
    a cliente toca, manda a primeira mensagem, a janela abre, e aí o
    `atendente.ts` dispara esta sequência inteira de graça.
  */
  if (evento === "confirmacao" && esperandoSinal(a) && metaConfigurada()) {
    if (await enviarPedidoDeSinal(a)) return;
  }

  // A confirmação da cliente vai COM BOTÕES: ela acabou de marcar e é o
  // momento em que ainda pode querer trocar alguma coisa. Botão é escolha
  // de lista — não obriga ninguém a escrever nem a gente a adivinhar.
  // O aviso da Karol não leva botão: ele leva o link do painel, que é onde
  // ela resolve de verdade.
  //
  // Quem está esperando o sinal não leva botão: "Confirmar" ali seria uma
  // mentira — quem confirma é o PIX, não o toque dela.
  const comBotoes = evento === "confirmacao" && !esperandoSinal(a);

  try {
    const resp = metaConfigurada()
      ? comBotoes
        ? await enviarComBotoes(para, texto, BOTOES_CLIENTE)
        : await enviarPelaMeta(para, texto)
      : await enviarPeloWebhook(webhook!, evento, a, para, texto);

    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");

      /*
        Janela de 24 h fechada: cai pro template aprovado.

        ⚠️ O gatilho é o CÓDIGO 131047, e só ele. Antes bastava um 400
        qualquer, e um 400 pode ser telefone malformado, parâmetro
        errado, conta suspensa — casos em que mandar template não
        resolve nada e ainda gasta uma chamada.

        131047 quer dizer exatamente uma coisa: "essa pessoa não te
        escreveu nas últimas 24 h". É o único erro em que template é a
        resposta certa.
      */
      if (metaConfigurada() && detalhe.includes("131047")) {
        const tpl = templateDoEvento(evento, a);
        if (tpl) {
          const respTpl = await enviarTemplatePelaMeta(para, tpl.nome, tpl.components);
          if (!respTpl.ok) {
            const detalheTpl = await respTpl.text().catch(() => "");
            console.error(
              `fallback template ${tpl.nome} pro ${para}: ${respTpl.status} ${detalheTpl.slice(0, 300)}`,
            );
          }
          return;
        }
      }

      // O corpo da Meta diz o motivo: 131047 é janela fechada, 130497 é
      // restrição de país. Sem isso o log só diz "deu erro".
      console.error(`notificação ${evento}: ${resp.status} ${detalhe.slice(0, 300)}`);
    }
  } catch (e) {
    console.error(`notificação ${evento} falhou:`, e);
  }
}

/** Respeita os interruptores em `NOTIFICACOES`. */
function ligado(evento: Evento): boolean {
  switch (evento) {
    case "novo-agendamento":
      return NOTIFICACOES.avisaKarolNoWhatsapp;
    case "confirmacao":
      return NOTIFICACOES.confirmacaoNaHora;
    // Remarcar e cancelar não têm interruptor de propósito: são mudanças
    // que a Karol fez no horário de alguém. Não avisar não é uma opção.
    case "remarcado":
    case "cancelado":
      return true;
    case "lembrete":
      return NOTIFICACOES.lembreteUmDiaAntes;
    case "lembrete-curto":
      return NOTIFICACOES.lembrete30MinAntes;
    case "agradecimento":
      return NOTIFICACOES.agradecimentoDepois;
  }
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}
