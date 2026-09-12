# AUDITORIA DO ASSISTENTE DA KAROL

> Auditoria de **leitura** feita em 12/09/2026, sobre o commit `0da9719`.
>
> **Nada foi alterado.** Nenhum arquivo de código, nenhuma documentação,
> nenhuma migração rodada. As três consultas ao Supabase foram `SELECT`.
>
> Versão navegável:
> https://claude.ai/code/artifact/12e55225-b9a0-441b-af6d-a00a14df536f

---

## O resumo, pra quem vai aprovar isto

O sistema **está coerente com o desenho que a documentação descreve.** O
princípio central — *ler é direto, escrever pede o toque dela* — não é só
texto: está em código e é provado por teste que lê o próprio arquivo-fonte.

Encontrei **um bug confirmado**, **uma brecha de concorrência** e
**três divergências** em que a documentação descreve um passado que já
mudou. A mais grave manda alguém fazer um trabalho que já está feito.

| O quê | Estado |
|---|---|
| Recepção, roteamento, loop da IA, propostas, execução | ✅ pronto |
| Migrações 04 e 05 | ✅ **aplicadas** — a documentação diz que não |
| Ferramenta `marcar` em domingo | ⛔ **quebrado** |
| Reivindicação atômica da proposta | ⚠️ brecha de concorrência |
| `DEEPSEEK_API_KEY` na Vercel | ❓ não dá pra verificar daqui |

---

## 1. Como verificar o que está escrito aqui

Tudo abaixo é reproduzível:

```bash
npx vitest run              # 356 testes, 24 arquivos, exit 0
npx tsc --noEmit            # limpo
npx eslint .                # limpo
git check-ignore -v .env.local   # confirmado fora do Git
```

E três consultas de leitura no projeto Supabase `radyfwowhmyeulfhhuco`
(o mesmo que `.env.local` aponta — conferido): a lista de tabelas, um
`SELECT` em `pg_policies` e um `SELECT` em `acoes_pendentes`.

**Valores de variável de ambiente não foram lidos nem transcritos em
nenhum momento.**

---

## 2. Arquitetura

Um webhook só, duas pessoas entrando por ele. A separação é por número, e
é a primeira decisão do fluxo.

```
Meta  ->  POST /api/whatsapp
          |  le BYTES CRUS  ->  confere HMAC        <- sem assinatura, 401
          |  parse -> lerMensagem -> descarta recibo -> dedupe por wamid
          v
Recepcao  ->  ehAKarol(de) ?
          |
          +- nao ->  atender()          <- caminho da CLIENTE, sem escrita
          |
          +- sim ->  abre janela de 24 h, e entao NESTA ORDEM:
                     botao k: ou h:            -> atendente (remarcacao)
                     botao de template cliente -> atendente (incidente 12/09)
                     foto ou PDF               -> resposta curta, sem IA
                     botao a:                  -> decisaoDoBotao()
                     texto                     -> assistente()
```

Do `assistente()` pra frente, parte em dois conforme a ferramenta:

```
LEITURA   modelo chama -> executarLeitura() -> resultado volta pro modelo
                       -> texto pra ela

ESCRITA   modelo chama -> descrever() valida e escreve a frase por extenso
                       -> guardarAcao() grava em acoes_pendentes
                       -> dois botoes no WhatsApp dela   <- A CONVERSA PARA AQUI

o toque  -> decisaoDoBotao() -> buscarAcao() confere numero, situacao e validade
                             -> executar() -> mudarSituacao
                                            | remarcarAgendamento
                                            | criarAgendamentoNoPainel
                                            | criarBloqueio
                             -> fecharAcao() -> resultado pra ela
```

### Mapa de arquivos

| Arquivo | Responsabilidade | Risco de alterar |
|---|---|---|
| `lib/recepcao.ts` | decide se quem falou é cliente ou a Karol | **Alto** — é a fronteira de permissão |
| `lib/assistente.ts` | ferramentas, contexto, propostas e execução | **Alto** — a trava de escrita mora aqui |
| `lib/acoes-pendentes.ts` | as propostas e as três conferências | **Alto** — é a autorização da execução |
| `lib/conversas.ts` | janela de 24 h e memória da conversa | Médio — mexe em custo e contexto |
| `lib/ia.ts` | transporte até o modelo, e nada além | Baixo — não conhece agendamento |
| `lib/webhook-meta.ts` | assinatura e formato do payload | **Alto** — é o portão de entrada |
| `app/api/whatsapp/route.ts` | transporte, assinatura, dedupe | Médio |

---

## 3. O assistente por dentro

O loop está em `assistente()`. Antes dele, duas saídas que não gastam token:

- `esquece` / `recomeça` / `zera` / `limpa` → apaga o histórico e para;
- sem `DEEPSEEK_API_KEY` → responde com o link do painel e se cala.

Passando disso: monta `instrucoes()` como *system*, até oito falas de
histórico, a mensagem nova. O loop roda no máximo **três** vezes
(`MAX_RODADAS = 3`), e na terceira as ferramentas são retiradas da
requisição — `rodada === MAX_RODADAS - 1 ? [] : FERRAMENTAS` — obrigando o
modelo a responder em texto em vez de pedir leitura pra sempre.

**Dentro de cada rodada, escrita é procurada primeiro.** Se o modelo pediu
uma ferramenta de escrita, o loop retorna ali mesmo, vira proposta, e
nenhuma leitura daquela rodada é executada.

### A memória

Oito falas (`FALAS_GUARDADAS = 8`), em `conversas.historico` (`jsonb`),
cortadas nas últimas oito na leitura **e** na escrita, cada texto limitado
a 1000 caracteres. A leitura filtra por forma (`papel` tem que ser `user`
ou `assistant`, `texto` tem que ser string) justamente porque é `jsonb` e
alguém pode editar a linha à mão no Supabase.

`limparHistorico()` faz `update({ historico: [] })` numa linha de
`conversas`. **Não toca em cliente, agendamento nem faturamento.**
"Esquece" esquece a conversa e nada mais.

---

## 4. WhatsApp

### Os dois números — e é isso que faz o roteamento funcionar

O **número pessoal** dela (`NEGOCIO.whatsapp.numero`) é o que o site mostra
e o que ela usa pra escrever. O **número da API**
(`NEGOCIO.whatsappAutomatico`) é o chip da Cloud API, que recebe e não tem
aplicativo que ninguém abra.

Quando ela manda mensagem pro número da API, o `from` do payload é o
pessoal — e é exatamente contra ele que `ehAKarol()` compara, porque
`whatsappDaKarol()` cai em `NEGOCIO.whatsapp.numero` quando
`KAROL_WHATSAPP` está vazia. **Por isso apagar a variável na Vercel faz o
assistente voltar sozinho a atender a Karol:** o padrão já é o número certo.

### A entrada

O `GET` responde o handshake comparando `hub.verify_token` com
`META_VERIFY_TOKEN`. O `POST` confere `X-Hub-Signature-256` sobre os
**bytes crus** do corpo, lidos com `req.text()` antes de qualquer
`JSON.parse`. Sem `META_APP_SECRET` no ambiente, nada passa — falha fechado.

`lerMensagem()` reconhece **seis** formas e ignora todo o resto (recibo de
entrega, áudio, figurinha): texto, `interactive.button_reply`,
`interactive.list_reply`, `button.payload` de template, e `image` e
`document`, que são o comprovante do PIX.

A janela de 24 h é registrada pros dois lados. Pra Karol isso acontece em
`recepcao.ts`, porque o caminho dela não passa mais pelo `atender()` que
fazia esse registro.

### Dicionário da API HTTP

| Rota | Método | Autorização | Efeito |
|---|---|---|---|
| `/api/whatsapp` | GET | `hub.verify_token` vs `META_VERIFY_TOKEN`, tempo constante | Devolve o desafio. Nenhum. |
| `/api/whatsapp` | POST | HMAC-SHA256 sobre o corpo cru | Atendimento ou assistente. Pode escrever na agenda — só pela via do botão. |
| `/api/lembretes` | GET · POST | `Bearer CRON_SECRET`, tempo constante; sem segredo, fechada | Dispara mensagem paga pra cliente real. |
| `/api/pix/[id]` | GET | Nenhuma — público por necessidade da Meta | Leitura. O valor vem do banco, nunca da URL. |

Além dessas, sete *server actions* (`"use server"`). Conferi uma por uma:
**toda ação do painel rechama `sessaoAtiva()` no próprio corpo**, sem
delegar autorização ao proxy — que, como o comentário do próprio
`proxy.ts` diz, não é fronteira de segurança.

---

## 5. A IA

`lib/ia.ts` é transporte e só. Não importa nada de agendamento, não sabe o
que é ferramenta de escrita, e cabe em 137 linhas de `fetch` puro. **A
intenção arquitetural que a documentação descreve está cumprida.**

| Parâmetro | Valor | Origem |
|---|---|---|
| Base URL | `https://api.deepseek.com` | `IA_BASE_URL` sobrescreve |
| Modelo | `deepseek-chat` | `IA_MODELO` sobrescreve |
| Chave | — | `DEEPSEEK_API_KEY`, obrigatória |
| Endpoint | `POST /chat/completions` | dialeto OpenAI |
| Temperatura | `0.2` | fixa no código |
| `max_tokens` | `700` | fixo no código |
| Timeout | `20 s` via `AbortSignal.timeout` | fixo no código |
| Retries · streaming | nenhum · nenhum | — |

`perguntar()` **nunca lança**: devolve `null` em falta de chave, timeout,
status não-ok ou exceção. A razão é o webhook — responder erro faz a Meta
reenviar, e reenvio viraria a Karol recebendo a mesma resposta várias
vezes. `lerArgumentos()` devolve `{}` em JSON malformado.

### O que vai pro modelo

O *system prompt* é gerado a cada mensagem por `instrucoes()` e carrega: a
data de hoje, o expediente de cada cidade lido do `EXPEDIENTE` real, os
serviços com id e preço, o glossário de como ela fala, e **uma lista pronta
dos próximos 14 dias com o dia da semana de cada um** — porque calcular dia
da semana é onde o modelo erra, e ler de uma lista não.

Os resultados de leitura passam por `paraModelo()`, que envia **nome,
telefone formatado, serviço, data, hora, cidade, situação e valor**. Isso é
dado pessoal de cliente saindo pra um terceiro no exterior. **Não é
descuido:** está declarado na política de privacidade do site, nomeando o
DeepSeek e a China. O modelo **não** recebe segredo, endereço residencial,
nem id que apareça pra terceiros.

---

## 6. As ferramentas — inventário completo

Oito, em `FERRAMENTAS` em `lib/assistente.ts`. A classificação não é
comentário: são dois `Set` no código, `LEITURA` e `ESCRITA`, que o loop
consulta. **Ferramenta que não esteja em nenhum dos dois não é executada.**

| Ferramenta | Tipo | Entrada | Faz o quê | Validação própria |
|---|---|---|---|---|
| `ver_agenda` | READ | `de_dias`, `ate_dias` | lista agendamentos num intervalo | janela 0–90 dias; máx. 40 itens |
| `procurar` | READ | `termo` | busca por nome ou telefone | mín. 3 caracteres; máx. 20 itens |
| `horarios_livres` | READ | `dia`, `servico_id` | grade real do dia, já descontando o ocupado | serviço existe; data `AAAA-MM-DD` |
| `resumo_do_mes` | READ | `meses_atras` | faturamento, atendidas, faltas, ticket, novas, retornos | limitado a 0–12 meses |
| `mudar_situacao` | **WRITE** | `id`, `situacao` | **propõe** cancelar / concluir / faltou / reativar | id existe no banco; situação no mapa de quatro |
| `remarcar` | **WRITE** | `id`, `dia`, `hora` | **propõe** mover dia e hora | id existe; formatos |
| `bloquear` | **WRITE** | `dia_inicio`, `dia_fim`, `motivo`, horas opcionais | **propõe** fechar a agenda | datas válidas; motivo 2+ |
| `marcar` | **WRITE** | `nome`, `servico_id`, `dia`, `hora`, `whatsapp?` | **propõe** criar agendamento | serviço existe; nome 2+; formatos. **Cidade não é escolha do modelo** |

### Três ausências deliberadas

- **Não existe ferramenta de mandar mensagem pra cliente.** A regra 13 do
  prompt manda entregar um link `wa.me/` e dizer que quem fala com a
  cliente é ela. Como não há ferramenta, a pior coisa que o modelo pode
  fazer é mentir em texto — nunca enviar algo em nome dela.
- Não existe ferramenta de apagar registro.
- Não existe ferramenta de mexer em preço.

### Ambiguidade, em duas camadas

A instrução pede mostrar duas clientes do mesmo nome pra ela escolher —
isso é prompt, e prompt não é garantia. **A camada que vale é estrutural:**
a ferramenta recebe um **id inteiro**, não um código curto, e `porId()`
resolve pelo id exato. O projeto removeu um código de seis caracteres
justamente porque seis dígitos hexadecimais colidem.

Com id inteiro, a ambiguidade de alvo deixou de existir. O que sobra é o
modelo **inventar** um id — e aí a busca não acha nada e **nenhuma proposta
é criada**. Há teste pra isso.

---

## 7. Permissões — quem pode fazer o quê

| Ator | Lê | Escreve na agenda | Confirma | Como é identificado |
|---|---|---|---|---|
| **Cliente** (WhatsApp) | o próprio horário | **nunca** — trava estrutural | o próprio pedido de remarcação | número no payload assinado |
| **Karol** (WhatsApp) | agenda, clientes, faturamento | só tocando no botão | as propostas da IA | `ehAKarol()` por dígitos |
| **Karol** (painel) | tudo | direto, sem proposta | — | senha + cookie HMAC, reconferido em cada ação |
| **IA** | o que as 4 leituras devolvem | **nunca** | nunca | não é um ator autenticado |
| **Webhook** | o payload | só via recepção | — | HMAC da Meta |
| **Cron** | quem precisa de lembrete | `avisado_30min_em` | — | `Bearer CRON_SECRET` |
| **Anônimo** (site) | vagas, serviços | cria o próprio agendamento | — | nenhuma; freio por IP em `lib/limite.ts` |

A linha que mais importa é a da IA: **ela não é um ator com permissão
reduzida, ela não tem permissão nenhuma de escrita.** O que ela produz é
uma linha em `acoes_pendentes`, que é um pedido, não um efeito.

---

## 8. As quatro travas da escrita

### 1. A descrição é por extenso, nunca o código ✅

`descrever()` resolve o id no banco e monta a frase com **nome da cliente,
serviço, dia e hora por extenso, e cidade**. Quando os argumentos não
fecham, devolve `null` — e aí **não há proposta nenhuma**: ela recebe um
pedido de esclarecimento em vez de um botão que falharia depois do toque.

Teste afirma as duas metades: que a descrição contém `Larissa Souza` e
`CANCELAR`, e que **não** contém o id.

### 2. Três conferências antes de executar ✅

`buscarAcao(id, whatsapp)` só devolve se as três passarem:

| Conferência | Por quê |
|---|---|
| `situacao = 'aguardando'` | proposta já resolvida não executa de novo |
| `expira_em > now()` | 30 minutos — confirmar de manhã o que foi pedido de noite mudaria a agenda com base num estado que não existe mais |
| `whatsapp =` o remetente | quem descobrisse um id não o executaria de outro telefone |

Antes das três, um filtro de formato de UUID que evita ida ao banco com lixo.

### 3. O estado é relido na hora da execução ✅

**Esta é a trava que a documentação não destaca.** `executar()` não confia
nos argumentos guardados: pra `mudar_situacao` e `remarcar` ele chama
`porId()` de novo, **buscando no banco no momento do toque**. Se o
agendamento foi cancelado por outro caminho entre a proposta e a
confirmação, a resposta é *"Não achei mais esse agendamento"* — não uma
escrita sobre estado velho.

Abaixo dele, `mudarSituacao()` valida **outra vez** o formato do id e a
situação contra a lista real, independentemente do que a IA mandou.

### 4. A escrita mora num lugar só, e o teste lê o arquivo ✅

Dois testes estruturais em `assistente.test.ts`, sobre o **texto-fonte**:

- O primeiro recorta o corpo de `executar()` contando chaves, remove-o do
  arquivo, e exige que `mudarSituacao(`, `remarcarAgendamento(`,
  `criarAgendamentoNoPainel(` e `criarBloqueio(` **não apareçam em nenhum
  outro lugar**.
- O segundo conta as ocorrências de `executar(` no arquivo inteiro e exige
  **exatamente duas** — a definição e a chamada dentro de `decisaoDoBotao()`.

**O efeito prático:** se alguém, em seis meses, chamar `executar()` de
dentro do loop da conversa, a confirmação deixa de existir e a suíte fica
vermelha no mesmo commit. A proteção não depende do prompt nem da boa
intenção de quem edita.

---

## 9. Banco — o que encontrei na tabela, não na documentação

Projeto Supabase `radyfwowhmyeulfhhuco`, confirmado como o mesmo que
`.env.local` aponta. Leitura só.

```
agendamentos     RLS ok   + avisado_30min_em   <- migracao 04 APLICADA
bloqueios        RLS ok
conversas        RLS ok   + historico jsonb    <- migracao 05 APLICADA
remarcacoes      RLS ok
acoes_pendentes  RLS ok   1 linha              <- migracao 05 APLICADA
```

**Zero policies no banco inteiro** — contei em `pg_policies`, resultado 0.
Confere com o desenho declarado: todo acesso pela chave de serviço, que só
existe no servidor.

### A única linha de `acoes_pendentes`

`ferramenta: mudar_situacao` · `situacao: feita` · `resultado: ok` ·
criada em 08/09/2026.

Ou seja: **o ciclo inteiro — propor, guardar, confirmar, executar, fechar —
já rodou contra o banco real pelo menos uma vez, com sucesso.** O que essa
linha *não* diz é de qual ambiente o toque veio: local e produção apontam
pro mesmo projeto. Não há nenhuma proposta pendurada em `aguardando`.

### Um detalhe que vale registrar

**Os 30 minutos vivem no *default da coluna*, não no código.**
`guardarAcao()` não envia `expira_em`. A regra de expiração que a
documentação trata como decisão de arquitetura é, na prática, uma
propriedade do schema — quem alterar o default muda o comportamento sem que
nenhum teste ou leitura de código perceba.

O *linter* do Supabase aponta cinco avisos INFO de "RLS sem policy", que são
exatamente o desenho pretendido, e um WARN de `btree_gist` no schema
`public` — a extensão que sustenta `sem_choque`. Cosmético.

---

## 10. Segurança — as camadas que existem de fato

Cada linha abaixo foi **lida no código**, não inferida da documentação.

| Camada | Estado |
|---|---|
| HMAC-SHA256 sobre os bytes crus, comparação em tempo constante, falha fechado | ✅ |
| Roteamento por número, antes de qualquer IA | ✅ |
| Botão de cliente nunca vira conversa com a IA (onze payloads + prefixos `k:` e `h:`) | ✅ |
| Foto vinda do número dela não vira conversa com a IA | ✅ |
| Proposta amarrada ao número, à situação e ao prazo | ✅ |
| Estado relido no momento do toque | ✅ |
| Validação independente na camada de dados | ✅ |
| Caminho da cliente sem poder de escrita (teste estrutural) | ✅ |
| RLS em cinco tabelas, zero policies, chave de serviço com `server-only` | ✅ |
| Painel: cada *server action* rechama `sessaoAtiva()` | ✅ |
| Cron com `Bearer` em tempo constante, fechado sem segredo | ✅ |
| Nenhum segredo no repositório (`.env.local` ignorado, conferido) | ✅ |
| PIX: valor vem do banco, nunca da URL | ✅ |

**Não encontrei credencial exposta** em código, documentação ou arquivo
rastreado pelo Git. **Não há nada a rotacionar por conta desta auditoria.**

### O callback do botão, atacado pelos quatro vetores

| Tentativa | Por que não funciona |
|---|---|
| Alterar o id | o `SELECT` exige que a linha seja **daquele número** e esteja `aguardando` |
| Reusar o payload | a primeira execução marca `feita` |
| Executar de outro telefone | o número vem do **payload assinado**, não do corpo |
| Executar proposta expirada | o `gte("expira_em", agora)` |

A única brecha que achei nesse conjunto é de **concorrência** (seção 14).

---

## 11. Testes

**356 testes em 24 arquivos, todos passando.** `tsc --noEmit` e `eslint`
limpos. Nada foi alterado pra isso.

| Arquivo | Casos | Protege |
|---|---|---|
| `assistente.test.ts` | 18 | que escrita vira proposta; que a descrição é por extenso; que id inexistente e situação inválida não propõem; que só o botão executa; **os dois testes estruturais** |
| `recepcao.test.ts` | **19** | que cliente nunca alcança o assistente; que botão de cliente e foto vindos do número dela vão pro atendimento |
| `atendente.test.ts` | 37 | o caminho da cliente, incluindo o teste que proíbe as funções de escrita |
| `agendamentos.test.ts` | 45 | a camada que as ferramentas de escrita usam embaixo |
| `notificacoes.test.ts` | 36 | envio, janela de 24 h, `whatsappDaKarol()` e o desvio |
| `agenda.test.ts` | 33 | a grade de horários — a fonte de `horarios_livres` |
| outros 18 arquivos | 168 | PIX, QR, sessão, datas, telefone, bloqueios, remarcação, lembretes, período, limite |

### O que os testes NÃO cobrem

- `lib/ia.ts` contra um provedor de verdade;
- a expiração de 30 min de ponta a ponta (o teste simula `buscarAcao`
  devolvendo `null`, o que prova o comportamento de quem chama, **não a
  regra no banco**);
- **o domingo na ferramenta `marcar`** — que é exatamente onde está o bug.

---

## 12. PROBLEMAS

### ⛔ BUG: o assistente oferece domingo, aceita a proposta, e falha só depois do toque dela

Em 12/09 o domingo entrou no expediente: `EXPEDIENTE` ganhou dois turnos em
Pereira Barreto no dia `0` (commit `c8259e8`). **A função que o assistente
usa pra descobrir a cidade não acompanhou** — `src/lib/assistente.ts:603`:

```ts
function cidadeDoDia(chave: string): CidadeId | null {
  const dia = new Date(`${chave}T12:00:00`).getDay();
  if (dia >= 1 && dia <= 5) return "pereira-barreto";
  if (dia === 6) return "bandeirantes";
  return null;                      // <- domingo cai aqui
}
```

A sequência que a Karol vive:

1. "tem horário domingo pra henna?" → `horarios_livres` lê o `EXPEDIENTE`
   de verdade e **oferece os horários de domingo**;
2. "marca a Ana domingo 8h" → `descrever()` valida serviço, nome, data e
   hora, **não consulta a cidade**, e a proposta é criada;
3. ela recebe os dois botões com a frase certa e toca em **✅ Confirmar**;
4. `executar()` chama `cidadeDoDia()`, recebe `null`, e responde:
   **"Não deu certo: Nesse dia você não atende."**

**São dois danos somados.** O agendamento de domingo não acontece pelo
assistente, nem com ela fazendo tudo certo. E a mensagem de erro **afirma
uma coisa falsa sobre o negócio dela**, contradizendo o site (que aceita
domingo) e o painel (onde a cidade é escolhida à mão e domingo funciona).

O defeito está **isolado no assistente**: é a única parte do sistema que
deriva cidade de um `if` escrito à mão em vez de ler o `EXPEDIENTE`.

**Correção sugerida** (não aplicada): o tipo `Horario` que a grade já
devolve **carrega a cidade** de cada vaga, vinda do `EXPEDIENTE`. Dá pra
derivar dali em vez de manter a tabela duplicada — e a validação deveria
subir pra `descrever()`, pra que um dia sem expediente seja recusado
*antes* de virar botão.

> ⚠️ **Decisão de negócio:** envolve confirmar com a Karol se domingo é
> Pereira Barreto nos dois turnos. Não alterei nada.

### ⚠️ Proposta expirada fica `aguardando` pra sempre

O valor `'expirada'` existe no tipo de `fecharAcao()` e no `CHECK` da
tabela, mas **nada no projeto nunca o escreve** — procurei em todo o `src/`.

Não é falha de segurança: o filtro `expira_em > now()` impede a execução de
todo jeito. O custo é que o índice parcial de abertas cresce sem limite e a
coluna `situacao` deixa de servir pra auditar o que ela **recusou** versus o
que só **venceu**.

### ⚠️ `criarBloqueio` não limita o tamanho do período

Valida formato, ordem das datas e motivo, mas **não há teto**. Uma proposta
de bloquear dez anos seria aceita e executada. O sentido é o seguro —
fechar a agenda não marca ninguém errado, e o painel desfaz — então é menor.
Vale um limite, porque a proposta vem de um modelo que pode errar o ano.

---

## 13. DIVERGÊNCIAS — código × documentação

Nenhuma é erro de código. Todas são a documentação descrevendo um passado
que já mudou.

### ⛔ 1. A migração 05 está aplicada. Três lugares dizem que não.

| | |
|---|---|
| **DOCUMENTAÇÃO** | `PROGRESSO.md` 6.1.2 marca `conversas` como "✅ / ⛔" e `acoes_pendentes` como "⛔", e afirma: "As migrações 04 e 05 ainda NÃO foram rodadas em produção". A seção 8.7 lista "Rodar `migracao-05-assistente.sql`" como pendente. `ASSISTENTE.md` abre com "Ligar são duas coisas: rodar a migração 05 e pôr a chave". |
| **BANCO** | **Aplicada.** `acoes_pendentes` existe com todos os `CHECK` e o índice parcial; `conversas.historico` existe com o comentário da migração; `agendamentos.avisado_30min_em` (migração 04) também existe. |
| **CÓDIGO** | Consistente com o banco — e a única linha de `acoes_pendentes` prova que o ciclo rodou. |
| **CURIOSIDADE** | `PROGRESSO.md` **contradiz a si mesmo**: no relato da etapa 19 está escrito "as migrações 04 e 05 *já estão aplicadas* (foram à mão, por isso não aparecem na lista de migrações)". A descoberta foi registrada no histórico e **nunca propagada** pras duas seções que as pessoas consultam. |
| **ESTADO** | ✅ pronto — e documentado como pendente |
| **RECOMENDAÇÃO** | Corrigir 6.1.2, 8.7 e a abertura de `ASSISTENTE.md`. Rodar a migração de novo seria **inofensivo** (`create table if not exists`, `add column if not exists`), mas ninguém deveria precisar descobrir isso na tentativa. |

### ⚠️ 2. "Ligar são duas coisas" virou uma

A migração já está feita. **Resta a chave.**

Sobre a chave: ❓ **não validado.** Não tenho leitura das variáveis de
ambiente da Vercel. `.env.local` tem a chave preenchida, o que explica o
assistente funcionar na máquina do Kainã, e **não diz nada** sobre
produção. Confirmar é abrir Settings → Environment Variables.

### ⚠️ 3. A contagem de testes do roteamento está desatualizada

`ASSISTENTE.md` diz "`recepcao.test.ts` (9 casos de roteamento)". São
**19**. Dobraram com o incidente de 12/09. A contagem de
`assistente.test.ts` (18) está **correta**.

### ❓ 4. O multiprovedor é compatível no protocolo, não validado no comportamento

A tabela de DeepSeek / OpenAI / Groq em `ASSISTENTE.md` **está
implementada** — as duas variáveis existem e são lidas. O que não existe é
evidência de que alguma delas já tenha sido exercitada: nenhum teste,
nenhum registro em `PROGRESSO.md`. Como o sistema inteiro depende de *tool
calling*, que é a parte onde provedores divergem mais, vale tratar a tabela
como **caminho previsto e não caminho testado**.

---

## 14. RISCOS

### ⚠️ Dois toques no mesmo botão podem executar duas vezes

Em `decisaoDoBotao()` a ordem é `executar()` **e depois** `fecharAcao()`. A
conferência de `situacao = 'aguardando'` e a escrita que a invalida são
**duas operações separadas**, sem transação nem `UPDATE ... WHERE situacao =
'aguardando'` condicional no meio. Dois toques quase simultâneos — coisa
que acontece no WhatsApp — podem atravessar a janela entre as duas.

**O dedupe do webhook não cobre isso:** é por `wamid`, e dois toques
genuínos são duas mensagens diferentes. Pior, é memória de processo, não
compartilhada entre instâncias do *serverless* — o que o próprio comentário
do arquivo admite.

O dano varia por ferramenta: `mudar_situacao` e `remarcar` são idempotentes
no efeito; **`marcar` criaria dois agendamentos** (salvo se `sem_choque`
recusar o segundo, o que provavelmente faz) e **`bloquear` criaria dois
bloqueios**, onde não há restrição nenhuma impedindo.

**Correção sugerida:** trocar o `SELECT` solto por

```sql
UPDATE acoes_pendentes SET situacao = 'executando'
WHERE id = ? AND whatsapp = ? AND situacao = 'aguardando' AND expira_em > now()
RETURNING *
```

que reivindica a ação atomicamente. ⚠️ Exige um valor novo no `CHECK` —
**decisão de schema, não minha.**

### ⚠️ Remarcar e marcar não validam o expediente na execução

`remarcarAgendamento()` confere formato, serviço e a restrição de
sobreposição — mas **não** se o horário de destino está dentro do
expediente, nem se há bloqueio ali. Então "passa a Ana pra domingo 3h" vira
proposta, ela confirma, e **grava**.

O que hoje impede isso é a **regra 8 do prompt**. Pelo próprio critério do
projeto — *um prompt dizendo "não faça isso" não substitui validação no
backend* — essa é a camada mais fraca do sistema.

> Observação importante: o risco é **compartilhado com o painel**, onde é em
> parte intencional (ela pode querer encaixar fora do horário). A diferença
> é que no painel quem digita é uma pessoa que sabe o que quer, e no
> assistente quem propõe é um modelo.

### ❓ Chamada de ferramenta inventada no meio de leituras derruba a rodada

O loop empurra **todas** as `tool_calls` pro histórico, mas só devolve
resultado pras que estão em `LEITURA`. Se o modelo pedir uma leitura junto
com um nome de ferramenta que não existe, a próxima requisição sai com mais
`tool_calls` do que respostas — que APIs no dialeto OpenAI recusam com 400.

**Falha de forma segura:** `perguntar()` devolve `null` e ela recebe "Não
consegui pensar agora" com o link do painel. Nenhuma informação falsa,
nenhuma escrita. É um beco sem saída, não um perigo.

### ⚠️ `KAROL_WHATSAPP` continua decidindo duas coisas ao mesmo tempo

A mesma variável escolhe **pra quem vão os avisos** e **quem o assistente
atende**. Enquanto estiver preenchida com o número do Kainã, a Karol não
recebe aviso nenhum e *não é ela* que o assistente atende.

Isso está bem documentado (`PROGRESSO.md` 8.1, "a armadilha mais perigosa
do projeto") e apagar a variável resolve as duas de uma vez. Não tenho como
verificar o valor em produção. O que posso dizer é que **o acoplamento é
real no código**: `ehAKarol()` e o destino das notificações leem a mesma
função.

---

## 15. PENDÊNCIAS — estado de cada parte

| Parte | Estado |
|---|---|
| Recepção e roteamento | ✅ **PRONTO** — testado, e endurecido por dois incidentes reais |
| Loop da IA, ferramentas de leitura | ✅ **PRONTO** |
| Propostas, botões, execução | ✅ **PRONTO** — quatro travas verificadas; uma brecha de concorrência |
| Memória da conversa e "esquece" | ✅ **PRONTO** |
| Migrações 04 e 05 | ✅ **PRONTO** — aplicadas à mão; documentação diz o contrário |
| Ferramenta `marcar` em domingo | ⛔ **QUEBRADO** |
| Limpeza de propostas vencidas | ⚠️ **AUSENTE** |
| Validação de expediente na escrita | ⚠️ **PARCIAL** — existe só no prompt |
| `DEEPSEEK_API_KEY` na Vercel | ❓ **DESCONHECIDO** |
| `KAROL_WHATSAPP` em produção | ❓ **DESCONHECIDO** |
| Multiprovedor (OpenAI, Groq) | ❓ **PRECISA VALIDAR** |
| Domingo e fim da noite confirmados com a Karol | ⚠️ **COM ELA** |

---

## 16. RECOMENDAÇÕES

Nenhuma foi executada. As que tocam em regra de negócio ou schema são
decisão do dono do projeto.

| # | O quê | Por quê | Esforço |
|---|---|---|---|
| 1 | Corrigir o domingo em `cidadeDoDia()`, derivando a cidade do `EXPEDIENTE`, e subir a validação pra `descrever()` | Hoje o assistente falha **depois** do toque dela e afirma algo falso sobre o negócio. Derivar da fonte única impede que a próxima mudança de expediente reabra o mesmo buraco | Baixo |
| 2 | Atualizar `PROGRESSO.md` 6.1.2 e 8.7 e a abertura de `ASSISTENTE.md` sobre as migrações 04 e 05 | A documentação manda fazer um trabalho já feito e esconde que falta só a chave | Baixo |
| 3 | Confirmar `DEEPSEEK_API_KEY` e `KAROL_WHATSAPP` na Vercel | São as duas únicas coisas entre "código pronto" e "funciona pra ela" | Minutos |
| 4 | Tornar a reivindicação da proposta atômica, com `UPDATE ... RETURNING` | Fecha a única brecha no fluxo do botão. ⚠️ Exige valor novo no `CHECK` | Baixo |
| 5 | Testar a expiração de 30 min de ponta a ponta, e o domingo na `marcar` | A regra dos 30 min vive no default da coluna, fora do alcance de qualquer teste. E o domingo passou porque nada olhava | Baixo |
| 6 | Validar expediente e bloqueio dentro de `remarcarAgendamento()` e `criarAgendamentoNoPainel()` | Move a regra do prompt pro backend. ⚠️ **Decisão de negócio:** pode ser que ela queira encaixar fora do horário pelo painel — então talvez a validação deva ser só do lado do assistente | Médio |
| 7 | Marcar propostas vencidas como `'expirada'` | Devolve sentido à coluna `situacao` e impede o índice parcial de crescer pra sempre | Baixo |
| 8 | Limitar o período de `criarBloqueio()` | A proposta vem de um modelo que pode errar o ano | Baixo |

### ⛔ O que eu NÃO recomendo mexer

- a separação entre `assistente.ts` e `atendente.ts`;
- os testes estruturais que leem o texto-fonte;
- o fluxo de proposta e confirmação;
- a lista de 14 dias do *system prompt*.

Cada um existe por causa de um erro que **já aconteceu**, e os comentários
do código registram qual. **O que parece redundância aqui é, quase sempre,
cicatriz.**

---

## Ressalva sobre o retrato

A árvore se moveu durante a auditoria. O encaminhamento do comprovante do
PIX e o segundo número de WhatsApp entraram enquanto eu lia, e foram
commitados em `030a76e` e `0da9719`. Reli o que mudou e rodei a suíte de
novo: **356 testes, tudo verde.**

`cidadeDoDia()` continua igual, palavra por palavra — **o bug do domingo
vale pro código que está no disco agora.**
