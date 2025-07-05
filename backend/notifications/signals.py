"""
Signal handlers for automatic notification triggers.
Handles immediate notifications only - reminders are processed via periodic tasks.
"""
import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from bookings.models import Booking
from payments.models import Order, UserCreditTransaction, PractitionerPayout
from practitioners.models import Practitioner
from services.models import Service
from reviews.models import Review
from messaging.models import Message

from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)

logger = logging.getLogger(__name__)
User = get_user_model()

# Store for tracking booking status changes
_booking_status_tracker = {}


# Booking pre-save signal to track status changes
@receiver(pre_save, sender=Booking)
def track_booking_status_change(sender, instance, **kwargs):
    """
    Track booking status before save to detect changes.
    """
    if instance.pk:  # Only for existing bookings
        try:
            old_booking = Booking.objects.get(pk=instance.pk)
            _booking_status_tracker[instance.pk] = {
                'old_status': old_booking.status,
                'old_payment_status': old_booking.payment_status
            }
        except Booking.DoesNotExist:
            pass


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


# Booking signals
@receiver(post_save, sender=Booking)
def handle_booking_notification(sender, instance, created, **kwargs):
    """
    Send immediate notifications for booking events.
    Note: Reminders are handled via periodic tasks, not signals.
    """
    try:
        # Handle new bookings that are already confirmed (e.g., from direct payment)
        if created and instance.status == 'confirmed':
            # Send confirmation to client
            client_service = get_client_notification_service()
            client_service.send_booking_confirmation(instance)
            
            # Send notification to practitioner
            try:
                practitioner_service = get_practitioner_notification_service()
                practitioner_service.send_booking_notification(instance)
                logger.info(f"Sent practitioner notification for booking {instance.id}")
            except Exception as e:
                logger.error(f"Error sending practitioner notification for booking {instance.id}: {str(e)}", exc_info=True)
            
            # Note: Reminders will be handled by periodic task, not here
            logger.info(f"Booking {instance.id} confirmed - reminders will be processed by periodic task")
            
        elif not created:
            # For existing bookings, check if status changed
            booking_tracker = _booking_status_tracker.get(instance.pk, {})
            previous_status = booking_tracker.get('old_status')
            
            # Clean up tracker
            if instance.pk in _booking_status_tracker:
                del _booking_status_tracker[instance.pk]
            
            # Check if status changed to confirmed
            if instance.status == 'confirmed' and previous_status and previous_status != 'confirmed':
                # Send confirmation emails
                client_service = get_client_notification_service()
                client_service.send_booking_confirmation(instance)
                
                # Send notification to practitioner
                practitioner_service = get_practitioner_notification_service()
                practitioner_service.send_booking_notification(instance)
                
                logger.info(f"Sent confirmation for booking {instance.id} (status changed from {previous_status} to confirmed)")
            
            elif instance.status == 'cancelled' and previous_status == 'confirmed':
                # Send cancellation notifications
                client_service = get_client_notification_service()
                practitioner_service = get_practitioner_notification_service()
                
                # Determine who cancelled
                cancelled_by = instance.metadata.get('cancelled_by', 'system')
                reason = instance.metadata.get('cancellation_reason', '')
                
                # Notify both parties
                # client_service.send_booking_cancelled(instance)
                practitioner_service.send_booking_cancelled(instance, cancelled_by, reason)
                
            elif instance.status == 'rescheduled':
                # Individual rescheduling notifications handled here
                # Session-wide reschedules handled by periodic task
                pass
                    
    except Exception as e:
        logger.error(f"Error handling booking notification for booking {instance.id}: {str(e)}", exc_info=True)


# Payment signals
@receiver(post_save, sender=Order)
def handle_payment_notification(sender, instance, created, **kwargs):
    """
    Send payment-related notifications.
    """
    if created and instance.status == 'completed':
        try:
            service = get_client_notification_service()
            service.send_payment_success(instance)
        except Exception as e:
            logger.error(f"Error sending payment notification for order {instance.id}: {str(e)}")


# Credit purchase signals
@receiver(post_save, sender=UserCreditTransaction)
def handle_credit_notification(sender, instance, created, **kwargs):
    """
    Send credit purchase notifications.
    """
    if created and instance.transaction_type == 'purchase' and instance.amount > 0:
        try:
            from integrations.courier.utils import send_credit_purchase_confirmation
            send_credit_purchase_confirmation(instance)
        except Exception as e:
            logger.error(f"Error sending credit purchase notification: {str(e)}")


# Payout signals
@receiver(post_save, sender=PractitionerPayout)
def handle_payout_notification(sender, instance, created, **kwargs):
    """
    Send payout notifications to practitioners.
    """
    if not created and instance.tracker.has_changed('status'):
        if instance.status == 'completed':
            try:
                service = get_practitioner_notification_service()
                service.send_payout_confirmation(instance)
            except Exception as e:
                logger.error(f"Error sending payout notification for payout {instance.id}: {str(e)}")


# Service creation signals
@receiver(post_save, sender=Service)
def handle_service_notification(sender, instance, created, **kwargs):
    """
    Send notifications for service events.
    """
    if created:
        try:
            # Send confirmation to practitioner
            # service = get_practitioner_notification_service()
            # service.send_service_created(instance)
            
            # If this is their first service, cancel the nudge
            if instance.primary_practitioner and instance.primary_practitioner.services.count() == 1:
                # Cancel scheduled nudge notification
                pass
        except Exception as e:
            logger.error(f"Error handling service notification: {str(e)}")


# Review signals
@receiver(post_save, sender=Review)
def handle_review_notification(sender, instance, created, **kwargs):
    """
    Send notifications for new reviews.
    """
    if created:
        try:
            # Notify practitioner of new review
            # service = get_practitioner_notification_service()
            # service.send_new_review(instance)
            pass
        except Exception as e:
            logger.error(f"Error sending review notification: {str(e)}")


# Message signals
@receiver(post_save, sender=Message)
def handle_message_notification(sender, instance, created, **kwargs):
    """
    Send notifications for new messages.
    """
    if created:
        try:
            # Determine recipient
            recipient = instance.conversation.get_other_participant(instance.sender)
            
            # Check if recipient has notifications enabled
            # Send in-app notification immediately
            # Email notification can be batched/delayed
            pass
        except Exception as e:
            logger.error(f"Error sending message notification: {str(e)}")


# Practitioner signals
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
        elif not created and hasattr(instance, 'tracker') and instance.tracker.has_changed('verification_status'):
            # Handle verification status changes
            if instance.verification_status == 'verified':
                # service.send_verification_approved(instance)
                pass
            elif instance.verification_status == 'rejected':
                # service.send_verification_rejected(instance)
                pass
    except Exception as e:
        logger.error(f"Error sending practitioner notification: {str(e)}")