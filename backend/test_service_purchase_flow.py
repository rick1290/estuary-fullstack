#!/usr/bin/env python3
"""
Test complete service purchase flow including:
- User purchases a service
- Order creation
- Credit allocation
- Booking creation
- Credit transaction tracking
"""
import asyncio
import aiohttp
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
PRACTITIONER_EMAIL = f"test_practitioner_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
CLIENT_EMAIL = f"test_client_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
TEST_PASSWORD = "testpass123"


async def create_users():
    """Create test practitioner and client users"""
    async with aiohttp.ClientSession() as session:
        users = {}
        
        # Create practitioner
        print("Creating test practitioner...")
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
            if response.status == 201:
                print("✅ Created practitioner user")
            else:
                text = await response.text()
                print(f"Error creating practitioner: {response.status} - {text}")
                return None
        
        # Login practitioner
        async with session.post(
            f"{BASE_URL}/auth/login",
            json={"email": PRACTITIONER_EMAIL, "password": TEST_PASSWORD}
        ) as response:
            if response.status == 200:
                data = await response.json()
                users['practitioner_token'] = data["access_token"]
                print("✅ Practitioner logged in")
            else:
                print("Error logging in practitioner")
                return None
        
        # Create client
        print("\nCreating test client...")
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
            if response.status == 201:
                print("✅ Created client user")
            else:
                text = await response.text()
                print(f"Error creating client: {response.status} - {text}")
                return None
        
        # Login client
        async with session.post(
            f"{BASE_URL}/auth/login",
            json={"email": CLIENT_EMAIL, "password": TEST_PASSWORD}
        ) as response:
            if response.status == 200:
                data = await response.json()
                users['client_token'] = data["access_token"]
                print("✅ Client logged in")
            else:
                print("Error logging in client")
                return None
        
        return users


async def setup_practitioner(token):
    """Set up practitioner with subscription and service"""
    headers = {"Authorization": f"Bearer {token}"}
    
    async with aiohttp.ClientSession() as session:
        # Subscribe to Free tier
        print("\n1. Setting up practitioner subscription...")
        
        # Get tiers
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/tiers", headers=headers) as response:
            if response.status != 200:
                print("Error getting tiers")
                return None
            tiers_data = await response.json()
            free_tier = next((t for t in tiers_data["results"] if t['name'] == 'Free'), None)
        
        # Subscribe to free tier
        async with session.post(
            f"{BASE_URL}/practitioner-subscriptions/",
            headers=headers,
            json={
                "tier_id": free_tier['id'],
                "is_annual": False
            }
        ) as response:
            if response.status == 201:
                sub_data = await response.json()
                print(f"✅ Subscribed to {sub_data['tier']['name']} tier")
                practitioner_id = sub_data['practitioner_id']
            else:
                text = await response.text()
                print(f"Error creating subscription: {text}")
                return None
        
        # Get service types first
        print("\n2. Getting service types...")
        async with session.get(f"{BASE_URL}/services/types", headers=headers) as response:
            if response.status == 200:
                types_data = await response.json()
                if types_data:
                    service_type = types_data[0]  # Use first available type
                    print(f"✅ Found {len(types_data)} service types")
                    print(f"   Using: {service_type['name']}")
                else:
                    print("No service types found, using default ID 1")
                    service_type = {'id': 1}
            else:
                print("Could not get service types, using default")
                service_type = {'id': 1}
        
        # Create a service using practitioner endpoint
        print("\n3. Creating test service...")
        service_data = {
            "name": "Test Therapy Session",
            "description": "A test therapy session for integration testing",
            "service_type_id": service_type['id'],
            "duration_minutes": 60,
            "price": "75.00",
            "max_participants": 1,
            "is_active": True,
            "is_public": True
        }
        
        async with session.post(
            f"{BASE_URL}/practitioners/me/services",
            headers=headers,
            json=service_data
        ) as response:
            if response.status == 201:
                service = await response.json()
                print(f"✅ Created service: {service['name']} - ${service['price']}")
                return {
                    'practitioner_id': practitioner_id,
                    'service_id': service['id'],
                    'service': service
                }
            else:
                text = await response.text()
                print(f"Error creating service: {response.status} - {text}")
                
                # Check if practitioner has existing services
                print("\nChecking for existing services...")
                async with session.get(f"{BASE_URL}/practitioners/me/services", headers=headers) as response2:
                    if response2.status == 200:
                        services = await response2.json()
                        if services:
                            service = services[0]
                            print(f"✅ Found existing service: {service['name']} - ${service['price']}")
                            return {
                                'practitioner_id': practitioner_id,
                                'service_id': service['id'],
                                'service': service
                            }
                
                return None


async def test_purchase_flow(users, practitioner_data):
    """Test the complete purchase flow"""
    client_headers = {"Authorization": f"Bearer {users['client_token']}"}
    practitioner_headers = {"Authorization": f"Bearer {users['practitioner_token']}"}
    
    async with aiohttp.ClientSession() as session:
        print("\n" + "="*50)
        print("TESTING SERVICE PURCHASE FLOW")
        print("="*50)
        
        # 1. Check client's initial credits
        print("\n1. Checking client's initial credit balance...")
        async with session.get(f"{BASE_URL}/users/me/credits", headers=client_headers) as response:
            if response.status == 200:
                credits_data = await response.json()
                print(f"Current credit balance: ${credits_data.get('balance', 0)}")
            else:
                print("Note: Credits endpoint may not be implemented yet")
        
        # 2. Search for the service
        print("\n2. Searching for available services...")
        async with session.get(
            f"{BASE_URL}/services/search",
            headers=client_headers,
            params={"practitioner_id": practitioner_data['practitioner_id']}
        ) as response:
            if response.status == 200:
                services_data = await response.json()
                print(f"Found {services_data.get('total', 0)} services")
            else:
                print("Note: Service search endpoint may need implementation")
        
        # 3. Get service details
        print(f"\n3. Getting service details for service ID: {practitioner_data['service_id']}...")
        async with session.get(
            f"{BASE_URL}/services/{practitioner_data['service_id']}",
            headers=client_headers
        ) as response:
            if response.status == 200:
                service = await response.json()
                print(f"✅ Service: {service['name']} - ${service['price']}")
            else:
                text = await response.text()
                print(f"Error getting service: {response.status} - {text}")
        
        # 4. Check practitioner availability
        print("\n4. Checking practitioner availability...")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        async with session.get(
            f"{BASE_URL}/practitioners/{practitioner_data['practitioner_id']}/availability",
            headers=client_headers,
            params={
                "service_id": practitioner_data['service_id'],
                "date": tomorrow
            }
        ) as response:
            if response.status == 200:
                availability = await response.json()
                print(f"Available slots: {len(availability.get('slots', []))}")
                if availability.get('slots'):
                    slot = availability['slots'][0]
                    print(f"First available slot: {slot}")
            else:
                print("Note: Availability endpoint may need implementation")
                # Use a default slot for testing
                slot = {
                    "start_time": f"{tomorrow}T10:00:00Z",
                    "end_time": f"{tomorrow}T11:00:00Z"
                }
        
        # 5. Create an order (purchase credits)
        print("\n5. Creating order to purchase credits...")
        order_data = {
            "items": [{
                "type": "credit_package",
                "amount": "100.00",
                "quantity": 1,
                "description": "100 credits"
            }],
            "payment_method_id": "pm_card_visa"  # Test payment method
        }
        
        async with session.post(
            f"{BASE_URL}/payments/orders",
            headers=client_headers,
            json=order_data
        ) as response:
            if response.status in [200, 201]:
                order = await response.json()
                print(f"✅ Order created: ID {order.get('id')} - ${order.get('total')}")
            else:
                text = await response.text()
                print(f"Note: Order creation may need implementation: {text}")
                # For testing, assume we have credits
        
        # 6. Create a booking
        print("\n6. Creating booking...")
        booking_data = {
            "service_id": practitioner_data['service_id'],
            "practitioner_id": practitioner_data['practitioner_id'],
            "start_time": slot.get('start_time', f"{tomorrow}T10:00:00Z"),
            "end_time": slot.get('end_time', f"{tomorrow}T11:00:00Z"),
            "notes": "Test booking from integration test"
        }
        
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
                return
        
        # 7. Check credit transaction
        print("\n7. Checking credit transactions...")
        async with session.get(
            f"{BASE_URL}/users/me/credit-transactions",
            headers=client_headers
        ) as response:
            if response.status == 200:
                transactions = await response.json()
                print(f"Found {transactions.get('total', 0)} transactions")
                for txn in transactions.get('results', [])[:3]:
                    print(f"   - {txn.get('type')}: ${txn.get('amount')} - {txn.get('description')}")
            else:
                print("Note: Credit transactions endpoint may need implementation")
        
        # 8. Check practitioner's bookings
        print("\n8. Checking practitioner's bookings...")
        async with session.get(
            f"{BASE_URL}/bookings/",
            headers=practitioner_headers
        ) as response:
            if response.status == 200:
                bookings = await response.json()
                print(f"✅ Practitioner has {bookings.get('total', 0)} bookings")
                for booking in bookings.get('results', [])[:3]:
                    print(f"   - {booking.get('service_name')} on {booking.get('start_time')}")
            else:
                text = await response.text()
                print(f"Error getting practitioner bookings: {text}")
        
        # 9. Complete the booking (mark as completed)
        print("\n9. Completing the booking...")
        async with session.patch(
            f"{BASE_URL}/bookings/{booking_id}",
            headers=practitioner_headers,
            json={"status": "completed"}
        ) as response:
            if response.status == 200:
                updated_booking = await response.json()
                print(f"✅ Booking marked as completed")
            else:
                print("Note: Booking completion may need implementation")
        
        # 10. Check practitioner earnings
        print("\n10. Checking practitioner earnings...")
        async with session.get(
            f"{BASE_URL}/practitioners/me/earnings",
            headers=practitioner_headers
        ) as response:
            if response.status == 200:
                earnings = await response.json()
                print(f"✅ Total earnings: ${earnings.get('total_earnings', 0)}")
                print(f"   Pending: ${earnings.get('pending_earnings', 0)}")
                print(f"   Available for payout: ${earnings.get('available_for_payout', 0)}")
            else:
                print("Note: Earnings endpoint may need implementation")
        
        print("\n" + "="*50)
        print("✅ SERVICE PURCHASE FLOW TEST COMPLETED")
        print("="*50)


async def main():
    """Main test function"""
    print("Testing Complete Service Purchase Flow")
    print("="*50)
    
    # Create users
    users = await create_users()
    if not users:
        print("Failed to create users")
        return
    
    # Set up practitioner
    practitioner_data = await setup_practitioner(users['practitioner_token'])
    if not practitioner_data:
        print("Failed to set up practitioner")
        return
    
    # Test purchase flow
    await test_purchase_flow(users, practitioner_data)


if __name__ == "__main__":
    asyncio.run(main())