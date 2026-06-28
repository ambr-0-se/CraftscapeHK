# MVP Objective Tracker

This document tracks the remaining production-readiness work for CraftscapeHK. It is intended for concurrent development across multiple git worktrees, so every objective should be updated when a worktree starts, pauses, finishes, or hands off work.

## How To Use

Status values:

- `Not Started`: no active worktree owns the objective.
- `In Progress`: a worktree is actively implementing the objective. Fill in `Worktree`.
- `Blocked`: work started but cannot proceed without a decision, dependency, or fix.
- `Review`: implementation is ready for review/testing but not merged.
- `Done`: accepted, tested, and merged into the integration branch.
- `Partial`: some prototype code exists, but acceptance requirements are not met.

When starting a worktree, update:

- `Status`
- `Worktree`
- `Owner`, if known
- `Last Updated`
- `Notes`

## Concurrent Worktree Workflow

Use this workflow for every MVP objective worktree.

### 1. Fresh Worktree Gate

Start every new MVP objective or multi-file feature in a fresh git worktree and branch. Do not implement objective work directly on `main`.

Recommended naming:

- worktree: `worktrees/mvp-stripe-orders`
- branch: `mvp/stripe-orders`

Use the same pattern for other objectives, for example `worktrees/mvp-realtime-messaging` with branch `mvp/realtime-messaging`.

Tiny docs-only fixes, typo fixes, or review nits may happen on the current branch only when they are scoped to an existing objective PR and do not affect shared contracts or production code.

### 2. Kickoff Confirmation Gate

Before editing production code, confirm the work plan with the user:

- objective being claimed
- exact scope for this worktree
- acceptance requirements this worktree will satisfy
- likely files, modules, routes, APIs, or data models to touch
- dependencies on other objectives or worktrees
- explicit out-of-scope items
- expected verification method

Do not begin production code changes until the user confirms this kickoff scope.

### 3. Tracker Claim

After kickoff confirmation and before coding:

- set objective `Current state` to `In Progress`
- fill in `Worktree`
- fill in `Owner`, if known
- update `Last Updated`
- add any dependency or conflict notes

Each worktree should own one primary objective. If it must touch another objective, note the dependency rather than silently expanding scope.

### 4. UI/UX Design Preview Gate

For any UI/UX work, create a lightweight standalone HTML design preview before editing React production code.

The preview should show:

- layout and hierarchy
- core copy
- primary/secondary actions
- important states such as empty, loading, error, success, approval, payment, or booking confirmation
- color and typography choices aligned with `DESIGN.md`
- mobile-first behavior, at least at the intended phone viewport

Get user approval before implementing the design in production code.

This gate applies to onboarding, booking, checkout, artisan dashboard, co-creation approval, listings, artisan profiles, messaging UI, and major empty/error/success states.

Tiny UI fixes are exempt only when they do not alter layout, flow, visual direction, or design system behavior.

### 5. Shared Contract Gate

Before changing shared data models or statuses, confirm the contract with the user or the integration owner.

Canonical MVP contracts live in `shared/contracts.ts`; usage and backend packaging guidance is documented in `docs/SHARED_CONTRACTS.md`.

Shared contracts include:

- events-as-workshops
- bookings
- orders
- carts
- Stripe payment statuses
- co-creation request statuses
- message threads and real-time messages
- artisan approval states

Do not create private enums or duplicate status names in isolated worktrees.

### 6. Rebase Gate

Before opening review and before merging:

- fetch the latest remote state
- rebase the worktree branch onto the latest `origin/main`
- resolve conflicts locally
- rerun required verification after conflict resolution
- update this tracker with final status, worktree name, and evidence

Do not merge stale objective branches that have not been rebased against the latest integration branch.

### 7. Review Evidence Gate

Before marking an objective `Review`, add evidence in the objective notes or PR description:

- acceptance requirements met
- acceptance requirements not met
- commands run
- manual QA steps
- screenshots or design preview links for UI changes
- known risks or follow-up work

Only mark an objective `Done` after the work is accepted, tested, and merged into the integration branch.

## Confirmed Product Decisions

- Workshops are modeled as `events`.
- Payments use Stripe.
- Artisan/customer messaging should be real-time.
- Co-creation requests require artisan approval before becoming an order or booking.
- Hosting target is Vercel with the production domain `craftscape.studio`.

## Objective 0: Shared MVP Contracts

Description: Establish the canonical shared TypeScript contracts for events-as-workshops, schedules, capacity holds, cart items, bookings, orders, Stripe payment statuses, co-creation request statuses, artisan approval states, message threads, and real-time message replay before parallel implementation work begins.

Current state: `Done`

Worktree: `main`

Owner: `GPT-5.5`

Last Updated: `2026-06-28`

Acceptance Requirements:

- A single root shared contract module is canonical for future frontend and NestJS backend implementation work.
- Shared enums use stable values for logic and provide bilingual English/Traditional Chinese display labels.
- Order, booking, payment, co-creation, artisan approval, workshop capacity, and message replay lifecycles include explicit transition maps or contract-level rules.
- Workshop capacity distinguishes total seats, active pending holds, confirmed reservations, derived availability, and hold expiry.
- Stripe contracts separate internal payment state from raw Stripe identifiers/status references needed for webhook reconciliation.
- Message contracts support thread summaries, paginated message history, ordered replay, and idempotent client send metadata.
- Contract tests cover enum labels, transition maps, capacity rules, payment metadata, and message replay fields.

Notes:

- Scope is contract-first only. No production UI, Stripe integration, booking/cart implementation, real-time transport, or database/entity migration is included in this objective.
- Canonical file: `shared/contracts.ts`; tests: `shared/contracts.test.ts`; guide: `docs/SHARED_CONTRACTS.md`.
- Future worktrees for AI requests, workshops/cart, Stripe/orders, real-time messaging, artisan portal, listings, onboarding, and journey mapping should depend on these contracts instead of creating private enums or duplicate status values.
- Review evidence: added canonical root shared contracts, 18 contract tests, root typecheck coverage, and scoped follow-up TODOs.
- Commands run: `npm run typecheck`, `npm run test:contracts`, `npm run build`, `npm run server:build`.
- Merged to `origin/main` in commit `66f647f` on 2026-06-28.
- Known follow-ups: migrate prototype UI types to `MvpContracts`, replace TypeORM auto-sync with migrations, and consolidate seed/data mirrors. Backend contract packaging and ownership model moved to Foundation objective below.

## Foundation: Backend Contract Packaging And Ownership

Description: Package `shared/contracts.ts` for safe NestJS runtime imports and define the production user/customer/artisan ownership model before feature worktrees add bookings, orders, co-creation, and messaging APIs.

Current state: `Review`

Worktree: `worktrees/mvp-foundation`

Branch: `mvp/foundation`

Owner: `GPT-5.5`

Last Updated: `2026-06-28`

Acceptance Requirements:

- `@craftscape/contracts` is a local package built from `shared/` without breaking `server/dist/main.js`.
- NestJS can import contract enums/helpers and ownership types from the package, not via fragile `../../../shared` relative paths.
- Ownership rules document which contract fields map to `User.id`.
- `User` entity exists with role-based ownership fields; legacy entities expose optional `customerId` / `artisanId` / `userId` columns for migration.
- Contract and ownership tests pass; frontend and backend builds pass.

Notes:

- Scope is foundation only. No auth/session implementation, seed migration, or feature UI/API work is included.
- Depends on Objective 0 shared contracts being `Done`.
- Review evidence: added `@craftscape/contracts` package build, NestJS package imports, ownership model doc/types, `User` entity, and optional ownership columns on legacy entities.
- Commands run: `npm run contracts:build`, `npm run typecheck`, `npm run test:contracts`, `npm run build`, `npm run server:build`.

## Objective 1: AI Co-Creation Flow For Craft Design

Description: Let users create AI-assisted craft concepts, submit them to artisans, and track artisan approval before any paid order is created.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- Users can generate craft concepts from text prompts using the backend AI service.
- Generated concepts are persisted to a backend record tied to the user.
- Users can submit a generated concept as a co-creation request to an artisan.
- Artisans can approve, reject, or request changes for co-creation requests.
- Approved co-creation requests can proceed to Stripe checkout or a quoted order.
- Users and artisans can see request status changes.
- Failed AI generation and request submission states are handled with user-facing errors.

Notes:

- Existing `AiStudio` and `TextLab` cover major prototype UI behavior.
- Current contact form success is local-only and does not persist a request.
- Need data model, API, artisan review UI, status flow, and tests.

## Objective 2: Workshop Browsing And Booking

Description: Treat workshops as events, then let users view details, select schedule options, add seats to cart, and book through checkout.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- Workshop events are identifiable through the existing event model.
- Workshop detail pages show description, artisan/host, location, price, capacity, and available time slots.
- Users can select a date/time and quantity.
- Users can add workshop bookings to cart.
- Cart preserves selected workshop, schedule, quantity, and price.
- Checkout creates a pending booking/order and redirects to Stripe.
- Successful Stripe payment confirms the booking and decrements available capacity.
- Cancelled or failed payment leaves the booking unconfirmed.

Notes:

- Existing `Events` and `EventDetail` provide browsing and filtering.
- Current event CTA links externally. There is no in-app booking, schedule selection, cart, or capacity tracking.

## Objective 3: User Onboarding Flow

Description: Guide first-time users through discovery, co-creation, workshop booking, marketplace purchase, checkout, and profile tracking.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- First-time users see onboarding once, with dismissal persisted.
- Onboarding explains Explore, AI co-creation, workshop booking, marketplace purchase, checkout, and profile tracking.
- Onboarding can be reopened from profile or settings.
- Copy is available in English and Traditional Chinese.
- Flow is accessible by keyboard and screen readers.

Notes:

- Existing onboarding covers Explore, Marketplace, and Events.
- It needs updates after booking, checkout, and co-creation request flows exist.

## Objective 4: Core User Journey UI/UX Mapping

Description: Document and validate the end-to-end journey from discovery to co-creation to booking or purchase to checkout and confirmation.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- A user journey map exists for discovery, craft detail, co-creation, artisan approval, workshop booking, product purchase, checkout, and confirmation.
- The app navigation supports each journey step without dead ends.
- Empty, loading, error, success, and cancellation states are defined.
- Mobile-first flows are visually reviewed on common viewport sizes.
- Critical flows have a manual QA script or automated E2E coverage.

Notes:

- `App.tsx` already connects several prototype views.
- The journey cannot be considered complete until approval, cart, checkout, confirmation, and tracking exist.

## Objective 5: Product And Craft Listing Pages

Description: Provide production-ready listing and detail pages for crafts, products, workshops, artisan profiles, and pricing.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- Craft listing and detail pages show bilingual craft story, artisan, media, and co-creation CTA.
- Product listing and detail pages show bilingual description, artisan, price, availability, and purchase CTA.
- Workshop listings use the event model and show pricing plus schedule information.
- Artisan profile pages show bio, craft expertise, products, workshops, and response/contact options.
- Pricing display is consistent and ready for Stripe line items.
- All listing pages have loading, empty, and error states.

Notes:

- Existing Explore, Marketplace, CraftDetail, ProductDetail, and Events pages cover part of this.
- Dedicated artisan profile and production purchase/booking CTAs are still missing.

## Objective 6: Artisan Dashboard

Description: Give artisans a production-ready dashboard for schedules, orders, products, messages, and co-creation requests.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- Dashboard metrics are scoped to the authenticated artisan.
- Artisans can view and manage workshop schedules.
- Artisans can view and act on orders/bookings.
- Artisans can view and approve/reject/request changes on co-creation requests.
- Product management supports create, edit, publish/unpublish, and pricing changes.
- Dashboard handles loading, empty, error, and unauthorized states.

Notes:

- Existing artisan dashboard, product list, order list, and messages are mostly read-only prototype surfaces.
- Current product add button is an alert and order statuses cannot be updated.

## Objective 7: Real-Time Messaging With AI Translation

Description: Support real-time customer/artisan conversations with automatic translation across English and Traditional Chinese/Cantonese.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- Messages are persisted in the backend.
- Customer and artisan chat views receive updates in real time.
- The system supports reconnect and offline/error states.
- Incoming and outgoing messages can store original text, translated text, source language, and target language.
- Translation is powered by the backend AI service, not only local phrase replacement.
- Users can toggle original and translated text.
- Message threads can attach co-creation request, product, workshop, booking, or order context.

Notes:

- Existing artisan chat has local message append and rule-based quick translation.
- Customer chat is static sample UI.
- Need real-time transport decision and implementation, likely WebSocket gateway or SSE plus persistence.

## Objective 8: Stripe Payment Processing

Description: Integrate Stripe for workshop bookings, product purchases, and approved co-creation requests.

Current state: `Not Started`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- Backend creates Stripe Checkout Sessions for cart items.
- Stripe line items are generated from authoritative backend pricing.
- Webhook verifies payment success, failure, cancellation, and relevant disputes/refunds if needed.
- Orders/bookings are created as pending before checkout and confirmed after webhook success.
- Payment status is visible to users and artisans.
- Secrets are loaded from environment variables and never exposed to the frontend.
- Local development supports Stripe CLI webhook testing.

Notes:

- No Stripe dependency or payment API was found.
- Seeded chat contains a payment-looking message, but it is not connected to payment processing.

## Objective 9: Order, Booking, And Confirmation Flow

Description: Create and track product orders, workshop bookings, and approved co-creation orders from checkout through completion.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- Users can see booking/order confirmation after successful payment.
- Users can view order and booking tracking from Profile.
- Artisans can update order or booking status.
- Order records support product purchases, workshop bookings, and co-creation orders.
- Confirmation emails or in-app notifications are specified and implemented for MVP scope.
- Failed/cancelled payment flows are represented clearly.
- Backend APIs support create, read, and update operations with role checks.

Notes:

- Existing backend orders are read-only.
- Existing artisan order management lists seeded data only.
- No customer-facing order history or booking confirmation flow exists yet.

## Objective 10: Vercel Hosting And `craftscape.studio` Domain

Description: Host the production app on Vercel and configure the production domain `craftscape.studio`.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-06-28`

Acceptance Requirements:

- Vercel project is configured for the frontend build.
- Production domain `craftscape.studio` is added and verified in Vercel.
- DNS records point `craftscape.studio` to Vercel.
- Environment variables are configured for frontend and backend endpoints.
- Backend deployment target is defined and reachable from the Vercel frontend.
- Production build passes before deployment.
- Deployment smoke test covers homepage, Explore, Marketplace, Events, AI route availability, and Stripe checkout route availability.

Notes:

- `vercel.json` exists and README references the current Vercel demo URL.
- Domain configuration and production smoke test status are not confirmed in repo.

## Suggested Worktree Split

- `worktrees/mvp-ai-requests`: Objective 1 and co-creation approval pieces from Objective 6.
- `worktrees/mvp-workshops-cart`: Objective 2 and event/workshop model changes.
- `worktrees/mvp-stripe-orders`: Objectives 8 and 9.
- `worktrees/mvp-realtime-messaging`: Objective 7.
- `worktrees/mvp-artisan-portal`: Objective 6.
- `worktrees/mvp-listings-profiles`: Objective 5.
- `worktrees/mvp-onboarding-journey`: Objectives 3 and 4 after core flows stabilize.
- `worktrees/mvp-vercel-domain`: Objective 10.

## Cross-Worktree Coordination Notes

- Keep shared data models small and reviewed early: `Event`, `Order`, `MessageThread`, co-creation request, cart item, and payment status.
- Avoid each worktree inventing its own order or booking status enum.
- Stripe and order/booking work should agree on the final checkout success and cancellation URLs before UI work starts.
- Real-time messaging should define whether co-creation and order events appear as system messages in chat.
- Any worktree changing shared types should update this tracker before implementation starts and after merge.
