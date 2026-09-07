# WhatsApp automático — decidir, ligar e testar

> Quem escolhe o caminho é a Karol (pergunta 4 do `briefing/criar-formulario-2.gs`).
> Este arquivo é para quem for **ligar** o que ela escolher.
>
> Chip de teste comprado em 06/09/2026: **(16) 92008-8473**. Ele só envia —
> **não aparece no site**. O número que a cliente vê é o de `negocio.ts`.
>
> Fonte dos preços e do fluxo: docs da Meta consultadas em 06/09/2026.
> **A Meta muda isso com frequência** — confira antes de prometer valores.

---

## 0. O que já está configurado na Meta

Feito em 06/09/2026. **Não são segredos** — são identificadores. O que é
segredo é o token, e ele não entra neste arquivo.

| | |
|---|---|
| Nome de exibição | Studio Karol Carvalho |
| Número | +55 (16) 92008-8473 — **Inscrito** |
| `WABA_ID` | `958269250650095` |
| `PHONE_NUMBER_ID` | `1232997019905897` |
| Site informado | instagram.com/studio_karol_carvalho_ |

⚠️ O app começa com um **número de teste** da Meta (`+1 555 676-0300`, phone
id `1205594729313572`). Ele **não serve**: erro `130497 — Business account is
restricted from messaging users in this country`, porque números de teste não
alcançam o Brasil. Use sempre os IDs de produção acima.

### Testado e funcionando

Em 06/09/2026 o número da Karol enviou mensagem de verdade para um celular
brasileiro, pela API oficial, **sem custo** — dentro da janela de 24 h.

O caminho está provado. O que sobra é ligar no código.

### Falta

- **Ligar as variáveis na Vercel.** `META_TOKEN` e `META_PHONE_NUMBER_ID` pra
  enviar; `META_VERIFY_TOKEN` e `META_APP_SECRET` pra receber. O código dos
  dois lados está pronto e testado — ver seções 5 e 6.
- **Forma de pagamento** — só para mensagem iniciada pela empresa (o lembrete
  da véspera). Dentro da janela funciona sem cartão, como o teste mostrou.
- **Verificação da empresa** (Etapa 3) — pede documento. A Karol não tem CNPJ.
  Não bloqueou o envio no teste.

---

## 1. O que o código já faz

O site **fala direto com a Meta** quando `META_TOKEN` e `META_PHONE_NUMBER_ID`
existem no ambiente. Sem eles, cai no webhook antigo; sem nenhum dos dois, as
mensagens são montadas e simplesmente não saem — e nada quebra.

### Sai do site

| Onde | O quê |
|---|---|
| `src/lib/notificacoes.ts` | os textos das quatro mensagens e o envio |
| `criarAgendamento` (`agendamentos.ts`) | dispara na hora do agendamento |
| `/api/lembretes` | lembrete e agradecimento, 1×/dia pelo cron |
| `NOTIFICACOES` (`data/negocio.ts`) | liga e desliga cada uma |

### Chega no site

| Onde | O quê |
|---|---|
| `/api/whatsapp` | webhook: confere assinatura, lê o payload, não repete |
| `src/lib/atendente.ts` | **decide o que responder** — é aqui que se mexe |
| `src/lib/conversas.ts` | registra a janela de 24 h de cada número |

### O código do agendamento

Todo agendamento tem um código de seis caracteres — `8C6377`. Ele **não é
coluna no banco**: são os seis primeiros dígitos do próprio `id`, derivados
em `src/lib/codigo.ts`. Uma coluna seria uma segunda fonte da verdade capaz
de divergir, pra guardar algo que já está lá.

Ele aparece em quatro lugares e é o mesmo nos quatro: na tela de confirmação,
na mensagem que a cliente manda, no aviso que chega pra Karol, e no cartão do
painel. **A Karol digita ele na busca do painel e abre a cliente certa** —
sem ele, achar quem mandou mensagem é rolar a agenda no olho.

A busca do painel aceita as três coisas que ela tem na mão: o código, o nome
ou o telefone. Um campo só.

### O caminho antigo, do `NOTIFICADOR_WEBHOOK_URL`

⚠️ Não confunda com o webhook da seção 5. Este é de **saída**, e só entra em
ação quando `META_TOKEN` **não** está configurado: o site empurra o evento
pra uma URL sua (n8n, Make, função própria) e quem envia é ela.

`POST` com `content-type: application/json`, timeout de 5 s, e **nunca
derruba o agendamento se falhar**:

```json
{
  "evento": "novo-agendamento | confirmacao | lembrete | agradecimento",
  "agendamento": {
    "id": "uuid",
    "cliente": "Maria da Silva",
    "whatsappCliente": "5518999998888",
    "servico": "Design de sobrancelha",
    "cidade": "Pereira Barreto",
    "inicioISO": "2026-09-08T10:00:00.000Z",
    "valorCentavos": 2500
  },
  "mensagem": {
    "para": "5518999998888",
    "destinatario": "cliente | karol",
    "texto": "o texto pronto, já formatado"
  }
}
```

Do outro lado basta ler `mensagem.para` e `mensagem.texto` e enviar.

---

## 2. A regra que decide o custo

Desde **1º de julho de 2025** a Meta cobra **por mensagem entregue**, não mais
por conversa. E o que define se é grátis é **quem puxou a conversa**:

| Situação | Custo |
|---|---|
| Cliente mandou mensagem primeiro → janela de **24 h** aberta | **grátis** |
| Template **utility** dentro da janela aberta | **grátis** |
| Template **utility** fora da janela | pago (centavos) |
| Template **marketing** | pago, sempre |
| Template **authentication** | pago |

Não existe cota mensal grátis. A gratuidade vem do **contexto**, não da
quantidade.

### O que isso significa para o projeto

O desenho recomendado aproveita isso: no fim do agendamento o site abre o
WhatsApp com a mensagem já escrita, **da cliente para a Karol**. Ela aperta
enviar **uma vez**, e esse toque faz duas coisas:

1. avisa a Karol do agendamento novo;
2. **abre a janela de 24 h** com aquela cliente.

Daí em diante confirmação, PIX, endereço e o que mais precisar saem
automáticos e **sem custo**. O lembrete da véspera cai fora da janela — é o
único que consome template pago, e custa centavos.

---

## 3. Os caminhos

| Caminho | Custo | Risco | Esforço |
|---|---|---|---|
| **Meta Cloud API** (direto) | sem mensalidade; paga só fora da janela | nenhum | médio |
| **BSP** (360dialog, Gupshup, Twilio, Zenvia) | mensalidade ou markup | nenhum | baixo |
| **Z-API / Evolution** (não oficiais) | barato ou grátis | **banem o número** | baixo |
| **E-mail** | zero | nenhum | baixo, mas precisa do e-mail dela |
| **Um toque dela** | zero | nenhum | nenhum: já funciona |

### Por que os não oficiais ficam de fora

Z-API, Evolution API e parecidos funcionam **fingindo ser o WhatsApp Web**.
É o caminho que todo mundo indica porque é barato e rápido. Funciona — até a
Meta detectar o padrão e **banir o número**.

Seria o número da Karol, o mesmo do Instagram, o mesmo que as clientes antigas
têm salvo. Perder isso custa mais que qualquer mensalidade.

### Se for de BSP

- **360dialog** — mensalidade fixa, sem markup por mensagem. Melhor para
  volume pequeno.
- **Gupshup** — barato, muito usado no Brasil.
- **Twilio** — melhor documentação do mercado, mais caro.
- **Zenvia / Take Blip** — brasileiras, suporte em português.

No volume da Karol a diferença de preço é irrelevante. **Decide quem resolve
a burocracia da Meta com menos trabalho seu.**

---

## 4. Passo a passo — Meta Cloud API

### 4.1 Liberar o chip

O número **não pode estar registrado no aplicativo** do WhatsApp ao mesmo
tempo em que serve à API. O chip já teve o app instalado (06/09/2026), então:

> No celular com o chip → **WhatsApp → Configurações → Conta → Apagar minha
> conta**.

Não é definitivo, dá para desfazer. Dois detalhes: apague **antes** de tentar
registrar (com a conta ativa o registro falha), e número recém-liberado às
vezes é recusado por algumas horas — isso é espera, não chip perdido.

### 4.2 Criar o app

1. Entre em **developers.facebook.com/apps**
2. **Create App**
3. Caso de uso: **"Connect with customers through WhatsApp"**
4. Confirme e crie

### 4.3 Conectar a conta comercial (WABA)

No painel **API Setup**, conecte uma WhatsApp Business Account ou crie uma.

📋 **Anote o `WhatsApp Business Account ID`.**

### 4.4 Pegar o número

Ainda em **API Setup**, adicione o número do chip.

📋 **Anote o `Phone Number ID`** — é ele que vai na URL da API, não o número
de telefone.

### 4.5 Testar com token temporário

Em **API Setup**, clique em **Generate access token**. Ele vale pouco tempo —
serve só para o primeiro teste:

```bash
curl 'https://graph.facebook.com/v23.0/<PHONE_NUMBER_ID>/messages' \
  -H 'Authorization: Bearer <TOKEN_TEMPORARIO>' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "5518997525291",
    "type": "text",
    "text": { "body": "Teste do site da Karol" }
  }'
```

O `to` vai com DDI + DDD + número, **só dígitos**. Se chegar no WhatsApp, a
metade difícil acabou.

### 4.6 Token permanente

O temporário expira. Para produção:

1. **Business Settings → System users → Add**
2. Dê a ele controle total sobre o app e sobre a WABA
3. **Generate new token**, com as permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `business_management`

📋 **Guarde o token.** Ele não aparece de novo.

### 4.7 Templates — os textos prontos estão em outro arquivo

Template é a única forma de falar com quem **não escreveu primeiro**. Os três
que este projeto usa (confirmação, lembrete da véspera e aviso pra Karol)
estão escritos campo a campo, prontos pra colar no painel da Meta, em
[`TEMPLATES-WHATSAPP.md`](./TEMPLATES-WHATSAPP.md) — junto com as regras que
fazem a Meta recusar e o passo pra pôr foto e nome do estúdio na conversa.

### 4.8 O que valia antes (mantido pelo histórico)

Template só é obrigatório para **puxar conversa**. No desenho recomendado a
cliente manda a primeira mensagem, então dentro das 24 h dá para mandar texto
livre, sem template e sem custo.

O único que precisa de template é o **lembrete da véspera**, que cai fora da
janela. Crie um da categoria **utility** com o texto de `textoLembrete()`.

---

## 5. Receber mensagem — o webhook

Enviar já funciona sem isto. O webhook serve pra **receber** o que a cliente
responde, e é o que faz duas coisas acontecerem:

1. **Registra a janela de 24 h.** É o que torna todo o resto grátis (seção 2).
   Sem registro, o site tenta mandar fora da janela, a Meta recusa com
   `131047`, e ninguém sabe se aquilo era esperado ou defeito.
2. **Responde sozinho** o que dá pra responder com certeza.

### O que ele responde

| A cliente manda | O que acontece |
|---|---|
| o código (`8C6377`) | recebe serviço, dia, hora e cidade do próprio horário |
| "confirmo", "ok" | mesma resposta |
| "quero cancelar" | recibo pra ela + **aviso pra Karol**, com nome, número e código |
| "dá pra remarcar?" | idem |
| qualquer outra coisa | **nada.** Quem responde é a Karol |

### ⚠️ O que ele NÃO faz: mexer na agenda

Não existe "responda 2 para cancelar". A Karol respondeu no briefing que a
cliente **não** desmarca sozinha — `REGRAS.clientePodeCancelar` está `false`
em `data/negocio.ts`. Um botão de cancelar no WhatsApp seria a agenda dela
mudando por mensagem, sem ela ver.

Então pedido de cancelar vira **aviso pra ela**, e quem decide continua sendo
ela. Se ela usar e pedir pra mudar, é decisão dela — e aí muda em
`lib/atendente.ts`. Tem teste travando isso no nível do arquivo: se alguém
importar `mudarSituacao` ali, a suíte quebra.

### Ligar

1. **Painel da Meta → seu app → WhatsApp → Configuration → Webhooks → Edit**
2. **Callback URL:** `https://<seu-site>/api/whatsapp`
3. **Verify token:** um texto comprido que você inventa. O MESMO valor vai na
   variável `META_VERIFY_TOKEN` da Vercel — a Meta faz um GET uma única vez
   pra conferir que os dois batem.
4. **Verify and save.** Se der erro aqui, a variável não está no ambiente do
   deploy atual: variável nova só vale no build seguinte.
5. **Manage → marque o campo `messages`.** Sem isso a Meta valida a URL e
   nunca manda nada.
6. **Configurações → Básico → App secret** → copie pra `META_APP_SECRET` na
   Vercel.
7. **Redeploy.**

### ⚠️ `META_APP_SECRET` não é opcional

A URL do webhook é pública por definição — a Meta precisa alcançá-la. Cada
POST vem assinado no cabeçalho `X-Hub-Signature-256`, e é esse segredo que
confere a assinatura.

**Sem ele o webhook recusa tudo, de propósito.** É melhor não receber nada do
que aceitar mensagem de quem descobriu a URL e resolveu escrever fingindo ser
a cliente.

### Conferir que está de pé

```bash
# O aperto de mão. Tem que devolver "abc123" em texto puro.
curl "https://<seu-site>/api/whatsapp?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=abc123"

# Token errado tem que dar 403.
curl -i "https://<seu-site>/api/whatsapp?hub.mode=subscribe&hub.verify_token=chute&hub.challenge=abc123"

# POST sem assinatura tem que dar 401.
curl -i -X POST "https://<seu-site>/api/whatsapp" -H 'content-type: application/json' -d '{}'
```

Depois disso, mande uma mensagem de um celular pro número da Karol e veja se
a linha aparece na tabela `conversas` do Supabase.

---

## 6. Ligar e testar o envio

1. `META_TOKEN` e `META_PHONE_NUMBER_ID` nas variáveis da Vercel
2. **Redeploy** — variável nova só vale no build seguinte
3. Faça um agendamento de teste no site
4. Na tela de confirmação, toque em **"Avisar a Karol no WhatsApp"**. Esse
   toque abre a janela de 24 h e é o que faz o resto sair de graça.
5. `/painel/notificacoes` tem um botão que dispara os lembretes na hora, sem
   esperar o cron do dia seguinte

---

## 7. O que não fazer

- **Não** deixar o WhatsApp do aplicativo ativo no chip da API.
- **Não** usar o número pessoal dela para envio automático.
- **Não** deixar o receptor sem autenticação.
- **Não** mandar mensagem para quem não pediu. Além do risco de bloqueio, é a
  diferença entre um lembrete útil e spam — e quem paga a conta é a reputação
  dela.
