# Estuary Marketplace Flow Guide

## Overview
This guide explains the complete flow from service purchase to practitioner payouts in the Estuary marketplace platform.

## Currency Convention
All monetary values are stored as **integers in cents**:
- Database: $100.50 stored as `10050` (cents)
- Stripe API: Use cents value directly
- Display: Divide by 100 and format as currency

---

## Service Types & Structure

### 1. **Individual Session**
- **What**: Single appointment (e.g., 60-min massage)
- **Structure**: Simple Service model
- **Relationships**: None
- **Example**:
  ```python
  Service(
      service_type='session',
      name='60-Minute Therapeutic Massage',
      price_cents=10000,  # $100.00
      duration_minutes=60
  )
  ```

### 2. **Workshop**
- **What**: Group class at specific date/time
- **Structure**: Service + ServiceSession
- **Relationships**: Service has ServiceSessions
- **Example**:
  ```python
  Service(
      service_type='workshop',
      name='Stress Management Workshop',
      price=50.00,
      max_participants=20
  )
  
  ServiceSession(
      service=workshop,
      start_time='2024-02-15 14:00',
      end_time='2024-02-15 16:00',
      max_participants=20
  )
  ```

### 3. **Course**
- **What**: Multi-session program (e.g., 8-week yoga)
- **Structure**: Service + multiple ServiceSessions
- **Relationships**: Service has ServiceSessions
- **Example**:
  ```python
  Service(
      service_type='course',
      name='8-Week Beginner Yoga',
      price=200.00
  )
  
  # 8 ServiceSessions created, one per week
  ServiceSession(
      service=course,
      start_time='2024-02-01 18:00',
      sequence_number=1
  )
  ```

### 4. **Bundle**
- **What**: Bulk purchase of same service (e.g., 10-class pass)
- **Structure**: Service + ServiceRelationship
- **Key Fields**: 
  - `sessions_included`: Number of uses
  - `bonus_sessions`: Extra free sessions
- **Example**:
  ```python
  Service(
      service_type='bundle',
      name='10-Class Yoga Bundle',
      price=150.00,
      sessions_included=10,
      bonus_sessions=2  # Total 12 classes
  )
  
  ServiceRelationship(
      parent_service=bundle,
      child_service=yoga_class,  # The actual class
      quantity=1,
      discount_percentage=25
  )
  ```

### 5. **Package**
- **What**: Mix of different services
- **Structure**: Service + multiple ServiceRelationships
- **Example**:
  ```python
  Service(
      service_type='package',
      name='New Client Wellness Package',
      price=350.00
  )
  
  # Multiple child services
  ServiceRelationship(parent=package, child=consultation, quantity=1)
  ServiceRelationship(parent=package, child=massage, quantity=3)
  ServiceRelationship(parent=package, child=yoga_class, quantity=2)
  ```

---

## Key Concept Clarification

### `sessions_included` vs `child_services` vs `ServiceSession`

1. **`sessions_included`** (Bundle only)
   - Field on Service model
   - Indicates how many times the bundle can be used
   - Example: "10-class pass" has `sessions_included=10`

2. **`child_services`** (via ServiceRelationship)
   - For Packages/Bundles to link to included services
   - Defines WHAT services are included
   - Example: Package includes "3x massage + 2x yoga"

3. **`ServiceSession`**
   - Actual scheduled instances with dates/times
   - For Workshops and Courses that have fixed schedules
   - Example: "Workshop on Feb 15 at 2pm"

### When to Use What:

```
Individual Session:
└── Just Service model

Workshop:
├── Service (the workshop template)
└── ServiceSession (specific scheduled instance)

Course:
├── Service (the course)
└── ServiceSession × 8 (each weekly class)

Bundle:
├── Service (bundle with sessions_included=10)
└── ServiceRelationship → child Service (what you can book)

Package:
├── Service (package)
├── ServiceRelationship → consultation
├── ServiceRelationship → massage (quantity=3)
└── ServiceRelationship → yoga (quantity=2)
```

---

## Complete Purchase-to-Payout Flows

### Flow 1: Individual Session

```
1. Purchase Phase
   ├── User selects service ($100)
   ├── Creates Order
   ├── Processes payment (Stripe)
   └── On success:
       ├── Order.status = 'completed'
       ├── UserCreditTransaction(+10000 cents, type='purchase')
       └── UserCreditBalance += 10000 cents

2. Booking Phase
   ├── User books appointment
   ├── Creates Booking(status='draft')
   ├── User confirms with credits
   ├── UserCreditTransaction(-10000 cents, type='usage')
   ├── UserCreditBalance -= 10000 cents
   └── Booking(status='confirmed', payment_status='paid')

3. Service Delivery
   ├── Practitioner starts: Booking.status = 'in_progress'
   └── Practitioner completes: Booking.status = 'completed'

4. Earnings Creation
   └── EarningsTransaction created:
       ├── gross_amount: 100.00
       ├── commission_rate: 15%
       ├── commission_amount: 15.00
       ├── net_amount: 85.00
       ├── status: 'pending'
       └── available_after: +48 hours

5. Earnings Availability
   └── After 48 hours:
       ├── EarningsTransaction.status = 'available'
       ├── PractitionerEarnings.pending -= 85.00
       └── PractitionerEarnings.available += 85.00

6. Payout Process
   └── Weekly batch:
       ├── Collect all 'available' transactions
       ├── Create PractitionerPayout(85.00)
       ├── Stripe transfer (8500 cents)
       ├── EarningsTransaction.status = 'paid'
       └── PractitionerEarnings.lifetime_payouts += 85.00
```

### Flow 2: Bundle Usage

```
1. Bundle Purchase
   ├── Buy "10-Class Yoga Pass" for $150
   ├── Creates bundle Booking(is_bundle_purchase=true)
   └── No immediate practitioner earnings

2. Each Class Usage
   ├── User books class (no credit charge)
   ├── Links to bundle purchase
   ├── Class value: $15 (150/10)
   └── On completion:
       └── EarningsTransaction(
           gross: 15.00,
           net: 12.75 after 15% commission
       )

3. Bundle Expiry
   └── Unused sessions may generate partial payout
```

### Flow 3: Package Progression

```
1. Package Purchase
   ├── "Wellness Package" for $350
   ├── Creates parent + child bookings
   └── PackageCompletionRecord tracks progress

2. Progressive Completion
   ├── Service 1 complete (1/6 = 16.67%)
   ├── Earnings: 16.67% × $350 = $58.33
   ├── Net after commission: $49.58
   └── Repeat for each service

3. Final Reconciliation
   └── All services complete = 100% payout
```

---

## Database Models Reference

### User Credit System
```python
UserCreditBalance:
  - user: OneToOne
  - balance: Decimal (current balance)
  - last_transaction: FK

UserCreditTransaction:
  - user: FK
  - amount: Decimal (+/- credits)
  - transaction_type: purchase|usage|refund|bonus|transfer|expiry
  - booking: FK (optional)
```

### Practitioner Earnings System
```python
PractitionerEarnings:
  - practitioner: OneToOne
  - pending_balance: Decimal (not yet payable)
  - available_balance: Decimal (ready for payout)
  - lifetime_earnings: Decimal
  - lifetime_payouts: Decimal

EarningsTransaction:
  - practitioner: FK
  - booking: FK
  - gross_amount: Decimal (service price)
  - commission_rate: Decimal (percentage)
  - commission_amount: Decimal
  - net_amount: Decimal (practitioner receives)
  - status: pending|available|paid|reversed
  - available_after: DateTime (48hr hold)

PractitionerPayout:
  - practitioner: FK
  - credits_payout: Decimal
  - status: pending|processing|completed|failed
  - stripe_transfer_id: String
```

---

## Common Queries

```python
# User's current credit balance
user.credit_balance.balance

# Practitioner's available balance
practitioner.earnings_balance.available_balance

# This month's earnings
EarningsTransaction.objects.filter(
    practitioner=practitioner,
    created_at__month=current_month,
    status__in=['pending', 'available', 'paid']
).aggregate(total=Sum('net_amount'))

# Pending payouts
EarningsTransaction.objects.filter(
    practitioner=practitioner,
    status='available'
).aggregate(total=Sum('net_amount'))

# Commission calculation
base_rate = ServiceTypeCommission.objects.get(service_type=service.service_type).base_rate
tier_adjustment = practitioner.subscription.tier.commission_adjustments.get(service_type=service.service_type)
final_commission = base_rate + tier_adjustment.adjustment_percentage
```

---

## Best Practices

### 1. Service Type Selection
- **Session**: One-time appointments
- **Workshop**: Group events with specific dates
- **Course**: Multi-session programs with fixed schedule
- **Bundle**: Pre-pay for multiple uses of same service
- **Package**: Mix different services at discount

### 2. Booking Status Flow
- Always use `transition_to()` method
- Never skip states
- Handle cancellations through proper flow

### 3. Money Handling
- Store as decimals, not integers
- Always calculate commission at transaction time
- Hold period prevents chargebacks
- Batch payouts reduce transaction fees

### 4. Bundle vs Package
- **Bundle**: Same service, multiple times (quantity discount)
- **Package**: Different services together (variety discount)
- Bundles track remaining uses
- Packages track completion percentage

### 5. Payout Timing
- 48-hour hold for dispute protection
- Weekly batches for efficiency
- Instant payout option with higher fees
- Progressive payouts for long programs