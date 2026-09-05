# Plano — agendamento com sinal e aprovação

> Análise do fluxo pedido em 05/09/2026. **Nada disto está construído.**
> Este arquivo existe pra que a construção comece com as decisões tomadas,
> e não no meio do caminho.
>
> Contexto que já está no guia e não se repete aqui: as opções de WhatsApp
> e o fato de a Karol **não ter CNPJ** — ver `PROGRESSO.md`, seção 6.4.

## O fluxo pedido

1. A cliente escolhe serviço, dia e hora
2. Paga o sinal por PIX
3. O horário fica reservado
4. A cliente recebe *"recebemos, a Karol vai confirmar"*
5. A Karol recebe o pedido e **aprova, recusa ou propõe outro horário**
6. Aprovado → a cliente recebe a confirmação **com o endereço**
7. Se a cliente desmarcar, há taxa — com uma segunda pergunta antes

## O que muda no que existe

### 1. Os estados do agendamento crescem

Hoje: `pendente · confirmado · cancelado · concluido · faltou`.

O fluxo exige separar "esperando o pagamento" de "esperando a Karol":

| Estado | Significa | Ocupa a agenda? |
|---|---|---|
| `aguardando_pagamento` | PIX gerado, ainda não pago | **sim, e expira** |
| `aguardando_karol` | pago, esperando ela | sim |
| `confirmado` | ela aprovou | sim |
| `recusado` | ela não pôde atender | não |
| `cancelado` · `concluido` · `faltou` | como hoje | conforme hoje |

O `pendente` de hoje vira `aguardando_karol`. O caminho de aprovação já
existe no painel — é a parte barata.

### 2. A trava anti-conflito precisa de expiração — e é aqui que mora o perigo

A constraint `sem_choque` hoje vale para `pendente, confirmado, concluido`.

Se `aguardando_pagamento` **não** entrar nela, duas clientes geram PIX para o
mesmo horário e as duas pagam. Alguém fica sem horário e com dinheiro pago.

Se entrar **sem expirar**, um script gera PIX sem pagar e tranca a agenda
inteira de graça — o ataque é óbvio e barato.

Então `aguardando_pagamento` precisa de `expira_em` (uns 15 min) e de algo
que efetive isso. **Não dá pra resolver na constraint:** o Postgres exige
expressão imutável e `now()` não é. A saída é uma varredura periódica que
muda o estado dos vencidos — o cron diário que já existe passa a rodar de
poucos em poucos minutos.

Consequência: existe uma janela entre vencer e ser varrido. Aceitável se a
varredura for frequente, mas é uma escolha, não um detalhe.

**O freio por IP deixa de ser quebra-galho e vira essencial**, porque agora
uma requisição não custa só CPU: custa um horário da agenda.

### 3. O provedor de pagamento é decidido pelo CNPJ

Ela não tem. Isso elimina a maioria:

| Provedor | Aceita pessoa física? |
|---|---|
| **Mercado Pago** | sim — PIX por API, com webhook |
| **Asaas** | sim — feito para PF/MEI |
| Stripe · Pagar.me | **não**, exigem CNPJ |

Se ela tirar MEI, o leque abre. É por isso que a pergunta do CNPJ está no
formulário novo: ela decide o provedor, não o contrário.

### 4. Uma rota nova, e ela precisa validar assinatura

`/api/pagamento` recebe o aviso do provedor de que o PIX foi pago.

**Sem validar a assinatura do webhook, qualquer pessoa na internet confirma
pagamento que não existe** — é a falha mais séria que esse fluxo pode ter, e
a mais fácil de cometer. Todo provedor sério assina; a rota tem que conferir
antes de encostar no banco.

### 5. A Karol aprovando: pelo painel, não pelo WhatsApp

Botão dentro do WhatsApp exige template aprovado da API oficial. Muito mais
simples: a mensagem leva um **link para o painel**, e ela aprova com um
toque. O painel já existe, o caminho `→ confirmado` já existe, e some o
risco de depender de recurso da Meta.

### 6. "Taxa de cancelamento" não é cobrança — é retenção

Não há como debitar alguém depois. O que funciona de verdade: **o sinal já
pago não volta**. É o mesmo efeito prático, sem cobrança nova.

Isso precisa estar escrito na política e ter aceite explícito **na hora de
pagar** — não escondido no rodapé. E a segunda pergunta antes de cancelar
("você vai perder o sinal, tem certeza?") passa a ser obrigatória, não
gentileza.

### 7. Quando ela recusa, alguém devolve

Estorno automático existe na API do Mercado Pago, mas é mais superfície pra
manter. O caminho honesto e simples: ela devolve por PIX na mão e marca no
painel. **É decisão dela**, e está no formulário.

## Ordem sugerida

1. **Estados, expiração e trava** — dá pra construir e testar inteiro com um
   "pagamento de mentira", sem nenhuma conta criada. É onde mora o risco de
   perder horário ou trancar agenda, então é o que merece teste de verdade.
2. **Provedor + webhook assinado** — depende da conta e das credenciais.
3. **Aprovação pelo painel** — pequeno, o caminho já existe.
4. **As mensagens** — depende de qual canal de WhatsApp (ver guia, 6.4).

O passo 1 não depende de nenhuma decisão da Karol e sozinho já entrega o
"horário segurado". Os outros três dependem das respostas do formulário.

## O que trava hoje

| Preciso de | Pra quê |
|---|---|
| Respostas do formulário 2 | valor do sinal, entrada ou taxa, devolução, aprovação |
| Decisão sobre MEI/CNPJ | escolhe o provedor |
| Conta no provedor + credenciais | webhook e geração do PIX |
| Canal de WhatsApp escolhido | as mensagens automáticas |
| Endereço das duas cidades | vai na confirmação |

## Uma coisa fora do meu alcance

Receber sinal e reter valor de cliente, como pessoa física e sem contrato,
tem implicação fiscal e de consumidor. Eu construo o mecanismo; se isso vira
rotina de receita, vale ela conversar com um contador. Registro aqui porque
não quero que a ausência do aviso passe por aprovação.
