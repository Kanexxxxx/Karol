# GUIA DO PROJETO — Studio Karol Carvalho

> **Para quem está pegando este projeto agora — humano ou outra sessão de IA.**
>
> Leia este arquivo inteiro antes de escrever qualquer linha. Ele existe porque
> o histórico de conversa se perde e o dono do projeto trabalha em máquinas
> diferentes. Aqui está tudo: quem é a cliente, o que já foi decidido, o que já
> foi tentado e rejeitado, o que está pronto e o que falta.
>
> Setup técnico e comandos: [`README.md`](./README.md).
> Armadilhas do Next 16: [`AGENTS.md`](./AGENTS.md).
> O assistente da Karol no WhatsApp: [`ASSISTENTE.md`](./ASSISTENTE.md).

Última atualização: **2026-09-09** (etapa 19 — a Karol respondeu o formulário)

---

## 0. Resumo em trinta segundos

Site institucional + agenda online para a **Karol Carvalho**, maquiadora e
designer de sobrancelhas em Pereira Barreto e Bandeirantes D'Oeste (interior de
SP). Feito pelo **Kainã** (`Kanexxxxx`), que ofereceu o serviço a ela.

| | |
|---|---|
| **Repositório** | `github.com/Kanexxxxx/Karol` — ⚠️ **público** (ver seção 5) |
| **Stack** | Next.js 16 · React 19 · Tailwind 4 · Supabase · Vercel |
| **Site institucional** | ✅ pronto, no ar, com página própria da Karol (`/sobre`) |
| **Agenda online** | ✅ ligada no Supabase e testada contra o banco de verdade |
| **Painel da Karol** | ✅ agenda, busca por nome/telefone, bloqueios, marcar, remarcar, relatório |
| **WhatsApp** | ✅ **funcionando de verdade** — envia, recebe, responde e remarca |
| **Assistente da Karol** | ✅ código pronto — ela controla a agenda conversando. Falta chave e migração (8.7) |
| **Deploy** | ✅ Vercel, `karol-zeta.vercel.app` (provisório, 1 mês de teste) |
| **Build / testes** | ✅ `npm run build` limpo · ✅ **291 testes** passando |

**Tudo que é infraestrutura está de pé.** Supabase criado, quatro tabelas,
variáveis preenchidas, deploy automático a cada push, app da Meta publicado,
webhook verificado e recebendo. Testado ponta a ponta com celular de verdade
em 06/09/2026.

⚠️ **Três coisas que NÃO estão prontas e você precisa saber antes de tocar
em qualquer coisa — leia as seções 8.1, 8.2 e 8.7:**

1. `KAROL_WHATSAPP` está desviando todos os avisos pro número do Kainã. A
   Karol não recebe nada enquanto isso existir.
2. Sem template aprovado na Meta, a confirmação **não chega** em quem marcou
   pelo site e nunca escreveu pro número. Os textos estão prontos em
   `TEMPLATES-WHATSAPP.md`; falta criar e esperar aprovação.
3. **As migrações 04 e 05 não foram rodadas no banco, e a
   `DEEPSEEK_API_KEY` não está na Vercel.** Sem elas o lembrete de 30 min
   e o assistente da Karol existem em código e não funcionam. Ver 8.7.

---

## 1. O contexto comercial (por que este projeto existe)

O Kainã abordou a Karol por WhatsApp oferecendo um site personalizado. O acordo
verbal, nas palavras dele para ela:

> "O site fica 1 mês de teste pra você ver se gosta e se realmente vai ser útil.
> Depois, se quiser continuar, a gente combina certinho."

Ele também **prometeu a ela automação de WhatsApp**: aviso para a cliente quando
agenda, lembrete antes do horário, e aviso para a Karol a cada novo agendamento.
Isso é uma promessa feita, não uma ideia — ver seção 6.4 para o estado real e a
armadilha técnica que existe aí.

Não há contrato escrito, nem valor definido, nem prazo formal. O único
compromisso é o mês de teste grátis.

---

## 2. Quem é a cliente

**Karol Carvalho Nunes.** Duas contas no Instagram, com papéis diferentes:

| Conta | Seguidores | Papel |
|---|---|---|
| `@studio_karol_carvalho_` | ~744 | o negócio: antes/depois, serviços, feedback |
| `@karolcarvalhomakeup_` | ~4.288 | ela: rotina, outfit, autocuidado, links de afiliado |

**A audiência está na conta pessoal**, não na do negócio — 5,7× maior. É de lá
que saem os reels que estouram. O site é o lugar de juntar as duas pontas.

**Ela atende em duas cidades diferentes.** Este é o fato que mais afeta o
software: o horário livre não depende só da hora, depende de **onde ela está
naquele dia**. Uma agenda genérica marca cliente na cidade errada na primeira
semana. Está tratado em `src/lib/agenda.ts`.

**Posicionamento:** ela não vende sobrancelha, vende autoestima. Frases dela,
tiradas dos próprios reels e usadas no site:

- *"Nem de humanas, nem de exatas. Eu sou da autoestima."* → citação da home
- *"Um dia decidi fazer curso de design de sobrancelha, e hoje isso paga as
  minhas contas."* → bloco do curso

**Tem público masculino.** Destaque "Masculino" no perfil e serviço próprio. O
site não pode ser cor-de-rosa delicado a ponto de espantar esse público.

**A dor real, nas palavras dela:** a pergunta nº1 das clientes é *"o valor e os
horários disponíveis"*. Toda intenção de compra vira conversa manual no
WhatsApp. É isso que o site resolve — a página de serviços com preço aberto
mata metade do trabalho dela sozinha, antes mesmo da agenda existir.

---

## 3. O que ela respondeu no briefing

Coletado por Google Forms em **29/08/2026**. Os scripts que geraram o
formulário estão em [`briefing/`](./briefing/) (uso único, já cumpriram o papel).

### Serviços, preços e duração

| Serviço | Preço | Duração | Bloco na agenda |
|---|---|---|---|
| Design de sobrancelha | R$ 25 | 30–40 min | 50 min |
| Design com henna | R$ 30 | 40 min–1h | 70 min |
| Design masculino | R$ 25 | 30–40 min | 50 min |
| Brow lamination | R$ 80 | 1h–1h30 | 100 min |
| Maquiagem social | R$ 100 | 40 min–1h | 70 min |
| Curso de automaquiagem | R$ 120 | ~2h · **1 aluna** | 130 min |

"Bloco na agenda" = duração máxima + os 10 min de intervalo que ela pediu. É
esse número que o motor usa, não a duração crua.

**O curso é individual (1 aluna).** Isso eliminou todo um módulo de turmas que
estava previsto — é só mais um serviço agendável.

### Agenda

| Dia | Cidade | Horário |
|---|---|---|
| Segunda a sexta | Pereira Barreto | 7h às 11h (confirmado: é de manhã) |
| Sábado | Bandeirantes D'Oeste | 11h às 22h |
| Domingo | ⚠️ **A_CONFIRMAR** — ver abaixo | — |

Sem pausa para almoço. Uma cliente por vez. **Agendamento só a partir do dia
seguinte**, nunca no mesmo dia. Nenhuma folga prevista.

⚠️ A janela de segunda a sexta é de **4 horas**. Cabem no máximo 2 brow
laminations ou 4 designs simples por dia útil. O sábado em Bandeirantes é que
carrega o volume.

### Decisões dela

| Assunto | Resposta |
|---|---|
| Preços no site | Mostrar **todos** |
| Confirmação | Ela quer aprovar cada agendamento na mão |
| Aviso pra ela | Sim, no WhatsApp, a cada novo agendamento |
| Mensagens pra cliente | Confirmação na hora · lembrete 1 dia antes · agradecimento depois |
| Não quis | Lembrete de horas antes · aviso automático de endereço |
| Cancelamento | Cliente **não** desmarca sozinha — tem que chamar no WhatsApp |
| Pix de sinal | **"Sim, quero desde já"** |
| Fotos | Liberadas, todas |
| Visual | Manter dourado e bege · clean · **sem cores escuras** |
| CNPJ/MEI | **Não tem** |

### A resposta mais importante

Pergunta: *"Se você pudesse resolver UMA única coisa do seu atendimento hoje,
qual seria?"*

> **"A questão do agendamento com sinal."**

E logo antes ela informou: **1 a 2 clientes desmarcam em cima da hora toda
semana**. Com ticket de R$ 25 a R$ 100 e uma janela diária de 4 horas, cada furo
é caro.

⚠️ **Há uma divergência de interpretação não resolvida aqui.** O Kainã acha que
ela quis dizer "sinal" no sentido de *aviso/notificação*. A leitura oposta — e a
que o formulário sustenta — é *sinal = entrada em dinheiro*, porque duas
perguntas antes o próprio formulário perguntou "você gostaria de pedir um **Pix
de sinal** pra segurar o horário?" e ela respondeu "sim, quero desde já". Além
disso a notificação já tinha sido respondida em separado.

**Não construa nada de pagamento até perguntar a ela em palavras.** `REGRAS.sinal.ativo`
está `false` em `src/data/negocio.ts` justamente por isso.

### Copy pronta, nas palavras dela

- Frase de abertura: *"Trabalho na área da maquiagem social, faço sobrancelhas
  femininas e masculinas e também ministro cursos de automaquiagem."*
- Antes de vir: *"Vir sem maquiagem, trazer no máximo 1 acompanhante (se for
  trazer) por conta do espaço."* → aparece na confirmação, **não** na home

---

## 4. A jornada de design (não refaça este caminho)

Foram feitos **nove protótipos** antes do código atual. Estão publicados como
Artifacts e continuam acessíveis. Se a Karol pedir mudança visual, comece daqui
em vez de inventar de novo.

### Documentos

| | |
|---|---|
| Briefing + análise dos perfis | https://claude.ai/code/artifact/9ae94bae-f6d0-4890-b172-6474e7f94968 |
| Arquitetura e as 4 primeiras direções | https://claude.ai/code/artifact/74b09ab5-e0d9-4739-9a5f-9c84efff7a02 |

### Primeira rodada — quatro direções estruturalmente diferentes

| | Direção | Ideia | Link |
|---|---|---|---|
| A | Prova | antes/depois abre a página | https://claude.ai/code/artifact/99f36529-c2fd-4099-954b-a09d1645e843 |
| B | Revista | editorial, capa com retrato dela | https://claude.ai/code/artifact/d7a4dd87-244a-4129-80ef-8395735708cf |
| C | Balcão | cara de aplicativo, seletor de cidade | https://claude.ai/code/artifact/1002dbf3-9f2a-47c4-8f64-02d7e79a4e7a |
| D | Vitrine | o portfólio **é** a tabela de preços | https://claude.ai/code/artifact/5aa1499a-0392-4e35-a233-b587f3bd8600 |

**Reação do Kainã:** gostou de **B** (por ter a foto dela e título grande) e de
**D** (pela forma de separar foto + valor + tempo + etiqueta). Pediu para juntar
as duas. Reclamou que faltava versão desktop e que estava "básico demais".

### Segunda rodada — mais completas, com desktop de verdade

| | Direção | Link |
|---|---|---|
| E | Capa (nome acima do retrato) | https://claude.ai/code/artifact/14b1ebaa-95c3-46a0-a64b-d6adaa09c6a9 |
| F | Ateliê (abertura dividida) | https://claude.ai/code/artifact/47bf6524-dc0c-443f-becf-6f106fd731c5 |
| G | Feed (tira de fotos no topo) | https://claude.ai/code/artifact/53615b1d-0352-4f62-87f6-035669ae8ec0 |
| H | Boutique (foto de capa inteira) | https://claude.ai/code/artifact/4a1a7bd5-f0f0-49b3-a461-a6ac15bb055b |

**Escolha final:** **H no celular, F no computador.**

### Versão I — a que virou o código

https://claude.ai/code/artifact/3c7a7716-8fc0-4eda-b78b-05d85d87f994

Fusão de H + F numa página só, com todas as correções. **É esta que
`src/app/page.tsx` implementa.** Se precisar entender a intenção visual de
alguma seção, olhe este protótipo.

### Correções que ele pediu — não reintroduza nenhuma

| O que estava errado | Como ficou |
|---|---|
| Faixa de cidades desalinhada | grade de 3 colunas no desktop, 3 linhas no celular |
| Linha dourada cortando o antes/depois | removida; só as etiquetas "Antes" e "Depois" |
| "Uma hora só sua" (achou esquisito) | "Uma cliente por vez, do começo ao fim" |
| "Como funciona" citava WhatsApp | **nunca citar WhatsApp aqui** — o agendamento é no site |
| "Onde eu atendo" | "Local de atendimento" |
| Fotos repetidas entre serviços | cada serviço tem uma cliente diferente |
| Uma aluna só na galeria | seis alunas diferentes |
| "Antes de vir" na home | movido para a confirmação pós-agendamento |
| Site estático demais | esteira de fotos em loop + revelação ao rolar |
| Tipografia cobrindo o rosto dela | o rosto **sempre** fica livre |

**Vetos da Karol:** nada de cores escuras (por isso o site tem tema único
claro, sem modo escuro). Manter dourado e bege. Visual "clean e fácil de
entender".

### O que ele pediu e ainda não existe

- **Vídeos do Instagram dela no site.** Não foi feito. No protótipo era
  inviável (Artifact bloqueia mídia externa e o clipe inteiro embutido levaria a
  página a ~7 MB). **No site real na Vercel não há esse impedimento** — é
  trabalho pendente, não impossível.

---

## 5. As fotos e o incidente de privacidade

### De onde vieram

Todas dos posts públicos do Instagram dela, que autorizou no briefing ("pode
usar todas").

**Descoberta importante:** a grade do perfil serve miniaturas de **480 px** —
foi a causa da perda de qualidade que o Kainã reclamou. As **páginas dos posts**
servem o original, de **1280 a 3505 px**. Com a conta logada dá pra varrer o
perfil inteiro (311 posts foram carregados; 50 imagens baixadas em resolução
original).

**Método, se precisar de mais fotos:** logar no Instagram no navegador, abrir o
perfil, rolar até carregar tudo, abrir um post e colher `img` com
`naturalWidth >= 700`. A API interna (`/api/v1/users/web_profile_info/`) devolve
429 depois de rolagem pesada — espere ou use o DOM.

### O processamento

`ferramentas/fotos2.py` — **só reduz, nunca amplia.** Reduzir preserva detalhe;
ampliar inventa, e é a ampliação por IA que deixa aquele aspecto plastificado em
pele e olhos que o Kainã rejeitou explicitamente. Lanczos direto do original,
máscara de nitidez de raio curto com limiar alto, JPEG progressivo.

Acervo atual: 37 fotos em `public/fotos/` — 6 alunas diferentes, ~20 clientes
distintas, fotos do atendimento acontecendo, retrato profissional dela.

### ⚠️ O incidente

As seis fotos de aluna com certificado traziam o **nome completo escrito à mão,
a data do curso e a assinatura** — legíveis. Dado pessoal de terceiro, num site
público e num repositório público.

**Corrigido** (commit `d3450ab`): `ferramentas/anonimizar.py` apaga a faixa do
certificado abaixo do título, por pixelização destrutiva (reduz a 10 px e
reamplia em NEAREST). Não é desfoque — desfoque gaussiano pode ser parcialmente
revertido; reduzir joga a informação fora de vez. O rosto e a palavra
"CERTIFICADO" continuam.

Os **originais em alta também foram anonimizados** (commit `393fbbf`) e
voltaram para o Git. As 50 fotos foram conferidas uma a uma: seis tinham
certificado de verdade (`09, 44, 46, 47, 48, 49`), três eram falso positivo da
detecção — fundo claro e print de reel.

`ferramentas/anonimizar.py` tem dois modos:

```bash
python ferramentas/anonimizar.py              # fotos publicadas (public/fotos)
python ferramentas/anonimizar.py --originais  # os originais em alta
python ferramentas/anonimizar.py --conferir   # só mostra as faixas, não grava
```

⚠️ **Se baixar fotos novas do Instagram, rode o script antes de commitar.**
Qualquer foto de aluna com certificado tem nome legível.

### ⛔ O que continua aberto

1. **O repositório está PÚBLICO.** Os nomes já não estão em lugar nenhum do
   estado atual, mas **o histórico anterior ao commit `d3450ab` ainda tem as
   versões com nome legível** — e histórico de repositório público é baixável.
   Deixar privado (Settings → General → Danger Zone → Change visibility) é a
   ação que resolve, e leva 30 segundos.
2. **Se as fotos antigas precisarem sumir do histórico de vez**, é reescrita de
   histórico com force push. Quebra o clone das outras máquinas. Decisão do
   dono, não foi feita.
3. **Conferir com a Karol foto por foto** antes de publicar. A autorização foi
   genérica; são rostos de pessoas reais.

---

## 6. O que existe de código

### 6.1 Arquitetura

Estrutura de pastas e comandos: [`README.md`](./README.md). O essencial:

- **Conteúdo** (preços, textos, horários, fotos) vem de `src/data/` — é a fonte
  da verdade. Mudança de preço é uma linha lá, não caça no JSX.
- **Motor de horários** (`src/lib/agenda.ts`) é função pura sobre minutos do
  dia. Sem fuso, sem `Date` por dentro. Quem lida com data é quem chama.
- **Nada do site público lê a tabela de agendamentos.** Nome e WhatsApp das
  clientes nunca saem do servidor; só os horários livres chegam ao navegador.
- **A trava anti-conflito é do banco**, não da aplicação: a constraint
  `sem_choque` (`EXCLUDE USING gist`) recusa qualquer sobreposição. Conferir
  antes e gravar depois abriria janela para duas clientes pegarem o mesmo
  horário no mesmo instante.

### 6.1.1 Onde está o quê

Se você só vai ler cinco arquivos, leia estes.

| Arquivo | O que decide |
|---|---|
| `data/negocio.ts` | expediente, cidades, regras, `SITE_URL`, interruptores de aviso |
| `data/servicos.ts` | preço, duração e **quem aparece no `/agendar`** (`agendavel`) |
| `lib/agenda.ts` | o motor. Função pura sobre minutos do dia, sem `Date` por dentro |
| `lib/agendamentos.ts` | tudo que toca a tabela `agendamentos` |
| `lib/atendente.ts` | **o que o robô responde às CLIENTES no WhatsApp** |
| `lib/recepcao.ts` | quem atende quem — cliente vai pro atendente, a Karol pro assistente |

E os que entraram na etapa 17:

| Arquivo | Papel |
|---|---|
| `lib/telefone.ts` | o ÚNICO lugar que decide o formato do número. Sempre com DDI |
| `lib/codigo.ts` | o código derivado do UUID. Chave de link, nunca texto de tela |
| `lib/conversas.ts` | a janela de 24 h de cada número |
| `lib/remarcacao.ts` | o pedido de remarcação que atravessa várias mensagens |
| `lib/webhook-meta.ts` | assinatura e leitura do payload da Meta. Função pura |
| `app/api/whatsapp/route.ts` | só transporte: assinatura, parse, não repetir |

E os da etapa 18:

| Arquivo | Papel |
|---|---|
| `lib/assistente.ts` | **a IA da Karol.** As ferramentas, as propostas e a execução |
| `lib/ia.ts` | só o transporte até o modelo. Não sabe o que é agendamento |
| `lib/acoes-pendentes.ts` | as propostas da IA esperando o toque dela |
| `lib/lembretes.ts` | as duas varreduras: a diária e a de ~30 min antes |
| `components/Esqueleto.tsx` | as peças dos `loading.tsx` |

⚠️ **`assistente.ts` e `atendente.ts` são separados de propósito.** O
atendente tem um teste que lê o texto do arquivo e reprova se ele importar
`mudarSituacao`, `criarAgendamento` ou `salvarBloqueio` — é o que garante
que a cliente não desmarca sozinha. O assistente precisa dessas funções.
Juntos, a trava teria que ser afrouxada pras clientes também. **Nunca
mova uma coisa pra dentro da outra.**

**Por que a decisão mora fora da rota:** rota não é importável, então não é
testável. Foi um bug de costura entre duas partes certas que derrubou os
bloqueios na etapa 11 — a lição virou regra.

### 6.1.2 As cinco tabelas

| Tabela | Guarda | Migração | Aplicada? |
|---|---|---|---|
| `agendamentos` | os atendimentos. `sem_choque` impede sobreposição | `schema.sql` | ✅ |
| `bloqueios` | férias, feriado, compromisso | `schema.sql` | ✅ |
| `conversas` | a janela de 24 h de cada número **e a memória do assistente** | `migracao-02` · `05` | ✅ / ⛔ |
| `remarcacoes` | pedido de remarcação em andamento | `migracao-03` | ✅ |
| `acoes_pendentes` | o que a IA propôs e espera o toque da Karol | `migracao-05` | ⛔ |

E a coluna `avisado_30min_em` em `agendamentos` (`migracao-04`, ⛔).

Todas com RLS ligado e **zero policies** — só a chave de serviço passa.

⛔ **As migrações 04 e 05 ainda NÃO foram rodadas em produção.** Ver 8.7.

### 6.2 Armadilhas do Next 16 que já morderam

- `middleware.ts` virou **`proxy.ts`** (mesma API, nome novo)
- `cookies()` é **async**: `const c = await cookies()`
- `params` e `searchParams` são **Promise** — precisam de `await`
- Server Actions são POST na própria rota — **sempre** valide auth dentro da action
- Docs offline em `node_modules/next/dist/docs/` — leia antes de inventar API

### 6.3 ⚠️ Fuso horário

O motor trabalha em **hora local do servidor** e assume Brasil. Na
Vercel/serverless o default é UTC.

**Não dá pra resolver por variável de ambiente:** a Vercel **reserva** o nome
`TZ` e recusa quem tenta defini-lo no painel. Descoberto no deploy.

Resolvido no código, em duas camadas:

1. `src/instrumentation.ts` — o `register()` do Next roda uma vez e termina
   antes do servidor aceitar a primeira requisição; ali `process.env.TZ` recebe
   `FUSO`. É o que conserta a **aritmética de datas** (`getHours`, `setHours`,
   `getFullYear`) espalhada por `agenda.ts`, `agendamentos.ts` e `bloqueios.ts`.
2. `src/lib/datas.ts` — cada formatador declara `timeZone: FUSO`. Eles nascem
   no carregamento do módulo, então depender do fuso do processo seria depender
   da ordem em que os módulos carregam. Cinto e suspensório de propósito.

A constante única é `FUSO` em `data/negocio.ts`.

O estrago quando falta é discreto, que é o pior tipo: das 21h à meia-noite o
servidor já virou o dia e a agenda oferece as datas erradas, sem erro na tela.
`datas.test.ts` carrega o módulo com o processo em UTC e em Tóquio pra provar
que o resultado não muda.

### 6.4 A automação de WhatsApp — leia antes de prometer qualquer coisa

**`WhatsApp Business` (o aplicativo) ≠ `WhatsApp Business API`.** O app grátis
faz mensagem de saudação e ausência, mas **não** manda lembrete agendado para
uma pessoa específica. Se instalar o WhatsApp no chip novo, ele fica
inutilizável para a API oficial depois. **Não instale.**

Opções levantadas, dado que **ela não tem CNPJ**:

| Caminho | Custo | Risco |
|---|---|---|
| **Meta Cloud API** (oficial) | ~R$ 15–25/mês no volume dela | conta Meta Business pode ser pessoa física; sem verificação há limite de 250 destinatários/dia, muito acima do necessário |
| Bibliotecas não oficiais (Baileys etc.) | grátis | **risco de banir o número** — não recomendado nem no chip novo |
| **Sem API, custo zero** | grátis | arquivo de calendário (`.ics`) que a cliente salva e o próprio celular lembra; link `wa.me` pré-preenchido; notificação push pro painel instalado como app |

Os caminhos, o custo de cada um e o passo a passo pra ligar estão em
[`WHATSAPP.md`](./WHATSAPP.md) — incluindo por que os provedores não
oficiais (Z-API, Evolution) não entram na lista.

**O que o código faz hoje:** monta as mensagens e faz `POST` num webhook
configurável (`NOTIFICADOR_WEBHOOK_URL`). Quem estiver do outro lado (n8n, Make,
Zapier, função própria) manda a mensagem de verdade. Sem o webhook, as
mensagens são montadas e não saem. Formato do corpo em `src/lib/notificacoes.ts`.

### 6.5 Agendamento com sinal — construído (09 a 11/09/2026)

Ela respondeu no formulário final: **50% de sinal só nos serviços de R$ 80
ou mais**, por PIX (telefone 18997525291, Nubank, Karolaine Carvalho), e
**o sinal não volta** — "é justamente pra ela não desmarcar".

| Peça | Onde |
|---|---|
| A regra (quem pede sinal, quanto) | `precisaDeSinal` / `valorDoSinal` em `data/servicos.ts` |
| O BR Code com o **valor dentro** (campo 54) | `lib/pix.ts` |
| O QR, escrito à mão e conferido contra o `segno` e o OpenCV | `lib/qr.ts`, `lib/png.ts` |
| O QR como imagem pro WhatsApp (valor sai do banco, nunca da URL) | `app/api/pix/[id]/route.ts` |
| A tela depois de marcar: QR, copia e cola e chave | `app/agendar/confirmado/page.tsx` |
| A mensagem do sinal: texto, QR e copia e cola sozinho | `enviarPedidoDeSinal` em `lib/notificacoes.ts` |
| O template `pedido_sinal` (janela fechada) | `templateDoEvento` + `TEMPLATES-WHATSAPP.md` |
| O PIX sai quando a cliente toca em "Receber o PIX" | `atender` em `lib/atendente.ts` |
| A Karol confirma quem pagou | painel, ou "caiu o pix da Ana" no assistente |

⚠️ **O número do botão da tela de confirmação é o PESSOAL da Karol**, de
propósito: o chip da API não tem caixa de entrada. Então o PIX automático
pelo WhatsApp depende do **template** `pedido_sinal` estar aprovado. Sem
ele, a cliente paga pelo QR da própria tela e manda o comprovante no
WhatsApp pessoal — funciona, só não é automático.

`PLANO-PAGAMENTO.md` ficou como registro da análise que veio antes.

---

## 7. Histórico das etapas

Etapas 1 a 9 foram feitas por uma sessão anterior; as demais nesta. Cada uma é
um commit.

| # | Etapa | Status |
|---|---|---|
| — | Scaffold, home completa, acervo de fotos | ✅ |
| 1 | Destravar build + agendamento grava no banco | ✅ |
| 2 | Painel da Karol + login por senha | ✅ |
| 3 | Tela de bloqueios (férias/feriado) | ⚠️ só funcionou na 11 |
| 4 | Notificações + lembrete agendado | ✅ (envio depende de webhook) |
| 5 | Polish: README, testes, sitemap/robots, ícone | ✅ |
| 6 | Robustez: 404, erro, loading, menu no celular | ✅ |
| 7 | LGPD: política de privacidade + consentimento | ✅ |
| 8 | Anti-spam (honeypot, carimbo, freio por IP) | ✅ |
| 9 | Suíte de testes — 64 casos, 8 arquivos (hoje 75) | ✅ |
| 10 | Anonimização dos certificados + originais fora do Git | ✅ |
| 11 | Bloqueios corrigidos, duplicações, mobile, freio por IP | ✅ |
| 12 | Fuso resolvido no código (a Vercel reserva `TZ`) | ✅ |
| 13 | Calendário do mês, cidade no agendamento, painel completo | ✅ |
| 14 | Relatório do mês, com quem faltou e o contato | ✅ |
| 15 | Página da Karol (`/sobre`) e acerto das fotos | ✅ |
| 16 | Código do agendamento, busca no painel e webhook do WhatsApp | ✅ |
| 17 | WhatsApp ligado de verdade: botões, remarcação com memória, avisos do painel | ✅ |
| 18 | Carregamento, lembrete de 30 min, relatório e o assistente da Karol | ✅ |

### Detalhes que valem saber

**Fluxo de situação do agendamento:** `pendente → confirmado/cancelado` ·
`confirmado → concluido/faltou/cancelado` · `cancelado/faltou → confirmado`
(reativar) · `concluido` é ponto final.

**Sessão do painel:** cookie `painel_sessao` = `<payload>.<HMAC-SHA256>`
assinado com `SESSAO_SECRET`, validade de 7 dias, `httpOnly` + `sameSite=lax` +
`secure` em produção. Sem biblioteca. Duas pessoas, uma senha só.

**`aprovacaoManual` está `false`**, então todo agendamento entra direto como
`confirmado` — mesmo ela tendo pedido aprovação manual no briefing. O caminho
`pendente` já existe no painel para quando ligar. Ver seção 8.

**Anti-spam:** honeypot (campo escondido), carimbo de tempo (rejeita envio em
< 2s ou > 2h) e freio de 5 agendamentos/hora por IP. O freio é `Map` em
memória — some no deploy e não é compartilhado no serverless. É quebra-galho
contra script ingênuo, não proteção séria.

**Testes:** `npm test` (vitest). `test/mock-banco.ts` é um fake do cliente
Supabase; `test/stubs/server-only.ts` substitui o pacote real, que lança fora do
runtime do Next. `vitest.config.ts` fixa `TZ=America/Sao_Paulo`.

### Etapa 17 — o WhatsApp funcionando de verdade

Dia inteiro com o Kainã testando no celular dele. **Tudo abaixo foi provado
com mensagem de verdade, não só com teste.**

#### O que a Meta exigia e ninguém sabia

Três coisas travaram o webhook por quase uma hora, e nenhuma dá erro claro:

1. **App tem que estar PUBLICADO.** Em desenvolvimento a Meta entrega só
   webhook de teste do painel — mensagem real não chega, e a tela mostra
   tudo verde. Publicar exigiu política de privacidade (a `/privacidade` que
   já existia serviu), ícone 1024×1024 e categoria.
2. **São DUAS assinaturas, não uma.** O app assina o campo `messages`
   (vem ligado de fábrica) **e** a conta do WhatsApp precisa assinar o app —
   botão "Assinar webhook" no bloco do número, na Etapa 2. Sem a segunda, a
   Meta aceita tudo e não repassa nada.
3. **O `to` da API precisa do DDI.** Ver abaixo.

#### O bug do número sem DDI

O primeiro agendamento de verdade gravou `16991557552`. A Meta manda o
remetente como `5516991557552`. O webhook procurava por igualdade, não
achava, e respondia "não achei nenhum horário nesse número" pra quem tinha
acabado de marcar.

Quebrava três coisas, não uma: o webhook, o botão "Chamar" do painel
(`wa.me/16991557552` é lido como **+1 631 955-7552**, dos Estados Unidos) e a
formatação da tela.

`lib/telefone.ts` passou a ser o único lugar que decide o formato. **O teste
do caminho feliz esperava o número SEM DDI** — ele travava o bug em vez de
pegá-lo. Corrigido, com o motivo escrito na asserção.

#### O link que apontava pra um 404

`SITE_URL` tinha como padrão `karolcarvalho.vercel.app` — um domínio que
**nunca existiu**. A Vercel criou o projeto como `karol-zeta`. O link "abrir
no painel" que chegava no WhatsApp dela não abria nada, e o `sitemap.xml`
mandava o Google pras quatro páginas de um domínio morto.

Passou meses despercebido porque **nada quebra**: 404 não lança exceção, não
falha build, não aparece em log de erro.

Agora a cadeia é `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` →
literal. A do meio a Vercel injeta sozinha, com o domínio real, sem ninguém
configurar. **É isso que impede o erro de voltar.**

#### Remarcar dentro do WhatsApp — a conversa com memória

O webhook era sem memória: cada mensagem sozinha. Isso basta pra "me manda
meu horário". Remarcar são quatro momentos com espera humana entre eles.

```
cliente toca 📅 Remarcar   →  recebe LISTA de horários livres
cliente escolhe um         →  Karol recebe pedido com 2 botões
Karol toca ✅ Confirmar     →  A AGENDA MUDA (só aqui)
cliente é avisada          →  sai de remarcarAgendamento
```

Tabela `remarcacoes` (migração 03). Ela guarda **o que foi oferecido** — é
isso que impede o sistema de mover pra um horário que a cliente nunca viu.

⚠️ **A garantia que manda:** entre o primeiro toque e o da Karol, a agenda
não se move. A cliente **escolhe**, a Karol **decide**. Há um teste que lê o
arquivo e prova que `remarcarAgendamento` só é chamado dentro de
`decisaoDaKarol`.

E foi preciso separar as mensagens **da Karol**: ela responde no mesmo número
e o webhook é um só. Sem isso, um toque dela viraria
`proximoAgendamentoDe(número da Karol)` e o robô responderia o horário DELA.

#### O painel era mudo

Só a criação pelo SITE avisava. Tudo que a Karol fazia pelo painel não
mandava nada: marcar na mão, **remarcar** e cancelar. O de remarcar era o
pior — a agenda dela passava a dizer uma coisa e a cliente continuava sabendo
outra.

Dois eventos novos, `remarcado` e `cancelado`, **sem interruptor** em
`NOTIFICACOES` de propósito: não avisar não é uma opção que valha oferecer.

#### O código do agendamento

Existe, é derivado do UUID (`lib/codigo.ts`), e **não aparece em lugar
nenhum**. O Kainã pediu isso três vezes — nas duas primeiras eu tirei de um
lugar e deixei em outro. Hoje um teste lê todos os `.tsx` e recusa qualquer
tela que importe `codigoDoAgendamento`.

Ele serve pra uma coisa só: a chave do `?q=` no link que a Karol recebe. A
busca do painel aceita ele calada, mas oferece "nome ou telefone".

#### Outras coisas do dia

- **O curso saiu do `/agendar`.** São 130 min numa janela de 240: come mais
  da metade da manhã e some assim que existe qualquer outro atendimento.
  Continua no site inteiro; a conversa começa no WhatsApp dela.
- **O painel mentia**: dizia "as mensagens são montadas mas não saem"
  enquanto elas saíam — olhava só o webhook antigo, nunca o `META_TOKEN`.
- **Rolagem lateral no celular**, duas vezes: a foto de abertura (`scale`
  sem `overflow-hidden`) e o cabeçalho do painel (cinco itens sem
  `flex-wrap`).
- **`lerPeriodo` estourava** com linha sem período; o mock do banco devolvia
  `[]` no `maybeSingle` e escondia isso.
- **Auditoria da agenda** em `agenda-auditoria.test.ts`, respondendo pela
  terceira vez a dúvida dele sobre horários sumindo "pra trás" — com prova
### Etapa 20 — a Karol respondeu, e um resgate no meio do caminho

#### O que ela respondeu (07/09/2026)

O formulário final foi respondido inteiro. As respostas que mudaram código:

| Pergunta | Resposta dela |
|---|---|
| O que é "sinal" | **"As duas coisas"** — dinheiro E aviso |
| Quanto | **50% do valor do procedimento** |
| Devolve? | **"Não volta — é justamente pra ela não desmarcar"** |
| Quanto tempo segura | até o fim do dia |
| Chave PIX | 18997525291 · Nubank · Karolaine Carvalho |
| Em quais serviços | **só os de R$ 80 ou mais** |
| Aprovação manual | "Não, pode valer na hora e eu só recebo o aviso" |
| Horários | **acrescentou 18h30–22h de seg a sex, e domingo o dia inteiro** |
| Endereços | Pereira: Rua Atlântico 884 · Bandeirantes: Rua 2 de Fevereiro 274 |
| Nota pro site | **10 de 10**, "gostei de tudo" |
| Continuar depois do teste | "ainda estou decidindo" — quer testar e saber o valor |

⚠️ **As duas respostas sobre sinal e aprovação parecem brigar e não brigam.**
Ela quer sinal E quer que valha na hora — cada uma para uma faixa de preço.
Design de R$ 25 confirma na hora; brow lamination espera o comprovante. Quem
decide é `precisaDeSinal()` em `data/servicos.ts`, pelo VALOR do serviço.

#### O resgate

O projeto chegou nesta sessão **sem compilar**. Três erros de sintaxe, 11
arquivos de teste que nem carregavam, e um padrão de estrago que se repetia:
a sessão anterior **acrescentava linha sem apagar a antiga**.

Em objeto literal do JS a última chave vence, então o estrago às vezes era
silencioso:

```ts
sinal: { chavePix: "18997525291", ... , chavePix: null }
```

A chave PIX estava **nula em produção**. A tela de confirmação mostraria
"Chave PIX (Telefone): null" para quem fosse pagar.

Dois erros de negócio saíram junto, e são os que doem:

1. **A tela prometia devolver o sinal** "caso você precise desmarcar com
   pelo menos 24 horas de antecedência". A resposta dela foi o contrário,
   literal. Promessa de dinheiro na tela, e quem responderia depois era ela.
2. **Todo agendamento virava `pendente`**, inclusive design de R$ 25 — a
   cliente marcava e ficava no vácuo esperando uma aprovação que a Karol nem
   sabia que precisava dar.

#### O horário que o site dizia

Ela expandiu bastante a agenda e o motor absorveu certo — dois turnos por
dia útil e domingo. Mas o texto público foi **chumbado dentro da função**
(`if (cidade === "pereira-barreto") return "7h às 11h e 18h30..."`).

Isso é o defeito clássico deste projeto: segunda fonte da verdade. Funciona
no dia em que se escreve e vira mentira no dia em que ela muda de horário —
a agenda oferece uma coisa e o site diz outra, sem nada quebrar. Hoje
`horarioDaCidade()` deriva do `EXPEDIENTE`, e três testes seguram isso.

⚠️ **DOMINGO É PALPITE.** Ela disse "atendo o dia todo" e o código pôs
**8h às 18h**. Ninguém perguntou a hora. Confirme antes de a agenda receber
gente de verdade no domingo.

⚠️ **E o fim da noite tem divergência.** O formulário escrito diz "18:30 às
22:00"; num áudio ela falou "até às 11h da noite". O código está com 22h,
que é o que está por escrito.

#### A página dela

Refeita com o material do formulário — 2021, o empurrão da mãe, o medo
("maquiagem, se a cliente não gostar, é só lavar o rosto"), as seis amigas
de treino, a cliente que chorou, e a henna Lá Benig.

Três defeitos visuais que só apareceram olhando no navegador: os cartões da
história ocupavam metade da largura no computador e deixavam uma coluna
morta; a faixa larga do fim era o rosto de uma **cliente** ampliado numa
página que é sobre a Karol; e no celular "Karol" e "Carvalho" caíam na mesma
linha, porque `.palavra` definia `display` e CSS fora de `@layer` vence
utilitária do Tailwind — a mesma armadilha já documentada em `ui.tsx`.

### Etapa 19 — expansão de turnos, limpeza de repetições e blindagem de segurança

Ajustes vindos diretamente dos retornos em áudio da Karol (07/09/2026), remoção de repetições visuais e de texto apontadas pelo Kainã, correção do corte de foto em `/sobre`, e auditoria de segurança rigorosa.

#### 1. Expansão de horários e múltiplos turnos

A Karol explicou em áudio como divide seu atendimento entre as duas cidades:
- **Pereira Barreto**: Segunda a sexta em dois turnos — manhã (07:00 às 11:00) e noite (18:30 às 22:00). Domingo o dia todo (08:00 às 18:00).
- **Bandeirantes D'Oeste**: Sábado das 11:00 às 22:00.

Mudanças estruturais:
- `EXPEDIENTE` em `data/negocio.ts` agora suporta múltiplos registros por dia da semana (`DiaSemana`).
- `agenda.ts`: introduzida `expedientesDoDia(data: Date): Expediente[]`. A `gradeDoDia` varre todos os turnos abertos para o dia e a cidade, garantindo que nenhum horário seja gerado no intervalo de fechamento da tarde (11:00 às 18:30).
- Em `/agendar`, a seleção de horários agrupa as vagas por turno ("Manhã", "Tarde", "Noite") quando há mais de um turno no dia, deixando a navegação clara.

#### 2. Limpeza da frase repetitiva "uma cliente por vez"

A frase aparecia três vezes em seções seguidas do site. Foi substituída:
- Em `Abertura.tsx`: badge trocado para "Com hora marcada".
- Em `Atendimento.tsx`: título e texto reescritos para "Cuidado dedicado e sem pressa", destacando a harmonia com o rosto da cliente e acompanhamento no espelho.
- Em `Sobre.tsx` e `/sobre`: copy refinada para destacar o atendimento personalizado nas duas cidades.

#### 3. Correção do corte da foto da Karol na `/sobre`

A seção de abertura de `/sobre` possui `overflow-hidden` para sangria controlada. O contêiner pai usava `items-center`, que centralizava verticalmente a imagem em relação à coluna de texto. Como a foto da Karol é mais alta, o topo da cabeça era empurrado para fora da borda superior e cortado.
Solução: mudança para `items-end pt-10 pb-0 lg:pt-14`, ancorando a foto na linha de base e mantendo a cabeça e o enquadramento 100% visíveis.

#### 4. Auditoria de segurança e correções (skills `security-review` e `find-bugs`)

- **Controle de acesso em `decisaoDaKarol` (`atendente.ts`):** os botões de confirmação/recusa de remarcação (`k:ok:...` e `k:no:...`) não validavam o remetente da mensagem. Se uma cliente enviasse esse payload de botão, poderia autoaprovar sua remarcação. Agora exige explicitamente que `m.de` corresponda ao número oficial da Karol. Coberto com teste em `remarcacao-fluxo.test.ts`.
- **Prevenção de Timing Attack na rota de cron (`/api/lembretes`):** a validação do cabeçalho `Authorization: Bearer <CRON_SECRET>` usava igualdade estrita de strings (`===`), suscetível a ataques de canal lateral por tempo. Atualizada para comparação em tempo constante (`timingSafeEqual` via SHA-256).

⚠️ **Correção da etapa 20:** a frase acima ("275 testes passando, build
compilando") **não era verdade quando esta etapa foi entregue.** O
projeto chegou na sessão seguinte sem compilar — três erros de sintaxe e
11 arquivos de teste que nem carregavam. Ver etapa 20.

O que foi feito AQUI, porém, presta e ficou: o motor de múltiplos turnos
está certo (conferido no navegador), e as duas correções de segurança são
reais — em especial a do `decisaoDaKarol`, que era uma falha de verdade:
uma cliente que mandasse o payload de botão `k:ok:` conseguiria aprovar a
própria remarcação. O estrago foi mecânico, não de julgamento.

### Etapa 18 — o dia do carregamento, do lembrete e do assistente

Quatro frentes pedidas pelo Kainã de uma vez.

#### O site não estava travando, estava mudo

Existia **um único `loading.tsx` no projeto inteiro**, no `/agendar`. Sem
ele, o Next segura a tela ANTIGA congelada até a nova ficar pronta, e o
único sinal de vida era o fio de 3 px no topo. O painel é `force-dynamic` e
lê 60 dias do Supabase toda vez que abre — era onde mais aparecia, e é a
tela que a Karol usa no celular no meio do atendimento.

A barra também jogava contra: `avanca` rodava em **9 segundos** com
aceleração suave, então em meio segundo de navegação ela tinha andado 7 %
da tela. Barra que não anda comunica travamento. Agora são 45 % nos
primeiros 300 ms e cada vez mais devagar depois — o começo da espera é onde
a pessoa duvida que o toque pegou; o resto ela já sabe que está carregando.
Mais brilho na ponta, sem o qual 3 px de dourado somem no creme do site.

#### O lembrete de 30 min mora no cartão, não numa tela à parte

O Kainã pediu automático **e** manual. Os dois estão no cartão do
agendamento: o estado ("Lembrete 06:45") e o botão. A Karol não pensa "vou
disparar lembretes", ela pensa "a Larissa das 8h não respondeu, será que
chegou?" — pergunta sobre UMA cliente, respondida olhando pro cartão dela.

⚠️ **A ordem `marcar → mandar` não é detalhe.** Invertida, cabe a próxima
batida do cron entre uma coisa e outra, e a cliente recebe a mesma mensagem
três vezes enquanto se arruma. Provado por mutação: com a ordem trocada de
propósito, 2 testes ficam vermelhos.

#### O painel de notificações dizia o estado do servidor

Listava variável de ambiente com bolinha do lado. O Kainã chamou de
informação inútil e estava certo: são coisas que a Karol não pode resolver.
Virou **conversas abertas** — quem escreveu nas últimas 24 h, com quanto
tempo falta. Isso é dinheiro: dentro da janela, mensagem é livre e sem
template. O diagnóstico técnico continua, dentro de um `details` fechado no
rodapé.

#### O relatório mentia pra baixo, em silêncio

O faturamento conta só quem foi marcada como **Atendida**, e ela marca no
fim do dia, quando lembra. Cada esquecimento era dinheiro que aconteceu e
não aparecia, sem nenhum sinal na tela. Agora os atendimentos que passaram
da hora e ficaram sem marcação vêm **antes** dos números, com quanto está
pendurado e os botões pra resolver ali mesmo.

Mais comparação com o mês anterior e **clientes novas contra as que
voltaram** — o número que mais diz sobre o negócio, porque sobrancelha vive
de retorno. Contado por pessoa e não por atendimento: quem faz de 15 em 15
dias inflava as "novas" sozinha.

Dinheiro compara em porcentagem, quantidade em número absoluto. Com uma
dúzia de atendimentos por mês, passar de 2 pra 3 vira "+50 %", que soa como
um mês espetacular e é uma cliente.

#### O assistente da Karol — e por que ele mora fora do `atendente.ts`

Ela manda mensagem pro próprio número do studio e uma IA responde com a
agenda na mão. Ver [`ASSISTENTE.md`](./ASSISTENTE.md).

**A regra: ler é direto, escrever pede o toque dela.** Consultar responde na
hora. Mudar a agenda a IA não faz — descreve o que entendeu (nome, serviço,
dia e hora por extenso, nunca o código) e manda dois botões.

Isso é sobre o modo como um LLM erra: ele não trava nem devolve erro,
acerta a forma e erra o alvo com convicção total. Com duas clientes na
quinta, "cancela a de quinta" tem metade de chance de apagar a errada, e
nada aparece na tela — quem descobre é a cliente, na porta do studio.

⚠️ **A separação de arquivos é a decisão mais importante da etapa.**
`atendente.ts` tem um teste que lê o texto do arquivo e reprova se ele
importar `mudarSituacao`, `criarAgendamento` ou `salvarBloqueio` — a trava
que garante que cliente não desmarca sozinha. O assistente precisa
justamente dessas funções; no mesmo módulo, a trava teria que ser
afrouxada, e afrouxada pras clientes junto. Quem separa é `recepcao.ts`,
pelo número de quem mandou.

E os botões `k:` da remarcação continuam indo pro atendente. Eles vêm do
número da Karol, então a regra "é a Karol → assistente" os pegaria, e a
remarcação por WhatsApp — que já funciona e foi testada com celular de
verdade — pararia de existir sem nenhum teste reclamar.

**Custo:** zero de Meta, porque a janela dela nunca fecha (ela é sempre quem
escreve primeiro). No DeepSeek, R$ 1 a 3 por mês no volume dela.

#### O calendário dizia "não atende" num dia em que ela atende

Achado no dia 07/09/2026, uma segunda: o Kainã abriu o site e viu a agenda
fechada. **A agenda não estava fechada** — o fluxo inteiro foi conferido no
ar, com horários livres em todos os dias úteis. O que estava errado era o
que o calendário DIZIA.

Segunda ela atende em Pereira Barreto, 7h às 11h. Mas o dia de hoje nunca é
agendável, porque ela pediu antecedência de um dia. O calendário tinha três
estados, e "já passou" caía no mesmo balde de "não atende" — mesma célula
cinza, mesma legenda. Abrindo numa segunda, a primeira fileira inteira
(1 a 7) aparecia morta, com a legenda afirmando que ela não trabalha
naqueles dias. Quatro deles eram dias úteis.

Agora são quatro estados. `passou` entrou separado de `cedoDemais` porque a
tela precisa dizer coisas diferentes: **"já passou"**, **"cedo demais, ela
marca a partir de amanhã"** e **"não atende"** (só domingo e a cidade errada
no dia errado). Os vencidos ganharam uma diagonal fina — é como calendário
de papel risca dia vencido.

⚠️ **O risco aqui é maior do que parece:** é a única tela em que o site fala
sobre a disponibilidade dela, e uma cliente que conclui "ela não atende"
fecha a aba sem perguntar nada a ninguém.

#### A `/sobre` reformada

Feita depois dos protótipos, com a direção A (Revista) de base e a fita e os
tijolos da direção B. Ver o cabeçalho de `app/sobre/page.tsx` — as três
coisas que estavam erradas estão escritas lá, pra não voltarem.

Resumo: as fotos aparecem **na proporção do arquivo** (a da paleta é 3:2 e
era forçada em 4:3, o que comia a paleta); a faixa de números trivial saiu e
deu lugar a onde ela está em cada dia, tirado do motor da agenda; e o ritmo
passou de "rótulo → título → parágrafo seis vezes" pra quatro andamentos
diferentes.

**A linguagem visual veio das três referências que o Kainã mandou** —
uiverse.io, 21st.dev e reactbits.dev — **reescrita em CSS na mão**. Nenhuma
biblioteca entrou: as três servem componente React que traz `framer-motion`
ou `gsap` junto, e isso são centenas de KB no celular de uma cliente pra
fazer uma palavra subir na tela. O projeto tinha quatro dependências e
continua com quatro.

#### Protótipos da `/sobre`

Duas direções publicadas como Artifact, com as fotos reais embutidas:
https://claude.ai/code/artifact/7da38244-cd6b-43d6-b701-9c0d2f77368f

O que estava errado na página de hoje, e que as duas corrigem:

- **`karol-paleta.jpg` é 1200×800 (3:2) e a página força `aspect-4/3`** — o
  corte come a paleta que ela segura na borda direita. Era a "foto cortada"
  que o Kainã viu.
- **A faixa de números** ("2 Cidades · 6 Serviços · 1 Cliente por vez") é
  número trivial vestido de conquista. É o que mais dava cara de site
  genérico. Saiu nas duas direções.
- **O ritmo**: seis seções repetindo "rótulo → título → parágrafo".

Ele mandou seguir sem escolher entre as duas. Foi pro código a A como
esqueleto, com a fita e os tijolos da B — ver acima.

### Etapa 16 — o fluxo do WhatsApp

**O código do agendamento (`8C6377`) não é coluna no banco.** São os seis
primeiros dígitos do próprio `id`, derivados em `src/lib/codigo.ts`. Uma
coluna seria segunda fonte da verdade capaz de divergir, com geração,
unicidade e migração pra manter — tudo isso pra guardar algo que já está lá.
A busca no painel usa comparação de INTERVALO no uuid (`gte`/`lte`), que
aproveita o índice da chave primária; `like` no texto do id obrigaria o
Postgres a converter linha por linha.

Seis dígitos hexadecimais dão 16,7 milhões de combinações, e a busca devolve
LISTA — se um dia colidir, a Karol vê os dois e escolhe. Hexadecimal também
resolve a ambiguidade de graça: `0-9a-f` não tem O nem I pra confundir com 0
e 1 ao ditar por telefone.

**A busca do painel aceita as três coisas que ela tem na mão** — código, nome
ou telefone — num campo só, com `method="get"`: a busca vira `?q=` na URL,
funciona sem JavaScript e o botão voltar faz o que se espera.

#### O webhook (`/api/whatsapp`)

| Cliente manda | O que acontece |
|---|---|
| o código | recebe serviço, dia, hora e cidade |
| "confirmo", "ok" | mesma resposta |
| "quero cancelar" | recibo pra ela + **aviso pra Karol**, com nome, número e código |
| "dá pra remarcar?" | idem |
| qualquer outra coisa | **nada.** Quem responde é a Karol |

⚠️ **NADA neste caminho muda a agenda.** A Karol respondeu no briefing que a
cliente não desmarca sozinha (`REGRAS.clientePodeCancelar` está `false`). Um
"responda 2 para cancelar" seria a agenda dela mudando por mensagem, sem ela
ver. Pedido vira aviso; quem decide é ela.

Isso está travado no nível do ARQUIVO, não só do comportamento: se alguém
importar `mudarSituacao` em `lib/atendente.ts`, a suíte quebra. Testes que só
olham o retorno não pegariam — provado por mutação: com o `mudarSituacao`
introduzido de propósito, 6 testes ficaram vermelhos.

#### A decisão mora fora da rota

`lib/atendente.ts` tem a lógica; a rota só cuida de assinatura, parse e
repetição. Rota não é importável, e por isso não é testável — e foi um bug de
costura entre duas partes certas que derrubou os bloqueios na etapa 11.

#### `META_APP_SECRET` não é opcional

A URL do webhook é pública por definição — a Meta precisa alcançá-la. Cada
POST vem assinado em `X-Hub-Signature-256`, e o HMAC é sobre os **bytes
crus**: a rota lê `req.text()` antes de qualquer `JSON.parse`, porque
reserializar reordena chave e a assinatura nunca mais bate. Sem o segredo no
ambiente, o webhook **recusa tudo**, de propósito.

#### A tabela `conversas`

Guarda até quando a janela de 24 h de cada número está aberta. A janela é da
PESSOA, não do agendamento — a mesma cliente pode ter três agendamentos e uma
conversa só, então a chave é o número. Migração:
`supabase/migracao-02-conversas.sql`, já aplicada no banco de produção.

#### Verificado contra o banco de verdade

Agendamento de teste inserido, cliente pediu cancelamento duas vezes pelo
webhook, e depois: `situacao` seguia `confirmado` e `atualizado_em =
criado_em` — a linha nunca foi tocada. A janela abriu com 24 h e a última
mensagem ficou gravada. Teste apagado no fim; as três tabelas voltaram a zero.

**De brinde:** o cabeçalho do painel estourava a largura no celular — cinco
itens numa linha sem `flex-wrap`, e o "Sair" ficava pendurado fora da faixa
branca. As seis telas do painel agora fecham em 390 px sem rolagem lateral.

### Etapa 15 — a página da Karol e as fotos

**`/sobre` existe porque o site inteiro mostrava o trabalho dela e nunca
mostrava ela.** É a página que a Karol vai abrir pra decidir se fecha o
contrato, e por isso tudo que está escrito lá saiu da boca dela: a
auto-apresentação (`NEGOCIO.frase`, que estava no `data/` desde o briefing e
nunca tinha aparecido no site) e as duas citações dos reels. **Não invente
biografia nessa página** — ano em que começou, quantas alunas já formou,
cidade natal. Pergunte a ela.

Chega por três caminhos: menu ("A Karol", primeiro item), a chamada na home
entre a citação e o "Como funciona", e o rodapé.

**As fotos que trocaram de lugar:**

| Onde | Antes | Agora | Por quê |
|---|---|---|---|
| Cartão do curso | `karol-paleta` | `aluna-01` | a Karol pediu: a foto é dela, não do serviço — e a do curso tinha que mostrar o certificado |
| Abertura do trabalho | `antes-depois` | `trab-21` | a antiga tinha **"MADE WITH SPLIT PIC"** carimbado no canto |
| `/sobre` e chamada na home | — | `karol-paleta` | é onde a foto dela faz sentido |
| `/sobre` (abertura) | — | `FOTOS.capaReserva` | a capa que ela **não** escolheu, amarrada ao `CAPA` de `data/fotos.ts` — trocar a escolha dela troca as duas de lugar sozinho |

**A marca d'água estava queimada no original** baixado do Instagram: não havia
versão limpa. `antes-depois.jpg` foi regerada cortando 7,7% da altura, o que
leva a marca embora e mantém os dois rostos. Por isso a altura declarada caiu
de 1146 para 1058 — se alguém regerar essa foto do original, o carimbo volta.

**Rastros removidos:** `serv-curso.jpg` (bytes idênticos a `aluna-01.jpg` — o
script `fotos2.py` gerou as duas do mesmo original `47.jpg`) e
`karol-retrato.jpg` (declarado em `FOTOS`, usado em lugar nenhum, e o nome
mentia: era sobrancelha de cliente, não retrato dela).

**Rolagem lateral no celular, de brinde.** A foto de abertura tem
`scale(1.055)` no respiro, e transform que passa da borda faz a **página**
rolar de lado — dava pra arrastar o site uns pixels. Um `overflow-hidden` no
contêiner da foto resolve. Vale a regra: toda animação de `scale` em imagem de
largura total precisa de contêiner que corte.

### Etapa 11 — o que foi corrigido

**O bloqueio de dia inteiro não bloqueava nada.** `ocupadosNoPeriodo` achatava
o período com `getHours()` nas duas pontas. Um dia fechado é gravado como
`[dia 00:00, dia seguinte 00:00)` — as duas pontas caem à meia-noite e viravam
`{inicio: 0, fim: 0}`, um intervalo vazio, que não colide com nada. Feriado e
férias iam pro banco e a agenda os ignorava. Junto disso, a chave do dia saía só
do início do período: férias de uma semana marcavam apenas o primeiro dia.
`fatiarPorDia()` recorta o período em fatias de um dia e trata a meia-noite que
*fecha* o dia como 1440.

Os testes não pegaram porque `bloqueios.test.ts` cobria só a escrita e
`agenda.test.ts` só o cálculo — **ninguém testava a costura**, que era onde
estava o furo. É o padrão a vigiar aqui: as unidades estavam certas, a junção não.

**Freio por IP** — ver 8.4.

**Duplicações:** `Intl.DateTimeFormat` aparecia 9x em 5 arquivos (`FORMATA_DIA`
e `FORMATA_HORA` idênticos em três) → `lib/datas.ts`. A frase "Segunda a sexta"
era calculada duas vezes com duas listas de nomes de dia → `faixaDeDias`/
`janelaDaCidade` no motor. `AcoesAgendamento` redeclarava o tipo de situação à
mão. `Abertura.tsx` importava `@/data/negocio` em duas linhas. Nomes de cidade
chumbados em `agendar/page.tsx`. `error.tsx` montava o `wa.me` à mão.
`linkAgendar()` nunca foi chamado.

**Mobile** — o site é feito pra celular e tinha buracos justamente lá:
`/painel/notificacoes` era **inalcançável no telefone** (o único link pra ela
era `hidden sm:inline`, e é do celular que a Karol usa o painel); o esqueleto de
`/agendar` reservava espaço pra barra fixa sem desenhá-la, então ela pulava pra
tela; o 404 era a única página sem a barra; o botão do menu tinha 40px e o de
agendar 42px; e rolar com o menu aberto movia a página atrás dele.

**Rastros:** os 5 SVGs do `create-next-app` (não referenciados), `briefing/`
(script de uso único, já cumprido — fica no histórico). `ferramentas/` **fica**:
é ferramenta viva, documentada aqui. O domínio estava chumbado em três arquivos
→ `SITE_URL`, com `NEXT_PUBLIC_SITE_URL`. `data-surge` era o único
identificador em inglês do projeto → `data-revelando`.

---

### Etapa 18 — 09 a 11/09/2026: sinal, mensagens e o que estava quebrado

**O que quebrava sem ninguém ver:**
- A **espera entre telas** reaparecia e travava ao usar o botão VOLTAR do
  navegador (defeito introduzido ao calar um aviso do lint). Voltou a ser
  efeito, com rede de segurança de 12 s. Conferido no navegador.
- O **assistente** respondia "vou confirmar" sem chamar a ferramenta —
  nada acontecia — e mandava "sexta" pro próprio dia numa sexta. O roteiro
  foi reescrito com o jeito dela de falar e os próximos 14 dias prontos.
  Conferido contra o DeepSeek de verdade: 8 de 8 na primeira etapa, 4 de 4
  na segunda.
- A **mensagem livre de cliente** no número da API era ignorada, e ninguém
  lia (o chip não tem caixa de entrada). Agora a primeira de cada conversa,
  e o botão "Falar com a Karol", recebem o WhatsApp pessoal dela.
- O site não mandava **nenhum cabeçalho de segurança**. Agora manda seis.

**O painel redesenhado (11/09):** um menu só nas três telas, faixa de
resumo no topo (próxima cliente, hoje, 7 dias, sinais a conferir), caixa
"Aguardando o sinal" com Confirmar/Recusar, cartão com a hora numa coluna
própria, "Hoje/Amanhã" nos dias e uma linha marcando o agora. Feito por um
agente numa cópia separada, a partir do código real das bibliotecas do
uiverse.io, reactbits.dev e 21st.dev. Na revisão saíram três coisas: a
conta do sinal duplicada (virou `sinalPorValor`, uma só), uma frase que
prometia confirmação automática no WhatsApp que nem sempre é verdade, e o
telefone da cliente com 20 px de toque.

⚠️ A caixa "Aguardando o sinal" só foi vista com dados de mentira — não
há reserva real esperando sinal ainda. Vale olhar na primeira de R$ 80 ou
mais.

**O que entrou:** o sinal inteiro (seção 6.5); todas as mensagens
reescritas; o vidro no cabeçalho e no rodapé; as legendas do agendamento
(o sinal no resumo antes de confirmar, a legenda do calendário, "Setembro
De", "1 1:15"); a política de privacidade de acordo com a LGPD, incluindo
a transferência de dado de cliente pra DeepSeek, na China.

**O que se descobriu no banco (só leitura):** as migrações 04 e 05 **já
estão aplicadas** (foram à mão, por isso não aparecem na lista de
migrações). E há uma reserva de "Design de sobrancelha" parada em
`pendente` desde 08/09 — sobra da época em que tudo entrava pendente. Um
serviço de R$ 25 não pede sinal; ela precisa ser confirmada ou cancelada à
mão no painel.

**O que não deu pra saber:** o que aconteceu com a mensagem de teste pro
marido dela. O log da Vercel daquele dia já passou do que o plano gratuito
guarda.

---

## 8. O que falta

> Atualizado em 11/09/2026. A etapa 18 (seção 7) diz o que mudou.
> **Leia esta seção inteira antes de mexer em qualquer coisa.**

### 8.1 ⚠️ A ARMADILHA MAIS PERIGOSA DO PROJETO

**`KAROL_WHATSAPP` está preenchida na Vercel com o número do Kainã
(`5516991557552`).**

Enquanto ela existir, **a Karol NÃO recebe aviso de agendamento nenhum** —
tudo cai no telefone dele. Foi assim que o fluxo inteiro foi testado sem
incomodar ela, e está certo pro momento do teste.

**Apague essa variável na Vercel antes de a Karol usar o site.** Sem ela, o
código volta sozinho pro número real (`NEGOCIO.whatsapp.numero`).

O aviso do desvio fica em `/painel/notificacoes`, dentro do bloco
técnico fechado — e essa página **saiu do menu da Karol** em 11/09 (ela não
é pra ela). Só se chega pelo endereço. Por isso está aqui também.

### 8.2 Templates da Meta — o único bloqueio real que sobrou

> **11/09/2026: agora são QUATRO.** Entrou o `pedido_sinal`, pra quem deve
> o sinal, e os botões dos templates passaram a mandar *payload* — **a
> ordem dos botões cadastrados na Meta tem que bater com a do código**.
> Tudo em `TEMPLATES-WHATSAPP.md`, pronto pra colar.

Hoje as mensagens automáticas **só chegam se a cliente tiver escrito nas
últimas 24 h**. Fora dessa janela a Meta recusa com `131047`, e é esperado.

Na prática isso significa que **a confirmação do agendamento não chega** pra
quem acabou de marcar pelo site e nunca falou com o número.

A saída é template aprovado. Os três textos estão escritos campo a campo em
[`TEMPLATES-WHATSAPP.md`](./TEMPLATES-WHATSAPP.md), prontos pra colar. Falta
alguém criar na Meta e esperar a aprovação (minutos a horas).

Quando os três estiverem aprovados, falta escrever no código o disparo de
template — hoje `enviarEvento` só manda texto livre e interativo.

| Template | Pra quê |
|---|---|
| `confirmacao_agendamento` | a mensagem que abre a janela de 24 h |
| `lembrete_vespera` | cai fora da janela quase sempre |
| `aviso_karol_novo_agendamento` | a janela da Karol vive fechada |

### 8.3 Aviso 30 minutos antes — construído, falta ligar o cron

**Feito na etapa 18.** O que falta é infraestrutura, não código.

O plano Hobby da Vercel só roda cron **1×/dia**, e um aviso de 30 min antes
precisa de alguém batendo no endpoint a cada 10–15 minutos. O Kainã escolheu
o cron externo (R$ 0) em vez do Vercel Pro.

**Como ligar**, em cron-job.org (ou qualquer serviço parecido):

| Campo | Valor |
|---|---|
| URL | `https://karol-zeta.vercel.app/api/lembretes?tipo=curto` |
| Intervalo | a cada 10 minutos |
| Cabeçalho | `Authorization: Bearer <CRON_SECRET>` |

⚠️ **O `?tipo=curto` não é opcional.** Sem ele o cron roda também a varredura
da véspera, e cada cliente com horário amanhã receberia o lembrete umas 140
vezes ao longo do dia.

O cron diário da Vercel continua como está, batendo em `/api/lembretes` sem
parâmetro — ele é quem manda o lembrete da véspera e o agradecimento.

⚠️ **Precisa da migração 04** (`avisado_30min_em`). Sem ela a coluna não
existe, a marcação de "já avisei" falha, e o lembrete simplesmente não sai.

⚠️ **E provavelmente precisa de um quarto template na Meta.** Trinta minutos
antes do horário a janela de 24 h da cliente está fechada — ela marcou dias
atrás. Existe um atalho: se o lembrete da véspera for template com botão e
ela tocar, a janela abre e cobre o horário do dia seguinte inteiro. Aí o de
30 min sai como texto livre, de graça.

### 8.4 Pendências de negócio (dependem da Karol)

**Todas as marcadas com 📋 estão no formulário 3**
([`briefing/criar-formulario-3.gs`](./briefing/criar-formulario-3.gs)).

⚠️ **O briefing 2 foi mandado e nunca respondido.** Ele tinha 12 seções,
prometia 10 minutos e pedia decisão em quase todas — inclusive sobre
dinheiro. O 3 foi escrito contra esse motivo: uma página só, 7 perguntas
quase todas de um toque, **nada obrigatório**, e toda pergunta com saída
("escolhe você" é resposta válida). A do sinal vem primeiro de propósito —
se ela responder só aquela e fechar, já valeu.

O script imprime, junto com o link, **a mensagem pronta pra colar no
WhatsApp dela**. Isso não é enfeite: link seco de formulário, sem dizer o
tamanho nem o que acontece depois, é o que faz virar "amanhã eu respondo"
pra sempre.

| Pendência | Onde | Impacto |
|---|---|---|
| 📋 **O que ela quis dizer com "sinal"** | `REGRAS.sinal` | ver seção 3 — divergência aberta. **Não construa pagamento antes disto** |
| 📋 **Aprovação manual** | `REGRAS.aprovacaoManual = false` | ela pediu, está desligado. Colide com o sinal |
| 📋 **Descrições dos serviços** | `servicos.ts` | são rascunho meu; precisam do aval dela |
| 📋 **Qual capa** | `CAPA` em `fotos.ts` | branca ou laranja. A que ela NÃO escolher fica na `/sobre` |
| 📋 **Local em Bandeirantes** | `CIDADES.bandeirantes.local` | publica só a cidade até ela passar |
| **Verificação da empresa na Meta** | — | pede CNPJ, ela não tem. Sem isso o WhatsApp mostra o número em vez de "Studio Karol Carvalho". O caminho real seria abrir MEI |
| **Autorização foto a foto** | `public/fotos/` | são rostos de clientes reais. **Não cabe em formulário** — é olhar foto por foto com ela |
| 📋 **O lembrete de 30 min** | `NOTIFICACOES.lembrete30MinAntes` | ela disse NÃO pra "lembrete de horas antes" no briefing 1; este é outro e está ligado |
| 📋 **O assistente no WhatsApp** | `ASSISTENTE.md` | é uma IA lendo a agenda dela. Ela tem que saber antes de ligar, não depois |

### 8.5 Técnico pendente

- **Ela ABRIR um dia** em que normalmente não atende (inverso do bloqueio).
  Mexe no motor, que hoje deriva o expediente de `EXPEDIENTE` e não tem
  conceito de exceção pra mais.
- **Vídeos** dela no site (pedido antigo, nunca feito).
- Freio por IP sério (Upstash ou o próprio Supabase) se virar problema. O
  atual é `Map` em memória — some no deploy e não é compartilhado.

### 8.7 O que falta apertar fora do repositório

Tudo abaixo é **código pronto que não funciona até alguém apertar um botão
fora do repositório.** Nenhuma dessas coisas quebra nada enquanto estiver
pendente — o site continua no ar e nada dá erro. Elas só não acontecem.

| O quê | Onde | Sem isso |
|---|---|---|
| Rodar `migracao-04-lembrete-30min.sql` | SQL Editor do Supabase | o lembrete de 30 min não sai |
| Rodar `migracao-05-assistente.sql` | SQL Editor do Supabase | o assistente da Karol não guarda nada e não responde |
| `DEEPSEEK_API_KEY` na Vercel | Environment Variables | o assistente se cala e responde com o link do painel |
| Cron externo de 10 min | cron-job.org | ver 8.3 |
| Os 3 templates da Meta | WhatsApp Manager | ver 8.2. O código de envio JÁ EXISTE e cai neles sozinho quando a Meta recusa com `131047` |
| **Confirmar o horário de domingo** | com a Karol | o código chutou 8h–18h a partir de "o dia todo" |
| **Confirmar o fim da noite** | com a Karol | formulário diz 22h, áudio disse 23h. Está 22h |

Depois de qualquer variável nova: **redeploy**. Variável só vale no build
seguinte — isso já mordeu duas vezes neste projeto.

### 8.6 Revisão de segurança

Verificado e bom:

- Nenhum segredo no código ou no histórico; tudo por env var
- `.gitignore` bloqueia `.env*`; conferido que `.env.local` está fora do Git
- Sessão: HMAC-SHA256, comparação em tempo constante, cookie com as flags
- Toda Server Action reconfere `sessaoAtiva()` — o proxy não é fronteira
- RLS ligado nas quatro tabelas, com ZERO policies (só a chave de serviço passa)
- IDs validados por regex antes de ir ao banco
- **Webhook da Meta**: assinatura HMAC conferida sobre os bytes crus, em tempo
  constante, e **falha fechado** sem `META_APP_SECRET`. Coberto por teste,
  inclusive o caso do corpo adulterado depois de assinado.

Aberto:

1. **`/agendar/confirmado?ag=<id>`** mostra nome e detalhes sem sessão,
   protegido só pelo UUID. É o padrão de página de confirmação, mas o link
   vaza por histórico. Não expõe o WhatsApp da cliente.
2. **O token da Meta apareceu num print** que o Kainã mandou em 06/09/2026.
   Ficou recomendado regenerar antes de produção; **não confirmado se foi
   feito**.

---

## 9. Como o dono do projeto trabalha

Observado ao longo da construção. Poupa retrabalho:

- **Ele quer estudo antes de código.** Já rejeitou entrega feita "saindo
  fazendo". Planeje, mostre o plano, depois construa.
- **Ele revisa visual com olho fino** e aponta desalinhamento, foto repetida,
  texto esquisito. Vale conferir a própria tela antes de entregar.
- **Ele valoriza honestidade sobre limite.** Dizer "não consigo por causa de X"
  funciona melhor do que entregar meia-boca sem avisar.
- **Ele trabalha em vários notebooks.** Commite em etapas e faça push sempre;
  o que não está no GitHub se perde.
- **Português em tudo** — código, comentários, commits, documentação.

---

## 10. O que se perde se a máquina for formatada

**Nada se perde.** Tudo que importa está no GitHub.

| Item | Situação |
|---|---|
| Código, documentação, schema do banco | ✅ no GitHub |
| Fotos processadas (`public/fotos/`, 37) | ✅ no GitHub |
| Originais em alta (`ferramentas/originais/`, 50) | ✅ no GitHub desde `393fbbf` |
| `.env.local` | ⚠️ existe só nesta máquina (fora do git, de propósito) — tem a chave do DeepSeek e a senha do painel. Numa máquina nova, copie as variáveis da Vercel |
| Protótipos e documentos de briefing | ✅ Artifacts na claude.ai (links na seção 4) |
| Formulário de briefing | ✅ no Google Forms da conta dele |

Para retomar em máquina nova:

```bash
git clone https://github.com/Kanexxxxx/Karol.git
cd Karol
npm install
npm run dev
```

O site institucional sobe sem configuração nenhuma. Para a agenda e o painel,
ver seção 8.1.
