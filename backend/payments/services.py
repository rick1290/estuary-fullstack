from django.db.models import Q
from django.utils import timezone
from decimal import Decimal

from payments.models import (
    ServiceTypeCommission, 
    TierCommissionAdjustment, 
    PractitionerSubscription,
    ExternalServiceFee,
    PractitionerCreditTransaction,
    PackageCompletionRecord
)


class CommissionCalculator:
    """
    Service for calculating commission rates and fees based on service type and practitioner tier.
    """
    
    def get_commission_rate(self, practitioner, service_type):
        """
        Calculate the commission rate for a practitioner and service type.
        Takes into account the practitioner's subscription tier if any.
        
        Args:
            practitioner: The practitioner model instance
            service_type: The service type model instance
            
        Returns:
            Decimal: The commission rate as a percentage (e.g., 15.0 for 15%)
        """
        # Get the base commission rate for this service type
        try:
            base_commission = ServiceTypeCommission.objects.get(
                service_type=service_type,
                is_active=True
            )
        except ServiceTypeCommission.DoesNotExist:
            # Default to 15% if no specific rate is defined
            return Decimal('15.0')
        
        # Get the practitioner's active subscription if any
        active_subscription = PractitionerSubscription.objects.filter(
            practitioner=practitioner,
            status='active',
            tier__is_active=True
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gt=timezone.now())
        ).first()
        
        if not active_subscription:
            # No active subscription, use base rate
            return base_commission.base_rate
        
        # Check for tier-specific adjustment
        try:
            adjustment = TierCommissionAdjustment.objects.get(
                tier=active_subscription.tier,
                service_type_commission=base_commission,
                is_active=True
            )
            # Apply adjustment to base rate
            adjusted_rate = base_commission.base_rate + adjustment.adjustment_percentage
            # Ensure rate stays between 0 and 100
            return max(Decimal('0'), min(Decimal('100'), adjusted_rate))
        except TierCommissionAdjustment.DoesNotExist:
            # No adjustment for this tier and service type
            return base_commission.base_rate
    
    def calculate_external_fees(self, service_type, amount):
        """
        Calculate external service fees (like Stripe, Daily.co) for a transaction.
        
        Args:
            service_type: The service type model instance
            amount: The transaction amount
            
        Returns:
            dict: A dictionary of fee names and amounts
        """
        fees = {}
        
        # Get all active external fees for this service type
        external_fees = ExternalServiceFee.objects.filter(
            Q(service_type=service_type) | Q(service_type__isnull=True),
            is_active=True
        )
        
        for fee in external_fees:
            fee_amount = fee.calculate_fee(amount)
            fees[fee.name] = {
                'amount': fee_amount,
                'is_practitioner_responsible': fee.is_practitioner_responsible
            }
            
        return fees
    
    def calculate_practitioner_earnings(self, booking):
        """
        Calculate the earnings for a practitioner based on a booking.
        
        Args:
            booking: The booking model instance
            
        Returns:
            dict: A dictionary with earnings details
        """
        # Get the service type
        service_type = booking.service.service_type
        
        # Get the practitioner
        practitioner = booking.practitioner
        
        # Get the booking amount
        amount = booking.credit_value or Decimal('0')
        
        # Calculate commission rate
        commission_rate = self.get_commission_rate(practitioner, service_type)
        
        # Calculate commission amount
        commission_amount = (commission_rate / 100) * amount
        
        # Calculate external fees
        external_fees = self.calculate_external_fees(service_type, amount)
        
        # Calculate practitioner fees (fees that the practitioner is responsible for)
        practitioner_fees = sum(
            fee['amount'] for fee in external_fees.values() 
            if fee['is_practitioner_responsible']
        )
        
        # Calculate net earnings
        net_earnings = amount - commission_amount - practitioner_fees
        
        return {
            'gross_amount': amount,
            'commission_rate': commission_rate,
            'commission_amount': commission_amount,
            'external_fees': external_fees,
            'practitioner_fees': practitioner_fees,
            'net_earnings': net_earnings
        }


class PackageCompletionService:
    """
    Service for managing package completion and payouts.
    """
    
    def create_completion_record(self, package_booking):
        """
        Create a completion record for a package booking.
        
        Args:
            package_booking: The package booking model instance
            
        Returns:
            PackageCompletionRecord: The created record
        """
        # Check if this is actually a package booking
        if not package_booking.is_package_booking and not package_booking.is_course_booking:
            raise ValueError("Booking must be for a package or course")
        
        # Create or get the completion record
        record, created = PackageCompletionRecord.objects.get_or_create(
            package_booking=package_booking
        )
        
        # Update the status
        record.update_completion_status()
        
        return record
    
    def update_completion_for_child_booking(self, child_booking):
        """
        Update the package completion record when a child booking status changes.
        
        Args:
            child_booking: The child booking model instance
            
        Returns:
            PackageCompletionRecord: The updated record or None if no parent booking
        """
        # Check if this booking has a parent
        if not child_booking.parent_booking:
            return None
        
        # Get or create the completion record for the parent booking
        record, created = PackageCompletionRecord.objects.get_or_create(
            package_booking=child_booking.parent_booking
        )
        
        # Update the completion status
        record.update_completion_status()
        
        return record
    
    def process_pending_payouts(self):
        """
        Process all pending package completion payouts.
        
        Returns:
            int: Number of payouts processed
        """
        # Get all completed packages that haven't been paid out
        completed_records = PackageCompletionRecord.objects.filter(
            status='completed',
            payout_processed=False
        )
        
        count = 0
        for record in completed_records:
            record.process_payout()
            count += 1
            
        return count


def handle_booking_status_change(booking, old_status, new_status):
    """
    Handle a booking status change event.
    This function should be called whenever a booking status changes.
    
    Args:
        booking: The booking model instance
        old_status: The previous status
        new_status: The new status
    """
    # If this is a child booking and status changed to completed
    if booking.parent_booking and new_status == 'completed':
        # Update the parent package completion record
        package_service = PackageCompletionService()
        package_service.update_completion_for_child_booking(booking)
    
    # If this is a package booking and status changed to canceled
    if (booking.is_package_booking or booking.is_course_booking) and new_status == 'canceled':
        # Update the package completion record
        package_service = PackageCompletionService()
        record, created = PackageCompletionRecord.objects.get_or_create(
            package_booking=booking
        )
        record.status = 'canceled'
        record.save()
