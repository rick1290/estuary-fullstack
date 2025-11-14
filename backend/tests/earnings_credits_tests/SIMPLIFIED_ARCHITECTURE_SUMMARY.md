# Simplified Package Architecture - Implementation Summary

## What Changed

### BEFORE (Redundant Parent Booking)
```
Package Purchase ($500, 3 sessions)
  ↓
  ├─ Parent Booking (ID: 172) ← REDUNDANT!
  │    - is_package_purchase: True
  │    - service: Wellness Package
  │    - price: $500
  │    - status: 'confirmed'
  │    - Never scheduled, never completed
  │
  └─ Child Bookings (3 sessions)
       - parent_booking_id: 172
       - service: Individual session services
       - status: 'draft'
```

**Problem:** Parent booking duplicates what Order already does!

### AFTER (Simplified - No Parent)
```
Order (ID: 145) ← Package purchase record
  - order_type: 'package'
  - package_metadata: {total_sessions: 3, ...}
  - created_at: Purchase timestamp
  ↓
  └─ Session Bookings ONLY (3 bookings)
       - No parent_booking ✓
       - order_id: 145 ✓
       - service: Individual session services
       - status: 'draft' (unscheduled)
       - start_time: None (until user schedules)
```

**Benefit:** Cleaner! Order IS the package purchase record.

---

## Code Changes

### 1. BookingFactory.create_package_booking()

**Before:**
```python
def create_package_booking(...):
    # Create parent
    parent = Booking.objects.create(
        is_package_purchase=True,
        price=package_price,
        ...
    )

    # Create children
    for service in children:
        Booking.objects.create(
            parent_booking=parent,
            ...
        )

    return parent  # Returns parent booking
```

**After:**
```python
def create_package_booking(...):
    created_bookings = []

    # Just create session bookings (no parent!)
    for service in children:
        booking = Booking.objects.create(
            order=order,  # Link to order, not parent
            status='draft',
            start_time=None,
            ...
        )
        created_bookings.append(booking)

    return created_bookings[0]  # Returns first session
```

### 2. BookingService._create_package_booking()

**Before:**
```python
parent = create_package_booking(...)
parent.status = 'confirmed'  # ✓ OK (parent has times)
parent.save()
```

**After:**
```python
first_session = create_package_booking(...)

# Update ALL sessions to paid
first_session.order.bookings.update(payment_status='paid')

# Only confirm if user provides start_time
if start_time_provided:
    first_session.start_time = start_time
    first_session.status = 'confirmed'  # ✓ OK (now has time)
    first_session.save()
# Otherwise stays draft (valid!)
```

### 3. FastCheckoutOrchestrator

**Before:**
```python
if booking.is_package_purchase:
    # Link children
    booking.child_bookings.update(order=order)
```

**After:**
```python
# Check order type, not booking flags
if order.order_type == 'package':
    # All sessions already linked by factory ✓
    logger.info(f"Package order has {count} sessions")
```

---

## Database Structure

### Example: $500 Package with 3 Sessions

```sql
-- Order table (package purchase record)
INSERT INTO payments_order (id, order_type, total_amount_cents, package_metadata)
VALUES (145, 'package', 50000, '{"total_sessions": 3, "session_value_cents": 16667}');

-- Bookings table (ONLY session bookings, no parent)
INSERT INTO bookings_booking (id, order_id, service_id, status, start_time, parent_booking_id)
VALUES
  (186, 145, 'session-1', 'draft', NULL, NULL),  -- Unscheduled
  (187, 145, 'session-2', 'draft', NULL, NULL),  -- Unscheduled
  (188, 145, 'session-3', 'draft', NULL, NULL);  -- Unscheduled
```

**Note:** No `is_package_purchase=True` booking! All are session bookings.

---

## Querying Packages

### Get package purchase info:
```python
order = Order.objects.get(id=145)
print(f"Package: {order.service.name}")
print(f"Purchased: {order.created_at}")
print(f"Price: ${order.total_amount_cents/100}")
print(f"Sessions: {order.total_sessions}")
print(f"Completed: {order.sessions_completed}")
```

### Get session bookings:
```python
sessions = order.bookings.all()
# Returns: 3 session bookings

# Filter by status
unscheduled = sessions.filter(status='draft')
scheduled = sessions.exclude(status='draft')
completed = sessions.filter(status='completed')
```

### No more parent_booking queries needed!
```python
# OLD (complicated)
parent = Booking.objects.get(is_package_purchase=True, order=order)
sessions = parent.child_bookings.all()

# NEW (simple)
sessions = order.bookings.all()
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Simpler** | 1 fewer database record per package |
| **Clearer** | Every Booking is a real session |
| **Less confusion** | No "is this a real booking?" checks |
| **Better semantics** | Order IS the purchase, Bookings ARE sessions |
| **Easier queries** | `order.bookings` = all sessions |
| **Backward compatible** | Old parent bookings still work, just deprecated |

---

## Validation Fix

### The Bug:
```python
# Factory creates draft booking
booking = Booking(status='draft', start_time=None)  # Valid!

# FastBookingService tried to confirm it
booking.status = 'confirmed'  # ✗ FAILS validation!
booking.save()  # Error: "Scheduled bookings must have a start time"
```

### The Fix:
```python
# Factory creates draft booking
booking = Booking(status='draft', start_time=None)  # Valid!

# FastBookingService only confirms IF time provided
if start_time:
    booking.start_time = start_time
    booking.status = 'confirmed'  # ✓ OK now!
    booking.save()
else:
    # Stays draft - valid!
    pass
```

---

## Migration Path

### Phase 1: ✅ DONE
- Updated factories to not create parent
- Updated services to handle new structure
- Added validation fix

### Phase 2: Future (Optional)
- Deprecate `is_package_purchase` flag
- Deprecate `parent_booking` FK
- Clean up old parent bookings

### Backward Compatibility
- Old parent bookings still work ✓
- Code checks `order.order_type` instead of `booking.is_package_purchase` ✓
- No breaking changes ✓

---

## Testing

Run simplified package test:
```bash
docker compose exec api python manage.py test_simplified_package --practitioner-id 5
```

Expected results:
- ✓ No parent booking created
- ✓ 3 session bookings created
- ✓ All linked to order
- ✓ Order has all package info
- ✓ Cleaner data model!

---

## Summary

**Before:** 4 bookings (1 parent + 3 sessions)
**After:** 3 bookings (sessions only)

**Before:** Order + Parent Booking both track package
**After:** Order IS the package record

**Result:** 25% fewer records, 100% clearer architecture! 🎉
