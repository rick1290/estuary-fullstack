#!/usr/bin/env python3
"""
Test service creation for all types.
"""
import asyncio
import httpx
import json
from decimal import Decimal

API_BASE_URL = "http://localhost:8001/api/v1"

async def test_service_creation():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("======================================================================")
        print("SERVICE CREATION TEST")
        print("======================================================================")
        
        # Login as practitioner
        response = await client.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": "practitioner@estuary.com", "password": "practitioner123"}
        )
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("✓ Practitioner login successful")
        else:
            print(f"✗ Login failed: {response.status_code}")
            return
        
        # Get service types
        print("\n1. SERVICE TYPES")
        print("-" * 50)
        response = await client.get(f"{API_BASE_URL}/services/types", headers=headers)
        if response.status_code == 200:
            service_types = response.json()
            print(f"✓ Found {len(service_types)} service types:")
            type_map = {}
            for st in service_types:
                print(f"  - {st['name']} ({st['code']})")
                type_map[st['code']] = st['id']
        else:
            print(f"✗ Failed to get service types: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
            return
        
        # Get categories
        print("\n2. SERVICE CATEGORIES")
        print("-" * 50)
        response = await client.get(f"{API_BASE_URL}/services/categories", headers=headers)
        if response.status_code == 200:
            categories = response.json()
            print(f"✓ Found {len(categories)} categories:")
            category_id = None
            for cat in categories[:3]:
                print(f"  - {cat['name']} ({cat['slug']})")
                if not category_id:
                    category_id = cat['id']
        else:
            print(f"✗ Failed to get categories: {response.status_code}")
            category_id = None
        
        # Create services
        print("\n3. CREATE SERVICES")
        print("-" * 50)
        
        services_to_create = [
            {
                "name": "Individual Wellness Session",
                "description": "One-on-one personalized wellness consultation",
                "service_type_id": type_map.get('session'),
                "category_id": category_id,
                "price": 150.00,
                "duration_minutes": 60,
                "max_participants": 1,
                "is_active": True,
                "is_public": True
            },
            {
                "name": "Group Meditation Workshop",
                "description": "Group meditation and mindfulness workshop",
                "service_type_id": type_map.get('workshop'),
                "category_id": category_id,
                "price": 75.00,
                "duration_minutes": 120,
                "max_participants": 20,
                "min_participants": 5,
                "is_active": True,
                "is_public": True
            },
            {
                "name": "8-Week Wellness Course",
                "description": "Comprehensive wellness transformation program",
                "service_type_id": type_map.get('course'),
                "category_id": category_id,
                "price": 800.00,
                "duration_minutes": 60,
                "sessions_included": 8,
                "max_participants": 15,
                "is_active": True,
                "is_public": True
            },
            {
                "name": "5-Session Package",
                "description": "Package of 5 individual sessions",
                "service_type_id": type_map.get('package'),
                "category_id": category_id,
                "price": 650.00,
                "duration_minutes": 60,  # Add required field
                "sessions_included": 5,
                "validity_days": 90,
                "is_active": True,
                "is_public": True
            }
        ]
        
        created_services = []
        for service_data in services_to_create:
            if not service_data.get('service_type_id'):
                print(f"✗ Skipping {service_data['name']} - no service type ID")
                continue
            
            response = await client.post(
                f"{API_BASE_URL}/practitioners/me/services",
                headers=headers,
                json=service_data
            )
            
            if response.status_code == 201:
                service = response.json()
                created_services.append(service)
                print(f"✓ Created: {service['name']}")
                print(f"  ID: {service['id']}")
                print(f"  Type: {service.get('service_type', 'N/A')}")
                print(f"  Price: ${service.get('price', 0)}")
                print(f"  Duration: {service.get('duration_minutes', 'N/A')} minutes")
                print()
            else:
                print(f"✗ Failed to create {service_data['name']}: {response.status_code}")
                print(f"  Error: {response.text[:200]}")
        
        # List created services
        print("\n4. LIST MY SERVICES")
        print("-" * 50)
        response = await client.get(f"{API_BASE_URL}/practitioners/me/services", headers=headers)
        if response.status_code == 200:
            services = response.json()
            print(f"✓ Total services: {len(services)}")
            for service in services:
                print(f"  - {service['name']} (${service.get('price', 0)})")
        else:
            print(f"✗ Failed to list services: {response.status_code}")
        
        # Test public listing
        print("\n5. PUBLIC SERVICE LISTING")
        print("-" * 50)
        response = await client.get(f"{API_BASE_URL}/services/")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Public listing accessible")
            print(f"  Total public services: {data.get('total', 0)}")
        else:
            print(f"✗ Failed to get public listing: {response.status_code}")
        
        print("\n" + "="*70)
        print("TEST COMPLETED")
        print("="*70)
        
        return created_services

if __name__ == "__main__":
    asyncio.run(test_service_creation())