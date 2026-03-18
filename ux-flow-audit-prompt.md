# UX Flow & User Experience Audit Prompt

## How to Use

Copy the prompt below and give it to an AI agent along with your codebase, screenshots, screen recordings, or a live URL. This audit is about whether the app **makes sense** — not how it looks, but how it *feels* to use. Does the user always know where they are, what to do next, and why?

---

## The Prompt

```
You are a senior UX researcher and product designer performing a deep user
experience and flow audit on our application.

Our app has three main surfaces:
1. **Practitioner Dashboard** — where practitioners manage their work
2. **User Dashboard** — where end users interact with the platform
3. **Marketing Site** — public-facing pages (landing, pricing, about, blog, etc.)

Forget how it looks. This audit is about how it THINKS. You are evaluating whether
the application logic, user journeys, page structure, and information architecture
make sense from a human perspective. Pretend you are a first-time user with zero
context and walk through every flow.

For each issue found, provide:
1. What's confusing, broken, or unnecessary
2. The user's likely mental model vs. what the app actually does
3. The friction it causes (confusion, drop-off, support tickets, rage clicks)
4. A specific fix — rewire the flow, not just "make it clearer"

Tag severity:
🔴 LOST (user will get stuck, confused, or abandon the task)
🟡 FRICTION (user can figure it out but it's harder than it should be)
🟢 SMOOTH (minor optimization for delight)

---

### 1. FIRST IMPRESSIONS & ORIENTATION

The first 60 seconds determine whether a user trusts and understands your product.

**Marketing → App Handoff**
- [ ] Can someone read the marketing homepage and accurately predict what the app does?
- [ ] Does the marketing language match the app's actual terminology? (Don't sell "AI Scheduling" if the feature is called "Calendar" inside the app)
- [ ] When a user clicks "Sign Up" or "Get Started," how many steps until they see value? Count every click, field, and page.
- [ ] Is there a mismatch between what's promised on the pricing/features page and what the user actually gets after signing up?
- [ ] Is the signup → first useful screen path under 3 minutes?

**Onboarding**
- [ ] Does the app explain itself on first login, or does it dump the user into an empty dashboard?
- [ ] Is onboarding skippable for experienced users without losing critical setup?
- [ ] Does onboarding teach by doing (interactive) or by reading (walls of text / tooltip tours)?
- [ ] After onboarding, can the user immediately do the #1 thing they signed up for?
- [ ] Are there setup steps that block the user unnecessarily? (e.g., "Complete your profile" before they can do anything)
- [ ] If onboarding is multi-step, is there a progress indicator and can users go back?
- [ ] Does the app feel empty/broken on first use, or is there sample data, helpful prompts, or guided actions?

**The "Aha" Moment**
- [ ] What is the single most valuable action a user can take? How fast can they get to it?
- [ ] Is that action obvious or buried behind navigation, settings, or prerequisite steps?
- [ ] After completing that action, does the app celebrate or confirm value? ("You just booked your first appointment" > silence)

### 2. INFORMATION ARCHITECTURE & MENTAL MODELS

Does the app's structure match how users actually think about their tasks?

**Navigation Logic**
- [ ] Close your eyes and describe the app's structure from memory. If you can't, the IA is too complex.
- [ ] Are menu items grouped by user intent (what they want to do) or by system objects (database tables)?
- [ ] Would a user know which menu item to click to accomplish their top 5 tasks?
- [ ] Are there menu items a new user wouldn't understand without explanation?
- [ ] Is anything hidden in a submenu or settings page that should be a top-level item?
- [ ] Is anything a top-level item that's rarely used and should be nested?
- [ ] Are there overlapping menu items that sound like they do the same thing?
- [ ] Is the menu order based on frequency of use (most used first) or just alphabetical/arbitrary?

**Naming & Labeling**
- [ ] Does the app use the user's language or internal jargon? (Users say "appointment," devs say "session entity")
- [ ] Are the same concepts called the same thing everywhere? (Not "Clients" in the sidebar, "Patients" on the page, "Users" in settings)
- [ ] Would someone outside your company understand every label without a tooltip?
- [ ] Are action labels specific? ("Save" is vague — "Save Appointment" is clear)
- [ ] Are there abbreviations or acronyms that aren't universally known?

**Page Hierarchy**
- [ ] On every page, can you immediately answer: "What is this page for?"
- [ ] Is there a clear primary action on every page, or are there too many competing CTAs?
- [ ] Are pages trying to do too much? (The "Swiss Army Knife" page that should be 3 separate pages)
- [ ] Are there pages that are too thin? (A full page for something that could be a modal or section)
- [ ] Is related information on the same page or spread across multiple pages unnecessarily?

### 3. CORE TASK FLOWS

Walk through every major task end-to-end and evaluate the flow.

**For each core flow, evaluate:**
- [ ] What triggers the flow? (Is the entry point obvious?)
- [ ] How many steps/clicks does it take?
- [ ] Is every step necessary, or are there steps that could be removed or combined?
- [ ] Is the order of steps logical? (Don't ask for payment details before showing the price)
- [ ] Can the user back out at any step without losing progress?
- [ ] Does the user know how far along they are? (Progress bar, step indicators, breadcrumbs)
- [ ] What happens if the user leaves mid-flow and comes back? (Is state preserved?)
- [ ] What happens at the end? (Confirmation, redirect, next suggested action — not nothing)
- [ ] If something fails mid-flow, what happens? (Error recovery, not a dead end)
- [ ] Is there a way to undo or edit after completing the flow?

**Practitioner-Specific Flows**
- [ ] Creating / managing their primary content or service — is this effortless or tedious?
- [ ] Viewing and managing their schedule or queue — can they see what matters at a glance?
- [ ] Communicating with users — is the messaging/notification flow intuitive?
- [ ] Managing their profile, settings, and preferences — is everything findable?
- [ ] Viewing analytics or performance data — is the data meaningful and actionable?
- [ ] Handling edge cases (cancellations, reschedules, refunds, disputes) — are these flows built or duct-taped?

**User-Specific Flows**
- [ ] Discovering and choosing a practitioner — is the search/browse/filter flow smooth?
- [ ] Booking, purchasing, or engaging with a service — is this as simple as it can be?
- [ ] Managing their own bookings/purchases — can they view, edit, cancel easily?
- [ ] Communicating with a practitioner — is the conversation flow clear and accessible?
- [ ] Managing their account and preferences — is everything where they'd expect it?
- [ ] Onboarding as a returning user — is the re-engagement flow smooth?

**Cross-Role Flows**
- [ ] When a practitioner takes an action (e.g., approves a booking), what does the user see? Is it clear and timely?
- [ ] When a user takes an action (e.g., requests a session), what does the practitioner see?
- [ ] Are notification triggers logical and not excessive? (Not 5 emails for one booking)
- [ ] Do both sides have matching levels of information? (User sees status X, practitioner sees status Y — confusing)

### 4. COGNITIVE LOAD & DECISION MAKING

Is the app asking the user to think too hard?

**Page-Level Overload**
- [ ] Are there pages with more than 7 distinct actions visible at once? (7±2 rule)
- [ ] Are there forms with more than 5-7 fields visible at once without grouping?
- [ ] Are there dashboards showing too many widgets/metrics, making nothing feel important?
- [ ] Is content prioritized or is everything visually equal? (If everything is bold, nothing is bold)
- [ ] Are there pages that need a scroll to even understand what the page is for?

**Decision Simplification**
- [ ] When the user has to make a choice, are the options clear and limited?
- [ ] Are defaults set intelligently? (Pre-selected timezone, currency, most common option)
- [ ] Can the user defer non-critical decisions? (Don't force them to set up billing before exploring)
- [ ] Are comparisons easy? (If choosing between plans/options, can they see differences side-by-side?)
- [ ] Are there destructive actions that are too easy to trigger? (Delete button right next to Edit)
- [ ] Are there safe actions that require too many confirmations? (Confirm modal for a non-destructive filter change)

**Progressive Disclosure**
- [ ] Is information revealed when needed, not all at once?
- [ ] Are advanced options hidden behind an "Advanced" toggle or section?
- [ ] Are tooltips/help text available but not intrusive?
- [ ] Are detail pages using expandable sections for secondary info?
- [ ] Is the most important information always visible without clicking or expanding?

### 5. DEAD ENDS, EDGE CASES & UNHAPPY PATHS

This is where most apps fall apart. What happens when things go wrong?

**Dead Ends**
- [ ] Are there any pages with no clear next action? (User finishes reading and... now what?)
- [ ] After completing a task, is the user redirected somewhere useful or stranded?
- [ ] After deleting the last item in a list, does the empty state offer a way to create a new one?
- [ ] If a search returns no results, is there a helpful suggestion or alternative?
- [ ] If a user reaches a feature they can't access (paywall, permissions), is there a clear explanation and path forward?

**Error & Recovery States**
- [ ] If a form submission fails, is the user's input preserved? (Losing a long form to a 500 error is unforgivable)
- [ ] If the network drops, does the app degrade gracefully or just break?
- [ ] Are timeout errors handled (long-running operations, session expiry)?
- [ ] If a payment fails, is the recovery path clear and easy?
- [ ] If the user enters invalid data, does the error message tell them exactly what to fix?
- [ ] Can the user always get back to a known good state? (Escape hatch, cancel, reset, undo)

**Edge Cases**
- [ ] What happens with extremely long text in names, titles, descriptions? (Overflow, truncation, layout break?)
- [ ] What happens with zero data? (New accounts, empty categories, no results)
- [ ] What happens with massive amounts of data? (1000+ list items, years of history)
- [ ] What happens when two people do the same thing simultaneously? (Double booking, race conditions)
- [ ] What happens when a practitioner's availability changes while a user is mid-booking?
- [ ] What happens when a linked entity is deleted? (Practitioner deletes a service that a user has booked)
- [ ] Are there timezone-related issues? (Practitioner in EST, user in PST — who sees what time?)
- [ ] What happens on slow connections? (3G, spotty wifi — is there feedback or just a frozen screen?)

### 6. BACK BUTTON, BROWSER BEHAVIOR & STATE MANAGEMENT

The user's browser is part of your UX. Respect it.

- [ ] Does the back button work correctly on every page? (It should never break, loop, or skip pages)
- [ ] After submitting a form, does the back button take the user back to the form or to the right parent page?
- [ ] Are URLs bookmarkable and shareable? (Does pasting a URL load the exact same state?)
- [ ] Do filters, search queries, tabs, and pagination persist in the URL?
- [ ] If the user refreshes the page mid-flow, is their progress preserved or lost?
- [ ] Do modal/drawer/sheet states affect the browser history correctly? (Back closes the modal, not the page behind it)
- [ ] Are there infinite redirect loops or flashing redirects anywhere?
- [ ] Does command/ctrl+click to open in new tab work on all links?
- [ ] If the user has multiple tabs open, do they conflict or sync properly?

### 7. NOTIFICATIONS, EMAILS & COMMUNICATION FLOWS

Every notification is a UX touchpoint. Are they helpful or noise?

- [ ] List every notification/email the app sends. Is each one necessary?
- [ ] Are there missing notifications? (User books a session but practitioner gets no alert)
- [ ] Are there duplicate or redundant notifications? (Email + push + in-app for the same event)
- [ ] Can users control their notification preferences? Is the settings page easy to understand?
- [ ] Do email notifications link back to the right page in the app (deep links)?
- [ ] Do in-app notifications clear/mark-as-read properly?
- [ ] Is the notification frequency reasonable? (Not 10 emails on day one)
- [ ] Are notifications timed correctly? (Reminder 24 hours before, not 5 minutes before)
- [ ] Do transactional emails match the app's branding and tone?
- [ ] Are notification states visible? (Unread badge, dot indicator, notification center)

### 8. PERMISSIONS, ROLES & ACCESS CONTROL UX

Users should never see things they can't use or be blocked without explanation.

- [ ] If a feature is behind a paywall, does the user see it grayed out with an upgrade prompt or not at all?
- [ ] If a user doesn't have permission for an action, is the error message helpful ("Ask your admin to enable this") or generic ("Access denied")?
- [ ] Are there UI elements (buttons, menu items) visible that the current user can never use? Remove them or explain them.
- [ ] When a user's role or plan changes, does the UI update immediately or require a refresh/logout?
- [ ] Is the upgrade flow smooth? (Pricing visible, plan comparison clear, payment frictionless)
- [ ] After upgrading, is the new feature immediately accessible and obvious?
- [ ] Are admin/owner controls clearly separated from regular user controls?
- [ ] Can a practitioner see exactly what their end user sees? (Preview mode, impersonation)

### 9. TRUST, SAFETY & CONFIDENCE

Does the user feel safe using this app?

- [ ] Before any payment, is the price, what they're getting, and the cancellation policy crystal clear?
- [ ] Are there unexpected charges or commitments hidden in flows?
- [ ] Is personal data collection explained and minimized? (Don't ask for phone number if you don't need it)
- [ ] Are delete and cancel actions reversible or at least confirmed with clear consequences?
- [ ] Is there a way to contact support at every critical point (checkout, error, account issues)?
- [ ] Are third-party integrations disclosed? (If you share data with Stripe, Calendly, etc. — say so)
- [ ] Is the app status visible? (Uptime, maintenance schedules, known issues)
- [ ] Are reviews, testimonials, or social proof present where decisions are made?
- [ ] Does the app feel responsive and fast enough to feel reliable? (Slow = untrustworthy)
- [ ] Is data export available? (Users should never feel locked in)

### 10. PRACTITIONER EXPERIENCE DEEP-DIVE

Practitioners are power users. Their UX needs to support speed, efficiency, and daily use.

- [ ] Can a practitioner complete their top daily tasks without leaving one or two pages?
- [ ] Is the dashboard showing the right data for "right now"? (Today's schedule, pending actions, urgent items)
- [ ] Are bulk actions available where needed? (Select all, bulk approve, bulk message)
- [ ] Are keyboard shortcuts or power-user features available for frequent actions?
- [ ] Is the practitioner's view optimized for their screen size (likely desktop during work hours)?
- [ ] Can practitioners customize their dashboard or workflow? (Reorder, pin, hide widgets)
- [ ] Is there a clear distinction between "my stuff" and "client stuff"?
- [ ] Are practitioner-facing analytics meaningful and not vanity metrics?
- [ ] Is the practitioner's public profile (what users see) editable and previewable?
- [ ] Are practitioner-specific settings (availability, services, pricing) easy to find and update?

### 11. USER EXPERIENCE DEEP-DIVE

End users likely visit less often. Their UX needs to be instantly intuitive every time.

- [ ] Can a user accomplish their primary goal in under 3 clicks from the dashboard?
- [ ] Is the user dashboard focused on their upcoming/active items, not noise?
- [ ] Can users easily find their history (past bookings, transactions, messages)?
- [ ] Is the search/discovery flow (finding a practitioner/service) fast and filterable?
- [ ] Are recommendations or suggestions surfaced to help users discover value?
- [ ] Is rebooking / reordering a one-click action? (Don't make them re-enter everything)
- [ ] Is account management (profile, password, payment methods, notifications) in one findable place?
- [ ] Is logging out and back in seamless? (Session persistence, remember me, magic link option)
- [ ] Does the user get value from the app even when they're not actively booking? (Content, community, tips)
- [ ] Is the user's data portable and visible? (Export history, download receipts, view past interactions)

---

### OUTPUT FORMAT

Deliver your audit as:

1. **Flow Map Assessment** — A high-level map of every major flow in the app (marketing → signup → onboarding → core tasks → settings → offboarding) with a PASS / FRICTION / BROKEN rating for each.
2. **The 5 Worst Moments** — The 5 most painful or confusing moments a user will experience, ranked by impact.
3. **The 5 Best Moments** — The 5 moments that actually feel great, so you know what to protect.
4. **Dead End Inventory** — Every place a user can get stuck with no clear next step.
5. **Unnecessary Step Inventory** — Every click, page, or field that could be removed without losing value.
6. **Cognitive Load Hotspots** — Pages or flows where the user is asked to process too much at once.
7. **Cross-Role Blind Spots** — Places where the practitioner and user experience don't match up logically.
8. **Recommended Flow Rewires** — Specific "move X here, merge Y with Z, remove W" recommendations, not vague suggestions.
9. **Priority Fix List** — Ordered by (user impact × frequency of occurrence). Fix what hurts the most users the most often, first.

Be ruthless. Walk every flow step by step. Click every button. Try to break things.
Try to get lost. Try to be a confused new user. Try to be an impatient power user.
If you find yourself thinking "I guess I'd figure it out eventually" — that's a 🟡.
If you find yourself thinking "Wait, what?" — that's a 🔴.
```

---

## Tips for Best Results

- **Record yourself using the app** (Loom, screen recording) and share the video — the agent can narrate what's confusing.
- **Share your user types and their top 3 tasks** so the agent knows what to prioritize.
- **Provide your current onboarding flow** step by step if it's not obvious from the URL.
- **Share any analytics data** (drop-off rates, most visited pages, rage click heatmaps) to guide the agent toward real problem areas.
- **Run this after the design audit** — fix visual consistency first, then optimize flows. Ugly-but-logical beats pretty-but-confusing.
- **Test with real users too** — this prompt catches structural issues, but nothing replaces watching a real person struggle.
