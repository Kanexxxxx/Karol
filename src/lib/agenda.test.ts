import { describe, expect, it } from "vitest";
import {
  blocoDoAgendamento,
  deChave,
  expedienteDoDia,
  horariosLivres,
  fatiarPorDia,
  MINUTOS_NO_DIA,
  paraChave,
  paraRotulo,
  primeiroDiaDisponivel,
  proximosDiasComVaga,
} from "./agenda";
import { buscarServico } from "@/data/servicos";
import { REGRAS } from "@/data/negocio";

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

describe("fatiarPorDia", () => {
  // A regressão que motivou esta função: um bloqueio de dia fechado é
  // gravado como [dia 00:00, dia seguinte 00:00). Achatar as duas pontas
  // com getHours() dava {0, 0} — intervalo vazio, que não bloqueava nada.
  it("dia fechado vira o dia inteiro, não um intervalo vazio", () => {
    const fatias = fatiarPorDia(new Date(2099, 5, 10), new Date(2099, 5, 11));
    expect(fatias).toEqual([{ chave: "2099-06-10", inicio: 0, fim: MINUTOS_NO_DIA }]);
  });

  it("férias de vários dias marcam todos os dias, não só o primeiro", () => {
    const fatias = fatiarPorDia(new Date(2099, 5, 10), new Date(2099, 5, 13));
    expect(fatias.map((f) => f.chave)).toEqual(["2099-06-10", "2099-06-11", "2099-06-12"]);
    for (const f of fatias) expect(f).toMatchObject({ inicio: 0, fim: MINUTOS_NO_DIA });
  });

  it("intervalo dentro de um dia fica como está", () => {
    const de = new Date(2099, 5, 10, 13, 0);
    const ate = new Date(2099, 5, 10, 17, 30);
    expect(fatiarPorDia(de, ate)).toEqual([
      { chave: "2099-06-10", inicio: 780, fim: 1050 },
    ]);
  });

  it("período que atravessa a meia-noite recorta as pontas", () => {
    const de = new Date(2099, 5, 10, 22, 0);
    const ate = new Date(2099, 5, 12, 9, 30);
    expect(fatiarPorDia(de, ate)).toEqual([
      { chave: "2099-06-10", inicio: 1320, fim: MINUTOS_NO_DIA },
      { chave: "2099-06-11", inicio: 0, fim: MINUTOS_NO_DIA },
      { chave: "2099-06-12", inicio: 0, fim: 570 },
    ]);
  });

  it("período vazio ou invertido não gera fatia", () => {
    const d = new Date(2099, 5, 10);
    expect(fatiarPorDia(d, d)).toEqual([]);
    expect(fatiarPorDia(new Date(2099, 5, 11), new Date(2099, 5, 10))).toEqual([]);
  });
});

describe("bloqueio somado ao motor de horários", () => {
  // A costura que faltava: bloqueios.ts sabia gravar e agenda.ts sabia
  // calcular, mas ninguém testava os dois juntos — e era exatamente ali
  // que o feriado se perdia.
  it("um feriado de dia fechado zera os horários daquele dia", () => {
    const segunda = segundaDistante();
    const amanha = new Date(segunda);
    amanha.setDate(amanha.getDate() + 1);

    expect(horariosLivres({ data: segunda, servico: design }).length).toBeGreaterThan(0);

    const ocupados = fatiarPorDia(segunda, amanha).map((f) => ({
      inicio: f.inicio,
      fim: f.fim,
    }));
    expect(horariosLivres({ data: segunda, servico: design, ocupados })).toEqual([]);
  });

  it("bloqueio de 13h em diante deixa só a manhã livre", () => {
    const sabado = sabadoDistante(); // Bandeirantes, 11h às 22h
    const ocupados = fatiarPorDia(
      new Date(sabado.getFullYear(), sabado.getMonth(), sabado.getDate(), 13, 0),
      new Date(sabado.getFullYear(), sabado.getMonth(), sabado.getDate() + 1),
    ).map((f) => ({ inicio: f.inicio, fim: f.fim }));

    const livres = horariosLivres({ data: sabado, servico: design, ocupados });
    expect(livres.length).toBeGreaterThan(0);
    for (const h of livres) expect(h.inicio).toBeLessThan(13 * 60);
  });
});

describe("serviços de durações diferentes não colidem", () => {
  /**
   * A preocupação: a grade anda de 15 em 15 minutos, mas os serviços duram
   * de 40 a 120 min. Se o motor só olhasse o passo da grade, um curso de
   * 2h marcado às 07:00 deixaria as 07:15 "livres" — e duas clientes
   * cairiam em cima uma da outra.
   *
   * O que segura isso é `blocoNaAgenda`: o bloco ocupado é a duração MÁXIMA
   * do serviço mais o intervalo entre clientes, não o passo da grade.
   */
  const curso = buscarServico("curso-automaquiagem")!; // 120 + 10 = 130

  it("um curso às 07:00 fecha a manhã inteira pros outros serviços", () => {
    const segunda = segundaDistante();
    const ocupado = [blocoDoAgendamento(7 * 60, curso)]; // 07:00 → 09:10

    for (const s of [design, lamination, curso]) {
      const livres = horariosLivres({ data: segunda, servico: s, ocupados: ocupado });
      for (const h of livres) {
        const bloco = blocoDoAgendamento(h.inicio, s);
        // nada pode começar antes de 09:10, nem invadir o bloco do curso
        expect(bloco.inicio).toBeGreaterThanOrEqual(9 * 60 + 10);
      }
    }
  });

  it("o intervalo entre clientes é respeitado, não só a duração", () => {
    // design ocupa 40 min de trabalho + 10 de intervalo = 50
    const bloco = blocoDoAgendamento(7 * 60, design);
    expect(bloco.fim - bloco.inicio).toBe(design.duracaoMaxMin + REGRAS.intervaloMin);

    const segunda = segundaDistante();
    const livres = horariosLivres({ data: segunda, servico: design, ocupados: [bloco] });
    // 07:45 ainda está dentro do intervalo; o primeiro livre é 07:50 ou depois
    expect(Math.min(...livres.map((h) => h.inicio))).toBeGreaterThanOrEqual(bloco.fim);
  });

  it("nenhum horário oferecido ultrapassa o fim do expediente", () => {
    const segunda = segundaDistante(); // 07:00 às 11:00
    for (const s of [design, lamination, curso]) {
      for (const h of horariosLivres({ data: segunda, servico: s })) {
        expect(blocoDoAgendamento(h.inicio, s).fim).toBeLessThanOrEqual(11 * 60);
      }
    }
  });

  it("dois horários livres seguidos nunca se sobrepõem quando tomados", () => {
    const sabado = sabadoDistante();
    const livres = horariosLivres({ data: sabado, servico: lamination });
    // pega o primeiro, e o próximo que ainda sobra depois dele
    const primeiro = blocoDoAgendamento(livres[0].inicio, lamination);
    const restantes = horariosLivres({
      data: sabado,
      servico: lamination,
      ocupados: [primeiro],
    });
    const segundo = blocoDoAgendamento(restantes[0].inicio, lamination);
    expect(segundo.inicio).toBeGreaterThanOrEqual(primeiro.fim);
  });
});
