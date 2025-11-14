"""
Test the complete earnings and credits flow across all service types.

Usage: python manage.py test_earnings_flow --practitioner-id 5
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from practitioners.models import Practitioner
from services.models import Service, ServiceType
from users.models import User
from payments.models import Order, EarningsTransaction, PaymentMethod
from payments.services.checkout_orchestrator_fast import FastCheckoutOrchestrator
from bookings.models import Booking
from bookings.services import BookingService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Test earnings and credits flow across all service types'

    def add_arguments(self, parser):
        parser.add_argument(
            '--practitioner-id',
            type=int,
            default=5,
            help='Practitioner ID to test with',
        )
        parser.add_argument(
            '--user-email',
            type=str,
            default=None,
            help='Test user email (will create if not exists)',
        )

    def handle(self, *args, **options):
        practitioner_id = options['practitioner_id']
        user_email = options.get('user_email') or 'test.earnings@example.com'

        self.stdout.write(self.style.SUCCESS(f'\n{"="*70}'))
        self.stdout.write(self.style.SUCCESS('EARNINGS & CREDITS FLOW TEST'))
        self.stdout.write(self.style.SUCCESS(f'{"="*70}\n'))

        # Step 1: Setup
        self.stdout.write('Step 1: Setup test environment...')
        practitioner, test_user, services = self._setup(practitioner_id, user_email)

        if not practitioner:
            return

        # Step 2: Display setup info
        self._display_setup_info(practitioner, test_user, services)

        # Step 3: Test each service type
        self.stdout.write(self.style.SUCCESS(f'\n{"="*70}'))
        self.stdout.write(self.style.SUCCESS('RUNNING TESTS'))
        self.stdout.write(self.style.SUCCESS(f'{"="*70}\n'))

        results = {}

        # Test session booking
        if 'session' in services:
            results['session'] = self._test_session_booking(test_user, services['session'])

        # Test workshop booking
        if 'workshop' in services:
            results['workshop'] = self._test_workshop_booking(test_user, services['workshop'])

        # Test course booking
        if 'course' in services:
            results['course'] = self._test_course_booking(test_user, services['course'])

        # Test package booking
        if 'package' in services:
            results['package'] = self._test_package_booking(test_user, services['package'])

        # Test bundle booking
        if 'bundle' in services:
            results['bundle'] = self._test_bundle_booking(test_user, services['bundle'])

        # Step 4: Display results
        self._display_results(results)

    def _setup(self, practitioner_id, user_email):
        """Setup test environment."""
        try:
            practitioner = Practitioner.objects.get(id=practitioner_id)
            self.stdout.write(f'  ✓ Found practitioner: {practitioner.display_name}')
        except Practitioner.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'  ✗ Practitioner {practitioner_id} not found'))
            # Show available practitioners
            pracs = Practitioner.objects.all()[:5]
            self.stdout.write('\n  Available practitioners:')
            for p in pracs:
                self.stdout.write(f'    - ID {p.id}: {p.display_name}')
            return None, None, None

        # Get or create test user
        test_user, created = User.objects.get_or_create(
            email=user_email,
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
            }
        )
        if created:
            test_user.set_password('testpass123')
            test_user.save()
            self.stdout.write(f'  ✓ Created test user: {user_email}')
        else:
            self.stdout.write(f'  ✓ Using existing test user: {user_email}')

        # Get services by type
        services = {}
        service_types = ['session', 'workshop', 'course', 'package', 'bundle']

        for stype_code in service_types:
            try:
                stype = ServiceType.objects.get(code=stype_code)
                service = Service.objects.filter(
                    primary_practitioner=practitioner,
                    service_type=stype,
                    is_active=True
                ).first()
                if service:
                    services[stype_code] = service
            except ServiceType.DoesNotExist:
                pass

        return practitioner, test_user, services

    def _display_setup_info(self, practitioner, test_user, services):
        """Display setup information."""
        self.stdout.write('\n' + '-'*70)
        self.stdout.write('Test Configuration:')
        self.stdout.write(f'  Practitioner: {practitioner.display_name} (ID: {practitioner.id})')
        self.stdout.write(f'  Test User: {test_user.email} (ID: {test_user.id})')
        self.stdout.write(f'\n  Available Services:')

        if not services:
            self.stdout.write(self.style.WARNING('    No services found for this practitioner!'))
            all_services = Service.objects.filter(
                primary_practitioner=practitioner,
                is_active=True
            )
            if all_services.exists():
                self.stdout.write('\n    Practitioner services:')
                for s in all_services:
                    stype = s.service_type.code if s.service_type else 'unknown'
                    self.stdout.write(f'      - {s.name} ({stype}) - ${s.price}')
        else:
            for stype, service in services.items():
                self.stdout.write(f'    ✓ {stype}: {service.name} (${service.price})')

        self.stdout.write('-'*70)

    def _test_session_booking(self, user, service):
        """Test session booking flow."""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('TEST: Session Booking'))
        self.stdout.write('='*70)

        result = {
            'service_type': 'session',
            'service': service.name,
            'success': False,
            'booking_id': None,
            'order_id': None,
            'earnings_id': None,
            'errors': []
        }

        try:
            # Create test booking
            self.stdout.write(f'\n1. Creating session booking for "{service.name}"...')

            start_time = timezone.now() + timedelta(hours=2)
            end_time = start_time + timedelta(hours=1)

            booking = Booking.objects.create(
                user=user,
                service=service,
                practitioner=service.primary_practitioner,
                start_time=start_time,
                end_time=end_time,
                price_charged_cents=int(service.price * 100),
                final_amount_cents=int(service.price * 100),
                status='confirmed',
                payment_status='paid',
                service_name_snapshot=service.name
            )

            result['booking_id'] = booking.id
            self.stdout.write(f'   ✓ Created booking ID: {booking.id}')

            # Create order
            order = Order.objects.create(
                user=user,
                service=service,
                practitioner=service.primary_practitioner,
                subtotal_amount_cents=int(service.price * 100),
                total_amount_cents=int(service.price * 100),
                status='completed',
                order_type='direct'
            )
            result['order_id'] = order.id
            self.stdout.write(f'   ✓ Created order ID: {order.id}')

            # Link order to booking
            booking.order = order
            booking.save()
            self.stdout.write(f'   ✓ Linked booking to order')

            # Create earnings
            from payments.services import EarningsService
            earnings_service = EarningsService()

            earnings = earnings_service.create_booking_earnings(
                practitioner=service.primary_practitioner,
                booking=booking,
                service=service,
                gross_amount_cents=int(service.price * 100)
            )

            if earnings:
                result['earnings_id'] = earnings.id
                self.stdout.write(f'\n2. Earnings created:')
                self.stdout.write(f'   - ID: {earnings.id}')
                self.stdout.write(f'   - Status: {earnings.status}')
                self.stdout.write(f'   - Gross: ${earnings.gross_amount_cents/100:.2f}')
                self.stdout.write(f'   - Commission: ${earnings.commission_amount_cents/100:.2f} ({earnings.commission_rate}%)')
                self.stdout.write(f'   - Net: ${earnings.net_amount_cents/100:.2f}')
                self.stdout.write(f'   - Available after: {earnings.available_after}')

                # Verify status is 'projected'
                if earnings.status == 'projected':
                    self.stdout.write(self.style.SUCCESS('   ✓ Status is "projected" (CORRECT)'))
                else:
                    self.stdout.write(self.style.ERROR(f'   ✗ Status is "{earnings.status}" (WRONG - should be "projected")'))
                    result['errors'].append(f'Earnings status is {earnings.status}, expected projected')

                # Test completion flow
                self.stdout.write(f'\n3. Testing completion flow...')
                booking_service = BookingService()

                # Mark as completed
                booking_service.mark_booking_completed(booking)

                # Reload earnings
                earnings.refresh_from_db()

                self.stdout.write(f'   - Status after completion: {earnings.status}')
                if earnings.status == 'pending':
                    self.stdout.write(self.style.SUCCESS('   ✓ Status updated to "pending" (CORRECT)'))
                else:
                    self.stdout.write(self.style.ERROR(f'   ✗ Status is "{earnings.status}" (WRONG - should be "pending")'))
                    result['errors'].append(f'Earnings status after completion is {earnings.status}, expected pending')

                result['success'] = len(result['errors']) == 0

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error: {str(e)}'))
            result['errors'].append(str(e))
            import traceback
            traceback.print_exc()

        return result

    def _test_workshop_booking(self, user, service):
        """Test workshop booking flow."""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('TEST: Workshop Booking'))
        self.stdout.write('='*70)
        self.stdout.write(self.style.WARNING('  Skipped - requires ServiceSession setup'))
        return {'service_type': 'workshop', 'success': None, 'errors': ['Not implemented in test']}

    def _test_course_booking(self, user, service):
        """Test course booking flow."""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('TEST: Course Booking'))
        self.stdout.write('='*70)
        self.stdout.write(self.style.WARNING('  Skipped - requires ServiceSession setup'))
        return {'service_type': 'course', 'success': None, 'errors': ['Not implemented in test']}

    def _test_package_booking(self, user, service):
        """Test package booking flow."""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('TEST: Package Booking'))
        self.stdout.write('='*70)
        self.stdout.write(self.style.WARNING('  Skipped - requires child services setup'))
        return {'service_type': 'package', 'success': None, 'errors': ['Not implemented in test']}

    def _test_bundle_booking(self, user, service):
        """Test bundle booking flow."""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('TEST: Bundle Booking'))
        self.stdout.write('='*70)
        self.stdout.write(self.style.WARNING('  Skipped - requires bundle configuration'))
        return {'service_type': 'bundle', 'success': None, 'errors': ['Not implemented in test']}

    def _display_results(self, results):
        """Display test results."""
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('TEST RESULTS'))
        self.stdout.write('='*70 + '\n')

        for test_type, result in results.items():
            if result.get('success') is True:
                self.stdout.write(self.style.SUCCESS(f'✓ {test_type.upper()}: PASSED'))
            elif result.get('success') is False:
                self.stdout.write(self.style.ERROR(f'✗ {test_type.upper()}: FAILED'))
                for error in result.get('errors', []):
                    self.stdout.write(f'    - {error}')
            else:
                self.stdout.write(self.style.WARNING(f'○ {test_type.upper()}: SKIPPED'))

        self.stdout.write('\n' + '='*70 + '\n')
