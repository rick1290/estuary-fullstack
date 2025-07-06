#!/usr/bin/env python
"""
Fix the room for booking 79 by ensuring it exists in LiveKit.
"""
import os
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
import django
django.setup()

from bookings.models import Booking
from rooms.models import Room
from rooms.signals import create_livekit_room

def fix_booking_79_room():
    """Fix the room for booking 79."""
    
    print("🔧 Fixing Room for Booking 79")
    print("=" * 40)
    
    try:
        # Get booking 79
        booking = Booking.objects.get(id=79)
        print(f"📋 Found booking 79: {booking.service.name}")
        
        # Get Django room
        room = Room.objects.filter(booking=booking).first()
        if not room:
            print("❌ No Django room found")
            return False
        
        print(f"🏠 Django room: {room.public_uuid}")
        print(f"   LiveKit name: {room.livekit_room_name}")
        print(f"   LiveKit SID: {room.livekit_room_sid or 'None'}")
        print(f"   Status: {room.status}")
        
        # Force create the LiveKit room
        print(f"\n🏗️ Creating LiveKit room...")
        try:
            create_livekit_room(room)
            print(f"✅ LiveKit room creation initiated")
            
            # Refresh from database
            room.refresh_from_db()
            print(f"   Updated SID: {room.livekit_room_sid or 'Still None'}")
            
            if room.livekit_room_sid:
                room.status = 'pending'  # Ready to join
                room.save()
                print(f"✅ Room status updated to 'pending'")
                return True
            else:
                print(f"⚠️ Room created but SID not set (check logs)")
                return False
                
        except Exception as e:
            print(f"❌ Failed to create LiveKit room: {e}")
            print(f"   This might be because LiveKit wasn't configured when room was first created")
            return False
            
    except Booking.DoesNotExist:
        print("❌ Booking 79 not found")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = fix_booking_79_room()
    
    if success:
        print(f"\n🎉 SUCCESS!")
        print(f"Room for booking 79 should now work")
        print(f"Try: http://localhost:3000/room/booking/79/lobby")
    else:
        print(f"\n💡 Alternative: The room will be created when someone first requests a token")
        print(f"The 400 errors should stop once rate limit clears")