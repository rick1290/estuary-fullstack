# Practitioner Landing Pages (`/for/[slug]`)

## Overview

Dynamic, conversion-focused landing pages for acquiring practitioners through paid ads (Google, Meta) and organic SEO. Each page targets a specific wellness modality or category, speaking directly to practitioners in that space.

**Route:** `/for/[slug]`
**Examples:** `/for/reiki`, `/for/yoga`, `/for/meditation`, `/for/massage-therapy`

## How It Works

### One template, many pages

A single dynamic Next.js page (`/app/for/[slug]/page.tsx`) renders a unique landing page for every modality and category in the database. The modality name, icon, and description are inserted dynamically.

### Data source

The page fetches modality data from `GET /api/v1/modalities/by-slug/{slug}/`. This returns:
- `name` — used in headlines ("Grow Your **Reiki** Practice Online")
- `icon` — emoji displayed in hero and CTA sections
- `description` — shown in the "About" section
- `slug` — used for canonical URLs and internal links

### What's available

**13 Category rollup pages** (broad — best for paid ads):

| URL | Category | Modalities Covered |
|-----|----------|--------------------|
| `/for/yoga` | Yoga | 17 (Hatha, Vinyasa, Ashtanga, Kundalini, Yin...) |
| `/for/breathwork` | Breathwork | 19 (Holotropic, Rebirthing, Shamanic...) |
| `/for/energy` | Energy & Vibrational Healing | 14 (Reiki, Chakra, Quantum...) |
| `/for/divination` | Divination & Symbolic Systems | 13 (Astrology, Tarot, Oracle...) |
| `/for/psychic` | Psychic & Spiritual Arts | 9 (Mediumship, Akashic Records...) |
| `/for/somatic` | Somatic & Movement | 8 (Qigong, Tai Chi, Alexander...) |
| `/for/holistic` | Holistic Health Systems | 7 (Naturopathy, Ayurveda, TCM...) |
| `/for/mindbody` | Mind-Body Practices | 6 (Meditation, Mindfulness, EFT...) |
| `/for/bodywork` | Bodywork & Touch | 5 (Massage, Craniosacral...) |
| `/for/dreamwork` | Dreamwork & Altered States | 5 (Hypnotherapy, Lucid Dreaming...) |
| `/for/shamanic` | Shamanic & Plant Medicine | 4 |
| `/for/expressive` | Expressive & Creative Arts | 4 (Art, Music Therapy...) |
| `/for/coaching` | Coaching & Guidance | 2 (Life Coaching, Spiritual Counseling) |

**113 Individual modality pages** (specific — best for long-tail SEO):

`/for/reiki`, `/for/meditation`, `/for/tarot`, `/for/massage-therapy`, `/for/life-coaching`, `/for/astrology`, etc.

> **Note:** Category pages (`/for/yoga`) require the backend `modalitiesBySlugRetrieve` endpoint to also check ModalityCategory slugs. If not yet implemented, only individual modality slugs work.

## Page Structure

The landing page is a self-contained conversion funnel. No main site navbar or footer — just a minimal header with logo + CTA, and a compact footer.

### Sections (top to bottom):

1. **Minimal header** — Logo + "List Your Services — Free" CTA button
2. **Hero** — "Grow Your {Modality} Practice Online" + trust signals (free, no monthly fees, 5% commission)
3. **Pain points** — "Stop Juggling Five Different Tools" — old way vs. Estuary way comparison cards
4. **Features** — 6 feature cards (scheduling, video, payments, intake forms, workshops, messaging)
5. **How it works** — 3 steps: Create Profile → List Services → Start Seeing Clients
6. **Pricing** — "Free to List. Always." card with 5% commission details
7. **About the modality** — Dynamic description from modality data (only if description exists)
8. **Final CTA** — "Ready to Grow Your {Modality} Practice?" with signup button
9. **Minimal footer** — Logo + essential links only

### Key design decisions:

- **No main navbar** — eliminates escape routes. Visitor either converts or leaves.
- **Single CTA throughout** — every section drives toward "Create Your Free Profile"
- **Font-serif headings** (Cormorant Garamond) matching Estuary brand
- **Olive/sage/cream color palette** consistent with the rest of the platform
- **Mobile responsive** — works at all viewport widths

## Using with Ads

### Google Ads

Target keywords like:
- "{modality} practitioner platform"
- "{modality} booking software"
- "list {modality} services online"
- "{modality} practice management"

Landing page URL: `/for/reiki?utm_source=google&utm_medium=cpc&utm_campaign=reiki_practitioners`

### Meta/Instagram Ads

Target interests: Reiki practitioners, yoga teachers, wellness coaches, etc.

Landing page URL: `/for/yoga?utm_source=meta&utm_medium=paid&utm_campaign=yoga_instructors`

### UTM tracking

UTM parameters pass through naturally. The CTA button sends users to `/become-practitioner/application` where conversion can be tracked.

## SEO

Each page generates unique metadata:
- **Title:** "Estuary for {Modality} Practitioners — Grow Your Practice"
- **Description:** "The all-in-one platform for {Modality} practitioners. Manage bookings, accept payments, host virtual sessions..."
- **OG tags:** Unique per modality for social sharing

### Internal linking

- Each `/for/[slug]` page links to the corresponding `/modalities/[slug]` user-facing page
- The user-facing modality pages could link back to `/for/[slug]` ("Are you a practitioner?")

## Files

| File | Purpose |
|------|---------|
| `app/for/[slug]/page.tsx` | Server component — fetches modality data, generates metadata |
| `app/for/[slug]/landing-client.tsx` | Client component — renders the full landing page |
| `middleware.ts` | `/for` added to public routes (no auth required) |
| `app/client-layout.tsx` | `/for` pages hide main navbar and footer |

## Adding a New Modality

No code changes needed. Just add a new Modality or ModalityCategory in the Django admin with a `slug`, and the landing page is automatically available at `/for/{slug}`.

## Future Enhancements

- [ ] Pull real practitioner count per modality ("Join 47 Reiki practitioners on Estuary")
- [ ] Pull real service count ("Browse 120+ Reiki services")
- [ ] Add testimonial section with real practitioner reviews for that modality
- [ ] A/B test different hero copy per modality
- [ ] Add video embed in hero (practitioner testimonial)
- [ ] Retargeting pixel integration
- [ ] Category slug support in the API (so `/for/yoga` works for the rollup)
