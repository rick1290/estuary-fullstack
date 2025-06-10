#!/usr/bin/env python
"""
Test practitioner subscription flow
"""
import asyncio
import aiohttp
import json
from datetime import datetime
import stripe
import os

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = "test_practitioner@example.com"
TEST_USER_PASSWORD = "testpass123"

# Stripe test card
TEST_CARD = {
    "number": "4242424242424242",
    "exp_month": 12,
    "exp_year": 2025,
    "cvc": "123"
}

# Set up Stripe - read from settings
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
import django
django.setup()
from django.conf import settings
stripe.api_key = settings.STRIPE_SECRET_KEY


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
                return None, None
        
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
                return None, None
            
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
                commission_rate = tier['features'].get('commission_rate', tier['features'].get('commission_discount', 0))
                print(f"    Commission discount: {commission_rate}%")
        
        # 2. Check current subscription (should be none)
        print("\n2. Checking current subscription...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/current", headers=headers) as response:
            if response.status == 200:
                sub_data = await response.json()
                if sub_data:
                    print(f"Already has subscription: {sub_data['tier']['name']}")
                    return
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
        
        # 4. Use a test payment method
        print("\n4. Using test payment method...")
        # Use Stripe's test payment method for successful payments
        payment_method_id = "pm_card_visa"  # This is a test payment method that always succeeds
        print(f"Using test payment method: {payment_method_id}")
        
        # 5. Subscribe to Free tier (no payment needed)
        print("\n5. Subscribing to Free tier (testing without payment)...")
        free_tier = next((t for t in tiers if t['name'] == 'Free'), None)
        if not free_tier:
            print("Free tier not found!")
            return
        
        # For Free tier, we might not need a payment method
        subscription_data = {
            "tier_id": free_tier['id'],
            "is_annual": False  # Monthly subscription
        }
        
        # Only add payment method if tier has a price
        if float(free_tier['monthly_price']) > 0:
            subscription_data["payment_method_id"] = payment_method_id
        
        async with session.post(
            f"{BASE_URL}/practitioner-subscriptions/",
            headers=headers,
            json=subscription_data
        ) as response:
            if response.status == 201:
                sub_data = await response.json()
                print(f"Successfully subscribed to {sub_data['tier']['name']} tier!")
                print(f"Subscription ID: {sub_data['id']}")
                print(f"Stripe subscription ID: {sub_data['stripe_subscription_id']}")
                print(f"Status: {sub_data['status']}")
                print(f"Next billing: {sub_data['next_billing_date']} - ${sub_data['next_billing_amount']}")
            else:
                text = await response.text()
                print(f"Error creating subscription: {response.status} - {text}")
                return
        
        # 6. Check updated usage
        print("\n6. Checking updated usage...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/usage", headers=headers) as response:
            if response.status == 200:
                usage_data = await response.json()
                print(f"Current tier: {usage_data['tier_name']}")
                print(f"Services limit: {usage_data['services_limit']}")
                print(f"New commission rate: {usage_data['effective_commission_rate']}%")
        
        # 7. Test listing invoices
        print("\n7. Listing invoices...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/invoices", headers=headers) as response:
            if response.status == 200:
                invoices_data = await response.json()
                print(f"Found {invoices_data['total']} invoices")
                for invoice in invoices_data['results']:
                    print(f"  - {invoice['invoice_number']}: ${invoice['amount_due']} ({invoice['status']})")
        
        # 8. Check commission rates
        print("\n8. Checking commission rates...")
        async with session.get(f"{BASE_URL}/practitioner-subscriptions/commission-rates", headers=headers) as response:
            if response.status == 200:
                rates = await response.json()
                for rate in rates:
                    print(f"  - {rate['service_type']}: {rate['effective_rate']}% (base: {rate['base_rate']}%, discount: {rate['tier_adjustment']}%)")
        
        print("\n✅ Subscription flow test completed successfully!")


async def test_webhook_integration():
    """Test webhook integration for subscription events"""
    print("\n\nTesting webhook integration...")
    print("Trigger test events with:")
    print("  stripe trigger customer.subscription.created")
    print("  stripe trigger customer.subscription.updated")
    print("  stripe trigger invoice.payment_succeeded")
    

if __name__ == "__main__":
    print("Testing Practitioner Subscription Flow")
    print("=" * 50)
    asyncio.run(test_subscription_flow())
    asyncio.run(test_webhook_integration())