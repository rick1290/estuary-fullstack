"""
Credit management service for handling user credits.
"""
import logging
from typing import Optional, Any
from django.db import transaction
from django.utils import timezone

from payments.models import UserCreditTransaction, UserCreditBalance
from users.models import User

logger = logging.getLogger(__name__)


class CreditService:
    """Service for managing user credits."""
    
    def get_user_balance(self, user: User) -> int:
        """
        Get user's current credit balance in cents.
        
        Args:
            user: User instance
            
        Returns:
            Balance in cents
        """
        balance, created = UserCreditBalance.objects.get_or_create(
            user=user,
            defaults={'balance_cents': 0}
        )
        return balance.balance_cents
    
    @transaction.atomic
    def create_booking_credit_transactions(
        self,
        user: User,
        service: Any,
        order: Any,
        booking: Any = None
    ) -> None:
        """
        Create paired credit transactions for a service booking.
        This creates both a purchase (positive) and usage (negative) transaction.
        
        Args:
            user: User making the booking
            service: Service being booked
            order: Associated order
            booking: Associated booking (optional)
        """
        service_price_cents = int(service.price * 100)
        
        # 1. Purchase transaction (money in)
        UserCreditTransaction.objects.create(
            user=user,
            amount_cents=service_price_cents,
            transaction_type='purchase',
            service=service,
            practitioner=service.primary_practitioner,
            order=order,
            booking=booking,
            description=f"Purchase: {service.name}"
        )
        
        # 2. Usage transaction (service booked)
        UserCreditTransaction.objects.create(
            user=user,
            amount_cents=-service_price_cents,
            transaction_type='usage',
            service=service,
            practitioner=service.primary_practitioner,
            order=order,
            booking=booking,
            description=f"Booking: {service.name}"
        )
    
    @transaction.atomic
    def refund_credits(
        self,
        user: User,
        amount_cents: int,
        booking: Any,
        reason: str = "Booking cancellation"
    ) -> UserCreditTransaction:
        """
        Refund credits to user.
        
        Args:
            user: User to refund
            amount_cents: Amount to refund in cents
            booking: Associated booking
            reason: Reason for refund
            
        Returns:
            Created credit transaction
        """
        transaction = UserCreditTransaction.objects.create(
            user=user,
            amount_cents=amount_cents,  # Positive for refund
            transaction_type='refund',
            booking=booking,
            service=booking.service if booking else None,
            practitioner=booking.practitioner if booking else None,
            description=reason
        )
        
        logger.info(f"Refunded {amount_cents} cents to user {user.id} for {reason}")
        return transaction
    
    @transaction.atomic
    def transfer_credits(
        self,
        from_user: User,
        to_user: User,
        amount_cents: int,
        reason: str = "Credit transfer"
    ) -> tuple[UserCreditTransaction, UserCreditTransaction]:
        """
        Transfer credits between users.
        
        Args:
            from_user: User sending credits
            to_user: User receiving credits
            amount_cents: Amount to transfer
            reason: Reason for transfer
            
        Returns:
            Tuple of (debit_transaction, credit_transaction)
        """
        # Check balance
        from_balance = self.get_user_balance(from_user)
        if from_balance < amount_cents:
            raise ValueError("Insufficient credit balance for transfer")
        
        # Create debit transaction
        debit_transaction = UserCreditTransaction.objects.create(
            user=from_user,
            amount_cents=-amount_cents,
            transaction_type='transfer_out',
            description=f"{reason} to {to_user.get_full_name()}"
        )
        
        # Create credit transaction
        credit_transaction = UserCreditTransaction.objects.create(
            user=to_user,
            amount_cents=amount_cents,
            transaction_type='transfer_in',
            description=f"{reason} from {from_user.get_full_name()}"
        )
        
        return debit_transaction, credit_transaction
    
    def calculate_refund_amount(self, booking: Any) -> int:
        """
        Calculate refund amount based on cancellation policy.
        
        Args:
            booking: Booking to calculate refund for

        Returns:
            Amount to refund in cents
        """
        # Note: start_time is now on ServiceSession, use accessor method
        booking_start_time = booking.get_start_time()
        if not booking_start_time:
            # No scheduled time, full refund
            return booking.price_charged_cents

        time_until_booking = booking_start_time - timezone.now()
        hours_until = time_until_booking.total_seconds() / 3600
        
        if hours_until >= 24:
            # More than 24 hours: full refund
            return booking.price_charged_cents
        elif hours_until >= 6:
            # 6-24 hours: 50% refund
            return booking.price_charged_cents // 2
        else:
            # Less than 6 hours: no refund
            return 0
    
    @transaction.atomic
    def purchase_credits(
        self,
        user: User,
        amount_cents: int,
        order: Any
    ) -> UserCreditTransaction:
        """
        Add purchased credits to user account.
        
        Args:
            user: User purchasing credits
            amount_cents: Amount of credits in cents
            order: Associated order
            
        Returns:
            Created credit transaction
        """
        transaction = UserCreditTransaction.objects.create(
            user=user,
            amount_cents=amount_cents,
            transaction_type='purchase',
            order=order,
            description=f"Credit purchase: ${amount_cents / 100:.2f}"
        )
        
        logger.info(f"User {user.id} purchased {amount_cents} cents in credits")
        return transaction