# Cloud Run Deployment

This folder documents the production-style Cloud Run deployment path used by the CI/CD pipeline.

The deployment automation lives in:

- `scripts/setup-staging.sh`
- `scripts/setup-production.sh`
- `scripts/deploy-staging.sh`
- `scripts/deploy-production.sh`
- `scripts/deploy-cloud-run.sh`

## Flow

1. GitHub Actions runs backend, frontend, Docker build validation, and Cypress E2E checks.
2. On merge/push to `stage`, the staging deployment job builds Docker images.
3. Images are pushed to Google Artifact Registry.
4. Backend and frontend are deployed to Google Cloud Run.
5. The backend `/health` endpoint is checked before the deployment is considered successful.

## Environments

- `stage` branch → staging Cloud Run services
- `main` branch → production Cloud Run services

## Database

Runtime database credentials are passed through Google Secret Manager and injected into Cloud Run as the `DATABASE_URL` environment variable.
