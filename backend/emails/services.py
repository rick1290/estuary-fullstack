"""
Email Service Layer
Handles email sending via Resend with template rendering.
"""
import resend
from typing import Dict, Any, List, Optional
from django.conf import settings
from .utils import EmailRenderer
from .constants import (
    CLIENT_EMAILS,
    PRACTITIONER_EMAILS,
    EMAIL_SUBJECTS,
    DEFAULT_FROM_EMAIL,
)
import logging

logger = logging.getLogger(__name__)

# Initialize Resend with API key
resend.api_key = settings.RESEND_API


class EmailService:
    """Service for sending emails via Resend"""

    @staticmethod
    def send_email(
        to: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        tags: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Send email via Resend.

        Args:
            to: Recipient email address
            subject: Email subject line
            html_content: HTML email content
            from_email: Sender email (defaults to DEFAULT_FROM_EMAIL)
            reply_to: Reply-to email address
            tags: List of tags for email tracking

        Returns:
            Response from Resend API

        Raises:
            Exception: If email sending fails
        """
        try:
            params = {
                "from": from_email or DEFAULT_FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html_content,
            }

            if reply_to:
                params["reply_to"] = reply_to

            if tags:
                params["tags"] = tags

            response = resend.Emails.send(params)
            logger.info(f"Email sent successfully to {to}: {response.get('id')}")
            return response

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {str(e)}")
            raise

    @staticmethod
    def send_template_email(
        to: str,
        template_path: str,
        context: Dict[str, Any],
        subject: str,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        tags: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Render and send template email.

        Args:
            to: Recipient email address
            template_path: Path to MJML template
            context: Template context variables
            subject: Email subject line
            from_email: Sender email
            reply_to: Reply-to email address
            tags: List of tags for tracking

        Returns:
            Response from Resend API
        """
        # Render email template
        html_content = EmailRenderer.render_email(template_path, context)

        # Send email
        return EmailService.send_email(
            to=to,
            subject=subject,
            html_content=html_content,
            from_email=from_email,
            reply_to=reply_to,
            tags=tags,
        )


class ClientEmailService:
    """Service for sending client emails"""

    @staticmethod
    def send_welcome_email(user):
        """Send welcome email to new client"""
        return EmailService.send_template_email(
            to=user.email,
            template_path='clients/welcome_standalone.mjml',  # Using standalone for now
            context={
                'first_name': user.first_name,
                'user': user,
            },
            subject=EMAIL_SUBJECTS['CLIENT_WELCOME'],
            tags=[{'name': 'category', 'value': 'welcome'}],
        )

    @staticmethod
    def send_booking_confirmation(booking):
        """Send booking confirmation email"""
        from .constants import build_url

        return EmailService.send_template_email(
            to=booking.user.email,
            template_path=CLIENT_EMAILS['BOOKING_CONFIRMATION'],
            context={
                'user': booking.user,
                'booking': booking,
                'service': booking.service,
                'practitioner': booking.service.practitioner,
                'booking_url': build_url('USER_BOOKING_DETAIL', id=booking.id),
                'join_url': build_url('ROOM_BOOKING_LOBBY', booking_id=booking.id) if hasattr(booking, 'room') else None,
                'has_video_room': hasattr(booking, 'room'),
            },
            subject=EMAIL_SUBJECTS['CLIENT_BOOKING_CONFIRMATION'].format(
                service_name=booking.service.title
            ),
            tags=[
                {'name': 'category', 'value': 'booking'},
                {'name': 'action', 'value': 'confirmation'},
            ],
        )

    @staticmethod
    def send_reminder(booking, reminder_type: str):
        """
        Send booking reminder email.

        Args:
            booking: Booking instance
            reminder_type: '24h' or '30m'
        """
        subject_key = f'CLIENT_REMINDER_{reminder_type.upper()}'

        return EmailService.send_template_email(
            to=booking.user.email,
            template_path=CLIENT_EMAILS['REMINDER'],
            context={
                'user': booking.user,
                'booking': booking,
                'service': booking.service,
                'practitioner': booking.service.practitioner,
                'reminder_type': reminder_type,
                'is_24h': reminder_type == '24h',
                'is_30m': reminder_type == '30m',
            },
            subject=EMAIL_SUBJECTS[subject_key],
            tags=[
                {'name': 'category', 'value': 'reminder'},
                {'name': 'timing', 'value': reminder_type},
            ],
        )

    @staticmethod
    def send_payment_success(payment):
        """Send payment success confirmation"""
        return EmailService.send_template_email(
            to=payment.user.email,
            template_path=CLIENT_EMAILS['PAYMENT_SUCCESS'],
            context={
                'user': payment.user,
                'payment': payment,
                'booking': payment.booking if hasattr(payment, 'booking') else None,
            },
            subject=EMAIL_SUBJECTS['CLIENT_PAYMENT_SUCCESS'],
            tags=[
                {'name': 'category', 'value': 'payment'},
                {'name': 'action', 'value': 'success'},
            ],
        )

    @staticmethod
    def send_review_request(booking):
        """Send review request after booking completion"""
        return EmailService.send_template_email(
            to=booking.user.email,
            template_path=CLIENT_EMAILS['BOOKING_COMPLETED_REVIEW_REQUEST'],
            context={
                'user': booking.user,
                'booking': booking,
                'service': booking.service,
                'practitioner': booking.service.practitioner,
            },
            subject=EMAIL_SUBJECTS['CLIENT_REVIEW_REQUEST'].format(
                practitioner_name=booking.service.practitioner.display_name
            ),
            tags=[
                {'name': 'category', 'value': 'review'},
                {'name': 'action', 'value': 'request'},
            ],
        )


class PractitionerEmailService:
    """Service for sending practitioner emails"""

    @staticmethod
    def send_welcome_email(practitioner):
        """Send welcome email to new practitioner"""
        return EmailService.send_template_email(
            to=practitioner.user.email,
            template_path=PRACTITIONER_EMAILS['WELCOME'],
            context={
                'first_name': practitioner.user.first_name,
                'practitioner': practitioner,
            },
            subject=EMAIL_SUBJECTS['PRACTITIONER_WELCOME'],
            tags=[{'name': 'category', 'value': 'welcome'}],
        )

    @staticmethod
    def send_onboarding_completed_email(practitioner):
        """Send onboarding completion confirmation email"""
        return EmailService.send_template_email(
            to=practitioner.user.email,
            template_path=PRACTITIONER_EMAILS['ONBOARDING_COMPLETED'],
            context={
                'practitioner': practitioner,
            },
            subject=EMAIL_SUBJECTS['PRACTITIONER_ONBOARDING_COMPLETED'],
            tags=[
                {'name': 'category', 'value': 'onboarding'},
                {'name': 'action', 'value': 'completed'},
            ],
        )

    @staticmethod
    def send_booking_received(booking):
        """Send notification of new booking to practitioner"""
        from .constants import build_url

        return EmailService.send_template_email(
            to=booking.service.practitioner.user.email,
            template_path=PRACTITIONER_EMAILS['BOOKING_RECEIVED'],
            context={
                'practitioner': booking.service.practitioner,
                'booking': booking,
                'service': booking.service,
                'client': booking.user,
                'booking_url': build_url('PRACTITIONER_BOOKING_DETAIL', id=booking.id),
                'client_url': build_url('PRACTITIONER_CLIENT_DETAIL', id=booking.user.id),
            },
            subject=EMAIL_SUBJECTS['PRACTITIONER_BOOKING_RECEIVED'].format(
                client_name=booking.user.get_full_name(),
                service_name=booking.service.title,
            ),
            tags=[
                {'name': 'category', 'value': 'booking'},
                {'name': 'action', 'value': 'received'},
            ],
        )

    @staticmethod
    def send_reminder(booking, reminder_type: str):
        """
        Send booking reminder email to practitioner.

        Args:
            booking: Booking instance
            reminder_type: '24h' or '30m'
        """
        subject_key = f'PRACTITIONER_REMINDER_{reminder_type.upper()}'

        return EmailService.send_template_email(
            to=booking.service.practitioner.user.email,
            template_path=PRACTITIONER_EMAILS['REMINDER'],
            context={
                'practitioner': booking.service.practitioner,
                'booking': booking,
                'service': booking.service,
                'client': booking.user,
                'reminder_type': reminder_type,
                'is_24h': reminder_type == '24h',
                'is_30m': reminder_type == '30m',
            },
            subject=EMAIL_SUBJECTS[subject_key].format(
                client_name=booking.user.get_full_name()
            ),
            tags=[
                {'name': 'category', 'value': 'reminder'},
                {'name': 'timing', 'value': reminder_type},
            ],
        )

    @staticmethod
    def send_payout_completed(payout):
        """Send payout completion confirmation"""
        return EmailService.send_template_email(
            to=payout.practitioner.user.email,
            template_path=PRACTITIONER_EMAILS['PAYOUT_COMPLETED'],
            context={
                'practitioner': payout.practitioner,
                'payout': payout,
            },
            subject=EMAIL_SUBJECTS['PRACTITIONER_PAYOUT_COMPLETED'].format(
                amount=payout.amount / 100
            ),
            tags=[
                {'name': 'category', 'value': 'payout'},
                {'name': 'action', 'value': 'completed'},
            ],
        )

    @staticmethod
    def send_new_review(review):
        """Notify practitioner of new review"""
        return EmailService.send_template_email(
            to=review.practitioner.user.email,
            template_path=PRACTITIONER_EMAILS['NEW_REVIEW'],
            context={
                'practitioner': review.practitioner,
                'review': review,
                'client': review.user,
            },
            subject=EMAIL_SUBJECTS['PRACTITIONER_NEW_REVIEW'].format(
                stars=review.rating,
                client_name=review.user.get_full_name(),
            ),
            tags=[
                {'name': 'category', 'value': 'review'},
                {'name': 'action', 'value': 'received'},
            ],
        )
