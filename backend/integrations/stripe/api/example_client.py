"""
Example client code for using the Stripe checkout API.
"""
import asyncio
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any


class StripeCheckoutClient:
    """Client for interacting with the Stripe checkout API."""
    
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
        
    async def create_session_checkout(
        self,
        service_id: int,
        practitioner_id: int,
        start_time: datetime,
        end_time: datetime,
        save_payment_method: bool = False,
        use_credits: bool = False
    ) -> Dict[str, Any]:
        """Create a checkout for a single session."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/stripe/checkout/create",
                headers=self.headers,
                json={
                    "checkout_type": "single_session",
                    "items": [{
                        "service_id": service_id,
                        "practitioner_id": practitioner_id,
                        "start_time": start_time.isoformat(),
                        "end_time": end_time.isoformat(),
                        "quantity": 1
                    }],
                    "save_payment_method": save_payment_method,
                    "use_credits": use_credits
                }
            )
            response.raise_for_status()
            return response.json()
            
    async def create_bundle_checkout(
        self,
        bundle_service_id: int,
        practitioner_id: int,
        save_payment_method: bool = False
    ) -> Dict[str, Any]:
        """Create a checkout for a bundle purchase."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/stripe/checkout/create",
                headers=self.headers,
                json={
                    "checkout_type": "bundle",
                    "items": [{
                        "service_id": bundle_service_id,
                        "practitioner_id": practitioner_id,
                        "quantity": 1
                    }],
                    "save_payment_method": save_payment_method
                }
            )
            response.raise_for_status()
            return response.json()
            
    async def calculate_price(
        self,
        checkout_type: str,
        items: list,
        use_credits: bool = False,
        coupon_code: str = None
    ) -> Dict[str, Any]:
        """Calculate price before checkout."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/stripe/checkout/calculate-price",
                headers=self.headers,
                json={
                    "checkout_type": checkout_type,
                    "items": items,
                    "use_credits": use_credits,
                    "coupon_code": coupon_code
                }
            )
            response.raise_for_status()
            return response.json()
            
    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method_id: str = None
    ) -> Dict[str, Any]:
        """Confirm a payment."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/stripe/payment/confirm",
                headers=self.headers,
                json={
                    "payment_intent_id": payment_intent_id,
                    "payment_method_id": payment_method_id
                }
            )
            response.raise_for_status()
            return response.json()
            
    async def get_checkout_status(
        self,
        order_id: str = None,
        payment_intent_id: str = None
    ) -> Dict[str, Any]:
        """Get checkout status."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/stripe/checkout/status",
                headers=self.headers,
                json={
                    "order_id": order_id,
                    "payment_intent_id": payment_intent_id
                }
            )
            response.raise_for_status()
            return response.json()
            
    async def get_credit_balance(self) -> Dict[str, Any]:
        """Get user's credit balance."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/stripe/credits/balance",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()


# Example usage
async def main():
    # Initialize client
    client = StripeCheckoutClient(
        base_url="https://api.estuary.com/stripe/fastapi",
        auth_token="your-auth-token"
    )
    
    # Example 1: Create a session checkout
    print("1. Creating session checkout...")
    session_result = await client.create_session_checkout(
        service_id=123,
        practitioner_id=456,
        start_time=datetime.now() + timedelta(days=7),
        end_time=datetime.now() + timedelta(days=7, hours=1),
        save_payment_method=True,
        use_credits=True
    )
    print(f"Payment Intent ID: {session_result['payment_intent_id']}")
    print(f"Client Secret: {session_result['client_secret']}")
    print(f"Total: ${session_result['total_cents'] / 100:.2f}")
    
    # Example 2: Calculate price first
    print("\n2. Calculating price...")
    price_result = await client.calculate_price(
        checkout_type="single_session",
        items=[{
            "service_id": 123,
            "practitioner_id": 456,
            "start_time": (datetime.now() + timedelta(days=7)).isoformat(),
            "end_time": (datetime.now() + timedelta(days=7, hours=1)).isoformat(),
            "quantity": 1
        }],
        use_credits=True
    )
    print(f"Subtotal: ${price_result['subtotal_cents'] / 100:.2f}")
    print(f"Tax: ${price_result['tax_cents'] / 100:.2f}")
    print(f"Credits Applied: ${price_result['credits_applied_cents'] / 100:.2f}")
    print(f"Total: ${price_result['total_cents'] / 100:.2f}")
    
    # Example 3: Check credit balance
    print("\n3. Checking credit balance...")
    balance = await client.get_credit_balance()
    print(f"Credit Balance: ${balance['balance']:.2f}")
    
    # Example 4: Confirm payment (after user completes Stripe checkout)
    # This would typically happen after the frontend confirms the payment
    if session_result.get('payment_intent_id'):
        print("\n4. Confirming payment...")
        confirm_result = await client.confirm_payment(
            payment_intent_id=session_result['payment_intent_id']
        )
        print(f"Payment Status: {confirm_result['status']}")
        print(f"Booking IDs: {confirm_result['booking_ids']}")


if __name__ == "__main__":
    asyncio.run(main())