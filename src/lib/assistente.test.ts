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
  BOTAO_TEMPLATE: { confirmar: "confirmar", remarcar: "remarcar", falar: "falar", pix: "pix", feedback: "feedback", notaOtimo: "nota_otimo", notaBom: "nota_bom", notaRuim: "nota_ruim", pixQr: "pix_qr", pixCodigo: "pix_codigo" },
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
  reservarAcao: vi.fn(),
  registrarResultado: vi.fn(async () => {}),
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
  // A grade do dia: é ela que diz se o horário existe e está livre. Por
  // padrão, o expediente de Pereira inteiro e tudo livre — os testes que
  // precisam de ocupado dizem isso na hora.
  gradeDoDiaNaAgenda: vi.fn(async () => {
    const vagas = [];
    for (const [de, ate] of [
      [7 * 60, 11 * 60],
      [18 * 60 + 30, 22 * 60],
    ]) {
      for (let m = de; m + 50 <= ate; m += 15) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        vagas.push({
          inicio: m,
          rotulo: `${hh}:${mm}`,
          cidade: "pereira-barreto",
          livre: true,
        });
      }
    }
    return vagas;
  }),
}));
vi.mock("./bloqueios", () => ({ criarBloqueio: vi.fn(async () => ({ ok: true })) }));

import { perguntar } from "./ia";
import { enviarTexto, enviarTextoComBotoes } from "./notificacoes";
import { guardarAcao, reservarAcao } from "./acoes-pendentes";
import { agendaDaKarol, buscarAgendamento, criarAgendamentoNoPainel, gradeDoDiaNaAgenda, mudarSituacao, procurarAgendamentos, remarcarAgendamento } from "./agendamentos";
import { guardarFalas } from "./conversas";
import { ehLembreteDeLista } from "./lista-mostrada";
import { criarBloqueio } from "./bloqueios";
import { assistente, cidadeDoDia, decisaoDoBotao } from "./assistente";

const perguntarMock = vi.mocked(perguntar);
const procurarMock = vi.mocked(procurarAgendamentos);
const buscarMock = vi.mocked(buscarAgendamento);
const reservarAcaoMock = vi.mocked(reservarAcao);

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
    reservarAcaoMock.mockResolvedValue({
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
    reservarAcaoMock.mockResolvedValue({
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
   * `reservarAcao` confere número, situação e validade E reserva, tudo
   * numa operação. Aqui ele devolve `null` — ação velha, já usada, de
   * outro número, ou tomada por um toque anterior — e nada pode
   * acontecer a partir disso.
   */
  it("botão de ação que não vale mais não executa nada", async () => {
    reservarAcaoMock.mockResolvedValue(null);

    const r = await decisaoDoBotao(KAROL, "a:ok:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

    expect(mudarSituacao).not.toHaveBeenCalled();
    expect(r).toEqual({ fez: "nada", motivo: "acao-expirada" });
  });

  /**
   * ⚠️ TOQUE DUPLO EXECUTA UMA VEZ SÓ.
   *
   * No WhatsApp isso acontece o tempo todo: a pessoa toca, não vê
   * resposta na hora, e toca de novo. Antes o código PROCURAVA a ação e
   * só depois a fechava — duas operações, e entre elas cabia o segundo
   * toque. Com `marcar` isso criava dois agendamentos; com `bloquear`,
   * dois bloqueios.
   *
   * Agora a reserva é uma operação só: o banco muda a linha apenas se
   * ela ainda estiver aguardando. O segundo toque recebe `null`.
   */
  it("dois toques no mesmo botão executam uma vez só", async () => {
    const acao = {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      whatsapp: KAROL,
      ferramenta: "mudar_situacao",
      argumentos: { id: ID, situacao: "cancelado" },
      descricao: "CANCELAR o horário de Larissa Souza",
    };
    reservarAcaoMock.mockResolvedValueOnce(acao).mockResolvedValueOnce(null);

    const botao = "a:ok:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const primeiro = await decisaoDoBotao(KAROL, botao);
    const segundo = await decisaoDoBotao(KAROL, botao);

    expect(mudarSituacao).toHaveBeenCalledTimes(1);
    expect(primeiro).toEqual({ fez: "executou", ferramenta: "mudar_situacao", ok: true });
    expect(segundo).toEqual({ fez: "nada", motivo: "acao-expirada" });
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

/**
 * Em que cidade ela está naquele dia.
 *
 * ⚠️ Isto era uma tabela escrita à mão: seg–sex Pereira, sábado
 * Bandeirantes, domingo NADA. Quando o domingo entrou no expediente em
 * 12/09, essa tabela não acompanhou — e o estrago era do pior tipo: o
 * assistente OFERECIA domingo (porque a busca de horários lê o
 * `EXPEDIENTE` de verdade), montava a proposta, e só depois de a Karol
 * tocar em Confirmar respondia "nesse dia você não atende".
 *
 * Ela fazia tudo certo e ouvia uma frase falsa sobre o próprio negócio.
 * Agora a cidade sai do `EXPEDIENTE`, que é a mesma fonte do site.
 */
describe("a cidade sai do EXPEDIENTE, não de uma tabela escrita à mão", () => {
  it("domingo é Pereira Barreto, e não 'não atende'", () => {
    // 2026-09-13 é domingo
    expect(cidadeDoDia("2026-09-13")).toBe("pereira-barreto");
    expect(cidadeDoDia("2026-09-13", "19:00")).toBe("pereira-barreto");
  });

  it("sábado é Bandeirantes", () => {
    expect(cidadeDoDia("2026-09-19", "14:00")).toBe("bandeirantes");
  });

  it("dia de semana é Pereira Barreto, nos dois turnos", () => {
    expect(cidadeDoDia("2026-09-14", "08:00")).toBe("pereira-barreto");
    expect(cidadeDoDia("2026-09-14", "19:00")).toBe("pereira-barreto");
  });
});

/**
 * O horário é conferido na agenda ANTES de virar botão.
 *
 * ⚠️ Até 12/09 quem segurava isto era uma FRASE no roteiro da IA. As
 * funções de escrita conferem formato, serviço e sobreposição — não o
 * expediente nem os bloqueios. Então "passa a Ana pra domingo às 3h"
 * virava proposta, ela tocava em Confirmar, e gravava.
 *
 * Prompt não é validação: quem propõe é o modelo, e é dele que a gente se
 * protege.
 */
describe("horário impossível não vira proposta", () => {
  const OK = { role: "assistant" as const, content: null };

  it("recusa hora fora do expediente, sem criar botão", async () => {
    perguntarMock.mockResolvedValueOnce({
      ...OK,
      texto: null,
      chamadas: [
        {
          id: "c1",
          type: "function" as const,
          function: {
            name: "marcar",
            arguments: JSON.stringify({
              nome: "Ana",
              servico_id: "design-simples",
              dia: "2026-09-13",
              hora: "03:00",
            }),
          },
        },
      ],
    });

    const r = await assistente(KAROL, "marca a ana domingo 3h");

    expect(guardarAcao).not.toHaveBeenCalled();
    expect(r).toEqual({ fez: "nada", motivo: "sem-resposta" });
  });

  it("recusa horário já ocupado, sem criar botão", async () => {
    vi.mocked(gradeDoDiaNaAgenda).mockResolvedValueOnce([
      { inicio: 8 * 60, rotulo: "08:00", cidade: "pereira-barreto", livre: false },
    ]);
    perguntarMock.mockResolvedValueOnce({
      ...OK,
      texto: null,
      chamadas: [
        {
          id: "c1",
          type: "function" as const,
          function: {
            name: "marcar",
            arguments: JSON.stringify({
              nome: "Ana",
              servico_id: "design-simples",
              dia: "2026-09-14",
              hora: "08:00",
            }),
          },
        },
      ],
    });

    const r = await assistente(KAROL, "marca a ana segunda 8h");

    expect(guardarAcao).not.toHaveBeenCalled();
    expect(r).toEqual({ fez: "nada", motivo: "sem-resposta" });
  });

  it("horário livre continua virando proposta", async () => {
    perguntarMock.mockResolvedValueOnce({
      ...OK,
      texto: null,
      chamadas: [
        {
          id: "c1",
          type: "function" as const,
          function: {
            name: "marcar",
            arguments: JSON.stringify({
              nome: "Ana",
              servico_id: "design-simples",
              dia: "2026-09-14",
              hora: "07:00",
            }),
          },
        },
      ],
    });

    const r = await assistente(KAROL, "marca a ana segunda 7h");

    expect(guardarAcao).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ fez: "propos", ferramenta: "marcar" });
  });
});

/**
 * Os três defeitos que a bancada de provas achou rodando contra a API de
 * verdade, e não contra uma imitação dela.
 *
 * A bancada está em `bancada-de-provas.test.ts` — ela custa dinheiro e
 * internet, então fica desligada por padrão. Estes aqui são de graça e
 * rodam sempre: cada um congela um defeito que aconteceu mesmo.
 */
describe("o que a bancada de provas pegou", () => {
  /*
    ⚠️ ERA ESTA A QUEIXA "ELE NÃO FAZ NADA".

    Os três modelos testados inventaram id pelo menos uma vez — montaram
    "ana-paula-2026-09-18-0730" a partir do nome e da data, em vez de
    usar o uuid que a leitura tinha acabado de devolver. Antes isso
    morria calado num "não consegui entender direito".
  */
  it("id inventado volta pro modelo, e ele se corrige sozinho", async () => {
    perguntarMock
      .mockResolvedValueOnce(
        chamando("mudar_situacao", { id: "larissa-souza-2026-10-08", situacao: "cancelado" }),
      )
      .mockResolvedValueOnce(chamando("mudar_situacao", { id: ID, situacao: "cancelado" }));

    const r = await assistente(KAROL, "cancela a da larissa");

    // Ele foi consultado de novo, e a proposta saiu com o id de verdade.
    expect(perguntarMock).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ fez: "propos", ferramenta: "mudar_situacao" });
    expect(vi.mocked(guardarAcao).mock.calls[0][0].argumentos).toEqual({
      id: ID,
      situacao: "cancelado",
    });
  });

  it("o erro do id vai pro modelo, não pra Karol", async () => {
    perguntarMock
      .mockResolvedValueOnce(chamando("remarcar", { id: "nao-e-uuid", dia: "2026-10-09", hora: "08:00" }))
      .mockResolvedValueOnce(chamando("remarcar", { id: ID, dia: "2026-10-09", hora: "08:00" }));

    await assistente(KAROL, "passa a larissa pra amanhã às 8");

    // A segunda ida levou o erro como resultado de ferramenta.
    const segunda = perguntarMock.mock.calls[1][0];
    const recado = segunda.find((m) => m.role === "tool");
    expect(recado?.content).toContain("nao-e-uuid");
    expect(recado?.content).toContain("procurar");

    // E ela não viu nenhuma reclamação técnica.
    expect(vi.mocked(enviarTexto)).not.toHaveBeenCalled();
  });

  /*
    ⚠️ ERA ESTE O "DIÁLOGO HORRÍVEL".

    Sem ferramenta na mesa, o modelo escreve a chamada à mão como texto —
    e o assistente mandava aquilo inteiro pro WhatsApp dela.
  */
  it("marcação interna do modelo nunca chega no WhatsApp dela", async () => {
    perguntarMock.mockResolvedValue(
      falando('<｜｜DSML｜｜tool_calls>\n<｜｜DSML｜｜invoke name="remarcar">\n<｜｜DSML｜｜parameter name="id">1111'),
    );

    await assistente(KAROL, "remarca a larissa");

    const dito = vi.mocked(enviarTexto).mock.calls.map(([, t]) => t).join(" ");
    expect(dito).not.toContain("DSML");
    expect(dito).not.toContain("invoke");
    expect(dito.length).toBeGreaterThan(0); // ela recebeu ALGUMA resposta
  });

  /*
    ⚠️ MOVER ALGUÉM PRA PERTO DO PRÓPRIO HORÁRIO NÃO É CONFLITO.

    A validação de expediente que entrou ontem comparava o horário novo
    com a agenda inteira — inclusive com a linha que está sendo movida.
    Adiantar a Larissa das 10:00 pras 10:15 era recusado porque ela
    colidia com ela mesma. No banco isso nunca foi conflito: a linha é
    atualizada, e a trava compara com as outras.
  */
  it("adiantar alguém em 15 minutos não colide com o próprio horário", async () => {
    vi.mocked(gradeDoDiaNaAgenda).mockResolvedValueOnce([
      { inicio: 10 * 60 + 15, rotulo: "10:15", cidade: "pereira-barreto", livre: false },
    ]);
    perguntarMock.mockResolvedValue(
      chamando("remarcar", { id: ID, dia: "2026-10-08", hora: "10:15" }),
    );

    const r = await assistente(KAROL, "adianta a larissa em 15 minutos");

    expect(r).toEqual({ fez: "propos", ferramenta: "remarcar" });
  });

  it("mas horário ocupado por OUTRA pessoa continua recusado", async () => {
    vi.mocked(gradeDoDiaNaAgenda).mockResolvedValueOnce([
      { inicio: 7 * 60, rotulo: "07:00", cidade: "pereira-barreto", livre: false },
    ]);
    perguntarMock.mockResolvedValue(
      chamando("remarcar", { id: ID, dia: "2026-10-08", hora: "07:00" }),
    );

    await assistente(KAROL, "passa a larissa pras 7");

    expect(guardarAcao).not.toHaveBeenCalled();
    expect(vi.mocked(enviarTexto).mock.calls[0][1]).toContain("ocupado");
  });

  /*
    ⚠️ ENTRE PROPOR E ELA TOCAR NO BOTÃO, O MUNDO MUDA.

    A proposta nasce validada, mas fica esperando. Nesse meio-tempo uma
    cliente pode agendar o mesmo horário pelo site. Validar só no
    nascimento é confiar num estado que já passou.
  */
  it("revalida na hora de executar, não só quando propõe", async () => {
    vi.mocked(gradeDoDiaNaAgenda).mockResolvedValueOnce([
      { inicio: 8 * 60, rotulo: "08:00", cidade: "pereira-barreto", livre: false },
    ]);
    reservarAcaoMock.mockResolvedValue({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      whatsapp: KAROL,
      ferramenta: "marcar",
      argumentos: { nome: "Ana", servico_id: "design-henna", dia: "2026-10-09", hora: "08:00", whatsapp: "18999998888" },
      descricao: "MARCAR Ana",
    });

    const r = await decisaoDoBotao(KAROL, "a:ok:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

    expect(vi.mocked(criarAgendamentoNoPainel)).not.toHaveBeenCalled();
    expect(r).toMatchObject({ fez: "executou", ok: false });
  });
});

/**
 * Os ids do que ele mostrou ficam na memória.
 *
 * Sem isso, na mensagem seguinte ele não tem mais os ids: ou relê a
 * agenda inteira (uma ida à API a mais) ou inventa. Medido na bancada,
 * lembrar cortou as idas e os tokens pela metade.
 */
describe("a última lista mostrada fica guardada", () => {
  /** O modelo lê a agenda e depois responde em texto. */
  function leEDepoisResponde(resposta: string) {
    perguntarMock
      .mockResolvedValueOnce(chamando("ver_agenda", { de_dias: 0, ate_dias: 7 }))
      .mockResolvedValueOnce(falando(resposta));
  }

  it("os ids do que ela viu vão pra memória junto com a resposta", async () => {
    vi.mocked(agendaDaKarol).mockResolvedValue([agendamento()]);
    leEDepoisResponde("Sexta você tem a Larissa às 10:00. 💛");

    await assistente(KAROL, "quem vem essa semana?");

    const [, falas] = vi.mocked(guardarFalas).mock.calls[0];
    const lembrete = falas.find((f) => ehLembreteDeLista(f.texto));

    expect(lembrete).toBeDefined();
    expect(lembrete!.texto).toContain("Larissa Souza");
    expect(lembrete!.texto).toContain(ID);
  });

  /*
    ⚠️ DUAS LISTAS NA MEMÓRIA SÃO DOIS CONJUNTOS DE IDS, e o modelo não
    tem como saber qual é o de agora. Seria trocar um jeito de errar por
    outro — por isso a antiga é descartada ao gravar a nova.
  */
  it("a lista velha é descartada quando entra uma nova", async () => {
    vi.mocked(agendaDaKarol).mockResolvedValue([agendamento()]);
    leEDepoisResponde("Sexta você tem a Larissa às 10:00.");

    await assistente(KAROL, "quem vem essa semana?");

    const [, , opcoes] = vi.mocked(guardarFalas).mock.calls[0];
    expect(opcoes?.descartar).toBe(ehLembreteDeLista);
  });

  it("a proposta com botão também leva a lista junto", async () => {
    perguntarMock
      .mockResolvedValueOnce(chamando("procurar", { termo: "larissa" }))
      .mockResolvedValueOnce(chamando("mudar_situacao", { id: ID, situacao: "cancelado" }));

    await assistente(KAROL, "cancela a da larissa");

    const [, falas] = vi.mocked(guardarFalas).mock.calls[0];
    expect(falas.some((f) => ehLembreteDeLista(f.texto))).toBe(true);
    // E a linha que diz que ainda não está na agenda continua lá.
    expect(falas.some((f) => f.texto.includes("Ainda NÃO está na agenda"))).toBe(true);
  });

  it("conversa sem leitura nenhuma não inventa lembrete", async () => {
    perguntarMock.mockResolvedValue(falando("Oi Karol! Tudo bem por aqui. 💛"));

    await assistente(KAROL, "oi tudo bem?");

    const [, falas] = vi.mocked(guardarFalas).mock.calls[0];
    expect(falas.some((f) => ehLembreteDeLista(f.texto))).toBe(false);
    expect(falas).toHaveLength(2);
  });
});
