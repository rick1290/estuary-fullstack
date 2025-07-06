#!/usr/bin/env python
"""
Test LiveKit token generation directly
"""
import base64
import json

# Test token from the logs
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5LXJpY2hhcmQuai5uaWVsc2VuQGdtYWlsLmNvbSIsImlzcyI6IkFQSXJlVEplSlc1Z2U0ZCIsIm5iZiI6MTc1MTc5Mjc0MCwiZXhwIjoxNzUxODA3MTQwfQ.NV3MHfUXvFVpj9EXL2CufEduDp-i_Rh7mQbQX9xOwgw"

# Split the token
parts = token.split('.')

# Decode header
header = json.loads(base64.urlsafe_b64decode(parts[0] + '=='))
print("Header:")
print(json.dumps(header, indent=2))

# Decode payload
payload = json.loads(base64.urlsafe_b64decode(parts[1] + '=='))
print("\nPayload:")
print(json.dumps(payload, indent=2))

print("\nISSUE: The token is missing the 'video' claim with room permissions!")
print("\nExpected payload structure:")
print(json.dumps({
    "sub": "identity",
    "iss": "api-key",
    "nbf": 1234567890,
    "exp": 1234567890,
    "video": {
        "room": "room-name",
        "roomJoin": True,
        "canPublish": True,
        "canSubscribe": True
    }
}, indent=2))