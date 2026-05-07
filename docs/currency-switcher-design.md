# Currency Switcher — Design

**Date:** 2026-05-07
**Status:** Approved by user, ready for implementation planning

## Goal

Let users pick the currency the dashboard is displayed in. Four currencies supported: **ILS** (default), **USD**, **EUR**, **GBP**. The selection lives in the top right of the layout, immediately to the left of the existing dark/light theme toggle. Each saved profile remembers the currency it was created in. Switching the selector live-converts the displayed values using a fixed, backend-owned rate table.

## Non-goals

- No external FX API. Rates are hardcoded constants on the backend.
- No canonical-currency rewrite at storage time. A profile saved in EUR keeps EUR digits in the database.
- No locale-driven number formatting beyond currency symbol selection (we use `en-US` formatting for all four currencies to keep tests deterministic).
- No multi-currency display of the same profile (one profile, one currency).

## Architecture overview

### Rate model

Backend owns the rate table, expressed as **ILS per 1 unit of the foreign currency**:

| Currency | ILS per unit |
|---|---|
| ILS | 1.0 |
| USD | 3.7 |
| EUR | 4.0 |
| GBP | 4.7 |

These live as constants in a new `CurrenciesService`. Tests pin the exact values, so accidentally changing a rate breaks CI.

### Where conversion happens

**Frontend.** The backend stays simple:

- A profile's bucket values are stored *in the profile's own currency*. No canonical rewrite. Math is unchanged because percentages are unit-invariant — `bankNet × 0.55` produces fixed-cost in whatever currency `bankNet` is in.
- Backend exposes `GET /api/currencies` returning the supported list, default, and rate table.
- Frontend caches the rate table on app mount (with the same constants as a hardcoded fallback so the UI doesn't break offline) and converts numbers on demand.

### State flow

```
User types salary (in active currency)
       │
       ▼
DashboardPage holds bankNet/grossSalary in the *active currency*
       │  switch currency  ───┐
       ▼                       │
buckets = bankNet × ratios     │  CurrencyContext.convert()
       │                       │  rewrites typed digits to the
       ▼                       │  economically equivalent value
display ──── format() ─────────┘
       │
       ▼
Save  →  POST /api/profiles  { ..., currency: 'EUR' }
Load  →  GET  /api/profiles/:id  →  setCurrency(profile.currency) first,
                                      then populate values directly
```

### Default

`'ILS'` — defined once and read from three places:

- Backend: `CurrenciesService.DEFAULT`
- Frontend: `CurrencyContext` initial state
- Database: Prisma column default on `FinancialProfile.currency`

## Backend changes

### New module: `backend/src/currencies/`

| File | Purpose |
|---|---|
| `currencies.module.ts` | Standard NestJS module wiring; exports the service so other modules could consume it (none currently do) |
| `currencies.service.ts` | Holds `SUPPORTED = ['ILS','USD','EUR','GBP']`, `DEFAULT = 'ILS'`, `RATES_IN_ILS = { ILS:1, USD:3.7, EUR:4.0, GBP:4.7 }`. Exposes `convert(amount, from, to)` and `isSupported(code)` |
| `currencies.controller.ts` | `GET /api/currencies` returning `{ supported, default, ratesInIls }`; `@HttpCode(200)` |
| `dto/currencies-response.dto.ts` | Swagger-typed response shape |

`convert(amount, from, to)`:

```
ilsValue = amount × RATES_IN_ILS[from]
result   = ilsValue / RATES_IN_ILS[to]
```

`from === to` short-circuits to the input value (no float drift). Unsupported codes throw before computation.

### Schema change

`backend/prisma/schema.prisma` — add to `FinancialProfile`:

```prisma
currency String @default("ILS") @db.VarChar(3)
```

Migration directory `prisma/migrations/<generated-timestamp>_add_currency_to_profile/` (timestamp produced by `prisma migrate dev`); the `migration.sql` body:

```sql
ALTER TABLE "FinancialProfile"
  ADD COLUMN "currency" VARCHAR(3) NOT NULL DEFAULT 'ILS';
```

Existing rows backfill to `'ILS'`. CI's `prisma db push --skip-generate` step picks the migration up automatically.

### DTO and service updates

- `CreateProfileDto`: add optional `currency?: 'ILS'|'USD'|'EUR'|'GBP'` validated with `@IsIn(['ILS','USD','EUR','GBP'])`. Defaults to `'ILS'` in the service when omitted.
- `ProfileResponseDto`: add `currency: 'ILS'|'USD'|'EUR'|'GBP'`.
- `ProfilesService.create`: pass `dto.currency ?? 'ILS'` to `prisma.financialProfile.create`.
- `ProfilesService.toResponse`: surface `row.currency`.
- `CalculationPreviewDto` and `MonthlyContributionPreviewDto`: accept optional `currency` validated the same way; backend echoes it in the response so the frontend can confirm round-trip. **No math changes** in `CalculationsService`.

### Module registration

`backend/src/app.module.ts` — import `CurrenciesModule` so the controller gets registered.

## Frontend changes

### New: `frontend/src/currency/CurrencyContext.tsx`

A React context provider holding:

- `currency` — active currency code (default `'ILS'`)
- `setCurrency(code)` — switches active currency; the dashboard listens and calls `convert` on tracked numeric inputs
- `rates` — `{ ILS:1, USD:3.7, EUR:4.0, GBP:4.7 }`, fetched once from `/api/currencies` on mount, with hardcoded fallback if the request fails
- `convert(amount, from, to)` — pure helper using `rates`, mirrors backend exactly
- `format(amount)` — `Intl.NumberFormat('en-US', { style:'currency', currency, currencyDisplay:'narrowSymbol' })` driven by the active code. The `narrowSymbol` capability is feature-detected once at module load, with `currencyDisplay:'symbol'` as the fallback (see Risks)

### New: `frontend/src/components/CurrencySelector.tsx`

A small `<select>` with four options (ILS / USD / EUR / GBP) showing both the symbol and the code. Placed in the layout's top-right region, immediately to the left of the theme toggle.

```
┌──────────────────────────────────────────────────────────┐
│  Intelligent Investor          [ ₪ ILS ▾ ]  [ 🌙 ]       │
└──────────────────────────────────────────────────────────┘
```

### Type updates

`frontend/src/types/api.ts`:

- `Currency = 'ILS' | 'USD' | 'EUR' | 'GBP'`
- `CurrenciesResponse` interface: `{ supported: Currency[]; default: Currency; ratesInIls: Record<Currency, number> }`
- `currency: Currency` field added to `FinancialProfile` and `CalculationPreview`.

### API wrapper updates

`frontend/src/api/investorApi.ts`:

- New `currencies()` method.
- `preview` and `createProfile` accept optional `currency`.

### Dashboard wiring

`frontend/src/pages/DashboardPage.tsx`:

- Wraps the tree in `<CurrencyProvider>`.
- When `setCurrency(next)` is called: `bankNet` and `grossSalary` get converted from the previous active currency to `next` so the typed numbers stay economically equivalent. To avoid a stale-state race, the dashboard passes the previous currency *directly* into the converter rather than reading from context.
- Loading a saved profile: `setCurrency(profile.currency)` first, then populate fields directly with the persisted values (no second conversion).
- Saving: passes the active currency to `createProfile`.

### Display updates

Replace hardcoded `$` everywhere with `currency.format(value)`:

- `BucketCard.tsx`
- `BucketBreakdown.tsx`
- `AllocationControls.tsx`
- `InvestmentProjection.tsx`
- `MonthlyContributionProjection.tsx`
- Any other component currently using a `$`-prefixed string

Test-ID values stay the same; only the rendered text format changes.

## Test plan

### Backend unit (Jest)

| File | What it asserts |
|---|---|
| `currencies/currencies.service.spec.ts` (new) | `SUPPORTED` is exactly the 4 codes; `DEFAULT === 'ILS'`; `RATES_IN_ILS.ILS === 1`; `convert(100, 'USD', 'ILS') === 370`; `convert(370, 'ILS', 'USD')` round-trips to 100 within rounding tolerance; cross-rate sanity (`convert(100, 'USD', 'EUR') ≈ 100 × 3.7 / 4.0`); `from === to` returns the input unchanged; `isSupported('JPY') === false`; `convert` throws on unsupported codes |
| `currencies/currencies.controller.spec.ts` (new) | `GET /api/currencies` shape: returns `{ supported, default, ratesInIls }` and delegates to the service |
| `profiles/profiles.service.spec.ts` (modified) | New cases: defaults `currency` to `'ILS'` when omitted on `create`; persists explicit `currency: 'EUR'`; surfaces `currency` in `findOne` response |

### Backend integration (Supertest e2e)

`backend/test/app.e2e-spec.ts` gains a new `describe` block:

- `GET /api/currencies` → 200, returns the rate table
- `POST /api/profiles` with `currency: 'EUR'` → response includes `currency: 'EUR'`
- `POST /api/profiles` without `currency` → response includes `currency: 'ILS'`
- `POST /api/profiles` with `currency: 'JPY'` → 400
- `GET /api/profiles/:id` after EUR save → still `'EUR'`
- `POST /api/calculations/preview` with `currency: 'GBP'` → 200, response echoes `currency: 'GBP'`

### Frontend unit (Vitest + RTL)

| File | What it asserts |
|---|---|
| `frontend/src/tests/CurrencyContext.test.tsx` (new) | `convert` round-trips for all 4 currencies; `format` produces `₪` / `$` / `€` / `£` prefixes; default active currency is `ILS` |
| `frontend/src/tests/CurrencySelector.test.tsx` (new) | Renders 4 options; default selection is ILS; selecting USD calls `setCurrency('USD')` |
| `frontend/src/tests/SalaryForm.test.tsx` (modified) | (a) Existing `$7,480.00` assertions retargeted to ILS prefix `₪7,480.00`. (b) New case: switching the selector to USD converts typed `13600` to `~3,675.68` and bucket displays re-render with `$`. (c) New case: loading a profile saved in EUR sets the active currency to EUR. The mocked `investorApi.currencies` returns the canned rate table |
| `frontend/src/tests/investorApi.test.ts` (modified) | New: `currencies()` GETs `/api/currencies`; `createProfile({ currency:'EUR' })` includes the field in the body |

### E2E (Cypress)

`frontend/cypress/e2e/intelligent-investor.cy.ts` gains one new `it` block:

- Visit, switch the selector to USD, type a salary, observe `$` prefix on bucket cards, save the profile, reload, and confirm the active currency is restored to USD.

### CI updates

Standing preference: every new test pairs with a workflow update.

- `.github/workflows/ci.yml` backend step comment block lists `currencies.service.spec.ts` and `currencies.controller.spec.ts`.
- `.github/workflows/ci.yml` frontend step comment block lists `CurrencyContext.test.tsx` and `CurrencySelector.test.tsx`.
- `backend/package.json` `collectCoverageFrom` adds `currencies/currencies.service.ts` and `currencies/currencies.controller.ts` so the existing `90/90/90/80` thresholds extend to the new module.

## Risks and mitigations

1. **`narrowSymbol` in jsdom.** Vitest's jsdom may not render `₪` correctly. Mitigation: feature-detect once at `CurrencyContext` module load and fall back to `currencyDisplay: 'symbol'`. Verified by running the suite before claiming complete.
2. **Profile-reload state race.** Loading a profile sets currency *then* populates values; if React batches the updates, the converter could read stale state and double-convert. Mitigation: pass the previous and next currency *directly* into the converter rather than reading from context inside `setCurrency`.
3. **Coverage drift.** Adding a new module without extending `collectCoverageFrom` means the threshold reads as still-passing while the new code is uncovered. Mitigation: extend `collectCoverageFrom` in the same change as adding the module.
4. **Float drift on round-trip conversion.** `100 USD → ILS → USD` may not return exactly `100`. Mitigation: tests use `toBeCloseTo(100, 2)` for round-trips, and `from === to` short-circuits in `convert`.

## Open questions

None at design time. Each unresolved decision was made during brainstorming:

- Live conversion (not symbol-only) — confirmed
- Hardcoded backend constants (not external FX API) — confirmed
- Per-profile storage (not localStorage) — confirmed
- Convert-on-switch UX (not re-tag without converting) — confirmed
- Backend doesn't convert on storage; calculation endpoints just echo the currency — confirmed

## Implementation sequence (preview)

The implementation plan (next skill) will detail this; the high-level sequence is:

1. Backend `CurrenciesService` + controller + unit tests (independent, mergeable alone)
2. Prisma migration + DTOs + profile service updates + unit tests + e2e tests
3. Frontend types + API wrapper update + `investorApi.test.ts` extension
4. `CurrencyContext` + `CurrencySelector` + unit tests
5. Wire selector into layout, replace hardcoded `$` in display components
6. Update `SalaryForm.test.tsx` for currency-aware assertions
7. Cypress test for the end-to-end happy path
8. CI workflow comment updates and `collectCoverageFrom` extension
