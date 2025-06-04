import uuid
from django.db import models


class Notification(models.Model):
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
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    delivery_channel = models.CharField(max_length=20, choices=DELIVERY_CHANNELS)
    related_object_type = models.CharField(max_length=50, blank=True, null=True)  # e.g., 'booking', 'payment'
    related_object_id = models.CharField(max_length=50, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_for = models.DateTimeField(blank=True, null=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    metadata = models.JSONField(blank=True, null=True)  # For additional data related to the notification
    
    class Meta:
        # Using Django's default naming convention (notifications_notification)
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['delivery_channel']),
            models.Index(fields=['scheduled_for']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} notification for {self.user}: {self.title}"


class NotificationTemplate(models.Model):
    """
    Model for storing notification templates for different notification types and channels.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    notification_type = models.CharField(max_length=20, choices=Notification.NOTIFICATION_TYPES)
    delivery_channel = models.CharField(max_length=20, choices=Notification.DELIVERY_CHANNELS)
    subject_template = models.CharField(max_length=255, blank=True, null=True)  # For email notifications
    body_template = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Using Django's default naming convention (notifications_notificationtemplate)
        unique_together = ('notification_type', 'delivery_channel')
    
    def __str__(self):
        return f"{self.name} ({self.notification_type} - {self.delivery_channel})"


class NotificationSetting(models.Model):
    """
    Model for storing user notification preferences.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notification_settings')
    notification_type = models.CharField(max_length=20, choices=Notification.NOTIFICATION_TYPES)
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    
    class Meta:
        # Using Django's default naming convention (notifications_notificationsetting)
        unique_together = ('user', 'notification_type')
    
    def __str__(self):
        return f"Notification settings for {self.user} - {self.notification_type}"
