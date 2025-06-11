from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from notifications.models import Notification
from .serializers import NotificationSerializer

User = get_user_model()


def send_realtime_notification(user_id: int, notification: Notification):
    """
    Send a real-time notification to a user via WebSocket.
    
    Args:
        user_id: ID of the user to send notification to
        notification: Notification instance to send
    """
    channel_layer = get_channel_layer()
    
    # Serialize the notification
    serialized_notification = NotificationSerializer(notification).data
    
    # Send to user's notification channel
    async_to_sync(channel_layer.group_send)(
        f"notifications_{user_id}",
        {
            "type": "notification.message",
            "notification": serialized_notification
        }
    )


def send_notification_update(user_id: int, update_type: str, data: dict):
    """
    Send a notification update to a user via WebSocket.
    
    Args:
        user_id: ID of the user to send update to
        update_type: Type of update (e.g., 'read', 'deleted', 'count')
        data: Update data
    """
    channel_layer = get_channel_layer()
    
    async_to_sync(channel_layer.group_send)(
        f"notifications_{user_id}",
        {
            "type": "notification.update",
            "update_type": update_type,
            "data": data
        }
    )


def create_in_app_notification(
    user: User,
    title: str,
    message: str,
    notification_type: str,
    related_object_type: str = None,
    related_object_id: str = None,
    metadata: dict = None
) -> Notification:
    """
    Create an in-app notification and send it in real-time.
    
    Args:
        user: User to create notification for
        title: Notification title
        message: Notification message
        notification_type: Type of notification
        related_object_type: Type of related object (optional)
        related_object_id: ID of related object (optional)
        metadata: Additional metadata (optional)
    
    Returns:
        Created Notification instance
    """
    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        delivery_channel='in_app',
        related_object_type=related_object_type or '',
        related_object_id=related_object_id or '',
        metadata=metadata or {},
        status='sent'
    )
    
    # Send real-time notification
    send_realtime_notification(user.id, notification)
    
    return notification


def bulk_create_notifications(
    users: list,
    title: str,
    message: str,
    notification_type: str,
    **kwargs
) -> list:
    """
    Create notifications for multiple users.
    
    Args:
        users: List of User instances
        title: Notification title
        message: Notification message
        notification_type: Type of notification
        **kwargs: Additional fields for Notification model
    
    Returns:
        List of created Notification instances
    """
    notifications = []
    
    for user in users:
        notification = create_in_app_notification(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            **kwargs
        )
        notifications.append(notification)
    
    return notifications


def get_notification_context(notification: Notification) -> dict:
    """
    Get additional context for a notification based on its type and related objects.
    
    Args:
        notification: Notification instance
    
    Returns:
        Dictionary with additional context
    """
    context = {
        'notification_id': notification.id,
        'type': notification.notification_type,
        'created_at': notification.created_at.isoformat(),
    }
    
    # Add context based on notification type
    if notification.notification_type == 'booking':
        # Add booking-specific context
        if notification.related_object_type == 'booking' and notification.related_object_id:
            context['booking_id'] = notification.related_object_id
            context['action_url'] = f'/bookings/{notification.related_object_id}/'
    
    elif notification.notification_type == 'payment':
        # Add payment-specific context
        if notification.related_object_type == 'payment' and notification.related_object_id:
            context['payment_id'] = notification.related_object_id
            context['action_url'] = f'/payments/{notification.related_object_id}/'
    
    elif notification.notification_type == 'session':
        # Add session-specific context
        if notification.related_object_type == 'room' and notification.related_object_id:
            context['room_id'] = notification.related_object_id
            context['action_url'] = f'/rooms/{notification.related_object_id}/'
    
    elif notification.notification_type == 'message':
        # Add message-specific context
        if notification.related_object_type == 'conversation' and notification.related_object_id:
            context['conversation_id'] = notification.related_object_id
            context['action_url'] = f'/messages/{notification.related_object_id}/'
    
    # Merge with existing metadata
    context.update(notification.metadata)
    
    return context