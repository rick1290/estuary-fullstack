from rest_framework import serializers
from apps.messaging.models import Conversation, Message, MessageReceipt, TypingIndicator
from apps.users.api.v1.serializers import UserBasicSerializer
from apps.bookings.api.v1.serializers import BookingBasicSerializer
from apps.services.api.v1.serializers import ServiceBasicSerializer
from drf_spectacular.utils import extend_schema_field


class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for the Message model.
    """
    sender_details = UserBasicSerializer(source='sender', read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'content', 'message_type',
            'attachments', 'created_at', 'edited_at', 'is_edited',
            'is_deleted', 'deleted_at', 'sender_details'
        ]
        read_only_fields = ['id', 'created_at', 'edited_at', 'is_edited', 'is_deleted', 'deleted_at']


class MessageCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Message.
    """
    class Meta:
        model = Message
        fields = ['conversation', 'content', 'message_type', 'attachments']


class MessageReceiptSerializer(serializers.ModelSerializer):
    """
    Serializer for the MessageReceipt model.
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    
    class Meta:
        model = MessageReceipt
        fields = [
            'id', 'message', 'user', 'is_read', 'read_at',
            'delivered_at', 'user_details'
        ]
        read_only_fields = ['id', 'delivered_at']


class TypingIndicatorSerializer(serializers.ModelSerializer):
    """
    Serializer for the TypingIndicator model.
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    
    class Meta:
        model = TypingIndicator
        fields = [
            'id', 'conversation', 'user', 'is_typing',
            'timestamp', 'user_details'
        ]
        read_only_fields = ['id', 'timestamp']


class ConversationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Conversation model.
    """
    participants_details = UserBasicSerializer(source='participants', many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'created_at', 'updated_at', 'participants', 'is_active',
            'title', 'related_booking', 'related_service', 'participants_details',
            'last_message', 'unread_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    @extend_schema_field(MessageSerializer(allow_null=True))
    def get_last_message(self, obj):
        """Get the last message in the conversation"""
        last_message = obj.messages.filter(is_deleted=False).order_by('-created_at').first()
        if last_message:
            return MessageSerializer(last_message).data
        return None
    
    @extend_schema_field(serializers.IntegerField())
    def get_unread_count(self, obj):
        """Get the count of unread messages for the current user"""
        user = self.context.get('request').user
        if not user:
            return 0
            
        # Count messages that don't have a read receipt for this user
        return Message.objects.filter(
            conversation=obj,
            is_deleted=False
        ).exclude(
            receipts__user=user,
            receipts__is_read=True
        ).count()


class ConversationDetailSerializer(ConversationSerializer):
    """
    Detailed serializer for the Conversation model including messages.
    """
    messages = serializers.SerializerMethodField()
    related_booking_details = BookingBasicSerializer(source='related_booking', read_only=True)
    related_service_details = ServiceBasicSerializer(source='related_service', read_only=True)
    
    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + [
            'messages', 'related_booking_details', 'related_service_details'
        ]
    
    @extend_schema_field(MessageSerializer(many=True))
    def get_messages(self, obj):
        """Get messages in the conversation with pagination"""
        # Get the page size from the request or use a default
        page_size = self.context.get('request').query_params.get('page_size', 20)
        try:
            page_size = int(page_size)
        except (TypeError, ValueError):
            page_size = 20
            
        # Get messages ordered by created_at
        messages = obj.messages.filter(is_deleted=False).order_by('-created_at')[:page_size]
        return MessageSerializer(messages, many=True).data


class ConversationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Conversation.
    """
    initial_message = serializers.CharField(required=False, write_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'participants', 'title', 'related_booking',
            'related_service', 'initial_message'
        ]
    
    def create(self, validated_data):
        initial_message = validated_data.pop('initial_message', None)
        participants = validated_data.pop('participants', [])
        
        # Create the conversation
        conversation = Conversation.objects.create(**validated_data)
        
        # Add participants
        if participants:
            conversation.participants.add(*participants)
        
        # Add the current user as a participant if not already included
        user = self.context.get('request').user
        if user and user not in participants:
            conversation.participants.add(user)
        
        # Add initial message if provided
        if initial_message and user:
            conversation.add_message(sender=user, content=initial_message)
        
        return conversation
