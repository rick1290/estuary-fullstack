"""
Payment processing service for handling Stripe payments.
"""
import stripe
import logging
from decimal import Decimal
from typing import Optional, Dict, Any, Tuple
from django.db import transaction
from django.utils import timezone

from payments.models import Order, PaymentMethod
from integrations.stripe.client import StripeClient
from users.models import User, UserPaymentProfile

logger = logging.getLogger(__name__)


class PaymentService:
    """Service for handling payment processing logic."""
    
    def __init__(self):
        self.stripe_client = StripeClient()
        self.stripe_client.initialize()
    
    def calculate_payment_amounts(
        self,
        service_price_cents: int,
        apply_credits: bool,
        user_credit_balance_cents: int
    ) -> Tuple[int, int]:
        """
        Calculate how much to charge and how many credits to apply.
        
        Args:
            service_price_cents: Service price in cents
            apply_credits: Whether to apply credits
            user_credit_balance_cents: User's credit balance in cents
            
        Returns:
            Tuple of (credits_to_apply_cents, amount_to_charge_cents)
        """
        credits_to_apply_cents = 0
        
        if apply_credits and user_credit_balance_cents > 0:
            credits_to_apply_cents = min(user_credit_balance_cents, service_price_cents)
        
        amount_to_charge_cents = service_price_cents - credits_to_apply_cents
        
        return credits_to_apply_cents, amount_to_charge_cents
    
    def ensure_stripe_customer(self, user: User) -> str:
        """
        Ensure user has a Stripe customer ID.
        
        Args:
            user: User instance
            
        Returns:
            Stripe customer ID
        """
        profile, created = UserPaymentProfile.objects.get_or_create(user=user)
        
        if not profile.stripe_customer_id:
            customer = self.stripe_client.create_customer(user)
            profile.stripe_customer_id = customer.id
            profile.save()
        
        return profile.stripe_customer_id
    
    def create_order(
        self,
        user: User,
        service: Any,
        payment_method: PaymentMethod,
        service_price_cents: int,
        credits_to_apply_cents: int,
        amount_to_charge_cents: int,
        special_requests: Optional[str] = None
    ) -> Order:
        """
        Create an order record.
        
        Args:
            user: User making the purchase
            service: Service being purchased
            payment_method: Payment method being used
            service_price_cents: Original service price
            credits_to_apply_cents: Credits being applied
            amount_to_charge_cents: Amount to charge after credits
            special_requests: Any special requests
            
        Returns:
            Created Order instance
        """
        return Order.objects.create(
            user=user,
            payment_method='stripe',
            stripe_payment_method_id=payment_method.stripe_payment_method_id,
            subtotal_amount_cents=service_price_cents,
            credits_applied_cents=credits_to_apply_cents,
            total_amount_cents=amount_to_charge_cents,
            status='pending',
            order_type='direct',
            service=service,
            practitioner=service.primary_practitioner,
            metadata={
                'special_requests': special_requests or '',
                'payment_method_id': str(payment_method.id)
            }
        )
    
    def process_stripe_payment(
        self,
        user: User,
        payment_method: PaymentMethod,
        amount_cents: int,
        order: Order,
        service: Any
    ) -> Dict[str, Any]:
        """
        Process payment through Stripe.
        
        Args:
            user: User making payment
            payment_method: Payment method to use
            amount_cents: Amount to charge in cents
            order: Order record
            service: Service being purchased
            
        Returns:
            Dict with payment result including status and payment_intent
        """
        if amount_cents <= 0:
            # No payment needed
            return {
                'status': 'no_payment_needed',
                'payment_intent': None
            }
        
        try:
            # Ensure Stripe customer exists
            stripe_customer_id = self.ensure_stripe_customer(user)
            
            # Create and confirm payment intent
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='usd',
                customer=stripe_customer_id,
                payment_method=payment_method.stripe_payment_method_id,
                payment_method_types=['card'],
                confirm=True,
                automatic_payment_methods={
                    'enabled': False
                },
                metadata={
                    'order_id': str(order.id),
                    'user_id': str(user.id),
                    'service_id': str(service.id),
                    'practitioner_id': str(service.primary_practitioner.id) if service.primary_practitioner else None
                }
            )
            
            # Update order with payment intent ID
            order.stripe_payment_intent_id = payment_intent.id
            order.save()
            
            if payment_intent.status == 'succeeded':
                order.status = 'completed'
                order.save()
                return {
                    'status': 'succeeded',
                    'payment_intent': payment_intent
                }
            else:
                order.status = 'processing'
                order.save()
                return {
                    'status': 'requires_action',
                    'payment_intent': payment_intent,
                    'client_secret': payment_intent.client_secret
                }
                
        except stripe.error.CardError as e:
            logger.error(f"Card error during payment: {str(e)}")
            order.status = 'failed'
            order.save()
            raise
        except Exception as e:
            logger.error(f"Payment processing error: {str(e)}")
            order.status = 'failed'
            order.save()
            raise
    
    def refund_payment(self, order: Order, amount_cents: Optional[int] = None) -> Dict[str, Any]:
        """
        Refund a payment.
        
        Args:
            order: Order to refund
            amount_cents: Amount to refund (None for full refund)
            
        Returns:
            Dict with refund details
        """
        if not order.stripe_payment_intent_id:
            raise ValueError("Order has no payment intent to refund")
        
        try:
            refund_params = {
                'payment_intent': order.stripe_payment_intent_id,
            }
            
            if amount_cents is not None:
                refund_params['amount'] = amount_cents
                
            refund = stripe.Refund.create(**refund_params)
            
            # Update order status
            if amount_cents is None or amount_cents >= order.total_amount_cents:
                order.status = 'refunded'
            else:
                order.status = 'partially_refunded'
            order.save()
            
            return {
                'status': 'success',
                'refund_id': refund.id,
                'amount_refunded': refund.amount
            }
            
        except Exception as e:
            logger.error(f"Refund error: {str(e)}")
            raise