# ============================================================
# DOCKERFILE MULTI-STAGE PARA GCP CLOUD RUN (NODE.JS + HONO)
# ============================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Fazer build do bundle de produção usando esbuild
RUN npx esbuild src/server.ts --bundle --platform=node --target=node22 --outfile=dist/server.js

# --- Stage 2: Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Criar usuário não-root para segurança
RUN addgroup -S nodejs && adduser -S hono -G nodejs

# Copiar arquivos estáticos e bundle compilado
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Instalar apenas dependências de produção necessárias
RUN npm ci --only=production

USER hono

EXPOSE 3000

CMD ["node", "dist/server.js"]
