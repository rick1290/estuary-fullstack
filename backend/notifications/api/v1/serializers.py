from rest_framework import serializers
from apps.notifications.models import Notification, NotificationTemplate, NotificationSetting
from apps.users.api.v1.serializers import UserBasicSerializer


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Notification model.
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'title', 'message', 'notification_type',
            'delivery_channel', 'related_object_type', 'related_object_id',
            'is_read', 'created_at', 'scheduled_for', 'sent_at',
            'status', 'metadata', 'user_details'
        ]
        read_only_fields = ['id', 'created_at', 'sent_at', 'status']


class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Notification.
    """
    class Meta:
        model = Notification
        fields = [
            'user', 'title', 'message', 'notification_type',
            'delivery_channel', 'related_object_type', 'related_object_id',
            'scheduled_for', 'metadata'
        ]


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for the NotificationTemplate model.
    """
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'name', 'notification_type', 'delivery_channel',
            'subject_template', 'body_template', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationSettingSerializer(serializers.ModelSerializer):
    """
    Serializer for the NotificationSetting model.
    """
    class Meta:
        model = NotificationSetting
        fields = [
            'id', 'user', 'notification_type', 'email_enabled',
            'sms_enabled', 'in_app_enabled', 'push_enabled'
        ]
        read_only_fields = ['id']


class NotificationBulkUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk updating notifications (e.g., marking multiple as read).
    """
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True
    )
    is_read = serializers.BooleanField(required=False)
    status = serializers.ChoiceField(
        choices=Notification.STATUS_CHOICES,
        required=False
    )


class NotificationSettingBulkUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk updating notification settings.
    """
    settings = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )
    
    def validate_settings(self, value):
        """
        Validate that each setting has the required fields.
        """
        for setting in value:
            if 'notification_type' not in setting:
                raise serializers.ValidationError("Each setting must include a notification_type")
        return value
