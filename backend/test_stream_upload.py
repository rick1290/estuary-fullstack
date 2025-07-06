#!/usr/bin/env python
"""
Test script for stream post media uploads
Run: python test_stream_upload.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from streams.models import Stream, StreamPost, StreamPostMedia
from users.models import User

def test_stream_media_upload():
    """Test creating a stream post with media."""
    
    # Get or create test user
    user = User.objects.filter(email='test@example.com').first()
    if not user:
        print("Please create a test user with practitioner profile first")
        return
    
    # Get practitioner's stream
    stream = Stream.objects.filter(practitioner=user.practitioner_profile).first()
    if not stream:
        print("Creating test stream...")
        stream = Stream.objects.create(
            practitioner=user.practitioner_profile,
            title="Test Stream",
            entry_tier_price_cents=1000,
            premium_tier_price_cents=2000
        )
    
    # Create a post
    print("Creating stream post...")
    post = StreamPost.objects.create(
        stream=stream,
        title="Test Post with Media",
        content="This is a test post with media uploads",
        post_type='gallery',
        tier_level='free',
        is_published=True
    )
    
    # Create test image file
    print("Creating test media...")
    test_image = SimpleUploadedFile(
        name='test_image.jpg',
        content=b'fake-image-content',
        content_type='image/jpeg'
    )
    
    # Create media attachment
    media = StreamPostMedia.objects.create(
        post=post,
        file=test_image,
        media_type='image',
        content_type='image/jpeg',
        caption='Test image caption',
        file_size=len(b'fake-image-content'),
        order=0
    )
    
    print(f"✅ Post created: {post.public_uuid}")
    print(f"✅ Media uploaded: {media.file.name}")
    print(f"✅ Media URL: {media.url}")
    print(f"✅ Media size: {media.file_size} bytes")
    
    # Test the API endpoint
    print("\n🔍 Testing API endpoints...")
    print(f"Post detail: /api/v1/stream-posts/{post.public_uuid}/")
    print(f"Upload media: /api/v1/stream-posts/{post.public_uuid}/upload-media/")
    print(f"Delete media: /api/v1/stream-posts/{post.public_uuid}/media/{media.id}/")
    print(f"Reorder media: /api/v1/stream-posts/{post.public_uuid}/reorder-media/")

if __name__ == '__main__':
    test_stream_media_upload()