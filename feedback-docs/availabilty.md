---

# 🧭 UX Audit Report — Availability Setup
**Tester:** Kevin Wilson, Mediation Practitioner
**Task:** Set up availability schedule
**URL Base:** `/dashboard/practitioner/availability`
**Outcome:** ✅ Schedule successfully created — Mon–Fri, 9:00 AM – 5:00 PM, live on public page

---

## OVERALL IMPRESSION

The availability setup is impressively lightweight for what it covers — a single-page, in-place form with no multi-step flow or page navigation. The day selection and time slot pattern is familiar and fast. However, there are meaningful interaction design gaps, one possible bug with the Copy chevron, and a significant timezone mismatch issue on the public page that would erode client trust immediately.

---

## STEP-BY-STEP NOTES

---

### 📍 Empty State — Availability Landing
**URL:** `/dashboard/practitioner/availability`

**What worked:**
- Clean, minimal empty state with a clear explanation: "Schedules define when clients can book time with you."
- Two entry points to create a schedule: "Create Schedule" (CTA in the empty state body) and "+ New Schedule" (top right) — good redundancy, both work.
- The "Help docs" link next to the page heading is a consistently good pattern from the service flow.

**What didn't work / Observations:**
- No explanation of *what* a schedule is or how it connects to services. A first-time user doesn't know if they need one schedule or many, or whether it applies to all services or one. A single line of contextual copy would help enormously: e.g. "You can create multiple schedules and assign them to specific services."
- No visual illustration or example in the empty state — it's purely text-based. Competitors like Calendly use simple calendar graphics here to aid comprehension.

---

### 📍 Create Schedule Form
**URL:** `/dashboard/practitioner/availability`

**What worked:**
- The form loads inline on the same page (no navigation away) — very smooth, zero disorientation.
- Schedule Name placeholder ("e.g., Regular Hours, Summer Schedule") is genuinely helpful copy — gives practitioners a mental model for naming conventions.
- Timezone pre-populated with "New York (UTC-04:00)" — correctly inferred from account settings. Smart default.
- "Set as default schedule" and "Active" toggles are well-placed and clearly labelled.
- Day buttons (Mon–Sun) as pill-shaped toggles is the right UI pattern — instantly understood.
- Clicking a day immediately reveals a time slot panel for that day with a sensible 9:00 AM – 5:00 PM default. This is excellent — no extra steps to set times.
- "+ Add Time Slot" per day is well-placed for practitioners offering split shifts (e.g., morning and evening blocks).
- All 5 days auto-populated with 9:00 AM – 5:00 PM when selected in sequence — consistent default behaviour.
- "Copy All" correctly applies Monday's hours to all 7 days in one click — genuine time-saver.

**What didn't work / Observations:**

- **🐛 Bug — "Copy" chevron dropdown is non-functional**
`/dashboard/practitioner/availability`
Each day row has a "Copy ˅" button with a chevron, visually suggesting a dropdown menu (e.g. "Copy to all days", "Copy to weekdays"). Clicking the chevron repeatedly produces no dropdown, no tooltip, no action. The chevron is a ghost element. Either the dropdown has not been implemented, or there is a click-target failure. This is confusing — the affordance promises functionality that doesn't exist.

- **🐛 Bug — Trash icon on time slot deselects the entire day (no warning)**
`/dashboard/practitioner/availability`
When I clicked the trash icon (🗑) on a time slot row, instead of only deleting that time slot, it deselected the entire day and removed it from the schedule with no confirmation prompt. A new user who accidentally clicks this loses their day selection silently. Expected behaviour: deleting the only time slot on a day should either (a) prompt "Remove Monday entirely?" or (b) keep the day selected and return it to an empty state with the option to add a new slot.

- **🐛 Bug — Time slot dropdown cannot be scrolled via mouse scroll**
`/dashboard/practitioner/availability`
The time dropdown shows options in a windowed list capped to ~8 visible items. Scrolling the mouse wheel over the open dropdown does not scroll the list — the page scrolls instead. The only way to navigate to later times (e.g. 10:00 AM, 2:00 PM) is to click the small up/down arrow controls inside the list or use `find` to click a hidden option. For a practitioner wanting to set hours other than the top-of-list defaults, this is a significant friction point that may cause them to give up and leave the default 9:00 AM.

- **No "Select Weekdays" shortcut.** Having to click Mon, Tue, Wed, Thu, Fri individually is five actions when one "Weekdays" toggle would suffice. Most practitioners work weekdays. Calendly and Acuity both offer this as a preset. "Copy All" selects all 7 days — there's no "Copy Weekdays Only" equivalent.

- **"Copy All" naming is ambiguous.** It implies copying *times* from one day to all others, but it actually *selects all 7 days* and applies the first day's time to them. This is undiscoverable — I had to trial-and-error to understand it. A tooltip on hover would resolve this instantly. Consider renaming to "Apply to All Days" or "Select All Days + Copy Times."

---

### 📍 Schedule List View (Post-Creation)
**URL:** `/dashboard/practitioner/availability`

**What worked:**
- Clean card summarising the schedule: name, description, days + hours, timezone — all the essentials at a glance.
- Active toggle on the card (no need to enter edit mode to pause a schedule) — efficient.
- "Default" badge clearly signals which schedule is the primary one.
- The "..." menu opening inline edit (rather than navigating to a new page) preserves context beautifully.

**What didn't work / Observations:**
- **No success toast or confirmation message after saving.** After clicking "Create Schedule," the form simply disappears and the card appears. There's no "✅ Schedule created!" notification. This creates a moment of uncertainty: did it save? A brief toast notification would close this loop.
- **No connection shown between schedule and services.** The schedule card has no indication of which services it's linked to (or that it needs to be linked). From the list view alone, Kevin has no idea that the schedule he created is — or isn't — associated with his 60-Minute Mediation Session. This is a continuity gap from the service creation flow.
- The "..." menu has no visible label or tooltip — it's an icon-only control. On mobile or for less tech-savvy users this may not be discoverable.

---

### 📍 Public Service Page — Post Availability Setup
**URL:** `/sessions/60-minute-mediation-session`

**What worked:**
- Times are now showing on the booking widget — the end-to-end connection between schedule and service works correctly.
- "Show all 28 times" expander is a clean pattern for handling a long time list.
- "Reserve Your Session" CTA is prominent and bookable.

**What didn't work / Observations:**
- **🐛 Bug — Time slots display in wrong timezone for clients**
`/sessions/60-minute-mediation-session`
The availability was set as 9:00 AM – 5:00 PM in **America/New_York** timezone. On the public booking page, the first available slots show as **6:00 AM, 6:15 AM, 6:30 AM** — a 3-hour difference suggesting the slots are displaying in Pacific Time (America/Los_Angeles), which is confirmed by the note at the bottom of the widget: "Times shown in America/Los_Angeles." The practitioner set their hours in ET; the client sees PT. A client booking "6:00 AM" would actually be booking Kevin's 9:00 AM slot — but this is not transparent.
This is a meaningful UX and trust issue. Clients need to know the times shown are in *their* local timezone, and practitioners need confidence that their slots are rendered correctly for all time zones. At minimum, there should be a "You're viewing times in your local timezone (PT)" disclaimer *above* the time slots, not buried at the bottom.

---

## 📊 SUMMARY SCORECARD

| Area | Score | Notes |
|---|---|---|
| Empty state clarity | ⭐⭐⭐ | Clear but lacks context on multiple schedules |
| Form design & layout | ⭐⭐⭐⭐ | Inline, lightweight, good defaults |
| Day selection UX | ⭐⭐⭐ | Works but missing "Weekdays" preset |
| Time slot interaction | ⭐⭐⭐ | Defaults are smart; scrolling in dropdown is broken |
| Copy / Copy All | ⭐⭐ | "Copy All" mislabelled; Copy chevron is non-functional |
| Save confirmation | ⭐⭐ | No toast/success feedback on create or save |
| Schedule ↔ Service linkage | ⭐⭐ | No visible connection surfaced to user |
| Timezone handling (public page) | ⭐⭐ | Times display correctly but attribution is buried |

---

## 🔴 Priority Bugs (Fix Immediately)

1. **"Copy" chevron dropdown is non-functional**
`/dashboard/practitioner/availability` — Time Slots section per day
The chevron next to each day's "Copy" button suggests a sub-menu (e.g. "Copy to all", "Copy to weekdays") but produces no action on click. The element is either unimplemented or has a broken click handler.

2. **Trash icon deletes the entire day without confirmation**
`/dashboard/practitioner/availability` — Time Slots section, per-day trash icon (🗑)
Clicking the bin on the only time slot for a day silently removes the entire day from the schedule with no warning, no undo, and no confirmation prompt. This is a destructive, irreversible action with no safety net.

3. **Time dropdown cannot be scrolled with mouse wheel**
`/dashboard/practitioner/availability` — Time slot start/end dropdowns
Opening the time picker and attempting to scroll with the mouse wheel scrolls the page behind the dropdown instead of the dropdown's own list. Users cannot intuitively browse to their desired time and must rely on small in-list arrows, causing significant friction.

4. **Client-facing time slots display in wrong/unlabelled timezone**
`/sessions/60-minute-mediation-session` — Booking widget
Times are displayed in the client's browser timezone (America/Los_Angeles) but the attribution note is positioned *below* the CTA button, after the booking action. A 9 AM ET slot appears as 6 AM to a West Coast client with no upfront explanation. The timezone label must appear *above* the time slot list, not below the Reserve button.

---

## 🟡 High-Priority UX Issues

5. **No success toast or confirmation after saving schedule**
`/dashboard/practitioner/availability`
After clicking "Create Schedule" or "Save Changes," there is no visible confirmation that the action succeeded. The form closes and a card appears, but a brief toast ("✅ Schedule saved") would reduce uncertainty and prevent users from clicking Save multiple times.

6. **No visible link between schedule and service**
`/dashboard/practitioner/availability` — Schedule card view
The schedule card shows no indication of which services it's assigned to, and nowhere in the availability flow does it prompt the practitioner to connect the schedule to a service. A new user who creates a schedule has no assurance their service is bookable.

7. **"Copy All" label is misleading**
`/dashboard/practitioner/availability` — Select Days section
"Copy All" actually selects all 7 days and propagates the first day's time slot to them — but the name implies it copies times only. Rename to "Apply to All Days" or add a hover tooltip explaining the action.

---

## 🟢 Quick Wins

8. Add a "Weekdays" preset shortcut button (Mon–Fri in one click) — `/dashboard/practitioner/availability`
9. Add hover tooltip to "..." menu on schedule cards — `/dashboard/practitioner/availability`
10. Explain multi-schedule use case in empty state — `/dashboard/practitioner/availability`
11. Surface timezone label *above* the time slot list on the public booking page — `/sessions/[service-slug]`
12. Add a one-line prompt after schedule creation: "Connect this schedule to your services in Service Settings" — `/dashboard/practitioner/availability`

