#!/usr/bin/env python
"""
Comprehensive API tests for practitioner functionality.
Tests all major features from a practitioner's perspective.
"""
import os
import sys
import asyncio
import json
from datetime import datetime, timedelta, date, time
from decimal import Decimal
import httpx
from typing import Dict, List, Optional
import pytz

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
import django
django.setup()

# API Configuration
API_BASE_URL = "http://localhost:8001/api/v1"
ADMIN_EMAIL = "admin@estuary.com"
ADMIN_PASSWORD = "admin123"
PRACTITIONER_EMAIL = "practitioner@estuary.com"
PRACTITIONER_PASSWORD = "practitioner123"
CLIENT_EMAIL = "client@estuary.com"
CLIENT_PASSWORD = "client123"

class APITestClient:
    """HTTP client for API testing with authentication support."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
        self.token = None
        self.headers = {"Content-Type": "application/json"}
    
    async def login(self, email: str, password: str) -> Dict:
        """Login and store authentication token."""
        response = await self.client.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.headers["Authorization"] = f"Bearer {self.token}"
            return data
        else:
            raise Exception(f"Login failed: {response.status_code} - {response.text}")
    
    async def get(self, endpoint: str, params: Optional[Dict] = None) -> httpx.Response:
        """GET request with authentication."""
        return await self.client.get(
            f"{self.base_url}{endpoint}",
            headers=self.headers,
            params=params
        )
    
    async def post(self, endpoint: str, json: Optional[Dict] = None, files: Optional[Dict] = None) -> httpx.Response:
        """POST request with authentication."""
        kwargs = {"headers": self.headers}
        if json:
            kwargs["json"] = json
        if files:
            kwargs["files"] = files
        return await self.client.post(f"{self.base_url}{endpoint}", **kwargs)
    
    async def patch(self, endpoint: str, json: Dict) -> httpx.Response:
        """PATCH request with authentication."""
        return await self.client.patch(
            f"{self.base_url}{endpoint}",
            headers=self.headers,
            json=json
        )
    
    async def delete(self, endpoint: str) -> httpx.Response:
        """DELETE request with authentication."""
        return await self.client.delete(
            f"{self.base_url}{endpoint}",
            headers=self.headers
        )
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


class PractitionerAPITests:
    """Test suite for practitioner API functionality."""
    
    def __init__(self):
        self.client = APITestClient(API_BASE_URL)
        self.test_data = {
            "users": {},
            "practitioner": {},
            "services": {},
            "schedules": {},
            "bookings": [],
            "messages": [],
            "streams": []
        }
    
    async def setup_test_data(self):
        """Create initial test users and practitioner profile."""
        print("\n=== SETTING UP TEST DATA ===")
        
        # 1. Create admin user (if not exists)
        print("1. Creating admin user...")
        # In a real test, we'd create users via Django management command
        # For now, assume they exist or create them manually
        
        # 2. Login as admin
        print("2. Logging in as admin...")
        try:
            admin_data = await self.client.login(ADMIN_EMAIL, ADMIN_PASSWORD)
            self.test_data["users"]["admin"] = admin_data["user"]
            print(f"   ✓ Admin logged in: {admin_data['user']['email']}")
        except:
            print("   ✗ Admin login failed - creating admin user...")
            # Create admin user via management command or API if available
            pass
        
        # 3. Create practitioner user
        print("3. Creating practitioner user...")
        response = await self.client.post("/users/", json={
            "email": PRACTITIONER_EMAIL,
            "password": PRACTITIONER_PASSWORD,
            "first_name": "John",
            "last_name": "Practitioner",
            "is_active": True
        })
        if response.status_code == 201:
            self.test_data["users"]["practitioner"] = response.json()
            print(f"   ✓ Practitioner user created: {PRACTITIONER_EMAIL}")
        else:
            print(f"   - Practitioner may already exist: {response.status_code}")
        
        # 4. Create client user
        print("4. Creating client user...")
        response = await self.client.post("/users/", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD,
            "first_name": "Jane",
            "last_name": "Client",
            "is_active": True
        })
        if response.status_code == 201:
            self.test_data["users"]["client"] = response.json()
            print(f"   ✓ Client user created: {CLIENT_EMAIL}")
        else:
            print(f"   - Client may already exist: {response.status_code}")
        
        # 5. Login as practitioner
        print("5. Logging in as practitioner...")
        practitioner_data = await self.client.login(PRACTITIONER_EMAIL, PRACTITIONER_PASSWORD)
        self.test_data["users"]["practitioner"] = practitioner_data["user"]
        print(f"   ✓ Practitioner logged in: {practitioner_data['user']['email']}")
        
        # 6. Create practitioner profile
        print("6. Creating practitioner profile...")
        response = await self.client.post("/practitioners/onboarding/start", json={
            "display_name": "Dr. John Practitioner",
            "bio": "Experienced wellness practitioner specializing in holistic health",
            "credentials": ["PhD in Wellness", "Certified Yoga Instructor"],
            "specialties": ["Yoga", "Meditation", "Nutrition"],
            "years_of_experience": 10,
            "languages": ["English", "Spanish"],
            "timezone": "America/Los_Angeles"
        })
        if response.status_code in [200, 201]:
            self.test_data["practitioner"] = response.json()
            print(f"   ✓ Practitioner profile created: {self.test_data['practitioner']['display_name']}")
        else:
            print(f"   ✗ Failed to create practitioner profile: {response.status_code} - {response.text}")
    
    async def test_service_creation(self):
        """Test creating all types of services."""
        print("\n=== TESTING SERVICE CREATION ===")
        
        # 1. Create SESSION service
        print("1. Creating session service...")
        response = await self.client.post("/services/", json={
            "name": "Individual Wellness Consultation",
            "description": "One-on-one personalized wellness consultation",
            "service_type": "session",
            "category": "wellness",
            "price": 150.00,
            "duration_minutes": 60,
            "max_participants": 1,
            "is_active": True,
            "is_public": True,
            "booking_requirements": {
                "advance_booking_hours": 24,
                "cancellation_hours": 12
            }
        })
        if response.status_code == 201:
            self.test_data["services"]["session"] = response.json()
            print(f"   ✓ Session created: {self.test_data['services']['session']['name']}")
        else:
            print(f"   ✗ Failed to create session: {response.status_code} - {response.text}")
        
        # 2. Create WORKSHOP service
        print("2. Creating workshop service...")
        response = await self.client.post("/services/", json={
            "name": "Mindfulness Workshop",
            "description": "Group workshop on mindfulness techniques",
            "service_type": "workshop",
            "category": "wellness",
            "price": 75.00,
            "duration_minutes": 120,
            "max_participants": 20,
            "min_participants": 5,
            "is_active": True,
            "is_public": True,
            "booking_requirements": {
                "advance_booking_hours": 48,
                "cancellation_hours": 24
            }
        })
        if response.status_code == 201:
            self.test_data["services"]["workshop"] = response.json()
            print(f"   ✓ Workshop created: {self.test_data['services']['workshop']['name']}")
        else:
            print(f"   ✗ Failed to create workshop: {response.status_code} - {response.text}")
        
        # 3. Create COURSE service
        print("3. Creating course service...")
        response = await self.client.post("/services/", json={
            "name": "8-Week Wellness Transformation",
            "description": "Comprehensive 8-week wellness program",
            "service_type": "course",
            "category": "wellness",
            "price": 800.00,
            "duration_minutes": 60,
            "sessions_included": 8,
            "max_participants": 15,
            "is_active": True,
            "is_public": True,
            "booking_requirements": {
                "advance_booking_hours": 72,
                "cancellation_hours": 48
            }
        })
        if response.status_code == 201:
            self.test_data["services"]["course"] = response.json()
            print(f"   ✓ Course created: {self.test_data['services']['course']['name']}")
        else:
            print(f"   ✗ Failed to create course: {response.status_code} - {response.text}")
        
        # 4. Create PACKAGE service (collection of sessions)
        print("4. Creating package service...")
        response = await self.client.post("/services/", json={
            "name": "5-Session Wellness Package",
            "description": "Package of 5 individual wellness sessions",
            "service_type": "package",
            "category": "wellness",
            "price": 650.00,
            "sessions_included": 5,
            "validity_days": 90,
            "is_active": True,
            "is_public": True,
            "child_service_ids": [self.test_data["services"]["session"]["id"]] if "session" in self.test_data["services"] else []
        })
        if response.status_code == 201:
            self.test_data["services"]["package"] = response.json()
            print(f"   ✓ Package created: {self.test_data['services']['package']['name']}")
        else:
            print(f"   ✗ Failed to create package: {response.status_code} - {response.text}")
        
        # 5. Create BUNDLE service (multiple different services)
        print("5. Creating bundle service...")
        child_services = []
        if "session" in self.test_data["services"]:
            child_services.append(self.test_data["services"]["session"]["id"])
        if "workshop" in self.test_data["services"]:
            child_services.append(self.test_data["services"]["workshop"]["id"])
        
        response = await self.client.post("/services/", json={
            "name": "Complete Wellness Bundle",
            "description": "Bundle including consultation and workshop",
            "service_type": "bundle",
            "category": "wellness",
            "price": 200.00,
            "is_active": True,
            "is_public": True,
            "child_service_ids": child_services
        })
        if response.status_code == 201:
            self.test_data["services"]["bundle"] = response.json()
            print(f"   ✓ Bundle created: {self.test_data['services']['bundle']['name']}")
        else:
            print(f"   ✗ Failed to create bundle: {response.status_code} - {response.text}")
    
    async def test_schedule_creation(self):
        """Test creating schedules and availability."""
        print("\n=== TESTING SCHEDULE CREATION ===")
        
        # 1. Create default weekday schedule
        print("1. Creating weekday schedule...")
        response = await self.client.post("/practitioners/schedules/", json={
            "name": "Weekday Schedule",
            "description": "Regular weekday working hours",
            "timezone": "America/Los_Angeles",
            "is_default": True,
            "working_hours": [
                {
                    "day": 1,  # Monday
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "is_active": True
                },
                {
                    "day": 2,  # Tuesday
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "is_active": True
                },
                {
                    "day": 3,  # Wednesday
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "is_active": True
                },
                {
                    "day": 4,  # Thursday
                    "start_time": "09:00",
                    "end_time": "17:00",
                    "is_active": True
                },
                {
                    "day": 5,  # Friday
                    "start_time": "09:00",
                    "end_time": "15:00",
                    "is_active": True
                }
            ]
        })
        if response.status_code == 201:
            self.test_data["schedules"]["weekday"] = response.json()
            print(f"   ✓ Weekday schedule created: {self.test_data['schedules']['weekday']['name']}")
        else:
            print(f"   ✗ Failed to create weekday schedule: {response.status_code} - {response.text}")
        
        # 2. Create weekend schedule
        print("2. Creating weekend schedule...")
        response = await self.client.post("/practitioners/schedules/", json={
            "name": "Weekend Schedule",
            "description": "Weekend availability",
            "timezone": "America/Los_Angeles",
            "is_default": False,
            "working_hours": [
                {
                    "day": 6,  # Saturday
                    "start_time": "10:00",
                    "end_time": "14:00",
                    "is_active": True
                }
            ]
        })
        if response.status_code == 201:
            self.test_data["schedules"]["weekend"] = response.json()
            print(f"   ✓ Weekend schedule created: {self.test_data['schedules']['weekend']['name']}")
        else:
            print(f"   ✗ Failed to create weekend schedule: {response.status_code} - {response.text}")
        
        # 3. Add availability exception (time off)
        print("3. Adding time off exception...")
        next_week = datetime.now() + timedelta(days=7)
        response = await self.client.post("/practitioners/availability-exceptions/", json={
            "exception_type": "time_off",
            "start_date": next_week.strftime("%Y-%m-%d"),
            "end_date": (next_week + timedelta(days=2)).strftime("%Y-%m-%d"),
            "reason": "Personal time off",
            "all_day": True
        })
        if response.status_code == 201:
            print(f"   ✓ Time off added: {response.json()['start_date']} to {response.json()['end_date']}")
        else:
            print(f"   ✗ Failed to add time off: {response.status_code} - {response.text}")
    
    async def test_availability_api(self):
        """Test fetching availability for different services."""
        print("\n=== TESTING AVAILABILITY API ===")
        
        if "session" not in self.test_data["services"]:
            print("   ✗ No session service available for testing")
            return
        
        service_id = self.test_data["services"]["session"]["id"]
        practitioner_id = self.test_data["practitioner"]["id"]
        
        # 1. Get available slots for next 7 days
        print("1. Fetching available slots for session service...")
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=7)
        
        response = await self.client.get(
            f"/availability/slots",
            params={
                "practitioner_id": practitioner_id,
                "service_id": service_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Found {data['total_slots']} available slots")
            if data['slots_by_date']:
                for date_str, slots in list(data['slots_by_date'].items())[:3]:  # Show first 3 days
                    print(f"     - {date_str}: {len(slots)} slots available")
        else:
            print(f"   ✗ Failed to fetch availability: {response.status_code} - {response.text}")
        
        # 2. Check specific time slot availability
        print("2. Checking specific time slot...")
        tomorrow = datetime.now() + timedelta(days=1)
        slot_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        response = await self.client.post("/availability/check", json={
            "practitioner_id": practitioner_id,
            "service_id": service_id,
            "start_time": slot_time.isoformat(),
            "duration_minutes": 60
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Slot availability: {'Available' if data['is_available'] else 'Not available'}")
            if not data['is_available']:
                print(f"     Reason: {data.get('reason', 'Unknown')}")
        else:
            print(f"   ✗ Failed to check availability: {response.status_code} - {response.text}")
    
    async def test_booking_flow(self):
        """Test the booking process."""
        print("\n=== TESTING BOOKING FLOW ===")
        
        # Switch to client user
        print("1. Logging in as client...")
        await self.client.login(CLIENT_EMAIL, CLIENT_PASSWORD)
        print(f"   ✓ Logged in as client: {CLIENT_EMAIL}")
        
        if "session" not in self.test_data["services"]:
            print("   ✗ No session service available for booking")
            return
        
        service_id = self.test_data["services"]["session"]["id"]
        practitioner_id = self.test_data["practitioner"]["id"]
        
        # 2. Create a booking
        print("2. Creating booking...")
        tomorrow = datetime.now() + timedelta(days=1)
        booking_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        response = await self.client.post("/bookings/", json={
            "service_id": service_id,
            "practitioner_id": practitioner_id,
            "start_time": booking_time.isoformat(),
            "timezone": "America/Los_Angeles",
            "notes": "Looking forward to the session"
        })
        
        if response.status_code == 201:
            booking = response.json()
            self.test_data["bookings"].append(booking)
            print(f"   ✓ Booking created: {booking['id']}")
            print(f"     - Service: {booking['service_name']}")
            print(f"     - Time: {booking['start_time']}")
            print(f"     - Status: {booking['status']}")
        else:
            print(f"   ✗ Failed to create booking: {response.status_code} - {response.text}")
        
        # 3. Try to book the same slot (should fail)
        print("3. Testing double booking prevention...")
        response = await self.client.post("/bookings/", json={
            "service_id": service_id,
            "practitioner_id": practitioner_id,
            "start_time": booking_time.isoformat(),
            "timezone": "America/Los_Angeles"
        })
        
        if response.status_code == 400:
            print(f"   ✓ Double booking prevented as expected")
        else:
            print(f"   ✗ Double booking not prevented: {response.status_code}")
    
    async def test_service_discovery(self):
        """Test public service listings and search."""
        print("\n=== TESTING SERVICE DISCOVERY ===")
        
        # 1. List all public services
        print("1. Fetching public service listings...")
        response = await self.client.get("/services/", params={
            "is_public": True,
            "is_active": True
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Found {data['total']} public services")
            for service in data['results'][:3]:  # Show first 3
                print(f"     - {service['name']} ({service['service_type']}) - ${service['price']}")
        else:
            print(f"   ✗ Failed to list services: {response.status_code} - {response.text}")
        
        # 2. Search services
        print("2. Searching for wellness services...")
        response = await self.client.get("/search/services", params={
            "q": "wellness",
            "category": "wellness",
            "min_price": 50,
            "max_price": 200
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✓ Search returned {data['total']} results")
        else:
            print(f"   ✗ Search failed: {response.status_code} - {response.text}")
        
        # 3. Get service details
        if self.test_data["services"]:
            service_id = list(self.test_data["services"].values())[0]["id"]
            print(f"3. Fetching service details...")
            response = await self.client.get(f"/services/{service_id}")
            
            if response.status_code == 200:
                service = response.json()
                print(f"   ✓ Service details retrieved: {service['name']}")
                print(f"     - Description: {service['description'][:50]}...")
                print(f"     - Duration: {service['duration_minutes']} minutes")
                print(f"     - Max participants: {service.get('max_participants', 'N/A')}")
            else:
                print(f"   ✗ Failed to get service details: {response.status_code}")
    
    async def test_messaging(self):
        """Test messaging between practitioner and client."""
        print("\n=== TESTING MESSAGING ===")
        
        # 1. Client sends message to practitioner
        print("1. Client sending message to practitioner...")
        await self.client.login(CLIENT_EMAIL, CLIENT_PASSWORD)
        
        if not self.test_data["practitioner"]:
            print("   ✗ No practitioner data available")
            return
        
        response = await self.client.post("/messaging/conversations/", json={
            "recipient_id": self.test_data["practitioner"]["user_id"],
            "initial_message": "Hi! I have a question about your wellness consultation service."
        })
        
        if response.status_code == 201:
            conversation = response.json()
            self.test_data["messages"].append(conversation)
            print(f"   ✓ Conversation created: {conversation['id']}")
        else:
            print(f"   ✗ Failed to create conversation: {response.status_code} - {response.text}")
        
        # 2. Practitioner responds
        print("2. Practitioner responding to message...")
        await self.client.login(PRACTITIONER_EMAIL, PRACTITIONER_PASSWORD)
        
        if self.test_data["messages"]:
            conversation_id = self.test_data["messages"][0]["id"]
            response = await self.client.post(f"/messaging/conversations/{conversation_id}/messages/", json={
                "content": "Hello! I'd be happy to answer your questions about the consultation.",
                "message_type": "text"
            })
            
            if response.status_code == 201:
                print(f"   ✓ Reply sent successfully")
            else:
                print(f"   ✗ Failed to send reply: {response.status_code}")
    
    async def test_streams_content(self):
        """Test content creation and streaming features."""
        print("\n=== TESTING STREAMS/CONTENT ===")
        
        # Login as practitioner
        await self.client.login(PRACTITIONER_EMAIL, PRACTITIONER_PASSWORD)
        
        # 1. Create a stream
        print("1. Creating content stream...")
        response = await self.client.post("/streams/", json={
            "name": "Wellness Tips & Insights",
            "description": "Daily wellness tips and health insights",
            "subscription_tiers": [
                {
                    "name": "Free",
                    "price": 0,
                    "description": "Basic wellness tips"
                },
                {
                    "name": "Premium",
                    "price": 9.99,
                    "description": "Exclusive content and personalized advice"
                }
            ]
        })
        
        if response.status_code == 201:
            stream = response.json()
            self.test_data["streams"].append(stream)
            print(f"   ✓ Stream created: {stream['name']}")
        else:
            print(f"   ✗ Failed to create stream: {response.status_code} - {response.text}")
        
        # 2. Create a post
        if self.test_data["streams"]:
            stream_id = self.test_data["streams"][0]["id"]
            print("2. Creating content post...")
            response = await self.client.post(f"/streams/{stream_id}/posts/", json={
                "title": "5 Morning Rituals for Better Health",
                "content": "Start your day with these simple but effective wellness practices...",
                "tier": "free",
                "post_type": "article"
            })
            
            if response.status_code == 201:
                print(f"   ✓ Post created successfully")
            else:
                print(f"   ✗ Failed to create post: {response.status_code}")
    
    async def test_financial_flows(self):
        """Test credits, earnings, and payouts."""
        print("\n=== TESTING FINANCIAL FLOWS ===")
        
        # 1. Check practitioner earnings
        print("1. Checking practitioner earnings...")
        await self.client.login(PRACTITIONER_EMAIL, PRACTITIONER_PASSWORD)
        
        response = await self.client.get("/payments/earnings/balance")
        if response.status_code == 200:
            earnings = response.json()
            print(f"   ✓ Current balance: ${earnings['available_balance']}")
            print(f"     - Pending: ${earnings['pending_balance']}")
            print(f"     - Total earned: ${earnings['total_earned']}")
        else:
            print(f"   ✗ Failed to get earnings: {response.status_code}")
        
        # 2. Check credit balance (as client)
        print("2. Checking client credit balance...")
        await self.client.login(CLIENT_EMAIL, CLIENT_PASSWORD)
        
        response = await self.client.get("/payments/credits/balance")
        if response.status_code == 200:
            balance = response.json()
            print(f"   ✓ Credit balance: ${balance['balance']}")
        else:
            print(f"   ✗ Failed to get credit balance: {response.status_code}")
    
    async def test_reviews(self):
        """Test review functionality."""
        print("\n=== TESTING REVIEWS ===")
        
        # Only test if we have bookings
        if not self.test_data["bookings"]:
            print("   ✗ No bookings available to review")
            return
        
        # Login as client
        await self.client.login(CLIENT_EMAIL, CLIENT_PASSWORD)
        
        booking = self.test_data["bookings"][0]
        print("1. Creating review for booking...")
        
        # Note: Reviews typically require completed bookings
        # For testing, we'll attempt to create a review
        response = await self.client.post("/reviews/", json={
            "booking_id": booking["id"],
            "rating": 5,
            "title": "Excellent wellness consultation!",
            "content": "Very insightful session. Learned a lot about improving my daily wellness routine.",
            "would_recommend": True,
            "professionalism_rating": 5,
            "communication_rating": 5,
            "value_rating": 5
        })
        
        if response.status_code == 201:
            print(f"   ✓ Review created successfully")
            print(f"     - Rating: 5/5 stars")
        elif response.status_code == 400:
            print(f"   - Review creation failed (booking may not be completed): {response.json().get('detail')}")
        else:
            print(f"   ✗ Failed to create review: {response.status_code} - {response.text}")
    
    async def run_all_tests(self):
        """Run all test scenarios in sequence."""
        print("\n" + "="*60)
        print("ESTUARY API - PRACTITIONER FUNCTIONALITY TEST SUITE")
        print("="*60)
        
        try:
            # Setup
            await self.setup_test_data()
            
            # Core functionality tests
            await self.test_service_creation()
            await self.test_schedule_creation()
            await self.test_availability_api()
            await self.test_booking_flow()
            
            # Discovery and interaction tests
            await self.test_service_discovery()
            await self.test_messaging()
            await self.test_streams_content()
            
            # Financial tests
            await self.test_financial_flows()
            await self.test_reviews()
            
            print("\n" + "="*60)
            print("TEST SUITE COMPLETED")
            print("="*60)
            
            # Summary
            print("\nTest Summary:")
            print(f"- Services created: {len(self.test_data['services'])}")
            print(f"- Schedules created: {len(self.test_data['schedules'])}")
            print(f"- Bookings made: {len(self.test_data['bookings'])}")
            print(f"- Conversations: {len(self.test_data['messages'])}")
            print(f"- Streams: {len(self.test_data['streams'])}")
            
        except Exception as e:
            print(f"\n✗ Test suite error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            await self.client.close()


async def main():
    """Main test runner."""
    tester = PractitionerAPITests()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())