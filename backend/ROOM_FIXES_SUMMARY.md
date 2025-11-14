# Room System Fixes - Summary

## Problem
Room access was inconsistent across different service types. Code tried to access `booking.livekit_room` but workshop/course bookings don't have direct rooms - they use `booking.service_session.livekit_room`.

## Solution: Helper Property Pattern

Added a **helper property** on the Booking model that unifies room access:

```python
# bookings/models.py:309
@property
def room(self):
    """Get the video room for this booking (direct or via service_session)."""
    # Individual sessions have direct room FK
    if hasattr(self, 'livekit_room') and self.livekit_room:
        return self.livekit_room

    # Workshops/courses use service_session room
    if self.service_session and hasattr(self.service_session, 'livekit_room'):
        return self.service_session.livekit_room

    return None
```

## Changes Made

### 1. **Added `booking.room` Property** (`bookings/models.py:309-329`)
- Returns direct room for individual sessions
- Returns service_session room for workshops/courses
- Returns None if no room exists
- Single unified API: just use `booking.room`

### 2. **Fixed Workshop Signal** (`rooms/signals.py`)
**Issue**: Signal wasn't creating rooms for ServiceSessions

**Fixes**:
- Line 52: Changed `service_type.slug` → `service_type.code`
- Line 63: Changed `service.practitioner` → `service.primary_practitioner`
- Line 365: Fixed `_requires_video_room()` to check `service.location_type`

### 3. **Updated Notification Services**
Updated to use `booking.room` instead of complex checks:

**`notifications/services/client_notifications.py`**:
- Line 162: Simplified room check
- Line 175: Use `booking.room` for location fallback
- Line 352: Simplified reminder room check
- Line 366: Use `booking.room` for reminder location

**`notifications/services/practitioner_notifications.py`**:
- Line 180: Simplified room check
- Line 193: Use `booking.room` for location fallback
- Line 452: Simplified reminder room check
- Line 463: Use `booking.room` for reminder location

## Test Results

### ✅ Individual Sessions (1-on-1)
- Room created with booking FK
- `booking.room` returns direct room
- Type: `individual`, max participants: 2

### ✅ Workshops (Group Sessions)
- Room created when ServiceSession created (via signal)
- `booking.room` returns `service_session.livekit_room`
- Type: `group`, max participants: 25-100
- Multiple bookings share one room

### ✅ Packages
- Room created for each scheduled session
- `booking.room` returns direct room per session
- Type: `individual`, max participants: 2
- Draft sessions have no room until scheduled

### ⚠️ Bundles
- Would work same as packages
- Test service needs child relationships configured

## Architecture Summary

| Service Type | Room Linked To | booking.room Returns |
|--------------|----------------|---------------------|
| **Session** | `booking.livekit_room` | Direct room FK |
| **Workshop** | `service_session.livekit_room` | Session's room |
| **Course** | `service_session.livekit_room` | Session's room (per class) |
| **Package** | `booking.livekit_room` | Direct room per session |
| **Bundle** | `booking.livekit_room` | Direct room per session |

## Benefits

1. ✅ **Single code path**: Just use `booking.room` everywhere
2. ✅ **Backwards compatible**: Old code still works
3. ✅ **No migration needed**: Pure Python property
4. ✅ **Type safe**: Returns Room instance or None
5. ✅ **Self-documenting**: Clear docstring explains behavior

## Usage Examples

```python
# Before (error-prone)
if hasattr(booking, 'livekit_room') and booking.livekit_room:
    room = booking.livekit_room
elif booking.service_session and booking.service_session.livekit_room:
    room = booking.service_session.livekit_room
else:
    room = None

# After (simple)
room = booking.room

# Works everywhere
if booking.room:
    video_url = f"{FRONTEND_URL}/room/{booking.room.public_uuid}"
    location = booking.location.name if booking.location else ('Virtual' if booking.room else 'TBD')
```

## Next Steps

1. ~~Add helper property to Booking model~~ ✅
2. ~~Fix workshop signal bugs~~ ✅
3. ~~Update notification services~~ ✅
4. Update any remaining code using `booking.livekit_room` directly
5. Consider adding similar helper for `service_session.room`
