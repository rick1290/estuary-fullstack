"""
Trigger Temporal workflows for payment processing.

This command triggers Temporal workflows for payment processing, including:
- Progressive package payouts
- Batch practitioner payouts
- Subscription renewals
"""
import asyncio
import logging
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.integrations.temporal.client import get_temporal_client
from apps.payments.models import (
    PackageCompletionRecord,
    PractitionerCreditTransaction,
    PractitionerSubscription,
)
from apps.practitioners.models import Practitioner

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Trigger Temporal workflows for payment processing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--task-queue',
            type=str,
            default='payments',
            help='Temporal task queue to use',
        )
        parser.add_argument(
            '--workflow-type',
            type=str,
            choices=['package', 'payout', 'subscription', 'all'],
            default='all',
            help='Type of workflow to trigger',
        )
        parser.add_argument(
            '--min-payout-amount',
            type=float,
            default=10.0,
            help='Minimum amount required to process a payout',
        )
        parser.add_argument(
            '--payment-method',
            type=str,
            default='stripe',
            help='Payment method to use for payouts',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Dry run (do not actually trigger workflows)',
        )

    def handle(self, *args, **options):
        task_queue = options.get('task_queue')
        workflow_type = options.get('workflow_type')
        min_payout_amount = options.get('min_payout_amount')
        payment_method = options.get('payment_method')
        dry_run = options.get('dry_run')
        
        self.stdout.write(f'Triggering Temporal workflows on task queue: {task_queue}')
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - no workflows will be triggered'))
        
        # Run the workflow trigger
        try:
            asyncio.run(self.trigger_workflows(
                task_queue,
                workflow_type,
                min_payout_amount,
                payment_method,
                dry_run
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error triggering workflows: {str(e)}'))
            logger.exception('Error triggering Temporal workflows')
            return

    async def trigger_workflows(
        self,
        task_queue,
        workflow_type,
        min_payout_amount,
        payment_method,
        dry_run
    ):
        """Trigger Temporal workflows."""
        # Get the Temporal client
        client = await get_temporal_client()
        self.stdout.write(f'Connected to Temporal server')
        
        # Trigger the requested workflows
        if workflow_type in ['package', 'all']:
            await self.trigger_package_workflows(client, task_queue, dry_run)
        
        if workflow_type in ['payout', 'all']:
            await self.trigger_payout_workflows(client, task_queue, min_payout_amount, payment_method, dry_run)
        
        if workflow_type in ['subscription', 'all']:
            await self.trigger_subscription_workflows(client, task_queue, dry_run)
        
        self.stdout.write(self.style.SUCCESS('Finished triggering workflows'))

    async def trigger_package_workflows(self, client, task_queue, dry_run):
        """Trigger progressive package payout workflows."""
        self.stdout.write('Triggering progressive package payout workflows...')
        
        # Get incomplete package completion records
        package_completions = await asyncio.to_thread(
            lambda: list(PackageCompletionRecord.objects.filter(
                is_completed=False
            ).values_list('id', flat=True))
        )
        
        self.stdout.write(f'Found {len(package_completions)} incomplete package completions')
        
        # Also get recently completed packages that might need final payout
        recent_completions = await asyncio.to_thread(
            lambda: list(PackageCompletionRecord.objects.filter(
                is_completed=True,
                last_payout_percentage__lt=100,
                completion_date__gte=timezone.now() - timedelta(days=7)
            ).values_list('id', flat=True))
        )
        
        self.stdout.write(f'Found {len(recent_completions)} recently completed packages needing final payout')
        
        # Combine the lists
        all_package_ids = list(package_completions) + list(recent_completions)
        
        # Trigger workflows for each package
        count = 0
        for package_id in all_package_ids:
            if not dry_run:
                # Generate a unique workflow ID
                workflow_id = f"package-payout-{package_id}-{int(datetime.now().timestamp())}"
                
                # Start the workflow
                await client.start_workflow(
                    "ProgressivePackagePayoutWorkflow.run",
                    args=[package_id],
                    id=workflow_id,
                    task_queue=task_queue,
                )
                
                self.stdout.write(f'  Started workflow for package {package_id} (ID: {workflow_id})')
            else:
                self.stdout.write(f'  Would start workflow for package {package_id}')
            
            count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Triggered {count} package payout workflows'))

    async def trigger_payout_workflows(self, client, task_queue, min_payout_amount, payment_method, dry_run):
        """Trigger batch practitioner payout workflows."""
        self.stdout.write('Triggering batch practitioner payout workflows...')
        
        # Get practitioners with ready transactions
        practitioners_with_transactions = await asyncio.to_thread(
            lambda: list(Practitioner.objects.filter(
                practitioner_credit_transactions__payout_status__in=['ready', 'pending'],
                practitioner_credit_transactions__ready_for_payout_date__isnull=False
            ).distinct().values_list('id', flat=True))
        )
        
        self.stdout.write(f'Found {len(practitioners_with_transactions)} practitioners with ready transactions')
        
        # Trigger workflows for each practitioner
        count = 0
        for practitioner_id in practitioners_with_transactions:
            if not dry_run:
                # Generate a unique workflow ID
                workflow_id = f"batch-payout-{practitioner_id}-{int(datetime.now().timestamp())}"
                
                # Start the workflow
                await client.start_workflow(
                    "BatchPractitionerPayoutWorkflow.run",
                    args=[practitioner_id, min_payout_amount, payment_method],
                    id=workflow_id,
                    task_queue=task_queue,
                )
                
                self.stdout.write(f'  Started workflow for practitioner {practitioner_id} (ID: {workflow_id})')
            else:
                self.stdout.write(f'  Would start workflow for practitioner {practitioner_id}')
            
            count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Triggered {count} batch payout workflows'))

    async def trigger_subscription_workflows(self, client, task_queue, dry_run):
        """Trigger subscription renewal workflows."""
        self.stdout.write('Triggering subscription renewal workflows...')
        
        # Get subscriptions due for renewal in the next 24 hours
        due_date = timezone.now() + timedelta(days=1)
        subscriptions = await asyncio.to_thread(
            lambda: list(PractitionerSubscription.objects.filter(
                is_active=True,
                auto_renew=True,
                end_date__lte=due_date
            ).values_list('id', flat=True))
        )
        
        self.stdout.write(f'Found {len(subscriptions)} subscriptions due for renewal')
        
        # Trigger workflows for each subscription
        count = 0
        for subscription_id in subscriptions:
            if not dry_run:
                # Generate a unique workflow ID
                workflow_id = f"subscription-renewal-{subscription_id}-{int(datetime.now().timestamp())}"
                
                # Start the workflow
                await client.start_workflow(
                    "SubscriptionRenewalWorkflow.run",
                    args=[subscription_id],
                    id=workflow_id,
                    task_queue=task_queue,
                )
                
                self.stdout.write(f'  Started workflow for subscription {subscription_id} (ID: {workflow_id})')
            else:
                self.stdout.write(f'  Would start workflow for subscription {subscription_id}')
            
            count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Triggered {count} subscription renewal workflows'))
