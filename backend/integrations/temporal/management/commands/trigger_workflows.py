"""
Trigger Temporal workflows across different domains.

This command triggers Temporal workflows for different domains in the Estuary platform,
allowing for centralized workflow management.
"""
import asyncio
import importlib
import inspect
import logging
import sys
from typing import Dict, List, Optional, Any

from django.core.management.base import BaseCommand, CommandError
from django.apps import apps

from apps.integrations.temporal.client import get_temporal_client

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Trigger Temporal workflows across different domains'

    def add_arguments(self, parser):
        parser.add_argument(
            '--task-queue',
            type=str,
            default='default',
            help='Temporal task queue to use',
        )
        parser.add_argument(
            '--domain',
            type=str,
            required=True,
            help='Domain to trigger workflows for (e.g., payments, bookings, practitioners)',
        )
        parser.add_argument(
            '--workflow',
            type=str,
            required=True,
            help='Workflow to trigger (e.g., ProgressivePackagePayoutWorkflow)',
        )
        parser.add_argument(
            '--args',
            nargs='*',
            help='Arguments to pass to the workflow (in order)',
        )
        parser.add_argument(
            '--kwargs',
            nargs='*',
            help='Keyword arguments to pass to the workflow (in key=value format)',
        )
        parser.add_argument(
            '--workflow-id',
            type=str,
            help='Custom workflow ID to use (if not specified, a unique ID will be generated)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Dry run (do not actually trigger workflows)',
        )

    def handle(self, *args, **options):
        task_queue = options.get('task_queue')
        domain = options.get('domain')
        workflow_name = options.get('workflow')
        workflow_args = options.get('args') or []
        workflow_kwargs_raw = options.get('kwargs') or []
        workflow_id = options.get('workflow_id')
        dry_run = options.get('dry_run')
        
        # Parse keyword arguments
        workflow_kwargs = {}
        for kwarg in workflow_kwargs_raw:
            try:
                key, value = kwarg.split('=', 1)
                # Try to convert value to appropriate type
                try:
                    # Try as int
                    workflow_kwargs[key] = int(value)
                except ValueError:
                    try:
                        # Try as float
                        workflow_kwargs[key] = float(value)
                    except ValueError:
                        # Use as string
                        workflow_kwargs[key] = value
            except ValueError:
                raise CommandError(f"Invalid kwarg format: {kwarg}. Use key=value format.")
        
        self.stdout.write(f'Triggering workflow {workflow_name} in domain {domain} on task queue {task_queue}')
        self.stdout.write(f'Args: {workflow_args}')
        self.stdout.write(f'Kwargs: {workflow_kwargs}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - no workflows will be triggered'))
            return
        
        # Run the workflow trigger
        try:
            asyncio.run(self.trigger_workflow(
                task_queue=task_queue,
                domain=domain,
                workflow_name=workflow_name,
                workflow_args=workflow_args,
                workflow_kwargs=workflow_kwargs,
                workflow_id=workflow_id,
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error triggering workflow: {str(e)}'))
            logger.exception('Error triggering Temporal workflow')
            sys.exit(1)

    async def trigger_workflow(
        self,
        task_queue: str,
        domain: str,
        workflow_name: str,
        workflow_args: List[str],
        workflow_kwargs: Dict[str, Any],
        workflow_id: Optional[str] = None,
    ):
        """
        Trigger a Temporal workflow.
        
        Args:
            task_queue: The task queue to use
            domain: The domain to trigger workflows for
            workflow_name: The name of the workflow to trigger
            workflow_args: Arguments to pass to the workflow
            workflow_kwargs: Keyword arguments to pass to the workflow
            workflow_id: Optional custom workflow ID to use
        """
        # Get the Temporal client
        client = await get_temporal_client()
        self.stdout.write(f'Connected to Temporal server')
        
        # Try to import the workflow module
        try:
            module = importlib.import_module(f"apps.{domain}.temporal_workflows")
        except ImportError:
            raise CommandError(f"No temporal_workflows module found for domain {domain}")
        
        # Find the workflow class
        workflow_class = None
        for name, obj in inspect.getmembers(module):
            if (inspect.isclass(obj) and 
                hasattr(obj, '__temporal_workflow_definition__') and
                name == workflow_name):
                workflow_class = obj
                break
        
        if not workflow_class:
            raise CommandError(f"Workflow {workflow_name} not found in domain {domain}")
        
        # Generate a unique workflow ID if not provided
        if not workflow_id:
            import uuid
            import time
            workflow_id = f"{domain}-{workflow_name}-{uuid.uuid4()}-{int(time.time())}"
        
        # Convert args to appropriate types
        converted_args = []
        for arg in workflow_args:
            # Try to convert to appropriate type
            try:
                # Try as int
                converted_args.append(int(arg))
            except ValueError:
                try:
                    # Try as float
                    converted_args.append(float(arg))
                except ValueError:
                    # Use as string
                    converted_args.append(arg)
        
        # Start the workflow
        self.stdout.write(f'Starting workflow {workflow_name} (ID: {workflow_id})')
        
        handle = await client.start_workflow(
            f"{workflow_name}.run",
            args=converted_args,
            kwargs=workflow_kwargs,
            id=workflow_id,
            task_queue=task_queue,
        )
        
        self.stdout.write(self.style.SUCCESS(f'Workflow started successfully (ID: {workflow_id})'))
