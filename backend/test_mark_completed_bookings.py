#!/usr/bin/env python
"""
Test script for mark_completed_bookings Celery task.
Run this script to test the booking completion and review request email functionality.
"""
import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from bookings.models import Booking
from bookings.tasks import mark_completed_bookings
from django.db.models import Q


def test_mark_completed_bookings():
    """
    Test the mark_completed_bookings task.
    """
    print("\n=== Testing mark_completed_bookings task ===\n")
    
    # First, let's see what bookings we have that are eligible
    now = timezone.now()
    
    # Get active bookings
    active_bookings = Booking.objects.filter(
        Q(status='confirmed') | Q(status='in_progress')
    ).select_related('service', 'user', 'service_session')
    
    print(f"Found {active_bookings.count()} active bookings (confirmed or in_progress)")
    
    # Show bookings that would be marked as completed
    eligible_count = 0
    for booking in active_bookings:
        should_complete = False
        end_time_used = None
        
        if booking.service.service_type_code == 'session':
            if booking.end_time < now:
                should_complete = True
                end_time_used = booking.end_time
        elif booking.service.service_type_code == 'workshop':
            if booking.service_session and booking.service_session.end_time < now:
                should_complete = True
                end_time_used = booking.service_session.end_time
        elif booking.service.service_type_code == 'course':
            last_session = booking.service.sessions.aggregate(
                last_end_time=models.Max('end_time')
            )['last_end_time']
            if last_session and last_session < now:
                should_complete = True
                end_time_used = last_session
        
        if should_complete:
            eligible_count += 1
            print(f"\n📅 Booking #{booking.id} - ELIGIBLE for completion")
            print(f"   Service: {booking.service.name} ({booking.service.service_type_code})")
            print(f"   User: {booking.user.email}")
            print(f"   End time: {end_time_used}")
            print(f"   Time since end: {now - end_time_used}")
    
    if eligible_count == 0:
        print("\n❌ No bookings are currently eligible for completion.")
        print("   (No confirmed/in_progress bookings have passed their end time)")
        
        # Let's check if there are any recent bookings
        recent_bookings = Booking.objects.filter(
            status='confirmed',
            end_time__gte=now - timedelta(days=7)
        ).order_by('end_time')[:5]
        
        if recent_bookings:
            print("\n📊 Recent confirmed bookings:")
            for booking in recent_bookings:
                time_until = booking.end_time - now
                if time_until.total_seconds() > 0:
                    print(f"   - Booking #{booking.id}: ends in {format_timedelta(time_until)}")
                else:
                    print(f"   - Booking #{booking.id}: ended {format_timedelta(-time_until)} ago")
    
    # Ask user if they want to run the task
    if eligible_count > 0:
        response = input(f"\n❓ Run the task to mark {eligible_count} booking(s) as completed? (y/n): ")
        if response.lower() == 'y':
            print("\n🚀 Running mark_completed_bookings task...\n")
            
            # Run the task synchronously
            result = mark_completed_bookings()
            
            print("\n✅ Task completed!")
            print(f"   - Completed: {result['completed_count']} bookings")
            print(f"   - Skipped: {result['skipped_count']} bookings")
            print(f"   - Errors: {result['error_count']}")
            
            if result['completed_count'] > 0:
                print("\n📧 Review request emails have been sent for completed bookings!")
        else:
            print("\n❌ Task execution cancelled.")
    
    # Option to create a test booking
    print("\n" + "="*50)
    response = input("\n❓ Would you like to create a test booking that's ready for completion? (y/n): ")
    if response.lower() == 'y':
        create_test_booking()


def create_test_booking():
    """
    Create a test booking that's in the past and ready for completion.
    """
    from services.models import Service
    from practitioners.models import Practitioner
    from users.models import User
    
    print("\n🔧 Creating test booking...")
    
    # Get a practitioner with services
    practitioner = Practitioner.objects.filter(
        services__isnull=False,
        services__service_type__code='session'
    ).first()
    
    if not practitioner:
        print("❌ No practitioner with session services found!")
        return
    
    # Get a service
    service = practitioner.services.filter(service_type__code='session').first()
    
    # Get or create a test user
    test_user, created = User.objects.get_or_create(
        email='test-booking@example.com',
        defaults={
            'first_name': 'Test',
            'last_name': 'User',
            'is_active': True
        }
    )
    
    # Create a booking that ended 1 hour ago
    end_time = timezone.now() - timedelta(hours=1)
    start_time = end_time - timedelta(minutes=service.duration_minutes or 60)
    
    booking = Booking.objects.create(
        user=test_user,
        practitioner=practitioner,
        service=service,
        start_time=start_time,
        end_time=end_time,
        status='confirmed',
        payment_status='paid',
        price_charged_cents=service.price_cents,
        final_amount_cents=service.price_cents,
        service_name_snapshot=service.name,
        service_description_snapshot=service.description or '',
        practitioner_name_snapshot=practitioner.user.get_full_name(),
        service_duration_snapshot=service.duration_minutes
    )
    
    print(f"\n✅ Test booking created!")
    print(f"   - Booking ID: {booking.id}")
    print(f"   - Service: {service.name}")
    print(f"   - User: {test_user.email}")
    print(f"   - Start time: {start_time}")
    print(f"   - End time: {end_time}")
    print(f"   - Status: {booking.status}")
    
    print(f"\n📧 This booking is ready to be marked as completed.")
    print(f"   Run this script again to process it!")


def format_timedelta(td):
    """Format a timedelta into a human-readable string."""
    total_seconds = int(abs(td.total_seconds()))
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    
    parts = []
    if days > 0:
        parts.append(f"{days} day{'s' if days != 1 else ''}")
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes > 0 and days == 0:  # Only show minutes if no days
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    
    return " ".join(parts) if parts else "less than a minute"


if __name__ == "__main__":
    # Import models to avoid issues
    from django.db import models
    
    try:
        test_mark_completed_bookings()
    except KeyboardInterrupt:
        print("\n\n❌ Test cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)