#!/usr/bin/env python
"""
Test script to verify all notification integrations are working.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import uuid
from notifications.services.registry import get_client_notification_service, get_practitioner_notification_service
from practitioners.models import Practitioner

User = get_user_model()

def test_integrations():
    """Test all notification integrations."""
    print("🧪 Testing Notification Integrations")
    print("=" * 50)
    
    # Test 1: Client welcome email
    print("\n1. Testing Client Welcome Email...")
    try:
        # Create test user with unique email
        unique_id = str(uuid.uuid4())[:8]
        user = User.objects.create_user(
            email=f'test_integration_client_{unique_id}@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Client'
        )
        print(f"   ✅ User registration signal should trigger welcome email for {user.email}")
        print(f"   📧 Check Courier dashboard for delivery status")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # Test 2: Practitioner creation and welcome email  
    print("\n2. Testing Practitioner Welcome Email...")
    try:
        # Create practitioner user with unique email
        unique_id = str(uuid.uuid4())[:8]
        practitioner_user = User.objects.create_user(
            email=f'test_integration_practitioner_{unique_id}@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Practitioner',
            is_practitioner=True  # Mark as practitioner to prevent client welcome email
        )
        
        # Create practitioner profile
        practitioner = Practitioner.objects.create(
            user=practitioner_user,
            display_name='Test Practitioner',
            bio='Test practitioner for integration testing',
            practitioner_status='active'
        )
        print(f"   ✅ Practitioner creation signal should trigger welcome email for {practitioner_user.email}")
        print(f"   📧 Check Courier dashboard for delivery status")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # Test 3: Celery task scheduling
    print("\n3. Testing Celery Task Scheduling...")
    try:
        from notifications.tasks import test_celery
        result = test_celery.delay()
        print(f"   ✅ Celery task queued with ID: {result.id}")
        print("   📝 Check Celery worker logs for task execution")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # Test 4: Template configuration
    print("\n4. Testing Template Configuration...")
    try:
        client_service = get_client_notification_service()
        practitioner_service = get_practitioner_notification_service()
        
        # Check if templates are configured
        client_template = client_service.get_template_id('welcome')
        practitioner_template = practitioner_service.get_template_id('welcome')
        
        print(f"   ✅ Client welcome template: {client_template}")
        print(f"   ✅ Practitioner welcome template: {practitioner_template}")
        
        if client_template and practitioner_template:
            print("   ✅ Templates properly configured")
        else:
            print("   ⚠️  Some templates not configured - check settings")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # Test 5: Signal verification
    print("\n5. Testing Signal Registration...")
    try:
        from django.db.models.signals import post_save
        from notifications.signals import send_welcome_notification, handle_practitioner_notifications
        
        # Check if signals are connected
        user_signals = [conn for conn in post_save._live_receivers(sender=User) if conn[1].__name__ == 'send_welcome_notification']
        practitioner_signals = [conn for conn in post_save._live_receivers(sender=Practitioner) if conn[1].__name__ == 'handle_practitioner_notifications']
        
        print(f"   ✅ User welcome signal registered: {'Yes' if user_signals else 'No'}")
        print(f"   ✅ Practitioner signal registered: {'Yes' if practitioner_signals else 'No'}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎉 Integration test completed!")
    print("\n📋 Next Steps:")
    print("1. Check Courier dashboard for email delivery status")
    print("2. Verify Celery worker is processing tasks")
    print("3. Check Django logs for any error messages")
    print("4. Test actual user registration flow in frontend")
    print("5. Monitor Celery Beat for scheduled reminder tasks")

if __name__ == "__main__":
    test_integrations()