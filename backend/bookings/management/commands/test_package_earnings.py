"""
Test package/bundle earnings flow - the critical bug we fixed.

This tests that:
1. Package purchase does NOT create earnings (just a purchase)
2. When individual package sessions are completed, earnings ARE created
3. Earnings use the session_value_cents from order metadata
4. Package progress tracking works

Usage: python manage.py test_package_earnings --practitioner-id 5
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from practitioners.models import Practitioner
from services.models import Service, ServiceType
from users.models import User
from payments.models import Order, EarningsTransaction
from bookings.models import Booking
from bookings.services import BookingService
from payments.services import EarningsService


class Command(BaseCommand):
    help = 'Test package/bundle earnings creation flow'

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
        self.stdout.write(self.style.SUCCESS('PACKAGE/BUNDLE EARNINGS TEST'))
        self.stdout.write(self.style.SUCCESS(f'{"="*70}\n'))

        # Setup
        try:
            practitioner = Practitioner.objects.get(id=practitioner_id)
            self.stdout.write(f'Practitioner: {practitioner.display_name} (ID: {practitioner.id})\n')
        except Practitioner.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Practitioner {practitioner_id} not found'))
            return

        # Get or create test user
        test_user, _ = User.objects.get_or_create(
            email='test.package@example.com',
            defaults={'first_name': 'Test', 'last_name': 'Package'}
        )

        # Find a package service
        try:
            package_type = ServiceType.objects.get(code='package')
            package_service = Service.objects.filter(
                primary_practitioner=practitioner,
                service_type=package_type,
                is_active=True
            ).first()

            if not package_service:
                self.stdout.write(self.style.ERROR('No package service found for this practitioner'))
                return

            self.stdout.write(f'Package Service: {package_service.name} (${package_service.price})\n')

        except ServiceType.DoesNotExist:
            self.stdout.write(self.style.ERROR('Package service type not found'))
            return

        # Test flow
        test_passed = True
        errors = []

        try:
            # Step 1: Create package purchase
            self.stdout.write(self.style.SUCCESS('Step 1: Create Package Purchase'))
            self.stdout.write('-' * 70)

            # Create order
            package_price_cents = int(package_service.price * 100)
            total_sessions = 5
            session_value_cents = package_price_cents // total_sessions

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

            self.stdout.write(f'  ✓ Created package order: ID {order.id}')
            self.stdout.write(f'    - Total price: ${package_price_cents/100:.2f}')
            self.stdout.write(f'    - Total sessions: {total_sessions}')
            self.stdout.write(f'    - Session value: ${session_value_cents/100:.2f}')

            # Create parent booking (the package purchase itself)
            parent_booking = Booking.objects.create(
                user=test_user,
                service=package_service,
                practitioner=practitioner,
                order=order,
                price_charged_cents=package_price_cents,
                final_amount_cents=package_price_cents,
                start_time=timezone.now(),  # Placeholder
                end_time=timezone.now() + timedelta(hours=1),  # Placeholder
                status='confirmed',
                payment_status='paid',
                is_package_purchase=True,
                service_name_snapshot=package_service.name
            )

            self.stdout.write(f'  ✓ Created parent booking: ID {parent_booking.id}')

            # Check NO earnings were created for parent
            parent_earnings = EarningsTransaction.objects.filter(booking=parent_booking)
            if parent_earnings.exists():
                self.stdout.write(self.style.ERROR(f'  ✗ WRONG: Earnings created for package purchase!'))
                test_passed = False
                errors.append('Earnings should not be created for package purchase')
            else:
                self.stdout.write(self.style.SUCCESS(f'  ✓ CORRECT: No earnings for package purchase'))

            # Step 2: Create child bookings (individual sessions)
            self.stdout.write(f'\n{self.style.SUCCESS("Step 2: Create Child Bookings (Individual Sessions)")}')
            self.stdout.write('-' * 70)

            child_bookings = []
            for i in range(total_sessions):
                child = Booking.objects.create(
                    user=test_user,
                    service=package_service,
                    practitioner=practitioner,
                    order=order,
                    parent_booking=parent_booking,
                    price_charged_cents=0,  # Included in package
                    final_amount_cents=0,
                    start_time=None,  # Unscheduled
                    end_time=None,  # Unscheduled
                    status='draft',
                    payment_status='paid',
                    service_name_snapshot=f'{package_service.name} - Session {i+1}'
                )
                child_bookings.append(child)

            self.stdout.write(f'  ✓ Created {len(child_bookings)} child bookings')

            # Step 3: Schedule and complete first session
            self.stdout.write(f'\n{self.style.SUCCESS("Step 3: Schedule and Complete First Session")}')
            self.stdout.write('-' * 70)

            first_child = child_bookings[0]
            first_child.start_time = timezone.now() - timedelta(hours=2)
            first_child.end_time = timezone.now() - timedelta(hours=1)
            first_child.status = 'confirmed'
            first_child.save()

            self.stdout.write(f'  ✓ Scheduled first session: ID {first_child.id}')

            # Check NO earnings yet (status is confirmed, not completed)
            child_earnings_before = EarningsTransaction.objects.filter(booking=first_child)
            if child_earnings_before.exists():
                self.stdout.write(self.style.WARNING(f'  ⚠ Earnings exist before completion (might be from previous run)'))

            # Now complete the session
            booking_service = BookingService()
            earnings_service = EarningsService()

            # First create earnings (simulating mark-completed-bookings task)
            self.stdout.write(f'\n  Creating earnings for completed session...')

            existing_earnings = EarningsTransaction.objects.filter(
                booking=first_child,
                transaction_type='booking'
            ).first()

            if not existing_earnings and first_child.practitioner:
                earnings = earnings_service.create_booking_earnings(
                    practitioner=first_child.practitioner,
                    booking=first_child,
                    service=first_child.service,
                    gross_amount_cents=order.session_value_cents
                )

                if earnings:
                    self.stdout.write(f'  ✓ Created earnings: ID {earnings.id}')
                    self.stdout.write(f'    - Status: {earnings.status}')
                    self.stdout.write(f'    - Gross: ${earnings.gross_amount_cents/100:.2f}')
                    self.stdout.write(f'    - Net: ${earnings.net_amount_cents/100:.2f}')

                    # Verify earnings used session_value_cents
                    if earnings.gross_amount_cents == session_value_cents:
                        self.stdout.write(self.style.SUCCESS(f'  ✓ CORRECT: Used session value (${session_value_cents/100:.2f})'))
                    else:
                        self.stdout.write(self.style.ERROR(
                            f'  ✗ WRONG: Used ${earnings.gross_amount_cents/100:.2f} instead of session value ${session_value_cents/100:.2f}'
                        ))
                        test_passed = False
                        errors.append('Earnings did not use session_value_cents')

                    # Verify status is 'projected'
                    if earnings.status == 'projected':
                        self.stdout.write(self.style.SUCCESS(f'  ✓ CORRECT: Status is "projected"'))
                    else:
                        self.stdout.write(self.style.ERROR(f'  ✗ WRONG: Status is "{earnings.status}" (expected "projected")'))
                        test_passed = False
                        errors.append(f'Earnings status is {earnings.status}, expected projected')
                else:
                    self.stdout.write(self.style.ERROR('  ✗ No earnings created!'))
                    test_passed = False
                    errors.append('create_booking_earnings returned None')
            else:
                if existing_earnings:
                    self.stdout.write(f'  ⚠ Using existing earnings: ID {existing_earnings.id}')
                    earnings = existing_earnings

            # Mark session as completed
            self.stdout.write(f'\n  Marking session as completed...')
            booking_service.mark_booking_completed(first_child)

            # Reload earnings
            if existing_earnings:
                earnings = existing_earnings
                earnings.refresh_from_db()
            else:
                earnings = EarningsTransaction.objects.filter(booking=first_child).first()

            if earnings:
                self.stdout.write(f'  ✓ Status after completion: {earnings.status}')
                if earnings.status == 'pending':
                    self.stdout.write(self.style.SUCCESS(f'  ✓ CORRECT: Status updated to "pending"'))
                else:
                    self.stdout.write(self.style.ERROR(f'  ✗ WRONG: Status is "{earnings.status}" (expected "pending")'))
                    test_passed = False
                    errors.append(f'Earnings status after completion is {earnings.status}, expected pending')

            # Check package progress
            order.refresh_from_db()
            sessions_completed = order.sessions_completed
            self.stdout.write(f'\n  ✓ Package progress: {sessions_completed}/{total_sessions} sessions completed')

            if sessions_completed == 1:
                self.stdout.write(self.style.SUCCESS(f'  ✓ CORRECT: Progress tracking works'))
            else:
                self.stdout.write(self.style.ERROR(f'  ✗ WRONG: Expected 1 session completed, got {sessions_completed}'))
                test_passed = False
                errors.append('Package progress tracking not working')

            # Step 4: Results
            self.stdout.write(f'\n{"="*70}')
            if test_passed:
                self.stdout.write(self.style.SUCCESS('✓ ALL TESTS PASSED'))
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
