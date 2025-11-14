"""
Management command to send test emails for development and testing.
"""
from django.core.management.base import BaseCommand
from emails.services import ClientEmailService, PractitionerEmailService
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Send test emails to verify email system is working'

    def add_arguments(self, parser):
        parser.add_argument(
            'email_type',
            type=str,
            help='Type of email to send: welcome_client, booking_confirmation, reminder, booking_received',
        )
        parser.add_argument(
            'recipient_email',
            type=str,
            help='Email address to send test to',
        )
        parser.add_argument(
            '--first-name',
            type=str,
            default='Test',
            help='First name for the recipient',
        )

    def handle(self, *args, **options):
        email_type = options['email_type']
        recipient_email = options['recipient_email']
        first_name = options['first_name']

        self.stdout.write(f"Sending {email_type} email to {recipient_email}...")

        try:
            if email_type == 'welcome_client':
                # Create a mock user object
                class MockUser:
                    pass

                mock_user = MockUser()
                mock_user.email = recipient_email
                mock_user.first_name = first_name
                mock_user.get_full_name = lambda: first_name

                result = ClientEmailService.send_welcome_email(mock_user)

            elif email_type == 'booking_confirmation':
                from emails.services import EmailService
                import pytz
                # Set booking for 3 days from now at 2:00 PM
                booking_date = (timezone.now() + timedelta(days=3)).replace(hour=14, minute=0, second=0, microsecond=0)

                # Convert to PST for display
                pst = pytz.timezone('America/Los_Angeles')
                booking_date_local = booking_date.astimezone(pst)

                result = EmailService.send_template_email(
                    to=recipient_email,
                    template_path='clients/booking_confirmation_standalone.mjml',
                    context={
                        'user': {'first_name': first_name},
                        'first_name': first_name,
                        'service_name': 'Mindful Meditation Session',
                        'practitioner_name': 'Sarah Johnson',
                        'booking_date': booking_date_local.strftime('%A, %B %d, %Y'),
                        'booking_time': booking_date_local.strftime('%I:%M %p %Z'),
                        'duration_minutes': 60,
                        'location': 'Virtual Session',
                        'total_amount': '89.00',
                        'booking_url': 'https://www.findoctave.com/dashboard/bookings/test-123',
                        'calendar_url': 'https://www.findoctave.com/calendar/add/test-123',
                        'reschedule_url': 'https://www.findoctave.com/bookings/test-123/reschedule',
                        'cancel_url': 'https://www.findoctave.com/bookings/test-123/cancel',
                        'join_url': 'https://www.findoctave.com/room/test-room-123',
                        'has_video_room': True,
                    },
                    subject='Booking Confirmed - Mindful Meditation Session',
                    tags=[{'name': 'category', 'value': 'booking_confirmation'}],
                )

            elif email_type == 'reminder':
                from emails.services import EmailService
                import pytz
                # Set session for tomorrow at 2:00 PM
                session_date = (timezone.now() + timedelta(days=1)).replace(hour=14, minute=0, second=0, microsecond=0)

                # Convert to PST for display
                pst = pytz.timezone('America/Los_Angeles')
                session_date_local = session_date.astimezone(pst)

                result = EmailService.send_template_email(
                    to=recipient_email,
                    template_path='clients/reminder_standalone.mjml',
                    context={
                        'user': {'first_name': first_name},
                        'first_name': first_name,
                        'service_name': 'Mindful Meditation Session',
                        'practitioner_name': 'Sarah Johnson',
                        'booking_date': session_date_local.strftime('%A, %B %d, %Y'),
                        'booking_time': session_date_local.strftime('%I:%M %p %Z'),
                        'duration_minutes': 60,
                        'location': 'Virtual Session',
                        'time_until': '24 hours',
                        'join_url': 'https://www.findoctave.com/room/test-room-123',
                        'reschedule_url': 'https://www.findoctave.com/bookings/test-123/reschedule',
                        'has_video_room': True,
                    },
                    subject='Reminder: Your Session Tomorrow at ' + session_date.strftime('%I:%M %p'),
                    tags=[{'name': 'category', 'value': 'reminder'}],
                )

            elif email_type == 'booking_received':
                from emails.services import EmailService
                from django.contrib.auth import get_user_model

                # Create booking datetime with a reasonable time (2:00 PM, 5 days from now)
                booking_date = (timezone.now() + timedelta(days=5)).replace(hour=14, minute=0, second=0, microsecond=0)

                # Try to get a real user for client data, otherwise use test data
                User = get_user_model()
                try:
                    client_user = User.objects.exclude(email=recipient_email).first()
                    client_name = client_user.get_full_name() if client_user and client_user.get_full_name() else 'John Smith'
                    client_email = client_user.email if client_user else 'client@example.com'
                except:
                    client_name = 'John Smith'
                    client_email = 'client@example.com'

                # Convert to PST for display
                import pytz
                pst = pytz.timezone('America/Los_Angeles')
                booking_date_local = booking_date.astimezone(pst)

                result = EmailService.send_template_email(
                    to=recipient_email,
                    template_path='practitioners/booking_received_standalone.mjml',
                    context={
                        'user': {'first_name': first_name},
                        'first_name': first_name,
                        'client_name': client_name,
                        'client_email': client_email,
                        'service_name': 'Mindful Meditation Session',
                        'service_type': 'Session',
                        'booking_date': booking_date_local.strftime('%A, %B %d, %Y'),
                        'booking_time': booking_date_local.strftime('%I:%M %p %Z'),
                        'duration_minutes': 60,
                        'location': 'Virtual Session',
                        'gross_amount': '$89.00',
                        'commission_amount': '$13.35',
                        'net_earnings': '$75.65',
                        'commission_rate': 15.0,
                        'booking_url': 'https://www.findoctave.com/practitioner/bookings/test-123',
                        'client_profile_url': 'https://www.findoctave.com/practitioner/clients/test-client',
                        'calendar_url': 'https://www.findoctave.com/practitioner/calendar',
                        'message_client_url': 'https://www.findoctave.com/practitioner/messages/new?recipient=test-client',
                        'monthly_bookings': 12,
                        'monthly_earnings': '$908.00',
                    },
                    subject='New Booking: Michael Thompson - Mindful Meditation Session',
                    tags=[{'name': 'category', 'value': 'booking_received'}],
                )

            else:
                self.stdout.write(
                    self.style.ERROR(f'Unknown email type: {email_type}')
                )
                self.stdout.write('Available types: welcome_client, booking_confirmation, reminder, booking_received')
                return

            self.stdout.write(
                self.style.SUCCESS(f'✓ Email sent successfully! ID: {result.get("id")}')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to send email: {str(e)}')
            )
            raise
