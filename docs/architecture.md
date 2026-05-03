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
└── ProfilesModule        → ProfilesService (uses CalculationsService + PrismaService)
                         → ProfilesController (REST CRUD)
```

### Why this shape

- **Pure formulas in a service.** All math (`estimateBankNet`, four buckets, `calculateWealthProjection`, `calculateFullPlan`) lives in `CalculationsService`. Controllers never compute anything — they validate the DTO and delegate. That makes the formulas easy to unit-test in isolation and impossible to accidentally diverge between the preview and persisted-profile flows.
- **Health checks talk to the DB.** `HealthController` calls `PrismaService.ping()` which runs `SELECT 1`. Only a successful round-trip returns HTTP 200; any failure returns 503 with `{ status: "error", database: "disconnected" }`. Orchestrators (Kubernetes, ECS, the GitHub Actions staging job) can wire `/health` directly into their probes.
- **Profiles auto-compute their plan.** When a profile is created, `ProfilesService` calls `CalculationsService.calculateFullPlan(...)` and persists the buckets + JSON projection alongside it (`SpendingPlan` row). Reading a profile returns both — the frontend never has to recompute server data.

## Frontend component tree

```
<App>
 ├─ <Layout>                      (sticky header + brand + ThemeToggle)
 │   ├─ <ThemeToggle>
 │   └─ children
 └─ <DashboardPage>
     ├─ Hero text
     ├─ <SalaryForm>              (controlled inputs + Estimate button)
     ├─ <HealthStatusCard>        (polls /health every 15s)
     ├─ <BucketBreakdown>         (4 × <BucketCard>)
     ├─ <AllocationControls>      (optional ratio sliders)
     ├─ <ProjectionChart>         (required 15y / 7% — Recharts)
     ├─ <ScenarioLab>             (optional — local single-amount compound sliders)
     ├─ <MonthlyContributionProjection> (extra-credit — calls backend API)
     └─ <SavedProfiles>           (load / delete / refresh)
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
