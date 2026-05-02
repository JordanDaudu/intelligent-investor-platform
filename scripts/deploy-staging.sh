#!/usr/bin/env bash
# Placeholder staging deploy script invoked by CI.
# Real implementation should ssh into the staging host (or invoke a platform CLI)
# and run: `git pull && docker compose -f docker-compose.prod.yml up -d --build`
set -euo pipefail

if [ -z "${STAGING_DEPLOY_HOST:-}" ]; then
  echo "STAGING_DEPLOY_HOST is not set; nothing to deploy."
  echo "Set it in CI secrets to enable real deployments."
  exit 0
fi

echo "==> Deploying staging to ${STAGING_DEPLOY_HOST}"
echo "    (placeholder — wire this up to your hosting provider)"

# Example real command:
# ssh "deploy@${STAGING_DEPLOY_HOST}" \
#   "cd /opt/intelligent-investor && git pull && \
#    docker compose -f docker-compose.prod.yml --env-file .env.staging up -d --build"

echo "==> Deploy step finished."
