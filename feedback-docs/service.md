Here are the updated bug and UX issue sections with URL paths attached to each item:

---

## 🔴 Priority Bugs (Fix Immediately)

1. **AI Image Generation non-functional**
`/dashboard/practitioner/services/new` — Step 4 (Cover Image)
No API call fires on "Generate Image" click. No loading state, no error message, no image produced. Button appears functional but is completely inert.

2. **Service type radio card — no visible selected state**
`/dashboard/practitioner/services/new` — Step 1 (Service Type)
Clicking a service type card shows no clear visual feedback (no border highlight, no checkmark, no fill color). Users cannot confirm their selection is registered.

3. **Template checkbox misleading initial state**
`/dashboard/practitioner/services/new` — Step 2 (Tell us about your Session)
The "Use our recommended template" checkbox appears checked on load (dark square visible) but fields are empty. Requires a toggle off and back on to actually populate the fields. Initial state and actual behaviour are misaligned.

---

## 🟡 High-Priority UX Issues

4. **"Mediation" missing from Modality dropdown**
`/dashboard/practitioner/services/new` — Step 2 (Tell us about your Session)
The modality list covers ~80+ spiritual/somatic wellness options but omits entire practitioner categories including Mediation, Counselling, and Life Coaching. Practitioners in those disciplines have no applicable selection.

5. **No availability nudge on success screen or review step**
`/dashboard/practitioner/services/new` — Step 5 (Review) and post-publish success screen
Service publishes into a state where clients immediately see "No availability in the next 30 days" with no path to book. Neither the Review step nor the success screen flags this or prompts the practitioner to set up availability.

6. **Auto-advance on Step 1 radio click bypasses "Next" button**
`/dashboard/practitioner/services/new` — Step 1 (Service Type)
Selecting a radio card immediately advances to Step 2 without requiring the user to click "Next →". The button exists but is effectively inert. Behaviour is inconsistent with Steps 2–4 where "Next" must be clicked explicitly.

7. **Blank cover image renders as large grey box on public service page**
`/sessions/60-minute-mediation-session`
When no image is uploaded or generated, the public-facing service page displays a large empty grey rectangle in the hero area. There is no default/placeholder image. This looks unfinished to prospective clients and reduces booking confidence.

---

## 🟢 Quick Wins (with paths)

8. **Add tooltip to Settings warning icon** — `/dashboard/practitioner` (sidebar)
9. **Add "Create your first service" empty-state CTA** — `/dashboard/practitioner` (dashboard home)
10. **Add "Set up availability" nudge** — post-publish success screen at `/dashboard/practitioner/services/new`
11. **Show richer preview on Review step** — `/dashboard/practitioner/services/new` — Step 5
12. **Make Modality a searchable dropdown** — `/dashboard/practitioner/services/new` — Step 2

