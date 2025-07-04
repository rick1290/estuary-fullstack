# Notification Architecture

## Overview
This document describes the best-in-class notification architecture for Estuary, integrating with Courier for email delivery and supporting multiple notification channels.

## Architecture Components

### 1. **Service Layer** (`/notifications/services/`)
- **BaseNotificationService**: Common functionality for all notifications
- **ClientNotificationService**: Client-specific notifications
- **PractitionerNotificationService**: Practitioner-specific notifications
- **Registry**: Service lookup and management

### 2. **Courier Integration** (`/integrations/courier/`)
- **CourierClient**: Low-level API wrapper
- **Utils**: Legacy notification functions (being migrated)

### 3. **Models** (`/notifications/models.py`)
- **Notification**: Tracks all notifications sent
- **NotificationTemplate**: Database templates (optional)
- **NotificationSetting**: User preferences per notification type

### 4. **Celery Tasks** (`/notifications/tasks.py`)
- Scheduled notification processing
- Reminder scheduling
- Cleanup tasks
- Weekly summaries

### 5. **Signal Handlers** (`/notifications/signals.py`)
- Automatic triggers for various events
- Booking confirmations
- Payment notifications
- Review notifications

## Notification Types

### Client Notifications
1. **Welcome & Account Confirmation** - On registration
2. **Email Verification** - Verify email address
3. **Booking Confirmation** - When booking is confirmed
4. **Payment Successfully Processed** - Payment receipt
5. **Session Confirmation** - Session details
6. **Booking Reminder (24 Hours)** - Day before
7. **Booking Reminder (30 Minutes)** - Just before
8. **Booking Cancelled** - Cancellation notice
9. **Booking Rescheduled** - New time confirmation
10. **Credit Purchase** - Credit added to account
11. **Review Request** - After session completion
12. **New Message** - From practitioner

### Practitioner Notifications
1. **Welcome & Profile Setup** - On registration
2. **Profile Completion Reminder** - If incomplete
3. **Nudge: No Session Created Yet** - After 7 days
4. **Adding Services Confirmation** - Service created
5. **Adding Bundles & Packages** - Bundle created
6. **Booking Notification** - New booking received
7. **Client Reschedules** - Booking changed
8. **Payout Confirmation** - Money transferred
9. **Session Reminder (24 Hours)** - Day before
10. **Session Reminder (30 Minutes)** - Just before
11. **New Review** - Client left review
12. **Weekly Earnings Summary** - Monday mornings
13. **New Message** - From client
14. **Verification Status** - Approved/Rejected

## Implementation Guide

### 1. **Environment Setup**
```bash
# Add to .env
COURIER_AUTH_TOKEN=your_courier_auth_token

# Template IDs (map to your Courier templates)
COURIER_CLIENT_WELCOME_TEMPLATE=CLIENT_WELCOME_V1
COURIER_CLIENT_BOOKING_CONFIRMATION_TEMPLATE=CLIENT_BOOKING_CONFIRMATION_V1
# ... add all template IDs
```

### 2. **Celery Configuration**
```python
# config/celery.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'process-scheduled-notifications': {
        'task': 'notifications.tasks.process_scheduled_notifications',
        'schedule': 60.0,  # Every minute
    },
    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_old_notifications',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    'send-practitioner-earnings-summaries': {
        'task': 'notifications.tasks.send_practitioner_earnings_summaries',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),  # Monday 9 AM
    },
}
```

### 3. **Usage Examples**

#### Sending a Notification Programmatically
```python
from notifications.services.registry import get_client_notification_service

# Send booking confirmation
service = get_client_notification_service()
service.send_booking_confirmation(booking)
```

#### Scheduling a Future Notification
```python
from datetime import timedelta
from django.utils import timezone
from notifications.services.base import BaseNotificationService

service = BaseNotificationService()
service.schedule_notification(
    user=user,
    notification_type='reminder',
    delivery_channel='email',
    scheduled_for=timezone.now() + timedelta(hours=24),
    template_id='REMINDER_TEMPLATE',
    data={'booking_id': booking.id},
    title='Reminder: Upcoming session',
    message='Your session is tomorrow'
)
```

### 4. **Template Data Structure**

Each Courier template should expect these common variables:
```javascript
{
  // Common to all templates
  user_name: "John Doe",
  user_email: "john@example.com",
  app_name: "Estuary",
  frontend_url: "https://estuary.app",
  support_email: "support@estuary.app",
  
  // Template-specific data
  // ... varies by template
}
```

### 5. **Adding New Notification Types**

1. **Update Template Mapping**:
```python
# notifications/services/client_notifications.py
TEMPLATES = {
    'new_notification': 'CLIENT_NEW_NOTIFICATION_TEMPLATE',
    # ...
}
```

2. **Create Service Method**:
```python
def send_new_notification(self, user, data):
    template_id = self.get_template_id('new_notification')
    # ... implementation
```

3. **Add Signal Handler** (if automatic):
```python
# notifications/signals.py
@receiver(post_save, sender=YourModel)
def handle_new_notification(sender, instance, created, **kwargs):
    if created:
        service.send_new_notification(instance)
```

## Best Practices

1. **Always Check User Preferences**
   - Use `should_send_notification()` before sending
   - Respect user's channel preferences

2. **Use Idempotency Keys**
   - Prevent duplicate sends
   - Format: `{type}-{id}-{timestamp}`

3. **Schedule Smartly**
   - Use Celery's `eta` parameter for future sends
   - Consider user's timezone for reminders

4. **Handle Failures Gracefully**
   - Update notification status on failure
   - Log errors for debugging
   - Consider retry logic

5. **Template Versioning**
   - Use versioned template IDs (e.g., `CLIENT_WELCOME_V1`)
   - Makes updates easier without breaking existing sends

6. **Data Validation**
   - Validate template data before sending
   - Provide defaults for optional fields

## Monitoring

1. **Track Delivery Rates**
```python
# Check notification statuses
sent_count = Notification.objects.filter(status='sent').count()
failed_count = Notification.objects.filter(status='failed').count()
```

2. **Monitor Courier Dashboard**
   - Check template performance
   - Review delivery rates
   - Debug failed sends

3. **User Engagement**
   - Track read rates for in-app notifications
   - Monitor unsubscribe rates
   - A/B test template content

## Migration from Legacy System

The existing functions in `/integrations/courier/utils.py` are being migrated to the new service-based architecture. During transition:

1. Legacy functions still work
2. New code should use service classes
3. Gradually migrate existing calls

## Testing

```python
# Test notification sending
python manage.py test notifications.tests

# Set up preferences for existing users
python manage.py setup_notification_preferences

# Send test notification
python manage.py send_test_notification --user-id=1 --type=welcome
```

## Security Considerations

1. **PII Protection**
   - Don't log sensitive data
   - Use encryption for stored email content
   - Implement data retention policies

2. **Rate Limiting**
   - Prevent notification spam
   - Implement per-user limits
   - Monitor for abuse

3. **Authentication**
   - Verify user identity for preference changes
   - Secure unsubscribe links
   - Validate webhook signatures from Courier