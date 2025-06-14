"""
Payment-related workflows for the Estuary platform.
Handles post-payment processing, booking creation, and credit allocation.
"""
from temporalio import workflow
from temporalio.common import RetryPolicy
from datetime import timedelta, datetime
from typing import Dict, Any, Optional
import logging

with workflow.unsafe.imports_passed_through():
    from payments.models import Order
    from .activities import (
        process_order_payment,
        create_bookings_for_service,
        allocate_bundle_credits,
        process_payment_failure,
        send_payment_confirmation,
        update_practitioner_stats,
        ACTIVITIES as PAYMENT_ACTIVITIES
    )

logger = logging.getLogger(__name__)


@workflow.defn
class OrderProcessingWorkflow:
    """
    Processes a completed order after successful payment.
    
    This workflow handles:
    1. Credit allocation to user account
    2. Booking creation based on service type
    3. Notifications to user and practitioner
    4. Stats updates
    """
    
    def __init__(self):
        self.order_id: Optional[str] = None
        self.order_data: Optional[Dict[str, Any]] = None
    
    @workflow.run
    async def run(
        self,
        order_id: str,
        booking_details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute the order processing workflow.
        
        Args:
            order_id: ID of the order to process
            booking_details: Optional booking details for service bookings
            
        Returns:
            Dict with processing results
        """
        self.order_id = order_id
        workflow.logger.info(f"Starting OrderProcessingWorkflow for order {order_id}")
        
        try:
            # Step 1: Process payment and allocate credits
            payment_result = await workflow.execute_activity(
                process_order_payment,
                order_id,
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=RetryPolicy(maximum_attempts=3)
            )
            
            if not payment_result['success']:
                return {
                    'status': 'failed',
                    'reason': payment_result.get('reason', 'Payment processing failed')
                }
            
            # Step 2: Send payment confirmation
            await workflow.execute_activity(
                send_payment_confirmation,
                order_id,
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=RetryPolicy(maximum_attempts=3)
            )
            
            # Step 3: Create bookings if service-based order
            booking_result = None
            if booking_details:
                booking_result = await workflow.execute_activity(
                    create_bookings_for_service,
                    order_id,
                    booking_details,
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=RetryPolicy(maximum_attempts=3)
                )
            
            # Step 4: Update practitioner statistics
            await workflow.execute_activity(
                update_practitioner_stats,
                order_id,
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=RetryPolicy(maximum_attempts=3)
            )
            
            return {
                'status': 'completed',
                'order_id': order_id,
                'payment_result': payment_result,
                'booking_result': booking_result,
                'completed_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            workflow.logger.error(f"Error in OrderProcessingWorkflow: {e}")
            
            # Attempt to handle failure
            await workflow.execute_activity(
                process_payment_failure,
                order_id,
                {'reason': str(e)},
                start_to_close_timeout=timedelta(minutes=5)
            )
            
            return {
                'status': 'failed',
                'order_id': order_id,
                'error': str(e)
            }


@workflow.defn
class BundleAllocationWorkflow:
    """
    Handles bundle credit allocation and usage tracking.
    
    This workflow manages:
    1. Initial credit allocation for bundle purchases
    2. Credit deduction when sessions are booked
    3. Expiration handling
    """
    
    @workflow.run
    async def run(
        self,
        bundle_booking_id: str,
        action: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute bundle allocation workflow.
        
        Args:
            bundle_booking_id: ID of the bundle booking
            action: Action to perform ('allocate', 'deduct', 'check_expiry')
            params: Additional parameters for the action
            
        Returns:
            Dict with action results
        """
        workflow.logger.info(f"BundleAllocationWorkflow: {action} for {bundle_booking_id}")
        
        if action == 'allocate':
            # Allocate initial credits
            credit_amount = params.get('credit_amount', 0)
            result = await workflow.execute_activity(
                allocate_bundle_credits,
                bundle_booking_id,
                credit_amount,
                start_to_close_timeout=timedelta(minutes=2)
            )
            
            return result
            
        elif action == 'check_expiry':
            # Check and handle expiration
            # This would be called on a schedule
            pass
            
        return {
            'status': 'completed',
            'action': action,
            'bundle_booking_id': bundle_booking_id
        }


@workflow.defn
class RefundWorkflow:
    """
    Handles refund processing for orders.
    
    Steps:
    1. Validate refund eligibility
    2. Process Stripe refund
    3. Reverse credit transactions
    4. Cancel associated bookings
    5. Update earnings if applicable
    6. Send notifications
    """
    
    @workflow.run
    async def run(
        self,
        order_id: str,
        refund_amount_cents: Optional[int] = None,
        reason: str = "Customer requested"
    ) -> Dict[str, Any]:
        """
        Execute refund workflow.
        
        Args:
            order_id: Order to refund
            refund_amount_cents: Amount to refund (None for full refund)
            reason: Refund reason
            
        Returns:
            Dict with refund results
        """
        workflow.logger.info(f"Starting RefundWorkflow for order {order_id}")
        
        # TODO: Implement refund logic
        # This would involve:
        # 1. Validating the order can be refunded
        # 2. Processing Stripe refund
        # 3. Creating negative credit transactions
        # 4. Canceling bookings
        # 5. Adjusting practitioner earnings
        
        return {
            'status': 'completed',
            'order_id': order_id,
            'refund_amount_cents': refund_amount_cents,
            'reason': reason
        }


@workflow.defn
class SubscriptionPaymentWorkflow:
    """
    Handles recurring subscription payments.
    
    This workflow:
    1. Processes subscription renewal
    2. Updates subscription status
    3. Handles payment failures
    4. Sends renewal notifications
    """
    
    @workflow.run
    async def run(
        self,
        subscription_id: str,
        payment_intent_id: str
    ) -> Dict[str, Any]:
        """
        Process subscription payment.
        
        Args:
            subscription_id: Subscription ID
            payment_intent_id: Stripe payment intent ID
            
        Returns:
            Dict with payment results
        """
        workflow.logger.info(f"Processing subscription payment for {subscription_id}")
        
        # TODO: Implement subscription payment logic
        
        return {
            'status': 'completed',
            'subscription_id': subscription_id,
            'payment_intent_id': payment_intent_id
        }


# Export all workflows
WORKFLOWS = [
    OrderProcessingWorkflow,
    BundleAllocationWorkflow,
    RefundWorkflow,
    SubscriptionPaymentWorkflow,
]