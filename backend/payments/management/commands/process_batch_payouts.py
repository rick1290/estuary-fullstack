import logging
import uuid
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Q

from apps.payments.models import PractitionerCreditTransaction, PractitionerPayout
from apps.practitioners.models import Practitioner

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process batch payouts for practitioners with ready transactions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run in dry-run mode (no actual changes)',
        )
        parser.add_argument(
            '--practitioner-id',
            type=int,
            help='Process payout only for a specific practitioner ID',
        )
        parser.add_argument(
            '--min-amount',
            type=float,
            default=10.0,
            help='Minimum credit amount required to process a payout',
        )
        parser.add_argument(
            '--payment-method',
            type=str,
            default='stripe',
            choices=['stripe', 'manual'],
            help='Payment method to use for the payout',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        practitioner_id = options.get('practitioner_id')
        min_amount = options.get('min_amount', 10.0)
        payment_method = options.get('payment_method', 'stripe')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Running in DRY RUN mode - no changes will be made'))
        
        # Get practitioners with ready transactions
        practitioners_with_ready_txs = self.get_practitioners_with_ready_transactions(
            practitioner_id=practitioner_id,
            min_amount=min_amount
        )
        
        if not practitioners_with_ready_txs:
            self.stdout.write(self.style.WARNING('No practitioners found with ready transactions'))
            return
        
        self.stdout.write(f'Found {len(practitioners_with_ready_txs)} practitioners with ready transactions')
        
        # Process each practitioner
        for practitioner_data in practitioners_with_ready_txs:
            practitioner_id = practitioner_data['practitioner_id']
            total_credits = practitioner_data['total_credits']
            tx_count = practitioner_data['tx_count']
            
            self.stdout.write(
                f'Processing practitioner {practitioner_id}: '
                f'{tx_count} transactions, {total_credits} credits'
            )
            
            if dry_run:
                continue
                
            try:
                self.process_practitioner_payout(
                    practitioner_id=practitioner_id,
                    payment_method=payment_method
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error processing payout for practitioner {practitioner_id}: {str(e)}'
                    )
                )
                logger.exception(f'Error processing batch payout: {str(e)}')
        
        self.stdout.write(self.style.SUCCESS('Batch payout processing completed'))

    def get_practitioners_with_ready_transactions(self, practitioner_id=None, min_amount=10.0):
        """Get all practitioners with transactions ready for payout."""
        # Base query for ready transactions
        ready_tx_query = Q(payout_status='ready') | Q(
            payout_status='pending',
            ready_for_payout_date__isnull=False
        )
        
        # Add practitioner filter if specified
        if practitioner_id:
            ready_tx_query &= Q(practitioner_id=practitioner_id)
        
        # Get practitioners with ready transactions, grouped by practitioner
        practitioners = PractitionerCreditTransaction.objects.filter(
            ready_tx_query
        ).values(
            'practitioner_id'
        ).annotate(
            total_credits=Sum('net_credits'),
            tx_count=Count('id')
        ).filter(
            total_credits__gte=min_amount
        ).order_by('-total_credits')
        
        return list(practitioners)
    
    def process_practitioner_payout(self, practitioner_id, payment_method='stripe'):
        """Process a batch payout for a specific practitioner."""
        try:
            practitioner = Practitioner.objects.get(id=practitioner_id)
        except Practitioner.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Practitioner {practitioner_id} not found'))
            return False
        
        # Get all ready transactions for this practitioner
        ready_tx_query = Q(payout_status='ready') | Q(
            payout_status='pending',
            ready_for_payout_date__isnull=False
        )
        
        ready_transactions = PractitionerCreditTransaction.objects.filter(
            ready_tx_query,
            practitioner=practitioner
        )
        
        if not ready_transactions.exists():
            self.stdout.write(f'No ready transactions found for practitioner {practitioner_id}')
            return False
        
        # Calculate total credits
        total_credits = ready_transactions.aggregate(Sum('net_credits'))['net_credits__sum'] or 0
        
        # Create batch payout
        with transaction.atomic():
            batch_id = uuid.uuid4()
            notes = f"Batch payout created on {timezone.now().strftime('%Y-%m-%d')} via management command"
            
            payout = PractitionerPayout.create_batch_payout(
                practitioner=practitioner,
                transactions=ready_transactions,
                notes=notes
            )
            
            # Update payout with payment method
            payout.payment_method = payment_method
            payout.save(update_fields=['payment_method'])
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Created batch payout {payout.id} for practitioner {practitioner_id}: '
                    f'{ready_transactions.count()} transactions, {total_credits} credits'
                )
            )
            
            # If using Stripe, we would trigger the Stripe payout here
            if payment_method == 'stripe' and hasattr(practitioner, 'stripe_account_id') and practitioner.stripe_account_id:
                self.stdout.write(f'Would trigger Stripe payout to {practitioner.stripe_account_id}')
                # In a real implementation, you would call your Stripe service here
            
            return payout
