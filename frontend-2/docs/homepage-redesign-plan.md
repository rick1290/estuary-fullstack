# Homepage Redesign Plan

**Status**: In Progress
**Reference**: `/Downloads/Estuary — Find Wellness Practitioners & Workshops _ Claude.html`
**Reference CSS**: `/docs/homepage-redesign-reference.css`

---

## Design Direction

Premium wellness marketplace with warm, organic feel. Key aesthetics:
- Background: `#FAF7F2` (warm cream) — already using `#f8f5f0`
- Nearly invisible card borders: `rgba(74, 63, 53, 0.05)`
- Premium hover: `translateY(-4px/-6px)` + deep soft shadows
- Subtle animated background shapes (radial gradients)
- Typography: Cormorant Garamond display + DM Sans body (already in place)

---

## Sections — Current vs Target

### 1. Hero ✅ KEEP (with enhancements)
**Current**: Search bar, eyebrow, heading, category pills
**Target enhancements**:
- Add "discovery path" cards: Find a Practitioner | Join a Workshop | Explore Modalities
- Animated background shapes (radial gradients with slow animation)
- Social proof eyebrow: "420+ practitioners · 2,800+ sessions booked"
- Search suggestions: "Try 'reiki near me' or 'breathwork workshop'"

### 2. Featured Practitioners ✅ DONE (redesigned)
- Square image cards with specialty eyebrow, name, tagline, stats
- Rating + session count + online/in-person indicator
- Horizontal scroll with snap

### 3. What's Happening ✅ DONE (new bento grid)
- Replaces Upcoming Workshops
- Bento grid: 1.3fr 1fr 1fr with featured spanning 2 rows
- Time badges: LIVE NOW, TODAY, TOMORROW, day name
- Service type + time + practitioner + price

### 4. Testimonials Strip → Social Proof Strip (TODO)
**Current**: Client testimonial quotes
**Target**: Sage green bar with stats: "420+ Practitioners", "2,800+ Sessions", "4.9 Average Rating"
- Subtle dot texture overlay
- Centered layout with generous spacing

### 5. Explore Formats → Categories/Intent Section (TODO)
**Current**: 3 cards (Workshops, Courses, Sessions) with images
**Target**: Intent-based category cards with descriptions and practitioner counts
- "I need support with..." framing
- Categories: Stress & Anxiety, Trauma & Healing, Spiritual Growth, Physical Wellness
- Each shows modality count and practitioner count

### 6. Browse Modalities ✅ UPDATED (links to category pages now)

### 7. Streams Teaser ✅ KEEP

### 8. Become a Practitioner → Practitioner CTA (TODO)
**Current**: Light section with CTA
**Target**: Dark section (bark/olive-800 background) with:
- Quote from a practitioner
- Stats: "$0/mo", "Built-in Video", "5% Commission"
- "Get Started Free" CTA

---

## Implementation Priority

1. ~~Featured Practitioners~~ ✅
2. ~~What's Happening bento grid~~ ✅
3. Social Proof Strip (replace testimonials)
4. Hero enhancements (discovery cards, animated bg)
5. Practitioner CTA dark section
6. Categories/Intent section redesign
