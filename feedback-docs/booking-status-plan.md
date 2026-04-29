# Booking Status & Room Lifecycle — Cross-Service Fix Plan

The bundle bug exposed a pile of issues in how room signals + booking status transitions interact. This plan covers all five service types, identifies what's currently broken, and lays out a sequenced fix.

## Architecture recap (two-layer status model)

| Layer | Owns | Statuses |
|-|-|-|
| **`Booking.status`** | reservation/payment | `draft → pending_payment → confirmed → completed / canceled` |
| **`ServiceSession.status`** | event/time slot | `draft → scheduled → in_progress → completed / canceled` |
| **`Room.status`** | LiveKit room lifecycle | `pending → active → ended` |

Flow expected per service: ServiceSession status drives Room creation; Room webhooks drive ServiceSession transitions; ServiceSession completion drives Booking completion + earnings finalization.

---

## What's broken (three independent problems)

### 1. ✅ FIXED — Phantom rooms for unscheduled draft sessions
`backend/rooms/signals.py:78` was creating a LiveKit room for *every* new `ServiceSession`, including the N drafts (`start_time=None`) seeded for bundles/packages. LiveKit's empty-timeout (300s) then fired `room_finished`, which marched every draft session through `in_progress → completed`.

**Fix already shipped:**
- `create_room_for_session` early-returns when `start_time is None`.
- `handle_room_started` no longer flips draft sessions to `in_progress`.
- `handle_room_ended` no longer flips draft sessions to `completed`.

### 2. ❌ Dead task: `mark_completed_bookings` is not loaded by Celery
`backend/bookings/tasks.py` defines `mark_completed_bookings` (the task referenced by the `mark-bookings-complete` Celery Beat entry, runs every 30 min), but `backend/bookings/tasks/` is *also* a package directory. The package shadows the file, so `bookings.tasks.mark_completed_bookings` does not exist on the worker.

Verified live in Docker:
```
$ docker exec ... celery inspect registered | grep -i complete
* complete-booking-post-payment      ← only this one, not mark-completed-bookings
```

The orphaned `from ..tasks import *` line in `bookings/tasks/__init__.py:7` is recursive and a no-op.

**Effect in production:**
- In-person sessions never auto-complete (no room signal to drive it).
- Workshops/courses with practitioners who don't explicitly end the room never complete on the booking layer.
- Earnings stay `projected` instead of transitioning to `pending`.
- Package/bundle child earnings never get created (that creation logic lived inside `mark_completed_bookings`).

### 3. ❌ Booking layer never transitions to `completed` from room webhooks
`handle_room_ended` updates `service_session.status = 'completed'` but doesn't touch `Booking.status` or earnings. The only paths that promote a booking to `completed`:

| Path | Status |
|-|-|
| `mark_completed_bookings` periodic task | broken (#2) |
| `rooms/api/v1/views.py:553` "leave_room" action | works only when the host explicitly clicks Leave |
| Frontend "End session" button (if any) | uncertain |

So `Booking.status='confirmed'` is sticky for almost all completed sessions in prod. EarningsTransaction stays `projected`. The 48-hour available window never starts.

---

## Per-service-type behavior after we ship all the fixes

| Service type | start_time set when? | Room created when? | ServiceSession transitions | Booking → completed | Earnings finalized |
|-|-|-|-|-|-|
| **Session (1-on-1, virtual)** | at checkout | post_save signal (start_time present) | room webhooks | room_finished → mark_booking_completed | yes |
| **Session (1-on-1, in-person)** | at checkout | never (no room) | none from rooms | periodic task by end_time | yes |
| **Workshop** | by practitioner ahead of time | post_save signal | room webhooks | room_finished → mark_booking_completed | yes |
| **Course** | per-session, by practitioner | post_save signal (per session) | per-session room webhooks | per-session same as above | yes |
| **Package child** | when user schedules later | `bookings.api.v1.views.schedule` action | room webhooks | room_finished → mark_booking_completed (per child) | created on completion |
| **Bundle child** | when user schedules later | same | same | same | same |

The two distinct triggers for booking completion: **room ended** (virtual) or **end_time passed** (in-person). Both must work.

---

## Plan

### Phase 0 — Already shipped (commit-ready)
**`backend/rooms/signals.py`** — three guards added so phantom-room flips can't recur:
- `create_room_for_session` skips when `start_time is None`
- `handle_room_started` no-ops on `start_time is None`
- `handle_room_ended` no-ops on `start_time is None`

### Phase 1 — Resurrect `mark_completed_bookings` (highest impact)

**Problem:** `bookings/tasks.py` (file) is shadowed by `bookings/tasks/` (package).

**Fix:** Move the contents of `bookings/tasks.py` into a new module `bookings/tasks/completion.py`, delete the old file, expose the task in `bookings/tasks/__init__.py`, and remove the recursive `from ..tasks import *` line.

```python
# backend/bookings/tasks/__init__.py
from .completion import mark_completed_bookings
from .reminders import *
from .reschedule import *
from .rooms import *
```

**Then** verify the registered name on the worker matches the Beat schedule entry (`mark-completed-bookings`).

**Risk:** low. The file is already correct code; it's purely a packaging issue. Worth deploying alone before anything else so we have telemetry on what got missed.

**Verification:**
```
docker exec ... celery -A estuary inspect registered | grep mark-completed
# should now show: * mark-completed-bookings
```

### Phase 2 — Promote `Booking.status` from the room-ended webhook path

**Problem:** `handle_room_ended` sets `ServiceSession.status='completed'` but the Booking stays `confirmed`. Earnings never transition. This is independent of Phase 1 because virtual sessions normally complete via webhook, not periodic task.

**Fix:** In `rooms/signals.py:handle_room_ended`, after marking the ServiceSession completed, find each `Booking` linked to that session and run `BookingService().mark_booking_completed(booking)`.

Pseudocode:
```python
def handle_room_ended(room):
    if not (room.service_session and room.service_session.start_time):
        return
    room.service_session.status = 'completed'
    room.service_session.actual_end_time = timezone.now()
    room.service_session.save(update_fields=['status', 'actual_end_time'])

    from bookings.services import BookingService
    booking_service = BookingService()
    for booking in room.service_session.bookings.filter(status='confirmed'):
        try:
            booking_service.mark_booking_completed(booking)
        except Exception as e:
            logger.error(f"Failed to mark booking {booking.id} completed from room signal: {e}")
```

**Why per-booking, not bulk:** `mark_booking_completed` does earnings transitions, package/bundle progress increment, and review-request notification — that logic shouldn't be duplicated.

**Risk:** medium. Workshops have many bookings per session; a slow review-request or earnings update could throw. Wrap each booking in try/except so one failure doesn't block siblings.

**Side benefit:** removes the load from the `mark_completed_bookings` task for virtual sessions (it becomes a fallback for missed webhooks).

### Phase 3 — Verify the unscheduled-session schedule path actually works

**Already correct (verified):** `bookings/api/v1/views.py:269` has a `schedule` action. When a user picks a time for a bundle/package child:
1. Updates `service_session.start_time/end_time/status='scheduled'`
2. Calls `room_service.create_room_for_session(session)` if virtual

**One concern:** that action calls `room_service.create_room_for_session()` (the *service method*, not the signal). Need to check whether that method also has any "skip if no start_time" guards that could now trip. Look at `backend/rooms/services/room_service.py` and confirm the method handles the case correctly.

**Action item:** read `room_service.create_room_for_session` and confirm it doesn't share the early-return logic.

### Phase 4 — Bundle/package completion edge cases

After Phase 1+2 ship, bundle child sessions complete normally via room webhooks. But:

**Question:** What about bundle sessions the user purchases but never uses? They sit in `draft` forever. Currently:
- No expiration logic in the codebase that I've found
- `mark_completed_bookings` skips packages/bundles in some branches

**Recommendation:** Treat unused bundle sessions as a separate concern (refunds, expiry policy). Don't try to auto-complete them — that should be a deliberate product decision.

### Phase 5 — Smoke tests

For each service type, manually walk through:
1. **Session (virtual):** book → wait for room → join → leave → confirm Booking.status='completed', earnings.status='pending'.
2. **Session (in-person):** book future → fast-forward end_time → run `mark_completed_bookings` → confirm same.
3. **Workshop:** book a workshop, host ends room → confirm all attendees' bookings marked completed.
4. **Course:** complete one session of a course → confirm only THAT session's booking moves to completed; others stay confirmed.
5. **Bundle/package:** purchase 5-pack → confirm 5 drafts created with `start_time=None`, status=`draft`, **no rooms created**, status stays `draft` for 10+ minutes (longer than LiveKit empty_timeout). Then schedule one → confirm room created, status=`scheduled`. Join → completes correctly.

---

## Risk register

| Risk | Likelihood | Mitigation |
|-|-|-|
| Phase 1 breaks something else when the task starts running for the first time in months/never | medium — there could be a backlog of confirmed-but-past bookings that all complete at once | Run the task once manually first (`celery call mark-completed-bookings`) and inspect the count before letting Beat schedule it. Optionally batch with `--limit`. |
| Phase 2 fires earnings creation/notifications twice (once from webhook, once from task) | low — `mark_booking_completed` checks `service_session.status == 'completed'` and short-circuits | Already idempotent. Verify in code review. |
| LiveKit `room_finished` fires before practitioner intends (timeout misfire) | low — affects whichever pre-existing service used the same path | Existing 15-min join-window guard in `handle_room_started` mitigates the in_progress side; for completion, this is the same risk that already exists. |
| Phase 3 reveals `room_service.create_room_for_session` has its own bug | unknown | Investigate in Phase 3 before trusting the schedule action. |

---

## Recommended order

1. **Phase 0 (already done) → commit + deploy** — stops the bleed for new bundle/package purchases.
2. **Phase 3 (15 min)** — read-only audit; confirms scheduling path is solid before we change anything else.
3. **Phase 1 (1–2 hr)** — fix the dead task, deploy, monitor first run for backlog.
4. **Phase 2 (1 hr)** — webhook → booking completion path, deploy.
5. **Phase 5 (1 hr)** — smoke-test each service type in Docker.

Phase 4 is a product decision, not an engineering bug — separate ticket.

---

## Revision (2026-04-28, after architecture review)

After re-examining: **keeping the `create_room_for_session` signal is the right call** as long as its guards are correct (Phase 0 added the `start_time` guard). Removing it would force ~4 call sites to remember the room-creation step manually — brittle in the opposite direction. The signal is reasonable architecture; the *guards* were the problem.

Replacing original Phase 0/1/2 with a refined sequence:

### Phase 0 ✅ — guards in `rooms/signals.py` (already shipped)

### Phase 1 — Resurrect `mark_completed_bookings`
Move `backend/bookings/tasks.py` content into `backend/bookings/tasks/completion.py`, delete the orphaned file, expose the task in `bookings/tasks/__init__.py`. Verify registration with `celery inspect registered`.

### Phase 2 — Harden `handle_room_ended`
- **No-show guard**: only mark completed if at least one `RoomParticipant` actually joined. Otherwise treat as no-show (booking stays `confirmed`, no earnings finalization, separate notification flow).
- **Booking-level transition**: after marking the ServiceSession completed, iterate `room.service_session.bookings.filter(status='confirmed')` and call `BookingService().mark_booking_completed(booking)` per booking. This drives earnings transition (projected → pending), package/bundle progress increment, and review-request notifications.
- Each booking wrapped in try/except so one failure doesn't block siblings.

### Phase 3 — Transaction safety on room creation
Wrap `create_livekit_room` and `create_room_for_session`'s LiveKit calls in `transaction.on_commit(...)` so they don't fire if the outer transaction (booking creation) rolls back. Prevents orphaned LiveKit rooms attached to bookings that never persisted.

### Phase 4 — Smoke matrix
Same as original Phase 5.

### Out of scope (future tickets)
- Manual "Mark session complete" UI button for in-person practitioners (better than timer-based auto-complete; periodic task becomes safety net)
- Bundle/package expiration policy
- No-show notification + practitioner action flow

---

## What to check in DB once Phases 1+2 ship

```sql
-- Bookings that should be completed but aren't
SELECT b.id, b.status, ss.status AS session_status, ss.end_time, b.created_at
FROM bookings_booking b
JOIN services_servicesession ss ON b.service_session_id = ss.id
WHERE b.status = 'confirmed'
  AND ss.end_time < NOW() - INTERVAL '24 hours'
  AND ss.start_time IS NOT NULL
ORDER BY ss.end_time DESC
LIMIT 50;
```

If this returns rows after Phase 1 deploys for ~1 hour, something else is wrong.
