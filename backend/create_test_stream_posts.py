#!/usr/bin/env python
"""
Create test stream posts for debugging
"""

import os
import sys
import django

# Django setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.utils import timezone
from streams.models import Stream, StreamPost

def create_test_posts():
    """Create test posts for existing stream"""
    try:
        # Get the first active stream
        stream = Stream.objects.filter(is_active=True).first()
        if not stream:
            print("No active streams found!")
            return
        
        print(f"Creating posts for stream: {stream.title} (ID: {stream.id})")
        
        # Create free tier post
        free_post = StreamPost.objects.create(
            stream=stream,
            title="Free Content: Welcome to My Stream!",
            content="This is a free post that everyone can see. Welcome to my wellness journey!",
            post_type='text',
            tier_level='free',
            is_published=True,
            published_at=timezone.now(),
            teaser_text="Check out this free content!"
        )
        print(f"Created free post: {free_post.title}")
        
        # Create entry tier post
        entry_post = StreamPost.objects.create(
            stream=stream,
            title="Entry Tier: Exclusive Wellness Tips",
            content="This content is for entry-tier subscribers. Here are my top 5 wellness tips...",
            post_type='text',
            tier_level='entry',
            is_published=True,
            published_at=timezone.now(),
            teaser_text="Exclusive tips for subscribers"
        )
        print(f"Created entry post: {entry_post.title}")
        
        # Create premium tier post
        premium_post = StreamPost.objects.create(
            stream=stream,
            title="Premium Content: Advanced Techniques",
            content="This is premium content with advanced wellness techniques and personal insights.",
            post_type='text',
            tier_level='premium',
            is_published=True,
            published_at=timezone.now(),
            teaser_text="Premium techniques inside"
        )
        print(f"Created premium post: {premium_post.title}")
        
        # Update post count
        stream.post_count = stream.posts.count()
        stream.save()
        
        print(f"\nTotal posts created: {stream.post_count}")
        print("Done!")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_test_posts()