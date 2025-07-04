# Notification System Setup

## Quick Start

### 1. Install Dependencies
```bash
# Install Celery and related packages
pip install celery[redis]==5.3.4 django-celery-beat==2.5.0 django-celery-results==2.5.1 flower==2.0.1

# Install Courier SDK
pip install courier-python
```

### 2. Configure Environment
Add to `.env`:
```bash
# Redis
REDIS_URL=redis://localhost:6379/0

# Courier
COURIER_AUTH_TOKEN=your_courier_auth_token

# Frontend URL
FRONTEND_URL=http://localhost:3001
```

### 3. Run Migrations
```bash
python manage.py migrate django_celery_beat
python manage.py migrate django_celery_results
```

### 4. Start Services
In separate terminals:
```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Celery Worker
./scripts/run_celery_worker.sh

# Terminal 3: Celery Beat
./scripts/run_celery_beat.sh

# Terminal 4: Django Server
python manage.py runserver
```

### 5. Set Up User Preferences
```bash
python manage.py setup_notification_preferences
```

### 6. Test the Setup
```bash
# Run comprehensive test
python test_celery_setup.py

# Send test notification
python manage.py send_test_notification 1 --type=test_celery
```

## Notification Types

### Client Notifications
- Welcome & Account Confirmation
- Email Verification
- Booking Confirmation
- Payment Success
- Session Confirmation
- Booking Reminders (24h, 30min)
- Booking Cancelled/Rescheduled
- Credit Purchase
- Review Request
- New Message

### Practitioner Notifications
- Welcome & Profile Setup
- Profile Completion Reminder
- No Services Nudge
- Service/Bundle Created
- New Booking Received
- Client Reschedules
- Payout Confirmation
- Session Reminders
- New Review
- Weekly Earnings Summary
- New Message
- Verification Status

## Usage Examples

### Send Notification Programmatically
```python
from notifications.services.registry import get_client_notification_service

# Send booking confirmation
service = get_client_notification_service()
service.send_booking_confirmation(booking)
```

### Create In-App Notification
```python
from notifications.utils import create_in_app_notification

notification = create_in_app_notification(
    user=user,
    title="New Message",
    message="You have a new message from Jane Doe",
    notification_type='message',
    related_object_type='conversation',
    related_object_id=str(conversation.id)
)
```

### Check User Preferences
```python
from notifications.utils import get_user_preferences

preferences = get_user_preferences(user)
# Returns: {'booking': {'email': True, 'sms': False, ...}, ...}
```

## Monitoring

### Flower Dashboard
```bash
# Start Flower
./scripts/run_flower.sh

# Access at http://localhost:5555
# Default login: admin:admin
```

### Django Admin
- Periodic Tasks: `/admin/django_celery_beat/periodictask/`
- Task Results: `/admin/django_celery_results/taskresult/`
- Notifications: `/admin/notifications/notification/`

### Logs
- Worker logs: Check terminal running Celery worker
- Beat logs: Check terminal running Celery beat
- Django logs: Check Django server output

## Troubleshooting

### Tasks Not Running
1. Check Redis is running: `redis-cli ping`
2. Verify Celery worker is running
3. Check for import errors in worker logs
4. Ensure task is registered: `celery -A estuary list`

### Notifications Not Sending
1. Verify COURIER_AUTH_TOKEN is set
2. Check user has email address
3. Verify user preferences allow the notification type
4. Check Courier dashboard for API errors

### Scheduled Tasks Not Running
1. Ensure Celery Beat is running
2. Check tasks are enabled in Django admin
3. Verify timezone settings
4. Check beat logs for errors

## Next Steps

1. **Configure Courier Templates**
   - Log into Courier dashboard
   - Create templates for each notification type
   - Update template IDs in `.env`

2. **Customize Notifications**
   - Modify service classes for your needs
   - Add new notification types
   - Implement SMS/Push channels

3. **Production Setup**
   - Use Supervisor/systemd for process management
   - Configure Redis persistence
   - Set up monitoring alerts
   - Scale workers as needed