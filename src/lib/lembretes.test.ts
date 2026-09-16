import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A varredura diária: o lembrete da véspera e o agradecimento.
 *
 * ---------------------------------------------------------------------
 * Por que este arquivo mudou de assunto
 * ---------------------------------------------------------------------
 *
 * Até 13/09/2026 ele testava OUTRA coisa: o aviso de ~30 minutos antes,
 * que foi arrancado do projeto (a Karol nunca pediu). Ao apagar aqueles
 * testes apareceu o que eles estavam escondendo — **`rodarLembretes`, a
 * varredura que de fato roda em produção todo dia, não tinha teste
 * nenhum.** Ficou coberta pela vizinhança e ninguém percebeu.
 *
 * Então em vez de apagar o arquivo, ele trocou de assunto.
 *
 * ---------------------------------------------------------------------
 * O que se cobra aqui
 * ---------------------------------------------------------------------
 *
 * A função é curta e faz três coisas que podem dar errado em silêncio:
 * mandar o evento ERRADO pra lista certa (agradecer pra quem vem amanhã),
 * mandar pra pessoa errada, e mentir na contagem que volta pro painel.
 *
 * O banco fica de fora: quem escolhe as pessoas é `agendamentos.ts`, que
 * tem os próprios testes. Aqui é só a costura.
 */

vi.mock("./agendamentos", () => ({
  agendamentosDeAmanha: vi.fn(async () => []),
  agendamentosConcluidosOntem: vi.fn(async () => []),
  pendentesVencidos: vi.fn(async () => []),
  mudarSituacao: vi.fn(async () => ({ ok: true })),
  marcarAvisoEnviado: vi.fn(async () => {}),
}));

// `paraDados` fica a de verdade: é ela que monta o que o evento carrega.
vi.mock("./notificacoes", async (original) => ({
  ...(await original<typeof import("./notificacoes")>()),
  enviarEvento: vi.fn(async () => ({ ok: true })),
}));

import {
  agendamentosConcluidosOntem,
  agendamentosDeAmanha,
  marcarAvisoEnviado,
  mudarSituacao,
  pendentesVencidos,
} from "./agendamentos";
import { enviarEvento } from "./notificacoes";
import { expirarPendentes, rodarLembretes } from "./lembretes";

const amanha = vi.mocked(agendamentosDeAmanha);
const ontem = vi.mocked(agendamentosConcluidosOntem);
const avisar = vi.mocked(enviarEvento);
const vencidos = vi.mocked(pendentesVencidos);
const mudar = vi.mocked(mudarSituacao);
const marcar = vi.mocked(marcarAvisoEnviado);

function agendamento(nome: string, id: string) {
  const inicio = new Date(2026, 8, 20, 9, 0);
  return {
    id,
    clienteNome: nome,
    clienteWhatsapp: "5518999998888",
    servicoId: "design-henna",
    servicoNome: "Design com henna",
    servicoPreco: 3000,
    cidade: "Pereira Barreto",
    inicio,
    fim: new Date(inicio.getTime() + 70 * 60000),
    situacao: "confirmado" as const,
    observacao: null,
    criadoEm: new Date(),
  };
}

/** Os eventos que saíram, na ordem, com o nome de quem recebeu. */
const saiu = () =>
  avisar.mock.calls.map(([evento, dados]) => [evento, dados.cliente] as const);

beforeEach(() => {
  vi.clearAllMocks();
  amanha.mockResolvedValue([]);
  ontem.mockResolvedValue([]);
  vencidos.mockResolvedValue([]);
  mudar.mockResolvedValue({ ok: true });
  // ⚠️ `clearAllMocks` zera as CHAMADAS, não as implementações. Sem esta
  // linha, um teste que faz o envio falhar deixa ele falhando pros
  // seguintes — e o estrago aparece como teste que só quebra na ordem
  // errada, que é o pior tipo de teste quebrado.
  avisar.mockResolvedValue({ ok: true });
});

describe("a varredura diária", () => {
  it("manda lembrete pra quem vem amanhã e agradecimento pra quem veio ontem", async () => {
    amanha.mockResolvedValue([agendamento("Larissa Souza", "11111111-1111-1111-1111-111111111111")]);
    ontem.mockResolvedValue([agendamento("Ana Paula", "22222222-2222-2222-2222-222222222222")]);

    const r = await rodarLembretes();

    expect(saiu()).toEqual([
      ["lembrete", "Larissa Souza"],
      ["agradecimento", "Ana Paula"],
    ]);
    expect(r).toEqual({ lembretes: 1, agradecimentos: 1 });
  });

  /*
    ⚠️ TROCAR AS DUAS LISTAS É O ERRO CARO DESTA FUNÇÃO, e ele não
    quebraria nada: as duas chamadas têm a mesma cara. A cliente que vem
    amanhã receberia "foi muito bom te atender" na véspera, e quem já foi
    atendida receberia "seu horário é amanhã". Ninguém veria erro no log —
    só a Karol recebendo mensagem de cliente confusa.
  */
  it("não troca as duas listas", async () => {
    amanha.mockResolvedValue([agendamento("Quem Vem", "11111111-1111-1111-1111-111111111111")]);
    ontem.mockResolvedValue([agendamento("Quem Foi", "22222222-2222-2222-2222-222222222222")]);

    await rodarLembretes();

    const eventoDe = (nome: string) => saiu().find(([, c]) => c === nome)?.[0];
    expect(eventoDe("Quem Vem")).toBe("lembrete");
    expect(eventoDe("Quem Foi")).toBe("agradecimento");
  });

  it("dia vazio não manda nada, e a contagem diz isso", async () => {
    const r = await rodarLembretes();

    expect(avisar).not.toHaveBeenCalled();
    expect(r).toEqual({ lembretes: 0, agradecimentos: 0 });
  });

  it("manda pra todo mundo da lista, não só pro primeiro", async () => {
    amanha.mockResolvedValue([
      agendamento("Uma", "11111111-1111-1111-1111-111111111111"),
      agendamento("Duas", "22222222-2222-2222-2222-222222222222"),
      agendamento("Três", "33333333-3333-3333-3333-333333333333"),
    ]);

    const r = await rodarLembretes();

    expect(avisar).toHaveBeenCalledTimes(3);
    expect(r.lembretes).toBe(3);
  });

  /*
    A contagem volta pro painel, onde a Karol lê "2 lembretes enviados".

    Ela conta o que SAIU, não o tamanho da lista — e agora isso é
    acionável: lendo 2 de 3, tocar o botão de novo faz sentido, porque o
    que faltou continua na fila. Se contasse a lista, o dia em que o
    WhatsApp falhou diria 3 e ela não teria motivo pra desconfiar.

    Continua NÃO sendo "entregue": a Meta aceita com 200 e só depois diz
    se entregou. Ninguém "melhore" a mensagem do painel pra "entregues".
  */
  it("o número que volta é quantos SAÍRAM, não o tamanho da lista", async () => {
    amanha.mockResolvedValue([
      agendamento("Uma", "11111111-1111-1111-1111-111111111111"),
      agendamento("Duas", "22222222-2222-2222-2222-222222222222"),
      agendamento("Três", "33333333-3333-3333-3333-333333333333"),
    ]);
    avisar
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, motivo: "janela fechada" })
      .mockResolvedValueOnce({ ok: true });

    expect((await rodarLembretes()).lembretes).toBe(2);
  });

  it("o lembrete leva o nome e o serviço de quem vai receber", async () => {
    amanha.mockResolvedValue([agendamento("Larissa Souza", "11111111-1111-1111-1111-111111111111")]);

    await rodarLembretes();

    const [, dados] = avisar.mock.calls[0];
    expect(dados.cliente).toBe("Larissa Souza");
    expect(dados.servico).toBe("Design com henna");
    expect(dados.whatsappCliente).toBe("5518999998888");
  });
});

/**
 * A marca de "já mandei".
 *
 * ---------------------------------------------------------------------
 * O defeito que criou este bloco
 * ---------------------------------------------------------------------
 *
 * Em 16/09/2026 o Kainã reclamou do lembrete da véspera: "uma coisa chata
 * que fica acontecendo". O incômodo não era o lembrete existir — a Karol
 * PEDIU esse (`NOTIFICACOES.lembreteUmDiaAntes`, e ela recusou o de horas
 * antes na mesma pergunta). O incômodo era ele REPETIR.
 *
 * A migração 04 tinha escrito, com todas as letras, que a véspera não
 * precisava de marca "porque o cron roda 1x por dia". Errado: existe um
 * BOTÃO no painel (`/painel/notificacoes`) que chama a mesma varredura,
 * e a Karol pode tocar nele à vontade. Prova no WhatsApp dela —
 * 07/09/2026, mesma cliente, mesmo lembrete, 7:03 e de novo 7:46.
 *
 * ---------------------------------------------------------------------
 * Por que a ORDEM é o que se testa aqui
 * ---------------------------------------------------------------------
 *
 * Marcar antes de enviar também faria o lembrete parar de repetir — e
 * seria pior que o defeito. Uma falha do WhatsApp viraria silêncio
 * permanente: a cliente sai da varredura sem ter recebido nada, e nem o
 * cron de amanhã nem o botão da Karol tentariam de novo.
 *
 * Nenhum teste de "não repete" pega isso. Por isso os dois de baixo.
 */
describe("não mandar duas vezes pra mesma pessoa", () => {
  const umaPessoa = () => {
    amanha.mockResolvedValue([agendamento("Larissa", "11111111-1111-1111-1111-111111111111")]);
  };

  it("marca quem recebeu, com o id e o tipo de aviso certos", async () => {
    umaPessoa();

    await rodarLembretes();

    expect(marcar).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111", "lembrete");
  });

  it("o agradecimento tem a marca dele, não a do lembrete", async () => {
    ontem.mockResolvedValue([agendamento("Ana", "22222222-2222-2222-2222-222222222222")]);

    await rodarLembretes();

    expect(marcar).toHaveBeenCalledWith("22222222-2222-2222-2222-222222222222", "agradecimento");
  });

  /*
    ⚠️ ESTE É O TESTE QUE IMPEDE A "CORREÇÃO" PIOR QUE O DEFEITO.

    Quem não recebeu NÃO pode ser marcado: é a marca que tira a pessoa da
    varredura. Marcando uma falha, o botão do painel deixa de conseguir
    alcançá-la e ela nunca mais é avisada por ninguém.
  */
  it("NÃO marca quem não recebeu", async () => {
    umaPessoa();
    avisar.mockResolvedValue({ ok: false, motivo: "janela fechada" });

    await rodarLembretes();

    expect(marcar).not.toHaveBeenCalled();
  });

  /*
    A outra metade da mesma regra: quem falhou não sai da fila, mas quem
    recebeu também não pode segurar a fila dos outros.
  */
  it("uma falha no meio não impede as seguintes de saírem e serem marcadas", async () => {
    amanha.mockResolvedValue([
      agendamento("Uma", "11111111-1111-1111-1111-111111111111"),
      agendamento("Duas", "22222222-2222-2222-2222-222222222222"),
    ]);
    avisar
      .mockResolvedValueOnce({ ok: false, motivo: "caiu" })
      .mockResolvedValueOnce({ ok: true });

    await rodarLembretes();

    expect(avisar).toHaveBeenCalledTimes(2);
    expect(marcar).toHaveBeenCalledTimes(1);
    expect(marcar).toHaveBeenCalledWith("22222222-2222-2222-2222-222222222222", "lembrete");
  });
});

/**
 * Soltar o horário de quem marcou e não pagou a entrada.
 *
 * ⚠️ ESTE É O CÓDIGO MAIS PERIGOSO DO ARQUIVO: ele CANCELA horário de
 * cliente sozinho, de madrugada, sem ninguém olhando. Um erro aqui não
 * aparece como tela quebrada — aparece como uma cliente que pagou
 * chegando no studio e descobrindo que não tem horário.
 *
 * Por isso o que se cobra abaixo é mais o que ele NÃO pode cancelar do
 * que o que ele cancela.
 */
describe("soltar horário não pago", () => {
  const pendente = (id: string) => ({ ...agendamento("Quem Não Pagou", id), situacao: "pendente" as const });

  it("cancela pelo caminho normal, pra cliente ser avisada", async () => {
    vencidos.mockResolvedValue([pendente("11111111-1111-1111-1111-111111111111")]);

    const r = await expirarPendentes();

    expect(r).toEqual({ expirados: 1 });
    /*
      Duas coisas nesta linha, e as duas importam:

      - tem que ser `mudarSituacao`, e não um update direto no banco: é
        ela que manda o aviso, e cancelar calado é a pessoa aparecendo no
        studio;
      - e com o motivo "sinal-vencido". Sem ele a cliente recebe "precisei
        cancelar o seu horário, me desculpa" — que faz parecer que a Karol
        desistiu dela e não fala nada de pagamento.
    */
    expect(mudar).toHaveBeenCalledWith(
      "11111111-1111-1111-1111-111111111111",
      "cancelado",
      "sinal-vencido",
    );
  });

  it("dia sem ninguém vencido não cancela nada", async () => {
    vencidos.mockResolvedValue([]);

    expect(await expirarPendentes()).toEqual({ expirados: 0 });
    expect(mudar).not.toHaveBeenCalled();
  });

  /*
    Se o cancelamento de uma falhar — banco fora do ar por um instante,
    corrida com a Karol cancelando na mão — as outras não podem parar
    junto. Cada horário preso a mais é uma cliente que não conseguiu
    marcar.
  */
  it("uma que falha não derruba as outras", async () => {
    vencidos.mockResolvedValue([
      pendente("11111111-1111-1111-1111-111111111111"),
      pendente("22222222-2222-2222-2222-222222222222"),
      pendente("33333333-3333-3333-3333-333333333333"),
    ]);
    mudar
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, erro: "Não consegui salvar agora." })
      .mockResolvedValueOnce({ ok: true });

    const r = await expirarPendentes();

    expect(mudar).toHaveBeenCalledTimes(3);
    // Conta só o que soltou de verdade — o número volta pro cron, e um
    // número inflado esconderia a falha.
    expect(r).toEqual({ expirados: 2 });
  });
});
