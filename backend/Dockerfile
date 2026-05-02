# --- builder ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (better caching: copy manifests first)
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

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Copy the Prisma CLI and all its dependencies (pinned to builder version)
# so `migrate deploy` runs without any dynamic npx download at startup.
#
# Dependency tree (prisma 5.x):
#   node_modules/prisma          — CLI entry point (build/index.js)
#   node_modules/@prisma/engines — schema-engine binary used by migrate
#     └─ @prisma/debug, @prisma/engines-version,
#        @prisma/fetch-engine, @prisma/get-platform
#   node_modules/.prisma         — generated query-engine client
#
# NOTE: node_modules/@prisma is already present from `npm ci --omit=dev`
# (@prisma/client is a production dep). Copying the whole directory from
# builder overwrites it with the full set including @prisma/engines and its
# transitive deps. No symlinks are used in CMD — we invoke the CLI entry
# point directly via `node` to avoid any BuildKit symlink-resolution edge cases.
COPY --from=builder /app/node_modules/prisma      ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma     ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma     ./node_modules/.prisma

# Apply Prisma migrations on startup, then boot the API.
# `migrate deploy` is idempotent and only applies committed migrations — it
# never alters the schema implicitly. We deliberately do NOT fall back to
# `prisma db push` here so production data can never be silently reshaped on
# a missing-migration condition; instead, the container fails fast and the
# operator must ship a real migration.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/main.js"]
EXPOSE 8000
