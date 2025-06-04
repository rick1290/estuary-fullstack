"""
Start a Temporal worker for processing workflows.

This command starts a Temporal worker that can process workflows and activities
from multiple domains across the Estuary platform.
"""
import asyncio
import logging
import sys
from django.core.management.base import BaseCommand

from apps.integrations.temporal.worker import run_worker

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Start a Temporal worker for processing workflows'

    def add_arguments(self, parser):
        parser.add_argument(
            '--task-queue',
            type=str,
            default='default',
            help='Temporal task queue to listen on',
        )
        parser.add_argument(
            '--domains',
            nargs='+',
            type=str,
            help='Domains to include (e.g., payments bookings practitioners). If not specified, all domains are included.',
        )
        parser.add_argument(
            '--max-concurrent-activities',
            type=int,
            default=100,
            help='Maximum number of concurrent activities',
        )
        parser.add_argument(
            '--max-concurrent-workflows',
            type=int,
            default=100,
            help='Maximum number of concurrent workflows',
        )
        parser.add_argument(
            '--max-cached-workflows',
            type=int,
            default=1000,
            help='Maximum number of cached workflows',
        )

    def handle(self, *args, **options):
        task_queue = options.get('task_queue')
        domains = options.get('domains')
        max_concurrent_activities = options.get('max_concurrent_activities')
        max_concurrent_workflows = options.get('max_concurrent_workflows')
        max_cached_workflows = options.get('max_cached_workflows')
        
        self.stdout.write(f'Starting Temporal worker on task queue: {task_queue}')
        if domains:
            self.stdout.write(f'Including domains: {", ".join(domains)}')
        else:
            self.stdout.write('Including all domains')
        
        # Run the worker
        try:
            asyncio.run(run_worker(
                task_queue=task_queue,
                domains=domains,
                max_concurrent_activities=max_concurrent_activities,
                max_concurrent_workflows=max_concurrent_workflows,
                max_cached_workflows=max_cached_workflows,
            ))
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('Worker stopped by user'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error running worker: {str(e)}'))
            logger.exception('Error running Temporal worker')
            sys.exit(1)
