from celery import shared_task
from django.utils import timezone
from django.db import models
from django.db.models import Q, F, Sum
from datetime import timedelta
import logging

from .models import EarningsTransaction, PractitionerEarnings

logger = logging.getLogger(__name__)


@shared_task(name='update-available-earnings')
def update_available_earnings():
    """
    Update earnings transactions from 'pending' to 'available' status
    when their available_after time has passed.
    This task runs every hour via Celery Beat.
    """
    from payments.services import EarningsService
    
    earnings_service = EarningsService()
    result = earnings_service.process_available_earnings()
    
    logger.info(
        f"Available earnings update task finished. "
        f"Updated {result['updated_count']} earnings to available. "
        f"Errors: {result['error_count']}"
    )
    
    result['checked_at'] = timezone.now().isoformat()
    return result


@shared_task(name='process-refund-credits')
def process_refund_credits(booking_id, refund_amount_cents, reason='Booking canceled'):
    """
    Process credit refunds when a booking is canceled.
    
    Args:
        booking_id: ID of the canceled booking
        refund_amount_cents: Amount to refund in cents
        reason: Reason for the refund
    """
    try:
        from bookings.models import Booking
        from payments.services import CreditService, EarningsService
        
        booking = Booking.objects.get(id=booking_id)
        
        # Use CreditService for refund
        credit_service = CreditService()
        refund_transaction = credit_service.refund_credits(
            user=booking.user,
            amount_cents=refund_amount_cents,
            booking=booking,
            reason=f"Refund: {reason}"
        )
        
        logger.info(
            f"Created refund transaction {refund_transaction.id} for booking {booking_id}. "
            f"Amount: ${refund_amount_cents / 100:.2f}"
        )
        
        # Use EarningsService for earnings reversal
        earnings_service = EarningsService()
        reversal = earnings_service.reverse_earnings(booking)
        
        if reversal:
            logger.info(f"Created earnings reversal {reversal.id} for booking {booking_id}")
        
        return {
            'success': True,
            'refund_transaction_id': str(refund_transaction.id),
            'refund_amount': refund_amount_cents / 100
        }
        
    except Exception as e:
        logger.error(
            f"Error processing refund for booking {booking_id}: {str(e)}",
            exc_info=True
        )
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(name='calculate-pending-earnings')
def calculate_pending_earnings():
    """
    Calculate and update pending earnings for practitioners.
    This ensures the pending_balance_cents is accurate.
    Runs daily via Celery Beat.
    """
    practitioners_updated = 0
    errors = 0
    
    # Get all practitioners with earnings
    practitioners = PractitionerEarnings.objects.all()
    
    for practitioner_earnings in practitioners:
        try:
            # Calculate pending earnings from transactions
            pending_total = EarningsTransaction.objects.filter(
                practitioner=practitioner_earnings.practitioner,
                status='pending'
            ).aggregate(
                total=models.Sum('net_amount_cents')
            )['total'] or 0
            
            # Update if different
            if practitioner_earnings.pending_balance_cents != pending_total:
                practitioner_earnings.pending_balance_cents = pending_total
                practitioner_earnings.save(update_fields=['pending_balance_cents'])
                practitioners_updated += 1
                
                logger.info(
                    f"Updated pending balance for {practitioner_earnings.practitioner.display_name}: "
                    f"${pending_total / 100:.2f}"
                )
                
        except Exception as e:
            logger.error(
                f"Error calculating pending earnings for practitioner {practitioner_earnings.practitioner_id}: {str(e)}",
                exc_info=True
            )
            errors += 1
    
    logger.info(
        f"Pending earnings calculation finished. "
        f"Updated {practitioners_updated} practitioners. "
        f"Errors: {errors}"
    )
    
    return {
        'practitioners_updated': practitioners_updated,
        'errors': errors,
        'completed_at': timezone.now().isoformat()
    }