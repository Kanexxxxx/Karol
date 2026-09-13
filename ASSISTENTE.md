# O assistente da Karol no WhatsApp

> A Karol manda mensagem pro **próprio número do studio** e uma IA responde
> com a agenda na mão. Ela não precisa abrir o painel, não precisa de
> internet boa, não precisa lembrar de senha — é a mesma conversa do
> WhatsApp que ela já usa o dia inteiro.
>
> Ligar era **duas coisas**; virou uma. A migração 05 já está aplicada
> (conferido no banco). Resta a chave do DeepSeek na Vercel — e, pelo teste
> de 12/09, ela parece estar lá: o assistente respondeu em produção.

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

**Centavos de IA.** Medido na fatura de 07 a 13/09: **US$ 0,000154 por
chamada**, com 2 a 4 chamadas por conversa. Em 15 conversas por dia dá
**uns R$ 1,50 por mês**. A conta detalhada está mais abaixo, em "Quanto
isso custa por mês".

O que segura o gasto no código:

- só o número dela é atendido;
- no máximo **4** idas ao modelo por mensagem (`MAX_RODADAS`), e na última
  as ferramentas são retiradas pra ele ser obrigado a responder;
- a memória guarda **30** falas, não a conversa inteira;
- o roteiro não muda dentro do dia, então a API o cobra pelo preço de
  cache — 1/50;
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

## Qual modelo atende ela, e por quê

⚠️ **`deepseek-chat` e `deepseek-reasoner` são apelidos do `deepseek-flash`
— o mesmo modelo, não três.** Provado de dois jeitos: a resposta da API
traz o campo `model`, e nos três apelidos ele volta `deepseek-flash`; e a
fatura dos dias em que a bancada rodou os "três" só tem duas linhas de
modelo. Os modelos que existem de fato são **`deepseek-flash`** e
**`deepseek-v4-pro`**.

⚠️ **Isso corrige o que estava escrito aqui em 12/09.** Eu tinha dito que
o `chat` era o pior dos três e que trocar pra `flash` melhorava o
assistente. Não melhora nada: **é o mesmo modelo com outro nome.** O
padrão virou `deepseek-flash` mesmo assim, mas por outro motivo — apelido
é o provedor que decide pra onde aponta, e um dia ele pode apontar pra
outro lugar sem avisar. Nome explícito não muda sozinho.

### O que a bancada mediu de verdade

Quatro rodadas de 16 casos difíceis
(`src/lib/bancada-de-provas.test.ts`), com o roteiro e as ferramentas
reais:

| Modelo | Acertos (4 rodadas) | Tempo por caso | US$ por chamada |
|---|---|---|---|
| **`deepseek-flash`** (padrão) | 14, 15, 16, 14 · 16, 16, 15, 16 | **4,4 s** | **0,000149** |
| `deepseek-v4-pro` | 16, 16, 14, 16 | 10,5 s | 0,001115 |

As duas fileiras de números do flash são as mesmas 4 rodadas chamadas
pelos dois nomes (`chat` e `flash`). **Esse é o presente acidental deste
erro:** o mesmo modelo, nas mesmas 8 rodadas, tirou de 14 a 16 em 16.
Então **a bancada não enxerga diferença menor que uns 2 pontos em 16** —
qualquer comparação mais apertada que isso é ruído, e não conclusão.

Com essa régua, o `v4-pro` não acerta mais que o `flash`. O que ele cobra
por isso está medido na fatura: **2,4× o tempo e 7,5× o dinheiro** por
chamada. A Karol está com o celular na mão esperando. Quem quiser o mais
forte mesmo assim troca uma variável na Vercel, sem tocar em código:

    IA_MODELO = deepseek-v4-pro

### Quanto isso custa por mês

Da fatura real de 07 a 13/09, o uso normal dela (antes das bancadas) saiu
a **US$ 0,000154 por chamada** — e uma conversa gasta de 2 a 4 chamadas.
Na conta de 15 conversas por dia: **uns R$ 1,50 por mês**. O período
inteiro, bancadas caras incluídas, deu US$ 0,38.

O que segura o preço é o cache da API: o roteiro tem 8.880 caracteres e
vai em toda mensagem, mas como ele não muda dentro do dia, a API cobra
1/50 do preço por ele. ⚠️ Quem for mexer no `roteiro-do-assistente.ts`
precisa saber disso: **o que varia a cada mensagem não pode entrar no
roteiro** — vai pro histórico, como o lembrete de lista faz. Roteiro que
muda a cada mensagem multiplica a conta por 50.

### O que ele lembra entre uma mensagem e outra

A memória guarda 30 falas — só o texto. O resultado das leituras, que é
onde estão os **ids**, não era gravado: na mensagem seguinte o modelo não
tinha mais como apontar pra ninguém, e ou relia a agenda ou inventava id.

Agora, junto com a resposta, vai uma linha `[sistema]` com a lista e os
ids (`lista-mostrada.ts`). Medido na bancada, quatro pedidos seguidos do
tipo "cancela a segunda":

| | acertos | idas à API | tokens | tempo |
|---|---|---|---|---|
| sem os ids (era assim) | 4/4 | 8 | 41.153 | 4,5 s |
| **com os ids** | 4/4 | **5** | **25.836** | **2,8 s** |

O acerto não subiu porque, sem os ids, o modelo se salvava relendo a
agenda — o que ele nem sempre lembra de fazer. O que mudou é o custo: 37%
menos token e 38% menos espera pra ela.

⚠️ Só a lista MAIS NOVA fica. Duas listas guardadas são dois conjuntos de
ids, e o modelo não teria como saber qual vale.

⚠️ **Modelo que pensa precisa do `reasoning_content` de volta.** Os dois
modelos novos devolvem o raciocínio nesse campo, e a API EXIGE que ele
volte na mensagem seguinte do assistente; sem isso, o laço de leitura
quebra inteiro com 400. `ia.ts` e `assistente.ts` já fazem isso — quem
mexer lá não pode tirar.

---

## Trocar de provedor

A API do DeepSeek fala o mesmo dialeto da OpenAI, então trocar é mudar duas
variáveis:

| Provedor | `IA_BASE_URL` | `IA_MODELO` |
|---|---|---|
| DeepSeek (padrão) | `https://api.deepseek.com` | `deepseek-flash` |
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
| `lib/roteiro-do-assistente.ts` | o texto inteiro do que ele sabe e pode fazer |
| `lib/fala-do-modelo.ts` | separa fala de marcação interna vazada |
| `lib/lista-mostrada.ts` | os ids do que ele acabou de mostrar pra ela |
| `lib/acoes-pendentes.ts` | as propostas esperando o toque dela |
| `lib/conversas.ts` | a janela de 24 h e a memória da conversa |

Os testes que seguram tudo isso estão em `lib/assistente.test.ts` (35
casos, incluindo um que lê o texto do arquivo e prova que a escrita só
acontece depois do botão), `lib/fala-do-modelo.test.ts` (13),
`lib/lista-mostrada.test.ts` (13) e `lib/recepcao.test.ts` (19 casos de
roteamento).

Fora deles, dois arquivos falam com a API de verdade. Os dois ficam
desligados por padrão (custam dinheiro e minutos) e ligam com `BANCADA=1`:

- `lib/bancada-de-provas.test.ts` — compara modelos e mede o que o modelo
  faz de errado. Usa uma CÓPIA do laço, escrita dentro do teste.
- `lib/assistente-de-ponta-a-ponta.test.ts` — roda a função `assistente()`
  de verdade, a mesma que o webhook chama, contra a API de verdade. Só o
  banco e o WhatsApp são de mentira.

⚠️ **A diferença entre os dois importa.** A bancada é cega pro nosso
código: se `assistente()` tiver um defeito que a cópia dela não tem, ela
passa e a Karol sofre. O de ponta a ponta é o único lugar do projeto onde
as duas metades — nosso código e o modelo — se encontram. Em 4 rodadas
seguidas ele deu 8/8, então instabilidade ali é sinal de defeito, não de
ruído do modelo.

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
