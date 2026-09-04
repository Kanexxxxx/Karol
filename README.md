# Studio Karol Carvalho

Site institucional + agenda online da Karol — maquiadora e designer de
sobrancelhas em **Pereira Barreto** e **Bandeirantes D'Oeste (SP)**.

A cliente escolhe serviço, dia e horário pelo site e o horário fica reservado na
hora. A Karol acompanha tudo por um painel próprio.

- **Stack:** Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase (Postgres)
- **Deploy:** Vercel

> ### 👉 Pegando o projeto agora? Leia [`PROGRESSO.md`](./PROGRESSO.md) primeiro.
>
> Este README é só o setup técnico. O **guia completo** — quem é a cliente, o
> que ela respondeu no briefing, os nove protótipos já feitos e rejeitados, de
> onde vieram as fotos, o que está pronto e o que falta — está no
> [`PROGRESSO.md`](./PROGRESSO.md). Sem ele você vai refazer trabalho que já
> existe.

> ⚠️ Este projeto usa **Next.js 16**, que tem mudanças de API em relação ao 15
> (`middleware` → `proxy`, `cookies()` assíncrono, etc.). Antes de mexer, veja
> [`AGENTS.md`](./AGENTS.md) e os docs em `node_modules/next/dist/docs/`.

---

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # e preencha (veja abaixo)
npm run dev                  # http://localhost:3000
```

O **site institucional funciona sem nenhuma variável**. Só a agenda (`/agendar`)
e o painel (`/painel`) precisam de configuração.

### Variáveis de ambiente

Todas em [`.env.example`](./.env.example). Em resumo:

| Variável | Pra quê | Obrigatória? |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Projeto Supabase | agenda + painel |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (secreta, só servidor) | agenda + painel |
| `SENHA_PAINEL` | Senha única de acesso ao `/painel` | painel |
| `SESSAO_SECRET` | Assina o cookie de sessão (`openssl rand -base64 32`) | painel |
| `KAROL_WHATSAPP` | Número que recebe o aviso de agendamento | não (usa o do site) |
| `NOTIFICADOR_WEBHOOK_URL` | Webhook que dispara os WhatsApp de verdade | não (sem ele, mensagens não saem) |
| `CRON_SECRET` | Protege `/api/lembretes` (a Vercel injeta o header) | só o cron |
| `TZ` | **`America/Sao_Paulo`** em produção | sim, na Vercel |

### Banco de dados

Rode [`supabase/schema.sql`](./supabase/schema.sql) **uma vez** no SQL Editor do
Supabase. Ele cria as tabelas `agendamentos` e `bloqueios`, a trava anti-conflito
(`sem_choque`) e as policies de RLS.

---

## Scripts

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run start    # sobe o build
npm run lint     # eslint
npm test         # vitest (motor de horários)
```

---

## Como está organizado

```
src/
  app/
    page.tsx              home (todas as seções)
    agendar/              fluxo público: serviço → dia → hora → dados → confirmado
    painel/               área da Karol (protegida por proxy.ts + sessão)
      page.tsx              agenda
      bloqueios/            férias, feriado, curso
      notificacoes/         status + disparo manual de lembretes
    api/lembretes/         rota chamada pelo cron diário
  components/             cabeçalho, rodapé, seções da home, UI compartilhada
  data/                   negocio.ts, servicos.ts, fotos.ts (fonte da verdade do conteúdo)
  lib/
    agenda.ts              motor de horários — função pura, sem Date por dentro
    agendamentos.ts        leitura/escrita da agenda (server-only)
    bloqueios.ts           CRUD de bloqueios
    sessao.ts              sessão do painel (cookie assinado, sem lib)
    notificacoes.ts        templates + webhook de notificação
    banco.ts               cliente Supabase (server-only)
  proxy.ts               protege /painel/*
supabase/schema.sql      esquema do banco
ferramentas/             scripts Python de processamento das fotos (uso único)
briefing/                scripts do Google Forms usados no briefing (uso único)
```

O conteúdo do site (preços, textos, horários, fotos) vem de `src/data/`. Regras
de negócio ainda pendentes de confirmação com a Karol estão marcadas
`A_CONFIRMAR` no código — ver `PROGRESSO.md`.

---

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Configure as variáveis de ambiente da tabela acima — **incluindo `TZ=America/Sao_Paulo`**.
3. O cron de lembretes (`vercel.json`) roda sozinho; ele só envia de verdade se
   `NOTIFICADOR_WEBHOOK_URL` e `CRON_SECRET` estiverem setados.
