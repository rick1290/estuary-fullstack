# LiveKit Recording Setup & Testing Guide

## What Was Implemented

We've implemented a complete LiveKit recording system that saves recordings to Cloudflare R2 storage. Here's what's included:

### 1. **RecordingService** (`rooms/services/recording_service.py`)
- `start_recording()` - Starts recording with R2 output configuration
- `stop_recording()` - Stops active recording
- `process_completed_recording()` - Processes finished recordings (called from webhooks)
- `generate_signed_url()` - Creates access URLs for recordings
- `list_room_recordings()` - Lists all recordings for a room
- `delete_recording()` - Removes recording from R2 and DB

### 2. **LiveKit Client Updates** (`rooms/livekit/client.py`)
- `start_room_composite_egress()` - New method with proper R2 configuration
  - Configures S3-compatible storage (R2)
  - Sets `force_path_style=True` for R2 compatibility
  - Supports layout options: speaker, grid, single-speaker
  - Supports file formats: mp4, webm

### 3. **API Endpoints** (`rooms/api/v1/views.py`)
Updated recording endpoints to use RecordingService:
- `POST /api/v1/rooms/{uuid}/start-recording/` - Start recording
- `POST /api/v1/rooms/{uuid}/stop-recording/` - Stop recording
- `GET /api/v1/rooms/{uuid}/recordings/` - List recordings

### 4. **Webhook Handler** (`rooms/livekit/webhooks.py`)
Enhanced `_handle_egress_ended()` to:
- Process completed recordings via RecordingService
- Verify files exist in R2
- Generate public URLs
- Update database with file metadata

### 5. **Serializers** (`rooms/api/v1/serializers.py`)
- `StartRecordingSerializer` - Validates recording start requests
- `RecordingResponseSerializer` - Formats recording responses
- `RoomRecordingSerializer` - Already existed, shows recording details

## Environment Variables Required

Make sure these are set in your `.env` file:

```bash
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_HOST=https://your-instance.livekit.cloud

# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_key
CLOUDFLARE_R2_STORAGE_BUCKET_NAME=your_bucket_name
CLOUDFLARE_R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_REGION_NAME=auto
CLOUDFLARE_R2_CUSTOM_DOMAIN=your-custom-domain.com  # Optional
```

## How It Works

### Recording Flow:

1. **Start Recording**
   ```
   Host clicks "Record" → Frontend calls POST /api/v1/rooms/{uuid}/start-recording/
                        ↓
   RecordingService.start_recording() called
                        ↓
   LiveKit egress API called with R2 credentials
                        ↓
   RoomRecording created in DB with status="starting"
                        ↓
   Response returned to frontend with recording_id
   ```

2. **LiveKit Processing**
   ```
   LiveKit receives request → Webhook: egress_started fires
                           ↓
   Chromium renders room view
                           ↓
   Encodes video to MP4
                           ↓
   Uploads to R2 at: recordings/{room_id}/{timestamp}.mp4
                           ↓
   Webhook: egress_ended fires
   ```

3. **Completion**
   ```
   Webhook handler receives egress_ended
                        ↓
   Updates RoomRecording status="ready"
                        ↓
   RecordingService.process_completed_recording() called
                        ↓
   Verifies file exists in R2
                        ↓
   Gets file metadata (size, etc.)
                        ↓
   Generates public URL for playback
                        ↓
   Recording ready for viewing!
   ```

## Testing

### Prerequisites

1. **LiveKit Cloud Account** with egress enabled
2. **Cloudflare R2** bucket configured
3. **Webhook URL** configured in LiveKit dashboard: `https://your-domain.com/api/webhooks/livekit/`

### Test Steps

#### 1. Check Configuration

```bash
# In Django shell
python manage.py shell

from django.conf import settings

# Verify LiveKit settings
print(f"LiveKit Host: {settings.LIVEKIT_HOST}")
print(f"LiveKit API Key: {settings.LIVEKIT_API_KEY[:10]}...")

# Verify R2 settings
print(f"R2 Bucket: {settings.CLOUDFLARE_R2_STORAGE_BUCKET_NAME}")
print(f"R2 Endpoint: {settings.CLOUDFLARE_R2_ENDPOINT_URL}")
```

#### 2. Test R2 Connection

```python
from integrations.cloudflare_r2.storage import R2MediaStorage

storage = R2MediaStorage()

# Test file upload
test_key = "test/hello.txt"
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

# Write test file
content = ContentFile(b"Hello R2!")
path = default_storage.save(test_key, content)
print(f"Uploaded to: {path}")

# Check if exists
exists = storage.file_exists(test_key)
print(f"File exists: {exists}")

# Get public URL
url = storage.get_public_url(test_key)
print(f"Public URL: {url}")

# Clean up
storage.delete(test_key)
```

#### 3. Test LiveKit Client

```python
from rooms.livekit.client import get_livekit_client
import asyncio

client = get_livekit_client()

# Test connection (list rooms)
async def test_livekit():
    rooms = await client.list_rooms()
    print(f"Active rooms: {len(rooms)}")
    return rooms

asyncio.run(test_livekit())
```

#### 4. Test Recording End-to-End

**Via API (recommended):**

```bash
# 1. Create a test room (via booking or manually)
# 2. Join the room and start a session
# 3. Start recording

curl -X POST https://your-api.com/api/v1/rooms/{room-uuid}/start-recording/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "layout": "speaker",
    "file_format": "mp4",
    "audio_only": false
  }'

# Response:
# {
#   "recording_id": "EG_xxxxx",
#   "status": "starting",
#   "message": "Recording started successfully.",
#   "recording": { ... }
# }

# 4. Wait a few seconds, then stop recording

curl -X POST https://your-api.com/api/v1/rooms/{room-uuid}/stop-recording/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Check recordings

curl -X GET https://your-api.com/api/v1/rooms/{room-uuid}/recordings/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Via Django Shell:**

```python
from rooms.models import Room
from rooms.services.recording_service import RecordingService

# Get an active room
room = Room.objects.filter(status='active').first()

if room:
    recording_service = RecordingService()

    # Start recording
    recording = recording_service.start_recording(
        room=room,
        layout='speaker',
        file_format='mp4'
    )
    print(f"Recording started: {recording.recording_id}")

    # Wait for recording to process (30+ seconds)
    # ...

    # Stop recording
    stopped_recording = recording_service.stop_recording(room=room)
    print(f"Recording stopped: {stopped_recording.status}")

    # List recordings
    recordings = recording_service.list_room_recordings(room)
    for rec in recordings:
        print(f"Recording: {rec.recording_id} - {rec.status}")
        print(f"URL: {rec.file_url}")
```

#### 5. Verify Webhook Processing

Check Django logs when recording ends:

```bash
tail -f /path/to/django.log | grep -i "recording\|egress"
```

You should see:
```
INFO: Recording started for room individual-xxxxx, egress ID: EG_xxxxx
INFO: Handling LiveKit webhook event: egress_started
INFO: Recording started for room ...
INFO: Handling LiveKit webhook event: egress_ended
INFO: Recording processed successfully: EG_xxxxx
INFO: Recording ended for room ...
```

### Troubleshooting

#### Recording doesn't start
- Check `room.recording_enabled = True`
- Check `room.status` is 'active' or 'in_use'
- Verify LiveKit credentials are correct
- Check LiveKit dashboard for egress errors

#### File not appearing in R2
- Verify R2 credentials in settings
- Check `force_path_style=True` is set (required for R2)
- Look at LiveKit egress logs in dashboard
- Check webhook is configured and receiving events

#### Webhook not firing
- Verify webhook URL in LiveKit dashboard
- Check webhook signature validation
- Ensure webhook endpoint is publicly accessible
- Check Django logs for webhook errors

#### File exists but URL doesn't work
- Verify R2 bucket has public access enabled (if using public URLs)
- Check `CLOUDFLARE_R2_CUSTOM_DOMAIN` is set correctly
- Test R2 URL directly in browser

## Next Steps

### Optional Enhancements:

1. **Thumbnail Generation**
   - Implement `generate_recording_thumbnail` Celery task
   - Extract first frame from video as thumbnail
   - Store in R2 at `recordings/{room_id}/thumbnails/{timestamp}.jpg`

2. **Signed URLs for Private Recordings**
   - Implement presigned URL generation for private access
   - Add expiration times for security
   - Track access in database

3. **Recording Management UI**
   - Add frontend components for viewing recordings
   - Implement download functionality
   - Add recording deletion with confirmation

4. **Auto-Recording**
   - Add `auto_start_recording` to RoomTemplate
   - Start recording automatically when room becomes active
   - Useful for compliance/audit requirements

5. **Transcription**
   - Integrate speech-to-text service
   - Generate transcripts from recordings
   - Store in `RoomRecording.metadata`

## API Reference

### Start Recording
**POST** `/api/v1/rooms/{room_uuid}/start-recording/`

**Request:**
```json
{
  "layout": "speaker",  // "speaker" | "grid" | "single-speaker"
  "file_format": "mp4",  // "mp4" | "webm"
  "audio_only": false
}
```

**Response (201):**
```json
{
  "recording_id": "EG_xxxxx",
  "status": "starting",
  "message": "Recording started successfully.",
  "recording": {
    "id": 123,
    "recording_id": "EG_xxxxx",
    "status": "starting",
    "started_at": "2025-01-20T10:00:00Z",
    "file_format": "mp4"
  }
}
```

### Stop Recording
**POST** `/api/v1/rooms/{room_uuid}/stop-recording/`

**Response (200):**
```json
{
  "recording_id": "EG_xxxxx",
  "status": "stopping",
  "message": "Recording stopped successfully.",
  "recording": { ... }
}
```

### List Recordings
**GET** `/api/v1/rooms/{room_uuid}/recordings/`

**Response (200):**
```json
[
  {
    "id": 123,
    "recording_id": "EG_xxxxx",
    "status": "ready",
    "started_at": "2025-01-20T10:00:00Z",
    "ended_at": "2025-01-20T10:30:00Z",
    "duration_seconds": 1800,
    "duration_formatted": "30:00",
    "file_size_bytes": 52428800,
    "file_format": "mp4",
    "download_url": "https://your-domain.r2.dev/recordings/..."
  }
]
```

## Database Schema

The `RoomRecording` model stores:
- `recording_id` - LiveKit egress ID
- `egress_id` - Same as recording_id
- `status` - 'starting', 'active', 'stopping', 'stopped', 'ready', 'failed'
- `started_at`, `ended_at` - Timestamps
- `duration_seconds` - Recording length
- `file_url` - Public R2 URL
- `file_size_bytes` - File size
- `file_format` - 'mp4' or 'webm'
- `storage_provider` - 'r2'
- `storage_bucket` - R2 bucket name
- `storage_key` - Full path in bucket
- `is_processed` - Whether post-processing is complete
- `thumbnail_url` - Optional thumbnail URL
- `metadata` - JSON field for additional data
