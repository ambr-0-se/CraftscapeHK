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

The canonical source lives at the repository root, not under `server/src`.

Do not add a direct relative NestJS import such as `../../../shared/contracts` from `server/src`. That changes TypeScript's inferred build root and can break the expected `server/dist/main.js` output shape.

Before backend runtime code imports these contracts, add an explicit packaging boundary, such as a local workspace package or generated contract build output. This follow-up is tracked in `TODOS.md`.

## Verification

Run these checks after changing shared contracts:

```bash
npm run typecheck
npm run test:contracts
npm run build
npm run server:build
```

`npm run test:contracts` runs the Vitest suite in `shared/contracts.test.ts`.
