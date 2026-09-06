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

Última atualização: **2026-09-06**

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
| **Painel da Karol** | ✅ agenda, busca por código/nome/telefone, bloqueios, marcar, remarcar, relatório |
| **WhatsApp** | ✅ envia pela Cloud API e **recebe** em `/api/whatsapp` · ⛔ faltam as 4 variáveis na Vercel |
| **Deploy** | ✅ Vercel, `karol-zeta.vercel.app` (provisório, 1 mês de teste) |
| **Build / testes** | ✅ `npm run build` limpo · ✅ **178 testes** passando |

**O caminho crítico já foi andado:** Supabase criado, variáveis preenchidas,
deploy feito. Pro WhatsApp automático ficar de pé falta só configurar na
Vercel: `META_TOKEN` e `META_PHONE_NUMBER_ID` (enviar) e `META_VERIFY_TOKEN`
e `META_APP_SECRET` (receber). Passo a passo em [`WHATSAPP.md`](./WHATSAPP.md),
seções 5 e 6.

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

### 6.5 Agendamento com sinal — planejado, não construído

O fluxo pedido (paga → agenda → Karol aprova → confirma, com endereço) está
analisado em [`PLANO-PAGAMENTO.md`](./PLANO-PAGAMENTO.md): o que muda nos
estados, por que a trava anti-conflito precisa expirar, qual provedor dá pra
usar sem CNPJ e o que depende de decisão dela.

**Nada disso existe no código.** `REGRAS.sinal.ativo` segue `false`.

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

## 8. O que falta

### 8.1 Bloqueantes para o site existir de verdade

Nenhum é código.

1. **Criar o projeto no Supabase** e rodar `supabase/schema.sql` uma vez no SQL
   Editor.
2. **Preencher as variáveis** — copiar `.env.example` para `.env.local`
   (ver tabela no README). Sem elas o site institucional funciona, mas
   `/agendar` mostra "a agenda online está sendo ligada" e `/painel` explica o
   que falta configurar.
3. **Deploy na Vercel** — importar o repositório e configurar as variáveis.
   **Não tente definir `TZ`**: o nome é reservado lá e a Vercel recusa. O fuso
   está resolvido no código — ver 6.3.

### 8.2 Pendências de negócio (dependem da Karol)

Marcadas `A_CONFIRMAR` no código.

| Pendência | Onde | Impacto |
|---|---|---|
| ~~Domingo~~ | — | **fechada:** ela não atende. `DOMINGO_PENDENTE` era código morto e saiu |
| ~~Endereço em Bandeirantes~~ | `CIDADES.bandeirantes.local = null` | **fechada:** publicar só a cidade; o local entra quando ela passar |
| **O que ela quis dizer com "sinal"** | `REGRAS.sinal` | ver seção 3 — divergência aberta |
| **Aprovação manual** | `REGRAS.aprovacaoManual = false` | ela pediu, mas está desligado. Colide com o sinal: se a cliente paga e a Karol recusa, alguém estorna. Recomendação registrada: deixar o sinal fazer o filtro e oferecer o botão de aprovação manual no painel |
| **Descrições dos serviços** | `servicos.ts` | são rascunho; precisam do aval dela |
| **Qual serviço ela mais quer vender** | — | ficou em branco no formulário |
| **Autorização foto a foto** | `public/fotos/` | são rostos de clientes reais |

### 8.3 Técnico pendente

- **Vídeos** dela no site (pedido dele, nunca feito)
- **Pix de sinal** — depende de resolver a divergência acima
- Freio por IP sério (Upstash Ratelimit ou o próprio Supabase) se virar problema
- Teste de integração do fluxo completo de agendamento

### 8.4 Revisão de segurança — parcial

Foi iniciada e **não terminada**. O que já foi verificado e está bom:

- Nenhum segredo no código ou no histórico; tudo por env var, sem fallback fixo
- `.env.example` com valores vazios; `.gitignore` bloqueia `.env*`
- Sessão: HMAC-SHA256, comparação em tempo constante, flags de cookie corretas
- Toda Server Action reconfere `sessaoAtiva()` — o proxy não é tratado como
  fronteira de segurança
- As três páginas do painel também conferem
- IDs validados por regex antes de ir ao banco

Dois pontos levantados e **não avaliados até o fim**:

1. **`/agendar/confirmado?ag=<id>`** mostra nome e detalhes sem sessão,
   protegido só pelo UUID aleatório. É o padrão de página de confirmação, mas o
   link vaza por histórico e prévia de link. Não expõe o WhatsApp da cliente.
2. ~~**Freio por IP** lê o *primeiro* valor de `x-forwarded-for`~~ —
   **corrigido na Etapa 11.** `ipDoPedido()` usa `x-real-ip` e, na falta
   dele, o último item da cadeia. Coberto por teste.

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
| `.env.local` | não existe — nunca foi configurado |
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
