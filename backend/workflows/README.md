# Workflows App

Central orchestration app for Temporal workflows in Estuary.

## Architecture

The workflows app provides:
- **Registry**: Central registry for all workflows and activities
- **Worker Management**: Configurable workers for different workloads
- **Domain Organization**: Workflows organized by business domain (booking, payment, stream, room)
- **Shared Activities**: Common activities used across domains

## Management Commands

### Start Workers

Start Temporal workers to process workflows:

```bash
# Start a worker with all workflows
python manage.py start_workflows_worker

# Start a worker with a preset configuration
python manage.py start_workflows_worker --preset critical
python manage.py start_workflows_worker --preset background

# Start a worker for specific domains
python manage.py start_workflows_worker --domain booking
python manage.py start_workflows_worker --domains booking payment

# Start with custom configuration
python manage.py start_workflows_worker \
    --task-queue custom-queue \
    --max-concurrent-activities 50 \
    --max-concurrent-workflows 25
```

Available presets:
- `all`: All workflows and activities
- `critical`: Booking and payment workflows (high priority)
- `background`: Stream and room workflows (lower priority)
- `booking`, `payment`, `stream`, `room`: Domain-specific workers

### List Workflows

List all registered workflows and activities:

```bash
# List all workflows and activities
python manage.py list_workflows

# List for a specific domain
python manage.py list_workflows --domain booking

# List only workflows or activities
python manage.py list_workflows --workflows-only
python manage.py list_workflows --activities-only

# Show detailed information
python manage.py list_workflows --detailed
```

### Trigger Workflows

Manually trigger workflows for testing:

```bash
# Trigger a booking workflow
python manage.py trigger_workflow BookingWorkflow --booking-id 123

# Trigger with custom parameters
python manage.py trigger_workflow PaymentProcessingWorkflow \
    --payment-id 456 \
    --task-queue estuary-payment

# Trigger with JSON input
python manage.py trigger_workflow StreamSetupWorkflow \
    --json-input '{"stream_id": 789, "config": {"quality": "HD"}}'

# Wait for workflow to complete
python manage.py trigger_workflow RoomMaintenanceWorkflow \
    --room-id 101 \
    --wait
```

## Worker Configuration

Workers can be configured with different settings based on workload:

### Task Queues
- `estuary-workflows`: Default queue for all workflows
- `estuary-critical`: High-priority queue for booking/payment
- `estuary-background`: Lower-priority queue for stream/room
- `estuary-{domain}`: Domain-specific queues

### Concurrency Settings
- `max_concurrent_activities`: Number of activities that can run in parallel
- `max_concurrent_workflows`: Number of workflows that can run in parallel
- `max_cached_workflows`: Number of workflows to keep in memory

## Domain Structure

Each domain module contains:
- `workflows.py`: Workflow definitions
- `activities.py`: Activity functions
- `tests.py`: Domain-specific tests
- `__init__.py`: Exports WORKFLOWS and ACTIVITIES lists

### Booking Domain
Handles booking lifecycle:
- `BookingWorkflow`: Main booking orchestration
- `BookingCreatedWorkflow`: Post-creation tasks
- `BookingReminderWorkflow`: Reminder notifications

### Payment Domain
Manages payment processing:
- `PaymentProcessingWorkflow`: Payment capture and processing
- `PayoutWorkflow`: Practitioner payouts
- `RefundWorkflow`: Refund processing

### Stream Domain
Handles video streaming:
- `StreamSetupWorkflow`: Stream room setup
- `StreamRecordingWorkflow`: Recording management
- `StreamCleanupWorkflow`: Post-stream cleanup

### Room Domain
Manages Daily.co rooms:
- `RoomCreationWorkflow`: Room provisioning
- `RoomMaintenanceWorkflow`: Periodic maintenance
- `RoomCleanupWorkflow`: Room cleanup

### Shared Activities
Common activities used across domains:
- `send_email`: Email notifications
- `send_sms`: SMS notifications
- `log_event`: Event logging
- `update_analytics`: Analytics updates

## Development

### Adding New Workflows

1. Create workflow in appropriate domain:
```python
# workflows/{domain}/workflows.py
@workflow.defn
class MyNewWorkflow:
    @workflow.run
    async def run(self, input_data: dict) -> dict:
        # Workflow implementation
        pass

# Add to WORKFLOWS list
WORKFLOWS = [..., MyNewWorkflow]
```

2. Create activities:
```python
# workflows/{domain}/activities.py
@activity.defn
async def my_new_activity(input_data: dict) -> dict:
    # Activity implementation
    pass

# Add to ACTIVITIES list
ACTIVITIES = [..., my_new_activity]
```

3. Test the workflow:
```bash
# Start a worker
python manage.py start_workflows_worker --domain mydomain

# Trigger the workflow
python manage.py trigger_workflow MyNewWorkflow --json-input '{...}'
```

### Testing

Run workflow tests:
```bash
# Run all workflow tests
python manage.py test workflows

# Run domain-specific tests
python manage.py test workflows.booking
python manage.py test workflows.payment
```

## Best Practices

1. **Idempotency**: All activities should be idempotent
2. **Error Handling**: Use Temporal's retry policies for transient errors
3. **Timeouts**: Set appropriate timeouts for activities
4. **Logging**: Use structured logging for debugging
5. **Testing**: Write comprehensive tests for workflows and activities