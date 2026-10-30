# A cópia reserva na VPS

Uma segunda cópia do site, numa VPS, para quando a Vercel cair — *"parou
um, o outro já entra no lugar"*. Os dois lados usam **o mesmo banco**
(Supabase), então não há sincronização: quem estiver no ar enxerga tudo.

Os arquivos ficam em [`vps/`](../vps/): `Dockerfile` (imagem em 3 etapas,
roda como usuário sem privilégio) e `docker-compose.yml`.

**Estado (17/09/2026):** o site roda na VPS em `127.0.0.1:3100`, **sem
credenciais e sem domínio**. Sem `.env`, ele já serve o site institucional
inteiro e manda a cliente pro WhatsApp em `/agendar` — sem erro no log.

---

## A máquina

| | |
|---|---|
| Endereço | `147.93.9.185` · `srv1923180.hstgr.cloud` |
| Plano | Hostinger KVM 1 — Ubuntu 24.04, 1 vCPU, 4 GB RAM, 51 GB |
| Acesso | **só por chave SSH** (senha fechada em 17/09) |
| Guia no servidor | `/opt/GUIA-DA-VPS.md` — aparece ao entrar. Atualize junto se mexer na máquina |

**A VPS não é só deste projeto:**

| Projeto | Onde | Portas | O que é |
|---|---|---|---|
| eurora-volkerr | `/opt/eurora-volkerr` | **80, 443** (nginx) | 4 containers + Postgres. Serve `eurora.site` e `volkerr.com.br` |
| **Studio Karol** | `/opt/karol` | `127.0.0.1:3100` | esta cópia |
| confia | `/var/www/confia`, `/home/confia` | — | restos de um projeto antigo |

### As três regras da máquina

1. **Não apague nada.** Tem protótipo no ar que parece abandonado e não é.
2. **As portas 80 e 443 são do nginx do eurora-volkerr.** Subir qualquer
   coisa nelas derruba dois sites. Por isso **não existe Caddy** aqui: o
   site da Karol escuta só em `127.0.0.1:3100` e será publicado pelo nginx
   que já existe.
3. **Credencial não entra em imagem Docker nem em arquivo versionado.**
   Vive em `vps/.env`, permissão 600. O `.dockerignore` da raiz impede um
   `.env` de entrar até na camada intermediária do build.

Portas abertas pro mundo (ufw): só `22`, `80` e `443`. Também ativos:
fail2ban e unattended-upgrades.

---

## Operar

```bash
ssh root@147.93.9.185
cd /opt/karol/vps
docker compose ps
docker compose logs -f site
docker compose up -d --build     # depois de atualizar código ou NEXT_PUBLIC_*
```

**Ver o site enquanto não há domínio** (do seu computador):

```bash
ssh -N -L 8080:127.0.0.1:3100 root@147.93.9.185
# e abra http://localhost:8080
```

### Atualizar o código

Do seu computador, na pasta do projeto:

```bash
# 1. guarde o .env — o passo 2 apaga a pasta inteira
ssh root@147.93.9.185 "cp /opt/karol/vps/.env /root/karol.env"

# 2. envie o código
tar czf - --exclude=node_modules --exclude=.git --exclude=.next \
          --exclude=.env --exclude=".env.*" . \
  | ssh root@147.93.9.185 "rm -rf /opt/karol && mkdir -p /opt/karol && tar xzf - -C /opt/karol"

# 3. devolva o .env e suba
ssh root@147.93.9.185 "cp /root/karol.env /opt/karol/vps/.env && chmod 600 /opt/karol/vps/.env \
                       && cd /opt/karol/vps && docker compose up -d --build"
```

O build leva alguns minutos com 1 vCPU. Enquanto ainda não existir
`.env` na VPS, pule os passos 1 e 3 e veja "Credenciais", abaixo.

---

## O que a Vercel faz sozinha e a VPS não

| Na Vercel | Na VPS | Se esquecer |
|---|---|---|
| cron dos lembretes (`vercel.json`) | uma linha no `crontab` | 🔴 lembrete da véspera para de sair, e nada avisa |
| cabeçalho `Bearer $CRON_SECRET` do cron | você cola no `curl` | 🔴 a rota devolve 401 em silêncio |
| `VERCEL_PROJECT_PRODUCTION_URL` | `NEXT_PUBLIC_SITE_URL` **obrigatória** | 🟡 sitemap e link do painel no WhatsApp apontam pro lugar errado |
| HTTPS automático | certificado pelo `renew-certs.sh` do volkerr | 🔴 site sem cadeado |
| deploy a cada `git push` | os comandos acima, na mão | 🟡 trabalhoso, não quebra |
| rollback de um clique | voltar a imagem anterior na mão | 🟡 |

E o que não é da Vercel mas quebra igual: **o webhook da Meta aponta pra um
endereço só** (ver "A virada").

---

## Credenciais

O `.env` da VPS está vazio de propósito. As 11 que importam são as mesmas
da Vercel (`.env.example` explica cada uma):

| Sem estas, não há… | Variáveis |
|---|---|
| agenda nem painel | `NEXT_PUBLIC_SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · `SENHA_PAINEL` · `SESSAO_SECRET` |
| WhatsApp | `META_PHONE_NUMBER_ID` (já no exemplo) · `META_TOKEN` · `META_VERIFY_TOKEN` · `META_APP_SECRET` |
| lembretes, alertas e assistente | `CRON_SECRET` · `TECNICO_WHATSAPP` · `DEEPSEEK_API_KEY` |

Mais `NEXT_PUBLIC_SITE_URL`, obrigatória aqui. As `NEXT_PUBLIC_*` entram no
**build** (viram parte do JavaScript), por isso exigem `--build`.

Cole você mesmo na VPS — não mande credencial por chat:

```bash
ssh root@147.93.9.185
cp /opt/karol/.env.example /opt/karol/vps/.env && chmod 600 /opt/karol/vps/.env
nano /opt/karol/vps/.env
cd /opt/karol/vps && docker compose up -d --build
```

---

## O domínio — sem ele não há virada

Hoje o site vive em `karol-zeta.vercel.app`, que é **da Vercel**: se ela
cair, o endereço cai junto. A virada exige um domínio próprio:

```text
karolcarvalho.com.br  --(registro A, TTL 300)-->  Vercel
                                   |
                     Vercel caiu?  troca o A pro IP da VPS
                                   v
                            147.93.9.185  (nginx → 127.0.0.1:3100)
```

Decidido: `.com.br` (~R$ 40/ano). Quando existir:

1. registro A → `147.93.9.185`;
2. um `server` novo no nginx do volkerr apontando pra `127.0.0.1:3100`;
3. certificado pelo `renew-certs.sh` que já existe;
4. `NEXT_PUBLIC_SITE_URL` no `.env` e `docker compose up -d --build`.

---

## A virada (quando a Vercel cair)

1. **DNS:** registro A do domínio → IP da VPS.
2. **`.env` da VPS:** `NEXT_PUBLIC_SITE_URL` = domínio, e `docker compose up -d --build`.
3. ⚠️ **Webhook da Meta:** no app da Meta, Callback URL →
   `https://SEU_DOMINIO/api/whatsapp`. Sem isso o site funciona e **nenhuma
   resposta de cliente chega** — o passo mais fácil de esquecer e o mais caro.
4. **Cron:** ligue o da VPS **no mesmo momento** em que o da Vercel parar:

   ```cron
   # 09:00 em Pereira Barreto — mesma hora do vercel.json
   0 9 * * *  curl -fsS -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU_DOMINIO/api/lembretes >> /var/log/karol-lembretes.log 2>&1
   ```

5. **Template `aviso_karol_novo_agendamento`:** o botão tem o domínio
   gravado na Meta (ver [`templates-whatsapp.md`](./templates-whatsapp.md)).

De volta ao normal: os mesmos passos, ao contrário.

> [!CAUTION]
> **Nunca deixe os dois crons ligados.** Os dois lados usam o mesmo banco. A
> marca `lembrete_enviado_em` (migração 06) segura o caso normal, mas se os
> dois dispararem no mesmo segundo, os dois leem "ainda não enviou".

---

## Diário da máquina

### 17/09/2026 — auditoria e faxina

- **SSH por senha estava aberto.** `50-cloud-init.conf` dizia `yes` e, no
  OpenSSH, o primeiro valor lido vence. Fechado com
  `/etc/ssh/sshd_config.d/01-seguranca.conf`, lido antes do `50`.
- `.env*` do volkerr estavam 644 (legíveis pelo usuário `confia`) → 600.
- `volkerr.com.br` ganhou HSTS e escondeu o `X-Powered-By`. Backup do
  nginx original em `/root/default.conf.antes-seguranca-17set`.
- `/var/www/cursverse` (817 MB, sem nada dependendo) apagado a pedido do Kainã.
- Conferido: `/var/www` não é servido; nenhum container monta o
  `docker.sock` nem roda privilegiado; `.env`, `.git` e afins dão 404 nos
  dois domínios.

As decisões que ficaram pendentes na máquina estão em
[`estado-atual.md`](./estado-atual.md).
