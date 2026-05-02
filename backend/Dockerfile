# --- builder ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- runtime ---------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/node_modules/prisma      ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma     ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma     ./node_modules/.prisma

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
EXPOSE 8000