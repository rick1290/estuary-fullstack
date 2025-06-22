#!/usr/bin/env python
"""
Update stream post and subscriber counts
"""

import os
import sys
import django

# Django setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from streams.models import Stream

def update_counts():
    """Update all stream counts"""
    streams = Stream.objects.all()
    
    for stream in streams:
        # Update post count
        old_post_count = stream.post_count
        stream.post_count = stream.posts.filter(is_published=True).count()
        
        # Update subscriber counts
        old_subscriber_count = stream.subscriber_count
        active_subs = stream.subscriptions.filter(status='active')
        stream.subscriber_count = active_subs.count()
        stream.free_subscriber_count = active_subs.filter(tier='free').count()
        stream.paid_subscriber_count = active_subs.filter(tier__in=['entry', 'premium']).count()
        
        stream.save()
        
        print(f"Updated {stream.title}:")
        print(f"  Posts: {old_post_count} -> {stream.post_count}")
        print(f"  Subscribers: {old_subscriber_count} -> {stream.subscriber_count}")
        print(f"  (Free: {stream.free_subscriber_count}, Paid: {stream.paid_subscriber_count})")
        print()

if __name__ == "__main__":
    update_counts()
    print("Done!")