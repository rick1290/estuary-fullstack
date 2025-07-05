"""
Utility functions for notifications.
"""
from typing import Optional, Dict, Any
from django.contrib.auth import get_user_model

from notifications.services.registry import (
    get_client_notification_service,
    get_practitioner_notification_service
)
from notifications.models import Notification

User = get_user_model()


def send_notification(
    user: User,
    notification_type: str,
    template_key: str,
    data: Dict[str, Any],
    title: Optional[str] = None,
    message: Optional[str] = None
) -> Optional[Notification]:
    """
    Send a notification to a user.
    
    Args:
        user: User to send notification to
        notification_type: Type of notification (booking, payment, etc.)
        template_key: Template key (e.g., 'booking_confirmation')
        data: Template data
        title: Notification title (for in-app)
        message: Notification message (for in-app)
    
    Returns:
        Notification instance or None
    """
    # Determine which service to use
    if hasattr(user, 'practitioner_profile'):
        service = get_practitioner_notification_service()
    else:
        service = get_client_notification_service()
    
    # Check if user wants this notification
    if not service.should_send_notification(user, notification_type, 'email'):
        return None
    
    # Get template ID
    template_id = service.get_template_id(template_key)
    if not template_id:
        return None
    
    # Create notification record
    notification = service.create_notification_record(
        user=user,
        title=title or f"{notification_type.title()} Notification",
        message=message or "You have a new notification",
        notification_type=notification_type,
        delivery_channel='email'
    )
    
    # Send email
    service.send_email_notification(
        user=user,
        template_id=template_id,
        data=data,
        notification=notification
    )
    
    return notification


def create_in_app_notification(
    user: User,
    title: str,
    message: str,
    notification_type: str,
    related_object_type: Optional[str] = None,
    related_object_id: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> Notification:
    """
    Create an in-app notification.
    
    This creates a notification record that will be shown in the app
    and can trigger a WebSocket message if the user is online.
    """
    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        delivery_channel='in_app',
        related_object_type=related_object_type,
        related_object_id=related_object_id,
        metadata=metadata or {},
        status='sent'  # In-app notifications are immediately "sent"
    )
    
    # Send WebSocket notification if user is online
    from notifications.tasks import send_websocket_notification
    send_websocket_notification.delay(notification.id)
    
    return notification


def get_unread_count(user: User) -> int:
    """Get count of unread notifications for a user."""
    return Notification.objects.filter(
        user=user,
        is_read=False,
        delivery_channel='in_app'
    ).count()


def mark_notifications_read(user: User, notification_ids: list) -> int:
    """Mark multiple notifications as read."""
    return Notification.objects.filter(
        user=user,
        id__in=notification_ids,
        is_read=False
    ).update(is_read=True)


def get_user_preferences(user: User) -> Dict[str, Dict[str, bool]]:
    """Get all notification preferences for a user."""
    from notifications.models import NotificationSetting
    
    preferences = {}
    settings = NotificationSetting.objects.filter(user=user)
    
    for setting in settings:
        preferences[setting.notification_type] = {
            'email': setting.email_enabled,
            'sms': setting.sms_enabled,
            'in_app': setting.in_app_enabled,
            'push': setting.push_enabled
        }
    
    return preferences


def update_user_preferences(
    user: User, 
    notification_type: str,
    email: Optional[bool] = None,
    sms: Optional[bool] = None,
    in_app: Optional[bool] = None,
    push: Optional[bool] = None
) -> bool:
    """Update notification preferences for a user."""
    from notifications.models import NotificationSetting
    
    setting, created = NotificationSetting.objects.get_or_create(
        user=user,
        notification_type=notification_type
    )
    
    if email is not None:
        setting.email_enabled = email
    if sms is not None:
        setting.sms_enabled = sms
    if in_app is not None:
        setting.in_app_enabled = in_app
    if push is not None:
        setting.push_enabled = push
    
    setting.save()
    return True