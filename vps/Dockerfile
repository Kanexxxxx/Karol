# Studio Karol Carvalho — imagem pra VPS
#
# Constroi em tres etapas pra imagem final ficar pequena: a de build leva
# os 488 MB de node_modules, a final leva so os 24 MB do standalone.
#
#   docker compose build      (na pasta vps/)
#
# ⚠️ NENHUMA CREDENCIAL ENTRA NA IMAGEM. Elas chegam em tempo de execucao,
# pelo arquivo .env que o docker-compose le. Imagem e publica por natureza;
# credencial dentro dela vaza junto.

# --- 1. dependencias -----------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- 2. build ------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ⚠️ E ESTA LINHA que gera o .next/standalone. Ver next.config.ts: sem a
# variavel, o build sai no formato da Vercel e o server.js nao existe.
ENV BUILD_STANDALONE=1
ENV NEXT_TELEMETRY_DISABLED=1

# As NEXT_PUBLIC_* sao lidas DURANTE o build, nao em execucao — o valor
# fica dentro do JavaScript que vai pro navegador. Por isso entram aqui
# como argumento, e nao no .env do compose.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL

RUN npm run build

# --- 3. a imagem que roda ------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Fuso do container. O codigo ja forca America/Sao_Paulo em
# src/instrumentation.ts, mas com o fuso certo aqui o LOG tambem sai na
# hora de Pereira Barreto, e e o log que voce vai ler quando algo der
# errado as 3 da manha.
RUN apk add --no-cache tzdata curl &&     cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime &&     echo "America/Sao_Paulo" > /etc/timezone
ENV TZ=America/Sao_Paulo

# Nao roda como root.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# O Caddy so manda trafego pra ca quando isto passa.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3   CMD curl -fsS http://127.0.0.1:3000/robots.txt || exit 1

CMD ["node", "server.js"]
