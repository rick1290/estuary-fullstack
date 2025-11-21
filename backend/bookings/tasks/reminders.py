"""
Booking reminder tasks.
"""
import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from django.db import models

from bookings.models import Booking
from services.models import ServiceSession
from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)

logger = logging.getLogger(__name__)


@shared_task(name='process-booking-reminders')
def process_booking_reminders():
    """
    Process all booking reminders that are due to be sent.
    This task runs every 5 minutes via Celery Beat.
    
    Checks for:
    - 24-hour reminders
    - 30-minute reminders
    - Both client and practitioner notifications
    """
    from datetime import timedelta
    
    now = timezone.now()
    
    # Define reminder windows (with some buffer for the periodic task)
    reminder_configs = [
        {
            'hours_before': 24,
            'min_time': now + timedelta(hours=23, minutes=50),
            'max_time': now + timedelta(hours=24, minutes=10),
            'key_suffix': '24h'
        },
        {
            'hours_before': 0.5,
            'min_time': now + timedelta(minutes=25),
            'max_time': now + timedelta(minutes=35),
            'key_suffix': '0.5h'
        }
    ]
    
    # Get all confirmed bookings
    # NOTE: During migration, we need to handle both cases:
    # - Bookings with service_session (NEW)
    # - Bookings with direct start_time (LEGACY)
    bookings = Booking.objects.filter(
        status='confirmed'
    ).filter(
        # Get bookings where either service_session or booking has future start_time
        models.Q(service_session__start_time__gte=now) |  # NEW way
        models.Q(start_time__gte=now)  # LEGACY way (for bookings without service_session)
    ).select_related(
        'user',
        'service__service_type',
        'service__primary_practitioner__user',
        'service_session',
        'practitioner'
    )

    reminders_sent = 0
    errors = 0

    for booking in bookings:
        for config in reminder_configs:
            try:
                # Get start time using helper method (handles both new and legacy)
                start_time = booking.get_start_time()
                if not start_time:
                    continue  # Skip bookings without a start time

                # Check if booking time falls within this reminder window
                if config['min_time'] <= start_time <= config['max_time']:
                    # Send client reminder if not already sent
                    client_key = f"client_{config['key_suffix']}_reminder_sent"
                    if not booking.metadata.get(client_key):
                        send_booking_reminder_immediate(
                            booking=booking,
                            user_type='client',
                            hours_before=config['hours_before']
                        )
                        reminders_sent += 1
                    
                    # Send practitioner reminder if not already sent
                    practitioner_key = f"practitioner_{config['key_suffix']}_reminder_sent"
                    if not booking.metadata.get(practitioner_key):
                        send_booking_reminder_immediate(
                            booking=booking,
                            user_type='practitioner',
                            hours_before=config['hours_before']
                        )
                        reminders_sent += 1
                        
            except Exception as e:
                logger.error(f"Error processing reminders for booking {booking.id}: {e}")
                errors += 1
    
    # Also process course session reminders
    course_reminders = process_course_session_reminders(now, reminder_configs)
    reminders_sent += course_reminders['sent']
    errors += course_reminders['errors']
    
    logger.info(
        f"Booking reminders task completed. "
        f"Sent {reminders_sent} reminders, {errors} errors"
    )
    
    return {
        'reminders_sent': reminders_sent,
        'errors': errors,
        'checked_at': now.isoformat()
    }


def send_booking_reminder_immediate(booking, user_type: str, hours_before: float):
    """
    Send a booking reminder immediately (used by periodic task).
    
    Args:
        booking: Booking instance
        user_type: 'client' or 'practitioner'
        hours_before: Hours before the appointment (24 or 0.5)
    """
    try:
        # Check if reminder already sent
        reminder_key = f"{user_type}_{hours_before}h_reminder_sent"
        if booking.metadata.get(reminder_key):
            return  # Already sent
        
        # For practitioners with workshops/courses, check if we should aggregate
        if (user_type == 'practitioner' and 
            booking.service.service_type.code in ['workshop', 'course'] and
            booking.service_session):
            
            # Create cache key for aggregation
            cache_key = f"reminder:practitioner:{booking.practitioner_id}:session:{booking.service_session.id}:{hours_before}h"
            
            # Check if we already sent an aggregated reminder
            if cache.get(cache_key):
                # Mark this booking as reminded
                booking.metadata[reminder_key] = timezone.now().isoformat()
                booking.save(update_fields=['metadata'])
                return
            
            # Send aggregated reminder
            send_practitioner_aggregated_reminder_immediate(
                practitioner_id=booking.practitioner_id,
                session_id=booking.service_session.id,
                hours_before=hours_before
            )
            
            # Mark in cache (expires after the event)
            cache.set(cache_key, True, timeout=int(hours_before * 3600 + 3600))
            
            # Mark this booking as reminded
            booking.metadata[reminder_key] = timezone.now().isoformat()
            booking.save(update_fields=['metadata'])
            return
        
        # Send individual reminder
        if user_type == 'client':
            service = get_client_notification_service()
            service.send_booking_reminder(booking, int(hours_before))
        else:
            service = get_practitioner_notification_service()
            service.send_booking_reminder(booking, int(hours_before))
        
        # Mark reminder as sent
        booking.metadata[reminder_key] = timezone.now().isoformat()
        booking.save(update_fields=['metadata'])
        
        logger.info(f"Sent {hours_before}h {user_type} reminder for booking {booking.id}")
        
    except Exception as e:
        logger.error(f"Error sending booking reminder: {str(e)}")
        raise


def process_course_session_reminders(now, reminder_configs):
    """
    Process reminders for course sessions.
    
    Args:
        now: Current time
        reminder_configs: List of reminder configurations
        
    Returns:
        Dict with sent count and errors
    """
    sent = 0
    errors = 0
    
    # Get all course bookings
    course_bookings = Booking.objects.filter(
        status='confirmed',
        service__service_type__code='course'
    ).select_related('service', 'user')
    
    for course_booking in course_bookings:
        # Get upcoming sessions for this course
        sessions = ServiceSession.objects.filter(
            service=course_booking.service,
            start_time__gte=now
        ).order_by('start_time')
        
        for session in sessions:
            for config in reminder_configs:
                try:
                    # Check if session time falls within this reminder window
                    if config['min_time'] <= session.start_time <= config['max_time']:
                        # Send client reminder for this session
                        session_client_key = f"client_session_{session.id}_{config['key_suffix']}_reminder_sent"
                        if not course_booking.metadata.get(session_client_key):
                            service = get_client_notification_service()
                            service.send_course_session_reminder(
                                course_booking, 
                                session, 
                                int(config['hours_before'])
                            )
                            course_booking.metadata[session_client_key] = timezone.now().isoformat()
                            course_booking.save(update_fields=['metadata'])
                            sent += 1
                            
                except Exception as e:
                    logger.error(f"Error processing course session reminder: {e}")
                    errors += 1
    
    return {'sent': sent, 'errors': errors}


def send_practitioner_aggregated_reminder_immediate(practitioner_id: int, session_id: int, hours_before: float):
    """
    Send aggregated reminder to practitioner immediately.
    
    Args:
        practitioner_id: ID of the practitioner
        session_id: ID of the ServiceSession
        hours_before: Hours before the session (24 or 0.5)
    """
    from practitioners.models import Practitioner
    
    try:
        practitioner = Practitioner.objects.select_related('user').get(id=practitioner_id)
        session = ServiceSession.objects.select_related('service').get(id=session_id)
        
        # Get all confirmed bookings for this session
        bookings = Booking.objects.filter(
            service_session=session,
            practitioner=practitioner,
            status='confirmed'
        ).select_related('user').order_by('user__last_name', 'user__first_name')
        
        if not bookings.exists():
            logger.warning(f"No confirmed bookings found for session {session_id}")
            return
        
        # Prepare participant data
        participants = []
        for booking in bookings:
            participants.append({
                'name': booking.user.get_full_name(),
                'email': booking.user.email,
                'phone': booking.user.phone_number or '',
                'notes': booking.client_notes or '',
                'booking_id': str(booking.id)
            })
            
            # Mark each booking as reminded
            reminder_key = f"practitioner_{hours_before}h_reminder_sent"
            booking.metadata[reminder_key] = timezone.now().isoformat()
            booking.save(update_fields=['metadata'])
        
        # Get service details
        service = session.service
        
        # Prepare notification data
        data = {
            'service_name': service.name,
            'session_title': session.title or f"Session {session.sequence_number}" if session.sequence_number else service.name,
            'session_date': session.start_time.strftime('%A, %B %d, %Y'),
            'session_time': session.start_time.strftime('%I:%M %p'),
            'duration_minutes': session.duration or service.duration_minutes,
            'location': session.get_location_display() if hasattr(session, 'get_location_display') else 'See booking details',
            'participant_count': len(participants),
            'participants': participants,
            'hours_until': int(hours_before),
            'is_aggregated': True,
            'session_id': str(session.id),
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/sessions/{session.id}",
            'participant_list_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/sessions/{session.id}/participants"
        }
        
        # Send using practitioner notification service
        service = get_practitioner_notification_service()
        
        # Determine template based on hours
        template_key = 'reminder_24h' if hours_before == 24 else 'reminder_30m'
        template_id = service.get_template_id(template_key)
        
        if not template_id:
            logger.error(f"No {template_key} template configured for practitioners")
            return
        
        # Create notification record
        notification = service.create_notification_record(
            user=practitioner.user,
            title=f"Reminder: {data['service_name']} in {int(hours_before)} {'hours' if hours_before > 1 else 'hour'} ({len(participants)} participants)",
            message=f"You have {len(participants)} participants for {data['session_title']} at {data['session_time']}",
            notification_type='reminder',
            delivery_channel='email',
            related_object_type='service_session',
            related_object_id=str(session.id)
        )
        
        # Send the aggregated notification
        service.send_email_notification(
            user=practitioner.user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"practitioner-reminder-{session.id}-{hours_before}h"
        )
        
        logger.info(f"Sent aggregated {hours_before}h reminder to practitioner {practitioner_id} for session {session_id} with {len(participants)} participants")
        
    except Exception as e:
        logger.error(f"Error sending aggregated reminder: {str(e)}")
        raise


@shared_task
def handle_booking_reschedule(booking_id: int, old_start_time: str, new_start_time: str):
    """
    Handle rescheduling - clear reminder flags so they'll be sent again.
    
    Args:
        booking_id: ID of the booking
        old_start_time: ISO format datetime string of previous start time
        new_start_time: ISO format datetime string of new start time
    """
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Clear all reminder sent flags
        keys_to_remove = []
        for key in booking.metadata.keys():
            if 'reminder_sent' in key:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del booking.metadata[key]
        
        booking.save(update_fields=['metadata'])
        
        logger.info(f"Cleared reminder flags for rescheduled booking {booking_id}")
        return f"Successfully cleared reminders for booking {booking_id}"
        
    except Booking.DoesNotExist:
        logger.error(f"Booking {booking_id} not found")
        return f"Booking {booking_id} not found"
    except Exception as e:
        logger.exception(f"Error handling booking reschedule: {str(e)}")
        return f"Error rescheduling: {str(e)}"


@shared_task
def send_practitioner_aggregated_reminder(practitioner_id: int, session_id: int, hours_before: float):
    """
    Send aggregated reminder to practitioner for workshops/courses.
    
    Args:
        practitioner_id: ID of the practitioner
        session_id: ID of the ServiceSession
        hours_before: Hours before the session (24 or 0.5)
    """
    from practitioners.models import Practitioner
    
    try:
        practitioner = Practitioner.objects.select_related('user').get(id=practitioner_id)
        session = ServiceSession.objects.select_related('service').get(id=session_id)
        
        # Get all confirmed bookings for this session
        bookings = Booking.objects.filter(
            service_session=session,
            practitioner=practitioner,
            status='confirmed'
        ).select_related('user').order_by('user__last_name', 'user__first_name')
        
        if not bookings.exists():
            logger.warning(f"No confirmed bookings found for session {session_id}")
            return "No bookings to remind about"
        
        # Prepare participant data
        participants = []
        for booking in bookings:
            participants.append({
                'name': booking.user.get_full_name(),
                'email': booking.user.email,
                'phone': booking.user.phone_number or '',
                'notes': booking.client_notes or '',
                'booking_id': str(booking.id)
            })
        
        # Get service details
        service = session.service
        
        # Prepare notification data
        data = {
            'service_name': service.name,
            'session_title': session.title or f"Session {session.sequence_number}" if session.sequence_number else service.name,
            'session_date': session.start_time.strftime('%A, %B %d, %Y'),
            'session_time': session.start_time.strftime('%I:%M %p'),
            'duration_minutes': session.duration or service.duration_minutes,
            'location': session.get_location_display() if hasattr(session, 'get_location_display') else 'See booking details',
            'participant_count': len(participants),
            'participants': participants,
            'hours_until': int(hours_before),
            'is_aggregated': True,
            'session_id': str(session.id),
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/sessions/{session.id}",
            'participant_list_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/sessions/{session.id}/participants"
        }
        
        # Send using practitioner notification service
        service = get_practitioner_notification_service()
        
        # Determine template based on hours
        template_key = 'reminder_24h' if hours_before == 24 else 'reminder_30m'
        template_id = service.get_template_id(template_key)
        
        if not template_id:
            logger.error(f"No {template_key} template configured for practitioners")
            return f"No template configured"
        
        # Create notification record
        notification = service.create_notification_record(
            user=practitioner.user,
            title=f"Reminder: {data['service_name']} in {int(hours_before)} {'hours' if hours_before > 1 else 'hour'} ({len(participants)} participants)",
            message=f"You have {len(participants)} participants for {data['session_title']} at {data['session_time']}",
            notification_type='reminder',
            delivery_channel='email',
            related_object_type='service_session',
            related_object_id=str(session.id)
        )
        
        # Send the aggregated notification
        result = service.send_email_notification(
            user=practitioner.user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"practitioner-reminder-{session.id}-{hours_before}h"
        )
        
        # Mark all bookings as having sent reminders
        reminder_key = f"practitioner_{hours_before}h_reminder_sent"
        for booking in bookings:
            booking.metadata[reminder_key] = timezone.now().isoformat()
            booking.save(update_fields=['metadata'])
        
        logger.info(f"Sent aggregated {hours_before}h reminder to practitioner {practitioner_id} for session {session_id} with {len(participants)} participants")
        return f"Sent aggregated reminder to {practitioner.user.email} for {len(participants)} participants"
        
    except Practitioner.DoesNotExist:
        logger.error(f"Practitioner {practitioner_id} not found")
        return f"Practitioner not found"
    except ServiceSession.DoesNotExist:
        logger.error(f"ServiceSession {session_id} not found")
        return f"Session not found"
    except Exception as e:
        logger.exception(f"Error sending aggregated reminder: {str(e)}")
        return f"Error: {str(e)}"