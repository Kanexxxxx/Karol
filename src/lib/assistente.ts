import "server-only";

import { CIDADES, NEGOCIO, SITE_URL, type CidadeId } from "@/data/negocio";
import { SERVICOS, buscarServico, formatarPreco } from "@/data/servicos";
import {
  agendaDaKarol,
  criarAgendamentoNoPainel,
  horariosDoDia,
  mudarSituacao,
  procurarAgendamentos,
  relatorioDoMes,
  remarcarAgendamento,
  type Agendamento,
} from "./agendamentos";
import { criarBloqueio } from "./bloqueios";
import { codigoDoAgendamento } from "./codigo";
import { guardarFalas, historicoDe, limparHistorico } from "./conversas";
import { DIA_HORA_POR_EXTENSO, DIA_POR_EXTENSO, HORA } from "./datas";
import { buscarAcao, fecharAcao, guardarAcao } from "./acoes-pendentes";
import { iaConfigurada, lerArgumentos, perguntar, type Ferramenta, type Mensagem } from "./ia";
import { enviarTexto, enviarTextoComBotoes } from "./notificacoes";
import { paraChave } from "./agenda";
import { formatarWhatsapp, normalizarWhatsapp } from "./telefone";

/**
 * O assistente da KAROL no WhatsApp.
 *
 * ⚠️ ESTE ARQUIVO É SEPARADO DE `atendente.ts` DE PROPÓSITO, e a separação
 * é a coisa mais importante aqui.
 *
 * `atendente.ts` atende as CLIENTES, e tem um teste que lê o texto do
 * arquivo e reprova se ele importar `mudarSituacao`, `criarAgendamento` ou
 * `salvarBloqueio`. Essa trava existe porque a Karol respondeu no briefing
 * que a cliente não desmarca sozinha, e regra de importação não se testa
 * chamando função.
 *
 * O assistente precisa justamente dessas funções. Se ele morasse lá, a
 * trava teria que ser afrouxada — e afrouxada pras clientes também, que é
 * exatamente o que ninguém quer. Em módulo separado, o caminho da cliente
 * continua tão trancado quanto sempre foi, e quem decide qual dos dois
 * atende é `recepcao.ts`, pelo número de quem mandou.
 *
 * ---------------------------------------------------------------------
 * A regra que governa tudo aqui: LER é direto, ESCREVER pede o toque dela
 * ---------------------------------------------------------------------
 *
 * "Quantas clientes amanhã?" a IA responde na hora — errar uma leitura
 * mostra informação errada, e a Karol vê que está errada.
 *
 * "Cancela a da Larissa" a IA NÃO executa. Ela descreve o que entendeu, a
 * proposta vai pra `acoes_pendentes`, e a Karol recebe dois botões. Um LLM
 * não erra travando: ele acerta a forma e erra o alvo com confiança total.
 * Com dois atendimentos amanhã, "cancela o de amanhã" tem metade de chance
 * de apagar o errado — e quem descobre é a cliente, na porta do studio.
 *
 * É o mesmo desenho da remarcação pelo WhatsApp: lá a cliente escolhe e a
 * Karol decide; aqui a IA propõe e a Karol decide.
 */

/** Quantas idas ao modelo por mensagem. Depois disso, ele responde em texto. */
const MAX_RODADAS = 3;

/** O prefixo dos botões do assistente, pra `recepcao.ts` saber rotear. */
export const PREFIXO_BOTAO = "a:";

export type DesfechoAssistente =
  | { fez: "respondeu" }
  | { fez: "propos"; ferramenta: string }
  | { fez: "executou"; ferramenta: string; ok: boolean }
  | { fez: "recusou" }
  | { fez: "esqueceu" }
  | { fez: "nada"; motivo: "sem-ia" | "sem-resposta" | "acao-expirada" };

/* ------------------------------------------------------------------ */
/* As ferramentas que o modelo pode chamar                             */
/* ------------------------------------------------------------------ */

/** Ferramentas de LEITURA: executam na hora, sem confirmação. */
const LEITURA = new Set(["ver_agenda", "procurar", "horarios_livres", "resumo_do_mes"]);

/** Ferramentas de ESCRITA: viram proposta com botão. */
const ESCRITA = new Set(["mudar_situacao", "remarcar", "bloquear", "marcar"]);

const FERRAMENTAS: Ferramenta[] = [
  {
    type: "function",
    function: {
      name: "ver_agenda",
      description:
        "Lista os agendamentos da Karol num intervalo de dias a partir de hoje. Use para perguntas como 'o que tenho amanhã', 'como está minha semana', 'quem vem sábado'.",
      parameters: {
        type: "object",
        properties: {
          de_dias: {
            type: "integer",
            description: "0 = hoje, 1 = amanhã. Pode ser negativo para dias passados.",
          },
          ate_dias: {
            type: "integer",
            description: "Quantos dias adiante do 'de_dias' incluir. Use 0 para um dia só.",
          },
        },
        required: ["de_dias", "ate_dias"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "procurar",
      description:
        "Procura agendamentos pelo nome da cliente ou pelo telefone dela. Use quando a Karol citar uma pessoa pelo nome.",
      parameters: {
        type: "object",
        properties: {
          termo: { type: "string", description: "Nome ou telefone. Mínimo 3 caracteres." },
        },
        required: ["termo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "horarios_livres",
      description:
        "Os horários ainda livres para um serviço num dia. Use antes de propor marcar ou remarcar alguém.",
      parameters: {
        type: "object",
        properties: {
          dia: { type: "string", description: "Data no formato AAAA-MM-DD." },
          servico_id: {
            type: "string",
            description: `Um destes: ${SERVICOS.map((s) => s.id).join(", ")}`,
          },
        },
        required: ["dia", "servico_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resumo_do_mes",
      description:
        "Números do mês: faturamento, quantas atendeu, faltas, ticket médio, clientes novas e que voltaram.",
      parameters: {
        type: "object",
        properties: {
          meses_atras: {
            type: "integer",
            description: "0 = mês atual, 1 = mês passado.",
          },
        },
        required: ["meses_atras"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mudar_situacao",
      description:
        "PROPÕE mudar a situação de um agendamento: cancelar, marcar que a cliente foi atendida, que faltou, ou reativar. Não executa — a Karol confirma depois.",
      parameters: {
        type: "object",
        properties: {
          codigo: {
            type: "string",
            description: "O código de 6 caracteres do agendamento, vindo de ver_agenda ou procurar.",
          },
          situacao: {
            type: "string",
            description:
              "cancelado, concluido (foi atendida), faltou (não apareceu) ou confirmado (reativar).",
          },
        },
        required: ["codigo", "situacao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remarcar",
      description:
        "PROPÕE mover um agendamento para outro dia e hora. Confira antes com horarios_livres. Não executa — a Karol confirma depois.",
      parameters: {
        type: "object",
        properties: {
          codigo: { type: "string", description: "O código de 6 caracteres do agendamento." },
          dia: { type: "string", description: "Data no formato AAAA-MM-DD." },
          hora: { type: "string", description: "Hora no formato HH:MM." },
        },
        required: ["codigo", "dia", "hora"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bloquear",
      description:
        "PROPÕE fechar a agenda num período: viagem, feriado, compromisso. Não executa — a Karol confirma depois.",
      parameters: {
        type: "object",
        properties: {
          dia_inicio: { type: "string", description: "Data inicial, AAAA-MM-DD." },
          dia_fim: { type: "string", description: "Data final, AAAA-MM-DD. Igual à inicial se for um dia só." },
          motivo: { type: "string", description: "Por quê. Ex: 'viagem', 'feriado', 'médico'." },
          hora_inicio: { type: "string", description: "HH:MM. Deixe vazio para o dia inteiro." },
          hora_fim: { type: "string", description: "HH:MM. Deixe vazio para o dia inteiro." },
        },
        required: ["dia_inicio", "dia_fim", "motivo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "marcar",
      description:
        "PROPÕE criar um agendamento novo. Confira antes com horarios_livres. Não executa — a Karol confirma depois.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da cliente." },
          whatsapp: { type: "string", description: "Telefone com DDD. Pode ficar vazio." },
          servico_id: {
            type: "string",
            description: `Um destes: ${SERVICOS.map((s) => s.id).join(", ")}`,
          },
          dia: { type: "string", description: "Data no formato AAAA-MM-DD." },
          hora: { type: "string", description: "Hora no formato HH:MM." },
        },
        required: ["nome", "servico_id", "dia", "hora"],
      },
    },
  },
];

/* ------------------------------------------------------------------ */
/* O contexto que o modelo recebe                                      */
/* ------------------------------------------------------------------ */

/**
 * O que o modelo precisa saber antes de qualquer coisa.
 *
 * A data de hoje entra aqui porque sem ela o modelo não converte "quinta"
 * em data nenhuma — ele não tem relógio, e chutar a data é o erro mais
 * fácil e mais caro que ele poderia cometer aqui.
 */
function instrucoes(): string {
  const hoje = new Date();

  return [
    `Você é o assistente da ${NEGOCIO.profissional}, do ${NEGOCIO.nome}.`,
    "Você fala com a PRÓPRIA KAROL pelo WhatsApp, não com clientes dela.",
    "",
    `Hoje é ${DIA_POR_EXTENSO.format(hoje)} de ${hoje.getFullYear()} (${paraChave(hoje)}).`,
    "",
    "COMO ELA TRABALHA",
    ...Object.entries(CIDADES).map(([, c]) => `- Atende em ${c.nome}.`),
    "- Segunda a sexta em Pereira Barreto, das 7h às 11h.",
    "- Sábado em Bandeirantes D'Oeste, das 11h às 22h.",
    "- Domingo não atende. Uma cliente por vez.",
    "",
    "SERVIÇOS (use o id exato nas ferramentas)",
    ...SERVICOS.map(
      (s) =>
        `- ${s.id}: ${s.nome}, ${formatarPreco(s.preco)}, ${s.duracaoMinMin} a ${s.duracaoMaxMin} min` +
        (s.agendavel ? "" : " (não aparece na agenda do site, é combinado direto com ela)"),
    ),
    "",
    "REGRAS",
    "1. Responda SEMPRE em português do Brasil, curto e direto, como mensagem de WhatsApp.",
    "2. Você está falando com ela, então trate por 'você'. Nada de 'a Karol'.",
    "3. Antes de propor mudança, CONFIRA os dados com ver_agenda ou procurar.",
    "4. Nunca invente horário, nome, preço ou código. Se não achou, diga que não achou.",
    "5. Se o pedido for ambíguo (duas clientes possíveis, dia não informado), PERGUNTE em vez de escolher.",
    "6. As ferramentas de mudar_situacao, remarcar, bloquear e marcar NÃO executam nada — elas só preparam a proposta, e ela vai confirmar no botão. Não diga que já fez.",
    "7. Não use markdown de título nem lista com asterisco. Emoji com moderação.",
    "8. Datas sempre no formato AAAA-MM-DD e horas em HH:MM nas ferramentas.",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Executar as leituras                                                */
/* ------------------------------------------------------------------ */

/** Um agendamento do jeito que o modelo enxerga. */
function paraModelo(a: Agendamento) {
  return {
    codigo: codigoDoAgendamento(a.id),
    cliente: a.clienteNome,
    telefone: formatarWhatsapp(a.clienteWhatsapp),
    servico: a.servicoNome,
    quando: DIA_HORA_POR_EXTENSO.format(a.inicio),
    dia: paraChave(a.inicio),
    hora: HORA.format(a.inicio),
    cidade: a.cidade,
    situacao: a.situacao,
    valor: formatarPreco(a.servicoPreco / 100),
  };
}

/** Resolve o código de 6 caracteres num agendamento de verdade. */
async function porCodigo(codigo: unknown): Promise<Agendamento | null> {
  if (typeof codigo !== "string" || codigo.trim().length < 4) return null;
  const achados = await procurarAgendamentos(codigo.trim());
  // A busca por código devolve LISTA porque seis dígitos hexadecimais
  // podem colidir. Duas linhas aqui significam que não dá pra ter certeza
  // de qual ela quis — e agir na dúvida é o erro que não pode acontecer.
  return achados.length === 1 ? achados[0] : null;
}

async function executarLeitura(
  nome: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (nome) {
    case "ver_agenda": {
      const de = numero(args.de_dias, 0);
      const ate = Math.min(Math.max(numero(args.ate_dias, 7), 0), 90);
      const lista = await agendaDaKarol(de, ate);
      return {
        quantos: lista.length,
        agendamentos: lista.slice(0, 40).map(paraModelo),
      };
    }

    case "procurar": {
      const termo = String(args.termo ?? "").trim();
      if (termo.length < 3) return { erro: "Preciso de pelo menos 3 letras ou números." };
      const achados = await procurarAgendamentos(termo);
      return { quantos: achados.length, agendamentos: achados.slice(0, 20).map(paraModelo) };
    }

    case "horarios_livres": {
      const servico = buscarServico(String(args.servico_id ?? ""));
      if (!servico) return { erro: "Serviço não encontrado." };
      const dia = String(args.dia ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { erro: "Dia tem que ser AAAA-MM-DD." };
      const livres = await horariosDoDia(servico, dia);
      return { dia, servico: servico.nome, horarios: livres.map((h) => h.rotulo) };
    }

    case "resumo_do_mes": {
      const atras = Math.min(Math.max(numero(args.meses_atras, 0), 0), 12);
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - atras);
      const r = await relatorioDoMes(d.getFullYear(), d.getMonth());
      return {
        faturamento: formatarPreco(r.faturamento / 100),
        atendidas: r.atendidas,
        faltas: r.faltaram,
        taxa_de_falta: `${r.taxaFalta}%`,
        ticket_medio: formatarPreco(r.ticketMedio / 100),
        clientes_novas: r.novas,
        clientes_que_voltaram: r.retornaram,
        sem_marcacao: r.aMarcar.length,
        por_servico: r.porServico.map((l) => `${l.nome}: ${l.quantidade}`),
      };
    }

    default:
      return { erro: "Ferramenta desconhecida." };
  }
}

function numero(v: unknown, padrao: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : padrao;
}

/* ------------------------------------------------------------------ */
/* Preparar as escritas: validar e descrever                           */
/* ------------------------------------------------------------------ */

const SITUACAO_EM_PALAVRAS: Record<string, string> = {
  cancelado: "CANCELAR",
  concluido: "marcar como ATENDIDA",
  faltou: "marcar que FALTOU",
  confirmado: "REATIVAR",
};

/**
 * Transforma a proposta do modelo numa frase que a Karol possa julgar.
 *
 * ⚠️ A descrição é a única coisa que ela lê antes de confirmar, então ela
 * tem que conter o ALVO por extenso — nome, dia e hora — e não o código.
 * "Confirmar ação?" com um código do lado seria ela apertando no escuro, e
 * aí o botão de confirmação não protege de nada.
 *
 * Devolve `null` quando os argumentos não fecham. Nesse caso não há
 * proposta nenhuma: é melhor a IA dizer "não entendi" do que oferecer um
 * botão que vai falhar depois de ela tocar.
 */
async function descrever(
  nome: string,
  args: Record<string, unknown>,
): Promise<string | null> {
  switch (nome) {
    case "mudar_situacao": {
      const ag = await porCodigo(args.codigo);
      const situacao = String(args.situacao ?? "");
      const verbo = SITUACAO_EM_PALAVRAS[situacao];
      if (!ag || !verbo) return null;
      return `${verbo} o horário de ${ag.clienteNome} — ${ag.servicoNome}, ${DIA_HORA_POR_EXTENSO.format(ag.inicio)}, ${ag.cidade}.`;
    }

    case "remarcar": {
      const ag = await porCodigo(args.codigo);
      const dia = String(args.dia ?? "");
      const hora = String(args.hora ?? "");
      if (!ag || !/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) return null;
      return [
        `REMARCAR ${ag.clienteNome} — ${ag.servicoNome}`,
        `De:  ${DIA_HORA_POR_EXTENSO.format(ag.inicio)}`,
        `Pra: ${DIA_HORA_POR_EXTENSO.format(new Date(`${dia}T${hora}:00`))}`,
      ].join("\n");
    }

    case "bloquear": {
      const de = String(args.dia_inicio ?? "");
      const ate = String(args.dia_fim ?? "");
      const motivo = String(args.motivo ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) return null;
      if (motivo.length < 2) return null;

      const hi = String(args.hora_inicio ?? "");
      const hf = String(args.hora_fim ?? "");
      const faixa =
        de === ate
          ? DIA_POR_EXTENSO.format(new Date(`${de}T12:00:00`))
          : `de ${DIA_POR_EXTENSO.format(new Date(`${de}T12:00:00`))} a ${DIA_POR_EXTENSO.format(new Date(`${ate}T12:00:00`))}`;
      const horas = hi && hf ? ` das ${hi} às ${hf}` : " (dia inteiro)";

      return `FECHAR a agenda ${faixa}${horas} — ${motivo}.`;
    }

    case "marcar": {
      const servico = buscarServico(String(args.servico_id ?? ""));
      const nomeCliente = String(args.nome ?? "").trim();
      const dia = String(args.dia ?? "");
      const hora = String(args.hora ?? "");
      if (!servico || nomeCliente.length < 2) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) return null;

      const tel = String(args.whatsapp ?? "").trim();
      return [
        `MARCAR ${nomeCliente}${tel ? ` (${tel})` : ""}`,
        `${servico.nome} — ${DIA_HORA_POR_EXTENSO.format(new Date(`${dia}T${hora}:00`))}`,
      ].join("\n");
    }

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Executar o que ela confirmou                                        */
/* ------------------------------------------------------------------ */

/**
 * ⚠️ ESTE É O ÚNICO CAMINHO EM QUE O ASSISTENTE MUDA A AGENDA, e ele só
 * roda depois de a Karol tocar em "Confirmar". Nenhuma outra função deste
 * arquivo chama `mudarSituacao`, `remarcarAgendamento`,
 * `criarAgendamentoNoPainel` ou `criarBloqueio` — há um teste que lê o
 * arquivo e prova isso.
 */
async function executar(
  ferramenta: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; erro?: string }> {
  switch (ferramenta) {
    case "mudar_situacao": {
      const ag = await porCodigo(args.codigo);
      if (!ag) return { ok: false, erro: "Não achei mais esse agendamento." };
      return mudarSituacao(ag.id, String(args.situacao ?? ""));
    }

    case "remarcar": {
      const ag = await porCodigo(args.codigo);
      if (!ag) return { ok: false, erro: "Não achei mais esse agendamento." };
      return remarcarAgendamento(ag.id, String(args.dia), String(args.hora));
    }

    case "bloquear":
      return criarBloqueio({
        dataInicio: String(args.dia_inicio),
        dataFim: String(args.dia_fim),
        horaInicio: String(args.hora_inicio ?? "") || undefined,
        horaFim: String(args.hora_fim ?? "") || undefined,
        motivo: String(args.motivo),
      });

    case "marcar": {
      const dia = String(args.dia);
      const cidade = cidadeDoDia(dia);
      if (!cidade) return { ok: false, erro: "Nesse dia você não atende." };

      const r = await criarAgendamentoNoPainel({
        servicoId: String(args.servico_id),
        cidade,
        chaveDia: dia,
        hora: String(args.hora),
        nome: String(args.nome),
        whatsapp: normalizarWhatsapp(String(args.whatsapp ?? "")) ?? "",
      });
      return { ok: r.ok, erro: r.erro };
    }

    default:
      return { ok: false, erro: "Ação desconhecida." };
  }
}

/**
 * Em que cidade ela está naquele dia.
 *
 * A cidade não é escolha, é consequência do dia da semana — segunda a
 * sexta em Pereira Barreto, sábado em Bandeirantes. Deixar a IA escolher
 * seria deixá-la marcar cliente na cidade errada, que é o erro nº 1 que
 * este projeto inteiro foi desenhado pra evitar.
 */
function cidadeDoDia(chave: string): CidadeId | null {
  const dia = new Date(`${chave}T12:00:00`).getDay();
  if (dia >= 1 && dia <= 5) return "pereira-barreto";
  if (dia === 6) return "bandeirantes";
  return null;
}

/* ------------------------------------------------------------------ */
/* A conversa                                                          */
/* ------------------------------------------------------------------ */

/** Reconhece "esquece", "recomeça" — o jeito dela de zerar a conversa. */
function pediuPraEsquecer(texto: string): boolean {
  return /^\s*(esquece|esqueça|recome[çc]a|zera|limpa|come[çc]ar de novo)\b/i.test(texto);
}

/**
 * A Karol mandou uma mensagem. Responde ela.
 *
 * Só chega aqui quem `recepcao.ts` reconheceu como sendo o número dela.
 */
export async function assistente(
  de: string,
  texto: string,
): Promise<DesfechoAssistente> {
  if (pediuPraEsquecer(texto)) {
    await limparHistorico(de);
    await enviarTexto(de, "Esqueci o que a gente estava falando. Pode começar de novo. 💛");
    return { fez: "esqueceu" };
  }

  if (!iaConfigurada()) {
    await enviarTexto(
      de,
      `O assistente ainda não está ligado por aqui. Sua agenda está no painel: ${SITE_URL}/painel`,
    );
    return { fez: "nada", motivo: "sem-ia" };
  }

  const historico = await historicoDe(de);

  const mensagens: Mensagem[] = [
    { role: "system", content: instrucoes() },
    ...historico.map((f) => ({
      role: f.papel as "user" | "assistant",
      content: f.texto,
    })),
    { role: "user", content: texto },
  ];

  for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
    // Na última rodada tiramos as ferramentas: sem isso o modelo pode
    // ficar pedindo leitura pra sempre e a Karol nunca receber resposta.
    const resposta = await perguntar(
      mensagens,
      rodada === MAX_RODADAS - 1 ? [] : FERRAMENTAS,
    );

    if (!resposta) {
      await enviarTexto(
        de,
        `Não consegui pensar agora. 😕 Sua agenda está no painel: ${SITE_URL}/painel`,
      );
      return { fez: "nada", motivo: "sem-resposta" };
    }

    // ESCRITA: vira proposta com botão e a conversa para aqui.
    const escrita = resposta.chamadas.find((c) => ESCRITA.has(c.function.name));
    if (escrita) {
      return propor(de, texto, escrita.function.name, lerArgumentos(escrita.function.arguments));
    }

    const leituras = resposta.chamadas.filter((c) => LEITURA.has(c.function.name));
    if (leituras.length > 0) {
      mensagens.push({
        role: "assistant",
        content: resposta.texto,
        tool_calls: resposta.chamadas,
      });

      for (const c of leituras) {
        const dados = await executarLeitura(c.function.name, lerArgumentos(c.function.arguments));
        mensagens.push({
          role: "tool",
          tool_call_id: c.id,
          content: JSON.stringify(dados),
        });
      }
      continue;
    }

    // Texto puro: acabou.
    const dito = resposta.texto?.trim();
    if (dito) {
      await enviarTexto(de, dito);
      await guardarFalas(de, [
        { papel: "user", texto },
        { papel: "assistant", texto: dito },
      ]);
      return { fez: "respondeu" };
    }

    break;
  }

  await enviarTexto(de, `Não consegui responder isso. Tenta de outro jeito? 🤍`);
  return { fez: "nada", motivo: "sem-resposta" };
}

/** Guarda a proposta e manda os dois botões. */
async function propor(
  de: string,
  pedido: string,
  ferramenta: string,
  args: Record<string, unknown>,
): Promise<DesfechoAssistente> {
  const descricao = await descrever(ferramenta, args);

  if (!descricao) {
    await enviarTexto(
      de,
      "Não consegui entender direito o que mudar. Me diz o nome da cliente e o dia? 🤍",
    );
    return { fez: "nada", motivo: "sem-resposta" };
  }

  const id = await guardarAcao({ whatsapp: de, ferramenta, argumentos: args, descricao });

  if (!id) {
    await enviarTexto(de, `Não consegui preparar isso agora. Dá pra resolver no painel: ${SITE_URL}/painel`);
    return { fez: "nada", motivo: "sem-resposta" };
  }

  await enviarTextoComBotoes(de, `Confere pra mim:\n\n${descricao}`, [
    { id: `${PREFIXO_BOTAO}ok:${id}`, titulo: "✅ Confirmar" },
    { id: `${PREFIXO_BOTAO}no:${id}`, titulo: "❌ Deixa" },
  ]);

  await guardarFalas(de, [
    { papel: "user", texto: pedido },
    { papel: "assistant", texto: `Propus: ${descricao}` },
  ]);

  return { fez: "propos", ferramenta };
}

/**
 * A Karol tocou num dos dois botões.
 *
 * O id do botão é `a:ok:<uuid>` ou `a:no:<uuid>`. O uuid sozinho não
 * autoriza nada: `buscarAcao` confere que a ação é DAQUELE número, que
 * ainda está aguardando e que não expirou.
 */
export async function decisaoDoBotao(
  de: string,
  botao: string,
): Promise<DesfechoAssistente> {
  const [, acaoTocada, id] = botao.split(":");
  const pendente = await buscarAcao(id ?? "", de);

  if (!pendente) {
    await enviarTexto(
      de,
      "Esse pedido já expirou ou já foi resolvido. Me manda de novo que eu preparo outro. 🤍",
    );
    return { fez: "nada", motivo: "acao-expirada" };
  }

  if (acaoTocada !== "ok") {
    await fecharAcao(pendente.id, "recusada");
    await enviarTexto(de, "Beleza, não mexi em nada. 💛");
    return { fez: "recusou" };
  }

  const r = await executar(pendente.ferramenta, pendente.argumentos);
  await fecharAcao(pendente.id, "feita", r.ok ? "ok" : r.erro);

  await enviarTexto(
    de,
    r.ok
      ? `Feito. ✅\n\n${pendente.descricao}`
      : `Não deu certo: ${r.erro ?? "erro desconhecido"}`,
  );

  return { fez: "executou", ferramenta: pendente.ferramenta, ok: r.ok };
}
