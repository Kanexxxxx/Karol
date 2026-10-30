<div align="center">

<img src="src/app/apple-icon.png" alt="" width="72" />

# Studio Karol Carvalho

**Site, agenda online, entrada por PIX e atendimento automático no WhatsApp**
para uma profissional autônoma de beleza.

Next.js 16 · React 19 · Tailwind 4 · Supabase · WhatsApp Cloud API · DeepSeek · Vercel

[Site no ar](https://karol-zeta.vercel.app) · [Estado atual](docs/estado-atual.md) · [Arquitetura](docs/arquitetura.md)

</div>

---

Feito para a **Karol**, maquiadora e designer de sobrancelhas que atende em
**Pereira Barreto** e **Bandeirantes D'Oeste (SP)** — e escrito para servir
de base a qualquer negócio de atendimento com hora marcada.

**Para a cliente:** escolhe serviço, dia e hora no site (a grade já sabe em
que cidade a Karol está em cada dia); recebe a confirmação no WhatsApp;
paga a entrada por PIX com o valor dentro do QR; pede pra remarcar por
botão.

**Para a Karol:** painel no celular com agenda, busca, bloqueios e
relatório do mês — e um **assistente no WhatsApp**: ela escreve *"como tá a
agenda amanhã?"* ou *"cancela a da Ana"* e a IA responde com a agenda na mão.

> [!IMPORTANT]
> **A agenda só muda depois de um toque humano.** A IA nunca escreve na
> agenda: ela propõe, manda um botão, e a mudança só acontece quando a
> pessoa confirma. Isso é garantido por teste, não por instrução no prompt
> — ver [`docs/arquitetura.md`](docs/arquitetura.md).

---

## Comece por aqui

| Você vai… | Leia, nesta ordem |
|---|---|
| **entender o projeto** | este README → [`docs/estado-atual.md`](docs/estado-atual.md) → [`docs/contexto.md`](docs/contexto.md) |
| **mexer no código** | [`docs/arquitetura.md`](docs/arquitetura.md) → [`docs/incidentes.md`](docs/incidentes.md) → [`AGENTS.md`](AGENTS.md) |
| **mexer em mensagem de WhatsApp** | [`docs/whatsapp.md`](docs/whatsapp.md) → [`docs/templates-whatsapp.md`](docs/templates-whatsapp.md) → [`docs/incidentes.md`](docs/incidentes.md) |
| **mexer no assistente da Karol** | [`docs/assistente.md`](docs/assistente.md) |
| **subir ou operar a cópia reserva** | [`docs/vps.md`](docs/vps.md) |
| **trabalhar como agente de IA** | [`AGENTS.md`](AGENTS.md) (o `CLAUDE.md` aponta pra ele) |

### Toda a documentação

| Arquivo | O que tem |
|---|---|
| [`docs/estado-atual.md`](docs/estado-atual.md) | o que está no ar, o que falta e quem decide — **o único lugar com pendências** |
| [`docs/contexto.md`](docs/contexto.md) | o acordo, quem é a cliente, serviços, decisões dela e do Kainã, protótipos de design |
| [`docs/arquitetura.md`](docs/arquitetura.md) | regras que o código não pode quebrar, mapa do código, banco, fluxos, testes |
| [`docs/whatsapp.md`](docs/whatsapp.md) | custo da Meta, o que o código envia e recebe, como ligar do zero, códigos de erro |
| [`docs/templates-whatsapp.md`](docs/templates-whatsapp.md) | os 7 templates aprovados, com o texto exato |
| [`docs/assistente.md`](docs/assistente.md) | a IA da Karol: o que faz, o que não faz, modelo e custo |
| [`docs/vps.md`](docs/vps.md) | a cópia reserva: a máquina, operar, credenciais, virada |
| [`docs/incidentes.md`](docs/incidentes.md) | o que já quebrou no ar e as lições que viraram regra |
| [`docs/historico.md`](docs/historico.md) | a linha do tempo, com o commit de cada marco |

---

## Rodando localmente

Precisa de **Node.js 20.9 ou mais novo** (a imagem Docker usa o 24).

```bash
npm install
cp .env.example .env.local   # e preencha o que for usar
npm run dev                  # http://localhost:3000
```

O **site institucional funciona sem nenhuma variável**. Agenda, painel,
WhatsApp e assistente ligam por partes, conforme as variáveis existirem —
enquanto faltar alguma, a funcionalidade só não acontece, e nada quebra.
Cada variável está explicada em [`.env.example`](.env.example).

| Para ligar… | Variáveis |
|---|---|
| agenda e painel | `NEXT_PUBLIC_SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `SENHA_PAINEL` · `SESSAO_SECRET` |
| WhatsApp | `META_TOKEN` · `META_PHONE_NUMBER_ID` · `META_APP_SECRET` · `META_VERIFY_TOKEN` |
| lembretes | `CRON_SECRET` |
| alertas de erro | `TECNICO_WHATSAPP` |
| assistente | `DEEPSEEK_API_KEY` (e, opcional, `OPENAI_API_KEY` de reserva) |
| domínio público | `NEXT_PUBLIC_SITE_URL` (obrigatória fora da Vercel) |

> [!WARNING]
> **`KAROL_WHATSAPP` é só para teste.** Enquanto ela existir, a Karol não
> recebe agendamento nenhum — e nada quebra pra denunciar. Apague antes de
> entregar. E não defina `TZ`: a Vercel reserva o nome; o fuso está no
> código (`FUSO` em `src/data/negocio.ts`).

### Banco de dados

No SQL Editor do Supabase, num banco **novo**:

```text
supabase/schema.sql
supabase/migracao-03-remarcacoes.sql
supabase/migracao-05-assistente.sql
supabase/migracao-06-lembretes-sem-repetir.sql
```

As migrações 01 e 02 já estão dentro do `schema.sql` (a 02 falha num banco
novo), e a 04 é obsoleta. Detalhes em
[`docs/arquitetura.md`](docs/arquitetura.md#banco-de-dados).

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | desenvolvimento |
| `npm run build` · `npm start` | build de produção e servidor |
| `npm run lint` | ESLint |
| `npx next typegen && npx tsc --noEmit` | checagem de tipos (o typegen gera os tipos de rota do Next) |
| `npm test` | Vitest — a suíte inteira roda em ~5 s |
| `npx vitest run caminho/do/arquivo.test.ts` | um arquivo de teste |

---

## Deploy

**Vercel** (produção), com deploy automático a cada push na `main`:

1. Importe o repositório e configure as variáveis.
2. Rode o banco (acima) **antes** do primeiro deploy — coluna que falta
   não dá erro, só faz a funcionalidade sumir.
3. Na Meta: webhook em `<site>/api/whatsapp`, campo `messages` assinado
   ([`docs/whatsapp.md`](docs/whatsapp.md)).
4. O cron de lembretes (`vercel.json`) roda sozinho, protegido por
   `CRON_SECRET`.

> [!NOTE]
> Variável nova **só vale no build seguinte**. Depois de mexer nelas, faça
> redeploy.

Há também uma **cópia reserva em Docker** para uma VPS, em [`vps/`](vps/) —
ver [`docs/vps.md`](docs/vps.md).

---

## Estrutura

```text
src/app/          páginas e rotas (site público, /agendar, /painel, /api)
src/components/   cabeçalho, rodapé, seções da home, UI compartilhada
src/data/         negocio.ts · servicos.ts · fotos.ts — conteúdo e regras do negócio
src/lib/          toda a lógica: agenda, WhatsApp, assistente, PIX, sessão
supabase/         schema + migrações numeradas
test/             mock do Supabase para os testes
ferramentas/      scripts de apoio (gabarito do QR, varredura com navegador)
vps/              Dockerfile e docker-compose da cópia reserva
docs/             a documentação
```

Preço, texto, horário e foto saem de `src/data/`. Nada de regra de negócio
espalhada por componente — trocar `src/data/` é o primeiro passo para
adaptar o sistema a outro negócio.

> [!NOTE]
> Projeto privado. O conteúdo de `src/data/`, as fotos em `public/fotos/` e
> os textos são da Karol e **não são reutilizáveis**.
