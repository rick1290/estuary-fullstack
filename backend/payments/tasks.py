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
    now = timezone.now()
    
    # Get all pending earnings that are ready to be available
    pending_earnings = EarningsTransaction.objects.filter(
        status='pending',
        available_after__lte=now
    ).select_related('practitioner')
    
    updated_count = 0
    error_count = 0
    
    for earning in pending_earnings:
        try:
            # Update the earnings transaction status
            earning.status = 'available'
            earning.save(update_fields=['status', 'updated_at'])
            
            # Update practitioner's earnings balance
            practitioner_earnings, created = PractitionerEarnings.objects.get_or_create(
                practitioner=earning.practitioner,
                defaults={
                    'pending_balance_cents': 0,
                    'available_balance_cents': 0,
                    'lifetime_earnings_cents': 0,
                    'lifetime_payouts_cents': 0
                }
            )
            
            # Move amount from pending to available
            practitioner_earnings.pending_balance_cents = max(
                0, 
                practitioner_earnings.pending_balance_cents - earning.net_amount_cents
            )
            practitioner_earnings.available_balance_cents += earning.net_amount_cents
            practitioner_earnings.lifetime_earnings_cents += earning.net_amount_cents
            practitioner_earnings.save()
            
            logger.info(
                f"Updated earnings transaction {earning.id} to available. "
                f"Practitioner: {earning.practitioner.display_name}, "
                f"Amount: ${earning.net_amount_cents / 100:.2f}"
            )
            updated_count += 1
            
        except Exception as e:
            logger.error(
                f"Error updating earnings transaction {earning.id}: {str(e)}",
                exc_info=True
            )
            error_count += 1
    
    logger.info(
        f"Available earnings update task finished. "
        f"Updated {updated_count} earnings to available. "
        f"Errors: {error_count}"
    )
    
    return {
        'updated_count': updated_count,
        'error_count': error_count,
        'checked_at': now.isoformat()
    }


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
        from .models import UserCreditTransaction
        
        booking = Booking.objects.get(id=booking_id)
        
        # Create refund credit transaction
        refund_transaction = UserCreditTransaction.objects.create(
            user=booking.user,
            amount_cents=refund_amount_cents,  # Positive for refund
            transaction_type='refund',
            booking=booking,
            service=booking.service,
            practitioner=booking.practitioner,
            description=f"Refund: {reason}"
        )
        
        logger.info(
            f"Created refund transaction {refund_transaction.id} for booking {booking_id}. "
            f"Amount: ${refund_amount_cents / 100:.2f}"
        )
        
        # Handle earnings reversal if booking had earnings
        try:
            earnings = EarningsTransaction.objects.filter(
                booking=booking,
                status__in=['projected', 'pending', 'available']
            ).first()
            
            if earnings:
                # Create a reversal earnings transaction
                reversal = EarningsTransaction.objects.create(
                    practitioner=earnings.practitioner,
                    booking=booking,
                    gross_amount_cents=-earnings.gross_amount_cents,
                    commission_rate=earnings.commission_rate,
                    commission_amount_cents=-earnings.commission_amount_cents,
                    net_amount_cents=-earnings.net_amount_cents,
                    status='reversal',
                    description=f"Reversal: {reason}",
                    reference_transaction=earnings
                )
                
                # If the original earnings were available, update practitioner balance
                if earnings.status == 'available':
                    practitioner_earnings = PractitionerEarnings.objects.get(
                        practitioner=earnings.practitioner
                    )
                    practitioner_earnings.available_balance_cents = max(
                        0,
                        practitioner_earnings.available_balance_cents - earnings.net_amount_cents
                    )
                    practitioner_earnings.save()
                
                # Mark original earnings as reversed
                earnings.status = 'reversed'
                earnings.save()
                
                logger.info(f"Created earnings reversal {reversal.id} for booking {booking_id}")
                
        except Exception as e:
            logger.error(
                f"Error handling earnings reversal for booking {booking_id}: {str(e)}",
                exc_info=True
            )
        
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