#!/usr/bin/env python3
"""
Complete practitioner API test suite.
Tests all major functionality from service creation to bookings.
"""
import asyncio
import httpx
import json
from datetime import datetime, timedelta, date
from typing import Dict, Optional, List
import sys

API_BASE_URL = "http://localhost:8001/api/v1"

class PractitionerAPITestSuite:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.headers = {"Content-Type": "application/json"}
        self.practitioner_token = None
        self.client_token = None
        self.test_data = {
            "practitioner": {},
            "services": {},
            "schedules": [],
            "bookings": [],
            "conversations": []
        }
    
    async def login(self, email: str, password: str) -> Dict:
        """Login and return user data."""
        response = await self.client.post(
            f"{API_BASE_URL}/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Login failed for {email}: {response.status_code} - {response.text}")
    
    async def get(self, endpoint: str, params: Optional[Dict] = None, use_client_token: bool = False):
        """GET request with auth."""
        headers = self.headers.copy()
        token = self.client_token if use_client_token else self.practitioner_token
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return await self.client.get(f"{API_BASE_URL}{endpoint}", headers=headers, params=params)
    
    async def post(self, endpoint: str, json: Dict, use_client_token: bool = False):
        """POST request with auth."""
        headers = self.headers.copy()
        token = self.client_token if use_client_token else self.practitioner_token
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return await self.client.post(f"{API_BASE_URL}{endpoint}", headers=headers, json=json)
    
    async def patch(self, endpoint: str, json: Dict, use_client_token: bool = False):
        """PATCH request with auth."""
        headers = self.headers.copy()
        token = self.client_token if use_client_token else self.practitioner_token
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return await self.client.patch(f"{API_BASE_URL}{endpoint}", headers=headers, json=json)
    
    async def delete(self, endpoint: str, use_client_token: bool = False):
        """DELETE request with auth."""
        headers = self.headers.copy()
        token = self.client_token if use_client_token else self.practitioner_token
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return await self.client.delete(f"{API_BASE_URL}{endpoint}", headers=headers)
    
    # ========== TEST METHODS ==========
    
    async def test_1_authentication(self):
        """Test 1: Authentication and profile access."""
        print("\n1. AUTHENTICATION & PROFILE")
        print("-" * 50)
        
        # Login as practitioner
        practitioner_data = await self.login("practitioner@estuary.com", "practitioner123")
        self.practitioner_token = practitioner_data["access_token"]
        print(f"✓ Practitioner login successful")
        
        # Login as client
        client_data = await self.login("client@estuary.com", "client123")
        self.client_token = client_data["access_token"]
        print(f"✓ Client login successful")
        
        # Get practitioner profile
        response = await self.get("/practitioners/me")
        if response.status_code == 200:
            self.test_data["practitioner"] = response.json()
            print(f"✓ Practitioner profile retrieved: {self.test_data['practitioner']['display_name']}")
            print(f"  ID: {self.test_data['practitioner']['id']}")
            print(f"  Status: {self.test_data['practitioner']['practitioner_status']}")
            print(f"  Verified: {self.test_data['practitioner']['is_verified']}")
        else:
            print(f"✗ Failed to get practitioner profile: {response.status_code}")
            print(f"  Response: {response.text[:200]}")
    
    async def test_2_service_creation(self):
        """Test 2: Create all service types."""
        print("\n2. SERVICE CREATION")
        print("-" * 50)
        
        # Get service types first
        response = await self.get("/services/types")
        if response.status_code == 200:
            service_types = response.json()
            print(f"✓ Found {len(service_types)} service types")
        else:
            print("✗ Failed to get service types")
            return
        
        # Map service type codes to IDs
        type_map = {st['code']: st['id'] for st in service_types}
        
        # Get categories
        response = await self.get("/services/categories")
        if response.status_code == 200:
            categories = response.json()
            category_id = categories[0]['id'] if categories else None
        else:
            category_id = None
        
        services = [
            {
                "name": "Individual Wellness Consultation",
                "description": "One-on-one personalized wellness consultation focusing on your health goals",
                "service_type_id": type_map.get('session'),
                "category_id": category_id,
                "price_cents": 15000,  # $150.00
                "duration_minutes": 60,
                "max_participants": 1,
                "is_active": True,
                "is_public": True,
                "booking_buffer_minutes": 15,
                "advance_booking_minutes": 1440,  # 24 hours
                "cancellation_policy_hours": 24
            },
            {
                "name": "Mindfulness Workshop",
                "description": "Group workshop on mindfulness and meditation techniques",
                "service_type_id": type_map.get('workshop'),
                "category_id": category_id,
                "price_cents": 7500,  # $75.00
                "duration_minutes": 120,
                "max_participants": 20,
                "min_participants": 5,
                "is_active": True,
                "is_public": True,
                "booking_buffer_minutes": 30,
                "advance_booking_minutes": 2880,  # 48 hours
                "cancellation_policy_hours": 48
            },
            {
                "name": "8-Week Wellness Transformation",
                "description": "Comprehensive 8-week program for total wellness transformation",
                "service_type_id": type_map.get('course'),
                "category_id": category_id,
                "price_cents": 80000,  # $800.00
                "duration_minutes": 60,
                "sessions_included": 8,
                "max_participants": 15,
                "is_active": True,
                "is_public": True,
                "advance_booking_minutes": 4320,  # 72 hours
                "cancellation_policy_hours": 72
            },
            {
                "name": "5-Session Wellness Package",
                "description": "Package of 5 individual consultations at a discounted rate",
                "service_type_id": type_map.get('package'),
                "category_id": category_id,
                "price_cents": 65000,  # $650.00
                "sessions_included": 5,
                "is_bundle": False,
                "is_package": True,
                "validity_days": 90,
                "is_active": True,
                "is_public": True
            }
        ]
        
        for service_data in services:
            if not service_data.get('service_type_id'):
                print(f"✗ Skipping {service_data['name']} - no service type ID")
                continue
                
            response = await self.post("/services/", service_data)
            if response.status_code == 201:
                service = response.json()
                service_type = next((st['code'] for st in service_types if st['id'] == service_data['service_type_id']), 'unknown')
                self.test_data["services"][service_type] = service
                print(f"✓ Created {service_type}: {service['name']}")
                print(f"  ID: {service['id']}")
                print(f"  Price: ${service.get('price', service.get('price_cents', 0) / 100)}")
            else:
                print(f"✗ Failed to create service: {response.status_code}")
                print(f"  Error: {response.text[:200]}")
    
    async def test_3_schedule_creation(self):
        """Test 3: Create schedules and availability."""
        print("\n3. SCHEDULE & AVAILABILITY SETUP")
        print("-" * 50)
        
        # Create weekday schedule with time slots
        schedule_data = {
            "name": "Regular Business Hours",
            "description": "Monday through Friday standard hours",
            "timezone": "America/Los_Angeles",
            "is_default": True,
            "time_slots": [
                {
                    "day": day,
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "is_active": True
                }
                for day in range(1, 6)  # Monday (1) to Friday (5)
            ]
        }
        
        response = await self.post("/practitioners/availability/schedules", schedule_data)
        if response.status_code in [200, 201]:
            schedule = response.json()
            self.test_data["schedules"].append(schedule)
            print(f"✓ Created schedule: {schedule['name']}")
            print(f"  ID: {schedule['id']}")
            print(f"  Timezone: {schedule['timezone']}")
            print(f"  Time slots: {len(schedule.get('time_slots', []))}")
        else:
            print(f"✗ Failed to create schedule: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
        
        # Create weekend schedule
        weekend_schedule = {
            "name": "Weekend Hours",
            "description": "Limited weekend availability",
            "timezone": "America/Los_Angeles",
            "is_default": False,
            "time_slots": [
                {
                    "day": 6,  # Saturday
                    "start_time": "10:00",
                    "end_time": "14:00",
                    "is_active": True
                }
            ]
        }
        
        response = await self.post("/practitioners/availability/schedules", weekend_schedule)
        if response.status_code in [200, 201]:
            schedule = response.json()
            self.test_data["schedules"].append(schedule)
            print(f"✓ Created weekend schedule: {schedule['name']}")
        else:
            print(f"✗ Failed to create weekend schedule: {response.status_code}")
    
    async def test_4_availability_check(self):
        """Test 4: Check availability for services."""
        print("\n4. AVAILABILITY CHECK")
        print("-" * 50)
        
        if not self.test_data["services"]:
            print("✗ No services available to check availability")
            return
        
        # Get first service
        service = list(self.test_data["services"].values())[0]
        practitioner_id = self.test_data["practitioner"]["id"]
        
        # Check slots for next 7 days
        start_date = date.today()
        end_date = start_date + timedelta(days=7)
        
        params = {
            "practitioner_id": practitioner_id,
            "service_id": service["id"],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
        response = await self.get("/availability/slots", params)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Availability check successful")
            print(f"  Service: {service['name']}")
            print(f"  Date range: {start_date} to {end_date}")
            print(f"  Total slots: {data.get('total_slots', 0)}")
            
            # Show first few available dates
            if 'slots_by_date' in data and data['slots_by_date']:
                print("  Available dates:")
                for date_str, slots in list(data['slots_by_date'].items())[:3]:
                    print(f"    - {date_str}: {len(slots)} slots")
                    if slots:
                        print(f"      First slot: {slots[0]['start_time']}")
        else:
            print(f"✗ Failed to check availability: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
    
    async def test_5_booking_flow(self):
        """Test 5: Complete booking flow."""
        print("\n5. BOOKING FLOW")
        print("-" * 50)
        
        if not self.test_data["services"]:
            print("✗ No services available for booking")
            return
        
        service = list(self.test_data["services"].values())[0]
        practitioner_id = self.test_data["practitioner"]["id"]
        
        # Find an available slot
        tomorrow = date.today() + timedelta(days=1)
        params = {
            "practitioner_id": practitioner_id,
            "service_id": service["id"],
            "start_date": tomorrow.isoformat(),
            "end_date": tomorrow.isoformat()
        }
        
        response = await self.get("/availability/slots", params, use_client_token=True)
        if response.status_code != 200 or not response.json().get('slots_by_date'):
            print("✗ No available slots found for booking")
            return
        
        slots_data = response.json()
        available_slots = []
        for date_str, slots in slots_data['slots_by_date'].items():
            available_slots.extend(slots)
        
        if not available_slots:
            print("✗ No available slots for tomorrow")
            return
        
        # Book the first available slot
        slot = available_slots[0]
        booking_data = {
            "service_id": service["id"],
            "practitioner_id": practitioner_id,
            "start_time": slot["start_time"],
            "timezone": "America/Los_Angeles",
            "notes": "Looking forward to the session!"
        }
        
        response = await self.post("/bookings/", booking_data, use_client_token=True)
        if response.status_code == 201:
            booking = response.json()
            self.test_data["bookings"].append(booking)
            print(f"✓ Booking created successfully")
            print(f"  ID: {booking['id']}")
            print(f"  Service: {booking.get('service_name', service['name'])}")
            print(f"  Time: {booking['start_time']}")
            print(f"  Status: {booking['status']}")
        else:
            print(f"✗ Failed to create booking: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
    
    async def test_6_service_discovery(self):
        """Test 6: Test public service discovery."""
        print("\n6. SERVICE DISCOVERY")
        print("-" * 50)
        
        # Test public listing (no auth needed)
        response = await self.client.get(
            f"{API_BASE_URL}/services/",
            params={"is_public": True, "is_active": True}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Public services listing accessible")
            print(f"  Total services: {data['total']}")
            if data['results']:
                print("  Sample services:")
                for service in data['results'][:3]:
                    print(f"    - {service['name']} (${service.get('price', 0)})")
        else:
            print(f"✗ Failed to get public services: {response.status_code}")
        
        # Test search functionality
        response = await self.client.get(
            f"{API_BASE_URL}/search/services",
            params={"q": "wellness", "is_active": True}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Service search functional")
            print(f"  Search results: {data.get('total', 0)} services found")
        else:
            print(f"✗ Service search failed: {response.status_code}")
    
    async def test_7_messaging(self):
        """Test 7: Messaging between client and practitioner."""
        print("\n7. MESSAGING")
        print("-" * 50)
        
        # Client creates conversation with practitioner
        message_data = {
            "recipient_id": self.test_data["practitioner"]["user_id"],
            "initial_message": {
                "content": "Hi! I have some questions about your wellness consultation service.",
                "message_type": "text"
            }
        }
        
        response = await self.post("/messaging/conversations/", message_data, use_client_token=True)
        if response.status_code in [200, 201]:
            conversation = response.json()
            self.test_data["conversations"].append(conversation)
            print(f"✓ Conversation created")
            print(f"  ID: {conversation['id']}")
            print(f"  Participants: {len(conversation.get('participants', []))}")
        else:
            print(f"✗ Failed to create conversation: {response.status_code}")
            print(f"  Error: {response.text[:200]}")
    
    async def test_8_financial_overview(self):
        """Test 8: Check financial status."""
        print("\n8. FINANCIAL OVERVIEW")
        print("-" * 50)
        
        # Check practitioner earnings
        response = await self.get("/payments/earnings/balance")
        if response.status_code == 200:
            earnings = response.json()
            print(f"✓ Practitioner earnings accessible")
            print(f"  Available balance: ${earnings.get('available_balance', 0)}")
            print(f"  Pending balance: ${earnings.get('pending_balance', 0)}")
            print(f"  Total earned: ${earnings.get('total_earned', 0)}")
        else:
            print(f"✗ Failed to get earnings: {response.status_code}")
        
        # Check client credit balance
        response = await self.get("/payments/credits/balance", use_client_token=True)
        if response.status_code == 200:
            balance = response.json()
            print(f"✓ Client credit balance accessible")
            print(f"  Current balance: ${balance.get('balance', 0)}")
        else:
            print(f"✗ Failed to get credit balance: {response.status_code}")
    
    async def test_9_analytics(self):
        """Test 9: Check practitioner analytics."""
        print("\n9. ANALYTICS")
        print("-" * 50)
        
        response = await self.get("/practitioners/me/analytics")
        if response.status_code == 200:
            analytics = response.json()
            print(f"✓ Analytics accessible")
            print(f"  Total bookings: {analytics.get('total_bookings', 0)}")
            print(f"  Revenue: ${analytics.get('total_revenue', 0)}")
            print(f"  Average rating: {analytics.get('average_rating', 'N/A')}")
        else:
            print(f"✗ Failed to get analytics: {response.status_code}")
    
    async def run_all_tests(self):
        """Run all tests in sequence."""
        print("="*70)
        print("PRACTITIONER API COMPLETE TEST SUITE")
        print("="*70)
        
        try:
            await self.test_1_authentication()
            await self.test_2_service_creation()
            await self.test_3_schedule_creation()
            await self.test_4_availability_check()
            await self.test_5_booking_flow()
            await self.test_6_service_discovery()
            await self.test_7_messaging()
            await self.test_8_financial_overview()
            await self.test_9_analytics()
            
            print("\n" + "="*70)
            print("TEST SUITE COMPLETED")
            print("="*70)
            
            # Summary
            print("\nTest Summary:")
            print(f"✓ Practitioner authenticated: {'✓' if self.practitioner_token else '✗'}")
            print(f"✓ Services created: {len(self.test_data['services'])}")
            print(f"✓ Schedules created: {len(self.test_data['schedules'])}")
            print(f"✓ Bookings made: {len(self.test_data['bookings'])}")
            print(f"✓ Conversations: {len(self.test_data['conversations'])}")
            
        except Exception as e:
            print(f"\n✗ Test suite error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            await self.client.aclose()

async def main():
    """Run the complete test suite."""
    tester = PractitionerAPITestSuite()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())