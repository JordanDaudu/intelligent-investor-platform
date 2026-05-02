# Database

## Engine & schema

PostgreSQL 16 managed via Prisma (`backend/prisma/schema.prisma`).

```
financial_profiles                         spending_plans
─────────────────────                       ─────────────────────────
id           uuid pk                        id                   uuid pk
name         text                           profile_id           uuid unique fk → financial_profiles.id  ON DELETE CASCADE
gross_salary numeric(14,2)                  fixed_costs          numeric(14,2)
bank_net     numeric(14,2)                  savings_goals        numeric(14,2)
created_at   timestamptz default now()      active_investments   numeric(14,2)
updated_at   timestamptz                    guilt_free_spending  numeric(14,2)
                                            annual_return_rate   numeric(6,4) default 0.07
                                            projection_years     int          default 15
                                            projection_data      jsonb          /* [{year, value}] */
                                            created_at           timestamptz default now()
                                            updated_at           timestamptz
```

A `FinancialProfile` has at most one `SpendingPlan`. Deleting a profile cascades into its plan.

## projectionData shape

```jsonc
[
  { "year": 1,  "value": 1455.2 },
  { "year": 2,  "value": 1557.06 },
  /* ... up to projectionYears entries ... */
]
```

Storing the projection alongside the plan means the chart can be re-rendered without re-running the math (and lets us evolve the formula later without losing historical snapshots).

## Migrations

We rely on **`prisma migrate`** for tracked schema changes:

```bash
# Create a new migration during development
npm --prefix backend run prisma:migrate:dev -- --name add_something

# Apply all pending migrations in CI / production
npm --prefix backend run prisma:migrate:deploy
```

For Replit's managed Postgres in the workspace, we use `prisma db push` to keep the dev database in sync without committing migration files (Replit's publish flow handles the prod-side schema diff).

## Volumes

The Docker stack stores data on a **named** Docker volume so it survives `docker compose down`:

```yaml
volumes:
  intelligent_investor_postgres_data:
    name: intelligent_investor_postgres_data
```

Wipe with:

```bash
docker compose down
docker volume rm intelligent_investor_postgres_data
```
