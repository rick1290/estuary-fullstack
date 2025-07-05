"""
Management command to test session reschedule functionality.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from practitioners.models import Practitioner
from services.models import Service, ServiceType, ServiceSession
from bookings.models import Booking

User = get_user_model()


class Command(BaseCommand):
    help = 'Test session reschedule notifications and booking updates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--participants',
            type=int,
            default=3,
            help='Number of participants to create'
        )

    def handle(self, *args, **options):
        num_participants = options['participants']
        
        self.stdout.write(self.style.WARNING('=== Testing Session Reschedule System ==='))
        
        # Create practitioner
        practitioner_user, _ = User.objects.get_or_create(
            email='reschedule-practitioner@example.com',
            defaults={
                'first_name': 'Reschedule',
                'last_name': 'Practitioner',
                'is_practitioner': True
            }
        )
        
        try:
            practitioner = Practitioner.objects.get(user=practitioner_user)
        except Practitioner.DoesNotExist:
            import uuid
            unique_slug = f'reschedule-practitioner-{uuid.uuid4().hex[:8]}'
            practitioner = Practitioner.objects.create(
                user=practitioner_user,
                display_name='Reschedule Test Practitioner',
                slug=unique_slug,
                practitioner_status='active',
                is_verified=True
            )
        
        # Get workshop service type
        workshop_type, _ = ServiceType.objects.get_or_create(
            code='workshop',
            defaults={'name': 'Workshop'}
        )
        
        # Create workshop
        import uuid
        workshop_slug = f'reschedule-test-workshop-{uuid.uuid4().hex[:8]}'
        workshop = Service.objects.create(
            name='Reschedule Test Workshop',
            slug=workshop_slug,
            description='A workshop to test rescheduling functionality',
            service_type=workshop_type,
            primary_practitioner=practitioner,
            price_cents=7500,  # $75
            duration_minutes=90,
            max_participants=10,
            is_active=True
        )
        
        # Create workshop session for tomorrow
        original_time = timezone.now() + timedelta(days=1, hours=2)
        session = ServiceSession.objects.create(
            service=workshop,
            title='Original Workshop Session',
            start_time=original_time,
            end_time=original_time + timedelta(minutes=90),
            max_participants=10
        )
        
        self.stdout.write(f'Created workshop session for {original_time}')
        
        # Create bookings from multiple participants
        bookings = []
        for i in range(num_participants):
            user, _ = User.objects.get_or_create(
                email=f'reschedule-participant-{i+1}@example.com',
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
                practitioner_name_snapshot=practitioner.display_name,
                metadata={}
            )
            bookings.append(booking)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {num_participants} bookings for the workshop'))
        
        # Display current booking times
        self.stdout.write('\n📅 Current booking times:')
        for booking in bookings:
            self.stdout.write(f'  - {booking.user.email}: {booking.start_time.strftime("%A, %B %d at %I:%M %p")}')
        
        # Now reschedule the session (move it 3 hours later)
        new_time = original_time + timedelta(hours=3)
        self.stdout.write(f'\n🔄 Rescheduling session from {original_time.strftime("%I:%M %p")} to {new_time.strftime("%I:%M %p")}...')
        
        # Update the session time (this should trigger our signal handlers)
        session.start_time = new_time
        session.end_time = new_time + timedelta(minutes=90)
        session.title = 'Rescheduled Workshop Session'
        session.save()
        
        self.stdout.write(self.style.SUCCESS('✓ Session updated - signals should have triggered!'))
        
        # Wait a moment for async tasks
        import time
        time.sleep(2)
        
        # Refresh bookings from database to see updates
        self.stdout.write('\n📅 Updated booking times:')
        for booking in bookings:
            booking.refresh_from_db()
            self.stdout.write(f'  - {booking.user.email}: {booking.start_time.strftime("%A, %B %d at %I:%M %p")}')
            
            # Check if reschedule metadata was added
            if 'rescheduled_by' in booking.metadata:
                self.stdout.write(f'    ✓ Reschedule metadata added')
            else:
                self.stdout.write(f'    ❌ No reschedule metadata found')
        
        self.stdout.write('\n📧 Expected notifications:')
        self.stdout.write(f'  • {num_participants} reschedule emails sent to participants')
        self.stdout.write(f'  • 1 summary notification logged for practitioner')
        self.stdout.write(f'  • New reminder schedules created for updated times')
        
        self.stdout.write('\n📋 What to check:')
        self.stdout.write('  1. Check logs for "Triggered session reschedule" message')
        self.stdout.write('  2. Verify booking times were updated in database')
        self.stdout.write('  3. Check that reminder schedules were cleared and recreated')
        self.stdout.write('  4. Verify reschedule notifications were sent (if templates configured)')
        
        # Display session details
        session.refresh_from_db()
        self.stdout.write(f'\n✅ Session {session.id} now scheduled for {session.start_time.strftime("%A, %B %d at %I:%M %p")}')
        
        self.stdout.write(self.style.SUCCESS(f'\n🎉 Session reschedule test completed successfully!'))
        self.stdout.write('Check the logs above and Celery worker logs for full details.')