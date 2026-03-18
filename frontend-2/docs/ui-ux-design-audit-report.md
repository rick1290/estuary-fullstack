# Estuary UI/UX & Design Standardization Audit Report

**Date:** March 18, 2026
**Cohesion Score: 68/100** — Solid design system, fragmented information architecture

---

## Executive Summary

Estuary's visual foundation is strong — color palette, typography, and core components (buttons, cards) are well-defined in Tailwind config and used consistently. However, the three surfaces (Marketing, User Dashboard, Practitioner Dashboard) feel like **1.5 products** rather than one cohesive experience. Marketing is polished and internally consistent. The dashboards share the same design tokens but diverge in navigation patterns, naming conventions, and component implementations.

---

## Surface Comparison Matrix

| Pattern | Marketing | User Dashboard | Practitioner Dashboard | Status |
|---------|-----------|---------------|----------------------|--------|
| **Navigation** | Top navbar + footer | Top tabs (6 items) | Left sidebar (12+ items) | 🟡 Different paradigms |
| **Color tokens** | Sage/olive/cream ✅ | Sage/olive/cream ✅ | Sage/olive/cream ✅ | 🟢 Consistent |
| **Buttons** | variant system ✅ | variant system ✅ | variant system ✅ | 🟢 Consistent |
| **Cards** | border-sage-200/60 ✅ | border-sage-200/60 ✅ | border-sage-200/60 ✅ | 🟢 Consistent |
| **Inputs** | gray-200 borders 🔴 | gray-200 borders 🔴 | gray-200 borders 🔴 | 🔴 Wrong token |
| **Font sizes** | Tailwind scale ✅ | Arbitrary px values 🟡 | Tailwind scale ✅ | 🟡 Inconsistent |
| **Max width** | max-w-7xl | max-w-7xl / max-w-5xl | max-w-7xl | 🟢 Mostly consistent |
| **Empty states** | N/A | Inline cards | Dedicated component | 🟡 Different patterns |
| **Loading states** | Framer Motion | Skeletons (good) | Skeletons (good) | 🟢 OK (different is fine) |
| **Page loading** | null | null | null | 🔴 Missing everywhere |
| **Error pages** | N/A | error.tsx ✅ | error.tsx ✅ | 🟢 Consistent |
| **Error inline** | N/A | Alert component | Toast notification | 🟡 Mixed |
| **Stats cards** | N/A | 5-column grid | Horizontal pill | 🟡 Different |
| **Settings** | N/A | Tabbed sidebar | Separate pages | 🟡 Different |
| **Toast messages** | N/A | Partial | Partial | 🔴 Incomplete |
| **Hover/focus** | Framer animations | lift + shadow | lift + shadow | 🟢 Consistent |
| **Icons** | Lucide ✅ | Lucide ✅ | Lucide ✅ | 🟢 Consistent |
| **Mobile nav** | Hamburger → Sheet | Tabs → dropdown | Sidebar → Sheet | 🟡 Different |
| **Voice/tone** | Poetic, warm | Functional, minimal | Functional, minimal | 🟡 Gap |

---

## Top 10 Inconsistencies

### 1. 🔴 Input component uses `gray` instead of design tokens
**Where:** `components/ui/input.tsx:11`
**What:** `border-gray-200`, `focus:ring-gray-200`, `hover:border-gray-300` — every form across the entire app uses off-palette colors
**Fix:** Replace with `border-sage-200`, `focus:ring-sage-400`, `hover:border-sage-300`

### 2. 🔴 Page-level loading.tsx files return null
**Where:** `app/loading.tsx`, `app/checkout/loading.tsx`, most dashboard loading files
**What:** Users see blank white screen during page transitions — no feedback
**Fix:** Add skeleton UI matching the page layout

### 3. 🔴 Toast notifications incomplete across dashboards
**Where:** Most form submissions in practitioner settings, user profile
**What:** Actions complete silently — user doesn't know if save worked
**Fix:** Add `toast.success`/`toast.error` to every mutation's onSuccess/onError

### 4. 🟡 "My Journeys" vs "Bookings" naming confusion
**Where:** User nav: "My Journeys" | Practitioner nav: "Bookings"
**What:** Same concept (appointments) with different names. A dual-role user sees their purchases as "Journeys" and their clients' purchases as "Bookings"
**Fix:** Standardize terminology. Consider "My Bookings" for users, "Client Bookings" for practitioners

### 5. 🟡 Navbar uses gray-100 instead of sage tokens
**Where:** `components/layout/navbar.tsx:149-152`
**What:** `border-gray-100` on non-homepage variant
**Fix:** Replace with `border-sage-200/60`

### 6. 🟡 Arbitrary font sizes in journey components
**Where:** Journey cards and delivery pages (`text-[15px]`, `text-[12px]`, `text-[8px]`, `text-[11px]`)
**What:** Magic pixel values instead of Tailwind scale (text-sm, text-xs)
**Fix:** Map to nearest Tailwind size

### 7. 🟡 Stats cards completely different between dashboards
**Where:** User: `user-stats.tsx` (5-column grid) | Practitioner: `practitioner-stats.tsx` (horizontal pill)
**What:** Same concept (dashboard metrics) with totally different UI
**Fix:** Create shared `StatsCard` component used by both

### 8. 🟡 Three different empty state implementations
**Where:** `dashboard-empty-state.tsx` (generic), `services/empty-state.tsx` (service-specific), inline in lists
**What:** Different icons, copy tone, layouts, CTA patterns
**Fix:** Consolidate to one `EmptyState` component with variants

### 9. 🟡 No "Sign Up" CTA on homepage
**Where:** `components/home/hero-section.tsx`
**What:** Hero has search bar and "Are you a practitioner?" link. No clear "Get Started" or "Sign Up Free" button for users
**Fix:** Add primary CTA: "Start Your Wellness Journey" or "Sign Up Free"

### 10. 🟡 Marketing voice vs app voice disconnect
**Where:** Marketing: "Find Your Path to Wellness & Growth" | App: "No bookings found"
**What:** Marketing is warm and poetic; app is sterile and utilitarian
**Fix:** Add warmth to app copy. Instead of "No bookings found" → "Your wellness journey starts here"

---

## Design Token Recommendations

### Enforce These Globally

```
COLORS:
  Primary action: sage-600 (buttons, active states)
  Secondary action: terracotta-500 (highlights, badges)
  Text primary: olive-900
  Text secondary: olive-600
  Text muted: olive-400
  Background: cream-50
  Card background: white
  Border: sage-200/60
  Focus ring: sage-400
  Error: red-500
  Success: sage-600
  Warning: amber-500

TYPOGRAPHY:
  Headings: font-serif, font-light/font-medium
  Body: font-sans (DM Sans), text-sm (14px) dashboards, text-base (16px) marketing
  Labels: text-xs uppercase tracking-widest
  NEVER use: text-[Npx] arbitrary values

SPACING:
  Card padding: p-5 (20px)
  Section gap: space-y-8 (32px)
  Label-to-input: mb-2 (8px)
  Heading-to-content: mb-4 (16px)

RADII:
  Buttons: rounded-full (pill) for primary, rounded-xl for secondary
  Cards: rounded-xl (12px)
  Inputs: rounded-lg (8px)
  Badges: rounded-full
  Modals: rounded-xl

SHADOWS:
  Cards: hover:shadow-md
  Buttons: hover:shadow-lg
  Modals: shadow-xl

TRANSITIONS:
  Buttons: duration-300 ease-out
  Cards: duration-200 ease-out
  Modals: duration-200
```

---

## Component Standardization Plan

| Component | Standardize To | Action |
|-----------|---------------|--------|
| **Input** | `border-sage-200 focus:ring-sage-400` | Fix `input.tsx` |
| **Empty State** | `DashboardEmptyState` component | Replace 2 other implementations |
| **Stats Card** | Grid-based card (user pattern) | Redesign practitioner stats |
| **Loading Page** | Skeleton matching page layout | Add to all `loading.tsx` |
| **Error Inline** | Toast for mutations, Alert for load failures | Document rule, enforce |
| **Button Labels** | Verb + Noun pattern ("Save Changes", "Join Session") | Audit all buttons |
| **Date Format** | `MMM d, yyyy` for full, `MMM d` for compact | Already mostly consistent |

---

## Navigation & Flow Fixes

1. **Rename for consistency:** User "My Journeys" → consider "My Sessions" or keep but rename practitioner "Bookings" → "Client Bookings"
2. **Add homepage CTA:** Primary "Get Started" button in hero section
3. **Add checkout back button:** Return to service page
4. **Improve role switcher:** Show current role name prominently, not just a banner
5. **Settings alignment:** Give practitioner settings the same tabbed sidebar as user settings

---

## Quick Wins (< 30 min each)

1. Fix `input.tsx` border colors → sage tokens (5 min)
2. Fix `navbar.tsx` gray-100 → sage-200 (5 min)
3. Add homepage "Get Started" CTA button (15 min)
4. Replace `text-[15px]` → `text-sm` in journey cards (10 min)
5. Add loading skeleton to `app/loading.tsx` (15 min)
6. Add `toast.success("Saved")` to practitioner settings forms (20 min)
7. Update empty state copy to match brand voice (15 min)
8. Rename practitioner "Bookings" → "Client Bookings" in nav (5 min)
9. Add `rel="noopener noreferrer"` to 6 external links (5 min)
10. Remove console.warn from hey-api-nextauth.ts (2 min)

---

## What's Working Well ✅

1. **Color palette** — Sage/olive/cream/terracotta defined as tokens, used consistently across surfaces
2. **Button system** — variant system (default, outline, ghost, secondary) with consistent hover/focus states
3. **Card component** — Same border, radius, padding everywhere
4. **Lucide icons** — Single icon library, consistent sizing
5. **Error boundary pages** — 6 pages, all matching design, context-aware CTAs
6. **Marketing site** — Internally consistent, polished, great section patterns
7. **Auth modal** — Unified login/signup in single modal, role selection
8. **Journey delivery pages** — Consistent two-column layout across all 4 service types
9. **Journal component** — Clean, reusable, well-designed with entry types
10. **Font loading** — DM Sans via Next.js font system, proper weights
