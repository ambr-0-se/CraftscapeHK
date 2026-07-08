# Code Quality Guardrails

Engineering guardrails for CraftscapeHK, complementing the product/visual rules in
[`DESIGN.md`](../DESIGN.md), the contract rules in [`docs/SHARED_CONTRACTS.md`](SHARED_CONTRACTS.md),
and the workflow in [`AGENTS.md`](../AGENTS.md). Read this before shipping backend, data, or
cross-cutting frontend changes.

The app is currently a demo-grade MVP (a `DemoPersonaContext` stands in for authentication and the
backend trusts client-supplied identity). That is fine for a private demo. **Everything in the
"Security baseline" and "Data & persistence" sections below must be true before this app handles a
single real user, real payment, or real message in production.**

---

## 1. Security baseline (blocking before real users)

- **No client-asserted identity.** The server must never trust a `customerId` / `artisanId` sent in
  a query string or body. Identity is derived server-side from an authenticated session/JWT. Until a
  real auth layer exists, treat the public backend as fully untrusted and do not put real data behind
  it. Ownership checks that compare a stored id to *another client-supplied id* provide no security.
- **Every mutating or PII-returning endpoint requires auth + an ownership check** against the
  server-derived identity. List endpoints must scope to the caller by default — never "return the
  whole table when the filter is omitted."
- **No destructive endpoint is reachable without admin auth.** `POST /admin/reseed` (wipes all
  tables) and the entire `debug` module must be gated behind an env flag + secret and disabled in
  production.
- **Sanitize every filesystem path built from user input.** `path.basename()` + a contained root;
  reject `..` and absolute paths. (Current `GET /debug/view-reference?filename=` is a path-traversal
  read.)
- **Validate outbound URLs (SSRF).** Any server-side `fetch()` of a client-supplied URL (AI reference
  images, face images) must allowlist hostnames and block private/link-local ranges
  (`169.254.169.254`, `10.*`, `127.*`, `localhost`). No `file://` or local-path fetches.
- **Rate-limit and cap cost on all AI/paid endpoints.** `@nestjs/throttler` + per-user quotas +
  request-size caps + outbound `AbortController` timeouts. Unauthenticated, unmetered calls to
  Gemini/OpenAI/Doubao are a financial-DoS vector.
- **Secrets stay server-side.** Keep the `vite.config.ts` `define` block for API keys commented out;
  never expose a model key to the client bundle. Never log prompt bodies, tokens, or full payloads.
- **CORS is an explicit allowlist in production** — return `false` for unlisted origins (don't log
  and allow). Same for the socket.io gateway (`origin: true` is not acceptable in prod).

## 2. Data & persistence (blocking before real data)

- **No SQLite on Cloud Run for real data.** Cloud Run's filesystem is ephemeral and per-instance, so
  orders/payments/messages are wiped on every redeploy and diverge across instances. Move to a
  managed shared database (Cloud SQL Postgres) before storing anything that must survive.
- **`synchronize: true` is banned in production.** Use reviewable migrations with rollback paths.
  (Tracked in [`TODOS.md`](../TODOS.md).)
- **Multi-entity writes and capacity checks run in a transaction.** Workshop seat booking is a
  read-modify-write with no lock today and will overbook under concurrency — enforce capacity with a
  DB transaction/atomic conditional update.
- **One seed source of truth.** `constants.ts` (frontend) and `constants.cjs` (server seed) are
  hand-mirrored and have already drifted (dropped product fields, collapsed bilingual artisan bios).
  Generate the server seed from the canonical source, and add a CI check that fails on divergence.

## 3. Contract discipline

Canonical domain shapes live in [`shared/contracts.ts`](../shared/contracts.ts). See
[`docs/OWNERSHIP_MODEL.md`](OWNERSHIP_MODEL.md).

- **New code imports from `shared/contracts.ts`.** Do not invent private status enums or duplicate
  domain shapes. `types.ts` is legacy/prototype only and is being retired — do not add consumers.
- **Entity status columns are typed with the contract enum, not raw `string`.** Type
  `status`/`paymentStatus`/`approvalState`/`eventType` as their contract enums and annotate seed
  arrays with `satisfies OrderContract[]` etc. so a stray value fails `tsc`.
- **One vocabulary per domain.** There are currently two live order-status vocabularies (English
  `OrderStatus` on `checkout_orders` vs Chinese literals `待處理/已發貨/…` on the legacy `orders`
  table). Collapse onto the contract vocabulary; render Chinese via `ORDER_STATUS_LABELS`.
- **Every `TransitionMap` is enforced or deleted.** `CAPACITY_HOLD_STATUS_TRANSITIONS` is defined and
  tested but wired into no service. A transition map the runtime doesn't call is dead.
- **Add a contract-conformance test.** `shared/contracts.test.ts` tests the FSM in isolation; it
  cannot catch entity/DTO drift. Add a test asserting each entity/DTO structurally implements its
  `*Contract`, that every enum value is a key in its transition map, and that every map is referenced
  by a `canTransition` guard.

## 4. Internationalization discipline

Mechanism: `contexts/LanguageContext.tsx` → `t(key, replacements)` over `locales/en.ts` + `zh.ts`.

- **All user-facing copy goes through `t()`.** No inline `language === 'zh' ? '…' : '…'` ternaries and
  no raw CJK/English string literals in JSX. (Allowlist the seal-carving glyph content in
  `TextLab*`/`GLYPH_LIBRARY`, which is craft data, not UI copy.)
- **No English-only (or Chinese-only) UI strings.** `artisan/Dashboard.tsx` and `pages/Events.tsx`
  ship English-only literals that are broken for 繁體中文 users.
- **`en.ts` and `zh.ts` keys must match exactly.** Add a CI parity test (`Object.keys(en)` deep-equals
  `Object.keys(zh)`). Delete the orphaned `locales/en.json` (imported by nothing; pure drift bait).
- **Fix the fallback direction.** `t()` currently falls back active-language → `zh` → key, so a
  missing English key renders Chinese to an English user. Fall back to the key (with a dev warning),
  not to the other language.

## 5. Frontend quality

- **Code-split the heavy overlay views.** `AiStudio` (~1500 lines), `Profile` (~950), and `TextLab`
  (~780) all ship in the entry chunk today (single ~700 KB bundle). Lazy-load overlay views behind
  `React.lazy`/`Suspense`.
- **`loading="lazy"` on every non-hero `<img>`.** Currently 0 of ~34.
- **One theming system.** The app owns a `data-theme` toggle on `<html>`. Do not use Tailwind `dark:`
  variants (they follow OS `prefers-color-scheme`, not the toggle) and do not hardcode
  `bg-white`/`gray-*` in modals — use the CSS-variable tokens defined in `index.css`.
- **Data-fetching effects handle their own errors.** Every `await`/`.then()` in a fetch effect needs
  a `.catch`/`.finally` so a thrown fallback can't leave a spinner stuck (`Profile` favorites,
  `Events`, `ProductManagement` currently don't).
- **No dead code in the tree.** Delete on sight, don't leave for later: unused components
  (`SwipeableCard`, `Icon`), unused services (`authService`), dead branches
  (`textLabGeminiService` ships an unused `@google/genai` SDK to the client), and stub buttons
  (`alert('…')`, non-functional Settings/Edit icons).
- **Config is `/api`-relative, never hardcoded `localhost`.** `textLabGeminiService`/`authService`
  hardcode `http://localhost:3001`; use the same `/api`-relative base as `apiService.ts`.
- **Interactive elements are real controls.** `<button>` (not clickable `<div>`), with `aria-label`
  on icon-only buttons (localized via `t()`), a visible focus state, and an actual handler.

## 6. Repo hygiene

- **Retire the parallel Sequelize backend.** The root `auth.cjs`/`database.cjs`/`seed-data.cjs`/
  `config.cjs`/`.js` twins are a dead second backend superseded by NestJS `server/`. Remove them (or
  fence behind CI) so they stop rotting and drifting from the real data layer.
- **Don't commit assets twice.** Mahjong fonts live in both `assets/mahjong/` and
  `server/assets/mahjong/`; only the `server/` copy is loaded at runtime (`text-to-image.util.ts`).
  Keep one copy.
- **One deployment source of truth.** [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) is canonical
  (Vercel frontend + Cloud Run backend). Stale/contradictory `*.ps1` scripts, `cloudbuild.yaml`,
  `nginx.conf`, and the root `Dockerfile` should be reconciled against it or removed. **The canonical
  backend deploy command it names — `scripts/deploy-backend-cloudrun.sh` — does not exist in the
  repo.** Commit the real script (or fix the docs to point at the command actually used) so the
  documented deploy path is runnable.
- **The container must contain everything it loads at runtime.** `server/Dockerfile` copies only
  `server/src` (plus config), so it ships **without** `assets/mahjong/` fonts and **without**
  `constants.cjs`. Result on a fresh deploy: `registerFont()` silently fails (mahjong glyphs render
  in the wrong font) and the seed's `require('../../constants.cjs')` throws (the backend comes up
  with an **empty database**). Any file `require()`d or read by path at runtime must be `COPY`d into
  the image (or bundled), and a smoke test should assert the seeded catalog is non-empty after boot.

## 7. Verification gates (must pass before merge)

Run and keep green:

- `npm run typecheck` — frontend/shared TS check.
- `npm run test:contracts` — shared contract suite.
- `npm run build` — production frontend build.
- `cd server && npm run lint && npm run test` — backend lint + Jest.

Additions to make these gates meaningful:

- **Enable backend strict mode incrementally.** `server/tsconfig.json` disables `strictNullChecks`,
  `noImplicitAny`, and `strictBindCallApply`; turn them on file-by-file.
- **Wire the above into CI** so typecheck/tests/lint/parity/contract-conformance run on every PR, not
  just locally.
