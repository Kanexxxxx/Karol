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
