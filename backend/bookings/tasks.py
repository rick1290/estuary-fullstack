from celery import shared_task
from django.utils import timezone
from django.db.models import Q, Max
from datetime import timedelta
import logging

from .models import Booking
from payments.models import EarningsTransaction

logger = logging.getLogger(__name__)


@shared_task(name='mark-completed-bookings')
def mark_completed_bookings():
    """
    Mark bookings as completed if they are past their end time.
    This task runs every 30 minutes via Celery Beat.
    
    For different service types:
    - Sessions: Check the booking's end_time
    - Workshops: Check the service session's end_time
    - Courses: Check the last service session's end_time
    """
    now = timezone.now()
    
    # Get all bookings that are in 'confirmed' or 'in_progress' status
    active_bookings = Booking.objects.filter(
        Q(status='confirmed') | Q(status='in_progress')
    ).select_related('service', 'service_session').prefetch_related('service__sessions')
    
    completed_count = 0
    error_count = 0
    skipped_count = 0
    
    for booking in active_bookings:
        try:
            should_complete = False
            end_time_used = None
            
            # Determine if booking should be completed based on service type
            if booking.service.service_type_code == 'session':
                # For sessions, use the booking's end_time
                if booking.end_time < now:
                    should_complete = True
                    end_time_used = booking.end_time
                    
            elif booking.service.service_type_code == 'workshop':
                # For workshops, check the service session's end_time
                if booking.service_session and booking.service_session.end_time < now:
                    should_complete = True
                    end_time_used = booking.service_session.end_time
                    
            elif booking.service.service_type_code == 'course':
                # For courses, check the last service session's end_time
                last_session = booking.service.sessions.aggregate(
                    last_end_time=Max('end_time')
                )['last_end_time']
                
                if last_session and last_session < now:
                    should_complete = True
                    end_time_used = last_session
                    
            else:
                # For other types (packages, bundles), skip for now
                logger.debug(
                    f"Skipping booking {booking.id} with service type: {booking.service.service_type_code}"
                )
                skipped_count += 1
                continue
            
            if should_complete:
                # Use BookingService to mark as completed
                # This handles status update and review request notification
                from bookings.services import BookingService
                booking_service = BookingService()
                
                try:
                    # Use BookingService to mark as completed
                    # This now handles status update, earnings update, and review request
                    booking_service.mark_booking_completed(booking)
                    
                    logger.info(
                        f"Marked booking {booking.id} as completed. "
                        f"Service: {booking.service.name} ({booking.service.service_type_code}), "
                        f"User: {booking.user.email}, "
                        f"End time used: {end_time_used}"
                    )
                    completed_count += 1
                    
                except Exception as e:
                    logger.error(
                        f"Error marking booking {booking.id} as completed: {str(e)}",
                        exc_info=True
                    )
                    error_count += 1
                    continue
                
        except Exception as e:
            logger.error(
                f"Error marking booking {booking.id} as completed: {str(e)}",
                exc_info=True
            )
            error_count += 1
    
    logger.info(
        f"Completed bookings task finished. "
        f"Marked {completed_count} bookings as completed. "
        f"Skipped {skipped_count} bookings. "
        f"Errors: {error_count}"
    )
    
    return {
        'completed_count': completed_count,
        'error_count': error_count,
        'skipped_count': skipped_count,
        'checked_at': now.isoformat()
    }