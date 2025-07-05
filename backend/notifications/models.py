from django.db import models
from utils.models import BaseModel


class Notification(BaseModel):
    """
    Model for user notifications across different channels.
    """
    NOTIFICATION_TYPES = (
        ('booking', 'Booking'),
        ('payment', 'Payment'),
        ('session', 'Session'),
        ('review', 'Review'),
        ('system', 'System'),
        ('message', 'Message'),
        ('reminder', 'Reminder'),
    )
    
    DELIVERY_CHANNELS = (
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('in_app', 'In-App'),
        ('push', 'Push Notification'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    delivery_channel = models.CharField(max_length=20, choices=DELIVERY_CHANNELS)
    
    # Generic foreign key fields for related objects
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id = models.CharField(max_length=50, blank=True)
    
    # Status fields
    is_read = models.BooleanField(default=False)
    scheduled_for = models.DateTimeField(blank=True, null=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)
    
    # Deduplication key for preventing duplicate notifications
    notification_key = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Unique key to prevent duplicate notifications (e.g. 'booking_123_24h_reminder')"
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type', 'status']),
            models.Index(fields=['delivery_channel']),
            models.Index(fields=['scheduled_for']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['notification_key']),  # For deduplication queries
            models.Index(fields=['user', 'notification_key', 'status']),  # Compound for fast lookups
        ]
    
    def __str__(self):
        return f"{self.notification_type} notification for {self.user}: {self.title}"


class NotificationTemplate(BaseModel):
    """
    Model for storing notification templates for different notification types and channels.
    """
    name = models.CharField(max_length=100)
    notification_type = models.CharField(max_length=20, choices=Notification.NOTIFICATION_TYPES)
    delivery_channel = models.CharField(max_length=20, choices=Notification.DELIVERY_CHANNELS)
    subject_template = models.CharField(max_length=255, blank=True)
    body_template = models.TextField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('notification_type', 'delivery_channel')
        indexes = [
            models.Index(fields=['notification_type', 'delivery_channel']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.notification_type} - {self.delivery_channel})"


class NotificationSetting(BaseModel):
    """
    Model for storing user notification preferences.
    """
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notification_settings')
    notification_type = models.CharField(max_length=20, choices=Notification.NOTIFICATION_TYPES)
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('user', 'notification_type')
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"Notification settings for {self.user} - {self.notification_type}"
