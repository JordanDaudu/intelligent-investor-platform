# --- builder ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (better caching: copy manifests first)
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- runtime ---------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Apply Prisma migrations on startup, then boot the API.
# `migrate deploy` is idempotent and only applies committed migrations — it
# never alters the schema implicitly. We deliberately do NOT fall back to
# `prisma db push` here so production data can never be silently reshaped on
# a missing-migration condition; instead, the container fails fast and the
# operator must ship a real migration.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
EXPOSE 8000
