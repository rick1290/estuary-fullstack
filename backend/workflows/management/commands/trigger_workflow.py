"""
Django management command to manually trigger a workflow for testing.

Usage:
    python manage.py trigger_workflow BookingWorkflow --booking-id 123
    python manage.py trigger_workflow PaymentProcessingWorkflow --payment-id 456
    python manage.py trigger_workflow StreamSetupWorkflow --stream-id 789 --task-queue custom-queue
"""
import asyncio
import json
import uuid
from typing import Any, Dict

from django.core.management.base import BaseCommand, CommandError

from integrations.temporal.client import get_temporal_client
from workflows.registry import registry


class Command(BaseCommand):
    help = 'Manually trigger a Temporal workflow for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            'workflow_name',
            type=str,
            help='Name of the workflow class to trigger'
        )
        
        parser.add_argument(
            '--workflow-id',
            type=str,
            help='Custom workflow ID (default: auto-generated)'
        )
        
        parser.add_argument(
            '--task-queue',
            type=str,
            default='estuary-workflows',
            help='Task queue to use (default: estuary-workflows)'
        )
        
        parser.add_argument(
            '--timeout',
            type=int,
            default=300,
            help='Workflow timeout in seconds (default: 300)'
        )
        
        parser.add_argument(
            '--wait',
            action='store_true',
            help='Wait for workflow to complete'
        )
        
        parser.add_argument(
            '--json-input',
            type=str,
            help='JSON string of workflow input parameters'
        )
        
        # Common workflow parameters
        parser.add_argument('--booking-id', type=int, help='Booking ID for booking workflows')
        parser.add_argument('--payment-id', type=int, help='Payment ID for payment workflows')
        parser.add_argument('--stream-id', type=int, help='Stream ID for stream workflows')
        parser.add_argument('--room-id', type=int, help='Room ID for room workflows')
        parser.add_argument('--user-id', type=int, help='User ID parameter')
        parser.add_argument('--practitioner-id', type=int, help='Practitioner ID parameter')

    def handle(self, *args, **options):
        """Handle the command."""
        workflow_name = options['workflow_name']
        
        # Load registry to find the workflow
        registry.load()
        
        # Find the workflow class
        workflow_class = self._find_workflow(workflow_name)
        if not workflow_class:
            raise CommandError(
                f"Workflow '{workflow_name}' not found. "
                f"Use 'python manage.py list_workflows' to see available workflows."
            )
        
        # Build workflow input
        workflow_input = self._build_workflow_input(options)
        
        # Generate workflow ID
        workflow_id = options.get('workflow_id') or f"{workflow_name}-{uuid.uuid4()}"
        
        self.stdout.write(f"Triggering workflow: {workflow_name}")
        self.stdout.write(f"Workflow ID: {workflow_id}")
        self.stdout.write(f"Task queue: {options['task_queue']}")
        self.stdout.write(f"Input: {json.dumps(workflow_input, indent=2)}")
        
        # Run the workflow
        try:
            result = asyncio.run(self._trigger_workflow(
                workflow_class=workflow_class,
                workflow_id=workflow_id,
                workflow_input=workflow_input,
                task_queue=options['task_queue'],
                timeout=options['timeout'],
                wait=options['wait']
            ))
            
            if options['wait'] and result is not None:
                self.stdout.write(
                    self.style.SUCCESS(f"\nWorkflow completed successfully!")
                )
                self.stdout.write(f"Result: {json.dumps(result, indent=2)}")
            else:
                self.stdout.write(
                    self.style.SUCCESS(f"\nWorkflow started successfully!")
                )
                
        except Exception as e:
            raise CommandError(f"Failed to trigger workflow: {e}")
    
    def _find_workflow(self, workflow_name: str):
        """Find workflow class by name."""
        all_workflows = registry.get_all_workflows()
        
        for workflow in all_workflows:
            if workflow.__name__ == workflow_name:
                return workflow
        
        return None
    
    def _build_workflow_input(self, options) -> Dict[str, Any]:
        """Build workflow input from options."""
        # Start with JSON input if provided
        if options.get('json_input'):
            try:
                workflow_input = json.loads(options['json_input'])
            except json.JSONDecodeError as e:
                raise CommandError(f"Invalid JSON input: {e}")
        else:
            workflow_input = {}
        
        # Add specific parameters
        param_mapping = {
            'booking_id': 'booking_id',
            'payment_id': 'payment_id',
            'stream_id': 'stream_id',
            'room_id': 'room_id',
            'user_id': 'user_id',
            'practitioner_id': 'practitioner_id',
        }
        
        for option_key, input_key in param_mapping.items():
            if options.get(option_key) is not None:
                workflow_input[input_key] = options[option_key]
        
        return workflow_input
    
    async def _trigger_workflow(
        self,
        workflow_class,
        workflow_id: str,
        workflow_input: Dict[str, Any],
        task_queue: str,
        timeout: int,
        wait: bool
    ):
        """Trigger the workflow."""
        # Get Temporal client
        client = await get_temporal_client()
        
        # Start the workflow
        handle = await client.start_workflow(
            workflow_class.run,
            workflow_input,
            id=workflow_id,
            task_queue=task_queue,
            execution_timeout=timeout,
        )
        
        if wait:
            # Wait for result
            result = await handle.result()
            return result
        else:
            return None