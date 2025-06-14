#!/usr/bin/env python3
"""
Simple test to check practitioner API state and create basic data.
"""
import asyncio
import httpx
import json

API_BASE_URL = "http://localhost:8001/api/v1"

async def test_practitioner_basic():
    async with httpx.AsyncClient() as client:
        print("="*60)
        print("PRACTITIONER API - BASIC TEST")
        print("="*60)
        
        # 1. Login as practitioner
        print("\n1. LOGIN TEST")
        response = await client.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": "practitioner@estuary.com", "password": "practitioner123"}
        )
        
        if response.status_code != 200:
            print(f"✗ Login failed: {response.status_code}")
            return
        
        auth_data = response.json()
        token = auth_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✓ Login successful")
        print(f"  User ID: {auth_data['user']['id']}")
        print(f"  Email: {auth_data['user']['email']}")
        
        # 2. Check practitioner profile
        print("\n2. PRACTITIONER PROFILE CHECK")
        response = await client.get(
            f"{API_BASE_URL}/practitioners/me",
            headers=headers
        )
        
        if response.status_code == 200:
            profile = response.json()
            print("✓ Practitioner profile exists")
            print(f"  ID: {profile.get('id')}")
            print(f"  Display name: {profile.get('display_name', 'Not set')}")
            print(f"  Status: {profile.get('status', 'Unknown')}")
        else:
            print(f"✗ No practitioner profile: {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            
            # Try to create basic profile by updating user
            print("\n  Attempting to create practitioner profile...")
            # First, check if there's a registration endpoint
            
        # 3. List current services
        print("\n3. CURRENT SERVICES")
        response = await client.get(
            f"{API_BASE_URL}/practitioners/me/services",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Services endpoint accessible")
            print(f"  Total services: {data.get('total', 0)}")
        else:
            print(f"✗ Failed to get services: {response.status_code}")
        
        # 4. Check schedules
        print("\n4. CURRENT SCHEDULES")
        response = await client.get(
            f"{API_BASE_URL}/practitioners/me/availability/schedules",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Schedules endpoint accessible")
            print(f"  Total schedules: {data.get('total', len(data) if isinstance(data, list) else 0)}")
        else:
            print(f"✗ Failed to get schedules: {response.status_code}")
        
        # 5. Try creating a simple service
        print("\n5. CREATE TEST SERVICE")
        service_data = {
            "name": "Test Consultation",
            "description": "A test consultation service",
            "service_type": "session",
            "price": 100.00,
            "duration_minutes": 60,
            "is_active": True,
            "is_public": True
        }
        
        response = await client.post(
            f"{API_BASE_URL}/practitioners/me/services",
            headers=headers,
            json=service_data
        )
        
        if response.status_code in [200, 201]:
            service = response.json()
            print("✓ Service created successfully")
            print(f"  ID: {service.get('id')}")
            print(f"  Name: {service.get('name')}")
        else:
            print(f"✗ Failed to create service: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
        
        # 6. Check user details for practitioner info
        print("\n6. USER DETAILS CHECK")
        response = await client.get(
            f"{API_BASE_URL}/users/me",
            headers=headers
        )
        
        if response.status_code == 200:
            user = response.json()
            print("✓ User details accessible")
            print(f"  Has practitioner profile: {user.get('is_practitioner', False)}")
            print(f"  User type: {user.get('user_type', 'Unknown')}")
        else:
            print(f"✗ Failed to get user details: {response.status_code}")

if __name__ == "__main__":
    asyncio.run(test_practitioner_basic())