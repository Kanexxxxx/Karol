import { describe, expect, it } from "vitest";
import {
  TAMANHO_CODIGO,
  codigoDoAgendamento,
  faixaDoCodigo,
  normalizarCodigo,
} from "./codigo";

describe("código do agendamento", () => {
  it("são os seis primeiros dígitos do uuid, em maiúsculo", () => {
    expect(codigoDoAgendamento("8c6377a1-9f2b-4c3d-8e1a-000000000000")).toBe("8C6377");
  });

  it("não muda quando o mesmo id é pedido de novo", () => {
    const id = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
    expect(codigoDoAgendamento(id)).toBe(codigoDoAgendamento(id));
  });

  it("tem sempre o tamanho combinado", () => {
    expect(codigoDoAgendamento("00000000-0000-0000-0000-000000000000"))
      .toHaveLength(TAMANHO_CODIGO);
  });

  it("não usa letras que se confundem com número", () => {
    // hexadecimal é 0-9a-f: não existe O nem I pra confundir com 0 e 1
    const codigo = codigoDoAgendamento("abcdef01-2345-4678-9abc-def012345678");
    expect(codigo).toMatch(/^[0-9A-F]+$/);
    expect(codigo).not.toMatch(/[OI]/);
  });
});

describe("normalizar o que a Karol digitou", () => {
  it("aceita minúscula", () => {
    expect(normalizarCodigo("8c6377")).toBe("8C6377");
  });

  it("aceita a sujeira que vem de copiar do WhatsApp", () => {
    expect(normalizarCodigo("  #8C6377 ")).toBe("8C6377");
    expect(normalizarCodigo("8C-63-77")).toBe("8C6377");
  });

  it("recusa o que não tem o tamanho de código", () => {
    expect(normalizarCodigo("8C63")).toBeNull();
    expect(normalizarCodigo("8C63779")).toBeNull();
    expect(normalizarCodigo("")).toBeNull();
  });

  it("recusa nome de cliente, que é o outro jeito de procurar", () => {
    expect(normalizarCodigo("Maria da Silva")).toBeNull();
  });

  it("recusa número de telefone", () => {
    expect(normalizarCodigo("5518997525291")).toBeNull();
  });

  it("não confunde letra de nome com hexadecimal", () => {
    // "Ana Beatriz" tem A, B, A, E, A — cinco dígitos hex, não seis
    expect(normalizarCodigo("Ana Beatriz")).toBeNull();
  });
});

describe("faixa de busca no banco", () => {
  it("cerca todos os uuids que começam com o código", () => {
    const { de, ate } = faixaDoCodigo("8C6377");
    expect(de).toBe("8c637700-0000-0000-0000-000000000000");
    expect(ate).toBe("8c6377ff-ffff-ffff-ffff-ffffffffffff");
  });

  it("o id de origem cai dentro da própria faixa", () => {
    const id = "8c6377a1-9f2b-4c3d-8e1a-5d6e7f809a0b";
    const { de, ate } = faixaDoCodigo(codigoDoAgendamento(id));
    // comparação de texto serve aqui: o uuid é hexadecimal de largura fixa,
    // então a ordem alfabética é a mesma ordem byte a byte do Postgres
    expect(id >= de).toBe(true);
    expect(id <= ate).toBe(true);
  });

  it("um id de outro código fica fora da faixa", () => {
    const { de, ate } = faixaDoCodigo("8C6377");
    const outro = "8c6378a1-9f2b-4c3d-8e1a-5d6e7f809a0b";
    expect(outro >= de && outro <= ate).toBe(false);
  });

  it("as duas pontas são uuids válidos", () => {
    const { de, ate } = faixaDoCodigo(codigoDoAgendamento("ffffffff-ffff-ffff-ffff-ffffffffffff"));
    const formato = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(de).toMatch(formato);
    expect(ate).toMatch(formato);
  });
});
