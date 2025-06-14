from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from notifications.models import Notification, NotificationSetting, NotificationTemplate
from notifications.api.v1.utils import create_in_app_notification, bulk_create_notifications

User = get_user_model()


class Command(BaseCommand):
    help = 'Test notifications API by creating sample data'
    
    def handle(self, *args, **options):
        self.stdout.write("Creating test notification data...")
        
        # Get or create test user
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={
                'username': 'testuser',
                'first_name': 'Test',
                'last_name': 'User',
                'is_active': True
            }
        )
        
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Created test user: {user.email}"))
        else:
            self.stdout.write(f"Using existing user: {user.email}")
        
        # Create notification templates
        self.stdout.write("\nCreating notification templates...")
        templates = [
            {
                'name': 'Booking Confirmation',
                'notification_type': 'booking',
                'delivery_channel': 'email',
                'subject_template': 'Your booking is confirmed - {{ service_name }}',
                'body_template': 'Hi {{ user_name }}, your booking for {{ service_name }} on {{ booking_date }} is confirmed.'
            },
            {
                'name': 'Payment Received',
                'notification_type': 'payment',
                'delivery_channel': 'email',
                'subject_template': 'Payment received - ${{ amount }}',
                'body_template': 'We have received your payment of ${{ amount }} for {{ service_name }}.'
            },
            {
                'name': 'Session Reminder',
                'notification_type': 'reminder',
                'delivery_channel': 'in_app',
                'subject_template': 'Upcoming session reminder',
                'body_template': 'You have a session starting in {{ time_until }} - {{ service_name }}'
            }
        ]
        
        for template_data in templates:
            template, created = NotificationTemplate.objects.update_or_create(
                notification_type=template_data['notification_type'],
                delivery_channel=template_data['delivery_channel'],
                defaults=template_data
            )
            self.stdout.write(f"  {'Created' if created else 'Updated'} template: {template.name}")
        
        # Create sample notifications
        self.stdout.write("\nCreating sample notifications...")
        
        # Booking notification
        booking_notif = create_in_app_notification(
            user=user,
            title="Booking Confirmed",
            message="Your yoga session with Jane Doe is confirmed for tomorrow at 10:00 AM",
            notification_type="booking",
            related_object_type="booking",
            related_object_id="123",
            metadata={
                'practitioner_name': 'Jane Doe',
                'service_name': 'Yoga Session',
                'booking_time': '2024-01-15T10:00:00Z'
            }
        )
        self.stdout.write(f"  Created booking notification: {booking_notif.title}")
        
        # Payment notification
        payment_notif = create_in_app_notification(
            user=user,
            title="Payment Successful",
            message="Your payment of $75.00 has been processed successfully",
            notification_type="payment",
            related_object_type="payment",
            related_object_id="456",
            metadata={
                'amount': '75.00',
                'currency': 'USD',
                'payment_method': 'card'
            }
        )
        self.stdout.write(f"  Created payment notification: {payment_notif.title}")
        
        # Session reminder
        reminder_notif = create_in_app_notification(
            user=user,
            title="Session Starting Soon",
            message="Your meditation session starts in 30 minutes",
            notification_type="reminder",
            related_object_type="booking",
            related_object_id="789",
            metadata={
                'time_until': '30 minutes',
                'session_type': 'meditation'
            }
        )
        self.stdout.write(f"  Created reminder notification: {reminder_notif.title}")
        
        # System notification
        system_notif = create_in_app_notification(
            user=user,
            title="Welcome to Estuary!",
            message="Thanks for joining our wellness community. Explore practitioners and book your first session.",
            notification_type="system",
            metadata={
                'welcome': True,
                'onboarding_step': 1
            }
        )
        self.stdout.write(f"  Created system notification: {system_notif.title}")
        
        # Create notification settings
        self.stdout.write("\nCreating notification settings...")
        notification_types = ['booking', 'payment', 'session', 'review', 'system', 'message', 'reminder']
        
        for notif_type in notification_types:
            setting, created = NotificationSetting.objects.get_or_create(
                user=user,
                notification_type=notif_type,
                defaults={
                    'email_enabled': True,
                    'sms_enabled': False,
                    'in_app_enabled': True,
                    'push_enabled': True
                }
            )
            self.stdout.write(f"  {'Created' if created else 'Found'} settings for: {notif_type}")
        
        # Summary
        self.stdout.write("\n" + self.style.SUCCESS("Test data created successfully!"))
        self.stdout.write(f"\nSummary:")
        self.stdout.write(f"  - User: {user.email}")
        self.stdout.write(f"  - Templates: {NotificationTemplate.objects.count()}")
        self.stdout.write(f"  - Notifications: {Notification.objects.filter(user=user).count()}")
        self.stdout.write(f"  - Settings: {NotificationSetting.objects.filter(user=user).count()}")
        self.stdout.write(f"\nYou can now test the API at:")
        self.stdout.write(f"  - DRF: http://localhost:8000/api/v1/drf/notifications/")
        self.stdout.write(f"  - FastAPI: http://localhost:8000/api/v1/notifications/")