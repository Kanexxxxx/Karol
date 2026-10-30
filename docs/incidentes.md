# Incidentes e lições

O que **já quebrou no ar**, a causa de verdade e a regra que ficou.
⚠️ **Leia antes de mexer em notificação, lembrete ou PIX.**

Todos os itens abaixo estão **resolvidos e no ar**. Mexer de novo corre o
risco de desfazer — leia o conserto antes de propor outro.

| Data | O que aconteceu | Commit do conserto |
|---|---|---|
| 18/09/2026 | **97 mensagens em 7 segundos** — laço de aviso de falha | `6ea7171` `c1f821a` `336d4cf` `ddf0a60` `d210fe5` |
| 16/09/2026 | PIX recusado pelo banco ("rejeitado pelo PSP do recebedor") | `1e6578c` |
| 16/09/2026 | lembrete da véspera chegando duas vezes | `c6502ef` |
| 13/09/2026 | **nenhuma cliente que marcava pelo site recebia a confirmação** | `002287d` |
| 13/09/2026 | assistente "burro": respostas vazias ou cortadas | `696d9f5` |
| 09/09/2026 | build quebrado, chave PIX nula e tela prometendo devolver a entrada | `1d87cec` |
| 06/09/2026 | primeiro agendamento real gravou o número sem DDI | `b657edc` |
| 06/09/2026 | link do painel e sitemap apontando pra domínio que não existia | `6d5e745` |
| 05/09/2026 | bloqueio de dia inteiro (férias, feriado) não bloqueava nada | `de25ca1` |

---

## 18/09/2026, 09:49 — 97 mensagens em 7 segundos

**Gravidade:** alta. WhatsApp da Karol e do Kainã, com risco de bloqueio do
número pela Meta. Quem interrompeu foi a Meta: 97 erros `131056 (pair rate
limit hit)` entre 12:49:26 e 12:49:33 UTC.

### A causa, em ordem

1. **O código inventava um telefone.** Sem WhatsApp, `criarAgendamentoNoPainel`
   gravava o número da própria Karol, achando que o banco exigia:
   `cliente_whatsapp: whatsapp || NEGOCIO.whatsapp.numero`.
2. **A crença estava errada.** O CHECK `cliente_whatsapp ~ '^[0-9]{10,13}$'`
   recusa `''`, mas **aceita `null`** — no Postgres, CHECK que resulta em
   NULL passa. A coluna sempre foi nullable.
3. **11 agendamentos ficaram com o número dela** (clientes que ela tinha
   marcado por fora).
4. O sistema avisava "a cliente", que era ela, com a janela fechada → `131047`.
5. **A falha virava aviso, e o aviso falhava também** → nova falha → passo 4.
6. **A trava anti-spam não segurou**: o histórico em `notificacoes.ts` é um
   `Map` em memória, e na Vercel cada webhook é um processo novo.

Um teste guardava o erro: chamava-se *"sem WhatsApp usa o número da própria
Karol, que o banco exige"* e passava verde.

### O que está no ar

- **Sem telefone grava `null`.** Quem lê converte pra `""` (`paraDados` em
  `agendamentos.ts`).
- **O painel pergunta na cara:** "Tenho o número" ou "Não tenho"
  (`EscolhaDoWhatsapp` em `app/painel/novo/Formulario.tsx`).
- **Guardas em `enviarEvento`:** sem número → não envia; número é o da Karol
  → não envia, exceto `novo-agendamento`. Regra do Kainã: *"não quero que
  chegue NADA no WhatsApp dela"*.
- **`ehONumeroDaKarol()` compara os dois números** (`KAROL_WHATSAPP` **e**
  `NEGOCIO.whatsapp.numero`) pelos últimos 11 dígitos — `endsWith` casava
  telefone de um dígito.
- **O aviso de falha de entrega** (em `api/whatsapp/route.ts`, que não passa
  por `enviarEvento`) também não vai mais pro número da Karol nem do técnico
  (`ehDestinoDeAlerta`).

### O que ficou de fora, e por quê

| | |
|---|---|
| As 11 linhas continuam com o número dela | as guardas impedem o envio. Trocar por `null` é `UPDATE` em produção: só com o Kainã mandando |
| A trava anti-spam continua em memória | é segunda linha de defesa. O conserto de verdade é histórico no banco com teto diário por número — e isso é migração |

---

## 13/09/2026 — a confirmação nunca chegava

Desde que o WhatsApp foi ligado, **nenhuma cliente que marcava pelo site
recebia a confirmação**. Quem marca nunca escreveu pro studio, então a
janela está fechada. O código já trocava texto livre por template quando
vinha `131047` — mas a Meta respondia **200** no envio e o `131047` só
chegava minutos depois, pelo webhook de entrega. A troca nunca acontecia.

Três hipóteses foram derrubadas antes (cartão, limite, modo do app), por
adivinhar em vez de ler o erro. A resposta estava no próprio webhook, que
descartava o `failed` como "recibo de entrega".

**Conserto:** `enviarEvento` pergunta se a janela está aberta **antes** de
escolher; dúvida = fechada = template. E todo `failed` vira aviso, com o
código da Meta.

---

## As lições que viraram regra

| Regra | De onde veio |
|---|---|
| **Nunca invente dado pra satisfazer o banco.** Confira: `select (null::text ~ 'regex')` devolve `null`, e CHECK com `null` passa. | 97 mensagens |
| **Teste que descreve uma crença não protege nada.** Quebre o código de propósito e veja o teste ficar vermelho. | 97 mensagens; número sem DDI (o teste esperava o número errado) |
| **Trava em memória não segura laço alimentado por requisição.** Na Vercel cada chamada é um processo novo. | 97 mensagens |
| **Agrupe alerta pela natureza do erro, não pelo dado.** Telefone no assunto fazia cada cliente virar um alerta. | `4f8f01f` |
| **Aceitar ≠ entregar.** Erro da Meta pode chegar depois, pelo webhook. Decida antes de enviar. | confirmação que nunca chegava |
| **Leia o código do erro antes de levantar hipótese.** | idem; PIX ("PSP do recebedor" era o `txid`, não a conta) |
| **Marque "já enviei" só depois de enviar.** Ao contrário, troca um defeito chato (duplicado) por um calado (nunca chega). | lembrete duplicado — o cron não era o único a disparar: havia um botão no painel |
| **Teste a costura, não só as partes.** `bloqueios` e `agenda` estavam certos sozinhos; a junção não. | bloqueio que não bloqueava |
| **Uma fonte da verdade.** Texto chumbado ("7h às 11h") vira mentira no dia em que ela muda de horário. | horário público vs `EXPEDIENTE` |
| **404 não lança exceção.** Domínio padrão errado passou meses sem ninguém ver. | `SITE_URL` |
| **Ao editar, apague a linha antiga.** Em objeto literal a última chave vence, em silêncio: `chavePix: null` depois da chave certa. | resgate de 09/09 |
| **Coluna que falta não quebra a tela** — a consulta volta vazia. Migração antes do deploy. | migrações |
| **Variável nova só vale no build seguinte.** Redeploy depois de mexer nelas. | mordeu duas vezes |
| **Configuração antes de culpar o modelo.** `max_tokens: 700` era consumido inteiro pelo pensamento. | assistente "burro" |
| **Antes de commit, push ou SQL: confira pasta, branch e banco.** `Karol v1` (`radyfwowhmyeulfhhuco`) é produção com cliente real; `Karol v2` (`ugbpszsahtcbswueyeks`) é teste. | vários chats no mesmo projeto |
