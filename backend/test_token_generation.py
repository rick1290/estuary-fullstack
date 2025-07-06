#!/usr/bin/env python
"""
Test token generation for booking 79 room.
"""
import os
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
import django
django.setup()

from bookings.models import Booking
from rooms.models import Room
from livekit.api import AccessToken, VideoGrants

def test_token_generation():
    """Test generating a token for booking 79."""
    
    print("🎫 Testing Token Generation for Booking 79")
    print("=" * 50)
    
    try:
        # Get booking and room
        booking = Booking.objects.get(id=79)
        room = Room.objects.filter(booking=booking).first()
        
        print(f"📋 Booking: {booking.service.name}")
        print(f"👤 Client: {booking.user.email}")
        print(f"🏠 Room: {room.livekit_room_name}")
        print(f"📊 Status: {room.status}")
        
        # Generate token (same logic as Django view)
        user = booking.user
        participant_name = user.get_full_name() or user.email
        identity = f"{user.id}-{user.email}"
        
        print(f"\n🎫 Generating token...")
        print(f"   Identity: {identity}")
        print(f"   Name: {participant_name}")
        print(f"   Room: {room.livekit_room_name}")
        
        # Create token
        token = AccessToken(
            api_key="API6HzqN6Vfg79Q",
            api_secret="ie7vTHPpe7eSUteYaHeFuqwgk2aUNIJLI6ASicABPcmF"
        )
        token.identity = identity
        token.name = participant_name
        
        # Grant permissions
        grants = VideoGrants(
            room_join=True,
            room=room.livekit_room_name,
            can_publish=True,
            can_subscribe=True,
        )
        token.video_grants = grants
        
        # Generate JWT
        jwt_token = token.to_jwt()
        
        print(f"✅ Token generated successfully!")
        print(f"   Length: {len(jwt_token)} characters")
        print(f"   Preview: {jwt_token[:50]}...")
        
        return {
            'room_uuid': str(room.public_uuid),
            'room_name': room.livekit_room_name,
            'token': jwt_token,
            'identity': identity,
            'participant_name': participant_name
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    result = test_token_generation()
    
    if result:
        print(f"\n" + "=" * 50)
        print("🎯 TOKEN READY!")
        print("=" * 50)
        print(f"Room UUID: {result['room_uuid']}")
        print(f"LiveKit Room: {result['room_name']}")
        print(f"Token: {result['token'][:100]}...")
        print(f"\n💡 The room will be auto-created when this token is used!")
        print(f"🌐 Frontend: http://localhost:3000/room/booking/79/lobby")
        print(f"\n🔑 For testing, use:")
        print(f"   Server: wss://estuary-7c9zqoo6.livekit.cloud")
        print(f"   Room: {result['room_name']}")
        print(f"   Token: {result['token']}")
    else:
        print(f"\n❌ Token generation failed")