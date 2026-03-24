# UI/UX Production Design Audit
**Date:** 2026-03-23
**Brand context:** Homepage colors are the brand source of truth. Sage/olive/terracotta/cream palette for brand elements. Standard grays acceptable in dashboard/utility contexts. Rose for hearts, amber for warnings — standard patterns, not brand violations.

---

## Flow Scores

| Flow | Score | Biggest Issue | Mobile Score |
|------|-------|---------------|-------------|
| Landing → Signup | 6.5/10 | No post-signup onboarding | 5/10 |
| Discover → Book | 6/10 | Booking panel not sticky on mobile | 4/10 |
| Streams → Subscribe | 7.5/10 | Tier cards cramped on mobile | 7/10 |
| Practitioner Dashboard | 5.5/10 | No earnings on home page | 5/10 |

---

## Critical Issues (Fix Before Launch)

### 1. Booking panel not sticky on mobile
**Impact:** Users can't see "Book a Session" CTA without scrolling past entire bio. Conversion killer.
**File:** `practitioners/[slug]/practitioner-client.tsx:104-108`
**Current:** `lg:sticky lg:top-24` — only sticky on desktop
**Fix:** Make sticky on all breakpoints. Add a floating "Book Now" bar at bottom of mobile viewport.
**Effort:** 30 min

### 2. Checkout order summary sticky blocks form on mobile
**File:** `app/checkout/page.tsx:449`
**Current:** `sticky top-6` — on mobile single-column, this sticks and blocks input
**Fix:** Change to `lg:sticky lg:top-6` — only sticky on desktop
**Effort:** 5 min

### 3. No post-signup onboarding
After signup, user lands on empty dashboard with no guidance.
**Fix:** Add welcome modal or first-time onboarding flow: "What brings you to Estuary?" → interest selection → suggested practitioners
**Effort:** 4 hrs

### 4. No prefers-reduced-motion support
**File:** `app/globals.css`
All animations play regardless of user preference. Affects users with vestibular disorders.
**Fix:** Add `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`
**Effort:** 5 min

### 5. Icon buttons under 44px tap target (8+ files)
Multiple `h-6 w-6` and `h-7 w-7` icon buttons. Apple minimum is 44x44px.
**Files:** sessions-table.tsx, message-detail.tsx (both user/practitioner), session-ending-notification.tsx, content-card.tsx (more options)
**Fix:** Increase to `h-10 w-10` minimum
**Effort:** 30 min

### 6. Stream subscription tier cards cramped on mobile
**File:** `stream-detail-content.tsx:374`
**Current:** `grid grid-cols-2 gap-3` — 187px per card at 375px viewport
**Fix:** `grid grid-cols-1 sm:grid-cols-2 gap-3`
**Effort:** 5 min

---

## Design System Inconsistencies

### Typography
- **`font-serif` in CardTitle** but no serif font defined in Tailwind config. Falls back to system serif (Times New Roman), creating visual mismatch.
  - **File:** `components/ui/card.tsx:39`
  - **Fix:** Either define a serif font in tailwind.config.ts (e.g., Playfair Display) or remove font-serif from CardTitle

- **Font weight inconsistency:** `font-light` (265 uses), `font-medium` (832 uses), `font-semibold` (171 uses) — no clear semantic pattern for when to use which weight for headings vs labels vs body text

### Spacing
- **Section spacing varies:** `space-y-6` in user dashboard, `mb-8` in marketplace, `py-12` in empty states, `py-20` in section-spacing utility. Should standardize.
- **Card padding inconsistency:** CardContent uses `px-6 pb-6` (no top padding), CardHeader uses `p-6`. Creates visual gaps when stacked.
- **Max-width inconsistency:** 9 different max-width values used across pages without clear hierarchy

### Border Radius
- **Buttons:** Base `rounded-xl`, size=sm `rounded-lg`, some hand-rolled `rounded-full`
- **Inputs:** `rounded-lg`, Select: `rounded-md`, Textarea: `rounded-md` — should all match
- **Fix:** Standardize inputs/selects/textareas to same radius

### Shadows
- Button hover: `shadow-sm → shadow-lg` (dramatic)
- Card hover: `hover:shadow-sm` (subtle)
- ServiceCard hover: `hover:shadow-md` (moderate)
- Should have consistent elevation hierarchy

---

## Mobile-Specific Issues

### Horizontal Overflow
- **Profile tabs** (`profile-tabs.tsx:35`): Uses `flex-wrap` instead of `overflow-x-auto`. 5 tabs stack into 2-3 rows on mobile.
  - **Fix:** `overflow-x-auto scrollbar-hide` with `flex-nowrap`

### Input Zoom
- **Promo code input** (`checkout/page.tsx:560`): `text-xs` override triggers iOS auto-zoom on focus
  - **Fix:** Never override input text below `text-base` (16px) on mobile

### Form UX
- **Missing inputMode** on numeric inputs (postal code, promo code)
- **Comment input height** `h-9` (36px) — below 44px tap target minimum

### Responsive Grids
- **Dashboard shortcuts:** `grid-cols-2 sm:grid-cols-4 lg:grid-cols-8` — at 375px, 8 shortcut cards in 2 columns creates long scroll
- **Checkout booking details:** `grid-cols-2` at 375px creates cramped 182px columns

---

## Copywriting Issues

### Inconsistent CTAs
- Navigation back: "Go Back" / "Back" / "Return Home" / "Back to Streams" — pick one pattern
- Form save: "Update" / "Save Changes" / "Save" — standardize

### Error Messages
- Vague verbs: "Failed to update like", "Failed to save post", "Update failed"
- **Better:** "Couldn't save your like — please try again" / "We had trouble saving — tap to retry"
- No retry buttons in error toasts — user must manually redo the action

### Price Display
- Mix of `$XX` and `$XX.XX` formatting
- "$0" shown in some places instead of "Free"

---

## Accessibility Issues

### HIGH
- No `prefers-reduced-motion` support (animations play for all users)
- Icon-only buttons missing `aria-label` (engagement bar: heart, share, bookmark, tip)

### MEDIUM
- No skip-to-main-content link in layout
- `text-olive-400` on light backgrounds — borderline contrast (verify with tool)
- No visual field highlight on form validation errors (only text message shown)
- Session expiry redirects to home with no messaging

### LOW
- Limited `sr-only` usage on meaningful UI elements
- Generic alt text: "Post media", "Video thumbnail" — could be more descriptive

---

## Polish & Delight Opportunities

1. **Celebration moments:** Booking confirmation and subscription success could have confetti/animation (like practitioner onboarding completion already does)
2. **Optimistic updates on like/save** — already implemented, good
3. **Skeleton loading screens** on stream detail and practitioner profiles instead of spinners
4. **"Next available" badge** on practitioner cards showing first available time slot
5. **Smart defaults** in booking flow: pre-select next available date/time
6. **Earnings widget** on practitioner home page (currently must navigate to Finance page)
7. **Unread badges** on dashboard shortcuts (Messages, Bookings)
8. **Pull-to-refresh** on streams feed (mobile)

---

## Recommended Fix Order

### Before Launch (2-3 days)
1. Booking panel sticky on mobile (30 min)
2. Checkout summary unsticky on mobile (5 min)
3. prefers-reduced-motion CSS (5 min)
4. Tier cards responsive grid (5 min)
5. Icon button tap targets (30 min)
6. Profile tabs horizontal scroll (15 min)
7. aria-labels on icon buttons (30 min)
8. Input zoom fix (5 min)
9. Comment input height (5 min)

### First Week
10. Standardize error message copy (1 hr)
11. Standardize CTA labels (1 hr)
12. Fix CardTitle font-serif (15 min)
13. Standardize input/select/textarea border radius (15 min)
14. Add skip-to-main link (15 min)
15. Form field error highlighting (1 hr)
16. Session expiry messaging (30 min)

### First Month
17. Post-signup onboarding flow (4 hrs)
18. Skeleton loading screens (2 hrs)
19. Earnings widget on practitioner home (2 hrs)
20. Unread badges on dashboard shortcuts (1 hr)
21. "Next available" on practitioner cards (2 hrs)
22. Consistent shadow elevation system (1 hr)
23. Consistent spacing standardization (2 hrs)
