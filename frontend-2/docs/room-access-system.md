# Room Access System Documentation

## Overview
The room access system provides a unified way to join video rooms for all types of sessions (individual bookings, workshops, courses) using a single URL pattern based on the room's UUID.

## Architecture

### URL Structure
All room access goes through a single URL pattern:
```
/room/{room-public-uuid}/lobby  # Pre-join lobby
/room/{room-public-uuid}         # Main video room
```

### Backend Flow

#### 1. Room Access Check Endpoint
**Endpoint**: `GET /api/v1/rooms/{public_uuid}/check_access/`

**Response Structure**:
```json
{
  "can_join": true,
  "role": "host" | "participant" | "viewer",
  "reason": "string (if can_join is false)",
  "room": {
    "id": 123,
    "public_uuid": "uuid-string",
    "livekit_room_name": "room-name",
    "status": "active",
    "room_type": "individual" | "group" | "webinar"
  },
  "booking": {...},           // If access via booking
  "service_session": {...}    // If access via service session
}
```

#### 2. Access Permission Logic
The backend checks access in this order:

1. **Room Creator**: If user created the room → `role: "host"`

2. **Direct Booking Access**:
   - Practitioner of the booking → `role: "host"`
   - Client of the booking → `role: "participant"`
   - Booking must be "confirmed" or "in_progress"

3. **Service Session Access**:
   - Service practitioner → `role: "host"`
   - Workshop booking: `booking.service_session` matches session
   - Course booking: `booking.service` matches session's service
   - User must have confirmed booking

### Frontend Flow

#### 1. Simplified useRoomPermissions Hook
```typescript
export function useRoomPermissions({ roomId }: { roomId: string }) {
  const { data: accessData, isLoading, error } = useQuery({
    ...roomsCheckAccessRetrieveOptions({ 
      path: { public_uuid: roomId } 
    }),
    enabled: !!roomId && isAuthenticated
  });

  // Returns permissions object with canJoin, isHost, etc.
}
```

#### 2. Room Pages
- `/app/room/[roomId]/lobby/page.tsx` - Pre-join screen
- `/app/room/[roomId]/page.tsx` - Main video room

Both pages:
1. Call `check_access` endpoint
2. Show loading state
3. Handle permission denied
4. Render appropriate UI based on role

### Relationship Models

#### Individual Sessions
```
Booking → Room
  └── User (client)
  └── Practitioner (host)
```

#### Workshops
```
Service → ServiceSession → Room
            └── Booking → User
```
- Users book the workshop (creates booking with service_session)
- Each session has its own room

#### Courses
```
Service → ServiceSession(s) → Room
  └── Booking → User
```
- Users book the entire course (creates booking with service)
- Can access all session rooms for that course

## Migration from Old System

### Old System (Multiple Entry Points)
```
/room/booking/{bookingId}      # For individual sessions
/room/session/{sessionId}      # For workshop/course sessions
```

### New System (Single Entry Point)
```
/room/{roomUuid}              # For all room types
```

### Benefits
1. **Simplified Logic**: One endpoint handles all access checks
2. **Better Security**: Backend centralizes permission logic
3. **Cleaner URLs**: Room UUID is the single source of truth
4. **Fewer API Calls**: No need to fetch all user bookings
5. **Consistent UX**: Same flow for all room types

## Implementation Details

### Backend Implementation
File: `/backend/rooms/api/v1/views.py`

The `check_access` method:
1. Gets room by public_uuid
2. Checks user authentication
3. Determines access and role
4. Returns structured response

### Frontend Implementation
Files:
- `/components/video/hooks/useRoomPermissions.ts`
- `/app/room/[roomId]/lobby/page.tsx`
- `/app/room/[roomId]/page.tsx`

### Navigation Updates
When users click "Join Session":
```typescript
// Old way
href="/room/booking/123"
href="/room/session/456"

// New way
href={`/room/${booking.room.public_uuid}/lobby`}
href={`/room/${session.room.public_uuid}/lobby`}
```

## Testing

### Test Individual Session
1. Create a booking with a room
2. Navigate to `/room/{room-uuid}/lobby`
3. Verify practitioner sees host controls
4. Verify client can join as participant

### Test Workshop Session
1. Create workshop with sessions
2. Book the workshop
3. Navigate to session room via `/room/{room-uuid}/lobby`
4. Verify access based on booking

### Test Course Session
1. Create course with multiple sessions
2. Book the entire course
3. Navigate to any session room
4. Verify access to all course session rooms

## Error Handling

### Common Error Scenarios
1. **Not Authenticated**: Redirect to login
2. **No Permission**: Show reason (e.g., "No confirmed booking")
3. **Room Not Found**: 404 error
4. **Booking Cancelled**: "Booking is cancelled" message

### Error Response Example
```json
{
  "can_join": false,
  "role": "viewer",
  "reason": "No confirmed booking for this session",
  "room": {...}
}
```

## Future Enhancements

1. **Waiting Room**: Hold participants until host joins
2. **Guest Access**: Allow limited access with invite links
3. **Recording Permissions**: Granular control over who can record
4. **Room Scheduling**: Auto-open/close based on session times
5. **Analytics**: Track room usage and participant metrics