"""
Trigger Temporal workflows for the practitioners domain.

This command provides a convenient way to trigger practitioner-related workflows
such as onboarding, subscription renewal, and verification processes.
"""
import asyncio
import logging
import sys
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError

from apps.integrations.temporal.utils import start_workflow

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Trigger Temporal workflows for the practitioners domain'

    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest='workflow', help='Workflow to trigger')
        
        # PractitionerOnboardingWorkflow
        onboarding_parser = subparsers.add_parser(
            'onboarding',
            help='Trigger PractitionerOnboardingWorkflow for a practitioner'
        )
        onboarding_parser.add_argument(
            'practitioner_id',
            type=int,
            help='ID of the practitioner to onboard'
        )
        
        # SubscriptionRenewalWorkflow
        renewal_parser = subparsers.add_parser(
            'subscription_renewal',
            help='Trigger SubscriptionRenewalWorkflow for a subscription'
        )
        renewal_parser.add_argument(
            'subscription_id',
            type=int,
            help='ID of the subscription to renew'
        )
        
        # Common arguments
        parser.add_argument(
            '--task-queue',
            type=str,
            default='practitioners',
            help='Temporal task queue to use'
        )
        parser.add_argument(
            '--wait',
            action='store_true',
            help='Wait for workflow to complete'
        )

    def handle(self, *args, **options):
        workflow = options.get('workflow')
        task_queue = options.get('task_queue')
        wait = options.get('wait')
        
        if not workflow:
            raise CommandError("You must specify a workflow to trigger")
        
        try:
            if workflow == 'onboarding':
                practitioner_id = options.get('practitioner_id')
                self.stdout.write(f"Triggering PractitionerOnboardingWorkflow for practitioner {practitioner_id}")
                
                workflow_args = [practitioner_id]
                workflow_name = "PractitionerOnboardingWorkflow"
            
            elif workflow == 'subscription_renewal':
                subscription_id = options.get('subscription_id')
                
                self.stdout.write(f"Triggering SubscriptionRenewalWorkflow for subscription {subscription_id}")
                
                workflow_args = [subscription_id]
                workflow_name = "SubscriptionRenewalWorkflow"
            
            else:
                raise CommandError(f"Unknown workflow: {workflow}")
            
            # Run the workflow
            result = asyncio.run(self._trigger_workflow(
                workflow_name=workflow_name,
                workflow_args=workflow_args,
                task_queue=task_queue,
                wait=wait,
            ))
            
            if wait:
                self.stdout.write(self.style.SUCCESS(f"Workflow completed with result: {result}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Workflow triggered: {result}"))
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error triggering workflow: {str(e)}"))
            logger.exception("Error triggering workflow")
            sys.exit(1)
    
    async def _trigger_workflow(self, workflow_name, workflow_args, task_queue, wait):
        """
        Trigger a workflow.
        
        Args:
            workflow_name: Name of the workflow to trigger
            workflow_args: Arguments to pass to the workflow
            task_queue: Task queue to use
            wait: Whether to wait for the workflow to complete
            
        Returns:
            Workflow handle or result
        """
        result = await start_workflow(
            workflow_name=workflow_name,
            args=workflow_args,
            task_queue=task_queue,
            domain="practitioners",
            wait_for_result=wait,
        )
        
        return result
