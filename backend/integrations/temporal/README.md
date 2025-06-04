# Temporal Integration for Estuary

This module provides a comprehensive integration with Temporal.io for the Estuary platform, enabling robust, fault-tolerant, and scalable workflow execution across all application domains.

## Overview

Temporal.io is a workflow orchestration platform that enables developers to build fault-tolerant, long-running applications. This integration allows Estuary to leverage Temporal for complex business processes like:

- Payment processing and commission calculations
- Practitioner onboarding and verification
- Booking lifecycle management
- Content moderation workflows
- Reporting and analytics generation
- Integration synchronization with external systems

## Architecture

The integration follows a modular architecture:

```
apps/
  ├── integrations/
  │   └── temporal/
  │       ├── client.py            # Temporal client configuration
  │       ├── base_workflows.py    # Base workflow classes
  │       ├── base_activities.py   # Base activity utilities
  │       ├── worker.py            # Worker implementation
  │       ├── utils.py             # Utility functions
  │       └── management/
  │           └── commands/
  │               ├── start_worker.py       # Start a worker
  │               ├── trigger_workflows.py  # Trigger workflows
  │               └── list_workflows.py     # List available workflows
  └── {domain}/                    # e.g., payments, bookings, etc.
      ├── temporal_workflows.py    # Domain-specific workflows
      └── temporal_activities.py   # Domain-specific activities
```

Each app in the Estuary platform can define its own workflows and activities, which are automatically discovered and registered by the worker.

## Usage

### Starting a Worker

To start a worker that processes workflows from all domains:

```bash
python manage.py start_worker --task-queue=default
```

To start a worker for specific domains:

```bash
python manage.py start_worker --task-queue=payments --domains payments
```

### Triggering Workflows

To trigger a workflow:

```bash
python manage.py trigger_workflows --domain payments --workflow ProgressivePackagePayoutWorkflow --args 123
```

With keyword arguments:

```bash
python manage.py trigger_workflows --domain payments --workflow BatchPractitionerPayoutWorkflow --args 123 --kwargs min_amount=10.0 payment_method=stripe
```

### Listing Available Workflows

To list all available workflows and activities:

```bash
python manage.py list_workflows
```

To filter by domain:

```bash
python manage.py list_workflows --domain payments
```

## Creating Workflows

Each domain can define its own workflows by creating a `temporal_workflows.py` file:

```python
from temporalio import workflow
from apps.integrations.temporal.base_workflows import BaseWorkflow

@workflow.defn
class MyDomainWorkflow(BaseWorkflow):
    @workflow.run
    async def run(self, entity_id: int) -> dict:
        # Workflow implementation
        return {"success": True}
```

## Creating Activities

Each domain can define its own activities by creating a `temporal_activities.py` file:

```python
from temporalio import activity
from apps.integrations.temporal.base_activities import django_activity

@activity.defn
@django_activity
def my_domain_activity(entity_id: int) -> dict:
    # Activity implementation
    return {"success": True}
```

## Programmatic API

You can also trigger workflows programmatically:

```python
import asyncio
from apps.integrations.temporal.utils import start_workflow

async def trigger_my_workflow():
    result = await start_workflow(
        workflow_name="MyDomainWorkflow",
        args=[123],
        domain="my_domain",
        wait_for_result=True
    )
    return result

# In a Django view or command
result = asyncio.run(trigger_my_workflow())
```

## Configuration

Configure Temporal in your Django settings:

```python
# settings.py
TEMPORAL_HOST = "localhost:7233"
TEMPORAL_NAMESPACE = "estuary"
TEMPORAL_DEFAULT_TASK_QUEUE = "default"
TEMPORAL_TLS_ENABLED = False
```

## Benefits

- **Durability**: Workflows continue even if services restart or crash
- **Visibility**: Complete history of workflow execution for debugging
- **Scalability**: Workers can be scaled independently based on load
- **Error Handling**: Built-in retry policies for transient failures
- **Long-Running Processes**: Support for processes that span days or weeks
