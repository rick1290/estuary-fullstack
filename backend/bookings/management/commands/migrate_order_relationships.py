"""
Management command to migrate existing bookings to use Order FK relationship.

This command:
1. Populates booking.order FK for existing bookings
2. Updates earnings status (projected vs pending) based on booking completion
3. Sets package_metadata for package/bundle orders
4. Links credit_usage_transaction to bookings

Run with: python manage.py migrate_order_relationships
Add --dry-run to see what would be changed without committing
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from bookings.models import Booking
from payments.models import Order, EarningsTransaction, UserCreditTransaction
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Migrate existing bookings to use Order FK relationship'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making changes (preview mode)',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of records to process per batch',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        batch_size = options['batch_size']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))

        self.stdout.write('Starting order relationship migration...\n')

        # Statistics
        stats = {
            'bookings_total': 0,
            'bookings_linked': 0,
            'orders_updated': 0,
            'earnings_updated': 0,
            'credits_linked': 0,
            'errors': 0
        }

        # Step 1: Link bookings to orders
        self.stdout.write('Step 1: Linking bookings to orders...')
        stats.update(self._link_bookings_to_orders(dry_run, batch_size))

        # Step 2: Update earnings status
        self.stdout.write('\nStep 2: Updating earnings status...')
        stats.update(self._update_earnings_status(dry_run, batch_size))

        # Step 3: Set package metadata
        self.stdout.write('\nStep 3: Setting package metadata...')
        stats.update(self._set_package_metadata(dry_run, batch_size))

        # Step 4: Link credit transactions
        self.stdout.write('\nStep 4: Linking credit transactions...')
        stats.update(self._link_credit_transactions(dry_run, batch_size))

        # Step 5: Link child bookings to parent's order
        self.stdout.write('\nStep 5: Linking child bookings to parent order...')
        stats.update(self._link_child_bookings_to_order(dry_run, batch_size))

        # Print summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('Migration Summary:'))
        self.stdout.write(f"  Total bookings processed: {stats['bookings_total']}")
        self.stdout.write(f"  Bookings linked to orders: {stats['bookings_linked']}")
        self.stdout.write(f"  Child bookings linked to orders: {stats.get('children_linked', 0)}")
        self.stdout.write(f"  Orders updated with metadata: {stats['orders_updated']}")
        self.stdout.write(f"  Earnings status updated: {stats['earnings_updated']}")
        self.stdout.write(f"  Credit transactions linked: {stats['credits_linked']}")
        if stats['errors'] > 0:
            self.stdout.write(self.style.ERROR(f"  Errors encountered: {stats['errors']}"))

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN - No changes were saved'))
        else:
            self.stdout.write(self.style.SUCCESS('\nMigration completed successfully!'))

    def _link_bookings_to_orders(self, dry_run, batch_size):
        """Link bookings to their corresponding orders."""
        stats = {'bookings_total': 0, 'bookings_linked': 0, 'errors': 0}

        # Get bookings without order FK
        bookings_without_order = Booking.objects.filter(order__isnull=True).select_related('user', 'service')

        stats['bookings_total'] = bookings_without_order.count()
        self.stdout.write(f"  Found {stats['bookings_total']} bookings without order FK")

        # Process in batches
        for i in range(0, stats['bookings_total'], batch_size):
            batch = bookings_without_order[i:i + batch_size]

            if not dry_run:
                with transaction.atomic():
                    for booking in batch:
                        try:
                            # Try to find matching order
                            # Strategy: Find order with same user, service, and similar created_at time
                            potential_orders = Order.objects.filter(
                                user=booking.user,
                                service=booking.service,
                                created_at__gte=booking.created_at - timezone.timedelta(minutes=5),
                                created_at__lte=booking.created_at + timezone.timedelta(minutes=5)
                            ).order_by('created_at')

                            if potential_orders.exists():
                                # Use the first matching order
                                order = potential_orders.first()
                                booking.order = order
                                booking.save(update_fields=['order'])
                                stats['bookings_linked'] += 1
                            else:
                                logger.warning(f"No matching order found for booking {booking.id}")

                        except Exception as e:
                            logger.error(f"Error linking booking {booking.id}: {e}")
                            stats['errors'] += 1
            else:
                # In dry-run, just count what would be linked
                for booking in batch:
                    potential_orders = Order.objects.filter(
                        user=booking.user,
                        service=booking.service,
                        created_at__gte=booking.created_at - timezone.timedelta(minutes=5),
                        created_at__lte=booking.created_at + timezone.timedelta(minutes=5)
                    )
                    if potential_orders.exists():
                        stats['bookings_linked'] += 1

            self.stdout.write(f"    Processed {min(i + batch_size, stats['bookings_total'])}/{stats['bookings_total']} bookings")

        return stats

    def _update_earnings_status(self, dry_run, batch_size):
        """Update earnings status based on booking completion."""
        stats = {'earnings_updated': 0, 'errors': 0}

        # Get all earnings with 'pending' status that should be 'projected'
        # (bookings that haven't been completed yet)
        pending_earnings = EarningsTransaction.objects.filter(
            status='pending',
            booking__status__in=['draft', 'pending_payment', 'confirmed', 'in_progress']
        ).select_related('booking')

        count = pending_earnings.count()
        self.stdout.write(f"  Found {count} earnings to update from 'pending' to 'projected'")

        # Process in batches
        for i in range(0, count, batch_size):
            batch = pending_earnings[i:i + batch_size]

            if not dry_run:
                with transaction.atomic():
                    for earning in batch:
                        try:
                            earning.status = 'projected'
                            # Set available_after to booking.end_time + 48hrs if available
                            if earning.booking.end_time:
                                earning.available_after = earning.booking.end_time + timezone.timedelta(hours=48)
                            earning.save(update_fields=['status', 'available_after'])
                            stats['earnings_updated'] += 1
                        except Exception as e:
                            logger.error(f"Error updating earning {earning.id}: {e}")
                            stats['errors'] += 1
            else:
                stats['earnings_updated'] += batch.count()

            self.stdout.write(f"    Processed {min(i + batch_size, count)}/{count} earnings")

        return stats

    def _set_package_metadata(self, dry_run, batch_size):
        """Set package_metadata for package/bundle orders."""
        stats = {'orders_updated': 0, 'errors': 0}

        # Get package/bundle orders without metadata
        package_orders = Order.objects.filter(
            order_type__in=['package', 'bundle'],
            package_metadata__isnull=True
        ).select_related('service')

        count = package_orders.count()
        self.stdout.write(f"  Found {count} package/bundle orders without metadata")

        # Process in batches
        for i in range(0, count, batch_size):
            batch = package_orders[i:i + batch_size]

            if not dry_run:
                with transaction.atomic():
                    for order in batch:
                        try:
                            # Get child bookings for this order
                            child_bookings = Booking.objects.filter(order=order, parent_booking__isnull=False)
                            total_sessions = child_bookings.count()
                            completed_sessions = child_bookings.filter(status='completed').count()

                            # Calculate session value (total / sessions)
                            session_value_cents = order.total_amount_cents // total_sessions if total_sessions > 0 else 0

                            # Set metadata
                            order.package_metadata = {
                                'package_type': order.order_type,
                                'total_sessions': total_sessions,
                                'sessions_completed': completed_sessions,
                                'session_value_cents': session_value_cents,
                                'package_service_id': order.service.id if order.service else None
                            }
                            order.save(update_fields=['package_metadata'])
                            stats['orders_updated'] += 1
                        except Exception as e:
                            logger.error(f"Error updating order {order.id} metadata: {e}")
                            stats['errors'] += 1
            else:
                stats['orders_updated'] += batch.count()

            self.stdout.write(f"    Processed {min(i + batch_size, count)}/{count} orders")

        return stats

    def _link_credit_transactions(self, dry_run, batch_size):
        """Link credit usage transactions to bookings."""
        stats = {'credits_linked': 0, 'errors': 0}

        # Get bookings with order but no credit_usage_transaction set
        bookings_needing_credits = Booking.objects.filter(
            order__isnull=False,
            credit_usage_transaction__isnull=True
        ).select_related('order')

        count = bookings_needing_credits.count()
        self.stdout.write(f"  Found {count} bookings that might need credit transaction links")

        # Process in batches
        for i in range(0, count, batch_size):
            batch = bookings_needing_credits[i:i + batch_size]

            if not dry_run:
                with transaction.atomic():
                    for booking in batch:
                        try:
                            # Find usage transaction for this order
                            usage_txn = UserCreditTransaction.objects.filter(
                                order=booking.order,
                                transaction_type='usage'
                            ).first()

                            if usage_txn:
                                booking.credit_usage_transaction = usage_txn
                                booking.save(update_fields=['credit_usage_transaction'])
                                stats['credits_linked'] += 1
                        except Exception as e:
                            logger.error(f"Error linking credit for booking {booking.id}: {e}")
                            stats['errors'] += 1
            else:
                # In dry-run, count what would be linked
                for booking in batch:
                    usage_txn = UserCreditTransaction.objects.filter(
                        order=booking.order,
                        transaction_type='usage'
                    ).first()
                    if usage_txn:
                        stats['credits_linked'] += 1

            self.stdout.write(f"    Processed {min(i + batch_size, count)}/{count} bookings")

        return stats

    def _link_child_bookings_to_order(self, dry_run, batch_size):
        """Link child bookings to their parent's order."""
        stats = {'children_linked': 0, 'errors': 0}

        # Get child bookings that have a parent with an order, but no order themselves
        child_bookings = Booking.objects.filter(
            parent_booking__isnull=False,
            order__isnull=True,
            parent_booking__order__isnull=False
        ).select_related('parent_booking')

        count = child_bookings.count()
        self.stdout.write(f"  Found {count} child bookings to link to parent order")

        # Process in batches
        for i in range(0, count, batch_size):
            batch = child_bookings[i:i + batch_size]

            if not dry_run:
                with transaction.atomic():
                    for child in batch:
                        try:
                            child.order = child.parent_booking.order
                            child.save(update_fields=['order'])
                            stats['children_linked'] += 1
                        except Exception as e:
                            logger.error(f"Error linking child booking {child.id}: {e}")
                            stats['errors'] += 1
            else:
                stats['children_linked'] += batch.count()

            self.stdout.write(f"    Processed {min(i + batch_size, count)}/{count} child bookings")

        return stats
