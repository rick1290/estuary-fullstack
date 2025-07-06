#!/usr/bin/env python
"""
Test LiveKit token generation with direct approach
"""
import jwt
import time
from datetime import datetime, timedelta

# LiveKit credentials
api_key = "API6HzqN6Vfg79Q"
api_secret = "ie7vTHPpe7eSUteYaHeFuqwgk2aUNIJLI6ASicABPcmF"

# Token parameters
identity = "9-richard.j.nielsen@gmail.com"
room_name = "individual-829b8d608f60"
name = "Richard Nielsen"

# Create token payload
now = int(time.time())
exp = now + 3600  # 1 hour

payload = {
    "iss": api_key,
    "sub": identity,
    "iat": now,
    "nbf": now,
    "exp": exp,
    "name": name,
    "video": {
        "room": room_name,
        "roomJoin": True,
        "canPublish": True,
        "canSubscribe": True,
        "canPublishData": True
    }
}

# Generate JWT
token = jwt.encode(payload, api_secret, algorithm="HS256")

print("Generated token with proper video grants:")
print(f"Token: {token}")
print("\nDecoded payload:")
import json
decoded = jwt.decode(token, options={"verify_signature": False})
print(json.dumps(decoded, indent=2))