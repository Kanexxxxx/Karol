# PROGRESSO — Studio Karol Carvalho

> Diário de bordo pra quem pegar o projeto depois (humano ou outra sessão de IA).
> Cada etapa vira um commit. Aqui fica **o que foi feito, por quê e o que falta**.
> Detalhe de código está nos comentários dos arquivos; aqui é o mapa.

Última atualização: **2026-09-03** · Branch de trabalho: `main`

## Onde está agora (resumo)

As 5 etapas do plano estão feitas. `npm run build`, `npm run lint` e `npm test`
passam limpos. O que falta pra ir ao ar de verdade **não é código**:

1. Criar o projeto no Supabase e rodar `supabase/schema.sql`.
2. Preencher as env vars (ver `README.md` / `.env.example`).
3. Fechar as **pendências de negócio** com a Karol (lista no fim deste arquivo).
4. (Opcional) Ligar o webhook de notificação pra os WhatsApp saírem sozinhos.

Próximos passos naturais, se quiser continuar: PIX de sinal (`REGRAS.sinal`),
página de política de privacidade/LGPD, e-mail além de WhatsApp, e um teste de
integração do fluxo de agendamento.

---

## Visão geral do projeto

Site institucional + agenda online da Karol (maquiadora / designer de sobrancelhas,
atende em Pereira Barreto e Bandeirantes D'Oeste). Stack:

- **Next.js 16** (App Router) + **React 19** + **Tailwind 4**
- **Supabase** (Postgres) pra agenda — só acessado pelo servidor
- Sem libs de auth, sem ORM, sem lib de teste até a Etapa 5

⚠️ **Fuso do servidor.** O motor de horários (`agenda.ts`, `agendamentos.ts`,
`bloqueios.ts`) trabalha em **hora local do servidor** e assume que ela é a do
Brasil — é decisão do projeto, está nos comentários. Na Vercel/serverless o
default é UTC, então **defina `TZ=America/Sao_Paulo`** no ambiente de produção,
senão dia/hora saem 3h deslocados.

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
| 2 | Painel da Karol + login por senha | ✅ feito |
| 3 | Tela de bloqueios (férias / feriado) no painel | ✅ feito |
| 4 | Notificações (WhatsApp/e-mail + lembrete agendado) | ✅ feito (envio depende de webhook) |
| 5 | Polish: README, testes do motor, sitemap/robots, ícones | ✅ feito |
| 6 | Robustez do site: 404, erro, loading, menu no celular | ✅ feito |

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

## Etapa 2 — Painel da Karol (✅)

Painel em `/painel` pra Karol ver e mexer na agenda. Uma senha só
(`SENHA_PAINEL`), usada por ela e por quem testa.

**Arquivos novos:**

| Arquivo | Papel |
|---------|-------|
| `src/lib/sessao.ts` | Sessão sem biblioteca. Cookie `painel_sessao` = `<payload>.<HMAC-SHA256>` assinado com `SESSAO_SECRET`, carrega só a validade (7 dias). `tokenValido()` é puro (serve o proxy); `criarSessao/sessaoAtiva/encerrarSessao` usam `cookies()`. `senhaConfere()` compara em tempo constante. |
| `src/proxy.ts` | O antigo `middleware`. Barra `/painel/*` sem sessão → `/painel/login`; manda logado que abre `/painel/login` de volta pro painel. Só a 1ª linha — a página confere de novo. |
| `src/app/painel/login/page.tsx` + `Formulario.tsx` + `acoes.ts` | Login. Se faltar env, mostra o que configurar. Action `entrar` compara a senha (com 400 ms de atraso anti-brute-force) e cria a sessão. |
| `src/app/painel/page.tsx` | Agenda de ontem até +60 dias, agrupada por dia. Cada card: hora, serviço, cliente + link `wa.me`, cidade, valor, recado, selo de situação. Cabeçalho com "Sair". `force-dynamic`, `noindex`. |
| `src/app/painel/AcoesAgendamento.tsx` | Client. Botões que mudam a situação conforme o estado atual (ver `CAMINHOS`). Um `<form>` com vários `<button name="situacao" value="…">`, feedback inline via `useActionState`. |
| `src/app/painel/acoes.ts` | `alterarSituacao` (confere `sessaoAtiva()`, chama `mudarSituacao`, revalida) e `sair`. |

**Mudou:** `src/lib/agendamentos.ts` ganhou `mudarSituacao(id, situacao)` — valida
o id e a situação, trata o `23P01` (reativar num horário já retomado) com mensagem.

**Fluxo de situação:** `pendente → confirmado/cancelado` · `confirmado →
concluido/faltou/cancelado` · `cancelado/faltou → confirmado` (reativar) ·
`concluido` é ponto final.

**Decisões:**
- Sessão assinada em vez de sessão em banco: 2 pessoas, 1 senha, não vale a mesa extra.
- `node:crypto` no `proxy.ts` funciona porque o proxy roda no runtime Node por
  padrão no Next 16.
- Aprovação manual (`REGRAS.aprovacaoManual`) segue `false`, então na prática todo
  agendamento entra como `confirmado`. O caminho `pendente` no painel já está
  pronto pra quando ela ligar isso.

**Config necessária (`.env.local`):**
```
SENHA_PAINEL=<a senha que a Karol vai usar>
SESSAO_SECRET=<valor longo aleatório: openssl rand -base64 32>
```

**Testar:** `/painel` sem sessão → redireciona pro login. Senha certa → agenda.
"Sair" limpa o cookie. Sem `SENHA_PAINEL`/`SESSAO_SECRET`, o login explica o que falta.

**Rough edge conhecido:** a lista não faz paginação (60 dias cabem à vontade no
volume dela). Se um dia crescer, paginar por mês.

## Etapa 3 — Bloqueios (✅)

A tabela `bloqueios` já existia e `ocupadosNoPeriodo()` já somava os bloqueios
ao que está ocupado — o motor de horários **já respeitava**. Faltava só a Karol
poder criar/remover.

**Arquivos novos:**

| Arquivo | Papel |
|---------|-------|
| `src/lib/periodo.ts` | `lerPeriodo()` / `montarPeriodo()` — a ponte com o `tstzrange` do Postgres, agora num módulo só (sem `server-only`). `agendamentos.ts` passou a importar daqui (tinha uma cópia local + o literal `[a,b)` espalhado). |
| `src/lib/bloqueios.ts` | `listarBloqueios()` (só os que ainda não terminaram, ordenados), `criarBloqueio()` (dia inteiro **ou** intervalo com hora; valida motivo 2–200, datas, ordem), `removerBloqueio(id)`. |
| `src/app/painel/bloqueios/page.tsx` | Lista + formulário. Link ↔ `/painel`. |
| `src/app/painel/bloqueios/Formulario.tsx` | Client. Datas de/até, checkbox "só um intervalo do dia" que revela hora início/fim, motivo. Reseta no sucesso. |
| `src/app/painel/bloqueios/acoes.ts` | `adicionarBloqueio` (com estado, reconfere sessão) e `apagarBloqueio(id)` (bind por linha; sem sessão → volta pro login). |

**Mudou:** `src/app/painel/page.tsx` ganhou o link "Bloqueios" no cabeçalho.

**Modelo de dados:** dia inteiro é gravado como `[00:00 do 1º dia, 00:00 do dia
seguinte ao último)`. `Bloqueio.diaInteiro` é derivado (as duas pontas à meia-noite).

**Testar:** `/painel/bloqueios` → criar "Feriado" num dia → esse dia some de
`/agendar`. Intervalo parcial: marcar o checkbox, pôr 13:00–17:00.

## Etapa 4 — Notificações (✅, mas o envio real precisa de um webhook)

`NOTIFICACOES` em `src/data/negocio.ts` diz o que a Karol pediu. A parte de
**montar a mensagem e disparar o evento** está pronta. O **envio de WhatsApp**
em si precisa de um serviço externo — aqui a gente só faz `POST` num webhook
configurável e quem estiver do outro lado (n8n, Make, Zapier, função própria…)
manda a mensagem.

**Arquivos novos:**

| Arquivo | Papel |
|---------|-------|
| `src/lib/notificacoes.ts` | Templates (`textoParaKarol`, `textoConfirmacao`, `textoLembrete`, `textoAgradecimento`) e `enviarEvento(evento, dados)` — `POST` JSON pra `NOTIFICADOR_WEBHOOK_URL`, com timeout de 5s, **nunca lança**. Respeita os interruptores de `NOTIFICACOES`. |
| `src/lib/lembretes.ts` | `rodarLembretes()`: pega quem tem horário amanhã (`confirmado`) e quem foi atendida ontem (`concluido`), dispara os eventos. |
| `src/app/api/lembretes/route.ts` | GET/POST protegido por `Authorization: Bearer $CRON_SECRET`. Sem `CRON_SECRET` no ambiente, fica 401. |
| `vercel.json` | Cron diário às 12:00 UTC (09:00 BRT) chamando `/api/lembretes`. A Vercel injeta o header do `CRON_SECRET` sozinha. |
| `src/app/painel/notificacoes/` | Página no painel: mostra o que está ligado, se o webhook/cron existem, e um botão "disparar agora" (útil pra testar). |

**Mudou:**
- `criarAgendamento` (`agendamentos.ts`) agora dispara `novo-agendamento` (pra
  Karol) + `confirmacao` (pra cliente) logo depois de gravar.
- `agendamentos.ts` ganhou `agendamentosDeAmanha()` e `agendamentosConcluidosOntem()`.
- `painel/page.tsx`: link "Notificações".

**Formato do POST no webhook:**
```json
{
  "evento": "novo-agendamento | confirmacao | lembrete | agradecimento",
  "agendamento": { "id","cliente","whatsappCliente","servico","cidade","inicioISO","valorCentavos" },
  "mensagem": { "para": "<whatsapp destino>", "destinatario": "karol|cliente", "texto": "<texto pronto>" }
}
```

**Pra ligar de verdade:**
1. `NOTIFICADOR_WEBHOOK_URL` → endpoint que recebe o JSON e manda o WhatsApp.
2. `CRON_SECRET` (`openssl rand -hex 32`) nas env vars da Vercel → o cron passa a rodar.
3. Opcional: `KAROL_WHATSAPP` se o número de aviso for diferente do que está no site.

**Decisão:** o agradecimento sai só pra quem a Karol marcou como **Atendida** no
painel — não dá pra agradecer quem talvez não foi. Se ela não marcar, não sai.
O lembrete não tem esse problema (é véspera).

**Rough edge:** os templates estão só no lado Next. Se um dia o envio migrar pra
uma Edge Function do Supabase (Deno), ou os textos vão junto, ou o webhook passa
a renderizar. Hoje, com Vercel Cron, não há duplicação.

## Etapa 5 — Polish (✅)

- **`README.md`** reescrito (era o boilerplate do create-next-app): stack, setup,
  variáveis, estrutura de pastas, deploy.
- **Testes** — `vitest` adicionado (`npm test`). `src/lib/agenda.test.ts` cobre o
  motor de horários: formatação, ida-e-volta de data sem UTC, expediente por
  dia/cidade, antecedência mínima, `horariosLivres` com e sem ocupação, sábado em
  Bandeirantes, `proximosDiasComVaga` pulando domingo. 14 casos.
  - `vitest.config.ts` resolve o alias `@/` (sem plugin, só `resolve.alias`).
- **SEO** — `src/app/sitemap.ts` (só `/` e `/agendar`) e `src/app/robots.ts`
  (bloqueia `/painel`, `/agendar/confirmado`, `/api/`).
- **Ícone** — `src/app/icon.svg`, monograma "K" dourado. O `favicon.ico` default
  continua como fallback.

**Dependência nova:** `vitest` (só dev). É a primeira lib de teste do projeto;
`package.json` e `package-lock.json` mudaram por causa disso.

## Etapa 6 — Robustez do site (✅)

Buracos de experiência que o scaffold deixou.

| Arquivo | Papel |
|---------|-------|
| `src/app/not-found.tsx` | 404 com a cara do site (era a tela crua do Next). |
| `src/app/error.tsx` | Fronteira de erro global. Client Component. "Algo deu errado" + tentar de novo + WhatsApp. |
| `src/app/agendar/loading.tsx` | Esqueleto enquanto a disponibilidade carrega do Supabase. |
| `src/components/MenuMobile.tsx` | Menu hambúrguer no celular (o `<nav>` era `hidden lg:flex` — no celular não dava pra navegar entre as seções). Fecha no toque, no Esc e fora. |

**Bug corrigido:** o `Cabecalho` era sempre transparente com texto branco. Em
`/agendar` e `/agendar/confirmado` (fundo claro, sem foto) o "Karol Carvalho"
ficava branco sobre bege — quase invisível. Agora tem a prop `sobreHero`: só a
home passa `true`; as outras páginas usam a barra sólida com texto escuro.

---

## Pendências de negócio (precisam da Karol, não são código)

Marcadas com `A_CONFIRMAR` no código:
- **Domingo**: ela marcou no formulário mas não deu horário → fora da agenda.
- **Endereço em Bandeirantes D'Oeste**: desconhecido (`CIDADES.bandeirantes.local = null`).
- **Descrições dos serviços** (`src/data/servicos.ts`): rascunho, precisam do aval dela.
- **PIX de sinal**: ela quer, mas não detalhou → `REGRAS.sinal.ativo = false`.
- **Fotos de clientes**: autorização geral no briefing; conferir uma a uma antes de publicar.
