# Estuary Platform — Capability Audit

*Last updated: 2026-03-23*

---

## What We Have (Complete & Production-Ready)

### Core Booking System
- **5 service types**: Sessions (1-on-1), Workshops (group), Courses (multi-session), Packages (mixed bundles), Bundles (bulk same service)
- ServiceSession as source of truth for all scheduling
- Booking status tracking: draft → pending_payment → confirmed → completed/canceled
- Rescheduling support with automatic session updates
- Multi-booking purchases via Order model (courses/packages/bundles create N bookings for 1 order)
- Historical pricing snapshots preserved at time of booking

### Payment Processing (Stripe Connect)
- Full Stripe Payment Intents integration
- Credit system with pre-paid balance (purchase, usage, refund, bonus, adjustment, transfer)
- Atomic transaction handling with rollback
- Stripe webhook integration
- Commission rate system (15% sessions, 20% workshops/courses, configurable)
- Duplicate prevention for credit purchases

### Practitioner Payouts
- PractitionerEarnings model (gross, commission, net per booking)
- Practitioner subscription tiers (Free, Entry, Premium, Gold, Platinum)
- 48-hour hold period after booking completion
- Weekly automatic payout requests via Temporal workflows
- Manual payout request capability
- Minimum $50 payout threshold
- Stripe Connect payouts to practitioner bank accounts

### Availability Management
- 3-layer timezone system (user viewing, schedule, location)
- Named schedule templates (e.g., "Summer Hours", "Winter Schedule")
- Weekly recurring availability (ScheduleTimeSlot)
- Service-specific schedule overrides
- Out-of-office blocking
- Holiday blocking with custom dates
- Advance booking limits (min hours, max days)
- Auto-accept booking option
- Overlap prevention validation

### Video Conferencing (LiveKit)
- Room types: individual, group, webinar, broadcast
- Unified URL pattern: /room/{room-uuid}/lobby
- Automatic room creation on first join
- Token generation with 4-hour expiry
- Role-based permissions (host vs participant)
- Pre-join screen with device testing
- Screen sharing, recording (MP4, WebM, HLS)
- Phone dial-in (SIP), streaming/RTMP support
- Real-time participant tracking via webhooks
- Access flow: Booking → Room (1-on-1), ServiceSession → Room (groups)

### Messaging & Communications
- Real-time DMs via WebSocket (/ws/chat/{conversation_id}/)
- Conversation types: direct, group, booking-related, service-related, support
- Participant tracking and read status (last_read_message)
- Message attachments
- Conversation archiving
- Additional WebSocket channels: /ws/notifications/, /ws/booking-updates/

### Reviews & Ratings
- 5-point decimal rating system
- Anonymous review option
- Verified purchases only (booking-linked)
- Practitioner response capability
- Helpful/unhelpful voting
- Report abuse tracking
- Published/unpublished moderation
- Structured review questions (rating, text, yes/no types)

### Notifications (Multi-Channel via Courier)
- Email, SMS, in-app, push delivery
- Notification templates system
- Booking reminders: 24-hour and 30-minute (runs every 5 min)
- Scheduled delivery
- Deduplication via notification_key
- Status tracking (pending, sent, failed, cancelled)
- Self-healing — survives system restarts

### Content Streaming Platform (Streams)
- One stream per practitioner, 3 fixed tiers (free, entry, premium)
- 7 content types: text, video, audio, image, gallery, link, poll
- Customizable tier names, descriptions, perks, pricing
- StreamPostMedia: multiple attachments per post
- StreamSubscription with Stripe recurring billing
- Threaded commenting with replies
- StreamTip model for one-time payments
- Content visibility rules by tier
- Teaser text for locked content
- Analytics snapshots (daily metrics)
- Subscriber growth/churn tracking
- Linked services (booking cards embedded in posts)

### Referral System
- Unique 8-character referral codes auto-generated per user
- Configurable reward types: credits, cash, discount
- Conversion criteria: signup, first purchase, minimum purchase
- Referrer and referred rewards
- Program start/end dates, max referrals per user
- Status tracking: pending, converted, expired, rejected

### Journaling
- User-authored reflections linked to bookings and services
- Entry types: intention, reflection, note, takeaway
- Historical wellness timeline

### Analytics & Insights
- UserEngagement: daily snapshots (logins, session duration, pages, searches)
- PractitionerPerformance: daily (profile views, bookings, earnings, ratings)
- ServiceAnalytics: daily (views, bookings, cancellations, revenue)

### Practitioner Onboarding & Verification
- Multi-step onboarding progress tracking
- Verification documents: ID, certification, license, insurance, background check
- Status: pending → approved/rejected with reasons
- License expiry tracking
- Document storage in Cloudflare R2
- Practitioner status: pending, active, inactive, vacation, suspended, rejected

### Modality System
- 113 modalities across 13 categories
- Gray-zone flags for regulated modalities
- Related modalities for cross-discovery
- SEO metadata, benefits, FAQs per modality
- Featured modalities on homepage

### Search & Discovery
- Full-text search across services, practitioners, modalities
- Filtering: modality, service type, location type (virtual/in-person/hybrid), experience level, price range, availability, rating, featured status
- Service categorization (global + practitioner-specific)
- Tags on services

### User Profiles & Preferences
- Email-based authentication (no username)
- UserProfile: display name, bio, avatar, gender, birthdate
- Social links
- Stripe customer billing profile
- Favorite practitioners and services
- Modality preferences with priority ordering
- Timezone preferences

### Locations & Service Delivery
- Multiple locations per practitioner
- Virtual/in-person/hybrid delivery
- Location-specific availability
- Geographic filtering
- Timezone per location

### Infrastructure
- Django 5.1.3 + DRF
- PostgreSQL + Redis
- Celery (async tasks) + Temporal (workflow orchestration)
- Stripe Connect (payments)
- LiveKit (video)
- Cloudflare R2 (file storage)
- Courier (notifications)
- Sentry (error tracking)
- Docker deployment
- 117 frontend pages (Next.js 15 + TypeScript + Tailwind)

---

## What's Missing

### Intake Forms — NOT IMPLEMENTED
Pre-session questionnaires. Practitioners need to know what they're walking into. A client booking trauma-informed yoga should fill out a brief form about injuries, triggers, experience level. Without this, practitioners fly blind every first session. Would require: form builder, custom field types, conditional logic, response storage, practitioner-side viewer.

### Recurring Bookings — NOT IMPLEMENTED
Standing weekly appointments ("every Tuesday at 2pm with Sarah"). This is how real practitioner-client relationships work. Courses exist for multi-session, but no standalone recurring booking subscription. Would require: recurrence rules, automatic booking creation, conflict handling, pause/resume.

### Waitlists — MINIMAL
Basic model exists but no automation. When a popular practitioner is fully booked, no way for users to say "notify me when something opens." Lost revenue. Would require: queue management, automatic notification on cancellation, expiration handling, priority ordering.

### Gift Cards / Vouchers — NOT IMPLEMENTED
"Buy a friend a breathwork session." Natural gifting use case in wellness. Also useful for corporate (company buys 50 session credits for employees). Would require: code generation, redemption tracking, balance management, expiration, email delivery.

### Consent / Liability Forms — NOT IMPLEMENTED
Practitioners in regulated modalities need signed consent forms, liability waivers, health disclaimers before sessions. Related to intake forms but legally distinct. Would require: form templates, e-signature capture, storage, per-service configuration.

### Customizable Cancellation Policies — BASIC
Currently hardcoded (24hr full refund, <24hr nothing). Practitioners need their own: 48hr, partial refunds, no-refund policies for certain services, custom messaging. Would require: policy builder per service, automated refund calculation, user-facing policy display.

### PWA / Mobile App — NOT IMPLEMENTED
No service worker, no offline support, not installable. For a platform where users book sessions and consume content daily, home screen presence matters. Would require: service worker, app manifest, offline content caching, push notification registration.

### AI Features — MINIMAL
Only an `ai_images` app stub exists. The concierge, content assistant, semantic search — all greenfield. See ai-product-vision.md for full roadmap.

### Admin Dashboard — BASIC
Django admin only. No custom admin UI for business analytics, content moderation queue, practitioner approval workflow, dispute resolution, platform health metrics.

### Multi-Language / I18N — PARTIAL
Language model exists, translation framework in place. No actual translations, no translation UI, no language switching in frontend.

### Insurance / HSA Integration — NOT IMPLEMENTED
Complex domain requiring health insurance provider integrations. Would be transformative for adoption (many wellness services are HSA-eligible) but significant regulatory and technical lift.

### Group Booking (Multi-User) — PARTIAL
Workshops support multiple participants, but no explicit "book for my friend too" or "book 3 seats" flow. Each person must book individually.

---

## Assessment

The platform covers 90% of what a wellness marketplace requires for production operation. The missing pieces (intake forms, recurring bookings, waitlists, gift cards) are features that become critical at scale but aren't blockers for early traction. The core booking → payment → video → content loop is complete and working.

The technology stack is mature (Django + Next.js + Stripe + LiveKit + Temporal + Redis + Postgres) and the architecture is clean (separation of Booking/ServiceSession/Order, 3-layer timezone, denormalized analytics).

**117 pages. 5 service types. 113 modalities. Real payments. Real video. Real content platform. Real messaging.**

The question is not "do we have enough features" — it's distribution.
