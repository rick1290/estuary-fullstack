# Estuary Product Roadmap — 2026 Competitiveness

## Priority 1: Modality Pages (`/modalities/[slug]`)

**Status:** Not started
**Impact:** High (SEO + Discovery)
**Effort:** Medium

### What
Dedicated landing pages for each wellness modality — yoga, breathwork, somatic therapy, reiki, meditation, etc. Each page is a mini-marketplace filtered to that modality with editorial content on top.

### Why
- Long-tail SEO: "book breathwork session online" → lands on `/modalities/breathwork`
- Education: first-time visitors don't know what modalities exist or which one fits them
- Conversion: focused landing pages convert better than a generic marketplace with filters
- Content marketing: each page becomes a linkable asset for blog posts, social, and ads

### What Each Page Needs
- [ ] Editorial intro section (2-3 paragraphs about the modality, benefits, who it's for)
- [ ] Featured practitioners who specialize in this modality
- [ ] Services filtered to this modality (sessions, workshops, courses)
- [ ] Related streams/content from practitioners in this modality
- [ ] FAQ section (what to expect, how to prepare, etc.)
- [ ] CTA: "Find your [modality] practitioner"
- [ ] Breadcrumb: Home > Modalities > [Name]
- [ ] Dynamic meta title/description for SEO

### Technical Notes
- API already supports `modality` slug-based filtering — backend is ready
- `ModalityReadable` has: `id`, `name`, `slug`, `description`, `icon`, `is_featured`
- Route: `app/modalities/[slug]/page.tsx`
- Reuse `ServiceListings` and `PractitionerListings` components with modality filter pre-applied
- Need editorial content per modality (can be hardcoded initially, CMS later)

### Files to Create/Modify
- [ ] `app/modalities/page.tsx` — modalities index page (grid of all modalities)
- [ ] `app/modalities/[slug]/page.tsx` — individual modality page
- [ ] `components/modalities/modality-hero.tsx` — editorial hero section
- [ ] `components/modalities/modality-practitioners.tsx` — featured practitioners
- [ ] `components/modalities/modality-services.tsx` — filtered services
- [ ] `components/modalities/modality-content.tsx` — related streams
- [ ] `components/modalities/modality-faq.tsx` — FAQ accordion
- [ ] Add "Explore Modalities" link to homepage and marketplace nav
- [ ] Add modality pages to sitemap

---

## Priority 2: SEO Infrastructure

**Status:** Not started
**Impact:** High (compounds over time)
**Effort:** Medium

### What
Proper SEO foundation: sitemap, robots.txt, structured data, dynamic meta tags, OpenGraph/Twitter cards.

### Why
- Currently zero SEO infrastructure — no sitemap, no structured data, generic meta tags
- Marketplaces live and die by organic search
- AI search (Google SGE, Perplexity, ChatGPT) pulls heavily from structured data
- Every practitioner profile and service page is a potential search landing page

### Tasks
- [ ] `app/sitemap.ts` — dynamic sitemap generation
  - All public service pages
  - All practitioner profiles
  - All modality pages
  - Marketplace category pages
  - Blog posts
  - Static pages (about, mission, etc.)
- [ ] `app/robots.ts` — robots.txt
- [ ] Dynamic `generateMetadata()` on every public page:
  - Practitioner profiles: "Book a [Title] Session with [Name] | Estuary"
  - Service pages: "[Service Name] — [Duration] [Type] with [Practitioner] | Estuary"
  - Modality pages: "[Modality] Practitioners & Sessions | Estuary"
- [ ] OpenGraph + Twitter Card meta tags on all public pages
  - og:image generation (practitioner photo or service image)
- [ ] JSON-LD structured data:
  - `Service` schema on service detail pages
  - `Person` schema on practitioner profiles
  - `Event` schema on workshops/courses with dates
  - `Organization` schema on homepage
  - `BreadcrumbList` schema on all pages
  - `FAQPage` schema on modality pages
  - `AggregateRating` on practitioners with reviews
- [ ] Canonical URLs on all pages
- [ ] `<link rel="alternate">` for any duplicate routes (e.g., `/sessions/[slug]` vs `/services/[id]`)

### Files to Create/Modify
- [ ] `app/sitemap.ts`
- [ ] `app/robots.ts`
- [ ] Update `generateMetadata` in every public `page.tsx`
- [ ] `lib/structured-data.ts` — JSON-LD helper functions
- [ ] `components/seo/json-ld.tsx` — reusable JSON-LD component

---

## Priority 3: Recurring Bookings

**Status:** Not started
**Impact:** High (retention)
**Effort:** High (needs backend)

### What
Allow clients to set up recurring sessions (weekly, biweekly, monthly) with a practitioner instead of rebooking manually each time.

### Why
- Retention is cheaper than acquisition
- Wellness is inherently recurring — therapy, coaching, yoga are ongoing relationships
- Reduces friction for the most valuable clients (repeat bookers)
- Increases practitioner income predictability

### Tasks
- [ ] "Make this recurring" option after booking a session
- [ ] Frequency selector: weekly, biweekly, monthly
- [ ] Duration: 4 weeks, 8 weeks, 12 weeks, ongoing
- [ ] Same time slot auto-hold for recurring clients
- [ ] Recurring booking management in user dashboard
  - Skip a week
  - Pause series
  - Cancel series
  - Reschedule single occurrence
- [ ] Practitioner dashboard: view recurring clients, manage series
- [ ] Auto-charge for recurring sessions (use saved payment method)
- [ ] Email reminders before each recurring session
- [ ] Cancellation policy for recurring (e.g., 24hr notice per session)

### Backend Requirements
- Recurring booking model (parent series + child occurrences)
- Auto-scheduling logic (find same time slot in future weeks)
- Auto-payment processing
- Series management API endpoints

---

## Priority 4: Onboarding Quiz / Assessment Flow

**Status:** Not started
**Impact:** Medium-High (conversion)
**Effort:** Medium

### What
A guided quiz for first-time visitors: "What kind of wellness are you looking for?" → personalized results page with recommended modalities, practitioners, and services.

### Why
- First-time visitors don't know the difference between somatic therapy and reiki
- Reduces bounce rate by guiding people to relevant results
- Captures intent data for personalization
- Creates a warm lead even if they don't book immediately (email capture at end)

### Flow
1. "What brings you here?" — stress/anxiety, physical pain, personal growth, spiritual exploration, fitness, relationships
2. "What's your experience level?" — new to wellness, some experience, very experienced
3. "What format works for you?" — 1:1 sessions, group workshops, self-paced courses, content/reading
4. "Virtual or in-person?" — virtual only, in-person only, either
5. Results page: matched modalities, top 3 practitioners, recommended services, relevant streams

### Tasks
- [ ] `app/discover/page.tsx` — quiz entry point
- [ ] `components/discover/quiz-flow.tsx` — multi-step quiz component
- [ ] `components/discover/quiz-results.tsx` — personalized results
- [ ] Mapping logic: answers → modalities + service types
- [ ] "Retake quiz" in user dashboard
- [ ] CTA on homepage: "Not sure where to start?" → quiz
- [ ] Email capture on results page (optional, for non-logged-in users)
- [ ] Save quiz results to user profile for future recommendations

---

## Priority 5: Gift Cards

**Status:** Not started
**Impact:** Medium (revenue + seasonality)
**Effort:** Medium

### What
Digital gift cards that can be purchased and sent to recipients, redeemable for any service on the platform.

### Why
- Wellness is a top gift category (holidays, birthdays, Mother's Day, Valentine's)
- Average gift card spend is higher than self-purchase
- Recipients become new users (acquisition channel)
- Simple to implement on top of existing credits system

### Flow
1. `/gift-cards` — browse gift card options ($25, $50, $100, custom amount)
2. Purchase flow: amount, recipient name, recipient email, personal message, delivery date
3. Recipient gets branded email with gift card code + link to redeem
4. Redemption adds credits to recipient's account
5. Credits applied at checkout (existing flow already supports this)

### Tasks
- [ ] `app/gift-cards/page.tsx` — gift card landing page
- [ ] `components/gift-cards/gift-card-purchase.tsx` — purchase flow
- [ ] `components/gift-cards/gift-card-preview.tsx` — preview of what recipient sees
- [ ] Gift card email template (branded, with personal message)
- [ ] Redemption flow: `/gift-cards/redeem?code=XXX`
- [ ] Gift card balance tracking in user dashboard
- [ ] "Gift this service" button on service detail pages
- [ ] Seasonal marketing: holiday gift card landing pages

### Backend Requirements
- Gift card model (code, amount, sender, recipient, status, expiry)
- Gift card purchase endpoint
- Gift card redemption endpoint (converts to credits)
- Scheduled email delivery
- Gift card balance/history endpoints

---

## Priority 6: Corporate Wellness Portal

**Status:** Not started
**Impact:** High (revenue per account)
**Effort:** High

### What
A B2B offering where companies can purchase wellness credits in bulk for their employees. Employees get access to a curated marketplace of services.

### Why
- Corporate wellness is a $85B+ market growing 7% annually
- Average contract value is 100-1000x a single consumer booking
- Companies are mandated/incentivized to offer employee wellness benefits
- Your existing marketplace is the product — you just need a B2B wrapper

### What It Needs
- [ ] `/corporate` — corporate wellness landing page
- [ ] Company admin dashboard:
  - Purchase credits in bulk (discounted rates)
  - Allocate credits to employees (monthly/quarterly allowance)
  - Usage reporting and analytics
  - Employee roster management
  - Approved service types/modalities
- [ ] Employee experience:
  - SSO login through company
  - Browse marketplace with company credit balance
  - Book with company credits (no personal payment needed)
  - Monthly allocation auto-refills
- [ ] Sales flow:
  - "Book a demo" → sales call
  - Custom pricing based on headcount
  - Contract/invoicing (not card-based)
- [ ] Reporting:
  - Utilization rates
  - Most popular modalities
  - Employee satisfaction scores
  - ROI metrics (anonymized)

### Backend Requirements
- Organization model (company, admin users, employees)
- Bulk credit purchase and allocation
- Employee invitation/onboarding
- Usage tracking per organization
- Admin role and permissions
- Reporting/analytics API

---

## Future Considerations (Not Prioritized Yet)

### Post-Session Follow-Up Automation
- Auto "How was your session?" email → review prompt → rebook CTA
- Practitioner can send post-session notes/homework
- Progress tracking over multiple sessions

### Practitioner Verification & Credentialing
- Verified badge system (license verification, insurance, background check)
- Displayed prominently on profiles and in search results
- Trust signal for clients choosing between practitioners

### Location-Based Discovery
- "Practitioners near you" on homepage (with permission)
- Map view in marketplace for in-person services
- Distance-based sorting/filtering

### Trending & Social Features
- "Popular this week" section on homepage
- "Clients also booked" recommendations on service pages
- Practitioner spotlight/feature rotation

### Mobile App
- React Native or PWA
- Push notifications for bookings, messages, session reminders
- Quick re-book from home screen

### Internationalization
- Multi-language support
- Multi-currency pricing
- Timezone-aware scheduling (partially exists)
