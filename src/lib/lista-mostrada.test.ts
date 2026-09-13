import { describe, expect, it } from "vitest";
import {
  ehLembreteDeLista,
  juntarMostrados,
  lembreteDaLista,
  type ItemMostrado,
} from "./lista-mostrada";

const item = (id: string, cliente: string): ItemMostrado => ({
  id,
  cliente,
  servico: "Sobrancelha",
  quando: "sexta, 18/09 às 07:30",
});

describe("montar o lembrete", () => {
  it("numera na ordem em que ela viu, e carrega o id de cada um", () => {
    const texto = lembreteDaLista([
      item("11111111-1111-1111-1111-111111111111", "Ana Paula"),
      item("22222222-2222-2222-2222-222222222222", "Beatriz Souza"),
    ])!;

    expect(texto).toContain("1) Ana Paula");
    expect(texto).toContain("2) Beatriz Souza");
    expect(texto).toContain("11111111-1111-1111-1111-111111111111");
    expect(texto).toContain("22222222-2222-2222-2222-222222222222");
  });

  /*
    A numeração é o ponto do arquivo: é ela que faz "cancela a segunda"
    apontar pra pessoa certa. Se a ordem embaralhar, o assistente cancela
    o horário errado com convicção total.
  */
  it("a segunda da lista é a segunda que ela viu", () => {
    const texto = lembreteDaLista([
      item("aaaaaaaa-0000-0000-0000-000000000001", "Ana"),
      item("bbbbbbbb-0000-0000-0000-000000000002", "Bia"),
      item("cccccccc-0000-0000-0000-000000000003", "Clara"),
    ])!;

    const segunda = texto.split("\n").find((l) => l.startsWith("2)"));
    expect(segunda).toContain("Bia");
    expect(segunda).toContain("bbbbbbbb-0000-0000-0000-000000000002");
  });

  it("sem nada mostrado, não há lembrete", () => {
    expect(lembreteDaLista([])).toBeNull();
  });

  /*
    Um sábado cheio passa de 40 atendimentos. Despejar tudo empurraria a
    conversa de verdade pra fora da memória de 30 falas.
  */
  it("corta em dez e diz quantos ficaram de fora", () => {
    const muitos = Array.from({ length: 14 }, (_, n) =>
      item(`${String(n).padStart(8, "0")}-0000-0000-0000-000000000000`, `Cliente ${n}`),
    );

    const texto = lembreteDaLista(muitos)!;

    expect(texto).toContain("10) Cliente 9");
    expect(texto).not.toContain("11) ");
    expect(texto).toContain("e mais 4");
  });

  it("o lembrete se identifica, pra poder ser descartado depois", () => {
    const texto = lembreteDaLista([item("11111111-1111-1111-1111-111111111111", "Ana")])!;

    expect(ehLembreteDeLista(texto)).toBe(true);
    expect(ehLembreteDeLista("Sexta você tem três clientes.")).toBe(false);
    expect(ehLembreteDeLista("[sistema] Botão de confirmação enviado: CANCELAR")).toBe(false);
  });
});

describe("juntar o que as leituras trouxeram", () => {
  it("pega os agendamentos de dentro do resultado", () => {
    const acumulado: ItemMostrado[] = [];

    juntarMostrados(acumulado, {
      quantos: 1,
      agendamentos: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          cliente: "Ana Paula",
          servico: "Design com henna",
          quando: "sexta, 18/09 às 07:30",
          telefone: "(18) 99999-8888",
        },
      ],
    });

    expect(acumulado).toEqual([
      {
        id: "11111111-1111-1111-1111-111111111111",
        cliente: "Ana Paula",
        servico: "Design com henna",
        quando: "sexta, 18/09 às 07:30",
      },
    ]);
  });

  /*
    "quem vem sexta" e depois "procura a Ana" trazem a Ana duas vezes. Com
    ela repetida, "cancela a segunda" aponta pro lugar errado.
  */
  it("não repete quem já está na lista", () => {
    const acumulado: ItemMostrado[] = [];
    const ana = {
      id: "11111111-1111-1111-1111-111111111111",
      cliente: "Ana",
      servico: "Sobrancelha",
      quando: "sexta",
    };

    juntarMostrados(acumulado, { agendamentos: [ana, { ...ana, id: "22222222-2222-2222-2222-222222222222" }] });
    juntarMostrados(acumulado, { agendamentos: [ana] });

    expect(acumulado).toHaveLength(2);
  });

  it.each([
    ["horários livres", { dia: "2026-09-18", horarios: ["08:15", "09:45"] }],
    ["resumo do mês", { faturamento: "R$ 1.840,00", atendidas: 23 }],
    ["um erro", { erro: "Preciso de pelo menos 3 letras." }],
    ["nada", null],
    ["texto solto", "qualquer coisa"],
  ])("ignora resultado sem agendamento: %s", (_, dados) => {
    const acumulado: ItemMostrado[] = [];
    juntarMostrados(acumulado, dados);
    expect(acumulado).toEqual([]);
  });

  it("ignora item sem id — sem id ele não serve pra nada aqui", () => {
    const acumulado: ItemMostrado[] = [];
    juntarMostrados(acumulado, { agendamentos: [{ cliente: "Ana" }, null, 7] });
    expect(acumulado).toEqual([]);
  });
});
