# Contexto: o negócio, a cliente e as decisões

Por que o projeto existe, para quem, e o que cada pessoa já decidiu. Leia
antes de mudar texto, regra de negócio ou visual — quase tudo aqui foi
pedido ou vetado por alguém.

---

## O acordo

O **Kainã** (`Kanexxxxx`) ofereceu à **Karol** um site personalizado:

> "O site fica 1 mês de teste pra você ver se gosta e se realmente vai ser
> útil. Depois, se quiser continuar, a gente combina certinho."

Ele também prometeu **automação de WhatsApp**: aviso pra cliente quando
agenda, lembrete antes do horário e aviso pra Karol a cada agendamento. Não
há contrato, valor nem prazo formal. Em 07/09/2026 ela deu nota **10 de
10** e disse que "ainda está decidindo" se continua depois do teste.

---

## Quem é a cliente

**Karol Carvalho Nunes** — maquiadora e designer de sobrancelhas.

| Conta | Seguidores | Papel |
|---|---|---|
| `@studio_karol_carvalho_` | ~744 | o negócio: antes/depois, serviços |
| `@karolcarvalhomakeup_` | ~4.288 | ela: rotina, autocuidado — **é onde está a audiência** |

- **Atende em duas cidades.** O horário livre depende de onde ela está
  naquele dia — é o fato que mais pesa no software (`lib/agenda.ts`).
- **Posicionamento:** não vende sobrancelha, vende autoestima. *"Nem de
  humanas, nem de exatas. Eu sou da autoestima."*
- **Tem público masculino.** O site não pode ser cor-de-rosa a ponto de
  espantar esse público.
- **A dor real:** a pergunta nº 1 das clientes é *"o valor e os horários
  disponíveis"*. Preço aberto no site resolve metade sozinho.
- **Não tem CNPJ nem MEI.** Isso trava a verificação da empresa na Meta.

---

## Serviços e agenda

Valores dela (briefing de 29/08/2026). **O vigente está em
`src/data/servicos.ts`** — se divergir, vale o código.

| Serviço | Preço | Duração | Pede entrada? |
|---|---|---|---|
| Design de sobrancelha | R$ 25 | 30–40 min | não |
| Design com henna | R$ 30 | 40–60 min | não |
| Design masculino | R$ 25 | 30–40 min | não |
| Brow lamination | R$ 80 | 60–90 min | **sim** |
| Maquiagem social | R$ 100 | 40–60 min | **sim** |
| Curso de automaquiagem | R$ 120 | 2 h, 1 aluna | fora do `/agendar` |

A agenda reserva a duração **máxima + 10 min** de intervalo. O curso
aparece no site mas não é agendável: são 130 min numa manhã de 240, e a
conversa começa no WhatsApp dela.

| Dia | Cidade | Horário |
|---|---|---|
| Segunda a sexta | Pereira Barreto | 7h–11h e 18h30–22h |
| Sábado | Bandeirantes D'Oeste | 11h–22h |
| Domingo | Pereira Barreto | 7h–11h e 18h30–22h |

Uma cliente por vez, sem pausa de almoço, **agendamento só a partir do dia
seguinte**. Fonte: `EXPEDIENTE` em `src/data/negocio.ts`.

---

## O que ela decidiu

Do briefing (29/08), do formulário final (07/09) e de mensagens
posteriores. Palavras dela entre aspas.

| Assunto | Decisão |
|---|---|
| Preços no site | mostrar **todos** |
| Aprovação | "pode valer na hora e eu só recebo o aviso" |
| Mensagens pra cliente | confirmação na hora · lembrete 1 dia antes · agradecimento depois |
| **Não quis** | lembrete de horas antes · aviso automático de endereço |
| Cancelamento | a cliente **não** desmarca sozinha — tem que falar com ela |
| Entrada | **50%**, só em serviços de **R$ 80 ou mais**, "não volta — é justamente pra ela não desmarcar" |
| Prazo pra pagar | "pode ser 30 minutos" (13/09) |
| Pagamento | "por pix diretamente pra mim" — **sem gateway** |
| Visual | dourado e bege, clean, **sem cores escuras** (por isso não há modo escuro) |
| Endereços | Pereira: Rua Atlântico, 884 · Bandeirantes: Rua 2 de Fevereiro, 274 |

A pergunta "se pudesse resolver UMA coisa do atendimento" teve como
resposta *"a questão do agendamento com sinal"* — e ela relatou 1 a 2
desmarques em cima da hora por semana. É a origem da entrada por PIX.

Copy dela, usada no site: *"Trabalho na área da maquiagem social, faço
sobrancelhas femininas e masculinas e também ministro cursos de
automaquiagem."* O "antes de vir" (*sem maquiagem, no máximo 1
acompanhante*) vai na confirmação, **não** na home.

---

## O que o Kainã decidiu

| Decisão | Data |
|---|---|
| **Nenhum rosto de cliente no site.** Consentimento verbal não sustenta 38 rostos de terceiros num site público. Ficaram só fotos da Karol e texturas | 18/09 |
| Nada chega no WhatsApp da Karol por agendamento que tenha o número dela (exceto o aviso de agendamento novo) | 18/09 |
| Erros técnicos vão pro WhatsApp dele (`TECNICO_WHATSAPP`), nunca pra Karol | 16/09 |
| A cliente lê **"entrada"**; a Karol continua lendo "sinal" (palavra dela) | 12/09 |
| Sem teto de horários por telefone ("está limitando"); o prazo de 30 min basta | 13/09 |
| Sem motor de "abrir um dia excepcional": mudar horário é editar `EXPEDIENTE` | 13/09 |
| A IA lê a agenda direto, mas **só escreve depois do toque da Karol** | 07/09 |

---

## Design

Nove protótipos vieram antes do código, publicados como Artifacts. **Se a
Karol pedir mudança visual, comece daqui.**

| | Link |
|---|---|
| Briefing + análise dos perfis | https://claude.ai/code/artifact/9ae94bae-f6d0-4890-b172-6474e7f94968 |
| Arquitetura + 4 primeiras direções | https://claude.ai/code/artifact/74b09ab5-e0d9-4739-9a5f-9c84efff7a02 |
| A · Prova | https://claude.ai/code/artifact/99f36529-c2fd-4099-954b-a09d1645e843 |
| B · Revista | https://claude.ai/code/artifact/d7a4dd87-244a-4129-80ef-8395735708cf |
| C · Balcão | https://claude.ai/code/artifact/1002dbf3-9f2a-47c4-8f64-02d7e79a4e7a |
| D · Vitrine | https://claude.ai/code/artifact/5aa1499a-0392-4e35-a233-b587f3bd8600 |
| E · Capa | https://claude.ai/code/artifact/14b1ebaa-95c3-46a0-a64b-d6adaa09c6a9 |
| F · Ateliê | https://claude.ai/code/artifact/47bf6524-dc0c-443f-becf-6f106fd731c5 |
| G · Feed | https://claude.ai/code/artifact/53615b1d-0352-4f62-87f6-035669ae8ec0 |
| H · Boutique | https://claude.ai/code/artifact/4a1a7bd5-f0f0-49b3-a461-a6ac15bb055b |
| **I · H no celular + F no computador — a que virou o código** | https://claude.ai/code/artifact/3c7a7716-8fc0-4eda-b78b-05d85d87f994 |
| Protótipos da `/sobre` | https://claude.ai/code/artifact/7da38244-cd6b-43d6-b701-9c0d2f77368f |

Desde 18/09 a home segue o layout sem fotos de cliente (texturas geradas
por IA, decorativas — **nunca** "resultado" de atendimento falso).

**Não reintroduza:**

- "Como funciona" citando WhatsApp — o agendamento é no site.
- "Antes de vir" na home — fica na confirmação.
- Tipografia cobrindo o rosto da Karol — o rosto fica sempre livre.
- Faixa de números trivial ("2 cidades · 6 serviços") — dá cara de site genérico.
- Biografia inventada na `/sobre` (ano, nº de alunas, cidade natal). Pergunte a ela.
- Biblioteca de animação (`framer-motion`, `gsap`): as referências
  (uiverse.io, 21st.dev, reactbits.dev) foram reescritas em CSS à mão.
- Animação de `scale` em imagem de largura total sem contêiner com
  `overflow-hidden` — causa rolagem lateral no celular.

---

## Fotos e privacidade

- Só entram fotos da **Karol** (`karol-capa`, `karol-capa-laranja`,
  `karol-paleta`, `instagram`) e texturas. `sem-rosto-de-cliente.test.ts`
  fica vermelho se outra pessoa aparecer.
- Foto de cliente só com **autorização escrita daquela pessoa**, guardada
  fora do código, e acrescentada na lista do teste com nome e data.
- As fotos antigas de clientes (e certificados de alunas) **continuam no
  histórico do git**. Por isso o repositório é privado desde 16/09/2026.
  Reescrever o histórico foi considerado e descartado.
- A política de privacidade (`/privacidade`) cobre a LGPD, incluindo a
  transferência de dados pra DeepSeek (China), usada pelo assistente.
