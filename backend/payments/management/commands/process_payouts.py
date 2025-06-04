import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.payments.models import PackageCompletionRecord, PractitionerCreditTransaction
from apps.payments.services import PackageCompletionService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process pending package completions and practitioner payouts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run in dry-run mode (no actual changes)',
        )
        parser.add_argument(
            '--only-packages',
            action='store_true',
            help='Only process package completions, not individual transactions',
        )
        parser.add_argument(
            '--only-transactions',
            action='store_true',
            help='Only process individual transactions, not package completions',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        only_packages = options.get('only_packages', False)
        only_transactions = options.get('only_transactions', False)
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Running in DRY RUN mode - no changes will be made'))
        
        # Process package completions if not only_transactions
        if not only_transactions:
            self.process_package_completions(dry_run)
        
        # Process individual transactions if not only_packages
        if not only_packages:
            self.process_individual_transactions(dry_run)
            
        self.stdout.write(self.style.SUCCESS('Payout processing completed'))

    def process_package_completions(self, dry_run):
        """Process all pending package completions"""
        self.stdout.write('Processing package completions...')
        
        # First update all package completion statuses
        pending_records = PackageCompletionRecord.objects.filter(
            status__in=['pending', 'in_progress']
        )
        
        self.stdout.write(f'Found {pending_records.count()} pending package completion records')
        
        updated_count = 0
        for record in pending_records:
            old_status = record.status
            record.update_completion_status()
            if old_status != record.status:
                updated_count += 1
                self.stdout.write(f'  Updated package {record.package_booking.id}: {old_status} -> {record.status}')
        
        self.stdout.write(f'Updated status for {updated_count} package records')
        
        # Now process payouts for completed packages
        completed_records = PackageCompletionRecord.objects.filter(
            status='completed',
            payout_processed=False
        )
        
        self.stdout.write(f'Found {completed_records.count()} completed packages ready for payout')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - would process payouts for these packages:'))
            for record in completed_records:
                self.stdout.write(f'  Package {record.package_booking.id} - {record.package_booking.practitioner}')
            return
        
        # Process the payouts
        processed_count = 0
        for record in completed_records:
            try:
                with transaction.atomic():
                    record.process_payout()
                    processed_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Processed payout for package {record.package_booking.id} - '
                            f'{record.package_booking.practitioner}'
                        )
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error processing payout for package {record.package_booking.id}: {str(e)}'
                    )
                )
                logger.exception(f'Error processing package payout: {str(e)}')
        
        self.stdout.write(self.style.SUCCESS(f'Successfully processed {processed_count} package payouts'))

    def process_individual_transactions(self, dry_run):
        """Process individual pending transactions"""
        self.stdout.write('Processing individual pending transactions...')
        
        # Get all pending transactions that are not part of a package
        pending_transactions = PractitionerCreditTransaction.objects.filter(
            payout_status='pending',
            booking__isnull=False,
        ).exclude(
            booking__parent_booking__isnull=False  # Exclude child bookings
        ).exclude(
            booking__is_package_booking=True  # Exclude package bookings
        ).exclude(
            booking__is_course_booking=True  # Exclude course bookings
        )
        
        self.stdout.write(f'Found {pending_transactions.count()} pending individual transactions')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - would mark these transactions as ready:'))
            for tx in pending_transactions:
                self.stdout.write(f'  Transaction {tx.id} - {tx.practitioner} - {tx.net_credits} credits')
            return
        
        # Mark transactions as ready for payout
        processed_count = 0
        for tx in pending_transactions:
            try:
                with transaction.atomic():
                    tx.payout_status = 'ready'
                    tx.ready_for_payout_date = timezone.now()
                    tx.save()
                    processed_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Marked transaction {tx.id} as ready for payout - '
                            f'{tx.practitioner} - {tx.net_credits} credits'
                        )
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error processing transaction {tx.id}: {str(e)}'
                    )
                )
                logger.exception(f'Error processing transaction: {str(e)}')
        
        self.stdout.write(self.style.SUCCESS(f'Successfully processed {processed_count} individual transactions'))
