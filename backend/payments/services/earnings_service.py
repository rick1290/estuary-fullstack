"""
Earnings service for managing practitioner earnings and commissions.
"""
import logging
from typing import Optional, Tuple, Any, Dict
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from payments.models import EarningsTransaction, PractitionerEarnings
from practitioners.models import Practitioner

# Import from parent module to avoid circular import
from payments.commission_services import CommissionCalculator

logger = logging.getLogger(__name__)


class EarningsService:
    """Service for managing practitioner earnings."""
    
    def __init__(self):
        self.commission_calculator = CommissionCalculator()
    
    def calculate_commission(
        self,
        practitioner: Practitioner,
        service_type: Any,
        gross_amount_cents: int
    ) -> Tuple[float, int, int]:
        """
        Calculate commission for a transaction.
        
        Args:
            practitioner: Practitioner earning money
            service_type: Type of service
            gross_amount_cents: Gross amount in cents
            
        Returns:
            Tuple of (commission_rate, commission_amount_cents, net_amount_cents)
        """
        # Get commission rate
        commission_rate = self.commission_calculator.get_commission_rate(
            practitioner=practitioner,
            service_type=service_type
        )
        
        # Calculate amounts
        commission_amount_cents = int((commission_rate / 100) * gross_amount_cents)
        net_amount_cents = gross_amount_cents - commission_amount_cents
        
        return commission_rate, commission_amount_cents, net_amount_cents
    
    @transaction.atomic
    def create_booking_earnings(
        self,
        practitioner: Practitioner,
        booking: Any,
        service: Any,
        gross_amount_cents: int
    ) -> Optional[EarningsTransaction]:
        """
        Create earnings transaction for a booking.
        UPDATED: Handles package/bundle child bookings and uses 'projected' status.

        Args:
            practitioner: Practitioner who earned
            booking: Associated booking
            service: Service provided
            gross_amount_cents: Gross amount before commission

        Returns:
            Created earnings transaction or None if no practitioner
        """
        if not practitioner:
            return None

        # Determine gross amount based on booking type
        if hasattr(booking, 'order') and booking.order and booking.order.is_package_or_bundle:
            # Use session value from order metadata
            gross_amount_cents = booking.order.session_value_cents
            logger.info(
                f"Package/bundle child booking {booking.id}: "
                f"Using session value ${gross_amount_cents/100:.2f}"
            )

        # Calculate commission
        commission_rate, commission_amount_cents, net_amount_cents = self.calculate_commission(
            practitioner=practitioner,
            service_type=service.service_type,
            gross_amount_cents=gross_amount_cents
        )

        # Determine available_after based on booking end time
        if booking.end_time:
            available_after = booking.end_time + timedelta(hours=48)
        else:
            # Fallback if no end time (shouldn't happen for real bookings)
            available_after = timezone.now() + timedelta(hours=48)

        # Create earnings transaction with 'projected' status
        earnings = EarningsTransaction.objects.create(
            practitioner=practitioner,
            booking=booking,
            gross_amount_cents=gross_amount_cents,
            commission_rate=commission_rate,
            commission_amount_cents=commission_amount_cents,
            net_amount_cents=net_amount_cents,
            status='projected',  # Changed from 'pending'
            available_after=available_after,  # Changed to use booking.end_time
            description=f"Earnings from booking for {service.name}"
        )

        logger.info(
            f"Created projected earnings for practitioner {practitioner.id}: "
            f"${net_amount_cents/100:.2f} net (${commission_amount_cents/100:.2f} commission)"
        )

        return earnings
    
    @transaction.atomic
    def reverse_earnings(self, booking: Any) -> Optional[EarningsTransaction]:
        """
        Reverse earnings for a cancelled booking.
        
        Args:
            booking: Booking that was cancelled
            
        Returns:
            Reversal transaction or None
        """
        try:
            # Find original earnings
            original_earnings = EarningsTransaction.objects.get(
                booking=booking,
                transaction_type='booking'
            )
            
            # Create reversal
            reversal = EarningsTransaction.objects.create(
                practitioner=original_earnings.practitioner,
                booking=booking,
                gross_amount_cents=-original_earnings.gross_amount_cents,
                commission_rate=original_earnings.commission_rate,
                commission_amount_cents=-original_earnings.commission_amount_cents,
                net_amount_cents=-original_earnings.net_amount_cents,
                status='completed',
                transaction_type='reversal',
                description=f"Reversal: {original_earnings.description}"
            )
            
            # Mark original as reversed
            original_earnings.status = 'reversed'
            original_earnings.save()
            
            logger.info(f"Reversed earnings for booking {booking.id}")
            return reversal
            
        except EarningsTransaction.DoesNotExist:
            logger.warning(f"No earnings found to reverse for booking {booking.id}")
            return None
    
    def get_practitioner_balance(self, practitioner: Practitioner) -> dict:
        """
        Get practitioner's current earnings balance.
        
        Args:
            practitioner: Practitioner to check
            
        Returns:
            Dict with balance details
        """
        try:
            earnings = PractitionerEarnings.objects.get(practitioner=practitioner)
            return {
                'total_earned_cents': earnings.total_earned_cents,
                'available_balance_cents': earnings.available_balance_cents,
                'pending_balance_cents': earnings.pending_balance_cents,
                'total_paid_out_cents': earnings.total_paid_out_cents
            }
        except PractitionerEarnings.DoesNotExist:
            return {
                'total_earned_cents': 0,
                'available_balance_cents': 0,
                'pending_balance_cents': 0,
                'total_paid_out_cents': 0
            }
    
    @transaction.atomic
    def mark_earnings_available(self, earnings_transaction: EarningsTransaction) -> None:
        """
        Mark earnings as available after hold period.
        
        Args:
            earnings_transaction: Transaction to make available
        """
        if earnings_transaction.status != 'pending':
            return
        
        if timezone.now() < earnings_transaction.available_after:
            return
        
        earnings_transaction.status = 'available'
        earnings_transaction.save()
        
        # Update practitioner balance
        self._update_practitioner_balance(earnings_transaction.practitioner)
        
        logger.info(f"Marked earnings {earnings_transaction.id} as available")
    
    def _update_practitioner_balance(self, practitioner: Practitioner) -> None:
        """Update practitioner's earnings balance from transactions."""
        # This would typically be handled by signals or periodic tasks
        # but included here for completeness
        pass
    
    def process_available_earnings(self) -> Dict[str, int]:
        """
        Process all pending earnings that are ready to be available.
        This is called by the periodic task.
        
        Returns:
            Dict with counts of processed earnings
        """
        now = timezone.now()
        
        # Get all pending earnings ready to be available
        pending_earnings = EarningsTransaction.objects.filter(
            status='pending',
            available_after__lte=now
        ).select_related('practitioner')
        
        updated_count = 0
        error_count = 0
        
        for earning in pending_earnings:
            try:
                self.mark_earnings_available(earning)
                updated_count += 1
            except Exception as e:
                logger.error(f"Error processing earning {earning.id}: {e}")
                error_count += 1
        
        return {
            'updated_count': updated_count,
            'error_count': error_count
        }