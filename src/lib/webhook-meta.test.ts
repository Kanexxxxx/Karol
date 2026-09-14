import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assinaturaConfere,
  lerFalhaDeEntrega,
  lerIntencao,
  lerMensagem,
  respostaDaVerificacao,
} from "./webhook-meta";

const SEGREDO = "segredo-do-app-da-meta";

function assinar(corpo: string, segredo = SEGREDO): string {
  return "sha256=" + createHmac("sha256", segredo).update(corpo, "utf8").digest("hex");
}

/** Payload de mensagem de texto, no formato que a Meta manda. */
function payloadTexto(de = "5518999998888", texto = "oi", id = "wamid.1") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "958269250650095",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "1232997019905897" },
              contacts: [{ profile: { name: "Maria" }, wa_id: de }],
              messages: [{ from: de, id, timestamp: "1757000000", type: "text", text: { body: texto } }],
            },
          },
        ],
      },
    ],
  };
}

describe("assinatura do webhook", () => {
  it("aceita o corpo assinado com o segredo certo", () => {
    const corpo = JSON.stringify(payloadTexto());
    expect(assinaturaConfere(corpo, assinar(corpo), SEGREDO)).toBe(true);
  });

  it("recusa corpo adulterado, mesmo com assinatura bem formada", () => {
    const corpo = JSON.stringify(payloadTexto());
    const assinatura = assinar(corpo);
    const adulterado = JSON.stringify(payloadTexto("5511911112222"));
    expect(assinaturaConfere(adulterado, assinatura, SEGREDO)).toBe(false);
  });

  it("recusa assinatura feita com outro segredo", () => {
    const corpo = JSON.stringify(payloadTexto());
    expect(assinaturaConfere(corpo, assinar(corpo, "outro"), SEGREDO)).toBe(false);
  });

  it("FALHA FECHADO: sem segredo no ambiente, nada passa", () => {
    const corpo = JSON.stringify(payloadTexto());
    expect(assinaturaConfere(corpo, assinar(corpo), undefined)).toBe(false);
    expect(assinaturaConfere(corpo, assinar(corpo), "")).toBe(false);
  });

  it("recusa quando não vem cabeçalho nenhum", () => {
    const corpo = JSON.stringify(payloadTexto());
    expect(assinaturaConfere(corpo, null, SEGREDO)).toBe(false);
  });

  it("recusa cabeçalho sem o prefixo sha256=", () => {
    const corpo = JSON.stringify(payloadTexto());
    const sem = assinar(corpo).replace("sha256=", "");
    expect(assinaturaConfere(corpo, sem, SEGREDO)).toBe(false);
  });

  it("é sobre os BYTES CRUS: reserializar o JSON quebra a assinatura", () => {
    // é por isso que a rota lê req.text() antes de qualquer JSON.parse
    const corpo = JSON.stringify(payloadTexto());
    const assinatura = assinar(corpo);
    const reserializado = JSON.stringify(JSON.parse(corpo), null, 2);
    expect(assinaturaConfere(reserializado, assinatura, SEGREDO)).toBe(false);
  });
});

describe("handshake de verificação", () => {
  const params = (o: Record<string, string>) => new URLSearchParams(o);

  it("devolve o desafio quando o token bate", () => {
    const r = respostaDaVerificacao(
      params({ "hub.mode": "subscribe", "hub.verify_token": SEGREDO, "hub.challenge": "1234" }),
      SEGREDO,
    );
    expect(r).toEqual({ ok: true, desafio: "1234" });
  });

  it("recusa token errado", () => {
    const r = respostaDaVerificacao(
      params({ "hub.mode": "subscribe", "hub.verify_token": "chute", "hub.challenge": "1234" }),
      SEGREDO,
    );
    expect(r.ok).toBe(false);
  });

  it("recusa modo diferente de subscribe", () => {
    const r = respostaDaVerificacao(
      params({ "hub.mode": "unsubscribe", "hub.verify_token": SEGREDO, "hub.challenge": "1" }),
      SEGREDO,
    );
    expect(r.ok).toBe(false);
  });

  it("FALHA FECHADO: sem segredo configurado, não verifica ninguém", () => {
    const r = respostaDaVerificacao(
      params({ "hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "1" }),
      undefined,
    );
    expect(r.ok).toBe(false);
  });
});

describe("ler a mensagem do payload", () => {
  it("acha o número e o texto", () => {
    expect(lerMensagem(payloadTexto("5518999998888", "8C6377"))).toEqual({
      de: "5518999998888",
      texto: "8C6377",
      id: "wamid.1",
    });
  });

  it("ignora recibo de entrega, que é o que mais chega", () => {
    const recibo = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: "wamid.1", status: "delivered", recipient_id: "5518999998888" }],
              },
            },
          ],
        },
      ],
    };
    expect(lerMensagem(recibo)).toBeNull();
  });

  it("ignora foto, áudio e figurinha", () => {
    const foto = payloadTexto();
    // @ts-expect-error mexendo no payload de propósito
    foto.entry[0].changes[0].value.messages[0] = { from: "5518999998888", id: "w", type: "image" };
    expect(lerMensagem(foto)).toBeNull();
  });

  it("não quebra com payload de outro formato", () => {
    expect(lerMensagem(null)).toBeNull();
    expect(lerMensagem({})).toBeNull();
    expect(lerMensagem({ entry: "nada" })).toBeNull();
    expect(lerMensagem({ entry: [{ changes: [{}] }] })).toBeNull();
    expect(lerMensagem("texto solto")).toBeNull();
  });

  it("recusa número que não parece número", () => {
    const p = payloadTexto();
    p.entry[0].changes[0].value.messages[0].from = "abc";
    expect(lerMensagem(p)).toBeNull();
  });

  it("corta texto gigante — ninguém precisa guardar um livro", () => {
    const m = lerMensagem(payloadTexto("5518999998888", "x".repeat(5000)));
    expect(m!.texto.length).toBe(2000);
  });
});

describe("o que a cliente quis dizer", () => {
  /**
   * ⚠️ Existia aqui uma intenção "codigo": seis caracteres soltos viravam
   * uma consulta ao horário da cliente.
   *
   * O código saiu do projeto inteiro a pedido do Kainã — era mais uma
   * coisa pra Karol decorar e explicar, e ela já acha qualquer cliente
   * pelo nome ou pelo telefone. Estes testes provam que aquilo virou
   * "outro", que é silêncio: quem responde conversa é ela.
   */
  it("o que parecia código agora é conversa comum", () => {
    expect(lerIntencao("8C6377")).toBe("outro");
    expect(lerIntencao("  8c6377 ")).toBe("outro");
  });

  it("cancelar continua vencendo qualquer coisa na mesma frase", () => {
    // o que a Karol precisa saber é que a pessoa quer cancelar
    expect(lerIntencao("quero cancelar o 8C6377")).toBe("cancelar");
  });

  it("reconhece remarcar", () => {
    expect(lerIntencao("dá pra remarcar?")).toBe("remarcar");
    expect(lerIntencao("preciso trocar de horário")).toBe("remarcar");
  });

  it("reconhece confirmação", () => {
    expect(lerIntencao("confirmo")).toBe("confirmar");
    expect(lerIntencao("ok")).toBe("confirmar");
  });

  it("telefone inteiro é conversa, não comando", () => {
    expect(lerIntencao("5518997525291")).toBe("outro");
  });

  it("conversa comum cai em 'outro' e vai pra Karol", () => {
    expect(lerIntencao("oi, você atende no sábado?")).toBe("outro");
  });
});

describe("botões", () => {
  /** Ela tocou num botão de mensagem interativa. */
  function payloadBotao(id: string, titulo: string) {
    return {
      entry: [{ changes: [{ value: { messages: [{
        from: "5518999998888",
        id: "wamid.botao",
        type: "interactive",
        interactive: { type: "button_reply", button_reply: { id, title: titulo } },
      }] } }] }],
    };
  }

  /** Ela tocou num botão de TEMPLATE — formato diferente, mesma ideia. */
  function payloadBotaoTemplate(payload: string, texto: string) {
    return {
      entry: [{ changes: [{ value: { messages: [{
        from: "5518999998888",
        id: "wamid.template",
        type: "button",
        button: { payload, text: texto },
      }] } }] }],
    };
  }

  it("lê o toque no botão interativo", () => {
    expect(lerMensagem(payloadBotao("cancelar", "❌ Cancelar"))).toEqual({
      de: "5518999998888",
      id: "wamid.botao",
      botao: "cancelar",
      texto: "❌ Cancelar",
    });
  });

  it("lê o toque no botão de template", () => {
    const m = lerMensagem(payloadBotaoTemplate("remarcar", "📅 Remarcar"));
    expect(m).toMatchObject({ botao: "remarcar", texto: "📅 Remarcar" });
  });

  it("o botão manda mais que o texto", () => {
    // "cancelar o horário, ou remarcar se der" nenhuma regex resolve;
    // o toque no botão resolve
    expect(lerIntencao("cancelar o horário, ou remarcar se der", "remarcar")).toBe("remarcar");
    expect(lerIntencao("qualquer coisa escrita", "confirmar")).toBe("confirmar");
    expect(lerIntencao("", "cancelar")).toBe("cancelar");
  });

  it("botão que a gente não conhece cai no texto", () => {
    expect(lerIntencao("quero cancelar", "botao_inventado")).toBe("cancelar");
    expect(lerIntencao("oi tudo bem", "botao_inventado")).toBe("outro");
  });

  it("sem botão, continua lendo o texto como antes", () => {
    expect(lerIntencao("quero cancelar")).toBe("cancelar");
    expect(lerIntencao("confirmo")).toBe("confirmar");
  });
});

/**
 * A entrega que a Meta recusou DEPOIS de aceitar o envio.
 *
 * ⚠️ ISTO CUSTOU UM DIA INTEIRO. Em 13/09 duas clientes não receberam
 * nada. O envio tinha sido ACEITO (a API respondeu 200 e deu um id), então
 * nenhum alerta de falha saiu — e o motivo de verdade chegou aqui, no
 * webhook, num campo que este arquivo chamava de "recibo de entrega, não é
 * mensagem" e descartava.
 *
 * Aceitar e entregar são dois momentos diferentes. Confundir os dois foi o
 * que fez a gente adivinhar por horas.
 */
describe("entrega que falhou", () => {
  const falha = (erro: Record<string, unknown>) => ({
    entry: [
      {
        changes: [
          {
            value: {
              statuses: [
                {
                  id: "wamid.XYZ",
                  status: "failed",
                  recipient_id: "5516997062339",
                  errors: [erro],
                },
              ],
            },
          },
        ],
      },
    ],
  });

  it("tira o número, o código e o motivo", () => {
    const r = lerFalhaDeEntrega(
      falha({
        code: 131030,
        title: "Re-engagement message",
        error_data: { details: "Recipient phone number not in allowed list" },
      }),
    );

    expect(r).toEqual({
      para: "5516997062339",
      codigo: 131030,
      motivo: "Recipient phone number not in allowed list",
    });
  });

  /*
    `details` ganha de `title` de propósito: "Message failed to send
    because more than 24 hours have passed" resolve o problema, "Re-
    engagement message" não diz nada pra quem está tentando entender.
  */
  it("prefere o detalhe ao título", () => {
    const r = lerFalhaDeEntrega(
      falha({ code: 131047, title: "Re-engagement message", error_data: { details: "24 hours" } }),
    );
    expect(r?.motivo).toBe("24 hours");
  });

  it("sem detalhe, fica com o título", () => {
    const r = lerFalhaDeEntrega(falha({ code: 470, title: "Message failed to send" }));
    expect(r?.motivo).toBe("Message failed to send");
  });

  /*
    ⚠️ `sent`, `delivered` e `read` chegam o tempo todo, pra TODA mensagem
    que dá certo. Se qualquer um deles virasse alerta, a Karol receberia
    uma dessas a cada mensagem enviada e desligaria o WhatsApp.
  */
  it.each(["sent", "delivered", "read"])("status %s não é falha", (status) => {
    const p = falha({ code: 1 });
    (p.entry[0].changes[0].value.statuses[0] as Record<string, unknown>).status = status;
    expect(lerFalhaDeEntrega(p)).toBeNull();
  });

  it.each([
    ["mensagem normal, não status", { entry: [{ changes: [{ value: { messages: [{ from: "1" }] } }] }] }],
    ["payload vazio", {}],
    ["nulo", null],
    ["texto solto", "opa"],
  ])("%s devolve null", (_, payload) => {
    expect(lerFalhaDeEntrega(payload)).toBeNull();
  });

  it("falha sem detalhe de erro nenhum ainda devolve o número", () => {
    const r = lerFalhaDeEntrega({
      entry: [{ changes: [{ value: { statuses: [{ status: "failed", recipient_id: "5518999998888" }] } }] }],
    });
    expect(r?.para).toBe("5518999998888");
    expect(r?.codigo).toBeNull();
  });
});
