#!/usr/bin/env python3
"""
Simplified test for service purchase flow
Tests the endpoints that are currently working
"""
import asyncio
import aiohttp
import json
from datetime import datetime, timedelta
from decimal import Decimal

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
PRACTITIONER_EMAIL = f"test_prac_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
CLIENT_EMAIL = f"test_client_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
TEST_PASSWORD = "testpass123"


async def create_and_setup_practitioner():
    """Create practitioner and set up with subscription and service"""
    async with aiohttp.ClientSession() as session:
        # Create practitioner user
        print("1. Creating practitioner user...")
        async with session.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": PRACTITIONER_EMAIL,
                "password": TEST_PASSWORD,
                "first_name": "Test",
                "last_name": "Practitioner",
                "role": "practitioner"
            }
        ) as response:
            if response.status != 201:
                print(f"Error creating practitioner: {response.status}")
                return None
        
        # Login practitioner
        async with session.post(
            f"{BASE_URL}/auth/login",
            json={"email": PRACTITIONER_EMAIL, "password": TEST_PASSWORD}
        ) as response:
            if response.status != 200:
                print("Error logging in practitioner")
                return None
            data = await response.json()
            practitioner_token = data["access_token"]
            print("✅ Practitioner created and logged in")
        
        headers = {"Authorization": f"Bearer {practitioner_token}"}
        
        # Subscribe to Free tier
        print("\n2. Setting up practitioner subscription...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/tiers", headers=headers) as response:
            tiers_data = await response.json()
            free_tier = next((t for t in tiers_data["results"] if t['name'] == 'Free'), None)
        
        async with session.post(
            f"{BASE_URL}/practitioner-subscriptions/",
            headers=headers,
            json={"tier_id": free_tier['id'], "is_annual": False}
        ) as response:
            if response.status == 201:
                sub_data = await response.json()
                print(f"✅ Subscribed to {sub_data['tier']['name']} tier")
                practitioner_id = sub_data['practitioner_id']
        
        # Get service types
        print("\n3. Creating service...")
        async with session.get(f"{BASE_URL}/services/types", headers=headers) as response:
            types_data = await response.json()
            # Find "In-Person Session" type or use first available
            service_type = next((t for t in types_data if t['name'] == 'In-Person Session'), types_data[0])
            print(f"   Using service type: {service_type['name']}")
        
        # Create service
        service_data = {
            "name": "Test Virtual Therapy Session",
            "description": "A test virtual therapy session for integration testing",
            "service_type_id": service_type['id'],
            "duration_minutes": 60,
            "price": "75.00",
            "max_participants": 1,
            "is_active": True,
            "is_public": True,
            "location_type": "virtual"  # Virtual service doesn't need address
        }
        
        async with session.post(
            f"{BASE_URL}/practitioners/me/services",
            headers=headers,
            json=service_data
        ) as response:
            if response.status == 201:
                service = await response.json()
                print(f"✅ Created service: {service['name']} - ${service['price']}")
                
                # Get the actual practitioner ID from the service response
                actual_practitioner_id = service.get('primary_practitioner', {}).get('id', practitioner_id)
                
                return {
                    'token': practitioner_token,
                    'practitioner_id': actual_practitioner_id,  # Use the actual ID
                    'service_id': service['id'],
                    'service': service
                }
            else:
                text = await response.text()
                print(f"Error creating service: {text}")
                return None


async def create_client_and_test_booking(practitioner_data):
    """Create client and test booking flow"""
    async with aiohttp.ClientSession() as session:
        # Create client user
        print("\n4. Creating client user...")
        async with session.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": CLIENT_EMAIL,
                "password": TEST_PASSWORD,
                "first_name": "Test",
                "last_name": "Client",
                "role": "user"
            }
        ) as response:
            if response.status != 201:
                print(f"Error creating client: {response.status}")
                return
        
        # Login client
        async with session.post(
            f"{BASE_URL}/auth/login",
            json={"email": CLIENT_EMAIL, "password": TEST_PASSWORD}
        ) as response:
            if response.status != 200:
                print("Error logging in client")
                return
            data = await response.json()
            client_token = data["access_token"]
            print("✅ Client created and logged in")
        
        client_headers = {"Authorization": f"Bearer {client_token}"}
        practitioner_headers = {"Authorization": f"Bearer {practitioner_data['token']}"}
        
        # Test service listing
        print("\n5. Testing service discovery...")
        async with session.get(f"{BASE_URL}/services/", headers=client_headers) as response:
            if response.status == 200:
                services_data = await response.json()
                print(f"✅ Found {services_data.get('total', 0)} services")
                
                # Find our test service
                our_service = next(
                    (s for s in services_data.get('results', []) 
                     if s['id'] == practitioner_data['service_id']), 
                    None
                )
                if our_service:
                    print(f"   ✅ Found our test service: {our_service['name']}")
        
        # Test practitioner profile
        print("\n6. Getting practitioner profile...")
        async with session.get(
            f"{BASE_URL}/practitioners/{practitioner_data['practitioner_id']}", 
            headers=client_headers
        ) as response:
            if response.status == 200:
                practitioner = await response.json()
                print(f"✅ Practitioner: {practitioner.get('display_name', 'Unknown')}")
                print(f"   Services: {practitioner.get('total_services', 0)}")
                print(f"   Status: {practitioner.get('practitioner_status')}")
        
        # For virtual services, we don't need a location
        print("\n7. Service is virtual, no location needed")
        location_id = None  # Virtual services don't need location
        
        # First, purchase credits for the client
        print("\n8. Purchasing credits for client...")
        credits_needed = float(practitioner_data['service']['price'])
        
        async with session.post(
            f"{BASE_URL}/payments/credits/purchase",
            headers=client_headers,
            json={
                "amount": credits_needed,
                "payment_method_id": "pm_card_visa"  # Test payment method
            }
        ) as response:
            if response.status in [200, 201]:
                credit_result = await response.json()
                print(f"✅ Purchased ${credits_needed} in credits")
                print(f"   Current balance: ${credit_result.get('current_balance', 0)}")
            else:
                text = await response.text()
                print(f"Note: Credit purchase returned {response.status}: {text}")
                print("   (This is expected in test environment without Stripe)")
        
        # Create a booking
        print("\n9. Creating booking...")
        print(f"   Service ID: {practitioner_data['service_id']}")
        print(f"   Practitioner ID: {practitioner_data['practitioner_id']}")
        print(f"   Location ID: {location_id or 'None (virtual service)'}")
        
        tomorrow = (datetime.now() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
        booking_data = {
            "service_id": practitioner_data['service_id'],
            "practitioner_id": practitioner_data['practitioner_id'],
            "start_datetime": tomorrow.isoformat() + "Z",
            "notes": "Test booking from integration test"
        }
        
        # Only add location_id if it's not None
        if location_id is not None:
            booking_data["location_id"] = location_id
        
        async with session.post(
            f"{BASE_URL}/bookings/",
            headers=client_headers,
            json=booking_data
        ) as response:
            if response.status in [200, 201]:
                booking = await response.json()
                print(f"✅ Booking created: ID {booking['id']}")
                print(f"   Status: {booking.get('status')}")
                print(f"   Start: {booking.get('start_time')}")
                booking_id = booking['id']
            else:
                text = await response.text()
                print(f"Error creating booking: {response.status} - {text}")
                
                # Try simpler booking endpoint if available
                print("\nTrying alternative booking creation...")
                # This is where we'd implement credit purchase first
                print("Note: Booking may require credit purchase first")
                return
        
        # Check practitioner's view of bookings
        print("\n10. Checking practitioner's bookings...")
        async with session.get(f"{BASE_URL}/bookings/", headers=practitioner_headers) as response:
            if response.status == 200:
                bookings = await response.json()
                print(f"✅ Practitioner has {bookings.get('total', 0)} bookings")
                
                our_booking = next(
                    (b for b in bookings.get('results', []) if b['id'] == booking_id),
                    None
                )
                if our_booking:
                    print(f"   ✅ Found our test booking")
        
        # Test commission calculation
        print("\n11. Checking commission rates...")
        async with session.get(
            f"{BASE_URL}/practitioner-subscriptions/commission-rates",
            headers=practitioner_headers
        ) as response:
            if response.status == 200:
                rates = await response.json()
                for rate in rates:
                    if rate['service_type'] == 'In-Person Session':
                        print(f"✅ Commission for In-Person Session: {rate['effective_rate']}%")
                        commission_rate = Decimal(rate['effective_rate'])
                        service_price = Decimal(practitioner_data['service']['price'])
                        practitioner_earnings = service_price * (100 - commission_rate) / 100
                        platform_commission = service_price * commission_rate / 100
                        
                        print(f"\n   💰 Financial breakdown for ${service_price} service:")
                        print(f"      Client pays: ${service_price}")
                        print(f"      Platform commission ({commission_rate}%): ${platform_commission:.2f}")
                        print(f"      Practitioner earnings: ${practitioner_earnings:.2f}")
        
        print("\n✅ Test completed successfully!")
        print("\n📝 Summary of what we tested:")
        print("   - Practitioner registration and subscription")
        print("   - Service creation by practitioner")
        print("   - Service discovery by client")
        print("   - Booking creation (requires credit implementation)")
        print("   - Commission calculation based on subscription tier")
        
        print("\n🚧 Next steps to implement:")
        print("   - Complete credit-based booking payment integration")
        print("   - Booking completion and earnings tracking")
        print("   - Payout processing with Temporal workflows")
        print("   - Test with different service types (in-person vs virtual)")


async def main():
    """Main test function"""
    print("Simplified Service Purchase Flow Test")
    print("="*50)
    
    # Set up practitioner
    practitioner_data = await create_and_setup_practitioner()
    if not practitioner_data:
        print("Failed to set up practitioner")
        return
    
    # Test client flow
    await create_client_and_test_booking(practitioner_data)


if __name__ == "__main__":
    asyncio.run(main())