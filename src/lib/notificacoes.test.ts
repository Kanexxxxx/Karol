import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REGRAS } from "@/data/negocio";
import {
  enviarEvento,
  enviarTemplatePelaMeta,
  templateDoEvento,
  notificadorConfigurado,
  textoAgradecimento,
  linkDoPainel,
  textoConfirmacao,
  textoLembrete,
  textoParaKarol,
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
    await expect(enviarEvento("lembrete", AG)).resolves.toBeUndefined();
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
  it("engole o erro de janela fechada sem lançar", async () => {
    const buscar = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 131047 } }), { status: 400 }),
    );
    await expect(enviarEvento("lembrete", dados)).resolves.toBeUndefined();
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
