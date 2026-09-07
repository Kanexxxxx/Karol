import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Remarcar pelo WhatsApp — os quatro momentos.
 *
 *   1. cliente toca "Remarcar"   → recebe a LISTA de horários livres
 *   2. cliente escolhe um        → Karol recebe pedido com dois botões
 *   3. Karol toca "Confirmar"    → A AGENDA MUDA (só aqui)
 *   4. cliente é avisada         → sai de `remarcarAgendamento`
 *
 * A garantia que este arquivo existe pra proteger: **entre o 1 e o 3 a
 * agenda não se move.** A cliente escolhe; a Karol decide. É a regra dela
 * no briefing, e é o que separa "conveniência" de "a cliente mexendo na
 * agenda de alguém".
 */

vi.mock("./conversas", () => ({ abrirJanela: vi.fn(async () => {}) }));
vi.mock("./agendamentos", () => ({
  proximoAgendamentoDe: vi.fn(),
  remarcarAgendamento: vi.fn(async () => ({ ok: true })),
}));
vi.mock("./notificacoes", () => ({
  enviarTexto: vi.fn(async () => true),
  enviarTextoComBotoes: vi.fn(async () => true),
  enviarTextoComLista: vi.fn(async () => true),
  whatsappDaKarol: vi.fn(() => "5518997525291"),
  linkDoPainel: vi.fn(() => "https://exemplo/painel?q=8C6377"),
}));
vi.mock("./remarcacao", () => ({
  horariosParaOferecer: vi.fn(),
  abrirPedido: vi.fn(),
  pedidoAberto: vi.fn(),
  buscarPedido: vi.fn(),
  registrarEscolha: vi.fn(),
  agendamentoDoPedido: vi.fn(),
  fechar: vi.fn(async () => {}),
}));

import { proximoAgendamentoDe, remarcarAgendamento } from "./agendamentos";
import { enviarTexto, enviarTextoComBotoes, enviarTextoComLista } from "./notificacoes";
import * as R from "./remarcacao";
import { atender } from "./atendente";

const achar = vi.mocked(proximoAgendamentoDe);
const mover = vi.mocked(remarcarAgendamento);
const texto = vi.mocked(enviarTexto);
const botoes = vi.mocked(enviarTextoComBotoes);
const lista = vi.mocked(enviarTextoComLista);

const CLIENTE = "5518999998888";
const KAROL = "5518997525291";
const ID_PEDIDO = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const OPCOES = [
  { inicioISO: new Date(2026, 9, 6, 8, 0).toISOString(), rotulo: "ter 06/10 08:00" },
  { inicioISO: new Date(2026, 9, 6, 9, 0).toISOString(), rotulo: "ter 06/10 09:00" },
];

function agendamento() {
  const inicio = new Date(2026, 9, 5, 10, 0);
  return {
    id: "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
    clienteNome: "Maria da Silva",
    clienteWhatsapp: CLIENTE,
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

function pedido(situacao: "oferecido" | "aguardando-karol", escolhidoISO: string | null = null) {
  return {
    id: ID_PEDIDO,
    agendamentoId: agendamento().id,
    whatsapp: CLIENTE,
    opcoes: OPCOES,
    escolhidoISO,
    situacao,
  };
}

const de = (quem: string, botao?: string, txt = "") => ({ de: quem, texto: txt, id: "w", botao });

beforeEach(() => {
  vi.clearAllMocks();
  mover.mockResolvedValue({ ok: true });
});
afterEach(() => vi.restoreAllMocks());

describe("1 — a cliente toca em Remarcar", () => {
  it("recebe a lista com os horários livres", async () => {
    achar.mockResolvedValue(agendamento());
    vi.mocked(R.horariosParaOferecer).mockResolvedValue(OPCOES);
    vi.mocked(R.abrirPedido).mockResolvedValue(pedido("oferecido"));

    const r = await atender(de(CLIENTE, "remarcar", "📅 Remarcar"));

    expect(r).toEqual({ fez: "ofereceu-horarios", quantos: 2 });
    const [para, , , linhas] = lista.mock.calls[0];
    expect(para).toBe(CLIENTE);
    expect(linhas.map((l) => l.id)).toEqual(["h:0", "h:1"]);
    expect(linhas.map((l) => l.titulo)).toEqual(["ter 06/10 08:00", "ter 06/10 09:00"]);
  });

  it("a agenda NÃO se move só por ela ter pedido", async () => {
    achar.mockResolvedValue(agendamento());
    vi.mocked(R.horariosParaOferecer).mockResolvedValue(OPCOES);
    vi.mocked(R.abrirPedido).mockResolvedValue(pedido("oferecido"));

    await atender(de(CLIENTE, "remarcar"));
    expect(mover).not.toHaveBeenCalled();
  });

  it("agenda cheia: cai no aviso pra Karol em vez de lista vazia", async () => {
    achar.mockResolvedValue(agendamento());
    vi.mocked(R.horariosParaOferecer).mockResolvedValue([]);

    const r = await atender(de(CLIENTE, "remarcar"));
    expect(r.fez).toBe("avisou-karol");
    expect(lista).not.toHaveBeenCalled();
  });
});

describe("2 — a cliente escolhe um horário", () => {
  it("a Karol recebe o pedido com os dois botões", async () => {
    vi.mocked(R.pedidoAberto).mockResolvedValue(pedido("oferecido"));
    vi.mocked(R.registrarEscolha).mockResolvedValue(OPCOES[1]);
    vi.mocked(R.agendamentoDoPedido).mockResolvedValue(agendamento());

    const r = await atender(de(CLIENTE, "h:1", "ter 06/10 09:00"));

    expect(r).toEqual({ fez: "aguardando-karol", quando: "ter 06/10 09:00" });
    const [para, corpo, bs] = botoes.mock.calls[0];
    expect(para).toBe(KAROL);
    expect(corpo).toContain("Maria da Silva");
    expect(bs!.map((b) => b.id)).toEqual([`k:ok:${ID_PEDIDO}`, `k:no:${ID_PEDIDO}`]);
  });

  it("a AGENDA AINDA NÃO MUDOU — é o ponto do desenho inteiro", async () => {
    vi.mocked(R.pedidoAberto).mockResolvedValue(pedido("oferecido"));
    vi.mocked(R.registrarEscolha).mockResolvedValue(OPCOES[1]);
    vi.mocked(R.agendamentoDoPedido).mockResolvedValue(agendamento());

    await atender(de(CLIENTE, "h:1"));
    expect(mover).not.toHaveBeenCalled();
  });

  it("a cliente é avisada de que o horário antigo continua valendo", async () => {
    vi.mocked(R.pedidoAberto).mockResolvedValue(pedido("oferecido"));
    vi.mocked(R.registrarEscolha).mockResolvedValue(OPCOES[1]);
    vi.mocked(R.agendamentoDoPedido).mockResolvedValue(agendamento());

    await atender(de(CLIENTE, "h:1"));
    const paraCliente = texto.mock.calls.find((c) => c[0] === CLIENTE)![1];
    expect(paraCliente).toMatch(/continua valendo/i);
  });

  it("lista velha: avisa que expirou em vez de mover qualquer coisa", async () => {
    vi.mocked(R.pedidoAberto).mockResolvedValue(null);

    const r = await atender(de(CLIENTE, "h:1"));
    expect(r).toEqual({ fez: "nada", motivo: "pedido-expirado" });
    expect(mover).not.toHaveBeenCalled();
    expect(texto.mock.calls[0][1]).toMatch(/expirou/i);
  });

  it("índice inventado não move nada", async () => {
    // `registrarEscolha` confere o índice contra o que FOI oferecido
    vi.mocked(R.pedidoAberto).mockResolvedValue(pedido("oferecido"));
    vi.mocked(R.registrarEscolha).mockResolvedValue(null);

    const r = await atender(de(CLIENTE, "h:99"));
    expect(r).toEqual({ fez: "nada", motivo: "pedido-expirado" });
    expect(mover).not.toHaveBeenCalled();
  });
});

describe("3 e 4 — a Karol decide", () => {
  it("confirmar É o único caminho que move a agenda", async () => {
    vi.mocked(R.buscarPedido).mockResolvedValue(pedido("aguardando-karol", OPCOES[1].inicioISO));
    vi.mocked(R.agendamentoDoPedido).mockResolvedValue(agendamento());

    const r = await atender(de(KAROL, `k:ok:${ID_PEDIDO}`));

    expect(mover).toHaveBeenCalledTimes(1);
    expect(r.fez).toBe("remarcado");
    expect(vi.mocked(R.fechar)).toHaveBeenCalledWith(ID_PEDIDO, "feito");
  });

  it("recusar não move nada, e a cliente fica sabendo", async () => {
    vi.mocked(R.buscarPedido).mockResolvedValue(pedido("aguardando-karol", OPCOES[1].inicioISO));
    vi.mocked(R.agendamentoDoPedido).mockResolvedValue(agendamento());

    const r = await atender(de(KAROL, `k:no:${ID_PEDIDO}`));

    expect(mover).not.toHaveBeenCalled();
    expect(r).toEqual({ fez: "karol-recusou" });
    expect(vi.mocked(R.fechar)).toHaveBeenCalledWith(ID_PEDIDO, "recusado");
    const paraCliente = texto.mock.calls.find((c) => c[0] === CLIENTE)![1];
    expect(paraCliente).toMatch(/continua valendo/i);
  });

  it("se o horário foi tomado no meio do caminho, os dois ficam sabendo", async () => {
    // entre a escolha e a confirmação alguém pode ter pego o horário
    vi.mocked(R.buscarPedido).mockResolvedValue(pedido("aguardando-karol", OPCOES[1].inicioISO));
    vi.mocked(R.agendamentoDoPedido).mockResolvedValue(agendamento());
    mover.mockResolvedValue({ ok: false, erro: "Já existe atendimento nesse horário." });

    const r = await atender(de(KAROL, `k:ok:${ID_PEDIDO}`));

    expect(r).toEqual({ fez: "nada", motivo: "horario-tomado" });
    const destinos = texto.mock.calls.map((c) => c[0]);
    expect(destinos).toContain(KAROL);
    expect(destinos).toContain(CLIENTE);
  });

  it("botão de pedido que já foi decidido não faz nada", async () => {
    vi.mocked(R.buscarPedido).mockResolvedValue(pedido("oferecido"));

    const r = await atender(de(KAROL, `k:ok:${ID_PEDIDO}`));
    expect(r).toEqual({ fez: "nada", motivo: "pedido-expirado" });
    expect(mover).not.toHaveBeenCalled();
  });

  it("a mensagem da Karol não é tratada como se ela fosse cliente", async () => {
    // sem essa separação, um toque dela viraria proximoAgendamentoDe(número
    // da Karol) e o robô responderia o horário DELA
    vi.mocked(R.buscarPedido).mockResolvedValue(pedido("aguardando-karol", OPCOES[1].inicioISO));
    vi.mocked(R.agendamentoDoPedido).mockResolvedValue(agendamento());

    await atender(de(KAROL, `k:ok:${ID_PEDIDO}`));
    expect(achar).not.toHaveBeenCalled();
  });
});
