"""
Booking and session reschedule tasks.
"""
import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.utils.dateparse import parse_datetime

from bookings.models import Booking
from services.models import ServiceSession
from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)

logger = logging.getLogger(__name__)


@shared_task
def handle_session_reschedule(session_id: int, old_start_time: str, new_start_time: str, old_end_time: str, new_end_time: str):
    """
    Handle ServiceSession reschedule - update all affected bookings and notifications.
    
    Args:
        session_id: ID of the ServiceSession that was rescheduled
        old_start_time: ISO format datetime string of previous start time
        new_start_time: ISO format datetime string of new start time
        old_end_time: ISO format datetime string of previous end time
        new_end_time: ISO format datetime string of new end time
    """
    try:
        session = ServiceSession.objects.select_related('service__primary_practitioner__user').get(id=session_id)
        
        # Parse datetime strings
        old_start_dt = parse_datetime(old_start_time)
        new_start_dt = parse_datetime(new_start_time)
        old_end_dt = parse_datetime(old_end_time)
        new_end_dt = parse_datetime(new_end_time)
        
        # Find all bookings linked to this session
        affected_bookings = Booking.objects.filter(
            service_session=session,
            status__in=['confirmed', 'pending']
        ).select_related('user', 'service__primary_practitioner__user')
        
        if not affected_bookings.exists():
            logger.info(f"No affected bookings found for session {session_id}")
            return f"No bookings affected by session {session_id} reschedule"
        
        logger.info(f"Found {affected_bookings.count()} bookings affected by session {session_id} reschedule")
        
        # Update each booking and handle notifications
        for booking in affected_bookings:
            try:
                # Store old times for notification
                old_booking_start = booking.start_time
                old_booking_end = booking.end_time
                
                # Update booking times
                booking.start_time = new_start_dt
                booking.end_time = new_end_dt
                
                # Clear old reminder flags so new ones can be scheduled
                reminder_keys = [
                    'client_24h_reminder_sent',
                    'client_0.5h_reminder_sent', 
                    'practitioner_24h_reminder_sent',
                    'practitioner_0.5h_reminder_sent'
                ]
                
                for key in reminder_keys:
                    if key in booking.metadata:
                        del booking.metadata[key]
                
                # Add reschedule metadata
                booking.metadata.update({
                    'rescheduled_by': 'practitioner',
                    'rescheduled_at': timezone.now().isoformat(),
                    'old_start_time': old_booking_start.isoformat(),
                    'old_end_time': old_booking_end.isoformat(),
                    'reschedule_reason': 'session_time_changed'
                })
                
                booking.save(update_fields=['start_time', 'end_time', 'metadata'])
                
                # Send reschedule notification to client
                send_session_reschedule_notification.delay(
                    booking_id=booking.id,
                    old_start_time=old_booking_start.isoformat(),
                    new_start_time=new_start_dt.isoformat(),
                    old_end_time=old_booking_end.isoformat(), 
                    new_end_time=new_end_dt.isoformat()
                )
                
                # Reminders handled by periodic task - no need to reschedule
                # schedule_booking_reminders.delay(booking.id)  # Deprecated - using periodic task
                
                logger.info(f"Updated booking {booking.id} from {old_booking_start} to {new_start_dt}")
                
            except Exception as e:
                logger.error(f"Error updating booking {booking.id}: {str(e)}")
                continue
        
        # Send notification to practitioner about the change impact
        send_practitioner_session_reschedule_summary.delay(
            session_id=session_id,
            affected_booking_count=affected_bookings.count(),
            old_start_time=old_start_time,
            new_start_time=new_start_time
        )
        
        logger.info(f"Successfully processed session {session_id} reschedule affecting {affected_bookings.count()} bookings")
        return f"Updated {affected_bookings.count()} bookings for session {session_id} reschedule"
        
    except ServiceSession.DoesNotExist:
        logger.error(f"ServiceSession {session_id} not found")
        return f"Session {session_id} not found"
    except Exception as e:
        logger.exception(f"Error handling session reschedule: {str(e)}")
        return f"Error handling session reschedule: {str(e)}"


@shared_task  
def send_session_reschedule_notification(booking_id: int, old_start_time: str, new_start_time: str, old_end_time: str, new_end_time: str):
    """
    Send reschedule notification to client when their session time changes.
    """
    try:
        booking = Booking.objects.select_related(
            'user', 'service__primary_practitioner__user', 'service_session'
        ).get(id=booking_id)
        
        client_service = get_client_notification_service()
        
        # Parse times
        old_start_dt = parse_datetime(old_start_time)
        new_start_dt = parse_datetime(new_start_time)
        
        # Prepare notification data
        service = booking.service
        session = booking.service_session
        practitioner = service.primary_practitioner
        
        data = {
            'booking_id': str(booking.id),
            'service_name': service.name,
            'session_title': session.title if session else service.name,
            'practitioner_name': practitioner.user.get_full_name(),
            'old_date': old_start_dt.strftime('%A, %B %d, %Y'),
            'old_time': old_start_dt.strftime('%I:%M %p'),
            'new_date': new_start_dt.strftime('%A, %B %d, %Y'),
            'new_time': new_start_dt.strftime('%I:%M %p'),
            'reschedule_reason': 'The practitioner has updated the session time',
            'booking_url': f"{settings.FRONTEND_URL}/dashboard/user/bookings/{booking.id}",
            'contact_practitioner_url': f"{settings.FRONTEND_URL}/dashboard/user/messages/new?recipient={practitioner.user.id}",
            'cancellation_policy_url': f"{settings.FRONTEND_URL}/policies/cancellation"
        }
        
        # Get template for session reschedule 
        template_id = client_service.get_template_id('booking_rescheduled')
        if not template_id:
            logger.warning("No booking_rescheduled template configured")
            return "No template configured"
        
        # Create notification record
        notification = client_service.create_notification_record(
            user=booking.user,
            title=f"Session Rescheduled: {service.name}",
            message=f"Your session has been moved from {data['old_date']} at {data['old_time']} to {data['new_date']} at {data['new_time']}",
            notification_type='booking',
            delivery_channel='email',
            related_object_type='booking',
            related_object_id=str(booking.id)
        )
        
        # Send notification
        result = client_service.send_email_notification(
            user=booking.user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"session-reschedule-{booking.id}-{new_start_dt.strftime('%Y%m%d%H%M')}"
        )
        
        logger.info(f"Sent session reschedule notification to {booking.user.email} for booking {booking.id}")
        return f"Sent reschedule notification for booking {booking.id}"
        
    except Booking.DoesNotExist:
        logger.error(f"Booking {booking_id} not found")
        return f"Booking {booking_id} not found"
    except Exception as e:
        logger.exception(f"Error sending session reschedule notification: {str(e)}")
        return f"Error: {str(e)}"


@shared_task
def send_practitioner_session_reschedule_summary(session_id: int, affected_booking_count: int, old_start_time: str, new_start_time: str):
    """
    Send summary notification to practitioner about session reschedule impact.
    """
    try:
        session = ServiceSession.objects.select_related('service__primary_practitioner__user').get(id=session_id)
        practitioner = session.service.primary_practitioner
        
        if not practitioner:
            logger.warning(f"No practitioner found for session {session_id}")
            return "No practitioner found"
        
        practitioner_service = get_practitioner_notification_service()
        
        # Parse times
        old_start_dt = parse_datetime(old_start_time)
        new_start_dt = parse_datetime(new_start_time)
        
        data = {
            'session_id': str(session.id),
            'service_name': session.service.name,
            'session_title': session.title or f"Session {session.sequence_number}" if session.sequence_number else session.service.name,
            'old_date': old_start_dt.strftime('%A, %B %d, %Y'),
            'old_time': old_start_dt.strftime('%I:%M %p'),
            'new_date': new_start_dt.strftime('%A, %B %d, %Y'),
            'new_time': new_start_dt.strftime('%I:%M %p'),
            'affected_participants': affected_booking_count,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/sessions/{session.id}",
            'calendar_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/calendar"
        }
        
        # For now, just log this - could add a specific template later
        logger.info(f"Session {session_id} rescheduled by practitioner {practitioner.user.email}, {affected_booking_count} participants notified")
        
        return f"Logged practitioner reschedule summary for session {session_id}"
        
    except ServiceSession.DoesNotExist:
        logger.error(f"ServiceSession {session_id} not found")
        return f"Session {session_id} not found"
    except Exception as e:
        logger.exception(f"Error sending practitioner reschedule summary: {str(e)}")
        return f"Error: {str(e)}"