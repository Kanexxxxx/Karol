import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A costura do atendimento automático.
 *
 * `webhook-meta.test.ts` cobre ler o payload e classificar a intenção;
 * `agendamentos.test.ts` cobre achar no banco. Este arquivo cobre a JUNÇÃO,
 * que foi exatamente onde o bug dos bloqueios de dia inteiro se escondeu:
 * as duas pontas certas, a costura errada, e nenhum teste olhando pra ela.
 *
 * O que mais importa aqui: **nada deste caminho pode mudar a agenda.** A
 * Karol respondeu no briefing que a cliente não desmarca sozinha.
 */

vi.mock("./conversas", () => ({ abrirJanela: vi.fn(async () => {}) }));
vi.mock("./agendamentos", () => ({ proximoAgendamentoDe: vi.fn() }));
vi.mock("./notificacoes", () => ({
  enviarTexto: vi.fn(async () => true),
  whatsappDaKarol: vi.fn(() => "5518997525291"),
  linkDoPainel: vi.fn((id: string) => `https://exemplo/painel?q=${id.slice(0, 6).toUpperCase()}`),
}));

import { abrirJanela } from "./conversas";
import { proximoAgendamentoDe } from "./agendamentos";
import { enviarTexto } from "./notificacoes";
import { atender } from "./atendente";

const abrirMock = vi.mocked(abrirJanela);
const acharMock = vi.mocked(proximoAgendamentoDe);
const enviarMock = vi.mocked(enviarTexto);

const CLIENTE = "5518999998888";
const KAROL = "5518997525291";

function mensagem(texto: string) {
  return { de: CLIENTE, texto, id: "wamid.teste" };
}

/** Um agendamento futuro, como `proximoAgendamentoDe` devolveria. */
function agendamentoFalso() {
  const inicio = new Date(2026, 9, 5, 10, 0, 0);
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

/** Tudo que foi enviado, como pares [para, texto]. */
function enviados(): [string, string][] {
  return enviarMock.mock.calls.map((c) => [c[0], c[1]]);
}

beforeEach(() => {
  abrirMock.mockClear();
  acharMock.mockReset();
  enviarMock.mockClear();
});
afterEach(() => vi.restoreAllMocks());

describe("a janela de 24 h", () => {
  it("abre SEMPRE, mesmo quando não há nada a responder", async () => {
    // é o registro que libera as mensagens grátis: não pode depender
    // de a mensagem ter sido entendida
    acharMock.mockResolvedValue(null);
    await atender(mensagem("oi, vocês atendem no sábado?"));
    expect(abrirMock).toHaveBeenCalledWith(CLIENTE, "oi, vocês atendem no sábado?");
  });

  it("abre antes de qualquer consulta ao banco", async () => {
    const ordem: string[] = [];
    abrirMock.mockImplementation(async () => void ordem.push("janela"));
    acharMock.mockImplementation(async () => (ordem.push("banco"), agendamentoFalso()));

    await atender(mensagem("8C6377"));
    expect(ordem).toEqual(["janela", "banco"]);
  });
});

describe("cliente pergunta pelo horário", () => {
  it("responde com serviço, dia e cidade", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    const r = await atender(mensagem("8C6377"));

    expect(r).toEqual({ fez: "respondeu-horario", codigo: "8C6377" });
    const [[para, texto]] = enviados();
    expect(para).toBe(CLIENTE);
    expect(texto).toContain("Design com henna");
    expect(texto).toContain("Pereira Barreto");
    expect(texto).toContain("sem maquiagem");
  });

  it("responde igual a um 'confirmo'", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    const r = await atender(mensagem("confirmo"));
    expect(r.fez).toBe("respondeu-horario");
  });

  it("não vaza o horário pra Karol nem pra ninguém além da cliente", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    await atender(mensagem("8C6377"));
    expect(enviados().map(([para]) => para)).toEqual([CLIENTE]);
  });
});

describe("cliente pede pra cancelar ou remarcar", () => {
  it("NÃO cancela: avisa a Karol e dá recibo pra cliente", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    const r = await atender(mensagem("preciso cancelar, não vou conseguir ir"));

    expect(r).toEqual({ fez: "avisou-karol", pedido: "cancelar", codigo: "8C6377" });

    const destinos = enviados().map(([para]) => para);
    expect(destinos).toEqual([CLIENTE, KAROL]);
  });

  it("o aviso da Karol traz nome, número e código", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    await atender(mensagem("quero cancelar"));

    const paraKarol = enviados().find(([p]) => p === KAROL)![1];
    expect(paraKarol).toContain("Maria da Silva");
    expect(paraKarol).toContain(CLIENTE);
    expect(paraKarol).toContain("CANCELAMENTO");
    // Link do painel, e não código escrito pra ela digitar.
    expect(paraKarol).toContain("/painel?q=8C6377");
    expect(paraKarol).not.toMatch(/C[óo]digo /);
  });

  it("o recibo diz pra cliente que a Karol vai responder", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    await atender(mensagem("dá pra remarcar?"));

    const paraCliente = enviados().find(([p]) => p === CLIENTE)![1];
    expect(paraCliente).toContain("remarcar");
    expect(paraCliente).toMatch(/Karol/);
    // Vai junto o WhatsApp PESSOAL dela: quem quer desmarcar resolve
    // falando com a Karol, nao com o robo.
    expect(paraCliente).toContain("wa.me/5518997525291");
  });

  it("repassa o que ela escreveu, pra Karol ver o contexto", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    await atender(mensagem("cancelar porque minha filha ficou doente"));

    const paraKarol = enviados().find(([p]) => p === KAROL)![1];
    expect(paraKarol).toContain("minha filha ficou doente");
  });

  it("corta mensagem gigante antes de repassar", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    await atender(mensagem("cancelar " + "x".repeat(1000)));

    const paraKarol = enviados().find(([p]) => p === KAROL)![1];
    expect(paraKarol.length).toBeLessThan(600);
  });
});

describe("o que o robô NÃO faz", () => {
  it("cala a boca em conversa de verdade — quem responde é a Karol", async () => {
    const r = await atender(mensagem("oi, você atende homem também?"));
    expect(r).toEqual({ fez: "nada", motivo: "conversa-de-verdade" });
    expect(enviados()).toEqual([]);
    // nem consulta o banco: não há o que procurar
    expect(acharMock).not.toHaveBeenCalled();
  });

  it("não responde 'cancelar' de quem não tem horário marcado", async () => {
    // quase sempre é número trocado, ou algo que a Karol já resolveu na mão
    acharMock.mockResolvedValue(null);
    const r = await atender(mensagem("quero cancelar"));
    expect(r).toEqual({ fez: "nada", motivo: "sem-agendamento" });
    expect(enviados()).toEqual([]);
  });

  it("manda pro site quem digitou código e não tem nada marcado", async () => {
    acharMock.mockResolvedValue(null);
    const r = await atender(mensagem("A1B2C3"));
    expect(r).toEqual({ fez: "mandou-pro-site" });
    expect(enviados()[0][1]).toContain("/agendar");
  });
});

/**
 * A garantia que os testes acima NÃO dão.
 *
 * Todos eles olham o que `atender` devolve e o que manda pelo WhatsApp. Se
 * alguém acrescentasse um `mudarSituacao(ag.id, "cancelado")` no meio, todos
 * continuariam verdes — a resposta e o aviso sairiam igualzinho, e a agenda
 * da Karol mudaria sozinha sem nenhum teste reclamar.
 *
 * Por isso este é sobre o TEXTO do arquivo. É o mesmo remédio de
 * `acoes-servidor.test.ts`: a regra é sobre o que o módulo pode importar, e
 * regra de importação não se testa chamando função.
 */
describe("o atendimento automático não pode mexer na agenda", () => {
  const fonte = readFileSync(new URL("./atendente.ts", import.meta.url), "utf8");

  // A Karol respondeu no briefing que a cliente não desmarca sozinha.
  const PROIBIDAS = [
    "mudarSituacao",
    "remarcarAgendamento",
    "criarAgendamento",
    "criarAgendamentoNoPainel",
    "salvarBloqueio",
    "apagarBloqueio",
  ];

  it.each(PROIBIDAS)("não usa %s", (nome) => {
    expect(fonte).not.toContain(nome);
  });

  it("do banco de agendamentos, só lê", () => {
    const importados = fonte.match(/import \{([^}]+)\} from "\.\/agendamentos"/)?.[1] ?? "";
    const nomes = importados
      .split(",")
      .map((n) => n.replace(/\btype\b/, "").trim())
      .filter(Boolean);
    expect(nomes.sort()).toEqual(["Agendamento", "proximoAgendamentoDe"]);
  });
});
