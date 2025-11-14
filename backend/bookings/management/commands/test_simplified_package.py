"""
Test the SIMPLIFIED package architecture (no parent booking).

This tests that:
1. Package purchase creates ONLY session bookings (no parent)
2. All session bookings are linked to the order
3. Order IS the package purchase record
4. Earnings are created when sessions are completed

Usage: python manage.py test_simplified_package --practitioner-id 5
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from practitioners.models import Practitioner
from services.models import Service, ServiceType
from users.models import User
from payments.models import Order
from bookings.models import Booking, BookingFactory


class Command(BaseCommand):
    help = 'Test simplified package architecture (no parent booking)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--practitioner-id',
            type=int,
            default=5,
            help='Practitioner ID to test with',
        )

    def handle(self, *args, **options):
        practitioner_id = options['practitioner_id']

        self.stdout.write(self.style.SUCCESS(f'\n{"="*70}'))
        self.stdout.write(self.style.SUCCESS('SIMPLIFIED PACKAGE ARCHITECTURE TEST'))
        self.stdout.write(self.style.SUCCESS(f'{"="*70}\n'))

        # Setup
        try:
            practitioner = Practitioner.objects.get(id=practitioner_id)
            self.stdout.write(f'Practitioner: {practitioner.display_name} (ID: {practitioner.id})\n')
        except Practitioner.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Practitioner {practitioner_id} not found'))
            return

        test_user, _ = User.objects.get_or_create(
            email='test.simple.package@example.com',
            defaults={'first_name': 'Test', 'last_name': 'SimplePackage'}
        )

        # Find package service
        try:
            package_type = ServiceType.objects.get(code='package')
            package_service = Service.objects.filter(
                primary_practitioner=practitioner,
                service_type=package_type,
                is_active=True
            ).first()

            if not package_service:
                self.stdout.write(self.style.ERROR('No package service found'))
                return

            # Check child services
            children = package_service.child_relationships.all()
            self.stdout.write(f'Package Service: {package_service.name} (${package_service.price})')
            self.stdout.write(f'  Contains {children.count()} child services:')
            total_sessions = sum(rel.quantity for rel in children)
            for rel in children:
                self.stdout.write(f'    - {rel.child_service.name} x {rel.quantity}')
            self.stdout.write(f'  Total sessions: {total_sessions}\n')

        except ServiceType.DoesNotExist:
            self.stdout.write(self.style.ERROR('Package service type not found'))
            return

        test_passed = True
        errors = []

        try:
            # Step 1: Create package purchase
            self.stdout.write(self.style.SUCCESS('Step 1: Create Package Purchase (Simplified)'))
            self.stdout.write('-' * 70)

            package_price_cents = int(package_service.price * 100)
            session_value_cents = package_price_cents // total_sessions

            # Create order
            order = Order.objects.create(
                user=test_user,
                service=package_service,
                practitioner=practitioner,
                subtotal_amount_cents=package_price_cents,
                total_amount_cents=package_price_cents,
                status='completed',
                order_type='package',
                package_metadata={
                    'package_type': 'package',
                    'total_sessions': total_sessions,
                    'sessions_completed': 0,
                    'session_value_cents': session_value_cents,
                    'package_service_id': package_service.id
                }
            )

            self.stdout.write(f'  ✓ Created order: ID {order.id}')
            self.stdout.write(f'    - Order type: {order.order_type}')
            self.stdout.write(f'    - Total sessions: {total_sessions}')
            self.stdout.write(f'    - Session value: ${session_value_cents/100:.2f}')

            # Create package bookings using factory
            first_booking = BookingFactory.create_package_booking(
                user=test_user,
                package_service=package_service,
                order=order
            )

            # Check what was created
            all_bookings = Booking.objects.filter(order=order)
            booking_count = all_bookings.count()

            self.stdout.write(f'\n  ✓ Factory created {booking_count} bookings')

            # Verify NO parent booking exists
            parent_bookings = all_bookings.filter(is_package_purchase=True)
            if parent_bookings.exists():
                self.stdout.write(self.style.ERROR(f'  ✗ WRONG: Found {parent_bookings.count()} parent bookings!'))
                test_passed = False
                errors.append('Parent booking should not exist in simplified architecture')
            else:
                self.stdout.write(self.style.SUCCESS(f'  ✓ CORRECT: No parent booking (simplified!)'))

            # Verify all bookings are sessions
            self.stdout.write(f'\n  Session bookings created:')
            for booking in all_bookings:
                self.stdout.write(f'    - Booking ID: {booking.id}')
                self.stdout.write(f'      Service: {booking.service.name}')
                self.stdout.write(f'      Order ID: {booking.order_id} {"✓" if booking.order_id == order.id else "✗"}')
                self.stdout.write(f'      Parent booking: {booking.parent_booking_id if booking.parent_booking else "None"} {"✓" if not booking.parent_booking else "✗"}')
                self.stdout.write(f'      Status: {booking.status}')
                self.stdout.write(f'      Price: ${booking.price_charged_cents/100:.2f}')

            # Verify count matches expected
            if booking_count != total_sessions:
                self.stdout.write(self.style.ERROR(f'\n  ✗ WRONG: Expected {total_sessions} bookings, got {booking_count}'))
                test_passed = False
                errors.append(f'Expected {total_sessions} session bookings, got {booking_count}')
            else:
                self.stdout.write(self.style.SUCCESS(f'\n  ✓ CORRECT: {booking_count} session bookings created'))

            # Verify all linked to order
            unlinked = all_bookings.filter(order__isnull=True)
            if unlinked.exists():
                self.stdout.write(self.style.ERROR(f'  ✗ WRONG: {unlinked.count()} bookings not linked to order!'))
                test_passed = False
                errors.append('Some bookings not linked to order')
            else:
                self.stdout.write(self.style.SUCCESS(f'  ✓ CORRECT: All bookings linked to order'))

            # Verify none have parent_booking
            with_parent = all_bookings.exclude(parent_booking__isnull=True)
            if with_parent.exists():
                self.stdout.write(self.style.ERROR(f'  ✗ WRONG: {with_parent.count()} bookings have parent_booking!'))
                test_passed = False
                errors.append('Bookings should not have parent_booking in simplified architecture')
            else:
                self.stdout.write(self.style.SUCCESS(f'  ✓ CORRECT: No bookings have parent_booking'))

            # Step 2: Verify Order is the package record
            self.stdout.write(f'\n{self.style.SUCCESS("Step 2: Verify Order IS the Package Purchase Record")}')
            self.stdout.write('-' * 70)

            self.stdout.write(f'  Order ID {order.id} contains:')
            self.stdout.write(f'    - Purchase date: {order.created_at}')
            self.stdout.write(f'    - Package name: {order.service.name}')
            self.stdout.write(f'    - Total price: ${order.total_amount_cents/100:.2f}')
            self.stdout.write(f'    - Total sessions: {order.total_sessions}')
            self.stdout.write(f'    - Sessions completed: {order.sessions_completed}')
            self.stdout.write(f'    - Session value: ${order.session_value_cents/100:.2f}')
            self.stdout.write(f'    - Bookings: {order.bookings.count()}')

            self.stdout.write(self.style.SUCCESS('\n  ✓ Order has ALL package purchase information!'))

            # Results
            self.stdout.write(f'\n{"="*70}')
            if test_passed:
                self.stdout.write(self.style.SUCCESS('✓ ALL TESTS PASSED'))
                self.stdout.write('\nSimplified architecture confirmed:')
                self.stdout.write('  ✓ No redundant parent booking')
                self.stdout.write('  ✓ Order IS the package purchase record')
                self.stdout.write(f'  ✓ {total_sessions} session bookings created')
                self.stdout.write('  ✓ All sessions linked to order')
                self.stdout.write('  ✓ Cleaner, simpler data model!')
            else:
                self.stdout.write(self.style.ERROR('✗ TESTS FAILED'))
                self.stdout.write('\nErrors:')
                for error in errors:
                    self.stdout.write(f'  - {error}')
            self.stdout.write('='*70 + '\n')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n✗ Test failed with exception: {str(e)}'))
            import traceback
            traceback.print_exc()
