# Practitioner Subscription Setup Guide

## Overview
The practitioner subscription system uses Stripe for billing and includes webhook integration with Temporal workflows for lifecycle management.

## Initial Setup

### 1. Create Subscription Tiers in Database
```bash
python manage.py setup_commission_system
```

This creates:
- Basic ($29.99/mo, $299.90/yr)
- Professional ($79.99/mo, $799.90/yr)
- Premium ($149.99/mo, $1499.90/yr)

### 2. Create Stripe Products and Prices

#### Option A: Automatic Creation
```bash
python manage.py sync_stripe_subscriptions --create-stripe-products
```

This will:
1. Create products in Stripe for each tier
2. Create monthly and annual prices
3. Save the IDs to the database
4. Display environment variables to add to your `.env`

#### Option B: Manual Creation
1. Create products in Stripe Dashboard
2. Add the IDs to your `.env` file:
```env
STRIPE_BASIC_PRODUCT_ID=prod_xxx
STRIPE_BASIC_MONTHLY_PRICE_ID=price_xxx
STRIPE_BASIC_ANNUAL_PRICE_ID=price_xxx

STRIPE_PROFESSIONAL_PRODUCT_ID=prod_xxx
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_xxx
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=price_xxx

STRIPE_PREMIUM_PRODUCT_ID=prod_xxx
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxx
STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_xxx
```

3. Sync the IDs to the database:
```bash
python manage.py sync_stripe_subscriptions --use-env-ids
```

### 3. Configure Stripe Webhooks

1. In Stripe Dashboard, add webhook endpoint:
   - URL: `https://your-domain.com/webhooks/stripe/`
   - Events to listen for:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

2. Add webhook secret to `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 4. Start Temporal Workers

```bash
# Start subscription workflow worker
python manage.py start_temporal_worker --task-queue subscriptions

# Or start all workers
python manage.py start_all_workers
```

## API Endpoints

### List Available Tiers
```http
GET /api/v1/practitioner-subscriptions/tiers
```

### Get Current Subscription
```http
GET /api/v1/practitioner-subscriptions/current
Authorization: Bearer <jwt-token>
```

### Create Subscription
```http
POST /api/v1/practitioner-subscriptions/
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
    "tier_id": "uuid-of-tier",
    "is_annual": false,
    "payment_method_id": "pm_xxx"
}
```

### Upgrade/Downgrade
```http
POST /api/v1/practitioner-subscriptions/upgrade
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
    "new_tier_id": "uuid-of-new-tier",
    "is_annual": true,
    "prorate": true
}
```

### Cancel Subscription
```http
DELETE /api/v1/practitioner-subscriptions/current?reason=too-expensive
Authorization: Bearer <jwt-token>
```

### Check Usage
```http
GET /api/v1/practitioner-subscriptions/usage
Authorization: Bearer <jwt-token>
```

Response shows current usage vs limits:
```json
{
    "services_used": 3,
    "services_limit": 5,
    "services_remaining": 2,
    "has_analytics": false,
    "effective_commission_rate": 15.0
}
```

## Feature Gates

### In Code
```python
# Require analytics access
from api.v1.permissions import require_analytics

@router.get("/analytics")
async def get_analytics(
    practitioner: Practitioner = Depends(require_analytics)
):
    # Only accessible to Professional+ tiers
    pass

# Check service creation limit
from api.v1.permissions import check_service_limit

@router.post("/services")
async def create_service(
    practitioner: Practitioner = Depends(check_service_limit)
):
    # Enforces tier-based service limits
    pass
```

### Feature Matrix

| Feature | Basic | Professional | Premium |
|---------|-------|--------------|---------|
| Services | 5 | 20 | Unlimited |
| Analytics | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |
| Video Rooms | ✅ | ✅ | ✅ |
| Advanced Scheduling | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ |
| Locations | 1 | 3 | Unlimited |
| Monthly Bookings | 50 | 200 | Unlimited |
| Commission Discount | 0% | 5% | 10% |

## Testing

### Create Test Subscription
```python
# In Django shell
from payments.models import SubscriptionTier, PractitionerSubscription
from practitioners.models import Practitioner

practitioner = Practitioner.objects.first()
tier = SubscriptionTier.objects.get(name="Professional")

subscription = PractitionerSubscription.objects.create(
    practitioner=practitioner,
    tier=tier,
    status='active',
    stripe_subscription_id='sub_test123'
)
```

### Test Webhook
```bash
# Using Stripe CLI
stripe trigger customer.subscription.created \
  --add customer:email=test@example.com \
  --add subscription:metadata.practitioner_id=<practitioner-uuid> \
  --add subscription:metadata.tier_id=<tier-uuid>
```

## Troubleshooting

### Common Issues

1. **Subscription creation fails**
   - Check Stripe API keys in settings
   - Ensure payment method is valid
   - Check practitioner has payment profile

2. **Webhooks not received**
   - Verify webhook secret is correct
   - Check webhook endpoint is accessible
   - Review Stripe webhook logs

3. **Feature gates not working**
   - Ensure subscription status is 'active'
   - Check tier features are configured
   - Clear any caches

### Debug Commands
```bash
# Check current setup
python manage.py sync_stripe_subscriptions

# List all subscriptions
python manage.py shell
>>> from payments.models import PractitionerSubscription
>>> PractitionerSubscription.objects.all().values('practitioner__user__email', 'tier__name', 'status')
```