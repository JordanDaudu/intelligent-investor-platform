# Testing

## Backend — Jest

Two suites:

- **Unit tests** — `backend/src/**/*.spec.ts`. Run with:

  ```bash
  npm --prefix backend test
  # or with coverage + threshold enforcement:
  npm --prefix backend run test:cov
  ```

  Suites:
  - `calculations/calculations.service.spec.ts` — pure formulas (`estimateBankNet`, four bucket calculators, `calculateWealthProjection`, `calculateFullPlan`, `calculateMonthlyContributionProjection`).
  - `calculations/calculations.controller.spec.ts` — controller delegates `/preview` and `/monthly-contribution-projection` to the service, including currency forwarding/echoing.
  - `profiles/profiles.service.spec.ts` — Prisma create/findAll/findOne/remove flows with mocked Prisma; covers P2025 → 404 mapping, malformed projection-data filtering, and currency persistence (default + explicit + response surface).
  - `profiles/profiles.controller.spec.ts` — service delegation.
  - `currencies/currencies.service.spec.ts` — rate table pinned, `convert()` round-trip + cross-rate, unsupported-currency rejection, non-finite-amount rejection.
  - `currencies/currencies.controller.spec.ts` — `GET /api/currencies` shape and immutability of the supported list.

  Coverage thresholds (90/90/90/80 — statements/lines/functions/branches) are enforced in `backend/package.json` against `calculations`, `profiles`, and `currencies` source files.

- **Integration tests** — `backend/test/app.e2e-spec.ts`. Boots the full Nest application with the real Prisma client + Postgres and hits every endpoint via Supertest:

  ```bash
  npm --prefix backend run test:e2e
  ```

  Requires a reachable `DATABASE_URL`. Runs `prisma db push` against an empty DB locally; in CI, a `postgres:16-alpine` service container is used. Covers `/health`, `/api/calculations/preview` (incl. percentage and currency overrides + 400 validation), `/api/calculations/monthly-contribution-projection`, profile CRUD, `GET /api/currencies`, and currency persistence on profiles (default ILS, explicit EUR/GBP round-trip, unsupported code rejected with 400).

## Frontend — Vitest + React Testing Library

```bash
npm --prefix frontend test
```

Suites:

- `tests/SalaryForm.test.tsx` — mounts `<CurrencyProvider><CurrencySelector /><DashboardPage /></CurrencyProvider>`, types into the bank-net field, and uses `waitFor` to assert the four bucket amounts (in default ILS, the values are `7,480.00 / 1,360.00 / 1,360.00 / 3,740.00` with the active currency symbol — assertions pull the symbol via `Intl.NumberFormat` so they're stable across `narrowSymbol` vs. fallback). Also covers the Investment Projection scenario badge, Monthly Contribution Projection rendering, Allocation Controls totals, and **currency-switch UX**: switching to USD converts a typed `13600` to `3675.68` and re-renders bucket cards with `$`.
- `tests/investorApi.test.ts` — covers the typed fetch wrapper: URL paths, JSON body shape, error mapping (backend message vs. generic fallback), `204 No Content`, `fetch` rejection propagation, plus the `currencies()` endpoint and the optional `currency` field on `preview()` and `createProfile()`.
- `tests/CurrencyContext.test.tsx` — provider defaults to ILS, `format` switches symbol with active currency, `convert` round-trips and cross-rates correctly, and falls back to hardcoded rates when `/api/currencies` rejects.
- `tests/CurrencySelector.test.tsx` — dropdown renders the 4 supported codes, defaults to ILS, fires `onAfterChange(prev, next)` on change, and skips the callback for no-op selections.

All suites mock `investorApi.preview / listProfiles / health / currencies / monthlyContributionProjection` so they don't need a live backend.

## E2E — Cypress

```bash
# Start the full stack first
docker compose up --build

# In another shell
npm --prefix frontend run cypress:run    # headless
# or
npm --prefix frontend run cypress:open   # interactive
```

`cypress/e2e/intelligent-investor.cy.ts` enters values, asserts buckets and chart appear, saves a profile, reloads, and confirms the saved profile is still listed. It also covers the **currency selector**: confirms the default-ILS state and four available codes, switches to USD, observes typed values converting and bucket cards re-rendering with `$`, then saves + reloads to verify persistence.

The `cypress-e2e` CI job runs this suite automatically on every PR into `dev`, `stage`, or `main` and on direct pushes to those branches. It spins up the full stack with `docker compose up -d --build`, polls `http://localhost:8000/health` in a 30 × 5 s loop until the backend is ready, then runs `cypress run` with `CYPRESS_BASE_URL=http://localhost:5173`. Docker Compose is always torn down with `docker compose down -v` even if Cypress fails.

## One-shot helper

```bash
./scripts/run-tests.sh           # backend unit + frontend component
./scripts/run-tests.sh --e2e     # also runs backend integration tests
```
