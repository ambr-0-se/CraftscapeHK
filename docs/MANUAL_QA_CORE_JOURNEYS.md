# Manual QA — Core User Journeys (Lane C)

**Date:** 2026-07-07  
**Branch:** `mvp/onboarding-journey`  
**Worktree:** `worktrees/mvp-onboarding-journey`  
**Frontend:** `http://localhost:5010/` (or next free Vite port)  
**Backend:** `http://localhost:3001` (shared) or `PORT=3002` for isolated worktree backend  
**Env:** `PAYMENTS_SIMULATED=true` on backend (when started from this worktree)  
**Viewport:** Cursor embedded browser (~mobile shell)

## Preconditions

```bash
cd worktrees/mvp-onboarding-journey
npm install && npm run contracts:build
PAYMENTS_SIMULATED=true npm run dev:stack
```

Clear `localStorage.hasSeenOnboarding` before the onboarding pass. Use demo customer persona (default).

---

## 1. Onboarding

| Step | Pass |
|------|------|
| First visit shows 5 slides with correct titles (Explore → co-creation → marketplace → workshops → profile) | ✅ |
| Dot indicators show steps 1–5; `aria-live` announces step N of 5 | ✅ |
| Back disabled on step 1; Next advances; final CTA is “Got it!” | ✅ |
| Dismiss persists (`hasSeenOnboarding` in localStorage) | ✅ |
| Reopen from Profile → Help → View app guide | ✅ |
| `Escape` closes overlay | ✅ |
| Dialog semantics (`role="dialog"`, localized Close/Back) | ✅ |
| Switch EN ↔ 繁體中文 during onboarding | ⬜ Not re-run this session |
| Repeat “View my orders” switches back to Orders tab after visiting Favorites | ✅ (via `tabRequestId` increment) |

---

## 2. Journey A — Co-creation

| Step | Pass |
|------|------|
| Explore → craft detail → AI Studio opens | ⬜ Requires GEMINI_API_KEY for live generation |
| Submit co-creation request → Profile Creations shows pending | ⬜ |
| Artisan persona approves → customer Pay deposit | ⬜ |
| Simulated checkout → confirmation success | ⬜ |
| “View my orders” lands on Profile **Orders** tab | ✅ |

---

## 3. Journey B — Workshop booking

| Step | Pass |
|------|------|
| Events → Obellery workshop → select slot + seats | ⬜ Not re-run this session |
| Reserve → Continue to checkout → pay | ⬜ |
| Confirmation → Profile Orders shows booking | ⬜ |
| Existing paid workshop orders visible in Profile Orders | ✅ |

---

## 4. Journey C — Marketplace purchase

| Step | Pass |
|------|------|
| Marketplace ready-made product → Purchase → checkout | ✅ (Handmade Umbrella → Pay HK$418) |
| Confirmation → “Payment received” | ✅ |
| Profile Orders lists purchase | ✅ |

---

## 5. Failure paths & dead-end fixes

| Step | Pass |
|------|------|
| `?checkout=success&orderId=invalid` → Profile Orders + `checkoutReturnError` banner (not silent Explore) | ✅ |
| No onboarding regression after checkout error redirect | ✅ |
| Navigation has no new dead ends introduced by Lane C changes | ✅ |

---

## Commands run

```bash
npm run typecheck   # pass (after apiService contract import fix)
npm run build       # pass
```

## Notes

- Backend on port 3001 was already bound by another worktree during QA; frontend on :5004 proxied `/api` successfully.
- Full co-creation / workshop / marketplace checkout loops were validated in Lane A (`mvp/stripe-orders`); Lane C focused on onboarding, journey documentation, and navigation dead-end fixes.
- Remaining follow-up: one explicit “View my orders” click-through after a fresh simulated checkout in this worktree with dedicated backend on `PAYMENTS_SIMULATED=true`.
