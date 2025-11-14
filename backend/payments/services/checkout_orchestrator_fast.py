"""
Fast checkout orchestrator that minimizes synchronous operations.
"""
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass
from django.db import transaction
from django.shortcuts import get_object_or_404

from payments.models import PaymentMethod, UserCreditBalance
from payments.services.payment_service import PaymentService
from payments.services.credit_service import CreditService
from payments.services.earnings_service import EarningsService
from bookings.services.booking_service_fast import FastBookingService
from bookings.models import Booking
from services.models import Service
from users.models import User

logger = logging.getLogger(__name__)


@dataclass
class CheckoutResult:
    """Result of a checkout operation."""
    success: bool
    booking: Optional[Any] = None
    order: Optional[Any] = None
    payment_intent: Optional[Any] = None
    error: Optional[str] = None
    requires_action: bool = False
    client_secret: Optional[str] = None


class FastCheckoutOrchestrator:
    """Optimized checkout flow that defers non-critical operations."""
    
    def __init__(self):
        self.payment_service = PaymentService()
        self.credit_service = CreditService()
        self.earnings_service = EarningsService()
        self.booking_service = FastBookingService()
    
    @transaction.atomic
    def process_booking_payment_fast(
        self,
        user: User,
        service_id: int,
        payment_method_id: int,
        booking_data: Dict[str, Any]
    ) -> CheckoutResult:
        """
        Process a booking payment quickly by deferring non-critical operations.
        UPDATED: Handles Order FK, package/bundle bookings, progressive earnings.

        Critical operations (synchronous):
        1. Validate and calculate pricing
        2. Create order record
        3. Process Stripe payment
        4. Create booking record
        5. Apply credit deductions
        6. Link order to booking

        Non-critical operations (deferred to background):
        - Room creation
        - Email notifications
        - Reminder scheduling
        - Earnings calculation (moved to background)

        Note: Package/bundle earnings are created when individual sessions
        are completed, not at purchase time.

        Args:
            user: User making the booking
            service_id: ID of service to book
            payment_method_id: ID of payment method to use
            booking_data: Booking details (times, notes, etc)

        Returns:
            CheckoutResult with booking and payment details
        """
        try:
            # 1. Get service and payment method
            service = get_object_or_404(Service, id=service_id)
            payment_method = get_object_or_404(PaymentMethod, id=payment_method_id, user=user)
            
            # 2. Calculate pricing
            service_price_cents = int(service.price * 100)
            user_credit_balance = self.credit_service.get_user_balance(user)
            
            credits_to_apply_cents, amount_to_charge_cents = self.payment_service.calculate_payment_amounts(
                service_price_cents=service_price_cents,
                apply_credits=booking_data.get('apply_credits', True),
                user_credit_balance_cents=user_credit_balance
            )
            
            # 3. Create order
            order = self.payment_service.create_order(
                user=user,
                service=service,
                payment_method=payment_method,
                service_price_cents=service_price_cents,
                credits_to_apply_cents=credits_to_apply_cents,
                amount_to_charge_cents=amount_to_charge_cents,
                special_requests=booking_data.get('special_requests')
            )
            
            # 4. Process payment (if needed)
            payment_result = self.payment_service.process_stripe_payment(
                user=user,
                payment_method=payment_method,
                amount_cents=amount_to_charge_cents,
                order=order,
                service=service
            )
            
            # Check if payment requires action
            if payment_result['status'] == 'requires_action':
                return CheckoutResult(
                    success=False,
                    order=order,
                    payment_intent=payment_result['payment_intent'],
                    requires_action=True,
                    client_secret=payment_result['client_secret']
                )
            
            # Payment succeeded or no payment needed
            # 5. Create credit transactions (critical for balance accuracy)
            self.credit_service.create_booking_credit_transactions(
                user=user,
                service=service,
                order=order
            )
            
            # 6. Create booking using fast service
            payment_data = {
                'price_charged_cents': service_price_cents,
                'credits_applied_cents': credits_to_apply_cents,
                'amount_charged_cents': amount_to_charge_cents,
                'payment_intent_id': payment_result.get('payment_intent', {}).id if payment_result.get('payment_intent') else None,
                'order': order  # Pass order so factory can link all bookings
            }

            booking = self.booking_service.create_booking_fast(
                user=user,
                service=service,
                booking_data=booking_data,
                payment_data=payment_data
            )

            # 7. Link order to booking (PRIMARY financial relationship)
            if booking:
                booking.order = order

                # Link credit usage transaction if credits were applied
                if credits_to_apply_cents > 0:
                    usage_transaction = order.user_credit_transactions.filter(
                        transaction_type='usage'
                    ).first()
                    if usage_transaction:
                        booking.credit_usage_transaction = usage_transaction
                        usage_transaction.booking = booking
                        usage_transaction.save()

                booking.save()

                # For package/bundle bookings, ensure ALL session bookings in order are linked
                # (Factory creates multiple session bookings, all need order FK)
                service_type_code = service.service_type.code if service.service_type else None
                if service_type_code in ['package', 'bundle']:
                    # Get all bookings created for this order
                    order_bookings = Booking.objects.filter(
                        order=order,
                        user=user,
                        created_at__gte=order.created_at
                    )
                    # Ensure they all have the order FK (should already be set by factory)
                    count = order_bookings.count()
                    if count > 1:
                        logger.info(
                            f"Package/bundle order {order.id} has {count} session bookings"
                        )

            # 8. Queue earnings calculation
            # SKIP for package/bundle bookings - earnings created when sessions are completed
            # Check the ORDER type, not service type (since booking.service might be the session service)
            is_package_or_bundle_order = (
                booking.order and
                booking.order.order_type in ['package', 'bundle']
            )

            should_create_earnings = (
                service.primary_practitioner and
                not is_package_or_bundle_order and
                booking.status not in ['draft']  # Skip draft bookings
            )

            if should_create_earnings:
                from payments.tasks import create_booking_earnings_async

                def queue_earnings_task():
                    create_booking_earnings_async.delay(
                        practitioner_id=service.primary_practitioner.id,
                        booking_id=booking.id,
                        service_id=service.id,
                        gross_amount_cents=service_price_cents
                    )

                transaction.on_commit(queue_earnings_task)
            elif is_package_or_bundle_order:
                logger.info(
                    f"Skipping earnings for package/bundle booking {booking.id} (order {order.id}). "
                    f"Earnings will be created when sessions are scheduled and completed."
                )
            
            logger.info(f"Fast checkout completed for booking {booking.id}")
            
            return CheckoutResult(
                success=True,
                booking=booking,
                order=order,
                payment_intent=payment_result.get('payment_intent')
            )
            
        except Exception as e:
            logger.error(f"Fast checkout failed: {str(e)}")
            raise
    
    @transaction.atomic
    def process_credit_purchase(
        self,
        user: User,
        amount: float,
        payment_method_id: int
    ) -> CheckoutResult:
        """
        Process a credit purchase (already optimized).
        
        Args:
            user: User purchasing credits
            amount: Amount of credits to purchase (in dollars)
            payment_method_id: Payment method to use
            
        Returns:
            CheckoutResult with order details
        """
        try:
            payment_method = get_object_or_404(PaymentMethod, id=payment_method_id, user=user)
            amount_cents = int(amount * 100)
            
            # Create order for credit purchase
            order = self.payment_service.create_order(
                user=user,
                service=None,  # No service for credit purchase
                payment_method=payment_method,
                service_price_cents=amount_cents,
                credits_to_apply_cents=0,  # Can't use credits to buy credits
                amount_to_charge_cents=amount_cents,
                special_requests=None
            )
            order.order_type = 'credit'
            order.save()
            
            # Process payment
            payment_result = self.payment_service.process_stripe_payment(
                user=user,
                payment_method=payment_method,
                amount_cents=amount_cents,
                order=order,
                service=None
            )
            
            if payment_result['status'] == 'requires_action':
                return CheckoutResult(
                    success=False,
                    order=order,
                    payment_intent=payment_result['payment_intent'],
                    requires_action=True,
                    client_secret=payment_result['client_secret']
                )
            
            # Add credits to user account
            self.credit_service.purchase_credits(
                user=user,
                amount_cents=amount_cents,
                order=order
            )
            
            return CheckoutResult(
                success=True,
                order=order,
                payment_intent=payment_result.get('payment_intent')
            )
            
        except Exception as e:
            logger.error(f"Credit purchase failed: {str(e)}")
            raise