# WhatsApp — como funciona, quanto custa e como ligar

O site fala direto com a **WhatsApp Cloud API** (Meta). Este arquivo
explica a regra de custo, o que o código faz, o passo a passo pra ligar
do zero e como diagnosticar quando uma mensagem não chega.

Os textos dos templates estão em [`templates-whatsapp.md`](./templates-whatsapp.md).
O assistente da Karol, em [`assistente.md`](./assistente.md).

> [!NOTE]
> Preços e regras da Meta consultados em setembro/2026. **A Meta muda isso
> com frequência** — confira antes de prometer valores.

---

## O que está configurado na Meta

Identificadores, **não segredos**. O segredo é o token, que nunca entra
em arquivo versionado.

| | |
|---|---|
| Nome de exibição | Studio Karol Carvalho |
| Número da API | +55 (16) 92008-8473 — chip só pra API, **não aparece no site** |
| `WABA_ID` | `958269250650095` |
| `PHONE_NUMBER_ID` | `1232997019905897` |
| Modo do app | **Ativo** (publicado) |
| Forma de pagamento | cartão cadastrado na WABA |

O número que a cliente vê no site é o pessoal da Karol, em
`src/data/negocio.ts`. O chip da API **não tem caixa de entrada**: ninguém
lê o que chega nele — por isso o sistema repassa pra Karol o que a cliente
escreve.

> [!WARNING]
> O app da Meta nasce com um **número de teste** (`+1 555 676-0300`). Ele
> não alcança o Brasil (erro `130497`). Use sempre os IDs de produção acima.

---

## A regra que decide o custo

Desde 1º/07/2025 a Meta cobra **por mensagem entregue**, e o que define se
é grátis é **quem puxou a conversa**:

| Situação | Custo |
|---|---|
| A pessoa escreveu nas últimas **24 h** (janela aberta) → texto livre | grátis |
| Template *utility* com a janela aberta | grátis |
| Template *utility* com a janela fechada | ~R$ 0,05–0,08 |
| Template *marketing* | ~8× mais, e não chega a quem desativou marketing |

**Quem marca pelo site nunca escreveu pro studio**, então a janela está
fechada e a única forma de alcançá-la é template. O desenho do projeto
aproveita a regra:

1. A tela de confirmação termina num botão que abre o WhatsApp com a
   mensagem escrita **da cliente pro studio**.
2. Esse toque abre a janela de 24 h.
3. Daí em diante PIX, endereço e respostas saem como texto livre, de graça.

Qualquer toque num botão de template também abre a janela. No volume da
Karol (~4 clientes por dia útil) o gasto com template fica entre R$ 6 e
R$ 10 por mês.

---

## O que o código faz

### Antes de enviar, pergunta se a janela está aberta

`enviarEvento` (`lib/notificacoes.ts`) consulta `conversas` **antes** de
escolher: janela aberta → texto livre; fechada → template direto. **Dúvida
conta como fechada** — template de utilidade dentro da janela é grátis, e
errar pro outro lado é cliente sem aviso.

> [!IMPORTANT]
> **Aceitar e entregar são momentos diferentes.** A API responde 200 na hora
> ("recebi o pedido"); a entrega — ou a falha, com o motivo — chega minutos
> depois pelo webhook, em `statuses`. Por isso o sistema não pode "tentar
> texto e trocar por template se der erro": o erro quase nunca vem na hora.

### Os eventos

| Evento | Pra quem | Template (janela fechada) |
|---|---|---|
| `novo-agendamento` | Karol | `aviso_karol_novo_agendamento` |
| `confirmacao` | cliente | `confirmacao_agendamento` — ou `pedido_sinal` se ela deve a entrada |
| `lembrete` | cliente | `lembrete_vespera` |
| `agradecimento` | cliente | `pos_atendimento` |
| `remarcado` | cliente | `horario_remarcado` |
| `cancelado` · `sinal-vencido` | cliente | `horario_cancelado` |

Liga e desliga por evento em `NOTIFICACOES` (`data/negocio.ts`).
`remarcado` e `cancelado` não têm interruptor de propósito: a cliente não
pode descobrir na porta.

**Guardas em `enviarEvento`:** sem número → não envia; número é o da
própria Karol → não envia (exceto `novo-agendamento`). Ver o incidente de
18/09 em [`incidentes.md`](./incidentes.md).

### O que a cliente pode mandar

Quem decide é `lib/atendente.ts`. **Nada aqui muda a agenda sozinho.**

| A cliente manda | O que acontece |
|---|---|
| primeira mensagem, devendo a entrada | recebe o pedido do PIX (QR ou copia e cola, à escolha) |
| "confirmo", "ok", botão Confirmar | recebe serviço, dia, hora e local |
| "quero remarcar", botão Remarcar | recebe a lista de horários livres → a Karol decide |
| "quero cancelar" | recibo pra ela + aviso pra Karol com o link da agenda |
| botão de nota do pós-atendimento | resposta + repasse pra Karol (a nota ruim chega marcada com ⚠️) |
| foto | a IA confere se parece comprovante; a Karol confirma o pagamento |
| qualquer outra coisa | repassada pra Karol; na 1ª da conversa, a cliente recebe o WhatsApp pessoal dela |

`REGRAS.clientePodeCancelar` é `false`: pedido de cancelar vira aviso, e
quem decide é a Karol. Um teste quebra se alguém importar `mudarSituacao`
em `atendente.ts`.

### Saída alternativa: `NOTIFICADOR_WEBHOOK_URL`

Só entra quando `META_TOKEN` **não** existe. O site faz `POST` JSON (timeout
de 5 s, nunca derruba o agendamento) e quem envia é o serviço do outro lado
(n8n, Make, Zapier):

```json
{
  "evento": "novo-agendamento | confirmacao | lembrete | agradecimento",
  "agendamento": { "id": "uuid", "cliente": "Maria", "whatsappCliente": "5518999998888",
                   "servico": "Design de sobrancelha", "cidade": "Pereira Barreto",
                   "inicioISO": "2026-09-08T10:00:00.000Z", "valorCentavos": 2500 },
  "mensagem": { "para": "5518999998888", "destinatario": "cliente | karol",
                "texto": "o texto pronto" }
}
```

---

## Ligar do zero

Feito uma vez em 06/09/2026. Fica aqui para uma conta nova ou um número novo.

### 1. O chip

O número **não pode estar no aplicativo** do WhatsApp enquanto serve à API.
Se já teve: *WhatsApp → Configurações → Conta → Apagar minha conta*,
**antes** de registrar. Número recém-liberado pode ser recusado por algumas
horas — é espera, não chip perdido.

### 2. O app e a conta comercial

1. developers.facebook.com/apps → **Create App** → caso de uso *Connect with
   customers through WhatsApp*.
2. Em **API Setup**, conecte ou crie a WhatsApp Business Account. Anote o
   `WABA_ID`.
3. Adicione o número. Anote o **`Phone Number ID`** — é ele que vai na URL
   da API, não o telefone.

### 3. Testar com token temporário

```bash
curl 'https://graph.facebook.com/v23.0/<PHONE_NUMBER_ID>/messages' \
  -H 'Authorization: Bearer <TOKEN_TEMPORARIO>' -H 'Content-Type: application/json' \
  -d '{"messaging_product":"whatsapp","to":"55DDDNUMERO","type":"text","text":{"body":"Teste"}}'
```

O `to` vai com **DDI + DDD + número, só dígitos**. Sem o 55,
`16991557552` é lido como um número dos EUA.

### 4. Token permanente

*Business Settings → System users → Add* → controle total do app e da WABA
→ **Generate new token** com `whatsapp_business_messaging`,
`whatsapp_business_management` e `business_management`. Ele não aparece de
novo: vai direto pra `META_TOKEN`.

### 5. Publicar o app

> [!WARNING]
> Em modo **Desenvolvimento** a Meta só entrega o webhook de teste do
> painel: mensagem real não chega, e a tela mostra tudo verde. Publicar
> exige política de privacidade (`/privacidade`), ícone 1024×1024 e
> categoria.

### 6. Receber mensagens: o webhook

1. *App → WhatsApp → Configuration → Webhooks → Edit*.
2. **Callback URL:** `https://<site>/api/whatsapp`.
3. **Verify token:** um texto comprido que você inventa — o mesmo valor vai
   em `META_VERIFY_TOKEN`.
4. **Verify and save.** Se falhar, a variável não está no deploy atual
   (variável nova só vale no build seguinte).
5. **Assine o campo `messages`.**
6. **Assine o app pela conta do WhatsApp** — botão "Assinar webhook" no
   bloco do número. ⚠️ São **duas** assinaturas; sem a segunda a Meta aceita
   tudo e não repassa nada.
7. *Configurações → Básico → App secret* → `META_APP_SECRET`.
8. **Redeploy.**

`META_APP_SECRET` **não é opcional**: a URL é pública, e cada POST vem
assinado em `X-Hub-Signature-256`. A rota confere o HMAC sobre os **bytes
crus** (`req.text()` antes de qualquer `JSON.parse`) e, sem o segredo,
**recusa tudo** de propósito.

### 7. Conferir que está de pé

```bash
# aperto de mão: tem que devolver "abc123"
curl "https://<site>/api/whatsapp?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=abc123"
# token errado: 403
curl -i "https://<site>/api/whatsapp?hub.mode=subscribe&hub.verify_token=chute&hub.challenge=abc123"
# POST sem assinatura: 401
curl -i -X POST "https://<site>/api/whatsapp" -H 'content-type: application/json' -d '{}'
```

Depois, mande uma mensagem de um celular pro número da API e veja a linha
aparecer em `conversas`, no Supabase. Faça um agendamento de teste e toque
em "Avisar a Karol no WhatsApp" na tela de confirmação. Os lembretes do dia
podem ser disparados na hora em `/painel/notificacoes`.

### 8. Templates e perfil

Crie os templates de [`templates-whatsapp.md`](./templates-whatsapp.md). No
perfil do número (*WhatsApp Manager → número → Perfil*) dá pra pôr foto,
descrição, categoria, endereço e site. O **nome** aparecer no lugar do
número depende da verificação da empresa, que pede CNPJ.

---

## Quando a mensagem não chega

Quando a cliente não é avisada, a Karol recebe o aviso **com o código da
Meta junto**, e o técnico recebe o erro. Esse código encerra o assunto —
não adivinhe.

| Código | O que é | Como resolve |
|---|---|---|
| `131047` | janela fechada e mensagem não era template | template não aprovado, nome errado, ou o código tentou texto livre fora da janela |
| `131030` | número fora da lista de teste | app está em Desenvolvimento → publicar |
| `130497` | país restrito | está usando o número de teste da Meta |
| `131026` | número não recebe | não tem WhatsApp, ou é fixo |
| `131056` | *pair rate limit* | mensagens demais pro mesmo número em pouco tempo — procure um laço |

Lição de setembro: três hipóteses (cartão, limite, modo do app) foram
derrubadas antes de alguém ler o `failed` que chegava no próprio webhook.
O plano Hobby da Vercel quase não guarda log de função — por isso os erros
vão pro WhatsApp do técnico.

---

## Por que a API oficial

| Caminho | Por que sim ou não |
|---|---|
| **Meta Cloud API** | sem mensalidade, paga só template fora da janela. É o que está no ar |
| BSP (360dialog, Gupshup, Twilio, Zenvia) | mensalidade ou markup; vale se a burocracia da Meta virar problema |
| Z-API, Evolution, Baileys | fingem ser o WhatsApp Web — **a Meta bane o número**. Seria o número da Karol |

## O que não fazer

- Deixar o aplicativo do WhatsApp ativo no chip da API.
- Usar o número pessoal da Karol para envio automático.
- Deixar o webhook sem `META_APP_SECRET`.
- Mandar mensagem pra quem não pediu.
- Aceitar a sugestão da Meta de mudar um template pra *marketing*.
