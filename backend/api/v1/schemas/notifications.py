"""
Notifications schemas for FastAPI endpoints
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum

from .base import BaseSchema, ListResponse


class NotificationType(str, Enum):
    """Types of notifications"""
    BOOKING = "booking"
    PAYMENT = "payment"
    SESSION = "session"
    REVIEW = "review"
    SYSTEM = "system"
    MESSAGE = "message"
    REMINDER = "reminder"


class DeliveryChannel(str, Enum):
    """Notification delivery channels"""
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    PUSH = "push"


class NotificationStatus(str, Enum):
    """Notification delivery status"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


# Notification schemas
class NotificationCreate(BaseModel):
    """Create a notification"""
    user_id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1, max_length=5000)
    notification_type: NotificationType
    delivery_channel: DeliveryChannel
    
    # Related object
    related_object_type: Optional[str] = Field(None, max_length=50)
    related_object_id: Optional[str] = Field(None, max_length=50)
    
    # Scheduling
    scheduled_for: Optional[datetime] = None
    
    # Additional data
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class NotificationResponse(BaseSchema):
    """Notification response"""
    id: UUID
    user_id: UUID
    title: str
    message: str
    notification_type: NotificationType
    delivery_channel: DeliveryChannel
    
    # Related object
    related_object_type: Optional[str] = None
    related_object_id: Optional[str] = None
    
    # Status
    is_read: bool
    status: NotificationStatus
    scheduled_for: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    
    # Additional data
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Actions
    can_mark_read: bool = True
    can_delete: bool = True
    action_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class NotificationUpdate(BaseModel):
    """Update notification"""
    is_read: Optional[bool] = None
    status: Optional[NotificationStatus] = None


class NotificationMarkRead(BaseModel):
    """Mark notifications as read"""
    notification_ids: List[UUID] = Field(..., min_length=1, max_length=100)


# Notification Settings schemas
class NotificationSettingCreate(BaseModel):
    """Create notification settings"""
    notification_type: NotificationType
    email_enabled: bool = True
    sms_enabled: bool = True
    in_app_enabled: bool = True
    push_enabled: bool = True


class NotificationSettingUpdate(BaseModel):
    """Update notification settings"""
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None


class NotificationSettingResponse(BaseSchema):
    """Notification setting response"""
    id: UUID
    user_id: UUID
    notification_type: NotificationType
    email_enabled: bool
    sms_enabled: bool
    in_app_enabled: bool
    push_enabled: bool
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Notification Template schemas
class NotificationTemplateCreate(BaseModel):
    """Create notification template"""
    name: str = Field(..., min_length=1, max_length=100)
    notification_type: NotificationType
    delivery_channel: DeliveryChannel
    subject_template: Optional[str] = Field(None, max_length=255)
    body_template: str = Field(..., min_length=1)
    is_active: bool = True


class NotificationTemplateUpdate(BaseModel):
    """Update notification template"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    subject_template: Optional[str] = Field(None, max_length=255)
    body_template: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None


class NotificationTemplateResponse(BaseSchema):
    """Notification template response"""
    id: UUID
    name: str
    notification_type: NotificationType
    delivery_channel: DeliveryChannel
    subject_template: Optional[str] = None
    body_template: str
    is_active: bool
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Bulk operations
class NotificationBulkCreate(BaseModel):
    """Bulk create notifications"""
    user_ids: List[UUID] = Field(..., min_length=1, max_length=1000)
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1, max_length=5000)
    notification_type: NotificationType
    delivery_channels: List[DeliveryChannel] = Field(..., min_length=1)
    
    # Scheduling
    scheduled_for: Optional[datetime] = None
    
    # Additional data
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class NotificationBulkResponse(BaseModel):
    """Bulk notification response"""
    created_count: int
    failed_count: int
    notification_ids: List[UUID]
    errors: List[str] = Field(default_factory=list)


# Push notification schemas
class PushNotificationSend(BaseModel):
    """Send push notification"""
    user_ids: List[UUID] = Field(..., min_length=1, max_length=1000)
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=500)
    icon: Optional[str] = None
    badge: Optional[int] = Field(None, ge=0)
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    click_action: Optional[str] = None
    sound: Optional[str] = "default"
    
    # Scheduling
    scheduled_for: Optional[datetime] = None


class PushNotificationResponse(BaseModel):
    """Push notification response"""
    success_count: int
    failure_count: int
    multicast_id: Optional[str] = None
    results: List[Dict[str, Any]] = Field(default_factory=list)


# Email notification schemas
class EmailNotificationSend(BaseModel):
    """Send email notification"""
    user_ids: List[UUID] = Field(..., min_length=1, max_length=1000)
    subject: str = Field(..., min_length=1, max_length=255)
    body_html: str = Field(..., min_length=1)
    body_text: Optional[str] = None
    
    # Template variables
    template_variables: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    # Scheduling
    scheduled_for: Optional[datetime] = None


class EmailNotificationResponse(BaseModel):
    """Email notification response"""
    sent_count: int
    failed_count: int
    message_ids: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


# Analytics schemas
class NotificationAnalytics(BaseModel):
    """Notification analytics"""
    # Date range
    start_date: datetime
    end_date: datetime
    
    # Total counts
    total_sent: int
    total_delivered: int
    total_failed: int
    total_read: int
    
    # By type
    by_type: Dict[str, Dict[str, int]] = Field(
        default_factory=dict,
        description="Stats by notification type"
    )
    
    # By channel
    by_channel: Dict[str, Dict[str, int]] = Field(
        default_factory=dict,
        description="Stats by delivery channel"
    )
    
    # Engagement metrics
    read_rate: float = Field(..., ge=0, le=1)
    avg_time_to_read: Optional[float] = None  # in minutes
    
    # Daily breakdown
    daily_stats: List[Dict[str, Any]] = Field(default_factory=list)


# Filters
class NotificationFilters(BaseModel):
    """Filters for listing notifications"""
    notification_type: Optional[NotificationType] = None
    delivery_channel: Optional[DeliveryChannel] = None
    status: Optional[NotificationStatus] = None
    is_read: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    search: Optional[str] = Field(None, description="Search in title and message")
    sort_by: str = Field("created_at", pattern="^(created_at|sent_at|notification_type|status)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


# Preferences schemas
class NotificationPreferencesResponse(BaseModel):
    """User's notification preferences"""
    user_id: UUID
    settings: List[NotificationSettingResponse]
    
    # Global preferences
    email_notifications: bool = True
    sms_notifications: bool = True
    push_notifications: bool = True
    
    # Quiet hours
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    timezone: str = "UTC"


class NotificationPreferencesUpdate(BaseModel):
    """Update notification preferences"""
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    timezone: Optional[str] = None


# Device registration for push notifications
class DeviceTokenRegister(BaseModel):
    """Register device token for push notifications"""
    token: str = Field(..., min_length=1)
    platform: str = Field(..., pattern="^(ios|android|web)$")
    app_version: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = Field(default_factory=dict)


class DeviceTokenResponse(BaseModel):
    """Device token response"""
    token: str
    platform: str
    is_active: bool
    last_used: Optional[datetime] = None
    registered_at: datetime


# List responses
class NotificationListResponse(ListResponse):
    """Notification list response"""
    results: List[NotificationResponse]
    unread_count: int = 0


class NotificationSettingListResponse(ListResponse):
    """Notification setting list response"""
    results: List[NotificationSettingResponse]


class NotificationTemplateListResponse(ListResponse):
    """Notification template list response"""
    results: List[NotificationTemplateResponse]


# Webhook schemas for external services
class WebhookNotificationStatus(BaseModel):
    """Webhook notification status update"""
    notification_id: UUID
    status: NotificationStatus
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    external_id: Optional[str] = None