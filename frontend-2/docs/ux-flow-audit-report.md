# Estuary UX Flow & User Experience Audit Report

**Date:** March 18, 2026

---

## Flow Map Assessment

| Flow | Rating | Clicks | Notes |
|------|--------|--------|-------|
| Homepage → Understand value | 🟢 SMOOTH | 0 | Hero explains clearly |
| Signup (new user) | 🟢 SMOOTH | 5-6 fields | Beautiful auth modal with role selection |
| Signup → User Dashboard | 🟡 FRICTION | 1 | Lands on empty dashboard, no onboarding |
| Signup → Practitioner Onboarding | 🟢 SMOOTH | 4 steps | Guided checklist, well-designed |
| Browse → Book → Checkout | 🟢 SMOOTH | 3-4 | Clean flow, auto-selects defaults |
| Checkout → Confirmation | 🟢 SMOOTH | 1 | Excellent confirmation with next steps |
| Dashboard → View Upcoming | 🟢 SMOOTH | 0-1 | Visible on home page |
| Dashboard → Join Video Room | 🟢 SMOOTH | 2 | Pre-join lobby with device check |
| Cancel Booking | 🟢 SMOOTH | 3 | Multi-step dialog with reason |
| Leave Review | 🟢 SMOOTH | 2 | Auto-prompts after completion |
| Write Journal Entry | 🟢 SMOOTH | 2 | Inline on delivery page |
| Practitioner: Create Service | 🟡 FRICTION | 14+ steps | Overwhelming wizard |
| Practitioner: View Bookings | 🟢 SMOOTH | 1 | Direct nav |
| Practitioner: Check Earnings | 🟢 SMOOTH | 2 | Finances submenu |
| Practitioner: Message Client | 🟡 FRICTION | 2-3 | Works but mock data visible |
| Role Switch (user ↔ practitioner) | 🟢 SMOOTH | 1 | Clear banner, immediate redirect |
| Forgot Password | 🟢 SMOOTH | 3 | Email → reset link → new password |
| Marketplace Search/Filter | 🟡 FRICTION | 2-3 | Filters not in URL, lost on refresh |

---

## The 5 Worst Moments

### 1. 🔴 Cancellation policy hidden until AFTER purchase
**What:** Users don't see the refund/cancellation terms before paying. The policy only appears on the booking detail page after purchase.
**Mental model:** "I need to know the return policy before I buy"
**Friction:** Reduces trust, could cause chargebacks, support tickets
**Fix:** Add a "Cancellation Policy" accordion or link on the checkout page, right above the payment button. Show: "Full refund if canceled 24+ hours before. No refund within 24 hours."

### 2. 🔴 No user onboarding after signup
**What:** New users land on an empty dashboard with stats showing "0" and no upcoming sessions. No guidance on what to do first.
**Mental model:** "I just signed up, show me what to do"
**Friction:** Confusion, bounce, "is this thing working?"
**Fix:** Add a first-time user experience: welcome banner with 3 steps ("Browse practitioners → Book your first session → Join from your dashboard"), or a simple checklist that dismisses after first booking.

### 3. 🔴 Marketplace filters not in URL — lost on refresh
**What:** When a user applies filters (modality, price, location) on the marketplace page and refreshes, all filters reset. Filtered URLs can't be shared or bookmarked.
**Mental model:** "I'll save this search for later" / "I'll share this link with a friend"
**Friction:** Lost work, frustration, can't share discovery
**Fix:** Sync all filter state to URL search params (`?modality=breathwork&price_min=50&location=virtual`). Use `useSearchParams` from Next.js.

### 4. 🔴 Support not accessible from checkout or error pages
**What:** No "Contact Support" link on the checkout page, error pages, or booking detail "Need Help?" section (links are placeholders with no href).
**Mental model:** "Something went wrong, I need help NOW"
**Friction:** User is stuck with no escape hatch. Abandonment, frustration, negative reviews.
**Fix:** Add `support@estuary.com` or live chat link to: checkout page footer, all error.tsx pages, and wire the "Need Help?" buttons on booking detail.

### 5. 🟡 Service creation wizard shows 14+ steps at once
**What:** The practitioner service creation wizard displays all 14 steps in the stepper simultaneously. New practitioners see a wall of steps before they've even started.
**Mental model:** "This looks like it will take forever"
**Friction:** Overwhelm, abandonment of service creation, incomplete profiles
**Fix:** Group steps into 3-4 collapsible sections (Basic Info, Content, Settings, Publish). Show section progress ("2 of 3 steps complete") instead of all 14 at once. Add "~10 minutes" time estimate.

---

## The 5 Best Moments

### 1. 🟢 Booking confirmation page
Excellent post-purchase experience. Shows confirmation number (copyable), session details, "What's Next" guidance, timezone-aware times, and clear CTAs to either view journeys or continue browsing. Users feel confident their booking worked.

### 2. 🟢 Practitioner dashboard quick navigation
The 8-card grid at the bottom of the practitioner dashboard gives one-click access to every key task: Schedule, Bookings, Services, Availability, Clients, Messages, Streams, Finances. Practitioners never need more than 2 clicks for daily tasks.

### 3. 🟢 Role switcher banner
For dual-role users (both practitioner and client), the colored banner at the top clearly shows "You're viewing as: Client" with a one-click switch. Color-coded (sage for client, terracotta for practitioner). Unambiguous, always visible.

### 4. 🟢 Auth modal design
Beautiful two-panel modal with stats/social proof on the left, form on the right. Role selection as first step of signup. Password validation shows inline. Google OAuth available. Feels premium and trustworthy.

### 5. 🟢 Journey delivery pages
The service-type-specific delivery pages (session, workshop, course, package) adapt their content to the user's current state. Upcoming shows prep + countdown. Completed shows recording + review. Canceled shows refund info. The user always sees what's relevant NOW.

---

## Dead End Inventory

| Where | What Happens | Fix |
|-------|-------------|-----|
| Booking detail "Need Help?" links | Buttons render but have no href/onClick | Wire to support email or contact page |
| Checkout page with no support link | User hits error, no way to get help | Add support link in footer |
| Empty marketplace search results | Behavior unclear — may show nothing | Add "No results" empty state with suggestions |
| Error pages with no context | "Something went wrong" — user doesn't know what | Add specific error messages (payment declined, timeout, etc.) |
| Analytics page "Coming Soon" | Practitioner clicks it, sees placeholder | Either build it or remove from nav |
| Practitioner messages (mock data) | Shows 3 fake messages | Connect to real messaging API |

---

## Unnecessary Step Inventory

| What | Where | Why Remove |
|------|-------|-----------|
| Confirm password field on signup | Auth modal | Modern pattern: single password field + show/hide toggle |
| "Revenue Sharing" step in service wizard | Service creation | Optional, rarely used — should be in advanced settings |
| Separate "Availability" and "Schedule" nav items | Practitioner sidebar | Same concept, should be one "Calendar" page with tabs |
| "About You" step in service wizard | Service creation | This is the practitioner's profile, not per-service. Redundant. |
| Promo code field visible by default on checkout | Checkout page | Hide behind "Have a promo code?" toggle — reduces visual noise |

---

## Cognitive Load Hotspots

| Page | Issue | Load Level |
|------|-------|-----------|
| Service creation wizard | 14+ steps visible in stepper at once | HIGH |
| Practitioner sidebar | 15+ nav items including submenus | HIGH |
| User dashboard (new user) | 6 content blocks, all showing "0" or empty | MEDIUM (confusing) |
| Checkout with all options visible | Payment + credits + promo + special requests + terms | MEDIUM (could collapse optional fields) |

---

## Cross-Role Blind Spots

| Scenario | User Sees | Practitioner Sees | Issue |
|----------|----------|-------------------|-------|
| User books session | Confirmation page + email | Should see new booking notification | Notification delivery unclear |
| Practitioner cancels | Should see cancellation + refund | Cancel dialog | Does user get notified? Email sent? |
| User cancels | Refund info in dialog | Should see cancellation in bookings list | Real-time update unclear |
| Booking detail terminology | "My Journeys" | "Client Bookings" | Different names for same concept |
| Refund policy | Frontend shows 50% at 12-24h | Backend only has 24h threshold | **Policy mismatch — critical** |

---

## Recommended Flow Rewires

### 1. Add user onboarding flow
**Current:** Signup → empty dashboard
**Rewire:** Signup → welcome banner with 3 steps → first step highlighted → dismisses after first booking

### 2. Merge Availability + Schedule into Calendar
**Current:** Two separate nav items
**Rewire:** Single "Calendar" page with tabs: "My Hours" (availability) + "Upcoming" (booked sessions)

### 3. Collapse service wizard steps
**Current:** 14 flat steps in stepper
**Rewire:** 4 sections: Basics (type + info) → Content (media + benefits + goals) → Settings (location + availability + pricing) → Preview & Publish

### 4. Add cancellation policy to checkout
**Current:** Hidden until after purchase
**Rewire:** Collapsible "Cancellation Policy" section above "Complete Payment" button

### 5. Persist marketplace filters to URL
**Current:** Component state, lost on refresh
**Rewire:** All filters synced to URL search params via `useSearchParams`

### 6. Fix refund policy inconsistency
**Current:** Frontend says "50% at 12-24h", backend says "0% under 24h"
**Rewire:** Update booking detail page to match backend: "Full refund if 24+ hours before. No refund within 24 hours."

---

## Priority Fix List

*Ordered by (user impact × frequency)*

| # | Fix | Impact | Frequency | Effort |
|---|-----|--------|-----------|--------|
| 1 | Fix refund policy display (12-24h → matches backend 24h rule) | HIGH | Every booking detail view | 15 min |
| 2 | Add cancellation policy to checkout page | HIGH | Every purchase | 30 min |
| 3 | Wire "Need Help?" links to real support | HIGH | Every confused user | 15 min |
| 4 | Add user onboarding (welcome banner + first steps) | HIGH | Every new signup | 2-3 hrs |
| 5 | Persist marketplace filters to URL | HIGH | Every search session | 2-3 hrs |
| 6 | Collapse service wizard into sections | MEDIUM | Every service creation | 3-4 hrs |
| 7 | Merge Availability + Schedule into Calendar | MEDIUM | Daily practitioner use | 2-3 hrs |
| 8 | Add support link to checkout + error pages | MEDIUM | Error scenarios | 30 min |
| 9 | Hide promo code behind toggle on checkout | LOW | Every checkout | 15 min |
| 10 | Remove "Analytics (Coming Soon)" from nav | LOW | Practitioner confusion | 5 min |
