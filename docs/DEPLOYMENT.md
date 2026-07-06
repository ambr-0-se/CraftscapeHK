# Deployment

Production topology, deploy triggers, and operational gotchas for CraftscapeHK. Last verified: 2026-07-07.

## Production surfaces

| Surface | Where | URL |
|---|---|---|
| App frontend | Vercel project `mvp-deploy` (team `socialenzymeai-3816s-projects`) | https://app.craftscape.studio (alias: https://mvp-deploy-three.vercel.app) |
| App backend (NestJS + WebSocket + SQLite) | Cloud Run service `craftscape-backend`, project `gen-lang-client-0281544850`, us-central1 | https://craftscape-backend-1039883173231.us-central1.run.app (equivalent: `craftscape-backend-ljtkkxnryq-uc.a.run.app`) |
| Landing page | Vercel project `craftscape-landing-page` (separate repo `ambr-0-se/craftscape-landing-page`) | https://craftscape.studio |
| Waitlist API | Supabase edge function `join-waitlist`, project `eltivxeuiptnhfhagezb` (landing repo) | `https://eltivxeuiptnhfhagezb.supabase.co/functions/v1/join-waitlist` |

DNS is at name.com: `app.craftscape.studio` and the apex both point to Vercel (`76.76.21.21`).

## What triggers a redeploy

> **NOTHING DEPLOYS AUTOMATICALLY. Pushing or merging to `main` does not update production.**
> Every production update is a manual CLI command, listed per surface below. After merging any
> change that affects a production surface, run its deploy command — otherwise production keeps
> serving the old build silently.

### App frontend (Vercel)

- **Manual only:** after merging frontend/shared changes to `main`, run from an up-to-date checkout linked to the `mvp-deploy` project (`.vercel/project.json` exists in `worktrees/mvp-deploy`):

  ```bash
  git pull && vercel deploy --prod
  ```

- Changing `VITE_*` env vars does **not** redeploy anything by itself — they are baked in at build time, so run a new production deploy after changing them.
- Verify after deploying: the bundle hash in `view-source:https://app.craftscape.studio` changes, or `curl -s https://app.craftscape.studio | grep -o 'assets/index-[^"]*\.js'`.

### App backend (Cloud Run)

Manual only — after merging changes under `server/` or `shared/` to `main`:

```bash
bash scripts/deploy-backend-cloudrun.sh
```

The script builds from the **repo root** Docker context (required: `server/Dockerfile` COPYs `shared/`), pushes via Cloud Build, and deploys a new revision with env vars from `.env` plus the payment/CORS settings. To change env vars without rebuilding:

```bash
gcloud run services update craftscape-backend --region us-central1 --update-env-vars KEY=value
```

This rolls a new revision immediately.

### Landing page (Vercel)

- **Manual only:** after merging changes, run `vercel deploy --prod` from the landing repo checkout (`~/Downloads/craftscape-landing-page`).

### Waitlist edge function (Supabase)

Manual only, from the landing repo:

```bash
supabase functions deploy join-waitlist --project-ref eltivxeuiptnhfhagezb
```

The function enforces an **origin allowlist** (`supabase/functions/join-waitlist/index.ts`). Any new frontend domain must be added there and the function redeployed, or waitlist submissions from that domain fail with 403 (this is exactly what broke `craftscape.studio` on 2026-07-07).

## Why there is no push-to-deploy (attempted 2026-07-07, does not work)

Auto-deploy on push was attempted and **cannot be enabled with the current accounts**: the Vercel account (`socialenzymeai-3816`, Hobby plan) is bound to the `socialenzymeai` GitHub identity, while the repos live under `ambr-0-se`. Vercel Hobby cannot attach a second GitHub user's namespace, so `vercel git connect` fails even after installing the Vercel GitHub App on `ambr-0-se`. Do not retry `vercel git connect` expecting a different result.

Options if push-to-deploy is wanted later (pick one):

1. **GitHub Actions deploy hook (recommended, keeps current accounts):** add a workflow that runs `vercel deploy --prod --token=$VERCEL_TOKEN` on push to `main`, with a Vercel token stored as a GitHub Actions secret. Works regardless of the namespace mismatch. Same pattern can run `gcloud builds submit` for the backend.
2. Transfer the GitHub repos to the `socialenzymeai` account.
3. Create a Vercel account logged in with the `ambr-0-se` GitHub identity and move the projects to it.

Until one of these is done, **manual redeploys are the process** — see the warning at the top of "What triggers a redeploy".

## Environment variables

### Vercel (`mvp-deploy`, production, build-time)

- `VITE_API_BASE_URL=https://craftscape-backend-1039883173231.us-central1.run.app/api`
- `VITE_SOCKET_BASE_URL=https://craftscape-backend-1039883173231.us-central1.run.app`

These are the names `services/apiService.ts` and `services/messagingService.ts` read. **Warning:** `vercel env add` reading the value from piped stdin has silently stored empty strings; verify with `vercel env pull` after setting, or use the REST API (`POST /v10/projects/{id}/env?upsert=true`).

### Cloud Run (`craftscape-backend`, runtime)

- `PAYMENTS_SIMULATED=true` (Confirmed Product Decision; set Stripe keys + `STRIPE_WEBHOOK_SECRET` and drop this to go to real test mode)
- `CHECKOUT_RETURN_BASE_URL=https://app.craftscape.studio`
- `ALLOWED_ORIGINS=https://app.craftscape.studio,https://mvp-deploy-three.vercel.app`
- AI provider settings (`AI_PROVIDER`, `AI_TEXT_PROVIDER_ORDER`, `HKU_*`, `GOOGLE_AI_*`) — sourced from the repo-root `.env` by the deploy script.
- `GEMINI_API_KEY` — the Google fallback provider (last in both AI provider chains). Lives in `server/.env` locally; the deploy script sources both `.env` files. **History:** deploys before 2026-07-07 silently dropped this key because the script only read the root `.env` — if Google fallback breaks in prod, check this first (compare `gcloud run services describe` env against both local `.env` files).

Secrets live only in Cloud Run env / `.env` (gitignored); never in the repo or frontend bundle.

## AI provider status (diagnosed 2026-07-07)

The AI chain is `hku-gemini → hku-openai → google` for both text and images (`AI_TEXT_PROVIDER_ORDER` / `AI_IMAGE_PROVIDER_ORDER`).

- **HKU gateways:** both return `400 Insufficient token` — the HKU account's token quota is exhausted. Nothing to fix in this repo; wait for reset or request more quota from HKU.
- **Google text (translation, structured JSON):** WORKS in production on the free-tier `GEMINI_API_KEY` (`gemini-3.5-flash` has free quota). Verified live via `POST /api/translation/suggest`.
- **Google images:** WORKS as of 2026-07-07 after buying prepayment credits at https://ai.studio/projects for project `gen-lang-client-0281544850`. Production (and local `.env` / `server/.env`) use the restricted API key `craftscape-backend-gemini` from that project — free-tier keys have **zero** image-model quota, so a free key can never serve images. Verified live: `POST /api/ai/generate-image` returns an image through the full fallback chain. **If images break again, check remaining credits first** — the same "prepayment credits are depleted" 429 comes back when they run out (key management: `gcloud services api-keys list --project gen-lang-client-0281544850`, fetch with `get-key-string`).

Diagnose provider failures with:

```bash
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=craftscape-backend AND severity>=WARNING' --limit 20 --freshness=2h
```

## Gotchas

- **SQLite on Cloud Run is ephemeral.** Data resets whenever an instance is replaced (deploys, scale-to-zero restarts). Seeding runs on startup; do not expect user-entered data to persist.
- **`cloudbuild.yaml` full pipeline is legacy.** Its backend step was fixed to use the repo-root context, but the supported backend path is `scripts/deploy-backend-cloudrun.sh`. The frontend on Cloud Run (nginx) is no longer used — the frontend lives on Vercel.
- **Do not use a `vercel.json` `/api` rewrite** to reach the backend: Vercel rewrites cannot proxy WebSockets. The frontend must call the Cloud Run URL directly (hence the two `VITE_*` vars).
- **Stripe webhook** (only when leaving simulated mode): register `https://<cloud-run-url>/api/payments/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET` on Cloud Run.
