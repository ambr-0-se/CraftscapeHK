# Cross-Agent Handoff — Final MVP Build Window

This file is the compact handoff surface for concurrent/cross-tool agent work (Claude Code, Codex, Cursor). The full objective detail lives in `docs/MVP_OBJECTIVE_TRACKER.md`; this file exists so a fresh agent can start or resume a lane without re-reading everything.

Rules for every agent:

1. Read the lane's kickoff prompt below plus the referenced tracker objectives before editing code.
2. Work in the named worktree/branch, never directly on `main`.
3. Update this file's "Live handoff state" section for your lane whenever you stop, pause, or finish — that is what the next agent (possibly in a different tool) will read.
4. Update `docs/MVP_OBJECTIVE_TRACKER.md` status when claiming, pausing, or completing an objective.
5. Lane A owns all shared contract changes for orders, payments, and checkout (`shared/contracts.ts`). Lane B and later lanes consume, never edit, those contracts.
6. Before opening review: rebase onto latest `origin/main`, rerun the lane's verification commands, and record evidence in the tracker.

Verification commands (all lanes):

```bash
npm run typecheck
npm run test:contracts
npm run build
npm run server:build            # after backend changes
npm --prefix server run test    # after backend changes
```

---

## Lane A — Stripe Payments + Orders/Confirmation (Objectives 8 + 9)

Worktree `worktrees/mvp-stripe-orders`, branch `mvp/stripe-orders`. Critical path (~2.5h). 

### Kickoff prompt (paste to agent)

> You are implementing Objectives 8 (Stripe Payment Processing) and 9 (Order, Booking, And Confirmation Flow) for CraftscapeHK. Read `docs/MVP_OBJECTIVE_TRACKER.md` (Objectives 8, 9, and Confirmed Product Decisions), `docs/SHARED_CONTRACTS.md`, `docs/HANDOFF.md`, and `shared/contracts.ts` first.
>
> Create worktree `worktrees/mvp-stripe-orders` on branch `mvp/stripe-orders` from latest `origin/main`. Do not work on `main`.
>
> Build order and phases:
> 1. **Pricing normalization (backend):** normalize product and workshop pricing to integer cents plus currency on the backend, using or extending the money fields in `shared/contracts.ts`. Pricing display strings in listing data are not authoritative.
> 2. **Simulated checkout first:** a checkout endpoint that creates a pending order/booking record and, behind an env flag (e.g. `PAYMENTS_SIMULATED=true`), immediately confirms it as if a Stripe webhook succeeded. Wire the frontend end-to-end against this before touching Stripe, so the journey is demoable early: checkout CTA → success/cancel screen → order visible in Profile.
> 3. **Real Stripe test mode:** Stripe Checkout Session creation from authoritative backend pricing; webhook handler verifying signature and handling success, failure, and cancellation; pending → confirmed transitions per the transition maps in `shared/contracts.ts`; confirmed workshop bookings decrement capacity. Stripe secrets come from env vars only, never the frontend bundle. Support Stripe CLI webhook forwarding locally.
> 4. **Frontend surfaces:** wire checkout CTAs from (a) the workshop reserved-for-checkout state (Objective 2, `/api/bookings/workshops/pending` flow), (b) product detail purchase CTA (Objective 5 stub), and (c) approved co-creation requests (Objective 1 quote/deposit-ready state). One shared confirmation/success surface for all three (Confirmed Product Decision). Order and booking history in Profile. Failed/cancelled payment states must be visible, not dead ends.
>
> Contract ownership: you own all changes to order/payment/checkout contracts in `shared/contracts.ts`. Update `shared/contracts.test.ts` for any contract change and run `npm run test:contracts` and `npm run contracts:build`.
>
> Identity: use the current demo IDs (`demo-customer`, `customer-demo`); a persona switcher is being built in a parallel lane (Lane B) — do not build auth or a switcher yourself, and keep customer IDs passed as a parameter so the switcher can slot in.
>
> UI gate: checkout, confirmation, and order-tracking screens need a standalone HTML design preview approved by the user before React production edits (see AGENTS.md and `DESIGN.md`). Keep previews in `design-previews/`.
>
> Out of scope: authentication, Supabase, artisan dashboard changes beyond order status visibility, messaging changes, deployment, refunds/disputes beyond webhook acknowledgment.
>
> Verification before review: `npm run typecheck`, `npm run test:contracts`, `npm run build`, `npm run server:build`, `npm --prefix server run test`, plus a manual end-to-end pass (simulated mode and, if keys are available, Stripe test mode). Rebase onto latest `origin/main` before opening the PR. Update `docs/MVP_OBJECTIVE_TRACKER.md` (claim → evidence → status) and the Lane A "Live handoff state" in `docs/HANDOFF.md` whenever you stop.

### Live handoff state — Lane A

- Status: ready for review (Objectives 8+9 implemented, all verification green)
- Last agent/tool: Claude Code (Fable 5)
- Done so far: pricing normalized to cents (`priceMoney` on products API); `server/src/payments` module (simulated checkout behind `PAYMENTS_SIMULATED=true`, Stripe Checkout Sessions + signature-verified webhook, capacity decrement, co-creation conversion); approved preview `design-previews/checkout-orders.html`; shared CheckoutView + OrderConfirmation surfaces; Profile Orders tab; all three checkout CTAs wired; Stripe return redirect handled. Rebased on `origin/main` (`acfe1a0`); commits `eab90a2`, `4d77699` (+docs). Verification: typecheck, 25 contract tests, frontend build, server build, 20 server tests, manual simulated-mode API journey — all pass. Full evidence in tracker Objectives 8/9.
- Next step if resuming: in-browser visual QA at mobile viewport (`PAYMENTS_SIMULATED=true npm run dev:stack`), then push and open the PR against `main`; optionally exercise real Stripe test mode with keys + `stripe listen --forward-to localhost:3001/api/payments/stripe/webhook`
- Blockers / decisions needed: Stripe test-mode API keys from the user for a real-mode round trip (simulated mode fully demoable without them)

---

## Lane B — Artisan Portal + Persona Switcher (Objective 6 + follow-ups)

Worktree `worktrees/mvp-artisan-portal`, branch `mvp/artisan-portal`. Parallel to Lane A (~1.5h).

### Kickoff prompt (paste to agent)

> You are implementing Objective 6 (Artisan Dashboard) plus three adjacent follow-ups for CraftscapeHK. Read `docs/MVP_OBJECTIVE_TRACKER.md` (Objective 6, Confirmed Product Decisions, and the Objective 5/7 known-follow-ups notes), `docs/OWNERSHIP_MODEL.md`, and `docs/HANDOFF.md` first.
>
> Create worktree `worktrees/mvp-artisan-portal` on branch `mvp/artisan-portal` from latest `origin/main`. Do not work on `main`.
>
> Scope, in priority order:
> 1. **Demo persona switcher:** a lightweight selector (in Profile or settings) to choose the active demo identity — one customer persona and the seeded artisans. Store the selection in a React context plus `localStorage`, and send the selected ID with API calls instead of hardcoded `demo-customer` / `demo-artisan` / `customer-demo` strings. This is the MVP substitute for auth (Confirmed Product Decision) — do not build real auth.
> 2. **Scope the artisan dashboard to the selected artisan persona:** metrics, orders/bookings queue, and the co-creation approval queue in `OrderManagement.tsx`.
> 3. **Order/booking status updates:** artisans can move orders and bookings through their status transitions using the maps in `shared/contracts.ts`. Backend update endpoints with role/ownership checks per `docs/OWNERSHIP_MODEL.md`.
> 4. **Wire the Objective 5 `Contact artisan` button** on the artisan profile to create/open a message thread via the existing `ensureMessageThread` path.
> 5. **Subscribe the artisan inbox (`Messages.tsx`) to `thread:updated` socket events** so it live-updates (Objective 7 follow-up).
> 6. Dashboard loading, empty, error, and unauthorized states.
>
> Contract ownership: order/payment/checkout contracts in `shared/contracts.ts` are owned by Lane A (`mvp/stripe-orders`), which is running concurrently. Consume the existing contracts; if a status-update endpoint needs a contract change, coordinate through the user rather than editing contracts yourself. Message and co-creation contracts already exist — reuse them.
>
> UI gate: dashboard layout changes and the persona switcher need a standalone HTML design preview approved by the user before React production edits (see AGENTS.md and `DESIGN.md`). Small wiring changes that do not alter layout (contact button, socket subscription) are exempt.
>
> Out of scope: Stripe/checkout, order/payment contract edits, product create/edit management if time is short (it is the lowest-priority acceptance item), onboarding, deployment.
>
> Verification before review: `npm run typecheck`, `npm run build`, `npm run server:build`, `npm --prefix server run test`, plus manual QA switching personas and confirming scoped data. Rebase onto latest `origin/main` immediately after Lane A merges, resolve conflicts, and rerun verification. Update `docs/MVP_OBJECTIVE_TRACKER.md` and the Lane B "Live handoff state" in `docs/HANDOFF.md` whenever you stop.

### Live handoff state — Lane B

- Status: review
- Last agent/tool: Codex
- Done so far: created `worktrees/mvp-artisan-portal` on branch `mvp/artisan-portal`; read tracker, ownership model, handoff, and design guardrails; added and approved standalone preview `design-previews/artisan-portal-persona-dashboard.html`; implemented localStorage-backed demo persona context and Profile switcher; scoped dashboard/orders/messages/co-creation to the selected artisan; added order/booking status update endpoints and actions using existing shared transition maps; added co-creation artisan ownership checks; wired artisan profile Contact artisan to chat; subscribed artisan inbox to `thread:updated` refresh
- Latest fix: dashboard GET fallback now tolerates absent/stale backend APIs by using scoped local seed orders/messages and empty booking/co-creation queues, preventing `/api/bookings` 404s from collapsing Artisan Dashboard
- Next step if resuming: rebase onto latest `origin/main` after Lane A merges, resolve order/payment conflicts if any without editing Lane A contracts, rerun verification, and open review/PR
- Blockers / decisions needed: must rebase after Lane A merges; product create/edit management remains lowest-priority/out-of-scope for this pass

---

## Lane C (sequential, after Lane A merges) — Onboarding + Journey QA (Objectives 3 + 4)

Branch `mvp/onboarding-journey` (~45m).

### Kickoff prompt (paste to agent)

> You are implementing Objectives 3 (User Onboarding Flow) and 4 (Core User Journey UI/UX Mapping) for CraftscapeHK, now that checkout and confirmation exist. Read `docs/MVP_OBJECTIVE_TRACKER.md` (Objectives 3 and 4) and `docs/HANDOFF.md` first. Work on branch `mvp/onboarding-journey` from latest `origin/main`.
>
> Scope:
> 1. Update onboarding to cover the complete flows: Explore, AI co-creation, workshop booking, marketplace purchase, checkout, and profile order tracking. Onboarding shows once with dismissal persisted, is reopenable from Profile, has EN and Traditional Chinese copy in `locales/`, and is keyboard/screen-reader accessible. Onboarding copy changes are exempt from the HTML preview gate only if layout and flow are unchanged; new/restructured onboarding screens need an approved preview first.
> 2. Write the journey map (a short doc in `docs/`) covering discovery → craft detail → co-creation → artisan approval → checkout → confirmation, and discovery → workshop → booking → checkout → confirmation, with empty/loading/error/success/cancellation states noted.
> 3. Walk both journeys end-to-end in the running app at mobile viewport. Fix dead ends and broken navigation only — do not restyle or expand scope. Record a manual QA script for the critical flows.
>
> Out of scope: new features, visual redesigns, deployment, anything on the tracker cut list.
>
> Verification: `npm run typecheck`, `npm run build`, manual QA script executed. Update the tracker and this file's Lane C state when stopping.

### Live handoff state — Lane C

- Status: review (Objectives 3+4 ready for PR)
- Last agent/tool: Cursor (Composer)
- Done so far: worktree `worktrees/mvp-onboarding-journey` on `mvp/onboarding-journey`; 5-slide onboarding with EN/zh + a11y; journey map + QA docs; Profile tab navigation fix (`tabRequestId`); Stripe return error routing; marketplace E2E QA pass
- Next step if resuming: push branch, open PR against `main`, optional full co-creation/workshop checkout re-run with dedicated `PAYMENTS_SIMULATED=true` backend
- Blockers / decisions needed: none

---

## Lane D (final) — Deploy (Objective 10)

Branch `mvp/deploy` (~45m).

### Kickoff prompt (paste to agent)

> You are implementing Objective 10 (hosting) for CraftscapeHK. Read `docs/MVP_OBJECTIVE_TRACKER.md` Objective 10 and Confirmed Product Decisions first. Hosting split is decided: frontend on Vercel at `app.craftscape.studio`, backend on Cloud Run — do not propose alternatives. The apex `craftscape.studio` hosts a separate landing page and is out of scope. Everything is a fresh setup under the user's own accounts (the repo is a fork; the teammate's Cloud Run/Vercel infra referenced in `server/src/main.ts` CORS is not reusable). Prefer CLI for every step; the user runs interactive logins themselves (`gcloud auth login`, `vercel login`) and supplies a name.com API token if DNS should be automated.
>
> Scope, in order:
> 1. **Tooling:** install `gcloud` (`brew install --cask google-cloud-sdk`) and `vercel` (`npm i -g vercel`) if missing; have the user authenticate both.
> 2. **Cloud Run backend:** create/select the user's GCP project (billing enabled), enable Cloud Run + Cloud Build + Artifact Registry APIs. Build from the **repo root** Docker context. Warning: `cloudbuild.yaml`'s backend step passes `./server` as context, which breaks the shared-contracts `COPY shared/...` — fix that step to use `.` or bypass it with `gcloud builds submit --tag` from the root plus `gcloud run deploy`. Set env vars: AI provider keys from `.env`, `PAYMENTS_SIMULATED=true` (no Stripe keys exist in `.env`; use real test keys only if the user supplies them), `CHECKOUT_RETURN_BASE_URL=https://app.craftscape.studio`, and `ALLOWED_ORIGINS=https://app.craftscape.studio,https://<project>.vercel.app` (`server/src/main.ts` reads this — no code change needed). Secrets live in Cloud Run env/Secret Manager, never the repo.
> 3. **Vercel frontend:** `vercel link` a new project, set build-time env vars `VITE_API_BASE_URL=https://<cloud-run-url>/api` and `VITE_SOCKET_BASE_URL=https://<cloud-run-url>` (these are the names `services/apiService.ts` and `services/messagingService.ts` actually read — the tracker's old `VITE_API_URL` name was wrong), then `vercel deploy --prod`. Do NOT use a `vercel.json` `/api` rewrite: Vercel rewrites cannot proxy WebSockets, so the socket must hit Cloud Run directly.
> 4. **Domain:** `vercel domains add app.craftscape.studio`, then create the CNAME at name.com (`app` → `cname.vercel-dns.com`) via the name.com v4 API (`POST https://api.name.com/v4/domains/craftscape.studio/records` with the user's username + API token) or manually in the name.com dashboard if no token. If propagation is slow, ship on the vercel.app URL — do not block launch on DNS.
> 5. **Stripe webhook (only if real mode ships):** register `https://<cloud-run-url>/api/payments/stripe/webhook` via the Stripe dashboard or CLI and set `STRIPE_WEBHOOK_SECRET` on Cloud Run.
> 6. **Smoke test production:** homepage, Explore, Marketplace, Events, AI route, messaging WebSocket connect, workshop booking → checkout (simulated) → confirmation → Profile Orders. SQLite on Cloud Run is ephemeral — verify seed-on-startup works and record that data resets when instances are replaced.
>
> Out of scope: feature changes, database migration off SQLite, Supabase, the apex-domain landing page.
>
> Update the tracker with deployment evidence (project IDs, URLs, smoke test results) and this file's Lane D state when stopping.

### Live handoff state — Lane D

- Status: **complete** — production live end to end
- Last agent/tool: Claude Code
- Done so far: everything. Backend on Cloud Run (`craftscape-backend-00003-cm5`, billing account `Craftscape` linked); Vercel production env `VITE_API_BASE_URL` / `VITE_SOCKET_BASE_URL` set via REST API (CLI stdin add silently stores empty values — avoid) and prod redeployed; DNS live (`app.craftscape.studio` → Vercel, valid cert); full smoke passed: list APIs 200, WebSocket connects, simulated checkout end to end (order paid, booking confirmed, capacity decremented, order history populated)
- Next step if resuming: none for this repo. Follow-ups elsewhere: attach apex to landing project (`vercel domains add craftscape.studio craftscape-landing-page` — cert already issued), point landing CTA at `https://app.craftscape.studio`
- Blockers / decisions needed: none
