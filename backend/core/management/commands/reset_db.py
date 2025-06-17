"""
Reset database - clear all data and reseed
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Reset database - clears all data and reseeds with test data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip confirmation prompt'
        )
        parser.add_argument(
            '--users',
            type=int,
            default=20,
            help='Number of regular users to create'
        )
        parser.add_argument(
            '--practitioners',
            type=int,
            default=10,
            help='Number of practitioners to create'
        )

    def handle(self, *args, **options):
        if not options['yes']:
            self.stdout.write(self.style.WARNING('⚠️  This will DELETE ALL DATA and reseed the database!'))
            confirm = input('Are you sure? Type "yes" to continue: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('Cancelled.'))
                return

        self.stdout.write(self.style.WARNING('🔄 Resetting database...'))

        try:
            # Clear database
            self.stdout.write('Step 1: Clearing database...')
            call_command('clear_db', yes=True)
            
            # Run migrations (in case any are pending)
            self.stdout.write('\nStep 2: Running migrations...')
            call_command('migrate', verbosity=0)
            
            # Seed database
            self.stdout.write('\nStep 3: Seeding database...')
            call_command('seed_full_db', 
                users=options['users'],
                practitioners=options['practitioners']
            )
            
            self.stdout.write(self.style.SUCCESS('\n✅ Database reset complete!'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
            raise