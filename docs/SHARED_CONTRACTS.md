# Shared Contracts

`shared/contracts.ts` is the canonical source for MVP domain contracts used by future frontend and backend worktrees.

## Import Guidance

New MVP code should import contracts directly from `shared/contracts.ts`:

```ts
import { BookingStatus, ORDER_STATUS_TRANSITIONS } from '../shared/contracts';
```

`types.ts` keeps legacy/prototype UI types and re-exports a compatibility namespace as `MvpContracts`. Do not add new MVP domain status values to `types.ts`.

## Contract Coverage

The current contract module covers:

- events-as-workshops
- workshop schedules, capacity snapshots, and capacity holds
- cart item variants
- bookings
- orders and order items
- internal payment statuses and Stripe reference statuses
- co-creation request statuses
- artisan approval states
- message thread summaries, ordered chat messages, and replay cursors

Status domains should include stable enum values, bilingual labels, and explicit transition maps when they represent a lifecycle.

## Backend Consumption

NestJS imports the compiled local package `@craftscape/contracts`:

```ts
import { BookingStatus } from '@craftscape/contracts';
import { UserRole } from '@craftscape/contracts/ownership';
```

Build the package before backend builds:

```bash
npm run contracts:build
npm run server:build
```

Docker and Cloud Run builds must use the repository root as context:

```bash
docker build -f server/Dockerfile -t craftscape-backend .
```

The source still lives in `shared/contracts.ts` and `shared/ownership.ts`. Do not add direct relative imports such as `../../../shared/contracts` from `server/src`; that changes TypeScript's inferred build root and can break `server/dist/main.js`.

## Verification

Run these checks after changing shared contracts:

```bash
npm run typecheck
npm run test:contracts
npm run build
npm run server:build
```

`npm run test:contracts` runs the Vitest suite in `shared/contracts.test.ts`.
