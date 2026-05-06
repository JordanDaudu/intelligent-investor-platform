<p align="center">
  <img src="docs/assets/Intelligent-Investor-Banner.png" alt="Intelligent Investor Platform banner" width="100%" />
</p>

# Intelligent Investor Platform

A full-stack DevOps final assignment that helps users plan their monthly cash flow with the **Common Sense Spending** strategy and visualize a 15-year compound-growth projection on the active-investments slice.

The project is intentionally heavy on DevOps practices — Docker, Git Flow, CI/CD, automated tests, health checks, environment variables, and documentation — because that's what the assignment is graded on.

> **Banner note:** place the README hero image at `docs/assets/readme-hero.png`.

## Quick links

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Calculation formulas](#calculation-formulas)
- [API endpoints](#api-endpoints)
- [Environment variables](#environment-variables)
- [Run with Docker](#universal-docker-run-options)
- [Run tests locally](#running-tests-locally)
- [CI/CD](#cicd)
- [Git Flow Strategy](#git-flow-strategy)

---

## Features

- Enter name, gross salary, and bank net (or auto-estimate bank net as `gross × 0.68`).
- Live calculation of the four buckets (55 / 10 / 10 / 27.5 % of bank net).
- 15-year wealth projection chart using Recharts and the formula `Investment × (1 + 0.07)^n`.
- Save profiles to PostgreSQL via the API; reload them across browser sessions.
- DevOps health-status card calling `GET /health` (backend + database) plus the build-time environment label.
- Dark/light mode toggle, persisted in `localStorage`.
- Optional **Scenario Lab** — sliders for return rate / horizon / investment amount override (same single-amount formula as the required chart).
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

### Investment Projection (required + optional scenario)

Uses the single-amount compound formula for years 1 through the selected horizon:

```
value(n) = investmentAmount × (1 + annualReturn)^n
```

Default settings match the **required assignment projection**:
- `annualReturn = 7%`
- `years = 15`
- `investmentAmount = Active Investments bucket`

When at default settings the chart shows an **"Assignment Default"** badge. Moving the sliders enters optional **"Scenario Mode"**, and a "Reset to assignment default" button restores the defaults. The chart calculation runs locally in the browser (same formula as the backend).

### Extra-credit monthly contribution projection

Uses the future value of recurring monthly contributions (annuity formula):

```
FV(y) = monthlyContribution × ((1 + r/12)^(y×12) − 1) / (r/12)
```

This assumes the Active Investments amount is contributed **every month**. With $68/month at 7% over 15 years, the projected value is approximately **$21,553** — far larger than the required single-amount projection (~$188). The backend endpoint `POST /api/calculations/monthly-contribution-projection` powers this chart; sliders for annual return and time horizon pass their values directly to the API.

---

## API endpoints

Swagger/OpenAPI documentation is available locally at `http://localhost:8000/api/docs` after the backend is running.

| Method | Path                                                | Purpose                                             |
|--------|-----------------------------------------------------|-----------------------------------------------------|
| GET    | `/health`                                           | 200 only when backend + DB are reachable            |
| POST   | `/api/calculations/preview`                         | Stateless buckets + 15-year projection              |
| POST   | `/api/calculations/monthly-contribution-projection` | Extra-credit: future value of monthly contributions |
| POST   | `/api/profiles`                                     | Save profile + computed plan                        |
| GET    | `/api/profiles`                                     | List all saved profiles                             |
| GET    | `/api/profiles/:id`                                 | Get one saved profile                               |
| DELETE | `/api/profiles/:id`                                 | Delete a profile (cascades into spending plan)      |

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
| `FRONTEND_PORT`      | `5173`                                           | Host port the SPA is served on           |
| `VITE_API_BASE_URL`  | `http://localhost:8000`                                                              | Public API base URL the frontend calls   |
| `NODE_ENV`           | `development`                                                                         | Backend runtime mode (validation, logs)  |

CI uses a service container Postgres and reads matching env vars; production uses GitHub Actions secrets. **Never commit `.env`** — only `.env.example`.

---

## Universal Docker Run Options

This project can be run on any machine that has Docker installed, including macOS, Windows, and Linux.

The project supports two Docker-based run modes:

1. **Run from published Docker Hub images** — best for demos, grading, and running on another computer without building the source code.
2. **Run from source code** — best for development, testing, and making changes locally.

---

## Option 1: Run from Published Docker Hub Images

This option does **not** require cloning or building the full project source code.

It pulls the already-published multi-architecture Docker images from Docker Hub.

The published images support:

```text
linux/amd64
linux/arm64
```

This means they can run on most Windows/Linux PCs and Apple Silicon Macs.

### 1. Create a project folder

macOS/Linux/Git Bash:

```bash
mkdir intelligent-investor
cd intelligent-investor
```

Windows PowerShell:

```powershell
mkdir intelligent-investor
cd intelligent-investor
```

### 2. Create `docker-compose.yml`

Create a file named:

```text
docker-compose.yml
```

Paste the following content into it:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: investor_user
      POSTGRES_PASSWORD: investor_password
      POSTGRES_DB: investor_db
    ports:
      - "5432:5432"
    volumes:
      - intelligent_investor_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U investor_user -d investor_db"]
      interval: 10s
      timeout: 5s
      retries: 6

  backend:
    image: jordandaudu/intelligent-investor-backend:v1.0.0
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      BACKEND_PORT: 8000
      BACKEND_HOST: 0.0.0.0
      DATABASE_URL: postgresql://investor_user:investor_password@postgres:5432/investor_db
    ports:
      - "8000:8000"

  frontend:
    image: jordandaudu/intelligent-investor-frontend:v1.0.0
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_started
    ports:
      - "5173:80"

volumes:
  intelligent_investor_postgres_data:
    name: intelligent_investor_postgres_data
```

### 3. Pull and start the application

macOS/Linux/Git Bash:

```bash
docker compose pull
docker compose up -d
```

Windows PowerShell:

```powershell
docker compose pull
docker compose up -d
```

### 4. Check that the containers are running

```bash
docker compose ps
```

Expected services:

```text
postgres
backend
frontend
```

### 5. Verify backend health

macOS/Linux/Git Bash:

```bash
curl http://localhost:8000/health
```

Windows PowerShell:

```powershell
curl.exe http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

### 6. Open the app

Open this URL in your browser:

```text
http://localhost:5173
```

Useful URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
Health:   http://localhost:8000/health
Swagger:  http://localhost:8000/api/docs
```

---

## Option 2: Run from Source Code

This option builds the backend and frontend Docker images locally from the repository source code.

Use this option if you want to inspect the code, modify the project, run tests, or rebuild the application yourself.

### 1. Clone the repository

```bash
git clone https://github.com/JordanDaudu/intelligent-investor-platform.git
cd intelligent-investor-platform
```

### 2. Create the local environment file

macOS/Linux/Git Bash:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

If `.env.example` is not available, create a `.env` file in the project root with:

```env
POSTGRES_USER=investor_user
POSTGRES_PASSWORD=investor_password
POSTGRES_DB=investor_db
POSTGRES_PORT=5432

DATABASE_URL=postgresql://investor_user:investor_password@postgres:5432/investor_db

NODE_ENV=development
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0

FRONTEND_PORT=5173
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Build and start the full stack

```bash
docker compose up -d --build
```

This starts:

```text
PostgreSQL database container
NestJS backend container
React frontend container
```

### 4. Check container status

```bash
docker compose ps
```

### 5. Verify backend health

macOS/Linux/Git Bash:

```bash
curl http://localhost:8000/health
```

Windows PowerShell:

```powershell
curl.exe http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

### 6. Open the app

Open this URL in your browser:

```text
http://localhost:5173
```

---

## Running Tests Locally

Run the full local test suite with the helper script:

```bash
./scripts/run-tests.sh
```

Or run each layer manually:

```bash
# Backend unit + integration tests
cd backend
npm install
npm run test
npm run test:e2e

# Frontend component tests
cd ../frontend
npm install
npm run test

# Cypress end-to-end tests
npm run cypress:run
```

The CI pipeline runs these tests automatically on pushes and pull requests.

---

## Stopping the Application

Stop the containers while keeping the database data:

```bash
docker compose down
```

Stop the containers and delete the local database volume:

```bash
docker compose down -v
```

Use `down -v` only when you want to reset all saved financial profiles and database data.

---

## Database Persistence

The PostgreSQL database runs inside Docker and uses a named Docker volume:

```text
intelligent_investor_postgres_data
```

This allows profile data to persist even if the containers are stopped and restarted.

---

## Common Port Issue

If port `5432` is already used on your machine, change the PostgreSQL port mapping.

Change this:

```yaml
ports:
  - "5432:5432"
```

To this:

```yaml
ports:
  - "5433:5432"
```

Do **not** change the backend `DATABASE_URL`.

The backend still connects to PostgreSQL inside Docker using:

```text
postgres:5432
```

The changed host port only affects access from your local computer.

---

## Published Docker Images

Backend:

```text
jordandaudu/intelligent-investor-backend:v1.0.0
jordandaudu/intelligent-investor-backend:latest
```

Frontend:

```text
jordandaudu/intelligent-investor-frontend:v1.0.0
jordandaudu/intelligent-investor-frontend:latest
```

Supported architectures:

```text
linux/amd64
linux/arm64
```

---

## Production Deployment Note

The published frontend image currently points to:

```text
http://localhost:8000
```

This is correct for local usage on macOS, Windows, or Linux.

For a real public server deployment, rebuild the frontend image with the server's public backend URL:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VITE_API_BASE_URL=http://YOUR_SERVER_IP_OR_DOMAIN:8000 \
  --provenance=false \
  -t jordandaudu/intelligent-investor-frontend:prod \
  --push \
  ./frontend
```

---

## Database Backup and Restore

The project uses PostgreSQL inside Docker with a named Docker volume:

```text
intelligent_investor_postgres_data
```

This gives the application local database persistence across container restarts, but it is not the same as a backup.

Persistence means the data survives when containers are stopped and started again.

Backup means the data is exported to a file that can be copied, stored safely, or restored later.

---

## Create a Database Backup

Make sure the Docker stack is running first.

If you are running from published Docker Hub images:

```bash
docker compose -f docker-compose.images.yml up -d
```

If you are running from source code:

```bash
docker compose up -d
```

Then run:

```bash
./scripts/backup-db.sh
```

The script creates a timestamped SQL backup file inside the `backups/` directory.

Example output:

```text
backups/intelligent-investor-investor_db-2026-05-03_18-30-00.sql
```

The backup is created using `pg_dump` from inside the PostgreSQL Docker container.

---

## Restore a Database Backup

Make sure the Docker stack is running first.

If you are running from published Docker Hub images:

```bash
docker compose -f docker-compose.images.yml up -d
```

If you are running from source code:

```bash
docker compose up -d
```

Then restore a backup file:

```bash
./scripts/restore-db.sh backups/intelligent-investor-investor_db-YYYY-MM-DD_HH-MM-SS.sql
```

The restore script asks for confirmation before applying the backup.

To continue, type:

```text
RESTORE
```

This safety step prevents accidentally overwriting local database data.

---

## Using a Different Compose File

By default, the backup and restore scripts use:

```text
docker-compose.images.yml
```

If that file does not exist, they fall back to:

```text
docker-compose.yml
```

You can also explicitly choose which Compose file to use.

Backup using the source-based Compose file:

```bash
COMPOSE_FILE=docker-compose.yml ./scripts/backup-db.sh
```

Restore using the source-based Compose file:

```bash
COMPOSE_FILE=docker-compose.yml ./scripts/restore-db.sh backups/your-backup-file.sql
```

Backup using the image-based Compose file:

```bash
COMPOSE_FILE=docker-compose.images.yml ./scripts/backup-db.sh
```

Restore using the image-based Compose file:

```bash
COMPOSE_FILE=docker-compose.images.yml ./scripts/restore-db.sh backups/your-backup-file.sql
```

---

## Backup Script Configuration

The scripts support environment variable overrides.

Default values:

```text
COMPOSE_FILE=docker-compose.images.yml
DB_SERVICE=postgres
POSTGRES_USER=investor_user
POSTGRES_DB=investor_db
BACKUP_DIR=backups
```

Example: save backups to a different folder:

```bash
BACKUP_DIR=database-backups ./scripts/backup-db.sh
```

Example: use a different Docker Compose service name:

```bash
DB_SERVICE=postgres ./scripts/backup-db.sh
```

---

## Important Notes

- The `backups/` directory is ignored by Git.
- Backup files may contain real user/profile data.
- Do not commit backup files to GitHub.
- `docker compose down` stops the containers but keeps the database volume.
- `docker compose down -v` deletes the database volume and all local database data.
- These scripts back up the local Docker PostgreSQL database only.
- Each computer has its own Docker volume and therefore its own local database unless configured to use a shared remote database.

---

## Local Database vs Shared Database

The Docker images are universal and can run on any machine, but the local PostgreSQL database is not automatically shared between machines.

For example:

```text
MacBook Docker volume  !=  Windows PC Docker volume
```

If you run the project on two different computers, each one creates its own local PostgreSQL volume:

```text
intelligent_investor_postgres_data
```

The volume name may be the same, but the data is stored separately on each machine.

To move data manually between machines:

1. Create a backup on the first machine.
2. Copy the `.sql` backup file to the second machine.
3. Restore the backup on the second machine.

For real shared data across multiple computers, use a centralized PostgreSQL database such as Neon, Supabase, Railway, Render PostgreSQL, or another managed PostgreSQL provider.

---

## CI/CD

Pipeline file: `.github/workflows/ci.yml`. Stages:

1. **Backend install** → **Backend unit tests** → **Backend integration tests** → **Backend build**
2. **Frontend install** → **Frontend component tests** → **Frontend build**
3. **Docker build validation** (PRs into dev/stage/main and pushes to those)
4. **Cypress E2E** — Docker Compose stack + `/health` wait + `cypress run` + teardown (same trigger as Docker validation)
5. **Staging deployment** + **Staging health check** (push to `stage`)
6. **Production deployment placeholder** (push to `main`)

Deploy jobs are conditional on real secrets (`STAGING_DEPLOY_HOST`, `STAGING_API_URL`, `PROD_DEPLOY_HOST`). Without them, the pipeline still passes — perfect for a graded scaffold.

See `docs/ci-cd.md` for full details.

### Staging deployment

On push to `stage`, CI runs `staging-deployment` (a placeholder) and then `staging-health-check`, which polls `${STAGING_API_URL}/health` until it returns 200 (or warns and exits if the URL secret isn't set). Wire `scripts/deploy-staging.sh` to your real hosting provider when ready.

### How to trigger deployment

Deployment is branch-driven through GitHub Actions:

```bash
# feature work starts from dev
git checkout dev
git checkout -b feature/my-change

# after review, merge feature/* into dev
# after dev is stable, open a PR from dev into stage
# merging into stage triggers the staging deployment job
# merging stage into main triggers the production deployment placeholder
```

Required deployment secrets are documented in `docs/ci-cd.md`.

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
