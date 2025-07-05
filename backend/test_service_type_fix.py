#!/usr/bin/env python
"""
Quick test to verify service_type_code property works correctly
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')

# Add backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    django.setup()
    
    from bookings.models import Booking
    from services.models import Service, ServiceType
    
    print("Testing service_type_code property...")
    
    # Try to get a service
    service = Service.objects.select_related('service_type').first()
    
    if service:
        print(f"\nService: {service.name}")
        print(f"Service type object: {service.service_type}")
        print(f"Service type code (via property): {service.service_type_code}")
        
        # Test with a booking
        booking = Booking.objects.select_related('service__service_type').first()
        if booking:
            print(f"\nBooking: {booking.id}")
            print(f"Service: {booking.service.name}")
            print(f"Service type code: {booking.service.service_type_code}")
            
            # Test the condition that was failing
            if booking.service.service_type_code in ['session', 'workshop', 'course']:
                print(f"✅ Service type check works correctly!")
            else:
                print(f"Service type is: {booking.service.service_type_code}")
        else:
            print("No bookings found in database")
    else:
        print("No services found in database")
        
    # List all service types
    print("\nAvailable service types:")
    for st in ServiceType.objects.all():
        print(f"  - {st.name} (code: {st.code})")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()