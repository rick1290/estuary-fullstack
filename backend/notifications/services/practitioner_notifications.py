"""
Practitioner-specific notification services.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from .base import BaseNotificationService
from notifications.models import Notification

logger = logging.getLogger(__name__)


class PractitionerNotificationService(BaseNotificationService):
    """
    Handle all practitioner-related notifications.
    """
    
    # Courier template IDs (to be configured in settings)
    TEMPLATES = {
        'welcome': 'COURIER_PRACTITIONER_WELCOME_TEMPLATE',
        'profile_incomplete': 'COURIER_PRACTITIONER_PROFILE_INCOMPLETE_TEMPLATE',
        'no_services': 'COURIER_PRACTITIONER_NO_SERVICES_TEMPLATE',
        'service_created': 'COURIER_PRACTITIONER_SERVICE_CREATED_TEMPLATE',
        'bundle_created': 'COURIER_PRACTITIONER_BUNDLE_CREATED_TEMPLATE',
        'booking_received': 'COURIER_PRACTITIONER_BOOKING_RECEIVED_TEMPLATE',
        'booking_cancelled': 'COURIER_PRACTITIONER_BOOKING_CANCELLED_TEMPLATE',
        'booking_rescheduled': 'COURIER_PRACTITIONER_BOOKING_RESCHEDULED_TEMPLATE',
        'payout_completed': 'COURIER_PRACTITIONER_PAYOUT_COMPLETED_TEMPLATE',
        'reminder_24h': 'COURIER_PRACTITIONER_REMINDER_24H_TEMPLATE',
        'reminder_30m': 'COURIER_PRACTITIONER_REMINDER_30M_TEMPLATE',
        'new_review': 'COURIER_PRACTITIONER_NEW_REVIEW_TEMPLATE',
        'earnings_summary': 'COURIER_PRACTITIONER_EARNINGS_SUMMARY_TEMPLATE',
        'client_message': 'COURIER_PRACTITIONER_CLIENT_MESSAGE_TEMPLATE',
        'verification_approved': 'COURIER_PRACTITIONER_VERIFICATION_APPROVED_TEMPLATE',
        'verification_rejected': 'COURIER_PRACTITIONER_VERIFICATION_REJECTED_TEMPLATE',
    }
    
    def get_template_id(self, template_key: str) -> str:
        """Get template ID from settings."""
        setting_key = self.TEMPLATES.get(template_key)
        return getattr(settings, setting_key, None) if setting_key else None
    
    def send_welcome_email(self, practitioner):
        """
        Send welcome email to new practitioner.
        """
        user = practitioner.user
        if not self.should_send_notification(user, 'system', 'email'):
            return
        
        template_id = self.get_template_id('welcome')
        if not template_id:
            logger.warning("No practitioner welcome template configured")
            return
        
        data = {
            'first_name': user.first_name or 'there',
            'practitioner_name': practitioner.display_name or user.get_full_name(),
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard/practitioner",
            'profile_setup_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/profile",
            'create_service_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/services/new",
            'help_center_url': f"{settings.FRONTEND_URL}/help/practitioner",
            'commission_rate': 15.0,  # Default commission rate - TODO: Get from subscription tier
            'onboarding_checklist': [
                'Complete your profile',
                'Add your availability schedule',
                'Create your first service',
                'Set up payment information',
                'Get verified (optional but recommended)'
            ]
        }
        
        notification = self.create_notification_record(
            user=user,
            title="Welcome to Estuary as a Practitioner!",
            message="Welcome! Let's get your practitioner profile set up.",
            notification_type='system',
            delivery_channel='email'
        )
        
        # Send welcome email
        self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"practitioner-welcome-{practitioner.id}"
        )
        
        # Schedule follow-up nudges
        self._schedule_onboarding_nudges(practitioner)
    
    def send_booking_notification(self, booking):
        """
        Send new booking notification to practitioner.
        """
        practitioner = booking.service.primary_practitioner
        if not practitioner:
            logger.warning(f"No primary practitioner for service {booking.service.id}")
            return
            
        user = practitioner.user
        logger.info(f"Sending booking notification to practitioner {user.email} for booking {booking.id}")
        
        if not self.should_send_notification(user, 'booking', 'email'):
            logger.warning(f"Practitioner {user.email} has disabled booking notifications")
            return
        
        template_id = self.get_template_id('booking_received')
        if not template_id:
            logger.warning("No booking received template configured")
            return
        
        logger.info(f"Using template {template_id} for practitioner booking notification")
        
        client = booking.user
        service = booking.service
        
        # Calculate earnings - convert cents to dollars
        gross_amount_cents = booking.final_amount_cents or 0
        gross_amount = Decimal(str(gross_amount_cents / 100.0))
        # TODO: Get commission rate from subscription tier
        commission_rate = Decimal('15.0')  # Default 15%
        commission_amount = gross_amount * commission_rate / Decimal('100')
        net_earnings = gross_amount - commission_amount
        
        # Check if booking has a video room
        video_room_url = None
        if hasattr(booking, 'livekit_room') and booking.livekit_room:
            video_room_url = f"{settings.FRONTEND_URL}/room/{booking.livekit_room.public_uuid}"
        elif booking.service_session and hasattr(booking.service_session, 'livekit_room') and booking.service_session.livekit_room:
            video_room_url = f"{settings.FRONTEND_URL}/room/{booking.service_session.livekit_room.public_uuid}"
        
        data = {
            'booking_id': str(booking.id),
            'client_name': client.get_full_name(),
            'client_email': client.email,
            'service_name': service.name,
            'service_type': service.service_type.name if service.service_type else 'Service',
            'booking_date': booking.start_time.strftime('%A, %B %d, %Y'),
            'booking_time': booking.start_time.strftime('%I:%M %p'),
            'duration_minutes': service.duration_minutes,
            'location': booking.location.name if booking.location else ('Virtual' if booking.meeting_url else 'TBD'),
            'gross_amount': f"${gross_amount:.2f}",
            'commission_amount': f"${commission_amount:.2f}",
            'net_earnings': f"${net_earnings:.2f}",
            'commission_rate': 15.0,  # Default commission rate - TODO: Get from subscription tier
            'booking_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/bookings/{booking.id}",
            'client_profile_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/clients/{client.id}",
            'calendar_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/calendar",
            'message_client_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/messages/new?recipient={client.id}",
            'video_room_url': video_room_url,
            'has_video_room': bool(video_room_url)
        }
        
        # Add session details if applicable
        if booking.service_session:
            data['session_name'] = booking.service_session.title or f"Session {booking.service_session.sequence_number}" if booking.service_session.sequence_number else service.name
            data['session_number'] = booking.service_session.sequence_number
        
        # Add client notes if any
        if booking.client_notes:
            data['client_notes'] = booking.client_notes
        
        notification = self.create_notification_record(
            user=user,
            title=f"New Booking: {service.name}",
            message=f"{client.get_full_name()} has booked your {service.name} for {data['booking_date']} at {data['booking_time']}.",
            notification_type='booking',
            delivery_channel='email',
            related_object_type='booking',
            related_object_id=str(booking.id)
        )
        
        # Send immediately
        result = self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"practitioner-booking-{booking.id}"
        )
        
        if result and 'error' not in result:
            logger.info(f"Successfully sent booking notification to practitioner {user.email}")
        else:
            logger.error(f"Failed to send booking notification to practitioner {user.email}: {result}")
        
        # Schedule reminders
        self._schedule_practitioner_reminders(booking)
    
    def send_payout_confirmation(self, payout):
        """
        Send payout confirmation to practitioner.
        """
        practitioner = payout.practitioner
        user = practitioner.user
        
        if not self.should_send_notification(user, 'payment', 'email'):
            return
        
        template_id = self.get_template_id('payout_completed')
        if not template_id:
            logger.warning("No payout confirmation template configured")
            return
        
        data = {
            'payout_id': str(payout.id),
            'amount': f"${payout.amount:.2f}",
            'payout_method': payout.get_payout_method_display(),
            'bank_last4': payout.bank_account_last4,
            'initiated_date': payout.created_at.strftime('%B %d, %Y'),
            'expected_arrival': (payout.created_at + timedelta(days=2)).strftime('%B %d, %Y'),
            'stripe_transfer_id': payout.stripe_transfer_id,
            'earnings_period': f"{payout.period_start.strftime('%b %d')} - {payout.period_end.strftime('%b %d, %Y')}",
            'transaction_count': payout.transaction_count,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/finances/payouts/{payout.id}",
            'earnings_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/finances/earnings"
        }
        
        notification = self.create_notification_record(
            user=user,
            title="Payout Initiated",
            message=f"Your payout of {data['amount']} has been initiated and should arrive by {data['expected_arrival']}.",
            notification_type='payment',
            delivery_channel='email',
            related_object_type='payout',
            related_object_id=str(payout.id)
        )
        
        return self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"payout-confirmation-{payout.id}"
        )
    
    def send_booking_cancelled(self, booking, cancelled_by, reason=None):
        """
        Send booking cancellation notification to practitioner.
        """
        practitioner = booking.service.primary_practitioner
        user = practitioner.user
        
        if not self.should_send_notification(user, 'booking', 'email'):
            return
        
        template_id = self.get_template_id('booking_cancelled')
        if not template_id:
            logger.warning("No booking cancelled template configured")
            return
        
        client = booking.user
        service = booking.service
        
        # Calculate lost earnings
        gross_amount = booking.total_amount
        # TODO: Get commission rate from subscription tier
        commission_rate = Decimal('15.0')  # Default 15%
        commission_amount = gross_amount * commission_rate / 100
        lost_earnings = gross_amount - commission_amount
        
        data = {
            'booking_id': str(booking.id),
            'client_name': client.get_full_name(),
            'service_name': service.name,
            'original_date': booking.start_datetime.strftime('%A, %B %d, %Y'),
            'original_time': booking.start_datetime.strftime('%I:%M %p'),
            'cancelled_by': 'Client' if cancelled_by == client else 'System',
            'cancellation_reason': reason or 'No reason provided',
            'lost_earnings': f"${lost_earnings:.2f}",
            'time_until_booking': self._format_time_until(booking.start_datetime - timezone.now()),
            'calendar_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/calendar",
            'rebooking_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/availability"
        }
        
        notification = self.create_notification_record(
            user=user,
            title=f"Booking Cancelled: {service.name}",
            message=f"{client.get_full_name()} has cancelled their booking for {data['original_date']} at {data['original_time']}.",
            notification_type='booking',
            delivery_channel='email',
            related_object_type='booking',
            related_object_id=str(booking.id)
        )
        
        return self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"booking-cancelled-{booking.id}"
        )
    
    def send_earnings_summary(self, practitioner, period='weekly'):
        """
        Send earnings summary to practitioner.
        """
        user = practitioner.user
        
        if not self.should_send_notification(user, 'payment', 'email'):
            return
        
        template_id = self.get_template_id('earnings_summary')
        if not template_id:
            logger.warning("No earnings summary template configured")
            return
        
        # Calculate earnings for the period
        if period == 'weekly':
            start_date = timezone.now() - timedelta(days=7)
            period_label = "This Week"
        else:  # monthly
            start_date = timezone.now() - timedelta(days=30)
            period_label = "This Month"
        
        # Get earnings data (this would come from your analytics)
        earnings_data = self._get_earnings_summary(practitioner, start_date)
        
        data = {
            'practitioner_name': practitioner.display_name or user.get_full_name(),
            'period_label': period_label,
            'total_earnings': f"${earnings_data['total_earnings']:.2f}",
            'total_bookings': earnings_data['total_bookings'],
            'completed_sessions': earnings_data['completed_sessions'],
            'cancelled_sessions': earnings_data['cancelled_sessions'],
            'average_booking_value': f"${earnings_data['average_booking_value']:.2f}",
            'top_services': earnings_data['top_services'],
            'commission_paid': f"${earnings_data['commission_paid']:.2f}",
            'net_earnings': f"${earnings_data['net_earnings']:.2f}",
            'comparison_percent': earnings_data['comparison_percent'],
            'comparison_direction': 'up' if earnings_data['comparison_percent'] > 0 else 'down',
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/finances/earnings",
            'analytics_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/analytics"
        }
        
        notification = self.create_notification_record(
            user=user,
            title=f"{period_label}'s Earnings Summary",
            message=f"You earned {data['total_earnings']} from {data['total_bookings']} bookings {period_label.lower()}.",
            notification_type='payment',
            delivery_channel='email'
        )
        
        return self.send_email_notification(
            user=user,
            template_id=template_id,
            data=data,
            notification=notification,
            idempotency_key=f"earnings-summary-{practitioner.id}-{period}-{timezone.now().strftime('%Y%W')}"
        )
    
    def send_booking_reminder(self, booking, hours_before):
        """
        Send booking reminder to practitioner (for individual sessions).
        """
        practitioner = booking.service.primary_practitioner
        user = practitioner.user
        
        if not self.should_send_notification(user, 'reminder', 'email'):
            return
        
        template_key = 'reminder_24h' if hours_before == 24 else 'reminder_30m'
        template_id = self.get_template_id(template_key)
        if not template_id:
            logger.warning(f"No {template_key} template configured for practitioners")
            return
        
        client = booking.user
        service = booking.service
        
        # Calculate time until booking
        time_until = booking.start_time - timezone.now()
        
        # Check if booking has a video room
        video_room_url = None
        if hasattr(booking, 'livekit_room') and booking.livekit_room:
            video_room_url = f"{settings.FRONTEND_URL}/room/{booking.livekit_room.public_uuid}"
        elif booking.service_session and hasattr(booking.service_session, 'livekit_room') and booking.service_session.livekit_room:
            video_room_url = f"{settings.FRONTEND_URL}/room/{booking.service_session.livekit_room.public_uuid}"
        
        data = {
            'booking_id': str(booking.id),
            'client_name': client.get_full_name(),
            'client_email': client.email,
            'service_name': service.name,
            'booking_date': booking.start_time.strftime('%A, %B %d, %Y'),
            'booking_time': booking.start_time.strftime('%I:%M %p'),
            'duration_minutes': service.duration_minutes,
            'location': booking.location.name if booking.location else ('Virtual' if booking.meeting_url else 'TBD'),
            'hours_until': hours_before,
            'time_until_human': self._format_time_until(time_until),
            'booking_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/bookings/{booking.id}",
            'client_profile_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/clients/{client.id}",
            'is_aggregated': False,  # Individual reminder
            'video_room_url': video_room_url,
            'has_video_room': bool(video_room_url)
        }
        
        title = f"Reminder: {service.name} with {client.get_full_name()} in {hours_before} {'hours' if hours_before > 1 else 'hour'}"
        message = f"Your session with {client.get_full_name()} is at {data['booking_time']}"
        
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
            idempotency_key=f"practitioner-booking-reminder-{booking.id}-{hours_before}h"
        )
    
    def _schedule_practitioner_reminders(self, booking):
        """
        Schedule reminder notifications for practitioner.
        """
        practitioner = booking.service.primary_practitioner
        
        # 24-hour reminder
        reminder_24h = booking.start_time - timedelta(hours=24)
        if reminder_24h > timezone.now():
            self.schedule_notification(
                user=practitioner.user,
                notification_type='reminder',
                delivery_channel='email',
                scheduled_for=reminder_24h,
                template_id=self.get_template_id('reminder_24h'),
                data={},  # Will be populated when sent
                title=f"Tomorrow: {booking.service.name} with {booking.user.get_full_name()}",
                message=f"Reminder: You have a booking tomorrow",
                related_object_type='booking',
                related_object_id=str(booking.id)
            )
        
        # 30-minute reminder
        reminder_30m = booking.start_time - timedelta(minutes=30)
        if reminder_30m > timezone.now():
            self.schedule_notification(
                user=practitioner.user,
                notification_type='reminder',
                delivery_channel='email',
                scheduled_for=reminder_30m,
                template_id=self.get_template_id('reminder_30m'),
                data={},  # Will be populated when sent
                title=f"Starting soon: {booking.service.name}",
                message=f"Your session starts in 30 minutes",
                related_object_type='booking',
                related_object_id=str(booking.id)
            )
    
    def _schedule_onboarding_nudges(self, practitioner):
        """
        Schedule onboarding reminder emails.
        """
        # 3-day nudge if profile incomplete
        nudge_date = timezone.now() + timedelta(days=3)
        notification = self.schedule_notification(
            user=practitioner.user,
            notification_type='system',
            delivery_channel='email',
            scheduled_for=nudge_date,
            template_id=self.get_template_id('profile_incomplete'),
            data={'nudge_type': 'profile_incomplete'},
            title="Complete your practitioner profile",
            message="Your profile is incomplete. Complete it to start receiving bookings."
        )
        
        # Schedule the specific task to handle this nudge
        from notifications.tasks import send_practitioner_profile_nudge
        send_practitioner_profile_nudge.apply_async(
            args=[notification.id],
            eta=nudge_date
        )
        
        # 7-day nudge if no services created
        nudge_date = timezone.now() + timedelta(days=7)
        notification = self.schedule_notification(
            user=practitioner.user,
            notification_type='system',
            delivery_channel='email',
            scheduled_for=nudge_date,
            template_id=self.get_template_id('no_services'),
            data={'nudge_type': 'no_services'},
            title="Create your first service",
            message="You haven't created any services yet. Create one to start accepting bookings."
        )
        
        # Schedule the specific task to handle this nudge
        from notifications.tasks import send_practitioner_services_nudge
        send_practitioner_services_nudge.apply_async(
            args=[notification.id],
            eta=nudge_date
        )
    
    def _get_earnings_summary(self, practitioner, start_date):
        """
        Get earnings summary data for the practitioner.
        """
        from bookings.models import Booking
        from django.db.models import Sum, Count, Avg, Q
        from decimal import Decimal
        
        end_date = timezone.now()
        
        # Get bookings in the period
        period_bookings = Booking.objects.filter(
            service__primary_practitioner=practitioner,
            start_time__gte=start_date,
            start_time__lt=end_date
        )
        
        # Calculate earnings
        completed_bookings = period_bookings.filter(status='completed')
        earnings_data = completed_bookings.aggregate(
            total_gross_cents=Sum('final_amount_cents'),
            count=Count('id'),
            avg_amount_cents=Avg('final_amount_cents')
        )
        
        # Convert cents to dollars
        total_gross_cents = earnings_data['total_gross_cents'] or 0
        total_gross = Decimal(str(total_gross_cents / 100.0))
        
        # Calculate commission (TODO: Get actual commission rate from subscription tier)
        commission_rate = Decimal('15.0')  # Default 15%
        total_commission = total_gross * commission_rate / Decimal('100')
        total_net = total_gross - total_commission
        
        # Convert average from cents to dollars
        avg_cents = earnings_data['avg_amount_cents'] or 0
        avg_amount = Decimal(str(avg_cents / 100.0)) if avg_cents else Decimal('0')
        
        # Get cancelled bookings count
        cancelled_count = period_bookings.filter(status='cancelled').count()
        
        # Get top services
        top_services = completed_bookings.values(
            'service__name'
        ).annotate(
            count=Count('id'),
            revenue_cents=Sum('final_amount_cents')
        ).order_by('-count')[:3]
        
        # Calculate comparison with previous period
        previous_start = start_date - (end_date - start_date)
        previous_bookings = Booking.objects.filter(
            service__primary_practitioner=practitioner,
            start_time__gte=previous_start,
            start_time__lt=start_date,
            status='completed'
        ).aggregate(total_cents=Sum('final_amount_cents'))
        
        previous_total_cents = previous_bookings['total_cents'] or 0
        previous_total = Decimal(str(previous_total_cents / 100.0)) if previous_total_cents else Decimal('0')
        
        if previous_total > 0:
            comparison_percent = float(((total_gross - previous_total) / previous_total) * 100)
        else:
            comparison_percent = 100.0 if total_gross > 0 else 0.0
        
        return {
            'total_earnings': total_gross,
            'total_bookings': earnings_data['count'] or 0,
            'completed_sessions': earnings_data['count'] or 0,
            'cancelled_sessions': cancelled_count,
            'average_booking_value': avg_amount,
            'top_services': [
                {'name': service['service__name'], 'count': service['count']}
                for service in top_services
            ],
            'commission_paid': total_commission,
            'net_earnings': total_net,
            'comparison_percent': round(comparison_percent, 1)
        }
    
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