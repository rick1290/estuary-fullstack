#!/usr/bin/env python
"""
Test script to verify that free subscriptions can be created without null constraint violations.
"""

import os
import sys
import django
from django.utils import timezone
from datetime import timedelta

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from streams.models import Stream, StreamSubscription
from practitioners.models import Practitioner

User = get_user_model()

def test_free_subscription():
    """Test creating a free subscription with proper period dates"""
    
    # Get or create test user
    test_user, _ = User.objects.get_or_create(
        email='test_free_sub@example.com',
        defaults={'username': 'test_free_sub'}
    )
    
    # Get a stream (assuming one exists)
    stream = Stream.objects.filter(is_active=True).first()
    if not stream:
        print("No active streams found. Creating a test stream...")
        # Create a practitioner first
        practitioner_user, _ = User.objects.get_or_create(
            email='test_practitioner@example.com',
            defaults={'username': 'test_practitioner'}
        )
        practitioner, _ = Practitioner.objects.get_or_create(
            user=practitioner_user,
            defaults={'display_name': 'Test Practitioner'}
        )
        stream = Stream.objects.create(
            practitioner=practitioner,
            title='Test Stream',
            tagline='Test tagline',
            description='Test description',
            is_active=True,
            launched_at=timezone.now()
        )
    
    # Remove any existing subscription
    StreamSubscription.objects.filter(user=test_user, stream=stream).delete()
    
    # Test creating free subscription
    print(f"Creating free subscription for user {test_user.email} to stream {stream.title}")
    
    now = timezone.now()
    subscription = StreamSubscription.objects.create(
        user=test_user,
        stream=stream,
        tier='free',
        status='active',
        started_at=now,
        current_period_start=now,
        current_period_end=now + timedelta(days=36500)  # ~100 years
    )
    
    print(f"✅ Successfully created free subscription!")
    print(f"   - ID: {subscription.id}")
    print(f"   - Tier: {subscription.tier}")
    print(f"   - Status: {subscription.status}")
    print(f"   - Started at: {subscription.started_at}")
    print(f"   - Current period: {subscription.current_period_start} to {subscription.current_period_end}")
    
    # Verify the subscription was created correctly
    retrieved = StreamSubscription.objects.get(id=subscription.id)
    assert retrieved.current_period_start is not None
    assert retrieved.current_period_end is not None
    assert retrieved.tier == 'free'
    assert retrieved.status == 'active'
    
    print("\n✅ All assertions passed! Free subscription creation is working correctly.")
    
    # Clean up
    subscription.delete()
    
    return True

if __name__ == '__main__':
    try:
        test_free_subscription()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)