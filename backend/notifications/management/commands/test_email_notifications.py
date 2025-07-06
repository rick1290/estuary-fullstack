"""
Management command to test all email notification types.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from practitioners.models import Practitioner
from bookings.models import Booking
from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)
from notifications.tasks import (
    send_practitioner_profile_nudge,
    send_practitioner_services_nudge,
    send_practitioner_earnings_summaries
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Test all email notification types'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address to send test notifications to',
            required=True
        )
        parser.add_argument(
            '--type',
            type=str,
            choices=['all', 'nudges', 'earnings', 'booking', 'welcome', 'review'],
            default='all',
            help='Type of notifications to test'
        )

    def handle(self, *args, **options):
        email = options['email']
        test_type = options['type']
        
        # Get or create test user and practitioner
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'is_practitioner': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created test user: {email}'))
        
        practitioner, created = Practitioner.objects.get_or_create(
            user=user,
            defaults={
                'display_name': 'Test Practitioner',
                'slug': f'test-practitioner-{user.id}',
                'practitioner_status': 'active',
                'is_verified': True,
                # Intentionally leave some fields empty for nudge testing
                'bio': '',  # Empty to trigger profile incomplete
                'professional_title': '',  # Empty to trigger profile incomplete
                'years_of_experience': None
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Created test practitioner'))
        
        # Get notification services
        client_service = get_client_notification_service()
        practitioner_service = get_practitioner_notification_service()
        
        if test_type in ['all', 'welcome']:
            self.stdout.write(self.style.WARNING('\n=== Testing Welcome Emails ==='))
            
            # Test practitioner welcome
            self.stdout.write('Sending practitioner welcome email...')
            practitioner_service.send_welcome_email(practitioner)
            self.stdout.write(self.style.SUCCESS('✓ Practitioner welcome email sent'))
            
            # Test client welcome (temporarily remove practitioner flag)
            user.is_practitioner = False
            user.save()
            self.stdout.write('Sending client welcome email...')
            client_service.send_welcome_email(user)
            self.stdout.write(self.style.SUCCESS('✓ Client welcome email sent'))
            user.is_practitioner = True
            user.save()
        
        if test_type in ['all', 'nudges']:
            self.stdout.write(self.style.WARNING('\n=== Testing Practitioner Nudges ==='))
            
            # 1. Test Profile Incomplete Nudge (immediate instead of 3 days)
            self.stdout.write('Scheduling profile incomplete nudge...')
            notification = practitioner_service.schedule_notification(
                user=user,
                notification_type='system',
                delivery_channel='email',
                scheduled_for=timezone.now() + timedelta(seconds=10),  # 10 seconds from now
                template_id=practitioner_service.get_template_id('profile_incomplete'),
                data={'nudge_type': 'profile_incomplete', 'test': True},
                title="TEST: Complete your practitioner profile",
                message="TEST: Your profile is incomplete. Complete it to start receiving bookings."
            )
            
            # Trigger immediately for testing
            send_practitioner_profile_nudge.delay(notification.id)
            self.stdout.write(self.style.SUCCESS(f'✓ Profile nudge sent (notification ID: {notification.id})'))
            
            # 2. Test No Services Nudge (immediate instead of 7 days)
            self.stdout.write('Scheduling no services nudge...')
            notification = practitioner_service.schedule_notification(
                user=user,
                notification_type='system',
                delivery_channel='email',
                scheduled_for=timezone.now() + timedelta(seconds=10),
                template_id=practitioner_service.get_template_id('no_services'),
                data={'nudge_type': 'no_services', 'test': True},
                title="TEST: Create your first service",
                message="TEST: You haven't created any services yet."
            )
            
            # Trigger immediately for testing
            send_practitioner_services_nudge.delay(notification.id)
            self.stdout.write(self.style.SUCCESS(f'✓ No services nudge sent (notification ID: {notification.id})'))
        
        if test_type in ['all', 'earnings']:
            self.stdout.write(self.style.WARNING('\n=== Testing Earnings Summary ==='))
            
            # 3. Test Weekly Earnings Summary
            self.stdout.write('Sending earnings summary...')
            practitioner_service.send_earnings_summary(practitioner, period='weekly')
            self.stdout.write(self.style.SUCCESS('✓ Weekly earnings summary sent'))
        
        if test_type in ['all', 'booking']:
            self.stdout.write(self.style.WARNING('\n=== Testing Booking Notifications ==='))
            
            # Create a test booking for tomorrow
            tomorrow = timezone.now() + timedelta(days=1)
            
            # First, create a test service
            from services.models import Service, ServiceType
            
            # Get or create the service type
            service_type, _ = ServiceType.objects.get_or_create(
                code='session',
                defaults={
                    'name': 'Individual Session',
                    'description': 'One-on-one sessions'
                }
            )
            
            service, created = Service.objects.get_or_create(
                primary_practitioner=practitioner,
                name='Test Service for Notifications',
                defaults={
                    'service_type': service_type,
                    'description': 'Test service',
                    'price_cents': 10000,  # $100
                    'duration_minutes': 60,
                    'is_active': True,
                    'slug': f'test-service-{practitioner.id}'
                }
            )
            
            # Create test booking
            booking = Booking.objects.create(
                user=user,
                service=service,
                practitioner=practitioner,
                start_time=tomorrow,
                end_time=tomorrow + timedelta(hours=1),
                status='confirmed',
                payment_status='paid',
                price_charged_cents=10000,  # $100
                final_amount_cents=10000,   # $100
                discount_amount_cents=0,
                timezone='UTC',
                service_name_snapshot=service.name,
                service_description_snapshot=service.description,
                service_duration_snapshot=service.duration_minutes,
                practitioner_name_snapshot=practitioner.display_name or practitioner.user.get_full_name()
            )
            
            self.stdout.write(f'Created test booking for tomorrow at {tomorrow}')
            
            # Test booking confirmation emails
            self.stdout.write('Sending booking confirmation emails...')
            
            # Client confirmation
            client_service.send_booking_confirmation(booking)
            self.stdout.write(self.style.SUCCESS('✓ Client booking confirmation sent'))
            
            # Practitioner notification
            practitioner_service.send_booking_notification(booking)
            self.stdout.write(self.style.SUCCESS('✓ Practitioner booking notification sent'))
            
            # Send immediate test reminder (instead of waiting 24h)
            self.stdout.write('Sending test booking reminder...')
            client_service.send_booking_reminder(booking, hours_before=24)
            self.stdout.write(self.style.SUCCESS('✓ 24-hour booking reminder sent'))
            
            # Also test the 5-minute reminder
            reminder_5m = timezone.now() + timedelta(minutes=5)
            notification = client_service.schedule_notification(
                user=user,
                notification_type='reminder',
                delivery_channel='email',
                scheduled_for=reminder_5m,
                template_id=client_service.get_template_id('reminder_24h'),
                data={},
                title=f"TEST REMINDER (5 min): {service.name}",
                message="This is a test reminder scheduled for 5 minutes",
                related_object_type='booking',
                related_object_id=str(booking.id)
            )
            self.stdout.write(self.style.SUCCESS(f'✓ 5-minute test reminder scheduled (notification ID: {notification.id})'))
            self.stdout.write('  → This will be sent in 5 minutes if Celery Beat is running')
            
            # Clean up test booking
            booking.delete()
            self.stdout.write('Cleaned up test booking')
        
        if test_type in ['all', 'review']:
            self.stdout.write(self.style.WARNING('\n=== Testing Review Request ==='))
            
            # Create a test booking that is marked as completed
            yesterday = timezone.now() - timedelta(days=1)
            
            # First, create a test service if not exists
            if 'service' not in locals():
                from services.models import Service, ServiceType
                
                # Get or create the service type
                service_type, _ = ServiceType.objects.get_or_create(
                    code='session',
                    defaults={
                        'name': 'Individual Session',
                        'description': 'One-on-one sessions'
                    }
                )
                
                service, created = Service.objects.get_or_create(
                    primary_practitioner=practitioner,
                    name='Test Service for Review',
                    defaults={
                        'service_type': service_type,
                        'description': 'Test service for review request',
                        'price_cents': 10000,  # $100
                        'duration_minutes': 60,
                        'is_active': True,
                        'slug': f'test-service-review-{practitioner.id}'
                    }
                )
            
            # Create completed booking
            completed_booking = Booking.objects.create(
                user=user,
                service=service,
                practitioner=practitioner,
                start_time=yesterday,
                end_time=yesterday + timedelta(hours=1),
                status='completed',  # Mark as completed
                payment_status='paid',
                price_charged_cents=10000,  # $100
                final_amount_cents=10000,   # $100
                discount_amount_cents=0,
                timezone='UTC',
                service_name_snapshot=service.name,
                service_description_snapshot=service.description,
                service_duration_snapshot=service.duration_minutes,
                practitioner_name_snapshot=practitioner.display_name or practitioner.user.get_full_name(),
                completed_at=timezone.now()  # Set completion time
            )
            
            self.stdout.write(f'Created completed test booking from yesterday')
            
            # Test review request email
            self.stdout.write('Sending booking completed review request email...')
            try:
                client_service.send_booking_completed_review_request(completed_booking)
                self.stdout.write(self.style.SUCCESS('✓ Booking completed review request sent'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Error sending review request: {str(e)}'))
            
            # Clean up test booking
            completed_booking.delete()
            self.stdout.write('Cleaned up completed test booking')
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ All test notifications triggered for {email}'))
        self.stdout.write(self.style.WARNING('\nCheck your email and Django admin Notifications to see the results!'))
        self.stdout.write('\nNotifications sent:')
        
        if test_type in ['all', 'welcome']:
            self.stdout.write('  • Practitioner welcome email')
            self.stdout.write('  • Client welcome email')
            
        if test_type in ['all', 'nudges']:
            self.stdout.write('  • Profile incomplete nudge (checks if profile is complete)')
            self.stdout.write('  • No services nudge (checks if services exist)')
            
        if test_type in ['all', 'earnings']:
            self.stdout.write('  • Weekly earnings summary')
            
        if test_type in ['all', 'booking']:
            self.stdout.write('  • Client booking confirmation')
            self.stdout.write('  • Practitioner booking notification')
            self.stdout.write('  • 24-hour booking reminder')
            self.stdout.write('  • 5-minute test reminder (scheduled)')
            
        if test_type in ['all', 'review']:
            self.stdout.write('  • Booking completed review request')