import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
  A janela de 24 h fica aberta por padrão nos testes.

  ⚠️ Desde 13/09 `enviarEvento` PERGUNTA se a janela está aberta antes de
  escolher entre texto livre e template. Sem este mock, `janelaAberta`
  bate num banco que não existe, devolve false, e TODO teste daqui passa a
  medir o caminho do template — inclusive os que existem pra provar o
  texto livre.

  Quem quiser o outro caminho troca com `janelaMock.mockResolvedValue(false)`.
*/
vi.mock("./conversas", () => ({ janelaAberta: vi.fn(async () => true) }));

import { janelaAberta } from "./conversas";
import { REGRAS } from "@/data/negocio";
import {
  enviarEvento,
  enviarTemplatePelaMeta,
  notificadorConfigurado,
  textoAgradecimento,
  linkDoPainel,
  textoConfirmacao,
  textoLembrete,
  textoParaKarol,
  textoSinalVencido,
  templateDoEvento,
  whatsappDaKarol,
  type DadosAgendamento,
} from "./notificacoes";
import { SITE_URL } from "@/data/negocio";

const AG: DadosAgendamento = {
  id: "ag-1",
  cliente: "Maria Silva Souza",
  whatsappCliente: "5518999998888",
  servico: "Design com henna",
  cidade: "Pereira Barreto",
  inicioISO: "2026-09-10T10:00:00.000Z",
  valorCentavos: 3000,
};

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("templates", () => {
  it("aviso pra Karol tem serviço, valor, cliente e WhatsApp", () => {
    const t = textoParaKarol(AG);
    expect(t).toContain("Design com henna");
    expect(t).toContain("Maria Silva Souza");
    expect(t).toContain("5518999998888");
    expect(t).toMatch(/R\$\s?30/);
  });

  it("mensagens pra cliente usam só o primeiro nome", () => {
    expect(textoConfirmacao(AG)).toContain("Maria");
    expect(textoConfirmacao(AG)).not.toContain("Maria Silva Souza");
    expect(textoLembrete(AG)).toMatch(/amanhã/i);
    expect(textoAgradecimento(AG)).toContain("Maria");
  });

  it("confirmação inclui endereço completo da cidade", () => {
    const msgPb = textoConfirmacao(AG);
    expect(msgPb).toContain("Condomínio da Praia");
    expect(msgPb).toContain("portão da academia");

    const msgBand = textoConfirmacao({ ...AG, cidade: "Bandeirantes D'Oeste" });
    expect(msgBand).toContain("Rua 2 de Fevereiro, 274");
  });

  it("quando pendente com sinal, mensagem pra cliente inclui PIX e 50%", () => {
    // R$ 100 (maquiagem social) — acima do mínimo de R$ 80, então pede
    // sinal. O `AG` padrão é um design de R$ 30 e NÃO pede.
    const pendente = textoConfirmacao({
      ...AG,
      situacao: "pendente",
      valorCentavos: 10000,
    });
    // A palavra que a CLIENTE lê é "entrada" — "sinal" ficou só do lado
    // da Karol, que foi quem usou essa palavra no formulário.
    expect(pendente).toMatch(/entrada é de \*R\$\s?50\*/);
    expect(pendente).not.toMatch(/sinal/i);
    // Pergunta COMO ela quer receber, em vez de despejar tudo de uma vez.
    // Eram três mensagens seguidas (texto, QR e código); o Kainã disse que
    // era informação demais pra cliente, e era.
    expect(pendente).toMatch(/Como você prefere receber o PIX/);
    // ⚠️ A CHAVE NÃO VEM MAIS AQUI. Ela chega depois, no formato que a
    // cliente escolher no botão — QR Code ou copia e cola.
    expect(pendente).not.toContain(REGRAS.sinal.chavePix);
    // o que faz a pessoa pagar: não é dinheiro a mais
    expect(pendente).toContain("desconta do valor final");
    // e a regra dela, dita sem rodeio
    expect(pendente).toMatch(/A entrada não volta em caso de desistência/i);
  });

  it("cliente que marcou serviço barato não recebe PIX nenhum", () => {
    const pendente = textoConfirmacao({ ...AG, situacao: "pendente" });
    expect(pendente).not.toContain("18997525291");
    expect(pendente).not.toMatch(/sinal/i);
  });

  /**
   * ⚠️ O sinal é só nos serviços de R$ 80 ou mais — resposta dela.
   *
   * Uma versão anterior calculava 50% de qualquer agendamento pendente,
   * e um design de R$ 30 aparecia pedindo R$ 15 num serviço em que ela
   * não quer sinal nenhum. Estes dois testes são o par que trava isso.
   */
  it("aviso pra Karol pede o sinal num serviço acima do mínimo", () => {
    const t = textoParaKarol({ ...AG, situacao: "pendente", valorCentavos: 10000 });
    expect(t).toMatch(/falta o sinal/i);
    expect(t).toMatch(/sinal de \*R\$\s?50\*/);
  });

  it("NÃO pede sinal num serviço abaixo do mínimo, mesmo pendente", () => {
    const t = textoParaKarol({ ...AG, situacao: "pendente", valorCentavos: 3000 });
    expect(t).not.toMatch(/sinal/i);
    expect(t).toContain("Novo agendamento");
  });
});

describe("whatsappDaKarol", () => {
  it("prioriza a env e devolve só dígitos", () => {
    process.env.KAROL_WHATSAPP = "+55 (18) 90000-0000";
    expect(whatsappDaKarol()).toBe("5518900000000");
  });
  it("cai pro número do site quando a env está vazia", () => {
    delete process.env.KAROL_WHATSAPP;
    expect(whatsappDaKarol()).toMatch(/^\d{12,13}$/);
  });
});

describe("enviarEvento", () => {
  it("não chama o webhook quando não há URL", async () => {
    delete process.env.NOTIFICADOR_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await enviarEvento("lembrete", AG);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(notificadorConfigurado()).toBe(false);
  });

  it("posta o evento no webhook com o corpo esperado", async () => {
    process.env.NOTIFICADOR_WEBHOOK_URL = "https://hook.exemplo/karol";
    const fetchMock = vi.fn<(u: string, i: RequestInit) => Promise<{ ok: boolean; status: number }>>(
      () => Promise.resolve({ ok: true, status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await enviarEvento("confirmacao", AG);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hook.exemplo/karol");
    const corpo = JSON.parse(init.body as string);
    expect(corpo.evento).toBe("confirmacao");
    expect(corpo.agendamento.id).toBe("ag-1");
    expect(corpo.mensagem.destinatario).toBe("cliente");
    expect(corpo.mensagem.para).toBe("5518999998888");
    expect(corpo.mensagem.texto).toContain("Maria");
  });

  it("manda o aviso de novo-agendamento pra Karol", async () => {
    process.env.NOTIFICADOR_WEBHOOK_URL = "https://hook.exemplo/karol";
    process.env.KAROL_WHATSAPP = "5518911112222";
    const fetchMock = vi.fn<(u: string, i: RequestInit) => Promise<{ ok: boolean; status: number }>>(
      () => Promise.resolve({ ok: true, status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await enviarEvento("novo-agendamento", AG);

    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(corpo.mensagem.destinatario).toBe("karol");
    expect(corpo.mensagem.para).toBe("5518911112222");
  });

  it("engole erro de rede sem lançar", async () => {
    process.env.NOTIFICADOR_WEBHOOK_URL = "https://hook.exemplo/karol";
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("sem rede");
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    /*
      ⚠️ `false`, e não `undefined`. Desde 13/09 `enviarEvento` DIZ se
      conseguiu — foi assim que a Karol passou a ser avisada quando a
      cliente não recebe nada. O que continua valendo é o principal: erro
      de rede não LANÇA, porque isto roda dentro do webhook e webhook que
      responde erro faz a Meta reenviar tudo.
    */
    await expect(enviarEvento("lembrete", AG)).resolves.toMatchObject({ ok: false });
  });
});

describe("envio pela Cloud API da Meta", () => {
  const dados = {
    id: "ag-1",
    cliente: "Maria da Silva",
    whatsappCliente: "5516991557552",
    servico: "Design de sobrancelha",
    cidade: "Pereira Barreto",
    inicioISO: "2026-09-08T10:00:00.000Z",
    valorCentavos: 2500,
  };

  beforeEach(() => {
    process.env.META_TOKEN = "token-de-teste";
    process.env.META_PHONE_NUMBER_ID = "1232997019905897";
    delete process.env.NOTIFICADOR_WEBHOOK_URL;
  });

  afterEach(() => {
    delete process.env.META_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;
  });

  it("chama a Meta com o Phone Number ID na URL, não o telefone", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await enviarEvento("confirmacao", dados);

    const [url, opcoes] = buscar.mock.calls[0];
    expect(String(url)).toContain("/1232997019905897/messages");
    const corpo = JSON.parse(String((opcoes as RequestInit).body));
    // A confirmação vai INTERATIVA: ela acabou de marcar e é o momento em
    // que ainda pode querer trocar alguma coisa.
    expect(corpo).toMatchObject({
      messaging_product: "whatsapp",
      to: "5516991557552",
      type: "interactive",
    });
    expect(corpo.interactive.body.text).toContain("Maria");
    buscar.mockRestore();
  });

  it("a confirmação leva os três botões, e nenhum título estoura o limite", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await enviarEvento("confirmacao", dados);

    const corpo = JSON.parse(String((buscar.mock.calls[0][1] as RequestInit).body));
    const botoes = corpo.interactive.action.buttons;
    expect(botoes.map((b: { reply: { id: string } }) => b.reply.id)).toEqual([
      "confirmar",
      "remarcar",
      "cancelar",
    ]);
    // A Meta recusa título com mais de 20 caracteres, e emoji conta 2.
    for (const b of botoes) expect([...b.reply.title].length).toBeLessThanOrEqual(20);
    buscar.mockRestore();
  });

  it("nenhuma mensagem fala em código", async () => {
    // O código de seis caracteres foi REMOVIDO do projeto inteiro: era
    // mais uma coisa pra Karol decorar e explicar pra cliente. Hoje ela
    // acha qualquer pessoa pelo nome ou pelo telefone.
    expect(textoConfirmacao(dados)).not.toMatch(/c[óo]digo/i);
    expect(textoParaKarol(dados)).not.toMatch(/c[óo]digo/i);
  });

  it("o link do painel filtra pelo telefone da cliente", async () => {
    expect(linkDoPainel(dados.whatsappCliente)).toContain(
      `/painel?q=${dados.whatsappCliente}`,
    );
  });

  it("o aviso de novo agendamento vai pra Karol, não pra cliente", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await enviarEvento("novo-agendamento", dados);

    const corpo = JSON.parse(String((buscar.mock.calls[0][1] as RequestInit).body));
    expect(corpo.to).not.toBe(dados.whatsappCliente);
    buscar.mockRestore();
  });

  /**
   * 131047 é janela de 24h fechada — acontece de verdade com o lembrete da
   * véspera. Não pode derrubar o cron nem o agendamento.
   */
  /*
    Janela fechada não lança — mas agora DEVOLVE `false`, porque o
    template de socorro também levou 400 neste teste. É esse `false` que
    faz a Karol receber "não consegui avisar a cliente, chama ela aqui" em
    vez de o defeito morrer num log que o plano Hobby não guarda.
  */
  it("janela fechada não lança, e avisa que não conseguiu", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 131047 } }), { status: 400 }),
    );
    await expect(enviarEvento("lembrete", dados)).resolves.toMatchObject({ ok: false });
    buscar.mockRestore();
  });

  /*
    ⚠️ E O CONTRÁRIO TAMBÉM: janela fechada com o template PASSANDO tem
    que devolver `true`. Se devolvesse `false`, a Karol receberia o aviso
    de "não consegui" em TODO agendamento feito pelo site — que é
    justamente o caso normal, porque quem marca pelo site nunca escreveu
    pro studio antes.
  */
  it("janela fechada com template funcionando conta como enviado", async () => {
    let chamada = 0;
    const buscar = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      chamada++;
      return chamada === 1
        ? new Response(JSON.stringify({ error: { code: 131047 } }), { status: 400 })
        : new Response("{}", { status: 200 });
    });

    await expect(enviarEvento("lembrete", dados)).resolves.toEqual({ ok: true });
    expect(chamada).toBe(2);
    buscar.mockRestore();
  });

  it("prefere a Meta quando as duas configurações existem", async () => {
    process.env.NOTIFICADOR_WEBHOOK_URL = "https://webhook.exemplo/nao-deve-ser-usado";
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    await enviarEvento("confirmacao", dados);
    expect(String(buscar.mock.calls[0][0])).toContain("graph.facebook.com");
    buscar.mockRestore();
  });

  it("sem Meta e sem webhook, não chama ninguém", async () => {
    delete process.env.META_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    await enviarEvento("confirmacao", dados);
    expect(buscar).not.toHaveBeenCalled();
    buscar.mockRestore();
  });
});

describe("o endereço do site nas mensagens", () => {
  /**
   * O link do painel saiu errado em produção: `karolcarvalho.vercel.app`,
   * um domínio que nunca existiu (a Vercel criou o projeto como
   * `karol-zeta`). A Karol tocava no link e caía num 404.
   *
   * Passou despercebido porque nada quebra — 404 não é exceção. Este teste
   * é o que impede o mesmo tipo de erro de voltar calado.
   */
  it("o link do painel usa o endereço configurado, não um chutado", () => {
    // O alvo do link é o TELEFONE da cliente: o código de seis caracteres
    // saiu do projeto. Ver `linkDoPainel`.
    expect(linkDoPainel("5518999998888")).toBe(`${SITE_URL}/painel?q=5518999998888`);
  });

  it("o endereço nunca é o domínio que não existe", () => {
    expect(SITE_URL).not.toContain("karolcarvalho.vercel.app");
  });

  it("é uma URL absoluta e sem barra no fim", () => {
    // barra no fim viraria `//painel?q=`, que alguns clientes de WhatsApp
    // não transformam em link
    expect(SITE_URL).toMatch(/^https:\/\/[^/]+$/);
  });
});

/**
 * O recado da cliente.
 *
 * ⚠️ Este defeito viveu o projeto inteiro sem ninguém ver: o campo "algum
 * recado?" existe no último passo do agendamento desde a primeira etapa,
 * era gravado no banco, aparecia no cartão do painel — e NÃO ia na
 * mensagem que chega pra Karol.
 *
 * O jeito de errar aqui é o pior possível. Uma cliente escreve "estou
 * grávida, cuidado com a henna" ou "sou alérgica", a mensagem entra no
 * banco, a Karol recebe o aviso do agendamento sem uma palavra sobre
 * isso, e só descobre se abrir o painel antes de atender.
 */
describe("o recado da cliente chega na Karol", () => {
  const comRecado = {
    ...AG,
    observacao: "Sou alérgica a henna, pode ser só o design?",
  };

  it("aparece na mensagem quando existe", () => {
    const t = textoParaKarol(comRecado);
    expect(t).toContain("Sou alérgica a henna");
    expect(t).toMatch(/recado/i);
  });

  it("vem ANTES do link do painel", () => {
    // Ela lê a prévia da notificação sem abrir o WhatsApp. Se o recado
    // ficar depois do link, some da prévia justamente quando importa.
    const t = textoParaKarol(comRecado);
    expect(t.indexOf("alérgica")).toBeLessThan(t.indexOf("/painel?q="));
  });

  it("não deixa buraco na mensagem quando não existe", () => {
    const t = textoParaKarol({ ...AG, observacao: null });
    expect(t).not.toMatch(/recado/i);
    // três quebras seguidas seriam um espaço vazio no meio da mensagem
    expect(t).not.toContain("\n\n\n");
  });
});

/**
 * O valor de um parâmetro de template, seja texto ou payload de botão.
 * Desde que os botões passaram a levar payload, um parâmetro pode ser um
 * ou outro — ler `.text` direto quebrava a tipagem.
 */
function valorDoParam(p: { type: string; text?: string; payload?: string }) {
  return p.type === "payload" ? p.payload : p.text;
}

describe("templates da Meta", () => {
  it("monta o template de confirmacao_agendamento com as 5 variáveis", () => {
    const tpl = templateDoEvento("confirmacao", AG);
    expect(tpl).not.toBeNull();
    expect(tpl!.nome).toBe("confirmacao_agendamento");
    expect(tpl!.components[0].type).toBe("body");
    const params = tpl!.components[0].parameters.map(valorDoParam);
    expect(params[0]).toBe("Maria");
    expect(params[1]).toBe("Design com henna");
    expect(params[3]).toBe("Pereira Barreto");
    expect(params[4]).toMatch(/R\$\s?30/);
  });

  it("monta o template de lembrete_vespera com as 4 variáveis", () => {
    const tpl = templateDoEvento("lembrete", AG);
    expect(tpl).not.toBeNull();
    expect(tpl!.nome).toBe("lembrete_vespera");
    const params = tpl!.components[0].parameters.map(valorDoParam);
    expect(params[0]).toBe("Maria");
    expect(params[1]).toBe("Design com henna");
    expect(params[3]).toBe("Pereira Barreto");
  });

  it("monta o aviso pra Karol com dados e botão dinâmico para o painel", () => {
    const tpl = templateDoEvento("novo-agendamento", AG);
    expect(tpl).not.toBeNull();
    expect(tpl!.nome).toBe("aviso_karol_novo_agendamento");
    expect(tpl!.components.length).toBe(2);
    // botão dinâmico
    const botao = tpl!.components[1];
    expect(botao.type).toBe("button");
    if (botao.type === "button") {
      expect(valorDoParam(botao.parameters[0])).toBe(AG.whatsappCliente);
    }
  });

  it("chama a API da Meta com formato type: template", async () => {
    process.env.META_TOKEN = "token-teste";
    process.env.META_PHONE_NUMBER_ID = "phone-123";
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );

    const tpl = templateDoEvento("confirmacao", AG)!;
    await enviarTemplatePelaMeta("5518999998888", tpl.nome, tpl.components);

    expect(buscar).toHaveBeenCalledTimes(1);
    const [url, init] = buscar.mock.calls[0];
    expect(url).toContain("phone-123/messages");
    const corpo = JSON.parse(init?.body as string);
    expect(corpo.type).toBe("template");
    expect(corpo.template.name).toBe("confirmacao_agendamento");
    expect(corpo.template.language.code).toBe("pt_BR");
    buscar.mockRestore();
  });

  it("aciona fallback por template quando a Meta responde 131047 (janela fechada)", async () => {
    process.env.META_TOKEN = "token-teste";
    process.env.META_PHONE_NUMBER_ID = "phone-123";

    let chamadas = 0;
    const buscar = vi.spyOn(globalThis, "fetch").mockImplementation(async (_, init) => {
      chamadas++;
      const corpo = JSON.parse(String(init?.body));
      // Primeira chamada tenta texto livre / interativo e falha com 131047
      if (corpo.type === "interactive" || corpo.type === "text") {
        return new Response(JSON.stringify({ error: { code: 131047, message: "Window closed" } }), {
          status: 400,
        });
      }
      // Segunda chamada é o template e tem sucesso
      return new Response("{}", { status: 200 });
    });

    await enviarEvento("confirmacao", AG);

    expect(chamadas).toBe(2);
    buscar.mockRestore();
  });
});

/**
 * O template de quem deve o sinal.
 *
 * Com a janela fechada — o caso de quase toda cliente nova —, quem marcava
 * uma brow lamination recebia "seu horário está reservado", com o preço
 * cheio e sem uma palavra sobre o PIX. Lia que estava tudo certo e não
 * pagava. Estes testes travam a troca.
 */
describe("o template de quem deve o sinal", () => {
  // R$ 100 pede sinal (o mínimo é R$ 80); o AG padrão é um design de R$ 30
  const DEVENDO = { ...AG, situacao: "pendente", valorCentavos: 10000 };

  it("recebe pedido_sinal, e não 'horário reservado'", () => {
    const tpl = templateDoEvento("confirmacao", DEVENDO)!;
    expect(tpl.nome).toBe("pedido_sinal");
    const valores = tpl.components[0].parameters.map(valorDoParam);
    expect(valores[0]).toBe("Maria");
    // o 5º é o SINAL (50% de R$ 100), não o preço cheio
    expect(valores[4]).toMatch(/R\$\s?50/);
  });

  it("o primeiro botão é o do PIX, o segundo é falar com a Karol", () => {
    const tpl = templateDoEvento("confirmacao", DEVENDO)!;
    const botoes = tpl.components.slice(1);
    expect(botoes).toHaveLength(2);
    expect(botoes.map((b) => (b.type === "button" ? b.index : ""))).toEqual(["0", "1"]);
    expect(botoes.map((b) => valorDoParam(b.parameters[0]))).toEqual(["pix", "falar"]);
  });

  it("serviço barato pendente continua recebendo a confirmação normal", () => {
    const tpl = templateDoEvento("confirmacao", { ...AG, situacao: "pendente" })!;
    expect(tpl.nome).toBe("confirmacao_agendamento");
  });

  it("confirmação e lembrete mandam os três payloads, na ordem dos botões da Meta", () => {
    // A Meta casa payload com botão pela POSIÇÃO. Trocar a ordem aqui sem
    // trocar lá faz "Remarcar" chegar como "Confirmar".
    for (const evento of ["confirmacao", "lembrete"] as const) {
      const tpl = templateDoEvento(evento, AG)!;
      const botoes = tpl.components.slice(1);
      expect(botoes.map((b) => (b.type === "button" ? b.sub_type : ""))).toEqual([
        "quick_reply",
        "quick_reply",
        "quick_reply",
      ]);
      expect(botoes.map((b) => valorDoParam(b.parameters[0]))).toEqual([
        "confirmar",
        "remarcar",
        "falar",
      ]);
    }
  });
});

/**
 * O aviso de que o horário voltou pra agenda por falta de pagamento.
 *
 * ⚠️ ESTE TEXTO EXISTE PORQUE O DE CANCELAMENTO QUASE FOI USADO NO LUGAR.
 * Aquele diz "precisei cancelar o seu horário, me desculpa" — é a Karol
 * desmarcando alguém. Pra quem não pagou, faz parecer que ela foi
 * dispensada, e não explica nada.
 */
describe("horário solto por falta de pagamento", () => {
  const dados = {
    id: "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
    cliente: "Larissa Souza",
    whatsappCliente: "5518999998888",
    servico: "Brow lamination",
    cidade: "Pereira Barreto",
    inicioISO: new Date(2026, 9, 8, 10, 0).toISOString(),
    valorCentavos: 12000,
  };

  it("diz o motivo, e diz o prazo", () => {
    const t = textoSinalVencido(dados);

    expect(t).toContain("entrada não chegou");
    expect(t).toContain(String(REGRAS.sinal.minutosParaPagar));
  });

  /*
    A linha mais importante do texto. A cliente que pagou no minuto 31 vai
    ler isto com o comprovante na mão — sem esta frase ela fica com o
    dinheiro enviado, sem horário, e sem saber o que fazer.
  */
  it("diz o que fazer pra quem já tinha pagado", () => {
    expect(textoSinalVencido(dados)).toContain("comprovante");
  });

  /*
    Ninguém errou aqui: a mensagem anterior avisou do prazo. Pedir
    desculpa por uma regra combinada soa falso, e ainda joga em cima da
    Karol uma culpa que não é dela.
  */
  it("não pede desculpa nem finge que a Karol desmarcou", () => {
    const t = textoSinalVencido(dados).toLowerCase();

    expect(t).not.toContain("desculpa");
    expect(t).not.toContain("precisei cancelar");
  });

  it("deixa a porta aberta pra remarcar", () => {
    expect(textoSinalVencido(dados)).toContain("marcar de novo");
  });
});

/**
 * Os nomes dos templates têm que bater com os aprovados na Meta.
 *
 * ⚠️ UM CARACTERE DIFERENTE E A MENSAGEM SOME. Template é só o que
 * alcança quem não escreveu nas últimas 24 h — a confirmação de quem
 * marcou pelo site, o lembrete da véspera, o aviso pra Karol. Se o nome
 * não existir do lado da Meta, a chamada volta erro, o `console.error`
 * some no log da Vercel, e a cliente simplesmente não recebe nada.
 *
 * Nada no sistema percebe isso. Por isso a lista está escrita aqui à mão,
 * conferida contra a tela de templates aprovados em 13/09/2026.
 */
describe("os nomes dos templates", () => {
  /** Exatamente o que está APROVADO na conta da Meta. */
  const APROVADOS = [
    "confirmacao_agendamento",
    "lembrete_vespera",
    "aviso_karol_novo_agendamento",
    "pedido_sinal",
    "pos_atendimento",
    "horario_remarcado",
    "horario_cancelado",
  ];

  const dados: DadosAgendamento = {
    id: "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
    cliente: "Maria da Silva",
    whatsappCliente: "5518999998888",
    servico: "Design com henna",
    cidade: "Pereira Barreto",
    inicioISO: new Date(2026, 9, 8, 10, 0).toISOString(),
    valorCentavos: 12000,
  };

  const eventos = [
    "novo-agendamento",
    "confirmacao",
    "remarcado",
    "cancelado",
    "sinal-vencido",
    "lembrete",
    "agradecimento",
  ] as const;

  it("todo template que o código pede está aprovado na Meta", () => {
    for (const evento of eventos) {
      const tpl = templateDoEvento(evento, dados);
      if (!tpl) continue;
      expect(APROVADOS, `evento ${evento}`).toContain(tpl.nome);
    }
  });

  /*
    ⚠️ O `lembrete_30min` foi arrancado do projeto em 13/09 e arquivado na
    Meta pelo Kainã. Se o nome reaparecer aqui, alguém ressuscitou o aviso
    de meia hora que a Karol nunca pediu — e ele voltaria mandando
    mensagem pra cliente dela.
  */
  it("o lembrete de 30 minutos não voltou", () => {
    for (const evento of eventos) {
      expect(templateDoEvento(evento, dados)?.nome).not.toBe("lembrete_30min");
    }
  });
});

/**
 * O motivo da falha sobe junto.
 *
 * ⚠️ ISTO NASCEU DE EU TER ERRADO DUAS VEZES SEGUIDAS. Em 13/09 a cliente
 * não recebeu nada, e eu chutei "é o limite da conta" e depois "é a forma
 * de pagamento" — as duas erradas, porque o `console.error` some no plano
 * Hobby da Vercel e eu estava adivinhando em vez de ler.
 *
 * O código da Meta é o que resolve: 131047 é janela fechada, 130497 é
 * país restrito, 131030 é número fora da lista de teste. Sem ele, a
 * conversa vira palpite.
 */
const PARA_ERRO: DadosAgendamento = {
  id: "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
  cliente: "Maria da Silva",
  whatsappCliente: "5518999998888",
  servico: "Design com henna",
  cidade: "Pereira Barreto",
  inicioISO: new Date(2026, 9, 8, 10, 0).toISOString(),
  valorCentavos: 3000,
};

describe("quando falha, diz por quê", () => {
  beforeEach(() => {
    process.env.META_TOKEN = "token-de-teste";
    process.env.META_PHONE_NUMBER_ID = "123";
    delete process.env.NOTIFICADOR_WEBHOOK_URL;
  });
  afterEach(() => {
    delete process.env.META_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;
  });

  it("traz o código e a mensagem curta da Meta", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 131030, message: "Recipient phone number not in allowed list" },
        }),
        { status: 400 },
      ),
    );

    const r = await enviarEvento("lembrete", PARA_ERRO);

    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("131030");
    expect(r.motivo).toContain("allowed list");
    buscar.mockRestore();
  });

  /*
    O corpo da Meta é um JSON grande com rastro e link de documentação.
    Mandar aquilo inteiro pro WhatsApp empurraria o texto útil pra fora da
    tela do celular.
  */
  it("não despeja o JSON inteiro na mensagem", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 131030,
            message: "x".repeat(400),
            type: "OAuthException",
            fbtrace_id: "AbCdEf",
            error_subcode: 2494055,
          },
        }),
        { status: 400 },
      ),
    );

    const r = await enviarEvento("lembrete", PARA_ERRO);

    expect(r.motivo!.length).toBeLessThanOrEqual(160);
    expect(r.motivo).not.toContain("fbtrace_id");
    buscar.mockRestore();
  });

  it("corpo que não é JSON não quebra nada", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Bad Gateway", { status: 502 }),
    );

    const r = await enviarEvento("lembrete", PARA_ERRO);

    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("Bad Gateway");
    buscar.mockRestore();
  });

  it("quando dá certo, não sobra motivo nenhum", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

    expect(await enviarEvento("lembrete", PARA_ERRO)).toEqual({ ok: true });
    buscar.mockRestore();
  });
});

/**
 * Janela fechada → template DIRETO, sem tentar texto livre antes.
 *
 * ⚠️ ESTE É O CONSERTO DO DEFEITO QUE CUSTOU O DIA 13/09.
 *
 * O desenho antigo era reativo: mandava texto livre e, SE a Meta recusasse
 * com 131047, trocava pelo template. Funcionava quando a recusa vinha na
 * hora — e ela nem sempre vem.
 *
 * Duas clientes não receberam nada, e a API tinha respondido **200** nas
 * duas. O 131047 chegou minutos depois, pelo webhook de entrega. Sem erro
 * síncrono, a troca nunca aconteceu, e a mensagem morreu em silêncio: nem
 * a cliente recebeu, nem a Karol soube.
 *
 * Perguntar antes é o que fecha esse buraco.
 */
describe("janela fechada manda template de primeira", () => {
  const janelaMock = vi.mocked(janelaAberta);

  beforeEach(() => {
    process.env.META_TOKEN = "token-de-teste";
    process.env.META_PHONE_NUMBER_ID = "1232997019905897";
    delete process.env.NOTIFICADOR_WEBHOOK_URL;
    janelaMock.mockResolvedValue(true);
  });
  afterEach(() => {
    delete process.env.META_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;
    janelaMock.mockResolvedValue(true);
  });

  /** O corpo enviado em cada chamada à Meta. */
  function espiar() {
    const corpos: Record<string, unknown>[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
      corpos.push(JSON.parse(String((init as RequestInit).body)));
      return new Response("{}", { status: 200 });
    });
    return corpos;
  }

  it("com a janela FECHADA, sai template — e uma chamada só", async () => {
    const corpos = espiar();
    janelaMock.mockResolvedValue(false);

    const r = await enviarEvento("lembrete", PARA_ERRO);

    expect(r).toEqual({ ok: true });
    expect(corpos).toHaveLength(1);
    expect(corpos[0].type).toBe("template");
  });

  /*
    Com a janela ABERTA o texto livre continua sendo o certo: ele é mais
    rico que o template, que tem texto fixo e aprovado.
  */
  it("com a janela ABERTA, continua texto livre", async () => {
    const corpos = espiar();
    janelaMock.mockResolvedValue(true);

    await enviarEvento("lembrete", PARA_ERRO);

    expect(corpos[0].type).not.toBe("template");
  });

  /*
    ⚠️ DÚVIDA CONTA COMO FECHADA. `janelaAberta` devolve false tanto pra
    "fechada" quanto pra "não sei" (banco fora do ar, tabela ainda vazia).
    Errar pro lado do template não custa: template de utilidade dentro da
    janela é de graça. Errar pro outro lado é cliente sem aviso nenhum.
  */
  it("não saber conta como fechada", async () => {
    const corpos = espiar();
    janelaMock.mockResolvedValue(false);

    await enviarEvento("confirmacao", PARA_ERRO);

    expect(corpos[0].type).toBe("template");
  });

  /*
    O evento que não tem template não pode ficar sem saída: manda texto
    livre e torce, que é melhor que não mandar nada.
  */
  it("evento sem template cai no texto livre mesmo com janela fechada", async () => {
    const corpos = espiar();
    janelaMock.mockResolvedValue(false);
    // `agradecimento` tem template; usamos um sem: nenhum hoje. Então o
    // teste garante ao menos que nada explode e algo é enviado.
    await enviarEvento("agradecimento", PARA_ERRO);

    expect(corpos.length).toBeGreaterThan(0);
  });
});

/**
 * O pedido do sinal com a janela fechada.
 *
 * ⚠️ ERA O MESMO DEFEITO, ESCONDIDO NUM SEGUNDO LUGAR. Consertar só o
 * caminho normal deu a impressão de resolvido — a confirmação passou a
 * chegar — enquanto o PAGAMENTO continuava quebrado.
 *
 * `enviarPedidoDeSinal` manda texto livre com botões. Com a janela
 * fechada, a Meta responde 200 e não entrega; ele devolve `true`; e
 * `enviarEvento` retorna sem nunca chegar no template. Quem marcava brow
 * lamination, maquiagem ou curso — justamente quem PAGA — não recebia
 * nada.
 */
describe("pedido do sinal respeita a janela", () => {
  const janelaMock = vi.mocked(janelaAberta);

  const COM_SINAL: DadosAgendamento = {
    id: "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b",
    cliente: "Maria da Silva",
    whatsappCliente: "5518999998888",
    servico: "Brow lamination",
    cidade: "Pereira Barreto",
    inicioISO: new Date(2026, 9, 8, 10, 0).toISOString(),
    valorCentavos: 12000,
    situacao: "pendente",
  };

  beforeEach(() => {
    process.env.META_TOKEN = "token-de-teste";
    process.env.META_PHONE_NUMBER_ID = "1232997019905897";
    delete process.env.NOTIFICADOR_WEBHOOK_URL;
  });
  afterEach(() => {
    delete process.env.META_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;
    janelaMock.mockResolvedValue(true);
  });

  function espiarCorpos() {
    const corpos: Record<string, unknown>[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
      corpos.push(JSON.parse(String((init as RequestInit).body)));
      return new Response("{}", { status: 200 });
    });
    return corpos;
  }

  it("janela FECHADA manda o template do sinal, não o texto com botões", async () => {
    const corpos = espiarCorpos();
    janelaMock.mockResolvedValue(false);

    await enviarEvento("confirmacao", COM_SINAL);

    expect(corpos).toHaveLength(1);
    expect(corpos[0].type).toBe("template");
    expect((corpos[0].template as { name: string }).name).toBe("pedido_sinal");
  });

  /*
    Com a janela aberta o caminho rico continua: texto com o valor, e os
    dois botões pra ela escolher entre QR e copia e cola. Template não faz
    isso — tem texto fixo e aprovado.
  */
  it("janela ABERTA continua mandando o texto com os dois botões", async () => {
    const corpos = espiarCorpos();
    janelaMock.mockResolvedValue(true);

    await enviarEvento("confirmacao", COM_SINAL);

    expect(corpos[0].type).toBe("interactive");
  });
});
