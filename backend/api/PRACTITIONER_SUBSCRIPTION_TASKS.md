# Practitioner Subscription System Implementation Tasks

## Overview
Build out the practitioner subscription system to enable tiered platform access with feature restrictions and commission adjustments.

## Priority 1: Core Subscription API (High)

### 1.1 Create Practitioner Subscription Schemas ✅
- [x] **File**: `api/v1/schemas/practitioner_subscriptions.py`
- [x] Create schemas for:
  - `SubscriptionTierResponse` - Available subscription tiers
  - `PractitionerSubscriptionCreate` - Create/upgrade subscription
  - `PractitionerSubscriptionResponse` - Current subscription details
  - `PractitionerSubscriptionUpdate` - Change subscription settings
  - `SubscriptionAnalytics` - Usage and billing analytics

### 1.2 Create Subscription Router ✅
- [x] **File**: `api/v1/routers/practitioner_subscriptions.py`
- [x] Endpoints implemented:
  ```python
  GET /api/v1/practitioner-subscriptions/tiers
  GET /api/v1/practitioner-subscriptions/current
  POST /api/v1/practitioner-subscriptions/
  PATCH /api/v1/practitioner-subscriptions/current
  DELETE /api/v1/practitioner-subscriptions/current
  POST /api/v1/practitioner-subscriptions/upgrade
  GET /api/v1/practitioner-subscriptions/usage
  GET /api/v1/practitioner-subscriptions/invoices
  GET /api/v1/practitioner-subscriptions/commission-rates
  ```

### 1.3 Integrate with Main API ✅
- [x] **File**: `api/main.py`
- [x] Add router registration:
  ```python
  app.include_router(
      practitioner_subscriptions.router, 
      prefix="/api/v1/practitioner-subscriptions", 
      tags=["Practitioner Subscriptions"]
  )
  ```

## Priority 2: Tier-Based Permission System (High)

### 2.1 Create Permission Dependencies ✅
- [x] **File**: `api/v1/permissions.py`
- [x] Add functions:
  ```python
  async def get_practitioner_subscription(practitioner: Practitioner)
  async def require_subscription_tier(minimum_tier: str)
  async def check_feature_access(feature: str, practitioner: Practitioner)
  async def require_analytics(practitioner: Practitioner)
  async def require_priority_support(practitioner: Practitioner)
  async def check_service_limit(practitioner: Practitioner)
  async def check_booking_limit(practitioner: Practitioner)
  ```

### 2.2 Create Feature Gate System ✅
- [x] **File**: `api/v1/permissions.py`
- [x] Define tier limits in subscription features:
  ```python
  # Features are defined in the database SubscriptionTier.features
  {
      'max_services': 2-unlimited,
      'analytics': true/false,
      'advanced_scheduling': true/false,
      'video_rooms': true/false,
      'commission_discount': 0-10%
  }
  ```

### 2.3 Apply Feature Gates to Existing APIs ✅
- [x] **Services API**: Limit service creation based on tier
- [x] **Analytics API**: Restrict access based on tier
- [ ] **Rooms API**: Limit video room features
- [ ] **Messaging API**: Apply messaging restrictions
- [ ] **Media API**: Apply upload limits

## Priority 3: Stripe Integration (Medium)

### 3.1 Subscription Billing
- [ ] **File**: `integrations/stripe/practitioner_subscriptions.py`
- [ ] Implement:
  ```python
  async def create_practitioner_subscription(practitioner, tier, payment_method)
  async def update_practitioner_subscription(subscription_id, new_tier)
  async def cancel_practitioner_subscription(subscription_id)
  ```

### 3.2 Webhook Handling
- [ ] **File**: `integrations/stripe/webhooks.py`
- [ ] Add webhook handlers:
  ```python
  @webhook_handler('customer.subscription.updated')
  async def handle_practitioner_subscription_updated(event)
  
  @webhook_handler('customer.subscription.deleted')
  async def handle_practitioner_subscription_cancelled(event)
  
  @webhook_handler('invoice.payment_failed')
  async def handle_practitioner_payment_failed(event)
  ```

## Priority 4: Onboarding Integration (Medium)

### 4.1 Update Practitioner Models
- [ ] **File**: `practitioners/models.py`
- [ ] Add fields:
  ```python
  subscription_tier = models.CharField(max_length=20, default='free')
  subscription_status = models.CharField(max_length=20, default='active')
  subscription_setup_completed = models.BooleanField(default=False)
  ```

### 4.2 Update Onboarding Flow
- [ ] **File**: `api/v1/routers/practitioners.py`
- [ ] Add subscription step to onboarding
- [ ] Make subscription selection required for activation

### 4.3 Default Free Tier
- [ ] Auto-assign free tier on practitioner creation
- [ ] Allow immediate access to free tier features
- [ ] Prompt for upgrade during onboarding

## Priority 5: Feature Enforcement (Medium)

### 5.1 Service Creation Limits
- [ ] **File**: `api/v1/routers/services.py`
- [ ] Add validation:
  ```python
  @router.post("/", dependencies=[Depends(check_service_creation_limit)])
  async def create_service(...)
  ```

### 5.2 Analytics Access Control
- [ ] **File**: `api/v1/routers/analytics.py`
- [ ] Add tier checking:
  ```python
  @router.get("/", dependencies=[Depends(require_subscription_tier("entry"))])
  async def get_analytics(...)
  ```

### 5.3 Advanced Features
- [ ] **Video Rooms**: Restrict based on tier
- [ ] **Bulk Operations**: Premium-only features
- [ ] **Advanced Scheduling**: Entry tier and above
- [ ] **Custom Branding**: Premium tier only

## Priority 6: Admin & Management (Low)

### 6.1 Admin Dashboard Integration
- [ ] **File**: `api/v1/routers/admin.py`
- [ ] Add practitioner subscription management:
  ```python
  GET /api/v1/admin/practitioner-subscriptions
  POST /api/v1/admin/practitioner-subscriptions/{id}/upgrade
  POST /api/v1/admin/practitioner-subscriptions/{id}/downgrade
  ```

### 6.2 Subscription Analytics
- [ ] Track subscription conversions
- [ ] Monitor tier usage patterns
- [ ] Revenue reporting by tier

### 6.3 Marketing Features
- [ ] Free trial management
- [ ] Promotional pricing
- [ ] Tier comparison widgets

## Technical Implementation Details

### Database Changes Required
```sql
-- Ensure subscription tiers exist
INSERT INTO subscription_tiers (name, monthly_price, features) VALUES
('Free', 0.00, '["2 services", "Basic support"]'),
('Entry', 29.99, '["20 services", "Analytics", "Priority support"]'),
('Premium', 99.99, '["Unlimited services", "Advanced analytics", "Custom branding"]');

-- Update practitioner subscriptions
UPDATE practitioner_subscriptions 
SET tier_id = (SELECT id FROM subscription_tiers WHERE name = 'Free')
WHERE tier_id IS NULL;
```

### Permission Integration Example
```python
# Before: Anyone can create unlimited services
@router.post("/services")
async def create_service(service_data: ServiceCreate, practitioner: Practitioner = Depends(get_current_practitioner)):
    service = Service.objects.create(...)

# After: Tier-based service limits
@router.post("/services", dependencies=[Depends(check_service_creation_limit)])
async def create_service(service_data: ServiceCreate, practitioner: Practitioner = Depends(get_current_practitioner)):
    service = Service.objects.create(...)
```

### Feature Gate Example
```python
async def check_service_creation_limit(practitioner: Practitioner = Depends(get_current_practitioner)):
    subscription = await get_practitioner_subscription(practitioner)
    tier_limits = TIER_LIMITS[subscription.tier.name.lower()]
    
    if tier_limits['max_services'] != -1:  # Not unlimited
        current_count = Service.objects.filter(practitioner=practitioner).count()
        if current_count >= tier_limits['max_services']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Service limit reached for {subscription.tier.name} tier. Upgrade to create more services."
            )
```

## Testing Requirements

### Unit Tests
- [ ] Test tier-based permission decorators
- [ ] Test feature gate enforcement
- [ ] Test subscription creation/updates
- [ ] Test commission calculations

### Integration Tests
- [ ] Test subscription webhook handling
- [ ] Test onboarding flow with subscription
- [ ] Test feature restriction enforcement
- [ ] Test subscription billing cycles

### End-to-End Tests
- [ ] Complete practitioner signup with subscription
- [ ] Service creation hitting tier limits
- [ ] Subscription upgrade/downgrade flows
- [ ] Payment failure handling

## Documentation Updates

### API Documentation
- [ ] Update OpenAPI schemas for new endpoints
- [ ] Add subscription flow examples
- [ ] Document tier-based restrictions

### Developer Documentation
- [ ] Create practitioner subscription guide
- [ ] Document feature gate system
- [ ] Add integration examples

### User Documentation
- [ ] Subscription tier comparison
- [ ] Upgrade/downgrade guides
- [ ] Feature availability matrix

## Success Metrics

### Technical Metrics
- [ ] All endpoints respect tier restrictions
- [ ] Subscription billing works correctly
- [ ] Feature gates prevent unauthorized access
- [ ] Commission calculations include tier adjustments

### Business Metrics
- [ ] Track subscription conversion rates
- [ ] Monitor tier distribution
- [ ] Measure feature usage by tier
- [ ] Calculate revenue per tier

This implementation will create a robust, scalable practitioner subscription system that integrates seamlessly with the existing marketplace architecture while providing clear upgrade paths and feature differentiation.