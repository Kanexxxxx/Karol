import { describe, expect, it } from "vitest";
import { lerPeriodo, montarPeriodo } from "./periodo";

describe("lerPeriodo", () => {
  it("lê o formato que o Postgres devolve, com aspas", () => {
    const p = lerPeriodo('["2026-09-01 08:00:00+00","2026-09-01 09:00:00+00")');
    expect(p).not.toBeNull();
    expect(p!.inicio.toISOString()).toBe("2026-09-01T08:00:00.000Z");
    expect(p!.fim.toISOString()).toBe("2026-09-01T09:00:00.000Z");
  });

  it("lê o formato ISO sem aspas", () => {
    const p = lerPeriodo("[2026-09-01T08:00:00.000Z,2026-09-01T09:30:00.000Z)");
    expect(p!.inicio.getUTCHours()).toBe(8);
    expect(p!.fim.getUTCMinutes()).toBe(30);
  });

  it("devolve null pra texto sem duas datas", () => {
    expect(lerPeriodo("")).toBeNull();
    expect(lerPeriodo("sem virgula aqui")).toBeNull();
  });

  it("devolve null quando as datas não fazem sentido", () => {
    expect(lerPeriodo("[banana,maçã)")).toBeNull();
  });
});

describe("montarPeriodo", () => {
  it("monta o literal [inicio,fim) em ISO", () => {
    const i = new Date("2026-09-01T08:00:00Z");
    const f = new Date("2026-09-01T09:00:00Z");
    expect(montarPeriodo(i, f)).toBe("[2026-09-01T08:00:00.000Z,2026-09-01T09:00:00.000Z)");
  });

  it("ida e volta com lerPeriodo", () => {
    const i = new Date("2027-01-05T13:00:00Z");
    const f = new Date("2027-01-05T17:00:00Z");
    const p = lerPeriodo(montarPeriodo(i, f))!;
    expect(p.inicio.getTime()).toBe(i.getTime());
    expect(p.fim.getTime()).toBe(f.getTime());
  });
});
