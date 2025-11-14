"""
Business logic for Stripe checkout operations.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal
from datetime import datetime, timezone as dt_timezone
from uuid import UUID

from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings

from bookings.models import Booking, BookingFactory
from services.models import Service
from practitioners.models import Practitioner
from payments.models import (
    Order, UserCreditBalance, UserCreditTransaction,
    PaymentMethod as PaymentMethodModel
)
from integrations.stripe.client import StripeClient
from integrations.temporal.client import get_temporal_client
import stripe

from .schemas import CheckoutType, CheckoutItemBase

User = get_user_model()
logger = logging.getLogger(__name__)


class CheckoutService:
    """Service for handling checkout operations."""
    
    def __init__(self, user: User):
        self.user = user
        self.stripe_client = StripeClient
        
    async def create_checkout_session(
        self,
        checkout_type: CheckoutType,
        items: List[Dict[str, Any]],
        save_payment_method: bool = False,
        use_credits: bool = False,
        credits_to_apply: Optional[int] = None,
        coupon_code: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a checkout session for the given items.
        
        Returns:
            Dict containing checkout session details
        """
        try:
            # Calculate pricing
            pricing = await self.calculate_pricing(
                checkout_type=checkout_type,
                items=items,
                use_credits=use_credits,
                credits_to_apply=credits_to_apply,
                coupon_code=coupon_code
            )
            
            # Create order
            with transaction.atomic():
                order = await self._create_order(
                    checkout_type=checkout_type,
                    items=items,
                    pricing=pricing,
                    metadata=metadata
                )
                
                # Create bookings in draft status
                bookings = await self._create_draft_bookings(
                    order=order,
                    checkout_type=checkout_type,
                    items=items
                )
                
                # If total is 0 (fully covered by credits), complete immediately
                if pricing['total_cents'] == 0:
                    await self._complete_zero_amount_checkout(order, bookings)
                    return {
                        'checkout_session_id': None,
                        'payment_intent_id': None,
                        'client_secret': None,
                        'order_id': order.public_uuid,
                        'subtotal_cents': pricing['subtotal_cents'],
                        'tax_cents': pricing['tax_cents'],
                        'credits_applied_cents': pricing['credits_applied_cents'],
                        'total_cents': 0,
                        'requires_payment': False,
                        'redirect_url': None
                    }
                
                # Create Stripe payment intent
                payment_intent = await self._create_payment_intent(
                    order=order,
                    amount_cents=pricing['total_cents'],
                    save_payment_method=save_payment_method,
                    metadata={
                        'order_id': str(order.public_uuid),
                        'user_id': str(self.user.id),
                        'checkout_type': checkout_type.value,
                        **(metadata or {})
                    }
                )
                
                # Update order with payment intent
                order.stripe_payment_intent_id = payment_intent['id']
                order.save(update_fields=['stripe_payment_intent_id'])
                
                return {
                    'checkout_session_id': None,  # Using payment intent flow
                    'payment_intent_id': payment_intent['id'],
                    'client_secret': payment_intent['client_secret'],
                    'order_id': order.public_uuid,
                    'subtotal_cents': pricing['subtotal_cents'],
                    'tax_cents': pricing['tax_cents'],
                    'credits_applied_cents': pricing['credits_applied_cents'],
                    'total_cents': pricing['total_cents'],
                    'requires_payment': True,
                    'redirect_url': None
                }
                
        except Exception as e:
            logger.exception(f"Error creating checkout session: {str(e)}")
            raise
            
    async def calculate_pricing(
        self,
        checkout_type: CheckoutType,
        items: List[Dict[str, Any]],
        use_credits: bool = False,
        credits_to_apply: Optional[int] = None,
        coupon_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate pricing for checkout items.
        
        Returns:
            Dict with pricing details in cents
        """
        subtotal_cents = 0
        item_details = []
        
        # Calculate subtotal for each item
        for item in items:
            service = await self._get_service(item['service_id'])
            
            if checkout_type == CheckoutType.SINGLE_SESSION:
                item_price_cents = service.price_cents * item.get('quantity', 1)
                item_details.append({
                    'service_id': service.id,
                    'service_name': service.name,
                    'quantity': item.get('quantity', 1),
                    'unit_price_cents': service.price_cents,
                    'total_cents': item_price_cents
                })
            elif checkout_type == CheckoutType.BUNDLE:
                # Bundle price includes all sessions
                item_price_cents = service.price_cents
                item_details.append({
                    'service_id': service.id,
                    'service_name': service.name,
                    'sessions_included': service.total_sessions,
                    'price_per_session_cents': service.price_per_session_cents,
                    'total_cents': item_price_cents
                })
            elif checkout_type == CheckoutType.PACKAGE:
                # Package has its own price or sum of child services
                item_price_cents = service.get_total_package_price_cents()
                item_details.append({
                    'service_id': service.id,
                    'service_name': service.name,
                    'package_contents': await self._get_package_contents(service),
                    'total_cents': item_price_cents
                })
                
            subtotal_cents += item_price_cents
            
        # Calculate tax (simplified - you may want to integrate with a tax service)
        tax_cents = int(subtotal_cents * Decimal('0.0875'))  # 8.75% tax rate
        
        # Apply coupon if provided
        discount_cents = 0
        if coupon_code:
            discount_cents = await self._calculate_coupon_discount(
                coupon_code, subtotal_cents
            )
            
        # Calculate credits to apply
        credits_available_cents = await self._get_user_credits()
        credits_applied_cents = 0
        
        if use_credits:
            # After discounts, before final total
            amount_after_discount = subtotal_cents + tax_cents - discount_cents
            if credits_to_apply is not None:
                # Use specified amount up to available
                credits_applied_cents = min(
                    credits_to_apply,
                    credits_available_cents,
                    amount_after_discount
                )
            else:
                # Use all available credits up to total
                credits_applied_cents = min(
                    credits_available_cents,
                    amount_after_discount
                )
                
        # Calculate final total
        total_cents = max(
            0,
            subtotal_cents + tax_cents - discount_cents - credits_applied_cents
        )
        
        return {
            'subtotal_cents': subtotal_cents,
            'tax_cents': tax_cents,
            'credits_available_cents': credits_available_cents,
            'credits_applied_cents': credits_applied_cents,
            'discount_cents': discount_cents,
            'total_cents': total_cents,
            'items': item_details
        }
        
    async def confirm_payment(
        self,
        payment_intent_id: str,
        payment_method_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Confirm a payment and complete the checkout process.
        
        Returns:
            Dict with confirmation details
        """
        try:
            # Retrieve payment intent
            payment_intent = self.stripe_client.retrieve_payment_intent(payment_intent_id)
            
            # Get associated order
            order = await self._get_order_by_payment_intent(payment_intent_id)
            if not order:
                raise ValueError("Order not found for payment intent")
                
            # Verify order belongs to user
            if order.user != self.user:
                raise ValueError("Unauthorized access to order")
                
            # Check if already paid
            if order.status == 'completed':
                bookings = list(order.bookings.all())
                return {
                    'status': 'succeeded',
                    'order_id': order.public_uuid,
                    'booking_ids': [b.id for b in bookings],
                    'requires_action': False,
                    'next_action': None
                }
                
            # Confirm payment if needed
            if payment_intent['status'] == 'requires_confirmation':
                if payment_method_id:
                    payment_intent = stripe.PaymentIntent.confirm(
                        payment_intent_id,
                        payment_method=payment_method_id
                    )
                else:
                    payment_intent = stripe.PaymentIntent.confirm(payment_intent_id)
                    
            # Handle different payment states
            if payment_intent['status'] == 'succeeded':
                # Complete the order
                await self._complete_order(order, payment_intent)
                bookings = list(order.bookings.all())
                
                return {
                    'status': 'succeeded',
                    'order_id': order.public_uuid,
                    'booking_ids': [b.id for b in bookings],
                    'requires_action': False,
                    'next_action': None
                }
            elif payment_intent['status'] == 'requires_action':
                return {
                    'status': 'requires_action',
                    'order_id': order.public_uuid,
                    'booking_ids': [],
                    'requires_action': True,
                    'next_action': payment_intent.get('next_action')
                }
            else:
                return {
                    'status': payment_intent['status'],
                    'order_id': order.public_uuid,
                    'booking_ids': [],
                    'requires_action': False,
                    'next_action': None
                }
                
        except Exception as e:
            logger.exception(f"Error confirming payment: {str(e)}")
            raise
            
    async def get_checkout_status(
        self,
        checkout_session_id: Optional[str] = None,
        payment_intent_id: Optional[str] = None,
        order_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Get the status of a checkout session."""
        # Get order
        if order_id:
            order = await self._get_order_by_id(order_id)
        elif payment_intent_id:
            order = await self._get_order_by_payment_intent(payment_intent_id)
        else:
            raise ValueError("No valid identifier provided")
            
        if not order or order.user != self.user:
            raise ValueError("Order not found")
            
        bookings = list(order.bookings.all())
        
        return {
            'order_id': order.public_uuid,
            'status': order.status,
            'payment_status': self._get_payment_status(order),
            'booking_ids': [b.id for b in bookings],
            'created_at': order.created_at,
            'completed_at': order.updated_at if order.status == 'completed' else None
        }
        
    # Helper methods
    async def _get_service(self, service_id: int) -> Service:
        """Get service by ID."""
        try:
            return Service.objects.get(id=service_id, is_active=True)
        except Service.DoesNotExist:
            raise ValueError(f"Service {service_id} not found")
            
    async def _get_user_credits(self) -> int:
        """Get user's available credits in cents."""
        try:
            balance = UserCreditBalance.objects.get(user=self.user)
            return balance.balance_cents
        except UserCreditBalance.DoesNotExist:
            return 0
            
    async def _calculate_coupon_discount(
        self, 
        coupon_code: str, 
        subtotal_cents: int
    ) -> int:
        """Calculate discount for a coupon code."""
        # TODO: Implement coupon logic
        # For now, return 0
        return 0
        
    async def _get_package_contents(self, service: Service) -> List[Dict[str, Any]]:
        """Get package contents details."""
        contents = []
        for rel in service.child_relationships.all():
            if rel.child_service:
                contents.append({
                    'service_id': rel.child_service.id,
                    'service_name': rel.child_service.name,
                    'quantity': rel.quantity,
                    'price_cents': rel.child_service.price_cents
                })
        return contents
        
    async def _create_order(
        self,
        checkout_type: CheckoutType,
        items: List[Dict[str, Any]],
        pricing: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Order:
        """Create an order record."""
        # Determine order type
        order_type_map = {
            CheckoutType.SINGLE_SESSION: 'direct',
            CheckoutType.BUNDLE: 'credit',
            CheckoutType.PACKAGE: 'package'
        }
        
        # Get first service for order (simplified)
        first_item = items[0]
        service = await self._get_service(first_item['service_id'])
        practitioner = Practitioner.objects.get(id=first_item['practitioner_id'])
        
        order = Order.objects.create(
            user=self.user,
            service=service,
            practitioner=practitioner,
            order_type=order_type_map[checkout_type],
            subtotal_amount_cents=pricing['subtotal_cents'],
            tax_amount_cents=pricing['tax_cents'],
            credits_applied_cents=pricing['credits_applied_cents'],
            total_amount_cents=pricing['total_cents'],
            status='pending',
            metadata={
                'checkout_type': checkout_type.value,
                'items': items,
                **(metadata or {})
            }
        )
        
        return order
        
    async def _create_draft_bookings(
        self,
        order: Order,
        checkout_type: CheckoutType,
        items: List[Dict[str, Any]]
    ) -> List[Booking]:
        """Create draft bookings for the order."""
        bookings = []
        
        for item in items:
            service = await self._get_service(item['service_id'])
            practitioner = Practitioner.objects.get(id=item['practitioner_id'])
            
            if checkout_type == CheckoutType.SINGLE_SESSION:
                # Create individual session booking
                booking = BookingFactory.create_individual_booking(
                    user=self.user,
                    service=service,
                    practitioner=practitioner,
                    start_time=item['start_time'],
                    end_time=item['end_time'],
                    status='draft',
                    payment_status='unpaid'
                )
                bookings.append(booking)
                
            elif checkout_type == CheckoutType.BUNDLE:
                # Create bundle purchase
                booking = BookingFactory.create_bundle_booking(
                    user=self.user,
                    bundle_service=service,
                    status='draft',
                    payment_status='unpaid'
                )
                bookings.append(booking)
                
            elif checkout_type == CheckoutType.PACKAGE:
                # Create package booking with child bookings
                booking = BookingFactory.create_package_booking(
                    user=self.user,
                    package_service=service,
                    status='draft',
                    payment_status='unpaid'
                )
                bookings.append(booking)
                
        return bookings
        
    async def _create_payment_intent(
        self,
        order: Order,
        amount_cents: int,
        save_payment_method: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Stripe payment intent."""
        # Get or create Stripe customer
        stripe_customer_id = await self._get_or_create_stripe_customer()
        
        # Create payment intent
        intent_params = {
            'amount': amount_cents,
            'currency': 'usd',
            'customer': stripe_customer_id,
            'metadata': metadata or {},
            'automatic_payment_methods': {
                'enabled': True,
            }
        }
        
        if save_payment_method:
            intent_params['setup_future_usage'] = 'off_session'
            
        return self.stripe_client.create_payment_intent(**intent_params)
        
    async def _get_or_create_stripe_customer(self) -> str:
        """Get or create a Stripe customer for the user."""
        if hasattr(self.user, 'profile') and self.user.profile.stripe_customer_id:
            return self.user.profile.stripe_customer_id
            
        # Create new customer
        customer = self.stripe_client.create_customer(
            self.user,
            metadata={'user_id': str(self.user.id)}
        )
        
        # Save customer ID
        if hasattr(self.user, 'profile'):
            self.user.profile.stripe_customer_id = customer['id']
            self.user.profile.save(update_fields=['stripe_customer_id'])
            
        return customer['id']
        
    async def _complete_zero_amount_checkout(
        self,
        order: Order,
        bookings: List[Booking]
    ) -> None:
        """Complete a checkout that requires no payment."""
        with transaction.atomic():
            # Deduct credits if used
            if order.credits_applied_cents > 0:
                UserCreditTransaction.objects.create(
                    user=self.user,
                    amount_cents=-order.credits_applied_cents,
                    transaction_type='usage',
                    order=order,
                    description=f"Credits used for order {order.public_uuid}"
                )
                
            # Update order status
            order.status = 'completed'
            order.payment_method = 'credits'
            order.save(update_fields=['status', 'payment_method'])
            
            # Confirm bookings and trigger workflows
            for booking in bookings:
                booking.status = 'confirmed'
                booking.payment_status = 'paid'
                booking.save(update_fields=['status', 'payment_status'])
                
                # Trigger booking workflow
                await self._trigger_booking_workflow(booking)
                
    async def _complete_order(
        self,
        order: Order,
        payment_intent: Dict[str, Any]
    ) -> None:
        """Complete an order after successful payment."""
        with transaction.atomic():
            # Update order
            order.status = 'completed'
            order.stripe_payment_method_id = payment_intent.get('payment_method')
            order.save(update_fields=['status', 'stripe_payment_method_id'])
            
            # Deduct credits if used
            if order.credits_applied_cents > 0:
                UserCreditTransaction.objects.create(
                    user=self.user,
                    amount_cents=-order.credits_applied_cents,
                    transaction_type='usage',
                    order=order,
                    description=f"Credits used for order {order.public_uuid}"
                )
                
            # Process bookings
            bookings = list(order.bookings.all())
            for booking in bookings:
                booking.status = 'confirmed'
                booking.payment_status = 'paid'

                # Link credit usage transaction if credits were applied
                if order.credits_applied_cents > 0:
                    usage_txn = order.user_credit_transactions.filter(
                        transaction_type='usage'
                    ).first()
                    if usage_txn:
                        booking.credit_usage_transaction = usage_txn
                        booking.save(update_fields=['status', 'payment_status', 'credit_usage_transaction'])
                    else:
                        booking.save(update_fields=['status', 'payment_status'])
                else:
                    booking.save(update_fields=['status', 'payment_status'])
                
                # For bundles, create credit balance
                if booking.is_bundle_purchase:
                    await self._create_bundle_credits(booking)
                    
                # Trigger booking workflow
                await self._trigger_booking_workflow(booking)
                
    async def _create_bundle_credits(self, booking: Booking) -> None:
        """Create credit balance for bundle purchase."""
        if not booking.service or not booking.service.is_bundle:
            return
            
        # Calculate total credit value
        credit_value_cents = (
            booking.service.price_per_session_cents * 
            booking.service.total_sessions
        )
        
        # Create credit transaction
        UserCreditTransaction.objects.create(
            user=self.user,
            amount_cents=credit_value_cents,
            transaction_type='purchase',
            service=booking.service,
            booking=booking,
            description=f"Bundle purchase: {booking.service.name}",
            expires_at=timezone.now() + timezone.timedelta(
                days=booking.service.validity_days
            )
        )
        
    async def _trigger_booking_workflow(self, booking: Booking) -> None:
        """Trigger Temporal workflow for booking."""
        try:
            temporal_client = await get_temporal_client()
            
            # Start booking lifecycle workflow
            await temporal_client.start_workflow(
                "BookingLifecycleWorkflow",
                booking.id,
                id=f"booking-lifecycle-{booking.id}",
                task_queue="bookings",
            )
        except Exception as e:
            logger.error(f"Failed to trigger workflow for booking {booking.id}: {str(e)}")
            # Don't fail the checkout if workflow fails
            
    async def _get_order_by_payment_intent(self, payment_intent_id: str) -> Optional[Order]:
        """Get order by payment intent ID."""
        try:
            return Order.objects.get(stripe_payment_intent_id=payment_intent_id)
        except Order.DoesNotExist:
            return None
            
    async def _get_order_by_id(self, order_id: UUID) -> Optional[Order]:
        """Get order by ID."""
        try:
            return Order.objects.get(public_uuid=order_id)
        except Order.DoesNotExist:
            return None
            
    def _get_payment_status(self, order: Order) -> str:
        """Get payment status for order."""
        if order.status == 'completed':
            return 'paid'
        elif order.status == 'failed':
            return 'failed'
        elif order.stripe_payment_intent_id:
            # Check Stripe status
            try:
                intent = self.stripe_client.retrieve_payment_intent(
                    order.stripe_payment_intent_id
                )
                return intent['status']
            except:
                pass
        return 'pending'