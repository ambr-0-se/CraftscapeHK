# CraftscapeHK TODOs

## Replace TypeORM auto-sync with migrations before production data is real

**What:** Replace TypeORM `synchronize: true` with explicit migrations before production data is real.

**Why:** Automatic schema sync is fine for a prototype SQLite database, but production schema changes need reviewable migration files and rollback paths.

**Pros:** Safer deploys, visible schema history, and fewer surprise data changes.

**Cons:** Adds migration discipline and setup work.

**Context:** `server/src/database/database.module.ts` currently auto-syncs entities. The shared-contract work should define data shapes, but should not silently convert the database lifecycle in the same change.

**Depends on / blocked by:** Decide the production backend database target and land the shared MVP contracts first.

## Retire or consolidate legacy seed/data mirrors

**Status:** Largely done in `mvp/quality-cleanup`. The dead root Sequelize cluster (`auth`/`config`/`database`/`seed-data`/`constants` `.cjs`/`.js` twins) was deleted; NestJS/TypeORM under `server/` is the only supported backend. Only the drift risk between `constants.ts` (frontend display data) and `server/constants.cjs` (server seed) remains.

**What:** Keep the two remaining constants sources aligned; there is no longer a legacy Sequelize backend to retire.

**Why:** `constants.ts` and `server/constants.cjs` are separate copies of the same domain data and can drift from the Nest/TypeORM backend.

**Pros:** Fewer duplicate data sources, cleaner seed path, and less confusion for parallel worktrees.

**Cons:** Requires care because both files are consumed at build/runtime.

**Context:** The parallel `.cjs`/`.js` backend is gone (see `docs/CODE_QUALITY_GUARDRAILS.md`). Remaining follow-up is a single source of truth for seed/display constants.

**Depends on / blocked by:** A decision on how to derive one constants file from the other.

## Package shared contracts for backend runtime imports

**Status:** Done in Foundation worktree (`mvp/foundation`). Deploy via repo-root `docker build -f server/Dockerfile .` or Cloud Run `--source . --dockerfile server/Dockerfile`.

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
