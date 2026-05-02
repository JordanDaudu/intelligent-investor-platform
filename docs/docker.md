# Docker

## Local stack — `docker-compose.yml`

Three services, two named networks (the implicit default), one named volume:

| Service    | Image / build              | Port (host → container) | Notes                          |
|------------|----------------------------|--------------------------|--------------------------------|
| `postgres` | `postgres:16-alpine`        | `5432 → 5432`             | Health-checked with `pg_isready` |
| `backend`  | `./backend/Dockerfile`     | `8000 → 8000`             | Health-checked on `/health`    |
| `frontend` | `./frontend/Dockerfile`    | `5173 → 80` (host:container, configurable via `FRONTEND_PORT`) | Static SPA served by nginx |

`backend` waits for `postgres` to be healthy before starting, and `frontend` waits for `backend` to be healthy. This means `docker compose up` reliably comes up in the right order.

Run it:

```bash
cp .env.example .env
docker compose up --build
```

## Production example — `docker-compose.prod.yml`

Same shape, but:

- `restart: always`
- All credentials sourced from env vars (no defaults).
- Production resource limits are intentionally left to the target orchestrator or hosting provider.
- Frontend exposes port 80 by default for direct hosting behind a reverse proxy.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## Backend Dockerfile

Multi-stage:

1. **builder** installs deps, runs `prisma generate`, and `nest build`.
2. **runtime** copies `dist/`, the generated Prisma client, and only production deps.
3. The container's `CMD` runs Prisma migrations (idempotent) before starting the API.

## Frontend Dockerfile

Multi-stage:

1. **builder** installs deps and runs `vite build`. `VITE_API_BASE_URL` is baked in at build time via a `--build-arg`.
2. **runtime** is `nginx:alpine` serving the static `dist/` directory with an SPA fallback.

## Why no Docker inside Replit?

Replit's NixOS workspace doesn't support nested virtualization, so the Docker stack is documented + validated at config level (CI builds the images). For the in-workspace preview we run the backend and frontend directly with Node 20, pointing at Replit's managed Postgres via the existing `DATABASE_URL`.
