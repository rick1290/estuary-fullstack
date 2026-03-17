# QA Audit — Todo Plan

> Generated: 2026-03-16
> Status: Ready for triage

---

## Priority 1: Ship-Blockers (Fix Before Any Real Users)

### Payments & Earnings — Money Path

- [ ] **CRITICAL: Fix earnings status lifecycle**
  - Earnings created as 'projected' but periodic task only looks for 'pending'
  - No code transitions 'projected' → 'pending' on booking completion
  - 48-hour hold starts at booking time instead of service delivery
  - Files: `payments/services/earnings_service.py`, `payments/tasks.py`, `bookings/services/booking_service.py`
  - Ref: `backend/IMPLEMENTATION_PLAN_EARNINGS_CREDITS.md` (full 6-phase plan ready)

- [ ] **CRITICAL: Package/bundle earnings never created**
  - Practitioners get $0 for package purchases
  - Need progressive earnings: create per-session earnings on completion
  - File: `payments/services/checkout_orchestrator_fast.py:154-168`

- [ ] **CRITICAL: Webhook handler uses deprecated models**
  - `payments/webhooks.py` imports `CreditTransaction`, `PractitionerCreditTransaction`
  - Should use `UserCreditTransaction`, `EarningsTransaction`
  - Consolidate with `payments/services/webhook_service.py` (two handlers exist)

- [ ] **CRITICAL: Race condition in credit balance updates**
  - `UserCreditBalance.update_balance()` has no `select_for_update()` locking
  - Concurrent bookings can double-spend credits
  - File: `payments/models.py:778-801`

- [ ] **HIGH: Floating-point commission math**
  - `int((commission_rate / 100) * gross_amount_cents)` loses precision
  - Use `Decimal` or pure integer math
  - File: `payments/services/earnings_service.py:49`

- [ ] **HIGH: No idempotency on earnings creation**
  - Retry/webhook reprocessing creates duplicate earnings
  - Add unique constraint check before creating
  - File: `payments/services/earnings_service.py:54-121`

- [ ] **HIGH: Refund divides by zero on $0 orders**
  - `refund_ratio = charge['amount_refunded'] / charge['amount']`
  - File: `payments/webhooks.py:263`

- [ ] **HIGH: Package cancellation cascades recursively**
  - Canceling one child cancels siblings, each sibling cancels others → infinite loop or double refunds
  - File: `bookings/models.py:416-427`

- [ ] **HIGH: Payout doesn't actually transfer to Stripe**
  - `# TODO: Implement Stripe Connect transfer`
  - File: `payments/services/payout_service.py:205`

- [ ] **HIGH: No Stripe idempotency key on PaymentIntent creation**
  - Retries create duplicate charges
  - File: `payments/services/payment_service.py:201-217`

- [ ] **MEDIUM: Hardcoded 48-hour hold period**
  - Should be configurable in settings
  - File: `payments/services/earnings_service.py:98-101`

### Security — Production Hardening

- [ ] **CRITICAL: Rotate SECRET_KEY — hardcoded insecure key in repo**
  - File: `estuary/settings.py:26`
  - Move to env var, generate new key, rotate all tokens

- [ ] **CRITICAL: DEBUG=True unconditionally**
  - Change to `DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'`
  - File: `estuary/settings.py:29`

- [ ] **CRITICAL: Remove is_staff/is_superuser from user profile serializer**
  - File: `users/api/v1/serializers.py:74-86`

- [ ] **HIGH: Default permission is IsAuthenticatedOrReadOnly**
  - Change to `IsAuthenticated`, explicitly set AllowAny on public endpoints
  - File: `estuary/settings.py:257-259`

- [ ] **HIGH: Add object-level permissions on BookingViewSet**
  - Potential IDOR: user A accesses user B's booking by ID
  - File: `bookings/api/v1/views.py:73`

- [ ] **HIGH: Use UUID instead of integer ID in JWT claims**
  - File: `estuary/settings.py:464-465`

- [ ] **HIGH: CORS localhost origins should not reach production**
  - Use env-specific CORS settings
  - File: `estuary/settings.py:591-601`

- [ ] **HIGH: Restrict Django admin access**
  - Move to custom URL, add IP whitelist or 2FA
  - File: `estuary/urls.py:24`

- [ ] **MEDIUM: Add rate limiting to auth endpoints**
  - Login, password reset, registration: 5 attempts per 15 min
  - File: `estuary/settings.py:283-286`

- [ ] **MEDIUM: JWT tokens should use HTTP-only cookies for refresh tokens**
  - File: `users/api/v1/views.py:54-69`

- [ ] **LOW: Remove hardcoded ngrok URL from ALLOWED_HOSTS**
  - File: `estuary/settings.py:31`

- [ ] **LOW: Add security event logging (failed logins, permission denials)**

### Bookings & Rooms

- [ ] **CRITICAL: Workshop overbooking — no capacity check**
  - No validation that current_participants < max_participants
  - File: `bookings/services/booking_service.py:129-155`

- [ ] **HIGH: Race condition on workshop slot reservation**
  - No pessimistic locking, concurrent bookings can both succeed
  - File: `bookings/services/booking_service.py:129-155`

- [ ] **HIGH: No validation that session hasn't started/been cancelled before booking**
  - File: `bookings/services/booking_service.py:142-155`

- [ ] **HIGH: Booking + ServiceSession status updates not atomic**
  - Partial failures leave inconsistent state
  - File: `bookings/api/v1/views.py:245-318`

- [ ] **HIGH: Room access doesn't check if session was cancelled**
  - Users can join rooms for cancelled sessions
  - File: `rooms/api/v1/views.py:196-214`

- [ ] **MEDIUM: Reschedule doesn't validate against practitioner availability**
  - File: `services/models.py:956-994`

- [ ] **MEDIUM: Workshop availability doesn't show remaining capacity**
  - File: `practitioners/utils/availability.py:336-423`

- [ ] **MEDIUM: Course bookings don't validate session count matches what was paid for**
  - File: `bookings/models.py:514-544`

### Frontend

- [ ] **CRITICAL: Credit balance cents vs dollars mismatch in checkout**
  - Reads `balance_cents` but treats as dollars
  - File: `app/checkout/page.tsx:82, 340-341`

- [ ] **CRITICAL: Checkout double-submit race condition**
  - No debounce, no idempotency key
  - File: `app/checkout/page.tsx:142-286`

- [ ] **CRITICAL: Dashboard pages have no auth guards**
  - Unauthenticated users hit pages, get raw 401 errors
  - Files: `app/dashboard/user/`, `app/dashboard/practitioner/`

- [ ] **HIGH: No query invalidation after checkout mutations**
  - Credit balance shows stale data after purchase
  - File: `app/checkout/page.tsx:123-140`

- [ ] **HIGH: Timezone not applied to session times**
  - ISO times displayed without timezone conversion
  - File: `app/checkout/confirmation/page.tsx:183, 190`

- [ ] **HIGH: Date parsing fragile — locale-dependent, year-boundary bugs**
  - File: `app/checkout/page.tsx:177-273`

- [ ] **MEDIUM: Promo code is fake — hardcoded $10 discount**
  - File: `app/checkout/page.tsx:288-294`

- [ ] **MEDIUM: Missing null checks before math operations in checkout**
  - File: `app/checkout/page.tsx:340-344`

- [ ] **LOW: Inconsistent price formatting (.toFixed(0) vs .toFixed(2))**
  - Files: `app/checkout/stream/page.tsx`, `app/checkout/page.tsx`

### Data Model Integrity

- [ ] **CRITICAL: Multiple DO_NOTHING foreign keys create orphaned records**
  - ServiceSchedule, ScheduleAvailability, OutOfOffice, EarningsTransaction
  - Fix: Change to CASCADE, SET_NULL, or PROTECT as appropriate

- [ ] **CRITICAL: Booking.service_session is nullable but architecturally required**
  - Has TODO comment: "Make this required after migration"
  - File: `bookings/models.py:114-116`

- [ ] **HIGH: Payment status tracked in 3 places with no sync guarantee**
  - Booking.payment_status, Order.status, EarningsTransaction.status
  - Establish single source of truth

- [ ] **HIGH: Money stored as Decimal (dollars) in referrals/analytics, Integer (cents) elsewhere**
  - Files: `referrals/models.py`, `analytics/models.py`

- [ ] **HIGH: StreamPost poll votes stored in JSONField — race conditions**
  - Need separate PollVote model with atomic updates
  - File: `streams/models.py:275-281`

- [ ] **MEDIUM: Missing database constraints (capacity, date ranges, status consistency)**
- [ ] **MEDIUM: Premium stream content URLs are predictable, no signed URL access control**
- [ ] **LOW: Missing indexes on frequently queried fields**

---

### Status Architecture — The "In Progress" Bug

- [ ] **CRITICAL: Remove `booking.status = 'in_progress'` from workflow activities**
  - Migration 0020 removed 'in_progress' from Booking choices, but code still sets it
  - File: `backend/workflows/booking/activities.py:310-312`
  - Should set `booking.service_session.status = 'in_progress'` instead

- [ ] **CRITICAL: Fix all frontend status checks to use ServiceSession.status**
  - 5+ files check `booking.status === "in_progress"` which is impossible
  - Should check `booking.service_session?.status === "in_progress"`
  - Files:
    - `components/dashboard/user/user-bookings-list.tsx:180, 194`
    - `components/dashboard/practitioner/practitioner-bookings-list.tsx:46`
    - `components/dashboard/practitioner/bookings/booking-detail-view.tsx:53, 74, 268, 299`
    - `components/dashboard/practitioner/practitioner-upcoming-bookings.tsx:25, 68, 71, 151`

- [ ] **HIGH: Remove 'in_progress' from backend query filters**
  - Practitioner views filter `bookings__status__in=['completed', 'confirmed', 'in_progress']`
  - 'in_progress' never matches anything — dead filter
  - File: `backend/practitioners/api/v1/views.py`

- [ ] **HIGH: Booking.status never transitions to 'completed'**
  - After session ends, booking stays 'confirmed' forever
  - Frontend derives "Completed" from timing but this is fragile
  - Decision needed: either add 'completed' back to Booking, or consistently derive from ServiceSession

- [ ] **MEDIUM: Fix 'cancelled' vs 'canceled' spelling inconsistency**
  - Frontend checks for both spellings in some files
  - File: `components/dashboard/practitioner/practitioner-bookings-list.tsx:115`

### Service-Type-Specific Flow Issues

**Sessions:**
- [ ] **HIGH: No availability picker in checkout** — user manually types date/time instead of selecting from available slots
- [ ] **HIGH: Room creation is async** — user can see "Join" button before room exists
- [ ] **MEDIUM: Practitioner new-booking notification not clearly triggered**

**Workshops:**
- [ ] **CRITICAL: No capacity validation** — `booking_service.py:129-155` never checks `current_participants < max_participants`
- [ ] **HIGH: No race condition protection on slot reservation** — concurrent bookings can both succeed past capacity
- [ ] **HIGH: Can book into cancelled or already-started sessions**
- [ ] **HIGH: Spots available cached 10 min** — stale availability shown
- [ ] **MEDIUM: No aggregated participant view for practitioners** — must count bookings manually

**Courses:**
- [ ] **HIGH: No course progress view** — user sees N separate bookings, not "3 of 8 sessions complete"
  - The My Journeys redesign spec (`docs/specs/my-journeys-redesign.md`) addresses this
- [ ] **HIGH: No practitioner enrollment/progress summary**
- [ ] **MEDIUM: Credits integer division loses cents** — `$100 ÷ 3 = $33 × 3 = $99`
  - File: `bookings/models.py:528`
- [ ] **MEDIUM: Course creation requires separate session creation step**
- [ ] **MEDIUM: Earnings calculation unclear for courses** — are they deferred like packages or immediate?
- [ ] **LOW: No validation against enrolling in ended courses**

---

## Priority 2: Post-Launch Improvements

- [ ] Recurring bookings
- [ ] My Journeys redesign (spec complete at `docs/specs/my-journeys-redesign.md`)
- [ ] Modality SEO landing pages
- [ ] SEO infrastructure (sitemap, meta tags, structured data)
- [ ] Onboarding quiz
- [ ] Gift cards
- [ ] Corporate wellness portal

---

## Priority 3: Technical Debt

- [ ] Consolidate Order-as-Parent architecture (plan at `backend/MIGRATION_PLAN_ORDER_AS_PARENT.md`)
- [ ] ServiceSession refactoring for courses/workshops
- [ ] Security event logging and audit trail
- [ ] Load testing and concurrency fixes
- [ ] Mobile app development
- [ ] Internationalization
