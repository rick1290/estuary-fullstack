# Implementation Plan: Credits & Earnings System Fixes

**Version:** 1.0
**Created:** 2025-11-14
**Status:** Ready for Implementation
**Estimated Time:** 2-3 days
**Risk Level:** Medium

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Problems Identified](#problems-identified)
4. [Architecture Decisions](#architecture-decisions)
5. [Implementation Strategy](#implementation-strategy)
6. [Phase 1: Model Updates](#phase-1-model-updates)
7. [Phase 2: Service Updates](#phase-2-service-updates)
8. [Phase 3: Factory & Orchestrator Updates](#phase-3-factory--orchestrator-updates)
9. [Phase 4: Testing](#phase-4-testing)
10. [Phase 5: Data Migration](#phase-5-data-migration)
11. [Phase 6: Cleanup](#phase-6-cleanup)
12. [Rollback Plan](#rollback-plan)
13. [Verification Checklist](#verification-checklist)

---

## Executive Summary

### What We're Fixing

The current system has critical bugs in the earnings flow:
1. **Earnings created with wrong status** - 'pending' instead of 'projected'
2. **Earnings available too early** - 48hrs from booking, not completion
3. **Status never updates on completion** - code looks for 'projected' but doesn't exist
4. **Package earnings not created** - no earnings for package/bundle child bookings

### What We're Adding

1. **Order-as-Parent architecture** - Remove parent bookings, use Order as container
2. **Booking → Order relationship** - Every booking links to its order
3. **Progressive earnings** - Create earnings when service delivered, not purchased
4. **Package earnings** - Calculate per-session value from package metadata

### Impact

- ✅ Practitioners paid correctly after service delivered
- ✅ 48-hour hold starts AFTER completion, not at booking
- ✅ Package earnings calculated and paid per session
- ✅ Cleaner data model (Order as financial source of truth)
- ✅ All payment types supported (card, credits, mixed, free)

---

## Current State Analysis

### Current Earnings Flow (BROKEN)

```
1. User books service
   ↓
2. Earnings created IMMEDIATELY with status='pending' ❌
   available_after = now + 48hrs (from BOOKING time) ❌
   ↓
3. Service happens...
   ↓
4. Booking marked complete
   → Looks for status='projected' ❌
   → Not found (created as 'pending')
   → No update happens ❌
   ↓
5. 48 hours after BOOKING (before service delivered!)
   → Earnings become 'available' ❌
   → Practitioner can withdraw ❌
```

### Target Earnings Flow (FIXED)

```
1. User books service
   ↓
2. Earnings created with status='projected' ✓
   available_after = booking.end_time + 48hrs ✓
   ↓
3. Service happens...
   ↓
4. Booking marked complete
   → Finds status='projected' ✓
   → Updates to status='pending' ✓
   → Updates available_after = now + 48hrs ✓
   ↓
5. 48 hours after COMPLETION
   → Earnings become 'available' ✓
   → Practitioner can withdraw ✓
```

### Current Package Flow (BROKEN)

```
User buys $400 package (5 sessions @ $80 each)
   ↓
Parent booking created (is_package_purchase=True) ❌
   ↓
5 child bookings created (parent_booking FK) ❌
   ↓
NO EARNINGS CREATED (practitioner not paid!) ❌
   ↓
Child booking completed
   → No earnings logic for packages ❌
```

### Target Package Flow (FIXED)

```
User buys $400 package (5 sessions @ $80 each)
   ↓
Order created with package_metadata: {
  total_sessions: 5,
  session_value_cents: 8000  ($80)
} ✓
   ↓
5 child bookings created (order FK, status='draft') ✓
   ↓
Child booking #1 completed
   → Earnings created for $80 (from order.session_value_cents) ✓
   → Commission calculated on $80 ✓
   → Status='projected' → 'pending' → 'available' ✓
   ↓
All 5 completed = 5 × $80 = $400 total earnings ✓
```

---

## Problems Identified

### Problem 1: Wrong Earnings Status

**File:** `payments/services/earnings_service.py:92`

**Current Code:**
```python
earnings = EarningsTransaction.objects.create(
    status='pending',  # ❌ Wrong!
    available_after=timezone.now() + timedelta(hours=48)  # ❌ From booking time!
)
```

**Issue:**
- Created with 'pending' but code looks for 'projected'
- available_after based on booking time, not service completion

---

### Problem 2: Missing 'projected' Status

**File:** `payments/models.py:398`

**Current Code:**
```python
TRANSACTION_STATUS = (
    ('pending', 'Pending'),
    ('available', 'Available'),
    ('paid', 'Paid'),
    ('reversed', 'Reversed'),
)
```

**Issue:**
- Code references 'projected' status but it's not in choices
- Can't create earnings with 'projected' status

---

### Problem 3: Booking Completion Can't Update Earnings

**File:** `bookings/services/booking_service.py:313-316`

**Current Code:**
```python
earnings = EarningsTransaction.objects.filter(
    booking=booking,
    status='projected'  # Looking for 'projected'
).first()

if earnings:  # Always None because created as 'pending'!
    earnings.status = 'pending'
    # ... never executes
```

**Issue:**
- Looks for 'projected' but earnings created as 'pending'
- earnings is always None
- Status never updated on completion

---

### Problem 4: No Order FK on Booking

**File:** `bookings/models.py`

**Current State:**
```python
class Booking:
    parent_booking = ForeignKey('self')  # For packages
    payment_transaction = ForeignKey(UserCreditTransaction)  # Not set!
    # Missing: order FK!
```

**Issue:**
- No direct link to Order (financial source of truth)
- Package children use parent_booking (wrong semantics)
- payment_transaction FK exists but never set

---

### Problem 5: Package Earnings Not Created

**File:** `payments/services/checkout_orchestrator_fast.py:154-168`

**Current Code:**
```python
# Queue earnings calculation
if service.primary_practitioner:
    # ... queue earnings task
```

**Issue:**
- Only creates earnings for direct bookings
- Packages/bundles have no earnings creation logic
- Practitioner never gets paid for package bookings!

---

### Problem 6: Parent Booking Semantics

**Current:**
- "Booking" represents both appointments AND purchase containers
- Queries need `.exclude(is_package_purchase=True)`
- Confusing data model

**Target:**
- Booking = appointment only
- Order = financial transaction
- Clear separation of concerns

---

## Architecture Decisions

### Decision 1: Add 'projected' Status

**Rationale:**
- Represents future earnings (booked but not yet delivered)
- Distinguishes from 'pending' (delivered, in 48hr hold)
- Enables proper status lifecycle

**Status Lifecycle:**
```
'projected' → 'pending' → 'available' → 'paid_out'
    ↓             ↓            ↓            ↓
At booking   At completion  After 48hr   At payout
(future)     (hold starts)   hold
```

---

### Decision 2: Add Booking.order FK

**Rationale:**
- Every booking belongs to an order (financial transaction)
- Works for all payment types (card, credits, mixed, free)
- Works for packages (all children share same order)
- Semantic correctness: Booking fulfills an Order

**Structure:**
```python
class Booking:
    order = ForeignKey(Order, related_name='bookings')  # PRIMARY
    credit_usage_transaction = ForeignKey(UserCreditTransaction, null=True)  # OPTIONAL
```

---

### Decision 3: Rename payment_transaction to credit_usage_transaction

**Rationale:**
- More accurate: points to credit transaction, not general payment
- Distinguishes from Stripe payments
- Specific: it's the USAGE transaction (negative), not purchase

**Usage:**
- Direct booking with credits: Set to usage transaction (optional)
- Package bookings: NULL (credits at order level)
- Card-only bookings: NULL (no credits involved)

---

### Decision 4: Order.package_metadata JSON Field

**Rationale:**
- Stores package-specific data on Order (financial record)
- Flexible structure for different package types
- Single source of truth for package info

**Structure:**
```json
{
  "package_type": "package",
  "total_sessions": 5,
  "sessions_completed": 0,
  "session_value_cents": 8000,
  "package_service_id": 123
}
```

---

### Decision 5: Progressive Earnings for Packages

**Rationale:**
- Practitioner earns when service delivered, not purchased
- Fair: payment tied to work performed
- No upfront earnings for $400 package, earn $80 per completed session

**Flow:**
1. Package purchase → NO earnings
2. Session 1 complete → Create earnings for $80
3. Session 2 complete → Create earnings for $80
4. ... 5 sessions = 5 × $80 = $400 total

---

### Decision 6: Package Credits at Order Level

**Rationale:**
- Credits applied at purchase time (before sessions scheduled)
- User's balance reflects commitment immediately
- Single source of truth: Order.credits_applied_cents
- Calculate per-session when needed for refunds

**Example:**
- Package: $400, Credits: $100, Card: $300
- Order.credits_applied_cents = 10000
- Per-session: 10000 / 5 = 2000 ($20 per session)

---

## Implementation Strategy

### Approach: Incremental with Backward Compatibility

1. **Add new fields** (don't remove old ones yet)
2. **Update code to use new fields** (old fields still work)
3. **Migrate existing data** (populate new fields)
4. **Verify everything works** (test thoroughly)
5. **Remove old fields** (cleanup after stable)

### Key Principles

- ✅ No breaking changes until data migrated
- ✅ Database transactions for atomic operations
- ✅ Extensive logging for debugging
- ✅ Rollback plan for each step
- ✅ Test in dev, then staging, then production

### Order of Operations

```
Phase 1: Model Updates (schema changes)
   ↓
Phase 2: Service Updates (business logic)
   ↓
Phase 3: Factory & Orchestrator (booking creation)
   ↓
Phase 4: Testing (verify everything works)
   ↓
Phase 5: Data Migration (migrate existing data)
   ↓
Phase 6: Cleanup (remove deprecated fields)
```

---

## Phase 1: Model Updates

### Step 1.1: Add 'projected' Status to EarningsTransaction

**File:** `payments/models.py`

**Changes:**
```python
class EarningsTransaction(BaseModel):
    TRANSACTION_STATUS = (
        ('projected', 'Projected'),  # ✅ ADD THIS - Future earnings not yet earned
        ('pending', 'Pending'),      # Waiting for 48hr hold after service delivery
        ('available', 'Available'),  # Ready for payout
        ('paid', 'Paid'),           # Included in a payout
        ('reversed', 'Reversed'),   # Refunded or canceled
    )

    status = models.CharField(
        max_length=20,
        choices=TRANSACTION_STATUS,
        default='projected'  # ✅ CHANGE default from 'pending' to 'projected'
    )
```

**Migration:**
```bash
python manage.py makemigrations payments -n add_projected_status
```

**Migration Code:**
```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_previous_migration'),
    ]

    operations = [
        migrations.AlterField(
            model_name='earningstransaction',
            name='status',
            field=models.CharField(
                choices=[
                    ('projected', 'Projected'),
                    ('pending', 'Pending'),
                    ('available', 'Available'),
                    ('paid', 'Paid'),
                    ('reversed', 'Reversed')
                ],
                default='projected',
                max_length=20
            ),
        ),
    ]
```

**Verification:**
```python
# python manage.py shell
from payments.models import EarningsTransaction

# Check choices
print(EarningsTransaction.TRANSACTION_STATUS)
# Should include ('projected', 'Projected')

# Create test transaction
txn = EarningsTransaction(
    practitioner=...,
    booking=...,
    status='projected',
    gross_amount_cents=10000
)
txn.full_clean()  # Should not raise error
```

---

### Step 1.2: Add Order FK to Booking

**File:** `bookings/models.py`

**Changes:**
```python
class Booking(PublicModel):
    # ... existing fields ...

    # ✅ ADD: Primary relationship to Order
    order = models.ForeignKey(
        'payments.Order',
        on_delete=models.CASCADE,
        related_name='bookings',
        null=True,  # Nullable during migration
        blank=True,
        help_text="Financial transaction for this booking"
    )

    # ✅ RENAME: payment_transaction → credit_usage_transaction
    credit_usage_transaction = models.ForeignKey(
        'payments.UserCreditTransaction',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='bookings',
        help_text="Specific credit usage transaction (if credits applied)"
    )

    # Keep old field temporarily for backward compatibility
    # Will be removed in Phase 6
    parent_booking = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='child_bookings',
        help_text="DEPRECATED: Use order relationship instead"
    )
```

**Migration:**
```bash
python manage.py makemigrations bookings -n add_order_fk
```

**Migration Code:**
```python
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('bookings', '0009_make_booking_times_nullable'),
        ('payments', '0XXX_add_projected_status'),
    ]

    operations = [
        # Add order FK
        migrations.AddField(
            model_name='booking',
            name='order',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='bookings',
                to='payments.order',
                help_text='Financial transaction for this booking'
            ),
        ),

        # Rename payment_transaction to credit_usage_transaction
        migrations.RenameField(
            model_name='booking',
            old_name='payment_transaction',
            new_name='credit_usage_transaction',
        ),

        # Update help text for parent_booking
        migrations.AlterField(
            model_name='booking',
            name='parent_booking',
            field=models.ForeignKey(
                blank=True,
                help_text='DEPRECATED: Use order relationship instead',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='child_bookings',
                to='bookings.booking'
            ),
        ),
    ]
```

**Verification:**
```python
# python manage.py shell
from bookings.models import Booking
from payments.models import Order

# Check field exists
booking = Booking.objects.first()
print(hasattr(booking, 'order'))  # Should be True
print(hasattr(booking, 'credit_usage_transaction'))  # Should be True
```

---

### Step 1.3: Add package_metadata to Order

**File:** `payments/models.py`

**Changes:**
```python
class Order(PublicModel):
    # ... existing fields ...

    ORDER_TYPE_CHOICES = (
        ('direct', 'Direct Service Purchase'),
        ('credit', 'Credit Purchase'),
        ('package', 'Package Purchase'),  # ✅ ADD
        ('bundle', 'Bundle Purchase'),    # ✅ ADD
        ('subscription', 'Subscription'),
    )

    order_type = models.CharField(
        max_length=20,
        choices=ORDER_TYPE_CHOICES,
        default='direct'
    )

    # ✅ ADD: Package/bundle metadata
    package_metadata = models.JSONField(
        null=True,
        blank=True,
        help_text="Package/bundle specific data"
    )
    # Structure:
    # {
    #   'package_type': 'package' | 'bundle',
    #   'total_sessions': 5,
    #   'sessions_completed': 0,
    #   'session_value_cents': 8000,
    #   'package_service_id': 123,
    #   'expires_at': '2025-12-31T00:00:00Z'
    # }

    # ✅ ADD: Helper properties
    @property
    def is_package_or_bundle(self):
        """True if this order is for a package or bundle"""
        return self.order_type in ['package', 'bundle']

    @property
    def total_sessions(self):
        """Total sessions in package/bundle"""
        if self.package_metadata:
            return self.package_metadata.get('total_sessions', 0)
        return 0

    @property
    def sessions_completed(self):
        """Number of completed sessions"""
        if self.package_metadata:
            return self.package_metadata.get('sessions_completed', 0)
        return 0

    @property
    def session_value_cents(self):
        """Value per session in cents"""
        if self.package_metadata:
            return self.package_metadata.get('session_value_cents', 0)
        return 0

    @property
    def sessions_remaining(self):
        """Number of sessions remaining"""
        return self.total_sessions - self.sessions_completed

    def increment_sessions_completed(self):
        """Increment completed session count"""
        if not self.package_metadata:
            return

        self.package_metadata['sessions_completed'] = (
            self.package_metadata.get('sessions_completed', 0) + 1
        )
        self.save(update_fields=['package_metadata'])
```

**Migration:**
```bash
python manage.py makemigrations payments -n add_package_metadata
```

**Migration Code:**
```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_add_projected_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='package_metadata',
            field=models.JSONField(
                blank=True,
                null=True,
                help_text='Package/bundle specific data'
            ),
        ),
        migrations.AlterField(
            model_name='order',
            name='order_type',
            field=models.CharField(
                choices=[
                    ('direct', 'Direct Service Purchase'),
                    ('credit', 'Credit Purchase'),
                    ('package', 'Package Purchase'),
                    ('bundle', 'Bundle Purchase'),
                    ('subscription', 'Subscription')
                ],
                default='direct',
                max_length=20
            ),
        ),
    ]
```

**Verification:**
```python
# python manage.py shell
from payments.models import Order

order = Order.objects.create(
    user=...,
    order_type='package',
    package_metadata={
        'total_sessions': 5,
        'session_value_cents': 8000
    }
)

print(order.total_sessions)  # Should be 5
print(order.session_value_cents)  # Should be 8000
print(order.is_package_or_bundle)  # Should be True
```

---

### Step 1.4: Run All Migrations

```bash
# Apply all migrations
python manage.py migrate

# Verify no errors
python manage.py showmigrations payments bookings
```

**Expected Output:**
```
payments
  [X] 0XXX_add_projected_status
  [X] 0XXX_add_package_metadata
bookings
  [X] 0009_make_booking_times_nullable
  [X] 0XXX_add_order_fk
```

---

## Phase 2: Service Updates

### Step 2.1: Update EarningsService

**File:** `payments/services/earnings_service.py`

**Changes:**

```python
@transaction.atomic
def create_booking_earnings(
    self,
    practitioner: Practitioner,
    booking: Any,
    service: Any,
    gross_amount_cents: int
) -> Optional[EarningsTransaction]:
    """
    Create earnings transaction for a booking.
    UPDATED: Handles package/bundle child bookings and uses 'projected' status.
    """
    if not practitioner:
        return None

    # ✅ NEW: Determine gross amount based on booking type
    if hasattr(booking, 'order') and booking.order and booking.order.is_package_or_bundle:
        # Use session value from order metadata
        gross_amount_cents = booking.order.session_value_cents
        logger.info(
            f"Package/bundle child booking {booking.id}: "
            f"Using session value ${gross_amount_cents/100:.2f}"
        )

    # Calculate commission
    commission_rate, commission_amount_cents, net_amount_cents = self.calculate_commission(
        practitioner=practitioner,
        service_type=service.service_type,
        gross_amount_cents=gross_amount_cents
    )

    # ✅ CHANGED: Determine available_after based on booking end time
    if booking.end_time:
        available_after = booking.end_time + timedelta(hours=48)
    else:
        # Fallback if no end time (shouldn't happen for real bookings)
        available_after = timezone.now() + timedelta(hours=48)

    # ✅ CHANGED: Create with 'projected' status
    earnings = EarningsTransaction.objects.create(
        practitioner=practitioner,
        booking=booking,
        gross_amount_cents=gross_amount_cents,
        commission_rate=commission_rate,
        commission_amount_cents=commission_amount_cents,
        net_amount_cents=net_amount_cents,
        status='projected',  # ✅ CHANGED from 'pending'
        available_after=available_after,  # ✅ CHANGED to use booking.end_time
        description=f"Earnings from booking for {service.name}"
    )

    logger.info(
        f"Created projected earnings for practitioner {practitioner.id}: "
        f"${net_amount_cents/100:.2f} net (${commission_amount_cents/100:.2f} commission)"
    )

    return earnings
```

**Verification:**
```python
# Test in shell
from payments.services import EarningsService
from bookings.models import Booking
from services.models import Service

booking = Booking.objects.first()
service = booking.service
earnings_service = EarningsService()

earnings = earnings_service.create_booking_earnings(
    practitioner=booking.practitioner,
    booking=booking,
    service=service,
    gross_amount_cents=10000
)

# Verify
print(earnings.status)  # Should be 'projected'
print(earnings.available_after)  # Should be booking.end_time + 48hrs
```

---

### Step 2.2: Update BookingService.mark_booking_completed

**File:** `bookings/services/booking_service.py`

**Changes:**

```python
@transaction.atomic
def mark_booking_completed(self, booking: Booking) -> Booking:
    """
    Mark a booking as completed, update earnings, and send review request.
    UPDATED: Handles package/bundle completion tracking.
    """
    if booking.status == 'completed':
        logger.warning(f"Booking {booking.id} already completed")
        return booking

    booking.status = 'completed'
    booking.actual_end_time = timezone.now()
    booking.completed_at = timezone.now()
    booking.save()

    # Update earnings transaction status from 'projected' to 'pending'
    try:
        from payments.models import EarningsTransaction
        from datetime import timedelta

        earnings = EarningsTransaction.objects.filter(
            booking=booking,
            status='projected'  # ✅ NOW FOUND! (created with 'projected')
        ).first()

        if earnings:
            earnings.status = 'pending'
            # Update available_after to 48 hours from NOW (actual completion time)
            earnings.available_after = timezone.now() + timedelta(hours=48)
            earnings.save(update_fields=['status', 'available_after', 'updated_at'])
            logger.info(f"Updated earnings transaction {earnings.id} to pending status")
        else:
            logger.warning(f"No projected earnings found for booking {booking.id}")

    except Exception as e:
        logger.error(f"Error updating earnings for booking {booking.id}: {e}")
        # Don't fail the completion if earnings update fails

    # ✅ NEW: If package/bundle child, update completion count
    if hasattr(booking, 'order') and booking.order and booking.order.is_package_or_bundle:
        try:
            booking.order.increment_sessions_completed()
            logger.info(
                f"Package/bundle progress: {booking.order.sessions_completed}/"
                f"{booking.order.total_sessions} completed"
            )
        except Exception as e:
            logger.error(f"Error updating package completion for order {booking.order.id}: {e}")

    # Send review request notification
    try:
        from notifications.services.client_notifications import ClientNotificationService
        client_service = ClientNotificationService()
        client_service.send_booking_completed_review_request(booking)
        logger.info(f"Sent review request for completed booking {booking.id}")
    except Exception as e:
        logger.error(f"Failed to send review request: {e}")
        # Don't fail the completion if notification fails

    return booking
```

**Verification:**
```python
# Test completion flow
from bookings.services import BookingService
from bookings.models import Booking
from payments.models import EarningsTransaction

# Create test booking with projected earnings
booking = Booking.objects.get(id=...)
earnings = EarningsTransaction.objects.create(
    practitioner=booking.practitioner,
    booking=booking,
    status='projected',
    gross_amount_cents=10000,
    available_after=booking.end_time + timedelta(hours=48)
)

# Mark complete
booking_service = BookingService()
booking_service.mark_booking_completed(booking)

# Verify
booking.refresh_from_db()
earnings.refresh_from_db()

print(booking.status)  # Should be 'completed'
print(earnings.status)  # Should be 'pending' (changed from 'projected')
print(earnings.available_after > timezone.now())  # Should be 48hrs from now
```

---

## Phase 3: Factory & Orchestrator Updates

### Step 3.1: Update BookingFactory for Packages

**File:** `bookings/models.py`

**Changes to BookingFactory:**

```python
@classmethod
def create_package_booking(cls, user, package_service, payment_data, **kwargs):
    """
    Create package purchase with child bookings.
    NO LONGER CREATES PARENT BOOKING - Uses Order instead.

    Args:
        user: User purchasing package
        package_service: Package service
        payment_data: Payment information including 'order_id'
        **kwargs: Additional booking data

    Returns:
        tuple: (order, list of child bookings)
    """
    from payments.models import Order

    # ✅ Get order (must be passed in)
    order_id = kwargs.get('order_id') or payment_data.get('order_id')
    if not order_id:
        raise ValueError("order_id is required for create_package_booking")

    order = Order.objects.get(id=order_id)

    # Get child services and calculate values
    child_relationships = package_service.child_relationships.all()
    total_sessions = sum(rel.quantity for rel in child_relationships)
    session_value_cents = (
        payment_data['price_charged_cents'] // total_sessions
        if total_sessions > 0 else 0
    )

    # ✅ Update order with package metadata
    order.order_type = 'package'
    order.package_metadata = {
        'package_type': 'package',
        'total_sessions': total_sessions,
        'sessions_completed': 0,
        'session_value_cents': session_value_cents,
        'package_service_id': package_service.id,
    }

    # Add expiration if package has validity period
    if hasattr(package_service, 'validity_days') and package_service.validity_days:
        from django.utils import timezone
        from datetime import timedelta
        expires_at = timezone.now() + timedelta(days=package_service.validity_days)
        order.package_metadata['expires_at'] = expires_at.isoformat()

    order.save()

    # ✅ Create child bookings (link to order, not parent booking)
    children = []
    for rel in child_relationships:
        for _ in range(rel.quantity):
            child = Booking.objects.create(
                user=user,
                order=order,  # ✅ Link to order
                service=rel.child_service,
                practitioner=rel.child_service.primary_practitioner,
                price_charged_cents=0,  # Included in package
                discount_amount_cents=0,
                final_amount_cents=0,
                status='draft',
                payment_status='paid',
                start_time=None,
                end_time=None,
                service_name_snapshot=rel.child_service.name,
                service_description_snapshot=rel.child_service.description or '',
                practitioner_name_snapshot=(
                    rel.child_service.primary_practitioner.display_name
                    if rel.child_service.primary_practitioner else ''
                ),
                client_notes=kwargs.get('client_notes', '')
            )
            children.append(child)

    logger.info(
        f"Created package order {order.id} with {len(children)} child bookings "
        f"for user {user.id}"
    )

    return order, children
```

**Similar updates for `create_bundle_booking`:**

```python
@classmethod
def create_bundle_booking(cls, user, bundle_service, payment_data, **kwargs):
    """
    Create bundle purchase with child bookings.
    NO LONGER CREATES PARENT BOOKING - Uses Order instead.
    """
    from payments.models import Order
    from services.models import Service

    # Get order
    order_id = kwargs.get('order_id') or payment_data.get('order_id')
    if not order_id:
        raise ValueError("order_id is required for create_bundle_booking")

    order = Order.objects.get(id=order_id)

    # Get bundle configuration
    bundle_quantity = bundle_service.metadata.get('session_count', 10)
    bundled_service_id = bundle_service.metadata.get('bundled_service_id')

    if not bundled_service_id:
        raise ValueError("Bundle must specify bundled_service_id in metadata")

    bundled_service = Service.objects.get(id=bundled_service_id)

    session_value_cents = (
        payment_data['price_charged_cents'] // bundle_quantity
        if bundle_quantity > 0 else 0
    )

    # Update order with bundle metadata
    order.order_type = 'bundle'
    order.package_metadata = {
        'package_type': 'bundle',
        'total_sessions': bundle_quantity,
        'sessions_completed': 0,
        'session_value_cents': session_value_cents,
        'bundle_service_id': bundle_service.id,
        'bundled_service_id': bundled_service_id,
    }

    # Add expiration
    if hasattr(bundle_service, 'validity_days') and bundle_service.validity_days:
        from django.utils import timezone
        from datetime import timedelta
        expires_at = timezone.now() + timedelta(days=bundle_service.validity_days)
        order.package_metadata['expires_at'] = expires_at.isoformat()

    order.save()

    # Create child bookings
    children = []
    for _ in range(bundle_quantity):
        child = Booking.objects.create(
            user=user,
            order=order,
            service=bundled_service,
            practitioner=bundled_service.primary_practitioner,
            price_charged_cents=0,
            discount_amount_cents=0,
            final_amount_cents=0,
            status='draft',
            payment_status='paid',
            start_time=None,
            end_time=None,
            service_name_snapshot=bundled_service.name,
            service_description_snapshot=bundled_service.description or '',
            practitioner_name_snapshot=(
                bundled_service.primary_practitioner.display_name
                if bundled_service.primary_practitioner else ''
            ),
            client_notes=kwargs.get('client_notes', '')
        )
        children.append(child)

    return order, children
```

---

### Step 3.2: Update FastCheckoutOrchestrator

**File:** `payments/services/checkout_orchestrator_fast.py`

**Changes:**

```python
@transaction.atomic
def process_booking_payment_fast(self, user, service_id, payment_method_id, booking_data):
    """
    Process booking payment with fast checkout flow.
    UPDATED: Handles Order FK, package/bundle bookings, progressive earnings.
    """
    try:
        # Steps 1-4: Get service, calculate pricing, create order, process payment
        # ... (existing code stays the same) ...

        # Step 5: Create credit transactions
        self.credit_service.create_booking_credit_transactions(
            user=user,
            service=service,
            order=order
        )

        # ✅ Step 6: Create booking(s) - UPDATED FOR PACKAGES/BUNDLES
        payment_data = {
            'price_charged_cents': service_price_cents,
            'credits_applied_cents': credits_to_apply_cents,
            'amount_charged_cents': amount_to_charge_cents,
            'payment_intent_id': payment_result.get('payment_intent', {}).id if payment_result.get('payment_intent') else None,
            'order_id': order.id  # ✅ Pass order ID
        }

        service_type_code = service.service_type.code if service.service_type else None

        if service_type_code == 'package':
            # Returns (order, children)
            order, children = BookingFactory.create_package_booking(
                user=user,
                package_service=service,
                payment_data=payment_data,
                order_id=order.id,  # ✅ Pass order
                **booking_data
            )
            booking = children[0] if children else None

        elif service_type_code == 'bundle':
            order, children = BookingFactory.create_bundle_booking(
                user=user,
                bundle_service=service,
                payment_data=payment_data,
                order_id=order.id,
                **booking_data
            )
            booking = children[0] if children else None

        else:
            # Regular booking (session, workshop, etc.)
            booking = self.booking_service.create_booking_fast(
                user=user,
                service=service,
                booking_data=booking_data,
                payment_data=payment_data
            )

            # ✅ NEW: Set order FK on booking
            if booking:
                booking.order = order
                booking.save(update_fields=['order'])

        # ✅ Step 7: Update credit transaction with booking reference
        if booking:
            usage_transactions = order.user_credit_transactions.filter(
                transaction_type='usage',
                booking__isnull=True
            )
            for credit_txn in usage_transactions:
                credit_txn.booking = booking
                credit_txn.save()

                # ✅ NEW: Also set on booking (optional convenience FK)
                if booking.credit_usage_transaction is None:
                    booking.credit_usage_transaction = credit_txn
                    booking.save(update_fields=['credit_usage_transaction'])

        # ✅ Step 8: Queue earnings ONLY for non-package/bundle bookings
        # Packages/bundles create earnings when children are completed
        if service_type_code not in ['package', 'bundle'] and service.primary_practitioner:
            from payments.tasks import create_booking_earnings_async

            def queue_earnings_task():
                create_booking_earnings_async.delay(
                    practitioner_id=service.primary_practitioner.id,
                    booking_id=booking.id,
                    service_id=service.id,
                    gross_amount_cents=service_price_cents
                )

            transaction.on_commit(queue_earnings_task)

        # Step 9: Queue post-payment tasks (room, notifications)
        if booking:
            from payments.tasks import complete_booking_post_payment
            transaction.on_commit(lambda: complete_booking_post_payment.delay(booking.id))

        logger.info(f"Fast checkout completed for order {order.id}")

        return CheckoutResult(
            success=True,
            booking=booking,
            order=order,
            payment_intent=payment_result.get('payment_intent')
        )

    except Exception as e:
        logger.error(f"Fast checkout failed: {str(e)}")
        raise
```

---

### Step 3.3: Update mark-completed-bookings Task

**File:** `bookings/tasks.py`

**Changes:**

```python
@shared_task(name='mark-completed-bookings')
def mark_completed_bookings():
    """
    Mark bookings as completed if they are past their end time.
    This task runs every 30 minutes via Celery Beat.
    UPDATED: Creates earnings for package/bundle children when completed.
    """
    now = timezone.now()

    active_bookings = Booking.objects.filter(
        Q(status='confirmed') | Q(status='in_progress')
    ).select_related('service', 'service_session', 'order', 'practitioner').prefetch_related('service__sessions')

    completed_count = 0
    error_count = 0
    skipped_count = 0
    earnings_created_count = 0

    for booking in active_bookings:
        try:
            should_complete = False
            end_time_used = None

            # ... (existing completion logic) ...

            if should_complete:
                from bookings.services import BookingService
                booking_service = BookingService()

                try:
                    # Mark as completed (this updates earnings from 'projected' to 'pending')
                    booking_service.mark_booking_completed(booking)

                    # ✅ NEW: For package/bundle children, create earnings if not exists
                    if (hasattr(booking, 'order') and booking.order and
                        booking.order.is_package_or_bundle):

                        from payments.models import EarningsTransaction

                        # Check if earnings already exist
                        existing_earnings = EarningsTransaction.objects.filter(
                            booking=booking
                        ).exists()

                        if not existing_earnings and booking.practitioner:
                            # Create earnings for this completed package session
                            from payments.services import EarningsService
                            earnings_service = EarningsService()

                            earnings = earnings_service.create_booking_earnings(
                                practitioner=booking.practitioner,
                                booking=booking,
                                service=booking.service,
                                gross_amount_cents=booking.order.session_value_cents
                            )

                            if earnings:
                                # Immediately mark as pending (service already delivered)
                                earnings.status = 'pending'
                                earnings.available_after = now + timedelta(hours=48)
                                earnings.save()

                                earnings_created_count += 1
                                logger.info(
                                    f"Created and marked pending earnings {earnings.id} "
                                    f"for completed package session booking {booking.id}"
                                )

                    logger.info(
                        f"Marked booking {booking.id} as completed. "
                        f"Service: {booking.service.name} ({booking.service.service_type_code}), "
                        f"User: {booking.user.email}, "
                        f"End time used: {end_time_used}"
                    )
                    completed_count += 1

                except Exception as e:
                    logger.error(
                        f"Error marking booking {booking.id} as completed: {str(e)}",
                        exc_info=True
                    )
                    error_count += 1
                    continue

        except Exception as e:
            logger.error(
                f"Error processing booking {booking.id}: {str(e)}",
                exc_info=True
            )
            error_count += 1

    logger.info(
        f"Completed bookings task finished. "
        f"Marked {completed_count} bookings as completed. "
        f"Created {earnings_created_count} earnings for package sessions. "
        f"Skipped {skipped_count} bookings. "
        f"Errors: {error_count}"
    )

    return {
        'completed_count': completed_count,
        'earnings_created_count': earnings_created_count,
        'error_count': error_count,
        'skipped_count': skipped_count,
        'checked_at': now.isoformat()
    }
```

---

## Phase 4: Testing

### Step 4.1: Unit Tests

**File:** `tests/unit/test_earnings_service.py`

```python
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from payments.services import EarningsService
from payments.models import EarningsTransaction, Order

class EarningsServiceTests(TestCase):

    def test_create_earnings_with_projected_status(self):
        """Test earnings created with 'projected' status"""
        earnings_service = EarningsService()

        earnings = earnings_service.create_booking_earnings(
            practitioner=self.practitioner,
            booking=self.booking,
            service=self.service,
            gross_amount_cents=10000
        )

        self.assertEqual(earnings.status, 'projected')
        self.assertGreater(earnings.available_after, timezone.now())

    def test_package_earnings_use_session_value(self):
        """Test package bookings use session_value_cents from order"""
        # Create package order
        order = Order.objects.create(
            user=self.user,
            order_type='package',
            package_metadata={
                'total_sessions': 5,
                'session_value_cents': 8000  # $80 per session
            }
        )

        # Create child booking
        booking = Booking.objects.create(
            user=self.user,
            order=order,
            service=self.service,
            practitioner=self.practitioner,
            end_time=timezone.now() + timedelta(hours=1)
        )

        earnings_service = EarningsService()
        earnings = earnings_service.create_booking_earnings(
            practitioner=self.practitioner,
            booking=booking,
            service=self.service,
            gross_amount_cents=40000  # This should be ignored
        )

        # Should use session value from order, not passed amount
        self.assertEqual(earnings.gross_amount_cents, 8000)

    def test_available_after_uses_booking_end_time(self):
        """Test available_after is 48hrs from booking end time"""
        end_time = timezone.now() + timedelta(days=7)
        booking = Booking.objects.create(
            user=self.user,
            service=self.service,
            practitioner=self.practitioner,
            end_time=end_time
        )

        earnings_service = EarningsService()
        earnings = earnings_service.create_booking_earnings(
            practitioner=self.practitioner,
            booking=booking,
            service=self.service,
            gross_amount_cents=10000
        )

        expected_available = end_time + timedelta(hours=48)
        self.assertEqual(earnings.available_after, expected_available)
```

---

### Step 4.2: Integration Tests

**File:** `tests/integration/test_package_flow.py`

```python
from django.test import TestCase
from payments.services import FastCheckoutOrchestrator, EarningsService
from bookings.services import BookingService
from payments.models import Order, EarningsTransaction
from bookings.models import Booking

class PackageFlowTests(TestCase):

    def test_complete_package_purchase_flow(self):
        """Test entire package purchase and completion flow"""
        orchestrator = FastCheckoutOrchestrator()

        # 1. Purchase package
        result = orchestrator.process_booking_payment_fast(
            user=self.user,
            service_id=self.package_service.id,
            payment_method_id=self.payment_method.id,
            booking_data={}
        )

        self.assertTrue(result.success)
        self.assertIsNotNone(result.order)

        # Verify order
        order = result.order
        self.assertEqual(order.order_type, 'package')
        self.assertIsNotNone(order.package_metadata)
        self.assertEqual(order.total_sessions, 5)

        # Verify child bookings created
        children = Booking.objects.filter(order=order)
        self.assertEqual(children.count(), 5)

        # Verify all link to order
        for child in children:
            self.assertEqual(child.order, order)
            self.assertEqual(child.status, 'draft')

        # Verify NO earnings created yet
        earnings_count = EarningsTransaction.objects.filter(
            booking__order=order
        ).count()
        self.assertEqual(earnings_count, 0)

        # 2. Schedule and complete first session
        first_child = children.first()
        first_child.start_time = timezone.now()
        first_child.end_time = timezone.now() + timedelta(hours=1)
        first_child.status = 'confirmed'
        first_child.save()

        booking_service = BookingService()
        booking_service.mark_booking_completed(first_child)

        # Verify earnings created for first session
        earnings = EarningsTransaction.objects.filter(
            booking=first_child
        ).first()

        self.assertIsNotNone(earnings)
        self.assertEqual(earnings.status, 'pending')  # Changed from 'projected'
        self.assertEqual(earnings.gross_amount_cents, order.session_value_cents)

        # Verify package progress updated
        order.refresh_from_db()
        self.assertEqual(order.sessions_completed, 1)
        self.assertEqual(order.sessions_remaining, 4)
```

---

### Step 4.3: End-to-End Tests

**Test scenarios:**

1. **Direct Booking with Card Only**
   - Purchase → Earnings created (projected) → Complete → Earnings pending → Available after 48hrs

2. **Direct Booking with Credits**
   - Purchase → Credits applied → Earnings projected → Complete → Available

3. **Package Purchase**
   - Purchase → 5 drafts created → No earnings → Complete session 1 → Earnings for $80 → Complete all 5 → Total $400

4. **Bundle Purchase**
   - Purchase → 10 drafts → Complete → Earnings per session

5. **Mixed Payment (Credits + Card)**
   - $100 service, $20 credits, $80 card → All tracked correctly

---

## Phase 5: Data Migration

### Step 5.1: Populate order FK for Existing Bookings

**File:** `bookings/migrations/0XXX_populate_order_fk.py`

```python
from django.db import migrations
from django.db.models import Q

def populate_order_fk(apps, schema_editor):
    """
    Populate order FK on existing bookings.

    Strategy:
    1. For bookings with parent_booking, use parent's order
    2. For other bookings, try to find order via credit transactions
    3. For remaining, try via service and user
    """
    Booking = apps.get_model('bookings', 'Booking')
    Order = apps.get_model('payments', 'Order')
    UserCreditTransaction = apps.get_model('payments', 'UserCreditTransaction')

    updated_count = 0
    missing_count = 0

    # Get all bookings without order
    bookings_without_order = Booking.objects.filter(order__isnull=True)
    total = bookings_without_order.count()

    print(f"\nPopulating order FK for {total} bookings...")

    for booking in bookings_without_order:
        order = None

        # Strategy 1: If has parent, use parent's order
        if booking.parent_booking_id:
            parent = Booking.objects.filter(id=booking.parent_booking_id).first()
            if parent:
                # Try to find order via parent
                credit_txn = UserCreditTransaction.objects.filter(
                    booking=parent
                ).first()
                if credit_txn:
                    order = credit_txn.order

        # Strategy 2: Find via credit transactions
        if not order:
            credit_txn = UserCreditTransaction.objects.filter(
                booking=booking
            ).first()
            if credit_txn:
                order = credit_txn.order

        # Strategy 3: Find by user, service, and approximate time
        if not order:
            # Look for orders around booking creation time
            from datetime import timedelta
            time_window_start = booking.created_at - timedelta(minutes=10)
            time_window_end = booking.created_at + timedelta(minutes=10)

            order = Order.objects.filter(
                user=booking.user,
                service=booking.service,
                created_at__gte=time_window_start,
                created_at__lte=time_window_end
            ).first()

        # Strategy 4: Create synthetic order if still not found
        if not order:
            print(f"  Creating synthetic order for booking {booking.id}")
            order = Order.objects.create(
                user=booking.user,
                service=booking.service,
                subtotal_amount_cents=booking.price_charged_cents,
                credits_applied_cents=booking.discount_amount_cents,
                total_amount_cents=booking.final_amount_cents,
                order_type='direct',
                status='completed',
                created_at=booking.created_at
            )

        if order:
            booking.order = order
            booking.save(update_fields=['order'])
            updated_count += 1
        else:
            missing_count += 1
            print(f"  WARNING: Could not find order for booking {booking.id}")

    print(f"\nOrder FK population complete:")
    print(f"  Updated: {updated_count}")
    print(f"  Missing: {missing_count}")


def reverse_populate_order_fk(apps, schema_editor):
    """Reverse migration - clear order FK"""
    Booking = apps.get_model('bookings', 'Booking')
    Booking.objects.update(order=None)


class Migration(migrations.Migration):
    dependencies = [
        ('bookings', '0XXX_add_order_fk'),
        ('payments', '0XXX_add_package_metadata'),
    ]

    operations = [
        migrations.RunPython(
            populate_order_fk,
            reverse_populate_order_fk
        ),
    ]
```

---

### Step 5.2: Migrate Parent Bookings to Package Metadata

**File:** `payments/migrations/0XXX_migrate_parent_bookings.py`

```python
from django.db import migrations
from django.utils import timezone

def migrate_parent_bookings(apps, schema_editor):
    """
    Migrate parent bookings to order metadata.

    For each parent booking:
    1. Find its order
    2. Populate order.package_metadata
    3. Ensure children point to order
    """
    Booking = apps.get_model('bookings', 'Booking')
    Order = apps.get_model('payments', 'Order')

    migrated_count = 0
    error_count = 0

    # Get all parent bookings
    parent_packages = Booking.objects.filter(is_package_purchase=True)
    parent_bundles = Booking.objects.filter(is_bundle_purchase=True)

    print(f"\nMigrating {parent_packages.count()} packages and {parent_bundles.count()} bundles...")

    def migrate_parent(parent, package_type):
        """Migrate a single parent booking"""
        try:
            # Get order
            if not parent.order_id:
                print(f"  WARNING: Parent booking {parent.id} has no order!")
                return False

            order = parent.order
            child_count = Booking.objects.filter(parent_booking=parent).count()

            if child_count == 0:
                print(f"  WARNING: Parent booking {parent.id} has no children!")

            # Calculate session value
            session_value_cents = (
                parent.price_charged_cents // child_count
                if child_count > 0 else 0
            )

            # Get completed count
            completed_count = Booking.objects.filter(
                parent_booking=parent,
                status='completed'
            ).count()

            # Update order
            order.order_type = package_type
            order.package_metadata = {
                'package_type': package_type,
                'total_sessions': child_count,
                'sessions_completed': completed_count,
                'session_value_cents': session_value_cents,
                'package_service_id': parent.service_id,
                'migrated_from_booking_id': parent.id,
                'migrated_at': timezone.now().isoformat()
            }
            order.save()

            # Ensure children point to order
            Booking.objects.filter(parent_booking=parent).update(order=order)

            print(f"  Migrated {package_type} {parent.id} → order {order.id}")
            return True

        except Exception as e:
            print(f"  ERROR migrating parent {parent.id}: {e}")
            import traceback
            traceback.print_exc()
            return False

    # Migrate packages
    for parent in parent_packages:
        if migrate_parent(parent, 'package'):
            migrated_count += 1
        else:
            error_count += 1

    # Migrate bundles
    for parent in parent_bundles:
        if migrate_parent(parent, 'bundle'):
            migrated_count += 1
        else:
            error_count += 1

    print(f"\nMigration complete:")
    print(f"  Successfully migrated: {migrated_count}")
    print(f"  Errors: {error_count}")


def reverse_migrate_parent_bookings(apps, schema_editor):
    """Reverse migration"""
    Order = apps.get_model('payments', 'Order')

    package_orders = Order.objects.filter(order_type__in=['package', 'bundle'])

    for order in package_orders:
        order.package_metadata = None
        order.order_type = 'direct'
        order.save()


class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_add_package_metadata'),
        ('bookings', '0XXX_populate_order_fk'),
    ]

    operations = [
        migrations.RunPython(
            migrate_parent_bookings,
            reverse_migrate_parent_bookings
        ),
    ]
```

---

### Step 5.3: Fix Existing Earnings

**File:** `payments/migrations/0XXX_fix_earnings_status.py`

```python
from django.db import migrations
from django.utils import timezone
from datetime import timedelta

def fix_earnings_status(apps, schema_editor):
    """
    Fix existing earnings transactions:
    1. Change 'pending' to 'projected' if booking not yet completed
    2. Fix available_after to be based on booking end_time
    """
    EarningsTransaction = apps.get_model('payments', 'EarningsTransaction')

    fixed_count = 0
    now = timezone.now()

    # Get all earnings with status='pending' where booking not completed
    pending_earnings = EarningsTransaction.objects.filter(status='pending')

    print(f"\nFixing {pending_earnings.count()} pending earnings...")

    for earnings in pending_earnings:
        booking = earnings.booking

        if booking.status not in ['completed', 'cancelled']:
            # Booking not yet completed - should be 'projected'
            earnings.status = 'projected'

            # Fix available_after
            if booking.end_time:
                earnings.available_after = booking.end_time + timedelta(hours=48)
            else:
                # No end time, use current + 48hrs
                earnings.available_after = now + timedelta(hours=48)

            earnings.save()
            fixed_count += 1
            print(f"  Fixed earnings {earnings.id}: pending → projected")

    print(f"\nFixed {fixed_count} earnings transactions")


def reverse_fix_earnings(apps, schema_editor):
    """Reverse - change projected back to pending"""
    EarningsTransaction = apps.get_model('payments', 'EarningsTransaction')
    EarningsTransaction.objects.filter(status='projected').update(status='pending')


class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_add_projected_status'),
    ]

    operations = [
        migrations.RunPython(
            fix_earnings_status,
            reverse_fix_earnings
        ),
    ]
```

---

## Phase 6: Cleanup

### Step 6.1: Remove Deprecated Fields (AFTER STABLE!)

**Only run this after 1+ week of stable operation**

**File:** `bookings/migrations/0XXX_remove_deprecated_fields.py`

```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('bookings', '0XXX_populate_order_fk'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='booking',
            name='parent_booking',
        ),
        migrations.RemoveField(
            model_name='booking',
            name='is_package_purchase',
        ),
        migrations.RemoveField(
            model_name='booking',
            name='is_bundle_purchase',
        ),
    ]
```

---

## Rollback Plan

### If Issues Arise

**Step 1: Stop Application**
```bash
docker-compose down
```

**Step 2: Revert Code**
```bash
git log --oneline
git revert <commit-hash>
git push origin main
```

**Step 3: Rollback Database**
```bash
# Restore from backup
cat backup_YYYYMMDD.sql | docker-compose exec -T db psql -U postgres estuary_db

# Or migrate backwards
python manage.py migrate bookings 0009_make_booking_times_nullable
python manage.py migrate payments 0XXX_before_changes
```

**Step 4: Restart**
```bash
docker-compose up -d
```

---

## Verification Checklist

### ✅ After Phase 1 (Models)
- [ ] 'projected' status exists in EarningsTransaction choices
- [ ] Can create earnings with status='projected'
- [ ] Booking.order FK exists
- [ ] Order.package_metadata field exists
- [ ] All migrations applied successfully

### ✅ After Phase 2 (Services)
- [ ] EarningsService creates with status='projected'
- [ ] available_after uses booking.end_time + 48hrs
- [ ] mark_booking_completed finds and updates projected earnings
- [ ] Package bookings use order.session_value_cents

### ✅ After Phase 3 (Factories)
- [ ] Package purchase creates Order with metadata
- [ ] Child bookings link to Order, not parent booking
- [ ] No earnings created for package purchase
- [ ] Orchestrator passes order_id to factories

### ✅ After Phase 4 (Testing)
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] E2E scenarios verified

### ✅ After Phase 5 (Migration)
- [ ] All existing bookings have order FK
- [ ] Parent bookings migrated to Order metadata
- [ ] Existing earnings fixed (projected vs pending)
- [ ] No orphaned data

### ✅ After Phase 6 (Cleanup)
- [ ] Deprecated fields removed
- [ ] No references to old fields in code
- [ ] System stable for 1+ week

---

## Success Criteria

Migration successful when:

1. **New bookings work correctly**
   - Direct: Earnings created as 'projected', become 'pending' on completion
   - Package: No immediate earnings, created per completed session
   - All link to Order

2. **Existing bookings migrated**
   - All have order FK populated
   - Parent bookings converted to Order metadata
   - Earnings status corrected

3. **Earnings lifecycle works**
   - projected → pending → available → paid_out
   - Timing correct (48hrs after completion, not booking)

4. **Package earnings work**
   - $400 package = 5 × $80 earnings
   - Commission calculated per session
   - Progress tracked in Order.package_metadata

5. **No data loss**
   - All bookings accounted for
   - All orders preserved
   - All earnings tracked

---

**End of Implementation Plan**

Ready to proceed? Start with Phase 1, Step 1.1!
