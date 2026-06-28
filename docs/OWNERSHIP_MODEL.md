# Ownership Model

CraftscapeHK MVP records are owned by platform users. Domain contracts use stable string user ids, not display names.

## Core Rules

- `customerId` in bookings, orders, co-creation requests, and message threads refers to `User.id`.
- `artisanId` in bookings, co-creation requests, message threads, and workshop events refers to `User.id` for an artisan-capable account.
- Prototype seed data may still populate `customerName` or legacy artisan profile ids. New MVP APIs should write `customerId` / `artisanId` and treat display names as derived data.
- Authentication, password storage, and session issuance are out of scope for the foundation pass. This document defines identifiers and entity shape only.

## User Roles

Defined in `shared/ownership.ts` as `UserRole`:

| Role | Purpose |
| --- | --- |
| `customer` | Browses, books workshops, submits co-creation requests, chats with artisans |
| `artisan` | Manages listings, approves co-creation requests, fulfills orders/bookings |
| `admin` | Platform operator; artisan-capable for support workflows |

## Entity Mapping

| Entity | Ownership fields | Notes |
| --- | --- | --- |
| `User` | `id`, `role`, `displayName`, optional `email`, optional `artisanProfileId` | Canonical account record |
| `Artisan` | optional `userId` | Legacy profile/listing row linked to a platform user |
| `Order` | optional `customerId`, legacy `customerName` | Prototype orders remain name-based until migrated |
| `MessageThread` | optional `customerId`, optional `artisanId`, legacy `customerName` | Thread access should eventually scope by user ids |

## Import Guidance

Frontend and shared code:

```ts
import { UserRole } from '../shared/ownership';
```

NestJS backend:

```ts
import { UserRole } from '@craftscape/contracts/ownership';
import { BookingStatus } from '@craftscape/contracts';
```

See `docs/SHARED_CONTRACTS.md` for contract packaging details.
