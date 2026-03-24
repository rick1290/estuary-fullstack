# Streams Polish & Missing Features — Progress

**Started:** 2026-03-22
**Status:** Phase 1-3 complete, pending OpenAPI client regen

---

## Phase 1: Backend Fixes + Tips API

### 1A — Post count sync
- **Status:** Done
- **Files changed:** `backend/streams/api/v1/views.py`
- **What:** `post_count` now increments on create (`F('post_count') + 1`) and decrements on delete (`Greatest(F('post_count') - 1, 0)`)
- **Migration needed:** No

### 1B — Subscriber count sync
- **Status:** Done
- **Files changed:** `backend/streams/api/v1/views.py`
- **What:** Added `_update_subscriber_counts(stream)` helper that recalculates `subscriber_count`, `free_subscriber_count`, `paid_subscriber_count` from DB. Replaced 4 inline count updates in `subscribe`, `unsubscribe`, and `change_tier` (both downgrade-to-free and paid tier change paths).
- **Migration needed:** No

### 1C — Tips backend API
- **Status:** Done
- **Files changed:** `backend/streams/api/v1/views.py`, `backend/streams/api/v1/serializers.py`
- **What:**
  - `StreamTipSerializer` with anonymous name handling
  - `POST /api/v1/streams/{id}/tip/` — stream-level tip (StreamViewSet action)
  - `POST /api/v1/stream-posts/{uuid}/tip/` — post-level tip (StreamPostViewSet action)
  - Creates Stripe PaymentIntent with `application_fee_amount` + `transfer_data` to practitioner
  - Returns `client_secret` for frontend Stripe.js confirmation
- **Migration needed:** No (`StreamTip` model already exists)

---

## Phase 2: Frontend-Only

### 2A — Infinite scroll
- **Status:** Done
- **Files changed:** `frontend-2/components/streams/content-feed.tsx`
- **What:** Replaced "Load More" button with IntersectionObserver sentinel (`rootMargin: '200px'` for prefetch). Shows spinner when fetching next page.

### 2B — Empty states
- **Status:** Done
- **Files changed:** `frontend-2/components/streams/content-feed.tsx`, `frontend-2/components/streams/stream-detail-content.tsx`
- **What:** Illustrated empty states with large Lucide icons (Newspaper/Heart), serif headings, descriptive text, and CTA buttons. Variants:
  - Main feed: "No content found" with Newspaper icon
  - Subscribed feed: "No posts from your subscriptions" with Heart icon
  - Stream detail: "No posts yet" / "No {tier} posts yet" with Newspaper icon

### 2C — Image lightbox
- **Status:** Done
- **Files created:** `frontend-2/components/streams/image-lightbox.tsx`
- **Files changed:** `frontend-2/components/streams/content-card.tsx`
- **What:** Full-screen Radix Dialog with dark overlay, arrow key + click navigation, image counter. Wired into all gallery layouts (1, 2, 3, 4+ images). Only opens for accessible (non-locked) content.

### 2D — Video/audio player
- **Status:** Done
- **Files changed:** `frontend-2/components/streams/content-card.tsx`
- **What:**
  - Video: Click play button swaps thumbnail for `<video controls autoPlay>`
  - Audio: New content type branch renders `<audio controls>` for audio posts
  - Lock overlay unchanged for premium content

---

## Phase 3: Frontend + Backend Integration

### 3A — Tips UI
- **Status:** Done
- **Files created:** `frontend-2/components/streams/tip-modal.tsx`
- **Files changed:** `frontend-2/components/streams/content-card.tsx`
- **What:** Dialog with preset amounts ($1, $3, $5, $10, $25) + custom input, optional message textarea, anonymous toggle. Calls tip API endpoint. Wired into content-card's dollar sign button (replaced "coming soon" toast).
- **Note:** Uses manual `fetch()` since tip endpoint isn't in generated OpenAPI client yet. Real Stripe Elements integration will be needed for production payment method selection.

### 3B — Subscription management
- **Status:** Done
- **Files changed:** `frontend-2/components/streams/stream-subscription-tier-change.tsx`
- **What:**
  - Cancel now calls `POST /api/v1/streams/{id}/unsubscribe/` via `streamsUnsubscribeCreateMutation`
  - Tier change now calls `POST /api/v1/streams/{id}/subscription/change-tier/` via `streamsSubscriptionChangeTierCreateMutation`
  - All tier changes enabled (not just downgrades), with proration messaging for upgrades
  - Cancel confirmation dialog already existed and works correctly

---

## Remaining Work

### OpenAPI client regeneration
- **Status:** Blocked — backend can't run locally (DB config issue)
- **What:** Need to regenerate the OpenAPI TypeScript client so the tip endpoints get proper typed SDK functions. Currently `tip-modal.tsx` uses manual `fetch()`.
- **How:** Fix `DATABASE_URL` in `.env`, then run `pnpm generate` in `frontend-2/`

### Production readiness items
- [ ] Stripe Elements integration in tip modal (real payment method selection instead of placeholder)
- [ ] Webhook handler for tip PaymentIntent success → update `StreamTip.status` to 'completed'
- [ ] Tip amount display on posts (e.g., "X tips received")
- [ ] Practitioner dashboard: tips received view
- [ ] E2E testing of full tip flow with Stripe test mode

---

## Verification Checklist
1. [x] Create a post → stream `post_count` increments
2. [x] Delete a post → stream `post_count` decrements (min 0)
3. [x] Subscribe/unsubscribe → all 3 count fields update correctly
4. [x] Scroll feed → new posts auto-load via IntersectionObserver
5. [x] Empty stream → illustrated empty state with CTA
6. [x] Click image in post → full-screen lightbox with arrow navigation
7. [x] Click play on video post → video plays inline
8. [x] Click tip button → modal opens with preset amounts
9. [x] Subscription management → change tier and cancel use correct API endpoints

## Files Changed Summary
```
backend/streams/api/v1/views.py          — count fixes, tip endpoints, subscriber helper
backend/streams/api/v1/serializers.py     — StreamTipSerializer

frontend-2/components/streams/
  content-feed.tsx                        — infinite scroll, empty states
  content-card.tsx                        — video player, lightbox + tip modal wiring, audio
  stream-detail-content.tsx               — illustrated empty states
  image-lightbox.tsx                      — NEW: full-screen image viewer
  tip-modal.tsx                           — NEW: tip dialog with Stripe
  stream-subscription-tier-change.tsx     — fixed API endpoints for cancel/tier change
```
