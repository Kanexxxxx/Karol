import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O ASSISTENTE INTEIRO, DE PONTA A PONTA, COM O MODELO DE VERDADE.
 *
 * ---------------------------------------------------------------------
 * O buraco que este arquivo fecha
 * ---------------------------------------------------------------------
 *
 * São dois jeitos de testar isto, e eu tinha só os dois errados:
 *
 * - `assistente.test.ts` roda o código de produção com um modelo de
 *   mentira. Prova o nosso código, e é cego pro que o modelo faz.
 * - `bancada-de-provas.test.ts` roda o modelo de verdade — mas com uma
 *   CÓPIA do laço, escrita à mão dentro do próprio teste. Prova o modelo,
 *   e é cega pro nosso código: se `assistente()` tiver um defeito que a
 *   cópia não tem, a bancada passa e a Karol sofre.
 *
 * Aqui roda a função `assistente()` de verdade, a mesma que o webhook
 * chama, contra a API de verdade. Só o banco e o WhatsApp são de mentira.
 * É o único lugar do projeto onde as duas metades se encontram.
 *
 * ---------------------------------------------------------------------
 * Como rodar
 * ---------------------------------------------------------------------
 *
 *     BANCADA=1 npx vitest run src/lib/assistente-de-ponta-a-ponta.test.ts
 *
 * Desligado por padrão pelo mesmo motivo da bancada: custa dinheiro e
 * demora. Precisa da `DEEPSEEK_API_KEY` no `.env.local`.
 *
 * ⚠️ AS AFIRMAÇÕES AQUI SÃO FROUXAS DE PROPÓSITO. Do outro lado tem um
 * modelo, que responde diferente a cada vez. Um teste que exige a frase
 * exata reprova por causa de uma vírgula e vira ruído que todo mundo
 * aprende a ignorar. O que se cobra aqui é o que NÃO PODE acontecer:
 * escrever na agenda sem o botão, mandar marcação interna pra ela, ficar
 * mudo, ou apontar pra pessoa errada.
 */

const LIGADA = Boolean(process.env.BANCADA) && existsSync(".env.local");
if (LIGADA) {
  const chave = readFileSync(".env.local", "utf8").match(/DEEPSEEK_API_KEY\s*=\s*(\S+)/)?.[1];
  if (chave) process.env.DEEPSEEK_API_KEY = chave;
}

/* ------------------------------------------------------------------ */
/* O mundo de mentira: banco e WhatsApp. O modelo é de verdade.        */
/* ------------------------------------------------------------------ */

const KAROL = "5518997525291";

const ANA = {
  id: "11111111-1111-1111-1111-111111111111",
  clienteNome: "Ana Paula",
  clienteWhatsapp: "5518999990001",
  servicoId: "design-simples",
  servicoNome: "Design de sobrancelhas",
  servicoPreco: 2500,
  cidade: "Pereira Barreto",
  inicio: new Date(2026, 8, 18, 7, 30),
  fim: new Date(2026, 8, 18, 8, 20),
  situacao: "confirmado" as const,
  observacao: null,
  criadoEm: new Date(),
};

const BIA = {
  ...ANA,
  id: "22222222-2222-2222-2222-222222222222",
  clienteNome: "Beatriz Souza",
  clienteWhatsapp: "5518999990002",
  servicoId: "design-henna",
  servicoNome: "Design com henna",
  servicoPreco: 3000,
  inicio: new Date(2026, 8, 18, 9, 0),
  fim: new Date(2026, 8, 18, 10, 10),
};

const CLARA = {
  ...ANA,
  id: "33333333-3333-3333-3333-333333333333",
  clienteNome: "Clara Lima",
  clienteWhatsapp: "5518999990003",
  inicio: new Date(2026, 8, 18, 19, 0),
  fim: new Date(2026, 8, 18, 19, 50),
  situacao: "pendente" as const,
};

const AGENDA = [ANA, BIA, CLARA];

/** O que foi mandado pro WhatsApp dela nesta rodada. */
const enviados: { texto: string; botoes: boolean }[] = [];
/** As propostas que chegaram a virar botão. */
const propostas: { ferramenta: string; argumentos: Record<string, unknown> }[] = [];
/** A memória da conversa, viva entre as mensagens do mesmo teste. */
let memoria: { papel: "user" | "assistant"; texto: string }[] = [];

vi.mock("server-only", () => ({}));

vi.mock("./notificacoes", () => ({
  enviarTexto: vi.fn(async (_de: string, texto: string) => {
    enviados.push({ texto, botoes: false });
    return true;
  }),
  enviarTextoComBotoes: vi.fn(async (_de: string, texto: string) => {
    enviados.push({ texto, botoes: true });
    return true;
  }),
  BOTAO_TEMPLATE: {},
  whatsappDaKarol: () => KAROL,
}));

vi.mock("./conversas", () => ({
  historicoDe: vi.fn(async () => memoria),
  guardarFalas: vi.fn(
    async (
      _w: string,
      novas: { papel: "user" | "assistant"; texto: string }[],
      opcoes: { descartar?: (t: string) => boolean } = {},
    ) => {
      const antes = opcoes.descartar ? memoria.filter((f) => !opcoes.descartar!(f.texto)) : memoria;
      memoria = [...antes, ...novas].slice(-30);
    },
  ),
  limparHistorico: vi.fn(async () => {
    memoria = [];
  }),
  abrirJanela: vi.fn(async () => {}),
}));

vi.mock("./acoes-pendentes", () => ({
  guardarAcao: vi.fn(async (a: { ferramenta: string; argumentos: Record<string, unknown> }) => {
    propostas.push({ ferramenta: a.ferramenta, argumentos: a.argumentos });
    return "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  }),
  reservarAcao: vi.fn(async () => null),
  registrarResultado: vi.fn(async () => {}),
  fecharAcao: vi.fn(async () => {}),
}));

vi.mock("./agendamentos", () => ({
  agendaDaKarol: vi.fn(async () => AGENDA),
  buscarAgendamento: vi.fn(async (id: string) => AGENDA.find((a) => a.id === id) ?? null),
  procurarAgendamentos: vi.fn(async (termo: string) =>
    AGENDA.filter((a) => a.clienteNome.toLowerCase().includes(termo.toLowerCase())),
  ),
  horariosDoDia: vi.fn(async () => [
    { rotulo: "08:15" },
    { rotulo: "09:45" },
    { rotulo: "10:30" },
    { rotulo: "19:00" },
  ]),
  relatorioDoMes: vi.fn(async () => ({
    faturamento: 184000,
    atendidas: 23,
    faltaram: 2,
    taxaFalta: 8,
    ticketMedio: 8000,
    novas: 5,
    retornaram: 18,
  })),
  // ⚠️ NENHUMA DESTAS PODE SER CHAMADA. É o ponto do arquivo.
  mudarSituacao: vi.fn(async () => ({ ok: true })),
  remarcarAgendamento: vi.fn(async () => ({ ok: true })),
  criarAgendamentoNoPainel: vi.fn(async () => ({ ok: true, id: "x" })),
  gradeDoDiaNaAgenda: vi.fn(async () => {
    const vagas = [];
    for (const [de, ate] of [
      [7 * 60, 11 * 60],
      [18 * 60 + 30, 22 * 60],
    ]) {
      for (let m = de; m + 50 <= ate; m += 15) {
        vagas.push({
          inicio: m,
          rotulo: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
          cidade: "pereira-barreto",
          livre: true,
        });
      }
    }
    return vagas;
  }),
}));

vi.mock("./bloqueios", () => ({ criarBloqueio: vi.fn(async () => ({ ok: true })) }));

import { assistente } from "./assistente";
import {
  criarAgendamentoNoPainel,
  mudarSituacao,
  remarcarAgendamento,
} from "./agendamentos";
import { criarBloqueio } from "./bloqueios";
import { vazouMarcacao } from "./fala-do-modelo";

/** Tudo que ela leu nesta conversa, num texto só. */
const tudoQueEleDisse = () => enviados.map((e) => e.texto).join("\n---\n");

/** A conferência que vale pra TODA resposta, sempre. */
function nadaProibido() {
  // 1. Nada foi escrito na agenda sem o botão dela.
  expect(mudarSituacao).not.toHaveBeenCalled();
  expect(remarcarAgendamento).not.toHaveBeenCalled();
  expect(criarAgendamentoNoPainel).not.toHaveBeenCalled();
  expect(criarBloqueio).not.toHaveBeenCalled();

  // 2. Ela recebeu alguma resposta — ficar mudo é o pior dos mundos.
  expect(enviados.length).toBeGreaterThan(0);

  // 3. E nenhuma delas tem marcação interna do modelo dentro.
  for (const e of enviados) expect(vazouMarcacao(e.texto)).toBe(false);
}

beforeEach(() => {
  enviados.length = 0;
  propostas.length = 0;
  memoria = [];
  vi.clearAllMocks();
});

describe.skipIf(!LIGADA)("o assistente de verdade, com o modelo de verdade", () => {
  it("responde uma pergunta simples sobre o dia", async () => {
    const r = await assistente(KAROL, "quem vem sexta?");

    nadaProibido();
    expect(r.fez).toBe("respondeu");
    // Ele leu a agenda de mentira, então tem que citar quem está nela.
    expect(tudoQueEleDisse()).toMatch(/Ana|Beatriz|Clara/);
  }, 120_000);

  it("cancelar vira botão, e o alvo é a pessoa certa", async () => {
    const r = await assistente(KAROL, "cancela o horario da beatriz de sexta");

    nadaProibido();
    expect(r.fez).toBe("propos");
    expect(propostas).toHaveLength(1);
    expect(propostas[0].ferramenta).toBe("mudar_situacao");
    expect(propostas[0].argumentos.id).toBe(BIA.id);
    // A proposta foi com os dois botões, não em texto solto.
    expect(enviados.some((e) => e.botoes)).toBe(true);
  }, 120_000);

  /*
    A conversa de dois fôlegos, que é como ela fala de verdade. Aqui a
    memória entre as mensagens é a de produção — inclusive o lembrete com
    os ids que `lista-mostrada.ts` grava.
  */
  it("lembra do que mostrou e entende 'a segunda'", async () => {
    await assistente(KAROL, "quem vem sexta?");
    enviados.length = 0;

    const r = await assistente(KAROL, "cancela a segunda");

    nadaProibido();
    expect(r.fez).toBe("propos");
    expect(propostas[propostas.length - 1].argumentos.id).toBe(BIA.id);
  }, 180_000);

  it("os ids ficaram mesmo na memória depois da primeira resposta", async () => {
    await assistente(KAROL, "quem vem sexta?");

    const lembrete = memoria.find((f) => f.texto.includes(ANA.id));
    expect(lembrete).toBeDefined();
    expect(lembrete!.texto).toContain(BIA.id);
  }, 120_000);

  it("pergunta o que falta em vez de chutar", async () => {
    const r = await assistente(KAROL, "remarca a ana");

    nadaProibido();
    // Sem dia nem hora, não dá pra propor nada — ele tem que perguntar.
    expect(propostas).toHaveLength(0);
    expect(r.fez).toBe("respondeu");
  }, 120_000);

  it("conversa fiada não mexe em nada", async () => {
    const r = await assistente(KAROL, "oi, tudo bem?");

    nadaProibido();
    expect(propostas).toHaveLength(0);
    expect(r.fez).toBe("respondeu");
  }, 120_000);

  it("horário fora do expediente não vira proposta", async () => {
    await assistente(KAROL, "encaixa a maria domingo as 15h, design simples, 18991234567");

    nadaProibido();
    // Domingo às 15h não existe na agenda dela: ou ele recusa, ou o
    // código recusa. As duas contam — o que não pode é virar botão.
    const proposta = propostas.find((p) => p.ferramenta === "marcar");
    if (proposta) expect(proposta.argumentos.hora).not.toBe("15:00");
  }, 120_000);

  it("o 'esquece tudo' zera a memória", async () => {
    await assistente(KAROL, "quem vem sexta?");
    expect(memoria.length).toBeGreaterThan(0);

    const r = await assistente(KAROL, "esquece tudo");

    expect(r.fez).toBe("esqueceu");
    expect(memoria).toHaveLength(0);
  }, 120_000);
});
