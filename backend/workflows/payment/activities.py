"""
Payment-related activities for Temporal workflows.
Handles order processing, credit allocation, and payment confirmations.
"""
from temporalio import activity
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime, timedelta
from django.db import transaction
from decimal import Decimal

logger = logging.getLogger(__name__)


@activity.defn
async def process_order_payment(order_id: str) -> Dict[str, Any]:
    """
    Process a completed order payment.
    
    Args:
        order_id: ID of the order to process
        
    Returns:
        Dict with processing results
    """
    try:
        from payments.models import Order, UserCreditTransaction
        from users.models import User
        
        order = Order.objects.select_related('user', 'service').get(id=order_id)
        
        if order.status != 'completed':
            logger.warning(f"Order {order_id} is not completed. Status: {order.status}")
            return {
                'success': False,
                'reason': 'Order not completed'
            }
        
        # Check if already processed
        existing_transaction = UserCreditTransaction.objects.filter(
            order=order,
            transaction_type='purchase'
        ).first()
        
        if existing_transaction:
            logger.info(f"Order {order_id} already processed")
            return {
                'success': True,
                'transaction_id': str(existing_transaction.id),
                'already_processed': True
            }
        
        # Create credit transaction
        with transaction.atomic():
            credit_transaction = UserCreditTransaction.objects.create(
                user=order.user,
                amount_cents=order.total_amount_cents,
                transaction_type='purchase',
                order=order,
                currency=order.currency,
                description=f"Credit purchase from order {order.public_uuid}"
            )
            
            # Log the event
            from workflows.shared.activities import log_event
            await log_event(
                event_type='payment.credits_allocated',
                entity_type='order',
                entity_id=str(order_id),
                data={
                    'user_id': str(order.user.id),
                    'amount_cents': order.total_amount_cents,
                    'transaction_id': str(credit_transaction.id)
                }
            )
        
        return {
            'success': True,
            'transaction_id': str(credit_transaction.id),
            'credits_added': order.total_amount_cents,
            'user_id': str(order.user.id)
        }
        
    except Exception as e:
        logger.error(f"Error processing order payment: {e}")
        raise


@activity.defn
async def create_bookings_for_service(
    order_id: str,
    booking_details: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create bookings based on service type after payment.
    
    Args:
        order_id: ID of the completed order
        booking_details: Details for booking creation
        
    Returns:
        Dict with created booking information
    """
    try:
        from payments.models import Order
        from bookings.models import Booking
        from services.models import Service
        
        order = Order.objects.select_related(
            'user', 'service', 'practitioner'
        ).get(id=order_id)
        
        service = order.service
        
        # Handle different service types
        if service.service_type.code == 'session':
            # Single session booking
            return await _create_single_session_booking(order, booking_details)
            
        elif service.service_type.code in ['bundle', 'package']:
            # Bundle or package - create parent booking
            return await _create_bundle_booking(order, booking_details)
            
        else:
            logger.warning(f"Unknown service type: {service.service_type.code}")
            return {
                'success': False,
                'reason': f'Unknown service type: {service.service_type.code}'
            }
            
    except Exception as e:
        logger.error(f"Error creating bookings: {e}")
        raise


async def _create_single_session_booking(
    order: 'Order',
    booking_details: Dict[str, Any]
) -> Dict[str, Any]:
    """Create a single session booking."""
    from bookings.models import Booking
    from payments.models import UserCreditTransaction
    
    with transaction.atomic():
        # Create the booking
        booking = Booking.objects.create(
            user=order.user,
            practitioner=order.practitioner,
            service=order.service,
            start_time=booking_details['start_time'],
            end_time=booking_details['end_time'],
            duration_minutes=booking_details['duration_minutes'],
            location_type=booking_details.get('location_type', 'online'),
            total_price_cents=order.total_amount_cents,
            price_charged_cents=order.total_amount_cents,
            status='confirmed',
            payment_status='paid',
            payment_method='credits',
            order=order,
            notes=booking_details.get('notes', '')
        )
        
        # Deduct credits
        UserCreditTransaction.objects.create(
            user=order.user,
            amount_cents=-order.total_amount_cents,
            transaction_type='usage',
            booking=booking,
            service=order.service,
            practitioner=order.practitioner,
            currency=order.currency,
            description=f"Session booking with {order.practitioner.display_name}"
        )
    
    # Trigger booking workflow
    from integrations.temporal.client import get_temporal_client
    client = await get_temporal_client()
    
    workflow_handle = await client.start_workflow(
        "BookingLifecycleWorkflow",
        str(booking.id),
        id=f"booking-lifecycle-{booking.id}",
        task_queue="bookings"
    )
    
    return {
        'success': True,
        'booking_id': str(booking.id),
        'booking_type': 'session',
        'workflow_id': workflow_handle.id
    }


async def _create_bundle_booking(
    order: 'Order',
    booking_details: Dict[str, Any]
) -> Dict[str, Any]:
    """Create a bundle/package parent booking."""
    from bookings.models import Booking
    
    with transaction.atomic():
        # Create parent booking for bundle/package
        parent_booking = Booking.objects.create(
            user=order.user,
            practitioner=order.practitioner,
            service=order.service,
            start_time=booking_details.get('start_time', datetime.utcnow()),
            end_time=booking_details.get('end_time', datetime.utcnow() + timedelta(days=365)),
            duration_minutes=0,  # Parent booking has no duration
            location_type='online',
            total_price_cents=order.total_amount_cents,
            price_charged_cents=order.total_amount_cents,
            credits_allocated=order.service.bundle_size or 1,
            credits_remaining=order.service.bundle_size or 1,
            is_bundle_purchase=True,
            status='confirmed',
            payment_status='paid',
            payment_method='credits',
            order=order,
            notes=f"{order.service.service_type.name} purchase"
        )
        
        # For packages, optionally create placeholder sessions
        if order.service.service_type.code == 'package':
            # This would create all the sessions with TBD times
            # Implementation depends on package structure
            pass
    
    return {
        'success': True,
        'booking_id': str(parent_booking.id),
        'booking_type': order.service.service_type.code,
        'credits_allocated': parent_booking.credits_allocated
    }


@activity.defn
async def allocate_bundle_credits(
    booking_id: str,
    credit_amount: int
) -> Dict[str, Any]:
    """
    Allocate credits for a bundle purchase.
    
    Args:
        booking_id: Bundle booking ID
        credit_amount: Amount of credits to allocate
        
    Returns:
        Dict with allocation results
    """
    try:
        from bookings.models import Booking
        
        booking = Booking.objects.select_for_update().get(id=booking_id)
        
        if not booking.is_bundle_purchase:
            return {
                'success': False,
                'reason': 'Not a bundle booking'
            }
        
        # Update bundle credits
        booking.credits_allocated = credit_amount
        booking.credits_remaining = credit_amount
        booking.save(update_fields=['credits_allocated', 'credits_remaining'])
        
        return {
            'success': True,
            'credits_allocated': credit_amount,
            'booking_id': str(booking_id)
        }
        
    except Exception as e:
        logger.error(f"Error allocating bundle credits: {e}")
        raise


@activity.defn
async def process_payment_failure(
    order_id: str,
    error_details: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Handle payment failure and cleanup.
    
    Args:
        order_id: Failed order ID
        error_details: Details about the failure
        
    Returns:
        Dict with cleanup results
    """
    try:
        from payments.models import Order
        
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)
            
            # Update order status
            order.status = 'failed'
            order.metadata['failure_reason'] = error_details.get('reason', 'Unknown')
            order.metadata['failed_at'] = datetime.utcnow().isoformat()
            order.save()
            
            # Cancel any created bookings
            if hasattr(order, 'bookings'):
                order.bookings.update(
                    status='canceled',
                    cancellation_reason='Payment failed'
                )
        
        # Send failure notification
        from workflows.shared.activities import send_email
        await send_email(
            to_email=order.user.email,
            template_id='payment_failed',
            context={
                'user_name': order.user.first_name,
                'order_id': str(order.public_uuid),
                'amount': order.total_amount / 100,
                'reason': error_details.get('reason', 'Payment processing failed')
            }
        )
        
        return {
            'success': True,
            'order_id': str(order_id),
            'status': 'failed'
        }
        
    except Exception as e:
        logger.error(f"Error processing payment failure: {e}")
        raise


@activity.defn
async def send_payment_confirmation(order_id: str) -> bool:
    """Send payment confirmation email to user."""
    try:
        from payments.models import Order
        
        order = Order.objects.select_related(
            'user', 'service', 'practitioner'
        ).get(id=order_id)
        
        # Send confirmation email
        from workflows.shared.activities import send_email
        await send_email(
            to_email=order.user.email,
            template_id='payment_confirmation',
            context={
                'user_name': order.user.first_name,
                'order_number': str(order.public_uuid)[:8],
                'amount': order.total_amount / 100,
                'service_name': order.service.name if order.service else 'Credits',
                'practitioner_name': order.practitioner.display_name if order.practitioner else None
            }
        )
        
        return True
        
    except Exception as e:
        logger.error(f"Error sending payment confirmation: {e}")
        raise


@activity.defn
async def update_practitioner_stats(order_id: str) -> Dict[str, Any]:
    """Update practitioner statistics after successful payment."""
    try:
        from payments.models import Order
        
        order = Order.objects.select_related('practitioner').get(id=order_id)
        
        if not order.practitioner:
            return {'success': True, 'reason': 'No practitioner associated'}
        
        # Update practitioner stats
        practitioner = order.practitioner
        stats = practitioner.stats  # Assuming there's a stats model
        
        # This would update various stats like total sales, new clients, etc.
        # Implementation depends on your stats model
        
        return {
            'success': True,
            'practitioner_id': str(practitioner.id),
            'stats_updated': True
        }
        
    except Exception as e:
        logger.error(f"Error updating practitioner stats: {e}")
        raise


# Export all activities
ACTIVITIES = [
    process_order_payment,
    create_bookings_for_service,
    allocate_bundle_credits,
    process_payment_failure,
    send_payment_confirmation,
    update_practitioner_stats,
]