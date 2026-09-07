import { describe, expect, it } from "vitest";
import { formatarWhatsapp, normalizarWhatsapp } from "./telefone";

/**
 * O caso que motivou este arquivo, em 06/09/2026:
 *
 * O primeiro agendamento de verdade gravou `16991557552`, sem o 55. A Meta
 * manda o remetente como `5516991557552`. O webhook procurou por igualdade,
 * não achou, e responderia "não achei nenhum horário nesse número" pra
 * cliente que acabou de marcar.
 */

describe("normalizar o WhatsApp", () => {
  it("põe o DDI quando veio só o DDD — o bug que quebrou o webhook", () => {
    expect(normalizarWhatsapp("16991557552")).toBe("5516991557552");
  });

  it("o que sai daqui bate com o que a Meta manda", () => {
    const daMeta = "5516991557552";
    expect(normalizarWhatsapp("(16) 99155-7552")).toBe(daMeta);
    expect(normalizarWhatsapp("16 99155 7552")).toBe(daMeta);
    expect(normalizarWhatsapp("+55 16 99155-7552")).toBe(daMeta);
    expect(normalizarWhatsapp("16991557552")).toBe(daMeta);
  });

  it("não mexe em número que já veio certo", () => {
    expect(normalizarWhatsapp("5516991557552")).toBe("5516991557552");
  });

  it("tira o zero que muita gente põe antes do DDD", () => {
    expect(normalizarWhatsapp("016991557552")).toBe("5516991557552");
    expect(normalizarWhatsapp("0 16 99155-7552")).toBe("5516991557552");
  });

  it("aceita fixo de 8 dígitos", () => {
    expect(normalizarWhatsapp("1832721234")).toBe("551832721234");
    expect(normalizarWhatsapp("551832721234")).toBe("551832721234");
  });

  it("recusa o que não é telefone", () => {
    expect(normalizarWhatsapp("")).toBeNull();
    expect(normalizarWhatsapp("123")).toBeNull();
    expect(normalizarWhatsapp("abcdefghij")).toBeNull();
    expect(normalizarWhatsapp("9915575")).toBeNull();
  });

  it("recusa número comprido demais pra ser telefone", () => {
    expect(normalizarWhatsapp("551699155755212345")).toBeNull();
  });

  it("o resultado sempre cabe no CHECK da tabela", () => {
    // agendamentos.cliente_whatsapp: ^[0-9]{10,13}$
    for (const entrada of ["16991557552", "(16) 99155-7552", "1832721234", "5516991557552"]) {
      const n = normalizarWhatsapp(entrada)!;
      expect(n).toMatch(/^[0-9]{10,13}$/);
    }
  });
});

describe("formatar pra tela", () => {
  it("mostra do jeito que se lê", () => {
    expect(formatarWhatsapp("5516991557552")).toBe("(16) 99155-7552");
    expect(formatarWhatsapp("551832721234")).toBe("(18) 3272-1234");
  });

  it("normalizado sempre formata — era o sintoma visível do bug", () => {
    const n = normalizarWhatsapp("16991557552")!;
    expect(formatarWhatsapp(n)).toBe("(16) 99155-7552");
  });

  it("devolve o cru em vez de inventar quando não reconhece", () => {
    // número errado na tela é pior que número feio
    expect(formatarWhatsapp("123")).toBe("123");
  });
});
