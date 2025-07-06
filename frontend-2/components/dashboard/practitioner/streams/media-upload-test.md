# Media Upload Test Instructions

## Testing the New Media Upload Features

### 1. Create a Post with Media (Existing Feature)
1. Go to http://localhost:3001/dashboard/practitioner/streams
2. Click "Create New Post"
3. Fill in title and content
4. Upload 1-3 images using the media upload section
5. Add captions to the images
6. Click "Publish Post"
7. ✅ Verify post appears in list with media thumbnails

### 2. Edit Post and Add More Media (New Feature)
1. Find an existing post or create one without media
2. Click the three dots menu → "Edit"
3. Scroll down to see "Current Media" (if any exists)
4. Use "Add New Media" section to upload additional files
5. Add captions to new files
6. Click "Upload X files" button
7. ✅ Verify new media appears in the post

### 3. Delete Media from Post (New Feature)
1. Edit any post that has media
2. Hover over existing media thumbnails
3. Click the red X button that appears
4. ✅ Verify media is removed from the post

### 4. Media Display in Post List
1. Create posts with different numbers of media files
2. ✅ Verify media thumbnails show in the post list
3. ✅ Verify "+X more" overlay for posts with >4 images
4. ✅ Verify "Manage Media (X)" option in dropdown menu

### 5. Error Handling
1. Try uploading very large files (>10MB)
2. Try uploading unsupported file types
3. ✅ Verify appropriate error messages appear

## API Endpoints Used

The frontend now uses these new API endpoints:

### Upload Media to Existing Post
```
POST /api/v1/stream-posts/{uuid}/upload-media/
Content-Type: multipart/form-data

media_0: [file]
caption_0: "Caption text"
media_1: [file]
caption_1: "Another caption"
```

### Delete Media
```
DELETE /api/v1/stream-posts/{uuid}/media/{media_id}/
```

### Reorder Media (Backend ready, UI pending)
```
POST /api/v1/stream-posts/{uuid}/reorder-media/
Content-Type: application/json

{
  "media_ids": ["id1", "id2", "id3"]
}
```

## What's Working Now

✅ **Create posts with media** - FormData upload during post creation
✅ **Edit posts to add media** - New upload-media endpoint
✅ **Delete individual media** - Delete media from existing posts
✅ **Media display** - Thumbnails in post list and edit dialog
✅ **Error handling** - Toast notifications for success/error
✅ **Loading states** - Proper loading indicators

## What's Not Implemented Yet

❌ **Drag-and-drop reordering** - Media reorder API exists but no drag UI yet
❌ **Bulk media operations** - Select multiple media for deletion
❌ **Media editing** - Update captions/alt text after upload
❌ **Video thumbnails** - Video files show filename instead of preview

## Code Changes Made

1. **edit-post-dialog.tsx** - Added complete media management UI
2. **stream-posts-list.tsx** - Added "Manage Media" menu option
3. **Backend API** - StreamPostMediaMixin with upload/delete/reorder endpoints
4. **API Client** - Regenerated to include new endpoints

The media upload system is now fully functional for basic use cases!