"""
Payment-related signal handlers.

NOTE: Most payment logic has been moved to service classes for explicit control.
Only package completion tracking remains here as it needs to track status changes.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from bookings.models import Booking
from payments.models import (
    EarningsTransaction, 
    PackageCompletionRecord
)
from payments.commission_services import (
    CommissionCalculator,
    PackageCompletionService,
    handle_booking_status_change
)


@receiver(pre_save, sender=Booking)
def track_booking_status_change(sender, instance, **kwargs):
    """
    Track status changes in bookings to handle package completion.
    """
    if instance.pk:  # Only for existing bookings
        try:
            # Get the old instance from the database
            old_instance = Booking.objects.get(pk=instance.pk)
            
            # Check if status has changed
            if old_instance.status != instance.status:
                # Store the old status on the instance for post_save to use
                instance._old_status = old_instance.status
        except Booking.DoesNotExist:
            pass


@receiver(post_save, sender=Booking)
def handle_booking_completion(sender, instance, created, **kwargs):
    """
    Handle booking completion and package tracking.
    """
    # Skip for new bookings
    if created:
        # If this is a new package booking, create a completion record
        if instance.is_package_booking or instance.is_course_booking:
            package_service = PackageCompletionService()
            package_service.create_completion_record(instance)
        return
    
    # Check if status has changed
    if hasattr(instance, '_old_status') and instance._old_status != instance.status:
        # Handle the status change
        handle_booking_status_change(instance, instance._old_status, instance.status)
        
        # DEPRECATED: Earnings are now created by EarningsService when booking is created
        # This ensures earnings are tracked immediately, not just on completion
        # if not instance.parent_booking and instance.status == 'completed' and instance._old_status != 'completed':
        #     # NOTE: This functionality has been moved to EarningsService.create_booking_earnings()
        #     # which is called by CheckoutOrchestrator during payment processing
        #     pass


@receiver(post_save, sender=PackageCompletionRecord)
def handle_package_completion(sender, instance, created, **kwargs):
    """
    Handle package completion record updates.
    """
    # If the record is completed and payout hasn't been processed
    if instance.status == 'completed' and not instance.payout_processed:
        # Process the payout
        instance.process_payout()
