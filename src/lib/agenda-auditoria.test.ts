import { describe, expect, it } from "vitest";
import { gradeDoDia } from "./agenda";
import { blocoNaAgenda, buscarServico, SERVICOS } from "@/data/servicos";
import { EXPEDIENTE, REGRAS } from "@/data/negocio";

/**
 * Auditoria da agenda — a pergunta que o Kainã fez três vezes.
 *
 * "Se agenda um horário às sete da manhã, os horários pra frente são
 * bloqueados E os de trás também. Isso faz sentido?"
 *
 * Faz, e este arquivo é a prova em vez da explicação. Ele varre a agenda
 * inteira e afirma o que não pode mudar sem alguém perceber:
 *
 * - às 07:00, que é o PRIMEIRO horário do dia, nada some "pra trás" —
 *   não existe nada atrás;
 * - no meio do dia somem horários dos dois lados, e isso está certo: o
 *   site mostra a hora de COMEÇAR, e quem decide a colisão é a hora de
 *   TERMINAR;
 * - nenhum horário oferecido termina depois do fim do expediente;
 * - o intervalo de 10 min que ela pediu entra em todos os serviços.
 */

/**
 * ⚠️ `agora` fixo de propósito. `gradeDoDia` recusa hoje e o passado, então
 * um teste que use datas reais passa hoje e quebra amanhã sozinho.
 */
const AGORA = new Date(2026, 8, 1, 9, 0);
const SEGUNDA = new Date(2026, 8, 7); // 07/09/2026 é segunda
const SABADO = new Date(2026, 8, 12); // 12/09/2026 é sábado
const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const design = buscarServico("design-simples")!;
const BLOCO = blocoNaAgenda(design); // 40 + 10 = 50

describe("a dúvida das 07:00", () => {
  it("no primeiro horário do dia, nada some pra trás", () => {
    const vazio = gradeDoDia({ data: SEGUNDA, servico: design, ocupados: [], agora: AGORA });
    const comAs7 = gradeDoDia({
      data: SEGUNDA,
      servico: design,
      ocupados: [{ inicio: 7 * 60, fim: 7 * 60 + BLOCO }],
      agora: AGORA,
    });

    // 07:00 é o primeiro: não existe horário anterior pra sumir
    expect(vazio[0].rotulo).toBe("07:00");

    const sumiram = vazio
      .filter((v) => v.livre)
      .filter((v) => !comAs7.find((c) => c.inicio === v.inicio)?.livre)
      .map((v) => v.rotulo);

    // todos os que sumiram são DEPOIS das 07:00, nenhum antes
    expect(sumiram.every((r) => r >= "07:00")).toBe(true);
    expect(sumiram[0]).toBe("07:00");
  });

  it("no meio do dia some dos dois lados — e está certo", () => {
    // alguém marcou 08:30. O de 07:45 termina 08:35, DENTRO do das 08:30.
    const ocupados = [{ inicio: 510, fim: 510 + BLOCO }]; // 08:30–09:20
    const grade = gradeDoDia({ data: SEGUNDA, servico: design, ocupados, agora: AGORA });

    const antes = grade.find((v) => v.rotulo === "07:45")!;
    expect(antes.livre).toBe(false);
    // a prova aritmética: 07:45 + 50 min = 08:35 > 08:30
    expect(465 + BLOCO).toBeGreaterThan(510);

    // e 07:30 SOBREVIVE, porque termina 08:20 — dez minutos antes,
    // que é exatamente o intervalo de arrumação que ela pediu
    const limite = grade.find((v) => v.rotulo === "07:30")!;
    expect(limite.livre).toBe(true);
    expect(430 + BLOCO).toBeLessThanOrEqual(510);
  });
});

describe("varredura de todos os serviços, nos dois expedientes", () => {
  it("nenhum horário oferecido termina depois do expediente", () => {
    const estouros: string[] = [];

    for (const expediente of EXPEDIENTE) {
      const data = expediente.dia === 6 ? SABADO : SEGUNDA;
      if (expediente.dia !== 6 && expediente.dia !== 1) continue; // 1 dia útil basta

      for (const servico of SERVICOS) {
        const grade = gradeDoDia({ data, servico, ocupados: [], agora: AGORA });
        for (const vaga of grade) {
          const fim = vaga.inicio + blocoNaAgenda(servico);
          if (fim > expediente.fim) {
            estouros.push(
              `${servico.nome} ${vaga.rotulo}→${hh(fim)} passa do fim (${hh(expediente.fim)})`,
            );
          }
        }
      }
    }

    expect(estouros, estouros.join("\n")).toEqual([]);
  });

  it("o intervalo de 10 min entra no bloco de todo serviço", () => {
    for (const s of SERVICOS) {
      expect(blocoNaAgenda(s)).toBe(s.duracaoMaxMin + REGRAS.intervaloMin);
    }
  });

  it("domingo não oferece nada", () => {
    const domingo = new Date(2026, 8, 13);
    expect(gradeDoDia({ data: domingo, servico: design, ocupados: [], agora: AGORA })).toEqual([]);
  });

  it("cada serviço cabe pelo menos uma vez no dia útil", () => {
    // se um serviço não cabe nem no dia vazio, ele nunca aparece pra ninguém
    for (const s of SERVICOS) {
      const grade = gradeDoDia({ data: SEGUNDA, servico: s, ocupados: [], agora: AGORA });
      expect(grade.filter((v) => v.livre).length, `${s.nome} não cabe em dia útil`)
        .toBeGreaterThan(0);
    }
  });

  it("dois agendamentos colados não deixam buraco impossível", () => {
    // 07:00–07:50 e 07:50–08:40. O próximo livre tem que ser 08:40 ou depois.
    const ocupados = [
      { inicio: 420, fim: 470 },
      { inicio: 470, fim: 520 },
    ];
    const livres = gradeDoDia({ data: SEGUNDA, servico: design, ocupados, agora: AGORA })
      .filter((v) => v.livre)
      .map((v) => v.inicio);

    expect(Math.min(...livres)).toBeGreaterThanOrEqual(520);
  });
});
