"""
Management command to send test notifications.
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone

from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)
from notifications.utils import create_in_app_notification

User = get_user_model()


class Command(BaseCommand):
    help = 'Send a test notification to verify the system is working'

    def add_arguments(self, parser):
        parser.add_argument(
            'user_id',
            type=int,
            help='User ID to send the notification to'
        )
        parser.add_argument(
            '--type',
            choices=['welcome', 'booking', 'payment', 'in_app', 'test_celery'],
            default='test_celery',
            help='Type of test notification to send'
        )
        parser.add_argument(
            '--practitioner',
            action='store_true',
            help='Send as practitioner notification'
        )

    def handle(self, *args, **options):
        user_id = options['user_id']
        notification_type = options['type']
        is_practitioner = options['practitioner']
        
        # Get user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise CommandError(f'User with ID {user_id} does not exist')
        
        self.stdout.write(f'Sending {notification_type} notification to {user.email}...')
        
        # Get appropriate service
        if is_practitioner:
            if not hasattr(user, 'practitioner_profile'):
                raise CommandError(f'User {user.email} is not a practitioner')
            service = get_practitioner_notification_service()
        else:
            service = get_client_notification_service()
        
        # Send test notification based on type
        if notification_type == 'welcome':
            if is_practitioner:
                service.send_welcome_email(user.practitioner_profile)
            else:
                service.send_welcome_email(user)
            self.stdout.write(self.style.SUCCESS('Welcome email sent!'))
            
        elif notification_type == 'booking':
            # Create a mock booking for testing
            from bookings.models import Booking
            from services.models import Service
            
            # Get a service or create mock data
            try:
                service_obj = Service.objects.first()
                if not service_obj:
                    self.stdout.write(self.style.WARNING('No services found, creating mock data'))
                    # You would need to create mock data here
                    raise CommandError('No services available for test booking')
                
                # Create a test booking
                booking = Booking.objects.create(
                    user=user,
                    service=service_obj,
                    start_datetime=timezone.now() + timezone.timedelta(days=1),
                    end_datetime=timezone.now() + timezone.timedelta(days=1, hours=1),
                    status='confirmed',
                    total_amount=100.00,
                    metadata={'test': True, 'created_by': 'test_command'}
                )
                
                if is_practitioner:
                    service.send_booking_notification(booking)
                else:
                    service.send_booking_confirmation(booking)
                
                self.stdout.write(self.style.SUCCESS(f'Booking notification sent! (Booking ID: {booking.id})'))
                
                # Clean up test booking
                booking.delete()
                
            except Exception as e:
                raise CommandError(f'Error sending booking notification: {str(e)}')
                
        elif notification_type == 'in_app':
            # Send in-app notification
            notification = create_in_app_notification(
                user=user,
                title="Test Notification",
                message="This is a test in-app notification from the management command.",
                notification_type='system',
                metadata={'test': True, 'timestamp': timezone.now().isoformat()}
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'In-app notification created! (ID: {notification.id})'
                )
            )
            
        elif notification_type == 'test_celery':
            # Test Celery task execution
            from notifications.tasks import send_scheduled_notification
            from notifications.models import Notification
            
            # Create a test notification
            notification = Notification.objects.create(
                user=user,
                title="Celery Test Notification",
                message="This notification was sent via Celery to test the task queue.",
                notification_type='system',
                delivery_channel='email',
                metadata={
                    'template_id': 'TEST_NOTIFICATION_TEMPLATE',
                    'template_data': {
                        'test_time': timezone.now().isoformat(),
                        'user_name': user.get_full_name() or user.email
                    }
                }
            )
            
            # Send via Celery
            result = send_scheduled_notification.delay(notification.id)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Celery task queued! Task ID: {result.id}, Notification ID: {notification.id}'
                )
            )
            
            # Check task status
            self.stdout.write('Checking task status...')
            import time
            for i in range(5):
                if result.ready():
                    if result.successful():
                        self.stdout.write(self.style.SUCCESS('Task completed successfully!'))
                    else:
                        self.stdout.write(self.style.ERROR(f'Task failed: {result.result}'))
                    break
                time.sleep(1)
                self.stdout.write(f'Waiting... ({i+1}/5)')
            else:
                self.stdout.write(self.style.WARNING('Task still pending after 5 seconds'))
                
        self.stdout.write(self.style.SUCCESS('\nTest notification command completed!'))