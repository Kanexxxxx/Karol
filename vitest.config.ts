import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const raiz = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(raiz, "src"),
      // `server-only` lança fora do runtime do Next; nos testes vira no-op.
      "server-only": resolve(raiz, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // O motor de horários trabalha em hora local; fixa o fuso como em produção
    // (ver TZ no README) pra os testes não dependerem da máquina.
    env: { TZ: "America/Sao_Paulo" },
  },
});
