#!/usr/bin/env bash
# Deploy CraftscapeHK NestJS backend to Cloud Run (repo-root Docker context).
# Requires: gcloud auth, billing enabled on GCP_PROJECT_ID, .env at repo root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${GCP_PROJECT_ID:=gen-lang-client-0281544850}"
: "${GCP_REGION:=us-central1}"
: "${SERVICE_NAME:=craftscape-backend}"
: "${VERCEL_APP_URL:=https://mvp-deploy-three.vercel.app}"

if [[ ! -f "$ROOT/../../.env" && ! -f "$ROOT/.env" ]]; then
  echo "Missing .env with AI keys (expected at repo root or worktree)."
  exit 1
fi

ENV_FILE="$ROOT/.env"
[[ -f "$ENV_FILE" ]] || ENV_FILE="$ROOT/../../.env"

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/craftscape/backend:latest"

gcloud config set project "$GCP_PROJECT_ID"
gcloud auth application-default set-quota-project "$GCP_PROJECT_ID" 2>/dev/null || true

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

gcloud artifacts repositories describe craftscape --location="$GCP_REGION" 2>/dev/null \
  || gcloud artifacts repositories create craftscape \
    --repository-format=docker \
    --location="$GCP_REGION"

cat > /tmp/cloudbuild-backend.yaml <<EOF
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-t', '${IMAGE}', '-f', 'server/Dockerfile', '.']
images: ['${IMAGE}']
EOF

gcloud builds submit . --config=/tmp/cloudbuild-backend.yaml --timeout=1200s

ALLOWED_ORIGINS="https://app.craftscape.studio,${VERCEL_APP_URL}"

ENV_VARS_FILE="$(mktemp)"
{
  cat <<EOF
PAYMENTS_SIMULATED: "true"
CHECKOUT_RETURN_BASE_URL: https://app.craftscape.studio
ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
NODE_ENV: production
AI_PROVIDER: ${AI_PROVIDER:-hku}
AI_IMAGE_PROVIDER_ORDER: ${AI_IMAGE_PROVIDER_ORDER:-hku-gemini,hku-openai,google}
GOOGLE_AI_TEXT_MODEL: ${GOOGLE_AI_TEXT_MODEL:-gemini-3.5-flash}
GOOGLE_AI_IMAGE_MODEL: ${GOOGLE_AI_IMAGE_MODEL:-gemini-3.1-flash-image}
HKU_GEMINI_API_KEY: "${HKU_GEMINI_API_KEY:-}"
HKU_GEMINI_BASE_URL: ${HKU_GEMINI_BASE_URL:-https://api.hku.hk/gemini/student}
HKU_GEMINI_AUTH_HEADER: ${HKU_GEMINI_AUTH_HEADER:-Ocp-Apim-Subscription-Key}
HKU_GEMINI_TEXT_DEPLOYMENT_ID: ${HKU_GEMINI_TEXT_DEPLOYMENT_ID:-gemini-3.5-flash}
HKU_GEMINI_IMAGE_DEPLOYMENT_ID: ${HKU_GEMINI_IMAGE_DEPLOYMENT_ID:-gemini-3.1-flash-image}
HKU_GEMINI_IMAGE_DEPLOYMENT_IDS: ${HKU_GEMINI_IMAGE_DEPLOYMENT_IDS:-gemini-3.1-flash-image}
HKU_OPENAI_IMAGE_DEPLOYMENT_IDS: ${HKU_OPENAI_IMAGE_DEPLOYMENT_IDS:-gpt-image-1.5}
HKU_OPENAI_API_VERSION: ${HKU_OPENAI_API_VERSION:-2025-04-01-preview}
EOF
  if [[ -n "${GEMINI_API_KEY:-}" ]]; then
    echo "GEMINI_API_KEY: \"${GEMINI_API_KEY}\""
  fi
} > "$ENV_VARS_FILE"

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --env-vars-file "$ENV_VARS_FILE"

rm -f "$ENV_VARS_FILE"

CLOUD_RUN_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$GCP_REGION" --format='value(status.url)')"
echo "Backend URL: $CLOUD_RUN_URL"
echo "Set Vercel production env:"
echo "  VITE_API_BASE_URL=${CLOUD_RUN_URL}/api"
echo "  VITE_SOCKET_BASE_URL=${CLOUD_RUN_URL}"
