# Incidentes de produção

Um registro por incidente que chegou na cliente ou na Karol. Não é
changelog: só entra o que **aconteceu no ar**, com a causa de verdade e
como foi fechado.

> **Se você é um chat novo e veio parar aqui:** o de 18/09 está
> **RESOLVIDO e no ar**. Não é preciso mexer, e mexer de novo corre o
> risco de desfazer. Leia a seção "o que já está no ar" antes de propor
> qualquer coisa.

---

## 18/09/2026, 09:49 — 97 mensagens em 7 segundos

**Gravidade:** alta. WhatsApp da Karol e do Kainã, e risco de bloqueio do
número pela Meta.
**Estado:** ✅ **RESOLVIDO.** Commits `6ea7171`, `c1f821a`, `336d4cf` e o
que traz este arquivo. Tudo na `main`, tudo no ar.

### O que apareceu

97 erros `131056 (pair rate limit hit)` entre 12:49:26 e 12:49:33 UTC, na
rota `/api/whatsapp`. Quem interrompeu não foi o nosso código: foi a Meta,
recusando por limite.

### A causa, em ordem

1. **O código inventava um telefone.** Em `criarAgendamentoNoPainel`, sem
   WhatsApp a linha gravava o número da própria Karol:

   ```ts
   // sem WhatsApp (encaixe da família) o CHECK do banco recusaria vazio,
   // então guarda o número dela mesma
   cliente_whatsapp: whatsapp || NEGOCIO.whatsapp.numero,
   ```

2. **A crença por trás estava meio errada.** O CHECK é
   `cliente_whatsapp ~ '^[0-9]{10,13}$'`. Ele recusa `''` — verdade. Mas
   **aceita `null`**: no Postgres um CHECK que resulta em NULL passa, só
   barra em FALSE. A coluna sempre foi nullable.

3. **11 linhas ficaram com o número dela.** A Karol cadastrou 11 clientes
   que já tinha marcado por fora e deixou o telefone em branco.

4. **O sistema então tentava avisar "a cliente", que era ela**, com a
   janela de 24 h fechada → `131047`.

5. **A falha virava aviso, e o aviso falhava também** → a Meta devolvia
   novos "entrega falhou" → volta ao passo 4. Laço.

6. **A trava anti-spam não segurou** porque o `HISTORICO` em
   `notificacoes.ts` é um `Map` na MEMÓRIA do processo. Na Vercel cada
   webhook é uma execução nova: o Map nasce vazio, a janela de 15 min
   nunca vale, o teto por processo reinicia toda vez.

### ⚠️ E um teste guardava o erro

O teste se chamava **"sem WhatsApp usa o número da própria Karol, que o
banco exige"** e passava verde. O nome dizia a crença, não a realidade —
e foi o que fez o bug durar. Trocado por um que afirma `null`.

---

## O que já está no ar

### 1. Sem telefone grava `null`

`criarAgendamentoNoPainel` nunca mais escreve o número da Karol no lugar
do da cliente. Quem lê converte `null` para `""` (ver `paraDados` em
`agendamentos.ts`), e as 25 leituras espalhadas já testavam com
`if (ag.clienteWhatsapp)`.

### 2. O painel pergunta na cara

O campo virou uma escolha de dois botões: **"Tenho o número"** ou
**"Não tenho"**. Em "não tenho" o `<input name="whatsapp">` sai da tela,
o formulário não manda o campo, e o banco recebe `null`.

Era um campo opcional com dica em cinza — e ninguém viu.
Ver `EscolhaDoWhatsapp` em `app/painel/novo/Formulario.tsx`.

### 3. Duas guardas em `enviarEvento`

```
sem número             -> não manda, motivo "sem-whatsapp"
número é o da Karol    -> não manda, motivo "cliente-e-a-propria-karol"
                          EXCEÇÃO: novo-agendamento, que é o aviso que
                          existe PRA ela
```

Não passam: `confirmacao`, `remarcado`, `cancelado`, `sinal-vencido`,
`agradecimento`, `lembrete`. Regra do Kainã, 18/09: *"não quero que
chegue NADA no WhatsApp dela"*.

### 4. A comparação olha OS DOIS números

`ehONumeroDaKarol()` compara contra `KAROL_WHATSAPP` **e** contra
`NEGOCIO.whatsapp.numero`. `whatsappDaKarol()` é um OU outro — com a
variável apontando pra um número desviado, o número REAL dela deixaria de
ser reconhecido, que é justamente o que está nas 11 linhas. Achado pelo
chat da v2.

Compara os últimos 11 dígitos (DDD + número). Antes era `endsWith`, e
`"5518997525291".endsWith("1")` é `true` — um telefone de um dígito
casaria com o dela.

---

## O que NÃO foi feito, e por quê

| | |
|---|---|
| **As 11 linhas continuam com o número dela** | As guardas impedem o envio, então não há laço. Trocar por `null` é `UPDATE` em produção: só com o Kainã mandando. |
| **`lembrete_enviado_em` continua preenchido nelas** | Silenciadas em 16/09. Nem com o lembrete liberado elas disparariam. |
| **A trava anti-spam continua na memória** | Ela é a segunda linha de defesa, e só valeria pra um laço futuro que ninguém previu. O conserto de verdade é guardar o histórico no banco, com teto diário por número — e isso é migração. |

---

## Como não repetir

1. **Nunca inventar dado de cliente pra satisfazer o banco.** Se a coluna
   parece exigir, confira: `select (null::text ~ 'regex')` no Postgres
   devolve `null`, e CHECK com `null` passa.
2. **Teste que descreve uma crença não protege nada.** Antes de confiar,
   quebre o código de propósito e veja o teste ficar vermelho.
3. **Trava em memória não segura laço alimentado por requisição.** Na
   Vercel cada chamada é um processo novo.
4. **Antes de commit, push ou branch:** conferir pasta, branch e qual
   banco. São dois — `Karol v1` (`radyfwowhmyeulfhhuco`) é produção com
   cliente real; `Karol v2` (`ugbpszsahtcbswueyeks`) é teste.
