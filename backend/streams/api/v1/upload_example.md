# Stream Post Media Upload API Examples

## Upload Media to Existing Post

### Endpoint
```
POST /api/v1/stream-posts/{post_uuid}/upload-media/
```

### Headers
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Form Data
```
media_0: [file]
caption_0: "First image caption"
alt_text_0: "First image alt text"

media_1: [file]
caption_1: "Second image caption"
alt_text_1: "Second image alt text"
```

### JavaScript Example
```javascript
const uploadMedia = async (postId, files) => {
  const formData = new FormData();
  
  files.forEach((file, index) => {
    formData.append(`media_${index}`, file.file);
    formData.append(`caption_${index}`, file.caption || '');
    formData.append(`alt_text_${index}`, file.altText || '');
  });
  
  const response = await fetch(`/api/v1/stream-posts/${postId}/upload-media/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

### Response
```json
{
  "uploaded": [
    {
      "id": 123,
      "file": "/media/streams/posts/2025/01/06/image.jpg",
      "media_type": "image",
      "url": "https://cdn.example.com/streams/posts/2025/01/06/image.jpg",
      "filename": "image.jpg",
      "file_size": 102400,
      "content_type": "image/jpeg",
      "caption": "First image caption",
      "alt_text": "First image alt text",
      "order": 0
    }
  ],
  "post_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Delete Media

### Endpoint
```
DELETE /api/v1/stream-posts/{post_uuid}/media/{media_id}/
```

### Response
```
HTTP 204 No Content
```

## Reorder Media

### Endpoint
```
POST /api/v1/stream-posts/{post_uuid}/reorder-media/
```

### Request Body
```json
{
  "media_ids": [456, 123, 789]
}
```

### Response
```json
{
  "message": "Media reordered successfully"
}
```

## Frontend Integration Tips

1. **Multiple File Selection**
   ```html
   <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} />
   ```

2. **Progress Tracking**
   ```javascript
   const xhr = new XMLHttpRequest();
   xhr.upload.addEventListener('progress', (e) => {
     const percentComplete = (e.loaded / e.total) * 100;
     console.log(`Upload progress: ${percentComplete}%`);
   });
   ```

3. **Error Handling**
   - Check for `errors` array in response
   - Handle 403 for permission denied
   - Handle 400 for validation errors

4. **File Size Limits**
   - Implement client-side validation
   - Default Django limit is typically 2.5MB
   - Can be configured in settings