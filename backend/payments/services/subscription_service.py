"""
Subscription service for managing practitioner subscriptions.
"""
import logging
from typing import Optional, Dict, Any
from django.db import transaction
from django.utils import timezone

from payments.models import (
    PractitionerSubscription, SubscriptionTier, PaymentMethod
)
from practitioners.models import Practitioner
from integrations.stripe.client import StripeClient

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Service for managing practitioner subscriptions."""
    
    def __init__(self):
        self.stripe_client = StripeClient()
    
    @transaction.atomic
    def create_subscription(
        self,
        practitioner: Practitioner,
        tier: SubscriptionTier,
        payment_method: PaymentMethod,
        is_annual: bool = False
    ) -> PractitionerSubscription:
        """
        Create a new subscription for practitioner.
        
        Args:
            practitioner: Practitioner subscribing
            tier: Subscription tier
            payment_method: Payment method to use
            is_annual: Whether annual billing
            
        Returns:
            Created subscription
        """
        # Cancel any existing active subscription
        existing = PractitionerSubscription.objects.filter(
            practitioner=practitioner,
            status='active'
        ).first()
        
        if existing:
            self.cancel_subscription(existing, "Upgrading to new subscription")
        
        # Get price ID
        price_id = tier.stripe_annual_price_id if is_annual else tier.stripe_monthly_price_id
        
        if not price_id:
            raise ValueError(f"Subscription tier {tier.name} not properly configured")
        
        # Create Stripe subscription
        stripe_subscription = self.stripe_client.subscriptions.create(
            customer=practitioner.user.payment_profile.stripe_customer_id,
            items=[{'price': price_id}],
            default_payment_method=payment_method.stripe_payment_method_id,
            metadata={
                'practitioner_id': str(practitioner.id),
                'tier_id': str(tier.id),
                'is_annual': str(is_annual)
            }
        )
        
        # Create local subscription record
        subscription = PractitionerSubscription.objects.create(
            practitioner=practitioner,
            tier=tier,
            stripe_subscription_id=stripe_subscription.id,
            stripe_customer_id=stripe_subscription.customer,
            status='active',
            current_period_start=timezone.datetime.fromtimestamp(
                stripe_subscription.current_period_start,
                tz=timezone.utc
            ),
            current_period_end=timezone.datetime.fromtimestamp(
                stripe_subscription.current_period_end,
                tz=timezone.utc
            ),
            is_annual=is_annual
        )
        
        logger.info(f"Created subscription {subscription.id} for practitioner {practitioner.id}")
        
        return subscription
    
    @transaction.atomic
    def confirm_subscription_payment(
        self,
        subscription: PractitionerSubscription,
        payment_intent_id: str
    ) -> PractitionerSubscription:
        """
        Confirm subscription payment after 3D Secure.
        
        Args:
            subscription: Subscription to confirm
            payment_intent_id: Stripe PaymentIntent ID
            
        Returns:
            Updated subscription
        """
        # Retrieve payment intent
        payment_intent = self.stripe_client.payment_intents.retrieve(payment_intent_id)
        
        if payment_intent.status == 'succeeded':
            subscription.status = 'active'
            subscription.save()
            
            logger.info(f"Confirmed payment for subscription {subscription.id}")
        else:
            logger.warning(
                f"Payment intent {payment_intent_id} status is {payment_intent.status} "
                f"for subscription {subscription.id}"
            )
        
        return subscription
    
    @transaction.atomic
    def cancel_subscription(
        self,
        subscription: PractitionerSubscription,
        reason: Optional[str] = None,
        at_period_end: bool = True
    ) -> PractitionerSubscription:
        """
        Cancel a subscription.
        
        Args:
            subscription: Subscription to cancel
            reason: Cancellation reason
            at_period_end: Whether to cancel at period end
            
        Returns:
            Updated subscription
        """
        if subscription.status == 'canceled':
            logger.warning(f"Subscription {subscription.id} already canceled")
            return subscription
        
        # Cancel in Stripe
        if subscription.stripe_subscription_id:
            try:
                stripe_subscription = self.stripe_client.subscriptions.update(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=at_period_end,
                    metadata={
                        'cancellation_reason': reason or 'User requested'
                    }
                )
                
                if not at_period_end:
                    # Immediate cancellation
                    subscription.status = 'canceled'
                    subscription.end_date = timezone.now()
                else:
                    # Cancel at period end
                    subscription.status = 'active'
                    subscription.cancel_at_period_end = True
                    subscription.cancellation_reason = reason
                
            except Exception as e:
                logger.error(f"Failed to cancel Stripe subscription: {e}")
                # Still cancel locally
                subscription.status = 'canceled'
                subscription.end_date = timezone.now()
        else:
            # No Stripe subscription, just cancel locally
            subscription.status = 'canceled'
            subscription.end_date = timezone.now()
        
        subscription.cancellation_reason = reason
        subscription.save()
        
        logger.info(f"Canceled subscription {subscription.id}")
        
        return subscription
    
    @transaction.atomic
    def update_subscription_tier(
        self,
        subscription: PractitionerSubscription,
        new_tier: SubscriptionTier,
        prorate: bool = True
    ) -> PractitionerSubscription:
        """
        Update subscription to a new tier.
        
        Args:
            subscription: Subscription to update
            new_tier: New tier to switch to
            prorate: Whether to prorate the change
            
        Returns:
            Updated subscription
        """
        if subscription.status != 'active':
            raise ValueError(f"Cannot update {subscription.status} subscription")
        
        # Get new price ID (maintain annual/monthly billing)
        new_price_id = (
            new_tier.stripe_annual_price_id if subscription.is_annual 
            else new_tier.stripe_monthly_price_id
        )
        
        if not new_price_id:
            raise ValueError(f"New tier {new_tier.name} not properly configured")
        
        # Update in Stripe
        stripe_subscription = self.stripe_client.subscriptions.retrieve(
            subscription.stripe_subscription_id
        )
        
        # Update subscription item
        self.stripe_client.subscription_items.update(
            stripe_subscription.items.data[0].id,
            price=new_price_id,
            proration_behavior='create_prorations' if prorate else 'none'
        )
        
        # Update local record
        old_tier = subscription.tier
        subscription.tier = new_tier
        subscription.save()
        
        # Log tier change
        logger.info(
            f"Updated subscription {subscription.id} from tier {old_tier.name} "
            f"to {new_tier.name}"
        )
        
        return subscription
    
    def get_subscription_status(
        self,
        practitioner: Practitioner
    ) -> Dict[str, Any]:
        """
        Get current subscription status for practitioner.
        
        Args:
            practitioner: Practitioner to check
            
        Returns:
            Dict with subscription status info
        """
        active_subscription = PractitionerSubscription.objects.filter(
            practitioner=practitioner,
            status='active'
        ).first()
        
        if not active_subscription:
            return {
                'has_subscription': False,
                'subscription': None,
                'tier': None,
                'expires_at': None,
                'is_trial': False
            }
        
        return {
            'has_subscription': True,
            'subscription': active_subscription,
            'tier': active_subscription.tier,
            'expires_at': active_subscription.current_period_end,
            'is_trial': active_subscription.status == 'trialing',
            'cancel_at_period_end': active_subscription.cancel_at_period_end
        }
    
    def reactivate_subscription(
        self,
        subscription: PractitionerSubscription
    ) -> PractitionerSubscription:
        """
        Reactivate a canceled subscription before period end.
        
        Args:
            subscription: Subscription to reactivate
            
        Returns:
            Updated subscription
        """
        if not subscription.cancel_at_period_end:
            raise ValueError("Subscription is not set to cancel at period end")
        
        if subscription.status != 'active':
            raise ValueError("Can only reactivate active subscriptions set to cancel")
        
        # Update in Stripe
        self.stripe_client.subscriptions.update(
            subscription.stripe_subscription_id,
            cancel_at_period_end=False
        )
        
        # Update local record
        subscription.cancel_at_period_end = False
        subscription.cancellation_reason = None
        subscription.save()
        
        logger.info(f"Reactivated subscription {subscription.id}")
        
        return subscription