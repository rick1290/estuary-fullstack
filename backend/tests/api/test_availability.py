#!/usr/bin/env python
"""
Test script for availability API endpoints.
Tests available time slots based on service type and duration.
"""

import os
import sys
import django
import asyncio
import json
from datetime import datetime, timedelta, date
import pytz

# Django setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.utils import timezone
from api.main import app
from httpx import AsyncClient, ASGITransport
from users.models import User
from practitioners.models import Practitioner, Schedule, ScheduleTimeSlot
from services.models import Service, ServiceType, ServiceSession
from bookings.models import Booking
from asgiref.sync import sync_to_async

# Test configuration
BASE_URL = "http://testserver"
API_PREFIX = "/api/v1"

# Test timezone
TEST_TZ = pytz.timezone('America/Los_Angeles')


class TestAvailabilityAPI:
    def __init__(self):
        self.client = None
        self.headers = {}
        self.user = None
        self.practitioner = None
        self.services = {}
        self.schedule = None
        
    async def setup(self):
        """Set up test data and authentication."""
        print("\n=== Setting up test data ===")
        
        # Create client
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url=BASE_URL)
        
        # Get user and token
        self.user = await sync_to_async(User.objects.get)(email='practitioner@example.com')
        
        # Login to get token
        login_data = {
            "email": "practitioner@example.com",
            "password": "testpass123"
        }
        response = await self.client.post(f"{API_PREFIX}/auth/login", json=login_data)
        assert response.status_code == 200
        token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {token}"}
        
        # Get practitioner
        self.practitioner = await sync_to_async(Practitioner.objects.get)(user=self.user)
        
        # Get schedule
        self.schedule = await sync_to_async(Schedule.objects.filter(practitioner=self.practitioner).first)()
        
        # Get services
        @sync_to_async
        def get_services():
            return {
                'session': Service.objects.filter(
                    primary_practitioner=self.practitioner,
                    service_type__code='session'
                ).first(),
                'workshop': Service.objects.filter(
                    primary_practitioner=self.practitioner,
                    service_type__code='workshop'
                ).first(),
                'course': Service.objects.filter(
                    primary_practitioner=self.practitioner,
                    service_type__code='course'
                ).first()
            }
        
        self.services = await get_services()
        
        print(f"✓ Setup complete - Testing as: {self.user.email}")
        
        @sync_to_async
        def get_practitioner_name():
            return self.practitioner.user.get_full_name()
            
        practitioner_name = await get_practitioner_name()
        print(f"✓ Practitioner: {practitioner_name}")
        
        if self.schedule:
            print(f"✓ Schedule: {self.schedule.name}")
        
    async def test_practitioner_availability_basic(self):
        """Test basic practitioner availability endpoint."""
        print("\n=== Testing Basic Practitioner Availability ===")
        
        # Test next 7 days
        start_date = date.today()
        end_date = start_date + timedelta(days=7)
        
        params = {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        }
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/availability",
            params=params
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Found {len(data)} available dates")
            
            # Show first 3 days
            for i, day_availability in enumerate(data[:3]):
                print(f"\n  Date: {day_availability['date']}")
                print(f"  Available slots: {len(day_availability['slots'])}")
                if day_availability['slots']:
                    print(f"  First slot: {day_availability['slots'][0]['start']} - {day_availability['slots'][0]['end']}")
                    print(f"  Last slot: {day_availability['slots'][-1]['start']} - {day_availability['slots'][-1]['end']}")
        else:
            print(f"✗ Error: {response.json()}")
            
        return response.status_code == 200
        
    async def test_service_specific_availability(self):
        """Test availability for specific services with different durations."""
        print("\n=== Testing Service-Specific Availability ===")
        
        results = []
        
        for service_type, service in self.services.items():
            if not service:
                print(f"\n✗ No {service_type} service found")
                continue
                
            print(f"\n--- Testing {service_type}: {service.name} ({service.duration_minutes} min) ---")
            
            params = {
                'service_id': service.id,
                'timezone': 'America/Los_Angeles'
            }
            
            response = await self.client.get(
                f"{API_PREFIX}/practitioners/{self.practitioner.id}/availability",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                total_slots = sum(len(day['slots']) for day in data)
                print(f"✓ Status: {response.status_code}")
                print(f"✓ Available days: {len(data)}")
                print(f"✓ Total slots: {total_slots}")
                
                # Check slot durations match service
                if data and data[0]['slots']:
                    first_slot = data[0]['slots'][0]
                    start = datetime.fromisoformat(first_slot['start'].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(first_slot['end'].replace('Z', '+00:00'))
                    duration = (end - start).total_seconds() / 60
                    print(f"✓ Slot duration: {duration} minutes (expected: {service.duration_minutes})")
                    
                results.append(True)
            else:
                print(f"✗ Error: {response.json()}")
                results.append(False)
                
        return all(results)
        
    async def test_availability_with_existing_bookings(self):
        """Test that existing bookings block availability."""
        print("\n=== Testing Availability with Existing Bookings ===")
        
        if not self.services.get('session'):
            print("✗ No session service available for testing")
            return False
            
        service = self.services['session']
        
        # Get initial availability
        tomorrow = date.today() + timedelta(days=1)
        params = {
            'service_id': service.id,
            'date': tomorrow.isoformat()
        }
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/availability",
            params=params
        )
        
        if response.status_code != 200 or not response.json():
            print("✗ No availability found for tomorrow")
            return False
            
        initial_data = response.json()[0]
        initial_slots = len(initial_data['slots'])
        print(f"Initial slots available: {initial_slots}")
        
        if initial_slots == 0:
            print("✗ No slots available to test booking")
            return False
            
        # Create a booking for the first available slot
        first_slot = initial_data['slots'][0]
        slot_start = datetime.fromisoformat(first_slot['start'].replace('Z', '+00:00'))
        
        # Create a test booking
        print("\nCreating test booking...")
        test_user = await sync_to_async(User.objects.get)(email='user@example.com')
        
        @sync_to_async
        def create_booking():
            return Booking.objects.create(
                service=service,
                practitioner=self.practitioner,
                user=test_user,
                start_time=slot_start,
                end_time=slot_start + timedelta(minutes=service.duration_minutes),
                status='confirmed',
                price_cents=service.price_cents,
                duration_minutes=service.duration_minutes
            )
        
        booking = await create_booking()
        print(f"✓ Created booking for {slot_start.strftime('%Y-%m-%d %H:%M')}")
        
        # Check availability again
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/availability",
            params=params
        )
        
        if response.status_code == 200:
            updated_data = response.json()[0]
            updated_slots = len(updated_data['slots'])
            print(f"Updated slots available: {updated_slots}")
            
            # Verify the booked slot is no longer available
            booked_slot_available = any(
                slot['start'] == first_slot['start'] 
                for slot in updated_data['slots']
            )
            
            if not booked_slot_available and updated_slots == initial_slots - 1:
                print("✓ Booked slot correctly removed from availability")
                result = True
            else:
                print("✗ Booking did not properly affect availability")
                result = False
        else:
            print(f"✗ Error checking updated availability: {response.json()}")
            result = False
            
        # Clean up
        await sync_to_async(booking.delete)()
        print("✓ Test booking cleaned up")
        
        return result
        
    async def test_workshop_availability(self):
        """Test availability for workshops with predefined sessions."""
        print("\n=== Testing Workshop Availability ===")
        
        workshop = self.services.get('workshop')
        if not workshop:
            print("✗ No workshop service found")
            return False
            
        # Create workshop sessions if they don't exist
        @sync_to_async
        def get_session_count():
            return ServiceSession.objects.filter(service=workshop).count()
            
        existing_sessions = await get_session_count()
        
        if existing_sessions == 0:
            print("Creating workshop sessions...")
            
            @sync_to_async
            def create_sessions():
                # Create 3 sessions over next 3 weeks
                for i in range(3):
                    session_date = timezone.now() + timedelta(weeks=i+1)
                    session_date = session_date.replace(hour=14, minute=0, second=0, microsecond=0)
                    
                    ServiceSession.objects.create(
                        service=workshop,
                        start_time=session_date,
                        end_time=session_date + timedelta(minutes=workshop.duration_minutes),
                        max_participants=workshop.max_participants,
                        sequence_number=i+1
                    )
                    
            await create_sessions()
            print("✓ Created 3 workshop sessions")
            
        # Get workshop availability
        params = {
            'service_id': workshop.id,
            'include_sessions': 'true'
        }
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/availability",
            params=params
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Status: {response.status_code}")
            
            # For workshops, we should get session-specific availability
            if 'sessions' in data:
                sessions = data['sessions']
                print(f"✓ Found {len(sessions)} workshop sessions")
                
                for session in sessions[:3]:
                    print(f"\n  Session {session.get('sequence_number', 'N/A')}:")
                    print(f"  Start: {session['start_time']}")
                    print(f"  Available spots: {session.get('available_spots', 'N/A')}")
                    print(f"  Status: {session.get('status', 'N/A')}")
                    
                return True
            else:
                # Might return regular slot availability for workshop type
                print(f"✓ Regular availability returned: {len(data)} days")
                return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_course_availability(self):
        """Test availability for courses."""
        print("\n=== Testing Course Availability ===")
        
        course = self.services.get('course')
        if not course:
            print("✗ No course service found")
            return False
            
        # Get course availability
        params = {
            'service_id': course.id,
            'include_sessions': 'true'
        }
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/availability",
            params=params
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Status: {response.status_code}")
            
            # For courses, availability might be limited to start dates
            if isinstance(data, dict) and 'course_info' in data:
                print(f"✓ Course: {data['course_info'].get('name', 'N/A')}")
                print(f"✓ Next start date: {data['course_info'].get('next_start_date', 'N/A')}")
                print(f"✓ Duration: {data['course_info'].get('duration', 'N/A')}")
            else:
                print(f"✓ Response: {json.dumps(data, indent=2)[:200]}...")
                
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_timezone_conversion(self):
        """Test availability with different timezones."""
        print("\n=== Testing Timezone Conversion ===")
        
        if not self.services.get('session'):
            print("✗ No session service available")
            return False
            
        service = self.services['session']
        test_date = date.today() + timedelta(days=1)
        
        timezones = [
            'America/New_York',
            'America/Los_Angeles', 
            'Europe/London',
            'Asia/Tokyo'
        ]
        
        results = []
        
        for tz in timezones:
            print(f"\n--- Testing timezone: {tz} ---")
            
            params = {
                'service_id': service.id,
                'date': test_date.isoformat(),
                'timezone': tz
            }
            
            response = await self.client.get(
                f"{API_PREFIX}/practitioners/{self.practitioner.id}/availability",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and data[0]['slots']:
                    first_slot = data[0]['slots'][0]
                    print(f"✓ First slot in {tz}: {first_slot['start']}")
                    
                    # Verify timezone in response
                    slot_time = datetime.fromisoformat(first_slot['start'].replace('Z', '+00:00'))
                    local_tz = pytz.timezone(tz)
                    local_time = slot_time.astimezone(local_tz)
                    print(f"✓ Local time: {local_time.strftime('%Y-%m-%d %H:%M %Z')}")
                    
                    results.append(True)
                else:
                    print("✗ No slots returned")
                    results.append(False)
            else:
                print(f"✗ Error: {response.json()}")
                results.append(False)
                
        return all(results)
        
    async def test_date_range_availability(self):
        """Test availability for different date ranges."""
        print("\n=== Testing Date Range Availability ===")
        
        if not self.services.get('session'):
            print("✗ No session service available")
            return False
            
        service = self.services['session']
        
        test_cases = [
            ("Next 7 days", 0, 7),
            ("Next 30 days", 0, 30),
            ("Specific week", 7, 14),
            ("Single day", 1, 1)
        ]
        
        results = []
        
        for description, start_offset, end_offset in test_cases:
            print(f"\n--- {description} ---")
            
            start_date = date.today() + timedelta(days=start_offset)
            end_date = date.today() + timedelta(days=end_offset)
            
            params = {
                'service_id': service.id,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }
            
            response = await self.client.get(
                f"{API_PREFIX}/practitioners/{self.practitioner.id}/availability",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                total_slots = sum(len(day['slots']) for day in data)
                print(f"✓ Days with availability: {len(data)}")
                print(f"✓ Total slots: {total_slots}")
                results.append(True)
            else:
                print(f"✗ Error: {response.json()}")
                results.append(False)
                
        return all(results)
        
    async def cleanup(self):
        """Clean up test resources."""
        if self.client:
            await self.client.aclose()
            
    async def run_all_tests(self):
        """Run all availability tests."""
        print("\n" + "="*60)
        print("AVAILABILITY API TEST SUITE")
        print("="*60)
        
        try:
            await self.setup()
            
            tests = [
                ("Basic Practitioner Availability", self.test_practitioner_availability_basic),
                ("Service-Specific Availability", self.test_service_specific_availability),
                ("Availability with Bookings", self.test_availability_with_existing_bookings),
                ("Workshop Availability", self.test_workshop_availability),
                ("Course Availability", self.test_course_availability),
                ("Timezone Conversion", self.test_timezone_conversion),
                ("Date Range Availability", self.test_date_range_availability)
            ]
            
            results = []
            
            for test_name, test_func in tests:
                try:
                    result = await test_func()
                    results.append((test_name, result))
                except Exception as e:
                    print(f"\n✗ {test_name} failed with error: {str(e)}")
                    results.append((test_name, False))
                    
            # Summary
            print("\n" + "="*60)
            print("TEST SUMMARY")
            print("="*60)
            
            passed = sum(1 for _, result in results if result)
            total = len(results)
            
            for test_name, result in results:
                status = "✓ PASSED" if result else "✗ FAILED"
                print(f"{status}: {test_name}")
                
            print(f"\nTotal: {passed}/{total} tests passed")
            
            return passed == total
            
        finally:
            await self.cleanup()


async def main():
    """Main entry point."""
    tester = TestAvailabilityAPI()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())