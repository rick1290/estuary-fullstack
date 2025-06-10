# Rooms App - LiveKit Integration

This Django app provides comprehensive LiveKit integration for video conferencing functionality.

## Features

- **Room Management**: Create and manage LiveKit video rooms
- **Room Templates**: Predefined configurations for different room types
- **Token Generation**: Secure JWT token generation for room access
- **Recording Support**: Room recording with cloud storage integration
- **SIP/PSTN Integration**: Dial-in functionality for phone participants
- **Webhook Handling**: Process LiveKit events in real-time
- **Automatic Room Creation**: Signal-based room creation for bookings and sessions

## Architecture

### Models

- **Room**: Main model representing a LiveKit video room
  - Supports both individual sessions (linked to Booking) and group sessions (linked to ServiceSession)
  - Tracks room status, participants, and recording state
  
- **RoomTemplate**: Predefined room configurations
  - Individual, Group, Webinar, and Broadcast types
  - Configurable settings for codecs, recording, and SIP
  
- **RoomParticipant**: Tracks participants in rooms
  - Connection quality and duration tracking
  - Analytics for video/audio usage
  
- **RoomToken**: Access tokens for room entry
  - Role-based permissions (host, participant, viewer)
  - Token expiration and usage tracking
  
- **RoomRecording**: Manages room recordings
  - Cloud storage integration (R2, S3, GCS)
  - Processing status and access control

### LiveKit Integration

The `livekit/` subdirectory contains:

- **client.py**: LiveKit API wrapper for room and participant management
- **tokens.py**: JWT token generation with role-based permissions
- **webhooks.py**: Webhook handlers for LiveKit events
- **sip.py**: SIP/PSTN integration for dial-in functionality

## Configuration

Add to your Django settings:

```python
# LiveKit Configuration
LIVEKIT_API_KEY = 'your-api-key'
LIVEKIT_API_SECRET = 'your-api-secret'
LIVEKIT_SERVER_URL = 'wss://your-livekit-server.com'

# Optional SIP Configuration
LIVEKIT_SIP_ENABLED = True
LIVEKIT_SIP_TRUNK_ID = 'your-trunk-id'
LIVEKIT_SIP_DISPATCH_RULE_ID = 'your-dispatch-rule-id'
LIVEKIT_DIAL_IN_NUMBERS = {
    'US': '+1-xxx-xxx-xxxx',
    'UK': '+44-xxx-xxx-xxxx',
    'EU': '+49-xxx-xxx-xxxx',
    'AU': '+61-xxx-xxx-xxxx',
}

# Recording Defaults
LIVEKIT_DEFAULT_RECORDING_ENABLED = False
```

## Setup

1. Run migrations to create database tables:
   ```bash
   python manage.py migrate rooms
   ```

2. Set up default room templates:
   ```bash
   python manage.py setup_livekit
   ```

3. Configure webhook URL in LiveKit:
   ```
   https://your-domain.com/rooms/webhooks/livekit/
   ```

## Usage

### Creating a Room

```python
from rooms.models import Room, RoomTemplate

# For individual booking
room = Room.objects.create(
    booking=booking,
    room_type='individual',
    template=RoomTemplate.objects.get(room_type='individual', is_default=True)
)

# For group session
room = Room.objects.create(
    service_session=session,
    room_type='group',
    max_participants=50,
    recording_enabled=True,
    sip_enabled=True
)
```

### Generating Access Tokens

```python
from rooms.livekit.tokens import create_room_token

# Generate host token
token = create_room_token(room, user, role='host', ttl=7200)

# Generate participant token
token = create_room_token(room, user, role='participant', ttl=3600)
```

### Managing Rooms

```python
from rooms.livekit.client import get_livekit_client

client = get_livekit_client()

# Create LiveKit room
await client.create_room(
    name=room.livekit_room_name,
    empty_timeout=room.empty_timeout,
    max_participants=room.max_participants
)

# List participants
participants = await client.list_participants(room.livekit_room_name)

# Start recording
egress_info = await client.start_room_recording(
    room_name=room.livekit_room_name,
    output_filepath='s3://bucket/recordings/room.mp4'
)
```

### Dial-in Support

```python
from rooms.livekit.sip import get_room_dial_in_info, enable_sip_for_room

# Enable SIP for a room
enable_sip_for_room(room)

# Get dial-in information
dial_in_info = get_room_dial_in_info(room)
# Returns: {'number': '+1-xxx-xxx-xxxx', 'pin': '123456', 'instructions': '...'}
```

## Signals

The app automatically creates rooms when:
- A booking is confirmed and the service requires video
- A service session is created for online/hybrid services

## Admin Interface

The Django admin provides comprehensive management for:
- Room templates with all LiveKit settings
- Active rooms with participant tracking
- Recording management and downloads
- Token generation and revocation

## API Endpoints

- `/api/v1/rooms/` - Room CRUD operations
- `/api/v1/rooms/{id}/token/` - Generate access token
- `/api/v1/rooms/{id}/participants/` - List participants
- `/api/v1/rooms/{id}/recording/start/` - Start recording
- `/webhooks/livekit/` - LiveKit webhook endpoint

## Best Practices

1. **Security**: Always validate user permissions before generating tokens
2. **Recording**: Obtain consent before enabling recording
3. **SIP**: Generate unique PINs for each room with dial-in enabled
4. **Cleanup**: Set appropriate empty_timeout values to clean up unused rooms
5. **Monitoring**: Use webhook events to track room usage and issues