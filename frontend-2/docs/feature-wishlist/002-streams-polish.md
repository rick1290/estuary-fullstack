# Feature #2: Streams Polish

**Priority:** High
**Status:** Planned
**Estimated scope:** Backend fixes + ~8 frontend files

---

## Items

### Tips UI & Backend
- Tip modal with preset amounts ($1, $3, $5, $10, $25) + custom
- Optional message, anonymous toggle
- Stripe PaymentIntent with platform fee
- Backend: `StreamTip` model already exists, need API endpoints
- Replace "coming soon" toast on content card tip button

### Post/Subscriber Count Sync
- Auto-increment `post_count` on post create, decrement on delete
- Helper `_update_subscriber_counts(stream)` for subscribe/unsubscribe/tier-change
- Fix all inline count updates in views.py

### Infinite Scroll
- Replace "Load More" button with IntersectionObserver sentinel
- `rootMargin: '200px'` for prefetch
- Spinner at bottom while loading

### Empty States
- Illustrated empty states with Lucide icons + CTA buttons
- Variants: main feed, subscribed feed, stream detail (visitor vs owner)

### Image Lightbox
- Full-screen Dialog with dark overlay
- Arrow key + swipe navigation, image counter
- Opens on click for accessible content

### Video Player
- Click play → swap thumbnail for native `<video controls autoPlay>`
- Audio posts: `<audio controls>`
- Keep lock overlay for premium

### Subscription Management
- Fix cancel flow: `POST /streams/{id}/unsubscribe/`
- Fix tier change: `POST /streams/{id}/subscription/change-tier/`
- Cancel confirmation dialog
