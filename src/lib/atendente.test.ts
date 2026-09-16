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

vi.mock("./comprovante", () => ({ analisarComprovante: vi.fn(async () => "nao-sei") }));
vi.mock("./conversas", () => ({
  abrirJanela: vi.fn(async () => {}),
  // Por padrão a janela JÁ está aberta: a cliente é alguém que já conversou
  // com a Karol antes. O caso de "chegando agora" é ligado só nos testes
  // que tratam dele, pra não disparar o pedido de sinal em todo o arquivo.
  janelaAberta: vi.fn(async () => true),
}));
vi.mock("./agendamentos", () => ({
  proximoAgendamentoDe: vi.fn(),
  buscarAgendamento: vi.fn(),
  remarcarAgendamento: vi.fn(async () => ({ ok: true })),
}));
vi.mock("./notificacoes", () => ({
  enviarTexto: vi.fn(async () => true),
  BOTAO_TEMPLATE: { confirmar: "confirmar", remarcar: "remarcar", falar: "falar", pix: "pix", feedback: "feedback", notaOtimo: "nota_otimo", notaBom: "nota_bom", notaRuim: "nota_ruim", pixQr: "pix_qr", pixCodigo: "pix_codigo" },
  // ⚠️ Estas três vão as DE VERDADE, não stub. São funções puras que
  // separam a ação do agendamento no payload do botão ("pix_qr:<uuid>"),
  // e é exatamente esse roteamento que os testes abaixo cobram. Um stub
  // aqui faria o teste passar com o roteamento quebrado.
  acaoDoBotao: (p: string) => (p.indexOf(":") < 0 ? p : p.slice(0, p.indexOf(":"))),
  agendamentoDoBotao: (p: string) =>
    p.indexOf(":") < 0 ? null : p.slice(p.indexOf(":") + 1) || null,
  botaoComAgendamento: (a: string, id: string) => (id ? `${a}:${id}` : a),
  enviarPedidoDeSinal: vi.fn(async () => true),
  enviarQrDoSinal: vi.fn(async () => true),
  enviarCodigoDoSinal: vi.fn(async () => true),
  reenviarMidia: vi.fn(async () => true),
  esperandoSinal: vi.fn(() => false),
  paraDados: vi.fn((a: unknown) => a),
  enviarTextoComBotoes: vi.fn(async () => true),
  avisarComBotao: vi.fn(async () => true),
  enviarTextoComLista: vi.fn(async () => true),
  whatsappDaKarol: vi.fn(() => "5518997525291"),
  // agora recebe o TELEFONE da cliente, não um código derivado do id
  linkDoPainel: vi.fn((whatsapp: string) => `https://exemplo/painel?q=${whatsapp}`),
}));
vi.mock("./acoes-pendentes", () => ({
  guardarAcao: vi.fn(async () => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"),
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
import { buscarAgendamento, proximoAgendamentoDe } from "./agendamentos";
import {
  avisarComBotao,
  enviarTextoComBotoes,
  enviarCodigoDoSinal,
  enviarPedidoDeSinal,
  enviarQrDoSinal,
  enviarTexto,
  esperandoSinal,
  reenviarMidia,
} from "./notificacoes";
import { guardarAcao } from "./acoes-pendentes";
import { analisarComprovante } from "./comprovante";
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
    criadoEm: new Date(),
  };
}

/**
 * Tudo que foi enviado, como pares [para, texto].
 *
 * ⚠️ JUNTA OS DOIS TRANSPORTES de propósito. Desde 16/09 os avisos da
 * Karol saem por `avisarComBotao` (texto + botão de link) em vez de texto
 * puro — mas pro teste "a Karol foi avisada?" é a mesma pergunta. Olhando
 * só `enviarTexto`, os testes passariam a dizer que ela não foi avisada.
 */
function enviados(): [string, string][] {
  return [
    ...enviarMock.mock.calls.map((c) => [c[0], c[1]] as [string, string]),
    ...vi.mocked(avisarComBotao).mock.calls.map((c) => [c[0], c[1]] as [string, string]),
  ];
}

/** O link que foi pro BOTÃO desta mensagem — hoje ele não está no texto. */
function linkDoBotaoPara(numero: string): string | undefined {
  return vi.mocked(avisarComBotao).mock.calls.find((c) => c[0] === numero)?.[3];
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

      E desde 16/09 ele não está mais NO TEXTO: virou o botão. O Kainã
      olhou os prints dela e disse que tanto link ia confundir. As duas
      linhas abaixo são o par que garante isso — o link existe, e existe
      SÓ no botão.
    */
    expect(linkDoBotaoPara(KAROL)).toContain("/painel?q=" + CLIENTE);
    expect(paraKarol).not.toContain("http");
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
    // O caminho pra Karol agora é o botão, não uma URL no texto.
    expect(paraCliente).not.toContain("http");
    expect(linkDoBotaoPara(CLIENTE)).toContain("wa.me/5518997525291");
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

  /*
    ⚠️ ESTA LISTA SÓ CRESCE COM LEITURA, e cada nome novo precisa de um
    motivo escrito aqui.

    `buscarAgendamento` entrou em 16/09/2026 com o id no botão do PIX: o
    botão passou a dizer de QUAL agendamento ele é, e carregar por id é
    uma consulta — não move nada na agenda.

    O teste reprovou a mudança antes de ela subir, que é o trabalho dele.
    Se o próximo nome a aparecer aqui for um que ESCREVE, o certo é
    recusar a mudança, não ampliar a lista.
  */
  it("do banco de agendamentos, importa só o ler e o remarcar", () => {
    const importados = fonte.match(/import \{([^}]+)\} from "\.\/agendamentos"/)?.[1] ?? "";
    const nomes = importados
      .split(",")
      .map((n) => n.replace(/\btype\b/, "").trim())
      .filter(Boolean);
    expect(nomes.sort()).toEqual([
      "Agendamento",
      "buscarAgendamento",
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
    /*
      ⚠️ O NÚMERO fica no texto, o LINK vira botão. "Chega de link" —
      Kainã, 16/09. As três linhas juntas são o par que protege isso:
      ela consegue LER o número, consegue TOCAR pra abrir a conversa, e
      não sobra URL nenhuma no meio da frase.
    */
    expect(texto).toContain("99752-5291");
    expect(texto).not.toContain("http");
    expect(linkDoBotaoPara(CLIENTE)).toContain("wa.me/5518997525291");
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

/**
 * O comprovante e as duas formas de receber o PIX.
 *
 * O Kainã pediu as duas coisas depois de testar no celular: "não enviar o
 * QR code ou copia e cola, mas colocar duas opções de qual ele vai
 * querer", e "o cliente manda o comprovante direto para a assistente e o
 * assistente manda para ela".
 */
describe("o pagamento pelo WhatsApp", () => {
  beforeEach(() => {
    vi.mocked(janelaAberta).mockResolvedValue(true);
    vi.mocked(esperandoSinal).mockReturnValue(true);
    acharMock.mockResolvedValue({ ...agendamentoFalso(), situacao: "pendente" });
  });

  it("'QR Code' manda só o QR", async () => {
    const r = await atender({ ...mensagem("QR Code"), botao: "pix_qr" });
    expect(enviarQrDoSinal).toHaveBeenCalledTimes(1);
    expect(enviarCodigoDoSinal).not.toHaveBeenCalled();
    expect(r.fez).toBe("pediu-sinal");
  });

  it("'Copia e cola' manda só o código", async () => {
    const r = await atender({ ...mensagem("Copia e cola"), botao: "pix_codigo" });
    expect(enviarCodigoDoSinal).toHaveBeenCalledTimes(1);
    expect(enviarQrDoSinal).not.toHaveBeenCalled();
    expect(r.fez).toBe("pediu-sinal");
  });

  it("a foto do comprovante é repassada pra Karol, e a cliente recebe recibo", async () => {
    /*
      ⚠️ Isto sumia. O webhook lia texto e botão e ignorava foto — e
      comprovante de PIX é foto. A cliente mandava, ninguém via, e ela
      ficava esperando a confirmação.
    */
    const r = await atender({ ...mensagem(""), midiaId: "media-123", tipoMidia: "image" });

    expect(r.fez).toBe("recebeu-comprovante");
    expect(reenviarMidia).toHaveBeenCalledTimes(1);

    const [para, tipo, id, legenda] = vi.mocked(reenviarMidia).mock.calls[0];
    expect(para).toBe(KAROL);
    expect(tipo).toBe("image");
    expect(id).toBe("media-123");
    expect(legenda).toContain("Comprovante");
    expect(legenda).toContain("Maria da Silva");

    const paraCliente = enviados().find(([p]) => p === CLIENTE)?.[1] ?? "";
    expect(paraCliente).toMatch(/recebi/i);
  });

  it("o PDF do comprovante também passa", async () => {
    await atender({ ...mensagem(""), midiaId: "doc-9", tipoMidia: "document" });
    expect(vi.mocked(reenviarMidia).mock.calls[0][1]).toBe("document");
  });

  /*
    ⚠️ NEM TODA FOTO É COMPROVANTE. A cliente manda a sobrancelha que quer
    copiar, e até 13/09 a Karol lia "📎 Comprovante de Fulana" numa foto de
    sobrancelha — e a cliente ouvia "vou conferir e te confirmo", que pra
    quem mandou uma referência não quer dizer nada.
  */
  it("foto que não é comprovante chega pra Karol dizendo que não é", async () => {
    vi.mocked(analisarComprovante).mockResolvedValueOnce("outra-coisa");

    await atender({ ...mensagem(""), midiaId: "media-9", tipoMidia: "image" });

    const legenda = vi.mocked(reenviarMidia).mock.calls[0][3];
    expect(legenda).toContain("não parece comprovante");
    expect(legenda).toContain("Maria da Silva");

    // E a cliente não ouve promessa de conferir pagamento nenhum.
    const paraCliente = enviados().find(([p]) => p === CLIENTE)?.[1] ?? "";
    expect(paraCliente).not.toMatch(/confirmo/i);
  });

  /*
    ⚠️ NA DÚVIDA, COMPROVANTE. Sem chave, sem token, modelo que não
    enxerga, imagem grande demais: tudo vira "nao-sei", e "nao-sei" tem
    que se comportar exatamente como antes desta análise existir. Legenda
    errada aborrece; comprovante que não chega deixa cliente sem horário
    depois de ter pago.
  */
  it.each(["nao-sei", "comprovante"] as const)("veredito %s repassa como comprovante", async (v) => {
    vi.mocked(analisarComprovante).mockResolvedValueOnce(v);

    await atender({ ...mensagem(""), midiaId: "media-9", tipoMidia: "image" });

    expect(vi.mocked(reenviarMidia).mock.calls[0][3]).toContain("Comprovante");
  });
});

/**
 * Duas clientes no MESMO número de WhatsApp.
 *
 * ---------------------------------------------------------------------
 * O caso real
 * ---------------------------------------------------------------------
 *
 * 15/09/2026, número 5516996154877. Três agendamentos nele: um design da
 * "Santa" já confirmado (18/09 07:00), um brow lamination da "Julia"
 * esperando sinal (18/09 18:30), e depois um da "Santa" (17/09 18:45).
 *
 * A Julia tocou em "QR Code" e não recebeu nada. A mensagem caiu solta no
 * colo da Karol como "uma cliente escreveu no número automático".
 *
 * O botão não dizia de quem era, e o código perguntava ao banco "qual o
 * PRÓXIMO horário desse número?". Veio o design da Santa — confirmado,
 * não esperava sinal — e nada foi enviado.
 *
 * ⚠️ PARECIA PRAZO. Entre o pedido da Julia e o toque dela passaram 4
 * minutos; o toque que funcionou (da Santa) veio 1 minuto depois do
 * dela. A conclusão natural foi "a mensagem expira em 5 minutos", e é
 * falsa: o que mudou nesse meio não foi o relógio, foi ter nascido um
 * agendamento mais cedo que também esperava sinal.
 *
 * Por isso os dois testes de baixo NÃO mexem em tempo nenhum.
 */
describe("o botão do PIX sabe de qual agendamento ele é", () => {
  const JULIA = "11111111-1111-1111-1111-111111111111";

  /** A Julia: esperando sinal. É dela o botão. */
  function daJulia() {
    return { ...agendamentoFalso(), id: JULIA, clienteNome: "Julia Pereira", situacao: "pendente" as const };
  }

  /** A Santa: confirmada, e é ela que `proximoAgendamentoDe` devolve. */
  function daSanta() {
    return { ...agendamentoFalso(), id: "22222222-2222-2222-2222-222222222222", clienteNome: "Santa Ferreira" };
  }

  beforeEach(() => {
    vi.mocked(buscarAgendamento).mockReset();
    // Só a Julia espera sinal — igual ao caso real.
    vi.mocked(esperandoSinal).mockImplementation(
      (a: unknown) => (a as { id: string }).id === JULIA,
    );
  });

  it("manda o QR da Julia mesmo com a Santa sendo a próxima do número", async () => {
    acharMock.mockResolvedValue(daSanta());
    vi.mocked(buscarAgendamento).mockResolvedValue(daJulia());

    const r = await atender({ de: CLIENTE, texto: "QR Code", id: "wamid.x", botao: `pix_qr:${JULIA}` });

    expect(r.fez).toBe("pediu-sinal");
    expect(vi.mocked(buscarAgendamento)).toHaveBeenCalledWith(JULIA);
    // E o QR que saiu é o DELA, não o da Santa.
    expect(vi.mocked(enviarQrDoSinal).mock.calls[0][0]).toMatchObject({ id: JULIA });
  });

  it("no copia e cola é a mesma coisa", async () => {
    acharMock.mockResolvedValue(daSanta());
    vi.mocked(buscarAgendamento).mockResolvedValue(daJulia());

    await atender({ de: CLIENTE, texto: "Copia e cola", id: "wamid.y", botao: `pix_codigo:${JULIA}` });

    expect(vi.mocked(enviarCodigoDoSinal).mock.calls[0][0]).toMatchObject({ id: JULIA });
    expect(vi.mocked(enviarQrDoSinal)).not.toHaveBeenCalled();
  });

  /*
    Botão antigo, sem id, já entregue no celular de quem recebeu o pedido
    antes deste deploy. Ele volta ao comportamento velho — que erra quando
    há vários horários, mas responde. Parar de responder seria pior.
  */
  it("botão sem id ainda funciona, pelo caminho antigo", async () => {
    acharMock.mockResolvedValue(daJulia());

    const r = await atender({ de: CLIENTE, texto: "QR Code", id: "wamid.z", botao: "pix_qr" });

    expect(r.fez).toBe("pediu-sinal");
    expect(vi.mocked(buscarAgendamento)).not.toHaveBeenCalled();
  });

  /*
    ⚠️ E o id NÃO pode virar um jeito de pedir o PIX de qualquer horário.
    `esperandoSinal` continua sendo a trava: horário já confirmado não
    gera cobrança nova, mesmo que o id venha certinho no botão.
  */
  it("id de agendamento que não espera sinal não manda PIX nenhum", async () => {
    vi.mocked(buscarAgendamento).mockResolvedValue(daSanta());

    const r = await atender({
      de: CLIENTE,
      texto: "QR Code",
      id: "wamid.w",
      botao: "pix_qr:22222222-2222-2222-2222-222222222222",
    });

    expect(r.fez).not.toBe("pediu-sinal");
    expect(vi.mocked(enviarQrDoSinal)).not.toHaveBeenCalled();
  });
});

/**
 * A Karol decidindo o comprovante sem sair do WhatsApp.
 *
 * ---------------------------------------------------------------------
 * O pedido
 * ---------------------------------------------------------------------
 *
 * Kainã, 16/09/2026: *"se o cliente mandar uma foto e o sistema falar que
 * não parece um comprovante, quando chegar no WhatsApp da Carol, ela tem
 * que ter a opção também de recusar, aceitar, confirmar."*
 *
 * Antes a foto chegava e parava ali. Pra confirmar o pagamento ela saía
 * do WhatsApp, abria o painel, achava a cliente e mudava a situação — com
 * a cliente esperando e o relógio dos 30 minutos correndo.
 */
describe("os botões do comprovante", () => {
  const foto = { de: CLIENTE, texto: "", id: "wamid.foto", midiaId: "midia-1" };

  function esperandoPagamento() {
    acharMock.mockResolvedValue({ ...agendamentoFalso(), situacao: "pendente" as const });
    vi.mocked(esperandoSinal).mockReturnValue(true);
  }

  it("a Karol recebe Confirmar e Não é comprovante", async () => {
    esperandoPagamento();

    await atender(foto);

    const [para, , botoes] = vi.mocked(enviarTextoComBotoes).mock.calls.at(-1)!;
    expect(para).toBe(KAROL);
    expect(botoes!.map((b) => b.titulo)).toEqual(["✅ Confirmar", "❌ Não é comprovante"]);
  });

  /*
    A proposta guardada é o que o toque dela vai executar. Se o alvo ou a
    situação vierem errados, ela toca em "Confirmar" achando que liberou o
    horário de uma pessoa e libera o de outra.
  */
  it("a proposta aponta pro agendamento certo e confirma o pagamento", async () => {
    esperandoPagamento();

    await atender(foto);

    const proposta = vi.mocked(guardarAcao).mock.calls.at(-1)![0];
    expect(proposta.ferramenta).toBe("mudar_situacao");
    expect(proposta.argumentos).toMatchObject({
      id: agendamentoFalso().id,
      situacao: "confirmado",
    });
    // E o número da cliente vai junto, pro caso de ela recusar.
    expect(proposta.argumentos.avisarNaRecusa).toBe(CLIENTE);
    // A descrição é o que ela lê antes de tocar.
    expect(proposta.descricao).toContain("Maria da Silva");
  });

  /*
    ⚠️ ESTE É O TESTE QUE IMPEDE O BOTÃO DE VIRAR UM PERIGO.

    Foto de quem já está confirmada não tem pagamento a confirmar. Se o
    botão aparecesse assim mesmo, um toque distraído mexeria na situação
    de um horário que estava resolvido.
  */
  it("NÃO aparece pra quem já está confirmada", async () => {
    acharMock.mockResolvedValue(agendamentoFalso()); // confirmado
    vi.mocked(esperandoSinal).mockReturnValue(false);

    await atender(foto);

    expect(vi.mocked(guardarAcao)).not.toHaveBeenCalled();
    expect(vi.mocked(enviarTextoComBotoes)).not.toHaveBeenCalled();
  });

  it("sem agendamento nenhum, também não aparece", async () => {
    acharMock.mockResolvedValue(null);

    await atender(foto);

    expect(vi.mocked(guardarAcao)).not.toHaveBeenCalled();
  });

  /*
    A foto continua chegando pra ela em qualquer caso — os botões são um
    acréscimo, não uma condição. Se `guardarAcao` falhar (banco fora), a
    Karol ainda vê o comprovante e resolve pelo painel.
  */
  it("a foto chega mesmo quando a proposta não pôde ser guardada", async () => {
    esperandoPagamento();
    vi.mocked(guardarAcao).mockResolvedValueOnce(null);

    await atender(foto);

    expect(vi.mocked(reenviarMidia)).toHaveBeenCalled();
    expect(vi.mocked(enviarTextoComBotoes)).not.toHaveBeenCalled();
  });
});

/**
 * O prazo do botão do comprovante.
 *
 * ⚠️ 30 MINUTOS SERIA UM BECO SEM SAÍDA, e foi o Kainã que puxou a
 * revisão ("dá uma melhorada").
 *
 * A Karol pode estar com uma cliente na cadeira quando a foto chega. Com
 * o prazo padrão, tocar quarenta minutos depois devolve "esse pedido já
 * expirou, me manda de novo" — e não há o que mandar de novo: quem mandou
 * o comprovante foi a cliente, uma vez só. Ela ficaria sem o botão e a
 * cliente sem confirmação.
 *
 * Confirmar pagamento não envelhece como uma mudança de agenda envelhece:
 * quando ela toca, o dinheiro já está na conta.
 */
describe("o botão do comprovante dura o expediente inteiro", () => {
  it("vale bem mais que os 30 minutos padrão", async () => {
    acharMock.mockResolvedValue({ ...agendamentoFalso(), situacao: "pendente" as const });
    vi.mocked(esperandoSinal).mockReturnValue(true);

    await atender({ de: CLIENTE, texto: "", id: "wamid.f", midiaId: "midia-1" });

    const { validoPorMinutos } = vi.mocked(guardarAcao).mock.calls.at(-1)![0];
    expect(validoPorMinutos).toBeGreaterThan(30);
    // Um dia de trabalho dela cabe: a foto pode chegar de manhã e ela
    // resolver à noite.
    expect(validoPorMinutos).toBeGreaterThanOrEqual(12 * 60);
  });
});
