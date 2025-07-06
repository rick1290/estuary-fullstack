# Service Layer Refactoring - Views to Update

## Overview
These views in the payments app contain business logic that should be moved to service classes for better organization, reusability, and testability.

## Views Needing Refactoring

### 1. **Credit Transfer** (`/payments/api/v1/views.py` - line 411)
**Current Issues:**
- Direct transaction creation in view
- Business logic mixed with API handling
- No reusable transfer logic

**Refactor to:** `CreditService.transfer_credits()` (already exists)

**Implementation:**
```python
# Current code creates transactions directly
# Should use: credit_service.transfer_credits(from_user, to_user, amount, reason)
```

### 2. **Payout Request** (`/payments/api/v1/views.py` - line 536)
**Current Issues:**
- Complex payout logic in view
- Direct model manipulation
- Business rules mixed with API logic

**Refactor to:** New `PayoutService`

**Methods needed:**
- `check_payout_eligibility(practitioner)`
- `create_payout_request(practitioner, amount, notes)`
- `process_payout_batch(transactions)`

### 3. **Webhook Handlers** (`/payments/api/v1/views.py` - lines 978+)
**Current Issues:**
- Multiple handlers with business logic
- Direct model updates
- Scattered payment processing logic

**Refactor to:** `WebhookService` or enhance existing services

**Methods needed:**
- `handle_payment_success(payment_intent)`
- `handle_payment_failure(payment_intent)`
- `handle_subscription_created(subscription)`
- `handle_refund_created(refund)`

### 4. **Checkout Session Creation** (`/payments/api/v1/views.py` - line 171)
**Current Issues:**
- Complex Stripe session creation logic
- Different paths for services, credits, subscriptions
- Direct Stripe API calls in view

**Refactor to:** `CheckoutService`

**Methods needed:**
- `create_service_checkout_session(service, user, success_url, cancel_url)`
- `create_credit_checkout_session(amount, user, success_url, cancel_url)`
- `create_subscription_checkout_session(tier, user, is_annual, success_url, cancel_url)`

### 5. **Subscription Management** (`/payments/api/v1/views.py` - SubscriptionViewSet)
**Current Issues:**
- Stripe subscription logic in views
- Payment confirmation handling
- Cancellation logic

**Refactor to:** `SubscriptionService`

**Methods needed:**
- `create_subscription(practitioner, tier, payment_method)`
- `confirm_subscription_payment(subscription, payment_intent)`
- `cancel_subscription(subscription, reason)`
- `update_subscription_tier(subscription, new_tier)`

## Implementation Priority

1. **High Priority:**
   - Credit Transfer (already have service method)
   - Webhook Handlers (critical for payment reliability)

2. **Medium Priority:**
   - Payout Request (complex business logic)
   - Subscription Management

3. **Lower Priority:**
   - Checkout Session Creation (working but could be cleaner)

## Benefits of Refactoring

1. **Reusability:** Services can be used in management commands, celery tasks, and other views
2. **Testability:** Easier to unit test business logic without HTTP layer
3. **Maintainability:** Clear separation of concerns
4. **Consistency:** All payment logic follows same patterns

## Example Refactoring

### Before (Credit Transfer):
```python
def transfer(self, request):
    # Validation...
    with transaction.atomic():
        UserCreditTransaction.objects.create(
            user=request.user,
            amount_cents=-int(amount * 100),
            transaction_type='transfer',
            # ... more fields
        )
        UserCreditTransaction.objects.create(
            user=recipient,
            amount_cents=int(amount * 100),
            transaction_type='transfer',
            # ... more fields
        )
```

### After:
```python
def transfer(self, request):
    # Validation...
    try:
        debit_tx, credit_tx = self.credit_service.transfer_credits(
            from_user=request.user,
            to_user=recipient,
            amount_cents=int(amount * 100),
            reason=description
        )
        return Response({
            'status': 'success',
            'transaction_id': str(credit_tx.id)
        })
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
```

## Next Steps

1. Create missing service classes
2. Move business logic from views to services
3. Update views to use services
4. Add comprehensive tests for services
5. Update documentation