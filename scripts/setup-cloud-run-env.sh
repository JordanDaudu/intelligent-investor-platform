#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"

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

require_var GCP_PROJECT_ID
require_var GCP_REGION
require_var ARTIFACT_REPOSITORY

echo "==> Setting up ${ENVIRONMENT} cloud environment"
gcloud config set project "$GCP_PROJECT_ID" >/dev/null

echo "==> Enabling required APIs"
gcloud services enable \
  cloudresourcemanager.googleapis.com \
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

echo "==> Setup complete for ${ENVIRONMENT}"
