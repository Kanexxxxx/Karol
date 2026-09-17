# O que eu preciso de você — VPS do Studio Karol Carvalho

**17/09/2026** · estado: site rodando em `127.0.0.1:3100`, sem credenciais

---

## Parte 1 — O que a Vercel dava de graça e a VPS não dá

Esta é a lista que você intuiu. Cada linha é uma coisa que **hoje funciona
sozinha** e que na VPS vira trabalho de alguém.

| A Vercel faz | Na VPS | Gravidade se esquecer |
|---|---|---|
| **Cron dos lembretes** (`vercel.json`) | uma linha no `crontab` | 🔴 **o lembrete da véspera para de sair, e nada avisa** |
| **Cabeçalho de autorização do cron** — ela injeta `Bearer $CRON_SECRET` sozinha | você cola o segredo no `curl` | 🔴 a rota devolve 401 e o cron roda em falso |
| **`VERCEL_PROJECT_PRODUCTION_URL`** injetada no build | `NEXT_PUBLIC_SITE_URL` na mão | 🟡 sitemap aponta pro lugar errado e o link do painel no WhatsApp dela não abre |
| **HTTPS automático** | Let's Encrypt — o `renew-certs.sh` do volkerr já existe e serve | 🔴 site sem cadeado, navegador barrando |
| **Deploy a cada `git push`** | `tar` + `docker compose up -d --build` na mão | 🟡 chato, não quebra |
| **Rollback de um clique** | voltar a imagem Docker anterior na mão | 🟡 |
| **CDN mundial** | um servidor em um lugar só | 🟢 irrelevante: as clientes estão todas na mesma região |
| **Proteção de borda contra ataque** | ufw + fail2ban, e só | 🟡 aceitável no volume dela |
| **Build numa máquina potente** | 1 vCPU — o build leva minutos | 🟢 |

### ⚠️ E o que NÃO é da Vercel, mas quebra igual: o webhook da Meta

A Meta manda as respostas das clientes pra **um endereço só**. No dia da
virada, se você não trocar a URL no painel do app da Meta, acontece o pior
tipo de falha: o site sobe, a agenda funciona, a Karol usa o painel — e
**nenhuma mensagem de cliente chega**. O assistente dela fica mudo e
ninguém entende por quê.

---

## Parte 2 — O que eu preciso de você

### 🔑 A. As credenciais (o bloqueio principal)

O `.env` da VPS está vazio, de propósito. Cada uma abaixo você já tem —
estão na Vercel hoje. São 11 que importam:

**Sem estas quatro, não existe agenda nem painel:**

1. `NEXT_PUBLIC_SUPABASE_URL`
2. `SUPABASE_SERVICE_ROLE_KEY` — a *service_role*, não a anon
3. `SENHA_PAINEL`
4. `SESSAO_SECRET`

**Sem estas quatro, nenhuma mensagem de WhatsApp sai nem entra:**

5. `META_PHONE_NUMBER_ID` — já preenchido no `.env.example`, não é segredo
6. `META_TOKEN`
7. `META_VERIFY_TOKEN`
8. `META_APP_SECRET`

**Sem estas três, o sistema funciona mas fica cego ou mudo:**

9. `CRON_SECRET` — sem ele os lembretes não rodam
10. `TECNICO_WHATSAPP` — **o seu número.** Sem ele, erro nenhum chega em
    ninguém e você descobre pela cliente reclamando
11. `DEEPSEEK_API_KEY` — sem ela o assistente da Karol se cala e responde
    com o link do painel (não quebra nada)

**Como me passar:** não me mande por aqui. Você mesmo cola na VPS:

```bash
ssh root@147.93.9.185
nano /opt/karol/vps/.env          # o .env.example diz o que é cada uma
cd /opt/karol/vps && docker compose up -d --build
```

Se preferir que eu faça, eu monto o arquivo com os nomes e você só preenche
os valores.

### 🌐 B. O domínio

Você já decidiu: `.com.br`. Quando comprar, eu faço o resto — registro A,
bloco no nginx, certificado, e a troca do `NEXT_PUBLIC_SITE_URL`.

### ⏱️ C. Três decisões suas

**1. Quando posso reiniciar a VPS?**
Tem atualização de kernel esperando (`*** System restart required ***`).
Reiniciar derruba `eurora.site` e `volkerr.com.br` por uns 2 minutos.

**2. Conserto os containers do volkerr pra não rodarem como root?**
Os 4 rodam como root hoje — se alguém achar um furo na aplicação, já entra
como root do container. O da Karol roda como `nextjs`, sem privilégio.

O conserto é um `USER` no Dockerfile de cada um e recompilar. O risco é
real: mexe em permissão de arquivo e pode quebrar upload e cache. Como
você disse que são protótipos, talvez não valha a pena agora.

**3. Quer deploy automático?**
Hoje atualizar é rodar dois comandos na mão. Dá pra montar um script que
faz tudo de uma vez, ou um webhook do GitHub. Sem isso funciona igual, só
dá mais trabalho.

---

## Parte 3 — O que já está resolvido, pra você não se preocupar

- site rodando e saudável na VPS, fechado em `127.0.0.1:3100`
- sem credencial nenhuma ele já serve o site institucional inteiro e manda
  a cliente pro WhatsApp — não é uma página de erro
- SSH por senha fechado; só chave
- todas as credenciais da máquina em 600
- HSTS e `X-Powered-By` corrigidos no volkerr
- cursverse apagado, 817 MB livres
- guia da máquina em `/opt/GUIA-DA-VPS.md`, e aparece sozinho ao entrar
- nenhuma credencial do projeto da Karol aparece no JavaScript que vai pro
  navegador — conferido chunk por chunk
