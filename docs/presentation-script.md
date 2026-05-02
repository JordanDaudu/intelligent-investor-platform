# Presentation / demo script (~10 min)

## 1. Pitch (30s)

> "Intelligent Investor takes your monthly salary, splits it across the four Common Sense Spending buckets, and projects 15 years of compound growth on the active-investments slice. It's a real full-stack DevOps project with Docker, CI/CD, automated tests, and a health-check endpoint."

## 2. Live walkthrough (3 min)

1. Open the app in the browser.
2. Type a name and a gross salary (e.g. `20000`).
3. Click **Estimate (×0.68)** → bank-net auto-fills to `13600`.
4. Point at the four bucket cards: `$7,480 / $1,360 / $1,360 / $3,740`.
5. Scroll to the **15-year projection** chart — show that it goes up exponentially (compound).
6. Click **Save profile** → it appears in **Saved profiles**.
7. Hit refresh in the browser → the profile is still there (proves DB persistence).
8. Toggle dark mode → it sticks across reload (proves localStorage persistence).
9. Wiggle the **Scenario Lab** sliders → second chart updates live; required chart above is unchanged.

## 3. DevOps tour (4 min)

### Docker

```bash
docker compose ps
docker compose config | head -30
docker volume ls | grep intelligent_investor_postgres_data
```

Talk through:
- Three services: postgres, backend, frontend.
- Named volume keeps DB data across restarts.
- `depends_on` + healthchecks ensure the right startup order.

### Health check

```bash
curl -s http://localhost:8000/health | jq .
```

Show that it returns `{ "status": "ok", "database": "connected", ... }`. Then in another terminal:

```bash
docker compose stop postgres
curl -i http://localhost:8000/health     # 503, database: disconnected
docker compose start postgres
```

### Tests

```bash
./scripts/run-tests.sh
npm --prefix backend run test:e2e
```

Highlight: unit tests are deterministic and fast; integration tests exercise every endpoint against a real Postgres.

### CI/CD

Open `.github/workflows/ci.yml` in the IDE. Walk through:
- Backend job (with the Postgres service container).
- Frontend job.
- Docker build validation job.
- Staging deploy + health check.
- Production placeholder (extra credit).

### Git Flow

Show `docs/git-flow.md` and a sample PR (base: `dev`, compare: `feature/project-scaffold`).

## 4. Scaling chat (2 min)

- Frontend → CDN.
- Backend → multiple stateless replicas behind a LB; `/health` drives orchestrator probes.
- Database → vertical first, then read replicas; Prisma supports a separate read URL.
- See `docs/deployment.md` for the full write-up.

## 5. Q & A
