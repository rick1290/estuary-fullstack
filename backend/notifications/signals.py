"""
Signal handlers for automatic notification triggers.
Handles immediate notifications only - reminders are processed via periodic tasks.

NOTE: Most notifications are now handled explicitly by service classes
to avoid hidden side effects and improve code clarity.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from practitioners.models import Practitioner

from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)

logger = logging.getLogger(__name__)
User = get_user_model()

# DEPRECATED: Booking status tracking no longer needed
# Status changes are now handled explicitly in services
# _booking_status_tracker = {}

# @receiver(pre_save, sender=Booking)
# def track_booking_status_change(sender, instance, **kwargs):
#     """
#     NOTE: Status tracking is no longer needed as all status changes
#     are now handled explicitly by service methods.
#     """
#     pass


# User registration signals
@receiver(post_save, sender=User)
def send_welcome_notification(sender, instance, created, **kwargs):
    """
    Send welcome email when a new user is created.
    Only send client welcome emails to non-practitioner users.
    Practitioner welcome emails are sent when the practitioner profile is created.
    """
    if created and instance.email and not instance.is_practitioner:
        try:
            # Only send client welcome email if user is not marked as practitioner
            service = get_client_notification_service()
            # Generate verification token if needed
            verification_token = None  # TODO: Implement token generation if email verification is needed
            service.send_welcome_email(instance, verification_token)
            logger.info(f"Sent client welcome email to {instance.email}")
        except Exception as e:
            logger.error(f"Error sending welcome email to {instance.email}: {str(e)}")


# DEPRECATED: Booking completion notifications are handled by BookingService
# @receiver(post_save, sender=Booking)
# def handle_booking_completion(sender, instance, created, **kwargs):
#     """
#     NOTE: This functionality has been moved to BookingService.mark_booking_completed()
#     which explicitly sends review requests when marking bookings as complete.
#     """
#     pass


# DEPRECATED: Payment notifications are handled by PaymentService/CheckoutOrchestrator
# @receiver(post_save, sender=Order)
# def handle_payment_notification(sender, instance, created, **kwargs):
#     """
#     NOTE: This functionality has been moved to PaymentService and CheckoutOrchestrator
#     """
#     pass


# DEPRECATED: Credit notifications are handled by CreditService
# @receiver(post_save, sender=UserCreditTransaction)
# def handle_credit_notification(sender, instance, created, **kwargs):
#     """
#     NOTE: This functionality has been moved to CreditService
#     """
#     pass


# DEPRECATED: Payout notifications are handled by PayoutService
# @receiver(post_save, sender=PractitionerPayout)
# def handle_payout_notification(sender, instance, created, **kwargs):
#     """
#     NOTE: This functionality has been moved to PayoutService.mark_payout_completed()
#     which explicitly sends notifications when marking payouts as complete.
#     """
#     pass


# Practitioner signals - Keep for welcome emails and onboarding
@receiver(post_save, sender=Practitioner)
def handle_practitioner_notifications(sender, instance, created, **kwargs):
    """
    Send notifications for practitioner events.
    """
    try:
        service = get_practitioner_notification_service()
        
        if created:
            # Send welcome email when practitioner profile is first created
            service.send_welcome_email(instance)
            logger.info(f"Sent practitioner welcome email to {instance.user.email}")
            
            # Schedule onboarding nudges (profile incomplete at 3 days, no services at 7 days)
            service._schedule_onboarding_nudges(instance)
            logger.info(f"Scheduled onboarding nudges for practitioner {instance.user.email}")
    except Exception as e:
        logger.error(f"Error sending practitioner notification: {str(e)}")


# DEPRECATED: Service creation notifications should be explicit
# @receiver(post_save, sender=Service)
# def handle_service_notification(sender, instance, created, **kwargs):
#     """
#     NOTE: Service creation notifications should be sent explicitly
#     when the service is created via API
#     """
#     pass


# DEPRECATED: Review notifications should be explicit
# @receiver(post_save, sender=Review)
# def handle_review_notification(sender, instance, created, **kwargs):
#     """
#     NOTE: Review notifications should be sent explicitly
#     when the review is created via API
#     """
#     pass


# DEPRECATED: Message notifications should be handled by messaging service
# @receiver(post_save, sender=Message)
# def handle_message_notification(sender, instance, created, **kwargs):
#     """
#     NOTE: Message notifications should be handled by the messaging service
#     when messages are sent via API
#     """
#     pass