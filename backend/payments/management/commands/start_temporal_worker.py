"""
Start a Temporal worker for processing payment workflows.

This command starts a Temporal worker that processes payment workflows
defined in the payments app, such as progressive package payouts,
batch practitioner payouts, and subscription renewals.
"""
import asyncio
import logging
import signal
import sys
from django.core.management.base import BaseCommand

from temporalio.client import Client
from temporalio.worker import Worker

from apps.integrations.temporal.client import get_temporal_client
from apps.payments.temporal_workflows import (
    ProgressivePackagePayoutWorkflow,
    BatchPractitionerPayoutWorkflow,
    SubscriptionRenewalWorkflow,
)
from apps.payments.temporal_activities import (
    process_package_completion,
    process_partial_payout,
    process_practitioner_payout,
    process_subscription_renewal,
    send_payout_notification,
    record_transaction_error,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Start a Temporal worker for processing payment workflows'

    def add_arguments(self, parser):
        parser.add_argument(
            '--task-queue',
            type=str,
            default='payments',
            help='Temporal task queue to listen on',
        )

    def handle(self, *args, **options):
        task_queue = options.get('task_queue')
        self.stdout.write(f'Starting Temporal worker on task queue: {task_queue}')
        
        # Run the worker
        try:
            asyncio.run(self.run_worker(task_queue))
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('Worker stopped by user'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error running worker: {str(e)}'))
            logger.exception('Error running Temporal worker')
            sys.exit(1)

    async def run_worker(self, task_queue):
        """Run the Temporal worker."""
        # Get the Temporal client
        client = await get_temporal_client()
        self.stdout.write(f'Connected to Temporal server')
        
        # Create a worker
        worker = Worker(
            client,
            task_queue=task_queue,
            workflows=[
                ProgressivePackagePayoutWorkflow,
                BatchPractitionerPayoutWorkflow,
                SubscriptionRenewalWorkflow,
            ],
            activities=[
                process_package_completion,
                process_partial_payout,
                process_practitioner_payout,
                process_subscription_renewal,
                send_payout_notification,
                record_transaction_error,
            ],
        )
        
        # Handle shutdown signals
        loop = asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, lambda: asyncio.create_task(self.shutdown(worker)))
        
        self.stdout.write(self.style.SUCCESS(f'Worker started on task queue: {task_queue}'))
        
        # Run the worker
        await worker.run()

    async def shutdown(self, worker):
        """Gracefully shut down the worker."""
        self.stdout.write('Shutting down worker...')
        await worker.shutdown()
        self.stdout.write(self.style.SUCCESS('Worker shut down successfully'))
