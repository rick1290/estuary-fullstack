#!/usr/bin/env python
"""
Check the status of the room for booking 79.
"""
import os
import sys
import asyncio
from livekit import api

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
import django
django.setup()

from bookings.models import Booking
from rooms.models import Room

# LiveKit credentials
LIVEKIT_HOST = "https://estuary-7c9zqoo6.livekit.cloud"
LIVEKIT_API_KEY = "API6HzqN6Vfg79Q"
LIVEKIT_API_SECRET = "ie7vTHPpe7eSUteYaHeFuqwgk2aUNIJLI6ASicABPcmF"

async def check_booking_79_room():
    """Check the room status for booking 79."""
    
    print("🔍 Checking Room Status for Booking 79")
    print("=" * 50)
    
    try:
        # Get booking 79
        booking = Booking.objects.get(id=79)
        print(f"📋 Booking 79:")
        print(f"   Service: {booking.service.name}")
        print(f"   Client: {booking.user.email}")
        print(f"   Practitioner: {booking.practitioner.user.email}")
        print(f"   Status: {booking.status}")
        
        # Check Django room
        room = Room.objects.filter(booking=booking).first()
        if not room:
            print(f"\n❌ No Django Room found for booking 79")
            return
        
        print(f"\n🏠 Django Room:")
        print(f"   UUID: {room.public_uuid}")
        print(f"   LiveKit Name: {room.livekit_room_name}")
        print(f"   LiveKit SID: {room.livekit_room_sid or 'None'}")
        print(f"   Status: {room.status}")
        print(f"   Created: {room.created_at}")
        
        # Check if LiveKit room actually exists
        print(f"\n🔗 Checking LiveKit Cloud...")
        lk_api = api.LiveKitAPI(
            url=LIVEKIT_HOST,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET
        )
        
        # List all rooms in LiveKit
        rooms_response = await lk_api.room.list_rooms(api.ListRoomsRequest())
        livekit_rooms = rooms_response.rooms
        
        print(f"Found {len(livekit_rooms)} rooms in LiveKit:")
        for lk_room in livekit_rooms:
            print(f"   - {lk_room.name} (SID: {lk_room.sid})")
        
        # Check if our room exists
        our_room = None
        for lk_room in livekit_rooms:
            if lk_room.name == room.livekit_room_name:
                our_room = lk_room
                break
        
        if our_room:
            print(f"\n✅ LiveKit Room Found!")
            print(f"   Name: {our_room.name}")
            print(f"   SID: {our_room.sid}")
            print(f"   Participants: {our_room.num_participants}")
            print(f"   Created: {our_room.creation_time}")
            
            # Update Django room with SID if missing
            if not room.livekit_room_sid:
                room.livekit_room_sid = our_room.sid
                room.save()
                print(f"   Updated Django room with SID: {our_room.sid}")
                
        else:
            print(f"\n❌ LiveKit Room NOT Found!")
            print(f"Expected room name: {room.livekit_room_name}")
            print(f"\n🔧 Creating missing LiveKit room...")
            
            # Create the missing room
            try:
                new_room = await lk_api.room.create_room(
                    api.CreateRoomRequest(
                        name=room.livekit_room_name,
                        empty_timeout=room.empty_timeout,
                        max_participants=room.max_participants,
                        metadata=f"Booking {booking.id}: {booking.service.name}"
                    )
                )
                
                print(f"✅ Created LiveKit room: {new_room.name}")
                print(f"   SID: {new_room.sid}")
                
                # Update Django room
                room.livekit_room_sid = new_room.sid
                room.status = 'pending'  # Ready to join
                room.save()
                
                print(f"✅ Updated Django room status to 'pending'")
                
            except Exception as e:
                print(f"❌ Failed to create LiveKit room: {e}")
        
        # Test token generation
        print(f"\n🎫 Testing Token Generation...")
        try:
            from livekit.api import AccessToken, VideoGrants
            
            token = AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
            token.identity = f"{booking.user.id}-{booking.user.email}"
            token.name = booking.user.get_full_name() or booking.user.email
            
            grants = VideoGrants(
                room_join=True,
                room=room.livekit_room_name,
                can_publish=True,
                can_subscribe=True,
            )
            token.video_grants = grants
            
            jwt_token = token.to_jwt()
            print(f"✅ Token generated successfully!")
            print(f"   Length: {len(jwt_token)} characters")
            print(f"   Preview: {jwt_token[:50]}...")
            
            return {
                'room_uuid': room.public_uuid,
                'livekit_room_name': room.livekit_room_name,
                'token': jwt_token,
                'status': 'ready'
            }
            
        except Exception as e:
            print(f"❌ Token generation failed: {e}")
            return None
            
    except Booking.DoesNotExist:
        print(f"❌ Booking 79 not found")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    result = asyncio.run(check_booking_79_room())
    
    if result:
        print(f"\n" + "=" * 50)
        print("🎯 READY TO TEST!")
        print("=" * 50)
        print(f"Room UUID: {result['room_uuid']}")
        print(f"LiveKit Room: {result['livekit_room_name']}")
        print(f"Status: {result['status']}")
        print(f"\n💡 The room token API should now work!")
        print(f"Frontend URL: http://localhost:3000/room/booking/79/lobby")
    else:
        print(f"\n❌ Room is not ready yet.")