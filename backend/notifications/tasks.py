"""
Celery tasks for notifications.
"""
import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone

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
    
    try:
        booking = Booking.objects.select_related(
            'user', 
            'service__practitioner__user'
        ).get(id=booking_id)
        
        # Get current booking start time to pass to reminders
        booking_start_iso = booking.start_time.isoformat()
        
        # Schedule client reminders
        # 24-hour reminder
        reminder_time = booking.start_time - timedelta(hours=24)
        if reminder_time > timezone.now():
            send_booking_reminder.apply_async(
                args=[booking_id, 'client', 24, booking_start_iso],
                eta=reminder_time
            )
            logger.info(f"Scheduled 24h client reminder for booking {booking_id} at {reminder_time}")
        
        # 30-minute reminder
        reminder_time = booking.start_time - timedelta(minutes=30)
        if reminder_time > timezone.now():
            send_booking_reminder.apply_async(
                args=[booking_id, 'client', 0.5, booking_start_iso],
                eta=reminder_time
            )
            logger.info(f"Scheduled 30min client reminder for booking {booking_id} at {reminder_time}")
        
        # Schedule practitioner reminders
        # 24-hour reminder
        reminder_time = booking.start_datetime - timedelta(hours=24)
        if reminder_time > timezone.now():
            send_booking_reminder.apply_async(
                args=[booking_id, 'practitioner', 24, booking_start_iso],
                eta=reminder_time
            )
            logger.info(f"Scheduled 24h practitioner reminder for booking {booking_id} at {reminder_time}")
        
        # 30-minute reminder
        reminder_time = booking.start_time - timedelta(minutes=30)
        if reminder_time > timezone.now():
            send_booking_reminder.apply_async(
                args=[booking_id, 'practitioner', 0.5, booking_start_iso],
                eta=reminder_time
            )
            logger.info(f"Scheduled 30min practitioner reminder for booking {booking_id} at {reminder_time}")
            
    except Booking.DoesNotExist:
        logger.error(f"Booking {booking_id} not found")
    except Exception as e:
        logger.exception(f"Error scheduling booking reminders: {str(e)}")


@shared_task
def send_booking_reminder(booking_id: int, user_type: str, hours_before: float, expected_start_time: str):
    """
    Send a booking reminder with validation.
    
    Args:
        booking_id: ID of the booking
        user_type: 'client' or 'practitioner'
        hours_before: Hours before the appointment (24 or 0.5)
        expected_start_time: ISO format datetime string of when booking was originally scheduled
    """
    from bookings.models import Booking
    from django.utils.dateparse import parse_datetime
    
    try:
        booking = Booking.objects.select_related(
            'user',
            'service__practitioner__user',
            'service_session'
        ).get(id=booking_id)
        
        # Check if booking is still confirmed
        if booking.status != 'confirmed':
            logger.info(f"Skipping reminder for booking {booking_id} - status is {booking.status}")
            return f"Booking {booking_id} no longer confirmed, skipping {hours_before}h reminder"
        
        # Check if booking time hasn't changed
        expected_dt = parse_datetime(expected_start_time)
        if booking.start_time != expected_dt:
            logger.info(f"Skipping reminder for booking {booking_id} - time changed from {expected_start_time} to {booking.start_time}")
            return f"Booking {booking_id} rescheduled, skipping old {hours_before}h reminder"
        
        # Check if reminder already sent (stored in metadata)
        reminder_key = f"{user_type}_{hours_before}h_reminder_sent"
        if booking.metadata.get(reminder_key):
            logger.info(f"Skipping reminder for booking {booking_id} - {reminder_key} already sent")
            return f"Booking {booking_id} {hours_before}h reminder already sent"
        
        # Send the reminder
        if user_type == 'client':
            service = get_client_notification_service()
            service.send_booking_reminder(booking, int(hours_before))
        else:
            service = get_practitioner_notification_service()
            # TODO: Implement practitioner reminder
            logger.info(f"Practitioner reminder for booking {booking_id} - {hours_before}h before")
        
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