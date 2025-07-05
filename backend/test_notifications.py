#!/usr/bin/env python3
"""
Comprehensive test script for the cron-based notification system.
Run this with: python test_notifications.py
"""
import os
import sys
import django
from pathlib import Path

# Setup Django
sys.path.insert(0, str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from practitioners.models import Practitioner
from services.models import Service, ServiceType, ServiceSession
from bookings.models import Booking
from notifications.models import Notification
from notifications.cron import process_all_notifications
from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)

User = get_user_model()

def cleanup_test_data():
    """Clean up any existing test data."""
    print("🧹 Cleaning up test data...")
    
    # Clean up in reverse dependency order
    Booking.objects.filter(service_name_snapshot__startswith='Test Cron').delete()
    ServiceSession.objects.filter(service__name__startswith='Test Cron').delete()
    Service.objects.filter(name__startswith='Test Cron').delete()
    Practitioner.objects.filter(user__email__startswith='test-cron-').delete()
    User.objects.filter(email__startswith='test-cron-').delete()
    Notification.objects.filter(notification_key__startswith='booking_').delete()
    
    print("✓ Test data cleaned up")

def create_test_data():
    """Create test data for the notification system."""
    print("🔧 Creating test data...")
    
    # Create test practitioner
    user = User.objects.create_user(
        email='test-cron-practitioner@example.com',
        first_name='Test',
        last_name='Practitioner',
        is_practitioner=True
    )
    
    import uuid
    practitioner = Practitioner.objects.create(
        user=user,
        display_name='Test Cron Practitioner',
        slug=f'test-cron-practitioner-{uuid.uuid4().hex[:8]}',
        practitioner_status='active',
        is_verified=True
    )
    
    # Create service types
    workshop_type, _ = ServiceType.objects.get_or_create(
        code='workshop',
        defaults={'name': 'Workshop'}
    )
    
    session_type, _ = ServiceType.objects.get_or_create(
        code='session',
        defaults={'name': 'Individual Session'}
    )
    
    # Create workshop service
    workshop = Service.objects.create(
        name='Test Cron Workshop',
        slug=f'test-cron-workshop-{uuid.uuid4().hex[:8]}',
        description='Workshop for testing cron notifications',
        service_type=workshop_type,
        primary_practitioner=practitioner,
        price_cents=5000,
        duration_minutes=90,
        max_participants=10,
        is_active=True
    )
    
    # Create individual session service
    session_service = Service.objects.create(
        name='Test Cron Session',
        slug=f'test-cron-session-{uuid.uuid4().hex[:8]}',
        description='Session for testing cron notifications',
        service_type=session_type,
        primary_practitioner=practitioner,
        price_cents=10000,
        duration_minutes=60,
        is_active=True
    )
    
    # Create service sessions for workshop
    now = timezone.now()
    
    # Session starting in ~24 hours (reminder test)
    session_24h = ServiceSession.objects.create(
        service=workshop,
        title='24-Hour Test Session',
        start_time=now + timedelta(hours=24, minutes=5),
        end_time=now + timedelta(hours=25, minutes=35),
        max_participants=5
    )
    
    # Session starting in ~30 minutes (reminder test)
    session_30m = ServiceSession.objects.create(
        service=workshop,
        title='30-Minute Test Session',
        start_time=now + timedelta(minutes=35),
        end_time=now + timedelta(minutes=125),
        max_participants=5
    )
    
    # Session for reschedule test
    session_reschedule = ServiceSession.objects.create(
        service=workshop,
        title='Reschedule Test Session',
        start_time=now + timedelta(days=2),
        end_time=now + timedelta(days=2, hours=1, minutes=30),
        max_participants=5
    )
    
    # Create test participants
    participants = []
    for i in range(3):
        participant = User.objects.create_user(
            email=f'test-cron-participant-{i+1}@example.com',
            first_name=f'Participant',
            last_name=f'{i+1}'
        )
        participants.append(participant)
    
    # Create bookings for 24h session
    booking_24h = Booking.objects.create(
        user=participants[0],
        service=workshop,
        service_session=session_24h,
        practitioner=practitioner,
        start_time=session_24h.start_time,
        end_time=session_24h.end_time,
        status='confirmed',
        payment_status='paid',
        price_charged_cents=5000,
        final_amount_cents=5000,
        timezone='UTC',
        service_name_snapshot=workshop.name,
        service_description_snapshot=workshop.description,
        service_duration_snapshot=workshop.duration_minutes,
        practitioner_name_snapshot=practitioner.display_name
    )
    
    # Create bookings for 30m session
    booking_30m = Booking.objects.create(
        user=participants[1],
        service=workshop,
        service_session=session_30m,
        practitioner=practitioner,
        start_time=session_30m.start_time,
        end_time=session_30m.end_time,
        status='confirmed',
        payment_status='paid',
        price_charged_cents=5000,
        final_amount_cents=5000,
        timezone='UTC',
        service_name_snapshot=workshop.name,
        service_description_snapshot=workshop.description,
        service_duration_snapshot=workshop.duration_minutes,
        practitioner_name_snapshot=practitioner.display_name
    )
    
    # Create booking for reschedule test (initially synchronized)
    booking_reschedule = Booking.objects.create(
        user=participants[2],
        service=workshop,
        service_session=session_reschedule,
        practitioner=practitioner,
        start_time=session_reschedule.start_time,  # Initially matches session
        end_time=session_reschedule.end_time,
        status='confirmed',
        payment_status='paid',
        price_charged_cents=5000,
        final_amount_cents=5000,
        timezone='UTC',
        service_name_snapshot=workshop.name,
        service_description_snapshot=workshop.description,
        service_duration_snapshot=workshop.duration_minutes,
        practitioner_name_snapshot=practitioner.display_name
    )
    
    # Create individual booking (no service_session)
    booking_individual = Booking.objects.create(
        user=participants[0],
        service=session_service,
        practitioner=practitioner,
        start_time=now + timedelta(hours=24, minutes=10),
        end_time=now + timedelta(hours=25, minutes=10),
        status='confirmed',
        payment_status='paid',
        price_charged_cents=10000,
        final_amount_cents=10000,
        timezone='UTC',
        service_name_snapshot=session_service.name,
        service_description_snapshot=session_service.description,
        service_duration_snapshot=session_service.duration_minutes,
        practitioner_name_snapshot=practitioner.display_name
    )
    
    # Now simulate a reschedule by changing the session time
    new_time = session_reschedule.start_time + timedelta(hours=3)
    session_reschedule.start_time = new_time
    session_reschedule.end_time = new_time + timedelta(hours=1, minutes=30)
    session_reschedule.save()
    
    print(f"✓ Created test data:")
    print(f"  - Practitioner: {practitioner.user.email}")
    print(f"  - Workshop: {workshop.name}")
    print(f"  - Session Service: {session_service.name}")
    print(f"  - Sessions: {ServiceSession.objects.filter(service__name__startswith='Test Cron').count()}")
    print(f"  - Bookings: {Booking.objects.filter(service_name_snapshot__startswith='Test Cron').count()}")
    print(f"  - Participants: {len(participants)}")
    print(f"  - Reschedule simulation: Session moved +3 hours")
    
    return {
        'practitioner': practitioner,
        'workshop': workshop,
        'session_service': session_service,
        'sessions': {
            '24h': session_24h,
            '30m': session_30m,
            'reschedule': session_reschedule
        },
        'bookings': {
            '24h': booking_24h,
            '30m': booking_30m,
            'reschedule': booking_reschedule,
            'individual': booking_individual
        },
        'participants': participants
    }

def test_notification_services():
    """Test notification services are available."""
    print("🧪 Testing notification services...")
    
    try:
        client_service = get_client_notification_service()
        practitioner_service = get_practitioner_notification_service()
        
        print(f"✓ Client service: {client_service.__class__.__name__}")
        print(f"✓ Practitioner service: {practitioner_service.__class__.__name__}")
        
        # Test template availability
        client_templates = ['reminder_24h', 'reminder_30m', 'booking_rescheduled']
        practitioner_templates = ['reminder_24h', 'reminder_30m']
        
        for template in client_templates:
            template_id = client_service.get_template_id(template)
            print(f"  Client {template}: {template_id or 'NOT CONFIGURED'}")
        
        for template in practitioner_templates:
            template_id = practitioner_service.get_template_id(template)
            print(f"  Practitioner {template}: {template_id or 'NOT CONFIGURED'}")
        
        return True
        
    except Exception as e:
        print(f"✗ Service test failed: {e}")
        return False

def test_cron_execution():
    """Test the actual cron job execution."""
    print("🔄 Testing cron job execution...")
    
    # Get counts before
    before_notifications = Notification.objects.count()
    before_bookings = Booking.objects.filter(service_name_snapshot__startswith='Test Cron').count()
    
    print(f"📊 Before execution:")
    print(f"  - Notifications: {before_notifications}")
    print(f"  - Test bookings: {before_bookings}")
    
    # Execute the cron job
    try:
        result = process_all_notifications()
        
        print(f"🎯 Cron job result: {result}")
        
        # Get counts after
        after_notifications = Notification.objects.count()
        new_notifications = after_notifications - before_notifications
        
        print(f"📈 After execution:")
        print(f"  - Total notifications: {after_notifications}")
        print(f"  - New notifications: {new_notifications}")
        
        # Show recent notifications
        if new_notifications > 0:
            recent = Notification.objects.order_by('-created_at')[:new_notifications]
            print(f"📧 Recent notifications:")
            for notif in recent:
                print(f"  • {notif.notification_type}: {notif.title}")
                print(f"    → {notif.user.email} ({notif.status})")
                print(f"    Key: {notif.notification_key}")
        
        return True
        
    except Exception as e:
        print(f"✗ Cron execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_reschedule_detection():
    """Test session reschedule detection."""
    print("🔄 Testing reschedule detection...")
    
    # Find mismatched bookings
    from django.db.models import F
    mismatched = Booking.objects.filter(
        service_session__isnull=False,
        status='confirmed',
        service_name_snapshot__startswith='Test Cron'
    ).exclude(
        start_time=F('service_session__start_time')
    ).select_related('service_session')
    
    print(f"📋 Found {mismatched.count()} mismatched bookings:")
    for booking in mismatched:
        print(f"  - Booking {booking.id}:")
        print(f"    Booking time: {booking.start_time}")
        print(f"    Session time: {booking.service_session.start_time}")
        print(f"    Difference: {booking.service_session.start_time - booking.start_time}")
    
    return mismatched.count() > 0

def run_comprehensive_test():
    """Run comprehensive test suite."""
    print("🚀 Starting Comprehensive Cron Notification Test")
    print("=" * 60)
    
    tests = []
    
    try:
        # Setup phase
        with transaction.atomic():
            cleanup_test_data()
            test_data = create_test_data()
            
            # Test phases
            tests.append(("Notification Services", test_notification_services))
            tests.append(("Reschedule Detection", test_reschedule_detection))
            tests.append(("Cron Execution", test_cron_execution))
            
            # Run tests
            passed = 0
            failed = 0
            
            for test_name, test_func in tests:
                print(f"\n🧪 Running {test_name}...")
                try:
                    if test_func():
                        print(f"✅ {test_name} PASSED")
                        passed += 1
                    else:
                        print(f"❌ {test_name} FAILED")
                        failed += 1
                except Exception as e:
                    print(f"❌ {test_name} FAILED with exception: {e}")
                    import traceback
                    traceback.print_exc()
                    failed += 1
            
            print("\n" + "=" * 60)
            print(f"📊 Test Results: {passed} passed, {failed} failed")
            
            if failed == 0:
                print("🎉 All tests passed! Cron notification system is working correctly.")
            else:
                print("⚠️  Some tests failed. Check the output above.")
            
            # Show summary
            print(f"\n📋 Test Summary:")
            print(f"  - Practitioner: {test_data['practitioner'].user.email}")
            print(f"  - Services: {len([test_data['workshop'], test_data['session_service']])}")
            print(f"  - Sessions: {len(test_data['sessions'])}")
            print(f"  - Bookings: {len(test_data['bookings'])}")
            print(f"  - Participants: {len(test_data['participants'])}")
            
            return failed == 0
            
    except Exception as e:
        print(f"💥 Test setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Cleanup
        print(f"\n🧹 Cleaning up test data...")
        cleanup_test_data()

if __name__ == "__main__":
    success = run_comprehensive_test()
    print(f"\n{'🎉 SUCCESS' if success else '❌ FAILURE'}")
    sys.exit(0 if success else 1)