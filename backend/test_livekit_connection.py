#!/usr/bin/env python
"""
Test script to verify LiveKit connection and create a room.
Run this from the backend directory with: python test_livekit_connection.py
"""
import os
import sys
import asyncio
from livekit import api

# LiveKit credentials from .env
LIVEKIT_HOST = "https://estuary-7c9zqoo6.livekit.cloud"
LIVEKIT_API_KEY = "API6HzqN6Vfg79Q"
LIVEKIT_API_SECRET = "ie7vTHPpe7eSUteYaHeFuqwgk2aUNIJLI6ASicABPcmF"

async def test_livekit_connection():
    """Test basic LiveKit connection and room operations."""
    
    print("🔧 Testing LiveKit Connection...")
    print(f"Server: {LIVEKIT_HOST}")
    print(f"API Key: {LIVEKIT_API_KEY}")
    print(f"API Secret: {LIVEKIT_API_SECRET[:8]}...")
    
    try:
        # Initialize LiveKit client
        lk_api = api.LiveKitAPI(
            url=LIVEKIT_HOST,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET
        )
        
        print("\n✅ LiveKit client initialized successfully!")
        
        # Test 1: List existing rooms
        print("\n🔍 Testing room listing...")
        rooms_response = await lk_api.room.list_rooms(api.ListRoomsRequest())
        rooms = rooms_response.rooms
        print(f"Found {len(rooms)} existing rooms:")
        for room in rooms:
            print(f"  - {room.name} (SID: {room.sid})")
        
        # Test 2: Create a test room
        test_room_name = "test-booking-79-room"
        print(f"\n🏗️  Creating test room: {test_room_name}")
        
        # Check if room already exists
        existing_room = None
        for room in rooms:
            if room.name == test_room_name:
                existing_room = room
                break
        
        if existing_room:
            print(f"Room already exists: {existing_room.name} (SID: {existing_room.sid})")
            room_info = existing_room
        else:
            # Create new room
            room_info = await lk_api.room.create_room(
                api.CreateRoomRequest(
                    name=test_room_name,
                    empty_timeout=600,  # 10 minutes
                    max_participants=2,
                    metadata="Created by test script for booking 79"
                )
            )
            print(f"✅ Room created successfully!")
            print(f"Room Name: {room_info.name}")
            print(f"Room SID: {room_info.sid}")
            print(f"Created At: {room_info.creation_time}")
        
        # Test 3: Generate access token
        print(f"\n🎫 Generating access token for room: {room_info.name}")
        
        from livekit.api import AccessToken, VideoGrants
        
        token = AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        token.identity = "test-user-123"
        token.name = "Test User"
        
        # Grant permissions
        grants = VideoGrants(
            room_join=True,
            room=room_info.name,
            can_publish=True,
            can_subscribe=True,
        )
        token.video_grants = grants
        
        # Generate JWT
        jwt_token = token.to_jwt()
        print(f"✅ Token generated successfully!")
        print(f"Token length: {len(jwt_token)} characters")
        print(f"Token preview: {jwt_token[:50]}...")
        
        # Test 4: Get room info
        print(f"\n📊 Getting room details...")
        participants_response = await lk_api.room.list_participants(
            api.ListParticipantsRequest(room=room_info.name)
        )
        print(f"Current participants: {len(participants_response.participants)}")
        
        print(f"\n🎉 All tests passed! LiveKit is working correctly.")
        print(f"\n🔗 Frontend can connect to: {room_info.name}")
        print(f"🎫 Use this token for testing: {jwt_token}")
        
        return {
            'room_name': room_info.name,
            'room_sid': room_info.sid,
            'token': jwt_token,
            'server_url': LIVEKIT_HOST.replace('https://', 'wss://')  # Frontend needs wss:// for WebSocket
        }
        
    except Exception as e:
        print(f"\n❌ LiveKit test failed: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        
        # Common troubleshooting
        print(f"\n🔍 Troubleshooting:")
        print(f"1. Check if credentials are correct")
        print(f"2. Verify LiveKit Cloud instance is active")
        print(f"3. Ensure API key has proper permissions")
        print(f"4. Check network connectivity")
        
        return None

def update_django_room():
    """Update the Django room model with the actual LiveKit room."""
    
    print(f"\n🔧 Updating Django Room model...")
    
    try:
        # Setup Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
        import django
        django.setup()
        
        from rooms.models import Room
        from bookings.models import Booking
        
        # Find the room for booking 79
        booking = Booking.objects.get(id=79)
        room = Room.objects.filter(booking=booking).first()
        
        if not room:
            print(f"❌ No Django room found for booking 79")
            return False
        
        print(f"Found Django room: {room.public_uuid}")
        print(f"LiveKit room name: {room.livekit_room_name}")
        
        # Update the room with actual LiveKit SID if we have it
        test_result = test_livekit_connection()
        if test_result:
            # Update room status to active since LiveKit is working
            room.status = 'pending'  # Ready to be joined
            room.save()
            print(f"✅ Updated room status to pending")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to update Django room: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 LiveKit Connection Test")
    print("=" * 60)
    
    # Test LiveKit connection
    result = asyncio.run(test_livekit_connection())
    
    if result:
        print(f"\n" + "=" * 60)
        print("🔗 CONNECTION DETAILS")
        print("=" * 60)
        print(f"Room Name: {result['room_name']}")
        print(f"Server URL: {result['server_url']}")
        print(f"Token: {result['token']}")
        
        # Try to update Django room
        update_django_room()
        
        print(f"\n🎯 Next Steps:")
        print(f"1. Use room name '{result['room_name']}' in your frontend")
        print(f"2. Test the token with LiveKit React components")
        print(f"3. Check if booking 79 room access works now")
    else:
        print(f"\n❌ LiveKit connection failed. Check credentials and try again.")