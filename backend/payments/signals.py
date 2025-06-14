from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from bookings.models import Booking
from payments.models import (
    EarningsTransaction, 
    PackageCompletionRecord
)
from payments.services import (
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
        
        # If this is a regular booking (not part of a package) and it's completed
        if not instance.parent_booking and instance.status == 'completed' and instance._old_status != 'completed':
            # Calculate commission and create credit transaction
            calculator = CommissionCalculator()
            earnings = calculator.calculate_practitioner_earnings(instance)
            
            # Create practitioner credit transaction
            PractitionerCreditTransaction.objects.create(
                practitioner=instance.practitioner,
                credits_earned=earnings['gross_amount'],
                commission=earnings['commission_amount'],
                commission_rate=earnings['commission_rate'],
                net_credits=earnings['net_earnings'],
                booking=instance,
                payout_status='pending'
            )


@receiver(post_save, sender=PackageCompletionRecord)
def handle_package_completion(sender, instance, created, **kwargs):
    """
    Handle package completion record updates.
    """
    # If the record is completed and payout hasn't been processed
    if instance.status == 'completed' and not instance.payout_processed:
        # Process the payout
        instance.process_payout()
