# Bookings App

## Overview
The bookings app manages all booking/reservation logic for the Estuary platform. After a major architecture refactoring, ALL scheduling data now lives in ServiceSession, and Booking represents a "seat" or "reservation" in a ServiceSession.

## Core Architecture

### Booking = Seat/Reservation
A Booking is now a lightweight reservation that links:
- **User** (who booked)
- **ServiceSession** (when/where)
- **Order** (payment)
- **Status** (confirmed, attended, completed, etc.)

### ServiceSession = Time Slot
ServiceSession (from services app) stores ALL time-related data:
- `start_time`, `end_time`
- `actual_start_time`, `actual_end_time`
- `max_participants`, `current_participants`

**Key Rule**: Every scheduled booking MUST have a `service_session`.

## Booking Patterns by Service Type

### 1. Individual Sessions (1-on-1)
**User books** → ServiceSession created → 1 Booking created

```python
# Create ServiceSession
session = ServiceSession.objects.create(
    service=service,
    session_type='individual',
    visibility='private',
    start_time=user_selected_time,
    end_time=user_selected_time + timedelta(hours=1),
    max_participants=1
)

# Create booking
booking = Booking.objects.create(
    user=user,
    service=service,
    service_session=session,
    status='confirmed'
)
```

### 2. Workshops (Group Events)
**Practitioner creates workshop** → ServiceSession pre-created → Multiple users book → N Bookings created

```python
# Practitioner creates workshop
session = ServiceSession.objects.create(
    service=workshop,
    session_type='workshop',
    visibility='public',
    start_time=workshop_time,
    max_participants=25
)

# Users book
booking = Booking.objects.create(
    user=user,
    service=workshop,
    service_session=session,  # All bookings reference same session
    status='confirmed'
)
```

### 3. Courses (Multi-Session Programs)
**Practitioner creates course** → N ServiceSessions pre-created (one per class) → User enrolls → N Bookings created (one per session)

**Payment Flow:**
1. User purchases course → Single payment/Order created
2. System creates N Bookings (one per ServiceSession)
3. All bookings link to same Order
4. Each booking tracks individual attendance

```python
# Practitioner creates course with sessions
course = Service.objects.create(
    service_type='course',
    name='8-Week Mindfulness',
    price_cents=20000  # $200 total
)

# Create 8 weekly sessions
for week in range(8):
    ServiceSession.objects.create(
        service=course,
        session_type='course_session',
        sequence_number=week + 1,
        start_time=start_date + timedelta(weeks=week),
        end_time=start_date + timedelta(weeks=week, hours=1.5)
    )

# User enrolls - creates 8 bookings
bookings = BookingFactory.create_course_booking(
    user=user,
    course=course,
    order=order  # Single order for all
)
# Result: 8 Bookings created, each with:
# - service = course
# - service_session = one of the 8 sessions
# - order = same order
# - price_charged_cents = 0 (paid at course level)
```

**Key Points:**
- ✅ Payment happens ONCE (at course level)
- ✅ N bookings created (one per session)
- ✅ Each booking can be individually tracked (attended, missed, completed)
- ✅ Order.bookings.all() shows all course sessions
- ✅ Calendar API shows N events (one per session with attendees)

### 4. Packages (Mix of Services)
**User purchases package** → N ServiceSessions created (draft/unscheduled) → N Bookings created → User schedules later

```python
# Package: 1 consultation + 3 massages + 2 yoga
package_bookings = BookingFactory.create_package_booking(
    user=user,
    package_service=package,
    order=order
)

# Creates 6 draft bookings:
# - 1 consultation booking (unscheduled)
# - 3 massage bookings (unscheduled)
# - 2 yoga bookings (unscheduled)

# User schedules each session later
# Each booking.service_session.start_time = NULL initially
```

### 5. Bundles (Bulk Same Service)
**User purchases bundle** → N ServiceSessions created (draft) → N Bookings created → User schedules later

```python
# Bundle: 10-class yoga pass
bundle_bookings = BookingFactory.create_bundle_booking(
    user=user,
    bundle_service=bundle,  # "10-Class Yoga Pass"
    order=order
)

# Creates 10 draft yoga bookings, each with:
# - service = the actual yoga class service
# - service_session = draft session (start_time=NULL)
# - status = 'draft' (until scheduled)
```

## Order Relationship

The `Order` model (from payments app) represents the financial transaction. For multi-booking purchases:

- **Course**: 1 Order → N Bookings (one per session)
- **Package**: 1 Order → N Bookings (one per included service)
- **Bundle**: 1 Order → N Bookings (N copies of same service)
- **Individual/Workshop**: 1 Order → 1 Booking

Access all bookings for an order:
```python
order.bookings.all()  # Returns QuerySet of all bookings
```

## Calendar Integration

The calendar API (`/api/v1/calendar/`) shows ServiceSessions with their bookings:

```python
# For courses - shows 7 separate calendar events
course_sessions = ServiceSession.objects.filter(
    service__service_type__code='course',
    service__primary_practitioner=practitioner
)

for session in course_sessions:
    event = {
        'service_session_id': session.id,
        'start_time': session.start_time,
        'attendees': session.bookings.all(),  # All enrolled students
        'attendee_count': session.bookings.count()
    }
```

This works naturally for:
- **Workshops**: 1 session → many bookings (all attendees)
- **Courses**: N sessions → many bookings per session (enrolled students)
- **Individual**: 1 session → 1 booking (single client)

## Booking Status Flow

```
draft → pending_payment → confirmed → in_progress → completed
                                  ↘ canceled
                                  ↘ no_show
```

## Key Differences from Old Architecture

### ❌ Old Way (REMOVED)
```python
# Each booking stored its own times
booking.start_time = ...
booking.end_time = ...
booking.parent_booking = parent  # For courses/packages
```

### ✅ New Way
```python
# Times stored in ServiceSession
session.start_time = ...
session.end_time = ...

# Booking references session
booking.service_session = session
booking.get_start_time()  # Accessor method

# Multiple bookings linked via Order
booking.order = order
order.bookings.all()  # Get all related
```

## Migration Notes

All legacy fields removed:
- `booking.start_time` → `booking.service_session.start_time`
- `booking.end_time` → `booking.service_session.end_time`
- `booking.parent_booking` → `booking.order.bookings.all()`
- `booking.timezone` → `booking.service_session.timezone`

Use accessor methods for backward compatibility:
```python
booking.get_start_time()  # Returns service_session.start_time
booking.get_end_time()    # Returns service_session.end_time
```

## Best Practices

1. **Always create ServiceSession first** (except for unscheduled bookings)
2. **Link all related bookings via Order** (courses, packages, bundles)
3. **Use BookingFactory methods** for complex booking types
4. **Track attendance per booking** (not per session)
5. **Query ServiceSessions for calendar views** (not bookings)

## Common Queries

```python
# Get all sessions for a practitioner's calendar
ServiceSession.objects.filter(
    service__primary_practitioner=practitioner
).prefetch_related('bookings')

# Get all course bookings for a user
user.bookings.filter(service__service_type__code='course')

# Get all sessions for a course enrollment (via order)
order.bookings.all()  # All session bookings for this course

# Check course completion
course_bookings = order.bookings.all()
completed = course_bookings.filter(status='completed').count()
total = course_bookings.count()
completion_rate = (completed / total) * 100
```
