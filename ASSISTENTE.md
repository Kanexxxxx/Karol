# O assistente da Karol no WhatsApp

> A Karol manda mensagem pro **próprio número do studio** e uma IA responde
> com a agenda na mão. Ela não precisa abrir o painel, não precisa de
> internet boa, não precisa lembrar de senha — é a mesma conversa do
> WhatsApp que ela já usa o dia inteiro.
>
> Ligar são **duas coisas**: rodar a migração 05 e pôr a chave do DeepSeek
> na Vercel. O resto do código já está no ar.

---

## O que ela pode fazer

| Ela escreve | O que acontece |
|---|---|
| "quantas clientes amanhã?" | responde na hora |
| "quem vem sábado?" | lista com nome, serviço, hora e cidade |
| "acha a Larissa pra mim" | procura por nome ou telefone |
| "quanto eu faturei esse mês?" | faturamento, atendidas, faltas, ticket, novas e retornos |
| "tem horário livre quinta pra henna?" | consulta a grade de verdade |
| "cancela a da Larissa de quinta" | **pergunta antes** — ver abaixo |
| "remarca a Ana pra sexta 8h" | **pergunta antes** |
| "bloqueia sexta que eu vou viajar" | **pergunta antes** |
| "marca a Bruna quinta 9h, design simples" | **pergunta antes** |
| "esquece" | zera a memória da conversa |

---

## ⚠️ A regra que governa tudo: ler é direto, escrever pede o toque dela

**Consultar a IA responde na hora.** Errar uma leitura mostra informação
errada, e a Karol vê que está errada.

**Mudar a agenda a IA NÃO faz.** Ela descreve o que entendeu e manda dois
botões:

```
Confere pra mim:

CANCELAR o horário de Larissa Souza — Design com henna,
quinta-feira, 8 de outubro às 10:00, Pereira Barreto.

[ ✅ Confirmar ]   [ ❌ Deixa ]
```

Só o toque dela executa.

**Por que não deixar a IA agir direto.** Um modelo de linguagem não erra
travando nem devolvendo erro — ele acerta a forma e erra o alvo, com
confiança total. Se houver duas clientes na quinta, "cancela a de quinta"
tem metade de chance de apagar o horário errado. Nada apareceria na tela;
quem descobre é a cliente, na porta do studio.

O botão transforma um erro invisível numa pergunta. É o mesmo desenho que
já governa a remarcação pelas clientes: lá a cliente escolhe e a Karol
decide; aqui a IA propõe e a Karol decide.

A descrição sempre traz **nome, serviço, dia e hora por extenso** — nunca o
código. Um "confirmar?" com código do lado seria ela apertando no escuro, e
aí o botão não protege de nada.

### As outras travas

- **Só o número dela chega no assistente.** Quem separa é
  `src/lib/recepcao.ts`, pelo número de quem mandou, e o payload da Meta já
  vem com assinatura conferida.
- **A proposta expira em 30 minutos.** Confirmar de manhã o que foi pedido
  de noite mudaria a agenda com base num estado que não existe mais.
- **A proposta é amarrada ao número.** Quem descobrisse um id de ação não
  conseguiria executá-la de outro telefone.
- **Código ambíguo não vira proposta.** Se a busca devolver dois
  agendamentos, a IA diz que não achou em vez de escolher.
- **O caminho da CLIENTE continua trancado.** `atendente.ts` tem um teste
  que lê o texto do arquivo e reprova se ele importar `mudarSituacao`,
  `criarAgendamento` ou `salvarBloqueio`. O assistente mora em arquivo
  separado justamente pra essa trava não precisar ser afrouxada.

---

## Quanto custa

**Zero de Meta.** A janela de 24 h abre a cada mensagem que a pessoa manda,
e no fluxo dela é sempre ela quem escreve primeiro — então a janela dela
nunca fecha e as respostas saem como texto livre, sem template.

**Centavos de IA.** No volume dela (algumas dezenas de mensagens por dia,
no pior caso), o DeepSeek fica na casa de **R$ 1 a R$ 3 por mês**. Cada
troca gasta algo entre 1.000 e 3.000 tokens.

O que segura o gasto no código:

- só o número dela é atendido;
- no máximo 3 idas ao modelo por mensagem (`MAX_RODADAS`), e na última as
  ferramentas são retiradas pra ele ser obrigado a responder;
- a memória guarda 8 falas, não a conversa inteira;
- `max_tokens: 700` na resposta.

---

## Ligar

### 1. Rodar a migração

No SQL Editor do Supabase, o conteúdo de
[`supabase/migracao-05-assistente.sql`](./supabase/migracao-05-assistente.sql).
Ela cria a tabela `acoes_pendentes` e acrescenta a coluna `historico` em
`conversas`.

### 2. Pegar a chave do DeepSeek

`platform.deepseek.com` → **API keys** → **Create new API key**.

📋 Guarde. Ela não aparece de novo.

### 3. Pôr na Vercel

Settings → Environment Variables:

```
DEEPSEEK_API_KEY = sk-...
```

**Redeploy** — variável nova só vale no build seguinte.

### 4. Testar

Mande, do celular da Karol, para o número do studio:

> quantas clientes eu tenho essa semana?

⚠️ **Enquanto `KAROL_WHATSAPP` estiver preenchida na Vercel com o número do
Kainã**, é o número DELE que o assistente atende, não o da Karol — a mesma
variável decide as duas coisas. Pra testar antes de entregar, isso é
conveniente. Na hora de entregar, apagar a variável resolve as duas de uma
vez. Ver `PROGRESSO.md`, seção 8.1.

---

## Trocar de provedor

A API do DeepSeek fala o mesmo dialeto da OpenAI, então trocar é mudar duas
variáveis:

| Provedor | `IA_BASE_URL` | `IA_MODELO` |
|---|---|---|
| DeepSeek (padrão) | `https://api.deepseek.com` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |

A chave continua vindo de `DEEPSEEK_API_KEY` — o nome ficou, o conteúdo é
de quem estiver em uso.

---

## Os arquivos

| Arquivo | Papel |
|---|---|
| `lib/recepcao.ts` | decide se quem falou é cliente ou a Karol |
| `lib/assistente.ts` | as ferramentas, as propostas e a execução |
| `lib/ia.ts` | só o transporte até o modelo. Não sabe o que é agendamento |
| `lib/acoes-pendentes.ts` | as propostas esperando o toque dela |
| `lib/conversas.ts` | a janela de 24 h e a memória da conversa |

Os testes que seguram tudo isso estão em `lib/assistente.test.ts` (18
casos, incluindo um que lê o texto do arquivo e prova que a escrita só
acontece depois do botão) e `lib/recepcao.test.ts` (9 casos de
roteamento).

---

## O que ele não faz, de propósito

- **Não fala com cliente.** O que a cliente manda continua indo pro
  `atendente.ts`, com as mesmas regras de sempre.
- **Não manda mensagem em nome dela.** Ela pediu pra cancelar? O
  cancelamento avisa a cliente pelo caminho normal do site, com o texto que
  já existe — não com um texto que a IA inventou na hora.
- **Não decide preço, nem desconto, nem regra de negócio.**
- **Não inventa quando não sabe.** Se o pedido for ambíguo, a instrução é
  perguntar. Se não achou, é dizer que não achou.
