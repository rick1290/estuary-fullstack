# Payment Flows Implementation Tasks

## 1. Service Purchase Flow (User → Platform)
- [ ] Test complete service purchase flow
  - [ ] Create order via API
  - [ ] Process payment via Stripe
  - [ ] Verify webhook creates booking
  - [ ] Verify credit transaction is created
  - [ ] Verify credits are deducted from user
  - [ ] Verify practitioner earnings are recorded
  - [ ] Test commission calculation based on tier

## 2. Practitioner Platform Subscriptions (Practitioner → Platform)
- [ ] Create Stripe products for practitioner tiers
  - [ ] Free Tier product (no payment required)
  - [ ] Entry Tier product ($29/month)
  - [ ] Premium Tier product ($99/month)
- [ ] Store Stripe price IDs in database/settings
- [ ] Test practitioner subscription signup flow
  - [ ] Create subscription via API
  - [ ] Process payment via Stripe
  - [ ] Verify webhook updates PractitionerSubscription
  - [ ] Verify commission rates are applied correctly
- [ ] Test subscription lifecycle
  - [ ] Upgrade/downgrade between tiers
  - [ ] Cancellation flow
  - [ ] Payment failure handling
  - [ ] Grace period implementation

## 3. Stream Content Subscriptions (Fan → Practitioner)
- [ ] Design subscription product creation flow
  - [ ] How practitioners create their own subscription tiers
  - [ ] Dynamic Stripe product/price creation
  - [ ] Store product/price mappings
- [ ] Implement practitioner subscription management
  - [ ] API endpoint for practitioners to create/edit tiers
  - [ ] Set custom pricing and names
  - [ ] Define tier benefits/access levels
- [ ] Test fan subscription flow
  - [ ] Subscribe to practitioner's stream
  - [ ] Access control based on subscription tier
  - [ ] Recurring billing verification

## 4. Stripe Connect Implementation
- [ ] Implement practitioner onboarding to Stripe Connect
  - [ ] Create Connect onboarding API endpoint
  - [ ] Generate onboarding links
  - [ ] Handle onboarding completion webhook
  - [ ] Store Connect account IDs
- [ ] Test Connect account functionality
  - [ ] Verify account status
  - [ ] Check payout capabilities
  - [ ] Handle account verification requirements
- [ ] Implement dashboard links
  - [ ] Generate Express dashboard links
  - [ ] Provide access to Stripe reports

## 5. Payout System via Temporal
- [ ] Create payout calculation workflow
  - [ ] Calculate practitioner earnings
  - [ ] Apply platform fees/commissions
  - [ ] Handle minimum payout thresholds
- [ ] Implement Temporal payout workflow
  - [ ] Weekly payout schedule
  - [ ] Batch payout processing
  - [ ] Error handling and retries
- [ ] Test payout flow
  - [ ] Trigger manual payout
  - [ ] Verify Stripe Connect transfer
  - [ ] Update earning records
  - [ ] Send payout notifications

## 6. Financial Reporting & Analytics
- [ ] Implement earnings dashboard API
  - [ ] Daily/weekly/monthly earnings
  - [ ] Commission breakdowns
  - [ ] Pending vs paid earnings
- [ ] Create financial reports
  - [ ] Transaction history
  - [ ] Tax documentation support
  - [ ] Export capabilities

## 7. Testing & Validation
- [ ] Create comprehensive test suite
  - [ ] Unit tests for calculations
  - [ ] Integration tests for workflows
  - [ ] End-to-end payment scenarios
- [ ] Test edge cases
  - [ ] Refunds and disputes
  - [ ] Failed payments
  - [ ] Subscription changes mid-cycle
  - [ ] Currency conversions

## 8. Documentation
- [ ] API documentation for payment endpoints
- [ ] Webhook event documentation
- [ ] Integration guide for frontend
- [ ] Practitioner onboarding guide

## Implementation Order
1. Start with practitioner platform subscriptions (foundational)
2. Implement service purchase flow
3. Set up Stripe Connect
4. Build payout system
5. Add stream subscriptions
6. Complete reporting and analytics

## Current Status
- ✅ Webhook infrastructure in place
- ✅ Basic models created
- ⏳ Ready to start with practitioner subscriptions

## Next Steps
1. Create Stripe products for practitioner tiers
2. Test the subscription signup flow
3. Implement commission calculations