# O assistente da Karol no WhatsApp

A Karol manda mensagem pro **número do studio** e uma IA responde com a
agenda na mão. Ela não precisa abrir o painel nem lembrar de senha — é a
mesma conversa de WhatsApp que ela já usa o dia inteiro.

**Estado:** no ar desde 12/09/2026. Precisa de `DEEPSEEK_API_KEY` e da
migração 05 (aplicada). Sem a chave, ele responde com o link do painel e
nada quebra.

---

## O que ela pode pedir

| Ela escreve | O que acontece |
|---|---|
| "quantas clientes amanhã?" · "quem vem sábado?" | responde na hora |
| "acha a Larissa pra mim" | procura por nome ou telefone |
| "quanto eu faturei esse mês?" | faturamento, atendidas, faltas, ticket, novas e retornos |
| "tem horário livre quinta pra henna?" | consulta a grade de verdade |
| "cancela a da Larissa de quinta" | **pergunta antes** |
| "remarca a Ana pra sexta 8h" | **pergunta antes** |
| "bloqueia sexta que eu vou viajar" | **pergunta antes** |
| "marca a Bruna quinta 9h, design simples" | **pergunta antes** (pode marcar já aguardando a entrada) |
| "caiu o pix da Ana" | **pergunta antes** de confirmar o pagamento |
| "esquece" | zera a memória da conversa |

---

## A regra: ler é direto, escrever pede o toque dela

Consultar responde na hora — uma leitura errada ela vê que está errada.
**Mudar a agenda a IA não faz.** Ela descreve o que entendeu e manda dois
botões:

```
Confere pra mim:

CANCELAR o horário de Larissa Souza — Design com henna,
quinta-feira, 8 de outubro às 10:00, Pereira Barreto.

[ ✅ Confirmar ]   [ ❌ Deixa ]
```

Só o toque dela executa. O motivo: um modelo de linguagem não erra
travando — ele acerta a forma e erra o alvo com confiança total. Com duas
clientes na quinta, "cancela a de quinta" pode apagar a errada sem nada
aparecer na tela; quem descobre é a cliente, na porta.

A descrição traz sempre **nome, serviço, dia e hora por extenso**, nunca
um código — "confirmar?" com código seria apertar no escuro.

### As travas

- **Só o número dela chega no assistente.** Quem separa é
  `lib/recepcao.ts`, e o payload da Meta já vem com assinatura conferida.
- **Botão de cliente vai pro atendimento, venha de onde vier.** Com o
  número da Karol desviado pro do Kainã nos testes, um "Confirmar" de
  mensagem de cliente chegou a cair no assistente (12/09). Os botões `k:`
  da remarcação também continuam no atendente.
- **A proposta expira em 30 minutos** e é **amarrada ao número** que pediu.
- **Busca ambígua não vira proposta.** Se achar dois agendamentos, ele diz
  que não achou em vez de escolher.
- **A validação de expediente roda de novo no toque**, não só quando a
  proposta nasce — no meio pode entrar uma cliente pelo site.
- **O caminho das clientes continua trancado.** `atendente.ts` tem um teste
  que reprova se ele importar funções de escrita; o assistente mora em
  arquivo separado justamente pra essa trava não precisar afrouxar.

### O que ele não faz, de propósito

- Não fala com cliente nem manda mensagem em nome dela. Ao cancelar ou
  marcar, a cliente é avisada pelo caminho normal, com o texto que já
  existe — e ele avisa a Karol pra ela não mandar de novo.
- Não decide preço, desconto nem regra de negócio.
- Não apaga histórico (pedido em aberto, seria do painel).
- Não inventa: pedido ambíguo, ele pergunta; não achou, diz que não achou.

---

## Qual modelo, e por quê

Padrão: **`deepseek-flash`**, nome explícito. `deepseek-chat` e
`deepseek-reasoner` são **apelidos do mesmo modelo** — a resposta da API
traz `model: deepseek-flash` nos três, e a fatura só mostra duas linhas de
modelo. Apelido pode mudar de destino sem aviso; nome explícito, não.

### A bancada de provas

16 casos difíceis (`src/lib/bancada-de-provas.test.ts`), com o roteiro e
as ferramentas reais, contra a API de verdade:

| Modelo | Acertos | Tempo por caso | Custo | Lê imagem? |
|---|---|---|---|---|
| **`deepseek-flash`** | 14 a 16 de 16 | 4,4 s | US$ 0,000149/chamada | sim |
| `deepseek-v4-pro` | 14 a 16 de 16 | 10,5 s | US$ 0,001115/chamada | não |
| `gpt-5-mini` | 15/16 | 16,8 s | ~9× o flash | — |
| `gpt-4o-mini` | 12/16 (inventou id) | 2,2 s | ~4× | — |
| `gpt-5-nano` | 9/16 | 16,4 s | ~2× | — |

> [!IMPORTANT]
> **A bancada não enxerga diferença menor que ~2 pontos em 16.** O mesmo
> modelo, nas mesmas rodadas, tirou de 14 a 16. Comparação mais apertada
> que isso é ruído. Antes de culpar o modelo, leia o caso: metade das
> "falhas" da primeira rodada era expectativa errada do teste.

Conclusão: o `v4-pro` não acerta mais e custa 2,4× o tempo e 7,5× o
dinheiro; a OpenAI no máximo empata, mais cara e mais lenta. **A OpenAI
fica como rede**: se o DeepSeek cair, `ia.ts` passa a bola sozinho.
Trocar de modelo é uma variável (`IA_MODELO`), sem tocar em código.

---

## Quanto custa

- **Meta: zero.** É sempre ela quem escreve primeiro, então a janela dela
  está aberta e as respostas saem como texto livre.
- **IA: uns R$ 1,50 por mês.** Fatura de 07 a 13/09: US$ 0,000154 por
  chamada, 2 a 4 chamadas por conversa, 15 conversas por dia.

O que segura o gasto:

- só o número dela é atendido;
- no máximo **4** idas ao modelo por mensagem (`MAX_RODADAS`); na última
  as ferramentas saem, pra ele ser obrigado a responder;
- a memória guarda **30** falas, não a conversa inteira;
- **o roteiro não muda dentro do dia**, então a API o cobra a preço de
  cache (1/50).

> [!WARNING]
> **O que varia a cada mensagem não pode entrar em
> `roteiro-do-assistente.ts`** — vai pro histórico, como a lista de ids.
> Roteiro que muda a cada mensagem multiplica a conta por 50.

---

## Detalhes que já morderam

- **`max_tokens` baixo emudecia o assistente.** O modelo pensa antes de
  responder, e o pensamento sai do mesmo orçamento. Com 700, sobrava zero
  pra resposta ("Não consegui responder isso"). Hoje: teto de 3000, com
  pensamento; se voltar de mãos vazias, uma segunda ida **sem** pensar.
  Desligar o pensamento sempre derruba o acerto de 16/16 pra 13/16.
- **O modelo inventava `id`** (`"ana-paula-2026-09-18-0730"`) em vez de usar
  o uuid que a leitura devolveu. O erro volta pro **modelo** como resultado
  de ferramenta, e a rodada seguinte chama `procurar` e acerta.
- **A marcação interna vazava pro WhatsApp** (`<｜｜DSML｜｜invoke …>`).
  Tudo que sai passa por `fala-do-modelo.ts`.
- **Os ids da última lista vão junto com a resposta**, numa linha
  `[sistema]` (`lista-mostrada.ts`). Mesmo acerto, 37% menos token e 38%
  menos espera. Só a lista mais nova fica — duas seriam ids ambíguos.
- **`reasoning_content` tem que voltar** na mensagem seguinte; sem ele a
  API devolve 400. `ia.ts` e `assistente.ts` já fazem — não tire.

---

## Ligar e testar

1. Rodar `supabase/migracao-05-assistente.sql` (já aplicada em produção).
2. `platform.deepseek.com` → API keys → criar → `DEEPSEEK_API_KEY` na Vercel.
3. **Redeploy** (variável nova só vale no build seguinte).
4. Do celular da Karol, mandar pro número do studio: *"quantas clientes eu
   tenho essa semana?"*.

> [!WARNING]
> **Enquanto `KAROL_WHATSAPP` apontar pra outro número**, é esse número que
> o assistente atende — a mesma variável decide os avisos e o assistente.
> Ver [`estado-atual.md`](./estado-atual.md).

### Trocar de provedor

A API do DeepSeek fala o dialeto da OpenAI. Trocar é mudar duas variáveis:

| Provedor | `IA_BASE_URL` | `IA_MODELO` |
|---|---|---|
| DeepSeek (padrão) | `https://api.deepseek.com` | `deepseek-flash` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |

A chave continua em `DEEPSEEK_API_KEY`. Para a OpenAI como alternativa
dedicada, há `IA_PROVEDOR=openai` + `OPENAI_*` (ver `.env.example`).

---

## Conferir comprovante (fora do assistente)

Quando a **cliente** manda foto, `lib/comprovante.ts` baixa a mídia da Meta
e pergunta ao modelo se é comprovante. Tudo erra pro lado seguro: dúvida
vira comprovante, e qualquer falha (sem chave, PDF, imagem > 4 MB) vira
`nao-sei`. Testado contra falso positivo com fotos do projeto; **nunca
testado com um comprovante real**. A confirmação do pagamento continua
sendo da Karol.

---

## Arquivos e testes

| Arquivo | Papel |
|---|---|
| `lib/recepcao.ts` | decide se quem falou é cliente ou a Karol |
| `lib/assistente.ts` | as ferramentas, as propostas e a execução |
| `lib/ia.ts` | só o transporte até o modelo |
| `lib/roteiro-do-assistente.ts` | tudo o que ele sabe e pode fazer |
| `lib/fala-do-modelo.ts` | separa fala de marcação interna |
| `lib/lista-mostrada.ts` | os ids do que ele acabou de mostrar |
| `lib/acoes-pendentes.ts` | as propostas esperando o toque dela |
| `lib/conversas.ts` | a janela de 24 h e a memória da conversa |

Testes com modelo falso: `assistente.test.ts`, `ia.test.ts`,
`fala-do-modelo.test.ts`, `lista-mostrada.test.ts`, `recepcao.test.ts`.

Dois chamam a API de verdade, desligados por padrão (custam dinheiro).
Ligam com `BANCADA=1` e leem a chave do `.env.local`:

| Arquivo | O que prova |
|---|---|
| `bancada-de-provas.test.ts` | compara modelos com uma **cópia** do laço, escrita no teste |
| `assistente-de-ponta-a-ponta.test.ts` | roda o `assistente()` real contra a API real (banco e WhatsApp falsos) |

A bancada é cega pro nosso código; o de ponta a ponta é o único lugar onde
o nosso código e o modelo se encontram. Ele deu 8/8 em 4 rodadas seguidas
— instabilidade ali é defeito, não ruído.
