# Histórico

A linha do tempo do projeto, em ordem. O detalhe de cada mudança — o que
deu errado, o que se mediu, o que se descartou — está na **mensagem do
commit**: `git show <hash>`.

As lições que saíram daqui estão em [`incidentes.md`](./incidentes.md); as
decisões de negócio, em [`contexto.md`](./contexto.md).

> [!NOTE]
> O antigo `PROGRESSO.md` numerava as etapas em duas séries que se
> repetiam (havia duas "etapa 18", duas "19", duas "20"). Aqui vale a
> **data**. Para ler o texto antigo: `git show 0554d91:PROGRESSO.md`.

---

## Agosto de 2026

| Data | Marco | Commit |
|---|---|---|
| 29/08 | scaffold do site; briefing respondido pela Karol (Google Forms) | `b9f1fee` |

## Setembro de 2026

### 03 a 05/09 — o site e a agenda

| Data | Marco | Commit |
|---|---|---|
| 03/09 | home com acervo de fotos; agenda gravando no Supabase | `fa55dfa` `2871dd4` |
| 03/09 | painel com login, bloqueios, notificações via webhook, LGPD, anti-spam, 64 testes | `d6f1fae` … `76ab134` |
| 04/09 | nomes das alunas apagados dos certificados nas fotos | `d3450ab` |
| 05/09 | fuso resolvido no código (a Vercel reserva `TZ`); bloqueio de dia inteiro consertado | `01f036d` `de25ca1` |

### 06 e 07/09 — o WhatsApp de verdade e o assistente

| Data | Marco | Commit |
|---|---|---|
| 06/09 | Cloud API da Meta funcionando: envia, recebe, responde; número sempre com DDI | `b657edc` |
| 06/09 | remarcação dentro do WhatsApp (conversa com memória); painel passa a avisar a cliente | `7b65faf` `0342461` |
| 07/09 | **assistente da Karol** (IA com a agenda, só escreve depois do toque) | `099ad71` |
| 07/09 | esqueletos de carregamento; calendário com 4 estados; `/sobre` refeita | `866eac2` `0b7f338` `d002eeb` |
### 08 a 13/09 — entrada por PIX, templates e a bancada

| Data | Marco | Commit |
|---|---|---|
| 08/09 | respostas do formulário final (07/09) aplicadas: entrada de 50%, endereços, história | `f349947` |
| 08/09 | turnos múltiplos por dia; envio de template quando a janela está fechada | `5bef9bf` `4f7a34f` |
| 09/09 | **resgate:** o projeto chegou sem compilar e com a chave PIX nula | `1d87cec` |
| 09/09 | PIX com valor dentro do QR, QR escrito à mão | `55a2247` |
| 11/09 | mensagens reescritas; PIX sai sozinho pra cliente; cabeçalhos de segurança; painel redesenhado | `0a5a981` `c457e34` `3661727` |
| 12/09 | "sinal" vira "entrada" pra cliente; domingo com os turnos da semana; 8 templates (hoje 7) | `4680a1d` `c8259e8` `ae03d64` |
| 13/09 | bancada de provas do assistente contra o modelo real; `deepseek-chat` = `deepseek-flash` | `0b9f2a8` `8f39c43` |
| 13/09 | lembrete de 30 min **arrancado** (a Karol nunca pediu) | `b33dfc7` |
| 13/09 | entrada vence em **30 min** (decisão da Karol); sem gateway de pagamento | `28c9951` |
| 13/09 | achado: nenhuma cliente recebia a confirmação → janela consultada antes de enviar | `002287d` |
| 13/09 | `max_tokens` emudecia o assistente | `696d9f5` |

### 16 a 18/09 — entrega

| Data | Marco | Commit |
|---|---|---|
| 16/09 | erros técnicos vão pro WhatsApp do Kainã; PIX recusado pelo `txid` consertado | `6b4dfa5` `1e6578c` |
| 16/09 | **entrega:** chave PIX da Karol, sem aviso técnico na tela dela | `9fe2f88` |
| 16/09 | faxina: fotos originais fora do git, **repositório privado**, README reescrito | `8f48e9c` |
| 17/09 | grade só em hora cheia; rascunho do agendamento sobrevive ao F5 | `24e1c59` `ed320cc` |
| 17/09 | cópia reserva na VPS, fechada em `127.0.0.1`; auditoria da máquina | `1a3b2b1` `da43859` |
| 18/09 | **incidente das 97 mensagens** e as guardas contra o laço | `6ea7171` `336d4cf` `ddf0a60` |
| 18/09 | **fora os 38 rostos de cliente**: o site passa a viver de textura | `6860ae2` |
| 18/09 | `.dockerignore` impede o `.env` de entrar na imagem | `522cb93` |

### 20 e 21/09 — auditoria final

| Data | Marco | Commit |
|---|---|---|
| 20/09 | guarda do laço cobre também o técnico; acessibilidade e alvos de toque | `430ffdd` `d210fe5` `8618570` |
| 21/09 | vídeo do topo sem pôster nem botão | `0554d91` |

## Outubro de 2026

| Data | Marco |
|---|---|
| 30/10 | documentação reorganizada em `docs/`; scripts de fotos de cliente removidos |
