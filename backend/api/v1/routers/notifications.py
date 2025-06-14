"""
Notifications router for FastAPI
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta, date
from django.db import transaction
from django.db.models import Count, Q, F, Sum, Avg
from django.utils import timezone
from django.shortcuts import get_object_or_404

from notifications.models import Notification, NotificationSetting, NotificationTemplate
from users.models import User

from ..schemas.notifications import (
    # Notification schemas
    NotificationCreate, NotificationResponse, NotificationUpdate,
    NotificationMarkRead, NotificationListResponse,
    # Settings schemas
    NotificationSettingCreate, NotificationSettingUpdate,
    NotificationSettingResponse, NotificationSettingListResponse,
    # Template schemas
    NotificationTemplateCreate, NotificationTemplateUpdate,
    NotificationTemplateResponse, NotificationTemplateListResponse,
    # Bulk operations
    NotificationBulkCreate, NotificationBulkResponse,
    # Push notifications
    PushNotificationSend, PushNotificationResponse,
    # Email notifications
    EmailNotificationSend, EmailNotificationResponse,
    # Analytics
    NotificationAnalytics,
    # Filters and preferences
    NotificationFilters, NotificationPreferencesResponse, NotificationPreferencesUpdate,
    # Device tokens
    DeviceTokenRegister, DeviceTokenResponse,
    # Enums
    NotificationType, DeliveryChannel, NotificationStatus
)
from api.dependencies import PaginationParams, get_current_user, get_current_superuser
from ..utils import paginate_queryset

router = APIRouter()


def serialize_notification(notification: Notification, current_user: User) -> NotificationResponse:
    """Serialize notification for API response"""
    # Generate action URL based on notification type and related object
    action_url = None
    if notification.related_object_type and notification.related_object_id:
        if notification.notification_type == 'booking':
            action_url = f"/bookings/{notification.related_object_id}"
        elif notification.notification_type == 'message':
            action_url = f"/messages/{notification.related_object_id}"
        elif notification.notification_type == 'payment':
            action_url = f"/payments/{notification.related_object_id}"
        elif notification.notification_type == 'review':
            action_url = f"/reviews/{notification.related_object_id}"
    
    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        title=notification.title,
        message=notification.message,
        notification_type=notification.notification_type,
        delivery_channel=notification.delivery_channel,
        related_object_type=notification.related_object_type,
        related_object_id=notification.related_object_id,
        is_read=notification.is_read,
        status=notification.status,
        scheduled_for=notification.scheduled_for,
        sent_at=notification.sent_at,
        metadata=notification.metadata,
        created_at=notification.created_at,
        updated_at=notification.updated_at,
        can_mark_read=not notification.is_read,
        can_delete=True,
        action_url=action_url
    )


# =============================================================================
# NOTIFICATION MANAGEMENT
# =============================================================================

@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    filters: NotificationFilters = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user)
):
    """List user's notifications"""
    queryset = Notification.objects.filter(user=current_user)
    
    # Apply filters
    if filters.notification_type:
        queryset = queryset.filter(notification_type=filters.notification_type)
    
    if filters.delivery_channel:
        queryset = queryset.filter(delivery_channel=filters.delivery_channel)
    
    if filters.status:
        queryset = queryset.filter(status=filters.status)
    
    if filters.is_read is not None:
        queryset = queryset.filter(is_read=filters.is_read)
    
    if filters.created_after:
        queryset = queryset.filter(created_at__gte=filters.created_after)
    
    if filters.created_before:
        queryset = queryset.filter(created_at__lte=filters.created_before)
    
    if filters.search:
        queryset = queryset.filter(
            Q(title__icontains=filters.search) |
            Q(message__icontains=filters.search)
        )
    
    # Sorting
    order_field = filters.sort_by
    if filters.sort_order == 'desc':
        order_field = f'-{order_field}'
    queryset = queryset.order_by(order_field)
    
    # Get unread count
    unread_count = Notification.objects.filter(
        user=current_user,
        is_read=False,
        delivery_channel='in_app'
    ).count()
    
    # Paginate and serialize
    paginated_result = await paginate_queryset(
        queryset, pagination,
        lambda notif: serialize_notification(notif, current_user)
    )
    paginated_result.unread_count = unread_count
    
    return paginated_result


@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_superuser)
):
    """Create a notification (staff only)"""
    # Validate user exists
    user = get_object_or_404(User, id=notification_data.user_id)
    
    # Create notification
    notification = Notification.objects.create(
        user=user,
        title=notification_data.title,
        message=notification_data.message,
        notification_type=notification_data.notification_type,
        delivery_channel=notification_data.delivery_channel,
        related_object_type=notification_data.related_object_type,
        related_object_id=notification_data.related_object_id,
        scheduled_for=notification_data.scheduled_for,
        metadata=notification_data.metadata or {}
    )
    
    # TODO: Trigger notification delivery via background task
    
    return serialize_notification(notification, user)


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get notification details"""
    notification = get_object_or_404(
        Notification,
        id=notification_id,
        user=current_user
    )
    
    # Mark as read if it's an in-app notification
    if notification.delivery_channel == 'in_app' and not notification.is_read:
        notification.is_read = True
        notification.save(update_fields=['is_read'])
    
    return serialize_notification(notification, current_user)


@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: UUID,
    notification_data: NotificationUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update notification"""
    notification = get_object_or_404(
        Notification,
        id=notification_id,
        user=current_user
    )
    
    # Update fields
    update_data = notification_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(notification, field, value)
    
    notification.save()
    
    return serialize_notification(notification, current_user)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Delete notification"""
    notification = get_object_or_404(
        Notification,
        id=notification_id,
        user=current_user
    )
    
    notification.delete()


@router.post("/mark-read")
async def mark_notifications_read(
    mark_data: NotificationMarkRead,
    current_user: User = Depends(get_current_user)
):
    """Mark multiple notifications as read"""
    count = Notification.objects.filter(
        id__in=mark_data.notification_ids,
        user=current_user,
        is_read=False
    ).update(is_read=True)
    
    return {"message": f"Marked {count} notifications as read"}


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    notification_type: Optional[NotificationType] = Query(None)
):
    """Mark all notifications as read"""
    queryset = Notification.objects.filter(
        user=current_user,
        is_read=False,
        delivery_channel='in_app'
    )
    
    if notification_type:
        queryset = queryset.filter(notification_type=notification_type)
    
    count = queryset.update(is_read=True)
    
    return {"message": f"Marked {count} notifications as read"}


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user)
):
    """Get unread notification count"""
    total_unread = Notification.objects.filter(
        user=current_user,
        is_read=False,
        delivery_channel='in_app'
    ).count()
    
    # Count by type
    by_type = {}
    for notif_type in NotificationType:
        count = Notification.objects.filter(
            user=current_user,
            is_read=False,
            delivery_channel='in_app',
            notification_type=notif_type.value
        ).count()
        if count > 0:
            by_type[notif_type.value] = count
    
    return {
        "total_unread": total_unread,
        "by_type": by_type
    }


# =============================================================================
# BULK OPERATIONS
# =============================================================================

@router.post("/bulk", response_model=NotificationBulkResponse)
async def create_bulk_notifications(
    bulk_data: NotificationBulkCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_superuser)
):
    """Create notifications for multiple users (staff only)"""
    # Validate users exist
    users = User.objects.filter(id__in=bulk_data.user_ids)
    found_user_ids = set(users.values_list('id', flat=True))
    missing_user_ids = set(bulk_data.user_ids) - found_user_ids
    
    notifications = []
    created_count = 0
    errors = []
    
    # Create notifications for each user and channel
    with transaction.atomic():
        for user in users:
            for channel in bulk_data.delivery_channels:
                try:
                    notification = Notification.objects.create(
                        user=user,
                        title=bulk_data.title,
                        message=bulk_data.message,
                        notification_type=bulk_data.notification_type,
                        delivery_channel=channel,
                        scheduled_for=bulk_data.scheduled_for,
                        metadata=bulk_data.metadata or {}
                    )
                    notifications.append(notification)
                    created_count += 1
                except Exception as e:
                    errors.append(f"Failed to create notification for user {user.id}: {str(e)}")
    
    # TODO: Schedule background delivery tasks
    
    return NotificationBulkResponse(
        created_count=created_count,
        failed_count=len(missing_user_ids) + len(errors),
        notification_ids=[notif.id for notif in notifications],
        errors=errors + [f"User not found: {uid}" for uid in missing_user_ids]
    )


# =============================================================================
# PUSH NOTIFICATIONS
# =============================================================================

@router.post("/push", response_model=PushNotificationResponse)
async def send_push_notification(
    push_data: PushNotificationSend,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_superuser)
):
    """Send push notification (staff only)"""
    # Validate users exist
    users = User.objects.filter(id__in=push_data.user_ids)
    
    # Create in-app notifications
    notifications = []
    with transaction.atomic():
        for user in users:
            notification = Notification.objects.create(
                user=user,
                title=push_data.title,
                message=push_data.body,
                notification_type='system',
                delivery_channel='push',
                scheduled_for=push_data.scheduled_for,
                metadata={
                    'icon': push_data.icon,
                    'badge': push_data.badge,
                    'data': push_data.data,
                    'click_action': push_data.click_action,
                    'sound': push_data.sound
                }
            )
            notifications.append(notification)
    
    # TODO: Implement actual push notification delivery via FCM/APNS
    # For now, simulate success
    
    return PushNotificationResponse(
        success_count=len(users),
        failure_count=0,
        multicast_id="mock_multicast_id",
        results=[{"success": True} for _ in users]
    )


@router.post("/devices", response_model=DeviceTokenResponse)
async def register_device_token(
    device_data: DeviceTokenRegister,
    current_user: User = Depends(get_current_user)
):
    """Register device token for push notifications"""
    # TODO: Store device token for user
    # For now, return mock response
    
    return DeviceTokenResponse(
        token=device_data.token,
        platform=device_data.platform,
        is_active=True,
        registered_at=timezone.now()
    )


# =============================================================================
# EMAIL NOTIFICATIONS
# =============================================================================

@router.post("/email", response_model=EmailNotificationResponse)
async def send_email_notification(
    email_data: EmailNotificationSend,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_superuser)
):
    """Send email notification (staff only)"""
    # Validate users exist
    users = User.objects.filter(id__in=email_data.user_ids)
    
    # Create email notifications
    notifications = []
    with transaction.atomic():
        for user in users:
            notification = Notification.objects.create(
                user=user,
                title=email_data.subject,
                message=email_data.body_text or email_data.body_html[:500],
                notification_type='system',
                delivery_channel='email',
                scheduled_for=email_data.scheduled_for,
                metadata={
                    'subject': email_data.subject,
                    'body_html': email_data.body_html,
                    'body_text': email_data.body_text,
                    'template_variables': email_data.template_variables
                }
            )
            notifications.append(notification)
    
    # TODO: Implement actual email delivery via Courier/SendGrid
    # For now, simulate success
    
    return EmailNotificationResponse(
        sent_count=len(users),
        failed_count=0,
        message_ids=[f"mock_message_{i}" for i in range(len(users))],
        errors=[]
    )


# =============================================================================
# NOTIFICATION SETTINGS
# =============================================================================

@router.get("/settings", response_model=NotificationSettingListResponse)
async def list_notification_settings(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user)
):
    """List user's notification settings"""
    # Get existing settings
    settings = NotificationSetting.objects.filter(user=current_user)
    
    # Create default settings for missing notification types
    existing_types = set(settings.values_list('notification_type', flat=True))
    missing_types = set([nt.value for nt in NotificationType]) - existing_types
    
    default_settings = []
    for notif_type in missing_types:
        setting = NotificationSetting.objects.create(
            user=current_user,
            notification_type=notif_type
        )
        default_settings.append(setting)
    
    # Combine all settings
    all_settings = list(settings) + default_settings
    
    return await paginate_queryset(
        all_settings, pagination,
        NotificationSettingResponse.model_validate
    )


@router.post("/settings", response_model=NotificationSettingResponse, status_code=status.HTTP_201_CREATED)
async def create_notification_setting(
    setting_data: NotificationSettingCreate,
    current_user: User = Depends(get_current_user)
):
    """Create or update notification setting"""
    setting, created = NotificationSetting.objects.update_or_create(
        user=current_user,
        notification_type=setting_data.notification_type,
        defaults={
            'email_enabled': setting_data.email_enabled,
            'sms_enabled': setting_data.sms_enabled,
            'in_app_enabled': setting_data.in_app_enabled,
            'push_enabled': setting_data.push_enabled
        }
    )
    
    return NotificationSettingResponse.model_validate(setting)


@router.patch("/settings/{setting_id}", response_model=NotificationSettingResponse)
async def update_notification_setting(
    setting_id: UUID,
    setting_data: NotificationSettingUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update notification setting"""
    setting = get_object_or_404(
        NotificationSetting,
        id=setting_id,
        user=current_user
    )
    
    # Update fields
    update_data = setting_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)
    
    setting.save()
    
    return NotificationSettingResponse.model_validate(setting)


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get user's notification preferences"""
    settings = NotificationSetting.objects.filter(user=current_user)
    
    # TODO: Get global preferences from user profile or separate model
    
    return NotificationPreferencesResponse(
        user_id=current_user.id,
        settings=[NotificationSettingResponse.model_validate(s) for s in settings],
        email_notifications=True,
        sms_notifications=True,
        push_notifications=True,
        quiet_hours_enabled=False,
        timezone="UTC"
    )


@router.patch("/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    preferences_data: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update notification preferences"""
    # TODO: Update global preferences
    
    # For now, return current preferences
    return await get_notification_preferences(current_user)


# =============================================================================
# NOTIFICATION TEMPLATES (Admin)
# =============================================================================

@router.get("/templates", response_model=NotificationTemplateListResponse)
async def list_notification_templates(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_superuser),
    notification_type: Optional[NotificationType] = Query(None),
    delivery_channel: Optional[DeliveryChannel] = Query(None)
):
    """List notification templates (staff only)"""
    queryset = NotificationTemplate.objects.all()
    
    if notification_type:
        queryset = queryset.filter(notification_type=notification_type)
    
    if delivery_channel:
        queryset = queryset.filter(delivery_channel=delivery_channel)
    
    queryset = queryset.order_by('notification_type', 'delivery_channel')
    
    return await paginate_queryset(
        queryset, pagination,
        NotificationTemplateResponse.model_validate
    )


@router.post("/templates", response_model=NotificationTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_notification_template(
    template_data: NotificationTemplateCreate,
    current_user: User = Depends(get_current_superuser)
):
    """Create notification template (staff only)"""
    template = NotificationTemplate.objects.create(
        name=template_data.name,
        notification_type=template_data.notification_type,
        delivery_channel=template_data.delivery_channel,
        subject_template=template_data.subject_template,
        body_template=template_data.body_template,
        is_active=template_data.is_active
    )
    
    return NotificationTemplateResponse.model_validate(template)


@router.patch("/templates/{template_id}", response_model=NotificationTemplateResponse)
async def update_notification_template(
    template_id: UUID,
    template_data: NotificationTemplateUpdate,
    current_user: User = Depends(get_current_superuser)
):
    """Update notification template (staff only)"""
    template = get_object_or_404(NotificationTemplate, id=template_id)
    
    # Update fields
    update_data = template_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    template.save()
    
    return NotificationTemplateResponse.model_validate(template)


# =============================================================================
# ANALYTICS
# =============================================================================

@router.get("/analytics", response_model=NotificationAnalytics)
async def get_notification_analytics(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_superuser)
):
    """Get notification analytics (staff only)"""
    # Filter notifications by date range
    notifications = Notification.objects.filter(
        created_at__range=[start_date, end_date]
    )
    
    # Basic counts
    total_sent = notifications.filter(status='sent').count()
    total_delivered = notifications.filter(status='sent').count()  # Assuming sent = delivered for now
    total_failed = notifications.filter(status='failed').count()
    total_read = notifications.filter(is_read=True).count()
    
    # Stats by type
    by_type = {}
    for notif_type in NotificationType:
        type_notifications = notifications.filter(notification_type=notif_type.value)
        by_type[notif_type.value] = {
            "sent": type_notifications.filter(status='sent').count(),
            "delivered": type_notifications.filter(status='sent').count(),
            "failed": type_notifications.filter(status='failed').count(),
            "read": type_notifications.filter(is_read=True).count()
        }
    
    # Stats by channel
    by_channel = {}
    for channel in DeliveryChannel:
        channel_notifications = notifications.filter(delivery_channel=channel.value)
        by_channel[channel.value] = {
            "sent": channel_notifications.filter(status='sent').count(),
            "delivered": channel_notifications.filter(status='sent').count(),
            "failed": channel_notifications.filter(status='failed').count(),
            "read": channel_notifications.filter(is_read=True).count()
        }
    
    # Calculate read rate
    read_rate = total_read / total_sent if total_sent > 0 else 0
    
    # TODO: Generate daily breakdown
    daily_stats = []
    
    return NotificationAnalytics(
        start_date=start_date,
        end_date=end_date,
        total_sent=total_sent,
        total_delivered=total_delivered,
        total_failed=total_failed,
        total_read=total_read,
        by_type=by_type,
        by_channel=by_channel,
        read_rate=read_rate,
        daily_stats=daily_stats
    )