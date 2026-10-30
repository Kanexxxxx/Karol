# Templates do WhatsApp

Os **7 templates aprovados na Meta**, campo a campo, com o texto que está
lá. Template é a única forma de falar com quem **não escreveu nas últimas
24 h** (ver [`whatsapp.md`](./whatsapp.md)).

**Onde criar e editar:**
`https://business.facebook.com/wa/manage/message-templates/?waba_id=958269250650095`

> [!IMPORTANT]
> `src/lib/templates-da-meta.test.ts` trava, para cada template, **a
> quantidade de variáveis** e o par evento → template. Mudou um template na
> Meta? Mude o teste e `notificacoes.ts` junto, no mesmo commit.

| Template | Quando sai | Variáveis | Botões (payload, na ordem) |
|---|---|---|---|
| `confirmacao_agendamento` | cliente marcou (serviço sem entrada) | 5 | `confirmar` · `remarcar` · `falar` |
| `pedido_sinal` | cliente marcou e deve a entrada | 5 | `pix` · `falar` |
| `aviso_karol_novo_agendamento` | pra Karol, a cada agendamento | 5 | link pro painel |
| `lembrete_vespera` | um dia antes | 4 | `confirmar` · `remarcar` · `falar` |
| `pos_atendimento` | dia seguinte ao atendimento | 1 | `nota_otimo` · `nota_bom` · `nota_ruim` |
| `horario_remarcado` | a Karol mudou o horário | 4 | `confirmar` · `remarcar` · `falar` |
| `horario_cancelado` | a Karol cancelou, ou a entrada venceu | 3 | `remarcar` · `falar` |

Todos: categoria **Utilidade**, idioma **Português (BR)**, rodapé
`Studio Karol Carvalho`, validade personalizada de **12 horas**.

> [!NOTE]
> `lembrete_30min` foi **removido em 13/09/2026** (a Karol nunca pediu esse
> aviso). Não crie; se existir na Meta, apague.

---

## Regras que fazem a Meta recusar

- O corpo **não pode começar nem terminar com variável**.
- **Duas variáveis não podem ficar coladas** (`{{1}} {{2}}`).
- **Cabeçalho:** só texto puro — sem emoji, negrito ou quebra de linha.
  No corpo, emoji e `*negrito*` funcionam.
- **Rodapé não aceita variável.**
- **Exemplos são obrigatórios**, um por variável. Servem só para aprovar —
  o texto real vem do agendamento, por `enviarTemplate`.
- **Validade padrão é 10 minutos.** Ligue a validade personalizada (12 h),
  senão quem está sem sinal por 10 min não recebe.

### Não aceite "Marketing"

O classificador da Meta pode dizer "a categoria não corresponde" e sugerir
Marketing. **Recuse:** custa ~8× mais e não chega a quem desativou
marketing — o pedido de entrada sumiria pra parte das clientes. O que
dispara é **tom de oferta** ("garanta", "aproveite", "não perca", "vaga").
Comece pelo fato ("Recebi o seu pedido"), dados em lista seca
(`Serviço:`, `Data:`, `Local:`).

### A ordem dos botões importa

O site manda um **payload escondido** por botão, **pela posição**. Pode
mudar o texto do botão; **não pode mudar a ordem nem a quantidade** — se
sobrar ou faltar, a Meta recusa o envio inteiro.

O botão "Falar com a Karol" leva a cliente pro WhatsApp **pessoal** dela,
porque o número da API não tem caixa de entrada.

### Editar template aprovado

É permitido, mas o template **volta pra análise** — e enquanto estiver em
análise (ou se for recusado), toda mensagem que depende dele deixa de
sair. Só edite com folga de tempo.

---

## `confirmacao_agendamento`

A mais importante: é ela que abre a janela de 24 h.

**Cabeçalho:** `Horário reservado`

```
Oi, {{1}}! Seu horário no Studio Karol Carvalho está reservado. 💛

💄 *{{2}}*
📅 {{3}}
📍 {{4}}
💰 {{5}}

Antes de vir: venha sem maquiagem. Se for trazer acompanhante, no máximo uma pessoa. 🤍

É só tocar num botão aqui embaixo pra falar comigo.
```

**Botões (resposta rápida):** `✅ Confirmar` · `📅 Preciso remarcar` · `💬 Falar com a Karol`

**Exemplos:** `Maria` · `Design com henna` · `quarta-feira, 9 de setembro às 07:00` · `Pereira Barreto` · `R$ 30,00`

---

## `pedido_sinal`

Sai no lugar da confirmação quando o serviço pede **entrada** (R$ 80 ou
mais). Quando a cliente toca em **Receber o PIX**, o toque abre a janela e
o site responde na hora, de graça.

A cliente lê **"entrada"**; do lado da Karol continua "sinal".

**Cabeçalho:** `Pagamento da entrada pendente`

```
Oi, {{1}}. Recebi o seu pedido de horário e ele está aguardando o pagamento da entrada.

💄 Serviço: {{2}}
📅 Data: {{3}}
📍 Local: {{4}}
💰 Valor da entrada: {{5}}

A entrada desconta do valor final do atendimento.

Toque no botão abaixo para receber a chave PIX e o QR Code com o valor. Assim que o pagamento for confirmado, o horário fica reservado. 💛
```

**Botões (resposta rápida, nesta ordem):** `Receber o PIX` · `Falar com a Karol`

**Exemplos:** `Maria` · `Brow lamination` · `sábado, 12 de setembro às 14:00` · `Bandeirantes D'Oeste` · `R$ 40`

> [!NOTE]
> **A última frase está desatualizada, e é a que está na Meta.** Ela promete
> "a chave PIX **e** o QR Code", mas o sistema pergunta qual a cliente
> prefere (QR ou copia e cola). Custa um toque a mais e nada além disso.
> Não foi trocada na entrega (16/09) para o template não voltar pra análise.
> Quando houver folga, troque por:
>
> ```
> Toque no botão abaixo e eu te mando o PIX do jeito que você preferir: QR Code ou copia e cola. Assim que o pagamento for confirmado, o horário fica reservado. 💛
> ```

---

## `aviso_karol_novo_agendamento`

Vai pra **Karol**. Também precisa de template: ela não escreve pro chip da
API, então a janela dela vive fechada.

**Cabeçalho:** `Novo agendamento`

```
Chegou agendamento novo pelo site, Karol! ✨

💄 *{{1}}* — {{2}}
📅 {{3}}
📍 {{4}}

👤 {{5}}

Toque no botão pra abrir no painel e confirmar, remarcar ou cancelar.
```

**Botão (Ir para o site, URL dinâmica):** `Abrir no painel` →
`https://karol-zeta.vercel.app/painel?q={{1}}`
(exemplo: `https://karol-zeta.vercel.app/painel?q=5518999998888`). Abre o
painel filtrado pelo telefone da cliente.

> [!WARNING]
> **O domínio está gravado no template, não no código.** Ao trocar de
> domínio (ou virar pra VPS), edite a URL deste botão na Meta — senão o
> link continua indo pra `karol-zeta.vercel.app`.

**Exemplos:** `Design com henna` · `R$ 30,00` · `quarta-feira, 9 de setembro às 07:00` · `Pereira Barreto` · `Maria Silva · (18) 99999-8888`

---

## `lembrete_vespera`

Um dia antes. Quase sempre cai fora da janela.

**Cabeçalho:** `Seu horário é amanhã`

```
Oi, {{1}}! Passando pra lembrar do seu horário amanhã. ✨

💄 *{{2}}*
📅 {{3}}
📍 {{4}}

Lembrando: venha sem maquiagem. 🤍

Se surgiu alguma coisa e você não vai conseguir, me avisa hoje — assim dá tempo de encaixar outra pessoa nesse horário. 🙏
```

**Botões (resposta rápida):** `✅ Estarei lá` · `📅 Preciso remarcar` · `💬 Falar com a Karol`

**Exemplos:** `Maria` · `Design com henna` · `quarta-feira, 9 de setembro às 07:00` · `Pereira Barreto`

---

## `pos_atendimento`

Dia seguinte ao atendimento. A resposta da cliente é repassada pro
WhatsApp da Karol — a nota ruim chega marcada com ⚠️.

**Cabeçalho:** `Como foi?`

```
Oi, {{1}}! Foi muito bom te atender. 🥰

Me conta o que você achou? É só tocar num botão aqui embaixo — e se quiser escrever, melhor ainda. 💛
```

**Botões (resposta rápida, nesta ordem):** `Amei o resultado` · `Gostei` · `Pode melhorar`

Três, não quatro: a partir do quarto a Meta vira tudo numa lista que quase
ninguém abre. O código ainda aceita o payload `feedback` de uma versão
antiga do template.

**Exemplo:** `Maria`

---

## `horario_remarcado`

Quando a **Karol** muda o horário pelo painel ou pelo assistente.

**Cabeçalho:** `Seu horário mudou`

```
Oi, {{1}}! Precisei mudar o seu horário, me desculpa. Ficou assim:

💄 Serviço: {{2}}
📅 Novo horário: {{3}}
📍 Local: {{4}}

Se esse novo horário não der, me avisa por aqui que a gente acha outro. 🤍
```

**Botões (resposta rápida, nesta ordem):** `✅ Está bom` · `📅 Preciso remarcar` · `💬 Falar com a Karol`

**Exemplos:** `Maria` · `Design com henna` · `quinta-feira, 17 de setembro às 19:00` · `Pereira Barreto — Rua Atlântico, 884 (Condomínio da Praia)`

---

## `horario_cancelado`

Quando a **Karol** cancela, ou quando a entrada não foi paga em 30 min.

**Cabeçalho:** `Sobre o seu horário`

```
Oi, {{1}}. Precisei cancelar o seu horário, me desculpa mesmo.

💄 Serviço: {{2}}
📅 Era: {{3}}

Me chama por aqui que a gente acha outro dia. 💛
```

**Botões (resposta rápida, nesta ordem):** `📅 Quero remarcar` · `💬 Falar com a Karol`

**Exemplos:** `Maria` · `Design com henna` · `quinta-feira, 17 de setembro às 19:00`
