---

# Estuary Practitioner Onboarding — UX Test Report

**Tester:** Kevin Wilson (Meditation Teacher & Mindfulness Coach)
**Date:** April 21, 2026
**Flow Tested:** Practitioner profile creation, full 6-step onboarding
**URLs Tested:**
- Onboarding: `https://estuary-frontend.onrender.com/become-practitioner/onboarding`
- Completion: `https://estuary-frontend.onrender.com/become-practitioner/onboarding/complete`
- Dashboard: `https://estuary-frontend.onrender.com/dashboard/practitioner`

---

## Overall Impression

The Estuary onboarding is **visually polished and emotionally warm** — the brand language, design aesthetic, and copywriting are genuine standouts. The 6-step structure is clear, time estimates per step are helpful, and the empty-state messaging on the dashboard is genuinely delightful. However, there are **critical functional bugs** that block practitioners from completing the flow as intended, and meaningful **content gaps** that will frustrate wellness practitioners whose modality is Meditation.

**Overall Rating: 6.5/10** — Beautiful shell with bugs that need urgent fixing.

---

## 🔴 BUGS (Critical — Blockers)

### BUG 1: Continue & Skip Footer Buttons Non-Functional on Step 4
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Step 4)
**Description:** On the Credentials & Education step, both the **Continue** and **Skip** buttons in the sticky footer bar do not advance the form. Clicking Continue returns focus to the last active form field instead of progressing to Step 5. The Skip button also does nothing.
**Workaround found:** Only the inline "Skip →" link above the step content (near the heading) works.
**Impact:** HIGH — Any practitioner who fills in credentials and tries to Continue is completely stuck. Only the inline Skip (which abandons their credential data) escapes the step.
**Fix:** Audit the event handlers on the footer Continue/Skip buttons for Step 4. The form submit event may be conflicting with an unfocused textarea resize handle or input event.

---

### BUG 2: Continue Button Visually Appears Disabled on Steps 4 & 5 (But Is Active on Step 6)
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Steps 4 & 5)
**Description:** The Continue button renders in a muted, gray/olive washed-out style on Steps 4 and 5, making it look disabled — even when the form is properly filled. On Step 6, the button correctly renders in active green ("Complete Setup"). This is a visual inconsistency that will cause practitioners to believe they cannot proceed, increasing drop-off and support requests.
**Fix:** Ensure the CSS active/enabled state for the Continue button is applied consistently across all steps. Check if a `disabled` class or opacity rule is being incorrectly applied to the Step 4/5 button variants.

---

### BUG 3: Accidental Modality Selection — Tarot Auto-Selected When Scrolling Past Collapsed Section Headers
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Step 2 — Session Modalities)
**Description:** When attempting to expand the Breathwork section by clicking its section header, the click registered on the "Tarot" button in the Divination & Oracular Arts category just above it (which was already expanded and overlapping in the scroll position). This caused Tarot to be silently selected without the user's intent.
**Impact:** MEDIUM — Practitioners can accidentally add irrelevant modalities to their profile, damaging discoverability and credibility. The selection is not highlighted prominently enough to catch the error.
**Fix:** Add more vertical spacing between section headers and the chip buttons of the section above them. Also consider adding a visible summary of all selected modalities before the Continue button, so users can review their selections.

---

## 🟠 ISSUES (High Priority — UX Friction)

### ISSUE 1: "Meditation" Is Missing from Session Modalities
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Step 2)
**Description:** The Session Modalities section includes 10 categories (Symbolic Systems & Soul Mapping, Divination & Oracular Arts, Psychic & Spiritual Arts, Dreamwork, Hypnotherapy, Energy & Vibrational Healing, Shamanism, Natural Medicine, Yoga, Breathwork) but has **no Meditation category**. A meditation teacher — arguably the most common wellness practitioner type — has no way to accurately classify their core modality.
**Fix:** Add a "Meditation & Mindfulness" modality category with subtypes such as: Guided Meditation (general), Vipassana, Zen, Tibetan/Buddhist, MBSR, Loving-Kindness (Metta), Body Scan, Transcendental Meditation, Mantra-Based.

---

### ISSUE 2: "Meditation" Missing from Specializations; Buried in Topics
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Step 2)
**Description:** The Specializations section (where you choose 1–5 areas of expertise) contains only clinically-oriented options: Addiction Recovery, Anxiety & Depression, Chronic Illness Support, Pain Relief, Sleep Disorders, Sports Performance, Stress Management, Trauma Recovery, Weight Management, Women's Health. "Mindfulness & Meditation" exists only in the **Topics** section, which is a tertiary, optional field. For a meditation teacher, their primary specialty should be selectable at the Specialization level.
**Fix:** Either add "Mindfulness & Meditation" as a Specialization option, or restructure the taxonomy so practice-type specialties (Meditation, Yoga, Breathwork, etc.) sit alongside outcome-based ones (Stress Management, Anxiety, etc.).

---

### ISSUE 3: Scheduling Step (Step 3) Has Only One Field — Feels Incomplete
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Step 3)
**Description:** Step 3 is labeled "Scheduling — Set your preferences (1 min)" but only contains a single Buffer Time dropdown. A "Coming soon" placeholder note says availability scheduling will be added later. For practitioners, availability is the most business-critical setting. Presenting this step as essentially empty undermines confidence in the platform's readiness.
**Recommendations:**
- Add timezone selection (critical for matching with clients)
- Add advance booking window preferences (e.g., minimum notice required)
- Add session duration defaults
- If availability scheduling is truly coming soon, consider combining Step 3 with another step or marking it as "Quick Setup" to reduce the sense of a wasted step.

---

### ISSUE 4: "Coming Soon" Availability on Step 3 vs. "Set Your Schedule" on Completion Page
**URLs:** Step 3 (`/onboarding`) and Completion page (`/onboarding/complete`)
**Description:** Step 3 tells practitioners: *"Coming soon: You'll be able to set your weekly availability schedule from your dashboard."* But the completion page prominently features a card labeled **"Set Your Schedule — Configure weekly availability and time slots"** as if the feature exists. This is a direct contradiction that erodes trust.
**Fix:** Either remove the "Set Your Schedule" card from the completion page until the feature is live, or update the Step 3 copy to indicate the feature is accessible post-onboarding from the dashboard (removing the "coming soon" language if it's been shipped).

---

### ISSUE 5: Step Indicator Labels "Skip ok" Are Truncated and Unprofessional
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Steps 4 & 5 in top progress bar)
**Description:** The step indicator shows "Skip ok" below the step name for optional steps 4 (Credentials) and 5 (Questions). "Skip ok" reads as developer placeholder text rather than polished UI copy. It also uses inconsistent formatting compared to steps 1–3 which show time estimates.
**Fix:** Replace "Skip ok" with "Optional" displayed in a lighter style, or show a small badge/tag (like a pill that says "Optional") next to the step name, consistent with Step 4's heading which properly says "(Optional)".

---

### ISSUE 6: Duplicate Skip Affordances on Optional Steps (Confusing Hierarchy)
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Steps 4 & 5)
**Description:** Optional steps have three different skip mechanisms: (1) an inline "Skip →" link below the heading, (2) a "Skip" text button in the footer, and (3) a helper card at the bottom of the content that explains skipping. This is redundant and creates visual noise. Importantly, only the inline "Skip →" was functional (Bug #1), making the redundancy worse.
**Fix:** Consolidate to one Skip affordance — the footer button (which is always visible), or the inline link (which is contextual). Remove the redundant helper text card at the bottom of optional steps; the inline Skip with brief explanation is sufficient.

---

### ISSUE 7: Progress Percentage Shows 83% at the Final Step (Step 6 of 6)
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Step 6)
**Description:** Arriving at Step 6 — the literal last step of 6 — shows 83% Complete. This is psychologically deflating. Reaching the final step should show something like 95% to trigger the near-completion effect (Zeigarnik effect / completion momentum).
**Fix:** Recalibrate the progress percentage so that arriving at Step 6 shows 90–95%, and completing Step 6 (or skipping payment) brings it to 100%.

---

### ISSUE 8: "Complete Setup" Footer Button Ambiguous on Step 6
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Step 6)
**Description:** The footer button on Step 6 says "Complete Setup" — but there's also a prominent green "Setup Payments with Stripe" button inside the card, and a "Skip for Now" button. It's unclear whether "Complete Setup" in the footer finalizes the profile (skipping payment) or also triggers Stripe setup. A practitioner could reasonably interpret "Complete Setup" as "complete the whole onboarding" when it actually means "proceed without payment."
**Fix:** Rename the footer button to "Finish Without Payment" or "Complete Profile →" to distinguish it from the Stripe setup action, and clarify what clicking it does (e.g., "You can add payment later from your dashboard").

---

## 🟡 MINOR ISSUES & POLISH

### MINOR 1: Small Teal Dot in Bio Textarea (Confusing UI Element)
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Step 1)
**Description:** A small teal/green dot appears inside the bottom-right area of the Professional Bio textarea. It's unclear if this is a resize handle, a save indicator, or an accidental rendering artifact. It isn't present in other textareas.
**Fix:** Investigate origin of the dot element. If it's a custom resize handle, style it more consistently. If it's a status indicator, add a tooltip. If it's a bug, remove it.

---

### MINOR 2: Teaching/Coaching Styles & Topics Have No Selection Limit Shown
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding` (Step 2)
**Description:** The Specializations section properly shows "0 / 5 selected" to indicate a 5-item max. Teaching/Coaching Styles and Topics sections do not show any counter or limit. Is there a limit? If so, show it. If not, noting "select all that apply" would reduce friction.
**Fix:** Add a "X selected" counter or "(select all that apply)" guidance text under Teaching/Coaching Styles and Topics, consistent with Specializations.

---

### MINOR 3: "Dashboard" vs. "Dashboard Profile" Copy Inconsistency
**URL:** Step 4 vs. Step 5 (`/become-practitioner/onboarding`)
**Description:** The helper skip copy on Step 4 says "add them later from your dashboard" while Step 5 says "add them later from your dashboard profile." One extra word, but inconsistency in microcopy signals lack of polish in a product that otherwise has excellent copywriting.
**Fix:** Standardize to "your dashboard" across all skip helper text.

---

### MINOR 4: "Streams" Navigation Label Without Context
**URL:** `https://estuary-frontend.onrender.com/dashboard/practitioner`
**Description:** The sidebar nav item "Streams" is not self-explanatory. The Quick Navigation tile below reveals it means "Content creation," but this context is absent in the sidebar where it appears next to "Availability" and "Schedule." First-time practitioners won't know what Streams means.
**Fix:** Either add a subtitle in the sidebar (like other Quick Nav tiles use), rename to "Content & Streams," or add a tooltip on hover.

---

### MINOR 5: "Complete Your Profile" Cards on Completion Page Have No CTA
**URL:** `https://estuary-frontend.onrender.com/become-practitioner/onboarding/complete`
**Description:** The three cards (Create Services, Set Your Schedule, Enhance Profile) on the completion screen look clickable but have no button label, arrow, or visual CTA. Users may not know to click them. The "Set Your Schedule" card also contradicts the "coming soon" message from Step 3.
**Fix:** Add a "Get Started →" or "Go →" label to each card. Clarify or remove the "Set Your Schedule" card until availability scheduling is fully live.

---

## ✅ WHAT'S WORKING WELL

These elements are genuine strengths that should be maintained and built upon:

**Delightful brand language** — "Your waters are calm today. Nothing scheduled — space to reset or welcome something new." and the Ripples / Flow / Streams metaphor system are excellent. Stay consistent with this.

**Time estimates on each step** — Telling practitioners "3 min / 1 min / 5 min" per step is excellent expectation-setting that reduces abandonment.

**Character counter on bio** — Real-time 929/2000 character count is a small detail with big UX value.

**Bio "See examples" button** — Giving practitioners examples of good bios is a trust-builder and reduces writer's block.

**Contextual info cards** — The "About Buffer Time" card on Step 3 and "Help clients feel comfortable" on Step 5 are perfectly executed in-context education.

**Suggested Questions feature on Step 5** — The auto-appearing suggested FAQs after typing is a genuinely useful AI-assist moment.

**Completion screen design** — The confetti, checkmark animation, "What Happens Next" checklist, and warm copy make completing onboarding feel rewarding.

**"Feature Requests" with New badge in dashboard** — Shows product humility and invites practitioner voice. Keep and make it prominent.

**Empty state copy throughout the dashboard** — Truly excellent, on-brand, non-depressing empty states. This is rare and worth celebrating.

**"Earn 20% Referral" in sidebar** — Smart viral loop placement; practitioners see it early and often.

---

## Summary Table

| # | Type | Severity | Location URL |
|---|------|----------|-------------|
| BUG 1 | Footer Continue/Skip broken on Step 4 | 🔴 Critical | `/become-practitioner/onboarding` Step 4 |
| BUG 2 | Continue button looks disabled (Steps 4 & 5) | 🔴 Critical | `/become-practitioner/onboarding` Steps 4 & 5 |
| BUG 3 | Accidental Tarot selection when scrolling modalities | 🟠 High | `/become-practitioner/onboarding` Step 2 |
| ISSUE 1 | No Meditation modality category | 🟠 High | `/become-practitioner/onboarding` Step 2 |
| ISSUE 2 | Meditation missing from Specializations | 🟠 High | `/become-practitioner/onboarding` Step 2 |
| ISSUE 3 | Step 3 nearly empty / availability "coming soon" | 🟠 High | `/become-practitioner/onboarding` Step 3 |
| ISSUE 4 | "Coming soon" vs completion page contradiction | 🟠 High | Step 3 + `/onboarding/complete` |
| ISSUE 5 | "Skip ok" label in step indicator | 🟡 Medium | `/become-practitioner/onboarding` Steps 4 & 5 |
| ISSUE 6 | Three duplicate skip affordances | 🟡 Medium | `/become-practitioner/onboarding` Steps 4 & 5 |
| ISSUE 7 | 83% progress on final step | 🟡 Medium | `/become-practitioner/onboarding` Step 6 |
| ISSUE 8 | "Complete Setup" button ambiguity | 🟡 Medium | `/become-practitioner/onboarding` Step 6 |
| MINOR 1 | Teal dot in bio textarea | 🟢 Low | `/become-practitioner/onboarding` Step 1 |
| MINOR 2 | No selection count for Teaching Styles / Topics | 🟢 Low | `/become-practitioner/onboarding` Step 2 |
| MINOR 3 | "Dashboard" vs "dashboard profile" copy | 🟢 Low | `/become-practitioner/onboarding` Steps 4 & 5 |
| MINOR 4 | "Streams" label lacks context in sidebar | 🟢 Low | `/dashboard/practitioner` |
| MINOR 5 | Completion page cards lack CTA labels | 🟢 Low | `/become-practitioner/onboarding/complete` |

---

**Priority for next sprint:** Fix BUG 1 and BUG 2 immediately — they are blocking practitioners from completing onboarding with credentials. Then address the Meditation modality gap (ISSUE 1 & 2), which is a core content problem that directly impacts the platform's core user type.

