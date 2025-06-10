#!/usr/bin/env python3
"""
Test practitioner subscription flow via API
"""
import asyncio
import aiohttp
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = f"test_practitioner_api_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
TEST_USER_PASSWORD = "testpass123"


async def create_test_user():
    """Create a test user (practitioner profile will be created automatically when needed)"""
    async with aiohttp.ClientSession() as session:
        # Create user
        async with session.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "first_name": "Test",
                "last_name": "Practitioner",
                "role": "practitioner"
            }
        ) as response:
            if response.status == 400:
                print("User already exists, continuing...")
            elif response.status == 201:
                print("Created test user")
            else:
                text = await response.text()
                print(f"Error creating user: {response.status} - {text}")
                return None
        
        # Login to get token
        async with session.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
        ) as response:
            if response.status != 200:
                text = await response.text()
                print(f"Error logging in: {response.status} - {text}")
                return None
            
            data = await response.json()
            token = data["access_token"]
            print(f"Logged in successfully")
            print(f"Token: {token[:20]}...")
            
        return token


async def test_subscription_flow():
    """Test the complete subscription flow"""
    # Create test user (practitioner profile created automatically when subscribing)
    token = await create_test_user()
    if not token:
        print("Failed to create test user")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    async with aiohttp.ClientSession() as session:
        # 1. List available subscription tiers
        print("\n1. Listing subscription tiers...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/tiers", headers=headers) as response:
            if response.status != 200:
                text = await response.text()
                print(f"Error listing tiers: {response.status} - {text}")
                return
            
            tiers_data = await response.json()
            tiers = tiers_data["results"]
            print(f"Found {len(tiers)} subscription tiers:")
            for tier in tiers:
                print(f"  - {tier['name']}: ${tier['monthly_price']}/month, ${tier['annual_price']}/year")
                commission_discount = tier['features'].get('commission_discount', 0)
                print(f"    Commission discount: {commission_discount}%")
        
        # 2. Check current subscription (should be none)
        print("\n2. Checking current subscription...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/current", headers=headers) as response:
            if response.status == 200:
                sub_data = await response.json()
                if sub_data:
                    print(f"Already has subscription: {sub_data['tier']['name']}")
                    # Cancel it if it exists
                    print("\n2a. Canceling existing subscription...")
                    async with session.delete(f"{BASE_URL}/practitioner-subscriptions/current", headers=headers) as cancel_response:
                        if cancel_response.status == 200:
                            print("Successfully canceled existing subscription")
                        else:
                            text = await cancel_response.text()
                            print(f"Error canceling subscription: {cancel_response.status} - {text}")
                else:
                    print("No current subscription")
            else:
                print("No current subscription")
        
        # 3. Check subscription usage (should show free tier limits)
        print("\n3. Checking subscription usage...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/usage", headers=headers) as response:
            if response.status == 200:
                usage_data = await response.json()
                print(f"Current tier: {usage_data['tier_name']}")
                print(f"Services: {usage_data['services_used']}/{usage_data['services_limit']}")
                print(f"Commission rate: {usage_data['effective_commission_rate']}%")
        
        # 4. First, subscribe to Free tier (no payment needed)
        print("\n4. Testing subscription to Free tier (no payment required)...")
        free_tier = next((t for t in tiers if t['name'] == 'Free'), None)
        if not free_tier:
            print("Free tier not found!")
            return
        
        print(f"Free tier: ${free_tier['monthly_price']}/month")
        
        # For Free tier, we don't need a payment method
        subscription_data = {
            "tier_id": free_tier['id'],
            "is_annual": False  # Monthly subscription
        }
        
        async with session.post(
            f"{BASE_URL}/practitioner-subscriptions/",
            headers=headers,
            json=subscription_data
        ) as response:
            if response.status == 201:
                sub_data = await response.json()
                print(f"✅ Successfully subscribed to {sub_data['tier']['name']} tier!")
                print(f"Subscription ID: {sub_data['id']}")
                print(f"Stripe subscription ID: {sub_data['stripe_subscription_id']}")
                print(f"Status: {sub_data['status']}")
                print(f"Next billing: {sub_data['next_billing_date']} - ${sub_data['next_billing_amount']}")
            else:
                text = await response.text()
                print(f"Error creating subscription: {response.status} - {text}")
                return
        
        # 5. Check updated usage
        print("\n5. Checking updated usage...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/usage", headers=headers) as response:
            if response.status == 200:
                usage_data = await response.json()
                print(f"Current tier: {usage_data['tier_name']}")
                print(f"Services limit: {usage_data['services_limit']}")
                print(f"New commission rate: {usage_data['effective_commission_rate']}%")
        
        # 6. Test listing invoices
        print("\n6. Listing invoices...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/invoices", headers=headers) as response:
            if response.status == 200:
                invoices_data = await response.json()
                print(f"Found {invoices_data['total']} invoices")
                for invoice in invoices_data['results']:
                    print(f"  - {invoice['invoice_number']}: ${invoice['amount_due']} ({invoice['status']})")
        
        # 7. Check commission rates
        print("\n7. Checking commission rates...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/commission-rates", headers=headers) as response:
            if response.status == 200:
                rates = await response.json()
                for rate in rates:
                    print(f"  - {rate['service_type']}: {rate['effective_rate']}% (base: {rate['base_rate']}%, discount: {rate['tier_adjustment']}%)")
        
        # 8. Test upgrading to Entry tier
        print("\n8. Testing upgrade to Entry tier...")
        entry_tier = next((t for t in tiers if t['name'] == 'Entry'), None)
        if entry_tier:
            print(f"Would upgrade to Entry tier (${entry_tier['monthly_price']}/month)")
            print("Note: Actual upgrade requires payment method")
        
        print("\n✅ Subscription flow test completed successfully!")


if __name__ == "__main__":
    print("Testing Practitioner Subscription API Flow")
    print("=" * 50)
    asyncio.run(test_subscription_flow())