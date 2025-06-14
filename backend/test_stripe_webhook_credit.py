#!/usr/bin/env python3
"""
Test Stripe webhook for credit purchase
"""
import asyncio
import aiohttp
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
WEBHOOK_URL = "http://localhost:8001/api/v1/payments/webhook"


async def test_credit_webhook():
    """Test the credit purchase webhook flow"""
    
    # Simulate a successful payment intent webhook
    webhook_payload = {
        "id": "evt_test_webhook",
        "object": "event",
        "api_version": "2023-10-16",
        "created": int(datetime.now().timestamp()),
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_credit_purchase",
                "object": "payment_intent",
                "amount": 10000,  # $100 in cents
                "currency": "usd",
                "status": "succeeded",
                "metadata": {
                    "type": "credit_purchase",
                    "user_id": "1",  # Test user ID
                    "credit_amount": "100.00"
                }
            }
        }
    }
    
    print("Testing Credit Purchase Webhook")
    print("="*50)
    
    print("\n1. Sending test webhook to:", WEBHOOK_URL)
    print(f"   Payment amount: ${webhook_payload['data']['object']['amount'] / 100:.2f}")
    print(f"   Credit amount: ${float(webhook_payload['data']['object']['metadata']['credit_amount']):.2f}")
    print(f"   User ID: {webhook_payload['data']['object']['metadata']['user_id']}")
    
    async with aiohttp.ClientSession() as session:
        # Note: In production, this would include Stripe signature headers
        headers = {
            "Content-Type": "application/json",
            "Stripe-Signature": "test_signature"  # This won't validate, but shows the structure
        }
        
        async with session.post(
            WEBHOOK_URL,
            json=webhook_payload,
            headers=headers
        ) as response:
            status = response.status
            text = await response.text()
            
            print(f"\n2. Webhook response:")
            print(f"   Status: {status}")
            if status != 200:
                print(f"   Response: {text}")
            else:
                print("   ✅ Webhook processed successfully")
    
    print("\n3. To verify credits were added:")
    print("   - Check user's credit balance")
    print("   - Check credit transactions")
    print("   - Look for transaction with type='purchase'")
    
    print("\n4. Using Stripe CLI for real testing:")
    print("   stripe trigger payment_intent.succeeded \\")
    print('     --add-metadata type=credit_purchase \\')
    print('     --add-metadata user_id=1 \\')
    print('     --add-metadata credit_amount=100.00')
    
    print("\n✅ Webhook test completed!")


async def main():
    """Main test function"""
    await test_credit_webhook()


if __name__ == "__main__":
    asyncio.run(main())