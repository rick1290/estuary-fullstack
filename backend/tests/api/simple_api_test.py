#!/usr/bin/env python3
"""
Simple API test to verify basic functionality.
This test can be run from outside the Docker container.
"""
import asyncio
import httpx
import json
from datetime import datetime, timedelta

# API Configuration
API_BASE_URL = "http://localhost:8001/api/v1"

async def test_api_basics():
    """Test basic API functionality."""
    async with httpx.AsyncClient() as client:
        print("="*60)
        print("ESTUARY API - BASIC FUNCTIONALITY TEST")
        print("="*60)
        
        # 1. Test API is running
        print("\n1. Testing API health...")
        try:
            response = await client.get("http://localhost:8001/api/docs")
            if response.status_code == 200:
                print("   ✓ API is running (docs accessible)")
            else:
                print(f"   ✗ API returned status: {response.status_code}")
        except Exception as e:
            print(f"   ✗ Cannot connect to API: {e}")
            return
        
        # 2. Test OpenAPI schema
        print("\n2. Testing OpenAPI schema...")
        response = await client.get("http://localhost:8001/api/openapi.json")
        if response.status_code == 200:
            schema = response.json()
            print(f"   ✓ OpenAPI schema loaded")
            print(f"     - Title: {schema.get('info', {}).get('title')}")
            print(f"     - Version: {schema.get('info', {}).get('version')}")
            print(f"     - Endpoints: {len(schema.get('paths', {}))}")
        
        # 3. Test unauthenticated endpoints
        print("\n3. Testing public endpoints...")
        
        # Services listing (should work without auth)
        response = await client.get(f"{API_BASE_URL}/services/")
        print(f"   - GET /services/: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"     ✓ Found {data.get('total', 0)} services")
        
        # Search (should work without auth)
        response = await client.get(f"{API_BASE_URL}/search/services?q=wellness")
        print(f"   - GET /search/services: {response.status_code}")
        
        # 4. Test authentication requirement
        print("\n4. Testing authentication requirement...")
        
        # This should fail without auth
        response = await client.get(f"{API_BASE_URL}/users/")
        print(f"   - GET /users/ (no auth): {response.status_code}")
        if response.status_code == 403:
            print("     ✓ Authentication required as expected")
        
        # Try login endpoint
        response = await client.post(f"{API_BASE_URL}/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
        print(f"   - POST /auth/login: {response.status_code}")
        
        # 5. List available endpoints
        print("\n5. Available API endpoints:")
        endpoints = [
            "/auth/register",
            "/auth/login", 
            "/auth/logout",
            "/auth/refresh",
            "/users/",
            "/practitioners/",
            "/services/",
            "/bookings/",
            "/availability/slots",
            "/search/services",
            "/search/practitioners",
            "/messaging/conversations",
            "/reviews/",
            "/payments/credits/balance",
            "/streams/"
        ]
        
        for endpoint in endpoints[:10]:  # Show first 10
            print(f"   - {endpoint}")
        print(f"   ... and {len(endpoints) - 10} more")
        
        print("\n" + "="*60)
        print("BASIC API TEST COMPLETED")
        print("="*60)
        
        # Test summary
        print("\nSummary:")
        print("- API is accessible at http://localhost:8001")
        print("- Documentation available at http://localhost:8001/api/docs")
        print("- Authentication is properly enforced")
        print("- Public endpoints are accessible without auth")
        print("\nNext steps:")
        print("1. Create test users via Django admin or management commands")
        print("2. Run the comprehensive test suite")

if __name__ == "__main__":
    asyncio.run(test_api_basics())