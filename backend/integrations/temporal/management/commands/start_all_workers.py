"""
Start multiple Temporal workers for different domains.

This command starts multiple Temporal workers, each on a different task queue,
to process workflows and activities for different domains across the Estuary platform.
"""
import asyncio
import logging
import sys
from django.core.management.base import BaseCommand

from apps.integrations.temporal.worker import TemporalWorker

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Start multiple Temporal workers for different domains'

    def add_arguments(self, parser):
        parser.add_argument(
            '--domains',
            nargs='+',
            type=str,
            default=['payments', 'bookings', 'practitioners', 'content'],
            help='Domains to start workers for',
        )
        parser.add_argument(
            '--max-concurrent-activities',
            type=int,
            default=100,
            help='Maximum number of concurrent activities per worker',
        )
        parser.add_argument(
            '--max-concurrent-workflows',
            type=int,
            default=100,
            help='Maximum number of concurrent workflows per worker',
        )
        parser.add_argument(
            '--max-cached-workflows',
            type=int,
            default=1000,
            help='Maximum number of cached workflows per worker',
        )

    def handle(self, *args, **options):
        domains = options.get('domains')
        max_concurrent_activities = options.get('max_concurrent_activities')
        max_concurrent_workflows = options.get('max_concurrent_workflows')
        max_cached_workflows = options.get('max_cached_workflows')
        
        self.stdout.write(f'Starting workers for domains: {", ".join(domains)}')
        
        # Run the workers
        try:
            asyncio.run(self.run_workers(
                domains=domains,
                max_concurrent_activities=max_concurrent_activities,
                max_concurrent_workflows=max_concurrent_workflows,
                max_cached_workflows=max_cached_workflows,
            ))
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('Workers stopped by user'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error running workers: {str(e)}'))
            logger.exception('Error running Temporal workers')
            sys.exit(1)
    
    async def run_workers(
        self,
        domains,
        max_concurrent_activities,
        max_concurrent_workflows,
        max_cached_workflows,
    ):
        """
        Run multiple workers, one for each domain.
        
        Args:
            domains: List of domains to start workers for
            max_concurrent_activities: Maximum number of concurrent activities per worker
            max_concurrent_workflows: Maximum number of concurrent workflows per worker
            max_cached_workflows: Maximum number of cached workflows per worker
        """
        # Create a worker for each domain
        workers = []
        for domain in domains:
            worker = TemporalWorker(
                task_queue=domain,
                domains=[domain],
                max_concurrent_activities=max_concurrent_activities,
                max_concurrent_workflows=max_concurrent_workflows,
                max_cached_workflows=max_cached_workflows,
            )
            workers.append(worker)
        
        # Start all workers
        tasks = []
        for worker in workers:
            task = asyncio.create_task(worker.start())
            tasks.append(task)
        
        # Wait for all workers to complete
        await asyncio.gather(*tasks)
