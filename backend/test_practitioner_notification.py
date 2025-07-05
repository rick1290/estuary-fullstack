#!/usr/bin/env python
"""Test practitioner booking notification"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from bookings.models import Booking
from notifications.services.registry import get_practitioner_notification_service

# Get the latest booking
try:
    booking = Booking.objects.filter(status='confirmed').order_by('-id').first()
    if not booking:
        print("No confirmed bookings found")
        sys.exit(1)
    
    print(f"Testing notification for booking {booking.id}")
    print(f"Service: {booking.service.name}")
    print(f"Practitioner: {booking.service.primary_practitioner}")
    
    # Test the notification
    service = get_practitioner_notification_service()
    
    try:
        service.send_booking_notification(booking)
        print("✓ Notification sent successfully!")
    except Exception as e:
        print(f"✗ Error sending notification: {str(e)}")
        import traceback
        traceback.print_exc()
        
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()