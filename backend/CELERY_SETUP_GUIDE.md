# Celery Setup Guide

## Installation

1. **Install Celery dependencies:**
```bash
pip install -r requirements_celery.txt
```

Or install individually:
```bash
pip install celery[redis]==5.3.4
pip install django-celery-beat==2.5.0
pip install django-celery-results==2.5.1
pip install flower==2.0.1
```

2. **Install Courier SDK (if not already installed):**
```bash
pip install courier-python
```

## Configuration

### 1. Environment Variables

Add to your `.env` file:
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Courier Configuration
COURIER_AUTH_TOKEN=your_courier_auth_token_here

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3001
SUPPORT_EMAIL=support@estuary.app

# Flower Authentication (optional)
FLOWER_BASIC_AUTH=admin:securepassword
FLOWER_PORT=5555

# Courier Template IDs (optional - defaults provided)
COURIER_CLIENT_WELCOME_TEMPLATE=CLIENT_WELCOME_V1
COURIER_CLIENT_BOOKING_CONFIRMATION_TEMPLATE=CLIENT_BOOKING_CONFIRMATION_V1
# ... add other template IDs as needed
```

### 2. Database Migrations

Run migrations for Celery Beat scheduler:
```bash
python manage.py migrate django_celery_beat
python manage.py migrate django_celery_results
```

### 3. Set Up Notification Preferences

Create default notification preferences for existing users:
```bash
python manage.py setup_notification_preferences
```

To check what will be created without making changes:
```bash
python manage.py setup_notification_preferences --dry-run
```

For a specific user:
```bash
python manage.py setup_notification_preferences --user-id=1
```

## Running Celery

### Development Setup

You need to run these in separate terminal windows:

1. **Start Redis** (if not already running):
```bash
redis-server
```

2. **Start Celery Worker**:
```bash
cd /Users/ricknielsen/Documents/GitHub/estuary-fullstack/backend
./scripts/run_celery_worker.sh
```

Or manually:
```bash
celery -A estuary worker --loglevel=info
```

3. **Start Celery Beat** (for scheduled tasks):
```bash
cd /Users/ricknielsen/Documents/GitHub/estuary-fullstack/backend
./scripts/run_celery_beat.sh
```

Or manually:
```bash
celery -A estuary beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

4. **Start Flower** (optional - for monitoring):
```bash
cd /Users/ricknielsen/Documents/GitHub/estuary-fullstack/backend
./scripts/run_flower.sh
```

Then visit: http://localhost:5555

### Production Setup

For production, use a process manager like Supervisor or systemd:

**Example Supervisor Configuration** (`/etc/supervisor/conf.d/estuary_celery.conf`):
```ini
[program:estuary-celery-worker]
command=/path/to/venv/bin/celery -A estuary worker --loglevel=info
directory=/path/to/estuary/backend
user=www-data
numprocs=1
stdout_logfile=/var/log/celery/estuary-worker.log
stderr_logfile=/var/log/celery/estuary-worker.log
autostart=true
autorestart=true
startsecs=10

[program:estuary-celery-beat]
command=/path/to/venv/bin/celery -A estuary beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
directory=/path/to/estuary/backend
user=www-data
numprocs=1
stdout_logfile=/var/log/celery/estuary-beat.log
stderr_logfile=/var/log/celery/estuary-beat.log
autostart=true
autorestart=true
startsecs=10
```

## Testing the Setup

### 1. Test Basic Celery Functionality

```python
# In Django shell
python manage.py shell

from notifications.tasks import test_celery
result = test_celery.delay()
print(result.get(timeout=5))  # Should print: "Celery is working!"
```

### 2. Test Notification Sending

Send a test notification to a user:
```bash
# Test in-app notification
python manage.py send_test_notification 1 --type=in_app

# Test Celery task execution
python manage.py send_test_notification 1 --type=test_celery

# Test welcome email (client)
python manage.py send_test_notification 1 --type=welcome

# Test welcome email (practitioner)
python manage.py send_test_notification 1 --type=welcome --practitioner
```

### 3. Check Scheduled Tasks

View scheduled tasks in Django admin:
1. Go to http://localhost:8000/admin/
2. Navigate to "Periodic tasks" under "Django Celery Beat"
3. You should see the configured tasks

Or check via Django shell:
```python
from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule

# List all periodic tasks
for task in PeriodicTask.objects.all():
    print(f"{task.name}: {task.task} - Enabled: {task.enabled}")
```

### 4. Monitor Task Execution

**Using Flower:**
- Visit http://localhost:5555
- Login with your configured credentials
- View active tasks, task history, and worker status

**Using Django Admin:**
- Go to "Task results" under "Django Celery Results"
- View completed task history

**Using Logs:**
Check Celery worker output for task execution logs.

## Troubleshooting

### Common Issues

1. **"No module named 'celery'"**
   - Install Celery: `pip install celery[redis]`

2. **"Cannot connect to redis://localhost:6379"**
   - Ensure Redis is running: `redis-cli ping`
   - Check REDIS_URL in .env

3. **Tasks not executing**
   - Ensure Celery worker is running
   - Check for import errors in tasks
   - Verify task is properly registered

4. **Scheduled tasks not running**
   - Ensure Celery Beat is running
   - Check periodic task is enabled in admin
   - Verify timezone settings match

5. **Notification not sending**
   - Check COURIER_AUTH_TOKEN is set
   - Verify user has email address
   - Check notification preferences
   - Look for errors in Celery worker logs

### Debug Commands

```bash
# Check Celery status
celery -A estuary status

# List registered tasks
celery -A estuary list

# Inspect active tasks
celery -A estuary inspect active

# Inspect scheduled tasks
celery -A estuary inspect scheduled

# Purge all tasks (careful!)
celery -A estuary purge
```

## Development Tips

1. **Use Celery Eager for Testing**:
   Add to settings for synchronous execution in tests:
   ```python
   CELERY_TASK_ALWAYS_EAGER = True
   CELERY_TASK_EAGER_PROPAGATES = True
   ```

2. **Task Debugging**:
   ```python
   @shared_task(bind=True)
   def debug_task(self):
       print(f'Request: {self.request!r}')
   ```

3. **Monitor Memory Usage**:
   Set worker concurrency based on available RAM:
   ```bash
   celery -A estuary worker --concurrency=2
   ```

4. **Use Time Limits**:
   Tasks have 5-minute soft limit and 10-minute hard limit by default.

## Next Steps

1. **Configure Courier Templates**:
   - Create templates in Courier dashboard
   - Update template IDs in .env

2. **Test Real Notifications**:
   - Create a test booking
   - Verify confirmation emails are sent
   - Check reminders are scheduled

3. **Monitor Performance**:
   - Set up Flower in production
   - Configure alerting for failed tasks
   - Monitor queue lengths

4. **Scale as Needed**:
   - Add more workers for high volume
   - Use separate queues for different task types
   - Consider using Celery routing for priority tasks