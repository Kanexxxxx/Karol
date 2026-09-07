import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guarda contra a regra do `"use server"`.
 *
 * Um arquivo marcado `"use server"` só pode exportar **função assíncrona**.
 * Tipos somem na compilação e não incomodam; qualquer outro valor derruba o
 * módulo em produção com "A use server file can only export async functions".
 *
 * O que torna isso perigoso: `next build` NÃO reclama. O erro só aparece
 * quando um componente cliente importa o módulo, em produção — foi assim
 * que `/agendar` foi parar na tela de erro, com o site já no ar e a
 * `ESTADO_INICIAL` exportada de `agendar/acoes.ts` desde a primeira etapa.
 *
 * Este teste lê os arquivos como texto de propósito: importar um módulo
 * `"use server"` aqui não reproduz a regra, que é do bundler.
 */

const RAIZ = resolve(import.meta.dirname, "..");

function arquivosDe(pasta: string): string[] {
  const achados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) achados.push(...arquivosDe(caminho));
    else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome)) achados.push(caminho);
  }
  return achados;
}

const comUseServer = arquivosDe(RAIZ)
  .map((caminho) => ({ caminho, texto: readFileSync(caminho, "utf8") }))
  .filter(({ texto }) => /^\s*["']use server["']/.test(texto));

describe('arquivos "use server"', () => {
  it("existem, senão este teste não está guardando nada", () => {
    expect(comUseServer.length).toBeGreaterThan(0);
  });

  it("só exportam função assíncrona (tipos podem, valores não)", () => {
    const proibidos: string[] = [];

    for (const { caminho, texto } of comUseServer) {
      for (const [i, linha] of texto.split(/\r?\n/).entries()) {
        if (!/^export\b/.test(linha)) continue;
        // `export type` e `export interface` somem na compilação
        if (/^export\s+(type|interface)\b/.test(linha)) continue;
        if (/^export\s+async\s+function\b/.test(linha)) continue;

        proibidos.push(`${relative(RAIZ, caminho)}:${i + 1} → ${linha.trim()}`);
      }
    }

    // A mensagem lista o culpado: sem isso o erro em producao nao diz onde e.
    expect(proibidos, `exportação proibida em arquivo "use server":\n${proibidos.join("\n")}`)
      .toEqual([]);
  });
});

/**
 * O código do agendamento não pode voltar.
 *
 * ⚠️ Existia um "código" de seis caracteres derivado do uuid (`8C6377`).
 * Ele aparecia na confirmação da cliente, no aviso da Karol, na busca do
 * painel e como intenção do webhook.
 *
 * O Kainã pediu a remoção três vezes, e o motivo dele é o melhor tipo de
 * motivo — não é técnico, é de uso: **era mais uma coisa pra Karol decorar
 * e explicar pra cliente.** Ela já tem na mão as duas que resolvem, o nome
 * e o telefone de quem está falando com ela no WhatsApp. O link que chega
 * pra ela abre o painel já filtrado; ninguém digita nada.
 *
 * Isto é um teste de TEXTO porque a regra é sobre o vocabulário do
 * projeto, não sobre o retorno de uma função. Uma reintrodução começaria
 * exatamente assim: alguém acha útil "achar rápido pelo código" e cria o
 * módulo de novo.
 */
describe("o código do agendamento saiu do projeto", () => {
  const todos = arquivosDe(RAIZ).map((caminho) => ({
    caminho: relative(RAIZ, caminho),
    texto: readFileSync(caminho, "utf8"),
  }));

  it("existem arquivos pra varrer, senão o teste não guarda nada", () => {
    expect(todos.length).toBeGreaterThan(20);
  });

  it("nenhum arquivo importa um módulo de código", () => {
    const culpados = todos
      .filter(({ texto }) => /from\s+["'][^"']*\/codigo["']/.test(texto))
      .map(({ caminho }) => caminho);
    expect(culpados).toEqual([]);
  });

  it("ninguém deriva código a partir do id", () => {
    const culpados = todos
      .filter(({ texto }) => /codigoDoAgendamento|faixaDoCodigo|normalizarCodigo/.test(texto))
      .map(({ caminho }) => caminho);
    expect(culpados).toEqual([]);
  });

  /**
   * O link que a Karol recebe é o que a leva ao painel. Se ele voltar a
   * apontar pro id, a busca não acha nada — ela abriria uma tela vazia e
   * não teria como saber por quê.
   */
  it("o link do painel é montado com o telefone da cliente", () => {
    const fonte = readFileSync(join(RAIZ, "lib/notificacoes.ts"), "utf8");
    expect(fonte).toContain("linkDoPainel(a.whatsappCliente)");
    expect(fonte).not.toContain("linkDoPainel(a.id)");
  });
});
