from rest_framework import serializers
from notifications.models import Notification, NotificationTemplate, NotificationSetting
from users.models import User


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    time_since = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'delivery_channel',
            'is_read', 'scheduled_for', 'sent_at', 'status', 'metadata',
            'related_object_type', 'related_object_id', 'created_at',
            'updated_at', 'user', 'user_name', 'time_since'
        ]
        read_only_fields = [
            'id', 'user', 'sent_at', 'status', 'created_at', 
            'updated_at', 'user_name', 'time_since'
        ]
    
    def get_time_since(self, obj):
        """Calculate human-readable time since notification created."""
        from django.utils import timezone
        from django.contrib.humanize.templatetags.humanize import naturaltime
        return naturaltime(obj.created_at)
    
    def create(self, validated_data):
        """Create notification with current user."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification lists."""
    time_since = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 
            'is_read', 'created_at', 'time_since'
        ]
        read_only_fields = fields
    
    def get_time_since(self, obj):
        """Calculate human-readable time since notification created."""
        from django.utils import timezone
        from django.contrib.humanize.templatetags.humanize import naturaltime
        return naturaltime(obj.created_at)


class NotificationMarkReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read."""
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of notification IDs to mark as read. If not provided, marks all as read."
    )
    is_read = serializers.BooleanField(default=True)


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for NotificationTemplate model."""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'name', 'notification_type', 'delivery_channel',
            'subject_template', 'body_template', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationSettingSerializer(serializers.ModelSerializer):
    """Serializer for NotificationSetting model (user preferences)."""
    notification_type_display = serializers.CharField(
        source='get_notification_type_display', 
        read_only=True
    )
    
    class Meta:
        model = NotificationSetting
        fields = [
            'id', 'notification_type', 'notification_type_display',
            'email_enabled', 'sms_enabled', 'in_app_enabled', 
            'push_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create notification setting with current user."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class NotificationPreferenceSerializer(serializers.Serializer):
    """Serializer for bulk updating notification preferences."""
    notification_type = serializers.ChoiceField(
        choices=Notification.NOTIFICATION_TYPES
    )
    email_enabled = serializers.BooleanField(required=False)
    sms_enabled = serializers.BooleanField(required=False)
    in_app_enabled = serializers.BooleanField(required=False)
    push_enabled = serializers.BooleanField(required=False)


class BulkNotificationPreferenceSerializer(serializers.Serializer):
    """Serializer for bulk updating multiple notification preferences."""
    preferences = serializers.ListField(
        child=NotificationPreferenceSerializer(),
        help_text="List of notification preferences to update"
    )


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics."""
    unread_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    by_type = serializers.DictField(child=serializers.IntegerField())
    recent_notifications = NotificationListSerializer(many=True)


class NotificationGroupSerializer(serializers.Serializer):
    """Serializer for grouped notifications."""
    group_key = serializers.CharField()
    group_type = serializers.CharField()
    count = serializers.IntegerField()
    latest_notification = NotificationListSerializer()
    notifications = NotificationListSerializer(many=True)