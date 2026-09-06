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

## 1. O que o código já faz

Pronto e no ar desde a Etapa 4. As mensagens são **montadas** e **empurradas**
para um webhook. Quem envia de verdade é quem estiver do outro lado.

| Onde | O quê |
|---|---|
| `src/lib/notificacoes.ts` | os textos das quatro mensagens |
| `criarAgendamento` (`agendamentos.ts`) | dispara na hora do agendamento |
| `/api/lembretes` | lembrete e agradecimento, 1×/dia pelo cron |
| `NOTIFICACOES` (`data/negocio.ts`) | liga e desliga cada uma |

Sem `NOTIFICADOR_WEBHOOK_URL` no ambiente, nada quebra: as mensagens são
montadas e simplesmente não saem. **Trocar de provedor é mudar uma variável
de ambiente.**

### O que chega no webhook

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

### 4.7 Templates — provavelmente você não precisa

Template só é obrigatório para **puxar conversa**. No desenho recomendado a
cliente manda a primeira mensagem, então dentro das 24 h dá para mandar texto
livre, sem template e sem custo.

O único que precisa de template é o **lembrete da véspera**, que cai fora da
janela. Crie um da categoria **utility** com o texto de `textoLembrete()`.

---

## 5. O receptor

É a peça que falta: algo que receba o `POST` do site e chame a Meta. Pode ser
n8n, Make, ou uma função. Em Vercel, um arquivo assim resolve:

```js
// api/whatsapp.js — receptor do NOTIFICADOR_WEBHOOK_URL
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Só nós devemos poder disparar isto.
  if (req.headers.authorization !== `Bearer ${process.env.SEGREDO_WEBHOOK}`) {
    return res.status(401).json({ erro: "não autorizado" });
  }

  const { mensagem } = req.body;
  if (!mensagem?.para || !mensagem?.texto) {
    return res.status(400).json({ erro: "faltou para/texto" });
  }

  const r = await fetch(
    `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.META_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: mensagem.para,
        type: "text",
        text: { body: mensagem.texto },
      }),
    },
  );

  const corpo = await r.json();
  if (!r.ok) console.error("Meta recusou:", corpo);
  return res.status(r.ok ? 200 : 502).json(corpo);
}
```

⚠️ **A checagem de `authorization` não é opcional.** Sem ela, qualquer pessoa
que descobrir a URL manda WhatsApp em nome da Karol — e o número que leva o
bloqueio é o dela.

O site ainda não envia esse cabeçalho: `enviarEvento` em `notificacoes.ts`
manda só `content-type`. Quando o receptor existir, é uma linha lá.

---

## 6. Ligar e testar

1. `NOTIFICADOR_WEBHOOK_URL` nas variáveis da Vercel → URL do receptor
2. `SEGREDO_WEBHOOK`, `META_TOKEN` e `PHONE_NUMBER_ID` no receptor
3. **Redeploy** — variável nova só vale no build seguinte
4. Faça um agendamento de teste no site e veja se a mensagem chega
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
