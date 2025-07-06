"""
Checkout service for creating Stripe checkout sessions.
"""
import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from django.conf import settings

from integrations.stripe.client import StripeClient
from services.models import Service
from payments.models import SubscriptionTier
from users.models import User, UserPaymentProfile

logger = logging.getLogger(__name__)


class CheckoutService:
    """Service for creating Stripe checkout sessions."""
    
    def __init__(self):
        self.stripe_client = StripeClient()
    
    def create_service_checkout_session(
        self,
        service: Service,
        user: User,
        success_url: str,
        cancel_url: str,
        booking_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create checkout session for service booking.
        
        Args:
            service: Service to book
            user: User making the booking
            success_url: URL to redirect on success
            cancel_url: URL to redirect on cancel
            booking_data: Additional booking data
            
        Returns:
            Dict with session_id and url
        """
        # Ensure user has Stripe customer
        customer_id = self._ensure_stripe_customer(user)
        
        # Build line items
        line_items = [{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': service.name,
                    'description': service.description or f"{service.service_type.name} with {service.primary_practitioner.display_name}",
                    'images': [service.image_url] if hasattr(service, 'image_url') and service.image_url else [],
                },
                'unit_amount': int(service.price * 100),
            },
            'quantity': 1,
        }]
        
        # Build metadata
        metadata = {
            'order_type': 'service',
            'service_id': str(service.id),
            'user_id': str(user.id),
            'service_type': service.service_type.code,
        }
        
        # Add booking-specific metadata
        if booking_data:
            if booking_data.get('start_time'):
                metadata['start_time'] = booking_data['start_time'].isoformat()
            if booking_data.get('end_time'):
                metadata['end_time'] = booking_data['end_time'].isoformat()
            if booking_data.get('service_session_id'):
                metadata['service_session_id'] = str(booking_data['service_session_id'])
        
        # Create session
        session = self.stripe_client.checkout.sessions.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            customer=customer_id,
            metadata=metadata,
            payment_intent_data={
                'metadata': metadata
            }
        )
        
        logger.info(f"Created checkout session {session.id} for service {service.id}")
        
        return {
            'session_id': session.id,
            'url': session.url
        }
    
    def create_credit_checkout_session(
        self,
        amount: Decimal,
        user: User,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        """
        Create checkout session for credit purchase.
        
        Args:
            amount: Amount of credits to purchase (in dollars)
            user: User purchasing credits
            success_url: URL to redirect on success
            cancel_url: URL to redirect on cancel
            
        Returns:
            Dict with session_id and url
        """
        # Ensure user has Stripe customer
        customer_id = self._ensure_stripe_customer(user)
        
        # Build line items
        line_items = [{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': 'Account Credits',
                    'description': f'Purchase ${amount} in account credits',
                },
                'unit_amount': int(amount * 100),
            },
            'quantity': 1,
        }]
        
        # Build metadata
        metadata = {
            'order_type': 'credit',
            'credit_amount': str(amount),
            'user_id': str(user.id),
            'type': 'credit_purchase'
        }
        
        # Create session
        session = self.stripe_client.checkout.sessions.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            customer=customer_id,
            metadata=metadata,
            payment_intent_data={
                'metadata': metadata
            }
        )
        
        logger.info(f"Created checkout session {session.id} for ${amount} credits")
        
        return {
            'session_id': session.id,
            'url': session.url
        }
    
    def create_subscription_checkout_session(
        self,
        tier: SubscriptionTier,
        user: User,
        is_annual: bool,
        success_url: str,
        cancel_url: str,
        practitioner_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create checkout session for subscription.
        
        Args:
            tier: Subscription tier
            user: User subscribing
            is_annual: Whether annual billing
            success_url: URL to redirect on success
            cancel_url: URL to redirect on cancel
            practitioner_id: Practitioner ID if subscribing as practitioner
            
        Returns:
            Dict with session_id and url
        """
        # Ensure user has Stripe customer
        customer_id = self._ensure_stripe_customer(user)
        
        # Get price ID
        price_id = tier.stripe_annual_price_id if is_annual else tier.stripe_monthly_price_id
        
        if not price_id:
            raise ValueError(f"Subscription tier {tier.name} not properly configured")
        
        # Build line items
        line_items = [{
            'price': price_id,
            'quantity': 1,
        }]
        
        # Build metadata
        metadata = {
            'order_type': 'subscription',
            'subscription_tier_id': str(tier.id),
            'tier_id': str(tier.id),
            'is_annual': str(is_annual),
            'user_id': str(user.id),
            'type': 'practitioner' if practitioner_id else 'user'
        }
        
        if practitioner_id:
            metadata['practitioner_id'] = practitioner_id
        
        # Create session
        session = self.stripe_client.checkout.sessions.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            customer=customer_id,
            metadata=metadata,
            subscription_data={
                'metadata': metadata
            }
        )
        
        logger.info(f"Created subscription checkout session {session.id} for tier {tier.name}")
        
        return {
            'session_id': session.id,
            'url': session.url
        }
    
    def _ensure_stripe_customer(self, user: User) -> str:
        """
        Ensure user has a Stripe customer ID.
        
        Args:
            user: User to check
            
        Returns:
            Stripe customer ID
        """
        # Get or create payment profile
        profile, created = UserPaymentProfile.objects.get_or_create(user=user)
        
        if not profile.stripe_customer_id:
            # Create Stripe customer
            customer = self.stripe_client.customers.create(
                email=user.email,
                name=user.get_full_name(),
                metadata={'user_id': str(user.id)}
            )
            profile.stripe_customer_id = customer.id
            profile.save()
            
            logger.info(f"Created Stripe customer {customer.id} for user {user.id}")
        
        return profile.stripe_customer_id
    
    def retrieve_session(self, session_id: str) -> Dict[str, Any]:
        """
        Retrieve checkout session details.
        
        Args:
            session_id: Stripe session ID
            
        Returns:
            Session details
        """
        return self.stripe_client.checkout.sessions.retrieve(session_id)