#!/usr/bin/env python
"""
Test script for booking API endpoints.
Tests booking creation, validation, conflicts, and status management.
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
from payments.models import UserCreditBalance, UserCreditTransaction
from asgiref.sync import sync_to_async

# Test configuration
BASE_URL = "http://testserver"
API_PREFIX = "/api/v1"

# Test timezone
TEST_TZ = pytz.timezone('America/Los_Angeles')


class TestBookingAPI:
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
        
        # Get regular user and token
        self.user = await sync_to_async(User.objects.get)(email='user@example.com')
        
        # Login to get token
        login_data = {
            "email": "user@example.com",
            "password": "testpass123"
        }
        response = await self.client.post(f"{API_PREFIX}/auth/login", json=login_data)
        assert response.status_code == 200
        token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {token}"}
        
        # Get practitioner
        @sync_to_async
        def get_practitioner():
            return Practitioner.objects.get(user__email='practitioner@example.com')
            
        self.practitioner = await get_practitioner()
        
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
        
        # Add credits to user account for testing
        @sync_to_async
        def add_user_credits():
            balance, created = UserCreditBalance.objects.get_or_create(
                user=self.user,
                defaults={'balance_cents': 0}
            )
            
            # Add $500 in credits
            UserCreditTransaction.objects.create(
                user=self.user,
                amount_cents=50000,
                transaction_type='purchase',
                description='Test credits'
            )
            
            balance.balance_cents = 50000
            balance.save()
            
            return balance.balance_cents
            
        credits = await add_user_credits()
        print(f"✓ User credit balance: ${credits / 100:.2f}")
        
        print(f"✓ Setup complete - Testing as: {self.user.email}")
        print(f"✓ Services available: {len([s for s in self.services.values() if s])}")
        
    async def test_get_available_slots(self):
        """Test getting available slots for a service."""
        print("\n=== Testing Get Available Slots ===")
        
        if not self.services.get('session'):
            print("✗ No session service available")
            return False
            
        service = self.services['session']
        
        # Get availability for next 7 days
        # First try with service ID
        params = {
            'service_id': service.id,
            'days_ahead': 7,
            'timezone': 'America/Los_Angeles'
        }
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/availability/slots",
            params=params,
            headers=self.headers
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            total_slots = len(data.get('slots', []))
            print(f"✓ Found {total_slots} available slots")
            
            if total_slots > 0:
                first_slot = data['slots'][0]
                print(f"✓ First slot: {first_slot['start_datetime']}")
                print(f"✓ Duration: {service.duration_minutes} minutes")
                return True
            else:
                print("✗ No available slots found")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_create_booking(self):
        """Test creating a booking."""
        print("\n=== Testing Create Booking ===")
        
        if not self.services.get('session'):
            print("✗ No session service available")
            return False
            
        service = self.services['session']
        
        # First get available slots
        params = {
            'service_id': service.id,
            'days_ahead': 7,
            'timezone': 'America/Los_Angeles'
        }
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/availability/slots",
            params=params,
            headers=self.headers
        )
        
        if response.status_code != 200 or not response.json().get('slots'):
            print("✗ No available slots to book")
            return False
            
        # Get first available slot
        slot = response.json()['slots'][0]
        
        # Create booking
        booking_data = {
            'service_id': service.id,
            'start_time': slot['start_datetime'],
            'timezone': 'America/Los_Angeles',
            'notes': 'Test booking from API'
        }
        
        print(f"\nBooking details:")
        print(f"  Service: {service.name}")
        print(f"  Time: {slot['start_datetime']}")
        print(f"  Price: ${service.price_cents / 100:.2f}")
        
        response = await self.client.post(
            f"{API_PREFIX}/bookings/",
            json=booking_data,
            headers=self.headers
        )
        
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 201:
            booking = response.json()
            print(f"✓ Booking created successfully")
            print(f"✓ Booking ID: {booking['id']}")
            print(f"✓ Status: {booking['status']}")
            print(f"✓ Total paid: ${booking['total_paid_cents'] / 100:.2f}")
            
            # Store booking ID for later tests
            self.booking_id = booking['id']
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_booking_conflict(self):
        """Test that double booking is prevented."""
        print("\n=== Testing Booking Conflict Prevention ===")
        
        if not hasattr(self, 'booking_id'):
            print("✗ No existing booking to test conflict with")
            return False
            
        # Get the existing booking details
        response = await self.client.get(
            f"{API_PREFIX}/bookings/{self.booking_id}",
            headers=self.headers
        )
        
        if response.status_code != 200:
            print("✗ Could not fetch existing booking")
            return False
            
        existing_booking = response.json()
        
        # Try to book the same time slot
        booking_data = {
            'service_id': existing_booking['service']['id'],
            'start_time': existing_booking['start_time'],
            'timezone': 'America/Los_Angeles',
            'notes': 'Attempting double booking'
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/bookings/",
            json=booking_data,
            headers=self.headers
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            error = response.json()
            print(f"✓ Double booking correctly prevented")
            print(f"✓ Error message: {error.get('detail', 'Conflict detected')}")
            return True
        elif response.status_code == 201:
            print("✗ Double booking was incorrectly allowed!")
            # Cancel the duplicate booking
            await self.client.patch(
                f"{API_PREFIX}/bookings/{response.json()['id']}/cancel",
                headers=self.headers
            )
            return False
        else:
            print(f"✗ Unexpected response: {response.json()}")
            return False
            
    async def test_list_bookings(self):
        """Test listing user's bookings."""
        print("\n=== Testing List Bookings ===")
        
        response = await self.client.get(
            f"{API_PREFIX}/bookings/",
            headers=self.headers
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            bookings = data.get('results', [])
            print(f"✓ Found {len(bookings)} bookings")
            
            # Show recent bookings
            for booking in bookings[:3]:
                print(f"\n  Booking: {booking['id']}")
                print(f"  Service: {booking['service']['name']}")
                print(f"  Time: {booking['start_time']}")
                print(f"  Status: {booking['status']}")
                
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_cancel_booking(self):
        """Test cancelling a booking."""
        print("\n=== Testing Cancel Booking ===")
        
        if not hasattr(self, 'booking_id'):
            print("✗ No booking to cancel")
            return False
            
        # Cancel the booking
        response = await self.client.patch(
            f"{API_PREFIX}/bookings/{self.booking_id}/cancel",
            headers=self.headers
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            booking = response.json()
            print(f"✓ Booking cancelled successfully")
            print(f"✓ New status: {booking['status']}")
            
            # Check refund
            if booking.get('refund_amount_cents', 0) > 0:
                print(f"✓ Refund amount: ${booking['refund_amount_cents'] / 100:.2f}")
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_reschedule_booking(self):
        """Test rescheduling a booking."""
        print("\n=== Testing Reschedule Booking ===")
        
        # Create a new booking first
        if not self.services.get('session'):
            print("✗ No session service available")
            return False
            
        service = self.services['session']
        
        # Get available slots
        params = {
            'service_id': service.id,
            'days_ahead': 14,
            'timezone': 'America/Los_Angeles'
        }
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/availability/slots",
            params=params,
            headers=self.headers
        )
        
        if response.status_code != 200 or len(response.json().get('slots', [])) < 2:
            print("✗ Not enough available slots for rescheduling test")
            return False
            
        slots = response.json()['slots']
        
        # Create initial booking
        booking_data = {
            'service_id': service.id,
            'start_time': slots[0]['start_datetime'],
            'timezone': 'America/Los_Angeles'
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/bookings/",
            json=booking_data,
            headers=self.headers
        )
        
        if response.status_code != 201:
            print("✗ Could not create booking for rescheduling test")
            return False
            
        booking_id = response.json()['id']
        original_time = slots[0]['start_datetime']
        new_time = slots[1]['start_datetime']
        
        print(f"Original time: {original_time}")
        print(f"New time: {new_time}")
        
        # Reschedule the booking
        reschedule_data = {
            'new_start_time': new_time,
            'timezone': 'America/Los_Angeles',
            'reason': 'Testing rescheduling'
        }
        
        response = await self.client.patch(
            f"{API_PREFIX}/bookings/{booking_id}/reschedule",
            json=reschedule_data,
            headers=self.headers
        )
        
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 200:
            booking = response.json()
            print(f"✓ Booking rescheduled successfully")
            print(f"✓ New time: {booking['start_time']}")
            print(f"✓ Status: {booking['status']}")
            
            # Clean up
            await self.client.patch(
                f"{API_PREFIX}/bookings/{booking_id}/cancel",
                headers=self.headers
            )
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            # Clean up
            await self.client.patch(
                f"{API_PREFIX}/bookings/{booking_id}/cancel",
                headers=self.headers
            )
            return False
            
    async def test_workshop_booking(self):
        """Test booking a workshop with sessions."""
        print("\n=== Testing Workshop Booking ===")
        
        workshop = self.services.get('workshop')
        if not workshop:
            print("✗ No workshop service available")
            return False
            
        # Create workshop session if it doesn't exist
        @sync_to_async
        def get_or_create_workshop_session():
            session = ServiceSession.objects.filter(service=workshop).first()
            if not session:
                session_date = timezone.now() + timedelta(days=7)
                session_date = session_date.replace(hour=14, minute=0, second=0, microsecond=0)
                
                session = ServiceSession.objects.create(
                    service=workshop,
                    start_time=session_date,
                    end_time=session_date + timedelta(minutes=workshop.duration_minutes),
                    max_participants=workshop.max_participants,
                    title=f"{workshop.name} - Session 1"
                )
            return session
            
        session = await get_or_create_workshop_session()
        
        # Create booking for workshop
        booking_data = {
            'service_id': workshop.id,
            'service_session_id': session.id,
            'timezone': 'America/Los_Angeles',
            'notes': 'Workshop booking test'
        }
        
        print(f"\nWorkshop details:")
        print(f"  Name: {workshop.name}")
        print(f"  Session: {session.start_time}")
        print(f"  Max participants: {workshop.max_participants}")
        print(f"  Current participants: {session.current_participants}")
        
        response = await self.client.post(
            f"{API_PREFIX}/bookings/",
            json=booking_data,
            headers=self.headers
        )
        
        print(f"\nStatus: {response.status_code}")
        
        if response.status_code == 201:
            booking = response.json()
            print(f"✓ Workshop booking created successfully")
            print(f"✓ Booking ID: {booking['id']}")
            print(f"✓ Session: {booking.get('service_session', {}).get('title', 'N/A')}")
            
            # Clean up
            await self.client.patch(
                f"{API_PREFIX}/bookings/{booking['id']}/cancel",
                headers=self.headers
            )
            
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_credit_balance_check(self):
        """Test that bookings check credit balance."""
        print("\n=== Testing Credit Balance Check ===")
        
        # Get current balance
        response = await self.client.get(
            f"{API_PREFIX}/users/me/credits/",
            headers=self.headers
        )
        
        if response.status_code == 200:
            credits = response.json()
            current_balance = credits.get('balance_cents', 0)
            print(f"Current balance: ${current_balance / 100:.2f}")
        else:
            print("✗ Could not get credit balance")
            return False
            
        # Try to book an expensive service (simulate insufficient funds)
        if not self.services.get('course'):
            print("✗ No course service available")
            return False
            
        course = self.services['course']
        
        # Temporarily set user balance to less than course price
        @sync_to_async
        def set_low_balance():
            balance = UserCreditBalance.objects.get(user=self.user)
            balance.balance_cents = 1000  # $10
            balance.save()
            return balance.balance_cents
            
        low_balance = await set_low_balance()
        print(f"\nTemporarily set balance to: ${low_balance / 100:.2f}")
        print(f"Course price: ${course.price_cents / 100:.2f}")
        
        # Try to book the course
        booking_data = {
            'service_id': course.id,
            'timezone': 'America/Los_Angeles'
        }
        
        response = await self.client.post(
            f"{API_PREFIX}/bookings/",
            json=booking_data,
            headers=self.headers
        )
        
        print(f"\nStatus: {response.status_code}")
        
        # Restore original balance
        @sync_to_async
        def restore_balance():
            balance = UserCreditBalance.objects.get(user=self.user)
            balance.balance_cents = current_balance
            balance.save()
            
        await restore_balance()
        
        if response.status_code == 400:
            error = response.json()
            print(f"✓ Insufficient funds correctly detected")
            print(f"✓ Error: {error.get('detail', 'Insufficient credits')}")
            return True
        elif response.status_code == 201:
            print("✗ Booking was allowed despite insufficient funds!")
            # Cancel the booking
            await self.client.patch(
                f"{API_PREFIX}/bookings/{response.json()['id']}/cancel",
                headers=self.headers
            )
            return False
        else:
            print(f"✗ Unexpected response: {response.json()}")
            return False
            
    async def cleanup(self):
        """Clean up test resources."""
        if self.client:
            await self.client.aclose()
            
    async def run_all_tests(self):
        """Run all booking tests."""
        print("\n" + "="*60)
        print("BOOKING API TEST SUITE")
        print("="*60)
        
        try:
            await self.setup()
            
            tests = [
                ("Get Available Slots", self.test_get_available_slots),
                ("Create Booking", self.test_create_booking),
                ("Booking Conflict Prevention", self.test_booking_conflict),
                ("List Bookings", self.test_list_bookings),
                ("Cancel Booking", self.test_cancel_booking),
                ("Reschedule Booking", self.test_reschedule_booking),
                ("Workshop Booking", self.test_workshop_booking),
                ("Credit Balance Check", self.test_credit_balance_check)
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
    tester = TestBookingAPI()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())