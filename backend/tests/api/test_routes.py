#!/usr/bin/env python3
"""
Test specific API routes.
"""
import asyncio
import httpx
import json

API_BASE_URL = "http://localhost:8001/api/v1"

async def test_routes():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("Testing API Routes")
        print("-" * 50)
        
        # Login first
        response = await client.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": "practitioner@estuary.com", "password": "practitioner123"}
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✓ Login successful")
        else:
            print(f"✗ Login failed: {response.status_code}")
            return
        
        # Test routes
        routes = [
            ("GET", "/practitioners", None),
            ("GET", "/practitioners/me", None),
            ("GET", "/practitioners/1", None),
            ("GET", "/services", None),
            ("GET", "/services/types", None),
            ("GET", "/practitioners/availability/schedules", None),
        ]
        
        for method, path, data in routes:
            try:
                if method == "GET":
                    response = await client.get(f"{API_BASE_URL}{path}", headers=headers)
                elif method == "POST":
                    response = await client.post(f"{API_BASE_URL}{path}", headers=headers, json=data)
                
                status = "✓" if 200 <= response.status_code < 300 else "✗"
                print(f"{status} {method} {path}: {response.status_code}")
                
                if response.status_code >= 400:
                    try:
                        error_detail = response.json()
                        print(f"  Error: {error_detail}")
                    except:
                        print(f"  Error: {response.text[:200]}")
                        
            except Exception as e:
                print(f"✗ {method} {path}: {type(e).__name__} - {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_routes())