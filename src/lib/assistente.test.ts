import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O assistente da Karol.
 *
 * O risco aqui não é o de sempre. Não é a função devolver o valor errado —
 * é um LLM entender "cancela a de amanhã" e cancelar o horário da pessoa
 * errada, com convicção total e sem nenhum erro na tela. A cliente
 * descobre na porta do studio.
 *
 * Por isso os testes deste arquivo são quase todos sobre uma coisa só:
 * **nada que o modelo diga muda a agenda**. Quem muda é o toque da Karol
 * no botão de confirmar.
 */

vi.mock("./ia", () => ({
  iaConfigurada: vi.fn(() => true),
  perguntar: vi.fn(),
  lerArgumentos: (b: string) => {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  },
}));
vi.mock("./notificacoes", () => ({
  enviarTexto: vi.fn(async () => true),
  BOTAO_TEMPLATE: { confirmar: "confirmar", remarcar: "remarcar", falar: "falar", pix: "pix" },
  enviarTextoComBotoes: vi.fn(async () => true),
  whatsappDaKarol: vi.fn(() => "5518997525291"),
}));
vi.mock("./conversas", () => ({
  historicoDe: vi.fn(async () => []),
  guardarFalas: vi.fn(async () => {}),
  limparHistorico: vi.fn(async () => {}),
  abrirJanela: vi.fn(async () => {}),
}));
vi.mock("./acoes-pendentes", () => ({
  guardarAcao: vi.fn(async () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
  buscarAcao: vi.fn(),
  fecharAcao: vi.fn(async () => {}),
}));
vi.mock("./agendamentos", () => ({
  agendaDaKarol: vi.fn(async () => []),
  buscarAgendamento: vi.fn(async () => null),
  procurarAgendamentos: vi.fn(async () => []),
  horariosDoDia: vi.fn(async () => []),
  relatorioDoMes: vi.fn(async () => ({})),
  mudarSituacao: vi.fn(async () => ({ ok: true })),
  remarcarAgendamento: vi.fn(async () => ({ ok: true })),
  criarAgendamentoNoPainel: vi.fn(async () => ({ ok: true, id: "x" })),
}));
vi.mock("./bloqueios", () => ({ criarBloqueio: vi.fn(async () => ({ ok: true })) }));

import { perguntar } from "./ia";
import { enviarTexto, enviarTextoComBotoes } from "./notificacoes";
import { buscarAcao, guardarAcao } from "./acoes-pendentes";
import {
  buscarAgendamento,
  mudarSituacao,
  procurarAgendamentos,
  remarcarAgendamento,
} from "./agendamentos";
import { criarBloqueio } from "./bloqueios";
import { assistente, decisaoDoBotao } from "./assistente";

const perguntarMock = vi.mocked(perguntar);
const procurarMock = vi.mocked(procurarAgendamentos);
const buscarMock = vi.mocked(buscarAgendamento);
const buscarAcaoMock = vi.mocked(buscarAcao);

const KAROL = "5518997525291";
const ID = "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b";

/** Um agendamento, do jeito que `procurarAgendamentos` devolve. */
function agendamento() {
  const inicio = new Date(2026, 9, 8, 10, 0);
  return {
    id: ID,
    clienteNome: "Larissa Souza",
    clienteWhatsapp: "5518999998888",
    servicoId: "design-henna",
    servicoNome: "Design com henna",
    servicoPreco: 3000,
    cidade: "Pereira Barreto",
    inicio,
    fim: new Date(inicio.getTime() + 70 * 60000),
    situacao: "confirmado" as const,
    observacao: null,
    avisado30minEm: null,
  };
}

/** O modelo respondendo com uma chamada de ferramenta. */
function chamando(nome: string, args: Record<string, unknown>) {
  return {
    texto: null,
    chamadas: [
      { id: "c1", type: "function" as const, function: { name: nome, arguments: JSON.stringify(args) } },
    ],
  };
}

/** O modelo respondendo em texto puro. */
const falando = (texto: string) => ({ texto, chamadas: [] });

beforeEach(() => {
  vi.clearAllMocks();
  procurarMock.mockResolvedValue([agendamento()]);
  buscarMock.mockResolvedValue(agendamento());
});

describe("o que o modelo dizer NÃO muda a agenda", () => {
  it.each([
    ["mudar_situacao", { id: ID, situacao: "cancelado" }],
    ["remarcar", { id: ID, dia: "2026-10-09", hora: "08:00" }],
    ["bloquear", { dia_inicio: "2026-10-09", dia_fim: "2026-10-09", motivo: "viagem" }],
    [
      "marcar",
      { nome: "Ana", servico_id: "design-simples", dia: "2026-10-09", hora: "08:00" },
    ],
  ])("%s vira proposta, não execução", async (ferramenta, args) => {
    perguntarMock.mockResolvedValue(chamando(ferramenta, args));

    const r = await assistente(KAROL, "faz isso aí");

    expect(r).toEqual({ fez: "propos", ferramenta });

    // O ponto do arquivo inteiro: nada foi escrito.
    expect(mudarSituacao).not.toHaveBeenCalled();
    expect(remarcarAgendamento).not.toHaveBeenCalled();
    expect(criarBloqueio).not.toHaveBeenCalled();

    // E ela recebeu os dois botões.
    expect(enviarTextoComBotoes).toHaveBeenCalledTimes(1);
  });

  /**
   * A descrição é a única coisa que ela lê antes de confirmar. Se vier o
   * id em vez do nome e do horário, o botão vira um "confirmar?" no
   * escuro e não protege de nada.
   */
  it("a proposta descreve o alvo por extenso, não pelo id", async () => {
    perguntarMock.mockResolvedValue(
      chamando("mudar_situacao", { id: ID, situacao: "cancelado" }),
    );

    await assistente(KAROL, "cancela a da Larissa");

    const descricao = vi.mocked(guardarAcao).mock.calls[0][0].descricao;
    expect(descricao).toContain("Larissa Souza");
    expect(descricao).toContain("CANCELAR");
    expect(descricao).not.toContain(ID);
  });

  /**
   * ⚠️ O risco que sobrou depois que o código saiu do projeto.
   *
   * Antes o alvo era um código de seis caracteres, e dois agendamentos
   * podiam casar com o mesmo — agir na dúvida seria o erro. Com o id
   * inteiro isso acabou: id não colide.
   *
   * O que continua possível é o modelo INVENTAR um id, que é o modo mais
   * comum de um LLM errar. Aí a busca não acha nada, e nada pode ser
   * proposto a partir de um alvo que não existe.
   */
  it("não propõe nada quando o id não existe", async () => {
    buscarMock.mockResolvedValue(null);
    perguntarMock.mockResolvedValue(
      chamando("mudar_situacao", {
        id: "00000000-0000-0000-0000-000000000000",
        situacao: "cancelado",
      }),
    );

    await assistente(KAROL, "cancela essa");

    expect(guardarAcao).not.toHaveBeenCalled();
    expect(enviarTextoComBotoes).not.toHaveBeenCalled();
  });

  it("não propõe situação que não existe", async () => {
    perguntarMock.mockResolvedValue(
      chamando("mudar_situacao", { id: ID, situacao: "explodir" }),
    );

    await assistente(KAROL, "explode a da Larissa");
    expect(guardarAcao).not.toHaveBeenCalled();
  });
});

describe("o toque dela é que executa", () => {
  it("confirmar executa a ação guardada", async () => {
    buscarAcaoMock.mockResolvedValue({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      whatsapp: KAROL,
      ferramenta: "mudar_situacao",
      argumentos: { id: ID, situacao: "cancelado" },
      descricao: "CANCELAR o horário de Larissa Souza",
    });

    const r = await decisaoDoBotao(KAROL, "a:ok:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

    expect(mudarSituacao).toHaveBeenCalledWith(ID, "cancelado");
    expect(r).toEqual({ fez: "executou", ferramenta: "mudar_situacao", ok: true });
  });

  it("recusar não executa nada", async () => {
    buscarAcaoMock.mockResolvedValue({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      whatsapp: KAROL,
      ferramenta: "mudar_situacao",
      argumentos: { id: ID, situacao: "cancelado" },
      descricao: "CANCELAR o horário de Larissa Souza",
    });

    const r = await decisaoDoBotao(KAROL, "a:no:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

    expect(mudarSituacao).not.toHaveBeenCalled();
    expect(r).toEqual({ fez: "recusou" });
  });

  /**
   * `buscarAcao` confere número, situação e validade. Aqui ele devolve
   * `null` — ação velha, já usada, ou de outro número — e nada pode
   * acontecer a partir disso.
   */
  it("botão de ação que não vale mais não executa nada", async () => {
    buscarAcaoMock.mockResolvedValue(null);

    const r = await decisaoDoBotao(KAROL, "a:ok:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

    expect(mudarSituacao).not.toHaveBeenCalled();
    expect(r).toEqual({ fez: "nada", motivo: "acao-expirada" });
  });
});

describe("conversa comum", () => {
  it("responde em texto quando o modelo só fala", async () => {
    perguntarMock.mockResolvedValue(falando("Amanhã você tem 3 clientes. 💛"));

    const r = await assistente(KAROL, "quantas clientes amanhã?");

    expect(r).toEqual({ fez: "respondeu" });
    expect(vi.mocked(enviarTexto).mock.calls[0][1]).toContain("3 clientes");
  });

  it("sem resposta do modelo, manda ela pro painel em vez de calar", async () => {
    perguntarMock.mockResolvedValue(null);

    const r = await assistente(KAROL, "e aí");

    expect(r).toEqual({ fez: "nada", motivo: "sem-resposta" });
    expect(vi.mocked(enviarTexto).mock.calls[0][1]).toContain("/painel");
  });

  it('"esquece" zera a memória sem gastar chamada de modelo', async () => {
    const r = await assistente(KAROL, "esquece isso");

    expect(r).toEqual({ fez: "esqueceu" });
    expect(perguntarMock).not.toHaveBeenCalled();
  });
});

/**
 * A garantia que os testes acima NÃO dão.
 *
 * Todos eles olham o que as funções fazem quando chamadas. Se alguém
 * acrescentasse um `await mudarSituacao(...)` dentro de `propor` — pra
 * "adiantar o cancelamento enquanto ela confirma" — os testes de cima
 * continuariam verdes: a proposta sairia igualzinha, os botões também, e a
 * agenda mudaria antes de ela ver a pergunta.
 *
 * Este é sobre o TEXTO do arquivo, igual ao de `atendente.ts`. A regra é
 * sobre ONDE a escrita pode aparecer, e isso não se testa chamando função.
 */
describe("a escrita mora num lugar só", () => {
  const fonte = readFileSync(new URL("./assistente.ts", import.meta.url), "utf8");

  /**
   * Recorta o corpo de uma função contando chaves.
   *
   * ⚠️ A chave do corpo NÃO é a primeira depois da assinatura: o tipo de
   * retorno tem chave própria (`Promise<{ ok: boolean }>`), e pegar aquela
   * fazia o recorte devolver o tipo em vez da função — o teste passava a
   * olhar o arquivo inteiro e ficava vermelho sem motivo.
   *
   * A do corpo é a que FECHA a linha da assinatura, que é como este
   * projeto escreve todas as funções.
   */
  function corpoDe(nome: string): string {
    const inicio = fonte.indexOf(`async function ${nome}(`);
    expect(inicio).toBeGreaterThan(-1);

    let i = -1;
    let posicao = inicio;
    for (const linha of fonte.slice(inicio).split("\n")) {
      const limpa = linha.trimEnd();
      if (limpa.endsWith("{")) {
        i = posicao + limpa.length - 1;
        break;
      }
      posicao += linha.length + 1;
    }
    expect(i).toBeGreaterThan(-1);

    let nivel = 0;
    for (let j = i; j < fonte.length; j++) {
      if (fonte[j] === "{") nivel++;
      else if (fonte[j] === "}" && --nivel === 0) return fonte.slice(i, j + 1);
    }
    throw new Error(`não achei o fim de ${nome}`);
  }

  /** O arquivo sem os imports e sem o corpo de `executar`. */
  const foraDoExecutar = fonte
    .slice(fonte.indexOf("/**")) // corta o bloco de imports
    .replace(corpoDe("executar"), "");

  const ESCRITAS = [
    "mudarSituacao",
    "remarcarAgendamento",
    "criarAgendamentoNoPainel",
    "criarBloqueio",
  ];

  it.each(ESCRITAS)("%s só aparece dentro de `executar`", (nome) => {
    expect(foraDoExecutar).not.toContain(`${nome}(`);
  });

  /**
   * E `executar` só pode ser alcançado por quem recebeu um toque de botão.
   * Se ele passar a ser chamado de dentro de `assistente`, a confirmação
   * deixa de existir sem ninguém notar.
   */
  it("`executar` só é chamado pela decisão do botão", () => {
    const chamadas = [...fonte.matchAll(/\bexecutar\(/g)];
    // uma na definição (`async function executar(`) e uma em decisaoDoBotao
    expect(chamadas).toHaveLength(2);
    expect(corpoDe("decisaoDoBotao")).toContain("executar(");
  });
});
