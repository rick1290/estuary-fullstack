# Temporal Integration Across Estuary Apps

This document provides a comprehensive guide on how to use Temporal workflows and activities across different domains in the Estuary platform.

## Overview

Temporal.io is now integrated across multiple domains in the Estuary platform, providing a robust framework for managing complex, long-running processes. This integration enables:

- **Reliability**: Workflows continue even if services restart or crash
- **Visibility**: Complete history of workflow execution for debugging
- **Scalability**: Workers can be scaled independently based on load
- **Error Handling**: Built-in retry policies for transient failures
- **Long-Running Processes**: Support for processes that span days or weeks

## Supported Domains

The Temporal integration currently supports the following domains:

1. **Payments**
   - Progressive package payouts
   - Batch practitioner payouts
   - Subscription renewals
   - Commission calculations

2. **Bookings**
   - Booking lifecycle management
   - Session reminders and follow-ups
   - Rescheduling workflows
   - Batch reminder processing

3. **Practitioners**
   - Onboarding workflows
   - Verification processes
   - Subscription management
   - Training and certification

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
  │               ├── start_all_workers.py  # Start workers for all domains
  │               ├── trigger_workflows.py  # Trigger workflows
  │               └── list_workflows.py     # List available workflows
  └── {domain}/                    # e.g., payments, bookings, practitioners
      ├── temporal_workflows.py    # Domain-specific workflows
      └── temporal_activities.py   # Domain-specific activities
```

Each app in the Estuary platform can define its own workflows and activities, which are automatically discovered and registered by the worker.

## Getting Started

### 1. Starting Workers

You can start a worker for a specific domain:

```bash
python manage.py start_worker --task-queue=payments --domains payments
```

Or start workers for all domains:

```bash
python manage.py start_all_workers
```

### 2. Listing Available Workflows

To see all available workflows and activities:

```bash
python manage.py list_workflows
```

To filter by domain:

```bash
python manage.py list_workflows --domain bookings
```

### 3. Triggering Workflows

You can trigger workflows using the generic command:

```bash
python manage.py trigger_workflows --domain payments --workflow ProgressivePackagePayoutWorkflow --args 123
```

Or use domain-specific commands:

```bash
# For bookings
python manage.py trigger_booking_workflows lifecycle 123

# For payments
python manage.py trigger_payment_workflows batch_payout --min-amount 10.0
```

## Creating New Workflows

### 1. Define Workflow Class

Create a file `temporal_workflows.py` in your domain app:

```python
from temporalio import workflow
from apps.integrations.temporal.base_workflows import BaseWorkflow
from apps.integrations.temporal.decorators import monitored_workflow

@workflow.defn
@monitored_workflow(name="MyDomainWorkflow")
class MyDomainWorkflow(BaseWorkflow):
    @workflow.run
    async def run(self, entity_id: int) -> dict:
        # Step 1: Get entity details
        entity = await self.execute_activity(
            "get_entity_details",
            entity_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Step 2: Process entity
        result = await self.execute_activity(
            "process_entity",
            entity_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        return {"entity_id": entity_id, "status": "completed", "result": result}
```

### 2. Define Activities

Create a file `temporal_activities.py` in your domain app:

```python
from temporalio import activity
from apps.integrations.temporal.base_activities import django_activity
from apps.integrations.temporal.decorators import monitored_activity

@activity.defn
@monitored_activity(name="get_entity_details")
@django_activity
def get_entity_details(entity_id: int) -> dict:
    from apps.mydomain.models import Entity
    
    entity = Entity.objects.get(id=entity_id)
    return {
        "id": entity.id,
        "name": entity.name,
        "status": entity.status,
    }

@activity.defn
@monitored_activity(name="process_entity")
@django_activity
def process_entity(entity_id: int) -> dict:
    from apps.mydomain.models import Entity
    from apps.mydomain.services import EntityService
    
    entity = Entity.objects.get(id=entity_id)
    service = EntityService()
    result = service.process(entity)
    
    return {"success": True, "result": result}
```

## Best Practices

### 1. Workflow Design

- **Idempotency**: Design workflows and activities to be idempotent
- **Determinism**: Ensure workflow code is deterministic (same inputs → same outputs)
- **Timeouts**: Set appropriate timeouts for activities
- **Retry Policies**: Configure retry policies for transient failures

### 2. Activity Design

- **Transactional**: Use the `@transactional_activity` decorator for database operations
- **Monitoring**: Use the `@monitored_activity` decorator for logging and monitoring
- **Django Integration**: Use the `@django_activity` decorator for Django ORM access

### 3. Error Handling

- **Activity Failures**: Handle activity failures gracefully in workflows
- **Workflow Failures**: Set up monitoring for workflow failures
- **Retry Strategies**: Configure appropriate retry strategies for different types of failures

## Integration with Existing Systems

### Commission System

The Temporal integration works seamlessly with the existing commission system:

- **Package Completion**: Temporal workflows manage the progressive release of credits as package sessions are completed
- **Practitioner Payouts**: Batch payout workflows ensure practitioners are paid correctly and on time
- **Subscription Renewals**: Workflows handle the renewal of practitioner subscriptions, including payment processing

### Booking System

Temporal workflows enhance the booking system with:

- **Lifecycle Management**: Automated handling of the complete booking lifecycle
- **Reminders**: Timely reminders for upcoming sessions
- **Follow-ups**: Post-session follow-ups and feedback collection
- **No-show Handling**: Automated handling of no-show situations

## Monitoring and Debugging

### Temporal Web UI

You can access the Temporal Web UI to monitor and debug workflows:

```bash
# Start the Temporal server locally (if not already running)
docker-compose up -d

# Access the Web UI at http://localhost:8088
```

### Logging

All workflows and activities are automatically logged:

- **Workflow Logs**: Available in the Temporal Web UI and in the Django logs
- **Activity Logs**: Detailed logs for each activity execution

## Deployment Considerations

When deploying to production:

1. **Temporal Server**: Ensure a production-grade Temporal server is available
2. **Workers**: Deploy workers for each domain on separate instances for isolation
3. **Monitoring**: Set up alerts for workflow and activity failures
4. **Scaling**: Scale workers based on load patterns

## Example Use Cases

### 1. Practitioner Onboarding

The practitioner onboarding workflow manages the complete onboarding process:

```bash
python manage.py trigger_workflows --domain practitioners --workflow PractitionerOnboardingWorkflow --args 123
```

This workflow handles:
- Profile completion
- Document verification
- Background check
- Training completion
- Subscription setup
- Service configuration

### 2. Booking Lifecycle

The booking lifecycle workflow manages the complete booking process:

```bash
python manage.py trigger_booking_workflows lifecycle 456
```

This workflow handles:
- Initial confirmation
- Pre-session reminders
- Post-session follow-ups
- Feedback collection
- No-show handling

### 3. Subscription Renewal

The subscription renewal workflow manages the renewal process:

```bash
python manage.py trigger_workflows --domain practitioners --workflow SubscriptionRenewalWorkflow --args 789
```

This workflow handles:
- Pre-renewal notifications
- Payment processing
- Renewal confirmation
- Failed renewal handling

## Conclusion

The Temporal integration provides a powerful framework for managing complex, long-running processes across the Estuary platform. By leveraging Temporal's reliability, visibility, and scalability, we can build robust workflows that enhance the user experience and operational efficiency.

For more information, refer to the [Temporal documentation](https://docs.temporal.io/) or contact the Estuary engineering team.
