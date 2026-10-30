import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./conversas", () => ({ janelaAberta: vi.fn(async () => true) }));

import { templateDoEvento, type DadosAgendamento } from "./notificacoes";

/**
 * Cada evento contra o template aprovado na Meta.
 *
 * ---------------------------------------------------------------------
 * Por que este arquivo existe
 * ---------------------------------------------------------------------
 *
 * Kainã, 16/09/2026: *"garanta que os templates estão sendo usados
 * certinho, garanta que as mensagens estarão sendo entregues."*
 *
 * Template é o único jeito de alcançar quem não escreveu nas últimas
 * 24 h — que é TODA cliente que marcou pelo site e nunca falou com a
 * Karol. Se um template sair errado, a Meta recusa e a pessoa não recebe
 * nada. Foi exatamente esse buraco que deixou clientes sem confirmação
 * por dias em setembro.
 *
 * ⚠️ E O ERRO AQUI É MUDO. Número de variáveis errado não quebra build,
 * não quebra tipo, não aparece em lint: a Meta responde 400 e o texto
 * morre no caminho. Um `components` com 4 parâmetros num template que
 * espera 5 é uma linha inocente que ninguém revisaria.
 *
 * A contagem abaixo saiu de `docs/templates-whatsapp.md`, que é a cópia do que
 * está aprovado no WhatsApp Manager. Se alguém editar um template lá e
 * mudar o número de `{{n}}`, este teste é o que avisa.
 */

const AG: DadosAgendamento = {
  id: "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
  cliente: "Maria Silva Souza",
  whatsappCliente: "5518999998888",
  servico: "Brow lamination",
  cidade: "Pereira Barreto",
  inicioISO: "2026-09-20T10:00:00.000Z",
  valorCentavos: 8000,
};

/** O que está aprovado na Meta, por nome de template. */
const APROVADOS: Record<string, number> = {
  confirmacao_agendamento: 5,
  lembrete_vespera: 4,
  aviso_karol_novo_agendamento: 5,
  pedido_sinal: 5,
  pos_atendimento: 1,
  horario_remarcado: 4,
  horario_cancelado: 3,
};

function variaveisDe(componentes: readonly { type: string }[]): number {
  const body = componentes.find((c) => c.type === "body");
  if (!body || !("parameters" in body)) return 0;
  return (body.parameters as unknown[]).length;
}

describe("todo evento tem template, e com as variáveis certas", () => {
  /*
    O par evento → template. Trocar um pelo outro é um erro plausível e
    silencioso: `remarcado` caindo em `horario_cancelado` manda "precisei
    cancelar o seu horário" pra quem só mudou de dia.
  */
  it.each([
    ["confirmacao", AG, "confirmacao_agendamento"],
    ["confirmacao", { ...AG, situacao: "pendente" as const }, "pedido_sinal"],
    ["lembrete", AG, "lembrete_vespera"],
    ["novo-agendamento", AG, "aviso_karol_novo_agendamento"],
    ["agradecimento", AG, "pos_atendimento"],
    ["remarcado", AG, "horario_remarcado"],
    ["cancelado", AG, "horario_cancelado"],
    ["sinal-vencido", AG, "horario_cancelado"],
  ] as const)("%s → %s", (evento, dados, esperado) => {
    const t = templateDoEvento(evento as never, dados as DadosAgendamento);
    expect(t).not.toBeNull();
    expect(t!.nome).toBe(esperado);
  });

  /*
    ⚠️ ESTE É O TESTE QUE PEGA O ERRO MUDO.

    Variável a mais ou a menos = 400 da Meta = cliente sem mensagem, sem
    nada quebrando de um jeito visível.
  */
  it.each([
    ["confirmacao", AG],
    ["confirmacao", { ...AG, situacao: "pendente" as const }],
    ["lembrete", AG],
    ["novo-agendamento", AG],
    ["agradecimento", AG],
    ["remarcado", AG],
    ["cancelado", AG],
    ["sinal-vencido", AG],
  ] as const)("%s manda o número de variáveis que a Meta aprovou", (evento, dados) => {
    const t = templateDoEvento(evento as never, dados as DadosAgendamento)!;
    expect(variaveisDe(t.components)).toBe(APROVADOS[t.nome]);
  });

  /*
    Quem deve sinal NÃO pode receber "seu horário está reservado" — ela
    lê que está tudo certo e não paga. Já aconteceu: era o template de
    confirmação que saía, com o preço cheio e sem uma palavra sobre PIX.
  */
  it("pendente com sinal vai pro pedido_sinal, nunca pra confirmação", () => {
    const t = templateDoEvento("confirmacao" as never, {
      ...AG,
      situacao: "pendente",
    } as DadosAgendamento)!;
    expect(t.nome).toBe("pedido_sinal");
  });

  /*
    E pendente ABAIXO do mínimo (design de R$ 25) não deve sinal nenhum:
    ela tem que receber a confirmação normal. Cobrar PIX de quem não deve
    é o espelho do erro acima.
  */
  it("pendente barato recebe a confirmação normal", () => {
    const t = templateDoEvento("confirmacao" as never, {
      ...AG,
      situacao: "pendente",
      valorCentavos: 2500,
    } as DadosAgendamento)!;
    expect(t.nome).toBe("confirmacao_agendamento");
  });

  /*
    Nenhum parâmetro pode chegar vazio: a Meta recusa template com
    variável em branco, e o sintoma é o mesmo — cliente sem mensagem.
  */
  it("nenhuma variável vai vazia", () => {
    for (const evento of [
      "confirmacao",
      "lembrete",
      "novo-agendamento",
      "agradecimento",
      "remarcado",
      "cancelado",
    ] as const) {
      const t = templateDoEvento(evento as never, AG)!;
      const body = t.components.find((c) => c.type === "body")!;
      for (const p of (body as { parameters: { text?: string }[] }).parameters) {
        expect(p.text?.trim()).toBeTruthy();
      }
    }
  });
});
