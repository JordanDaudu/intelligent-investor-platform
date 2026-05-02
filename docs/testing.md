# Testing

## Backend — Jest

Two suites:

- **Unit tests** — `backend/src/**/*.spec.ts`. Pure-function tests on `CalculationsService`. Run with:

  ```bash
  npm --prefix backend test
  ```

  Covers `estimateBankNet`, `calculateFixedCosts`, `calculateSavingsGoals`, `calculateActiveInvestments`, `calculateGuiltFreeSpending`, `calculateWealthProjection`, and `calculateFullPlan`.

- **Integration tests** — `backend/test/app.e2e-spec.ts`. Boots the full Nest application with the real Prisma client + Postgres and hits every endpoint via Supertest:

  ```bash
  npm --prefix backend run test:e2e
  ```

  Requires a reachable `DATABASE_URL`. Runs `prisma db push` against an empty DB locally; in CI, a `postgres:16-alpine` service container is used.

## Frontend — Vitest + React Testing Library

```bash
npm --prefix frontend test
```

`SalaryForm.test.tsx` mounts `<DashboardPage>`, types into the bank-net field, and asserts that all four bucket amounts update (`$7,480.00`, `$1,360.00`, `$1,360.00`, `$3,740.00`). The test mocks `investorApi.listProfiles` and `investorApi.health` so it doesn't need a live backend.

## E2E — Cypress

```bash
# Start the full stack first
docker compose up --build

# In another shell
npm --prefix frontend run cypress:run    # headless
# or
npm --prefix frontend run cypress:open   # interactive
```

`cypress/e2e/intelligent-investor.cy.ts` enters values, asserts buckets and chart appear, saves a profile, reloads, and confirms the saved profile is still listed.

## One-shot helper

```bash
./scripts/run-tests.sh           # backend unit + frontend component
./scripts/run-tests.sh --e2e     # also runs backend integration tests
```
