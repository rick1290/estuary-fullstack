# My Journeys — Redesign Spec

> Replaces: `/dashboard/user/bookings`
> New route: `/dashboard/user/journeys`

## Problem

The current bookings page is a flat list of individual bookings. This works for one-off sessions but falls apart when a user has:

- A **course** with 12 sub-sessions — shown as 12 separate bookings
- A **session package** (e.g. "8-session coaching bundle") — shown as 8 unrelated items
- A mix of 1:1 sessions, workshops, AND a course — all interleaved with no hierarchy

The user has no sense of **progress**, **continuity**, or **what's next**.

---

## Concept: Everything is a Journey

A "Journey" is a wrapper around what the user purchased. It's not a new database model — it's a **presentation layer** that groups existing bookings by their parent service/package.

| Purchase | Journey Card | Contains |
|----------|-------------|----------|
| Single 1:1 session | Minimal card | 1 booking |
| Session package (8x) | Progress card | 8 bookings (some scheduled, some not) |
| Workshop | Event card | 1 booking + participant context |
| Course | Curriculum card | N sub-session bookings + materials |

---

## Wireframes

### 1. Main View — `/dashboard/user/journeys`

```
┌─────────────────────────────────────────────────────────────┐
│  My Journeys                                                │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  ● Upcoming  │ │  Active (3)  │ │  Completed   │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ┌ Filter chips ──────────────────────────────────────────┐ │
│  │ [All]  [Sessions]  [Courses]  [Workshops]  [Packages] │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ── NEXT UP ────────────────────────────────────────────── │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔵 Tomorrow, 2:00 PM                                   ││
│  │                                                         ││
│  │ Breathwork Mastery Course          Session 4 of 12      ││
│  │ with Sarah Chen                    ████████░░░░ 33%     ││
│  │                                                         ││
│  │ Module: "Rhythmic Breathing Patterns"                   ││
│  │ 📍 Virtual                        [Join Session →]      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🟢 Thursday, 10:00 AM                                  ││
│  │                                                         ││
│  │ Weekly Coaching Session            5 of 8 remaining     ││
│  │ with James Park                    ████████████░░░░ 37% ││
│  │                                                         ││
│  │ 📍 Virtual · 60 min              [Join Session →]      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🟠 Saturday, 9:00 AM                                   ││
│  │                                                         ││
│  │ Sound Healing Workshop                                  ││
│  │ with Maya Rodriguez              12 participants        ││
│  │                                                         ││
│  │ 📍 In Person · Lotus Studio      [View Details →]      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ── THIS WEEK ─────────────────────────────────────────── │
│  ... more journey cards ...                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key behavior:**
- Default tab is "Upcoming" — chronological feed of next actions
- "Active" shows journey cards grouped by purchase (not individual sessions)
- "Completed" is the archive
- Filter chips narrow by type across all tabs

---

### 2. Active Journeys Tab — Grouped by Purchase

```
┌─────────────────────────────────────────────────────────────┐
│  My Journeys                                                │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │   Upcoming   │ │  ● Active(3) │ │  Completed   │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ COURSE                                                  ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ Breathwork Mastery                                  │ ││
│  │ │ with Sarah Chen                                     │ ││
│  │ │                                                     │ ││
│  │ │ ████████████░░░░░░░░░░░░░░░░  4 of 12 complete     │ ││
│  │ │                                                     │ ││
│  │ │ Next: Tue Mar 17 · "Rhythmic Breathing Patterns"   │ ││
│  │ │                                                     │ ││
│  │ │ [View Journey →]                                    │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ SESSION PACKAGE                                         ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ Weekly Coaching                                     │ ││
│  │ │ with James Park                                     │ ││
│  │ │                                                     │ ││
│  │ │ ○ ○ ○ ● ● ● ● ●   3 of 8 complete                 │ ││
│  │ │                                                     │ ││
│  │ │ Next: Thu Mar 19 · 10:00 AM                        │ ││
│  │ │ 2 sessions need scheduling                          │ ││
│  │ │                                                     │ ││
│  │ │ [View Journey →]  [Schedule Next →]                 │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ WORKSHOP                                                ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ Sound Healing Circle                                │ ││
│  │ │ with Maya Rodriguez                                 │ ││
│  │ │                                                     │ ││
│  │ │ Sat Mar 21 · 9:00 AM · 2hr                        │ ││
│  │ │ 📍 Lotus Studio, Portland                          │ ││
│  │ │                                                     │ ││
│  │ │ [View Details →]                                    │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Journey Detail — Course (expanded)

> Route: `/dashboard/user/journeys/[uuid]`

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to My Journeys                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  Breathwork Mastery                           COURSE    ││
│  │  with Sarah Chen                                        ││
│  │                                                         ││
│  │  ████████████░░░░░░░░░░░░░░░░░░░░  4 of 12 complete    ││
│  │  Started Feb 4 · Ends May 20                            ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ ● Schedule   │ │  Resources   │ │    Notes     │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ── COMPLETED ──────────────────────────────────────────── │
│                                                             │
│  ✅  Module 1: Introduction to Breathwork                   │
│      Feb 4 · 60 min · Virtual                               │
│      [Recording] [Notes] [Review]                           │
│                                                             │
│  ✅  Module 2: Diaphragmatic Foundations                    │
│      Feb 11 · 60 min · Virtual                              │
│      [Recording] [Notes]                                    │
│                                                             │
│  ✅  Module 3: Stress Response & Breath                     │
│      Feb 18 · 60 min · Virtual                              │
│      [Recording] [Notes]                                    │
│                                                             │
│  ✅  Module 4: Box Breathing Deep Dive                      │
│      Mar 4 · 60 min · Virtual                               │
│      [Recording]                                            │
│                                                             │
│  ── UP NEXT ───────────────────────────────────────────── │
│                                                             │
│  🔵  Module 5: Rhythmic Breathing Patterns                  │
│      Mar 17 · 2:00 PM · 60 min · Virtual                   │
│      [Join Session →]  [Add to Calendar]                    │
│                                                             │
│  ── UPCOMING ──────────────────────────────────────────── │
│                                                             │
│  ○  Module 6: Pranayama Basics                              │
│      Mar 25 · 2:00 PM                                       │
│                                                             │
│  ○  Module 7: Alternate Nostril Breathing                   │
│      Apr 1 · 2:00 PM                                        │
│                                                             │
│  ○  Module 8–12: ...                                        │
│      Apr 8 – May 20                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Journey Detail — Session Package (expanded)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to My Journeys                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  Weekly Coaching                             PACKAGE    ││
│  │  with James Park                                        ││
│  │                                                         ││
│  │  ○ ○ ○ ○ ○ ● ● ●    3 of 8 complete                   ││
│  │  Purchased Feb 10 · Expires Jun 10                      ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──────────────┐ ┌──────────────┐                          │
│  │ ● Sessions   │ │  Resources   │                          │
│  └──────────────┘ └──────────────┘                          │
│                                                             │
│  ── COMPLETED ──────────────────────────────────────────── │
│                                                             │
│  ✅  Session 1 · Feb 13 · 60 min                            │
│  ✅  Session 2 · Feb 20 · 60 min                            │
│  ✅  Session 3 · Mar 6 · 60 min                             │
│      [View Notes]                                           │
│                                                             │
│  ── SCHEDULED ─────────────────────────────────────────── │
│                                                             │
│  🔵  Session 4 · Thu Mar 19 · 10:00 AM · 60 min            │
│      [Join Session →]  [Reschedule]                         │
│                                                             │
│  🔵  Session 5 · Thu Mar 26 · 10:00 AM · 60 min            │
│      [Reschedule]                                           │
│                                                             │
│  ── NEEDS SCHEDULING ────────────────────────────────────  │
│                                                             │
│  ◻  Session 6           [Schedule →]                        │
│  ◻  Session 7           [Schedule →]                        │
│  ◻  Session 8           [Schedule →]                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ⓘ  3 sessions remaining · Package expires Jun 10       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Journey Detail — Single Session (minimal)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to My Journeys                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │  Reiki Healing Session                       SESSION    ││
│  │  with Amara Osei                                        ││
│  │                                                         ││
│  │  Thu Mar 20 · 3:00 PM · 90 min                         ││
│  │  📍 Virtual                                             ││
│  │                                                         ││
│  │  [Join Session →]  [Reschedule]  [Cancel]               ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ── DETAILS ───────────────────────────────────────────── │
│                                                             │
│  Description                                                │
│  A personalized Reiki session focused on energy             │
│  alignment and stress relief...                             │
│                                                             │
│  Your Notes                                                 │
│  "Would like to focus on lower back tension"                │
│                                                             │
│  Booking Ref: EST-2024-0847                                 │
│  Booked: Mar 12, 2026                                       │
│                                                             │
│  ── POLICIES ──────────────────────────────────────────── │
│  Cancel up to 24hrs before · Free rescheduling              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Resources Tab (inside any Journey Detail)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Schedule    │ │ ● Resources  │ │    Notes     │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ── FROM YOUR PRACTITIONER ────────────────────────────── │
│                                                             │
│  ┌───────────────────────────────────────────┐              │
│  │ 📄  Breathwork Foundations Guide (PDF)    │              │
│  │     Shared after Module 1 · Feb 4         │              │
│  │     [Download]                            │              │
│  ├───────────────────────────────────────────┤              │
│  │ 🎥  Module 3 Recording                   │              │
│  │     60 min · Feb 18                       │              │
│  │     [Watch]                               │              │
│  ├───────────────────────────────────────────┤              │
│  │ 🎥  Module 4 Recording                   │              │
│  │     60 min · Mar 4                        │              │
│  │     [Watch]                               │              │
│  ├───────────────────────────────────────────┤              │
│  │ 🔗  Recommended: Breathing App            │              │
│  │     External link · Shared Mar 4          │              │
│  │     [Open]                                │              │
│  └───────────────────────────────────────────┘              │
│                                                             │
│  ── RELATED STREAMS ─────────────────────────────────────  │
│                                                             │
│  ┌──────────┐ ┌──────────┐                                  │
│  │ 🎧       │ │ 📝       │                                  │
│  │ Guided   │ │ 5 Breath │                                  │
│  │ Breathe  │ │ Patterns │                                  │
│  │ 12 min   │ │ Article  │                                  │
│  │ FREE     │ │ PREMIUM  │                                  │
│  └──────────┘ └──────────┘                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Mapping

No new backend models needed. The grouping is done client-side using existing fields:

```
Booking fields used for grouping:
├── is_course_booking     → group by service.id, show curriculum
├── is_package_booking    → group by related_bookings (parent), show progress
├── is_individual_session → standalone card
├── is_group_session      → standalone card with participant count
└── service.service_type  → icon + label (SESSION / COURSE / WORKSHOP / PACKAGE)

Journey card derives from:
├── service.name              → journey title
├── practitioner.name         → "with [name]"
├── service_session.title     → module/session name (for courses)
├── service_session.start_time → scheduling
├── status                    → completed/upcoming/needs-scheduling
├── recordings                → resources tab
├── notes                     → notes tab
└── related_bookings          → sibling bookings in same package/course
```

### Grouping Logic (pseudocode)

```typescript
function groupIntoJourneys(bookings: BookingListReadable[]): Journey[] {
  const journeys = new Map<string, Journey>()

  for (const booking of bookings) {
    let groupKey: string

    if (booking.is_course_booking || booking.is_package_booking) {
      // Group by parent service
      groupKey = booking.related_bookings || `service-${booking.service.id}`
    } else {
      // Standalone — each booking is its own journey
      groupKey = `booking-${booking.public_uuid}`
    }

    if (!journeys.has(groupKey)) {
      journeys.set(groupKey, {
        id: groupKey,
        type: deriveType(booking),  // 'course' | 'package' | 'session' | 'workshop'
        service: booking.service,
        practitioner: booking.practitioner,
        bookings: [],
      })
    }
    journeys.get(groupKey)!.bookings.push(booking)
  }

  // Sort bookings within each journey chronologically
  for (const journey of journeys.values()) {
    journey.bookings.sort((a, b) =>
      new Date(a.service_session?.start_time) - new Date(b.service_session?.start_time)
    )
    journey.completedCount = journey.bookings.filter(b => b.status === 'completed').length
    journey.totalCount = journey.bookings.length
    journey.nextBooking = journey.bookings.find(b => b.is_upcoming)
  }

  return Array.from(journeys.values())
}
```

---

## Component Architecture

```
app/dashboard/user/journeys/
├── page.tsx                          # Main journeys page
├── [uuid]/
│   └── page.tsx                      # Journey detail page
│
components/dashboard/user/journeys/
├── journeys-list.tsx                 # Main list with tabs + filters
├── journey-card.tsx                  # Polymorphic card (renders differently per type)
├── journey-card-course.tsx           # Course variant with progress bar + module name
├── journey-card-package.tsx          # Package variant with dot progress
├── journey-card-session.tsx          # Simple single-session card
├── journey-card-workshop.tsx         # Workshop card with participant count
├── journey-detail-header.tsx         # Shared header with progress
├── journey-schedule-tab.tsx          # Timeline of sessions (course/package)
├── journey-resources-tab.tsx         # Recordings, files, related streams
├── journey-notes-tab.tsx             # Session notes aggregated
├── upcoming-feed.tsx                 # Chronological "what's next" feed
└── use-journeys.ts                   # Hook: fetches bookings, groups into journeys
```

---

## Interaction Details

### Upcoming Tab (default)
- Shows a **chronological feed** across ALL journeys
- Each item shows enough context: journey name, which session/module, practitioner
- "Join Session" button appears 15 min before virtual sessions (existing logic)
- Grouped by time: "Today", "Tomorrow", "This Week", "Later"

### Active Tab
- Shows **journey cards** grouped by purchase
- Sorted by next upcoming session date
- Each card shows: type badge, title, practitioner, progress, next session date
- Click → journey detail page

### Completed Tab
- Same journey cards but for finished journeys
- Shows completion date, total sessions attended
- Option to leave review (if not already reviewed)

### Filter Chips
- All / Sessions / Courses / Workshops / Packages
- Filters apply across all three tabs
- Persist selection when switching tabs

### Journey Detail Page
- Back button returns to journeys list (preserving tab + filter state)
- Tabs: Schedule (default) / Resources / Notes
- Schedule shows timeline with status indicators per session
- Action buttons contextual to session status

---

## Migration Path

1. Build new `/journeys` route alongside existing `/bookings`
2. Add "My Journeys" to sidebar nav (replace "My Bookings")
3. Redirect `/dashboard/user/bookings` → `/dashboard/user/journeys`
4. Keep booking detail pages working at old URLs (redirect to journey detail)

---

## Open Questions

- [ ] Do session packages exist in the current backend, or only as a concept?
      (Need to verify `is_package_booking` and `related_bookings` are populated)
- [ ] Should resources be a separate top-level tab in the dashboard sidebar,
      or only within journey detail? (Spec assumes within journey only)
- [ ] Can practitioners attach files/links to individual sessions today,
      or does this need backend work?
- [ ] Should completed journeys show an aggregate NPS/review, or per-session?
- [ ] "Related Streams" in resources — is there a service↔stream relationship
      in the backend, or would this be tag/category based matching?
