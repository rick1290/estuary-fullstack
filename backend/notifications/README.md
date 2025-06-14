# Notifications API

The Notifications API provides comprehensive notification management for the Estuary marketplace, including in-app notifications, user preferences, and real-time WebSocket support.

## Features

### Core Features
- **In-app notifications** with read/unread status
- **User preference management** per notification type
- **Batch operations** (mark multiple as read)
- **Advanced filtering** (by type, status, date range)
- **Real-time updates** via WebSocket
- **Notification templates** for consistent messaging
- **Notification grouping** for better UX

### Notification Types
- `booking` - Booking confirmations, cancellations, reminders
- `payment` - Payment confirmations, refunds, failures
- `session` - Session starts, ends, recordings available
- `review` - New reviews received
- `system` - System announcements, maintenance notices
- `message` - New messages received
- `reminder` - Upcoming session reminders

### Delivery Channels
- `in_app` - In-application notifications
- `email` - Email notifications
- `sms` - SMS notifications
- `push` - Push notifications (mobile)

## API Endpoints

### DRF Endpoints (REST)

Base URL: `/api/v1/drf/notifications/`

#### Notifications
- `GET /notifications/` - List user's notifications
- `POST /notifications/` - Create notification (admin)
- `GET /notifications/{id}/` - Get notification details
- `PUT /notifications/{id}/` - Update notification
- `DELETE /notifications/{id}/` - Delete notification
- `POST /notifications/mark_read/` - Mark multiple as read
- `POST /notifications/{id}/mark_as_read/` - Mark single as read
- `POST /notifications/{id}/mark_as_unread/` - Mark as unread
- `GET /notifications/unread_count/` - Get unread count
- `GET /notifications/stats/` - Get notification statistics
- `GET /notifications/grouped/` - Get grouped notifications
- `POST /notifications/bulk_delete/` - Delete multiple notifications

#### Notification Settings
- `GET /notification-settings/` - List user's preferences
- `POST /notification-settings/` - Create/update preference
- `PUT /notification-settings/{id}/` - Update preference
- `POST /notification-settings/bulk_update/` - Bulk update preferences
- `POST /notification-settings/reset_to_defaults/` - Reset all to defaults

#### Notification Templates (Admin)
- `GET /notification-templates/` - List templates
- `GET /notification-templates/{id}/` - Get template details

### Filtering & Sorting

#### Query Parameters
- `notification_type` - Filter by type (booking, payment, etc.)
- `is_read` - Filter by read status (true/false)
- `delivery_channel` - Filter by channel
- `status` - Filter by status (pending, sent, failed)
- `created_after` - Filter by date (ISO format)
- `created_before` - Filter by date (ISO format)
- `period` - Filter by period (today, yesterday, week, month)
- `search` - Search in title and message
- `ordering` - Sort by field (-created_at, is_read, etc.)

#### Example Queries
```
# Get unread booking notifications
GET /api/v1/drf/notifications/notifications/?notification_type=booking&is_read=false

# Get notifications from today
GET /api/v1/drf/notifications/notifications/?period=today

# Search notifications
GET /api/v1/drf/notifications/notifications/?search=payment

# Get notifications with multiple types
GET /api/v1/drf/notifications/notifications/?notification_types=booking,payment
```

## WebSocket Support

### Connection
Connect to: `ws://localhost:8000/ws/notifications/`

### Authentication
Include JWT token in connection headers or query params.

### Message Types

#### Incoming (Client → Server)
```json
{
  "type": "mark_read",
  "notification_id": "123e4567-e89b-12d3-a456-426614174000"
}

{
  "type": "mark_all_read"
}

{
  "type": "get_unread_count"
}
```

#### Outgoing (Server → Client)
```json
{
  "type": "new_notification",
  "notification": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Booking Confirmed",
    "message": "Your yoga session is confirmed",
    "notification_type": "booking",
    "is_read": false,
    "created_at": "2024-01-15T10:00:00Z"
  }
}

{
  "type": "notification_update",
  "update_type": "read",
  "data": {
    "notification_id": "123e4567-e89b-12d3-a456-426614174000",
    "is_read": true
  }
}

{
  "type": "unread_count",
  "count": 5
}
```

## Usage Examples

### Python (Django)
```python
from notifications.api.v1.utils import create_in_app_notification

# Create a notification
notification = create_in_app_notification(
    user=user,
    title="Booking Confirmed",
    message="Your yoga session with Jane Doe is confirmed",
    notification_type="booking",
    related_object_type="booking",
    related_object_id="123",
    metadata={
        'practitioner_name': 'Jane Doe',
        'service_name': 'Yoga Session',
        'booking_time': '2024-01-15T10:00:00Z'
    }
)
```

### JavaScript (Frontend)
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/notifications/');

// Listen for new notifications
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'new_notification') {
    // Show notification to user
    showNotification(data.notification);
  } else if (data.type === 'unread_count') {
    // Update badge count
    updateBadge(data.count);
  }
};

// Mark notification as read
ws.send(JSON.stringify({
  type: 'mark_read',
  notification_id: notificationId
}));
```

## Testing

Run the test suite:
```bash
python manage.py test notifications
```

Create test data:
```bash
python manage.py test_notifications
```

## Permissions

- **Users** can only view/manage their own notifications
- **Staff** can create notifications for any user
- **Staff** can manage notification templates
- All endpoints require authentication

## Best Practices

1. **Use appropriate notification types** for better filtering and analytics
2. **Include relevant metadata** for rich notification content
3. **Set up user preferences** to respect user choices
4. **Use templates** for consistent messaging
5. **Implement real-time updates** for better UX
6. **Batch operations** when marking multiple notifications
7. **Clean up old notifications** periodically

## Integration Points

- **Bookings**: Send notifications on booking events
- **Payments**: Send notifications on payment events
- **Messaging**: Notify on new messages
- **Reviews**: Notify practitioners of new reviews
- **Temporal Workflows**: Schedule notifications
- **Courier**: Send email/SMS notifications