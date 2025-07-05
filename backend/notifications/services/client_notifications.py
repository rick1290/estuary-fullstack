"""
Client-specific notification services.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

from django.conf import settings
from django.utils import timezone

from .base import BaseNotificationService
from notifications.models import Notification

logger = logging.getLogger(__name__)


class ClientNotificationService(BaseNotificationService):
    """
    Handle all client-related notifications.
    """
    
    # Courier template IDs (to be configured in settings)
    TEMPLATES = {
        'welcome': 'COURIER_CLIENT_WELCOME_TEMPLATE',
        'email_verification': 'COURIER_CLIENT_EMAIL_VERIFICATION_TEMPLATE',
        'booking_confirmation': 'COURIER_CLIENT_BOOKING_CONFIRMATION_TEMPLATE',
        'payment_success': 'COURIER_CLIENT_PAYMENT_SUCCESS_TEMPLATE',
        'session_confirmation': 'COURIER_CLIENT_SESSION_CONFIRMATION_TEMPLATE',
        'reminder_24h': 'COURIER_CLIENT_REMINDER_24H_TEMPLATE',
        'reminder_30m': 'COURIER_CLIENT_REMINDER_30M_TEMPLATE',
        'booking_cancelled': 'COURIER_CLIENT_BOOKING_CANCELLED_TEMPLATE',
        'booking_rescheduled': 'COURIER_CLIENT_BOOKING_RESCHEDULED_TEMPLATE',
        'credit_purchase': 'COURIER_CLIENT_CREDIT_PURCHASE_TEMPLATE',
        'review_request': 'COURIER_CLIENT_REVIEW_REQUEST_TEMPLATE',
        'practitioner_message': 'COURIER_CLIENT_PRACTITIONER_MESSAGE_TEMPLATE',
    }
    
    def get_template_id(self, template_key: str) -> str:
        """Get template ID from settings."""
        setting_key = self.TEMPLATES.get(template_key)
        return getattr(settings, setting_key, None) if setting_key else None
    
    def send_welcome_email(self, user, verification_token: Optional[str] = None):
        """
        Send welcome email to new client.
        """
        if not self.should_send_notification(user, 'system', 'email'):
            return
        
        template_id = self.get_template_id('welcome')
        if not template_id:
            logger.warning("No welcome email template configured")
            return
        
        data = {
            'first_name': user.first_name or 'there',
            'verification_url': f"{settings.FRONTEND_URL}/verify-email?token={verification_token}" if verification_token else None,
            'browse_services_url': f"{settings.FRONTEND_URL}/marketplace",
            'profile_url': f"{settings.FRONTEND_URL}/dashboard/user/profile"
        }
        
        notification = self.create_notification_record(
            user=user,
            title="Welcome to Estuary!",
            message="Welcome to our wellness marketplace. Start exploring services and practitioners.",
            notification_type='system',
            delivery_channel='email'
        )
        
        return self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"welcome-{user.id}-{timezone.now().strftime('%Y%m%d')}"
        )
    
    def send_booking_confirmation(self, booking):
        """
        Send booking confirmation email.
        """
        user = booking.user
        if not self.should_send_notification(user, 'booking', 'email'):
            return
        
        template_id = self.get_template_id('booking_confirmation')
        if not template_id:
            logger.warning("No booking confirmation template configured")
            return
        
        service = booking.service
        practitioner = service.primary_practitioner
        
        # Format booking details
        booking_datetime = booking.start_time
        
        data = {
            'booking_id': str(booking.id),
            'service_name': service.name,
            'service_type': service.service_type,
            'practitioner_name': practitioner.user.get_full_name(),
            'practitioner_slug': practitioner.slug,
            'booking_date': booking_datetime.strftime('%A, %B %d, %Y'),
            'booking_time': booking_datetime.strftime('%I:%M %p'),
            'duration_minutes': service.duration_minutes,
            'location': booking.location.name if booking.location else ('Virtual' if booking.meeting_url else 'TBD'),
            'total_amount': f"${(booking.final_amount_cents or 0) / 100:.2f}",
            'credits_used': f"${(booking.discount_amount_cents or 0) / 100:.2f}" if booking.discount_amount_cents else None,
            'booking_url': f"{settings.FRONTEND_URL}/dashboard/user/bookings/{booking.id}",
            'add_to_calendar_url': self._generate_calendar_url(booking),
            'cancellation_policy_url': f"{settings.FRONTEND_URL}/policies/cancellation"
        }
        
        # Add session-specific details if applicable
        if booking.service_session:
            data['session_name'] = booking.service_session.title or f"Session {booking.service_session.sequence_number}" if booking.service_session.sequence_number else service.name
            data['session_number'] = booking.service_session.sequence_number
        
        notification = self.create_notification_record(
            user=user,
            title=f"Booking Confirmed: {service.name}",
            message=f"Your booking with {practitioner.user.get_full_name()} on {data['booking_date']} at {data['booking_time']} is confirmed.",
            notification_type='booking',
            delivery_channel='email',
            related_object_type='booking',
            related_object_id=str(booking.id)
        )
        
        # Send immediately
        self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"booking-confirmation-{booking.id}"
        )
        
        # Schedule reminders
        self._schedule_booking_reminders(booking)
    
    def send_payment_success(self, order):
        """
        Send payment success notification.
        """
        user = order.user
        if not self.should_send_notification(user, 'payment', 'email'):
            return
        
        template_id = self.get_template_id('payment_success')
        if not template_id:
            logger.warning("No payment success template configured")
            return
        
        # Get related booking if any
        booking = None
        if hasattr(order, 'bookings') and order.bookings.exists():
            booking = order.bookings.first()
        
        data = {
            'order_id': str(order.public_uuid),
            'amount': f"${order.total_amount:.2f}",
            'payment_method': order.get_payment_method_display(),
            'transaction_date': order.created_at.strftime('%B %d, %Y at %I:%M %p'),
            'receipt_url': order.metadata.get('stripe_receipt_url', ''),
            'invoice_url': f"{settings.FRONTEND_URL}/dashboard/user/invoices/{order.public_uuid}",
            'credits_applied': f"${(order.credits_applied_cents / 100):.2f}" if order.credits_applied_cents > 0 else None
        }
        
        # Add booking details if payment is for a booking
        if booking:
            data.update({
                'service_name': booking.service.name,
                'practitioner_name': booking.service.primary_practitioner.user.get_full_name() if booking.service.primary_practitioner else 'Unknown',
                'booking_date': booking.start_time.strftime('%A, %B %d, %Y') if booking.start_time else '',
                'booking_time': booking.start_time.strftime('%I:%M %p') if booking.start_time else ''
            })
        elif order.service:
            # For service orders without booking
            data.update({
                'service_name': order.service.name,
                'practitioner_name': order.service.primary_practitioner.user.get_full_name() if order.service.primary_practitioner else 'Unknown'
            })
        
        notification = self.create_notification_record(
            user=user,
            title="Payment Successful",
            message=f"Your payment of {data['amount']} has been processed successfully.",
            notification_type='payment',
            delivery_channel='email',
            related_object_type='order',
            related_object_id=str(order.public_uuid)
        )
        
        return self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"payment-success-{order.public_uuid}"
        )
    
    def send_booking_reminder(self, booking, hours_before: int):
        """
        Send booking reminder (24h or 30min before).
        """
        user = booking.user
        if not self.should_send_notification(user, 'reminder', 'email'):
            return
        
        template_key = 'reminder_24h' if hours_before == 24 else 'reminder_30m'
        template_id = self.get_template_id(template_key)
        if not template_id:
            logger.warning(f"No {template_key} template configured")
            return
        
        service = booking.service
        practitioner = service.primary_practitioner
        
        # Calculate time until booking
        time_until = booking.start_time - timezone.now()
        
        data = {
            'booking_id': str(booking.id),
            'service_name': service.name,
            'practitioner_name': practitioner.user.get_full_name(),
            'booking_date': booking.start_time.strftime('%A, %B %d, %Y'),
            'booking_time': booking.start_time.strftime('%I:%M %p'),
            'duration_minutes': service.duration_minutes,
            'location': booking.location.name if booking.location else ('Virtual' if booking.meeting_url else 'TBD'),
            'hours_until': hours_before,
            'time_until_human': self._format_time_until(time_until),
            'booking_url': f"{settings.FRONTEND_URL}/dashboard/user/bookings/{booking.id}",
            'reschedule_url': f"{settings.FRONTEND_URL}/dashboard/user/bookings/{booking.id}/reschedule",
            'practitioner_contact': practitioner.user.email
        }
        
        # Add video conference details if applicable
        if booking.meeting_url:
            data['video_room_url'] = booking.meeting_url
            data['video_instructions'] = "Click the link above to join your video session"
        
        title = f"Reminder: {service.name} in {hours_before} {'hours' if hours_before > 1 else 'hour'}"
        message = f"Your session with {practitioner.user.get_full_name()} is coming up on {data['booking_date']} at {data['booking_time']}."
        
        notification = self.create_notification_record(
            user=user,
            title=title,
            message=message,
            notification_type='reminder',
            delivery_channel='email',
            related_object_type='booking',
            related_object_id=str(booking.id)
        )
        
        return self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"booking-reminder-{booking.id}-{hours_before}h"
        )
    
    def _schedule_booking_reminders(self, booking):
        """
        Schedule reminder notifications for a booking.
        """
        # Check if this is a course booking
        if booking.service.service_type.code == 'course':
            self._schedule_course_reminders(booking)
        else:
            # Standard reminders for sessions, workshops, packages
            self._schedule_standard_reminders(booking)
    
    def _schedule_standard_reminders(self, booking):
        """
        Schedule standard reminders for sessions, workshops, and packages.
        """
        # 24-hour reminder
        reminder_24h = booking.start_time - timedelta(hours=24)
        if reminder_24h > timezone.now():
            self.schedule_notification(
                user=booking.user,
                notification_type='reminder',
                delivery_channel='email',
                scheduled_for=reminder_24h,
                template_id=self.get_template_id('reminder_24h'),
                data={},  # Will be populated when sent
                title=f"Reminder: {booking.service.name} tomorrow",
                message=f"Your booking is scheduled for tomorrow",
                related_object_type='booking',
                related_object_id=str(booking.id)
            )
        
        # 30-minute reminder
        reminder_30m = booking.start_time - timedelta(minutes=30)
        if reminder_30m > timezone.now():
            self.schedule_notification(
                user=booking.user,
                notification_type='reminder',
                delivery_channel='email',
                scheduled_for=reminder_30m,
                template_id=self.get_template_id('reminder_30m'),
                data={},  # Will be populated when sent
                title=f"Starting soon: {booking.service.name}",
                message=f"Your booking starts in 30 minutes",
                related_object_type='booking',
                related_object_id=str(booking.id)
            )
    
    def _schedule_course_reminders(self, booking):
        """
        Schedule reminders for all sessions in a course.
        """
        from services.models import ServiceSession
        from notifications.tasks import send_booking_reminder
        
        # Get all future sessions for this course
        course_sessions = ServiceSession.objects.filter(
            service=booking.service,
            start_time__gte=timezone.now()
        ).order_by('sequence_number', 'start_time')
        
        logger.info(f"Scheduling reminders for {course_sessions.count()} course sessions for booking {booking.id}")
        
        for session in course_sessions:
            # 24-hour reminder
            reminder_24h = session.start_time - timedelta(hours=24)
            if reminder_24h > timezone.now():
                send_booking_reminder.apply_async(
                    args=[booking.id, 'client', 24, session.start_time.isoformat(), session.id],
                    eta=reminder_24h
                )
                logger.info(f"Scheduled 24h reminder for course session {session.id} at {reminder_24h}")
            
            # 30-minute reminder
            reminder_30m = session.start_time - timedelta(minutes=30)
            if reminder_30m > timezone.now():
                send_booking_reminder.apply_async(
                    args=[booking.id, 'client', 0.5, session.start_time.isoformat(), session.id],
                    eta=reminder_30m
                )
                logger.info(f"Scheduled 30min reminder for course session {session.id} at {reminder_30m}")
    
    def send_course_session_reminder(self, booking, session, hours_before):
        """
        Send course session-specific reminder.
        """
        user = booking.user
        if not self.should_send_notification(user, 'reminder', 'email'):
            return
        
        template_key = 'reminder_24h' if hours_before == 24 else 'reminder_30m'
        template_id = self.get_template_id(template_key)
        if not template_id:
            logger.warning(f"No {template_key} template configured")
            return
        
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
            'hours_until': hours_before,
            'booking_url': f"{settings.FRONTEND_URL}/dashboard/user/bookings/{booking.id}",
            'session_url': f"{settings.FRONTEND_URL}/dashboard/user/sessions/{session.id}",
            'is_course_session': True
        }
        
        title = f"Reminder: {service.name} - Session {session.sequence_number} in {hours_before} {'hours' if hours_before > 1 else 'hour'}"
        message = f"Session {session.sequence_number} of your course starts at {data['session_time']}"
        
        notification = self.create_notification_record(
            user=user,
            title=title,
            message=message,
            notification_type='reminder',
            delivery_channel='email',
            related_object_type='service_session',
            related_object_id=str(session.id)
        )
        
        return self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"course-reminder-{booking.id}-session-{session.id}-{hours_before}h"
        )
    
    def _generate_calendar_url(self, booking):
        """
        Generate calendar URL for the booking.
        """
        # Implement calendar URL generation (Google Calendar, iCal, etc.)
        # This is a placeholder
        return f"{settings.FRONTEND_URL}/calendar/add?booking={booking.id}"
    
    def _format_time_until(self, timedelta_obj):
        """
        Format timedelta to human-readable string.
        """
        total_seconds = int(timedelta_obj.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        
        if hours > 24:
            days = hours // 24
            return f"{days} day{'s' if days > 1 else ''}"
        elif hours > 0:
            return f"{hours} hour{'s' if hours > 1 else ''}"
        else:
            return f"{minutes} minute{'s' if minutes > 1 else ''}"