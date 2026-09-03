import { describe, expect, it } from "vitest";
import {
  blocoDoAgendamento,
  deChave,
  expedienteDoDia,
  horariosLivres,
  paraChave,
  paraRotulo,
  primeiroDiaDisponivel,
  proximosDiasComVaga,
} from "./agenda";
import { buscarServico } from "@/data/servicos";

const design = buscarServico("design-simples")!; // 40 min máx -> bloco de 50
const lamination = buscarServico("brow-lamination")!; // 90 min máx -> bloco de 100

/** Uma segunda-feira bem no futuro, sem esbarrar na antecedência mínima. */
function segundaDistante(): Date {
  const d = new Date(2099, 5, 1);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}

/** O sábado seguinte a uma data. */
function sabadoDistante(): Date {
  const d = new Date(2099, 5, 1);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d;
}

describe("paraRotulo", () => {
  it("formata minutos do dia como HH:MM", () => {
    expect(paraRotulo(0)).toBe("00:00");
    expect(paraRotulo(7 * 60 + 5)).toBe("07:05");
    expect(paraRotulo(11 * 60)).toBe("11:00");
    expect(paraRotulo(23 * 60 + 45)).toBe("23:45");
  });
});

describe("paraChave / deChave", () => {
  it("faz ida e volta preservando o dia local", () => {
    const d = new Date(2026, 8, 3); // 03/09/2026
    expect(paraChave(d)).toBe("2026-09-03");
    const volta = deChave("2026-09-03");
    expect(volta.getFullYear()).toBe(2026);
    expect(volta.getMonth()).toBe(8);
    expect(volta.getDate()).toBe(3);
  });

  it("não escorrega de dia perto da meia-noite (sem passar por UTC)", () => {
    const d = new Date(2026, 0, 1, 0, 30);
    expect(paraChave(d)).toBe("2026-01-01");
  });
});

describe("expedienteDoDia", () => {
  it("segunda a sexta é em Pereira Barreto, 7h–11h", () => {
    const seg = segundaDistante();
    const e = expedienteDoDia(seg);
    expect(e).not.toBeNull();
    expect(e!.cidade).toBe("pereira-barreto");
    expect(e!.inicio).toBe(7 * 60);
    expect(e!.fim).toBe(11 * 60);
  });

  it("sábado é em Bandeirantes", () => {
    expect(expedienteDoDia(sabadoDistante())!.cidade).toBe("bandeirantes");
  });

  it("domingo não atende", () => {
    const dom = new Date(2099, 5, 7);
    while (dom.getDay() !== 0) dom.setDate(dom.getDate() + 1);
    expect(expedienteDoDia(dom)).toBeNull();
  });
});

describe("primeiroDiaDisponivel", () => {
  it("é o dia seguinte, à meia-noite", () => {
    const hoje = new Date(2026, 8, 3, 14, 30);
    const d = primeiroDiaDisponivel(hoje);
    expect(paraChave(d)).toBe("2026-09-04");
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe("horariosLivres", () => {
  it("não oferece nada num dia que ela não atende", () => {
    const dom = new Date(2099, 5, 7);
    while (dom.getDay() !== 0) dom.setDate(dom.getDate() + 1);
    expect(horariosLivres({ data: dom, servico: design })).toEqual([]);
  });

  it("não oferece nada hoje nem no passado", () => {
    const agora = new Date(2026, 8, 3, 8, 0);
    const hoje = new Date(2026, 8, 3);
    expect(horariosLivres({ data: hoje, servico: design, agora })).toEqual([]);
  });

  it("num dia de semana livre, começa 07:00 e cabe o bloco inteiro antes das 11:00", () => {
    const livres = horariosLivres({ data: segundaDistante(), servico: design });
    expect(livres[0]).toMatchObject({ inicio: 7 * 60, rotulo: "07:00", cidade: "pereira-barreto" });
    // último começo + bloco (50) não passa das 11:00
    const ultimo = livres.at(-1)!;
    expect(ultimo.inicio + 50).toBeLessThanOrEqual(11 * 60);
    // passo de 15 min
    expect(livres[1].inicio - livres[0].inicio).toBe(15);
  });

  it("remove os horários que colidem com o que já está ocupado", () => {
    const dia = segundaDistante();
    const semNada = horariosLivres({ data: dia, servico: design });
    const comBloqueio = horariosLivres({
      data: dia,
      servico: design,
      ocupados: [{ inicio: 7 * 60, fim: 8 * 60 }],
    });
    expect(comBloqueio.length).toBeLessThan(semNada.length);
    // nada que comece antes das 08:00 sobrevive (o bloco encostaria no ocupado)
    expect(comBloqueio.every((h) => h.inicio >= 8 * 60 - 0)).toBe(true);
    expect(comBloqueio.some((h) => h.inicio < 8 * 60)).toBe(false);
  });

  it("sábado usa a janela de Bandeirantes (11h–22h)", () => {
    const livres = horariosLivres({ data: sabadoDistante(), servico: lamination });
    expect(livres[0]).toMatchObject({ inicio: 11 * 60, cidade: "bandeirantes" });
    expect(livres.at(-1)!.inicio + 100).toBeLessThanOrEqual(22 * 60);
  });
});

describe("proximosDiasComVaga", () => {
  it("pula domingo e devolve só dias com vaga", () => {
    const agora = new Date(2099, 5, 1);
    const dias = proximosDiasComVaga({ servico: design, quantidade: 6, agora });
    expect(dias.length).toBe(6);
    for (const d of dias) {
      expect(d.data.getDay()).not.toBe(0);
      expect(d.vagas).toBeGreaterThan(0);
    }
  });
});

describe("blocoDoAgendamento", () => {
  it("soma a duração máxima e o intervalo entre clientes", () => {
    expect(blocoDoAgendamento(7 * 60, design)).toEqual({ inicio: 420, fim: 470 });
    expect(blocoDoAgendamento(11 * 60, lamination)).toEqual({ inicio: 660, fim: 760 });
  });
});
