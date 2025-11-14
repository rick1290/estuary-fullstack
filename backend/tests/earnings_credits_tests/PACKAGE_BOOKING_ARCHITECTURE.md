# Package Booking Architecture

## Overview
Package bookings have a **parent-child structure** where:
- **Parent booking** = The package purchase itself
- **Child bookings** = Individual sessions included in the package

Both parent AND children are linked to the same `Order` for financial tracking.

---

## Database Structure

### Example: $500 Package with 3 Sessions

```
Order (ID: 141)
  - total_amount: $500
  - order_type: 'package'
  - package_metadata: {
      total_sessions: 3,
      sessions_completed: 0,
      session_value_cents: 16667  // $500 ÷ 3
    }
  ↓
  ├─ Parent Booking (ID: 172)
  │    - service: Wellness Package
  │    - order_id: 141 ✓
  │    - parent_booking_id: None
  │    - is_package_purchase: True
  │    - status: 'confirmed'
  │    - price_charged_cents: 50000
  │
  └─ Child Bookings (3 total)
       ├─ Child 1 (ID: 173)
       │    - order_id: 141 ✓
       │    - parent_booking_id: 172 ✓
       │    - status: 'draft' (unscheduled)
       │    - price_charged_cents: 0 (included)
       │
       ├─ Child 2 (ID: 174)
       │    - order_id: 141 ✓
       │    - parent_booking_id: 172 ✓
       │    - status: 'draft'
       │    - price_charged_cents: 0
       │
       └─ Child 3 (ID: 175)
            - order_id: 141 ✓
            - parent_booking_id: 172 ✓
            - status: 'draft'
            - price_charged_cents: 0
```

---

## Key Relationships

### Order FK (Primary Financial Link)
**Purpose:** Links bookings to the financial transaction
- ✅ Parent booking has `order` FK
- ✅ ALL child bookings have `order` FK (to the SAME order)
- Used for: Financial tracking, credit transactions, session value calculation

### Parent Booking FK (Hierarchical Link)
**Purpose:** Links children to their parent for session grouping
- ❌ Parent booking has `parent_booking = None`
- ✅ Child bookings have `parent_booking_id = 172`
- Used for: Counting sessions, progress tracking, UI grouping

---

## Why Both Relationships?

### Order FK
```python
# Find all bookings for a financial transaction (including children)
bookings = Booking.objects.filter(order_id=141)
# Returns: Parent + all 3 children

# Get session value for earnings calculation
session_value = booking.order.session_value_cents
```

### Parent Booking FK
```python
# Find child sessions for a package
children = parent_booking.child_bookings.all()
# Returns: Only the 3 children

# Check package progress
completed = children.filter(status='completed').count()
```

---

## Earnings Flow for Packages

### ❌ OLD (Wrong) - Single Earnings at Purchase
```
Package purchased ($500)
  → 1 earnings transaction created for $500
  → Practitioner can withdraw 48hrs after purchase
  → PROBLEM: Practitioner paid before delivering services!
```

### ✅ NEW (Correct) - Progressive Earnings per Session
```
Package purchased ($500)
  → No earnings created ✓
  → Just a purchase, not a service delivery

Session 1 completed
  → Earnings created: $166.67 (session_value_cents)
  → Status: 'projected'
  → When completed → 'pending'
  → 48hrs after completion → 'available'

Session 2 completed
  → Earnings created: $166.67
  → Same flow...

Session 3 completed
  → Earnings created: $166.67
  → Total paid to practitioner: $500 ✓
```

---

## Implementation Details

### 1. Package Purchase Flow
```python
# FastCheckoutOrchestrator
order = create_order(total=$500, order_type='package')

# BookingService creates parent + children
parent = BookingFactory.create_package_booking(...)
# This creates:
# - 1 parent booking
# - 3 child bookings (unscheduled, status='draft')

# Link order to ALL bookings
parent.order = order
parent.save()

# Link children to order (NEW FIX)
parent.child_bookings.update(order=order)
```

### 2. Session Scheduling
```python
# User schedules first session via dashboard
child = Booking.objects.get(id=173)
child.start_time = user_selected_time
child.end_time = user_selected_time + 1hr
child.status = 'confirmed'  # Scheduled!
child.save()
```

### 3. Session Completion
```python
# Celery task: mark-completed-bookings
if child.end_time < now:
    # Create earnings using session value
    earnings = create_booking_earnings(
        booking=child,
        gross_amount_cents=child.order.session_value_cents  # $166.67
    )
    # Status: 'projected'

    # Mark as completed
    mark_booking_completed(child)
    # Status changes: 'projected' → 'pending'
    # 48hr hold starts from NOW

    # Update package progress
    child.order.increment_sessions_completed()
    # package_metadata.sessions_completed: 0 → 1
```

---

## Migration History

### Before Fix (Service 58, Booking 172)
```
Parent: order_id = 141 ✓
Child 173: order_id = None ✗
Child 174: order_id = None ✗
Child 175: order_id = None ✗
```

### After Fix
```
Parent: order_id = 141 ✓
Child 173: order_id = 141 ✓
Child 174: order_id = 141 ✓
Child 175: order_id = 141 ✓
```

**Fixed by:**
1. Updated `FastCheckoutOrchestrator` to link children after parent creation
2. Ran data migration: `python manage.py migrate_order_relationships`
3. Migrated 9 existing child bookings

---

## Querying Patterns

### Get all bookings for an order (including children)
```python
Order.objects.get(id=141).bookings.all()
# Returns: 4 bookings (1 parent + 3 children)
```

### Get only the package purchase (parent)
```python
Booking.objects.get(order_id=141, is_package_purchase=True)
```

### Get child sessions for a package
```python
parent = Booking.objects.get(id=172)
children = parent.child_bookings.all()
```

### Check package progress
```python
order = Order.objects.get(id=141)
progress = f"{order.sessions_completed}/{order.total_sessions}"
# "1/3" after first session completed
```

---

## Testing

Run package earnings test:
```bash
docker compose exec api python manage.py test_package_earnings --practitioner-id 5
```

Expected results:
- ✅ Parent booking created (no earnings)
- ✅ 3 child bookings created
- ✅ All children have order FK
- ✅ First session completion creates earnings
- ✅ Earnings use session_value_cents ($166.67)
- ✅ Package progress tracking works

---

## Summary

**Key Points:**
1. ✅ Both parent AND children have `order` FK (same order)
2. ✅ Only children have `parent_booking` FK
3. ✅ No earnings on package purchase
4. ✅ Earnings created per session completion
5. ✅ Session value = total_price ÷ total_sessions
6. ✅ Progress tracked in `order.package_metadata`

This architecture ensures practitioners are only paid when they actually deliver services!
