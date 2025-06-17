"""
Clear all data from the database (except migrations)
"""
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.apps import apps

class Command(BaseCommand):
    help = 'Clears all data from the database (keeps structure)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip confirmation prompt'
        )

    def handle(self, *args, **options):
        if not options['yes']:
            self.stdout.write(self.style.WARNING('⚠️  This will DELETE ALL DATA from the database!'))
            confirm = input('Are you sure? Type "yes" to continue: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('Cancelled.'))
                return

        self.stdout.write(self.style.WARNING('🗑️  Clearing database...'))

        try:
            with transaction.atomic():
                # Get all models
                models = apps.get_models()
                
                # Disable foreign key checks
                with connection.cursor() as cursor:
                    if connection.vendor == 'postgresql':
                        cursor.execute('SET CONSTRAINTS ALL DEFERRED;')
                    elif connection.vendor == 'mysql':
                        cursor.execute('SET FOREIGN_KEY_CHECKS = 0;')
                    elif connection.vendor == 'sqlite':
                        cursor.execute('PRAGMA foreign_keys = OFF;')
                
                # Delete all data from each model
                for model in models:
                    if model._meta.app_label not in ['contenttypes', 'auth', 'migrations']:
                        count = model.objects.count()
                        if count > 0:
                            model.objects.all().delete()
                            self.stdout.write(f'  ✓ Cleared {count} records from {model._meta.label}')
                
                # Re-enable foreign key checks
                with connection.cursor() as cursor:
                    if connection.vendor == 'postgresql':
                        cursor.execute('SET CONSTRAINTS ALL IMMEDIATE;')
                    elif connection.vendor == 'mysql':
                        cursor.execute('SET FOREIGN_KEY_CHECKS = 1;')
                    elif connection.vendor == 'sqlite':
                        cursor.execute('PRAGMA foreign_keys = ON;')
                
                self.stdout.write(self.style.SUCCESS('✅ Database cleared successfully!'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
            raise