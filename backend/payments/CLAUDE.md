# Payments App Documentation

## Overview
The payments app handles all financial transactions in the Estuary marketplace, including payment processing, credit management, earnings tracking, and practitioner payouts. This document focuses on how payments work for each service type.

## Payment Flow by Service Type

### 1. Sessions (One-on-One)
**Flow**: User selects timeslot → Payment → Immediate booking confirmation

```python
# Frontend sends:
{
    "service_id": "uuid",
    "payment_method_id": 123,
    "start_time": "2024-01-20T10:00:00Z",
    "end_time": "2024-01-20T11:00:00Z",
    "timezone": "America/Los_Angeles",
    "apply_credits": true,
    "special_requests": "Please focus on lower back"
}

# Backend creates:
- Order record with payment intent
- Booking with specific timeslot
- UserCreditTransaction (if credits used)
- EarningsTransaction for practitioner
```

**Key Points**:
- Requires `start_time` and `end_time`
- Creates single booking with scheduled time
- Practitioner availability is validated
- Immediate confirmation sent to both parties

### 2. Workshops (Group Sessions)
**Flow**: User selects workshop date → Payment → Registration in service session

```python
# Frontend sends:
{
    "service_id": "uuid",
    "payment_method_id": 123,
    "service_session_id": "session-uuid",  # Specific workshop session
    "apply_credits": true,
    "special_requests": "First time attending"
}

# Backend creates:
- Order record
- Booking linked to ServiceSession
- Increments session participant count
- Validates max_participants limit
```

**Key Points**:
- Requires `service_session_id` for specific workshop date
- Booking inherits time from ServiceSession
- Participant count tracking
- Cannot exceed workshop capacity

### 3. Courses (Multi-Session Programs)
**Flow**: User enrolls → Payment → Access to all course sessions

```python
# Frontend sends:
{
    "service_id": "uuid",
    "payment_method_id": 123,
    "apply_credits": true,
    "special_requests": "Excited to start!"
}

# Backend process:
- Uses BookingFactory.create_course_booking()
- Creates parent booking for course enrollment
- Registers user for all course sessions
- No specific time selection needed
```

**Key Points**:
- No time selection required (predetermined schedule)
- Single payment for entire course
- Automatic enrollment in all sessions
- Progress tracking capabilities

### 4. Packages (Service Bundles with Savings)
**Flow**: User purchases package → Payment → Unscheduled bookings created

```python
# Frontend sends:
{
    "service_id": "uuid",
    "payment_method_id": 123,
    "start_time": "2024-01-20T10:00:00Z",  # Optional: first session
    "end_time": "2024-01-20T11:00:00Z",
    "apply_credits": true
}

# Backend process:
- Uses BookingFactory.create_package_booking()
- Creates parent booking (package purchase)
- Creates child bookings for each included service
- Child bookings start as 'draft' status
- If start_time provided, schedules first child booking
```

**Key Points**:
- Creates placeholder bookings for future scheduling
- User schedules individual sessions later via dashboard
- Package savings tracked in parent booking
- Expiration handling if applicable

### 5. Bundles (Credit Packages)
**Flow**: User buys credits → Payment → Credit balance for future use

```python
# Frontend sends:
{
    "service_id": "uuid",
    "payment_method_id": 123,
    "start_time": "2024-01-20T10:00:00Z",  # Optional: first session
    "end_time": "2024-01-20T11:00:00Z",
    "apply_credits": true
}

# Backend process:
- Uses BookingFactory.create_bundle_booking()
- Creates bundle purchase record
- Adds credits to user's balance
- If start_time provided, creates first scheduled booking
- Remaining sessions created as needed
```

**Key Points**:
- Primarily a credit purchase mechanism
- Optional immediate booking of first session
- Credits can be used across different services
- Bulk discount pricing

## Payment Processing Flow

### 1. Payment Method Selection
```python
# User's saved payment methods retrieved
payment_methods = PaymentMethod.objects.filter(user=user, is_active=True)

# Frontend displays cards with:
- Brand and last 4 digits
- Default card marked
- Expiration status
```

### 2. Price Calculation
```python
# Base flow for all service types:
service_price = service.price_cents
credits_available = user.credit_balance.balance_cents

# If applying credits:
credits_to_apply = min(credits_available, service_price)
amount_to_charge = service_price - credits_to_apply

# Create Stripe payment intent:
if amount_to_charge > 0:
    payment_intent = stripe.PaymentIntent.create(
        amount=amount_to_charge,
        currency='usd',
        customer=user.stripe_customer_id,
        payment_method=payment_method.stripe_payment_method_id,
        confirm=True,
        payment_method_types=['card']
    )
```

### 3. Order Creation
```python
# Order tracks the financial transaction
order = Order.objects.create(
    user=user,
    service=service,
    practitioner=service.primary_practitioner,
    payment_method=payment_method,
    stripe_payment_intent_id=payment_intent.id,
    subtotal_amount_cents=service_price,
    credits_applied_cents=credits_to_apply,
    total_amount_cents=amount_to_charge,
    status='completed'
)
```

### 4. Credit Management
```python
# If credits were applied:
if credits_to_apply > 0:
    UserCreditTransaction.objects.create(
        user=user,
        amount_cents=-credits_to_apply,  # Negative for debit
        transaction_type='usage',
        service=service,
        booking=booking,
        order=order
    )
    # Balance automatically updated via signal
```

### 5. Earnings Creation
```python
# Calculate practitioner earnings
commission_rate = commission_calculator.get_commission_rate()
commission_amount = int(service_price * commission_rate / 100)
net_earnings = service_price - commission_amount

# Create earnings record
EarningsTransaction.objects.create(
    practitioner=practitioner,
    booking=booking,
    gross_amount_cents=service_price,
    commission_rate=commission_rate,
    commission_amount_cents=commission_amount,
    net_amount_cents=net_earnings,
    status='pending',
    available_after=timezone.now() + timedelta(hours=48)
)
```

## Error Handling

### Common Validation Errors
1. **Insufficient Credits**: 
   - Check: `user.credit_balance.balance_cents >= amount_needed`
   - Error: "Insufficient credit balance"

2. **Invalid Payment Method**:
   - Check: Payment method belongs to user and is active
   - Error: "Invalid payment method"

3. **Service Type Mismatch**:
   - Sessions require time slots
   - Workshops require service session ID
   - Error: "Start time and end time are required for session bookings"

4. **Booking Conflicts**:
   - Check practitioner availability
   - Check workshop capacity
   - Error: "This time slot is no longer available"

### Payment Failures
```python
try:
    # Process payment
    payment_intent = stripe.PaymentIntent.create(...)
except stripe.error.CardError as e:
    # Handle card errors (insufficient funds, etc.)
    return Response({
        "status": "error",
        "message": str(e.user_message)
    }, status=400)
except Exception as e:
    # Log error and return generic message
    logger.error(f"Payment processing error: {str(e)}")
    return Response({
        "status": "error", 
        "message": "Payment processing failed"
    }, status=500)
```

## Testing Payment Flows

### Test Card Numbers (Stripe Test Mode)
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Insufficient funds: `4000 0000 0000 9995`

### Test Scenarios by Service Type

1. **Session Booking**:
   ```bash
   # Ensure practitioner has availability
   # Select future time slot
   # Verify booking appears in both dashboards
   ```

2. **Workshop Registration**:
   ```bash
   # Create workshop with available spots
   # Register multiple users
   # Verify capacity enforcement
   ```

3. **Course Enrollment**:
   ```bash
   # Create course with multiple sessions
   # Enroll user
   # Verify access to all sessions
   ```

4. **Package Purchase**:
   ```bash
   # Buy package
   # Schedule individual sessions
   # Track usage and expiration
   ```

5. **Bundle Purchase**:
   ```bash
   # Buy bundle
   # Use credits across different services
   # Verify credit balance updates
   ```

## Commission Structure

### Base Rates by Service Type
- Sessions: 15%
- Workshops: 20%
- Courses: 20%
- Packages: 15%
- Bundles: 10%

### Tier Adjustments
- Standard: 0% adjustment
- Silver: -2% adjustment
- Gold: -5% adjustment
- Platinum: -7% adjustment

### Example Calculation
```python
# $100 session with Gold tier practitioner
base_rate = 15%  # Session base rate
tier_adjustment = -5%  # Gold tier discount
final_rate = 10%

gross = $100
commission = $10
practitioner_net = $90
```

## Security Considerations

1. **Payment Method Validation**:
   - Always verify payment method belongs to authenticated user
   - Check payment method is active and not expired

2. **Amount Validation**:
   - Never trust frontend amounts
   - Always calculate prices server-side
   - Validate credit applications

3. **Atomic Transactions**:
   - Use database transactions for multi-step operations
   - Rollback on any failure
   - Maintain data consistency

4. **Audit Trail**:
   - Log all financial transactions
   - Track payment intents and order IDs
   - Monitor for suspicious patterns

## Webhook Handling

The system processes Stripe webhooks for:
- `payment_intent.succeeded` - Mark order as paid
- `payment_intent.payment_failed` - Handle payment failures
- `charge.refunded` - Process refunds
- `customer.subscription.updated` - Update practitioner tiers

## Common Issues and Solutions

1. **"Resource not found" error**:
   - Ensure using `public_uuid` for service lookup
   - Check service exists and is active

2. **"Direct assignment to notes is prohibited"**:
   - Use `client_notes` field instead of `notes`
   - Check BookingFactory parameter names

3. **Commission calculation errors**:
   - Ensure practitioner has subscription tier
   - Check ServiceTypeCommission records exist

4. **Credit balance mismatch**:
   - Run balance recalculation from transactions
   - Check for pending transactions

## Future Enhancements

1. **Subscription Services**:
   - Recurring payments for ongoing services
   - Automated booking creation

2. **Group Payments**:
   - Split payments among multiple users
   - Corporate billing accounts

3. **International Payments**:
   - Multi-currency support
   - Regional pricing

4. **Advanced Credits**:
   - Credit expiration policies
   - Credit sharing/gifting
   - Promotional credit campaigns