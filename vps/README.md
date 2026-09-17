# A cópia reserva, na VPS

Este é o caminho de subir o site da Karol numa VPS, como reserva pra
quando a Vercel cair. A ideia do Kainã: *"tipo parou um, o outro já entra
no lugar"*.

---

## O que já está pronto e o que falta

**Pronto.** A imagem monta, o site sobe e responde. Testado em 17/09/2026,
rodando o build standalone num servidor local:

| rota | resposta |
|---|---|
| `/` `/agendar` `/privacidade` | 200 |
| `/painel` | 307 (manda pro login) |
| `/api/lembretes` | 401 (fechado sem o segredo) |

**Falta:** as credenciais, e só elas. É de propósito.

---

## ⚠️ O site sobe SEM credencial nenhuma, e isso é a graça

Com o `.env` vazio, a cópia da VPS não quebra — ela degrada:

- home, serviços, sobre, privacidade: **no ar, inteiros**
- `/agendar`: mostra *"A agenda online está sendo ligada"* e o WhatsApp da
  Karol do lado
- o painel pede login e não entra
- nenhum erro no log

Testado, não suposto. Ou seja: dá pra deixar a VPS ligada e ela já serve
de cartão de visita. No dia da virada, você cola o `.env` e ela vira o
sistema inteiro.

---

## 1. A VPS

Já existe, e é suficiente: **KVM 1, Ubuntu 24.04, 1 vCPU, 4 GB de RAM,
51 GB** — `147.93.9.185`. O site standalone tem 24 MB; sobra folga.

## 2. O domínio — a parte que precisa de decisão

⚠️ **Sem domínio próprio não existe "um cai, o outro entra".**

Hoje o site vive em `karol-zeta.vercel.app`. Esse endereço é da Vercel: se
a Vercel cair, ele cai junto, e não há pra onde apontar. Quem tiver o link
salvo fica na mão.

A virada de verdade exige um domínio que seja **seu**:

```
   karolcarvalho.com.br   ->  (registro A)  ->  Vercel
                                      |
                      Vercel caiu?  troca o A pro IP da VPS
                                      |
                                      v
                              147.93.9.185
```

Com TTL baixo (300s), a virada leva minutos e ninguém precisa trocar link
nenhum.

**Os caminhos:**

1. **Comprar `karolcarvalho.com.br`** (~R$ 40/ano). É o certo, e é o que
   `src/data/negocio.ts` já prevê como domínio futuro dela.
2. **Subdomínio de um domínio que você já tem**, tipo
   `karol.vaideconfia.com`. Custa zero e serve pra deixar a reserva no ar
   hoje mesmo — mas não é endereço de marca pra ela divulgar.
3. **Só o hostname da VPS** (`srv1923180.hstgr.cloud`). Funciona com HTTPS,
   serve pra testar, não serve pra cliente ver.

## 3. Instalar o Docker na VPS

```bash
ssh root@147.93.9.185
curl -fsSL https://get.docker.com | sh
```

## 4. Levar o projeto

```bash
git clone <url-do-repositorio> /opt/karol
cd /opt/karol/vps
```

## 5. As credenciais

```bash
cp ../.env.example .env
nano .env
```

O `.env.example` diz, uma por uma, o que cada variável faz e quais são
segredo. **Duas mudam em relação à Vercel:**

- `NEXT_PUBLIC_SITE_URL` vira **obrigatória**. Na Vercel dá pra viver sem,
  porque ela injeta `VERCEL_PROJECT_PRODUCTION_URL` sozinha. Aqui não tem
  ninguém pra injetar: sem isso o sitemap aponta pro endereço errado e o
  link que chega no WhatsApp da Karol não abre.
- `CRON_SECRET` continua igual, mas quem chama a rota passa a ser você
  (seção 6).

E o domínio, pro Caddy:

```bash
echo "DOMINIO=karol.seudominio.com" >> .env
```

## 6. ⚠️ O CRON DOS LEMBRETES — o que some quando sai da Vercel

Na Vercel, `vercel.json` agenda `/api/lembretes` todo dia e a própria
Vercel manda o cabeçalho de autorização. **Na VPS isso não existe.** Sem
montar o agendamento na mão, o lembrete da véspera simplesmente para de
sair, e ninguém avisa.

```bash
crontab -e
```

```cron
# 09:00 no horário de Pereira Barreto. Mesma hora do vercel.json.
0 9 * * *  curl -fsS -H "Authorization: Bearer SEU_CRON_SECRET" https://SEU_DOMINIO/api/lembretes >> /var/log/karol-lembretes.log 2>&1
```

**⚠️ ENQUANTO A VERCEL FOR A PRINCIPAL, DEIXE ESTE CRON DESLIGADO.**

Os dois sites falam com o MESMO banco. Rodar a varredura duas vezes por dia
seria o lembrete chegando duas vezes na mesma cliente. O banco tem uma
trava (`lembrete_enviado_em is null`, migração 06) que segura o caso normal
— mas se os dois dispararem no mesmo segundo, os dois leem "ainda não
enviou" antes de qualquer um marcar.

Ligue o cron da VPS **no mesmo momento** em que desligar o da Vercel.

## 7. Subir

```bash
docker compose up -d --build
docker compose logs -f site
```

O Caddy pede o certificado HTTPS sozinho na primeira visita. Pra isso o
domínio já tem que estar apontando pro IP da VPS, com as portas 80 e 443
abertas.

---

## O procedimento de virada

Quando a Vercel cair:

1. **DNS**: troque o registro A do domínio pro IP da VPS.
2. **`.env` da VPS**: confirme que `NEXT_PUBLIC_SITE_URL` é o domínio, e
   rode `docker compose up -d --build` (as `NEXT_PUBLIC_*` entram no build,
   não em execução — por isso o `--build`).
3. **⚠️ WEBHOOK DA META**: no painel do app da Meta, troque a URL de
   callback pra `https://SEU_DOMINIO/api/whatsapp`.

   **Só um endereço recebe o webhook.** Sem este passo o site sobe, a
   agenda funciona, a Karol usa o painel — e nenhuma resposta de cliente
   chega. O assistente dela fica mudo e ninguém entende por quê. É o passo
   mais fácil de esquecer e o mais caro.
4. **Cron**: ligue o da VPS.

De volta ao normal: os mesmos quatro, ao contrário.

---

## O que os dois lados compartilham

O **banco é o mesmo** (Supabase). Não existe sincronização a fazer: os dois
sites leem e escrevem na mesma agenda. Quem estiver no ar enxerga tudo.

O que NÃO é compartilhado, e por isso está na lista de virada: o endereço
público, o webhook da Meta e o cron.
