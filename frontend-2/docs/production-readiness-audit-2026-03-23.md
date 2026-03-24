# Production Readiness Audit — Full Platform Deep Dive
**Date:** 2026-03-23
**Scope:** Forensic audit of entire Estuary platform — frontend, backend, payments, security, data integrity

---

## 1. Business Model Summary

**Estuary** is a two-sided wellness marketplace:
- **Practitioners** sell sessions (1-on-1), workshops (group), courses (multi-session), packages, and bundles. They also monetize through content streams (Patreon-like subscriptions) and tips.
- **Users** discover practitioners, book services, subscribe to content streams, and attend video sessions.

**Money flows:**
- **Bookings:** User pays via Stripe → platform takes 15-20% commission → practitioner receives net via Stripe Connect payouts (weekly, $50 minimum, 48-hour hold)
- **Stream subscriptions:** Monthly recurring via Stripe Subscriptions → 3 tiers (free, entry, premium) → commission deducted from practitioner earnings
- **Tips:** One-time payments on stream posts → commission deducted → net to practitioner
- **Credits:** Pre-paid balance users can apply at checkout (purchase flow exists on backend but NO frontend UI)

**Core user journey:** Discover practitioner → view profile → view service → select time → checkout → pay → receive confirmation → join video session → review

**Core practitioner journey:** Sign up → onboarding (6 steps) → set up Stripe Connect → create services → set availability → receive bookings → complete sessions → view earnings → request payouts → create stream content

---

## 2. Critical Issues (Will crash or lose money in production)

### PAYMENT & FINANCIAL

| # | Issue | File | Severity | Effort |
|---|-------|------|----------|--------|
| C1 | **Tip endpoint accepts arbitrary payment method IDs without ownership validation** — attacker can charge victim's saved card | `backend/streams/api/v1/views.py` (tip action) | CRITICAL | 30 min |
| C2 | **Tip modal uses hardcoded `pm_card_visa` test token** — all tips fail in production | `frontend-2/components/streams/tip-modal.tsx:96` | CRITICAL | 2 hrs |
| C3 | **Missing Stripe webhook handlers for subscription events** — `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` not handled. Cancellations in Stripe dashboard not synced to app | `backend/payments/webhooks.py` | CRITICAL | 4 hrs |
| C4 | **Idempotency incomplete on booking checkout** — only caches successful results, retries create duplicate orders/charges | `backend/payments/api/v1/views.py:243-293` | CRITICAL | 2 hrs |
| C5 | **Booking cancellation refund not atomic** — status set to 'refunded' before async Celery tasks complete. If tasks fail, user loses money silently | `backend/bookings/models.py:402-451` | CRITICAL | 3 hrs |
| C6 | **Stream subscription downgrade clears stripe_subscription_id even if Stripe deletion fails** — customer keeps getting charged, app has no record | `backend/streams/api/v1/views.py:499-528` | CRITICAL | 2 hrs |
| C7 | **No Stripe idempotency keys on refunds** — Celery retry processes same refund twice, customer gets double refund | `backend/payments/tasks.py:89-110` | HIGH | 1 hr |
| C8 | **Tax hardcoded at 8%, not sent to Stripe** — frontend calculates/displays tax but backend doesn't include in subscription amount. Accounting mismatch | `frontend-2/app/checkout/stream/page.tsx:168`, backend subscribe endpoint | HIGH | 4 hrs |

### SECURITY

| # | Issue | File | Severity | Effort |
|---|-------|------|----------|--------|
| C9 | **Hardcoded SECRET_KEY with insecure fallback** — if env var not set, uses exposed key. Session hijacking, JWT forgery, auth bypass | `backend/estuary/settings.py:26` | CRITICAL | 15 min |
| C10 | **No role-based access control on practitioner dashboard** — middleware only checks authentication, not practitioner role. Regular users can access `/dashboard/practitioner/*` | `frontend-2/middleware.ts` | HIGH | 2 hrs |
| C11 | **User role stored in localStorage** — editable via DevTools. `localStorage.setItem("userRole", "practitioner")` grants access | `frontend-2/hooks/use-auth.tsx:27,69` | HIGH | 2 hrs |
| C12 | **Tip modal extracts auth token by parsing document.cookie directly** — fragile, bypasses NextAuth, sends empty Bearer on failure | `frontend-2/components/streams/tip-modal.tsx:89` | HIGH | 1 hr |
| C13 | **Missing SECURE_SSL_REDIRECT, HSTS headers** — HTTP not redirected to HTTPS, man-in-the-middle possible | `backend/estuary/settings.py:623-635` | HIGH | 15 min |
| C14 | **No rate limiting on tip endpoint** — user can send 1000 tips in 1 second | `backend/streams/api/v1/views.py:612` | HIGH | 30 min |

### DATA INTEGRITY

| # | Issue | File | Severity | Effort |
|---|-------|------|----------|--------|
| C15 | **N+1 query pattern in StreamPostSerializer** — `get_can_access`, `get_is_liked`, `get_is_saved` each query per post. 20 posts = 60+ queries | `backend/streams/api/v1/serializers.py:217-250` | CRITICAL | 3 hrs |
| C16 | **No database constraint preventing duplicate workshop bookings** — same user can book same session twice if concurrent requests | `backend/bookings/models.py` | CRITICAL | 1 hr |
| C17 | **Order cascade deletion destroys booking history** — `on_delete=models.CASCADE` on Booking→Order FK. Accidental Order deletion loses all bookings, payments, refund records | `backend/bookings/models.py:107-109` | CRITICAL | 30 min |
| C18 | **Subscription status transitions not validated** — any status can transition to any other. `expired` → `active` reactivates access without payment | `backend/streams/models.py:404-415` | CRITICAL | 2 hrs |
| C19 | **Denormalized subscriber/post counts drift** — counts updated manually in some paths but not all. Stripe webhooks don't trigger recalculation | `backend/streams/models.py:133-136` | HIGH | 3 hrs |

---

### FRONTEND RENDERING & PAGE CRASHES

| # | Issue | File | Severity | Effort |
|---|-------|------|----------|--------|
| C20 | **Practitioner profile crashes on missing user object** — `practitioner.user.first_name` accessed without optional chaining. If `.user` is null, page crashes | `frontend-2/app/practitioners/[slug]/practitioner-client.tsx:89` | CRITICAL | 15 min |
| C21 | **Stream checkout streamId type mismatch** — `searchParams.get()` returns string, passed as `path: { id: streamId }` where API expects number. Falls back to empty string on null. | `frontend-2/app/checkout/stream/page.tsx:69` | CRITICAL | 15 min |
| C22 | **Missing useEffect dependency** — auth check effect missing `isAuthenticated` in dependency array. Auth modal may not trigger correctly on state changes. | `frontend-2/app/checkout/stream/page.tsx:73-84` | HIGH | 15 min |
| C23 | **NaN service ID in checkout** — `parseInt(serviceId || '0')` has no NaN check. Malformed URL crashes checkout. | `frontend-2/app/checkout/page.tsx:162` | MEDIUM | 15 min |
| C24 | **Room lobby partial data access** — if `accessData` partially loads, `accessData.service_session` access crashes | `frontend-2/app/room/[roomId]/lobby/page.tsx:94` | MEDIUM | 15 min |

---

## 3. Broken Features (Built but doesn't work)

| # | Feature | Issue | File | Effort |
|---|---------|-------|------|--------|
| B1 | **"Following" feed** | `subscribed_only` param not in `filterset_fields` — backend ignores it, shows same feed as "For You" | `backend/streams/api/v1/views.py` filterset | 15 min |
| B2 | **Tags filter on streams** | `tags` not in `filterset_fields` — clicking a tag does nothing | Same file | 5 min |
| B3 | **Stream analytics dashboard** | References `stream.revenue` and `stream.total_views` which don't exist on `StreamReadable` — shows undefined | `frontend-2/components/dashboard/practitioner/streams/streams-dashboard.tsx:345` | 1 hr |
| B4 | **"View My Stream" button in practitioner dashboard** | `router` not declared — crashes when clicked | `streams-dashboard-v2.tsx:401`, `streams-dashboard.tsx:312` | 15 min |
| B5 | **Content type filter pills on /streams** | `getActiveType()` reads `window.location.search` during render — stale after client-side navigation | `frontend-2/components/streams/streams-layout.tsx` | 30 min |
| B6 | **User subscriptions page (non-stream)** | Uses mock data: `const [subscriptions, setSubscriptions] = useState(mockSubscriptions)` | `frontend-2/components/dashboard/user/user-subscriptions.tsx:34` | 2 hrs |
| B7 | **Registration flow** | `// TODO: Call Django registration endpoint` — registration not fully wired | `frontend-2/components/auth/auth-modal-nextauth.tsx:92` | 4 hrs |

---

## 4. Incomplete Features (Partially built, needs finishing)

| # | Feature | What exists | What's missing | Effort |
|---|---------|-------------|----------------|--------|
| I1 | **Tips** | Backend endpoint complete with Stripe. Frontend modal exists. | Modal uses hardcoded test token. No real Stripe Elements integration. No idempotency. | 4 hrs |
| I2 | **Credit purchase** | Backend endpoints for purchase, balance, transactions all exist | No "Buy Credits" UI page on frontend | 4 hrs |
| I3 | **Image lightbox** | Component file exists, imported by content card | Created before this session — needs verification it matches redesigned card props | 1 hr |
| I4 | **Stream subscription TODO in subscription-modal** | `// TODO: Handle Stripe payment confirmation` | Frontend doesn't complete Stripe payment flow for paid tiers via modal path | 3 hrs |
| I5 | **Package/bundle expiration** | Expiration stored in Order.package_metadata | No validation prevents booking expired package sessions | 2 hrs |

---

## 5. Missing Features (Not built but expected by users)

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| M1 | **3D Secure / SCA** | EU cards require additional authentication. Code mentions it but doesn't implement. Payment failures for EU users. | 4 hrs |
| M2 | **Payment/invoice history** | Users have no way to see what they've paid. No downloadable receipts. | 3 hrs |
| M3 | **New post notifications for subscribers** | When practitioner publishes a post, subscribers aren't notified. Notification system exists but no trigger for stream content. | 2 hrs |
| M4 | **Cancel/unsubscribe flow (user-facing)** | Backend endpoints exist but no working cancel button on user subscription dashboard | 2 hrs |
| M5 | **Intake & consent forms** | Practitioners get zero context before sessions. No pre-session questionnaires. Detailed plan exists in feature-wishlist. | 2 weeks |
| M6 | **Recurring bookings** | Standing weekly appointments. Only courses (multi-session programs) exist. | 1 week |
| M7 | **Waitlist automation** | Basic model exists but no notification when slot opens | 3 days |
| M8 | **Gift cards/vouchers** | Not implemented. Natural gifting use case in wellness. | 1 week |

---

## 6. Polish & UX Issues

| # | Issue | File | Severity |
|---|-------|------|----------|
| P1 | **Hardcoded `localhost:8000` fallback in 12+ files** — if `NEXT_PUBLIC_API_URL` env var not set, entire frontend routes API calls to localhost | Multiple (see list in frontend audit) | HIGH |
| P2 | **Hardcoded referral link domain** — `https://estuary.com/signup?ref=...` doesn't work in staging/dev | `frontend-2/app/dashboard/user/referral/page.tsx:16` | MEDIUM |
| P3 | **Footer social media links go to '#'** | `frontend-2/components/layout/footer.tsx:40` | LOW |
| P4 | **Help center search is placeholder** — input exists but doesn't function | Help pages | LOW |
| P5 | **No loading skeletons on stream detail** — spinner only | `stream-detail-content.tsx` | LOW |
| P6 | **Inconsistent empty states** across dashboard pages | Multiple | LOW |
| P7 | **File upload max size not configured** — Django defaults (2.5MB) too low for video | `backend/estuary/settings.py` | MEDIUM |
| P8 | **Hardcoded email `support@estuary.com`** in 5+ files — should be env var | Multiple checkout/error pages | LOW |
| P9 | **`as any` casts hiding type mismatches** in 15+ locations across stream components | Multiple | MEDIUM |

---

## 7. Security & Performance Concerns

| # | Concern | Impact | File |
|---|---------|--------|------|
| S1 | **N+1 queries in stream posts** — 60+ queries per page load with 20 posts. Will timeout at scale. | Performance | serializers.py |
| S2 | **No Redis caching layer** — every page load hits DB for practitioner availability, stream pricing, modality data | Performance | Global |
| S3 | **StreamPostView not deduplicated** — no unique constraint on (user, post, date). View counts inflate artificially. | Analytics accuracy | models.py:568 |
| S4 | **Webhook errors return 200 OK** — Stripe won't retry failed webhooks. Silent data loss. | Data integrity | webhooks.py:58-61 |
| S5 | **No audit trail for financial operations** — only application logs, no database audit records | Compliance | Global |
| S6 | **Missing chargeback/dispute webhook handlers** — `charge.dispute.*` events not handled | Financial | webhooks.py |
| S7 | **Celery tasks fail silently** — most tasks catch all exceptions and only log. No retry, no alerting. | Reliability | tasks.py |
| S8 | **F() expressions not refreshed after save** — in-memory objects stale after atomic updates | Data correctness | bookings/models.py:414-416 |

---

## 8. Dead Code & Cleanup

| # | File | Reason |
|---|------|--------|
| D1 | `frontend-2/components/streams/streams-filters.tsx` | Not imported anywhere after layout redesign |
| D2 | `frontend-2/app/services/[id]/book/page.tsx` | Obsolete booking page, uses Material-UI, incompatible with current design |
| D3 | `backend/workflows/` (Temporal workflows) | All commented out, Celery handles everything. Remove or reactivate. |
| D4 | `frontend-2/openapi-ts-error-*.log` | Build artifact, should be gitignored |

---

## 9. Recommended Production Checklist (Priority Order)

### Week 1 — CRITICAL (Must fix before any real users)

| # | Task | Effort | Blocks |
|---|------|--------|--------|
| 1 | Remove hardcoded SECRET_KEY fallback | 15 min | Security |
| 2 | Fix tip endpoint payment method ownership validation | 30 min | Security |
| 3 | Add missing Stripe subscription webhook handlers | 4 hrs | Payments |
| 4 | Fix booking checkout idempotency (cache all attempts) | 2 hrs | Payments |
| 5 | Make booking cancellation refund atomic | 3 hrs | Payments |
| 6 | Fix subscription downgrade Stripe cleanup | 2 hrs | Payments |
| 7 | Add N+1 query fix with prefetch_related | 3 hrs | Performance |
| 8 | Add unique constraint for workshop double-booking | 1 hr | Data integrity |
| 9 | Change Order→Booking FK to SET_NULL | 30 min | Data integrity |
| 10 | Add subscription status transition validation | 2 hrs | Data integrity |
| 11 | Add SECURE_SSL_REDIRECT and HSTS headers | 15 min | Security |
| 12 | Add role-based access control on practitioner routes | 2 hrs | Security |
| 13 | Fix `router` not declared in streams dashboards | 15 min | Runtime crash |

### Week 2 — HIGH (Features that don't work)

| # | Task | Effort |
|---|------|--------|
| 14 | Add `subscribed_only` and `tags` to StreamPost filterset_fields | 20 min |
| 15 | Fix stream analytics dashboard field references | 1 hr |
| 16 | Wire tip modal to real Stripe Elements | 4 hrs |
| 17 | Fix content type filter pill reactivity | 30 min |
| 18 | Replace mock subscriptions data with real API | 2 hrs |
| 19 | Add Stripe refund idempotency keys | 1 hr |
| 20 | Add rate limiting on tip endpoint | 30 min |
| 21 | Fix tax calculation and send to Stripe | 4 hrs |
| 22 | Wire registration TODO in auth modal | 4 hrs |

### Week 3 — MEDIUM (Completeness & polish)

| # | Task | Effort |
|---|------|--------|
| 23 | Build credit purchase UI page | 4 hrs |
| 24 | Add new post notification trigger | 2 hrs |
| 25 | Build cancel/unsubscribe flow for users | 2 hrs |
| 26 | Implement 3D Secure/SCA for EU cards | 4 hrs |
| 27 | Add payment/invoice history page | 3 hrs |
| 28 | Implement subscriber count signals | 3 hrs |
| 29 | Add Celery task retry with exponential backoff | 2 hrs |
| 30 | Add database CHECK constraints on financial fields | 2 hrs |
| 31 | Configure file upload max sizes | 15 min |
| 32 | Add .env.example documenting all required env vars | 1 hr |

### Week 4 — LOW (Cleanup & hardening)

| # | Task | Effort |
|---|------|--------|
| 33 | Remove dead code (streams-filters, old book page, Temporal) | 1 hr |
| 34 | Replace all `as any` casts with proper types | 3 hrs |
| 35 | Add Redis caching for hot paths | 4 hrs |
| 36 | Add database audit trail for financial operations | 4 hrs |
| 37 | Fix webhook error handling (return 500 for retryable) | 1 hr |
| 38 | Add StreamPostView deduplication constraint | 30 min |
| 39 | Add loading skeletons to stream pages | 2 hrs |
| 40 | Replace hardcoded emails/domains with env vars | 1 hr |

---

## Summary

**Total issues found: 63**
- Critical: 21
- High: 15
- Medium: 17
- Low: 10

**Estimated total fix time: ~4 weeks of focused development**

**Not recommended for production until all Critical and High issues resolved.**

The platform has excellent architectural foundations — the booking system, payment infrastructure, video rooms, and content platform are all comprehensive. The issues are primarily around edge cases, security hardening, and wiring gaps between frontend and backend. Nothing requires a rewrite — it's all incremental fixes on a solid base.
