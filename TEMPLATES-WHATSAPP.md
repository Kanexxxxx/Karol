# Templates do WhatsApp — pra colar na Meta

> **Pra que serve:** template é a única forma de mandar mensagem pra uma
> cliente que **não escreveu primeiro**. Sem ele, a Meta recusa com `131047`.
>
> **Onde criar** (link direto):
> `https://business.facebook.com/wa/manage/message-templates/?waba_id=958269250650095`
>
> **Quanto custa:** categoria *utility* no Brasil fica em torno de
> **R$ 0,05–0,08 por mensagem entregue**. No volume da Karol (~4 clientes por
> dia útil) dá algo entre **R$ 6 e R$ 10 por mês**.
>
> ⚠️ **O detalhe que paga a conta:** assim que a cliente toca em qualquer
> botão, a **janela de 24 h abre** e tudo depois disso é texto livre e de
> graça. Você paga só a primeira mensagem de cada conversa.

---

## Regras que fazem a Meta recusar (leia antes)

Aprendi na marra o que reprova um template:

- **O corpo não pode começar nem terminar com variável.** `{{1}}, seu horário…`
  é recusado. Tem que ter texto antes.
- **Duas variáveis não podem ficar coladas.** `{{1}} {{2}}` reprova; precisa de
  texto ou pontuação entre elas.
- **Nada de promessa de venda em template *utility*.** "Aproveite", "desconto",
  "promoção" jogam o template pra categoria *marketing*, que é mais cara e
  mais rígida. Os textos abaixo são puramente informativos de propósito.
- **Emoji pode.** Negrito com `*asterisco*` e itálico com `_underline_` também.
- **Rodapé não aceita variável.**
- **Os exemplos são obrigatórios.** A Meta testa o template com eles.

---

## 1. `confirmacao_agendamento`

A que sai na hora que a cliente marca pelo site. É a mais importante: é ela
que abre a janela.

| Campo | Valor |
|---|---|
| **Nome** | `confirmacao_agendamento` |
| **Categoria** | Utilidade |
| **Idioma** | Português (BR) |

### Cabeçalho
Tipo: **Texto**

```
Seu horário está guardado ✨
```

### Corpo

```
Oi, {{1}}! Aqui é a Karol. 💛

Já guardei esse horário no seu nome:

💄 *{{2}}*
🗓️ {{3}}
📍 {{4}}
💵 {{5}}

Só dois pedidinhos: venha sem maquiagem, e se trouxer acompanhante, que seja no máximo uma. 🤍

Te espero! Se precisar de qualquer coisa, é só tocar num botão aqui embaixo. 👇
```

### Rodapé

```
Studio Karol Carvalho
```

### Botões
Tipo: **Resposta rápida** (os três)

| | Texto do botão |
|---|---|
| 1 | `✅ Confirmar` |
| 2 | `📅 Preciso remarcar` |
| 3 | `💬 Falar com a Karol` |

### Exemplos (a Meta pede)

| Variável | Exemplo |
|---|---|
| `{{1}}` | `Maria` |
| `{{2}}` | `Design com henna` |
| `{{3}}` | `quarta-feira, 9 de setembro às 07:15` |
| `{{4}}` | `Pereira Barreto` |
| `{{5}}` | `R$ 30,00` |

---

## 2. `lembrete_vespera`

Sai um dia antes. Cai fora da janela quase sempre — a cliente marcou faz
dias e não escreveu nada desde então. Por isso precisa de template.

| Campo | Valor |
|---|---|
| **Nome** | `lembrete_vespera` |
| **Categoria** | Utilidade |
| **Idioma** | Português (BR) |

### Cabeçalho
Tipo: **Texto**

```
É amanhã! 💛
```

### Corpo

```
Oi, {{1}}! Passando só pra lembrar que é amanhã. ✨

💄 *{{2}}*
🗓️ {{3}}
📍 {{4}}

Não esquece de vir sem maquiagem, tá? 🤍

Se surgiu alguma coisa e você não vai conseguir, me avisa hoje — assim dá tempo de encaixar outra pessoa nesse horário. 🙏
```

### Rodapé

```
Studio Karol Carvalho
```

### Botões
Tipo: **Resposta rápida**

| | Texto do botão |
|---|---|
| 1 | `✅ Estarei lá` |
| 2 | `📅 Preciso remarcar` |
| 3 | `💬 Falar com a Karol` |

### Exemplos

| Variável | Exemplo |
|---|---|
| `{{1}}` | `Maria` |
| `{{2}}` | `Design com henna` |
| `{{3}}` | `quarta-feira, 9 de setembro às 07:15` |
| `{{4}}` | `Pereira Barreto` |

---

## 3. `aviso_karol_novo_agendamento`

Esta vai pra **Karol**, não pra cliente. Também precisa de template, e pelo
mesmo motivo: a Karol não fica mandando mensagem pro próprio chip o dia
inteiro, então a janela dela vive fechada.

| Campo | Valor |
|---|---|
| **Nome** | `aviso_karol_novo_agendamento` |
| **Categoria** | Utilidade |
| **Idioma** | Português (BR) |

### Cabeçalho
Tipo: **Texto**

```
Agendamento novo 🗓️
```

### Corpo

```
Karol, entrou agendamento novo pelo site! ✨

👤 *{{1}}*
💄 {{2}} — {{3}}
🗓️ {{4}}
📍 {{5}}

Toque no botão pra abrir no painel: de lá você confirma, remarca, cancela ou chama a cliente no WhatsApp.
```

### Rodapé

```
Studio Karol Carvalho
```

### Botões
Tipo: **Ir para o site** (URL dinâmica)

| Campo | Valor |
|---|---|
| Texto do botão | `Abrir no painel` |
| Tipo de URL | **Dinâmica** |
| URL | `https://karol-zeta.vercel.app/painel?q={{1}}` |
| Exemplo da URL | `https://karol-zeta.vercel.app/painel?q=1CF02F` |

> É esse botão que substitui o código que ficava escrito na mensagem. Ela
> toca, cai no painel já com o agendamento aberto, e resolve por lá. O
> código continua existindo por dentro como chave do link — ninguém digita,
> ninguém vê.

### Exemplos

| Variável | Exemplo |
|---|---|
| `{{1}}` | `Maria Silva · (18) 99999-8888` |
| `{{2}}` | `Design com henna` |
| `{{3}}` | `R$ 30,00` |
| `{{4}}` | `quarta-feira, 9 de setembro às 07:15` |
| `{{5}}` | `Pereira Barreto` |

---

## Foto e nome do estúdio na conversa

Hoje a cliente vê só um número. Dá pra arrumar boa parte disso:

**Link direto** (já com o WABA da Karol):

```
https://business.facebook.com/wa/manage/phone-numbers/?waba_id=958269250650095
```

Clica no número **+55 (16) 92008-8473** → aba **Perfil**.

Lá dá pra preencher, e tudo isso aparece pra quem abre a conversa:

| Campo | O que pôr |
|---|---|
| Foto do perfil | a foto do ensaio dela (`capas/` tem as boas) |
| Descrição | `Sobrancelhas, maquiagem e curso de automaquiagem` |
| Categoria | Beleza, spa e salão |
| Endereço | Pereira Barreto e Bandeirantes D'Oeste, SP |
| Site | `https://karol-zeta.vercel.app` |
| E-mail | o dela |

⚠️ **A foto e a descrição funcionam já.** O **nome** aparecer em vez do
número depende de a Meta aprovar o nome de exibição, e isso pode esbarrar na
**verificação da empresa** (Etapa 3), que pede documento — e a Karol não tem
CNPJ. Vale tentar: a foto e a descrição sozinhas já mudam muito a cara da
conversa.

---

## Depois de criar

1. A aprovação costuma sair em **minutos**, às vezes horas.
2. Status em **WhatsApp Manager → Modelos de mensagem**.
3. Se reprovar, a Meta diz o motivo. O mais comum é a categoria: se ela
   jogar pra *marketing*, é porque achou tom de venda em algum lugar.
4. Quando os três estiverem **Aprovados**, me avisa — aí eu ligo no código.
