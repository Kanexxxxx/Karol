<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Instruções para agentes — Studio Karol Carvalho

## Antes de mexer

- Leia `docs/estado-atual.md` e o documento do assunto (tabela abaixo).
- O código é a verdade; a documentação é lembrança. Divergiu → corrija o doc.

| Assunto | Arquivo |
|---|---|
| Regras do código, mapa, banco, testes | `docs/arquitetura.md` |
| WhatsApp e templates | `docs/whatsapp.md` · `docs/templates-whatsapp.md` |
| Assistente da Karol (IA) | `docs/assistente.md` |
| O que já quebrou no ar | `docs/incidentes.md` |
| Negócio e decisões | `docs/contexto.md` |
| VPS | `docs/vps.md` |

## Comandos

| Tarefa | Comando |
|---|---|
| Testar um arquivo | `npx vitest run src/lib/agenda.test.ts` |
| Suíte inteira | `npm test` |
| Lint de um arquivo | `npx eslint src/lib/agenda.ts` |
| Tipos | `npx next typegen && npx tsc --noEmit` (sem o typegen, `LayoutProps` não existe) |
| Build | `npm run build` |

## Regras que não se quebram

- `lib/atendente.ts` (clientes) nunca importa função que escreve na agenda. Não junte com `lib/assistente.ts`.
- A IA só muda a agenda depois do toque da Karol num botão.
- Conteúdo e regra de negócio só em `src/data/`.
- Telefone passa sempre por `lib/telefone.ts` (com DDI).
- Nunca invente dado de cliente pra satisfazer o banco: sem telefone é `null`.
- Nenhum rosto de cliente em `public/` (`sem-rosto-de-cliente.test.ts`).
- Nada que varia por mensagem entra em `lib/roteiro-do-assistente.ts` (quebra o cache e multiplica o custo).
- Template mudou na Meta → `templates-da-meta.test.ts`, `notificacoes.ts` e `docs/templates-whatsapp.md` no mesmo commit.
- Mover ou renomear arquivo de `src/` → ajuste os testes que leem código por caminho fixo.
- Dependência nova só com motivo forte.
- Migração nova: `supabase/migracao-NN-<nome>.sql`, idempotente, cabeçalho com o defeito que a originou, rodada **antes** do deploy.

## Produção

- Push na `main` faz deploy de produção na Vercel. Trabalhe em branch.
- Banco `Karol v1` (`radyfwowhmyeulfhhuco`) é produção com cliente real; `Karol v2` (`ugbpszsahtcbswueyeks`) é teste.
- `UPDATE`/`DELETE` em produção só com o Kainã mandando.
- Antes de commit, push ou SQL: confira pasta, branch e banco — pode haver outro chat no mesmo projeto.
- `BANCADA=1` liga testes que gastam crédito de IA de verdade. Só à mão.

## Documentação

- Pendência nova ou resolvida → edite `docs/estado-atual.md` no lugar.
- Incidente no ar → `docs/incidentes.md`. Decisão de negócio → `docs/contexto.md`.
- Não crie `.md` novo na raiz.

## Como o dono trabalha

- Português em tudo: código, comentários, commits e documentação.
- Plano antes de código. Meça antes de afirmar; diga o limite quando houver.
- Confira a tela no navegador antes de entregar visual.
- Commit em etapas, com mensagem que conta o porquê; push sempre (ele usa vários computadores).

## Commits de IA

Terminam com a linha de coautoria do agente:

```text
Co-Authored-By: <nome do modelo> <noreply@anthropic.com>
```
