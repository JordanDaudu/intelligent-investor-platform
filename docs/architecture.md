# Architecture

## High-level diagram

```
┌──────────────────────┐                  ┌──────────────────────┐
│  Browser              │  HTTP / JSON    │  NestJS backend       │
│  React + Vite + Recharts │ ─────────────▶ │  (controllers →       │
│  (served by nginx in   │ ◀───────────── │   services → Prisma) │
│   the frontend container) │              │                      │
└──────────────────────┘                  └─────────┬────────────┘
                                                    │ Prisma
                                                    ▼
                                          ┌──────────────────────┐
                                          │  PostgreSQL 16        │
                                          │  (named volume:       │
                                          │   intelligent_investor_postgres_data) │
                                          └──────────────────────┘
```

## Module map (backend)

```
AppModule
├── ConfigModule (env validation)
├── PrismaModule (global) → PrismaService (PrismaClient + ping())
├── HealthModule          → HealthController (probes PrismaService)
├── CalculationsModule    → CalculationsService (pure formulas)
│                        → CalculationsController (preview endpoint)
├── ProfilesModule        → ProfilesService (uses CalculationsService + PrismaService)
│                        → ProfilesController (REST CRUD)
└── CurrenciesModule      → CurrenciesService (rate table + convert helper)
                         → CurrenciesController (GET /api/currencies)
```

### Why this shape

- **Pure formulas in a service.** All math (`estimateBankNet`, four buckets, `calculateWealthProjection`, `calculateFullPlan`) lives in `CalculationsService`. Controllers never compute anything — they validate the DTO and delegate. That makes the formulas easy to unit-test in isolation and impossible to accidentally diverge between the preview and persisted-profile flows.
- **Health checks talk to the DB.** `HealthController` calls `PrismaService.ping()` which runs `SELECT 1`. Only a successful round-trip returns HTTP 200; any failure returns 503 with `{ status: "error", database: "disconnected" }`. Orchestrators (Kubernetes, ECS, the GitHub Actions staging job) can wire `/health` directly into their probes.
- **Profiles auto-compute their plan.** When a profile is created, `ProfilesService` calls `CalculationsService.calculateFullPlan(...)` and persists the buckets + JSON projection alongside it (`SpendingPlan` row). Reading a profile returns both — the frontend never has to recompute server data.
- **Currency is metadata, not math.** `CurrenciesService` owns a static ILS-anchored rate table (`{ ILS:1, USD:3.7, EUR:4.0, GBP:4.7 }`) plus a `convert()` helper. Calculation endpoints accept an optional `currency` field and just echo it back; bucket math is unit-invariant so storage stays in the profile's own currency. Profiles persist the currency as a column. The frontend caches the rate table from `GET /api/currencies` and handles all display conversion locally.

## Frontend component tree

```
<App>
 └─ <CurrencyProvider>            (active currency + cached rates from /api/currencies)
     ├─ <Layout>                  (sticky header + brand + currency/theme controls)
     │   ├─ <CurrencySelector>    (top-right ILS/USD/EUR/GBP dropdown)
     │   ├─ <ThemeToggle>
     │   └─ children
     └─ <DashboardPage>
         ├─ Hero text
         ├─ <SalaryForm>              (controlled inputs + Estimate button)
         ├─ <HealthStatusCard>        (polls /health every 15s)
         ├─ <BucketBreakdown>         (4 × <BucketCard>; format() pulls from CurrencyProvider)
         ├─ <AllocationControls>      (optional ratio sliders)
         ├─ <ProjectionChart>         (required 15y / 7% — Recharts)
         ├─ <ScenarioLab>             (optional — local single-amount compound sliders)
         ├─ <MonthlyContributionProjection> (extra-credit — calls backend API)
         └─ <SavedProfiles>           (load / delete / refresh; each row formatted in its own profile.currency)
```

## Data flow

1. User types a bank-net value.
2. `DashboardPage` fires a debounced `POST /api/calculations/preview` (250 ms delay).
3. The backend computes the four bucket amounts and the required 15-year single-amount projection.
4. `BucketBreakdown` and `ProjectionChart` re-render with the API response.
5. `MonthlyContributionProjection` fires `POST /api/calculations/monthly-contribution-projection` with the active-investments bucket amount; results are shown in the extra-credit card.
6. `ScenarioLab` performs its own local in-memory math with the same single-amount compound formula — no extra API call.
7. User clicks **Save profile** → `POST /api/profiles` → backend persists the profile + plan.
8. `SavedProfiles` refreshes from `GET /api/profiles`.
9. On reload, `SavedProfiles` re-fetches and re-displays the saved entry.

### Currency-switch flow

1. On app mount, `CurrencyProvider` calls `GET /api/currencies` and caches the rate table (with hardcoded fallbacks if the request fails).
2. Default active currency is **ILS**. Typed values in `<SalaryForm>` are interpreted as that currency.
3. When the user picks a new currency from `<CurrencySelector>`, `DashboardPage`'s effect detects the change, runs `convert(value, prev, next)` on `grossSalary` and `bankNet`, and updates state — the displayed numbers re-render in the new currency.
4. Saving a profile passes the active currency in the `POST /api/profiles` body; the backend persists it on the `currency` column.
5. Loading a saved profile sets the dashboard currency to that profile's `currency` (with a `skipNextConversion` ref so the values aren't double-converted) and populates the inputs verbatim.
