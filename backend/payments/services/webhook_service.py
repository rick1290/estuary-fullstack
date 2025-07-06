"""
Webhook service for handling Stripe webhooks.
"""
import logging
from typing import Dict, Any, Optional
from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from payments.models import (
    Order, UserCreditTransaction, PractitionerSubscription,
    SubscriptionTier
)
from payments.services.credit_service import CreditService
from payments.services.earnings_service import EarningsService
from bookings.models import Booking
from users.models import User
from practitioners.models import Practitioner

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for processing Stripe webhooks."""
    
    def __init__(self):
        self.credit_service = CreditService()
        self.earnings_service = EarningsService()
    
    @transaction.atomic
    def handle_payment_success(self, payment_intent: Dict[str, Any]) -> None:
        """
        Handle successful payment from Stripe.
        
        Args:
            payment_intent: Stripe PaymentIntent object
        """
        metadata = payment_intent.get('metadata', {})
        intent_id = payment_intent['id']
        
        logger.info(f"Processing successful payment: {intent_id}")
        
        # Handle different payment types based on metadata
        if metadata.get('type') == 'credit_purchase':
            self._handle_credit_purchase_success(payment_intent)
        elif metadata.get('order_id'):
            self._handle_order_payment_success(payment_intent)
        else:
            logger.warning(f"Unknown payment type for intent {intent_id}")
    
    def _handle_credit_purchase_success(self, payment_intent: Dict[str, Any]) -> None:
        """Handle successful credit purchase."""
        metadata = payment_intent.get('metadata', {})
        user_id = metadata.get('user_id')
        amount = Decimal(metadata.get('amount', '0'))
        
        if not user_id or amount <= 0:
            logger.error(f"Invalid credit purchase metadata: {metadata}")
            return
        
        try:
            user = User.objects.get(id=user_id)
            
            # Check if transaction already exists (idempotency)
            existing = UserCreditTransaction.objects.filter(
                user=user,
                metadata__stripe_payment_intent_id=payment_intent['id']
            ).exists()
            
            if existing:
                logger.info(f"Credit transaction already exists for {payment_intent['id']}")
                return
            
            # Create credit transaction
            transaction = UserCreditTransaction.objects.create(
                user=user,
                amount_cents=int(amount * 100),
                transaction_type='purchase',
                description=f"Credit purchase via Stripe",
                metadata={
                    'stripe_payment_intent_id': payment_intent['id'],
                    'amount_usd': str(amount)
                }
            )
            
            logger.info(f"Created credit transaction {transaction.id} for user {user_id}")
            
        except User.DoesNotExist:
            logger.error(f"User {user_id} not found for credit purchase")
    
    def _handle_order_payment_success(self, payment_intent: Dict[str, Any]) -> None:
        """Handle successful order payment."""
        metadata = payment_intent.get('metadata', {})
        order_id = metadata.get('order_id')
        
        if not order_id:
            return
        
        try:
            order = Order.objects.get(id=order_id)
            
            # Skip if already completed
            if order.status == 'completed':
                logger.info(f"Order {order_id} already completed")
                return
            
            # Update order
            order.status = 'completed'
            order.stripe_payment_intent_id = payment_intent['id']
            order.paid_at = timezone.now()
            order.save()
            
            # Handle order-specific logic based on order type
            if order.order_type == 'credit':
                # Credit purchase - create transaction if not exists
                if not order.user_credit_transactions.exists():
                    self.credit_service.purchase_credits(
                        user=order.user,
                        amount_cents=order.total_amount_cents,
                        order=order
                    )
            
            logger.info(f"Completed order {order_id}")
            
        except Order.DoesNotExist:
            logger.error(f"Order {order_id} not found")
    
    @transaction.atomic
    def handle_payment_failure(self, payment_intent: Dict[str, Any]) -> None:
        """
        Handle failed payment from Stripe.
        
        Args:
            payment_intent: Stripe PaymentIntent object
        """
        metadata = payment_intent.get('metadata', {})
        order_id = metadata.get('order_id')
        
        if order_id:
            try:
                order = Order.objects.get(id=order_id)
                order.status = 'failed'
                order.save()
                
                # Cancel any associated bookings
                if hasattr(order, 'booking'):
                    booking = order.booking
                    if booking.status == 'pending':
                        booking.status = 'cancelled'
                        booking.cancellation_reason = 'Payment failed'
                        booking.save()
                
                logger.info(f"Marked order {order_id} as failed")
                
            except Order.DoesNotExist:
                logger.error(f"Order {order_id} not found")
    
    @transaction.atomic
    def handle_subscription_created(self, subscription: Dict[str, Any]) -> None:
        """
        Handle subscription creation from Stripe.
        
        Args:
            subscription: Stripe Subscription object
        """
        metadata = subscription.get('metadata', {})
        subscription_type = metadata.get('type')
        
        if subscription_type == 'practitioner':
            self._handle_practitioner_subscription_created(subscription)
        else:
            logger.warning(f"Unknown subscription type: {subscription_type}")
    
    def _handle_practitioner_subscription_created(self, subscription: Dict[str, Any]) -> None:
        """Handle practitioner subscription creation."""
        metadata = subscription.get('metadata', {})
        practitioner_id = metadata.get('practitioner_id')
        tier_id = metadata.get('tier_id')
        
        if not practitioner_id or not tier_id:
            logger.error(f"Missing practitioner subscription metadata: {metadata}")
            return
        
        try:
            practitioner = Practitioner.objects.get(id=practitioner_id)
            tier = SubscriptionTier.objects.get(id=tier_id)
            
            # Check if subscription already exists
            existing = PractitionerSubscription.objects.filter(
                stripe_subscription_id=subscription['id']
            ).exists()
            
            if existing:
                logger.info(f"Subscription already exists for {subscription['id']}")
                return
            
            # Create subscription
            practitioner_subscription = PractitionerSubscription.objects.create(
                practitioner=practitioner,
                tier=tier,
                stripe_subscription_id=subscription['id'],
                stripe_customer_id=subscription['customer'],
                status='active',
                current_period_start=timezone.datetime.fromtimestamp(
                    subscription['current_period_start'], 
                    tz=timezone.utc
                ),
                current_period_end=timezone.datetime.fromtimestamp(
                    subscription['current_period_end'], 
                    tz=timezone.utc
                ),
                is_annual=metadata.get('is_annual', 'false').lower() == 'true'
            )
            
            logger.info(f"Created practitioner subscription {practitioner_subscription.id}")
            
        except (Practitioner.DoesNotExist, SubscriptionTier.DoesNotExist) as e:
            logger.error(f"Failed to create practitioner subscription: {e}")
    
    @transaction.atomic
    def handle_subscription_updated(self, subscription: Dict[str, Any]) -> None:
        """
        Handle subscription update from Stripe.
        
        Args:
            subscription: Stripe Subscription object
        """
        try:
            practitioner_subscription = PractitionerSubscription.objects.get(
                stripe_subscription_id=subscription['id']
            )
            
            # Update subscription details
            practitioner_subscription.status = subscription['status']
            practitioner_subscription.current_period_start = timezone.datetime.fromtimestamp(
                subscription['current_period_start'], 
                tz=timezone.utc
            )
            practitioner_subscription.current_period_end = timezone.datetime.fromtimestamp(
                subscription['current_period_end'], 
                tz=timezone.utc
            )
            
            # Handle status changes
            if subscription['status'] == 'canceled':
                practitioner_subscription.end_date = timezone.now()
            elif subscription['status'] == 'active' and practitioner_subscription.end_date:
                practitioner_subscription.end_date = None
            
            practitioner_subscription.save()
            
            logger.info(f"Updated subscription {practitioner_subscription.id}")
            
        except PractitionerSubscription.DoesNotExist:
            logger.error(f"Subscription not found: {subscription['id']}")
    
    @transaction.atomic
    def handle_subscription_deleted(self, subscription: Dict[str, Any]) -> None:
        """
        Handle subscription deletion from Stripe.
        
        Args:
            subscription: Stripe Subscription object
        """
        try:
            practitioner_subscription = PractitionerSubscription.objects.get(
                stripe_subscription_id=subscription['id']
            )
            
            practitioner_subscription.status = 'canceled'
            practitioner_subscription.end_date = timezone.now()
            practitioner_subscription.save()
            
            logger.info(f"Cancelled subscription {practitioner_subscription.id}")
            
        except PractitionerSubscription.DoesNotExist:
            logger.error(f"Subscription not found: {subscription['id']}")
    
    @transaction.atomic
    def handle_refund_created(self, charge: Dict[str, Any]) -> None:
        """
        Handle refund creation from Stripe.
        
        Args:
            charge: Stripe Charge object containing refund info
        """
        payment_intent_id = charge.get('payment_intent')
        refunded_amount = charge.get('amount_refunded', 0)
        
        if not payment_intent_id or refunded_amount <= 0:
            return
        
        try:
            # Find the order
            order = Order.objects.get(stripe_payment_intent_id=payment_intent_id)
            
            # Update order with refund info
            order.refunded_amount_cents = refunded_amount
            order.refunded_at = timezone.now()
            order.save()
            
            # Handle booking cancellation if full refund
            if refunded_amount >= order.total_amount_cents:
                # Find and cancel associated booking
                try:
                    booking = Booking.objects.get(order=order)
                    if booking.status not in ['cancelled', 'completed']:
                        booking.status = 'cancelled'
                        booking.cancellation_reason = 'Payment refunded'
                        booking.cancelled_at = timezone.now()
                        booking.save()
                        
                        # Refund credits if used
                        if order.credits_applied_cents > 0:
                            self.credit_service.refund_credits(
                                user=order.user,
                                amount_cents=order.credits_applied_cents,
                                booking=booking,
                                reason="Booking cancelled - payment refunded"
                            )
                        
                        # Reverse earnings if created
                        if hasattr(booking, 'earnings_transactions'):
                            self.earnings_service.reverse_earnings(booking)
                        
                except Booking.DoesNotExist:
                    logger.warning(f"No booking found for order {order.id}")
            
            logger.info(f"Processed refund for order {order.id}: ${refunded_amount/100:.2f}")
            
        except Order.DoesNotExist:
            logger.error(f"Order not found for payment intent {payment_intent_id}")
    
    def handle_connect_account_update(self, account: Dict[str, Any]) -> None:
        """
        Handle Stripe Connect account updates.
        
        Args:
            account: Stripe Account object
        """
        account_id = account['id']
        
        try:
            practitioner = Practitioner.objects.get(stripe_account_id=account_id)
            
            # Update verification status
            if account.get('charges_enabled'):
                practitioner.stripe_charges_enabled = True
                practitioner.stripe_payouts_enabled = account.get('payouts_enabled', False)
            else:
                practitioner.stripe_charges_enabled = False
                practitioner.stripe_payouts_enabled = False
            
            practitioner.save()
            
            logger.info(f"Updated Stripe Connect status for practitioner {practitioner.id}")
            
        except Practitioner.DoesNotExist:
            logger.error(f"Practitioner not found for Stripe account {account_id}")