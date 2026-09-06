# WhatsApp automático — o que existe e o que ligar

> Quem escolhe é a Karol (pergunta 4 do `briefing/criar-formulario-2.gs`).
> Este arquivo é para quem for **ligar** o que ela escolher.
>
> Chip de teste comprado em 06/09/2026: **(16) 92008-8473**. Ele só envia —
> **não aparece no site**. O número que a cliente vê é o de `negocio.ts`.

## O que o código já faz

Está pronto e no ar desde a Etapa 4. As mensagens são **montadas** e
**empurradas** para um webhook. Quem envia de verdade é quem estiver do
outro lado.

- Textos: `src/lib/notificacoes.ts`
- Disparo na hora do agendamento: `criarAgendamento` em `agendamentos.ts`
- Lembrete e agradecimento: `/api/lembretes`, chamado 1×/dia pelo cron
- Interruptores: `NOTIFICACOES` em `src/data/negocio.ts`

Sem `NOTIFICADOR_WEBHOOK_URL` no ambiente, tudo continua funcionando — as
mensagens são montadas e simplesmente não saem. **Trocar de provedor é
mudar uma variável de ambiente**, não reescrever nada.

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

Do outro lado basta ler `mensagem.para` e `mensagem.texto` e enviar. O
texto já vem escrito — o provedor não precisa saber nada do negócio.

## A regra que decide o custo

A Meta cobra por **quem puxa a conversa**:

- A cliente manda mensagem primeiro → abre uma **janela de 24 horas** em que
  a empresa responde à vontade, **de graça**.
- A empresa manda do nada → precisa de um **template aprovado** e isso é pago
  (utility, centavos por mensagem no Brasil).

Por isso o desenho recomendado é: no fim do agendamento o site abre o
WhatsApp com a mensagem já escrita, **da cliente para a Karol**. Ela aperta
enviar uma vez — e isso avisa a Karol **e** abre a janela. Todo o resto
(confirmação, PIX, endereço, lembrete) sai automático e sem custo.

⚠️ **A tabela da Meta mudou em 2024 e 2025 e vai mudar de novo.** Confirme os
valores vigentes antes de prometer "grátis" para a Karol.

## Os caminhos, e o que cada um custa

| Caminho | Custo | Risco | Esforço |
|---|---|---|---|
| **Meta Cloud API** (direto) | sem mensalidade; paga por mensagem fora da janela | nenhum | médio: conta Meta Business, número dedicado, verificação |
| **BSP** (360dialog, Gupshup, Twilio, Zenvia, Take Blip) | mensalidade ou markup por mensagem | nenhum | baixo: eles resolvem a burocracia |
| **Z-API / Evolution API** (não oficiais) | barato ou grátis | **banimento do número** | baixo |
| **E-mail** | zero | nenhum | baixo — mas exige o e-mail da cliente |
| **Um toque dela** | zero | nenhum | nenhum: já funciona hoje |

### Sobre os não oficiais

Z-API, Evolution API e parecidos funcionam **fingindo ser o WhatsApp Web**.
É o caminho que todo mundo indica porque é barato e rápido. E funciona —
até a Meta detectar o padrão e **banir o número**.

Seria o número da Karol, o mesmo do Instagram, o mesmo que as clientes
antigas têm salvo. Perder isso custa muito mais do que qualquer mensalidade.
**Não recomendo nem no chip novo**: chip novo banido continua sendo um
problema, e o histórico de banimento pega o negócio junto.

### Se for de BSP

Os quatro que atendem bem no Brasil:

- **360dialog** — mensalidade fixa e sem markup por mensagem; dos mais baratos
  para volume pequeno
- **Gupshup** — barato, muito usado no Brasil
- **Twilio** — a melhor documentação do mercado, mais caro
- **Zenvia / Take Blip** — brasileiras, suporte em português, focadas em
  empresa média

Para o volume da Karol (algumas dezenas de mensagens por mês), a diferença de
preço entre eles é irrelevante. **O que decide é quem resolve a burocracia da
Meta com menos trabalho seu.**

## Para ligar, na prática

1. **Decidir o caminho** — depende da resposta dela no formulário.
2. **Conta na Meta ou no BSP**, com o chip **(16) 92008-8473**.
   ⚠️ **Não instale o WhatsApp comum nesse chip.** Um número usado no app
   fica inutilizável para a API depois, e não tem volta.
3. **Montar o receptor** — qualquer coisa que aceite o `POST` de cima e
   chame o provedor. Um n8n, um Make, uma função na Vercel. São ~20 linhas.
4. **`NOTIFICADOR_WEBHOOK_URL`** apontando pra ele, nas variáveis da Vercel.
5. **`CRON_SECRET`** já está configurada — é o que libera `/api/lembretes`.
6. **Testar** pelo painel: `/painel/notificacoes` tem um botão que dispara
   os lembretes na hora, sem esperar o cron do dia seguinte.

## O que não fazer

- **Não** instalar o WhatsApp comum no chip da API (ponto 2).
- **Não** usar o número pessoal dela para envio automático.
- **Não** mandar mensagem para quem não pediu. Além do risco de bloqueio, é a
  diferença entre um lembrete útil e spam — e quem paga a conta é a reputação
  dela, não a nossa.
