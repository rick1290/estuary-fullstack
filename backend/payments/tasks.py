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


@shared_task(name='complete-booking-post-payment', bind=True, max_retries=3)
def complete_booking_post_payment(self, booking_id: int):
    """
    Complete booking setup tasks after payment confirmation.
    This includes room creation, notifications, and other non-critical tasks.
    
    Args:
        booking_id: ID of the booking to complete setup for
    """
    try:
        from bookings.models import Booking
        from rooms.services import RoomService
        from notifications.services import NotificationService
        
        booking = Booking.objects.select_related(
            'service',
            'service__primary_practitioner',
            'user',
            'practitioner'
        ).get(id=booking_id)
        
        logger.info(f"Starting post-payment setup for booking {booking_id}")
        
        # 1. Create room if needed
        if not hasattr(booking, 'livekit_room') or not booking.livekit_room:
            if booking.service.location_type in ['virtual', 'online', 'hybrid'] and not booking.service_session:
                try:
                    room_service = RoomService()
                    room = room_service.create_room_for_booking(booking)
                    logger.info(f"Created room {room.livekit_room_name} for booking {booking_id}")
                except Exception as e:
                    logger.error(f"Failed to create room for booking {booking_id}: {e}")
                    # Retry this task later
                    raise self.retry(exc=e, countdown=60)
        
        # 2. Send notifications
        try:
            notification_service = NotificationService()
            notification_service.send_booking_confirmation(booking)
            logger.info(f"Sent booking confirmation notifications for booking {booking_id}")
        except Exception as e:
            logger.error(f"Failed to send notifications for booking {booking_id}: {e}")
            # Don't retry for notification failures - they have their own retry logic
        
        # 3. Reminder notifications now handled by periodic task
        logger.info(f"Reminders will be sent by periodic task for booking {booking_id}")
        
        logger.info(f"Completed post-payment setup for booking {booking_id}")
        return {
            'booking_id': booking_id,
            'completed': True,
            'completed_at': timezone.now().isoformat()
        }
        
    except Booking.DoesNotExist:
        logger.error(f"Booking {booking_id} not found")
        return {
            'booking_id': booking_id,
            'completed': False,
            'error': 'Booking not found'
        }
    except Exception as e:
        logger.error(f"Error in post-payment setup for booking {booking_id}: {e}")
        raise


@shared_task(name='create-booking-earnings-async')
def create_booking_earnings_async(practitioner_id: int, booking_id: int, service_id: int, gross_amount_cents: int):
    """
    Create earnings transaction asynchronously after booking is confirmed.
    
    Args:
        practitioner_id: ID of the practitioner
        booking_id: ID of the booking
        service_id: ID of the service
        gross_amount_cents: Gross amount in cents
    """
    if not practitioner_id:
        logger.info(f"No practitioner for booking {booking_id}, skipping earnings creation")
        return
    
    try:
        from practitioners.models import Practitioner
        from bookings.models import Booking
        from services.models import Service
        from payments.services import EarningsService
        
        practitioner = Practitioner.objects.get(id=practitioner_id)
        booking = Booking.objects.get(id=booking_id)
        service = Service.objects.get(id=service_id)
        
        earnings_service = EarningsService()
        earnings = earnings_service.create_booking_earnings(
            practitioner=practitioner,
            booking=booking,
            service=service,
            gross_amount_cents=gross_amount_cents
        )
        
        if earnings:
            logger.info(f"Created earnings transaction {earnings.id} for booking {booking_id}")
        
        return {
            'success': True,
            'earnings_id': earnings.id if earnings else None,
            'booking_id': booking_id
        }
        
    except Exception as e:
        logger.error(f"Error creating earnings for booking {booking_id}: {e}")
        return {
            'success': False,
            'error': str(e),
            'booking_id': booking_id
        }