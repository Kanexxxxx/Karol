# Estado atual

O que está no ar, o que falta e quem decide. **Este é o único lugar com
pendências** — quando resolver uma, apague a linha daqui e registre a
decisão em [`contexto.md`](./contexto.md) ou o conserto em
[`incidentes.md`](./incidentes.md).

**Revisado em 30/10/2026**, contra o código do commit `0554d91`
(21/09/2026). O que depende de painel externo (Vercel, Meta, VPS) está
marcado como **conferir**: não dá pra ver pelo repositório.

---

## No ar

| Parte | Estado |
|---|---|
| Site institucional | ✅ `karol-zeta.vercel.app` — sem foto de cliente desde 18/09 |
| Agenda online | ✅ Supabase, com entrada por PIX (50%, ≥ R$ 80, vence em 30 min) |
| Painel da Karol | ✅ agenda, busca, bloqueios, agendamento na mão, relatório |
| WhatsApp (Cloud API) | ✅ envia, recebe, remarca; 7 templates aprovados |
| Assistente da Karol | ✅ DeepSeek, com OpenAI de reserva |
| Lembretes | ✅ cron diário da Vercel, 09:00 |
| Alertas técnicos | ✅ pro WhatsApp do Kainã |
| Cópia reserva na VPS | 🟡 sobe, mas sem credencial e sem domínio ([`vps.md`](./vps.md)) |
| Testes | ✅ ~600 passando · lint, tsc e build limpos |

---

## Conferir agora (configuração fora do repositório)

- [ ] **`KAROL_WHATSAPP` apagada na Vercel.** ⚠️ É a armadilha mais cara do
  projeto: enquanto ela existir, **a Karol não recebe agendamento nenhum**
  e o assistente atende o outro número — sem nada quebrar pra denunciar.
  Último registro (16/09): ainda era preciso apagar na entrega.
- [ ] **Token da Meta regenerado.** Apareceu num print em 06/09; nunca foi
  confirmado que foi trocado.
- [ ] **`TECNICO_WHATSAPP` e `CRON_SECRET` preenchidas.** Sem a primeira,
  erro nenhum chega em ninguém; sem a segunda, não há lembrete.
- [ ] **Nenhum cron externo antigo ligado.** Se alguém criou um no
  cron-job.org para o lembrete de 30 min (`?tipo=curto`), desligue: o
  parâmetro não existe mais e ele mandaria o lembrete da véspera várias
  vezes por dia.

---

## Depende da Karol

| Pendência | Onde está no código |
|---|---|
| Qual foto abre o site (branca ou laranja) | `CAPA` em `src/data/fotos.ts` — está `"branca"` |
| Publicar o nome do local em Bandeirantes | `CIDADES.bandeirantes.local` — está `null` (o endereço já vai pra quem marca) |
| O fim da noite é 22h ou 23h? (formulário diz 22h, áudio disse 23h) | `EXPEDIENTE` — está 22h |
| Revisar os textos dos serviços (preços e durações são dela; os textos, não) | `src/data/servicos.ts` |
| Abrir MEI, se quiser o nome "Studio Karol Carvalho" no lugar do número no WhatsApp | verificação da empresa na Meta |
| Continuar depois do mês de teste, e por quanto | — |

---

## Pendências técnicas

| Pendência | Por que não foi feita | Ver |
|---|---|---|
| **Domínio próprio** (`.com.br`) | compra do Kainã. Sem ele não existe virada pra VPS | [`vps.md`](./vps.md) |
| Credenciais no `.env` da VPS | de propósito, até haver domínio | [`vps.md`](./vps.md) |
| Última frase do template `pedido_sinal` | editar manda o template pra análise; esperar uma janela tranquila | [`templates-whatsapp.md`](./templates-whatsapp.md) |
| 11 agendamentos com o número da Karol no lugar da cliente | as guardas já impedem envio; trocar por `null` é `UPDATE` em produção — só com o Kainã mandando | [`incidentes.md`](./incidentes.md) |
| Trava anti-spam de alertas em memória | o conserto de verdade é histórico no banco com teto diário — é migração | [`incidentes.md`](./incidentes.md) |
| `/agendar/confirmado?ag=<id>` mostra nome e detalhes sem sessão | protegido só pelo UUID (padrão de página de confirmação); não expõe o WhatsApp | — |
| Conferência de comprovante nunca testada com comprovante real | não há um no repositório | [`assistente.md`](./assistente.md) |
| "Limpar histórico" no painel | pedido em aberto, nada construído | — |
| Coluna `avisado_30min_em` sem uso | inofensiva; derrubar coluna não tem volta | `migracao-04` |

### Na VPS — decisões do Kainã

| Pendência | Risco de fazer |
|---|---|
| Reiniciar a máquina (atualização de kernel esperando) | derruba `eurora.site` e `volkerr.com.br` por ~2 min |
| Containers do volkerr rodando como root | o conserto (`USER` no Dockerfile) pode quebrar upload e cache |
| `.env.example` do volkerr com segredos reais dentro | não está em git hoje, mas iria junto se virasse repositório |
| Deploy automático (script ou webhook do GitHub) | nenhum; hoje é manual |

---

## Segurança — o que foi conferido

- Nenhum segredo no código nem no histórico; tudo por variável de ambiente.
- `.gitignore` e `.dockerignore` barram `.env*` (só o `.env.example` passa).
- Sessão do painel: HMAC-SHA256, comparação em tempo constante, cookie
  `httpOnly`/`secure`/`sameSite`.
- Toda Server Action reconfere `sessaoAtiva()` — o proxy não é fronteira.
- RLS ligado em todas as tabelas, com zero policies.
- IDs validados por regex antes de ir ao banco.
- Webhook da Meta: HMAC sobre os bytes crus, tempo constante, **falha
  fechado** sem `META_APP_SECRET`.
- Cron: `CRON_SECRET` comparado em tempo constante; sem ele a rota fecha.
- Botões de decisão da Karol (`k:ok`, `k:no`) só valem vindo do número dela.
- Nenhuma credencial no JavaScript que vai pro navegador (conferido chunk
  por chunk em 17/09).
