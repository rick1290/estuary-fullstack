"""
Management command to test aggregated reminder system.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from practitioners.models import Practitioner
from services.models import Service, ServiceType, ServiceSession
from bookings.models import Booking
from notifications.tasks import schedule_booking_reminders, send_booking_reminder

User = get_user_model()


class Command(BaseCommand):
    help = 'Test the aggregated reminder system for workshops and courses'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            choices=['workshop', 'course', 'both'],
            default='both',
            help='Type of service to test'
        )
        parser.add_argument(
            '--participants',
            type=int,
            default=5,
            help='Number of participants to create'
        )

    def handle(self, *args, **options):
        test_type = options['type']
        num_participants = options['participants']
        
        # Create practitioner
        practitioner_user, _ = User.objects.get_or_create(
            email='test-practitioner@example.com',
            defaults={
                'first_name': 'Test',
                'last_name': 'Practitioner',
                'is_practitioner': True
            }
        )
        
        # Try to get existing practitioner or create with unique slug
        try:
            practitioner = Practitioner.objects.get(user=practitioner_user)
        except Practitioner.DoesNotExist:
            import uuid
            unique_slug = f'test-practitioner-{uuid.uuid4().hex[:8]}'
            practitioner = Practitioner.objects.create(
                user=practitioner_user,
                display_name='Test Practitioner',
                slug=unique_slug,
                practitioner_status='active',
                is_verified=True
            )
        
        # Get service types
        workshop_type, _ = ServiceType.objects.get_or_create(
            code='workshop',
            defaults={'name': 'Workshop'}
        )
        
        course_type, _ = ServiceType.objects.get_or_create(
            code='course',
            defaults={'name': 'Course'}
        )
        
        if test_type in ['workshop', 'both']:
            self.test_workshop_reminders(practitioner, workshop_type, num_participants)
            
        if test_type in ['course', 'both']:
            self.test_course_reminders(practitioner, course_type, num_participants)
            
        self.stdout.write(self.style.SUCCESS('\n✅ Test completed! Check logs for scheduled reminders.'))
        
    def test_workshop_reminders(self, practitioner, workshop_type, num_participants):
        """Test workshop with multiple participants."""
        self.stdout.write(self.style.WARNING('\n=== Testing Workshop Reminders ==='))
        
        # Create workshop
        import uuid
        workshop_slug = f'test-yoga-workshop-{uuid.uuid4().hex[:8]}'
        workshop = Service.objects.create(
            name='Test Yoga Workshop',
            slug=workshop_slug,
            description='A test yoga workshop for notification testing',
            service_type=workshop_type,
            primary_practitioner=practitioner,
            price_cents=5000,  # $50
            duration_minutes=120,
            max_participants=20,
            is_active=True
        )
        
        # Create workshop session for tomorrow
        tomorrow = timezone.now() + timedelta(days=1)
        session = ServiceSession.objects.create(
            service=workshop,
            start_time=tomorrow,
            end_time=tomorrow + timedelta(hours=2),
            max_participants=20
        )
        
        self.stdout.write(f'Created workshop session for {tomorrow}')
        
        # Create multiple bookings
        bookings = []
        for i in range(num_participants):
            user, _ = User.objects.get_or_create(
                email=f'workshop-participant-{i+1}@example.com',
                defaults={
                    'first_name': f'Participant',
                    'last_name': f'{i+1}'
                }
            )
            
            booking = Booking.objects.create(
                user=user,
                service=workshop,
                service_session=session,
                practitioner=practitioner,
                start_time=session.start_time,
                end_time=session.end_time,
                status='confirmed',
                payment_status='paid',
                price_charged_cents=workshop.price_cents,
                final_amount_cents=workshop.price_cents,
                timezone='UTC',
                service_name_snapshot=workshop.name,
                service_description_snapshot=workshop.description,
                service_duration_snapshot=workshop.duration_minutes,
                practitioner_name_snapshot=practitioner.display_name
            )
            bookings.append(booking)
            
            # Schedule reminders for this booking
            schedule_booking_reminders(booking.id)
            
        self.stdout.write(self.style.SUCCESS(f'✓ Created {num_participants} workshop bookings'))
        
        # Test immediate reminder to see aggregation
        self.stdout.write('\nTesting immediate aggregated reminder...')
        send_booking_reminder(
            bookings[0].id, 
            'practitioner', 
            24, 
            session.start_time.isoformat()
        )
        
        self.stdout.write(self.style.SUCCESS('✓ Workshop test complete'))
        
    def test_course_reminders(self, practitioner, course_type, num_participants):
        """Test course with multiple sessions."""
        self.stdout.write(self.style.WARNING('\n=== Testing Course Reminders ==='))
        
        # Create course
        import uuid
        course_slug = f'8-week-mindfulness-{uuid.uuid4().hex[:8]}'
        course = Service.objects.create(
            name='8-Week Mindfulness Course',
            slug=course_slug,
            description='An 8-week mindfulness course for notification testing',
            service_type=course_type,
            primary_practitioner=practitioner,
            price_cents=20000,  # $200
            duration_minutes=60,
            is_active=True
        )
        
        # Create 8 weekly sessions
        sessions = []
        start_date = timezone.now() + timedelta(days=7)  # Start next week
        for week in range(8):
            session_time = start_date + timedelta(weeks=week)
            session = ServiceSession.objects.create(
                service=course,
                title=f'Week {week + 1}: Session Title',
                start_time=session_time,
                end_time=session_time + timedelta(hours=1),
                sequence_number=week + 1,
                max_participants=15
            )
            sessions.append(session)
            
        self.stdout.write(f'Created course with {len(sessions)} sessions')
        
        # Create bookings for participants
        for i in range(num_participants):
            user, _ = User.objects.get_or_create(
                email=f'course-participant-{i+1}@example.com',
                defaults={
                    'first_name': f'Student',
                    'last_name': f'{i+1}'
                }
            )
            
            # For courses, typically one booking covers all sessions
            booking = Booking.objects.create(
                user=user,
                service=course,
                practitioner=practitioner,
                start_time=sessions[0].start_time,  # First session
                end_time=sessions[-1].end_time,     # Last session
                status='confirmed',
                payment_status='paid',
                price_charged_cents=course.price_cents,
                final_amount_cents=course.price_cents,
                timezone='UTC',
                service_name_snapshot=course.name,
                service_description_snapshot=course.description,
                service_duration_snapshot=course.duration_minutes,
                practitioner_name_snapshot=practitioner.display_name
            )
            
            # Schedule reminders (will create reminders for each session)
            schedule_booking_reminders(booking.id)
            
        self.stdout.write(self.style.SUCCESS(f'✓ Created {num_participants} course bookings'))
        self.stdout.write(f'✓ Scheduled reminders for {len(sessions)} sessions per participant')
        self.stdout.write(f'✓ Total reminders scheduled: {len(sessions) * num_participants * 2 * 2}')
        self.stdout.write('  (sessions × participants × 2 reminder times × 2 user types)')
        
        self.stdout.write(self.style.SUCCESS('✓ Course test complete'))