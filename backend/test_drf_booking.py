#!/usr/bin/env python3
"""
Test DRF booking endpoint
"""
import requests
import json

# Base URLs
FASTAPI_URL = "http://localhost:8000/api/v1"
DRF_URL = "http://localhost:8000/api/v1/drf"

# Test credentials
email = "admin@example.com"
password = "testpass123"

print("Testing DRF vs FastAPI Booking Endpoints")
print("=" * 50)

# First, get auth token from FastAPI
print("\n1. Getting auth token from FastAPI...")
response = requests.post(f"{FASTAPI_URL}/auth/login", json={
    "email": email,
    "password": password
})

if response.status_code == 200:
    token = response.json()["access_token"]
    print(f"✅ Got token: {token[:20]}...")
else:
    print(f"❌ Failed to get token: {response.status_code}")
    print(response.text)
    exit(1)

# Headers for authenticated requests
headers = {"Authorization": f"Bearer {token}"}

# Test DRF bookings endpoint
print("\n2. Testing DRF bookings endpoint...")
try:
    # For DRF, we need session auth since it's configured for SessionAuthentication
    # Let's first try to access it
    response = requests.get(f"{DRF_URL}/bookings/")
    print(f"   Status: {response.status_code}")
    if response.status_code == 403:
        print("   Note: DRF requires session authentication (not JWT)")
        print("   This is expected - in production you'd configure JWT auth for DRF too")
    else:
        print(f"   Response: {response.text[:200]}...")
except Exception as e:
    print(f"   Error: {e}")

# Test FastAPI bookings endpoint for comparison
print("\n3. Testing FastAPI bookings endpoint...")
response = requests.get(f"{FASTAPI_URL}/bookings/", headers=headers)
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"   Found {data.get('count', 0)} bookings")
else:
    print(f"   Error: {response.text}")

# Check if DRF schema is available
print("\n4. Checking DRF schema endpoint...")
response = requests.get(f"{DRF_URL}/schema/")
print(f"   Status: {response.status_code}")
if response.status_code == 200:
    print("   ✅ DRF schema is available")
    # Save schema to file for inspection
    with open("drf_schema.json", "w") as f:
        json.dump(response.json(), f, indent=2)
    print("   Schema saved to drf_schema.json")

print("\n✅ Test completed!")
print("\nKey differences:")
print("- FastAPI: Uses JWT tokens, async, Pydantic schemas")
print("- DRF: Uses session auth (configurable), sync, DRF serializers")
print("- Both can be documented in the same OpenAPI spec")