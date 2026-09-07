import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockBanco } from "../../test/mock-banco";

/**
 * O lembrete de ~30 minutos antes.
 *
 * O defeito que este arquivo existe pra impedir é UM, e é o que a cliente
 * enxerga: receber a mesma mensagem três vezes enquanto se arruma.
 *
 * Ele acontece sozinho se ninguém segurar. O lembrete curto precisa de um
 * cron batendo de 10 em 10 minutos, e a mesma cliente cai em várias
 * varreduras seguidas antes do horário dela — 06:45, 06:55, 07:05, todas
 * dentro da janela de um atendimento às 07:15. Sem a marca de "já avisei",
 * são três mensagens.
 */

vi.mock("./banco", () => ({ banco: vi.fn(), bancoConfigurado: vi.fn(() => true) }));
vi.mock("./notificacoes", () => ({ enviarEvento: vi.fn(async () => {}) }));

import { banco } from "./banco";
import { enviarEvento } from "./notificacoes";
import { agendamentosParaLembrar, JANELA_LEMBRETE_MIN } from "./agendamentos";
import { rodarLembretesCurtos } from "./lembretes";

const bancoMock = vi.mocked(banco);
const avisar = vi.mocked(enviarEvento);

const ID = "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b";

/** Linha crua, como o PostgREST devolve. `daqui` em minutos. */
function linha(daquiMin: number, duracaoMin = 50, id = ID) {
  const inicio = new Date(Date.now() + daquiMin * 60_000);
  const fim = new Date(inicio.getTime() + duracaoMin * 60_000);
  return {
    id,
    cliente_nome: "Maria da Silva",
    cliente_whatsapp: "5518999998888",
    servico_id: "design-simples",
    servico_nome: "Design de sobrancelha",
    servico_preco: 2500,
    cidade: "Pereira Barreto",
    periodo: `["${inicio.toISOString()}","${fim.toISOString()}")`,
    situacao: "confirmado",
    observacao: null,
    avisado_30min_em: null,
  };
}

/**
 * @param linhas o que o select devolve
 * @param marcou se o UPDATE encontra linha pra marcar. `false` simula outra
 *   execução do cron tendo chegado primeiro.
 */
function usarBanco(linhas: Record<string, unknown>[], marcou = true) {
  const m = mockBanco({
    select: () => ({ data: linhas, error: null }),
    update: () => ({ data: marcou ? [{ id: ID }] : [], error: null }),
  });
  bancoMock.mockReturnValue(m.cliente as never);
  return m;
}

beforeEach(() => vi.clearAllMocks());

describe("quem entra na varredura", () => {
  it("pega quem começa dentro da janela", async () => {
    usarBanco([linha(20)]);
    expect(await agendamentosParaLembrar()).toHaveLength(1);
  });

  it("ignora quem começa depois da janela", async () => {
    usarBanco([linha(JANELA_LEMBRETE_MIN + 10)]);
    expect(await agendamentosParaLembrar()).toHaveLength(0);
  });

  /**
   * O caso que o filtro do banco sozinho NÃO pega, e por isso existe o
   * filtro em JS.
   *
   * `overlaps` casa qualquer período que CRUZE a janela. O curso dura 130
   * minutos: um que começou faz uma hora ainda está rolando agora, então
   * cruza a janela e volta na consulta. Mandar "seu horário é daqui a
   * pouco" pra quem já está sentada na cadeira é o tipo de mensagem que faz
   * a cliente achar que o site está quebrado.
   */
  it("ignora atendimento longo que JÁ COMEÇOU e ainda cruza a janela", async () => {
    usarBanco([linha(-60, 130)]);
    expect(await agendamentosParaLembrar()).toHaveLength(0);
  });

  it("pede ao banco só confirmados que ainda não foram avisados", async () => {
    const m = usarBanco([]);
    await agendamentosParaLembrar();

    const filtros = m.chamadas[0].filtros;
    expect(filtros).toContainEqual({
      metodo: "is",
      coluna: "avisado_30min_em",
      valor: null,
    });
    expect(filtros).toContainEqual({
      metodo: "eq",
      coluna: "situacao",
      valor: "confirmado",
    });
  });
});

describe("não mandar duas vezes", () => {
  it("marca ANTES de mandar", async () => {
    const m = usarBanco([linha(20)]);

    // O que importa não é que os dois aconteçam, é a ORDEM. Invertida,
    // cabe a próxima batida do cron entre o envio e a marcação.
    let updatesQuandoMandou = -1;
    avisar.mockImplementation(async () => {
      updatesQuandoMandou = m.chamadas.filter((c) => c.op === "update").length;
    });

    await rodarLembretesCurtos();

    expect(updatesQuandoMandou).toBe(1);
  });

  it("não manda quando outra execução do cron marcou primeiro", async () => {
    usarBanco([linha(20)], false);

    const r = await rodarLembretesCurtos();

    expect(avisar).not.toHaveBeenCalled();
    expect(r).toEqual({ curtos: 0 });
  });

  it("grava a HORA, não um sim/não", async () => {
    const m = usarBanco([linha(20)]);
    await rodarLembretesCurtos();

    const update = m.chamadas.find((c) => c.op === "update");
    const quando = update?.valores?.avisado_30min_em;
    // A Karol pergunta "será que ela recebeu?" quando a cliente não
    // aparece. Um booleano não responde isso; a hora responde.
    expect(typeof quando).toBe("string");
    expect(Number.isNaN(Date.parse(quando as string))).toBe(false);
  });

  it("manda o evento certo, com os dados da cliente", async () => {
    usarBanco([linha(20)]);
    await rodarLembretesCurtos();

    expect(avisar).toHaveBeenCalledTimes(1);
    expect(avisar.mock.calls[0][0]).toBe("lembrete-curto");
    expect(avisar.mock.calls[0][1]).toMatchObject({
      cliente: "Maria da Silva",
      whatsappCliente: "5518999998888",
    });
  });
});
