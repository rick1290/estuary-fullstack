# Estuary Streams Implementation Tasks

## Phase 1: Backend Infrastructure Setup

### 1.1 Database Updates
- [x] Create migrations for Stream model Stripe fields ✓ 2025-06-21
  - [x] Add `stripe_product_id` field
  - [x] Add `stripe_entry_price_id` field  
  - [x] Add `stripe_premium_price_id` field
- [x] Create migrations for StreamSubscription fields ✓ 2025-06-21
  - [x] Add `stripe_price_id` field
  - [x] Add `price_cents` field
- [x] Run `python manage.py makemigrations streams` ✓ 2025-06-21
- [x] Run `python manage.py migrate` ✓ 2025-06-21
- [ ] Create data migration to set default prices for existing streams (if any)

### 1.2 Extend Stripe Webhook Handler
- [x] Add stream subscription event handlers to existing webhook: ✓ 2025-06-22
  - [x] Handle `customer.subscription.created`
  - [x] Handle `customer.subscription.updated`
  - [x] Handle `customer.subscription.deleted`
  - [x] Handle `invoice.payment_succeeded` for streams
  - [x] Handle `invoice.payment_failed` for streams
- [x] Add metadata fields to identify stream subscriptions: ✓ 2025-06-22
  - [x] Add `type: 'stream'` to subscription metadata
  - [x] Add `stream_id` to subscription metadata
  - [x] Add `practitioner_id` to subscription metadata
- [ ] Test webhook handlers with Stripe CLI

### 1.3 Create Stream Subscription API Endpoints
- [x] Create `/api/v1/streams/{id}/pricing/` endpoint ✓ 2025-06-22
  - [x] Accept PATCH requests with new pricing
  - [x] Create Stripe Product if not exists
  - [x] Create new Stripe Prices
  - [x] Update Stream model with new price IDs
- [x] Create `/api/v1/streams/{id}/subscribe/` endpoint ✓ 2025-06-22
  - [x] Accept POST with tier selection
  - [x] Create or retrieve Stripe Customer
  - [x] Create Stripe Subscription
  - [x] Create StreamSubscription record
- [x] Create `/api/v1/streams/{id}/unsubscribe/` endpoint ✓ 2025-06-22
  - [x] Cancel Stripe Subscription at period end
  - [x] Update StreamSubscription status
- [x] Create `/api/v1/streams/{id}/subscription/change-tier/` endpoint ✓ 2025-06-22
  - [x] Update Stripe Subscription with new price
  - [x] Handle proration
  - [x] Update StreamSubscription record
- [x] Create `/api/v1/users/me/stream-subscriptions/` endpoint ✓ 2025-06-22
  - [x] List user's active stream subscriptions
  - [x] Include stream details and pricing

## Phase 2: Enhance Practitioner Dashboard

### 2.1 Add Pricing Configuration
- [x] Update `/dashboard/practitioner/streams` page: ✓ 2025-06-22
  - [x] Add "Pricing" section/tab
  - [x] Create form with entry tier price input
  - [x] Create form with premium tier price input
  - [x] Add "Save Pricing" button
  - [x] Show current prices if set
- [x] Implement pricing save logic: ✓ 2025-06-22
  - [x] Call `/api/v1/streams/{id}/pricing/` on save
  - [x] Show success/error messages
  - [x] Update displayed prices
- [x] Add pricing validation: ✓ 2025-06-22
  - [x] Minimum price ($1)
  - [x] Entry tier must be less than premium
  - [x] Warn about existing subscribers

### 2.2 Add Subscriber Management
- [x] Create "Subscribers" tab on streams page: ✓ 2025-06-22
  - [x] Show total subscriber count
  - [x] Show breakdown by tier (free/entry/premium)
  - [x] Show Monthly Recurring Revenue (MRR)
- [x] Create subscriber list table: ✓ 2025-06-22
  - [x] Display subscriber name, tier, join date
  - [x] Add pagination for large lists
  - [x] Add search/filter functionality
- [ ] Add subscriber actions:
  - [ ] View subscriber profile
  - [ ] Send message to subscriber

### 2.3 Enhance Revenue Analytics
- [ ] Add revenue metrics section:
  - [ ] Current MRR display
  - [ ] Revenue growth chart (monthly)
  - [ ] Average revenue per subscriber
  - [ ] Churn rate calculation
- [ ] Add tier distribution chart:
  - [ ] Pie chart showing subscriber distribution
  - [ ] Revenue breakdown by tier
- [ ] Add payment history:
  - [ ] Recent successful payments
  - [ ] Failed payment alerts

## Phase 3: User Subscription Experience

### 3.1 Update Stream Discovery
- [x] Enhance `/streams` page: ✓ 2025-06-22
  - [x] Add "Subscribed" badge to subscribed streams
  - [x] Add "Subscribe" button to stream cards
  - [x] Show tier pricing on cards
  - [x] Add "My Subscriptions" filter
- [x] Create subscription status check: ✓ 2025-06-22
  - [x] Check user's subscriptions on page load
  - [x] Update UI based on subscription status

### 3.2 Create Subscription Flow
- [x] Build subscription modal component: ✓ 2025-06-22
  - [x] Tier selection (Entry/Premium)
  - [x] Show tier benefits/perks
  - [x] Display monthly price
  - [x] Payment method selection
- [x] Implement subscription creation: ✓ 2025-06-22
  - [x] Call subscribe API endpoint
  - [x] Handle loading states
  - [x] Show success confirmation
  - [x] Handle errors gracefully
- [ ] Add payment method handling:
  - [ ] Use existing Stripe payment element
  - [ ] Support saved payment methods
  - [ ] Add new payment method option

### 3.3 Build Subscription Management
- [x] Create `/dashboard/user/subscriptions` page: ✓ 2025-06-22
  - [x] List all active stream subscriptions
  - [x] Show subscription details (tier, price, next billing)
  - [x] Add "Change Tier" button
  - [x] Add "Cancel Subscription" button
- [x] Implement tier change flow: ✓ 2025-06-22
  - [x] Show upgrade/downgrade options
  - [x] Display proration preview
  - [x] Confirm change
  - [x] Update subscription
- [x] Implement cancellation flow: ✓ 2025-06-22
  - [x] Confirm cancellation dialog
  - [x] Show access end date
  - [x] Process cancellation
  - [x] Update UI state

### 3.4 Add Dashboard Integration
- [ ] Add to user dashboard (`/dashboard/user`):
  - [ ] "Your Stream Subscriptions" widget
  - [ ] Show 3-5 most recent subscriptions
  - [ ] Quick links to streams
  - [ ] "Manage All" link
- [ ] Add subscription notifications:
  - [ ] Upcoming renewal reminder
  - [ ] Payment failure notice
  - [ ] Successful subscription notice

## Phase 4: Content Access Control

### 4.1 Implement Post Locking
- [x] Update post display components: ✓ 2025-06-22
  - [x] Check user's subscription tier
  - [x] Compare with post tier requirement
  - [x] Show/hide content based on access
- [x] Create locked content UI: ✓ 2025-06-22
  - [x] Blur effect for locked images/videos
  - [x] Lock icon overlay
  - [x] "Subscribe to view" message
  - [x] Show required tier
- [x] Handle teaser content: ✓ 2025-06-22
  - [x] Display teaser text for locked posts
  - [x] Show preview character limit
  - [x] Add "Read more" prompt

### 4.2 Create Subscription Feed
- [ ] Add subscribed content filter:
  - [ ] Filter posts by subscribed streams
  - [ ] Sort by most recent
  - [ ] Include all accessible tiers
- [ ] OR Create dedicated feed page:
  - [ ] `/dashboard/user/stream-feed`
  - [ ] Aggregate posts from all subscriptions
  - [ ] Mark read/unread posts
  - [ ] Infinite scroll

## Phase 5: Testing & Integration

### 5.1 Stripe Integration Testing
- [ ] Test subscription creation flow:
  - [ ] Successful subscription
  - [ ] Failed payment
  - [ ] Insufficient funds
  - [ ] Invalid card
- [ ] Test subscription lifecycle:
  - [ ] Renewal payments
  - [ ] Failed renewal handling
  - [ ] Cancellation processing
  - [ ] Reactivation
- [ ] Test tier changes:
  - [ ] Upgrade with proration
  - [ ] Downgrade with credits
  - [ ] Immediate vs. end of period

### 5.2 Financial Integration
- [ ] Add stream revenue to practitioner financials:
  - [ ] Include in total earnings
  - [ ] Separate stream vs. service revenue
  - [ ] Add to payout calculations
- [ ] Update financial reports:
  - [ ] Add stream subscription line items
  - [ ] Show platform fees
  - [ ] Calculate net payouts

### 5.3 End-to-End Testing
- [ ] Complete practitioner flow:
  - [ ] Create stream
  - [ ] Set pricing
  - [ ] Create posts
  - [ ] View analytics
- [ ] Complete user flow:
  - [ ] Discover streams
  - [ ] Subscribe to stream
  - [ ] Access content
  - [ ] Manage subscription
- [ ] Test edge cases:
  - [ ] Multiple subscriptions
  - [ ] Subscription conflicts
  - [ ] Payment method changes

## Phase 6: Launch Preparation

### 6.1 UI/UX Polish
- [ ] Add loading states everywhere
- [ ] Add error handling and messages
- [ ] Ensure mobile responsiveness
- [ ] Add empty states
- [ ] Implement success notifications

### 6.2 Documentation
- [ ] Create practitioner guide:
  - [ ] How to set pricing
  - [ ] Understanding analytics
  - [ ] Best practices
- [ ] Create user guide:
  - [ ] How to subscribe
  - [ ] Managing subscriptions
  - [ ] Understanding tiers
- [ ] Update help center

### 6.3 Monitoring & Analytics
- [ ] Set up error tracking for streams
- [ ] Add analytics events:
  - [ ] Subscription created
  - [ ] Subscription cancelled
  - [ ] Tier changed
  - [ ] Content viewed
- [ ] Create admin dashboard:
  - [ ] Total streams
  - [ ] Total subscribers
  - [ ] Platform revenue
  - [ ] Growth metrics

### 6.4 Soft Launch
- [ ] Enable for beta practitioners
- [ ] Monitor webhook logs
- [ ] Track error rates
- [ ] Gather feedback
- [ ] Fix critical issues
- [ ] Plan full rollout

## Quick Start Checklist

**Today's Tasks:**
1. [ ] Run database migrations
2. [ ] Update Stripe webhook handler
3. [ ] Create pricing API endpoint
4. [ ] Add pricing form to practitioner dashboard

**This Week:**
- [ ] Complete Phase 1 (Backend Infrastructure)
- [ ] Start Phase 2 (Practitioner Dashboard)

**Next Week:**
- [ ] Complete Phase 2
- [ ] Start Phase 3 (User Experience)

---

**Notes:**
- Mark tasks with ✓ when complete
- Add dates completed for tracking
- Note any blockers or issues
- Update estimates as needed