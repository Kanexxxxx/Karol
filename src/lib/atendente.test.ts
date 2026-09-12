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

vi.mock("./conversas", () => ({
  abrirJanela: vi.fn(async () => {}),
  // Por padrão a janela JÁ está aberta: a cliente é alguém que já conversou
  // com a Karol antes. O caso de "chegando agora" é ligado só nos testes
  // que tratam dele, pra não disparar o pedido de sinal em todo o arquivo.
  janelaAberta: vi.fn(async () => true),
}));
vi.mock("./agendamentos", () => ({
  proximoAgendamentoDe: vi.fn(),
  remarcarAgendamento: vi.fn(async () => ({ ok: true })),
}));
vi.mock("./notificacoes", () => ({
  enviarTexto: vi.fn(async () => true),
  BOTAO_TEMPLATE: { confirmar: "confirmar", remarcar: "remarcar", falar: "falar", pix: "pix", feedback: "feedback", notaOtimo: "nota_otimo", notaBom: "nota_bom", notaRuim: "nota_ruim" },
  enviarPedidoDeSinal: vi.fn(async () => true),
  esperandoSinal: vi.fn(() => false),
  paraDados: vi.fn((a: unknown) => a),
  enviarTextoComBotoes: vi.fn(async () => true),
  enviarTextoComLista: vi.fn(async () => true),
  whatsappDaKarol: vi.fn(() => "5518997525291"),
  // agora recebe o TELEFONE da cliente, não um código derivado do id
  linkDoPainel: vi.fn((whatsapp: string) => `https://exemplo/painel?q=${whatsapp}`),
}));
vi.mock("./remarcacao", () => ({
  horariosParaOferecer: vi.fn(async () => []),
  abrirPedido: vi.fn(async () => null),
  pedidoAberto: vi.fn(async () => null),
  buscarPedido: vi.fn(async () => null),
  registrarEscolha: vi.fn(async () => null),
  agendamentoDoPedido: vi.fn(async () => null),
  fechar: vi.fn(async () => {}),
}));

import { abrirJanela, janelaAberta } from "./conversas";
import { proximoAgendamentoDe } from "./agendamentos";
import { enviarPedidoDeSinal, enviarTexto, esperandoSinal } from "./notificacoes";
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
    avisado30minEm: null,
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

    await atender(mensagem("confirmo"));
    expect(ordem).toEqual(["janela", "banco"]);
  });
});

describe("cliente pergunta pelo horário", () => {
  it("responde com serviço, dia e cidade", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    const r = await atender(mensagem("confirmo"));

    expect(r).toEqual({ fez: "respondeu-horario" });
    const [[para, texto]] = enviados();
    expect(para).toBe(CLIENTE);
    expect(texto).toContain("Design com henna");
    expect(texto).toContain("Pereira Barreto");
    expect(texto).toContain("sem maquiagem");
  });

  it("responde igual a um 'ok'", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    const r = await atender(mensagem("ok"));
    expect(r.fez).toBe("respondeu-horario");
  });

  it("não vaza o horário pra Karol nem pra ninguém além da cliente", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    await atender(mensagem("confirmo"));
    expect(enviados().map(([para]) => para)).toEqual([CLIENTE]);
  });
});

describe("cliente pede pra cancelar ou remarcar", () => {
  it("NÃO cancela: avisa a Karol e dá recibo pra cliente", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    const r = await atender(mensagem("preciso cancelar, não vou conseguir ir"));

    expect(r).toEqual({ fez: "avisou-karol", pedido: "cancelar" });

    const destinos = enviados().map(([para]) => para);
    expect(destinos).toEqual([CLIENTE, KAROL]);
  });

  it("o aviso da Karol traz nome, número e o link do painel", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());
    await atender(mensagem("quero cancelar"));

    const paraKarol = enviados().find(([p]) => p === KAROL)![1];
    expect(paraKarol).toContain("Maria da Silva");
    expect(paraKarol).toContain(CLIENTE);
    expect(paraKarol).toContain("CANCELAMENTO");
    /*
      ⚠️ O link filtra pelo TELEFONE da cliente. Antes era um código de
      seis caracteres, que saiu do projeto inteiro: era mais uma coisa pra
      Karol decorar, e ela já acha qualquer pessoa pelo nome ou pelo
      número que está na conversa.
    */
    expect(paraKarol).toContain("/painel?q=" + CLIENTE);
    expect(paraKarol).not.toMatch(/C[óo]digo /);
  });

  it("sem horário livre pra oferecer, remarcar vira aviso pra Karol", async () => {
    // `horariosParaOferecer` devolve [] no mock: agenda cheia
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
  it("não responde a pergunta de verdade — mas entrega ela pra Karol", async () => {
    /*
      O robô continua sem chutar resposta: chute em pergunta que ele não
      entendeu é pior que silêncio.

      O que mudou é o destino do silêncio. Este número é o chip da API e
      não tem caixa de entrada: antes, "você atende homem também?" não
      era respondida pelo robô E não era vista pela Karol. Agora ela
      recebe a pergunta, com o telefone de quem perguntou.
    */
    const r = await atender(mensagem("oi, você atende homem também?"));

    expect(r).toEqual({ fez: "repassou-pra-karol" });

    const enviadas = enviados();
    expect(enviadas).toHaveLength(1);
    const [para, texto] = enviadas[0];
    expect(para).toBe(KAROL);
    expect(texto).toContain("atende homem também");
    // a cliente não recebe resposta nenhuma do robô
    expect(enviadas.filter(([p]) => p === CLIENTE)).toEqual([]);
  });

  it("não responde 'cancelar' de quem não tem horário marcado", async () => {
    // quase sempre é número trocado, ou algo que a Karol já resolveu na mão
    acharMock.mockResolvedValue(null);
    const r = await atender(mensagem("quero cancelar"));
    expect(r).toEqual({ fez: "nada", motivo: "sem-agendamento" });
    expect(enviados()).toEqual([]);
  });

  it("manda pro site quem confirma e não tem nada marcado", async () => {
    acharMock.mockResolvedValue(null);
    const r = await atender(mensagem("confirmo"));
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

  /**
   * A regra mudou quando a remarcação por WhatsApp entrou, e este teste
   * mudou junto — mas o limite continua no mesmo lugar.
   *
   * ANTES: nada aqui podia tocar na agenda.
   * AGORA: só `remarcarAgendamento`, e só dentro de `decisaoDaKarol`, que
   * roda depois de a KAROL tocar em "Confirmar".
   *
   * Cancelar e criar continuam proibidos. A cliente escolhe; a Karol decide.
   */
  const PROIBIDAS = [
    "mudarSituacao",
    "criarAgendamento",
    "criarAgendamentoNoPainel",
    "salvarBloqueio",
    "apagarBloqueio",
  ];

  it.each(PROIBIDAS)("não usa %s", (nome) => {
    expect(fonte).not.toContain(nome);
  });

  it("do banco de agendamentos, importa só o ler e o remarcar", () => {
    const importados = fonte.match(/import \{([^}]+)\} from "\.\/agendamentos"/)?.[1] ?? "";
    const nomes = importados
      .split(",")
      .map((n) => n.replace(/\btype\b/, "").trim())
      .filter(Boolean);
    expect(nomes.sort()).toEqual([
      "Agendamento",
      "proximoAgendamentoDe",
      "remarcarAgendamento",
    ]);
  });

  it("o remarcar só é chamado dentro da decisão da Karol", () => {
    // A garantia que importa: se alguém mover essa chamada pra outro
    // caminho, o horário passa a mudar sem a Karol apertar nada.
    const corte = fonte.indexOf("async function decisaoDaKarol");
    expect(corte).toBeGreaterThan(0);
    expect(fonte.slice(corte)).toContain("await remarcarAgendamento(");
    expect(fonte.slice(0, corte)).not.toContain("await remarcarAgendamento(");
  });
});

/**
 * O PIX que sai sozinho quando a cliente chega.
 *
 * Este é o desfecho de toda a arquitetura de janela de 24 h. Quem marca
 * pelo site nunca falou com a Karol, então a Meta recusa texto livre. A
 * tela de confirmação termina num botão que faz a CLIENTE mandar a
 * primeira mensagem — e é essa mensagem que abre a janela e destrava o
 * envio do sinal de graça.
 *
 * Se estes testes caírem, o sinal volta a depender de a Karol digitar a
 * chave PIX na mão em toda cliente nova.
 */
describe("o pedido do sinal quando a cliente chega do site", () => {
  beforeEach(() => {
    vi.mocked(janelaAberta).mockResolvedValue(true);
    vi.mocked(esperandoSinal).mockReturnValue(false);
    vi.mocked(enviarPedidoDeSinal).mockClear();
  });

  it("dispara o PIX na primeira mensagem de quem está devendo o sinal", async () => {
    // janela fechada = pessoa chegando agora, vinda do site
    vi.mocked(janelaAberta).mockResolvedValue(false);
    vi.mocked(esperandoSinal).mockReturnValue(true);
    acharMock.mockResolvedValue({ ...agendamentoFalso(), situacao: "pendente" });

    const r = await atender(mensagem("Oi Karol! Acabei de agendar pelo site"));

    expect(r.fez).toBe("pediu-sinal");
    expect(enviarPedidoDeSinal).toHaveBeenCalledTimes(1);
  });

  it("NÃO repete o PIX em cada mensagem seguinte da mesma conversa", async () => {
    // a janela já está aberta: ela está conversando, não chegando
    vi.mocked(janelaAberta).mockResolvedValue(true);
    vi.mocked(esperandoSinal).mockReturnValue(true);
    acharMock.mockResolvedValue({ ...agendamentoFalso(), situacao: "pendente" });

    await atender(mensagem("já mandei o comprovante"));

    expect(enviarPedidoDeSinal).not.toHaveBeenCalled();
  });

  it("não manda PIX pra quem marcou serviço que não pede sinal", async () => {
    vi.mocked(janelaAberta).mockResolvedValue(false);
    vi.mocked(esperandoSinal).mockReturnValue(false);
    acharMock.mockResolvedValue(agendamentoFalso());

    await atender(mensagem("Oi Karol! Acabei de agendar pelo site"));

    expect(enviarPedidoDeSinal).not.toHaveBeenCalled();
  });

  it("não trava a conversa de quem chega sem agendamento nenhum", async () => {
    vi.mocked(janelaAberta).mockResolvedValue(false);
    acharMock.mockResolvedValue(null);

    const r = await atender(mensagem("oi, quanto custa a maquiagem?"));

    expect(enviarPedidoDeSinal).not.toHaveBeenCalled();
    // Chegando agora com uma pergunta de verdade: o robô não responde a
    // pergunta, mas entrega o WhatsApp dela. Este número não tem caixa de
    // entrada, e o silêncio deixava a cliente falando sozinha.
    expect(r.fez).toBe("encaminhou-pra-karol");
  });

  it("pergunta se a janela estava aberta ANTES de abrir a janela", () => {
    /*
      A ordem é o truque inteiro. `abrirJanela` deixa toda janela aberta;
      se a pergunta viesse depois, a resposta seria sempre "já estava" e o
      PIX nunca sairia — um bug silencioso, porque nada quebra: as
      mensagens continuam funcionando, só o sinal some.
    */
    const texto = readFileSync(new URL("./atendente.ts", import.meta.url), "utf8");
    const perguntou = texto.indexOf("await janelaAberta(");
    const abriu = texto.indexOf("await abrirJanela(");
    expect(perguntou).toBeGreaterThan(0);
    expect(perguntou).toBeLessThan(abriu);
  });
});

/**
 * Os botões dos templates, e o número que não tem caixa de entrada.
 *
 * O número da API só existe pro webhook — ninguém abre ele num celular.
 * Tudo o que chega nele e o robô não trata, ninguém lê. Estes testes
 * garantem que a cliente sempre sai com um caminho até a Karol.
 */
describe("os botões dos templates", () => {
  beforeEach(() => {
    vi.mocked(janelaAberta).mockResolvedValue(true);
    vi.mocked(esperandoSinal).mockReturnValue(false);
    vi.mocked(enviarPedidoDeSinal).mockClear();
  });

  it("'Receber o PIX' manda o PIX de novo mesmo com a conversa aberta", async () => {
    vi.mocked(esperandoSinal).mockReturnValue(true);
    acharMock.mockResolvedValue({ ...agendamentoFalso(), situacao: "pendente" });

    const r = await atender({ ...mensagem("💳 Receber o PIX"), botao: "pix" });

    expect(r.fez).toBe("pediu-sinal");
    expect(enviarPedidoDeSinal).toHaveBeenCalledTimes(1);
  });

  it("'Receber o PIX' de quem já está confirmada não manda PIX nenhum", async () => {
    acharMock.mockResolvedValue(agendamentoFalso());

    const r = await atender({ ...mensagem("💳 Receber o PIX"), botao: "pix" });

    expect(enviarPedidoDeSinal).not.toHaveBeenCalled();
    expect(r.fez).not.toBe("pediu-sinal");
  });

  it("'Falar com a Karol' entrega o WhatsApp pessoal dela", async () => {
    const r = await atender({ ...mensagem("💬 Falar com a Karol"), botao: "falar" });

    expect(r.fez).toBe("encaminhou-pra-karol");
    const [para, texto] = enviados().at(-1)!;
    expect(para).toBe(CLIENTE);
    expect(texto).toContain("99752-5291");
    expect(texto).toContain("wa.me/5518997525291");
  });

  it("mensagem livre no meio da conversa não repete o encaminhamento", async () => {
    // janela aberta = ela já recebeu o link nesta conversa
    const r = await atender(mensagem("posso levar minha filha junto?"));

    expect(r.fez).toBe("repassou-pra-karol");
    // a Karol recebe a pergunta; a cliente não recebe o link de novo
    expect(enviados().map(([p]) => p)).toEqual([KAROL]);
  });
});

/**
 * A avaliação do pós-atendimento.
 *
 * O Kainã pediu "o que todo mundo tem: uma avaliação". Pergunta aberta
 * quase ninguém responde; três botões, a maioria toca.
 *
 * ⚠️ O caso que mais importa é a nota RUIM. Cliente insatisfeita respondendo
 * a um robô simpático é como se perde uma cliente sem nem ficar sabendo — a
 * Karol precisa receber isso marcado.
 */
describe("a avaliação depois do atendimento", () => {
  beforeEach(() => {
    vi.mocked(janelaAberta).mockResolvedValue(true);
    vi.mocked(esperandoSinal).mockReturnValue(false);
  });

  const casos = [
    ["nota_otimo", /alegria/i, /AMOU/],
    ["nota_bom", /que bom/i, /Achou bom/],
    ["nota_ruim", /quero acertar/i, /NÃO gostou/],
  ] as const;

  for (const [botao, esperaCliente, esperaKarol] of casos) {
    it(`"${botao}": responde a cliente e avisa a Karol`, async () => {
      const r = await atender({ ...mensagem("⭐"), botao });

      expect(r.fez).toBe("repassou-pra-karol");

      const paraCliente = enviados().find(([p]) => p === CLIENTE)?.[1] ?? "";
      const paraKarol = enviados().find(([p]) => p === KAROL)?.[1] ?? "";
      expect(paraCliente).toMatch(esperaCliente);
      expect(paraKarol).toMatch(esperaKarol);
    });
  }

  it("a nota ruim não recebe a mesma resposta alegre da boa", async () => {
    await atender({ ...mensagem("⭐"), botao: "nota_ruim" });
    const paraCliente = enviados().find(([p]) => p === CLIENTE)![1];
    expect(paraCliente).not.toMatch(/alegria|que bom/i);
  });
});
