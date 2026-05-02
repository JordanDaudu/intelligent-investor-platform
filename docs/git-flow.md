# Git Flow

This project follows Git Flow because the assignment requires it.

## Branches

| Branch          | Purpose                                                                  |
|-----------------|--------------------------------------------------------------------------|
| `main`          | Production-ready code only. Tagged releases.                             |
| `stage`         | Pre-production integration. Mirrors what staging is running.             |
| `dev`           | Active development integration branch.                                   |
| `feature/*`     | Individual feature branches; cut from `dev`, merged back into `dev`.     |

```
feature/* ──▶ dev ──▶ stage ──▶ main
```

## Rules

- Never commit directly to `main`, `stage`, or `dev`.
- Never auto-merge branches.
- All merges into `dev`, `stage`, or `main` go through pull requests.
- Every PR into `dev`, `stage`, or `main` must have at least one review comment.

## Recommended feature branches for the full project

- `feature/project-scaffold`  *(this PR)*
- `feature/backend-calculations`
- `feature/database-prisma`
- `feature/backend-profiles-api`
- `feature/frontend-dashboard`
- `feature/docker-compose`
- `feature/tests-and-cypress`
- `feature/ci-cd`
- `feature/documentation`
- `feature/scenario-lab`

## Developer workflow

```bash
# 1. Start from an up-to-date dev branch
git checkout dev
git pull origin dev

# 2. Create a feature branch
git checkout -b feature/backend-calculations

# 3. Work, commit early and often
git add .
git commit -m "Implement backend calculation service"

# 4. Push the feature branch
git push -u origin feature/backend-calculations
```

Then open a Pull Request:

- **base:** `dev`
- **compare:** `feature/backend-calculations`

Add at least one review comment, then merge.

## Promoting through environments

```
dev  ──▶ stage   (PR with review)
stage ──▶ main   (PR with review)
```

These promotion PRs are **not** automated — the team performs them manually after staging verification (and after `main` PRs after stakeholder sign-off).

## Example review comment

> "LGTM ✅ — bucket ratios match the spec, calculation tests cover the four buckets and the 15-year projection. Verified `/health` returns 200 against the staging Postgres before approving."

## CI/CD relationship

| Branch event                  | Pipeline behavior                                                      |
|--------------------------------|------------------------------------------------------------------------|
| Push to `feature/*`           | Backend + frontend test/build matrix.                                  |
| PR into `dev`                 | Test/build matrix + `docker-build` validation.                          |
| PR into `stage`               | Test/build + `docker-build`. Prepares for staging.                      |
| Push/merge to `stage`         | Test/build + `docker-build` + `staging-deployment` + `staging-health-check`. |
| PR into `main`                | Test/build + `docker-build`. Production-readiness gate.                 |
| Push/merge to `main`          | Test/build + `production-deployment-placeholder` (skips safely if no secrets). |
