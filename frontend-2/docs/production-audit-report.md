# Estuary Production-Readiness Audit Report

**Date:** March 18, 2026
**Overall Readiness Score: 62/100**

---

## Executive Summary

Estuary has strong architectural foundations — proper API versioning, typed client generation (heyapi), Celery background tasks, comprehensive booking/payment flows, and a well-designed journey system. However, **several critical security and infrastructure gaps** block production deployment.

### Top 5 Most Critical Issues

1. **🔴 Secrets committed to repo** — `.env.local` contains Google OAuth secret, NextAuth secret, Stripe keys in git history
2. **🔴 No HTTPS redirect or HSTS** — production traffic can be intercepted
3. **🔴 Database and Redis publicly accessible** — `0.0.0.0/0` IP allowlist in render.yaml
4. **🔴 SECRET_KEY has insecure fallback** — if env var unset, known weak key is used
5. **🔴 No favicon** — browser tabs show generic icon (minor but visible to every user)

---

## Findings by Category

### 1. CODE QUALITY & PERFORMANCE

| Severity | Issue | Location |
|----------|-------|----------|
| 🔴 | Secrets in `.env.local` committed to repo | `frontend-2/.env.local` |
| 🟡 | Monolithic guided-service-wizard.tsx (1,887 LOC) | `components/dashboard/practitioner/service-creation/` |
| 🟡 | 115 hardcoded hex colors in course session detail | `app/dashboard/user/journeys/[uuid]/[sessionId]/page.tsx` |
| 🟡 | console.warn in production (hey-api-nextauth.ts) | `src/hey-api-nextauth.ts:58` |
| 🟡 | 16 TODO comments in shipped code | Various components |
| 🟡 | Only 2 uses of next/image vs 6 raw img tags | Various components |
| 🟡 | 14+ TODO comments in backend critical paths | serializers, views across apps |
| 🟡 | Test script at root of backend | `backend/test_mark_completed_bookings.py` |
| 🟢 | Error boundaries properly implemented (7 files) | `app/**/error.tsx` |
| 🟢 | heyapi client generation working correctly | `src/client/` |

### 2. UI / VISUAL DESIGN

| Severity | Issue | Location |
|----------|-------|----------|
| 🟡 | Hardcoded hex colors mixed with Tailwind tokens | Course session detail page |
| 🟡 | sage-600 on white fails WCAG AA (3.8:1) | Various text elements |
| 🟡 | Typography hierarchy inconsistent (some headings use classes not semantic tags) | Various components |
| 🟢 | Design system well-defined in tailwind.config.ts | Sage/olive/cream palette |
| 🟢 | Loading skeletons present on key pages | Journey, dashboard pages |
| 🟢 | Empty states designed for journeys | Journey list page |

### 3. RESPONSIVE DESIGN

| Severity | Issue | Location |
|----------|-------|----------|
| 🟡 | Modal sizing may overflow on iPhone SE (375px) | Dialog components |
| 🟡 | Checkout page minimal responsive breakpoints | `app/checkout/page.tsx` |
| 🟢 | Mobile navigation well-handled with Sheet component | Navbar |
| 🟢 | Journey cards and delivery pages have lg: breakpoints | Journey components |

### 4. USER FLOW & UX

| Severity | Issue | Location |
|----------|-------|----------|
| 🔴 | No confirmation before practitioner deletes service with active bookings | Service edit components |
| 🟡 | Homepage hero doesn't explain what the platform is | `app/home-client.tsx` |
| 🟡 | Checkout has no back button to service page | `app/checkout/page.tsx` |
| 🟡 | Cancel dialog doesn't preview refund amount | `cancel-booking-dialog.tsx` |
| 🟡 | 5-level deep navigation to course content | Dashboard > Journeys > Course > Session |
| 🟡 | Service detail page with no availability shows no messaging | Service pages |
| 🟢 | Auth modal flow well-handled | Auth components |
| 🟢 | Forgot password now implemented | `/forgot-password`, `/reset-password` |

### 5. URL STRUCTURE & ROUTING

| Severity | Issue | Location |
|----------|-------|----------|
| 🟡 | Test routes in production (`/test-stripe`, `/test-auth`) | `app/test-*` directories |
| 🟡 | No `/services` landing page (only `/services/[id]/book`) | `app/services/` |
| 🟡 | Duplicate room access patterns (3 entry points) | `app/room/` |
| 🟢 | Slug-based detail routes for SEO | Sessions, courses, practitioners |
| 🟢 | Protected routes properly redirect via middleware | `middleware.ts` |

### 6. SEO & METADATA

| Severity | Issue | Location |
|----------|-------|----------|
| 🟡 | No dynamic OG images for service/practitioner pages | Service detail pages |
| 🟡 | OG image file existence not verified | `/public/og-image.png` |
| 🟡 | Duplicate content across listing routes (no canonical overrides) | Marketplace pages |
| 🟡 | Missing H1 verification on homepage | `app/home-client.tsx` |
| 🟢 | JSON-LD structured data implemented | `components/seo/` |
| 🟢 | Dynamic sitemap with services + practitioners | `app/sitemap.ts` |
| 🟢 | robots.ts properly configured | `app/robots.ts` |
| 🟢 | Title templates and meta descriptions on key pages | Layout + page metadata |

### 7. ACCESSIBILITY

| Severity | Issue | Location |
|----------|-------|----------|
| 🟡 | sage-600 on white fails AA contrast (3.8:1 ratio) | Text on white backgrounds |
| 🟡 | No skip navigation link | `app/layout.tsx` |
| 🟡 | Form label association inconsistent | Various form components |
| 🟡 | 6 external links missing `rel="noopener noreferrer"` | Message detail, resource section |
| 🟢 | shadcn components have proper ARIA attributes | UI components |
| 🟢 | Alt attributes on 127 images | Components |

### 8. SECURITY & INFRASTRUCTURE

| Severity | Issue | Location |
|----------|-------|----------|
| 🔴 | No SECURE_SSL_REDIRECT or HSTS in production | `estuary/settings.py` |
| 🔴 | Database IP allowlist is `0.0.0.0/0` (world-open) | `render.yaml:174-176` |
| 🔴 | Redis IP allowlist is `0.0.0.0/0` | `render.yaml:164-166` |
| 🔴 | SECRET_KEY has hardcoded insecure fallback | `estuary/settings.py:26` |
| 🟡 | ALLOWED_HOSTS includes `.onrender.com` wildcard | `estuary/settings.py` |
| 🟡 | No Content-Security-Policy header | Settings |
| 🟡 | Rate limiting too basic (100/hr anon, 1000/hr auth) | Settings |
| 🟡 | Admin panel at default `/admin/` path | `estuary/urls.py` |
| 🟡 | Postgres `0.0.0.0/0` in render.yaml | render.yaml |
| 🟢 | CORS properly configured from env vars | Settings |
| 🟢 | CSRF protection enabled with secure cookies | Settings |
| 🟢 | JWT token rotation + blacklisting enabled | Settings |
| 🟢 | Auth middleware protecting dashboard routes | `middleware.ts` |

### 9. BACKEND API & ARCHITECTURE

| Severity | Issue | Location |
|----------|-------|----------|
| 🟡 | N+1 query optimization needs verification | Various querysets |
| 🟡 | 90 test files but coverage unclear, many are one-off scripts | `backend/test_*.py` |
| 🟢 | 58 registered API endpoints, well-structured | `api/v1/urls_drf.py` |
| 🟢 | OpenAPI schema + Swagger UI + ReDoc all working | `/api/v1/docs/` |
| 🟢 | Proper pagination (20/page default) | `core/api/pagination.py` |
| 🟢 | Database indexes on all key columns | Migrations |
| 🟢 | Health check at `/api/v1/health/` | `api/v1/docs.py` |
| 🟢 | Celery Beat with 12 scheduled tasks | `estuary/celery.py` |
| 🟢 | Consistent error response format | `core/api/exceptions.py` |

### 10. LEGAL & COMPLIANCE

| Severity | Issue | Location |
|----------|-------|----------|
| 🔴 | No user account deletion endpoint (GDPR/CCPA) | Missing from users API |
| 🟡 | No cookie consent banner in frontend | Missing component |
| 🟡 | Privacy policy date outdated (May 2025) | `app/privacy/page.tsx` |
| 🟡 | Social media links are placeholder URLs | Footer |
| 🟢 | Privacy policy exists and is comprehensive | `app/privacy/` |
| 🟢 | Terms of service exists | `app/terms/` |
| 🟢 | Cookie policy page exists | `app/cookies/` |
| 🟢 | Contact page with form | `app/contact/` |

### 11. POLISH & PRODUCTION

| Severity | Issue | Location |
|----------|-------|----------|
| 🔴 | No favicon | Missing from public/ |
| 🟡 | No manifest.json for PWA | Missing from public/ |
| 🟡 | No analytics initialized (GA/PostHog) | Missing from layout |
| 🟡 | Social links in footer are placeholder URLs | Footer component |
| 🟡 | Test data and dummy content in database | Test accounts |
| 🟢 | Custom 404 page designed | `app/not-found.tsx` |
| 🟢 | Error pages designed (6 error.tsx files) | `app/**/error.tsx` |
| 🟢 | Copyright year dynamic | Footer |

---

## Quick Wins (< 30 min each, high impact)

1. **Create favicon** — design simple logo icon, export as .ico + .png
2. **Remove test routes** — delete `app/test-*` directories
3. **Add skip navigation link** — `<a href="#main" className="sr-only">Skip to content</a>`
4. **Remove SECRET_KEY fallback** — make it fail if env var not set
5. **Fix ALLOWED_HOSTS** — remove `.onrender.com` wildcard
6. **Update privacy policy date** — change to 2026
7. **Add `rel="noopener noreferrer"`** to 6 external links
8. **Replace console.warn** in hey-api-nextauth.ts with silent handling
9. **Add SECURE_SSL_REDIRECT** — one line in settings.py
10. **Restrict render.yaml IP allowlists** — change `0.0.0.0/0` to service IPs

---

## Action Plan (Prioritized)

### Tier 1: Security (Do This Week)
1. Rotate all secrets (Google OAuth, NextAuth, Stripe) — they're in git history
2. Remove SECRET_KEY fallback, add HTTPS redirect + HSTS
3. Restrict database and Redis IP allowlists in render.yaml
4. Add Content-Security-Policy header
5. Implement user account deletion endpoint (GDPR)

### Tier 2: Launch Polish (Before Go-Live)
6. Create favicon + manifest.json
7. Remove test routes from production
8. Initialize analytics (Google Analytics or PostHog)
9. Update social media links in footer
10. Add cookie consent banner
11. Verify OG image exists and works
12. Add confirmation dialog for practitioner service deletion

### Tier 3: UX Improvements (First Sprint Post-Launch)
13. Add "what is Estuary" copy to homepage hero
14. Add back button to checkout
15. Add refund preview to cancel dialog
16. Replace hardcoded hex colors with Tailwind tokens
17. Fix sage-600 contrast on white (use sage-700)
18. Add skip navigation link

### Tier 4: Technical Debt (Ongoing)
19. Break up guided-service-wizard.tsx (1,887 LOC)
20. Clean up TODO comments (30+ across codebase)
21. Run N+1 query audit with Django Debug Toolbar
22. Consolidate test files into proper test suites
23. Replace raw `<img>` with `next/image`
24. Add per-endpoint rate limiting

---

## What's Working Well ✅

- **Journey system** — well-designed grouping of bookings by service with progress tracking
- **heyapi integration** — typed API client generation from OpenAPI schema
- **Celery task architecture** — 12 scheduled tasks covering reminders, earnings, cleanup
- **Error handling** — custom exception handler + 7 error boundary files
- **Auth flow** — modal-based login/signup, Google OAuth, forgot password, middleware protection
- **Payment flow** — Stripe integration with credit system, commission tiers, refund policies
- **Cancellation business logic** — per-type rules (24hr policy, 14-day course window, cascade)
- **Design system** — consistent sage/olive/cream palette with Tailwind tokens
- **Room/video** — LiveKit integration with lobby, access control, recording
- **Email system** — Resend integration with MJML templates for all notification types
- **Journal feature** — per-session journaling with entry types (intention, reflection, note, takeaway)
