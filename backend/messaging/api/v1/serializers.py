"""
DRF Serializers for messaging API.
"""

from rest_framework import serializers
from django.utils import timezone
from django.db.models import Q, Count

from messaging.models import (
    Conversation, Message, MessageReceipt, ConversationParticipant,
    BlockedUser, MessageNotificationPreference, TypingIndicator
)
from users.models import User


class UserSummarySerializer(serializers.ModelSerializer):
    """Serializer for user summary information."""
    display_name = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'uuid', 'email', 'first_name', 'last_name', 
                  'display_name', 'avatar_url', 'is_practitioner']
    
    def get_avatar_url(self, obj):
        """Get avatar URL - practitioner profile image for practitioners, user profile for others."""
        # If user is a practitioner, use their practitioner profile image
        if obj.is_practitioner and hasattr(obj, 'practitioner_profile'):
            practitioner = obj.practitioner_profile
            if practitioner.profile_image_url:
                return practitioner.profile_image_url

        # Otherwise use regular user profile avatar
        if hasattr(obj, 'profile') and obj.profile:
            return obj.profile.avatar_url
        return None


class AttachmentSerializer(serializers.Serializer):
    """Serializer for message attachments."""
    id = serializers.CharField(required=False)
    type = serializers.ChoiceField(choices=['image', 'file', 'video', 'audio'])
    url = serializers.URLField()
    filename = serializers.CharField()
    size = serializers.IntegerField()
    mime_type = serializers.CharField()
    thumbnail_url = serializers.URLField(required=False, allow_null=True)
    duration = serializers.IntegerField(required=False, allow_null=True)
    width = serializers.IntegerField(required=False, allow_null=True)
    height = serializers.IntegerField(required=False, allow_null=True)


class MessageStatusSerializer(serializers.ModelSerializer):
    """Serializer for message delivery and read status."""
    message_id = serializers.IntegerField(source='message.id')
    user_id = serializers.IntegerField(source='user.id')
    
    class Meta:
        model = MessageReceipt
        fields = ['message_id', 'user_id', 'delivered_at', 'is_read', 'read_at']


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages."""
    sender = UserSummarySerializer(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    receipts = MessageStatusSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'content', 'message_type',
                  'attachments', 'created_at', 'updated_at', 'edited_at',
                  'is_edited', 'is_deleted', 'deleted_at', 'receipts']
        read_only_fields = ['id', 'conversation', 'sender', 'created_at', 
                            'updated_at', 'edited_at', 'is_edited', 
                            'is_deleted', 'deleted_at']


class MessageCreateSerializer(serializers.Serializer):
    """Serializer for creating messages."""
    content = serializers.CharField(min_length=1, max_length=10000)
    message_type = serializers.ChoiceField(
        choices=['text', 'image', 'file', 'video', 'audio', 'link'],
        default='text'
    )
    attachments = AttachmentSerializer(many=True, required=False)
    
    def validate(self, data):
        """Validate attachments match message type."""
        message_type = data.get('message_type', 'text')
        attachments = data.get('attachments', [])
        
        if message_type in ['image', 'file', 'video', 'audio'] and not attachments:
            raise serializers.ValidationError(
                f"{message_type} messages must have at least one attachment"
            )
        
        return data


class TypingIndicatorSerializer(serializers.ModelSerializer):
    """Serializer for typing indicators."""
    user = UserSummarySerializer(read_only=True)
    
    class Meta:
        model = TypingIndicator
        fields = ['user', 'is_typing', 'updated_at']


class ConversationParticipantSerializer(serializers.ModelSerializer):
    """Serializer for conversation participants."""
    user = UserSummarySerializer(read_only=True)
    
    class Meta:
        model = ConversationParticipant
        fields = ['user', 'role', 'joined_at', 'is_active', 'left_at',
                  'is_muted', 'muted_until', 'is_archived', 'archived_at',
                  'last_read_at']


class ConversationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for conversation list."""
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'last_message', 'unread_count', 'created_at', 'updated_at']
    
    def get_other_user(self, obj):
        """Get the other user in the conversation."""
        request_user = self.context.get('request').user
        # For direct conversations, get the other participant
        if obj.conversation_type == 'direct':
            other_user = obj.participants.exclude(id=request_user.id).first()
            if other_user:
                return UserSummarySerializer(other_user).data
        return None
    
    def get_last_message(self, obj):
        """Get the last message in the conversation."""
        # This is prefetched in the view
        messages = list(obj.messages.all())
        if messages:
            last_message = messages[0]
            # Check if message is read by current user
            user = self.context['request'].user
            is_read = MessageReceipt.objects.filter(
                message=last_message,
                user=user,
                is_read=True
            ).exists()
            
            return {
                'id': last_message.id,
                'content': last_message.content[:100] + '...' if len(last_message.content) > 100 else last_message.content,
                'sender_id': last_message.sender_id,
                'created_at': last_message.created_at,
                'is_read': is_read
            }
        return None
    
    def get_unread_count(self, obj):
        """Get unread count from annotation."""
        return getattr(obj, 'unread_count', 0)


class ConversationSerializer(serializers.ModelSerializer):
    """Base serializer for conversations."""
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'title', 'conversation_type', 'is_active', 'is_archived',
                  'created_at', 'updated_at', 'participants', 'last_message',
                  'unread_count', 'related_booking', 'related_service']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_participants(self, obj):
        """Get conversation participants."""
        participants = obj.conversation_participants.select_related('user')
        return ConversationParticipantSerializer(participants, many=True).data
    
    def get_last_message(self, obj):
        """Get the last message in the conversation."""
        last_message = obj.messages.filter(is_deleted=False).order_by('-created_at').first()
        if last_message:
            return MessageSerializer(last_message).data
        return None
    
    def get_unread_count(self, obj):
        """Get unread message count for current user."""
        user = self.context.get('request').user if self.context.get('request') else None
        if not user:
            return 0
        
        return MessageReceipt.objects.filter(
            message__conversation=obj,
            user=user,
            is_read=False,
            message__is_deleted=False
        ).count()


class ConversationDetailSerializer(ConversationSerializer):
    """Detailed serializer for conversations including messages."""
    messages = serializers.SerializerMethodField()
    typing_indicators = serializers.SerializerMethodField()
    
    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ['messages', 'typing_indicators']
    
    def get_messages(self, obj):
        """Get conversation messages."""
        messages = obj.messages.filter(is_deleted=False).order_by('-created_at')[:50]
        return MessageSerializer(reversed(list(messages)), many=True).data
    
    def get_typing_indicators(self, obj):
        """Get active typing indicators."""
        indicators = TypingIndicator.objects.filter(
            conversation=obj,
            is_typing=True,
            updated_at__gte=timezone.now() - timezone.timedelta(seconds=10)
        )
        return TypingIndicatorSerializer(indicators, many=True).data


class ConversationCreateSerializer(serializers.Serializer):
    """Serializer for creating conversations."""
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    conversation_type = serializers.ChoiceField(choices=['direct', 'group'], default='direct')
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    initial_message = MessageCreateSerializer(required=False)
    
    def validate_participant_ids(self, value):
        """Validate participant count based on conversation type."""
        conv_type = self.initial_data.get('conversation_type', 'direct')
        
        if conv_type == 'direct' and len(value) != 1:
            raise serializers.ValidationError(
                "Direct conversations must have exactly one other participant"
            )
        elif conv_type == 'group' and len(value) < 2:
            raise serializers.ValidationError(
                "Group conversations must have at least 2 other participants"
            )
        
        return value


class AddParticipantSerializer(serializers.Serializer):
    """Serializer for adding participants."""
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=['member', 'admin'], default='member')


class ArchiveConversationSerializer(serializers.Serializer):
    """Serializer for archiving conversations."""
    archive = serializers.BooleanField()


class BlockedUserSerializer(serializers.ModelSerializer):
    """Serializer for blocked users."""
    blocked_user = UserSummarySerializer(source='blocked', read_only=True)
    
    class Meta:
        model = BlockedUser
        fields = ['id', 'blocked_user', 'reason', 'created_at']


class BlockUserSerializer(serializers.Serializer):
    """Serializer for blocking users."""
    user_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class MessageNotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for message notification preferences."""
    quiet_hours_start = serializers.TimeField(format='%H:%M', required=False, allow_null=True)
    quiet_hours_end = serializers.TimeField(format='%H:%M', required=False, allow_null=True)
    
    class Meta:
        model = MessageNotificationPreference
        fields = ['email_notifications', 'push_notifications', 'sms_notifications',
                  'notify_new_message', 'notify_new_conversation', 'notify_mentions',
                  'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
                  'quiet_hours_timezone', 'sound_enabled', 'vibration_enabled']


class TypingStatusSerializer(serializers.Serializer):
    """Serializer for typing status updates."""
    is_typing = serializers.BooleanField()


class MessageSearchSerializer(serializers.Serializer):
    """Serializer for message search parameters."""
    query = serializers.CharField(min_length=2, max_length=100)
    conversation_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    sender_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    message_types = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    include_deleted = serializers.BooleanField(default=False)
    limit = serializers.IntegerField(min_value=1, max_value=100, default=50)
    offset = serializers.IntegerField(min_value=0, default=0)


class UnreadCountResponseSerializer(serializers.Serializer):
    """Serializer for unread message count response."""
    total_unread = serializers.IntegerField()
    conversations = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )


# Simplified serializers for basic messaging
class SimpleConversationCreateSerializer(serializers.Serializer):
    """Simple serializer for creating direct conversations."""
    other_user_id = serializers.IntegerField()
    initial_message = serializers.CharField(required=False, allow_blank=True)