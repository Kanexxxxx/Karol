# PROGRESSO — Studio Karol Carvalho

> Diário de bordo pra quem pegar o projeto depois (humano ou outra sessão de IA).
> Cada etapa vira um commit. Aqui fica **o que foi feito, por quê e o que falta**.
> Detalhe de código está nos comentários dos arquivos; aqui é o mapa.

Última atualização: **2026-09-03** · Branch de trabalho: `main`

---

## Visão geral do projeto

Site institucional + agenda online da Karol (maquiadora / designer de sobrancelhas,
atende em Pereira Barreto e Bandeirantes D'Oeste). Stack:

- **Next.js 16** (App Router) + **React 19** + **Tailwind 4**
- **Supabase** (Postgres) pra agenda — só acessado pelo servidor
- Sem libs de auth, sem ORM, sem lib de teste até a Etapa 5

⚠️ **Next 16 não é o Next que você conhece.** Mudanças que já morderam:
- `middleware.ts` virou **`proxy.ts`** (mesma API, nome novo).
- `cookies()` é **async**: `const c = await cookies()`.
- Server Actions são POST na própria rota — **sempre** valide auth dentro da action.
- `revalidatePath`/`revalidateTag` vêm de `next/cache`; `redirect` de `next/navigation`.
- Docs offline em `node_modules/next/dist/docs/` — leia antes de inventar API.

---

## Estado das etapas

| # | Etapa | Status |
|---|-------|--------|
| 1 | Destravar build + fluxo de agendamento grava no banco | ✅ feito |
| 2 | Painel da Karol + login por senha | ⬜ a fazer |
| 3 | Tela de bloqueios (férias / feriado) no painel | ⬜ a fazer |
| 4 | Notificações (WhatsApp/e-mail + lembrete agendado) | ⬜ a fazer |
| 5 | Polish: README, testes do motor, sitemap/robots, ícones | ⬜ a fazer |

---

## Etapa 1 — Fluxo de agendamento (✅)

**Problema:** `src/app/agendar/page.tsx` importava `./FormularioDados` e `./Passos`
que nunca foram commitados → `next build` quebrava. E `criarAgendamento()` existia
mas ninguém chamava — nenhum agendamento era gravado.

**O que foi criado:**

| Arquivo | Papel |
|---------|-------|
| `src/app/agendar/Passos.tsx` | Trilha visual dos 4 passos (Serviço → Dia → Hora → Dados). Server Component, puramente visual. |
| `src/app/agendar/acoes.ts` | Server Action `agendar(estado, formData)`. Valida nome/WhatsApp/recado, chama `criarAgendamento`, e em caso de sucesso faz `redirect('/agendar/confirmado?ag=<id>')`. Tipo `EstadoAgendar` + `ESTADO_INICIAL` exportados pro `useActionState`. |
| `src/app/agendar/FormularioDados.tsx` | Client Component com `useActionState`. Campos ocultos levam serviço/dia/hora. Mostra erro por campo e preserva o que foi digitado. |
| `src/app/agendar/confirmado/page.tsx` | Tela pós-agendamento. Lê `?ag=<id>`, busca no banco, mostra resumo + botão "Avisar a Karol no WhatsApp". `robots: noindex`, `force-dynamic`. |

**O que mudou em arquivo existente:**

- `src/lib/agendamentos.ts`
  - Novos helpers `lerPeriodo()` (parse do `tstzrange`) e `linhaParaAgendamento()`
    (linha do banco → tipo `Agendamento`), eliminando o regex repetido 3x.
  - Nova função `buscarAgendamento(id)` — usada pela tela de confirmação (e vai
    servir o painel na Etapa 2).
  - `agendaDaKarol()` agora usa `linhaParaAgendamento`.
- `.gitignore` — exceção `!.env.example`.
- `.env.example` — **novo**, documenta todas as variáveis (Supabase, senha do
  painel, segredo de sessão, WhatsApp da Karol).

**Decisões:**
- Validação manual (regex) em vez de Zod — mantém o projeto sem dependências novas.
  O check de WhatsApp (`^\d{10,13}$`) casa com o `CHECK` da tabela.
- A conferência de conflito continua sendo do banco (constraint `sem_choque`). A
  action só dá uma mensagem amigável quando o insert é recusado (código `23P01`).
- Tela de confirmação busca pelo id no banco em vez de confiar em query string —
  não dá pra forjar um agendamento na URL.

**Como testar localmente:**
1. `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
2. Rodar `supabase/schema.sql` uma vez no SQL Editor do Supabase.
3. `npm run dev` → `/agendar` → escolher serviço, dia, hora, preencher e confirmar.
4. Sem `.env.local` a página mostra "a agenda online está sendo ligada" (esperado).

**Pendências que sobraram desta etapa:** nenhuma bloqueante. O aviso pra Karol hoje
é um link `wa.me` que a **cliente** dispara; o disparo automático é a Etapa 4.

---

## Etapa 2 — Painel da Karol (⬜)

Plano: senha única em `SENHA_PAINEL`, cookie de sessão assinado (HMAC, sem lib),
`proxy.ts` protegendo `/painel/*`, e `verificarSessao()` chamado dentro de cada
action do painel (proxy não é fronteira de segurança sozinho).
Telas: login, lista da agenda (`agendaDaKarol`), ações confirmar/cancelar/concluir/faltou.

## Etapa 3 — Bloqueios (⬜)

Tabela `bloqueios` já existe. Falta CRUD no painel + `src/lib/bloqueios.ts`.

## Etapa 4 — Notificações (⬜)

`NOTIFICACOES` em `src/data/negocio.ts` lista o que a Karol pediu. Plano:
`src/lib/notificacoes.ts` com os templates + link `wa.me` pra Karol no momento do
agendamento; Edge Function `supabase/functions/lembretes/` + `pg_cron` pro lembrete
de 1 dia antes (documentado, envio real depende de credencial/serviço).

## Etapa 5 — Polish (⬜)

README de verdade, `src/app/sitemap.ts` + `robots.ts`, `icon.svg`, testes do
`src/lib/agenda.ts` (motor de horários — função pura, fácil de cobrir).

---

## Pendências de negócio (precisam da Karol, não são código)

Marcadas com `A_CONFIRMAR` no código:
- **Domingo**: ela marcou no formulário mas não deu horário → fora da agenda.
- **Endereço em Bandeirantes D'Oeste**: desconhecido (`CIDADES.bandeirantes.local = null`).
- **Descrições dos serviços** (`src/data/servicos.ts`): rascunho, precisam do aval dela.
- **PIX de sinal**: ela quer, mas não detalhou → `REGRAS.sinal.ativo = false`.
- **Fotos de clientes**: autorização geral no briefing; conferir uma a uma antes de publicar.
