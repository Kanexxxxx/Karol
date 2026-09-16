# Studio Karol Carvalho

Sistema de agendamento para profissional autônoma — site público, agenda
online, pagamento de entrada por PIX e atendimento automático no WhatsApp.

Feito para a Karol, maquiadora e designer de sobrancelhas em **Pereira Barreto**
e **Bandeirantes D'Oeste (SP)**, e escrito para servir de base a qualquer
negócio de atendimento por hora marcada.

- **Stack:** Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase (Postgres)
- **Mensagens:** WhatsApp Cloud API (Meta)
- **Assistente:** DeepSeek, com OpenAI de reserva
- **Deploy:** Vercel

---

## O que o sistema faz

**Para a cliente**

1. Escolhe serviço, dia e hora no site — a grade já respeita o expediente, a
   cidade do dia, a duração de cada procedimento e o intervalo entre pessoas.
2. Recebe a confirmação no WhatsApp na hora, com endereço e preparo.
3. Em serviços acima de um valor mínimo, recebe o **PIX da entrada** com o valor
   já embutido no QR Code e no copia e cola. O horário fica reservado por um
   prazo; passou, volta pra agenda sozinho.
4. Manda o comprovante pelo WhatsApp e é avisada quando ele é aceito.
5. Pede pra remarcar por botão, escolhe um horário livre numa lista — e o
   horário antigo continua valendo até a profissional aprovar.

**Para a profissional**

- **Painel** no celular: agenda por período, busca por nome ou telefone,
  confirmar pagamento, marcar quem veio e quem faltou, bloquear dias.
- **Relatório mensal**: faturamento, ticket médio, faltas, quem voltou,
  comparação com o mês anterior.
- **Assistente no WhatsApp**: ela escreve como escreveria pra uma secretária
  (*"como tá a agenda amanhã?"*, *"cancela a da Ana"*) e a IA responde com a
  agenda na mão.

---

## A regra que sustenta o resto

> **A agenda só muda depois de um toque humano.**

A IA nunca escreve na agenda. Ela monta uma proposta, manda um botão, e a
mudança só acontece quando a profissional confirma. Isso é garantido por
código, não por instrução no prompt:

- `atendente.ts` — o caminho das **clientes** — tem um teste que lê o próprio
  código-fonte e reprova se ele importar qualquer função que escreva na agenda;
- `executar()` só é alcançável a partir do toque no botão, e um teste conta as
  chamadas pra impedir que apareça um segundo caminho;
- toda proposta é guardada com prazo de validade e reservada contra toque duplo.

O motivo é simples: um modelo de linguagem entende *"cancela a de amanhã"* e
cancela a pessoa errada com convicção total, sem nenhum erro na tela. Quem
descobre é a cliente, na porta.

---

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # e preencha (veja abaixo)
npm run dev                  # http://localhost:3000
```

O **site institucional funciona sem nenhuma variável**. Agenda, painel, WhatsApp
e assistente ligam por partes, conforme as variáveis existirem — nada quebra
enquanto faltar alguma, a funcionalidade só não acontece.

### Variáveis de ambiente

Todas em [`.env.example`](./.env.example).

| Variável | Pra quê | Sem ela |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Projeto Supabase | agenda e painel não funcionam |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (**secreta**, só servidor) | idem |
| `SENHA_PAINEL` | Senha de acesso ao `/painel` | painel fechado |
| `SESSAO_SECRET` | Assina o cookie de sessão (`openssl rand -base64 32`) | idem |
| `META_TOKEN` | Token da WhatsApp Cloud API | nenhuma mensagem sai |
| `META_PHONE_NUMBER_ID` | Número remetente na Meta | idem |
| `META_APP_SECRET` | Confere a assinatura do webhook | o que a cliente responde não chega |
| `META_VERIFY_TOKEN` | Handshake do webhook | a Meta não valida a URL |
| `DEEPSEEK_API_KEY` | Assistente da profissional | ele responde com o link do painel |
| `OPENAI_API_KEY` | Reserva, quando o DeepSeek cai | sem rede de segurança |
| `CRON_SECRET` | Protege `/api/lembretes` | lembretes desligados |
| `TECNICO_WHATSAPP` | Quem recebe os **erros técnicos** | eles vão pra profissional |
| `KAROL_WHATSAPP` | Desvia os avisos dela (só pra testar) | usa o número do site |
| `NEXT_PUBLIC_SITE_URL` | Domínio público (sitemap, prévia de link) | usa o da Vercel |
| ~~`TZ`~~ | **Não use** — a Vercel reserva o nome. O fuso está em `negocio.ts` | — |

> ⚠️ `KAROL_WHATSAPP` é a armadilha mais cara do projeto. Enquanto ela existir,
> a profissional **não recebe agendamento nenhum** — e nada quebra pra
> denunciar. Apague na entrega.

### Banco de dados

No SQL Editor do Supabase, **nesta ordem**:

1. [`supabase/schema.sql`](./supabase/schema.sql) — tabelas, a trava
   anti-conflito (`sem_choque`) e as policies de RLS;
2. as migrações `migracao-01` … `migracao-06`, em ordem numérica.

Cada migração explica no topo o defeito que a originou. A `04` está marcada
como obsoleta e não deve rodar em banco novo.

> ⚠️ **Migração antes do deploy.** Uma coluna que falta não quebra a tela: a
> consulta volta vazia e a funcionalidade simplesmente não acontece, em
> silêncio. Já aconteceu.

---

## Scripts

```bash
npm run dev         # desenvolvimento
npm run build       # build de produção
npm start           # sobe o build
npm run lint        # eslint (zero warnings)
npm test            # vitest — 573 testes
npm run test:watch  # vitest em modo contínuo
```

---

## Como está organizado

```
src/
  app/
    page.tsx               home
    agendar/               serviço → dia → hora → dados → confirmado (+ PIX)
    sobre/ privacidade/    páginas públicas
    painel/                área da profissional (protegida por proxy.ts)
      page.tsx               agenda, por período
      relatorio/             números do mês
      bloqueios/             férias, feriado, curso
      notificacoes/          o que está ligado e o que não está
      novo/                  agendamento na mão
    api/
      whatsapp/              webhook da Meta (recebe mensagem e falha de entrega)
      lembretes/             cron diário
      pix/[id]/              gera o QR do PIX
  components/              cabeçalho, rodapé, seções da home, UI compartilhada
  data/                    negocio.ts, servicos.ts, fotos.ts — a fonte da verdade
  lib/
    agenda.ts                motor de horários (função pura, sem Date por dentro)
    agendamentos.ts          leitura e escrita da agenda
    pix.ts                   BR Code do PIX (EMV®QRCPS / manual do BACEN)
    qr.ts                    desenha o QR sem dependência externa
    notificacoes.ts          textos, templates da Meta e envio
    webhook-meta.ts          lê o payload, confere a assinatura HMAC
    recepcao.ts              decide se quem escreveu é cliente ou a profissional
    atendente.ts             o caminho das CLIENTES (não pode escrever na agenda)
    assistente.ts            o caminho DELA (IA com ferramentas e botão)
    conversas.ts             a janela de 24 h do WhatsApp
    sessao.ts                sessão do painel (cookie assinado, sem biblioteca)
  proxy.ts                 protege /painel/*
supabase/                  schema + migrações numeradas
ferramentas/               scripts Python de processamento das fotos
test/                      utilitários de teste (mock do Supabase)
```

Conteúdo do site — preços, textos, horários, fotos — sai de `src/data/`. Nada de
regra de negócio fica espalhado por componente.

---

## Sobre os testes

573 testes, e quase nenhum testa "a função devolve o valor certo". Eles testam
**o que dá errado em silêncio**: mensagem que a Meta aceita e não entrega,
lembrete que sai duas vezes, PIX apontando pra conta errada, template com uma
variável a menos.

Quando um teste existe, o comentário em cima dele diz **qual erro real o
originou** — com data. Vale ler antes de mudar o que ele cobra.

O projeto usa teste de mutação à mão como prática: quebra-se a linha de
propósito e confirma-se que algum teste fica vermelho. Teste que não pega a
mutação não está protegendo nada.

---

## Deploy (Vercel)

1. Importe o repositório.
2. Configure as variáveis da tabela acima.
3. Rode o schema e as migrações no Supabase **antes** do primeiro deploy.
4. Na Meta: webhook em `<site>/api/whatsapp`, com o campo `messages` assinado.
5. O cron de lembretes (`vercel.json`) roda sozinho, protegido por `CRON_SECRET`.

> Variável nova **só vale no build seguinte**. Depois de mexer nelas, refaça o
> deploy — isso já mordeu duas vezes aqui.

---

## Documentação

| Arquivo | O quê |
|---|---|
| [`PROGRESSO.md`](./PROGRESSO.md) | A história do projeto: decisões, o que a cliente respondeu, o que já foi tentado e rejeitado |
| [`WHATSAPP.md`](./WHATSAPP.md) | Como a Cloud API funciona aqui — janela de 24 h, custos, erros |
| [`TEMPLATES-WHATSAPP.md`](./TEMPLATES-WHATSAPP.md) | Os 7 templates aprovados na Meta, com o texto exato |
| [`ASSISTENTE.md`](./ASSISTENTE.md) | O assistente de WhatsApp: o que faz, o que não faz |
| [`AGENTS.md`](./AGENTS.md) | Aviso sobre o Next.js 16 para quem for mexer no código |

---

## Licença e reuso

Projeto privado. O conteúdo de `src/data/`, as fotos em `public/fotos/` e os
textos são da Karol e **não são reutilizáveis** — trocar `src/data/` é o
primeiro passo pra adaptar isto a outro negócio.
