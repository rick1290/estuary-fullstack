#!/usr/bin/env python
"""
Script to check booking 35 and notification issues
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from bookings.models import Booking
from notifications.models import Notification
from django.utils import timezone

def check_booking_35():
    """Check booking 35 details and notification status"""
    
    print("=== Checking Booking 35 ===")
    
    try:
        booking = Booking.objects.get(id=35)
        print(f"Booking ID: {booking.id}")
        print(f"Status: {booking.status}")
        print(f"Payment Status: {booking.payment_status}")
        print(f"Created at: {booking.created_at}")
        print(f"Confirmed at: {booking.confirmed_at}")
        print(f"Start time: {booking.start_time}")
        print(f"Service: {booking.service.name if booking.service else 'None'}")
        print(f"User: {booking.user.email}")
        print(f"Practitioner: {booking.practitioner.user.email if booking.practitioner else 'None'}")
        print(f"Metadata: {booking.metadata}")
        
        # Check if confirmation signal would fire
        print(f"\nWould trigger confirmation signal: {booking.status == 'confirmed'}")
        
        # Check notifications for this booking
        print("\n=== Checking Notifications ===")
        notifications = Notification.objects.filter(
            related_object_id=str(booking.id),
            related_object_type='booking'
        )
        
        print(f"Total notifications for this booking: {notifications.count()}")
        
        for notif in notifications:
            print(f"\nNotification ID: {notif.id}")
            print(f"  Type: {notif.notification_type}")
            print(f"  Title: {notif.title}")
            print(f"  Status: {notif.status}")
            print(f"  Created: {notif.created_at}")
            print(f"  Scheduled for: {notif.scheduled_for}")
            print(f"  Sent at: {notif.sent_at}")
            
    except Booking.DoesNotExist:
        print("Booking 35 does not exist")
    
    # Check overall booking stats
    print("\n=== Booking Statistics ===")
    print(f"Total bookings: {Booking.objects.count()}")
    print(f"Confirmed bookings: {Booking.objects.filter(status='confirmed').count()}")
    print(f"Pending payment bookings: {Booking.objects.filter(status='pending_payment').count()}")
    
    # Check recent bookings
    print("\n=== Recent Bookings ===")
    recent_bookings = Booking.objects.order_by('-created_at')[:5]
    for b in recent_bookings:
        print(f"ID: {b.id}, Status: {b.status}, Created: {b.created_at}, User: {b.user.email}")

if __name__ == "__main__":
    check_booking_35()