#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-${APP_ENV:-}}"

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Usage: $0 <staging|production>"
  exit 1
fi

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name"
    exit 1
  fi
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

need_cmd gcloud
need_cmd docker
need_cmd curl

require_var GCP_PROJECT_ID
require_var GCP_REGION
require_var ARTIFACT_REPOSITORY
require_var DATABASE_URL

BACKEND_SERVICE="${BACKEND_SERVICE:-intelligent-investor-backend-${ENVIRONMENT}}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-intelligent-investor-frontend-${ENVIRONMENT}}"
DATABASE_SECRET_NAME="${DATABASE_SECRET_NAME:-intelligent-investor-database-url-${ENVIRONMENT}}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

GAR_HOST="${GCP_REGION}-docker.pkg.dev"
BACKEND_IMAGE="${GAR_HOST}/${GCP_PROJECT_ID}/${ARTIFACT_REPOSITORY}/${BACKEND_SERVICE}:${IMAGE_TAG}"
FRONTEND_IMAGE="${GAR_HOST}/${GCP_PROJECT_ID}/${ARTIFACT_REPOSITORY}/${FRONTEND_SERVICE}:${IMAGE_TAG}"

echo "==> Deploying Intelligent Investor to ${ENVIRONMENT}"
echo "Project: ${GCP_PROJECT_ID}"
echo "Region: ${GCP_REGION}"
echo "Artifact Registry repo: ${ARTIFACT_REPOSITORY}"
echo "Backend service: ${BACKEND_SERVICE}"
echo "Frontend service: ${FRONTEND_SERVICE}"
echo "Image tag: ${IMAGE_TAG}"

gcloud config set project "$GCP_PROJECT_ID" >/dev/null

echo "==> Enabling required Google Cloud APIs"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project "$GCP_PROJECT_ID" \
  --quiet

echo "==> Ensuring Artifact Registry repository exists"
if ! gcloud artifacts repositories describe "$ARTIFACT_REPOSITORY" \
  --location "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then

  gcloud artifacts repositories create "$ARTIFACT_REPOSITORY" \
    --repository-format=docker \
    --location "$GCP_REGION" \
    --description="Intelligent Investor Docker images" \
    --project "$GCP_PROJECT_ID" \
    --quiet
else
  echo "Artifact Registry repository already exists"
fi

echo "==> Creating/updating DATABASE_URL secret"
if gcloud secrets describe "$DATABASE_SECRET_NAME" \
  --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then

  printf "%s" "$DATABASE_URL" | gcloud secrets versions add "$DATABASE_SECRET_NAME" \
    --data-file=- \
    --project "$GCP_PROJECT_ID" >/dev/null
else
  printf "%s" "$DATABASE_URL" | gcloud secrets create "$DATABASE_SECRET_NAME" \
    --replication-policy="automatic" \
    --data-file=- \
    --project "$GCP_PROJECT_ID" >/dev/null
fi

PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
DEFAULT_RUN_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
EFFECTIVE_RUN_SERVICE_ACCOUNT="${CLOUD_RUN_SERVICE_ACCOUNT:-$DEFAULT_RUN_SERVICE_ACCOUNT}"

echo "==> Granting Cloud Run service account access to DATABASE_URL secret"
gcloud secrets add-iam-policy-binding "$DATABASE_SECRET_NAME" \
  --member="serviceAccount:${EFFECTIVE_RUN_SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project "$GCP_PROJECT_ID" \
  --quiet >/dev/null

SERVICE_ACCOUNT_ARGS=()
if [[ -n "${CLOUD_RUN_SERVICE_ACCOUNT:-}" ]]; then
  SERVICE_ACCOUNT_ARGS=(--service-account "$CLOUD_RUN_SERVICE_ACCOUNT")
fi

echo "==> Authenticating Docker to Artifact Registry"
gcloud auth configure-docker "$GAR_HOST" --quiet

echo "==> Building and pushing backend image"
docker build -t "$BACKEND_IMAGE" ./backend
docker push "$BACKEND_IMAGE"

echo "==> Deploying backend to Cloud Run"
gcloud run deploy "$BACKEND_SERVICE" \
  --image "$BACKEND_IMAGE" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8000 \
  --set-env-vars "NODE_ENV=production,BACKEND_PORT=8000,BACKEND_HOST=0.0.0.0,APP_ENV=${ENVIRONMENT}" \
  --set-secrets "DATABASE_URL=${DATABASE_SECRET_NAME}:latest" \
  "${SERVICE_ACCOUNT_ARGS[@]}" \
  --quiet

BACKEND_URL="$(gcloud run services describe "$BACKEND_SERVICE" \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --format='value(status.url)')"

API_URL="${VITE_API_BASE_URL:-$BACKEND_URL}"

echo "==> Building frontend with API URL: ${API_URL}"
docker build \
  --build-arg VITE_API_BASE_URL="$API_URL" \
  -t "$FRONTEND_IMAGE" \
  ./frontend

docker push "$FRONTEND_IMAGE"

echo "==> Deploying frontend to Cloud Run"
gcloud run deploy "$FRONTEND_SERVICE" \
  --image "$FRONTEND_IMAGE" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 80 \
  --set-env-vars "APP_ENV=${ENVIRONMENT}" \
  "${SERVICE_ACCOUNT_ARGS[@]}" \
  --quiet

FRONTEND_URL="$(gcloud run services describe "$FRONTEND_SERVICE" \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --format='value(status.url)')"

echo "==> Verifying backend /health"
for attempt in $(seq 1 12); do
  if curl -fsS "${BACKEND_URL}/health"; then
    echo
    echo "Backend health check passed"
    break
  fi

  echo "Health check attempt ${attempt}/12 failed; retrying in 10 seconds..."
  sleep 10

  if [[ "$attempt" == "12" ]]; then
    echo "Backend /health did not return 200"
    exit 1
  fi
done

echo "==> Deployment complete"
echo "Backend URL: ${BACKEND_URL}"
echo "Frontend URL: ${FRONTEND_URL}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "backend_url=${BACKEND_URL}"
    echo "frontend_url=${FRONTEND_URL}"
  } >> "$GITHUB_OUTPUT"
fi