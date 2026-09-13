import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockBanco } from "../../test/mock-banco";
import { paraChave } from "./agenda";

/**
 * O que a cliente fica sabendo quando a KAROL mexe na agenda.
 *
 * Durante semanas nada disso existia: o site avisava, o painel não. Ela
 * encaixava alguém e a pessoa nunca recebia confirmação; remarcava e a
 * pessoa aparecia na hora antiga; cancelava e a pessoa descobria na porta.
 *
 * Cada `it` aqui é um desses buracos fechado.
 */

vi.mock("./banco", () => ({ banco: vi.fn(), bancoConfigurado: vi.fn(() => true) }));
vi.mock("./notificacoes", () => ({ enviarEvento: vi.fn(async () => true) }));

import { banco } from "./banco";
import { enviarEvento } from "./notificacoes";
import {
  buscarAgendamento,
  criarAgendamentoNoPainel,
  horariosDoDia,
  mudarSituacao,
  pendentesVencidos,
  remarcarAgendamento,
} from "./agendamentos";
import { buscarServico } from "@/data/servicos";

const bancoMock = vi.mocked(banco);
const avisar = vi.mocked(enviarEvento);

function usarBanco(handlers: Parameters<typeof mockBanco>[0]) {
  const m = mockBanco(handlers);
  bancoMock.mockReturnValue(m.cliente as never);
  return m;
}

/** Dia útil bem no futuro — o motor recusa hoje e fim de semana. */
function diaUtilFuturo(daquiADias = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daquiADias);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return paraChave(d);
}

/** Linha crua, como o PostgREST devolve. */
function linha(inicio: Date, situacao = "confirmado") {
  const fim = new Date(inicio.getTime() + 50 * 60000);
  return {
    id: "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
    cliente_nome: "Maria da Silva",
    cliente_whatsapp: "5518999998888",
    servico_id: "design-simples",
    servico_nome: "Design de sobrancelha",
    servico_preco: 2500,
    cidade: "Pereira Barreto",
    periodo: `["${inicio.toISOString()}","${fim.toISOString()}")`,
    situacao,
    observacao: null,
  };
}

const daquiATresDias = () => new Date(Date.now() + 3 * 24 * 3600_000);
const tresDiasAtras = () => new Date(Date.now() - 3 * 24 * 3600_000);

/** Os eventos disparados, na ordem. */
const eventos = () => avisar.mock.calls.map((c) => c[0]);

beforeEach(() => {
  bancoMock.mockReset();
  avisar.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe("Karol marca alguém pelo painel", () => {
  const base = {
    servicoId: "design-simples",
    cidade: "pereira-barreto" as const,
    hora: "08:00",
    nome: "Maria da Silva",
    whatsapp: "18999998888",
  };

  it("a cliente recebe a confirmação, igual a quem marcou pelo site", async () => {
    usarBanco({ insert: () => ({ data: { id: "ag-1" }, error: null }) });
    await criarAgendamentoNoPainel({ ...base, chaveDia: diaUtilFuturo() });

    expect(eventos()).toEqual(["confirmacao"]);
    expect(avisar.mock.calls[0][1]).toMatchObject({
      cliente: "Maria da Silva",
      // com DDI: é o formato que a Meta entende e que o webhook casa
      whatsappCliente: "5518999998888",
    });
  });

  it("NÃO avisa a Karol — quem marcou foi ela", async () => {
    usarBanco({ insert: () => ({ data: { id: "ag-1" }, error: null }) });
    await criarAgendamentoNoPainel({ ...base, chaveDia: diaUtilFuturo() });
    expect(eventos()).not.toContain("novo-agendamento");
  });

  it("sem WhatsApp (encaixe da família) não manda nada", async () => {
    // a linha guarda o número DELA nesse caso; mandar seria avisar ela mesma
    usarBanco({ insert: () => ({ data: { id: "ag-1" }, error: null }) });
    await criarAgendamentoNoPainel({ ...base, whatsapp: "", chaveDia: diaUtilFuturo() });
    expect(eventos()).toEqual([]);
  });

  it("não avisa quando o banco recusou o horário", async () => {
    usarBanco({ insert: () => ({ data: null, error: { code: "23P01" } }) });
    const r = await criarAgendamentoNoPainel({ ...base, chaveDia: diaUtilFuturo() });
    expect(r.ok).toBe(false);
    expect(eventos()).toEqual([]);
  });
});

describe("Karol remarca", () => {
  it("a cliente é avisada do horário NOVO", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: null }),
    });
    const r = await remarcarAgendamento(
      "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
      diaUtilFuturo(40),
      "09:30",
    );

    expect(r.ok).toBe(true);
    expect(eventos()).toEqual(["remarcado"]);
    // o horário da mensagem é o novo, não o antigo
    const enviado = avisar.mock.calls[0][1];
    expect(new Date(enviado.inicioISO).getHours()).toBe(9);
    expect(new Date(enviado.inicioISO).getMinutes()).toBe(30);
  });

  it("não avisa quando o horário novo colidiu", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: { code: "23P01" } }),
    });
    const r = await remarcarAgendamento(
      "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
      diaUtilFuturo(40),
      "09:30",
    );
    expect(r.ok).toBe(false);
    expect(eventos()).toEqual([]);
  });
});

describe("Karol muda a situação", () => {
  const id = "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b";

  it("cancelar um horário futuro avisa a cliente", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: null }),
    });
    await mudarSituacao(id, "cancelado");
    expect(eventos()).toEqual(["cancelado"]);
  });

  /*
    ⚠️ SOLTAR POR FALTA DE PAGAMENTO É OUTRA NOTÍCIA, e o banco não sabe a
    diferença — as duas viram `cancelado` na coluna. Quem separa é o
    terceiro argumento, e ele existe só pra escolher a MENSAGEM.

    Sem isto, quem não pagou recebe "precisei cancelar o seu horário, me
    desculpa": parece que a Karol desistiu dela, e não fala nada de
    pagamento. E quem pagou no minuto 31 lê isso com o comprovante na mão,
    sem saber o que fazer.
  */
  it("soltar por falta de pagamento manda a mensagem do sinal, não a de cancelamento", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: null }),
    });

    await mudarSituacao(id, "cancelado", "sinal-vencido");

    expect(eventos()).toEqual(["sinal-vencido"]);
  });

  it("sem motivo, continua sendo a mensagem de cancelamento de sempre", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: null }),
    });

    await mudarSituacao(id, "cancelado");

    expect(eventos()).toEqual(["cancelado"]);
  });

  it("marcar como atendida ou faltou NÃO manda mensagem", async () => {
    // é registro do que já passou; mensagem aí seria constrangedora
    for (const situacao of ["concluido", "faltou", "confirmado"]) {
      avisar.mockClear();
      usarBanco({
        select: () => ({ data: linha(tresDiasAtras()), error: null }),
        update: () => ({ error: null }),
      });
      await mudarSituacao(id, situacao);
      expect(eventos(), `situação ${situacao}`).toEqual([]);
    }
  });

  it("cancelar algo que JÁ PASSOU não avisa ninguém", async () => {
    // ninguém precisa saber que o horário de semana passada foi arquivado
    usarBanco({
      select: () => ({ data: linha(tresDiasAtras()), error: null }),
      update: () => ({ error: null }),
    });
    await mudarSituacao(id, "cancelado");
    expect(eventos()).toEqual([]);
  });

  it("cancelar o que já estava cancelado não manda de novo", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias(), "cancelado"), error: null }),
      update: () => ({ error: null }),
    });
    await mudarSituacao(id, "cancelado");
    expect(eventos()).toEqual([]);
  });

  it("não avisa quando o banco recusou a mudança", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias()), error: null }),
      update: () => ({ error: { code: "23P01" } }),
    });
    const r = await mudarSituacao(id, "cancelado");
    expect(r.ok).toBe(false);
    expect(eventos()).toEqual([]);
  });

  it("aprovar agendamento que estava PENDENTE manda confirmação pra cliente", async () => {
    usarBanco({
      select: () => ({ data: linha(daquiATresDias(), "pendente"), error: null }),
      update: () => ({ error: null }),
    });
    const r = await mudarSituacao(id, "confirmado");
    expect(r.ok).toBe(true);
    expect(eventos()).toEqual(["confirmacao"]);
  });
});

/**
 * QUEM entra na lista de horários a soltar por falta de pagamento.
 *
 * ⚠️ A LISTA É O PERIGO, não o cancelamento. Quem cancela só obedece: se
 * alguém errado entrar aqui, o horário de uma cliente some sozinho de
 * madrugada e ela descobre na porta do studio.
 *
 * Por isso quase todos os casos abaixo são sobre quem NÃO pode entrar.
 */
describe("horários presos por falta de pagamento", () => {
  /** Uma linha crua com serviço e data de criação escolhidos. */
  function pendenteCriadoEm(criadoEm: Date, servicoId: string, inicio: Date) {
    return {
      ...linha(inicio, "pendente"),
      servico_id: servicoId,
      servico_preco: servicoId === "design-simples" ? 2500 : 12000,
      criado_em: criadoEm.toISOString(),
    };
  }

  const ontem = () => new Date(Date.now() - 24 * 3600_000);

  it("entra quem marcou ontem um serviço com entrada e não pagou", async () => {
    usarBanco({
      select: () => ({
        data: [pendenteCriadoEm(ontem(), "brow-lamination", daquiATresDias())],
        error: null,
      }),
    });

    expect(await pendentesVencidos()).toHaveLength(1);
  });

  /*
    ⚠️ O CASO QUE MAIS ASSUSTA. Com aprovação manual ligada, um design de
    R$ 25 também fica `pendente` — mas esse está esperando a KAROL olhar,
    não a cliente pagar. Cancelar por falta de pagamento um horário que
    nunca pediu pagamento é apagar o trabalho dela.
  */
  it("NÃO entra serviço que nem pede entrada", async () => {
    usarBanco({
      select: () => ({
        data: [pendenteCriadoEm(ontem(), "design-simples", daquiATresDias())],
        error: null,
      }),
    });

    expect(await pendentesVencidos()).toEqual([]);
  });

  /*
    Cancelar um horário que já passou não libera nada, e manda pra cliente
    um "seu horário foi cancelado" depois de ela já ter ido — ou não ido.
  */
  it("NÃO entra horário que já aconteceu", async () => {
    usarBanco({
      select: () => ({
        data: [pendenteCriadoEm(tresDiasAtras(), "brow-lamination", tresDiasAtras())],
        error: null,
      }),
    });

    expect(await pendentesVencidos()).toEqual([]);
  });

  /*
    O prazo é feito no banco, comparando `criado_em` com "agora menos 30
    minutos". O teste prova que o filtro FOI PEDIDO e com a conta certa —
    sem ele, quem marcou agora mesmo e ainda está com o aplicativo do
    banco aberto perderia o horário na hora.
  */
  it("pede ao banco só quem passou dos 30 minutos", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    const agora = new Date("2026-09-20T14:00:00.000Z");

    await pendentesVencidos(agora);

    const lt = m.chamadas
      .find((c) => c.op === "select")
      ?.filtros?.find((f) => f.metodo === "lt");
    expect(lt?.coluna).toBe("criado_em");
    expect(lt?.valor).toBe("2026-09-20T13:30:00.000Z");
  });

  /*
    ⚠️ O CASO QUE MAIS DÓI SE ERRAR: quem acabou de marcar e está com o
    aplicativo do banco aberto pra pagar. Se o filtro for pelo lado
    errado, ela perde o horário no meio do pagamento.
  */
  it("quem marcou faz cinco minutos NÃO entra", async () => {
    const agora = new Date("2026-09-20T14:00:00.000Z");
    usarBanco({
      select: () => ({
        data: [
          {
            ...pendenteCriadoEm(new Date("2026-09-20T13:55:00.000Z"), "brow-lamination", daquiATresDias()),
          },
        ],
        error: null,
      }),
    });

    // O banco é quem filtra por data, então aqui o mock devolve a linha de
    // propósito: o que se prova é que a CONTA pedida ao banco a excluiria.
    const m = usarBanco({ select: () => ({ data: [], error: null }) });
    await pendentesVencidos(agora);
    const lt = m.chamadas
      .find((c) => c.op === "select")
      ?.filtros?.find((f) => f.metodo === "lt");
    expect(new Date(String(lt?.valor)).getTime()).toBeLessThan(
      new Date("2026-09-20T13:55:00.000Z").getTime(),
    );
  });

  it("pede ao banco só quem está pendente", async () => {
    const m = usarBanco({ select: () => ({ data: [], error: null }) });

    await pendentesVencidos();

    const eq = m.chamadas
      .find((c) => c.op === "select")
      ?.filtros?.find((f) => f.metodo === "eq");
    expect(eq?.coluna).toBe("situacao");
    expect(eq?.valor).toBe("pendente");
  });

  it("banco fora do ar devolve lista vazia, e ninguém é cancelado", async () => {
    usarBanco({ select: () => ({ data: null, error: { message: "caiu" } }) });

    expect(await pendentesVencidos()).toEqual([]);
  });
});

/**
 * O prazo de 30 minutos pra pagar a entrada.
 *
 * ⚠️ QUEM ESCOLHEU O NÚMERO FOI A KAROL, em 13/09/2026, por escrito:
 * "pode ser 30 minutos". No formulário ela tinha dito "até o fim do dia",
 * e o Kainã apontou que isso trava a agenda o dia inteiro por causa de
 * quem some.
 *
 * O prazo existe em três lugares, e os três precisam concordar:
 *
 * 1. a GRADE esconde quem venceu, pra outra cliente ver o horário livre;
 * 2. o AGENDAMENTO solta a linha vencida antes de gravar, senão a trava
 *    do banco recusa — horário livre na tela e recusado no envio;
 * 3. a VARREDURA diária limpa o que ninguém chegou a tomar.
 *
 * O 1 sem o 2 é o pior dos mundos: a cliente vê livre, preenche tudo e
 * leva erro na cara.
 */
describe("prazo de 30 minutos pra pagar", () => {
  const DIA = diaUtilFuturo();

  /** Uma linha de agendamento ocupando as 7h do dia escolhido. */
  function ocupando(situacao: string, minutosAtras: number) {
    const inicio = new Date(`${DIA}T07:00:00`);
    const fim = new Date(inicio.getTime() + 50 * 60000);
    return {
      ...linha(inicio, situacao),
      periodo: `["${inicio.toISOString()}","${fim.toISOString()}")`,
      criado_em: new Date(Date.now() - minutosAtras * 60_000).toISOString(),
    };
  }

  /** Só a tabela de agendamentos responde; bloqueios vem vazio. */
  function agendaCom(linhas: Record<string, unknown>[]) {
    return usarBanco({
      select: (tabela) => (tabela === "agendamentos" ? { data: linhas, error: null } : { data: [], error: null }),
      update: () => ({ data: [{ id: "x" }], error: null }),
    });
  }

  const servico = buscarServico("design-simples")!;
  const seteHoras = async () =>
    (await horariosDoDia(servico, DIA)).find((h) => h.inicio === 7 * 60);

  it("quem marcou faz 5 minutos e não pagou continua ocupando", async () => {
    agendaCom([ocupando("pendente", 5)]);

    expect(await seteHoras()).toBeUndefined();
  });

  it("quem passou dos 30 minutos some da grade, e o horário reaparece", async () => {
    agendaCom([ocupando("pendente", 45)]);

    expect(await seteHoras()).toBeDefined();
  });

  /*
    ⚠️ SÓ `pendente` VENCE. Um horário confirmado é de quem já pagou — se
    a idade da linha o tirasse da grade, a agenda inteira ficaria "livre"
    depois de meia hora e duas clientes cairiam no mesmo horário.
  */
  it("confirmado NUNCA vence, por mais velho que seja", async () => {
    agendaCom([ocupando("confirmado", 60 * 24 * 30)]);

    expect(await seteHoras()).toBeUndefined();
  });

  it("atendimento já concluído também continua ocupando", async () => {
    agendaCom([ocupando("concluido", 60 * 24 * 30)]);

    expect(await seteHoras()).toBeUndefined();
  });
});

/**
 * `criadoEm` sai do banco, e não do relógio de agora.
 *
 * ⚠️ ESTE É UM DEFEITO QUE NÃO APARECE. Se a coluna não vier na consulta,
 * o mapeamento cai no `new Date()` de reserva — e aí o cronômetro da tela
 * de confirmação mostra 30 minutos cheios TODA VEZ que a página é aberta,
 * inclusive vinte minutos depois. Nada quebra, nenhum erro no log: só uma
 * cliente confiando num relógio que mente.
 */
describe("de onde vem o criadoEm", () => {
  it("vem da coluna, não do momento da leitura", async () => {
    const nasceu = new Date("2026-09-20T14:00:00.000Z");
    usarBanco({
      // Objeto, e não lista: esta consulta termina em `maybeSingle`.
      select: () => ({
        data: { ...linha(daquiATresDias()), criado_em: nasceu.toISOString() },
        error: null,
      }),
    });

    const ag = await buscarAgendamento("8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b");

    expect(ag?.criadoEm.toISOString()).toBe(nasceu.toISOString());
  });

  /*
    Banco antigo, consulta que não pediu a coluna, linha editada na mão no
    Supabase. O prazo nasce agora — a cliente ganha tempo a mais, que é o
    lado certo de errar: o outro lado é tirar o horário de quem ainda
    podia pagar.
  */
  it("sem a coluna, o prazo nasce agora em vez de quebrar", async () => {
    usarBanco({ select: () => ({ data: linha(daquiATresDias()), error: null }) });

    const ag = await buscarAgendamento("8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b");

    expect(ag?.criadoEm).toBeInstanceOf(Date);
    expect(Date.now() - ag!.criadoEm.getTime()).toBeLessThan(5000);
  });
});

/**
 * Encaixe que ainda espera a entrada.
 *
 * ⚠️ O QUE IMPORTA AQUI É O QUE VAI PRO BANCO. A situação `pendente` é o
 * que faz o horário entrar na conta dos 30 minutos e voltar pra agenda
 * sozinho. Se ela não for gravada, o encaixe vira `confirmado` pelo padrão
 * do banco e fica preso pra sempre esperando um pagamento que ninguém
 * está cobrando.
 */
describe("encaixe aguardando a entrada", () => {
  const base = {
    servicoId: "brow-lamination",
    cidade: "pereira-barreto" as const,
    chaveDia: diaUtilFuturo(),
    hora: "08:00",
    nome: "Thais",
    whatsapp: "18999998888",
  };

  it("grava como pendente quando a entrada não foi paga", async () => {
    const m = usarBanco({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: { id: "novo" }, error: null }),
    });

    await criarAgendamentoNoPainel({ ...base, aguardandoSinal: true });

    const gravado = m.chamadas.find((c) => c.op === "insert")?.valores;
    expect(gravado?.situacao).toBe("pendente");
  });

  /*
    Sem a marca, a linha não leva `situacao` nenhuma e o padrão do banco
    (`confirmado`) vale — que é o que a Karol quer na maioria dos encaixes
    que ela faz na mão.
  */
  it("sem a marca, deixa o padrão do banco decidir", async () => {
    const m = usarBanco({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: { id: "novo" }, error: null }),
    });

    await criarAgendamentoNoPainel(base);

    const gravado = m.chamadas.find((c) => c.op === "insert")?.valores;
    expect(gravado).not.toHaveProperty("situacao");
  });
});
