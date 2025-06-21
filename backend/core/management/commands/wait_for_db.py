import time
from django.db import connections
from django.db.utils import OperationalError
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Django command to pause execution until database is available"""
    help = 'Wait for database to be available'

    def add_arguments(self, parser):
        parser.add_argument(
            '--timeout',
            type=int,
            default=30,
            help='Maximum time to wait for database (in seconds)',
        )

    def handle(self, *args, **options):
        self.stdout.write('Waiting for database...')
        db_conn = None
        timeout = options['timeout']
        start_time = time.time()
        
        while not db_conn and (time.time() - start_time) < timeout:
            try:
                db_conn = connections['default']
                # Try to execute a simple query
                with db_conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                self.stdout.write(self.style.SUCCESS('Database available!'))
                return
            except OperationalError:
                self.stdout.write('Database unavailable, waiting 1 second...')
                time.sleep(1)
        
        self.stdout.write(self.style.ERROR(f'Database not available after {timeout} seconds!'))