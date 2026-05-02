# Intelligent Investor Platform

A full-stack DevOps final assignment that helps users plan their monthly cash flow with the **Common Sense Spending** strategy and visualize a 15-year compound-growth projection on the active-investments slice.

The project is intentionally heavy on DevOps practices — Docker, Git Flow, CI/CD, automated tests, health checks, environment variables, and documentation — because that's what the assignment is graded on.

---

## Features

- Enter name, gross salary, and bank net (or auto-estimate bank net as `gross × 0.68`).
- Live calculation of the four buckets (55 / 10 / 10 / 27.5 % of bank net).
- 15-year wealth projection chart using Recharts and the formula `Investment × (1 + 0.07)^n`.
- Save profiles to PostgreSQL via the API; reload them across browser sessions.
- DevOps health-status card calling `GET /health` (backend + database) plus the build-time environment label.
- Dark/light mode toggle, persisted in `localStorage`.
- Optional **Scenario Lab** — sliders for return rate / horizon / monthly investment override.
- Cypress E2E + Vitest component tests + Jest unit and integration tests.

---

## Tech stack

| Layer    | Tech                                                                 |
|----------|----------------------------------------------------------------------|
| Frontend | React 18, TypeScript, Vite, Recharts, Vitest + RTL, Cypress         |
| Backend  | NestJS 10, TypeScript, Prisma 5, class-validator, Jest + Supertest  |
| Database | PostgreSQL 16 (named Docker volume `intelligent_investor_postgres_data`) |
| DevOps   | Docker + Docker Compose, GitHub Actions, Bash scripts                |

---

## Architecture

```
┌──────────────┐   HTTP    ┌──────────────┐   Prisma   ┌──────────────┐
│  React + Vite │ ───────▶ │  NestJS API   │ ────────▶ │  PostgreSQL   │
│   (port 80)   │          │  (port 8000)  │           │  (port 5432)  │
└──────────────┘          └──────────────┘            └──────────────┘
        ▲                          │                         ▲
        │                          ▼                         │
        │                  ┌──────────────┐                  │
        └─── /health ──────│  Health      │── ping ──────────┘
                           │  module      │
                           └──────────────┘
```

The backend follows clean architecture: **Controller → Service → Prisma**. All financial formulas live inside `CalculationsService`; controllers contain zero math.

See `docs/architecture.md` for the full diagram and data flow.

---

## Project structure

```
.
├── backend/                  NestJS + Prisma backend
│   ├── prisma/schema.prisma  Postgres schema
│   ├── src/
│   │   ├── calculations/     Pure financial formulas (unit tested)
│   │   ├── profiles/         Persisted profiles + spending plans
│   │   ├── health/           DB-aware /health endpoint
│   │   ├── prisma/           Prisma module + service (singleton)
│   │   └── config/           Env validation
│   └── test/                 Supertest e2e suite
├── frontend/                 React + Vite frontend
│   ├── src/
│   │   ├── api/              Typed fetch wrapper
│   │   ├── components/       Layout, SalaryForm, BucketCard, etc.
│   │   ├── pages/            DashboardPage
│   │   └── tests/            Vitest + RTL setup and tests
│   └── cypress/e2e/          Cypress happy-path test
├── docs/                     Architecture, DB, Docker, CI/CD, deployment, testing, Git Flow, demo script
├── scripts/                  setup-dev / run-tests / health-check / deploy-staging
├── .github/workflows/ci.yml  Pipeline
├── docker-compose.yml        Local stack (postgres + backend + frontend)
├── docker-compose.prod.yml   Production-ready compose example
├── .env.example              Documents every env var
└── .gitignore
```

---

## Calculation formulas

All bucket math is based on **bank net (take-home)**, not gross salary.

| Bucket               | Formula                |
|----------------------|------------------------|
| Fixed Costs          | `bankNet × 0.55`       |
| Savings Goals        | `bankNet × 0.10`       |
| Active Investments   | `bankNet × 0.10`       |
| Guilt-Free Spending  | `bankNet × 0.275`      |

Bank-net estimator: `bankNet = grossSalary × 0.68`.

Required 15-year projection (one point per year, n = 1..15):

```
value(n) = activeInvestments × (1 + 0.07)^n
```

The Scenario Lab can vary the rate and horizon, but **does not replace** the required default chart.

---

## API endpoints

| Method | Path                          | Purpose                                       |
|--------|-------------------------------|-----------------------------------------------|
| GET    | `/health`                     | 200 only when backend + DB are reachable      |
| POST   | `/api/calculations/preview`   | Stateless buckets + 15-year projection        |
| POST   | `/api/profiles`               | Save profile + computed plan                  |
| GET    | `/api/profiles`               | List all saved profiles                       |
| GET    | `/api/profiles/:id`           | Get one saved profile                         |
| DELETE | `/api/profiles/:id`           | Delete a profile (cascades into spending plan) |

`POST /api/calculations/preview` example:

```jsonc
// request
{ "grossSalary": 20000, "bankNet": 13600 }

// response
{
  "grossSalary": 20000,
  "bankNet": 13600,
  "buckets": {
    "fixedCosts": 7480,
    "savingsGoals": 1360,
    "activeInvestments": 1360,
    "guiltFreeSpending": 3740
  },
  "projection": [
    { "year": 1, "value": 1455.2 },
    { "year": 2, "value": 1557.06 }
    /* ... 15 entries total ... */
  ],
  "annualReturnRate": 0.07,
  "projectionYears": 15
}
```

---

## Environment variables

Copy `.env.example` → `.env` and adjust values as needed.

| Variable             | Default                                                                              | Purpose                                  |
|----------------------|--------------------------------------------------------------------------------------|------------------------------------------|
| `POSTGRES_USER`      | `investor_user`                                                                      | Postgres role                            |
| `POSTGRES_PASSWORD`  | `investor_password`                                                                  | Postgres password                        |
| `POSTGRES_DB`        | `investor_db`                                                                        | Database name                            |
| `POSTGRES_PORT`      | `5432`                                                                                | Host port for the Postgres container     |
| `DATABASE_URL`       | `postgresql://investor_user:investor_password@postgres:5432/investor_db`             | Backend Prisma connection URL            |
| `BACKEND_PORT`       | `8000`                                                                                | NestJS HTTP port                         |
| `FRONTEND_PORT`      | `5000` (Replit dev) / `5173` (local Docker)                                           | Host port the SPA is served on           |
| `VITE_API_BASE_URL`  | `http://localhost:8000`                                                              | Public API base URL the frontend calls   |
| `NODE_ENV`           | `development`                                                                         | Backend runtime mode (validation, logs)  |

CI uses a service container Postgres and reads matching env vars; production uses GitHub Actions secrets. **Never commit `.env`** — only `.env.example`.

---

## Run locally with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- Frontend → <http://localhost:5000> on Replit, or <http://localhost:5173> when running via local `docker compose up`
- Backend  → <http://localhost:8000/health>

Stop with `docker compose down`. Database state is preserved in the named volume `intelligent_investor_postgres_data` — wipe with `docker volume rm intelligent_investor_postgres_data`.

### First run on Replit

1. Open the project on Replit — both the **Backend** (port 8000) and **Frontend** (port 5000) workflows auto-start.
2. The platform automatically provisions a managed PostgreSQL database and exposes it as `DATABASE_URL` in the environment. If it isn't there yet, click **+ Database** in the sidebar to create one.
3. From the shell, run the one-time schema setup:
   ```bash
   cd backend && npx prisma migrate deploy
   ```
4. The frontend is visible in the preview pane. The Vite dev server proxies `/api` and `/health` to the backend on `127.0.0.1:8000`, so no extra config is needed.

### Run without Docker

```bash
./scripts/setup-dev.sh           # installs deps + generates Prisma client
npm --prefix backend run start:dev   # in one shell
npm --prefix frontend run dev        # in another shell
```

You'll need a Postgres reachable at `DATABASE_URL` (Replit users get one for free via `createDatabase()`).

---

## Run the tests

```bash
# Backend unit tests (CalculationsService etc.)
npm --prefix backend test

# Backend integration tests (requires DATABASE_URL)
npm --prefix backend run test:e2e

# Frontend component tests (Vitest + RTL)
npm --prefix frontend test

# Cypress E2E (requires the full stack running)
npm --prefix frontend run cypress:run

# All-in-one helper
./scripts/run-tests.sh             # unit + component
./scripts/run-tests.sh --e2e       # adds backend integration tests
```

---

## CI/CD

Pipeline file: `.github/workflows/ci.yml`. Stages:

1. **Backend install** → **Backend unit tests** → **Backend integration tests** → **Backend build**
2. **Frontend install** → **Frontend component tests** → **Frontend build**
3. **Docker build validation** (PRs into dev/stage/main and pushes to those)
4. **Staging deployment** + **Staging health check** (push to `stage`)
5. **Production deployment placeholder** (push to `main`)

Deploy jobs are conditional on real secrets (`STAGING_DEPLOY_HOST`, `STAGING_API_URL`, `PROD_DEPLOY_HOST`). Without them, the pipeline still passes — perfect for a graded scaffold.

See `docs/ci-cd.md` for full details.

### Staging deployment

On push to `stage`, CI runs `staging-deployment` (a placeholder) and then `staging-health-check`, which polls `${STAGING_API_URL}/health` until it returns 200 (or warns and exits if the URL secret isn't set). Wire `scripts/deploy-staging.sh` to your real hosting provider when ready.

---

## Database volume

The Postgres container persists to a **named** Docker volume:

```yaml
volumes:
  intelligent_investor_postgres_data:
    name: intelligent_investor_postgres_data
```

Named volumes survive `docker compose down`. Remove with `docker volume rm intelligent_investor_postgres_data`.

---

## Health check

`GET /health` performs a real `SELECT 1` against PostgreSQL via Prisma and returns 200 only when the database is reachable:

```json
{ "status": "ok", "database": "connected" }
```

The frontend's "DevOps health" card polls this endpoint every 15 seconds and shows backend and database status. The environment label on the card is derived from the build-time Vite mode (`import.meta.env.MODE`), keeping the API contract minimal.

---

## Git Flow Strategy

This project follows Git Flow:

- `main` contains production-ready code only.
- `stage` is the pre-production integration branch.
- `dev` is the active development integration branch.
- `feature/*` branches are used for individual features.

All work starts from `dev` using a `feature/*` branch.
Feature branches are merged into `dev` through pull requests.
When `dev` is stable, it is merged into `stage` through a pull request.
When staging is verified, `stage` is merged into `main` through a pull request.

All pull requests into `dev`, `stage`, and `main` require at least one review comment.

Full developer workflow + commands → `docs/git-flow.md`.

---

## Scaling notes

- **Stateless backend** — multiple replicas can sit behind a load balancer; the only stateful component is Postgres.
- **Postgres** can be scaled vertically first, then horizontally with read replicas (Prisma supports a separate read URL).
- **Frontend** is static — serve from a CDN (CloudFront, Fastly, etc.) by uploading `frontend/dist/`.
- **Health checks** drive orchestrator decisions (Kubernetes `livenessProbe`/`readinessProbe`, ECS health checks, etc.) — point them at `/health`.
- See `docs/deployment.md` for the full scaling write-up.

---

## Presentation / demo guide

A concise walkthrough script lives in `docs/presentation-script.md`. It covers entering a salary, viewing the buckets, the 15-year projection, saving + reloading, the Docker stack, the `/health` endpoint, the test suites, the CI pipeline, the Git Flow, and scaling.

---

## License

MIT — for educational purposes (final assignment).
