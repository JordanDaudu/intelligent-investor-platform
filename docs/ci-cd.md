# CI / CD

Pipeline: `.github/workflows/ci.yml`. Triggered on push to any `feature/*`, `dev`, `stage`, `main` and on pull requests targeting `dev`, `stage`, or `main`.

## Jobs

| Job                                | When                                                       | What it does                                                                  |
|------------------------------------|------------------------------------------------------------|-------------------------------------------------------------------------------|
| `backend`                          | every push / PR                                             | Backend install → Prisma generate → DB push → unit tests → integration tests → build |
| `frontend`                         | every push / PR                                             | Frontend install → component tests → build                                    |
| `docker-build`                     | PRs into dev/stage/main + pushes to those                   | `docker compose config` for both files, then builds both images               |
| `staging-deployment`               | push to `stage`                                             | Placeholder deploy step (skips safely if `STAGING_DEPLOY_HOST` is missing)    |
| `staging-health-check`             | push to `stage`                                             | Polls `${STAGING_API_URL}/health` until 200 (skips with warning if unset)     |
| `production-deployment-placeholder`| push to `main`                                              | Placeholder for prod deploy (skips silently if `PROD_DEPLOY_HOST` is missing) |

## Postgres in CI

The `backend` job spins up a `postgres:16-alpine` service container and runs both unit tests (don't touch the DB) and the integration suite (which exercises every endpoint, including `/health` and the profiles CRUD).

## Secrets

| Secret                | Used by                | Purpose                                  |
|-----------------------|------------------------|------------------------------------------|
| `STAGING_DEPLOY_HOST` | `staging-deployment`   | SSH host / platform identifier            |
| `STAGING_API_URL`     | `staging-health-check` | Public URL the health probe pings         |
| `PROD_DEPLOY_HOST`    | `production-deployment-placeholder` | SSH host / platform identifier |

If any of these are missing, the corresponding step prints a warning/notice and exits 0 — the pipeline does **not** fail just because deployment isn't configured yet (per the assignment rules).

## Stage names (graded)

The pipeline uses the named stages required by the brief:

- Backend install
- Backend unit tests
- Backend integration tests
- Backend build
- Frontend install
- Frontend component tests
- Frontend build
- Docker build validation
- Staging deployment
- Staging health check
- Production deployment placeholder
