# Workflows App - Temporal Orchestration

## Overview
The workflows app centralizes all Temporal workflow orchestration for the Estuary platform. It provides a structured way to manage long-running business processes with reliability and observability.

## Architecture

### Domain-Based Organization
Workflows are organized by business domain:
- **booking/**: Booking lifecycle, reminders, no-shows
- **payment/**: Payment processing, refunds, payouts  
- **room/**: LiveKit room management, recordings
- **stream/**: Content moderation, subscription management
- **shared/**: Common activities (email, SMS, logging)

### Key Components

1. **Registry System** (`registry.py`)
   - Central discovery of all workflows and activities
   - Dynamic loading from domain modules
   - Worker configuration helpers

2. **Worker Management** (`worker.py`)
   - Configurable workers with presets
   - Domain-specific or combined workers
   - Graceful shutdown handling

3. **Management Commands**
   - `start_workflows_worker`: Run Temporal workers
   - `list_workflows`: Discover available workflows
   - `trigger_workflow`: Test workflows manually

## Usage

### Starting Workers

```bash
# Start all workflows worker
python manage.py start_workflows_worker

# Start critical workflows only (booking, payment)
python manage.py start_workflows_worker --preset critical

# Start domain-specific worker
python manage.py start_workflows_worker --domain booking

# Custom configuration
python manage.py start_workflows_worker --max-concurrent 20 --max-cached 100
```

### Listing Workflows

```bash
# Show all workflows
python manage.py list_workflows

# Show booking workflows with details
python manage.py list_workflows --domain booking --detailed
```

### Triggering Workflows

```bash
# Trigger booking workflow
python manage.py trigger_workflow BookingLifecycleWorkflow --booking-id 123

# Trigger with custom parameters
python manage.py trigger_workflow PaymentWorkflow --json '{"payment_id": "456", "amount": 1000}'

# Wait for completion
python manage.py trigger_workflow BookingWorkflow --booking-id 789 --wait
```

## Key Workflows

### BookingLifecycleWorkflow
Manages complete booking lifecycle:
1. Send confirmation emails
2. Send 48-hour reminder
3. Create LiveKit room 15 minutes before
4. Monitor attendance
5. Handle no-shows
6. Process completion and earnings
7. Send post-session survey

### PaymentProcessingWorkflow
(To be implemented)
- Process payments
- Handle failures and retries
- Update balances
- Send receipts

### StreamModerationWorkflow  
(To be implemented)
- Content moderation
- Automatic flagging
- Human review queues

## Best Practices

1. **Idempotency**: All activities should be idempotent
2. **Timeouts**: Set appropriate timeouts for activities
3. **Retry Policies**: Configure retries based on activity type
4. **Logging**: Use workflow.logger for visibility
5. **Error Handling**: Let Temporal handle retries, don't catch all exceptions

## Adding New Workflows

1. Create domain folder if needed: `workflows/your_domain/`
2. Add `workflows.py` with workflow classes
3. Add `activities.py` with activity functions
4. Export WORKFLOWS and ACTIVITIES lists
5. Registry will auto-discover on startup

Example:
```python
# workflows/your_domain/workflows.py
@workflow.defn
class YourWorkflow:
    @workflow.run
    async def run(self, input_data):
        # Workflow logic
        pass

WORKFLOWS = [YourWorkflow]
```

## Production Deployment

1. Run multiple workers for high availability
2. Use presets to separate critical vs background work
3. Monitor worker health and queue sizes
4. Scale workers based on load
5. Use Temporal UI for debugging

## Integration Points

- **Bookings**: Automatically triggered on booking confirmation
- **Payments**: Triggered on payment events
- **Streams**: Content upload triggers moderation
- **LiveKit**: Room lifecycle management

## Environment Variables

```bash
# Temporal connection
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default

# Worker configuration  
TEMPORAL_MAX_CONCURRENT_ACTIVITIES=100
TEMPORAL_MAX_CACHED_WORKFLOWS=500
```

## Monitoring

- Use Temporal Web UI at http://localhost:8080
- Check worker logs for activity execution
- Monitor queue depths and latencies
- Set up alerts for failed workflows

## Testing

```python
# Unit test workflows
from temporalio.testing import WorkflowEnvironment
from workflows.booking.workflows import BookingLifecycleWorkflow

async def test_booking_workflow():
    async with WorkflowEnvironment() as env:
        result = await env.client.execute_workflow(
            BookingLifecycleWorkflow.run,
            "booking-123",
            id="test-workflow-1",
            task_queue="test-queue"
        )
        assert result["status"] == "completed"
```