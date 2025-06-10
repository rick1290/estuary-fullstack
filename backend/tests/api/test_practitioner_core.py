#!/usr/bin/env python3
"""
Core practitioner API tests - focused on essential functionality.
"""
import asyncio
import httpx
import json
from datetime import datetime, timedelta
from typing import Dict, Optional

API_BASE_URL = "http://localhost:8001/api/v1"

class PractitionerAPITest:
    def __init__(self):
        self.client = httpx.AsyncClient()
        self.headers = {"Content-Type": "application/json"}
        self.token = None
        self.test_data = {}
    
    async def login(self, email: str, password: str) -> bool:
        """Login and store auth token."""
        response = await self.client.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.headers["Authorization"] = f"Bearer {self.token}"
            return True
        return False
    
    async def get(self, endpoint: str, params: Optional[Dict] = None):
        """GET request with auth."""
        return await self.client.get(
            f"{API_BASE_URL}{endpoint}",
            headers=self.headers,
            params=params
        )
    
    async def post(self, endpoint: str, json: Dict):
        """POST request with auth."""
        return await self.client.post(
            f"{API_BASE_URL}{endpoint}",
            headers=self.headers,
            json=json
        )
    
    async def test_practitioner_onboarding(self):
        """Test practitioner profile creation."""
        print("\n1. PRACTITIONER ONBOARDING")
        print("-" * 40)
        
        # Check if profile exists
        response = await self.get("/practitioners/me")
        if response.status_code == 200:
            self.test_data['practitioner'] = response.json()
            print("✓ Practitioner profile already exists")
            print(f"  Display name: {self.test_data['practitioner'].get('display_name', 'N/A')}")
            return
        
        # Create profile
        response = await self.post("/practitioners", {
            "display_name": "Dr. John Practitioner",
            "bio": "Experienced wellness practitioner",
            "credentials": ["PhD in Wellness", "Certified Yoga Instructor"],
            "specialties": ["Yoga", "Meditation", "Nutrition"],
            "years_of_experience": 10,
            "languages": ["English", "Spanish"],
            "timezone": "America/Los_Angeles",
            "accepts_insurance": False,
            "sliding_scale_available": True,
            "phone": "+1234567890"
        })
        
        if response.status_code in [200, 201]:
            self.test_data['practitioner'] = response.json()
            print(f"✓ Created practitioner profile: {self.test_data['practitioner'].get('display_name')}")
        else:
            print(f"✗ Failed to create profile: {response.status_code} - {response.text}")
    
    async def test_service_creation(self):
        """Test creating different service types."""
        print("\n2. SERVICE CREATION")
        print("-" * 40)
        
        services = [
            {
                "name": "Wellness Consultation",
                "service_type": "session",
                "price": 150.00,
                "duration_minutes": 60
            },
            {
                "name": "Mindfulness Workshop",
                "service_type": "workshop",
                "price": 75.00,
                "duration_minutes": 120,
                "max_participants": 20
            },
            {
                "name": "8-Week Wellness Course",
                "service_type": "course",
                "price": 800.00,
                "duration_minutes": 60,
                "sessions_included": 8
            }
        ]
        
        for service_data in services:
            service_data.update({
                "description": f"Professional {service_data['service_type']} service",
                "is_active": True,
                "is_public": True
            })
            
            response = await self.post("/services/", service_data)
            if response.status_code == 201:
                service = response.json()
                self.test_data[f"service_{service_data['service_type']}"] = service
                print(f"✓ Created {service_data['service_type']}: {service['name']}")
            else:
                print(f"✗ Failed to create {service_data['service_type']}: {response.status_code}")
    
    async def test_schedule_creation(self):
        """Test schedule and availability setup."""
        print("\n3. SCHEDULE & AVAILABILITY")
        print("-" * 40)
        
        # Create weekday schedule
        schedule_data = {
            "name": "Regular Hours",
            "description": "Standard working hours",
            "timezone": "America/Los_Angeles",
            "is_default": True,
            "working_hours": [
                {"day": i, "start_time": "09:00", "end_time": "17:00", "is_active": True}
                for i in range(1, 6)  # Monday to Friday
            ]
        }
        
        response = await self.post("/practitioners/availability/schedules", schedule_data)
        if response.status_code == 201:
            self.test_data['schedule'] = response.json()
            print(f"✓ Created schedule: {self.test_data['schedule']['name']}")
            print(f"  Working days: Monday-Friday, 9:00 AM - 5:00 PM")
        else:
            print(f"✗ Failed to create schedule: {response.status_code} - {response.text[:100]}")
    
    async def test_availability_check(self):
        """Test availability API."""
        print("\n4. AVAILABILITY CHECK")
        print("-" * 40)
        
        if 'practitioner' not in self.test_data:
            print("✗ No practitioner profile available")
            return
        
        # Check availability for next 7 days
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=7)
        
        params = {
            "practitioner_id": self.test_data['practitioner']['id'],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        if 'service_session' in self.test_data:
            params["service_id"] = self.test_data['service_session']['id']
        
        response = await self.get("/practitioners/availability/slots", params)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Availability check successful")
            print(f"  Total slots available: {data.get('total_slots', 0)}")
            
            # Show first few available dates
            if 'slots_by_date' in data and data['slots_by_date']:
                print("  Available dates:")
                for date, slots in list(data['slots_by_date'].items())[:3]:
                    print(f"    - {date}: {len(slots)} slots")
        else:
            print(f"✗ Failed to check availability: {response.status_code}")
    
    async def test_public_listing(self):
        """Test public service discovery."""
        print("\n5. PUBLIC SERVICE LISTING")
        print("-" * 40)
        
        # Test without auth (public access)
        temp_headers = self.headers.copy()
        del temp_headers["Authorization"]
        
        response = await self.client.get(
            f"{API_BASE_URL}/services/",
            headers={"Content-Type": "application/json"},
            params={"is_public": True, "is_active": True}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Public listing accessible")
            print(f"  Total services: {data['total']}")
            for service in data['results'][:3]:
                print(f"  - {service['name']} (${service['price']})")
        else:
            print(f"✗ Failed to get public listing: {response.status_code}")
    
    async def test_messaging(self):
        """Test messaging functionality."""
        print("\n6. MESSAGING TEST")
        print("-" * 40)
        
        # Get conversations
        response = await self.get("/messaging/conversations/")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Messaging API accessible")
            print(f"  Active conversations: {data.get('total', 0)}")
        else:
            print(f"✗ Failed to get conversations: {response.status_code}")
    
    async def test_financial_status(self):
        """Test earnings and financial endpoints."""
        print("\n7. FINANCIAL STATUS")
        print("-" * 40)
        
        # Check earnings
        response = await self.get("/payments/earnings/balance")
        if response.status_code == 200:
            earnings = response.json()
            print(f"✓ Earnings accessible")
            print(f"  Available balance: ${earnings.get('available_balance', 0)}")
            print(f"  Pending balance: ${earnings.get('pending_balance', 0)}")
        else:
            print(f"✗ Failed to get earnings: {response.status_code}")
    
    async def run_tests(self):
        """Run all tests."""
        print("="*60)
        print("PRACTITIONER API CORE FUNCTIONALITY TEST")
        print("="*60)
        
        try:
            # Login as practitioner
            print("\nLogging in as practitioner...")
            if await self.login("practitioner@estuary.com", "practitioner123"):
                print("✓ Login successful")
            else:
                print("✗ Login failed")
                return
            
            # Run tests
            await self.test_practitioner_onboarding()
            await self.test_service_creation()
            await self.test_schedule_creation()
            await self.test_availability_check()
            await self.test_public_listing()
            await self.test_messaging()
            await self.test_financial_status()
            
            print("\n" + "="*60)
            print("TEST COMPLETED")
            print("="*60)
            
            # Summary
            print("\nSummary:")
            print(f"- Practitioner profile: {'✓' if 'practitioner' in self.test_data else '✗'}")
            print(f"- Services created: {sum(1 for k in self.test_data if k.startswith('service_'))}")
            print(f"- Schedule created: {'✓' if 'schedule' in self.test_data else '✗'}")
            
        finally:
            await self.client.aclose()

async def main():
    test = PractitionerAPITest()
    await test.run_tests()

if __name__ == "__main__":
    asyncio.run(main())