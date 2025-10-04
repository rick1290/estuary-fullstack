"""
Cron-based notification processing.
Master periodic task that handles all time-based notifications.
"""
import logging
from datetime import datetime, timedelta
from celery import shared_task
from celery.schedules import crontab
from django.utils import timezone
from django.db.models import Q, F
from django.db import models
from django.conf import settings

from bookings.models import Booking
from services.models import ServiceSession
from notifications.models import Notification
from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)

logger = logging.getLogger(__name__)


@shared_task
def process_all_notifications():
    """
    Master periodic task that processes all time-based notifications.
    Runs every 15 minutes via Celery Beat.
    """
    logger.info("Starting periodic notification processing")
    
    try:
        # Process different types of notifications
        reminder_stats = process_booking_reminders()
        reschedule_stats = process_session_reschedules()
        cleanup_stats = cleanup_old_notifications()
        
        logger.info(f"Notification processing complete: {reminder_stats}, {reschedule_stats}, {cleanup_stats}")
        
        return {
            'status': 'success',
            'reminders': reminder_stats,
            'reschedules': reschedule_stats,
            'cleanup': cleanup_stats,
            'processed_at': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.exception(f"Error in periodic notification processing: {str(e)}")
        return {'status': 'error', 'error': str(e)}


def process_booking_reminders():
    """
    Process all booking reminder notifications (24h and 30min).
    Returns stats about processed reminders.
    """
    logger.info("Processing booking reminders")
    
    stats = {
        'session_24h_reminders': 0,
        'session_30m_reminders': 0,
        'booking_24h_reminders': 0,
        'booking_30m_reminders': 0
    }
    
    # 1. Process session-based reminders (workshops, courses)
    stats['session_24h_reminders'] = process_session_reminders(hours_before=24)
    stats['session_30m_reminders'] = process_session_reminders(hours_before=0.5)
    
    # 2. Process booking-based reminders (individual sessions, packages)
    stats['booking_24h_reminders'] = process_booking_based_reminders(hours_before=24)
    stats['booking_30m_reminders'] = process_booking_based_reminders(hours_before=0.5)
    
    total_reminders = sum(stats.values())
    logger.info(f"Processed {total_reminders} reminder notifications: {stats}")
    
    return stats


def process_session_reminders(hours_before):
    """
    Process reminders for ServiceSession-based bookings (workshops, courses).
    """
    now = timezone.now()
    
    # Calculate time window for reminders
    if hours_before == 24:
        start_time = now + timedelta(hours=23, minutes=45)  # 23:45 to 24:15 hours from now
        end_time = now + timedelta(hours=24, minutes=15)
    else:  # 30 minutes
        start_time = now + timedelta(minutes=15)  # 15 to 45 minutes from now
        end_time = now + timedelta(minutes=45)
    
    # Find sessions in the time window
    sessions = ServiceSession.objects.filter(
        start_time__gte=start_time,
        start_time__lt=end_time,
        service__is_active=True
    ).select_related('service__primary_practitioner__user')
    
    logger.info(f"Found {sessions.count()} sessions needing {hours_before}h reminders")
    
    reminder_count = 0
    
    for session in sessions:
        # Find confirmed bookings for this session
        bookings = Booking.objects.filter(
            service_session=session,
            status='confirmed'
        ).select_related('user', 'service__primary_practitioner__user')
        
        # Process client reminders
        for booking in bookings:
            if send_session_reminder_to_client(booking, session, hours_before):
                reminder_count += 1
        
        # Process practitioner reminder (aggregated for workshops/courses)
        if bookings.exists():
            send_session_reminder_to_practitioner(session, bookings, hours_before)
            reminder_count += 1
    
    return reminder_count


def process_booking_based_reminders(hours_before):
    """
    Process reminders for direct booking-based services (sessions, packages).
    """
    now = timezone.now()
    
    # Calculate time window for reminders
    if hours_before == 24:
        start_time = now + timedelta(hours=23, minutes=45)
        end_time = now + timedelta(hours=24, minutes=15)
    else:  # 30 minutes
        start_time = now + timedelta(minutes=15)
        end_time = now + timedelta(minutes=45)
    
    # Find bookings without service_session (direct bookings)
    bookings = Booking.objects.filter(
        start_time__gte=start_time,
        start_time__lt=end_time,
        status='confirmed',
        service_session__isnull=True  # Direct bookings only
    ).select_related('user', 'service__primary_practitioner__user')
    
    logger.info(f"Found {bookings.count()} direct bookings needing {hours_before}h reminders")
    
    reminder_count = 0
    
    for booking in bookings:
        # Send client reminder
        if send_booking_reminder_to_client(booking, hours_before):
            reminder_count += 1
            
        # Send practitioner reminder
        if send_booking_reminder_to_practitioner(booking, hours_before):
            reminder_count += 1
    
    return reminder_count


def send_session_reminder_to_client(booking, session, hours_before):
    """
    Send session-based reminder to client with deduplication.
    """
    # Create unique notification key
    notification_key = f"booking_{booking.id}_session_{session.id}_{hours_before}h_client_reminder"
    
    # Check if already sent
    if notification_already_sent(booking.user, notification_key):
        return False
    
    try:
        client_service = get_client_notification_service()
        
        # Determine template and content
        template_key = 'reminder_24h' if hours_before == 24 else 'reminder_30m'
        template_id = client_service.get_template_id(template_key)
        
        if not template_id:
            logger.warning(f"No {template_key} template configured")
            return False
        
        # Prepare notification data
        service = booking.service
        practitioner = service.primary_practitioner
        
        data = {
            'booking_id': str(booking.id),
            'service_name': service.name,
            'session_title': session.title or f"Session {session.sequence_number}" if session.sequence_number else service.name,
            'session_number': session.sequence_number,
            'practitioner_name': practitioner.user.get_full_name(),
            'session_date': session.start_time.strftime('%A, %B %d, %Y'),
            'session_time': session.start_time.strftime('%I:%M %p'),
            'duration_minutes': session.duration or service.duration_minutes,
            'location': booking.location.name if booking.location else ('Virtual' if booking.meeting_url else 'TBD'),
            'hours_until': int(hours_before),
            'booking_url': f"{settings.FRONTEND_URL}/dashboard/user/bookings/{booking.id}",
            'session_url': f"{settings.FRONTEND_URL}/dashboard/user/sessions/{session.id}",
            'is_course_session': service.service_type.code == 'course'
        }
        
        # Create notification record
        notification = Notification.objects.create(
            user=booking.user,
            title=f"Reminder: {service.name} in {int(hours_before)} {'hours' if hours_before > 1 else 'hour'}",
            message=f"Your session starts at {data['session_time']}",
            notification_type='reminder',
            delivery_channel='email',
            related_object_type='booking',
            related_object_id=str(booking.id),
            notification_key=notification_key,
            metadata={
                'booking_id': booking.id,
                'session_id': session.id,
                'hours_before': hours_before,
                'reminder_type': 'session_based'
            }
        )
        
        # Send via notification service
        result = client_service.send_email_notification(
            user=booking.user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"session-reminder-{booking.id}-{session.id}-{hours_before}h"
        )
        
        if result and 'error' not in result:
            notification.status = 'sent'
            notification.sent_at = timezone.now()
            notification.save(update_fields=['status', 'sent_at'])
            logger.info(f"Sent {hours_before}h session reminder to {booking.user.email} for session {session.id}")
            return True
        else:
            notification.status = 'failed'
            notification.metadata['error'] = result.get('error', 'Unknown error')
            notification.save(update_fields=['status', 'metadata'])
            logger.error(f"Failed to send session reminder: {result}")
            return False
            
    except Exception as e:
        logger.exception(f"Error sending session reminder: {str(e)}")
        return False


def send_booking_reminder_to_client(booking, hours_before):
    """
    Send booking-based reminder to client with deduplication.
    """
    # Create unique notification key
    notification_key = f"booking_{booking.id}_{hours_before}h_client_reminder"
    
    # Check if already sent
    if notification_already_sent(booking.user, notification_key):
        return False
    
    try:
        client_service = get_client_notification_service()
        
        # Use existing send_booking_reminder method
        result = client_service.send_booking_reminder(booking, int(hours_before))
        
        # Create notification record for tracking
        Notification.objects.create(
            user=booking.user,
            title=f"Reminder: {booking.service.name} in {int(hours_before)} {'hours' if hours_before > 1 else 'hour'}",
            message=f"Your booking starts at {booking.start_time.strftime('%I:%M %p')}",
            notification_type='reminder',
            delivery_channel='email',
            related_object_type='booking',
            related_object_id=str(booking.id),
            notification_key=notification_key,
            status='sent' if result else 'failed',
            sent_at=timezone.now() if result else None,
            metadata={
                'booking_id': booking.id,
                'hours_before': hours_before,
                'reminder_type': 'booking_based'
            }
        )
        
        logger.info(f"Sent {hours_before}h booking reminder to {booking.user.email} for booking {booking.id}")
        return True
        
    except Exception as e:
        logger.exception(f"Error sending booking reminder: {str(e)}")
        return False


def send_session_reminder_to_practitioner(session, bookings, hours_before):
    """
    Send aggregated session reminder to practitioner.
    """
    practitioner = session.service.primary_practitioner
    if not practitioner:
        return False
    
    # Create unique notification key
    notification_key = f"session_{session.id}_{hours_before}h_practitioner_reminder"
    
    # Check if already sent
    if notification_already_sent(practitioner.user, notification_key):
        return False
    
    try:
        # Use existing aggregated reminder task
        from bookings.tasks import send_practitioner_aggregated_reminder
        
        result = send_practitioner_aggregated_reminder(
            practitioner_id=practitioner.id,
            session_id=session.id,
            hours_before=hours_before
        )
        
        # Create notification record
        Notification.objects.create(
            user=practitioner.user,
            title=f"Reminder: {session.service.name} in {int(hours_before)} {'hours' if hours_before > 1 else 'hour'} ({bookings.count()} participants)",
            message=f"You have {bookings.count()} participants for this session",
            notification_type='reminder',
            delivery_channel='email',
            related_object_type='service_session',
            related_object_id=str(session.id),
            notification_key=notification_key,
            status='sent',
            sent_at=timezone.now(),
            metadata={
                'session_id': session.id,
                'participant_count': bookings.count(),
                'hours_before': hours_before,
                'reminder_type': 'aggregated_practitioner'
            }
        )
        
        logger.info(f"Sent aggregated {hours_before}h reminder to {practitioner.user.email} for session {session.id}")
        return True
        
    except Exception as e:
        logger.exception(f"Error sending practitioner session reminder: {str(e)}")
        return False


def send_booking_reminder_to_practitioner(booking, hours_before):
    """
    Send individual booking reminder to practitioner.
    """
    practitioner = booking.service.primary_practitioner
    if not practitioner:
        return False
    
    # Create unique notification key
    notification_key = f"booking_{booking.id}_{hours_before}h_practitioner_reminder"
    
    # Check if already sent
    if notification_already_sent(practitioner.user, notification_key):
        return False
    
    try:
        practitioner_service = get_practitioner_notification_service()
        result = practitioner_service.send_booking_reminder(booking, int(hours_before))
        
        # Create notification record
        Notification.objects.create(
            user=practitioner.user,
            title=f"Reminder: {booking.service.name} with {booking.user.get_full_name()} in {int(hours_before)} {'hours' if hours_before > 1 else 'hour'}",
            message=f"Your session with {booking.user.get_full_name()} starts at {booking.start_time.strftime('%I:%M %p')}",
            notification_type='reminder',
            delivery_channel='email',
            related_object_type='booking',
            related_object_id=str(booking.id),
            notification_key=notification_key,
            status='sent' if result else 'failed',
            sent_at=timezone.now() if result else None,
            metadata={
                'booking_id': booking.id,
                'hours_before': hours_before,
                'reminder_type': 'individual_practitioner'
            }
        )
        
        logger.info(f"Sent {hours_before}h booking reminder to {practitioner.user.email} for booking {booking.id}")
        return True
        
    except Exception as e:
        logger.exception(f"Error sending practitioner booking reminder: {str(e)}")
        return False


def process_session_reschedules():
    """
    Detect and process session reschedules by comparing session times with booking times.
    """
    logger.info("Processing session reschedules")
    
    # Find bookings where session time doesn't match booking time
    mismatched_bookings = Booking.objects.filter(
        service_session__isnull=False,
        status='confirmed'
    ).select_related('service_session', 'user', 'service__primary_practitioner__user').exclude(
        start_time=F('service_session__start_time')
    )
    
    reschedule_count = 0
    
    for booking in mismatched_bookings:
        session = booking.service_session
        
        # Check if this reschedule was already processed
        notification_key = f"booking_{booking.id}_reschedule_{session.start_time.strftime('%Y%m%d%H%M')}"
        
        if notification_already_sent(booking.user, notification_key):
            continue
        
        # Update booking times to match session
        old_start_time = booking.start_time
        old_end_time = booking.end_time
        
        booking.start_time = session.start_time
        booking.end_time = session.end_time
        booking.save(update_fields=['start_time', 'end_time'])
        
        # Send reschedule notification
        send_reschedule_notification(booking, old_start_time, session.start_time, notification_key)
        reschedule_count += 1
        
        logger.info(f"Processed reschedule for booking {booking.id}: {old_start_time} -> {session.start_time}")
    
    logger.info(f"Processed {reschedule_count} session reschedules")
    return reschedule_count


def send_reschedule_notification(booking, old_start_time, new_start_time, notification_key):
    """
    Send reschedule notification to client.
    """
    try:
        client_service = get_client_notification_service()
        
        # Get template
        template_id = client_service.get_template_id('booking_rescheduled')
        if not template_id:
            logger.warning("No booking_rescheduled template configured")
            return False
        
        # Prepare data
        service = booking.service
        session = booking.service_session
        practitioner = service.primary_practitioner
        
        data = {
            'booking_id': str(booking.id),
            'service_name': service.name,
            'session_title': session.title if session else service.name,
            'practitioner_name': practitioner.user.get_full_name(),
            'old_date': old_start_time.strftime('%A, %B %d, %Y'),
            'old_time': old_start_time.strftime('%I:%M %p'),
            'new_date': new_start_time.strftime('%A, %B %d, %Y'),
            'new_time': new_start_time.strftime('%I:%M %p'),
            'reschedule_reason': 'The practitioner has updated the session time',
            'booking_url': f"{settings.FRONTEND_URL}/dashboard/user/bookings/{booking.id}",
            'contact_practitioner_url': f"{settings.FRONTEND_URL}/dashboard/user/messages/new?recipient={practitioner.user.id}",
        }
        
        # Create notification
        notification = Notification.objects.create(
            user=booking.user,
            title=f"Session Rescheduled: {service.name}",
            message=f"Your session has been moved from {data['old_date']} at {data['old_time']} to {data['new_date']} at {data['new_time']}",
            notification_type='booking',
            delivery_channel='email',
            related_object_type='booking',
            related_object_id=str(booking.id),
            notification_key=notification_key,
            metadata={
                'booking_id': booking.id,
                'old_start_time': old_start_time.isoformat(),
                'new_start_time': new_start_time.isoformat(),
                'reschedule_type': 'session_time_changed'
            }
        )
        
        # Send notification
        result = client_service.send_email_notification(
            user=booking.user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"session-reschedule-{booking.id}-{new_start_time.strftime('%Y%m%d%H%M')}"
        )
        
        if result and 'error' not in result:
            notification.status = 'sent'
            notification.sent_at = timezone.now()
            notification.save(update_fields=['status', 'sent_at'])
            logger.info(f"Sent reschedule notification to {booking.user.email} for booking {booking.id}")
            return True
        else:
            notification.status = 'failed'
            notification.metadata['error'] = result.get('error', 'Unknown error')
            notification.save(update_fields=['status', 'metadata'])
            return False
            
    except Exception as e:
        logger.exception(f"Error sending reschedule notification: {str(e)}")
        return False


def cleanup_old_notifications():
    """
    Clean up old notification records.
    """
    cutoff_date = timezone.now() - timedelta(days=30)
    
    # Delete old sent notifications
    deleted_count = Notification.objects.filter(
        status='sent',
        created_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Deleted {deleted_count} old sent notifications")
    return deleted_count


def notification_already_sent(user, notification_key):
    """
    Check if notification with this key was already sent to user.
    """
    return Notification.objects.filter(
        user=user,
        notification_key=notification_key,
        status='sent'
    ).exists()


# Celery Beat Schedule Configuration
# Add this to your Django settings.py:
"""
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'process-all-notifications': {
        'task': 'notifications.cron.process_all_notifications',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
}
"""