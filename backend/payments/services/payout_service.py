"""
Payout service for managing practitioner payouts.
"""
import logging
from typing import Optional, List, Dict, Any
from decimal import Decimal
from django.db import transaction
from django.conf import settings
from django.utils import timezone
import stripe

from payments.models import (
    PractitionerPayout, PractitionerEarnings,
    EarningsTransaction
)
from practitioners.models import Practitioner
from users.models import User

logger = logging.getLogger(__name__)


class PayoutService:
    """Service for managing practitioner payouts."""
    
    def check_payout_eligibility(self, practitioner: Practitioner) -> Dict[str, Any]:
        """
        Check if practitioner is eligible for payout.
        
        Args:
            practitioner: Practitioner to check
            
        Returns:
            Dict with eligibility info
        """
        try:
            earnings = PractitionerEarnings.objects.get(practitioner=practitioner)
            available_balance = earnings.available_balance_cents
            
            # Check minimum payout amount (default $50)
            min_payout_cents = 5000  # $50
            is_eligible = available_balance >= min_payout_cents
            
            # Get available transactions
            available_transactions = EarningsTransaction.objects.filter(
                practitioner=practitioner,
                status='available'
            ).count()
            
            return {
                'is_eligible': is_eligible,
                'available_balance_cents': available_balance,
                'available_balance': Decimal(available_balance) / 100,
                'minimum_payout_cents': min_payout_cents,
                'minimum_payout': Decimal(min_payout_cents) / 100,
                'available_transactions': available_transactions,
                'reason': None if is_eligible else f"Minimum payout amount is ${min_payout_cents/100:.2f}"
            }
            
        except PractitionerEarnings.DoesNotExist:
            return {
                'is_eligible': False,
                'available_balance_cents': 0,
                'available_balance': Decimal('0'),
                'minimum_payout_cents': 5000,
                'minimum_payout': Decimal('50'),
                'available_transactions': 0,
                'reason': "No earnings record found"
            }
    
    @transaction.atomic
    def create_payout_request(
        self,
        practitioner: Practitioner,
        amount: Optional[Decimal] = None,
        notes: Optional[str] = None,
        processed_by: Optional[User] = None
    ) -> PractitionerPayout:
        """
        Create a payout request for practitioner.
        
        Args:
            practitioner: Practitioner requesting payout
            amount: Specific amount to payout (None = all available)
            notes: Optional notes
            processed_by: User processing the payout (for manual payouts)
            
        Returns:
            Created payout instance
            
        Raises:
            ValueError: If practitioner not eligible or invalid amount
        """
        # Check eligibility
        eligibility = self.check_payout_eligibility(practitioner)
        if not eligibility['is_eligible']:
            raise ValueError(eligibility['reason'])
        
        # Get earnings record
        earnings = PractitionerEarnings.objects.select_for_update().get(
            practitioner=practitioner
        )
        
        # Determine payout amount
        if amount is None:
            payout_amount_cents = earnings.available_balance_cents
        else:
            payout_amount_cents = int(amount * 100)
            
        # Validate amount
        if payout_amount_cents <= 0:
            raise ValueError("Payout amount must be positive")
            
        if payout_amount_cents > earnings.available_balance_cents:
            raise ValueError(
                f"Requested amount (${payout_amount_cents/100:.2f}) exceeds "
                f"available balance (${earnings.available_balance_cents/100:.2f})"
            )
        
        # Get available transactions to include in payout
        available_transactions = EarningsTransaction.objects.filter(
            practitioner=practitioner,
            status='available'
        ).order_by('created_at')
        
        # Select transactions up to payout amount (only include fully-fitting transactions)
        selected_transactions = []
        accumulated_amount = 0

        for transaction in available_transactions:
            if accumulated_amount + transaction.net_amount_cents <= payout_amount_cents:
                selected_transactions.append(transaction)
                accumulated_amount += transaction.net_amount_cents
            else:
                # Transaction doesn't fit — stop here, remainder stays available
                break
        
        if not selected_transactions:
            raise ValueError("No available transactions for payout")
        
        # Create payout using model method
        payout = PractitionerPayout.create_batch_payout(
            practitioner=practitioner,
            transactions=selected_transactions,
            processed_by=processed_by,
            notes=notes
        )
        
        logger.info(
            f"Created payout {payout.id} for practitioner {practitioner.id}: "
            f"${payout.amount_cents/100:.2f}"
        )
        
        return payout
    
    @transaction.atomic
    def process_payout_batch(
        self,
        payouts: List[PractitionerPayout]
    ) -> Dict[str, Any]:
        """
        Process a batch of payouts.
        
        Args:
            payouts: List of payouts to process
            
        Returns:
            Dict with processing results
        """
        results = {
            'successful': [],
            'failed': [],
            'total_amount_cents': 0
        }
        
        for payout in payouts:
            try:
                # Process individual payout
                self._process_single_payout(payout)
                results['successful'].append(payout.id)
                results['total_amount_cents'] += payout.amount_cents
                
            except Exception as e:
                logger.error(f"Failed to process payout {payout.id}: {e}")
                results['failed'].append({
                    'payout_id': payout.id,
                    'error': str(e)
                })
        
        return results
    
    def _process_single_payout(self, payout: PractitionerPayout) -> None:
        """
        Process a single payout via Stripe Connect transfer.

        Args:
            payout: Payout to process

        Raises:
            ValueError: If payout is not in pending status or practitioner
                        has no Stripe Connect account configured.
        """
        if payout.status != 'pending':
            raise ValueError(f"Payout {payout.id} is not in pending status")

        practitioner = payout.practitioner

        # Resolve the practitioner's Stripe Connect account ID.
        # Prefer the value already stored on the payout record (set at
        # creation time); fall back to the practitioner's payment profile.
        stripe_account_id = payout.stripe_account_id
        if not stripe_account_id:
            try:
                stripe_account_id = practitioner.user.payment_profile.stripe_account_id
            except Exception:
                stripe_account_id = None

        if not stripe_account_id:
            payout.status = 'failed'
            payout.error_message = (
                f"Practitioner {practitioner} (id={practitioner.id}) does not have a "
                "Stripe Connect account configured. Please complete Stripe onboarding "
                "before requesting a payout."
            )
            payout.save(update_fields=['status', 'error_message', 'updated_at'])
            logger.error(
                "Payout %s failed: practitioner %s has no stripe_account_id",
                payout.id, practitioner.id,
            )
            raise ValueError(payout.error_message)

        # Persist the resolved account ID on the payout for audit purposes.
        if not payout.stripe_account_id:
            payout.stripe_account_id = stripe_account_id
            payout.save(update_fields=['stripe_account_id', 'updated_at'])

        # Mark payout as processing before calling Stripe.
        payout.status = 'processing'
        payout.save(update_fields=['status', 'updated_at'])

        payout_amount_cents = payout.credits_payout_cents or 0
        if payout_amount_cents <= 0:
            payout.status = 'failed'
            payout.error_message = "Payout amount must be greater than zero."
            payout.save(update_fields=['status', 'error_message', 'updated_at'])
            raise ValueError(payout.error_message)

        try:
            stripe.api_key = settings.STRIPE_SECRET_KEY

            transfer = stripe.Transfer.create(
                amount=payout_amount_cents,
                currency=payout.currency.lower(),
                destination=stripe_account_id,
                transfer_group=f"payout_{payout.batch_id or payout.id}",
                description=f"Payout for practitioner {practitioner}",
                metadata={
                    'payout_id': str(payout.id),
                    'practitioner_id': str(practitioner.id),
                    'batch_id': str(payout.batch_id) if payout.batch_id else '',
                },
            )

            # Mark as completed using the model helper.
            payout.mark_as_completed(transfer_id=transfer.id)

            logger.info(
                "Payout %s completed: transferred %d cents to %s (transfer %s)",
                payout.id, payout_amount_cents, stripe_account_id, transfer.id,
            )

        except stripe.error.StripeError as e:
            payout.status = 'failed'
            payout.error_message = f"Stripe transfer failed: {str(e)}"
            payout.save(update_fields=['status', 'error_message', 'updated_at'])
            logger.error(
                "Payout %s failed with Stripe error: %s", payout.id, str(e),
            )
            raise
        except Exception as e:
            payout.status = 'failed'
            payout.error_message = f"Unexpected error during transfer: {str(e)}"
            payout.save(update_fields=['status', 'error_message', 'updated_at'])
            logger.error(
                "Payout %s failed with unexpected error: %s", payout.id, str(e),
            )
            raise
    
    def mark_payout_completed(self, payout: PractitionerPayout) -> None:
        """
        Mark a payout as completed and send notification.
        
        Args:
            payout: Payout to mark as completed
        """
        if payout.status != 'processing':
            raise ValueError(f"Cannot complete payout in {payout.status} status")
        
        with transaction.atomic():
            payout.status = 'completed'
            payout.completed_at = timezone.now()
            payout.save()
            
            # Send notification
            try:
                from notifications.services.practitioner_notifications import PractitionerNotificationService
                notification_service = PractitionerNotificationService()
                notification_service.send_payout_confirmation(payout)
                logger.info(f"Sent payout confirmation for {payout.id}")
            except Exception as e:
                logger.error(f"Failed to send payout notification: {e}")
                # Don't fail the payout completion if notification fails
    
    def get_payout_history(
        self,
        practitioner: Practitioner,
        limit: int = 10
    ) -> List[PractitionerPayout]:
        """
        Get payout history for practitioner.
        
        Args:
            practitioner: Practitioner to get history for
            limit: Number of records to return
            
        Returns:
            List of recent payouts
        """
        return PractitionerPayout.objects.filter(
            practitioner=practitioner
        ).order_by('-created_at')[:limit]
    
    def cancel_payout(
        self,
        payout: PractitionerPayout,
        reason: str
    ) -> PractitionerPayout:
        """
        Cancel a pending payout.
        
        Args:
            payout: Payout to cancel
            reason: Reason for cancellation
            
        Returns:
            Updated payout
            
        Raises:
            ValueError: If payout cannot be cancelled
        """
        if payout.status != 'pending':
            raise ValueError(f"Cannot cancel payout in {payout.status} status")
        
        with transaction.atomic():
            # Update payout status
            payout.status = 'cancelled'
            payout.notes = f"{payout.notes}\nCancelled: {reason}" if payout.notes else f"Cancelled: {reason}"
            payout.save()
            
            # Revert earnings transactions to available
            payout.earnings_transactions.update(status='available')
            
            logger.info(f"Cancelled payout {payout.id}: {reason}")
            
        return payout