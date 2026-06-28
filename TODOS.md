# CraftscapeHK TODOs

## Replace TypeORM auto-sync with migrations before production data is real

**What:** Replace TypeORM `synchronize: true` with explicit migrations before production data is real.

**Why:** Automatic schema sync is fine for a prototype SQLite database, but production schema changes need reviewable migration files and rollback paths.

**Pros:** Safer deploys, visible schema history, and fewer surprise data changes.

**Cons:** Adds migration discipline and setup work.

**Context:** `server/src/database/database.module.ts` currently auto-syncs entities. The shared-contract work should define data shapes, but should not silently convert the database lifecycle in the same change.

**Depends on / blocked by:** Decide the production backend database target and land the shared MVP contracts first.

## Retire or consolidate legacy seed/data mirrors

**What:** Retire or consolidate legacy root Sequelize helpers and mirrored runtime constants.

**Why:** `constants.ts`, `constants.cjs`, `server/constants.cjs`, `database.cjs`, and `seed-data.cjs` can drift from the Nest/TypeORM backend.

**Pros:** Fewer duplicate data sources, cleaner seed path, and less confusion for parallel worktrees.

**Cons:** Requires care because existing scripts still import these files.

**Context:** The contract-first worktree should document seed impact without cleaning the whole data layer. Follow-up cleanup should decide whether Nest/TypeORM is the only supported backend path.

**Depends on / blocked by:** Shared contracts landing and a decision on supported local seed paths.

## Package shared contracts for backend runtime imports

**Status:** Done in Foundation worktree (`mvp/foundation`). Remaining follow-up: ensure deployment pipelines run `npm run contracts:build` before backend packaging.

**What:** Package `shared/contracts.ts` so NestJS backend code can import the canonical contracts without changing `server/dist` output shape.

**Why:** Direct relative imports from `server/src` to root `shared/` shift TypeScript's inferred build root and can break `server/dist/main.js`. The contract source now correctly lives at the repo root, but backend runtime consumption should be added through an explicit package/build boundary.

**Pros:** Keeps one contract source of truth while avoiding fragile cross-root runtime imports.

**Cons:** Requires a small packaging decision, likely a local workspace package or generated contract build output.

**Context:** Implemented as `@craftscape/contracts` with compiled output in `shared/dist`. See `docs/SHARED_CONTRACTS.md`. Do not recreate a relative `../../../shared/contracts` bridge.

**Depends on / blocked by:** Shared contracts landing and the backend deployment/build strategy.

## Define production user and artisan ownership model

**Status:** Addressed in Foundation worktree (`mvp/foundation`) via `docs/OWNERSHIP_MODEL.md`, `shared/ownership.ts`, and the `User` entity. Auth/session implementation remains a separate follow-up.

**What:** Define the production user/customer/artisan ownership model for Nest entities and APIs.

**Why:** Bookings, orders, co-creation requests, and message threads need stable `customerId` and `artisanId` ownership fields, while current Nest entities mostly store display names or embedded artisan names.

**Pros:** Clear authorization boundaries, safer APIs, and dashboard data scoped to the right artisan.

**Cons:** Touches auth, entities, seed data, and role checks.

**Context:** Ownership ids and entity columns are defined. Full auth, seed migration, and API scoping remain separate tasks. See `docs/OWNERSHIP_MODEL.md`.

**Depends on / blocked by:** Authentication model, artisan profile/listing work, and shared MVP contracts.
