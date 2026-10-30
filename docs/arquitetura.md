# Arquitetura

Como o código está montado, as regras que ele não pode quebrar e onde
mexer pra cada coisa. Para ligar o sistema do zero, veja o
[`README.md`](../README.md).

> **O código é a verdade; a documentação é lembrança.** Onde os dois
> discordarem, confie no código e corrija este arquivo.

---

## As regras que sustentam o resto

Cada uma já custou um defeito real. Não afrouxe nenhuma sem decidir isso
de propósito.

| Regra | Onde é garantida |
|---|---|
| **A agenda só muda depois de um toque humano.** A IA propõe, a pessoa confirma num botão. | `atendente.test.ts` lê o próprio código e reprova se `atendente.ts` importar `mudarSituacao`, `criarAgendamento` ou `salvarBloqueio`; `assistente.test.ts` prova que a escrita só acontece depois do botão |
| **Cliente e Karol têm caminhos separados.** `atendente.ts` (clientes) não pode escrever; `assistente.ts` (Karol) pode, depois do toque. Nunca junte os dois. | `recepcao.ts` decide pelo número de quem mandou |
| **Uma fonte da verdade.** Preço, texto, expediente e foto vêm de `src/data/`. O que pode ser derivado não vira coluna nem texto fixo. | ex.: `horarioDaCidade()` deriva de `EXPEDIENTE` |
| **A trava contra horário duplicado é do banco**, não da aplicação. | constraint `sem_choque` (`EXCLUDE USING gist`) em `schema.sql` |
| **O site público nunca lê a tabela de agendamentos.** Só os horários livres chegam ao navegador. | toda leitura passa pela chave de serviço, no servidor |
| **Faltou configuração, o recurso se desliga — não quebra.** O site institucional sobe sem nenhuma variável. | cada módulo confere a própria variável antes de agir |
| **A decisão mora fora da rota.** Rota não é importável, então não é testável. | `app/api/*/route.ts` só faz transporte; a lógica fica em `src/lib/` |
| **Na dúvida, erre pro lado seguro.** Janela do WhatsApp "não sei" = fechada; foto "não sei" = comprovante; contagem do banco falhou = deixa passar. | comentado em cada ponto |
| **Dependência nova só com motivo forte.** O projeto roda com 5 pacotes de produção. Animação e QR são escritos à mão. | `package.json` |

---

## Mapa do código

```
src/
  app/
    page.tsx                home (as seções vêm de components/secoes/)
    agendar/                serviço → dia → hora → dados → confirmado (+ PIX da entrada)
    sobre/  privacidade/    páginas públicas
    painel/                 área da Karol, protegida por proxy.ts
      page.tsx                agenda por período, busca por nome ou telefone
      novo/                   agendamento feito na mão
      bloqueios/              férias, feriado, compromisso
      relatorio/              números do mês
      notificacoes/           conversas abertas + diagnóstico técnico (fora do menu)
      login/
    api/
      whatsapp/               webhook da Meta: mensagem recebida e falha de entrega
      lembretes/              cron diário (véspera, agradecimento, entradas vencidas)
      pix/[id]/               imagem do QR do PIX (valor sai do banco, nunca da URL)
  components/               cabeçalho, rodapé, seções da home, UI compartilhada
  data/                     negocio.ts · servicos.ts · fotos.ts — conteúdo e regras do negócio
  lib/                      toda a lógica (tabela abaixo)
  proxy.ts                  protege /painel/* (o antigo middleware.ts do Next)
  instrumentation.ts        fixa o fuso do processo
supabase/                   schema.sql + migrações numeradas
test/                       mock do Supabase e stub do server-only
ferramentas/                scripts de apoio (ver "Ferramentas", no fim)
vps/                        Dockerfile e compose da cópia reserva (ver docs/vps.md)
```

### `src/data/` — o que muda quando o negócio muda

| Arquivo | Decide |
|---|---|
| `negocio.ts` | expediente, cidades, endereços, regras (entrada, aprovação, cancelamento), chave PIX, `SITE_URL`, `FUSO`, interruptores de cada mensagem (`NOTIFICACOES`) |
| `servicos.ts` | preço, duração, etiqueta e quem aparece no `/agendar` (`agendavel`). `precisaDeSinal()` e `valorDoSinal()` |
| `fotos.ts` | as imagens do site. **Não entra rosto de cliente** (ver `sem-rosto-de-cliente.test.ts`) |

### `src/lib/` — por assunto

| Assunto | Arquivo | Papel |
|---|---|---|
| **Agenda** | `agenda.ts` | o motor de horários. Função pura sobre minutos do dia, sem `Date` por dentro |
| | `agendamentos.ts` | tudo que lê e escreve a tabela `agendamentos` |
| | `bloqueios.ts` | férias, feriado, compromisso |
| | `periodo.ts` | ponte com o `tstzrange` do Postgres |
| | `datas.ts` | os formatadores de data e hora, todos com `timeZone: FUSO` |
| | `limite.ts` | freio de agendamentos por IP (em memória) |
| **WhatsApp** | `notificacoes.ts` | textos, templates, envio e avisos de erro pro técnico |
| | `webhook-meta.ts` | lê o payload da Meta e confere a assinatura HMAC |
| | `recepcao.ts` | decide se quem escreveu é cliente (→ atendente) ou a Karol (→ assistente) |
| | `atendente.ts` | o caminho das **clientes**. Não pode escrever na agenda |
| | `remarcacao.ts` | o pedido de remarcação que atravessa várias mensagens |
| | `conversas.ts` | a janela de 24 h de cada número e a memória do assistente |
| | `lembretes.ts` | a varredura diária e a expiração das entradas não pagas |
| | `telefone.ts` | o **único** lugar que decide o formato do número (sempre com DDI) |
| | `whatsapp.ts` | link `wa.me` com a mensagem já escrita |
| **Assistente** | `assistente.ts` | a IA da Karol: ferramentas, propostas e execução |
| | `ia.ts` | só o transporte até o modelo (DeepSeek, OpenAI de reserva) |
| | `roteiro-do-assistente.ts` | o texto que o modelo lê antes de cada resposta |
| | `acoes-pendentes.ts` | propostas esperando o toque dela (expiram em 30 min) |
| | `lista-mostrada.ts` | os ids do que ele acabou de mostrar |
| | `fala-do-modelo.ts` | separa fala de marcação interna que vazou |
| | `comprovante.ts` | pergunta ao modelo se a foto recebida é um comprovante |
| **PIX** | `pix.ts` | o BR Code (copia e cola) com o valor dentro |
| | `qr.ts` · `png.ts` | o QR e o PNG, escritos à mão e conferidos contra o `segno` |
| **Infra** | `banco.ts` | o cliente Supabase (só servidor) |
| | `sessao.ts` | sessão do painel: cookie assinado, sem biblioteca |

O assistente tem documento próprio: [`assistente.md`](./assistente.md).
O WhatsApp também: [`whatsapp.md`](./whatsapp.md).

---

## Banco de dados

Supabase (Postgres). Todas as tabelas com **RLS ligado e zero policies**:
só a chave de serviço, usada no servidor, passa.

| Tabela | Guarda | Criada em |
|---|---|---|
| `agendamentos` | os atendimentos. `sem_choque` impede sobreposição | `schema.sql` (+ colunas da 06) |
| `bloqueios` | férias, feriado, compromisso | `schema.sql` |
| `conversas` | a janela de 24 h de cada número e o histórico do assistente | `schema.sql` (+ coluna `historico` da 05) |
| `remarcacoes` | pedido de remarcação em andamento | `migracao-03` |
| `acoes_pendentes` | o que a IA propôs e espera o toque da Karol | `migracao-05` |

### Instalar num banco novo

No SQL Editor do Supabase, **nesta ordem**:

| Passo | Arquivo | Por quê |
|---|---|---|
| 1 | `schema.sql` | tabelas, `sem_choque`, RLS. Já inclui o que as migrações 01, 02 e 07 fazem |
| 2 | `migracao-03-remarcacoes.sql` | tabela `remarcacoes` |
| 3 | `migracao-05-assistente.sql` | `acoes_pendentes` e `conversas.historico` |
| 4 | `migracao-06-lembretes-sem-repetir.sql` | marcas de "já enviei" do lembrete e do agradecimento |

> [!WARNING]
> **Não rode a 01, a 02 nem a 04 num banco novo.** A 01 e a 02 são para
> bancos criados antes de o `schema.sql` absorvê-las — a 02 falha num banco
> novo porque `conversas` já existe. A 04 é obsoleta (lembrete de 30 min,
> removido em 13/09/2026).

**Banco criado com um `schema.sql` anterior a 30/10/2026** (como o de
teste, `Karol v2`): rode também a `migracao-07-whatsapp-opcional.sql`. Até
essa data o `schema.sql` dizia `cliente_whatsapp not null`, e o "Não tenho
o número" do painel falhava. A produção já aceitava `null` — nela a 07 não
muda nada.

> [!WARNING]
> **Migração antes do deploy.** Coluna que falta não quebra a tela: a
> consulta volta vazia e a funcionalidade some em silêncio. Já aconteceu.

As migrações que estão no banco de produção foram rodadas à mão, por isso
não aparecem na lista de migrações do painel do Supabase.

### Situação de um agendamento

```
pendente   → confirmado | cancelado        (pendente = esperando a entrada)
confirmado → concluido | faltou | cancelado
cancelado | faltou → confirmado            (reativar)
concluido  = ponto final
```

`aprovacaoManual` está `false`: serviço sem entrada entra direto como
`confirmado`. Serviço que pede entrada entra `pendente`.

---

## Os fluxos principais

### Agendar pelo site

1. A cliente escolhe serviço, dia e hora. A grade respeita expediente,
   cidade do dia, duração, intervalo de 10 min e antecedência de um dia.
   Só hora cheia.
2. Serviço **abaixo de R$ 80** → `confirmado` na hora.
   Serviço **de R$ 80 ou mais** → `pendente`, com PIX de 50% de entrada
   (QR + copia e cola na tela de confirmação).
3. A tela termina num botão que abre o WhatsApp com a mensagem escrita
   **da cliente para o studio**. Esse toque abre a janela de 24 h — e é o
   que faz as mensagens seguintes saírem de graça.
4. A Karol recebe o aviso de agendamento novo.

**A entrada vence em 30 minutos** (`REGRAS.sinal.minutosParaPagar`),
decisão da Karol em 13/09/2026. São três camadas, porque uma só não basta:

1. a grade já esconde o horário vencido — outra cliente o vê livre na hora;
2. quem for gravar em cima solta a linha vencida antes (senão `sem_choque`
   recusaria);
3. a varredura diária limpa o que ninguém tomou.

Sempre por `mudarSituacao`, que avisa a cliente.

### Remarcar pelo WhatsApp

```
cliente toca "Remarcar"   →  recebe a LISTA de horários livres
cliente escolhe um        →  Karol recebe o pedido com 2 botões
Karol toca "Confirmar"    →  a agenda muda (só aqui)
cliente é avisada
```

`remarcacoes` guarda **o que foi oferecido**: o sistema nunca move pra um
horário que a cliente não viu. Um teste prova que `remarcarAgendamento` só
é chamado dentro de `decisaoDaKarol` — e que o botão só vale vindo do
número da Karol.

### Lembretes (cron diário)

`vercel.json` chama `/api/lembretes` às **12:00 UTC (09:00 em Pereira
Barreto)**, com `Authorization: Bearer $CRON_SECRET`. Uma varredura só:

- lembrete da véspera;
- agradecimento do dia seguinte ao atendimento;
- solta as entradas vencidas.

A migração 06 marca o que já foi enviado (`lembrete_enviado_em`,
`agradecimento_enviado_em`), então rodar duas vezes não duplica o caso
normal. **Mesmo assim, só um cron pode existir por vez** (Vercel ou VPS).

### Avisos de erro

Todo erro do sistema vai para `TECNICO_WHATSAPP` (o Kainã), não pra Karol.
O primeiro sai na hora; repetições são contadas e resumidas 15 min depois
(`🔴 AINDA ACONTECENDO — 47x`). Falha de aviso nunca gera outro aviso para
o mesmo destino (`ehDestinoDeAlerta`) — foi assim que nasceu o laço de 97
mensagens (ver [`incidentes.md`](./incidentes.md)).

---

## Detalhes que já morderam

### Fuso horário

O motor trabalha em hora local e assume Brasil; a Vercel roda em UTC. **Não
dá pra resolver com variável `TZ`** — a Vercel reserva o nome. Resolvido no
código, em duas camadas:

1. `src/instrumentation.ts` fixa `process.env.TZ = FUSO` antes da primeira
   requisição (conserta `getHours`, `setHours` etc.);
2. `src/lib/datas.ts` declara `timeZone: FUSO` em cada formatador.

A constante única é `FUSO`, em `data/negocio.ts`. Quando falta, das 21h à
meia-noite a agenda oferece as datas erradas, sem erro na tela.
`datas.test.ts` prova o resultado com o processo em UTC e em Tóquio.

### Next.js 16

- `middleware.ts` virou `proxy.ts` (mesma API, nome novo).
- `cookies()` é async; `params` e `searchParams` são `Promise`.
- Server Action é POST na própria rota: **toda action reconfere
  `sessaoAtiva()`** — o proxy não é fronteira de segurança.
- Documentação local em `node_modules/next/dist/docs/`. Leia antes de
  inventar API.

### Endereço do site

`NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` (a Vercel injeta)
→ literal em `negocio.ts`. Um domínio errado aqui não quebra nada: só faz o
link do WhatsApp e o sitemap apontarem pra um 404.

### Sessão do painel

Cookie `painel_sessao` = `<payload>.<HMAC-SHA256>` com `SESSAO_SECRET`,
7 dias, `httpOnly` + `sameSite=lax` + `secure` em produção. Uma senha só
(`SENHA_PAINEL`), compartilhada pela Karol e pelo Kainã.

### Anti-spam do agendamento

Honeypot, carimbo de tempo (rejeita envio em menos de 2 s ou mais de 2 h)
e 5 agendamentos/hora por IP. O freio por IP mora em memória — some no
deploy e não é compartilhado entre instâncias. É contra script ingênuo, não
proteção séria; o prazo de 30 min da entrada é o que desfaz uma enxurrada
de reservas não pagas.

### Cabeçalhos de segurança

Seis, em `next.config.ts`: CSP, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, HSTS e `Permissions-Policy`.

---

## Testes

```bash
npm test                                    # a suíte inteira (~5 s)
npx vitest run src/lib/agenda.test.ts       # um arquivo
```

- Quase nenhum teste checa "a função devolve o valor certo". Eles cobrem
  **o que dá errado em silêncio**: mensagem aceita e não entregue, lembrete
  duplicado, PIX pra conta errada, template com variável a menos.
- O comentário em cima de cada teste diz **qual erro real o originou**.
  Leia antes de mudar o que ele cobra.
- Prática do projeto: **teste de mutação à mão** — quebre a linha de
  propósito e veja algum teste ficar vermelho.
- `test/mock-banco.ts` é um falso cliente Supabase;
  `test/stubs/server-only.ts` substitui o pacote real; `vitest.config.ts`
  fixa `TZ=America/Sao_Paulo`.
- Dois arquivos chamam a API de IA de verdade e ficam desligados:
  `bancada-de-provas.test.ts` e `assistente-de-ponta-a-ponta.test.ts`. Ligam
  com `BANCADA=1` e gastam crédito (ver [`assistente.md`](./assistente.md)).

> [!IMPORTANT]
> Vários testes **leem o código-fonte por caminho fixo** (`atendente.test.ts`,
> `acoes-servidor.test.ts`, `sem-rosto-de-cliente.test.ts`,
> `nao-avisa-a-propria-karol.test.ts`). Mover ou renomear arquivos de
> `src/` exige ajustar esses testes junto.

---

## Ferramentas

Scripts de apoio que **não** fazem parte do site nem da imagem Docker.

| Arquivo | Pra quê | Como rodar |
|---|---|---|
| `ferramentas/gabaritos-qr.py` | gera `src/lib/qr.gabaritos.json` com o `segno`, a "segunda opinião" que `qr.test.ts` usa para conferir o QR | `pip install segno` e `python ferramentas/gabaritos-qr.py` — só quando mexer em `qr.ts` |
| `ferramentas/varredura.mjs` | varre o site num navegador de verdade: rolagem lateral, erro de console, imagem quebrada, alvo de toque < 44 px, H1 | instruções no topo do arquivo (usa Playwright instalado fora do projeto) |

Os scripts de tratar e anonimizar fotos de clientes saíram em 30/10/2026:
o site não publica mais rosto de cliente desde 18/09. Continuam no
histórico do git.
