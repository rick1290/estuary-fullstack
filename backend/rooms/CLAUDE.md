# Rooms App - LiveKit Integration

## Overview
The rooms app provides video conferencing functionality using LiveKit, a modern WebRTC infrastructure. It supports individual sessions, group workshops, courses, and phone dial-in capabilities.

## Architecture

### Core Models

#### Room
The main model representing a video conference room:
- **Linked to either**: Booking (1-on-1) OR ServiceSession (group)
- **Room types**: individual, workshop, course, webinar, broadcast
- **LiveKit integration**: Stores room name, SID, and configuration
- **Phone support**: Optional dial-in with PIN

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

#### RoomToken
JWT tokens for secure access:
- One token per participant per session
- Role-based permissions
- Expiration tracking
- Revocation support

### LiveKit Integration (`rooms/livekit/`)

#### client.py
Wrapper for LiveKit Server API:
```python
# Room management
client.create_room(name, config)
client.update_room(name, metadata)
client.delete_room(name)

# Participant management
client.list_participants(room)
client.remove_participant(room, identity)
client.mute_participant(room, identity, track_type)

# Recording management
client.start_recording(room, outputs)
client.stop_recording(recording_id)
```

#### tokens.py
JWT token generation with permissions:
```python
# Generate participant token
token = generate_room_token(
    room_name="session-123",
    participant_name="Dr. Smith",
    role="host",
    metadata={"booking_id": "123"}
)

# Role-based permissions
- Host: Can publish, record, manage participants
- Participant: Can publish video/audio
- Viewer: Can only subscribe (webinar mode)
```

#### webhooks.py
Handles LiveKit events:
- `room_started` / `room_finished` - Lifecycle tracking
- `participant_connected` / `participant_disconnected` - Attendance
- `track_published` / `track_unpublished` - Media tracking
- `recording_started` / `recording_ended` - Recording management

#### sip.py
Phone integration via SIP:
```python
# Dial-in support
sip.create_dial_in(
    room_name="session-123",
    phone_number="+1-555-0123",
    pin="1234"
)

# Dial-out to participant
sip.create_dial_out_participant(
    room_name="session-123",
    phone_number="+1-555-0199",
    participant_name="John Doe"
)
```

## Room Creation Flow

### 1. Individual Sessions (1-on-1)
```
Booking created → Booking confirmed → Signal fires → Room created
                                                    ↓
                                             Links to Booking
                                             Uses "individual" template
                                             Max 2 participants
```

### 2. Group Sessions (Workshops/Courses)
```
ServiceSession created → Signal fires → Room created
                                       ↓
                                Links to ServiceSession
                                Uses "group" template
                                Max = session.max_participants
```

### 3. Automatic Configuration
Rooms are configured based on service type:
- Therapy session → Private, no recording, 2 participants
- Yoga class → Group, optional recording, 20 participants
- Webinar → Broadcast mode, always recorded, 500 viewers

## Access Control

### Token Generation Flow
```python
# 1. User requests to join room
# 2. Verify user has permission:
#    - For individual: Is user the client or practitioner?
#    - For group: Does user have confirmed booking?
# 3. Generate token with appropriate role
# 4. Return token to frontend
```

### Permission Levels
- **Host** (Practitioner): Full control, can manage room
- **Participant** (Client): Can publish/subscribe media
- **Viewer** (Webinar attendee): Subscribe only
- **Recorder**: Special token for recording service

## Phone Integration

### Dial-in Flow
1. Room created with SIP enabled
2. System assigns regional phone number
3. Generates unique PIN
4. Sends details in booking confirmation
5. User calls → Enters PIN → Joins room audio-only

### Configuration
```python
# In settings.py
LIVEKIT_SIP_ENABLED = True
LIVEKIT_SIP_PROVIDER = 'twilio'

# Phone numbers by region
US: +1-555-ESTUARY
UK: +44-20-ESTUARY
AU: +61-2-ESTUARY
```

### Use Cases
- Elderly clients without smartphones
- Participants with poor internet
- Emergency sessions while traveling
- Accessibility compliance

## Recording Management

### Recording Options
1. **Manual**: Practitioner starts/stops during session
2. **Automatic**: Based on service settings
3. **Compliance**: Always-on for certain service types

### Storage Flow
```
LiveKit → Egress → S3/R2 → Post-processing → Available to users
                           ↓
                    Webhook updates RoomRecording
                    Generates access URLs
                    Notifies participants
```

### Access Control
- Practitioners: Always have access
- Clients: Based on service settings
- Expiration: URLs expire after X days
- Downloads: Can be disabled

## Frontend Integration

### Required Components
```javascript
// 1. Pre-join screen
<PreJoin 
  onDeviceTest={handleDeviceTest}
  onJoin={handleJoin}
/>

// 2. Video room
<LiveKitRoom
  token={token}
  serverUrl={LIVEKIT_HOST}
  connect={true}
  options={{
    adaptiveStream: true,
    dynacast: true,
  }}
>
  <VideoConference />
</LiveKitRoom>

// 3. Controls
<ControlBar 
  variation={isHost ? "host" : "participant"}
/>
```

### Room URLs
- Individual: `/room/booking/{booking_id}/`
- Group: `/room/session/{service_session_id}/`
- Direct: `/room/{room_uuid}/` (for special cases)

## Best Practices

### 1. Room Lifecycle
- Create rooms only when needed (not on booking creation)
- Set appropriate empty timeout (10 min default)
- Clean up expired rooms via scheduled task
- Archive recordings after X days

### 2. Security
- Always validate permissions server-side
- Use short-lived tokens (2 hours)
- Implement waiting rooms for groups
- Log all participant actions

### 3. Performance
- Use adaptive streaming
- Enable dynacast for large rooms
- Limit video quality based on participant count
- Use simulcast for better bandwidth usage

### 4. User Experience
- Show connection quality indicators
- Provide pre-join device testing
- Clear error messages for common issues
- Fallback to phone for connection problems

## Monitoring & Analytics

### Key Metrics
- Room duration and participant count
- Connection quality (packet loss, jitter)
- Device/browser statistics
- Phone vs video participation rates

### Webhook Events to Track
- No-shows (room created but never joined)
- Connection issues (frequent disconnects)
- Recording failures
- Phone fallback usage

## Common Scenarios

### Scenario 1: Client Can't Connect
1. Video fails → Show dial-in option
2. Provide phone number and PIN
3. Track as phone participant
4. Maintain session continuity

### Scenario 2: Group Workshop
1. Create room 15 min before start
2. Enable waiting room
3. Host joins → Admits participants
4. Optional recording based on consent
5. Auto-end 30 min after scheduled time

### Scenario 3: Course with Recordings
1. Each session gets new room
2. Auto-record all sessions
3. Make available to enrolled students
4. Expire access after course ends

## Troubleshooting

### Common Issues
1. **"Cannot connect"** - Check firewall/WebRTC
2. **"No audio/video"** - Device permissions
3. **"Poor quality"** - Bandwidth/CPU issues
4. **"Cannot join"** - Token expired or invalid

### Debug Tools
- LiveKit CLI for room inspection
- Webhook logs for event tracking
- Django admin for token/participant data
- CloudFlare Analytics for performance

## Future Enhancements

### Planned Features
1. **Breakout Rooms** - For workshop activities
2. **Screen Sharing** - With annotations
3. **Virtual Backgrounds** - Privacy feature
4. **Live Transcription** - Accessibility
5. **Streaming** - YouTube/Facebook Live
6. **Whiteboard** - Collaborative drawing
7. **Polls/Q&A** - Engagement features

### AI Integration
- Real-time transcription
- Session summaries
- Sentiment analysis
- Automated highlights

## Migration from Daily.co

If migrating from Daily.co:
1. Update Room model fields
2. Implement token generation
3. Update frontend components
4. Migrate recordings
5. Update webhook handlers
6. Test phone integration

Key differences:
- Tokens generated server-side (not client-side)
- More control over room configuration
- Better performance at scale
- Self-hosting option available