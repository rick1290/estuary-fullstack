"""
Management command to set up default notification preferences for existing users.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from notifications.models import NotificationSetting, Notification
from notifications.config import DEFAULT_NOTIFICATION_PREFERENCES

User = get_user_model()


class Command(BaseCommand):
    help = 'Set up default notification preferences for all existing users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run in dry-run mode (no database changes)',
        )
        parser.add_argument(
            '--user-id',
            type=int,
            help='Set up preferences for a specific user ID only',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        user_id = options.get('user_id')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Running in dry-run mode - no changes will be made'))
        
        # Get users to process
        if user_id:
            users = User.objects.filter(id=user_id)
            if not users.exists():
                self.stdout.write(self.style.ERROR(f'User with ID {user_id} not found'))
                return
        else:
            users = User.objects.all()
        
        created_count = 0
        updated_count = 0
        
        for user in users:
            self.stdout.write(f'Processing user {user.id} ({user.email})...')
            
            for notification_type, channels in DEFAULT_NOTIFICATION_PREFERENCES.items():
                try:
                    setting, created = NotificationSetting.objects.get_or_create(
                        user=user,
                        notification_type=notification_type,
                        defaults={
                            'email_enabled': channels['email'],
                            'sms_enabled': channels['sms'],
                            'in_app_enabled': channels['in_app'],
                            'push_enabled': channels['push'],
                        }
                    )
                    
                    if created:
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  Created {notification_type} preferences'
                            )
                        )
                    else:
                        # Optionally update existing preferences
                        if options.get('update_existing', False):
                            setting.email_enabled = channels['email']
                            setting.sms_enabled = channels['sms']
                            setting.in_app_enabled = channels['in_app']
                            setting.push_enabled = channels['push']
                            
                            if not dry_run:
                                setting.save()
                            
                            updated_count += 1
                            self.stdout.write(
                                f'  Updated {notification_type} preferences'
                            )
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'  Error processing {notification_type}: {str(e)}'
                        )
                    )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted: {created_count} created, {updated_count} updated'
            )
        )