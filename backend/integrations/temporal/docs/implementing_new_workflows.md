# Implementing New Temporal Workflows in Estuary

This guide provides step-by-step instructions for implementing new Temporal workflows and activities for a domain in the Estuary platform.

## Overview

The Temporal integration in Estuary follows a standardized pattern that makes it easy to add new workflows and activities. Each domain (e.g., bookings, payments, practitioners) has its own set of workflows and activities that are automatically discovered and registered by the worker.

## Prerequisites

Before implementing a new workflow, make sure you understand:

1. The business process you want to model as a workflow
2. The individual steps (activities) that make up the process
3. How the process handles failures and retries
4. The data required for each step

## Step 1: Define Activities

Activities are the building blocks of workflows. They represent individual steps in a business process and are executed by workers.

Create a file named `temporal_activities.py` in your domain app:

```python
"""
Temporal activities for the example domain.
"""
import logging
from datetime import datetime
from typing import Dict, Any

from temporalio import activity

from apps.integrations.temporal.base_activities import django_activity, transactional_activity
from apps.integrations.temporal.decorators import monitored_activity

logger = logging.getLogger(__name__)

@activity.defn
@monitored_activity(name="get_entity_details")
@django_activity
def get_entity_details(entity_id: int) -> Dict[str, Any]:
    """
    Get details for an entity.
    
    Args:
        entity_id: ID of the entity
        
    Returns:
        Dict with entity details
    """
    from apps.example.models import ExampleEntity
    
    entity = ExampleEntity.objects.get(id=entity_id)
    
    return {
        "id": entity.id,
        "name": entity.name,
        "status": entity.status,
        "created_at": entity.created_at.isoformat(),
    }

@activity.defn
@monitored_activity(name="process_entity")
@transactional_activity
def process_entity(entity_id: int) -> Dict[str, Any]:
    """
    Process an entity.
    
    Args:
        entity_id: ID of the entity
        
    Returns:
        Dict with processing results
    """
    from apps.example.models import ExampleEntity
    from apps.example.services import ExampleService
    
    entity = ExampleEntity.objects.get(id=entity_id)
    
    service = ExampleService()
    result = service.process(entity)
    
    return {
        "entity_id": entity_id,
        "success": True,
        "result": result,
        "processed_at": datetime.utcnow().isoformat(),
    }
```

### Activity Decorators

- `@activity.defn`: Marks the function as a Temporal activity
- `@monitored_activity(name="...")`: Adds logging and monitoring
- `@django_activity`: Sets up the Django environment for ORM access
- `@transactional_activity`: Wraps the activity in a database transaction

## Step 2: Define Workflows

Workflows orchestrate activities to achieve a business goal. They are durable and can survive worker restarts.

Create a file named `temporal_workflows.py` in your domain app:

```python
"""
Temporal workflows for the example domain.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any

from temporalio import workflow
from temporalio.common import RetryPolicy

from apps.integrations.temporal.base_workflows import BaseWorkflow
from apps.integrations.temporal.decorators import monitored_workflow

logger = logging.getLogger(__name__)

@workflow.defn
@monitored_workflow(name="ExampleWorkflow")
class ExampleWorkflow(BaseWorkflow):
    """
    Example workflow for processing an entity.
    """
    
    @workflow.run
    async def run(self, entity_id: int) -> Dict[str, Any]:
        """
        Execute the example workflow.
        
        Args:
            entity_id: ID of the entity to process
            
        Returns:
            Dict with workflow execution results
        """
        workflow.logger.info(f"Starting example workflow for entity {entity_id}")
        
        # Step 1: Get entity details
        entity = await self.execute_activity(
            "get_entity_details",
            entity_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Step 2: Process the entity
        result = await self.execute_activity(
            "process_entity",
            entity_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Return the workflow result
        return {
            "entity_id": entity_id,
            "status": "completed",
            "result": result,
            "completed_at": datetime.utcnow().isoformat(),
        }
```

### Workflow Decorators

- `@workflow.defn`: Marks the class as a Temporal workflow
- `@monitored_workflow(name="...")`: Adds logging and monitoring
- `BaseWorkflow`: Provides common functionality for all workflows

## Step 3: Create a Management Command

Create a management command to trigger your workflow:

```python
"""
Trigger Temporal workflows for the example domain.
"""
import asyncio
import logging
import sys
from django.core.management.base import BaseCommand, CommandError

from apps.integrations.temporal.utils import start_workflow

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Trigger Temporal workflows for the example domain'

    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest='workflow', help='Workflow to trigger')
        
        # ExampleWorkflow
        example_parser = subparsers.add_parser(
            'example',
            help='Trigger ExampleWorkflow for an entity'
        )
        example_parser.add_argument(
            'entity_id',
            type=int,
            help='ID of the entity to process'
        )
        
        # Common arguments
        parser.add_argument(
            '--task-queue',
            type=str,
            default='example',
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
            if workflow == 'example':
                entity_id = options.get('entity_id')
                self.stdout.write(f"Triggering ExampleWorkflow for entity {entity_id}")
                
                workflow_args = [entity_id]
                workflow_name = "ExampleWorkflow"
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
            domain="example",
            wait_for_result=wait,
        )
        
        return result
```

## Step 4: Update Domain Configuration

Add your domain to the worker configuration in `start_domain_workers.py`:

```python
worker_configs = {
    # ... existing configs ...
    'example': {
        'domains': ['example'],
        'task_queues': ['example'],
        'description': 'Example domain'
    },
}
```

## Step 5: Start the Worker

Start a worker for your domain:

```bash
python manage.py start_worker --task-queue=example --domains example
```

Or use the domain worker command:

```bash
python manage.py start_domain_workers example
```

## Step 6: Trigger the Workflow

Trigger your workflow using the management command:

```bash
python manage.py trigger_example_workflows example 123
```

## Best Practices

### 1. Activity Design

- **Keep activities small and focused**: Each activity should do one thing well
- **Make activities idempotent**: Activities should be safe to retry
- **Use appropriate decorators**: Choose the right decorators for your activities
- **Handle exceptions gracefully**: Catch and handle exceptions appropriately

### 2. Workflow Design

- **Keep workflows deterministic**: Avoid non-deterministic operations in workflows
- **Use appropriate timeouts**: Set reasonable timeouts for activities
- **Use retry policies**: Configure retry policies for transient failures
- **Consider workflow history size**: Use `continue_as_new` for long-running workflows

### 3. Error Handling

- **Activity failures**: Handle activity failures gracefully in workflows
- **Workflow failures**: Set up monitoring for workflow failures
- **Retry strategies**: Configure appropriate retry strategies for different types of failures

## Common Patterns

### 1. Long-Running Processes

For processes that span days or weeks, use `sleep` and `continue_as_new`:

```python
@workflow.run
async def run(self, entity_id: int) -> Dict[str, Any]:
    # ... initial processing ...
    
    # Wait for some condition
    for _ in range(30):  # Check for 30 days
        await workflow.sleep(timedelta(days=1))
        
        # Check if condition is met
        status = await self.execute_activity(
            "check_entity_status",
            entity_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        if status.get("is_complete"):
            break
    
    # If workflow history is getting too large
    if some_condition:
        return await workflow.continue_as_new(entity_id)
    
    # ... final processing ...
```

### 2. Batch Processing

For processing multiple items in a batch:

```python
@workflow.run
async def run(self, batch_id: int, item_ids: List[int]) -> Dict[str, Any]:
    results = []
    
    for item_id in item_ids:
        result = await self.execute_activity(
            "process_item",
            item_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        results.append(result)
    
    return {
        "batch_id": batch_id,
        "results": results,
        "completed_at": datetime.utcnow().isoformat(),
    }
```

### 3. Child Workflows

For complex processes that can be broken down into sub-workflows:

```python
@workflow.run
async def run(self, entity_id: int) -> Dict[str, Any]:
    # ... initial processing ...
    
    # Start a child workflow
    child_result = await workflow.execute_child_workflow(
        "SubWorkflow",
        entity_id,
        id=f"sub-{entity_id}",
        task_queue="example",
    )
    
    # ... final processing ...
```

## Conclusion

By following these guidelines, you can implement robust, scalable, and maintainable Temporal workflows for your domain in the Estuary platform. Remember to leverage the base classes and utilities provided by the Temporal integration to ensure consistency across different domains.

For more information, refer to the [Temporal documentation](https://docs.temporal.io/) or contact the Estuary engineering team.
