# Media Management API

## Overview

The Media Management API provides endpoints for uploading, managing, and processing media files including images, videos, documents, and audio files. It supports both direct uploads and presigned URL uploads for large files.

## Base URL

```
/api/v1/drf/media/
```

## Authentication

All endpoints require authentication using JWT tokens.

## Endpoints

### 1. List Media

**GET** `/api/v1/drf/media/`

List all media files with optional filters.

#### Query Parameters

- `entity_type` (string): Filter by entity type (service, practitioner, user, etc.)
- `entity_id` (uuid): Filter by entity ID
- `media_type` (string): Filter by media type (image, video, document, audio)
- `status` (string): Filter by status (pending, processing, ready, failed)
- `search` (string): Search in filename, title, and description
- `limit` (integer): Number of results per page (default: 20)
- `offset` (integer): Pagination offset

#### Response

```json
{
  "count": 10,
  "next": "http://api.example.com/media/?offset=20",
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://cdn.example.com/media/image.jpg",
      "thumbnail_url": "https://cdn.example.com/media/thumb_image.jpg",
      "filename": "profile_photo.jpg",
      "file_size": 1048576,
      "content_type": "image/jpeg",
      "media_type": "image",
      "entity_type": "user",
      "entity_id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Profile Photo",
      "description": "User profile photo",
      "alt_text": "Smiling person",
      "status": "ready",
      "width": 1920,
      "height": 1080,
      "is_primary": true,
      "display_order": 0,
      "view_count": 42,
      "download_count": 5,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:31:00Z"
    }
  ]
}
```

### 2. Upload Media (Direct)

**POST** `/api/v1/drf/media/upload/`

Upload a file directly to the server.

#### Request (multipart/form-data)

- `file` (file): The file to upload (required)
- `entity_type` (string): Entity type (required)
- `entity_id` (uuid): Entity ID (required)
- `title` (string): Media title (optional)
- `description` (string): Media description (optional)
- `alt_text` (string): Alternative text for accessibility (optional)
- `is_primary` (boolean): Set as primary media (optional)
- `display_order` (integer): Display order (optional)

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://cdn.example.com/media/image.jpg",
  "filename": "uploaded_file.jpg",
  "file_size": 1048576,
  "content_type": "image/jpeg",
  "media_type": "image",
  "status": "processing",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### 3. Generate Presigned Upload URL

**POST** `/api/v1/drf/media/presigned_upload/`

Generate a presigned URL for client-side uploads (recommended for large files).

#### Request

```json
{
  "filename": "large_video.mp4",
  "content_type": "video/mp4",
  "entity_type": "service",
  "entity_id": "123e4567-e89b-12d3-a456-426614174000",
  "file_size": 104857600
}
```

#### Response

```json
{
  "upload_url": "https://r2.cloudflarestorage.com/bucket/...",
  "upload_headers": {
    "Content-Type": "video/mp4"
  },
  "media_id": "550e8400-e29b-41d4-a716-446655440000",
  "storage_key": "media/service/123e4567.../550e8400.mp4",
  "expires_at": "2024-01-15T11:30:00Z"
}
```

### 4. Confirm Upload

**POST** `/api/v1/drf/media/{media_id}/confirm_upload/`

Confirm that a presigned upload was completed successfully.

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://cdn.example.com/media/video.mp4",
  "status": "ready"
}
```

### 5. Batch Upload

**POST** `/api/v1/drf/media/batch_upload/`

Upload multiple files in a single request.

#### Request (multipart/form-data)

- `files` (file[]): Array of files to upload
- `entity_type` (string): Entity type for all files
- `entity_id` (uuid): Entity ID for all files

#### Response

```json
{
  "created": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "image1.jpg",
      "status": "ready"
    }
  ],
  "errors": [],
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

### 6. Update Media

**PATCH** `/api/v1/drf/media/{media_id}/`

Update media metadata.

#### Request

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "alt_text": "Updated alt text",
  "display_order": 1
}
```

### 7. Delete Media

**DELETE** `/api/v1/drf/media/{media_id}/`

Delete a media file from storage and database.

### 8. Bulk Operations

#### Bulk Delete

**POST** `/api/v1/drf/media/bulk_delete/`

```json
{
  "media_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001"
  ]
}
```

#### Bulk Update

**POST** `/api/v1/drf/media/bulk_update/`

```json
{
  "media_ids": ["550e8400-e29b-41d4-a716-446655440000"],
  "updates": {
    "alt_text": "Updated alt text for all"
  }
}
```

### 9. Set Primary Media

**POST** `/api/v1/drf/media/{media_id}/set_primary/`

Set a media item as primary for its entity.

### 10. Process Media

**POST** `/api/v1/drf/media/{media_id}/process/`

Request processing operations on media.

#### Request

```json
{
  "operations": ["thumbnail", "optimize"],
  "options": {
    "resize": {
      "width": 800,
      "height": 600
    }
  }
}
```

## File Size Limits

- **Images**: 10MB max
- **Videos**: 500MB max
- **Documents**: 50MB max
- **Audio**: 100MB max

## Allowed File Types

### Images
- jpg, jpeg, png, gif, webp, svg

### Videos
- mp4, mov, avi, webm, mkv

### Documents
- pdf, doc, docx, txt, odt, rtf

### Audio
- mp3, wav, ogg, aac, m4a, flac

## Error Responses

### 400 Bad Request

```json
{
  "error": "File extension 'exe' is not allowed"
}
```

### 403 Forbidden

```json
{
  "error": "No permission to upload media for this entity"
}
```

### 413 Payload Too Large

```json
{
  "error": "File size exceeds maximum allowed size of 10.0MB for image files"
}
```

## Usage Examples

### JavaScript Upload Example

```javascript
// Direct upload
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('entity_type', 'service');
formData.append('entity_id', serviceId);
formData.append('title', 'Service Gallery Image');

const response = await fetch('/api/v1/drf/media/upload/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const media = await response.json();
```

### Presigned Upload Example

```javascript
// Step 1: Get presigned URL
const uploadRequest = await fetch('/api/v1/drf/media/presigned_upload/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    filename: file.name,
    content_type: file.type,
    entity_type: 'service',
    entity_id: serviceId,
    file_size: file.size
  })
});

const { upload_url, upload_headers, media_id } = await uploadRequest.json();

// Step 2: Upload to presigned URL
await fetch(upload_url, {
  method: 'PUT',
  headers: upload_headers,
  body: file
});

// Step 3: Confirm upload
await fetch(`/api/v1/drf/media/${media_id}/confirm_upload/`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```