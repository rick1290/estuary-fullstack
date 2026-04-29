# CMO Feedback Triage — 2026-04-28

Code-level audit of every item in `intake-form.md`, `onboarding.md`, `service.md`, plus the modality JSON v1.7 update. Each item is tagged:

- 🟢 **FIX** — short, contained change, do it now
- 🟡 **FIX (medium)** — real work but worth it, ½–1 day
- 🟠 **DEFER** — needs design/spec or coordinated migration, plan separately
- 🔴 **SKIP** — too much refactor for the value
- ❓ **VERIFY** — code looks correct, can't reproduce from source alone, needs runtime testing in Docker

Code locations are `frontend-2/...` unless otherwise noted.

---

## 1. Onboarding (`/become-practitioner/onboarding`)

### 🟢 BUG 1 + BUG 2 — Continue/Skip broken, button looks disabled (Steps 4 & 5)
**Root cause found.** Both step components disable Continue when no items have been "Added":
- `components/practitioner-onboarding/step-4-credentials.tsx:333` — `disabled={isSubmitting || (certifications.length === 0 && educations.length === 0)}`
- `components/practitioner-onboarding/step-6-common-questions.tsx:263` — `disabled={isSubmitting || questions.length === 0}`

A practitioner who types into the cert/question fields but doesn't click "Add" first sees Continue muted and unresponsive — exactly what Kevin reported. Skip should still work (it doesn't have the disabled gate), so if Skip is also broken there's likely an event-bubbling or focus-trap issue we'd catch in Docker.

**Fix:** Drop the disabled gate (these steps are optional anyway). On submit, auto-add any in-progress field that's filled. Both files, ~5 lines each.

### 🟢 BUG 3 — Tarot accidentally selected when scrolling categories (Step 2)
`step-2-specializations.tsx:332` — categories use `border-b` only, no padding between collapsed sections. Modality buttons in an open section sit flush against the next category header.
**Fix:** Add `py-2` or larger spacing between collapsed category rows; convert header to a non-clickable area when not in the visible section. ~10 minutes.

### 🟡 ISSUE 1 + 2 — Meditation missing from Modalities and Specializations
**This is the modality v6 update.** Backend is on `0008_seed_modalities_v5` (16 categories, 148 modalities, "mindbody" category). The new `feedback-docs/estuary_modalities.json` (v1.7, 16 categories, 163 modalities) replaces "mindbody" with a dedicated "meditation" category and adds 16 new modalities — see diff below.

**16 new modalities to add:**
Contemplative Prayer, Insight Meditation, Japa Meditation, Kundalini Meditation, Mantra Meditation, Meditation (general), Metta Meditation, Neurolinguistic Programming (NLP), Nondual Meditation, Open Awareness Meditation, PSYCH-K, Rapid Transformational Therapy (RTT), Vedic Meditation, Vipassana, Walking Meditation, Zen Meditation / Zazen.

**1 rename:** "Meditation" → "Meditation (general)"

**Plan:**
1. New migration `backend/common/migrations/0009_seed_modalities_v6.py` — additive (don't delete v5 modalities, practitioners may have linked them). Create new `meditation` category, move existing meditation modalities to it, add the 16 new ones.
2. Add "Mindfulness & Meditation" to Specialize records (production data update, not a migration).

This is the single largest item but fully self-contained — ~½ day. Resolves ISSUE 1 + 2 here, item #4 in `service.md` ("Mediation"/Meditation in modality dropdown), and the broader content-gap critique.

### 🟢 ISSUE 3 + 4 — Step 3 nearly empty + completion page contradiction
- `step-3-scheduling-preferences.tsx:126` — "Coming soon" banner
- `app/become-practitioner/onboarding/complete/page.tsx:163-171` — "Set Your Schedule — Configure weekly availability" card with no destination

If availability scheduling is now live in dashboard, fix the messaging both places. If still genuinely coming soon, remove the completion-page card.
**Recommend:** Verify availability dashboard state; update copy to match. ~15 minutes once direction is decided.

### 🟢 ISSUE 5 — "Skip ok" placeholder copy
`components/practitioner-onboarding/progress-stepper.tsx:36, 42` — literal `"Skip ok"` string in the steps array. Replace with `"Optional"` or move to a separate `optional: true` flag and render a pill. ~5 minutes.

### 🟡 ISSUE 6 — Three duplicate skip affordances
Three skip mechanisms (inline link, footer button, helper card) all live in `step-4-credentials.tsx` (lines 130-136, 296-300, 322-328). Consolidating to one means choosing the canonical pattern across all optional steps. Touches Step 4 + Step 5 (`step-6-common-questions.tsx`). ~30 minutes once direction is set.

### 🟢 ISSUE 7 — 83% progress on final step
`progress-stepper.tsx:59` — `progressPercentage = (completedSteps.length / totalSteps) * 100`. On Step 6, 5/6 = 83.33%. Change to count current-step-in-progress: `((completedSteps.length + 1) / totalSteps) * 100` capped at 100, or weight differently. ~5 minutes.

### 🟢 ISSUE 8 — "Complete Setup" button ambiguity (Step 6)
Footer button label conflicts with in-card Stripe CTA. Rename footer button to "Finish Without Payment" or "Complete Profile →" in `step-5-payment-setup.tsx`. ~5 minutes.

### 🟢 MINOR 1 — Teal dot in bio textarea
Need to inspect `step-1-basic-profile.tsx` in browser; likely a CSS resize handle artifact or a status indicator left over. ~10 minutes once reproduced.

### 🟢 MINOR 2 — No selection count on Styles/Topics
`step-2-specializations.tsx` shows "Optional" instead of a count (lines 240, 279). Add `{styles selected}` counter consistent with Specializations and Modalities. ~5 minutes.

### 🟢 MINOR 3 — "dashboard" vs "dashboard profile" inconsistency
One-word fix in `step-4-credentials.tsx:298` and `step-6-common-questions.tsx`. ~2 minutes.

### 🟢 MINOR 4 — "Streams" sidebar label without context
Add a subtitle or tooltip in the practitioner sidebar nav. ~10 minutes.

### 🟢 MINOR 5 — Completion page cards have no CTA
`onboarding/complete/page.tsx:153-181` — three cards are `cursor-pointer` but render no arrow/Go label. Add `→` or "Get Started" labels. ~10 minutes.

---

## 2. Service Creation (`/dashboard/practitioner/services/new`)

The wizard lives in `components/dashboard/practitioner/service-creation/guided-service-wizard.tsx` (2387 lines).

### 🟢 BUG #6 — Auto-advance bypasses "Next" on Step 1
`guided-service-wizard.tsx:1058-1060` — `setTimeout(() => setCurrentPhase(2), 300)` fires on every radio click. Remove the `setTimeout`; let users click Next. Also resolves the visual feedback complaint (BUG #2) since users currently see the selection for ~300ms before being yanked forward. ~2 minutes.

### 🟢 BUG #2 — Service type radio: no visible selected state
`guided-service-wizard.tsx:1071-1074` — `border-primary bg-primary/5` is too subtle. Bump to `border-2 border-primary bg-primary/10` plus a checkmark badge. ~5 minutes.

### 🟢 BUG #3 — Template checkbox misleading initial state
`guided-service-wizard.tsx:1203-1208` — uses raw `<input type="checkbox" className="rounded">`. The unchecked-but-styled box reads as checked because of the `rounded` Tailwind class on a native input. Replace with the Radix `<Checkbox>` component used elsewhere. ~5 minutes.

### ❓ BUG #1 — AI Image Generation non-functional
Code looks correct — `guided-service-wizard.tsx:2148-2165` wires `onClick={handleGenerateImage}` → `generateImageMutation.mutateAsync({ body: { prompt: aiPrompt }})`. Backend has `/api/v1/ai-images/...` set up.

Most likely runtime causes:
- Auth token missing on the request (check Network tab — is `/api/v1/ai-images/generate/` even called?)
- Backend env var (e.g., OpenAI/replicate API key) unset locally
- Rate-limit/generations-remaining returning 0 silently

**Action:** Reproduce in Docker, check Network + backend logs. Until then, treat as a deployment/config issue, not a code defect.

### 🟢 ISSUE #5 — No availability nudge on Review/success screen
Review step and post-publish celebration in `guided-service-wizard.tsx` (line 815+). Add a "Set up availability" CTA card pointing to dashboard schedule. ~20 minutes.

### 🟢 ISSUE #7 — Blank cover image renders as huge grey box on public service page
Add a category-based default placeholder image. Either reuse the `lib/modality-content.ts` fallback hero images (already exists per memory), or pick from Unsplash by service-type/category at render time on `/sessions/[slug]`. ~20 minutes.

### 🟡 Quick win #12 — Searchable modality dropdown
113+ modalities in a vanilla `<Select>` is hard to scan. Convert to `Combobox` (cmdk pattern). Used in both wizard (`guided-service-wizard.tsx:1318-1336`) and edit form. ~½ day.

### 🟢 Quick wins 8–11
Tooltip on Settings warning, dashboard empty-state CTA, post-publish availability nudge, richer Review preview — all 5–20 minute changes in respective files.

---

## 3. Intake Form Builder (`/dashboard/practitioner/intake`)

All in `components/dashboard/practitioner/intake/intake-forms-manager.tsx`.

### 🟢 #7 — No auto-navigate into builder after creating
Line 225-231 — `onSuccess` closes dialog but doesn't open the new template editor. Add `setSelectedTemplateId(data.id)` in success handler. ~5 minutes.

### ❓ #8 / #18 — Typing into modal inputs non-functional
The `Title` (`Input` line 1080-1089) and `Description` (`Textarea` line 1094-1101) are correctly bound to `useState` + `onChange` — code reads as standard controlled inputs. CMO reproducibly couldn't type. Most likely causes worth checking in Docker:
- A focus trap in the `Dialog` competing with the input's focus
- An ancestor `<form>` swallowing keystrokes
- The previous dialog state persisting (`createStep` flips back to "details" before `newTitle` is rebound)

**Action:** Reproduce locally. If real, swap out the Dialog or add `autoFocus` to the title input. Don't refactor blindly.

### 🟢 #9 — Create button silently does nothing without a title
Line 1117 — disabled-only feedback with no inline error. Add an error state under the title input when submit is attempted. ~10 minutes.

### 🟢 #10 — "Change" button visibility
Lines 1069-1075 — the "Change" button DOES work (sets `createStep` back to "pick-type"), but the user perceives no response because the dialog title text is similar. Visually distinguish: animate the dialog header change, or scroll the type-picker back into view. ~10 minutes.

### ❓ #11 — Question count shows "questions" with no number
Code at line 504 *does* render `{template.question_count} question`. If it's rendering `undefined questions`, the backend serializer isn't returning `question_count` — or returns `null`. Check `intakeTemplatesList` response in Docker. Likely backend serializer fix.

### 🟡 #12 — Comma-separated options entry is unfriendly
Lines 705-711 (edit) and 821-832 (add) — replace the single comma-input with a chip-input (add/remove individual options). ~½ day for a clean reusable component.

### 🟢 #13 — Edit mode missing Type selector
Lines 672-752 (the inline edit form) shows only Label/Help Text/Required — no Type picker. The current "save" workaround already deletes-then-recreates the question (line 720), so adding type to the edit form is straightforward. ~15 minutes.

### 🟢 #14 — Help-text placeholder inconsistency
Line 689 ("Optional") vs line 817 ("Additional context for the client"). Standardize. ~2 minutes.

### ❓ #15 — Add Question button hit-target / coordinate-click failures
Code (line 887-892) is a normal `<Button>`. CMO note may be a Playwright-specific quirk. Verify in Docker; if real, check z-index against feedback widget.

### 🟢 #16 — Link-to-Service modal Cancel/X unresponsive
Line 1364 — `<Button variant="ghost" onClick={...}>Cancel</Button>` looks fine. The X close is implicit on `<Dialog>`. May be the same `Dialog` focus issue as #8/#18. Reproduce together; likely one fix solves both.

### 🟢 #17 — Browse Templates empty state too bare
Lines 1160-1168 — add CTA "Build your own from scratch" linking to the create flow. ~5 minutes.

### 🟢 #19 — Support widget overlaps the New Question form
`components/dashboard/feedback-widget.tsx:143` — panel is `z-50`. New Question card has no explicit z-index. Fix one of:
- Hide the feedback widget when an `addQuestionOpen` state is true on intake page
- Lower the widget z to z-30
- Or ensure the New Question form anchors above its viewport (not bottom of page)

~15 minutes.

### 🟢 #20 — Two-click delete with no confirmation
**Current code (line 656-669) deletes immediately on a single click** — no two-click pattern is in source. Either:
(a) The CMO tested an older deploy, or
(b) The pattern lives in a different component (consent-question delete?).

Either way, the recommended change is the same: add an explicit confirmation `Dialog` for question deletion, matching the template-delete `confirm()` pattern at line 534. ~10 minutes.

### 🟡 #21 — Attach service "Link" button hover-only visibility
Line 1342 — `sm:opacity-0 sm:group-hover:opacity-100`. On desktop the button only shows on hover, which is what the CMO is seeing as inconsistent. Make the button always visible (or visible after pressing the row). ~5 minutes.

---

## 4. Backend modality update (single migration)

Write `backend/common/migrations/0009_seed_modalities_v6.py`:
- Idempotent + additive (mirrors v5 structure)
- Adds `meditation` category (slug: `meditation`, label: "Meditation & Contemplative Practice")
- Adds 16 new modalities to it (list above)
- Reassigns existing meditation/mindfulness modalities currently in `mindbody` to `meditation`:
  Meditation → renames to "Meditation (general)" and moves
  Mindfulness, Transcendental Meditation, MBSR, Loving-Kindness Meditation also move
- Keeps `mindbody` category for the remaining mind-body practices (or sunsets it if the JSON v1.7 truly drops it — currently the JSON has no mindbody category, so existing mindbody-tagged modalities need somewhere to go)

**Effort:** ~2-3 hours including verification + frontend smoke test.

---

## 5. What's NOT worth fixing now

Nothing rises to the level of "skip entirely" — every item in the feedback is a legitimate UX concern with a tractable fix. The only items I'd consciously **defer to a future sprint** rather than this one:

- 🟠 **Searchable modality dropdown** (service.md #12) — nice but the grouped Select works for now; do this after the v6 modality update settles.
- 🟠 **Three skip affordances consolidation** (onboarding ISSUE 6) — bigger design call (which is the canonical pattern?). Pick a direction with the team.
- 🟠 **"Streams" rename** (onboarding MINOR 4) — touches branding/IA across the dashboard. Make it part of the next IA review, not a one-off rename.

Everything else is a 5-30 minute change.

---

## Suggested order of operations

**Sprint 1 — block-busters (1 day):**
1. Onboarding BUG 1 + 2 (Continue/Skip Step 4 & 5)
2. Service wizard BUG #6 (auto-advance) and BUG #2 (visible selection)
3. Service wizard BUG #3 (template checkbox)
4. Intake #7 (auto-navigate after create) + #14 (placeholder)
5. Onboarding ISSUE 5 ("Skip ok"), 7 (83%), 8 (button rename)

**Sprint 1.5 — modality data (½ day):**
6. Backend migration `0009_seed_modalities_v6` + Specialize "Mindfulness & Meditation"

**Sprint 2 — UX polish (1 day):**
7. All 🟢 MINOR items
8. Intake #12 (chip input), #13 (type in edit), #19 (widget z-index), #20 (confirm dialog)
9. Service wizard #5 + #7 (availability nudge, default cover image)

**Verify in Docker before fixing:**
- Intake #8/#18 (typing into modal)
- Intake #11 (question count rendering)
- Service wizard #1 (AI image)
- Onboarding MINOR 1 (teal dot)
