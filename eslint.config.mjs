import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    /*
      As cópias de trabalho dos agentes (git worktree).

      Cada uma é o projeto inteiro de novo, com `.next` dentro. Sem esta
      linha o lint entra lá e acusa milhares de problemas que são só o
      mesmo código contado duas vezes — foi o que aconteceu: 6386
      "problemas" numa árvore limpa.
    */
    ".claude/**",
  ]),
]);

export default eslintConfig;
