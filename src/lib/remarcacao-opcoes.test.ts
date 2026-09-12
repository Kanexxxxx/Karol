import { describe, expect, it, vi } from "vitest";

/**
 * Os horários que a cliente vê na lista de remarcação.
 *
 * ⚠️ Esta função nunca tinha sido testada de verdade — nos outros arquivos
 * ela é sempre substituída por um dublê. Foi assim que o defeito passou:
 * a lista chegava na cliente com 08:30, 08:45, 09:00, 09:15... sete
 * variações de quinze minutos da mesma manhã, porque o laço pegava os
 * primeiros livres em ordem. O Kainã viu numa conversa de teste.
 */

vi.mock("./agendamentos", () => ({
  gradeDoDiaNaAgenda: vi.fn(async () => grade()),
}));

import { horariosParaOferecer } from "./remarcacao";
import type { Agendamento } from "./agendamentos";

/** Um dia cheio de vagas: 7h–11h e 18h30–22h, de 15 em 15 minutos. */
function grade() {
  const vagas: { inicio: number; livre: boolean; cidade: string; rotulo: string }[] = [];
  const add = (de: number, ate: number) => {
    for (let m = de; m + 50 <= ate; m += 15) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      vagas.push({ inicio: m, livre: true, cidade: "pereira-barreto", rotulo: `${hh}:${mm}` });
    }
  };
  add(7 * 60, 11 * 60);
  add(18 * 60 + 30, 22 * 60);
  return vagas;
}

const AG = {
  id: "11111111-1111-4111-8111-111111111111",
  clienteNome: "Maria",
  clienteWhatsapp: "5518999998888",
  servicoId: "design-simples",
  servicoNome: "Design de sobrancelha",
  servicoPreco: 2500,
  cidade: "Pereira Barreto",
  inicio: new Date(2099, 0, 1, 9, 0),
  fim: new Date(2099, 0, 1, 9, 50),
  situacao: "confirmado" as const,
  observacao: null,
  avisado30minEm: null,
} as unknown as Agendamento;

describe("os horários oferecidos pra remarcar", () => {
  it("não oferece o mesmo pedaço do dia várias vezes", async () => {
    const opcoes = await horariosParaOferecer(AG);
    expect(opcoes.length).toBeGreaterThan(1);

    const porDia = new Map<string, Date[]>();
    for (const o of opcoes) {
      const d = new Date(o.inicioISO);
      const chave = d.toDateString();
      porDia.set(chave, [...(porDia.get(chave) ?? []), d]);
    }

    for (const [dia, horas] of porDia) {
      // no máximo dois por dia
      expect(horas.length, `${dia} veio com ${horas.length}`).toBeLessThanOrEqual(2);
      // e os dois nunca colados: 15 minutos de diferença não é escolha
      if (horas.length === 2) {
        const diferenca = Math.abs(horas[1].getTime() - horas[0].getTime()) / 60000;
        expect(diferenca, `${dia}: só ${diferenca} min entre as opções`).toBeGreaterThanOrEqual(90);
      }
    }
  });

  it("espalha por vários dias em vez de gastar tudo no primeiro", async () => {
    const opcoes = await horariosParaOferecer(AG);
    const dias = new Set(opcoes.map((o) => new Date(o.inicioISO).toDateString()));
    expect(dias.size).toBeGreaterThanOrEqual(3);
  });

  it("quando o dia tem manhã e noite, oferece uma de cada", async () => {
    const opcoes = await horariosParaOferecer(AG);
    const primeiroDia = new Date(opcoes[0].inicioISO).toDateString();
    const doDia = opcoes
      .map((o) => new Date(o.inicioISO))
      .filter((d) => d.toDateString() === primeiroDia);

    expect(doDia.some((d) => d.getHours() < 12)).toBe(true);
    expect(doDia.some((d) => d.getHours() >= 12)).toBe(true);
  });
});
