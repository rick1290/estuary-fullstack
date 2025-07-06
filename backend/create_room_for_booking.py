#!/usr/bin/env python
"""
Quick script to create a room for booking 79 for testing.
Run this from the backend directory with: python create_room_for_booking.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from bookings.models import Booking
from rooms.models import Room, RoomTemplate
from django.utils import timezone
import uuid

def create_room_for_booking(booking_id):
    """Create a room for a specific booking."""
    try:
        # Get the booking
        booking = Booking.objects.get(id=booking_id)
        print(f"Found booking {booking_id}: {booking}")
        print(f"Status: {booking.status}")
        print(f"Service: {booking.service}")
        print(f"Practitioner: {booking.practitioner}")
        print(f"Client: {booking.user}")
        
        # Check if room already exists
        if hasattr(booking, 'livekit_room') and booking.livekit_room:
            print(f"Room already exists: {booking.livekit_room}")
            return booking.livekit_room
        
        # Get or create default template
        template, created = RoomTemplate.objects.get_or_create(
            room_type='individual',
            is_default=True,
            defaults={
                'name': 'Default Individual Template',
                'description': 'Default template for 1-on-1 sessions',
                'empty_timeout': 300,
                'max_participants': 2,
                'recording_enabled': False,
                'sip_enabled': False,
                'is_active': True,
            }
        )
        
        if created:
            print(f"Created default template: {template}")
        else:
            print(f"Using existing template: {template}")
        
        # Create the room
        room = Room.objects.create(
            booking=booking,
            room_type='individual',
            template=template,
            created_by=booking.practitioner.user if booking.practitioner else booking.user,
            name=f"{booking.service.name} - {booking.user.get_full_name()}",
            scheduled_start=booking.start_time,
            scheduled_end=booking.end_time,
            max_participants=2,
            recording_enabled=False,
            sip_enabled=False,
            metadata={
                'booking_id': str(booking.id),
                'service_id': str(booking.service.id),
                'service_name': booking.service.name,
                'created_for_testing': True
            }
        )
        
        print(f"Created room: {room}")
        print(f"Room UUID: {room.public_uuid}")
        print(f"LiveKit room name: {room.livekit_room_name}")
        print(f"Scheduled: {room.scheduled_start} to {room.scheduled_end}")
        
        return room
        
    except Booking.DoesNotExist:
        print(f"Booking {booking_id} not found")
        return None
    except Exception as e:
        print(f"Error creating room: {e}")
        return None

if __name__ == "__main__":
    booking_id = 79
    room = create_room_for_booking(booking_id)
    
    if room:
        print(f"\n✅ Success! Room created for booking {booking_id}")
        print(f"You can now test at: http://localhost:3000/room/booking/{booking_id}/lobby")
    else:
        print(f"\n❌ Failed to create room for booking {booking_id}")