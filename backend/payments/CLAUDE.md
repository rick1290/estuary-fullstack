# Payments App

## Overview
The payments app handles all financial transactions in the Estuary marketplace. It manages the flow from user payments through to practitioner payouts, with clear separation between user credits and practitioner earnings.

## Core Concepts

### Money Flow
```
User → Order → Credits → Booking → Service Completion → Earnings → Payout → Practitioner
```

### Currency Convention
**IMPORTANT**: All monetary values are stored as **integers in cents**:
- Database: `10000` = $100.00
- Stripe API: Send cents directly
- Display: Divide by 100 and format

## Key Models

### User Side (Credits)

#### Order
- Represents a purchase transaction
- Tracks payment method, amounts, status
- Links to Stripe payment intent
- Creates UserCreditTransactions on completion

#### UserCreditTransaction
- Records all credit movements (+/-)
- Types: `purchase`, `usage`, `refund`, `bonus`, `transfer`, `expiry`
- Immutable audit trail
- Updates UserCreditBalance automatically

#### UserCreditBalance
- Cached current balance for performance
- One per user
- Recalculated from transactions when needed

### Practitioner Side (Earnings)

#### EarningsTransaction
- Created when services are completed
- Tracks gross amount, commission, net amount
- Has 48-hour hold period before becoming available
- Status flow: `pending` → `available` → `paid`

#### PractitionerEarnings
- Tracks current balances (pending/available)
- Lifetime earnings and payouts
- One per practitioner

#### PractitionerPayout
- Batch payment to practitioner
- Links multiple EarningsTransactions
- Integrates with Stripe Connect
- Status: `pending` → `processing` → `completed`

### Commission System

#### ServiceTypeCommission
- Base commission rates by service type
- Example: Sessions 15%, Workshops 20%

#### SubscriptionTier
- Practitioner subscription levels
- Different tiers get different commission rates

#### TierCommissionAdjustment
- Adjustments to base rates per tier
- Example: Premium tier gets -5% (only 10% commission)

## Money Flow Examples

### Individual Session Purchase
```python
# 1. User purchases credits
order = Order.objects.create(
    user=user,
    subtotal_amount_cents=10000,  # $100
    total_amount_cents=10000,
    payment_method='stripe'
)

# 2. On payment success
UserCreditTransaction.objects.create(
    user=user,
    amount_cents=10000,  # Adding credits
    transaction_type='purchase',
    order=order
)

# 3. User books service (spending credits)
UserCreditTransaction.objects.create(
    user=user,
    amount_cents=-10000,  # Spending credits
    transaction_type='usage',
    booking=booking
)

# 4. Service completed - earnings created
EarningsTransaction.objects.create(
    practitioner=practitioner,
    booking=booking,
    gross_amount_cents=10000,
    commission_rate=15.0,
    commission_amount_cents=1500,
    net_amount_cents=8500,
    status='pending',
    available_after=now + timedelta(hours=48)
)

# 5. After 48 hours - available for payout
transaction.mark_available()

# 6. Weekly payout batch
payout = PractitionerPayout.create_batch_payout(
    practitioner=practitioner,
    transactions=available_transactions
)

# 7. Stripe transfer
stripe.Transfer.create(
    amount=8500,  # cents
    currency='usd',
    destination=practitioner.stripe_account_id
)
```

### Bundle Usage
```python
# User buys 10-class pass for $150
bundle_booking = Booking.objects.create(
    service=yoga_bundle,
    price_charged_cents=15000,
    is_bundle_purchase=True
)

# Each class usage creates proportional earnings
# $150 / 10 classes = $15 per class
EarningsTransaction.objects.create(
    gross_amount_cents=1500,  # $15
    net_amount_cents=1275  # After 15% commission
)
```

### Package Progression
```python
# Package worth $350, completed in parts
# Each service completion triggers partial payout
completion_percentage = 16.67  # 1 of 6 services
earned_cents = int(35000 * 0.1667)  # $58.33

EarningsTransaction.objects.create(
    gross_amount_cents=earned_cents,
    transaction_type='package_partial'
)
```

## Commission Calculation

```python
# Get base rate for service type
base_rate = ServiceTypeCommission.objects.get(
    service_type__code='session'
).base_rate  # 15%

# Apply tier adjustment
tier_adjustment = TierCommissionAdjustment.objects.get(
    tier=practitioner.subscription.tier,
    service_type_commission__service_type__code='session'
).adjustment_percentage  # -5%

# Final commission
final_rate = base_rate + tier_adjustment  # 10%

# Calculate amounts
gross = 10000  # $100
commission = int(gross * final_rate / 100)  # 1000 ($10)
net = gross - commission  # 9000 ($90)
```

## Payout Process

### Automatic Processing (Scheduled Task)
```python
# Find available earnings
available = EarningsTransaction.objects.filter(
    status='pending',
    available_after__lte=now()
)
for transaction in available:
    transaction.mark_available()

# Create weekly payouts
for practitioner in practitioners_with_available_funds:
    if practitioner.earnings_balance.available_balance_cents >= 5000:  # $50 minimum
        PractitionerPayout.create_batch_payout(
            practitioner=practitioner,
            transactions=practitioner.earnings_transactions.filter(status='available')
        )
```

### Manual Payout Request
```python
# Instant payout with higher fee
payout = PractitionerPayout.objects.create(
    practitioner=practitioner,
    credits_payout_cents=available_balance,
    transaction_fee_cents=250,  # $2.50 instant fee
    payment_method='instant'
)
```

## Key Validations

1. **Credit Balance**: Users cannot spend more than they have
2. **Commission Rates**: Must be between 0-100%
3. **Payout Minimums**: Typically $50 to reduce transaction costs
4. **Hold Periods**: 48 hours for dispute protection
5. **Currency Matching**: All transactions in same currency

## Integration Points

- **Stripe**: Payment processing and payouts
- **Bookings**: Triggers earning creation on completion
- **Services**: Determines pricing and commission rates
- **Temporal**: Scheduled payout processing

## Best Practices

1. **Always use cents** for all calculations
2. **Never modify** existing transactions (create adjustments)
3. **Batch payouts** to reduce transaction fees
4. **Hold periods** protect against chargebacks
5. **Audit everything** - financial data needs full history
6. **Test with small amounts** in development
7. **Use database transactions** for atomic operations

## Common Queries

```python
# User's current balance
user.credit_balance.balance_cents

# Practitioner's available funds
practitioner.earnings_balance.available_balance_cents

# This month's earnings
EarningsTransaction.objects.filter(
    practitioner=practitioner,
    created_at__month=current_month
).aggregate(total=Sum('net_amount_cents'))

# Pending payouts
EarningsTransaction.objects.filter(
    practitioner=practitioner,
    status='available'
).aggregate(total=Sum('net_amount_cents'))

# Commission by service type
ServiceTypeCommission.objects.values('service_type__name').annotate(
    total_commission=Sum('earnings_transactions__commission_amount_cents')
)
```

## Error Handling

1. **Insufficient Credits**: Prevent booking creation
2. **Payment Failures**: Reverse any created transactions
3. **Payout Failures**: Mark for retry, notify admin
4. **Commission Calculation**: Default to platform standard if missing

## Security Considerations

1. All amounts are **validated** at model level
2. **Atomic transactions** prevent partial updates
3. **Audit logs** track all changes
4. **Permission checks** on payout actions
5. **Stripe webhooks** verify payment status