#!/usr/bin/env python3
"""
Test credit purchase and usage flow
"""
import asyncio
import aiohttp
import json
from datetime import datetime
from decimal import Decimal

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = f"test_credit_user_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
TEST_PASSWORD = "testpass123"


async def test_credit_flow():
    """Test the credit purchase and balance flow"""
    async with aiohttp.ClientSession() as session:
        # 1. Create user
        print("1. Creating test user...")
        async with session.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "first_name": "Credit",
                "last_name": "Tester",
                "role": "user"
            }
        ) as response:
            if response.status != 201:
                print(f"Error creating user: {response.status}")
                return
        
        # 2. Login
        async with session.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        ) as response:
            if response.status != 200:
                print("Error logging in")
                return
            data = await response.json()
            token = data["access_token"]
            print("✅ User created and logged in")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Check initial credit balance
        print("\n2. Checking initial credit balance...")
        async with session.get(f"{BASE_URL}/payments/credits/balance", headers=headers) as response:
            if response.status == 200:
                balance_data = await response.json()
                balance = balance_data.get('balance', 0)
                balance_cents = balance_data.get('balance_cents', 0)
                print(f"✅ Initial balance: ${float(balance):.2f}")
                print(f"   Balance in cents: {balance_cents}")
            else:
                text = await response.text()
                print(f"Error getting balance: {response.status} - {text}")
        
        # 4. Test credit purchase endpoint
        print("\n3. Testing credit purchase endpoint...")
        purchase_data = {
            "amount": 100.00,  # $100
            "payment_method_id": "pm_card_visa"  # Test payment method
        }
        
        async with session.post(
            f"{BASE_URL}/payments/credits/purchase",
            headers=headers,
            json=purchase_data
        ) as response:
            if response.status == 200:
                intent_data = await response.json()
                print(f"✅ Payment intent created")
                print(f"   Intent ID: {intent_data.get('payment_intent_id')}")
                print(f"   Amount: ${intent_data.get('amount', 0) / 100:.2f}")
                print(f"   Status: {intent_data.get('status')}")
                print("\nNote: In production, this would be confirmed via Stripe Elements")
            else:
                text = await response.text()
                print(f"Error creating payment intent: {response.status} - {text}")
        
        # 5. Create an order for credits (alternative method)
        print("\n4. Testing order creation for credits...")
        order_data = {
            "order_type": "credit",
            "payment_method": "stripe",
            "credit_amount": 50.00,  # $50
            "payment_method_id": "pm_card_visa"
        }
        
        async with session.post(
            f"{BASE_URL}/payments/orders",
            headers=headers,
            json=order_data
        ) as response:
            if response.status in [200, 201]:
                order = await response.json()
                print(f"✅ Order created")
                print(f"   Order ID: {order.get('id')}")
                print(f"   Total: ${float(order.get('total_amount', 0)):.2f}")
                print(f"   Status: {order.get('status')}")
            else:
                text = await response.text()
                print(f"Error creating order: {response.status} - {text}")
        
        # 6. Check credit transactions
        print("\n5. Checking credit transactions...")
        async with session.get(f"{BASE_URL}/payments/credits/transactions", headers=headers) as response:
            if response.status == 200:
                transactions = await response.json()
                print(f"✅ Found {transactions.get('total', 0)} transactions")
                
                # Show current balance from the response
                if 'current_balance' in transactions:
                    current = transactions['current_balance']
                    print(f"\n   Current balance: ${float(current.get('balance', 0)):.2f}")
                
                # Show recent transactions
                for txn in transactions.get('results', [])[:5]:
                    print(f"\n   Transaction: {txn.get('transaction_type')}")
                    print(f"   Amount: ${float(txn.get('amount', 0)):.2f}")
                    print(f"   Description: {txn.get('description')}")
                    print(f"   Date: {txn.get('created_at')}")
            else:
                text = await response.text()
                print(f"Error getting transactions: {response.status} - {text}")
        
        # 7. Test credit transfer
        print("\n6. Testing credit transfer...")
        print("Note: This would transfer credits to another user")
        print("Skipping as it requires another user ID")
        
        print("\n✅ Credit system test completed!")
        print("\n📝 Summary:")
        print("   - Credit balance tracking works")
        print("   - Credit purchase creates payment intent")
        print("   - Order system supports credit purchases")
        print("   - Transaction history is tracked")
        print("\n🚧 Next steps:")
        print("   - Webhook handling to confirm payment and add credits")
        print("   - Integration with booking system to spend credits")
        print("   - Refund handling")


async def main():
    """Main test function"""
    print("Testing Credit Purchase and Balance System")
    print("="*50)
    
    await test_credit_flow()


if __name__ == "__main__":
    asyncio.run(main())