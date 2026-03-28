# Location SEO Strategy

> Plan for capturing location-based search traffic: "yoga teacher near me", "reiki healer san francisco", etc.

**Status**: Planning
**Priority**: High — location queries are the #1 way people find wellness practitioners
**Estimated Impact**: Opens an entirely new traffic channel not currently captured

---

## The Opportunity

People search for wellness services by location more than any other way:
- "yoga classes in [city]"
- "reiki healer near me"
- "breathwork facilitator [city]"
- "wellness workshops [city]"
- "[modality] practitioner [city/state]"

Estuary currently has **zero pages** targeting these queries. Every practitioner has location data, but it's not surfaced in SEO-friendly URLs or content.

---

## Proposed URL Structure

### Tier 1: City Landing Pages (highest priority)
```
/practitioners/[city]
  → "Wellness Practitioners in San Francisco | Estuary"
  → Lists all practitioners in that city
  → Filtered by location, shows modality breakdown

/practitioners/[city]/[modality]
  → "Yoga Teachers in San Francisco | Estuary"
  → Filtered practitioners by city + modality
```

### Tier 2: Modality + Location Pages
```
/modalities/[modality]/[city]
  → "Reiki Healing in San Francisco — Practitioners & Sessions | Estuary"
  → Shows practitioners, services, and educational content for that modality in that city
```

### Tier 3: Service Type + Location
```
/marketplace/sessions/[city]
  → "Wellness Sessions in San Francisco | Estuary"

/marketplace/workshops/[city]
  → "Wellness Workshops in San Francisco | Estuary"
```

---

## Implementation Plan

### Phase 1: Data Foundation
- [ ] Ensure all practitioners have normalized city/state/country data in the backend
- [ ] Create a backend endpoint: `GET /api/v1/practitioners/locations/` that returns unique cities with practitioner counts
- [ ] Add `city_slug` field to practitioner location data (e.g., "san-francisco", "new-york")

### Phase 2: City Landing Pages
- [ ] Create `/app/practitioners/[city]/page.tsx` with:
  - Dynamic `generateMetadata()` — "Wellness Practitioners in {City} | Estuary"
  - Description: "Find {count} wellness practitioners in {City}. Book sessions, workshops, and courses with expert guides in yoga, reiki, breathwork, and more."
  - JSON-LD: `ItemList` schema with practitioner entries
  - Breadcrumbs: Home > Practitioners > {City}
- [ ] Create `generateStaticParams()` from the locations endpoint
- [ ] Add city pages to sitemap.ts

### Phase 3: City + Modality Pages
- [ ] Create `/app/practitioners/[city]/[modality]/page.tsx`
  - Title: "{Modality} Practitioners in {City} | Estuary"
  - Description: "Find experienced {modality} practitioners in {City}. Book one-on-one sessions, workshops, and courses on Estuary."
  - JSON-LD: `ItemList` + `LocalBusiness` schema
- [ ] Only generate pages where practitioners actually exist (no empty pages)

### Phase 4: Internal Linking
- [ ] Add "Available in: [City1], [City2], [City3]" links on modality pages
- [ ] Add "Practitioners near you" section on homepage (if geolocation available)
- [ ] Add city links in footer (top 10-15 cities)
- [ ] Cross-link between city pages and modality pages

### Phase 5: Schema Markup
- [ ] Add `LocalBusiness` schema on practitioner profiles with location data
- [ ] Add `Place` schema on service pages with in-person locations
- [ ] Add `areaServed` to Organization schema

---

## Content Strategy for Location Pages

Each city landing page should include:

1. **Hero**: "{Count} Wellness Practitioners in {City}"
2. **Practitioner Grid**: Filtered list with photos, titles, ratings
3. **Modality Breakdown**: "Popular modalities in {City}: Yoga (12), Reiki (8), Meditation (6)..."
4. **Intro Paragraph**: 2-3 sentences about wellness in that city (can be templated)
5. **FAQ Section**: "How do I find a wellness practitioner in {City}?" — helps with featured snippets
6. **CTA**: "Become a practitioner in {City}"

---

## SEO Considerations

### Avoid Thin Content
- Only create city pages where there are 2+ practitioners
- Don't create modality+city combos with only 1 practitioner (use the city page instead)

### Canonical Strategy
- `/practitioners/san-francisco` is the canonical for that city
- `/marketplace/practitioners?location=san-francisco` should NOT be indexed (filtered URL)
- Add `<link rel="canonical">` pointing to the city page from filtered results

### Title Formula
```
{Modality} {Service Type} in {City} | Estuary
```
Examples:
- "Yoga Teachers in San Francisco | Estuary"
- "Reiki Healing Sessions in Austin | Estuary"
- "Wellness Workshops in New York | Estuary"

### Description Formula
```
Find {count} {modality} practitioners in {City}. Book {service types} with expert guides on Estuary. {Unique selling point}.
```

---

## Technical Notes

### Backend Changes Needed
1. Add `city_slug` to practitioner location model (or derive from city name)
2. Create API endpoint for unique locations with counts
3. Ensure location data is indexed for efficient filtering

### Frontend Changes
1. New route files under `/app/practitioners/[city]/`
2. Update sitemap.ts to include city pages
3. Update internal linking components
4. Add city links to footer

### Monitoring
- Track organic impressions for location keywords in Google Search Console
- Monitor which cities drive the most traffic
- A/B test city page layouts

---

## Priority Cities (based on typical wellness market)

Launch with the top 10-15 cities where practitioners are concentrated:
1. Los Angeles
2. San Francisco
3. New York
4. Austin
5. Portland
6. Denver
7. Seattle
8. Chicago
9. Miami
10. Nashville
11. San Diego
12. Boulder
13. Sedona
14. Asheville
15. Bali (international)

Expand to more cities as practitioner base grows.
