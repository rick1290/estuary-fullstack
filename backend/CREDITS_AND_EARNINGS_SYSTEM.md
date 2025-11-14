# Credits & Earnings System Documentation

**Last Updated:** 2025-11-13
**Status:** Analysis Complete - Ready for Refactoring

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Client Credits System](#client-credits-system)
3. [Practitioner Earnings System](#practitioner-earnings-system)
4. [Service Type Specific Flows](#service-type-specific-flows)
5. [Background Tasks & Automation](#background-tasks--automation)
6. [Key Issues & Inconsistencies](#key-issues--inconsistencies)
7. [Complete Data Flow Examples](#complete-data-flow-examples)
8. [Recommendations for Refactor](#recommendations-for-refactor)

---

## System Architecture Overview

### Current Payment Orchestrator
**Active:** `FastCheckoutOrchestrator` (`payments/services/checkout_orchestrator_fast.py`)

**Key Characteristics:**
- Processes payments and creates bookings synchronously
- **Defers** earnings creation to background task: `create_booking_earnings_async`
- **Defers** room creation and notifications to: `complete_booking_post_payment`
- Optimized for fast response times

**Deprecated:** `CheckoutOrchestrator` (payments/services/checkout_orchestrator.py)
- Creates earnings synchronously
- NOT currently in use

### Core Models

**Client Side:**
- `Order` - Financial transaction record
- `UserCreditTransaction` - Individual credit movements
- `UserCreditBalance` - Cached balance for performance

**Practitioner Side:**
- `EarningsTransaction` - Individual earnings records
- `PractitionerEarnings` - Cached balance with pending/available split
- `PractitionerPayout` - Payout batch records
- `PackageCompletionRecord` - ❌ BROKEN - Progressive payout tracking

---

## Client Credits System

### Model: `UserCreditTransaction`
**Location:** `payments/models.py:130-241`

### Transaction Types
```python
TRANSACTION_TYPES = (
    'purchase',      # User bought credits
    'usage',         # User spent credits on service
    'refund',        # Credits returned to user
    'adjustment',    # Manual adjustment
    'bonus',         # Free credits given
    'transfer',      # Credits transferred between users
    'expiry',        # Credits expired
)
```

### How Credits Flow

#### Scenario 1: Service Booking with Existing Credits
**Example:** User has $50 credits, books $100 service

```python
# Step 1: Calculate pricing
service_price_cents = 10000          # $100
user_credit_balance_cents = 5000     # $50 existing credits
credits_to_apply_cents = 5000        # Apply available credits
amount_to_charge_cents = 5000        # Charge remaining $50

# Step 2: Create Order
Order.objects.create(
    user=user,
    subtotal_amount_cents=10000,      # Original price
    credits_applied_cents=5000,       # Credits used
    total_amount_cents=5000,          # Stripe charge
    status='completed'
)

# Step 3: Process Stripe Payment
PaymentService.process_stripe_payment(amount_cents=5000)

# Step 4: Create PAIRED credit transactions
# ⚠️ CURRENT PATTERN (creates confusion):
CreditService.create_booking_credit_transactions()
→ UserCreditTransaction(
    amount_cents=+10000,  # POSITIVE: "Purchase"
    transaction_type='purchase',
    description="Purchase: Service Name"
  )
→ UserCreditTransaction(
    amount_cents=-10000,  # NEGATIVE: "Usage"
    transaction_type='usage',
    description="Booking: Service Name"
  )

# Net effect on balance: +10000 - 10000 = 0
# This creates audit trail but is confusing
```

**Issue:** This pattern doesn't show that user actually used $50 from existing credits. The Order record captures this (credits_applied_cents=5000), but the transactions don't reflect it clearly.

#### Scenario 2: Direct Credit Purchase
**Example:** User buys $100 in credits

```python
# Step 1: Create order
Order.objects.create(
    user=user,
    order_type='credit',
    total_amount_cents=10000,
    status='pending'
)

# Step 2: Process payment
PaymentService.process_stripe_payment(amount_cents=10000)

# Step 3: Add credits
CreditService.purchase_credits(user, amount_cents=10000, order=order)
→ UserCreditTransaction(
    amount_cents=+10000,
    transaction_type='purchase',
    order=order,
    description="Credit purchase: $100.00"
  )

# Step 4: Balance auto-updated
# UserCreditBalance.update_balance() called automatically
# New balance: previous_balance + 10000
```

#### Scenario 3: Booking Cancellation Refund
**Example:** User cancels booking, receives refund

```python
# Step 1: Calculate refund based on policy
refund_amount_cents = booking.calculate_refund_amount()
# Returns:
#   - 100% if >24 hours before start
#   - 50% if 6-24 hours before
#   - 0% if <6 hours before

# Step 2: Create refund transaction
CreditService.refund_credits(
    user=booking.user,
    amount_cents=refund_amount_cents,
    booking=booking,
    reason="Booking cancellation"
)
→ UserCreditTransaction(
    amount_cents=+refund_amount_cents,  # POSITIVE
    transaction_type='refund',
    booking=booking
  )

# Step 3: Balance increases
# UserCreditBalance.update_balance() called automatically
```

### Balance Tracking

**Model:** `UserCreditBalance` (`payments/models.py:681-737`)

```python
class UserCreditBalance(BaseModel):
    user = OneToOneField(User)
    balance_cents = IntegerField       # Current balance
    last_transaction = ForeignKey(UserCreditTransaction)
```

**Auto-Update Mechanism:**
```python
# In UserCreditTransaction.save()
def save(self, *args, **kwargs):
    super().save(*args, **kwargs)
    # Automatically recalculates balance from ALL transactions
    UserCreditBalance.update_balance(self.user)

# In UserCreditBalance.update_balance()
@classmethod
def update_balance(cls, user):
    # Sum ALL transactions for accuracy
    balance_cents = UserCreditTransaction.objects.filter(
        user=user
    ).aggregate(Sum('amount_cents'))['amount_cents__sum'] or 0

    # Update cached balance
    credit_balance, _ = cls.objects.get_or_create(user=user)
    credit_balance.balance_cents = balance_cents
    credit_balance.save()
```

---

## Practitioner Earnings System

### Model: `EarningsTransaction`
**Location:** `payments/models.py:393-551`

### Transaction Statuses
```python
TRANSACTION_STATUS = (
    'pending',    # Waiting for 48hr hold period
    'available',  # Ready for payout
    'paid',       # Included in a payout
    'reversed',   # Refunded or canceled
)
```

### Earnings Lifecycle

#### Stage 1: Creation (Pending)
**Trigger:** Booking created and paid

```python
# Location: payments/tasks.py::create_booking_earnings_async
# (Called asynchronously after booking creation)

# Calculate commission
commission_rate = CommissionCalculator.get_commission_rate(
    practitioner=practitioner,
    service_type=service.service_type
)

# Base commission rates by service type:
# - session: 15%
# - workshop: 20%
# - course: 20%
# - package: 15%
# - bundle: 10%

# Tier adjustments:
# - standard: 0%
# - silver: -2%
# - gold: -5%
# - platinum: -7%

commission_amount_cents = int((commission_rate / 100) * gross_amount_cents)
net_amount_cents = gross_amount_cents - commission_amount_cents

# Create earnings transaction
EarningsTransaction.objects.create(
    practitioner=practitioner,
    booking=booking,
    gross_amount_cents=10000,           # $100 service price
    commission_rate=15.0,               # 15%
    commission_amount_cents=1500,       # $15 commission
    net_amount_cents=8500,              # $85 to practitioner
    status='pending',
    available_after=timezone.now() + timedelta(hours=48),
    transaction_type='booking_completion'
)

# Auto-updates PractitionerEarnings.pending_balance_cents
```

#### Stage 2: Available (After Hold)
**Trigger:** Celery task `update-available-earnings` (runs hourly)

```python
# Check if hold period expired
if timezone.now() >= earnings_transaction.available_after:
    earnings_transaction.status = 'available'
    earnings_transaction.save()

    # Moves from pending_balance_cents → available_balance_cents
    # Auto-updated via EarningsTransaction._update_practitioner_balance()
```

#### Stage 3: Paid Out
**Trigger:** Payout processed

```python
# Create payout batch
payout = PractitionerPayout.create_batch_payout(
    practitioner=practitioner,
    transactions=available_earnings  # status='available'
)

# Each transaction:
transaction.status = 'paid'
transaction.payout = payout
transaction.save()

# Deducted from available_balance_cents
# Added to lifetime_payouts_cents
```

#### Stage 4: Reversed (Cancellation)
**Trigger:** Booking canceled

```python
# Create reversal transaction
EarningsTransaction.objects.create(
    practitioner=original_earnings.practitioner,
    booking=booking,
    gross_amount_cents=-original_earnings.gross_amount_cents,  # NEGATIVE
    commission_amount_cents=-original_earnings.commission_amount_cents,
    net_amount_cents=-original_earnings.net_amount_cents,
    status='completed',
    transaction_type='reversal'
)

# Original transaction marked as reversed
original_earnings.status = 'reversed'
original_earnings.save()
```

### Earnings Balance Tracking

**Model:** `PractitionerEarnings` (`payments/models.py:322-391`)

```python
class PractitionerEarnings(BaseModel):
    practitioner = OneToOneField(Practitioner)
    pending_balance_cents = IntegerField      # In 48hr hold
    available_balance_cents = IntegerField    # Ready for payout
    lifetime_earnings_cents = IntegerField    # Total ever earned
    lifetime_payouts_cents = IntegerField     # Total paid out
    last_payout_date = DateTimeField
```

**Auto-Update Mechanism:**
```python
# In EarningsTransaction.save()
def save(self, *args, **kwargs):
    super().save(*args, **kwargs)
    self._update_practitioner_balance()

# Recalculates from all transactions
def _update_practitioner_balance(self):
    pending_cents = EarningsTransaction.objects.filter(
        practitioner=self.practitioner,
        status='pending'
    ).aggregate(Sum('net_amount_cents'))['total'] or 0

    available_cents = EarningsTransaction.objects.filter(
        practitioner=self.practitioner,
        status='available'
    ).aggregate(Sum('net_amount_cents'))['total'] or 0

    lifetime_cents = EarningsTransaction.objects.filter(
        practitioner=self.practitioner,
        status__in=['pending', 'available', 'paid']
    ).aggregate(Sum('net_amount_cents'))['total'] or 0

    balance, _ = PractitionerEarnings.objects.get_or_create(
        practitioner=self.practitioner
    )
    balance.pending_balance_cents = pending_cents
    balance.available_balance_cents = available_cents
    balance.lifetime_earnings_cents = lifetime_cents
    balance.save()
```

---

## Service Type Specific Flows

### 1. Session (One-on-One)

**Characteristics:**
- User selects specific time slot
- Immediate booking confirmation
- Single practitioner-client session

**Booking Creation:**
```python
# bookings/services/booking_service_fast.py::_create_session_booking
Booking.objects.create(
    user=user,
    service=service,
    practitioner=service.primary_practitioner,
    start_time=booking_data['start_time'],     # User selected
    end_time=booking_data['end_time'],         # User selected
    price_charged_cents=service_price,
    status='confirmed',
    payment_status='paid'
)
```

**Earnings Creation:**
```python
# Created immediately (via async task)
EarningsTransaction.create(
    gross_amount_cents=service.price_cents,
    status='pending',
    available_after=now + 48 hours
)
```

**Status:** ✅ Working as intended

---

### 2. Workshop (Group Event)

**Characteristics:**
- Multiple participants
- Specific date/time via ServiceSession
- Capacity limits enforced

**Booking Creation:**
```python
# bookings/services/booking_service_fast.py::_create_workshop_booking
service_session = ServiceSession.objects.get(id=service_session_id)

Booking.objects.create(
    user=user,
    service=service,
    practitioner=service.primary_practitioner,
    service_session=service_session,          # Links to group session
    start_time=service_session.start_time,    # Inherits from session
    end_time=service_session.end_time,
    max_participants=service_session.max_participants,
    status='confirmed',
    payment_status='paid'
)
```

**Earnings Creation:**
```python
# Created immediately (via async task)
EarningsTransaction.create(
    gross_amount_cents=service.price_cents,
    status='pending'
)
```

**Status:** ✅ Working as intended

---

### 3. Course (Multi-Session Program)

**Characteristics:**
- Enrollment in multiple sessions
- Predetermined schedule
- Single payment for all sessions

**Booking Creation:**
```python
# bookings/models.py::BookingFactory.create_course_booking
booking = Booking.objects.create(
    user=user,
    service=course,
    practitioner=course.primary_practitioner,
    start_time=timezone.now(),              # ⚠️ PLACEHOLDER TIME
    end_time=timezone.now() + timedelta(hours=1),  # ⚠️ PLACEHOLDER
    price_charged_cents=course.price_cents,
    status='confirmed',
    max_participants=course.max_participants
)
```

**Earnings Creation:**
```python
# Created immediately for ENTIRE course price
EarningsTransaction.create(
    gross_amount_cents=course.price_cents,  # ❌ Should be progressive
    status='pending'
)
```

**Issues:**
- ❌ Placeholder times don't represent actual session times
- ❌ Earnings created upfront instead of per session delivered
- ❌ No tracking of individual session completion

**Recommendation:** Deprecate courses, convert to workshop series

**Status:** ❌ Needs refactoring

---

### 4. Package (Bundled Services)

**Characteristics:**
- Multiple services bundled together
- User schedules each session individually
- Discount pricing

**Booking Creation:**
```python
# bookings/models.py::BookingFactory.create_package_booking

# Parent booking (container)
parent_booking = Booking.objects.create(
    user=user,
    service=package_service,
    practitioner=package_service.primary_practitioner,
    start_time=None,                        # ✅ No time (not a real session)
    end_time=None,
    price_charged_cents=package_service.price_cents,
    status='confirmed',
    is_package_purchase=True
)

# Child bookings (actual sessions)
for rel in package_service.child_relationships.all():
    for _ in range(rel.quantity):
        Booking.objects.create(
            user=user,
            service=rel.child_service,
            practitioner=rel.child_service.primary_practitioner,
            parent_booking=parent_booking,
            price_charged_cents=0,          # ✅ Included in package
            final_amount_cents=0,
            status='draft',                 # ✅ Unscheduled
            start_time=None,                # ✅ User schedules later
            end_time=None
        )
```

**Earnings Creation:**
```python
# ❌ NO EARNINGS CREATED AT ALL!

# Supposed to be handled by PackageCompletionRecord
# But it's broken (references booking.credit_value which doesn't exist)
```

**PackageCompletionRecord Issues:**
```python
# payments/models.py:1039
total_package_value = self.package_booking.credit_value or 0
# ❌ Booking model doesn't have credit_value field!

# Progressive payout logic exists but never executes
```

**Issues:**
- ❌ No earnings created for package purchase
- ❌ `PackageCompletionRecord.credit_value` references non-existent field
- ❌ Progressive payout logic never triggers
- ❌ Practitioners don't get paid for packages

**Status:** ❌ Critically broken

---

### 5. Bundle (Credit Package)

**Characteristics:**
- Purchase credits for specific service at discount
- Schedule sessions as needed
- Tracks usage via credits

**Booking Creation:**
```python
# bookings/models.py::BookingFactory.create_bundle_booking

bundle_booking = Booking.objects.create(
    user=user,
    service=bundle_service,
    practitioner=bundle_service.primary_practitioner,
    start_time=None,
    end_time=None,
    price_charged_cents=bundle_service.price_cents,
    status='confirmed',
    is_bundle_purchase=True
)

# ❌ No child bookings created!
# Should create unscheduled bookings for each included session
```

**Earnings Creation:**
```python
# ❌ NO EARNINGS CREATED AT ALL!
```

**Issues:**
- ❌ Doesn't create child bookings (should based on design discussion)
- ❌ No earnings created
- ❌ No progressive payout tracking

**Status:** ❌ Critically broken

---

## Background Tasks & Automation

### Celery Tasks
**Configuration:** `backend/estuary/celery.py`

#### 1. `update-available-earnings`
**Schedule:** Every hour
**Location:** `payments/tasks.py:13-32`

```python
@shared_task(name='update-available-earnings')
def update_available_earnings():
    """Move earnings from pending → available after 48hr hold"""

    earnings = EarningsTransaction.objects.filter(
        status='pending',
        available_after__lte=timezone.now()
    )

    for earning in earnings:
        earning.status = 'available'
        earning.save()  # Triggers balance recalculation
```

#### 2. `calculate-pending-earnings`
**Schedule:** Daily at 1 AM
**Location:** `payments/tasks.py:89-140`

```python
@shared_task(name='calculate-pending-earnings')
def calculate_pending_earnings():
    """Recalculate pending balance for all practitioners"""

    for practitioner_earnings in PractitionerEarnings.objects.all():
        pending_total = EarningsTransaction.objects.filter(
            practitioner=practitioner_earnings.practitioner,
            status='pending'
        ).aggregate(Sum('net_amount_cents'))['total'] or 0

        if practitioner_earnings.pending_balance_cents != pending_total:
            practitioner_earnings.pending_balance_cents = pending_total
            practitioner_earnings.save()
```

#### 3. `process-refund-credits`
**Trigger:** Booking cancellation
**Location:** `payments/tasks.py:35-86`

```python
@shared_task(name='process-refund-credits')
def process_refund_credits(booking_id, refund_amount_cents, reason):
    """Process credit refund and earnings reversal"""

    booking = Booking.objects.get(id=booking_id)

    # Refund credits to user
    credit_service = CreditService()
    credit_service.refund_credits(
        user=booking.user,
        amount_cents=refund_amount_cents,
        booking=booking
    )

    # Reverse practitioner earnings
    earnings_service = EarningsService()
    earnings_service.reverse_earnings(booking)
```

#### 4. `create-booking-earnings-async`
**Trigger:** Booking creation (via FastCheckoutOrchestrator)
**Location:** `payments/tasks.py:209-257`

```python
@shared_task(name='create-booking-earnings-async')
def create_booking_earnings_async(practitioner_id, booking_id, service_id, gross_amount_cents):
    """Create earnings transaction asynchronously"""

    practitioner = Practitioner.objects.get(id=practitioner_id)
    booking = Booking.objects.get(id=booking_id)
    service = Service.objects.get(id=service_id)

    earnings_service = EarningsService()
    earnings_service.create_booking_earnings(
        practitioner=practitioner,
        booking=booking,
        service=service,
        gross_amount_cents=gross_amount_cents
    )
```

#### 5. `complete-booking-post-payment`
**Trigger:** Booking creation (via FastCheckoutOrchestrator)
**Location:** `payments/tasks.py:143-207`

```python
@shared_task(name='complete-booking-post-payment')
def complete_booking_post_payment(booking_id):
    """Complete non-critical post-payment tasks"""

    booking = Booking.objects.get(id=booking_id)

    # 1. Create LiveKit room if needed
    if booking.service.location_type in ['virtual', 'online', 'hybrid']:
        room_service = RoomService()
        room_service.create_room_for_booking(booking)

    # 2. Send confirmation notifications
    notification_service = NotificationService()
    notification_service.send_booking_confirmation(booking)

    # 3. Reminders handled by separate periodic task
```

---

## Key Issues & Inconsistencies

### ❌ Issue 1: Paired Credit Transaction Pattern
**Location:** `CreditService.create_booking_credit_transactions()`
**Severity:** Medium (Confusing but functional)

**Problem:**
```python
# For every booking, creates BOTH:
UserCreditTransaction(amount_cents=+service_price, type='purchase')
UserCreditTransaction(amount_cents=-service_price, type='usage')

# Net effect: 0 (correct)
# But doesn't show actual credit usage from existing balance
```

**Example:**
- User has $50 credits
- Books $100 service
- Pays $50 via Stripe
- Uses $50 from credits

**Current transactions:**
- +$100 (purchase)
- -$100 (usage)
- Net: $0 ✅

**But this doesn't show:**
- $50 came from Stripe (captured in Order.total_amount_cents)
- $50 came from existing credits (captured in Order.credits_applied_cents)

**Impact:**
- Transaction log is confusing
- Hard to audit actual credit usage
- Order record is source of truth, not transactions

**Recommendation:**
Only create usage transaction if credits were actually applied:
```python
if credits_applied_cents > 0:
    UserCreditTransaction.create(
        amount_cents=-credits_applied_cents,  # Only debit what was used
        transaction_type='usage'
    )
```

---

### ❌ Issue 2: Package/Bundle Earnings NOT Created
**Location:** `BookingFactory.create_package_booking()`, `create_bundle_booking()`
**Severity:** Critical (Practitioners don't get paid)

**Problem:**
1. No earnings created when package/bundle purchased
2. `PackageCompletionRecord` has progressive payout code
3. But references `booking.credit_value` field that doesn't exist
4. `PackageCompletionRecord` never instantiated anywhere

**Code Reference:**
```python
# payments/models.py:1039
total_package_value = self.package_booking.credit_value or 0
# ❌ Booking model has no credit_value field!
```

**Impact:**
- Practitioners receive $0 for package/bundle sales
- Progressive payout logic exists but never executes
- Critical business logic failure

**Current State:**
```python
# User buys 5-session package for $400
# Order created ✅
# Booking created ✅
# Credits deducted ✅
# Earnings created ❌ NO!
# Practitioner paid ❌ NO!
```

**Recommendation:**
- Create earnings when child bookings are completed (progressive)
- Fix or remove PackageCompletionRecord
- Add session_value_cents to track per-session earnings

---

### ❌ Issue 3: Upfront vs Progressive Earnings
**Location:** All service types
**Severity:** High (Business logic inconsistency)

**Current State:**
| Service Type | Earnings Timing | Status |
|-------------|-----------------|--------|
| Session | Upfront (at booking) | ✅ Works but wrong timing |
| Workshop | Upfront (at booking) | ✅ Works but wrong timing |
| Course | Upfront (full course) | ❌ Should be per session |
| Package | Not created | ❌ Broken |
| Bundle | Not created | ❌ Broken |

**Desired State:**
All service types should create earnings **when service is delivered**, not at purchase.

**Rationale:**
- Prevents paying practitioners for services not yet delivered
- Protects platform from refund liability
- Matches industry standards (Stripe holds funds, etc.)

**Recommendation:**
```python
# AT BOOKING CREATION:
# Do NOT create earnings

# AT BOOKING COMPLETION:
BookingService.mark_booking_completed(booking)
  → EarningsService.create_booking_earnings(
        gross_amount_cents=booking.price_charged_cents
    )
```

---

### ❌ Issue 4: Course Earnings Timing
**Location:** Course bookings
**Severity:** Medium (Wrong timing + duplicate with Issue 3)

**Problem:**
Course bookings create earnings immediately for entire course price, but course has multiple sessions.

**Current:**
```python
# User enrolls in 8-week course for $800
# Earnings created immediately: $800
# Practitioner gets paid after 48hr hold
# But course runs for 8 weeks!
```

**Should be:**
```python
# User enrolls in 8-week course for $800
# Week 1 session completed → $100 earnings created
# Week 2 session completed → $100 earnings created
# ... and so on
```

**Impact:**
- Practitioners paid upfront for future services
- High refund liability if course canceled mid-way
- Platform takes financial risk

**Recommendation:**
- Deprecate course service type (per earlier discussion)
- Convert to workshop series
- Or implement progressive earnings per session

---

### ❌ Issue 5: Two Earnings Creation Paths
**Location:** CheckoutOrchestrator vs FastCheckoutOrchestrator
**Severity:** Low (Only one in use)

**Situation:**
1. **FastCheckoutOrchestrator** (IN USE)
   - Creates earnings via async task: `create_booking_earnings_async`
   - Defers to background for performance

2. **CheckoutOrchestrator** (DEPRECATED)
   - Creates earnings synchronously
   - Not in use but still in codebase

**Impact:**
- Code confusion
- Maintenance burden
- Potential bugs if wrong one used

**Recommendation:**
- Delete `CheckoutOrchestrator`
- Document that only `FastCheckoutOrchestrator` is supported

---

### ❌ Issue 6: Bundle Child Bookings Missing
**Location:** `BookingFactory.create_bundle_booking()`
**Severity:** High (Based on design discussion)

**Current:**
```python
# Only creates parent bundle booking
# No child bookings created
```

**Per Design Discussion:**
Bundles should create unscheduled child bookings (like packages), not just credits.

**Should Create:**
```python
bundle_booking = Booking.create(
    service=bundle_service,
    is_bundle_purchase=True
)

# Create child bookings for each session in bundle
for _ in range(bundle_service.quantity):
    Booking.create(
        parent_booking=bundle_booking,
        service=bundle_service.child_service,  # Specific service bundled
        start_time=None,  # Unscheduled
        end_time=None,
        status='draft'
    )
```

**Impact:**
- Users can't track bundle usage via bookings
- No way to schedule bundle sessions
- Earnings can't be created progressively

**Recommendation:**
Implement child booking creation for bundles (same as packages)

---

## Complete Data Flow Examples

### Example 1: Session Booking with Credits

**Setup:**
- User has $50 existing credit balance
- Books $100 session
- Practitioner is Gold tier (15% commission - 5% = 10%)

**Step-by-Step Flow:**

```python
# 1. PRICING CALCULATION
service_price_cents = 10000          # $100
user_credit_balance = 5000           # $50
credits_to_apply = 5000              # Apply $50 credits
amount_to_charge = 5000              # Charge $50 to card

# 2. ORDER CREATION
order = Order.create(
    user=user,
    service=service,
    subtotal_amount_cents=10000,      # $100
    credits_applied_cents=5000,       # $50
    total_amount_cents=5000,          # $50
    status='pending'
)

# 3. STRIPE PAYMENT
payment_intent = stripe.PaymentIntent.create(
    amount=5000,  # $50
    customer=user.stripe_customer_id,
    payment_method=payment_method.stripe_payment_method_id,
    confirm=True
)
# payment_intent.status = 'succeeded'
order.status = 'completed'
order.stripe_payment_intent_id = payment_intent.id

# 4. CREDIT TRANSACTIONS (Paired pattern)
UserCreditTransaction.create(
    user=user,
    amount_cents=+10000,  # +$100 (purchase)
    transaction_type='purchase',
    service=service,
    order=order
)
UserCreditTransaction.create(
    user=user,
    amount_cents=-10000,  # -$100 (usage)
    transaction_type='usage',
    service=service,
    order=order
)
# Net effect on balance: 0
# Previous balance: $50
# New balance: $50 (unchanged - correct but confusing)

# 5. BOOKING CREATION
booking = Booking.create(
    user=user,
    service=service,
    practitioner=practitioner,
    start_time=selected_time,
    end_time=selected_time + 1hr,
    price_charged_cents=10000,        # $100
    discount_amount_cents=0,
    final_amount_cents=10000,
    status='confirmed',
    payment_status='paid'
)

# 6. ROOM CREATION (async task)
complete_booking_post_payment.delay(booking.id)
  → RoomService.create_room_for_booking(booking)

# 7. NOTIFICATIONS (async task)
complete_booking_post_payment.delay(booking.id)
  → NotificationService.send_booking_confirmation(booking)

# 8. EARNINGS CREATION (async task)
create_booking_earnings_async.delay(
    practitioner_id=practitioner.id,
    booking_id=booking.id,
    gross_amount_cents=10000
)
  → commission_rate = 10%  # Gold tier
  → commission_amount = $10
  → net_amount = $90
  → EarningsTransaction.create(
        practitioner=practitioner,
        booking=booking,
        gross_amount_cents=10000,
        commission_rate=10.0,
        commission_amount_cents=1000,
        net_amount_cents=9000,
        status='pending',
        available_after=now + 48 hours
    )

# 9. PRACTITIONER BALANCE UPDATE (auto)
PractitionerEarnings.update(
    practitioner=practitioner,
    pending_balance_cents += 9000  # +$90
)
```

**Final State:**

| Entity | Field | Value |
|--------|-------|-------|
| **Order** | subtotal_amount_cents | 10000 ($100) |
| | credits_applied_cents | 5000 ($50) |
| | total_amount_cents | 5000 ($50) |
| | status | completed |
| **UserCreditBalance** | balance_cents | 5000 ($50) |
| **Booking** | price_charged_cents | 10000 ($100) |
| | status | confirmed |
| **EarningsTransaction** | gross_amount_cents | 10000 ($100) |
| | commission_amount_cents | 1000 ($10) |
| | net_amount_cents | 9000 ($90) |
| | status | pending |
| **PractitionerEarnings** | pending_balance_cents | 9000 ($90) |

---

### Example 2: Package Purchase (CURRENT - BROKEN)

**Setup:**
- User buys 5-session package for $400
- Package includes 5x $100 sessions
- Practitioner is Standard tier (15% commission)

**Current Flow:**

```python
# 1. ORDER CREATION
order = Order.create(
    user=user,
    service=package_service,
    subtotal_amount_cents=40000,      # $400
    credits_applied_cents=0,
    total_amount_cents=40000,
    status='completed'
)

# 2. STRIPE PAYMENT
payment_intent = stripe.PaymentIntent.create(
    amount=40000  # $400
)

# 3. CREDIT TRANSACTIONS
UserCreditTransaction.create(amount_cents=+40000, type='purchase')
UserCreditTransaction.create(amount_cents=-40000, type='usage')

# 4. PARENT BOOKING CREATION
parent_booking = Booking.create(
    user=user,
    service=package_service,
    start_time=None,                  # No time
    end_time=None,
    price_charged_cents=40000,
    status='confirmed',
    is_package_purchase=True
)

# 5. CHILD BOOKINGS CREATION
for _ in range(5):  # 5 sessions
    child_booking = Booking.create(
        user=user,
        parent_booking=parent_booking,
        service=individual_service,
        start_time=None,              # Unscheduled
        end_time=None,
        price_charged_cents=0,        # Included in package
        final_amount_cents=0,
        status='draft'                # Awaiting scheduling
    )

# 6. EARNINGS CREATION
# ❌ NO EARNINGS CREATED!
# create_booking_earnings_async is called but:
# - Parent booking has is_package_purchase=True
# - No special handling for packages
# - No earnings created

# 7. PACKAGE COMPLETION RECORD
# ❌ NOT CREATED!
# No code path creates PackageCompletionRecord
```

**Final State:**

| Entity | Value | Expected | Status |
|--------|-------|----------|--------|
| Order | Created ✅ | ✅ | OK |
| Parent Booking | Created ✅ | ✅ | OK |
| Child Bookings | 5 created ✅ | ✅ | OK |
| Credits Deducted | $400 ✅ | ✅ | OK |
| **Earnings** | **$0 ❌** | **$340** | **BROKEN** |
| Practitioner Paid | $0 ❌ | $340 | BROKEN |

---

### Example 3: Package Purchase (DESIRED - PROGRESSIVE)

**Setup:** Same as Example 2

**Desired Flow:**

```python
# 1-5: Same as current (Order, Payment, Bookings)

# 6. EARNINGS - NOT CREATED AT PURCHASE
# No earnings when package purchased

# 7. USER SCHEDULES FIRST SESSION
child_booking_1.start_time = user_selected_time
child_booking_1.end_time = user_selected_time + 1hr
child_booking_1.status = 'scheduled'
child_booking_1.save()

# 8. SESSION 1 COMPLETED
BookingService.mark_booking_completed(child_booking_1)
  → Calculate session value: $400 / 5 = $80 per session
  → Calculate commission: 15% of $80 = $12
  → Net earnings: $68
  → EarningsTransaction.create(
        practitioner=practitioner,
        booking=child_booking_1,
        gross_amount_cents=8000,      # $80
        commission_amount_cents=1200, # $12
        net_amount_cents=6800,        # $68
        status='pending',
        transaction_type='package_session_completion'
    )

# 9. REPEAT FOR EACH SESSION
# Session 2 completed → +$68
# Session 3 completed → +$68
# Session 4 completed → +$68
# Session 5 completed → +$68

# Total practitioner earnings: $340
# (Same as if they sold 5 individual $80 sessions)
```

**Final State:**

| Session | Earnings Created | Status | Practitioner Receives |
|---------|------------------|--------|-----------------------|
| Purchase | None | - | $0 |
| Session 1 Complete | $68 | pending | - |
| Session 1 After 48hr | $68 | available | - |
| Session 1 Payout | $68 | paid | $68 |
| Session 2-5... | $68 each | ... | $68 each |
| **Total** | **$340** | - | **$340** |

---

## Recommendations for Refactor

### Priority 1: Fix Critical Earnings Bugs

**Issue:** Packages and bundles don't create earnings

**Tasks:**
1. Remove or fix `PackageCompletionRecord` (broken field reference)
2. Implement progressive earnings for packages:
   ```python
   # When child booking completed:
   if booking.parent_booking and booking.parent_booking.is_package_purchase:
       session_value = calculate_session_value(booking)
       create_earnings(booking, session_value)
   ```
3. Implement bundle child booking creation
4. Implement progressive earnings for bundles (same as packages)

**Testing:**
- Buy package, complete sessions, verify earnings created
- Buy bundle, schedule sessions, verify earnings created
- Verify commission calculations correct

---

### Priority 2: Implement Progressive Earnings for All Service Types

**Issue:** Earnings created at booking time, should be at completion

**Tasks:**
1. Move earnings creation from booking to completion:
   ```python
   # Remove from FastCheckoutOrchestrator
   # Add to BookingService.mark_booking_completed()
   ```
2. Update all service types:
   - Sessions: Create earnings when session completed
   - Workshops: Create earnings when workshop completed
   - Packages: Create earnings when each child completed
   - Bundles: Create earnings when each child completed
3. Deprecate courses or implement session-based earnings

**Migration Strategy:**
- Grandfather existing pending/available earnings
- Apply new logic only to new bookings
- Optional: Batch update old earnings (risky)

**Testing:**
- Create booking, verify no earnings
- Complete booking, verify earnings created
- Verify 48hr hold period works
- Verify balance calculations correct

---

### Priority 3: Simplify Credit Transaction Pattern

**Issue:** Paired purchase/usage transactions are confusing

**Current:**
```python
# Always creates both:
+service_price (purchase)
-service_price (usage)
```

**Proposed:**
```python
# Only create transactions that represent actual credit movement
if credits_applied_cents > 0:
    UserCreditTransaction.create(
        amount_cents=-credits_applied_cents,
        transaction_type='usage',
        order=order
    )
# No "purchase" transaction for bookings
# "Purchase" only for actual credit purchases
```

**Benefits:**
- Clearer transaction history
- Easier to audit credit usage
- Matches user mental model

**Migration:**
- Keep existing transactions (historical data)
- Apply new pattern to new bookings only

---

### Priority 4: Deprecate Course Service Type

**Issue:** Courses create timing and earnings problems

**Recommendation:**
Convert courses to workshop series:
1. Create migration to convert existing courses
2. Update frontend to remove course option
3. Remove course-specific booking logic
4. Update documentation

**Alternative:**
Implement progressive course earnings (more complex):
- Track session completion
- Create earnings per session
- Handle partial course refunds

---

### Priority 5: Code Cleanup

**Tasks:**
1. Delete `CheckoutOrchestrator` (deprecated)
2. Document that only `FastCheckoutOrchestrator` is supported
3. Remove unused `PackageCompletionRecord` or fix it
4. Add comprehensive tests for earnings flows
5. Update documentation

---

## Implementation Checklist

### Phase 1: Fix Package/Bundle Earnings (Critical)
- [ ] Add `session_value_cents` to package/bundle bookings
- [ ] Implement earnings creation on child booking completion
- [ ] Create bundle child bookings (missing)
- [ ] Test package purchase → schedule → complete → earnings flow
- [ ] Test bundle purchase → schedule → complete → earnings flow

### Phase 2: Progressive Earnings (All Service Types)
- [ ] Move earnings creation to `mark_booking_completed()`
- [ ] Remove earnings creation from `FastCheckoutOrchestrator`
- [ ] Update earnings task to only run on completion
- [ ] Test session booking → complete → earnings
- [ ] Test workshop booking → complete → earnings
- [ ] Verify backward compatibility

### Phase 3: Credit Transaction Refactor
- [ ] Update `CreditService.create_booking_credit_transactions()`
- [ ] Remove paired transaction pattern
- [ ] Only create usage transaction if credits applied
- [ ] Test credit balance calculations
- [ ] Verify Order records still accurate

### Phase 4: Course Deprecation
- [ ] Audit existing courses in production
- [ ] Create conversion migration (course → workshop)
- [ ] Update frontend to remove course option
- [ ] Update API to reject course creation
- [ ] Notify practitioners of change

### Phase 5: Cleanup & Testing
- [ ] Delete `CheckoutOrchestrator`
- [ ] Fix or remove `PackageCompletionRecord`
- [ ] Add comprehensive integration tests
- [ ] Update API documentation
- [ ] Update practitioner/client documentation

---

## Questions for Tomorrow

1. **Package Session Value:** How to calculate per-session value?
   - Equal split ($400 package / 5 sessions = $80 each)?
   - Or different values per service in package?

2. **Bundle Structure:** Should bundles create child bookings or remain credit-only?
   - Current decision: Create child bookings (like packages)
   - Confirm this approach?

3. **Migration Strategy:** How to handle existing bookings?
   - Grandfather old earnings (leave as-is)?
   - Migrate to new system (risky)?

4. **Course Timeline:** When to deprecate courses?
   - Immediate (block new courses)?
   - Gradual (convert over time)?

5. **Testing Strategy:** How to verify earnings correctness?
   - Manual testing?
   - Automated test suite?
   - Production data validation?

---

**Next Steps:** Review this document, discuss priorities, begin Phase 1 implementation.
