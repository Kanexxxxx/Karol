import { existsSync, readFileSync } from "node:fs";
import { describe, it, vi } from "vitest";

/**
 * A BANCADA DE PROVAS DO ASSISTENTE.
 *
 * ---------------------------------------------------------------------
 * Pra que serve
 * ---------------------------------------------------------------------
 *
 * Todo o resto da pasta testa o NOSSO código com um modelo de mentira.
 * Isso é certo: teste tem que ser rápido, de graça e sempre dar o mesmo
 * resultado. Mas tem uma classe de defeito que um modelo de mentira nunca
 * mostra, porque ela mora no modelo de verdade.
 *
 * Foi ela que derrubou o assistente nos testes da Karol em 12/09. Rodando
 * esta bancada contra a API, em 16 casos, apareceram três coisas que nenhum
 * teste nosso pegava:
 *
 *  1. o modelo INVENTA id de agendamento ("ana-paula-2026-09-18-0730");
 *  2. sem ferramenta na mesa, ele escreve a chamada à mão, e a marcação
 *     interna ia inteira pro WhatsApp dela;
 *  3. `deepseek-chat`, o apelido antigo, é o pior dos modelos de hoje.
 *
 * Os três viraram conserto no código e teste de graça em
 * `assistente.test.ts` e `fala-do-modelo.test.ts`. A bancada fica pra
 * quando alguém for trocar de modelo, mexer no roteiro, ou desconfiar de
 * uma resposta esquisita.
 *
 * ---------------------------------------------------------------------
 * Como rodar
 * ---------------------------------------------------------------------
 *
 *     BANCADA=1 npx vitest run src/lib/bancada-de-provas.test.ts
 *
 * ⚠️ CUSTA DINHEIRO E DEMORA. São 16 casos vezes 3 modelos, cada um com
 * até 4 idas à API — uns 400 mil tokens e 4 minutos. Por isso ela fica
 * DESLIGADA por padrão: sem `BANCADA=1`, o arquivo é pulado e o `npm
 * test` continua rápido e de graça.
 *
 * Precisa da `DEEPSEEK_API_KEY` no `.env.local` (que não vai pro git).
 *
 * ---------------------------------------------------------------------
 * Sobre o placar
 * ---------------------------------------------------------------------
 *
 * ⚠️ ELE NÃO É VERDADE ABSOLUTA. Metade das "falhas" da primeira rodada
 * era erro MEU, não do modelo: eu esperava 16:00 numa segunda, que está
 * fora do expediente dela, e o modelo estava certo em recusar. Antes de
 * culpar o modelo, leia o caso e confira se a expectativa faz sentido.
 */

vi.mock("server-only", () => ({}));
vi.mock("./ia", () => ({ iaConfigurada: () => true, perguntar: vi.fn(), lerArgumentos: (b: string) => JSON.parse(b) }));
vi.mock("./notificacoes", () => ({ enviarTexto: vi.fn(), BOTAO_TEMPLATE: {}, enviarTextoComBotoes: vi.fn(), whatsappDaKarol: () => "1" }));
vi.mock("./conversas", () => ({ historicoDe: vi.fn(async () => []), guardarFalas: vi.fn(), limparHistorico: vi.fn(), abrirJanela: vi.fn() }));
vi.mock("./acoes-pendentes", () => ({ guardarAcao: vi.fn(), reservarAcao: vi.fn(), registrarResultado: vi.fn(), fecharAcao: vi.fn() }));
vi.mock("./supabase", () => ({ banco: () => ({}) }));

import { FERRAMENTAS, instrucoes } from "./assistente";
import { lembreteDaLista } from "./lista-mostrada";

/** Ligada só com `BANCADA=1`, e só se a chave existir nesta máquina. */
const LIGADA = Boolean(process.env.BANCADA) && existsSync(".env.local");
const chave = LIGADA
  ? (readFileSync(".env.local", "utf8").match(/DEEPSEEK_API_KEY\s*=\s*(\S+)/)?.[1] ?? "")
  : "";
const MAX_RODADAS = 4;

type Chamada = { id: string; type: "function"; function: { name: string; arguments: string } };
type Fala = {
  role: string;
  content: string | null;
  reasoning_content?: string | null;
  tool_calls?: Chamada[];
  tool_call_id?: string;
};

const LEITURA = new Set(["ver_agenda", "procurar", "horarios_livres", "resumo_do_mes"]);
const ESCRITA = new Set(["mudar_situacao", "remarcar", "bloquear", "marcar"]);

const ANA = { id: "11111111-1111-1111-1111-111111111111", cliente: "Ana Paula", servico: "sobrancelha", dia: "2026-09-18", hora: "07:30", situacao: "confirmado" };
const BIA = { id: "22222222-2222-2222-2222-222222222222", cliente: "Beatriz Souza", servico: "maquiagem", dia: "2026-09-18", hora: "09:00", situacao: "confirmado" };
const CLA = { id: "33333333-3333-3333-3333-333333333333", cliente: "Clara Lima", servico: "cilios", dia: "2026-09-18", hora: "19:00", situacao: "pendente" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDS = new Set([ANA.id, BIA.id, CLA.id]);

/** A agenda de mentira que responde as leituras. */
function responderLeitura(nome: string, args: Record<string, unknown>): unknown {
  if (nome === "procurar") {
    const t = String(args.termo ?? "").toLowerCase();
    return [ANA, BIA, CLA].filter((a) => a.cliente.toLowerCase().includes(t));
  }
  if (nome === "ver_agenda") return [ANA, BIA, CLA];
  if (nome === "horarios_livres") return { dia: args.dia, livres: ["08:15", "09:45", "10:30", "19:00", "19:30"] };
  if (nome === "resumo_do_mes") return { faturamento: 184000, atendidas: 23, faltas: 2 };
  return {};
}

/** O mesmo laco do assistente de verdade: le, devolve o dado, pergunta de novo. */
async function rodar(modelo: string, falas: Fala[]) {
  const mensagens: Fala[] = [{ role: "system", content: instrucoes() }, ...falas];
  const t0 = Date.now();
  let tokens = 0;
  const vazio = { escrita: null as null | { nome: string; args: Record<string, unknown> }, texto: "" };
  let voltas = 0;
  let semFerramentas = false;
  let inventouId = false;

  for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: mensagens,
        tools: rodada === MAX_RODADAS - 1 ? undefined : FERRAMENTAS,
        temperature: 0.3,
      }),
    });
    voltas = rodada + 1;
    semFerramentas = rodada === MAX_RODADAS - 1;
    const j = await r.json();
    tokens += j.usage?.total_tokens ?? 0;
    if (j.error) return { ...vazio, erro: j.error.message as string, ms: Date.now() - t0, tokens, voltas, semFerramentas, inventouId };

    const m = j.choices?.[0]?.message ?? {};
    const chamadas: Chamada[] = m.tool_calls ?? [];
    const args = (c: Chamada) => {
      try {
        return JSON.parse(c.function.arguments);
      } catch {
        return {};
      }
    };

    const escrita = chamadas.find((c) => ESCRITA.has(c.function.name));
    if (escrita) {
      // Espelha o assistente: id inventado volta pro modelo como erro.
      const a = args(escrita);
      const precisaDeId = ["mudar_situacao", "remarcar"].includes(escrita.function.name);
      const ruim = precisaDeId && (!UUID.test(String(a.id ?? "")) || !IDS.has(String(a.id)));
      if (ruim && rodada < MAX_RODADAS - 1) {
        inventouId = true;
        mensagens.push({ role: "assistant", content: m.content ?? null, reasoning_content: m.reasoning_content ?? undefined, tool_calls: chamadas });
        mensagens.push({ role: "tool", tool_call_id: escrita.id, content: JSON.stringify({ erro: `O id "${a.id}" nao existe. Chame procurar e use o id que voltar.` }) });
        continue;
      }
      return {
        erro: null,
        ms: Date.now() - t0,
        tokens,
        voltas,
        semFerramentas,
        inventouId,
        escrita: { nome: escrita.function.name, args: args(escrita) },
        texto: (m.content ?? "").trim(),
      };
    }

    const leituras = chamadas.filter((c) => LEITURA.has(c.function.name));
    if (leituras.length > 0) {
      // O `reasoning_content` volta junto: os modelos que pensam exigem isso.
      mensagens.push({
        role: "assistant",
        content: m.content ?? null,
        reasoning_content: m.reasoning_content ?? undefined,
        tool_calls: chamadas,
      });
      for (const c of leituras) {
        mensagens.push({
          role: "tool",
          tool_call_id: c.id,
          content: JSON.stringify(responderLeitura(c.function.name, args(c))),
        });
      }
      continue;
    }

    return { erro: null, ms: Date.now() - t0, tokens, voltas, semFerramentas, inventouId, escrita: null, texto: (m.content ?? "").trim() };
  }
  return { ...vazio, erro: "estourou as rodadas", ms: Date.now() - t0, tokens, voltas, semFerramentas, inventouId };
}

type R = Awaited<ReturnType<typeof rodar>>;

const CASOS: { nome: string; falas: Fala[]; espera: (r: R) => string | null }[] = [
  {
    nome: "PEDIR O QUE FALTA: 'remarca a ana', sem dia nem hora",
    falas: [{ role: "user", content: "remarca a ana" }],
    espera: (r) =>
      r.escrita ? `!! remarcou sem perguntar: ${JSON.stringify(r.escrita.args)}` : r.texto ? null : "ficou mudo",
  },
  {
    nome: "MEMORIA: o dia numa fala, a hora na seguinte",
    falas: [
      { role: "user", content: "remarca a ana" },
      { role: "assistant", content: "Achei a Ana Paula, sobrancelha, sexta 18/09 as 07:30. Pra qual dia voce quer passar?" },
      { role: "user", content: "segunda" },
      { role: "assistant", content: "Que horario na segunda? Segunda eu atendo das 7h as 11h e das 18h30 as 22h." },
      { role: "user", content: "19" },
    ],
    espera: (r) => {
      if (!r.escrita) return `nao remarcou; disse ${JSON.stringify(r.texto.slice(0, 100))}`;
      if (r.escrita.nome !== "remarcar") return `chamou ${r.escrita.nome}`;
      if (r.escrita.args.id !== ANA.id) return `id errado: ${r.escrita.args.id}`;
      if (!["2026-09-14", "2026-09-21"].includes(String(r.escrita.args.dia))) return `dia nao e segunda: ${r.escrita.args.dia}`;
      if (r.escrita.args.hora !== "19:00") return `hora errada: ${r.escrita.args.hora}`;
      return null;
    },
  },
  {
    nome: "REFERENCIA: 'cancela a segunda' depois de listar tres",
    falas: [
      { role: "user", content: "o que eu tenho sexta?" },
      { role: "assistant", content: "Sexta 18/09 voce tem tres: 07:30 Ana Paula (sobrancelha), 09:00 Beatriz Souza (maquiagem), 19:00 Clara Lima (cilios)." },
      { role: "user", content: "cancela a segunda" },
    ],
    espera: (r) => {
      if (!r.escrita) return `nao cancelou; disse ${JSON.stringify(r.texto.slice(0, 100))}`;
      if (r.escrita.args.id === BIA.id) return null;
      if (r.escrita.args.id === ANA.id) return "!! pegou a PRIMEIRA (Ana) em vez da segunda";
      return `id errado: ${r.escrita.args.id}`;
    },
  },
  {
    nome: "REFERENCIA: 'ela' e a pessoa citada por ultimo",
    falas: [
      { role: "user", content: "quem vem sexta?" },
      { role: "assistant", content: "Sexta 18/09: 07:30 Ana Paula, 09:00 Beatriz Souza, 19:00 Clara Lima." },
      { role: "user", content: "a clara ja confirmou?" },
      { role: "assistant", content: "A Clara Lima ainda esta como pendente." },
      { role: "user", content: "entao marca ela como confirmada" },
    ],
    espera: (r) => {
      if (!r.escrita) return `nao mudou; disse ${JSON.stringify(r.texto.slice(0, 100))}`;
      if (r.escrita.args.id !== CLA.id) return `!! mexeu no id errado: ${r.escrita.args.id}`;
      return null;
    },
  },
  {
    nome: "REFERENCIA: 'pode ser o ultimo' de uma lista de horarios",
    falas: [
      { role: "user", content: "tem vaga sexta pra encaixar a maria, sobrancelha? o telefone dela e 18991234567" },
      { role: "assistant", content: "Sexta tem 08:15, 09:45 e 10:30." },
      { role: "user", content: "pode ser o ultimo" },
    ],
    espera: (r) => {
      if (!r.escrita) return `nao marcou; disse ${JSON.stringify(r.texto.slice(0, 100))}`;
      if (r.escrita.nome !== "marcar") return `chamou ${r.escrita.nome}`;
      if (r.escrita.args.hora !== "10:30") return `!! hora errada: ${r.escrita.args.hora} (o ultimo e 10:30)`;
      return null;
    },
  },
  {
    nome: "CONTA DE DATA: 'daqui a duas semanas na quinta'",
    falas: [{ role: "user", content: "o que eu tenho daqui a duas semanas na quinta?" }],
    espera: (r) => (r.texto.length > 0 ? null : "ficou mudo"),
  },
  {
    nome: "NAO INVENTAR: pergunta que nenhuma ferramenta responde",
    falas: [{ role: "user", content: "qual foi o servico mais pedido em 2025?" }],
    espera: (r) => {
      if (r.escrita) return `!! escreveu na agenda: ${r.escrita.nome}`;
      const t = r.texto.toLowerCase();
      return /não|nao |consigo|painel|apenas|só |so /.test(t) ? null : `talvez tenha inventado: ${JSON.stringify(r.texto.slice(0, 100))}`;
    },
  },
  {
    nome: "FORA DO EXPEDIENTE: domingo as 3 da tarde",
    falas: [{ role: "user", content: "encaixa a maria domingo as 15h, sobrancelha, telefone 18991234567" }],
    espera: (r) => (r.escrita || r.texto ? null : "ficou mudo"),
  },
];


/* Desempate: o jeito que ela escreve de verdade — sem acento, sem virgula, tudo junto. */
const BAGUNCA: typeof CASOS = [
  {
    nome: "BAGUNCA: tudo numa frase so",
    falas: [{ role: "user", content: "oi bom dia entao a ana pediu pra passar o horario dela de sexta pra outro dia da semana que vem qualquer um de manha ve ai pra mim" }],
    espera: (r) => {
      if (r.escrita && r.escrita.args.id !== ANA.id) return `!! id errado: ${r.escrita.args.id}`;
      return r.escrita || r.texto ? null : "ficou mudo";
    },
  },
  {
    nome: "BAGUNCA: erro de digitacao no nome",
    falas: [{ role: "user", content: "cancela o horario da beatris de sexta" }],
    espera: (r) => {
      if (!r.escrita) return `nao cancelou; disse ${JSON.stringify(r.texto.slice(0, 90))}`;
      return r.escrita.args.id === BIA.id ? null : `!! id errado: ${r.escrita.args.id}`;
    },
  },
  {
    nome: "BAGUNCA: corrige no meio do caminho",
    falas: [
      { role: "user", content: "cancela a da ana" },
      { role: "assistant", content: "Cancelar o horario da Ana Paula, sobrancelha, sexta 18/09 as 07:30?" },
      { role: "user", content: "nao espera nao era a ana era a clara" },
    ],
    espera: (r) => {
      if (!r.escrita) return `nao cancelou; disse ${JSON.stringify(r.texto.slice(0, 90))}`;
      if (r.escrita.args.id === ANA.id) return "!! cancelou a ANA depois dela corrigir";
      return r.escrita.args.id === CLA.id ? null : `id errado: ${r.escrita.args.id}`;
    },
  },
  {
    nome: "BAGUNCA: pergunta e ordem na mesma mensagem",
    falas: [{ role: "user", content: "quem vem sexta e ja confirma a clara pra mim" }],
    espera: (r) => {
      if (!r.escrita) return `nao confirmou; disse ${JSON.stringify(r.texto.slice(0, 90))}`;
      return r.escrita.args.id === CLA.id ? null : `!! id errado: ${r.escrita.args.id}`;
    },
  },
  {
    nome: "BAGUNCA: hora falada, nao escrita",
    falas: [
      { role: "user", content: "encaixa a maria sobrancelha sexta as sete e meia da noite fone 18991234567" },
    ],
    espera: (r) => {
      if (!r.escrita) return `nao marcou; disse ${JSON.stringify(r.texto.slice(0, 90))}`;
      if (r.escrita.nome !== "marcar") return `chamou ${r.escrita.nome}`;
      return r.escrita.args.hora === "19:30" ? null : `!! hora errada: ${r.escrita.args.hora} (sete e meia da noite = 19:30)`;
    },
  },
  {
    nome: "BAGUNCA: desiste no meio",
    falas: [
      { role: "user", content: "cancela a da clara" },
      { role: "assistant", content: "Cancelar o horario da Clara Lima, cilios, sexta 18/09 as 19:00?" },
      { role: "user", content: "deixa pra la" },
    ],
    espera: (r) => (r.escrita ? `!! agiu depois dela desistir: ${r.escrita.nome}` : r.texto ? null : "ficou mudo"),
  },
  {
    nome: "BAGUNCA: fecha a agenda pra viajar",
    falas: [{ role: "user", content: "vou viajar fecha minha agenda da proxima segunda ate quarta" }],
    espera: (r) => {
      if (!r.escrita) return `nao bloqueou; disse ${JSON.stringify(r.texto.slice(0, 90))}`;
      return r.escrita.nome === "bloquear" ? null : `chamou ${r.escrita.nome}`;
    },
  },
  {
    nome: "BAGUNCA: reclamacao, nao ordem",
    falas: [{ role: "user", content: "nossa que dia cheio hoje to morta" }],
    espera: (r) => (r.escrita ? `!! mexeu na agenda: ${r.escrita.nome}` : r.texto ? null : "ficou mudo"),
  },
];
CASOS.push(...BAGUNCA);

const MODELOS = ["deepseek-chat", "deepseek-flash", "deepseek-v4-pro"];

describe.skipIf(!LIGADA || !chave)("bancada de provas (contra a API de verdade)", () => {
  it("compara os modelos", async () => {
    console.log(`\nroteiro: ${instrucoes().length} chars | ferramentas: ${FERRAMENTAS.length}\n`);
    for (const modelo of MODELOS) {
      let acertos = 0;
      let resgates = 0;
      let ms = 0;
      let tk = 0;
      const falhas: string[] = [];
      for (const caso of CASOS) {
        const r = await rodar(modelo, caso.falas);
        ms += r.ms;
        tk += r.tokens;
        if (r.erro) {
          falhas.push(`${caso.nome}: ERRO ${r.erro}`);
          continue;
        }
        const p = caso.espera(r);
        const vazou = /DSML|<｜/.test(r.texto);
        if (r.inventouId) resgates++;
        if (vazou) falhas.push(`${caso.nome}: !!! VAZOU MARCACAO INTERNA (volta ${r.voltas}, sem ferramentas=${r.semFerramentas})`);
        else if (p === null) acertos++;
        else falhas.push(`${caso.nome}: ${p} [volta ${r.voltas}, sem ferramentas=${r.semFerramentas}]`);
      }
      console.log(`${modelo.padEnd(16)} ${acertos}/${CASOS.length}  ${Math.round(ms / CASOS.length)}ms/caso  ${tk} tokens  ${resgates} id(s) inventado(s) e resgatado(s)`);
      falhas.forEach((f) => console.log(`   x ${f}`));
    }
  }, 900_000);
});

/* ------------------------------------------------------------------ */
/* A/B: vale a pena lembrar dos ids da última lista mostrada?          */
/* ------------------------------------------------------------------ */

/*
  O buraco: `guardarFalas` guarda só o texto final da resposta. O
  resultado da leitura — que é onde estão os ids — nunca é gravado. Então
  na mensagem SEGUINTE o modelo não tem mais os ids, e ou ele lê de novo
  (custa uma ida) ou inventa (foi o que aconteceu).

  Este teste compara as duas situações no mesmo caso, com o modelo que
  está em produção. Se lembrar não mudar nada, não vale a complexidade.
*/
const HOJE: Fala[] = [
  { role: "user", content: "quem vem sexta?" },
  { role: "assistant", content: "Sexta 18/09: 07:30 Ana Paula, 09:00 Beatriz Souza, 19:00 Clara Lima." },
];

const COM_LEMBRETE: Fala[] = [
  ...HOJE,
  {
    role: "assistant",
    /*
      ⚠️ O TEXTO EXATO QUE VAI PRA PRODUÇÃO, e não uma imitação dele. Se
      o formato mudar em `lista-mostrada.ts`, é o novo que é medido aqui.
    */
    content: lembreteDaLista(
      [ANA, BIA, CLA].map((a) => ({
        id: a.id,
        cliente: a.cliente,
        servico: a.servico,
        quando: `${a.dia} ${a.hora}`,
      })),
    ),
  },
];

const SEGUIDAS: { pedido: string; alvo: string }[] = [
  { pedido: "cancela a segunda", alvo: BIA.id },
  { pedido: "confirma a clara", alvo: CLA.id },
  { pedido: "cancela o primeiro horario", alvo: ANA.id },
  { pedido: "a beatriz desmarcou", alvo: BIA.id },
];

describe.skipIf(!LIGADA || !chave)("vale lembrar dos ids?", () => {
  it("compara sem lembrete e com lembrete", async () => {
    const modelo = "deepseek-flash";
    for (const [rotulo, base] of [
      ["hoje (sem os ids)", HOJE],
      ["com os ids na memoria", COM_LEMBRETE],
    ] as const) {
      let acertos = 0;
      let voltas = 0;
      let tk = 0;
      let ms = 0;
      const falhas: string[] = [];
      for (const caso of SEGUIDAS) {
        const r = await rodar(modelo, [...base, { role: "user", content: caso.pedido }]);
        voltas += r.voltas;
        tk += r.tokens;
        ms += r.ms;
        if (r.escrita && r.escrita.args.id === caso.alvo) acertos++;
        else falhas.push(`"${caso.pedido}" -> ${r.escrita ? r.escrita.args.id : `texto: ${r.texto.slice(0, 60)}`}`);
      }
      console.log(
        `${rotulo.padEnd(24)} ${acertos}/${SEGUIDAS.length}  ${voltas} idas ao modelo  ${tk} tokens  ${Math.round(ms / SEGUIDAS.length)}ms/caso`,
      );
      falhas.forEach((f) => console.log(`   x ${f}`));
    }
  }, 600_000);
});
