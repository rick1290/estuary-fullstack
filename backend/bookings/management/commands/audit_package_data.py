"""
Management command to audit package and bundle data before migration.
Run this before executing the parent booking → order migration.
"""
from django.core.management.base import BaseCommand
from django.db.models import Count, Sum, Q
from bookings.models import Booking
from payments.models import Order, EarningsTransaction, UserCreditTransaction


class Command(BaseCommand):
    help = 'Audit package and bundle data before migration to Order-as-Parent architecture'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== PACKAGE & BUNDLE DATA AUDIT ===\n'))

        # 1. Parent Bookings Analysis
        self.stdout.write(self.style.WARNING('1. PARENT BOOKINGS ANALYSIS'))

        package_parents = Booking.objects.filter(is_package_purchase=True)
        bundle_parents = Booking.objects.filter(is_bundle_purchase=True)

        self.stdout.write(f'   Total package parents: {package_parents.count()}')
        self.stdout.write(f'   Total bundle parents: {bundle_parents.count()}')

        # 2. Child Bookings Analysis
        self.stdout.write(self.style.WARNING('\n2. CHILD BOOKINGS ANALYSIS'))

        for parent in package_parents:
            children = Booking.objects.filter(parent_booking=parent)
            self.stdout.write(f'   Package {parent.id}: {children.count()} child bookings')
            if children.count() == 0:
                self.stdout.write(self.style.ERROR(f'   ⚠️  Package {parent.id} has NO child bookings!'))

        for parent in bundle_parents:
            children = Booking.objects.filter(parent_booking=parent)
            self.stdout.write(f'   Bundle {parent.id}: {children.count()} child bookings')
            if children.count() == 0:
                self.stdout.write(self.style.ERROR(f'   ⚠️  Bundle {parent.id} has NO child bookings!'))

        # 3. Order Linkage Analysis
        self.stdout.write(self.style.WARNING('\n3. ORDER LINKAGE ANALYSIS'))

        parents_with_orders = 0
        parents_without_orders = 0

        for parent in package_parents | bundle_parents:
            if hasattr(parent, 'order') and parent.order:
                parents_with_orders += 1
            else:
                parents_without_orders += 1
                self.stdout.write(self.style.ERROR(f'   ⚠️  Parent booking {parent.id} has NO associated order!'))

        self.stdout.write(f'   Parents with orders: {parents_with_orders}')
        self.stdout.write(f'   Parents without orders: {parents_without_orders}')

        # 4. Earnings Analysis
        self.stdout.write(self.style.WARNING('\n4. EARNINGS ANALYSIS'))

        package_earnings_count = 0
        bundle_earnings_count = 0

        for parent in package_parents:
            earnings = EarningsTransaction.objects.filter(booking=parent)
            package_earnings_count += earnings.count()
            if earnings.count() > 0:
                self.stdout.write(self.style.ERROR(
                    f'   ⚠️  Package parent {parent.id} has {earnings.count()} earnings transactions! '
                    f'(Should have 0 - earnings should be on child bookings)'
                ))

        for parent in bundle_parents:
            earnings = EarningsTransaction.objects.filter(booking=parent)
            bundle_earnings_count += earnings.count()
            if earnings.count() > 0:
                self.stdout.write(self.style.ERROR(
                    f'   ⚠️  Bundle parent {parent.id} has {earnings.count()} earnings transactions! '
                    f'(Should have 0 - earnings should be on child bookings)'
                ))

        self.stdout.write(f'   Package parent earnings: {package_earnings_count}')
        self.stdout.write(f'   Bundle parent earnings: {bundle_earnings_count}')

        # Check child booking earnings
        total_child_earnings = 0
        for parent in package_parents | bundle_parents:
            children = Booking.objects.filter(parent_booking=parent)
            for child in children:
                child_earnings = EarningsTransaction.objects.filter(booking=child)
                total_child_earnings += child_earnings.count()

        self.stdout.write(f'   Child booking earnings: {total_child_earnings}')

        # 5. Credit Transactions Analysis
        self.stdout.write(self.style.WARNING('\n5. CREDIT TRANSACTIONS ANALYSIS'))

        package_credits = 0
        bundle_credits = 0

        for parent in package_parents:
            credits = UserCreditTransaction.objects.filter(booking=parent)
            package_credits += credits.count()

        for parent in bundle_parents:
            credits = UserCreditTransaction.objects.filter(booking=parent)
            bundle_credits += credits.count()

        self.stdout.write(f'   Package parent credit transactions: {package_credits}')
        self.stdout.write(f'   Bundle parent credit transactions: {bundle_credits}')

        # 6. Status Distribution
        self.stdout.write(self.style.WARNING('\n6. STATUS DISTRIBUTION'))

        for status in ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']:
            count = (package_parents | bundle_parents).filter(status=status).count()
            self.stdout.write(f'   {status}: {count}')

        # 7. Booking Dates
        self.stdout.write(self.style.WARNING('\n7. BOOKING TIMING'))

        parents_with_times = (package_parents | bundle_parents).filter(
            start_time__isnull=False,
            end_time__isnull=False
        ).count()

        parents_without_times = (package_parents | bundle_parents).filter(
            Q(start_time__isnull=True) | Q(end_time__isnull=True)
        ).count()

        self.stdout.write(f'   Parents with start/end times: {parents_with_times}')
        self.stdout.write(f'   Parents without times: {parents_without_times}')

        # 8. Order Analysis
        self.stdout.write(self.style.WARNING('\n8. ORDER DETAILS'))

        package_orders = Order.objects.filter(
            booking__is_package_purchase=True
        ).distinct()

        bundle_orders = Order.objects.filter(
            booking__is_bundle_purchase=True
        ).distinct()

        self.stdout.write(f'   Package orders: {package_orders.count()}')
        self.stdout.write(f'   Bundle orders: {bundle_orders.count()}')

        # Check if orders have package_metadata already (shouldn't)
        orders_with_metadata = Order.objects.filter(
            package_metadata__isnull=False
        ).count()

        self.stdout.write(f'   Orders with package_metadata: {orders_with_metadata}')

        # 9. Data Consistency Checks
        self.stdout.write(self.style.WARNING('\n9. CONSISTENCY CHECKS'))

        # Check for orphaned child bookings
        orphaned_children = Booking.objects.filter(
            parent_booking__isnull=False
        ).exclude(
            parent_booking__in=package_parents | bundle_parents
        )

        if orphaned_children.exists():
            self.stdout.write(self.style.ERROR(
                f'   ⚠️  Found {orphaned_children.count()} orphaned child bookings '
                f'(parent_booking set but parent not found)'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('   ✓ No orphaned child bookings'))

        # Check for children without parents that should have them
        potential_children = Booking.objects.filter(
            parent_booking__isnull=True,
            is_package_purchase=False,
            is_bundle_purchase=False
        ).exclude(
            service__service_type__in=['session', 'workshop']
        )

        self.stdout.write(f'   Non-session/workshop bookings without parents: {potential_children.count()}')

        # Summary
        self.stdout.write(self.style.SUCCESS('\n=== AUDIT COMPLETE ==='))
        self.stdout.write('\nNext steps:')
        self.stdout.write('1. Review any warnings (⚠️) above')
        self.stdout.write('2. Backup database before migration')
        self.stdout.write('3. Run: python manage.py migrate_to_order_parent')
        self.stdout.write('4. Run this audit again to verify migration')
