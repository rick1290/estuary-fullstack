"""
Trigger Temporal workflows for the bookings domain.

This command provides a convenient way to trigger booking-related workflows
such as booking lifecycle management, rescheduling, and batch reminders.
"""
import asyncio
import logging
import sys
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand, CommandError

from apps.integrations.temporal.utils import start_workflow

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Trigger Temporal workflows for the bookings domain'

    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest='workflow', help='Workflow to trigger')
        
        # BookingLifecycleWorkflow
        lifecycle_parser = subparsers.add_parser(
            'lifecycle',
            help='Trigger BookingLifecycleWorkflow for a booking'
        )
        lifecycle_parser.add_argument(
            'booking_id',
            type=int,
            help='ID of the booking to manage'
        )
        
        # ReschedulingWorkflow
        reschedule_parser = subparsers.add_parser(
            'reschedule',
            help='Trigger ReschedulingWorkflow for a booking'
        )
        reschedule_parser.add_argument(
            'original_booking_id',
            type=int,
            help='ID of the original booking'
        )
        reschedule_parser.add_argument(
            'new_session_time',
            type=str,
            help='New session time (ISO format, e.g., 2023-06-15T14:30:00)'
        )
        reschedule_parser.add_argument(
            '--reason',
            type=str,
            help='Reason for rescheduling'
        )
        
        # BatchReminderWorkflow
        reminder_parser = subparsers.add_parser(
            'batch_reminder',
            help='Trigger BatchReminderWorkflow for upcoming sessions'
        )
        reminder_parser.add_argument(
            '--start-time',
            type=str,
            help='Start of time window (ISO format). Defaults to now.'
        )
        reminder_parser.add_argument(
            '--end-time',
            type=str,
            help='End of time window (ISO format). Defaults to 24 hours from now.'
        )
        reminder_parser.add_argument(
            '--reminder-type',
            type=str,
            default='upcoming_session',
            choices=['upcoming_session', 'day_before', 'hour_before'],
            help='Type of reminder to send'
        )
        
        # Common arguments
        parser.add_argument(
            '--task-queue',
            type=str,
            default='bookings',
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
            if workflow == 'lifecycle':
                booking_id = options.get('booking_id')
                self.stdout.write(f"Triggering BookingLifecycleWorkflow for booking {booking_id}")
                
                workflow_args = [booking_id]
                workflow_name = "BookingLifecycleWorkflow"
            
            elif workflow == 'reschedule':
                original_booking_id = options.get('original_booking_id')
                new_session_time = options.get('new_session_time')
                reason = options.get('reason')
                
                self.stdout.write(
                    f"Triggering ReschedulingWorkflow for booking {original_booking_id} "
                    f"with new time {new_session_time}"
                )
                
                workflow_args = [original_booking_id, new_session_time]
                if reason:
                    workflow_args.append(reason)
                
                workflow_name = "ReschedulingWorkflow"
            
            elif workflow == 'batch_reminder':
                start_time = options.get('start_time')
                end_time = options.get('end_time')
                reminder_type = options.get('reminder_type')
                
                # Default time window if not specified
                if not start_time:
                    start_time = datetime.now().isoformat()
                if not end_time:
                    end_time = (datetime.now() + timedelta(days=1)).isoformat()
                
                self.stdout.write(
                    f"Triggering BatchReminderWorkflow for time window "
                    f"{start_time} to {end_time} with reminder type {reminder_type}"
                )
                
                workflow_args = [start_time, end_time, reminder_type]
                workflow_name = "BatchReminderWorkflow"
            
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
            domain="bookings",
            wait_for_result=wait,
        )
        
        return result
