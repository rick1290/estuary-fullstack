# Bug Tracker — March 31, 2026

Organized by priority and area. Items from user testing session.

---

## CRITICAL — Blocking User Experience

### Course Journey Issues
- [ ] **Course upcoming sessions not showing in "Upcoming" tab** — Yesterday's session showed, but after completing it, the next session (April 3) only shows in "All", not "Upcoming". Likely a filtering issue in the journey list — may be comparing dates incorrectly or the session status isn't updating.
- [ ] **Session resources not displaying on user journey page** — Resources uploaded to a session don't appear on `/dashboard/user/journeys/{id}/{sessionId}`. API returns them at `/api/v1/bookings/{id}` but frontend doesn't render. Also double-check recordings display.
- [ ] **Join Room still showing green after session completed** — On `/dashboard/practitioner/services/{id}/sessions/{sessionId}`, the Join Room button is still active/green even after room ended. Clicking shows "room ended". Need to check session status and gray out/hide when completed.
- [ ] **Review prompt not showing after completed session** — Review option only shows after the call/room ends via post-call screen. Should also show on the journey session page when status is "completed" and no review exists.

### Auth & Navigation
- [ ] **Email link doesn't prompt login** — Clicking email link goes to `/?callbackUrl=/room/{id}` but doesn't show login modal. Just shows homepage. Need to detect `callbackUrl` param and open auth modal.
- [ ] **Message user from session page goes to wrong URL** — `/dashboard/practitioner/messages?user=73` doesn't open the direct chat. Should find or create conversation and navigate to it with `?conversationId=`.

---

## HIGH — Should Fix Before Launch

### Checkout
- [ ] **Course checkout shows "TBC" instead of date/time** — `/checkout?serviceId=114&type=course` doesn't display the course start date correctly.
- [ ] **Checkout confirmation could be 2 columns** — So everything is above the fold.
- [ ] **Add trust/security icons to checkout** — Credit card icons, secure lock, trust badges.

### Practitioner Dashboard — Services
- [ ] **Delete button should be Archive** — Cannot delete services, only archive. Remove delete button. Also can't archive services with open bookings/sessions — add backend validation.
- [ ] **Filter by "Active" doesn't work** on services list page.
- [ ] **"Mark In Progress" button shouldn't exist** — Practitioner shouldn't manually mark in-progress before the scheduled date/time. Remove or auto-trigger only at session start.
- [ ] **Session date/time should link to session manage page** — From settings accordion, link to `/dashboard/practitioner/services/{id}/sessions/{sessionId}`.
- [ ] **Quick Add Recurring Sessions should be at top** — Currently buried below other session editing sections.
- [ ] **Workshop sessions should hide title/description** — Just show dates. Always use the parent service title/description.
- [ ] **Remove hybrid option for location** — Only Online or In-Person.
- [ ] **Review "Booking Rules & Availability" section** — Is it needed? May be unnecessary complexity.
- [ ] **Allow creating intake form within service creation/edit flow** — Currently have to go to a separate page.

### Practitioner Dashboard — Other
- [ ] **Max participants toggle for "No limit"** — In service creation (`/services/new`), add toggle or "No limit" option instead of just a number field.
- [ ] **Feedback button overlaps Next button** — Add padding in service creation wizard.
- [ ] **Default to AI option** on image section in service creation.
- [ ] **No video/audio upload on session detail** — `/dashboard/practitioner/services/{id}/sessions/{sessionId}` — allow uploading recordings/audio resources.

### Branding & Polish
- [ ] **Blue header on course session page** — `/dashboard/user/journeys/{id}/{sessionId}` has light blue in header, should match brand colors.
- [ ] **Onboarding form should be above the fold** — `become-practitioner/onboarding` — no scrolling needed.
- [ ] **Onboarding expertise buttons different sizes** — Buttons in "Your Expertise" section should be uniform.
- [ ] **Onboarding complete page needs brand update** — `become-practitioner/onboarding/complete` — update fonts, keep above fold.
- [ ] **Practitioner profile page needs cleanup** — `/practitioners/melissa-space` — branding consistency.
- [ ] **Remove mock images when null** — `/workshops/efwefewf-wefef` and other pages still show placeholders.
- [ ] **Stripe Connect page branding** — `connect.stripe.com` redirect page needs Estuary branding (limited control — Stripe hosted).

---

## MEDIUM — Nice to Have

### User Experience
- [ ] **Add "View"/"Join" button on journey cards** — On `/dashboard/user/journeys`, show an action button (Join if upcoming, View if past) on each journey card.
- [ ] **Practitioner role switch** — If user is a practitioner, add a menu item/button to switch between client and practitioner views.
- [ ] **Map view for in-person services** — `/marketplace/sessions?format=in-person` — add map showing service locations.

---

## BACKLOG — Future Consideration
- [ ] **Intake form creation within service edit** — Allow building intake forms inline during service creation.
- [ ] **Audio resource upload** — Allow practitioners to upload audio recordings to sessions.
- [ ] **Video upload** — Allow practitioners to upload video content to sessions.

---

## Test Account
- Course testing: `dan.carmody@gmail.com` purchasing `https://estuary-frontend.onrender.com/courses/new-course`
- Testing daily, checking behavior each session.
