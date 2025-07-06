# Rooms App - LiveKit Video Conferencing

## Overview
The rooms app provides video conferencing functionality for the Estuary platform using LiveKit, a modern WebRTC infrastructure. It supports individual sessions, group workshops, courses, and phone dial-in capabilities.

## Architecture

### Core Models

#### Room
The main model representing a video conference room:
- **Linked to either**: Booking (1-on-1 sessions) OR ServiceSession (group workshops/courses)
- **Room types**: individual, group, webinar, broadcast
- **LiveKit integration**: Stores room name, SID, and configuration
- **Phone support**: Optional dial-in with PIN
- **Auto-created**: LiveKit rooms are created automatically when first participant joins

#### RoomTemplate
Predefined configurations for different room types:
- Individual consultations (2 participants, no recording)
- Group workshops (25 participants, optional recording)
- Webinars (100 participants, view-only mode)
- Broadcast mode (1000+ viewers)

#### RoomParticipant
Tracks who joined sessions:
- Entry/exit times for billing
- Connection quality metrics
- Role (host, participant, viewer)
- Phone vs video participation

#### RoomRecording
Manages session recordings:
- LiveKit recording ID and status
- Storage location (S3/R2)
- Access permissions
- Processing status

## Room Lifecycle

### 1. Creation
```
Booking Confirmed → Signal fires → Room created in Django
                                   ↓
                            Status: 'pending'
                            Unique room name generated
                            Empty timeout set (300s default)
```

### 2. Joining
```
User visits /room/booking/{id}/lobby → Pre-join screen
                                      ↓
                              Tests devices
                                      ↓
                    Clicks join → Gets token from backend
                                      ↓
                       Connects to LiveKit cloud
                                      ↓
                 LiveKit auto-creates room (if enabled)
                                      ↓
                     Room status → 'active'/'in_use'
```

### 3. During Session
- Participants tracked via webhooks
- Real-time participant count updates
- Optional recording
- Screen sharing support
- Chat (for group rooms)

### 4. Leaving/Closing
```
Participant leaves → Webhook received → Update participant record
                                      ↓
                          Last participant leaves?
                                      ↓
                                    Yes
                                      ↓
                    Schedule closure after empty_timeout
                                      ↓
                    Room closes → Status: 'ended'
                                ↓
                    Update booking to 'completed'
```

## Token Generation

### How it works:
1. Frontend requests token via API
2. Backend validates user has permission (is participant or practitioner)
3. Token generated with:
   - User identity (e.g., "9-richard.j.nielsen@gmail.com")
   - Display name
   - Room name
   - Permissions (host vs participant)
   - 4-hour expiry

### Token structure:
```json
{
  "iss": "API_KEY",
  "sub": "user-identity",
  "iat": 1234567890,
  "exp": 1234567890,
  "name": "Display Name",
  "video": {
    "room": "individual-829b8d608f60",
    "roomJoin": true,
    "canPublish": true,
    "canSubscribe": true,
    "canPublishData": true
  }
}
```

### Implementation:
- Uses LiveKit Python SDK
- Falls back to manual JWT generation if SDK fails
- Different permissions for hosts vs participants

## Webhook Integration

### Events Handled:
- `room_started` - Room becomes active
- `room_finished` - Room ends
- `participant_joined` - Someone joins
- `participant_left` - Someone leaves
- `track_published` - Camera/mic/screen share started
- `track_unpublished` - Media stopped
- `egress_started/ended` - Recording events

### Configuration:
1. Set webhook URL in LiveKit dashboard: `https://your-domain.com/api/webhooks/livekit/`
2. Backend verifies webhook signatures
3. Updates Django models based on events

## API Endpoints

### Room Access:
- `GET /api/v1/rooms/{room_uuid}/` - Get room details
- `POST /api/v1/rooms/{room_uuid}/get_token/` - Get access token
- `POST /api/v1/rooms/booking/{booking_id}/join/` - Join via booking

### Recording:
- `POST /api/v1/rooms/{room_name}/start_recording/` - Start recording
- `POST /api/v1/rooms/{room_name}/stop_recording/` - Stop recording

## Frontend Integration

### Pages:
- `/room/booking/{id}/lobby` - Pre-join screen with device testing
- `/room/booking/{id}` - Main video room
- `/room/session/{id}` - For group sessions
- `/room/{room_uuid}` - Direct room access

### Components:
- `PreJoinScreen` - Device testing and settings
- `VideoRoom` - Main LiveKit room wrapper
- `ParticipantTile` - Individual video tiles
- `ControlBar` - Camera/mic/screen controls

### Hooks:
- `useRoomToken` - Fetches access token
- `useRoomPermissions` - Determines user role
- `useRoomInfo` - Gets room details

## Configuration

### Environment Variables:
```bash
# LiveKit Cloud
LIVEKIT_HOST=https://your-instance.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Optional
LIVEKIT_SIP_ENABLED=false  # Phone dial-in
LIVEKIT_DEFAULT_RECORDING_ENABLED=false
```

### Room Settings:
- `empty_timeout`: 300 seconds (5 minutes) - configurable per room
- `max_participants`: Based on room type
- `recording_enabled`: Based on service settings
- Auto-create rooms: Enable in LiveKit dashboard

## Common Scenarios

### 1. Individual Session (Therapy, Coaching)
- Room type: 'individual'
- Max 2 participants
- Screen sharing enabled
- No recording by default
- 1-on-1 layout with picture-in-picture

### 2. Group Workshop
- Room type: 'group'
- Max 25 participants
- Grid layout
- Optional recording
- Chat enabled

### 3. Webinar/Course
- Room type: 'webinar'
- Host can publish, viewers watch
- Q&A via chat
- Usually recorded
- Speaker + viewers sidebar layout

## Troubleshooting

### Room not appearing in LiveKit dashboard:
1. Check if token was successfully generated
2. Verify LiveKit URL matches your instance
3. Ensure auto-create is enabled in LiveKit settings
4. Check browser console for connection errors

### Participants not being tracked:
1. Configure webhook URL in LiveKit dashboard
2. Verify webhook endpoint is accessible
3. Check Django logs for webhook errors
4. Ensure webhook signature validation passes

### Can't join room:
1. Check booking status (must be 'confirmed' or 'in_progress')
2. Verify user is participant or practitioner
3. Check token expiry (4 hours)
4. Ensure room hasn't ended

### Leave button not working:
- Frontend now properly calls `room.disconnect(true)`
- Shows "Leaving..." state
- Immediately stops all tracks
- Triggers participant_left webhook

## Development Tips

### Testing Locally:
1. Use ngrok to expose webhook endpoint
2. Configure ngrok URL in LiveKit dashboard
3. Test with multiple browser tabs for participants
4. Check Django Admin for room/participant records

### Debugging:
- Enable Django logging for 'rooms' app
- Check browser console for LiveKit connection logs
- Use LiveKit CLI to inspect rooms
- Monitor webhook payloads

### Adding New Features:
1. Waiting rooms - Hold participants before host joins
2. Breakout rooms - For workshop activities  
3. Live streaming - Broadcast to YouTube/Facebook
4. Transcription - Real-time captions
5. Virtual backgrounds - Privacy feature

## Best Practices

1. **Security**: Always validate permissions server-side before generating tokens
2. **Cleanup**: Ensure rooms close properly to avoid resource waste
3. **Monitoring**: Track room duration and participant metrics
4. **Error Handling**: Gracefully handle connection failures
5. **User Experience**: Provide clear connection status and error messages