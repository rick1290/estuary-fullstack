"""
Celery tasks for notifications.
"""
import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from django.conf import settings

from notifications.models import Notification
from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)

logger = logging.getLogger(__name__)


@shared_task
def test_celery():
    """Simple test task to verify Celery is working."""
    logger.info("Test Celery task executed successfully!")
    return "Celery is working!"


@shared_task
def process_scheduled_notifications():
    """
    Process all scheduled notifications that are due.
    Run this every minute via Celery Beat.
    """
    now = timezone.now()
    
    # Get all pending notifications scheduled for now or earlier
    notifications = Notification.objects.filter(
        status='pending',
        scheduled_for__lte=now
    ).select_related('user')
    
    for notification in notifications:
        try:
            send_scheduled_notification.delay(notification.id)
        except Exception as e:
            logger.error(f"Error queuing notification {notification.id}: {str(e)}")


@shared_task
def send_scheduled_notification(notification_id: int):
    """
    Send a single scheduled notification.
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        
        # Check if already sent or cancelled
        if notification.status in ['sent', 'cancelled']:
            return
        
        # Determine service based on user type
        user = notification.user
        if hasattr(user, 'practitioner_profile') and notification.metadata.get('is_practitioner_notification'):
            service = get_practitioner_notification_service()
        else:
            service = get_client_notification_service()
        
        # Check user preferences
        if not service.should_send_notification(
            user,
            notification.notification_type,
            notification.delivery_channel
        ):
            notification.status = 'cancelled'
            notification.metadata['reason'] = 'User preference'
            notification.save()
            return
        
        # Send based on delivery channel
        if notification.delivery_channel == 'email':
            template_id = notification.metadata.get('template_id')
            data = notification.metadata.get('template_data', {})
            
            response = service.send_email_notification(
                user=user,
                template_id=template_id,
                data=data,
                notification=notification
            )
            
            if 'error' not in response:
                notification.status = 'sent'
                notification.sent_at = timezone.now()
            else:
                notification.status = 'failed'
                notification.metadata['error'] = response['error']
        
        elif notification.delivery_channel == 'in_app':
            # In-app notifications are already created, just mark as sent
            notification.status = 'sent'
            notification.sent_at = timezone.now()
            
            # Send WebSocket notification if user is online
            send_websocket_notification.delay(notification.id)
        
        # Add support for SMS and push notifications here
        
        notification.save()
        
    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found")
    except Exception as e:
        logger.exception(f"Error sending notification {notification_id}: {str(e)}")
        try:
            notification = Notification.objects.get(id=notification_id)
            notification.status = 'failed'
            notification.metadata['error'] = str(e)
            notification.save()
        except:
            pass


@shared_task
def send_websocket_notification(notification_id: int):
    """
    Send real-time notification via WebSocket.
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        notification = Notification.objects.get(id=notification_id)
        channel_layer = get_channel_layer()
        
        # Send to user's notification channel
        async_to_sync(channel_layer.group_send)(
            f"notifications_{notification.user.id}",
            {
                "type": "notification.new",
                "notification": {
                    "id": str(notification.id),
                    "title": notification.title,
                    "message": notification.message,
                    "notification_type": notification.notification_type,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat(),
                    "related_object_type": notification.related_object_type,
                    "related_object_id": notification.related_object_id,
                }
            }
        )
    except Exception as e:
        logger.error(f"Error sending WebSocket notification: {str(e)}")


@shared_task
def cleanup_old_notifications():
    """
    Clean up old read notifications.
    Run daily via Celery Beat.
    """
    # Delete read notifications older than 30 days
    cutoff_date = timezone.now() - timedelta(days=30)
    
    deleted_count = Notification.objects.filter(
        is_read=True,
        created_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Deleted {deleted_count} old read notifications")
    
    # Delete failed notifications older than 7 days
    cutoff_date = timezone.now() - timedelta(days=7)
    
    deleted_count = Notification.objects.filter(
        status='failed',
        created_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Deleted {deleted_count} old failed notifications")


@shared_task
def send_practitioner_earnings_summaries():
    """
    Send weekly earnings summaries to practitioners.
    Run weekly via Celery Beat (e.g., Monday mornings).
    """
    from practitioners.models import Practitioner
    
    service = get_practitioner_notification_service()
    
    # Get all active practitioners
    practitioners = Practitioner.objects.filter(
        is_active=True,
        user__is_active=True
    ).select_related('user')
    
    for practitioner in practitioners:
        try:
            service.send_earnings_summary(practitioner, period='weekly')
        except Exception as e:
            logger.error(f"Error sending earnings summary to practitioner {practitioner.id}: {str(e)}")


# Booking-related tasks
@shared_task
def schedule_booking_reminders(booking_id: int):
    """
    Schedule reminder notifications for a booking.
    Called when a booking is confirmed.
    """
    from bookings.models import Booking
    from services.models import ServiceSession
    
    try:
        booking = Booking.objects.select_related(
            'user', 
            'service__service_type',
            'service__primary_practitioner__user',
            'practitioner'
        ).get(id=booking_id)
        
        # Check if this is a course
        if booking.service.service_type.code == 'course':
            # For courses, schedule reminders for each session
            schedule_course_session_reminders(booking)
        else:
            # For other service types, schedule standard reminders
            schedule_standard_booking_reminders(booking)
            
    except Booking.DoesNotExist:
        logger.error(f"Booking {booking_id} not found")
    except Exception as e:
        logger.exception(f"Error scheduling booking reminders: {str(e)}")


def schedule_standard_booking_reminders(booking):
    """
    Schedule standard reminders for non-course bookings.
    """
    booking_start_iso = booking.start_time.isoformat()
    
    # Schedule client reminders
    # 24-hour reminder
    reminder_time = booking.start_time - timedelta(hours=24)
    if reminder_time > timezone.now():
        send_booking_reminder.apply_async(
            args=[booking.id, 'client', 24, booking_start_iso],
            eta=reminder_time
        )
        logger.info(f"Scheduled 24h client reminder for booking {booking.id} at {reminder_time}")
    
    # 30-minute reminder
    reminder_time = booking.start_time - timedelta(minutes=30)
    if reminder_time > timezone.now():
        send_booking_reminder.apply_async(
            args=[booking.id, 'client', 0.5, booking_start_iso],
            eta=reminder_time
        )
        logger.info(f"Scheduled 30min client reminder for booking {booking.id} at {reminder_time}")
    
    # Schedule practitioner reminders
    # For workshops, these will be aggregated by send_booking_reminder
    # 24-hour reminder
    reminder_time = booking.start_time - timedelta(hours=24)
    if reminder_time > timezone.now():
        send_booking_reminder.apply_async(
            args=[booking.id, 'practitioner', 24, booking_start_iso],
            eta=reminder_time
        )
        logger.info(f"Scheduled 24h practitioner reminder for booking {booking.id} at {reminder_time}")
    
    # 30-minute reminder
    reminder_time = booking.start_time - timedelta(minutes=30)
    if reminder_time > timezone.now():
        send_booking_reminder.apply_async(
            args=[booking.id, 'practitioner', 0.5, booking_start_iso],
            eta=reminder_time
        )
        logger.info(f"Scheduled 30min practitioner reminder for booking {booking.id} at {reminder_time}")


def schedule_course_session_reminders(booking):
    """
    Schedule reminders for all sessions in a course.
    """
    from services.models import ServiceSession
    
    # Get all future sessions for this course
    sessions = ServiceSession.objects.filter(
        service=booking.service,
        start_time__gte=timezone.now()
    ).order_by('sequence_number', 'start_time')
    
    logger.info(f"Scheduling reminders for {sessions.count()} course sessions for booking {booking.id}")
    
    for session in sessions:
        session_start_iso = session.start_time.isoformat()
        
        # Client reminders for each session
        # 24-hour reminder
        reminder_time = session.start_time - timedelta(hours=24)
        if reminder_time > timezone.now():
            send_booking_reminder.apply_async(
                args=[booking.id, 'client', 24, session_start_iso, session.id],
                eta=reminder_time
            )
            logger.info(f"Scheduled 24h client reminder for course session {session.id}")
        
        # 30-minute reminder
        reminder_time = session.start_time - timedelta(minutes=30)
        if reminder_time > timezone.now():
            send_booking_reminder.apply_async(
                args=[booking.id, 'client', 0.5, session_start_iso, session.id],
                eta=reminder_time
            )
            logger.info(f"Scheduled 30min client reminder for course session {session.id}")
        
        # Practitioner reminders (will be aggregated)
        # 24-hour reminder
        reminder_time = session.start_time - timedelta(hours=24)
        if reminder_time > timezone.now():
            send_booking_reminder.apply_async(
                args=[booking.id, 'practitioner', 24, session_start_iso, session.id],
                eta=reminder_time
            )
            logger.info(f"Scheduled 24h practitioner reminder for course session {session.id}")
        
        # 30-minute reminder
        reminder_time = session.start_time - timedelta(minutes=30)
        if reminder_time > timezone.now():
            send_booking_reminder.apply_async(
                args=[booking.id, 'practitioner', 0.5, session_start_iso, session.id],
                eta=reminder_time
            )
            logger.info(f"Scheduled 30min practitioner reminder for course session {session.id}")


@shared_task
def send_booking_reminder(booking_id: int, user_type: str, hours_before: float, expected_start_time: str, session_id: int = None):
    """
    Send a booking reminder with validation.
    
    Args:
        booking_id: ID of the booking
        user_type: 'client' or 'practitioner'
        hours_before: Hours before the appointment (24 or 0.5)
        expected_start_time: ISO format datetime string of when booking was originally scheduled
        session_id: Optional ServiceSession ID for course sessions
    """
    from bookings.models import Booking
    from services.models import ServiceSession
    from django.utils.dateparse import parse_datetime
    from django.core.cache import cache
    
    try:
        booking = Booking.objects.select_related(
            'user',
            'service__service_type',
            'service__primary_practitioner__user',
            'service_session',
            'practitioner'
        ).get(id=booking_id)
        
        # If session_id provided, get the specific session
        session = None
        if session_id:
            try:
                session = ServiceSession.objects.get(id=session_id)
                expected_dt = session.start_time
            except ServiceSession.DoesNotExist:
                logger.error(f"ServiceSession {session_id} not found")
                return f"ServiceSession {session_id} not found"
        else:
            expected_dt = parse_datetime(expected_start_time)
            session = booking.service_session
        
        # Check if booking is still confirmed
        if booking.status != 'confirmed':
            logger.info(f"Skipping reminder for booking {booking_id} - status is {booking.status}")
            return f"Booking {booking_id} no longer confirmed, skipping {hours_before}h reminder"
        
        # For non-session reminders, check if booking time hasn't changed
        if not session_id and booking.start_time != expected_dt:
            logger.info(f"Skipping reminder for booking {booking_id} - time changed")
            return f"Booking {booking_id} rescheduled, skipping old {hours_before}h reminder"
        
        # Check if reminder already sent (stored in metadata)
        if session_id:
            reminder_key = f"{user_type}_session_{session_id}_{hours_before}h_reminder_sent"
        else:
            reminder_key = f"{user_type}_{hours_before}h_reminder_sent"
            
        if booking.metadata.get(reminder_key):
            logger.info(f"Skipping reminder for booking {booking_id} - {reminder_key} already sent")
            return f"Booking {booking_id} {hours_before}h reminder already sent"
        
        # For practitioners with workshops/courses, check if we should aggregate
        if (user_type == 'practitioner' and 
            booking.service.service_type.code in ['workshop', 'course'] and
            (session or booking.service_session)):
            
            # Use the session that's relevant for this reminder
            reminder_session = session or booking.service_session
            
            # Create cache key for this practitioner/session/time combination
            cache_key = f"reminder:practitioner:{booking.practitioner_id}:session:{reminder_session.id}:{hours_before}h"
            
            # Check if we already sent an aggregated reminder
            if cache.get(cache_key):
                logger.info(f"Aggregated reminder already sent for practitioner {booking.practitioner_id}, session {reminder_session.id}")
                # Still mark this booking as having received the reminder
                booking.metadata[reminder_key] = timezone.now().isoformat()
                booking.save(update_fields=['metadata'])
                return f"Aggregated reminder already sent"
            
            # Send aggregated reminder
            send_practitioner_aggregated_reminder.delay(
                practitioner_id=booking.practitioner_id,
                session_id=reminder_session.id,
                hours_before=hours_before
            )
            
            # Mark in cache (expires after the event)
            cache.set(cache_key, True, timeout=int(hours_before * 3600 + 3600))  # Extra hour buffer
            
            # Mark this booking as reminded
            booking.metadata[reminder_key] = timezone.now().isoformat()
            booking.save(update_fields=['metadata'])
            
            return f"Sent aggregated {hours_before}h reminder for session {reminder_session.id}"
        
        # Send individual reminder
        if user_type == 'client':
            service = get_client_notification_service()
            if session_id:
                # For course sessions, send session-specific reminder
                service.send_course_session_reminder(booking, session, int(hours_before))
            else:
                service.send_booking_reminder(booking, int(hours_before))
        else:
            # Individual practitioner reminder for sessions
            service = get_practitioner_notification_service()
            service.send_booking_reminder(booking, int(hours_before))
        
        # Mark reminder as sent
        booking.metadata[reminder_key] = timezone.now().isoformat()
        booking.save(update_fields=['metadata'])
        
        logger.info(f"Successfully sent {hours_before}h {user_type} reminder for booking {booking_id}")
        return f"Sent {hours_before}h reminder for booking {booking_id}"
            
    except Booking.DoesNotExist:
        logger.error(f"Booking {booking_id} not found")
        return f"Booking {booking_id} not found"
    except Exception as e:
        logger.exception(f"Error sending booking reminder: {str(e)}")
        return f"Error sending reminder: {str(e)}"


@shared_task
def handle_booking_reschedule(booking_id: int, old_start_time: str, new_start_time: str):
    """
    Handle rescheduling of booking reminders.
    This should be called when a booking is rescheduled.
    
    Args:
        booking_id: ID of the booking
        old_start_time: ISO format datetime string of previous start time
        new_start_time: ISO format datetime string of new start time
    """
    from bookings.models import Booking
    from django.utils.dateparse import parse_datetime
    
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Clear old reminder sent flags
        reminder_keys = [
            'client_24h_reminder_sent',
            'client_0.5h_reminder_sent',
            'practitioner_24h_reminder_sent',
            'practitioner_0.5h_reminder_sent'
        ]
        
        for key in reminder_keys:
            if key in booking.metadata:
                del booking.metadata[key]
        
        booking.save(update_fields=['metadata'])
        
        # Schedule new reminders if booking is still confirmed
        if booking.status == 'confirmed':
            schedule_booking_reminders.delay(booking_id)
            logger.info(f"Rescheduled reminders for booking {booking_id} from {old_start_time} to {new_start_time}")
        
        return f"Successfully rescheduled reminders for booking {booking_id}"
        
    except Booking.DoesNotExist:
        logger.error(f"Booking {booking_id} not found")
        return f"Booking {booking_id} not found"
    except Exception as e:
        logger.exception(f"Error handling booking reschedule: {str(e)}")
        return f"Error rescheduling: {str(e)}"


@shared_task
def send_practitioner_profile_nudge(notification_id: int):
    """
    Send profile incomplete nudge if profile is still incomplete.
    """
    from practitioners.models import Practitioner
    
    try:
        notification = Notification.objects.get(id=notification_id)
        practitioner = Practitioner.objects.get(user=notification.user)
        
        # Check if profile is complete
        profile_complete = all([
            practitioner.bio,
            practitioner.professional_title,
            practitioner.years_of_experience,
            practitioner.profile_image_url,
            practitioner.specializations.exists() or practitioner.certifications.exists()
        ])
        
        if profile_complete:
            # Profile is now complete, cancel the notification
            notification.status = 'cancelled'
            notification.metadata['reason'] = 'Profile completed'
            notification.save()
            logger.info(f"Cancelled profile nudge for {practitioner.user.email} - profile is complete")
            return "Profile complete, nudge cancelled"
        
        # Send the nudge
        service = get_practitioner_notification_service()
        service.send_email_notification(
            user=notification.user,
            template_id=notification.metadata.get('template_id'),
            data={
                'first_name': practitioner.user.first_name or 'there',
                'profile_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/profile",
                'missing_fields': [
                    field for field, label in [
                        ('bio', 'Professional Bio'),
                        ('professional_title', 'Professional Title'),
                        ('years_of_experience', 'Years of Experience'),
                        ('profile_image_url', 'Profile Image')
                    ]
                    if not getattr(practitioner, field)
                ] + (
                    ['Specializations or Certifications'] 
                    if not (practitioner.specializations.exists() or practitioner.certifications.exists())
                    else []
                )
            },
            notification=notification
        )
        
        notification.status = 'sent'
        notification.sent_at = timezone.now()
        notification.save()
        
        logger.info(f"Sent profile incomplete nudge to {practitioner.user.email}")
        return "Profile nudge sent"
        
    except Exception as e:
        logger.error(f"Error sending profile nudge: {str(e)}")
        return f"Error: {str(e)}"


@shared_task
def send_practitioner_services_nudge(notification_id: int):
    """
    Send no services nudge if practitioner still has no services.
    """
    from practitioners.models import Practitioner
    from services.models import Service
    
    try:
        notification = Notification.objects.get(id=notification_id)
        practitioner = Practitioner.objects.get(user=notification.user)
        
        # Check if practitioner has created any services
        has_services = Service.objects.filter(primary_practitioner=practitioner).exists()
        
        if has_services:
            # Services exist, cancel the notification
            notification.status = 'cancelled'
            notification.metadata['reason'] = 'Services created'
            notification.save()
            logger.info(f"Cancelled services nudge for {practitioner.user.email} - services exist")
            return "Services exist, nudge cancelled"
        
        # Send the nudge
        service = get_practitioner_notification_service()
        service.send_email_notification(
            user=notification.user,
            template_id=notification.metadata.get('template_id'),
            data={
                'first_name': practitioner.user.first_name or 'there',
                'create_service_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/services/new",
                'service_ideas': [
                    "One-on-one coaching sessions",
                    "Group workshops",
                    "Online courses",
                    "Wellness packages"
                ]
            },
            notification=notification
        )
        
        notification.status = 'sent'
        notification.sent_at = timezone.now()
        notification.save()
        
        logger.info(f"Sent no services nudge to {practitioner.user.email}")
        return "Services nudge sent"
        
    except Exception as e:
        logger.error(f"Error sending services nudge: {str(e)}")
        return f"Error: {str(e)}"


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
    from services.models import ServiceSession
    from bookings.models import Booking
    
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
    from services.models import ServiceSession
    from bookings.models import Booking
    from django.utils.dateparse import parse_datetime
    
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
                
                # Reschedule reminders
                schedule_booking_reminders.delay(booking.id)
                
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
    from bookings.models import Booking
    from django.utils.dateparse import parse_datetime
    
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
    from services.models import ServiceSession
    from django.utils.dateparse import parse_datetime
    
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