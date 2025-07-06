#!/usr/bin/env python
"""
Debug token generation by testing directly with LiveKit API.
"""
import os
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
import django
django.setup()

from rooms.livekit.tokens import get_token_generator
import jwt

def debug_token_generation():
    """Debug token generation step by step."""
    
    print("🔍 Debugging Token Generation")
    print("=" * 50)
    
    try:
        # Get token generator
        generator = get_token_generator()
        print(f"✅ Token generator initialized")
        print(f"   API Key: {generator.api_key}")
        print(f"   API Secret: {generator.api_secret[:10]}...")
        
        # Test parameters
        room_name = "individual-829b8d608f60"
        identity = "9-richard.j.nielsen@gmail.com"
        participant_name = "Richard Nielsen"
        
        print(f"\n📋 Token Parameters:")
        print(f"   Room: {room_name}")
        print(f"   Identity: {identity}")
        print(f"   Name: {participant_name}")
        
        # Generate participant token
        print(f"\n🎫 Generating participant token...")
        token = generator.create_participant_token(
            room_name=room_name,
            identity=identity,
            name=participant_name,
            ttl=3600
        )
        
        print(f"✅ Token generated successfully!")
        print(f"   Length: {len(token)} characters")
        print(f"   Preview: {token[:50]}...")
        
        # Decode token to see contents
        print(f"\n🔍 Decoding token contents...")
        try:
            decoded = jwt.decode(token, options={"verify_signature": False})
            print(f"✅ Token decoded successfully!")
            for key, value in decoded.items():
                print(f"   {key}: {value}")
        except Exception as e:
            print(f"❌ Failed to decode token: {e}")
        
        # Test host token too
        print(f"\n👑 Testing host token...")
        host_token = generator.create_host_token(
            room_name=room_name,
            identity=identity,
            name=participant_name,
            ttl=3600
        )
        
        print(f"✅ Host token generated!")
        host_decoded = jwt.decode(host_token, options={"verify_signature": False})
        print(f"Host token contents:")
        for key, value in host_decoded.items():
            print(f"   {key}: {value}")
        
        return {
            'participant_token': token,
            'host_token': host_token,
            'participant_decoded': decoded,
            'host_decoded': host_decoded
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = debug_token_generation()
    
    if result:
        print(f"\n" + "=" * 50)
        print("🎯 DEBUGGING COMPLETE!")
        print("=" * 50)
        print(f"✅ Both tokens generated successfully")
        print(f"🔑 Test the participant token in LiveKit!")