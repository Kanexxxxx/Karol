# Guia desta VPS — leia antes de mexer

**Máquina:** `147.93.9.185` · `srv1923180.hstgr.cloud` · Hostinger KVM 1
**Sistema:** Ubuntu 24.04 LTS · 1 vCPU · 4 GB RAM · 51 GB (20% em uso)
**Última revisão:** 17/09/2026

> Este arquivo existe porque a máquina tem coisa de mais de um projeto e
> não dava pra saber o que era o quê sem abrir tudo. Se você mexer em
> alguma coisa aqui, **atualize este arquivo junto**.

---

## ⚠️ As três regras

1. **Não apague nada.** Tem protótipo no ar que parece abandonado e não é.
2. **As portas 80 e 443 são do nginx do `eurora-volkerr`.** Subir qualquer
   coisa nelas derruba dois sites. Projeto novo entra em porta alta,
   fechada em `127.0.0.1`, e é publicado pelo nginx existente.
3. **Credencial não entra em imagem Docker nem em arquivo versionado.**
   Vive em `.env` com permissão 600, ao lado do `docker-compose.yml`.

---

## O que roda aqui

| Projeto | Onde | Portas | O que é |
|---|---|---|---|
| **eurora-volkerr** | `/opt/eurora-volkerr` | **80, 443** (nginx) | Stack de 4 containers + Postgres. Serve `eurora.site` e `volkerr.com.br`. No ar há semanas. |
| **Studio Karol Carvalho** | `/opt/karol` | `127.0.0.1:3100` | Cópia reserva do site da Karol. Não alcançável de fora — ainda sem domínio. |
| cursverse | `/var/www/cursverse` | — | 817 MB de arquivos. Sem serviço rodando. |
| confia | `/var/www/confia`, `/home/confia` | — | Restos do projeto Confia. 8 KB + 256 KB. |

**Portas abertas pro mundo (ufw):** só `22`, `80`, `443`. Conferido de
fora em 17/09: 3000, 3001, 3100, 4000 e 5432 estão fechadas.

**Cron do root:** renovação dos certificados do volkerr, 03:17 e 15:17.

---

## Segurança — o que foi feito e por quê

### ✅ Entrada por senha, fechada em 17/09/2026

Estava **aberta**, e por um motivo que não aparece lendo os arquivos.
`/etc/ssh/sshd_config.d/` tinha:

```
50-cloud-init.conf        PasswordAuthentication yes
60-cloudimg-settings.conf PasswordAuthentication no
99-confia.conf            PasswordAuthentication no
```

No OpenSSH **o primeiro valor lido vence** — os dois `no` nunca valeram.
`sshd -T` confirmava: `passwordauthentication yes`, com bots tentando 16
vezes por dia.

Consertado com `01-seguranca.conf`, que por começar com `01` é lido antes
do `50`. O arquivo do cloud-init não foi editado porque pode ser regerado.

**Só se entra com chave.** Se alguém precisar de acesso, adicione a chave
pública em `~/.ssh/authorized_keys` — não reabra senha.

### Já estava certo

- `PermitRootLogin prohibit-password` — root só com chave
- `fail2ban` ativo
- `unattended-upgrades` ativo, zero atualização de segurança pendente
- ufw ativo com três portas

---

## O site da Karol

```bash
cd /opt/karol/vps
docker compose ps
docker compose logs -f site
docker compose up -d --build     # depois de atualizar o código
```

**Ele sobe sem credencial nenhuma, de propósito.** Com o `.env` vazio:
home, serviços, sobre e privacidade no ar; `/agendar` diz "a agenda online
está sendo ligada" e manda pro WhatsApp; o painel pede login e não entra.
Nada quebra e nenhum erro sai no log.

### Pra ver o site enquanto não tem domínio

Do seu micro:

```bash
ssh -N -L 8080:127.0.0.1:3100 root@147.93.9.185
```

e abra `http://localhost:8080`. O túnel morre quando fecha o terminal.

### Quando o domínio chegar

1. Registro A do domínio → `147.93.9.185`
2. Um `server` novo no nginx do volkerr apontando pra `127.0.0.1:3100`
3. Certificado pelo `renew-certs.sh` que já existe
4. `NEXT_PUBLIC_SITE_URL` no `.env` e `docker compose up -d --build`
   (essa variável entra no build, não em execução — por isso o `--build`)
5. **Webhook da Meta** apontando pro domínio novo
6. Cron dos lembretes — ver `/opt/karol/vps/README.md`, seção 6

---

## Atualizar o código da Karol

Do micro, de dentro da pasta do projeto:

```bash
tar czf - --exclude=node_modules --exclude=.git --exclude=.next \
          --exclude=.env --exclude=".env.*" . \
  | ssh root@147.93.9.185 "rm -rf /opt/karol && mkdir -p /opt/karol \
                           && tar xzf - -C /opt/karol"
ssh root@147.93.9.185 "cd /opt/karol/vps && docker compose up -d --build"
```

⚠️ O `rm -rf` apaga o `.env` junto. Refaça-o antes de subir credencial, ou
guarde uma cópia fora de `/opt/karol`.

---

## Diário de mudanças

### 17/09/2026 — auditoria e faxina

**Apagado (a pedido do Kainã):**
- `/var/www/cursverse` — plataforma de cursos, 817 MB. Confirmado antes:
  nenhum container, nginx, cron ou systemd dependia dela. Disco caiu de
  24% pra 22%.

**Segurança, o que estava aberto:**

| O quê | Estado | Agora |
|---|---|---|
| SSH por senha | **aberta** (ver acima) | fechada |
| `.env.local`, `.env.local.backup`, `.env.backup` do volkerr | 644 — o usuário `confia` lia | 600 |
| `.env.example` do eurora e do volkerr-backend | 644, e com **6 valores reais dentro** | 600 |
| `volkerr.com.br` sem HSTS | rebaixável pra HTTP | `add_header` no nginx |
| `X-Powered-By: Next.js` no volkerr | entregava a stack | `proxy_hide_header` |

A mudança no nginx foi validada num container descartável (com upstreams e
certificados reais montados) e aplicada com `docker kill -s HUP`, que
recarrega sem derrubar. Backup do original em
`/root/default.conf.antes-seguranca-17set`.

**Conferido e já estava certo:**
- `/var/www` não é servido por nenhum servidor web — os `.env` de lá nunca
  estiveram acessíveis pela internet
- nenhum container monta `/var/run/docker.sock` nem roda privilegiado
- `.env`, `.git`, `package.json` e `docker-compose.yml` dão 404 nos dois
  domínios
- fail2ban e unattended-upgrades ativos, zero atualização pendente

### ⚠️ O que ficou pendente, e por quê

**1. Os 4 containers do volkerr rodam como root.** Se alguém achar um
furo na aplicação, já entra como root do container. O da Karol roda como
`nextjs` (usuário sem privilégio).

Consertar é acrescentar `USER` nos Dockerfiles do volkerr e recompilar —
mexe em permissão de arquivo e pode quebrar upload e cache. Não foi feito
sem o Kainã decidir.

**2. `*** System restart required ***`** — atualização de kernel esperando.
Reiniciar derruba eurora e volkerr por ~2 minutos.

**3. Os `.env.example` do volkerr têm segredo de verdade dentro**
(`ADMIN_PASSWORD`, `GMAIL_APP_PASSWORD`, `ASAAS_WEBHOOK_TOKEN`,
`CRON_SECRET`, `SESSION_SECRET`, `ADMIN_SECRET`). Estão em 600 agora, e
nenhuma pasta dessas é repositório git — então não vazaram pro GitHub. Mas
arquivo de exemplo não devia guardar valor real: se um dia virar
repositório, vai junto.
