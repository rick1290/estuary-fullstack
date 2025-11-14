# Migration Plan: Parent Booking → Order as Parent

**Version:** 1.0
**Created:** 2025-11-14
**Status:** Planning
**Estimated Time:** 2-3 days
**Risk Level:** Medium

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Phase 1: Preparation & Analysis](#phase-1-preparation--analysis)
4. [Phase 2: Schema Changes](#phase-2-schema-changes)
5. [Phase 3: Data Migration](#phase-3-data-migration)
6. [Phase 4: Code Updates](#phase-4-code-updates)
7. [Phase 5: Testing](#phase-5-testing)
8. [Phase 6: Cleanup & Finalization](#phase-6-cleanup--finalization)
9. [Phase 7: Rollback Plan](#phase-7-rollback-plan)
10. [Checklist](#checklist)
11. [Timeline](#timeline)

---

## Overview

### Goal
Remove parent bookings pattern and make Order the container for packages/bundles.

### Why This Change?

**Current Problem:**
- "Booking" represents two different concepts: appointments AND purchase containers
- Every query needs `.exclude(is_package_purchase=True)` to filter out containers
- Semantically confusing for developers
- Analytics queries are complex

**After Migration:**
- Booking = appointment only (clean semantics)
- Order = financial transaction (already its purpose)
- Package/bundle metadata stored on Order
- Simpler queries, clearer code

### Key Changes

| Before | After |
|--------|-------|
| Parent Booking (container) | Order with package_metadata |
| Child bookings link via `parent_booking` FK | Child bookings link via `order` FK |
| `is_package_purchase=True` flag | `order.order_type='package'` |
| Package data scattered | Package data in `order.package_metadata` |

---

## Architecture Deep Dive

### Data Relationships: Booking ↔ Order ↔ UserCreditTransaction

This section clarifies the critical relationships between bookings, orders, and credit transactions.

#### The Three-Way Relationship

```
Order (financial transaction)
  ├─── UserCreditTransaction(s) (purchase/usage/refund)
  │      ├─── Purchase: +$100 (value received)
  │      └─── Usage: -$100 (credits applied)
  │
  └─── Booking(s) (appointments)
         ├─── Booking 1 (order FK → Order)
         ├─── Booking 2 (order FK → Order)
         └─── Optional: credit_usage_transaction FK → UserCreditTransaction
```

#### Key Foreign Keys

**Booking Model:**
```python
class Booking:
    # PRIMARY RELATIONSHIP - ALL bookings have this
    order = ForeignKey(Order, related_name='bookings')
    # Every booking belongs to an order (financial transaction)

    # OPTIONAL AUDIT FIELD - only set when credits used
    credit_usage_transaction = ForeignKey(
        UserCreditTransaction,
        null=True, blank=True,
        related_name='bookings',
        help_text="Specific credit usage transaction (if credits applied)"
    )
    # Renamed from 'payment_transaction' for clarity
```

**UserCreditTransaction Model:**
```python
class UserCreditTransaction:
    order = ForeignKey(Order, related_name='user_credit_transactions')
    booking = ForeignKey(Booking, null=True, related_name='user_credit_transactions')
    # Both relationships exist - links to order AND optionally to booking
```

#### When Each FK is Set

| Scenario | Booking.order | Booking.credit_usage_transaction | UserCreditTransaction.booking |
|----------|---------------|----------------------------------|-------------------------------|
| **Direct booking, card only** | ✓ Set | NULL | NULL |
| **Direct booking, credits only** | ✓ Set | ✓ Set (optional) | ✓ Set |
| **Direct booking, mixed payment** | ✓ Set | ✓ Set (optional) | ✓ Set |
| **Package purchase** | ✓ Set | NULL | NULL |
| **Package child booking** | ✓ Set (same order) | NULL | NULL |

**Pattern:**
- `Booking.order` is ALWAYS set (primary relationship)
- `credit_usage_transaction` is set ONLY for direct bookings that use credits (convenience/audit)
- For packages, credits are at Order level, not per-booking

---

### Package Purchase Flow with Credits

**Example:** User buys 5-session package for $400, has $100 credits, pays $300 with card.

#### Step 1: Create Order
```python
Order.objects.create(
    user=user,
    order_type='package',
    subtotal_amount_cents=40000,      # $400
    credits_applied_cents=10000,      # $100 credits used
    total_amount_cents=30000,         # $300 charged to card
    package_metadata={
        'package_type': 'package',
        'total_sessions': 5,
        'sessions_completed': 0,
        'session_value_cents': 8000,  # $400 ÷ 5 = $80 per session
        'package_service_id': 123,
    }
)
```

#### Step 2: Create Credit Transactions (Paired Pattern)
```python
# Transaction 1: Value received (positive)
UserCreditTransaction.objects.create(
    user=user,
    order=order,
    booking=None,                     # No specific booking - this is for the package
    transaction_type='purchase',
    amount_cents=+40000,              # +$400 (value of package received)
    description="Package value received: 5-session coaching package"
)

# Transaction 2: Credits applied (negative)
UserCreditTransaction.objects.create(
    user=user,
    order=order,
    booking=None,                     # Credits applied to order, not individual bookings
    transaction_type='usage',
    amount_cents=-10000,              # -$100 (credits applied to package)
    description="Credits applied to package purchase"
)

# Net effect: +$400 - $100 = +$300 (matches card charge)
# User's credit balance impact: -$100 (they spent $100 credits)
```

**Why paired transactions?**
- Tracks value flow: Package worth $400, used $100 credits
- Prevents negative balances: +$400 then -$100 = +$300
- Audit trail: Can see both package value and credit usage
- Matches Order fields: `subtotal` ($400) and `credits_applied` ($100)

#### Step 3: Create Child Bookings
```python
for i in range(5):
    Booking.objects.create(
        user=user,
        order=order,                      # ✓ Links to parent order
        credit_usage_transaction=None,    # ✓ Credits at order level, not per-booking
        service=child_service,
        status='draft',                   # Unscheduled
        payment_status='paid',            # Already paid via package
        price_charged_cents=0,            # Included in package
        start_time=None,                  # Will be scheduled later
        end_time=None
    )
```

**Key Points:**
- All 5 bookings link to same Order via `order` FK
- `credit_usage_transaction` is NULL for all (credits at package level)
- Can't allocate $100 cleanly to 5 bookings ($20 each is arbitrary)
- Financial data comes from `booking.order`

---

### Credit Allocation: Order-Level vs Booking-Level

#### For Package/Bundle Orders

**Credits are allocated at ORDER level, not per-booking:**

```python
# Total credits on order
order.credits_applied_cents = 10000  # $100

# Per-session credit allocation (calculated when needed)
credits_per_session = order.credits_applied_cents / order.total_sessions
# $100 / 5 = $20 per session (calculated, not stored)
```

**Why not create 5 separate usage transactions?**

❌ **Problem 1:** Credits applied at purchase time, but bookings are drafts
- User hasn't scheduled yet
- Which booking gets which $20?
- What if they cancel booking #3 before scheduling it?

❌ **Problem 2:** User's balance wouldn't reflect commitment
- Buy package, no credit transactions yet
- User still has $100 credits available (wrong!)
- Cancel package → refund to where?

✓ **Solution:** Single usage transaction at order level
- User's balance immediately reflects $100 commitment
- Order stores total credits applied
- Calculate per-session when needed for refunds/analytics

---

### Earnings Calculation for Packages

When a package child booking is completed:

```python
def create_earnings_for_booking(booking):
    """Create earnings transaction for completed booking."""

    if booking.order.order_type in ['package', 'bundle']:
        # Use session value from package metadata
        gross_amount_cents = booking.order.session_value_cents  # $8000 ($80)

    else:
        # Use booking price (direct booking)
        gross_amount_cents = booking.price_charged_cents

    # Calculate commission on session value
    commission_rate = get_commission_rate(practitioner, service_type)
    commission_cents = int(gross_amount_cents * commission_rate / 100)
    net_amount_cents = gross_amount_cents - commission_cents

    # Create earnings transaction
    EarningsTransaction.objects.create(
        practitioner=booking.practitioner,
        booking=booking,
        gross_amount_cents=gross_amount_cents,  # $80 for package child
        commission_rate=commission_rate,
        commission_amount_cents=commission_cents,
        net_amount_cents=net_amount_cents,
        status='projected',  # Will change to 'pending' when booking completed
        available_after=booking.end_time + timedelta(hours=48)
    )
```

**Flow:**
1. User buys $400 package → No earnings created yet
2. Booking 1 completed → Create earnings for $80 (1/5 of package)
3. Booking 2 completed → Create earnings for $80 (2/5 of package)
4. All 5 completed → Total earnings = 5 × $80 = $400 ✓

**Commission calculated per session:**
- Package: $400 total, 5 sessions @ $80 each
- Commission: 15% of $80 = $12 per session
- Practitioner net: $68 per session
- Total after 5 sessions: 5 × $68 = $340

---

### Package Refunds with Partial Completion

**Scenario:** User completes 2 sessions, then requests refund

```python
order.package_metadata = {
    'total_sessions': 5,
    'sessions_completed': 2,  # Updated as bookings complete
    'session_value_cents': 8000,
}

# Calculate refund
sessions_used = 2
sessions_unused = 3
session_value = order.session_value_cents

# Value to refund
refund_value_cents = sessions_unused * session_value  # 3 × $80 = $240

# How much was credits vs card?
# Original: $400 package, $100 credits (25%), $300 card (75%)
credit_percentage = order.credits_applied_cents / order.subtotal_amount_cents
# $100 / $400 = 0.25 (25%)

# Allocate refund
credits_to_refund = int(refund_value_cents * credit_percentage)
# $240 × 0.25 = $60

card_to_refund = refund_value_cents - credits_to_refund
# $240 - $60 = $180

# Create refund transactions
UserCreditTransaction.objects.create(
    user=user,
    order=order,
    transaction_type='refund',
    amount_cents=+credits_to_refund,  # +$60 back to user
    description=f"Refund for {sessions_unused} unused sessions"
)

# Process Stripe refund for card portion
stripe.Refund.create(
    payment_intent=order.stripe_payment_intent_id,
    amount=card_to_refund  # $180
)
```

**This works because:**
- Order stores original `credits_applied_cents` and `subtotal_amount_cents`
- Can calculate credit percentage at refund time
- Each session has equal value (`session_value_cents`)
- Sessions completed tracked in `package_metadata.sessions_completed`

---

### Querying Financial Data

#### For any booking (package or direct):

```python
# Get the order
order = booking.order

# Total price paid
total = order.total_amount_cents

# Credits used
credits = order.credits_applied_cents

# Card charged
card = order.total_amount_cents  # After credits applied

# For packages, per-session credit allocation
if order.order_type in ['package', 'bundle']:
    credits_per_session = order.credits_applied_cents / order.total_sessions
    # $100 / 5 = $20 per session
```

#### Get all credit transactions for a booking's order:

```python
# All transactions (purchase, usage, refunds)
credit_txns = booking.order.user_credit_transactions.all()

# Just usage transactions
usage_txns = booking.order.user_credit_transactions.filter(
    transaction_type='usage'
)

# For packages, this gives you the single usage transaction at order level
# For direct bookings, gives you usage transaction for that booking
```

#### Direct booking with credits:

```python
# Option 1: Via order
booking.order.user_credit_transactions.filter(transaction_type='usage')

# Option 2: Via convenience FK (if set)
if booking.credit_usage_transaction:
    usage_txn = booking.credit_usage_transaction
```

---

### Important Architectural Decisions

#### Decision 1: Order FK is Primary Relationship

**Rationale:**
- ✓ Works for ALL payment types (card only, credits only, mixed, free)
- ✓ Works for packages (all children share same order)
- ✓ Semantic correctness: Booking fulfills an Order
- ✓ Future-proof: Add new payment methods without schema changes
- ✓ Query simplicity: `booking.order` gets all financial data

#### Decision 2: credit_usage_transaction is Optional Audit Field

**Rationale:**
- ✓ Convenience: Direct link to credit transaction for direct bookings
- ✓ Audit: Can track which specific transaction paid for booking
- ✓ Optional: NULL for card-only payments and package children
- ✓ Not required: Can always get via `booking.order.user_credit_transactions`

**Naming:** Renamed from `payment_transaction` to `credit_usage_transaction`
- More accurate: Points to UserCreditTransaction, not a general payment
- Clearer: Distinguishes from Stripe payments
- Specific: It's the USAGE transaction (negative), not purchase (positive)

#### Decision 3: Package Credits at Order Level

**Rationale:**
- ✓ Credits applied at purchase time (before bookings scheduled)
- ✓ User's balance reflects commitment immediately
- ✓ Single source of truth: Order.credits_applied_cents
- ✓ Refunds calculate proportionally from order data
- ✓ No arbitrary splitting ($100 into 5 pieces)

**Alternative considered:** Create usage transactions per booking when scheduled
- ❌ User balance wouldn't reflect package commitment
- ❌ Complex: Move credits from "pending" to "used" on scheduling
- ❌ Refund complexity: Which bookings to refund credits from?

#### Decision 4: Progressive Earnings (on Completion, not Purchase)

**Rationale:**
- ✓ Practitioner earns money when service delivered
- ✓ Prevents earnings for canceled/no-show bookings
- ✓ Fair: Payment tied to work performed
- ✓ 'projected' status tracks future earnings
- ✓ 'pending' status after completion (48hr hold)

**For packages:**
- No earnings at purchase (full $400)
- Earnings created when each child completed ($80 each)
- Total after all 5 sessions = $400 ✓

---

### Edge Cases & Considerations

#### Edge Case 1: Unequal Session Values

**Current assumption:** All sessions in package have equal value
- `session_value_cents` = $400 / 5 = $80

**What if package has different session types?**
- 3 × Massage ($100) = $300
- 2 × Consultation ($50) = $100
- Total: $400

**Options:**

**Option A:** Store per-session values in metadata
```json
{
  "session_values": [10000, 10000, 10000, 5000, 5000],
  "sessions_completed": 0
}
```
- Each child booking references its index
- Earnings use specific value, not average

**Option B:** Store value on child booking
```python
Booking.objects.create(
    order=order,
    package_session_value_cents=10000,  # This specific session worth $100
    ...
)
```
- Value stored at booking level
- Earnings use `booking.package_session_value_cents`

**Recommendation:** Start with equal values (simpler), add per-session values if needed.

---

#### Edge Case 2: Free Bookings

**Scenario:** Practitioner creates complimentary booking

```python
Order.objects.create(
    order_type='direct',
    subtotal_amount_cents=0,
    credits_applied_cents=0,
    total_amount_cents=0
)

Booking.objects.create(
    order=order,
    credit_usage_transaction=None,  # No payment at all
    price_charged_cents=0,
    payment_status='paid'  # Marked paid (nothing to pay)
)
```

**Works because:**
- `order` FK still set (every booking has an order)
- `credit_usage_transaction` = NULL (no credits used)
- No credit transactions created
- Practitioner may still get earnings (if configured)

---

#### Edge Case 3: Partial Refund Before All Sessions Completed

**Scenario:** User wants refund after 2 sessions, but 3 are still scheduled

```python
# User wants to cancel remaining 3 unscheduled bookings
# Sessions: 2 completed, 3 draft

# Cancel draft bookings
Booking.objects.filter(
    order=order,
    status='draft'
).update(status='cancelled')

# Refund unused value
sessions_unused = 3
refund_amount = sessions_unused * order.session_value_cents

# Process refund (proportional credits + card)
# ... (same as above)
```

**Complications:**
- What if 1 draft booking is already scheduled (has time slot)?
- Cancellation policy: 24hr notice required?
- Different refund amounts based on when canceled?

**Solution:** Refund policy logic at cancellation time
- Check each booking's scheduled time
- Apply cancellation policy per booking
- Aggregate refund amounts
- Some might be 100% refund, others 50% or 0%

---

### Summary: Key Takeaways

1. **Every Booking has `order` FK** - this is the primary financial relationship
2. **`credit_usage_transaction` is optional** - only set for direct bookings using credits
3. **Package credits at order level** - not split across child bookings
4. **Earnings use `session_value_cents`** - calculated at package purchase time
5. **Progressive earnings** - created when bookings completed, not at purchase
6. **Refunds are proportional** - based on sessions_completed and credit percentage
7. **Paired transactions** - track value flow (+purchase, -usage) for audit trail

---

## Phase 1: Preparation & Analysis

### Step 1.1: Audit Current Data

**Create management command:** `bookings/management/commands/audit_package_data.py`

```python
from django.core.management.base import BaseCommand
from bookings.models import Booking
from payments.models import Order

class Command(BaseCommand):
    help = 'Audit package/bundle data before migration'

    def handle(self, *args, **options):
        # Count parent bookings
        parent_packages = Booking.objects.filter(is_package_purchase=True)
        parent_bundles = Booking.objects.filter(is_bundle_purchase=True)

        self.stdout.write(f"Package parents: {parent_packages.count()}")
        self.stdout.write(f"Bundle parents: {parent_bundles.count()}")

        # Check for orphaned children
        orphaned = Booking.objects.filter(
            parent_booking__isnull=False,
            parent_booking__is_package_purchase=False,
            parent_booking__is_bundle_purchase=False
        )
        self.stdout.write(f"Orphaned children: {orphaned.count()}")

        # Check for packages without orders
        no_order = Booking.objects.filter(
            Q(is_package_purchase=True) | Q(is_bundle_purchase=True),
            order__isnull=True
        )
        self.stdout.write(f"Packages without orders: {no_order.count()}")

        # Sample data
        self.stdout.write("\nSample packages:")
        for parent in parent_packages[:5]:
            child_count = parent.child_bookings.count()
            self.stdout.write(
                f"  Package {parent.id}: {child_count} children, "
                f"${parent.price_charged_cents/100:.2f}, "
                f"Order: {parent.order_id if parent.order else 'None'}"
            )
```

**Run:**
```bash
python manage.py audit_package_data
```

**Expected Output:**
```
Package parents: 15
Bundle parents: 8
Orphaned children: 0
Packages without orders: 0

Sample packages:
  Package 123: 5 children, $400.00, Order: 456
  Package 124: 10 children, $800.00, Order: 457
  ...
```

**Action Required:**
- ✅ Fix any orphaned children
- ✅ Fix any packages without orders
- ✅ Review sample data for anomalies

---

### Step 1.2: Create Backup

```bash
# Local PostgreSQL
pg_dump estuary_db > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# Docker PostgreSQL
docker-compose exec db pg_dump -U postgres estuary_db > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_before_migration_*.sql
```

**Store backup safely** - you may need to rollback!

---

## Phase 2: Schema Changes

### Step 2.1: Add Fields to Order Model

**File:** `payments/models.py`

**Changes:**

```python
class Order(PublicModel):
    # ... existing fields ...

    # Update order_type choices
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

    # ✅ ADD: Package metadata field
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
```

**Create Migration:**
```bash
python manage.py makemigrations payments -n add_package_metadata
```

---

### Step 2.2: Add Helper Methods to Order

**File:** `payments/models.py`

**Add to Order class:**

```python
class Order(PublicModel):
    # ... fields ...

    @property
    def is_package_order(self):
        """True if this order is for a package purchase"""
        return self.order_type == 'package'

    @property
    def is_bundle_order(self):
        """True if this order is for a bundle purchase"""
        return self.order_type == 'bundle'

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

---

### Step 2.3: Update Booking Model

**File:** `bookings/models.py`

**Mark fields as deprecated (DO NOT DELETE YET):**

```python
class Booking(PublicModel):
    # ... existing fields ...

    # ⚠️ DEPRECATED - will be removed after migration
    parent_booking = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='child_bookings',
        help_text="DEPRECATED: Use order relationship instead"
    )

    # ⚠️ DEPRECATED
    is_package_purchase = models.BooleanField(
        default=False,
        help_text="DEPRECATED: Check order.order_type instead"
    )

    # ⚠️ DEPRECATED
    is_bundle_purchase = models.BooleanField(
        default=False,
        help_text="DEPRECATED: Check order.order_type instead"
    )
```

**Add new helper properties:**

```python
class Booking(PublicModel):
    # ... fields ...

    @property
    def is_package_child(self):
        """True if this is an unscheduled package/bundle session"""
        return (
            self.order and
            self.order.is_package_or_bundle and
            self.status == 'draft'
        )

    @property
    def is_scheduled_booking(self):
        """True if this is a scheduled appointment"""
        return (
            self.start_time is not None and
            self.status not in ['draft', 'cancelled']
        )

    @property
    def session_value(self):
        """Calculate session value based on order type"""
        if self.order and self.order.is_package_or_bundle:
            return self.order.session_value_cents
        return self.price_charged_cents
```

---

### Step 2.4: Add 'projected' Status to EarningsTransaction

**File:** `payments/models.py`

```python
class EarningsTransaction(BaseModel):
    """
    Model representing practitioner earnings from completed services.
    """
    TRANSACTION_STATUS = (
        ('projected', 'Projected'),  # ✅ ADDED - Future earnings not yet earned
        ('pending', 'Pending'),      # Waiting for 48hr hold after service delivery
        ('available', 'Available'),  # Ready for payout
        ('paid', 'Paid'),           # Included in a payout
        ('reversed', 'Reversed'),   # Refunded or canceled
    )

    # ... rest of model ...
```

**Create migration:**
```bash
python manage.py makemigrations payments -n add_projected_status
```

---

## Phase 3: Data Migration

### Step 3.1: Create Data Migration Script

**File:** `payments/migrations/0XXX_migrate_parent_bookings_to_orders.py`

```python
from django.db import migrations
from django.utils import timezone

def migrate_parent_bookings_to_orders(apps, schema_editor):
    """
    Migrate parent bookings to order metadata.

    For each parent booking:
    1. Update order.order_type to 'package' or 'bundle'
    2. Populate order.package_metadata with package data
    3. Ensure children point to order (should already)
    """
    Booking = apps.get_model('bookings', 'Booking')
    Order = apps.get_model('payments', 'Order')

    # Get all parent bookings
    parent_packages = Booking.objects.filter(is_package_purchase=True)
    parent_bundles = Booking.objects.filter(is_bundle_purchase=True)

    migrated_count = 0
    error_count = 0

    def migrate_parent(parent, package_type):
        """Migrate a single parent booking"""
        try:
            # Verify parent has order
            if not parent.order:
                print(f"WARNING: Parent booking {parent.id} has no order!")
                return False

            order = parent.order
            child_count = parent.child_bookings.count()

            if child_count == 0:
                print(f"WARNING: Parent booking {parent.id} has no children!")
                # Still migrate but note the issue

            # Calculate session value
            session_value_cents = (
                parent.price_charged_cents // child_count
                if child_count > 0 else 0
            )

            # Update order
            order.order_type = package_type
            order.package_metadata = {
                'package_type': package_type,
                'total_sessions': child_count,
                'sessions_completed': parent.child_bookings.filter(
                    status='completed'
                ).count(),
                'session_value_cents': session_value_cents,
                'package_service_id': parent.service_id,
                'migrated_from_booking_id': parent.id,
                'migrated_at': timezone.now().isoformat()
            }

            # Add expiration if exists
            if hasattr(parent, 'expires_at') and parent.expires_at:
                order.package_metadata['expires_at'] = parent.expires_at.isoformat()

            order.save()

            # Verify children point to order
            for child in parent.child_bookings.all():
                if child.order_id != order.id:
                    child.order = order
                    child.save(update_fields=['order'])

            return True

        except Exception as e:
            print(f"ERROR migrating parent {parent.id}: {e}")
            import traceback
            traceback.print_exc()
            return False

    # Migrate packages
    print(f"\nMigrating {parent_packages.count()} package parents...")
    for parent in parent_packages:
        if migrate_parent(parent, 'package'):
            migrated_count += 1
        else:
            error_count += 1

    # Migrate bundles
    print(f"\nMigrating {parent_bundles.count()} bundle parents...")
    for parent in parent_bundles:
        if migrate_parent(parent, 'bundle'):
            migrated_count += 1
        else:
            error_count += 1

    print(f"\nMigration complete:")
    print(f"  Successfully migrated: {migrated_count}")
    print(f"  Errors: {error_count}")

    if error_count > 0:
        print(f"\n⚠️  WARNING: {error_count} bookings failed to migrate!")
        print("Review errors above before proceeding.")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration - restore parent bookings from order metadata.
    Only reverses the order changes, doesn't delete parent bookings.
    """
    Order = apps.get_model('payments', 'Order')

    package_orders = Order.objects.filter(order_type__in=['package', 'bundle'])

    print(f"\nReversing {package_orders.count()} orders...")

    for order in package_orders:
        if not order.package_metadata:
            continue

        # Clear package metadata
        order.package_metadata = None
        order.order_type = 'direct'
        order.save()

    print("Reverse migration complete")


class Migration(migrations.Migration):
    dependencies = [
        ('payments', '0XXX_add_package_metadata'),  # Previous migration
        ('bookings', '0009_make_booking_times_nullable'),
    ]

    operations = [
        migrations.RunPython(
            migrate_parent_bookings_to_orders,
            reverse_migration
        ),
    ]
```

---

### Step 3.2: Run Data Migration

```bash
# Apply migrations
python manage.py migrate

# Expected output:
# Running migrations:
#   Applying payments.0XXX_migrate_parent_bookings_to_orders...
#   Migrating 15 package parents...
#   Migrating 8 bundle parents...
#   Migration complete:
#     Successfully migrated: 23
#     Errors: 0
```

---

### Step 3.3: Verify Data Migration

```bash
python manage.py shell
```

```python
from payments.models import Order
from bookings.models import Booking

# Check migrated orders
package_orders = Order.objects.filter(order_type='package')
bundle_orders = Order.objects.filter(order_type='bundle')

print(f"Package orders: {package_orders.count()}")
print(f"Bundle orders: {bundle_orders.count()}")

# Sample check
order = package_orders.first()
if order:
    print(f"\nOrder {order.id}:")
    print(f"  Order type: {order.order_type}")
    print(f"  Total sessions: {order.total_sessions}")
    print(f"  Completed: {order.sessions_completed}")
    print(f"  Session value: ${order.session_value_cents/100:.2f}")
    print(f"  Metadata: {order.package_metadata}")

    # Check children
    children = Booking.objects.filter(order=order)
    print(f"  Children: {children.count()}")
    for child in children[:3]:
        print(f"    - {child.service.name}: {child.status}")

# Verify no orphaned bookings
orphaned = Booking.objects.filter(
    parent_booking__isnull=False,
    order__isnull=True
)
print(f"\nOrphaned bookings: {orphaned.count()}")  # Should be 0
```

**Expected Output:**
```
Package orders: 15
Bundle orders: 8

Order 456:
  Order type: package
  Total sessions: 5
  Completed: 2
  Session value: $80.00
  Metadata: {'package_type': 'package', 'total_sessions': 5, ...}
  Children: 5
    - Coaching Session: draft
    - Coaching Session: completed
    - Coaching Session: completed

Orphaned bookings: 0
```

---

## Phase 4: Code Updates

### Step 4.1: Update BookingFactory

**File:** `bookings/models.py`

**Replace methods:**

```python
class BookingFactory:
    """Factory class for creating different types of bookings."""

    @classmethod
    def create_package_booking(cls, user, package_service, payment_data, **kwargs):
        """
        Create package purchase with child bookings.
        NO LONGER CREATES PARENT BOOKING.

        Args:
            user: User purchasing package
            package_service: Package service
            payment_data: Payment information
            order: Existing order (required)

        Returns:
            tuple: (order, list of child bookings)
        """
        from payments.models import Order

        # Get order (must be passed in)
        order = kwargs.get('order')
        if not order:
            raise ValueError("Order is required for create_package_booking")

        # Get child services and calculate values
        child_relationships = package_service.child_relationships.all()
        total_sessions = sum(rel.quantity for rel in child_relationships)
        session_value_cents = (
            payment_data['price_charged_cents'] // total_sessions
            if total_sessions > 0 else 0
        )

        # Update order with package metadata
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

        # Create child bookings
        children = []
        for rel in child_relationships:
            for _ in range(rel.quantity):
                child = Booking.objects.create(
                    user=user,
                    order=order,
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
                    )
                )
                children.append(child)

        return order, children

    @classmethod
    def create_bundle_booking(cls, user, bundle_service, payment_data, **kwargs):
        """
        Create bundle purchase with child bookings.
        NO LONGER CREATES PARENT BOOKING.

        Args:
            user: User purchasing bundle
            bundle_service: Bundle service
            payment_data: Payment information
            order: Existing order (required)

        Returns:
            tuple: (order, list of child bookings)
        """
        from payments.models import Order
        from services.models import Service

        # Get order
        order = kwargs.get('order')
        if not order:
            raise ValueError("Order is required for create_bundle_booking")

        # Get bundle configuration from service metadata
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

        # Add expiration if bundle has validity period
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
                )
            )
            children.append(child)

        return order, children
```

---

### Step 4.2: Update FastBookingService

**File:** `bookings/services/booking_service_fast.py`

```python
class FastBookingService:

    def _create_package_booking(self, user, service, booking_data, payment_data):
        """Create a package purchase."""
        # Order already created by orchestrator, pass it to factory
        from payments.models import Order

        # Find the order (passed in payment_data or created earlier)
        order_id = payment_data.get('order_id')
        order = Order.objects.get(id=order_id) if order_id else None

        order, children = BookingFactory.create_package_booking(
            user=user,
            package_service=service,
            payment_data=payment_data,
            order=order,
            client_notes=booking_data.get('special_requests', '')
        )

        # Return first child for compatibility
        return children[0] if children else None

    def _create_bundle_booking(self, user, service, booking_data, payment_data):
        """Create a bundle purchase."""
        from payments.models import Order

        order_id = payment_data.get('order_id')
        order = Order.objects.get(id=order_id) if order_id else None

        order, children = BookingFactory.create_bundle_booking(
            user=user,
            bundle_service=service,
            payment_data=payment_data,
            order=order,
            client_notes=booking_data.get('special_requests', '')
        )

        # Return first child for compatibility
        return children[0] if children else None
```

---

### Step 4.3: Update CheckoutOrchestrator

**File:** `payments/services/checkout_orchestrator_fast.py`

**Update `process_booking_payment_fast` method:**

```python
@transaction.atomic
def process_booking_payment_fast(self, user, service_id, payment_method_id, booking_data):
    try:
        # Steps 1-4: Get service, calculate pricing, create order, process payment
        # ... (existing code stays the same) ...

        # Step 5: Create credit transactions
        self.credit_service.create_booking_credit_transactions(
            user=user,
            service=service,
            order=order
        )

        # Step 6: Create booking(s) - UPDATED FOR PACKAGES/BUNDLES
        payment_data = {
            'price_charged_cents': service_price_cents,
            'credits_applied_cents': credits_to_apply_cents,
            'amount_charged_cents': amount_to_charge_cents,
            'payment_intent_id': payment_result.get('payment_intent', {}).id if payment_result.get('payment_intent') else None,
            'order_id': order.id  # Pass order ID
        }

        service_type_code = service.service_type.code

        if service_type_code == 'package':
            # Returns (order, children)
            order, children = BookingFactory.create_package_booking(
                user=user,
                package_service=service,
                payment_data=payment_data,
                order=order,  # Pass existing order
                **booking_data
            )
            booking = children[0] if children else None

        elif service_type_code == 'bundle':
            order, children = BookingFactory.create_bundle_booking(
                user=user,
                bundle_service=service,
                payment_data=payment_data,
                order=order,
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

        # Step 7: Update credit transaction with booking reference
        if booking:
            usage_transactions = order.user_credit_transactions.filter(
                transaction_type='usage',
                booking__isnull=True
            )
            for credit_txn in usage_transactions:
                credit_txn.booking = booking
                credit_txn.save()

        # Step 8: Queue earnings ONLY for non-package/bundle bookings
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

### Step 4.4: Update EarningsService

**File:** `payments/services/earnings_service.py`

**Update `create_booking_earnings` method:**

```python
@transaction.atomic
def create_booking_earnings(self, practitioner, booking, service, gross_amount_cents):
    """
    Create earnings transaction for a booking.
    UPDATED: Handles package/bundle child bookings.
    """
    if not practitioner:
        return None

    # Determine gross amount based on booking type
    if booking.order and booking.order.is_package_or_bundle:
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

    # Determine available_after based on booking end time
    if booking.end_time:
        available_after = booking.end_time + timedelta(hours=48)
    else:
        # Fallback if no end time (shouldn't happen for completed bookings)
        available_after = timezone.now() + timedelta(hours=48)

    # Create earnings transaction with 'projected' status
    earnings = EarningsTransaction.objects.create(
        practitioner=practitioner,
        booking=booking,
        gross_amount_cents=gross_amount_cents,
        commission_rate=commission_rate,
        commission_amount_cents=commission_amount_cents,
        net_amount_cents=net_amount_cents,
        status='projected',  # ✅ CHANGED from 'pending'
        available_after=available_after,
        description=f"Earnings from booking for {service.name}"
    )

    logger.info(
        f"Created projected earnings for practitioner {practitioner.id}: "
        f"${net_amount_cents/100:.2f} net (${commission_amount_cents/100:.2f} commission)"
    )

    return earnings
```

---

### Step 4.5: Update BookingService.mark_booking_completed

**File:** `bookings/services/booking_service.py`

**Update method:**

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
            status='projected'
        ).first()

        if earnings:
            earnings.status = 'pending'
            # Update available_after to 48 hours from completion
            earnings.available_after = timezone.now() + timedelta(hours=48)
            earnings.save(update_fields=['status', 'available_after', 'updated_at'])
            logger.info(f"Updated earnings transaction {earnings.id} to pending status")
        else:
            logger.warning(f"No projected earnings found for booking {booking.id}")
    except Exception as e:
        logger.error(f"Error updating earnings for booking {booking.id}: {e}")
        # Don't fail the completion if earnings update fails

    # If package/bundle child, update completion count
    if booking.order and booking.order.is_package_or_bundle:
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

---

### Step 4.6: Update Query Patterns Throughout Codebase

**Find old patterns:**

```bash
# Find files using old patterns
grep -r "is_package_purchase" --include="*.py" backend/
grep -r "is_bundle_purchase" --include="*.py" backend/
grep -r "parent_booking" --include="*.py" backend/
```

**Update patterns:**

#### OLD:
```python
# Finding packages
packages = Booking.objects.filter(is_package_purchase=True)

# Finding children
children = Booking.objects.filter(parent_booking__isnull=False)

# Excluding packages from queries
real_bookings = Booking.objects.exclude(
    is_package_purchase=True
).exclude(
    is_bundle_purchase=True
)
```

#### NEW:
```python
# Finding packages
packages = Order.objects.filter(order_type='package')

# Finding unscheduled children
children = Booking.objects.filter(
    order__order_type__in=['package', 'bundle'],
    status='draft'
)

# Only scheduled/real bookings (no exclusions needed!)
real_bookings = Booking.objects.filter(
    start_time__isnull=False,
    status__in=['scheduled', 'confirmed', 'completed']
)
```

**Key files to update:**
- `bookings/api/v1/views.py`
- `bookings/api/v1/serializers.py`
- `bookings/api/v1/filters.py`
- Any analytics/reporting code
- Dashboard queries

---

## Phase 5: Testing

### Step 5.1: Create Test Data

```python
# python manage.py shell

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from services.models import Service
from payments.models import PaymentMethod, Order
from payments.services.checkout_orchestrator_fast import FastCheckoutOrchestrator

User = get_user_model()

# Get or create test user
user, _ = User.objects.get_or_create(
    email='test@example.com',
    defaults={'username': 'testuser'}
)

# Create payment method (or use existing)
# payment_method = PaymentMethod.objects.filter(user=user).first()

# Get package service
package = Service.objects.filter(service_type__code='package').first()

if not package:
    print("No package service found!")
else:
    # Process payment
    orchestrator = FastCheckoutOrchestrator()
    result = orchestrator.process_booking_payment_fast(
        user=user,
        service_id=package.id,
        payment_method_id=payment_method.id,
        booking_data={
            'apply_credits': False,
            'special_requests': 'Test package purchase after migration'
        }
    )

    # Verify
    print(f"\n✅ Success: {result.success}")
    print(f"Order ID: {result.order.id}")
    print(f"Order type: {result.order.order_type}")
    print(f"Total sessions: {result.order.total_sessions}")
    print(f"Session value: ${result.order.session_value_cents/100:.2f}")
    print(f"Package metadata: {result.order.package_metadata}")

    # Check children
    from bookings.models import Booking
    children = Booking.objects.filter(order=result.order)
    print(f"\n✅ Children created: {children.count()}")
    for child in children:
        print(f"  - {child.service.name}: {child.status}, parent_booking={child.parent_booking}")
```

**Expected Output:**
```
✅ Success: True
Order ID: 789
Order type: package
Total sessions: 5
Session value: $80.00
Package metadata: {'package_type': 'package', ...}

✅ Children created: 5
  - Coaching Session: draft, parent_booking=None
  - Coaching Session: draft, parent_booking=None
  ...
```

---

### Step 5.2: Test Booking Completion Flow

```python
from bookings.models import Booking
from bookings.services.booking_service import BookingService
from payments.models import EarningsTransaction

# Get first draft child
child = Booking.objects.filter(
    order__order_type='package',
    status='draft'
).first()

if child:
    print(f"Testing child booking: {child.id}")

    # Schedule it
    child.start_time = timezone.now() + timedelta(days=1)
    child.end_time = child.start_time + timedelta(hours=1)
    child.status = 'scheduled'
    child.save()
    print(f"✅ Scheduled for: {child.start_time}")

    # Complete it (simulate task)
    booking_service = BookingService()
    booking_service.mark_booking_completed(child)
    print(f"✅ Marked as completed")

    # Verify earnings created with 'projected' status initially
    earnings = EarningsTransaction.objects.filter(booking=child).first()
    if earnings:
        print(f"\n✅ Earnings created:")
        print(f"  Status: {earnings.status}")  # Should be 'pending' (changed from projected)
        print(f"  Gross: ${earnings.gross_amount_cents/100:.2f}")
        print(f"  Commission: ${earnings.commission_amount_cents/100:.2f}")
        print(f"  Net: ${earnings.net_amount_cents/100:.2f}")
    else:
        print("❌ No earnings found!")

    # Verify order completion tracking
    child.order.refresh_from_db()
    print(f"\n✅ Package progress:")
    print(f"  Completed: {child.order.sessions_completed}/{child.order.total_sessions}")
    print(f"  Remaining: {child.order.sessions_remaining}")
```

---

### Step 5.3: Test Query Patterns

```python
from bookings.models import Booking
from payments.models import Order

# Test 1: Get user's packages (should use Order now)
packages = Order.objects.filter(
    user=user,
    order_type='package'
)
print(f"\n✅ User's packages: {packages.count()}")
for pkg in packages:
    print(f"  - Order {pkg.id}: {pkg.total_sessions} sessions, {pkg.sessions_completed} completed")

# Test 2: Get unscheduled sessions
unscheduled = Booking.objects.filter(
    order__user=user,
    order__order_type__in=['package', 'bundle'],
    status='draft'
)
print(f"\n✅ Unscheduled sessions: {unscheduled.count()}")

# Test 3: Get upcoming appointments (should NOT include drafts)
upcoming = Booking.objects.filter(
    order__user=user,
    start_time__gte=timezone.now(),
    status__in=['scheduled', 'confirmed']
)
print(f"\n✅ Upcoming appointments: {upcoming.count()}")

# Test 4: Verify no parent_booking references
has_parent = Booking.objects.filter(
    order__user=user,
    parent_booking__isnull=False
).count()
print(f"\n✅ Bookings with parent_booking: {has_parent}")  # Should be 0 for new bookings
```

---

### Step 5.4: Integration Tests

**File:** `tests/integration/test_package_migration.py`

```python
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from payments.models import Order, EarningsTransaction
from bookings.models import Booking
from bookings.services.booking_service import BookingService

class PackageMigrationTests(TestCase):

    def test_package_creation_no_parent_booking(self):
        """Test package creates order with metadata, not parent booking"""
        result = self.create_test_package()

        # Order assertions
        self.assertEqual(result.order.order_type, 'package')
        self.assertIsNotNone(result.order.package_metadata)
        self.assertEqual(result.order.total_sessions, 5)

        # Children exist
        children = Booking.objects.filter(order=result.order)
        self.assertEqual(children.count(), 5)

        # No parent booking used
        for child in children:
            self.assertIsNone(child.parent_booking)
            self.assertFalse(child.is_package_purchase)

    def test_progressive_earnings_on_completion(self):
        """Test earnings created when child completed, not at purchase"""
        result = self.create_test_package()

        # No earnings at purchase
        initial_earnings = EarningsTransaction.objects.count()
        self.assertEqual(initial_earnings, 0)

        # Schedule and complete first child
        child = Booking.objects.filter(order=result.order, status='draft').first()
        child.start_time = timezone.now()
        child.end_time = timezone.now() + timedelta(hours=1)
        child.status = 'scheduled'
        child.save()

        booking_service = BookingService()
        booking_service.mark_booking_completed(child)

        # Earnings created with projected status
        earnings = EarningsTransaction.objects.filter(booking=child).first()
        self.assertIsNotNone(earnings)
        self.assertEqual(earnings.status, 'pending')  # Changed from projected by mark_completed

        # Correct session value
        expected_value = result.order.session_value_cents
        self.assertEqual(earnings.gross_amount_cents, expected_value)

    def test_completion_tracking(self):
        """Test package completion count updates"""
        result = self.create_test_package()

        # Initial
        self.assertEqual(result.order.sessions_completed, 0)
        self.assertEqual(result.order.sessions_remaining, 5)

        # Complete first session
        child = Booking.objects.filter(order=result.order, status='draft').first()
        child.start_time = timezone.now()
        child.end_time = timezone.now() + timedelta(hours=1)
        child.save()

        booking_service = BookingService()
        booking_service.mark_booking_completed(child)

        # Count updated
        result.order.refresh_from_db()
        self.assertEqual(result.order.sessions_completed, 1)
        self.assertEqual(result.order.sessions_remaining, 4)

    def test_query_patterns(self):
        """Test new query patterns work correctly"""
        result = self.create_test_package()

        # Package orders query
        packages = Order.objects.filter(
            user=result.order.user,
            order_type='package'
        )
        self.assertGreater(packages.count(), 0)

        # Unscheduled sessions query
        unscheduled = Booking.objects.filter(
            order__user=result.order.user,
            order__order_type='package',
            status='draft'
        )
        self.assertEqual(unscheduled.count(), 5)

        # Scheduled appointments (should not include drafts)
        scheduled = Booking.objects.filter(
            order__user=result.order.user,
            start_time__isnull=False,
            status__in=['scheduled', 'confirmed']
        )
        # Initially 0 (all drafts)
        self.assertEqual(scheduled.count(), 0)
```

---

## Phase 6: Cleanup & Finalization

### Step 6.1: Remove Deprecated Fields

**⚠️ ONLY AFTER EVERYTHING WORKS!**

**File:** Create migration `bookings/migrations/0XXX_remove_deprecated_fields.py`

```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('bookings', '0XXX_previous_migration'),
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

**DO NOT RUN THIS** until:
- ✅ All tests pass
- ✅ Code fully updated
- ✅ Production verified (if already deployed)
- ✅ At least 1 week of stable operation

---

### Step 6.2: Update Documentation

**Update:** `backend/CREDITS_AND_EARNINGS_SYSTEM.md`

Add section at end:

```markdown
## Architecture Migration: Order as Parent

**Completed:** [DATE]
**Version:** 2.0

### What Changed

**Before:**
- Package/bundle purchases created "parent bookings" (bookings with no time)
- Child bookings linked via `parent_booking` foreign key
- Flags: `is_package_purchase`, `is_bundle_purchase`

**After:**
- Package/bundle data stored in `Order.package_metadata`
- Child bookings link directly to Order
- Order.order_type indicates 'package' or 'bundle'
- Booking model represents appointments only

### Breaking Changes

| Old Code | New Code |
|----------|----------|
| `booking.parent_booking` | `booking.order` |
| `booking.is_package_purchase` | `booking.order.order_type == 'package'` |
| `parent.price_charged_cents` | `order.package_metadata['session_value_cents']` |
| `Booking.objects.filter(is_package_purchase=True)` | `Order.objects.filter(order_type='package')` |

### Migration Impact

- ✅ Cleaner data model
- ✅ Simpler queries (no exclusions needed)
- ✅ Progressive earnings implemented
- ✅ Better semantics (Booking = appointment)
```

---

### Step 6.3: Update API Documentation

**Update OpenAPI/Swagger schemas:**

1. Package purchase endpoint returns Order, not Booking
2. Booking schema no longer includes `parent_booking`, `is_package_purchase`
3. Order schema includes `package_metadata` field
4. Add examples showing new structure

---

## Phase 7: Rollback Plan

### If Something Goes Wrong

#### Step 1: Revert Code Changes

```bash
# Identify commit to revert
git log --oneline

# Revert migration commit
git revert <migration-commit-hash>

# Push revert
git push origin main
```

---

#### Step 2: Restore Database

```bash
# Stop application
docker-compose down

# Restore from backup
cat backup_before_migration_YYYYMMDD_HHMMSS.sql | docker-compose exec -T db psql -U postgres estuary_db

# Or local:
psql estuary_db < backup_before_migration_YYYYMMDD_HHMMSS.sql

# Restart
docker-compose up -d
```

---

#### Step 3: Run Reverse Migration

```bash
# Migrate back to previous version
python manage.py migrate payments 0XXX_before_package_metadata
python manage.py migrate bookings 0009_make_booking_times_nullable

# Verify
python manage.py showmigrations
```

---

#### Step 4: Verify Rollback

```python
# python manage.py shell

from bookings.models import Booking
from payments.models import Order

# Check parent bookings exist
parents = Booking.objects.filter(is_package_purchase=True)
print(f"Parent bookings: {parents.count()}")

# Check children have parent references
children = Booking.objects.filter(parent_booking__isnull=False)
print(f"Children with parents: {children.count()}")

# Check orders don't have package metadata
packages = Order.objects.filter(order_type='package')
print(f"Package orders: {packages.count()}")  # Should be 0
```

---

## Checklist

### Pre-Migration
- [ ] Run `audit_package_data` command
- [ ] Review audit results, fix any issues
- [ ] Create database backup
- [ ] Verify backup is valid
- [ ] Review all code changes in this plan
- [ ] Notify team of migration window
- [ ] Schedule maintenance window (if needed)

### Schema Changes
- [ ] Add `package_metadata` to Order model
- [ ] Add helper methods to Order
- [ ] Mark deprecated fields in Booking
- [ ] Add 'projected' status to EarningsTransaction
- [ ] Create migrations
- [ ] Review migration files

### Data Migration
- [ ] Create data migration script
- [ ] Test migration on copy of production data
- [ ] Run migration
- [ ] Verify migration output (no errors)
- [ ] Check sample migrated data
- [ ] Verify no orphaned bookings

### Code Updates
- [ ] Update BookingFactory.create_package_booking()
- [ ] Update BookingFactory.create_bundle_booking()
- [ ] Update FastBookingService
- [ ] Update FastCheckoutOrchestrator
- [ ] Update EarningsService
- [ ] Update BookingService.mark_booking_completed()
- [ ] Find and update all query patterns
- [ ] Update API views
- [ ] Update serializers
- [ ] Update filters

### Testing
- [ ] Test package creation (new purchases)
- [ ] Test bundle creation
- [ ] Test child booking scheduling
- [ ] Test booking completion
- [ ] Test earnings creation (projected status)
- [ ] Test earnings transition (projected → pending)
- [ ] Test completion tracking
- [ ] Test all query patterns
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Manual QA testing

### Documentation
- [ ] Update CREDITS_AND_EARNINGS_SYSTEM.md
- [ ] Update API documentation
- [ ] Update developer onboarding docs
- [ ] Create migration notes
- [ ] Document breaking changes

### Cleanup (AFTER STABLE)
- [ ] Remove deprecated fields (wait 1+ week)
- [ ] Delete old parent bookings (optional)
- [ ] Archive migration files
- [ ] Update team

### Post-Migration Monitoring
- [ ] Monitor error logs for 48 hours
- [ ] Check Sentry for new errors
- [ ] Verify production package purchases work
- [ ] Verify earnings are created correctly
- [ ] Check analytics dashboards
- [ ] User acceptance testing

---

## Timeline

### Day 1: Preparation & Schema
**Morning (2-3 hours):**
- [ ] Run audit, review data
- [ ] Create backup
- [ ] Add fields to models
- [ ] Create migrations
- [ ] Review migration code

**Afternoon (2-3 hours):**
- [ ] Run migrations
- [ ] Verify data migration
- [ ] Check sample records
- [ ] Fix any migration issues

### Day 2: Code Updates
**Morning (3-4 hours):**
- [ ] Update factory methods
- [ ] Update services
- [ ] Update orchestrator
- [ ] Update earnings service

**Afternoon (3-4 hours):**
- [ ] Find and update queries
- [ ] Update API views/serializers
- [ ] Initial testing
- [ ] Fix any bugs found

### Day 3: Testing & Finalization
**Morning (2-3 hours):**
- [ ] Integration testing
- [ ] End-to-end testing
- [ ] Manual QA
- [ ] Bug fixes

**Afternoon (2-3 hours):**
- [ ] Final verification
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Final checks before production

### Optional Day 4: Production Deployment
- [ ] Deploy to production
- [ ] Monitor logs
- [ ] Verify first real transactions
- [ ] Be available for issues

---

## Success Criteria

Migration is successful when:

✅ **Data:**
- All parent bookings migrated to order metadata
- All children reference orders correctly
- No orphaned bookings
- No data loss

✅ **Functionality:**
- New package purchases work correctly
- Child bookings can be scheduled
- Completion tracking works
- Progressive earnings work
- Queries return correct results

✅ **Code Quality:**
- No references to deprecated fields (except migration)
- All tests pass
- No new errors in logs
- Performance maintained or improved

✅ **Documentation:**
- Architecture changes documented
- Breaking changes listed
- Migration process recorded
- Team understands changes

---

## Notes & Considerations

### Performance Impact
- Queries may be faster (fewer exclusions needed)
- JSON field queries slightly slower than boolean fields
- Overall: Negligible difference expected

### Backward Compatibility
- Old parent bookings remain in database until cleanup
- Deprecated fields kept temporarily
- Gradual rollout possible

### Future Enhancements
After migration stable:
- Add package usage analytics
- Add expiration handling
- Add package transfer features
- Optimize package_metadata structure

---

## Questions & Decisions

**Decision Log:**

1. **Keep parent bookings or delete?**
   - Decision: Keep until cleanup phase (safer)
   - Rationale: Allows rollback if needed

2. **JSON vs separate fields for metadata?**
   - Decision: JSON for flexibility
   - Rationale: Package types may evolve

3. **When to create earnings?**
   - Decision: When child completed (progressive)
   - Rationale: Safer, pays for delivered services

4. **What status for initial earnings?**
   - Decision: 'projected'
   - Rationale: Clear distinction from delivered services

---

**End of Migration Plan**

Ready to begin? Start with Phase 1, Step 1.1!
