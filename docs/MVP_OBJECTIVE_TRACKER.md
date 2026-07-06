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
- Payments use Stripe, in test mode for MVP. A dev-only simulated payment-success path behind an env flag is acceptable so the demo journey never dead-ends while Stripe account setup is pending.
- Artisan/customer messaging should be real-time.
- Co-creation requests require artisan approval before becoming an order or booking.
- Hosting split (decided 2026-07-06): frontend on Vercel with production domain `craftscape.studio`; backend (NestJS with WebSockets and SQLite) on Cloud Run, reusing the existing `server/Dockerfile`, `cloudbuild.yaml`, and deploy scripts. The backend cannot run on Vercel. Supabase (hosting, Postgres, or Auth) is deferred post-MVP; do not migrate toward it in feature worktrees.
- MVP ships with selectable demo identities: a lightweight persona switcher (customer plus seeded artisans) stored in context/localStorage and sent with API calls, replacing hardcoded `demo-customer` / `demo-artisan` / `customer-demo` strings. Real authentication is deferred post-MVP. Do not half-build auth in feature worktrees; the persona switcher is the seam where a real session slots in later.
- One shared confirmation/success surface serves workshop bookings, product orders, and co-creation orders.

## Objective 0: Shared MVP Contracts

Description: Establish the canonical shared TypeScript contracts for events-as-workshops, schedules, capacity holds, cart items, bookings, orders, Stripe payment statuses, co-creation request statuses, artisan approval states, message threads, and real-time message replay before parallel implementation work begins.

Current state: `Done`

Worktree: `main`

Owner: `GPT-5.5`

Last Updated: `2026-07-06`

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

Current state: `Done`

Worktree: `main`

Branch: `mvp/foundation` (merged)

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
- Merged via PR #2 (`c82428b`). Post-merge fixes: repo-root backend Dockerfile, Cloud Run deploy source, Jest package smoke test, deduped contract build chain.

## Objective 1: AI Co-Creation Flow For Craft Design

Description: Let users create AI-assisted craft concepts, submit them to artisans, and track artisan approval before any paid order is created.

Current state: `Done`

Worktree: `main`

Branch: `codex/ai-cocreation-flow` (merged)

Owner: `Codex`

Last Updated: `2026-07-06`

Acceptance Requirements:

- Users can generate craft concepts from text prompts using the backend AI service.
- Generated concepts are persisted to a backend record tied to the user.
- Users can submit a generated concept as a co-creation request to an artisan.
- Artisans can approve, reject, or request changes for co-creation requests.
- Approved co-creation requests can proceed to Stripe checkout or a quoted order.
- Users and artisans can see request status changes.
- Failed AI generation and request submission states are handled with user-facing errors.

Notes:

- Claimed for Objective 1 on branch `codex/ai-cocreation-flow` after kickoff confirmation on 2026-06-28.
- Scope: persist AI concepts, submit co-creation requests, support artisan approve/reject/request-changes decisions, and expose approved requests as quote/checkout-ready before payment.
- Boundary: real Stripe Checkout sessions, webhooks, paid order creation, real-time messaging, and broader artisan dashboard redesign remain out of scope/dependent on Objectives 8, 9, 7, and 6.
- UI gate: standalone co-creation approval HTML preview was approved before React production edits.
- Review evidence: added `AiCreationContract`, persisted AI concept and co-creation request entities, `/api/co-creation` concept/request/decision endpoints, customer submission/status UI, artisan approval queue, bilingual copy, and focused backend transition tests.
- Commands run: `npm run contracts:build`, `npm run test:contracts`, `npm run typecheck`, `npm --prefix server run test -- co-creation.service.spec.ts`, `npm run build`, `npm run server:build`.
- Second review/QA on 2026-07-06 fixed preset concept persistence, friendly AI generation errors, and onboarding dismissal initialization. API QA verified concept generation persistence, request creation as `pending_artisan_review` / `pending`, approve/reject/request-changes decisions, invalid transition rejection, and customer request listing. Browser smoke QA verified customer AI Studio generation/submission success, Profile → My AI Creations request visibility, and Artisan Mode → Orders approval queue/status/quote/deposit readiness copy.
- Merged via PR #4 (`684601a`) on 2026-07-06.
- Post-merge audit on 2026-07-06: acceptance met for request submission, artisan approve/reject/request-changes, status visibility in Profile and artisan Orders queue, and user-facing AI/submission errors.
- Acceptance partially met: backend AI generation (preset shortcuts in `AiStudio` bypass the API), concept persistence (hardcoded `customer-demo` instead of authenticated ownership), and quote/deposit readiness copy without an actionable checkout CTA.
- Acceptance not met by design: real Stripe Checkout sessions, `convertedOrderId` population, and order conversion remain Objective 8/9 dependencies.
- Known follow-ups: real auth scoping, live status refresh without manual Profile revisit, artisan queue filtered by authenticated artisan, and backend tests for generate/submit/reject/request-changes paths.

## Objective 2: Workshop Browsing And Booking

Description: Treat workshops as events, then let users view details, select schedule options, add seats to cart, and book through checkout.

Current state: `Done`

Worktree: `main`

Branch: `mvp/workshops-cart` (merged)

Owner: `GPT-5.5`

Last Updated: `2026-07-06`

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

- Kickoff approved 2026-06-28. Scope: event-backed workshop detail scheduling, quantity selection, add-to-cart, cart preservation of workshop schedule/quantity/price, and pending booking/order creation path.
- UI/UX preview gate applies before React production changes. Standalone HTML preview required for workshop booking detail/cart states.
- Depends on Objective 0 shared contracts and Foundation contract packaging being done. Coordinate any contract gaps before editing `shared/contracts.ts`.
- Stripe redirect, webhook confirmation, and payment failure/cancellation reconciliation remain Objective 8 dependencies; this worktree should expose a pending checkout handoff without implementing Stripe.
- Review evidence: added event-backed workshop schedules for the Obellery workshop, local workshop cart preservation after accepted pending-booking creation, simplified workshop detail scheduling UI aligned to `DESIGN.md`, and NestJS pending booking creation at `/api/bookings/workshops/pending`.
- Acceptance met in this worktree: identifiable workshop event, detail description/host/location/price/capacity/slots, date-time and quantity selection, pending booking creation handoff, and disabled reserved-for-checkout UI after successful reservation.
- Acceptance partially met: cart state is an in-memory `CartContext` mirror updated only after successful pending-booking creation; there is no user-facing cart or checkout surface, cart state is not persisted across refresh, and only the Obellery workshop (event id 8) supports in-app reservation.
- Acceptance not met by design: Stripe redirect, webhook payment confirmation, confirmed capacity decrement, failed/cancelled payment reconciliation, order row creation, and capacity-hold entity usage remain Objective 8/9 dependencies.
- Commands run: `npm run typecheck`, `npm run test:contracts`, `npm run build`, `npm run server:build`.
- Manual QA: approved standalone preview, simplified the design after visual review to remove duplicated price/quantity/top label content, opened local app on `http://127.0.0.1:5005/`, dismissed onboarding, opened Events, opened Obellery workshop detail, verified full slot disabled, selected an available slot, adjusted inline quantity, created a pending booking through the Vite proxy/backend, and confirmed the reserved-for-checkout state rendered without a dead-end checkout CTA.
- Review fix 2026-07-05: resolved P2 review findings by moving local cart mutation after successful pending booking creation and replacing the no-op `Continue to checkout` success CTA with a disabled reserved status.
- Verification rerun 2026-07-05 after review fixes: `npm run typecheck`, `npm run test:contracts`, `npm run build`, `npm run server:build`.
- Merged via PR #3 (`0f80a25`) on 2026-07-06.
- Post-merge audit on 2026-07-06: `Done` is accurate for the scoped booking handoff; literal acceptance items for Stripe redirect, payment confirmation, and capacity decrement are intentionally deferred.

## Objective 3: User Onboarding Flow

Description: Guide first-time users through discovery, co-creation, workshop booking, marketplace purchase, checkout, and profile tracking.

Current state: `Review`

Worktree: `worktrees/mvp-onboarding-journey`

Branch: `mvp/onboarding-journey`

Owner: `Cursor`

Last Updated: `2026-07-07`

Acceptance Requirements:

- First-time users see onboarding once, with dismissal persisted.
- Onboarding explains Explore, AI co-creation, workshop booking, marketplace purchase, checkout, and profile tracking.
- Onboarding can be reopened from profile or settings.
- Copy is available in English and Traditional Chinese.
- Flow is accessible by keyboard and screen readers.

Notes:

- Review evidence (2026-07-07): expanded `OnboardingGuide` to 5 slides (Explore, co-creation, marketplace, workshops, profile/checkout tracking); EN + zh copy and a11y (`role="dialog"`, `aria-live`, localized Back/Close, Escape dismiss, `.sr-only` utility); persistence and Profile Help reopen unchanged; onboarding reopen resets to step 1 via session key.
- Bugbot fix: `profileTabRequest` counter ensures repeat “View my orders” navigates to Orders even when Profile stays mounted.
- HTML preview gate exempt (same carousel layout, copy + icon extension only).
- Commands: `npm run typecheck`, `npm run build`. Manual QA: `docs/MANUAL_QA_CORE_JOURNEYS.md` (onboarding, Stripe return error, Profile Orders).

## Objective 4: Core User Journey UI/UX Mapping

Description: Document and validate the end-to-end journey from discovery to co-creation to booking or purchase to checkout and confirmation.

Current state: `Review`

Worktree: `worktrees/mvp-onboarding-journey`

Branch: `mvp/onboarding-journey`

Owner: `Cursor`

Last Updated: `2026-07-07`

Acceptance Requirements:

- A user journey map exists for discovery, craft detail, co-creation, artisan approval, workshop booking, product purchase, checkout, and confirmation.
- The app navigation supports each journey step without dead ends.
- Empty, loading, error, success, and cancellation states are defined.
- Mobile-first flows are visually reviewed on common viewport sizes.
- Critical flows have a manual QA script or automated E2E coverage.

Notes:

- Review evidence (2026-07-07): `docs/USER_JOURNEY_MAP.md` (co-creation, workshop, marketplace paths + state matrix); `docs/MANUAL_QA_CORE_JOURNEYS.md`; dead-end fixes — `Profile.initialTab` + `tabRequestId` for repeat navigation, Stripe return load failure routes to Profile Orders + `checkoutReturnError`.
- Browser QA (2026-07-07): marketplace purchase → confirmation → Profile Orders on `localhost:5010`; onboarding 5-slide pass; Stripe return error banner pass.
- Commands: `npm run typecheck`, `npm run build`.

## Objective 5: Product And Craft Listing Pages

Description: Provide production-ready listing and detail pages for crafts, products, workshops, artisan profiles, and pricing.

Current state: `Partial`

Worktree: `N/A`

Branch: `codex/listing-pages` (merged)

Owner: `Codex`

Last Updated: `2026-07-06`

Acceptance Requirements:

- Craft listing and detail pages show bilingual craft story, artisan, media, and co-creation CTA.
- Product listing and detail pages show bilingual description, artisan, price, availability, and purchase CTA.
- Workshop listings use the event model and show pricing plus schedule information.
- Artisan profile pages show bio, craft expertise, products, workshops, and response/contact options.
- Pricing display is consistent and ready for Stripe line items.
- All listing pages have loading, empty, and error states.

Notes:

- Claimed on branch `codex/listing-pages` for production-ready visitor listings, detail pages, artisan profiles, pricing display, and loading/empty/error states.
- UI/UX design preview approved, then production implementation added.
- QA follow-up on 2026-07-04 found marketplace card alignment, product detail hierarchy, product artisan routing, and artisan profile clipping issues; these were redesigned and reverified.
- Workshop listing and detail UX on `main` overlaps Objective 2; this objective owns visitor craft/product listings and artisan profile surfaces, not workshop booking flow.
- Review evidence: added standalone preview at `docs/objective-5-listings-preview.html`; enriched artisan/product display data with product kind, customization mode, artisan IDs, material/fulfillment copy; added visitor-facing artisan profile sheet; rebuilt Marketplace with Ready-made/Customizable segmentation and standardized card rows; rebuilt Product Detail as an editorial commerce page with one primary CTA and working artisan profile route; added listing loading/empty/error states.
- Visual QA: opened fresh dev server at `http://localhost:5174/`; checked Marketplace ready-made and customizable tabs; opened customizable product detail; confirmed product `View artisan` routes to artisan profile; confirmed artisan back button returns to Product Detail; confirmed custom design CTA opens design surface.
- Commands run: `npm run typecheck`, `npm run build`.
- Reopened on 2026-07-06 to address final QA: remove segment counts/repeated availability tags, standardize Product Detail fields, and route all customizable products to craft-specific AI Studio.
- Corrective review evidence on 2026-07-06: removed Marketplace segment counts and repeated available/type tags; Product Detail now uses standardized description plus product information fields; all customizable product CTAs with craft IDs route to the matching AI Studio craft. Browser QA confirmed Marketplace labels/cards, ready-made Product Detail, artisan profile/back navigation, customizable tab, Mahjong Tile Carving detail, and Mahjong custom CTA to AI Studio.
- Commands run after corrective work: `npm run typecheck`, `npm run build`, `npm run test:contracts`.
- Review PR: https://github.com/ambr-0-se/CraftscapeHK/pull/5
- Merged via PR #5 (`268fea8`) on 2026-07-06.
- Post-merge audit on 2026-07-06: acceptance met for Marketplace rebuild, bilingual product/craft detail pages, artisan profile bio/expertise/products routing, and Explore/Marketplace loading/empty/error states.
- Acceptance partially met: craft listing shows `short_description` only and first image only (no gallery or listing-level co-creation CTA); product purchase CTA prepares intent only (no cart/checkout handoff); workshop cards on Events show pricing and schedule summaries via the event model; product pricing uses display strings rather than cents/currency fields needed for Stripe line items.
- Acceptance not met: artisan profile has no workshops section, the Contact artisan button is unwired, and `Events` has no fetch error state despite locale strings existing.
- Known follow-ups: wire artisan contact to chat, add workshops to artisan profile, normalize product pricing to contract money fields, replace product intent stub with checkout handoff (Objective 8/9), add craft image gallery, and add Events error handling.

## Objective 6: Artisan Dashboard

Description: Give artisans a production-ready dashboard for schedules, orders, products, messages, and co-creation requests.

Current state: `Review`

Worktree: `worktrees/mvp-artisan-portal`

Branch: `mvp/artisan-portal`

Owner: `Codex`

Last Updated: `2026-07-07`

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
- Objective 1 merged co-creation approve/reject/request-changes into artisan Orders (`OrderManagement.tsx`), but the queue is not scoped to the authenticated artisan and broader dashboard requirements remain open.
- "Authenticated artisan" is satisfied for MVP by the selectable demo persona switcher (see Confirmed Product Decisions). This objective owns building the persona switcher and scoping dashboard data to the selected persona.
- This objective also absorbs two adjacent follow-ups: wiring the Objective 5 `Contact artisan` button to chat, and subscribing the Objective 7 artisan inbox (`Messages.tsx`) to `thread:updated` socket events.
- Claimed on 2026-07-06 in worktree `worktrees/mvp-artisan-portal` on branch `mvp/artisan-portal`. Scope confirmed by Lane B kickoff: demo persona switcher, selected-artisan dashboard scoping, status update endpoints/actions using existing contracts, Contact artisan messaging, artisan inbox socket refresh, and dashboard loading/empty/error/unauthorized states. Contract boundary: consume existing order/payment contracts only; coordinate through the user if Lane A contract changes are needed. UI gate: standalone preview required before persona/dashboard production UI edits.
- UI gate progress on 2026-07-06: standalone preview added at `design-previews/artisan-portal-persona-dashboard.html`; waiting for approval before React persona/dashboard production edits.
- Review evidence on 2026-07-07: added `DemoPersonaContext` with localStorage-backed customer/artisan identities, Profile persona switcher, selected-artisan scoping for dashboard/orders/messages/co-creation requests, order and booking status update endpoints/actions using existing shared transition maps, co-creation ownership checks, Contact artisan chat wiring, and artisan inbox `thread:updated` refresh. Product create/edit management remains out of scope/lowest priority for this pass.
- Verification on 2026-07-07: `npm run typecheck`, `npm run test:contracts`, `npm run build`, `npm run server:build`, and `npm --prefix server run test` passed. Browser smoke: Profile selector displayed customer plus seeded artisans; customer persona disabled Artisan Mode; selecting Master Wong opened Artisan Mode scoped to that persona. Full browser API QA was limited because the in-app browser control timed out after reload and a separate server already occupied port 3001; direct worktree backend startup on alternate port was blocked by sandbox listen permissions.
- Follow-up fix on 2026-07-07: hardened API GET fallback so selected-artisan dashboard reads no longer fail when the backend is absent or an older dev backend lacks `/api/bookings`; scoped local seed fallback now covers orders/messages and returns empty booking/co-creation queues. Verification: `npm run typecheck`, `npm run build`.

## Objective 7: Real-Time Messaging With AI Translation

Description: Support real-time customer/artisan conversations with automatic translation across English and Traditional Chinese/Cantonese.

Current state: `Partial`

Worktree: `N/A`

Branch: `codex/real-time-messaging` (merged)

Owner: `Codex`

Last Updated: `2026-07-06`

Acceptance Requirements:

- Messages are persisted in the backend.
- Customer and artisan chat views receive updates in real time.
- The system supports reconnect and offline/error states.
- Incoming and outgoing messages can store original text, translated text, source language, and target language.
- Translation is powered by the backend AI service, not only local phrase replacement.
- Users can toggle original and translated text.
- Message threads can attach co-creation request, product, workshop, booking, or order context.

Notes:

- Claimed in branch `codex/real-time-messaging` on 2026-06-28.
- Kickoff confirmed: WebSocket transport, persisted messages, backend AI translation metadata, reconnect/offline states, translation toggle, and context links for product, workshop/event, booking/order, and co-creation references.
- Dependencies/conflicts: coordinate context-link fields with `mvp/ai-requests`, `mvp/workshops-cart`, and future Stripe/order work; keep shared message contracts canonical.
- Progress: added persisted chat message rows, WebSocket gateway, REST replay/send endpoints, backend AI chat translation, frontend socket subscription service, customer/artisan chat wiring, and context labels in the message inbox.
- Verification run: `npm run test:contracts`, `npm run typecheck`, `npm run server:build`, `npm run build`, `npm --prefix server run test`.
- Visual review note: frontend dev server started, but backend startup approval and in-app browser navigation to the local dev URL were blocked by environment policy, so live visual QA remains pending in an unblocked browser session.
- Fix/re-review pass on 2026-07-06: repairing DTO validation for whitelisted Nest request bodies, customer pending-send persistence, artisan optimistic dedupe, craft-detail context links, and chat composer containment before re-running objective validation.
- Review evidence on 2026-07-06: `npm run test:contracts`, `npm --prefix server run test`, `npm run typecheck`, `npm run server:build`, and `npm run build` passed. Runtime smoke on a clean SQLite database passed for REST thread creation, persisted message send, idempotent duplicate send, replay, craft context creation, and WebSocket message echo. Translation path attempted backend AI translation and stored fallback metadata when the provider returned errors in this environment.
- PR handoff on 2026-07-06: branch `codex/real-time-messaging` is ready for rebase, final verification, push, and pull request creation against `main`.
- Rebase evidence on 2026-07-06: rebased onto `origin/main` (`0f80a25`) after resolving additive conflicts with Objective 2 workshop booking entities. Post-rebase verification passed: `npm run test:contracts`, `npm --prefix server run test`, `npm run typecheck`, `npm run server:build`, and `npm run build`.
- Pull request: https://github.com/ambr-0-se/CraftscapeHK/pull/6
- Rebase refresh on 2026-07-06: rebased onto latest `origin/main` (`268fea8`) after resolving additive conflicts with listing pages and AI co-creation entities. Post-rebase verification passed: `npm run test:contracts`, `npm --prefix server run test`, `npm run typecheck`, `npm run server:build`, and `npm run build`.
- Merged via PR #6 (`2e42d3f`) on 2026-07-06.
- Post-merge audit on 2026-07-06: acceptance met for persisted messages, WebSocket real-time chat views, reconnect/offline/error handling, backend AI translation metadata, original/translated toggle, and product/craft thread creation from detail pages.
- Acceptance partially met: thread context APIs and contracts support workshop, booking, order, and co-creation request types, but the frontend only wires product and craft entry points; co-creation fallback uses `contextId: "general"`; artisan inbox (`Messages.tsx`) is REST-only and does not live-update from `thread:updated`.
- Acceptance not met by design for full production readiness: authenticated customer/artisan ownership (still `demo-customer` / `demo-artisan`), dedicated backend message service tests, and context-linked threads from workshop booking, orders, and co-creation request records.
- Known follow-ups: wire `ensureMessageThread` from workshop detail, booking/checkout, order management, and co-creation status screens; subscribe artisan inbox to socket updates; add `messages.service` tests; replace demo IDs when auth lands.

## Objective 8: Stripe Payment Processing

Description: Integrate Stripe for workshop bookings, product purchases, and approved co-creation requests.

Current state: `Review`

Worktree: `worktrees/mvp-stripe-orders`

Branch: `mvp/stripe-orders`

Owner: `Claude Code`

Last Updated: `2026-07-07`

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
- Prerequisite discovered in Objective 5 audit: product/workshop pricing currently uses display strings, not money fields. Backend pricing must be normalized to integer cents plus currency before Stripe line items can be generated. This normalization is owned by this objective.
- Webhooks require a publicly reachable backend URL; production target is the Cloud Run backend (see Confirmed Product Decisions). Local development uses Stripe CLI forwarding.
- Per Confirmed Product Decisions, a dev-only simulated payment-success endpoint behind an env flag should be built first so checkout, confirmation, and order tracking are demoable before real Stripe keys are wired; real Stripe Checkout then replaces the simulation without UI changes.
- This objective owns all shared contract changes for orders, payments, and checkout. Other concurrent worktrees consume, never edit, these contracts.
- Review evidence (2026-07-07): added checkout/order contracts to `shared/contracts.ts` (checkout item inputs, `CreateCheckoutSessionInputContract`, `CheckoutSessionResultContract`, `CustomerOrderHistoryEntryContract`, `formatMoneyDisplay`); new `server/src/payments` module with `POST /api/checkout/session`, `GET /api/checkout/orders[/:id]`, `POST /api/checkout/orders/:id/cancel`, and `POST /api/payments/stripe/webhook`; `checkout_orders` entity; product pricing normalized to integer cents (`priceMoney`) on the products API from decimal DB price — display strings never charge.
- Simulated mode: `PAYMENTS_SIMULATED=true` confirms checkout immediately as if the webhook succeeded (supports `simulatedOutcome: success|failure|cancelled` for demoing failure states). Real mode: Stripe Checkout Sessions built from backend cents pricing with `orderId` metadata; webhook verifies signature (`STRIPE_WEBHOOK_SECRET`) and handles `checkout.session.completed`/`async_payment_succeeded|failed`/`expired` and `payment_intent.payment_failed` with `stripeLatestEventId` dedupe. Raw request body preserved on the webhook route for signature verification. Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CHECKOUT_RETURN_BASE_URL`, `PAYMENTS_SIMULATED` — backend only, never the frontend bundle. Stripe CLI local forwarding: `stripe listen --forward-to localhost:3001/api/payments/stripe/webhook`.
- Confirmed payments transition orders `pending_payment → paid`, bookings `pending_payment → confirmed` with the schedule capacity snapshot decremented (and schedule set to `full` at zero availability); failure moves booking to `payment_failed` with retry back to `pending_payment`; cancellation cancels the order/booking per the transition maps.
- Commands run: `npm run typecheck`, `npm run test:contracts` (25 passed), `npm run contracts:build`, `npm run build`, `npm run server:build`, `npm --prefix server run test` (20 passed, incl. 10 new payments specs).
- Manual API QA (simulated mode, via Vite proxy): pending booking → checkout → order paid + booking confirmed + capacity decremented; product priced-on-request rejected; co-creation checkout blocked before approval and converts to order after; failed payment retryable via `orderId`; cancel endpoint cancels order and booking.
- Acceptance not verified in this pass: real Stripe test-mode round trip (needs test keys from the user — code path implemented and unit-tested); in-browser visual QA (Chrome extension unavailable in session; run `npm run dev:stack` with `PAYMENTS_SIMULATED=true`).

## Objective 9: Order, Booking, And Confirmation Flow

Description: Create and track product orders, workshop bookings, and approved co-creation orders from checkout through completion.

Current state: `Review`

Worktree: `worktrees/mvp-stripe-orders`

Branch: `mvp/stripe-orders`

Owner: `Claude Code`

Last Updated: `2026-07-07`

Acceptance Requirements:

- Users can see booking/order confirmation after successful payment.
- Users can view order and booking tracking from Profile.
- Artisans can update order or booking status.
- Order records support product purchases, workshop bookings, and co-creation orders.
- Confirmation emails or in-app notifications are specified and implemented for MVP scope.
- Failed/cancelled payment flows are represented clearly.
- Backend APIs support create, read, and update operations with role checks.

Notes:

- Existing backend orders are read-only (legacy seeded `orders` table kept for prototype artisan surfaces; real checkout orders live in `checkout_orders` matching `OrderContract`).
- Review evidence (2026-07-07): approved design preview `design-previews/checkout-orders.html`; one shared `CheckoutView` sheet serves workshop seats, product purchases, and approved co-creation deposits; one shared `OrderConfirmation` surface covers success, processing, failed, and cancelled outcomes (Confirmed Product Decision); Profile gains an Orders tab with status chips, retry CTA on failed payments, and loading/empty/error states; failed/cancelled payments are visible and retryable, never dead ends.
- Checkout entry points wired: workshop reserved-for-checkout state (EventDetail `Continue to checkout`), product detail purchase CTA (purchasable, non-quote products), approved co-creation requests in Profile (`Pay deposit` CTA). Stripe return redirect (`?checkout=success|cancelled&orderId=`) routes into the confirmation surface.
- In-app confirmation surfaces serve as the MVP notification mechanism (no email; per MVP scope the confirmation screen plus Profile → Orders is the specified implementation).
- Customer ownership check: checkout, history, and cancel APIs take `customerId` (demo `customer-demo`) and reject cross-customer access; artisan-side order status updates remain with Lane B (Objective 6) using `ORDER_STATUS_TRANSITIONS`.
- Acceptance partially met: artisan order/booking status updates are Lane B scope; artisan payment-status visibility is limited to existing surfaces until Lane B scopes the dashboard.
- Commands and QA: see Objective 8 evidence (same worktree/branch).

## Objective 10: Vercel Hosting And `craftscape.studio` Domain

Description: Host the production frontend on Vercel with the `craftscape.studio` domain and deploy the NestJS backend to Cloud Run.

Current state: `Partial`

Worktree: `N/A`

Owner: `TBD`

Last Updated: `2026-07-06`

Acceptance Requirements:

- Vercel project is configured for the frontend build.
- Backend is deployed to Cloud Run using the existing `server/Dockerfile` / `cloudbuild.yaml` path and is reachable over HTTPS, including the WebSocket gateway.
- The Vercel frontend reaches the Cloud Run backend via `VITE_API_URL` or a `vercel.json` `/api` rewrite; currently `vercel.json` only rewrites to `index.html`, so the deployed frontend has no working API.
- Environment variables (AI provider keys, Stripe keys, backend URL) are configured for frontend and backend; secrets never ship to the frontend bundle.
- Production domain `craftscape.studio` is added and verified in Vercel with DNS pointing to Vercel. If DNS propagation is slow, the `*.vercel.app` URL is an acceptable MVP fallback; do not block launch on the custom domain.
- Production build passes before deployment.
- Deployment smoke test covers homepage, Explore, Marketplace, Events, AI route availability, messaging WebSocket connection, and Stripe checkout route availability.

Notes:

- `vercel.json` exists and README references the current Vercel demo URL.
- Hosting split is confirmed: Vercel frontend plus Cloud Run backend (see Confirmed Product Decisions). The NestJS backend (WebSockets, SQLite, Stripe webhooks) cannot run on Vercel.
- Cloud Run deploys were exercised during the Foundation objective (repo-root `docker build -f server/Dockerfile .`).
- Stripe webhook endpoint URL must be registered against the deployed Cloud Run URL after Objective 8 lands.
- Domain configuration and production smoke test status are not confirmed in repo.

## Remaining Execution Plan (revised 2026-07-06 for the final build window)

Run at most two concurrent lanes, then finish sequentially. Kickoff prompts and live handoff state for each lane are in `docs/HANDOFF.md`.

- Lane A (critical path, ~2.5h) — `worktrees/mvp-stripe-orders`, branch `mvp/stripe-orders`: Objectives 8 and 9 together. Owns all order/payment/checkout contract changes. Build the simulated-payment path first, then real Stripe test mode.
- Lane B (parallel, ~1.5h) — `worktrees/mvp-artisan-portal`, branch `mvp/artisan-portal`: Objective 6 plus the demo persona switcher, Objective 5 contact-artisan wiring, and Objective 7 artisan inbox socket subscription. Consumes, never edits, order/payment contracts; rebases onto `main` immediately after Lane A merges.
- Sequential after Lane A merges (~45m) — branch `mvp/onboarding-journey`: Objectives 3 and 4. Update onboarding for the completed flows, then one end-to-end journey QA pass fixing dead ends only.
- Final (~45m) — branch `mvp/deploy`: Objective 10. Cloud Run backend deploy, Vercel API wiring, production smoke test.

Cut list if time runs out (none block the core journey): craft image gallery, Events fetch error state, live co-creation status refresh, artisan profile workshops section, `craftscape.studio` DNS (fall back to the vercel.app URL).

## Cross-Worktree Coordination Notes

- Keep shared data models small and reviewed early: `Event`, `Order`, `MessageThread`, co-creation request, cart item, and payment status.
- Avoid each worktree inventing its own order or booking status enum.
- Stripe and order/booking work should agree on the final checkout success and cancellation URLs before UI work starts.
- Real-time messaging should define whether co-creation and order events appear as system messages in chat.
- Any worktree changing shared types should update this tracker before implementation starts and after merge.
