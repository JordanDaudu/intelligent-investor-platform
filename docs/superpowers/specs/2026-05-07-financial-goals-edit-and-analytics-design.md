# Financial Goals — Edit, Quick Contribute, Aggregate Analytics, Sort/Filter

**Status:** approved 2026-05-07
**Author:** Claude (brainstormed with Ilan)

## Problem

The first iteration of the goals feature only supports create + delete. Users can't fix mistakes, can't quickly log a new contribution, can't see how all their goals add up, and have no way to sort/filter once they accumulate several. This spec scopes a focused second pass.

## Out of scope (deliberate)
- Per-goal contribution history / audit log (no new table).
- Per-goal scenario sliders (preview-only what-ifs).
- Combined forecast chart and status donut chart (stats-only summary chosen).

## Backend

### `PATCH /api/goals/:id`
Partial update of a goal. `UpdateGoalDto` mirrors the optional subset of `CreateGoalDto`: `title`, `category`, `targetAmount`, `currentAmount`, `targetDate`, `expectedReturn`. Every field is optional and re-validated against the same constraints (`> 0`, `>= 0`, future date, `0 ≤ return ≤ 1`). `profileId` is **not** editable — a goal stays linked to its original profile.

- 200 + updated `GoalResponseDto` on success
- 404 when the goal is missing
- 400 on bad date or out-of-range numbers

The "quick contribute" UI uses this same endpoint with `{ currentAmount: previous + delta }` — no separate endpoint, no new history table.

### `GET /api/profiles/:id/goals/summary`
Server-side aggregate. Loops the profile's goals, runs `GoalsService.analyze` on each (reusing the existing math; no duplication), and returns:

```json
{
  "goalCount": 4,
  "totalTargetAmount": 1250000,
  "totalCurrentAmount": 312000,
  "totalMonthlyRequired": 9120,
  "overallCompletionPercentage": 24,
  "statusCounts": { "ON_TRACK": 1, "SLIGHTLY_BEHIND": 2, "AT_RISK": 1 }
}
```

- 200 with all-zeros object when the profile has no goals
- 404 when the profile is missing

The route lives on `ProfilesController` (delegates to `GoalsService.summarizeForProfile`), matching the existing `GET /:id/goals` pattern.

### Service surface (additions)
- `GoalsService.update(id, dto)` — Prisma `update` with field whitelist + future-date validation, P2025 → 404.
- `GoalsService.summarizeForProfile(profileId)` — profile-existence check, then iterate analyses and roll up totals + status counts.

## Frontend

### Component changes
- **`CreateGoalModal`** — extended in place (no rename). New optional props: `mode: 'create' | 'edit'` and `initial?: FinancialGoal`. In edit mode it prefills fields, swaps the title/button to "Update goal", and calls a new `onSubmit` shape that omits `profileId`. Same validation. Decision deviation from initial design proposal: keep the file name to honor the project rule "do not rename existing components unless required".
- **`GoalCard`** — adds two actions next to Delete:
  - `Edit` button → propagates `onEdit(goal)` upward to `GoalsPage`.
  - `+ Add` button → reveals a small inline number input + "Add" button. Submits `PATCH { currentAmount: current + delta }` and triggers a parent refresh.
- **`GoalsSummaryCard`** (new file) — compact KPI card, hidden when `goalCount === 0`. Five numeric stats (count, total target, total saved, total monthly required, overall %) plus three colored status chips reusing `goal-status--*` tokens.
- **`GoalsPage`** — renders `GoalsSummaryCard` above the goal grid. Adds an inline sort + status-filter + category-filter row in the card header. Sort/filter is **client-side only** (lists are small per profile). Holds modal state + edit handler.

### Sort / filter rules
- Sort: `Deadline ↑` (default), `Progress ↓`, `Target amount ↓`, `Newest first`.
- Filter status: `All` / `On track` / `Slightly behind` / `At risk`. Status-based filters require analyses; we already fetch one per card so the parent collects them as they arrive (or shows "all" until they load).
- Filter category: `All` + every `GoalCategory`.
- Selections live in `GoalsPage` local state. No URL persistence (simple in-page UX).

### Types + API
- New types in `src/types/api.ts`: `UpdateGoalRequest`, `GoalsSummary`, `GoalStatusCounts`.
- New methods in `src/api/investorApi.ts`: `updateGoal(id, input)`, `getGoalsSummary(profileId)`.

### Data flow
- After any mutation (create / edit / delete / contribute), `GoalsPage` re-fetches `getGoalsForProfile` + `getGoalsSummary` for the active profile.
- `GoalCard` continues to fetch its own analysis on mount and on goal-id change.

## Tests (added; no existing test weakened)

### Backend
- `goals.service.spec.ts`:
  - `update` happy path with all fields.
  - Partial `update` preserves untouched fields (only `currentAmount` provided).
  - `update` 404 when goal missing.
  - `update` 400 when `targetDate` is in the past.
  - `summarizeForProfile` happy path: aggregates totals + status counts.
  - `summarizeForProfile` zero-goals returns zeros.
  - `summarizeForProfile` 404 when profile missing.
- `goals.controller.spec.ts`: `update` delegation.
- `goals.e2e-spec.ts`: `PATCH /api/goals/:id` (200 + 404 + 400 past-date), `GET /api/profiles/:id/goals/summary` (200 with goals, 200 zero-goals shape, 404 missing profile).
- `profiles.controller.spec.ts`: `goalsSummary` delegation.

### Frontend
- `CreateGoalModal.test.tsx`: edit-mode prefills inputs from `initial`; submit returns the updated payload shape; button reads "Update goal".
- `GoalCard.test.tsx`: Edit button fires `onEdit` with the goal; Quick Add input + button hits `investorApi.updateGoal` with `currentAmount + delta`.
- `GoalsSummaryCard.test.tsx` (new): renders the five KPIs and status chips; hidden when `goalCount === 0`.
- `GoalsPage.test.tsx` (new): sort changes order; status filter narrows visible cards; category filter narrows visible cards.

### CI
- Update step labels in `.github/workflows/ci.yml` per the project's "every new test surfaces in CI" rule.

## Risks
- **Status filter timing:** statuses come from per-card analysis fetches. If the user filters before all analyses load, some cards may not be filterable yet. Mitigation: filter only those with known status; rest stay visible until their analysis arrives. (Acceptable UX — analyses are fast.)
- **Past-date edits:** if a user edits and sets a past `targetDate`, we reject with 400. Existing goals whose deadline has now passed since creation are not retroactively invalidated — only changed dates trigger the check.
- **Quick-add race:** the `+ Add` button submits with `current + delta` computed client-side. If two tabs add concurrently, last write wins. Acceptable — single-user app.
