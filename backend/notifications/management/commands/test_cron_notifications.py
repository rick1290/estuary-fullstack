"""
Management command to test the new cron-based notification system.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from practitioners.models import Practitioner
from services.models import Service, ServiceType, ServiceSession
from bookings.models import Booking
from notifications.cron import process_all_notifications
from notifications.models import Notification

User = get_user_model()


class Command(BaseCommand):
    help = 'Test the new cron-based notification system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--scenario',
            type=str,
            choices=['reminders', 'reschedule', 'both'],
            default='both',
            help='Test scenario to run'
        )

    def handle(self, *args, **options):
        scenario = options['scenario']
        
        self.stdout.write(self.style.WARNING('=== Testing Cron-Based Notification System ==='))
        
        if scenario in ['reminders', 'both']:
            self.test_reminder_system()
            
        if scenario in ['reschedule', 'both']:
            self.test_reschedule_system()
            
        # Test the cron job itself
        self.test_cron_execution()
        
        self.stdout.write(self.style.SUCCESS('\n✅ Cron notification system tests completed!'))

    def test_reminder_system(self):
        """Test reminder detection and sending."""
        self.stdout.write(self.style.WARNING('\n=== Testing Reminder System ==='))
        
        # Create test data for reminders
        practitioner = self.create_test_practitioner('reminder-test@example.com')
        
        # Test 1: Session-based reminders (workshop)
        workshop = self.create_test_workshop(practitioner)
        
        # Create session starting in ~24 hours
        session_24h = ServiceSession.objects.create(
            service=workshop,
            title='24-Hour Test Session',
            start_time=timezone.now() + timedelta(hours=24, minutes=5),  # 24:05 from now
            end_time=timezone.now() + timedelta(hours=25, minutes=5),
            max_participants=5
        )
        
        # Create session starting in ~30 minutes  
        session_30m = ServiceSession.objects.create(
            service=workshop,
            title='30-Minute Test Session',
            start_time=timezone.now() + timedelta(minutes=35),  # 35 minutes from now
            end_time=timezone.now() + timedelta(minutes=95),
            max_participants=5
        )
        
        # Create bookings for these sessions
        participants_24h = []
        participants_30m = []
        
        for i in range(2):
            # 24h session participants
            user_24h, _ = User.objects.get_or_create(
                email=f'participant-24h-{i+1}@example.com',
                defaults={'first_name': f'Participant24h', 'last_name': f'{i+1}'}
            )
            
            booking_24h = Booking.objects.create(
                user=user_24h,
                service=workshop,
                service_session=session_24h,
                practitioner=practitioner,
                start_time=session_24h.start_time,
                end_time=session_24h.end_time,
                status='confirmed',
                payment_status='paid',
                price_charged_cents=5000,
                final_amount_cents=5000,
                timezone='UTC',
                service_name_snapshot=workshop.name,
                service_description_snapshot=workshop.description,
                service_duration_snapshot=workshop.duration_minutes,
                practitioner_name_snapshot=practitioner.display_name
            )
            participants_24h.append(booking_24h)
            
            # 30m session participants
            user_30m, _ = User.objects.get_or_create(
                email=f'participant-30m-{i+1}@example.com',
                defaults={'first_name': f'Participant30m', 'last_name': f'{i+1}'}
            )
            
            booking_30m = Booking.objects.create(
                user=user_30m,
                service=workshop,
                service_session=session_30m,
                practitioner=practitioner,
                start_time=session_30m.start_time,
                end_time=session_30m.end_time,
                status='confirmed',
                payment_status='paid',
                price_charged_cents=5000,
                final_amount_cents=5000,
                timezone='UTC',
                service_name_snapshot=workshop.name,
                service_description_snapshot=workshop.description,
                service_duration_snapshot=workshop.duration_minutes,
                practitioner_name_snapshot=practitioner.display_name
            )
            participants_30m.append(booking_30m)
        
        self.stdout.write(f'✓ Created test sessions and bookings')
        self.stdout.write(f'  - 24h session ({session_24h.start_time}) with {len(participants_24h)} participants')
        self.stdout.write(f'  - 30m session ({session_30m.start_time}) with {len(participants_30m)} participants')
        
        # Test 2: Direct booking reminders (individual session)
        session_type, _ = ServiceType.objects.get_or_create(
            code='session',
            defaults={'name': 'Individual Session'}
        )
        
        individual_service = Service.objects.create(
            name='Test Individual Session',
            slug='test-individual-session',
            description='Individual session for reminder testing',
            service_type=session_type,
            primary_practitioner=practitioner,
            price_cents=10000,
            duration_minutes=60,
            is_active=True
        )
        
        client_user, _ = User.objects.get_or_create(
            email='individual-client@example.com',
            defaults={'first_name': 'Individual', 'last_name': 'Client'}
        )
        
        individual_booking = Booking.objects.create(
            user=client_user,
            service=individual_service,
            practitioner=practitioner,
            start_time=timezone.now() + timedelta(hours=24, minutes=10),  # 24:10 from now
            end_time=timezone.now() + timedelta(hours=25, minutes=10),
            status='confirmed',
            payment_status='paid',
            price_charged_cents=10000,
            final_amount_cents=10000,
            timezone='UTC',
            service_name_snapshot=individual_service.name,
            service_description_snapshot=individual_service.description,
            service_duration_snapshot=individual_service.duration_minutes,
            practitioner_name_snapshot=practitioner.display_name
        )
        
        self.stdout.write(f'✓ Created individual booking at {individual_booking.start_time}')
        
        # Show notification counts before
        before_count = Notification.objects.count()
        self.stdout.write(f'📊 Notifications before test: {before_count}')

    def test_reschedule_system(self):
        """Test session reschedule detection."""
        self.stdout.write(self.style.WARNING('\n=== Testing Reschedule System ==='))
        
        practitioner = self.create_test_practitioner('reschedule-test@example.com')
        workshop = self.create_test_workshop(practitioner)
        
        # Create session
        original_time = timezone.now() + timedelta(days=2)
        session = ServiceSession.objects.create(
            service=workshop,
            title='Reschedule Test Session',
            start_time=original_time,
            end_time=original_time + timedelta(hours=1),
            max_participants=5
        )
        
        # Create booking
        user, _ = User.objects.get_or_create(
            email='reschedule-participant@example.com',
            defaults={'first_name': 'Reschedule', 'last_name': 'Participant'}
        )
        
        booking = Booking.objects.create(
            user=user,
            service=workshop,
            service_session=session,
            practitioner=practitioner,
            start_time=original_time,  # Same as session initially
            end_time=original_time + timedelta(hours=1),
            status='confirmed',
            payment_status='paid',
            price_charged_cents=5000,
            final_amount_cents=5000,
            timezone='UTC',
            service_name_snapshot=workshop.name,
            service_description_snapshot=workshop.description,
            service_duration_snapshot=workshop.duration_minutes,
            practitioner_name_snapshot=practitioner.display_name
        )
        
        self.stdout.write(f'✓ Created booking synchronized with session at {original_time}')
        
        # Now change the session time (simulating practitioner reschedule)
        new_time = original_time + timedelta(hours=3)
        session.start_time = new_time
        session.end_time = new_time + timedelta(hours=1)
        session.save()
        
        self.stdout.write(f'✓ Rescheduled session to {new_time} (+3 hours)')
        self.stdout.write(f'📋 Booking time is still: {booking.start_time}')
        self.stdout.write('   (Cron job should detect this mismatch and fix it)')

    def test_cron_execution(self):
        """Test running the actual cron job."""
        self.stdout.write(self.style.WARNING('\n=== Testing Cron Job Execution ==='))
        
        # Get before counts
        before_notifications = Notification.objects.count()
        
        self.stdout.write('🔄 Running process_all_notifications()...')
        
        # Run the cron job
        result = process_all_notifications()
        
        # Get after counts
        after_notifications = Notification.objects.count()
        new_notifications = after_notifications - before_notifications
        
        self.stdout.write(f'✅ Cron job completed!')
        self.stdout.write(f'📊 Result: {result}')
        self.stdout.write(f'📧 New notifications created: {new_notifications}')
        
        # Show some details of created notifications
        if new_notifications > 0:
            recent_notifications = Notification.objects.order_by('-created_at')[:new_notifications]
            self.stdout.write('\n📝 Recent notifications:')
            for notif in recent_notifications:
                self.stdout.write(f'  • {notif.notification_type}: {notif.title} -> {notif.user.email} ({notif.status})')

    def create_test_practitioner(self, email):
        """Create or get test practitioner."""
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': 'Test',
                'last_name': 'Practitioner',
                'is_practitioner': True
            }
        )
        
        try:
            practitioner = Practitioner.objects.get(user=user)
        except Practitioner.DoesNotExist:
            import uuid
            practitioner = Practitioner.objects.create(
                user=user,
                display_name='Test Practitioner',
                slug=f'test-practitioner-{uuid.uuid4().hex[:8]}',
                practitioner_status='active',
                is_verified=True
            )
        
        return practitioner

    def create_test_workshop(self, practitioner):
        """Create test workshop service."""
        workshop_type, _ = ServiceType.objects.get_or_create(
            code='workshop',
            defaults={'name': 'Workshop'}
        )
        
        import uuid
        workshop = Service.objects.create(
            name='Test Cron Workshop',
            slug=f'test-cron-workshop-{uuid.uuid4().hex[:8]}',
            description='Workshop for testing cron notifications',
            service_type=workshop_type,
            primary_practitioner=practitioner,
            price_cents=5000,
            duration_minutes=90,
            max_participants=10,
            is_active=True
        )
        
        return workshop