import { describe, expect, it } from "vitest";
import {
  horarioDaCidade,
  blocoDoAgendamento,
  deChave,
  expedienteDoDia,
  expedientesDoDia,
  horariosLivres,
  fatiarPorDia,
  MINUTOS_NO_DIA,
  paraChave,
  paraRotulo,
  primeiroDiaDisponivel,
  proximosDiasComVaga,
} from "./agenda";
import { buscarServico } from "@/data/servicos";
import { EXPEDIENTE, REGRAS } from "@/data/negocio";

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

describe("expedienteDoDia e expedientesDoDia", () => {
  it("segunda a sexta tem dois turnos em Pereira Barreto (7h–11h e 18h30–22h)", () => {
    const seg = segundaDistante();
    const exp = expedientesDoDia(seg);
    expect(exp).toHaveLength(2);
    expect(exp[0]).toMatchObject({ cidade: "pereira-barreto", inicio: 7 * 60, fim: 11 * 60 });
    expect(exp[1]).toMatchObject({ cidade: "pereira-barreto", inicio: 18.5 * 60, fim: 22 * 60 });
  });

  it("sábado é em Bandeirantes", () => {
    expect(expedienteDoDia(sabadoDistante())!.cidade).toBe("bandeirantes");
  });

  it("domingo é em Pereira Barreto, com os mesmos dois turnos da semana", () => {
    // Ela disse "domingo eu atendo o dia inteiro", e o Kainã confirmou em
    // 12/09/2026 que é 7h–11h e 18h30–22h, igual aos dias de semana.
    const dom = new Date(2099, 5, 7);
    while (dom.getDay() !== 0) dom.setDate(dom.getDate() + 1);
    const exp = expedientesDoDia(dom);
    expect(exp).toHaveLength(2);
    expect(exp[0]).toMatchObject({ cidade: "pereira-barreto", inicio: 7 * 60, fim: 11 * 60 });
    expect(exp[1]).toMatchObject({ cidade: "pereira-barreto", inicio: 18 * 60 + 30, fim: 22 * 60 });
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
  it("não oferece nada num dia em que a cidade não tem atendimento", () => {
    // Sábado em Pereira Barreto não tem atendimento (só em Bandeirantes)
    expect(
      horariosLivres({
        data: sabadoDistante(),
        servico: design,
        cidade: "pereira-barreto",
      }),
    ).toEqual([]);
  });

  it("não oferece horários fora do expediente nem no intervalo entre turnos", () => {
    const livres = horariosLivres({ data: segundaDistante(), servico: design });
    // Nada no intervalo fechado da tarde (11h às 18h30)
    expect(livres.some((h) => h.inicio >= 11 * 60 && h.inicio < 18.5 * 60)).toBe(false);
  });

  it("não oferece nada hoje nem no passado", () => {
    const agora = new Date(2026, 8, 3, 8, 0);
    const hoje = new Date(2026, 8, 3);
    expect(horariosLivres({ data: hoje, servico: design, agora })).toEqual([]);
  });

  it("num dia de semana livre, tem vagas de manhã (7h–11h) e à noite (18h30–22h)", () => {
    const livres = horariosLivres({ data: segundaDistante(), servico: design });
    const manha = livres.filter((h) => h.inicio < 12 * 60);
    const noite = livres.filter((h) => h.inicio >= 18 * 60);

    expect(manha[0]).toMatchObject({ inicio: 7 * 60, rotulo: "07:00", cidade: "pereira-barreto" });
    expect(manha.at(-1)!.inicio + 50).toBeLessThanOrEqual(11 * 60);

    /*
      ⚠️ A NOITE COMEÇA 19:00, E NÃO 18:30, desde 16/09/2026.

      O turno abre às 18:30, mas a grade só oferece hora cheia — pedido da
      Karol ("não horário quebrado"). Os trinta minutos entre 18:30 e
      19:00 deixaram de ser ofertados pelo site; ela continua podendo
      encaixar ali pelo painel. Ver `PASSO_MIN` em agenda.ts.
    */
    expect(noite[0]).toMatchObject({ inicio: 19 * 60, rotulo: "19:00", cidade: "pereira-barreto" });
    expect(noite.at(-1)!.inicio + 50).toBeLessThanOrEqual(22 * 60);

    // passo de uma hora, e sempre em hora cheia
    expect(manha[1].inicio - manha[0].inicio).toBe(60);
    for (const h of livres) expect(h.inicio % 60).toBe(0);
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
  it("devolve os próximos dias com vaga", () => {
    const agora = new Date(2099, 5, 1);
    const dias = proximosDiasComVaga({ servico: design, quantidade: 7, agora });
    expect(dias.length).toBe(7);
    for (const d of dias) {
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
   * A preocupação: a grade anda de hora em hora, mas os serviços duram de
   * 40 a 120 min. Se o motor só olhasse o passo da grade, um curso de 2h
   * marcado às 07:00 deixaria as 08:00 "livres" — e duas clientes cairiam
   * em cima uma da outra.
   *
   * ⚠️ O PASSO MAIOR NÃO RESOLVEU ISTO, e é bom deixar claro: com bloco de
   * 60 min, qualquer serviço que passe de uma hora continua atropelando a
   * vaga seguinte. A trava é o bloco, não o passo.
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
    const segunda = segundaDistante(); // 07:00 às 11:00 e 18:30 às 22:00
    for (const s of [design, lamination, curso]) {
      for (const h of horariosLivres({ data: segunda, servico: s })) {
        const fim = blocoDoAgendamento(h.inicio, s).fim;
        if (h.inicio < 12 * 60) {
          expect(fim).toBeLessThanOrEqual(11 * 60);
        } else {
          expect(fim).toBeLessThanOrEqual(22 * 60);
        }
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

describe("marcar às 08:30 bloqueia horários ANTES também", () => {
  /**
   * Isso parece bug e não é. O site mostra a hora de COMEÇAR, mas quem
   * decide a colisão é a hora de TERMINAR.
   *
   * Um design às 08:00 vai até 08:50 — vinte minutos dentro do atendimento
   * das 08:30. Duas clientes na cadeira ao mesmo tempo. Por isso some.
   *
   * ⚠️ O 08:30 OCUPADO NÃO SAI DA GRADE PÚBLICA — sai de um encaixe que a
   * Karol fez pelo painel. Desde 16/09 o site só oferece hora cheia (ver
   * `PASSO_MIN`), mas ela continua marcando em qualquer minuto pelo
   * painel, e a colisão precisa valer igual pros dois.
   */
  const segunda = segundaDistante();
  const ocupado = [blocoDoAgendamento(8 * 60 + 30, design)]; // 08:30 → 09:20
  const livres = horariosLivres({ data: segunda, servico: design, ocupados: ocupado })
    .map((h) => h.inicio);

  it("07:00 continua livre: termina 07:50, antes do agendado", () => {
    expect(livres).toContain(7 * 60);
  });

  it("08:00 some: terminaria 08:50, depois das 08:30", () => {
    expect(livres).not.toContain(8 * 60);
    expect(blocoDoAgendamento(8 * 60, design).fim).toBeGreaterThan(8 * 60 + 30);
  });

  /*
    ⚠️ E O DE DEPOIS TAMBÉM SOME. 09:00 parece livre — o atendimento
    começou 08:30 — mas ele só termina 09:20. Começar 09:00 seria entrar
    por cima dos últimos vinte minutos.
  */
  it("09:00 some: o atendimento só acaba 09:20", () => {
    expect(livres).not.toContain(9 * 60);
  });

  it("10:00 volta a ficar livre", () => {
    expect(livres).toContain(10 * 60);
  });

  it("some exatamente o que colide, nem um a mais", () => {
    const todos = horariosLivres({ data: segunda, servico: design }).length;
    expect(todos - livres.length).toBe(2);
  });
});

/**
 * O texto público do horário.
 *
 * ⚠️ Este bloco existe porque a função já foi CHUMBADA. Quando os turnos
 * da noite e do domingo entraram, uma versão escreveu
 * `if (cidade === "pereira-barreto") return "7h às 11h e 18h30..."` — o
 * que funciona no dia em que se escreve e vira mentira no dia em que ela
 * muda de horário. A agenda passaria a oferecer uma coisa e o site a
 * dizer outra, sem nada quebrar pra denunciar.
 */
describe("horarioDaCidade sai do EXPEDIENTE, não de texto escrito à mão", () => {
  it("cidade com um horário só diz só o horário", () => {
    // Bandeirantes é sábado e nada mais
    expect(horarioDaCidade("bandeirantes")).toBe("Sábado, 11h às 22h");
  });

  it("junta os dias que têm o mesmo horário num rótulo legível", () => {
    /*
      Com o domingo igual à semana, a versão anterior desta função
      escrevia "Seg, ter, qua, qui, sex, dom" — seis abreviações seguidas
      que ninguém lê. E isto aparece no site, na seção "Onde fica".
    */
    const t = horarioDaCidade("pereira-barreto");
    expect(t).toBe("Seg a sex e domingo, 7h às 11h e 19h às 22h");
    expect(t).not.toMatch(/qua, qui/);
  });

  /*
    ⚠️ O TEXTO ANUNCIA 19h, E O EXPEDIENTE DIZ 18h30. É de propósito.

    Ela abre 18:30 — e continua abrindo, porque é assim que ela encaixa
    alguém pelo painel. Mas a grade só oferece hora cheia desde 16/09, e a
    primeira da noite é 19:00.

    Anunciar "18h30 às 22h" mandava a cliente procurar um horário que não
    está na tela. Pior: o assistente valida contra a GRADE, então a Karol
    pedindo 18:30 ouvia "18:30 não cabe nesse dia — o horário é 18h30 às
    22h", que se contradiz na mesma frase. Aconteceu em 17/09/2026.
  */
  it("anuncia 19h, que é o que dá pra clicar — e não o 18h30 do EXPEDIENTE", () => {
    const t = horarioDaCidade("pereira-barreto");
    expect(t).toContain("19h às 22h");
    expect(t).not.toContain("18h30");
  });

  it("cada janela do EXPEDIENTE aparece no texto, começando na hora oferecida", () => {
    for (const cidade of ["pereira-barreto", "bandeirantes"] as const) {
      const texto = horarioDaCidade(cidade);
      const janelas = EXPEDIENTE.filter((e) => e.cidade === cidade);
      for (const j of janelas) {
        const h = (m: number) =>
          m % 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${Math.floor(m / 60)}h`;

        // a MESMA conta da grade: a primeira hora cheia do turno
        const abre = Math.ceil(j.inicio / 60) * 60;
        expect(texto).toContain(`${h(abre)} às ${h(j.fim)}`);
      }
    }
  });

  /*
    A trava que fecha o círculo: o que o texto ANUNCIA tem que ser um
    horário que a grade REALMENTE oferece. Se alguém mexer num dos dois
    sem o outro, este teste cai.
  */
  it("a hora anunciada existe mesmo na grade daquele dia", () => {
    for (const [cidade, dia] of [
      ["pereira-barreto", segundaDistante()],
      ["bandeirantes", sabadoDistante()],
    ] as const) {
      const texto = horarioDaCidade(cidade);
      const grade = horariosLivres({ data: dia, servico: design });
      const rotulos = grade.map((v) => `${Math.floor(v.inicio / 60)}h`);

      // toda abertura anunciada ("7h às 11h") tem que ter vaga nela
      for (const [, abre] of texto.matchAll(/(\d+h(?:\d{2})?) às/g)) {
        expect(rotulos).toContain(abre);
      }
    }
  });
});
