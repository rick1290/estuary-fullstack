# Practitioner Bookings Page Redesign

**Status**: Planning
**Priority**: Medium — functional but noisy for courses/packages

---

## Problem

The practitioner bookings page (`/dashboard/practitioner/bookings`) shows a flat list of all bookings. If a course has 8 sessions and 3 students, that's 24 rows. This is overwhelming and doesn't match how practitioners think about their clients.

## Current State

- **Schedule page** (`/dashboard/practitioner/schedule`) — already groups by date, shows sessions with attendees. This is the "what's happening next" view and works well.
- **Bookings page** — flat list of every booking, one row per booking. Gets noisy with courses/packages.
- **Purchases endpoint** (`/api/v1/payouts/earnings/purchases/`) — already groups by order, one row per purchase with total amount and client info.

## Proposed Solution

### Keep the schedule page as-is
Practitioners live on this page day-to-day. It's their operational hub — grouped by date, has Join buttons, shows upcoming sessions.

### Rename "Client Bookings" to "Client Activity" and group by order
- Use the existing purchases endpoint as the data source
- One row per purchase/order (not per session)
- Course enrollments: one row showing "8-Week Program — rick nielsen — 3/8 completed — $800"
- Session bookings: one row showing "Cosmic Bliss — sarah chen — Mar 30, 10 AM — $195"
- Workshop bookings: one row showing "Deep Tissue Workshop — 7 enrolled — Mar 31 — $95"
- Click to expand → see individual sessions for courses/packages

### No new APIs needed
The purchases endpoint already returns grouped data. The booking detail page already works for individual booking views.

## Implementation Steps

1. Rename "Client Bookings" sidebar link to "Client Activity"
2. Swap data source from bookings list API to purchases API
3. Build grouped card/row component (one per order)
4. Add expand/collapse for multi-session orders (courses, packages, bundles)
5. Keep filters (search, status, service type)
6. Link each row to the existing booking detail view

## Notes

- The individual booking detail page (`/dashboard/practitioner/bookings/{uuid}`) stays as-is
- The schedule page stays as-is
- The finances/transactions page stays as-is (financial view of the same data)
- This is purely a presentation change on the bookings list page
