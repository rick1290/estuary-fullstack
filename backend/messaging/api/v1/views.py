from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, Count, Max, F, Subquery, OuterRef
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.messaging.models import Conversation, Message, MessageReceipt, TypingIndicator
from apps.messaging.api.v1.serializers import (
    ConversationSerializer, ConversationDetailSerializer, ConversationCreateSerializer,
    MessageSerializer, MessageCreateSerializer, MessageReceiptSerializer,
    TypingIndicatorSerializer
)
from apps.utils.permissions import IsParticipantOrReadOnly


class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversations.
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated, IsParticipantOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['is_active', 'related_booking', 'related_service']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-updated_at']
    
    def get_queryset(self):
        """
        Return conversations where the user is a participant.
        """
        user = self.request.user
        return Conversation.objects.filter(participants=user)
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        elif self.action == 'create':
            return ConversationCreateSerializer
        return ConversationSerializer
    
    def perform_create(self, serializer):
        serializer.save()
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """
        Get messages for a specific conversation with pagination.
        """
        conversation = self.get_object()
        
        # Get pagination parameters
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        
        try:
            page = int(page)
            page_size = int(page_size)
        except (TypeError, ValueError):
            page = 1
            page_size = 20
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Get messages with pagination
        messages = conversation.messages.filter(
            is_deleted=False
        ).order_by('-created_at')[offset:offset + page_size]
        
        # Serialize messages
        serializer = MessageSerializer(messages, many=True)
        
        # Mark messages as read
        for message in messages:
            if message.sender != request.user:
                receipt, created = MessageReceipt.objects.get_or_create(
                    message=message,
                    user=request.user,
                    defaults={'is_read': True, 'read_at': timezone.now()}
                )
                if not receipt.is_read:
                    receipt.mark_as_read()
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """
        Get conversations with unread messages.
        """
        user = request.user
        
        # Get conversations with unread messages
        conversations = Conversation.objects.filter(
            participants=user,
            messages__isnull=False
        ).exclude(
            messages__receipts__user=user,
            messages__receipts__is_read=True
        ).distinct()
        
        serializer = self.get_serializer(conversations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Mark all messages in a conversation as read.
        """
        conversation = self.get_object()
        user = request.user
        
        # Get all unread messages in the conversation
        unread_messages = Message.objects.filter(
            conversation=conversation,
            is_deleted=False
        ).exclude(
            receipts__user=user,
            receipts__is_read=True
        )
        
        # Mark all as read
        for message in unread_messages:
            receipt, created = MessageReceipt.objects.get_or_create(
                message=message,
                user=user,
                defaults={'is_read': True, 'read_at': timezone.now()}
            )
            if not receipt.is_read:
                receipt.mark_as_read()
        
        return Response({'status': 'messages marked as read'})


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing messages.
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['conversation', 'sender', 'message_type', 'is_edited', 'is_deleted']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Return messages from conversations where the user is a participant.
        """
        user = self.request.user
        return Message.objects.filter(conversation__participants=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer
    
    def perform_create(self, serializer):
        """
        Create a message and mark it as delivered for the sender.
        """
        message = serializer.save(sender=self.request.user)
        
        # Create a receipt for the sender
        MessageReceipt.objects.create(
            message=message,
            user=self.request.user,
            is_read=True,
            read_at=timezone.now()
        )
        
        # Update conversation timestamp
        conversation = message.conversation
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=['updated_at'])
    
    @action(detail=True, methods=['post'])
    def edit(self, request, pk=None):
        """
        Edit a message.
        """
        message = self.get_object()
        
        # Check if the user is the sender
        if message.sender != request.user:
            return Response(
                {'detail': 'You can only edit your own messages.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get new content
        content = request.data.get('content')
        if not content:
            return Response(
                {'detail': 'Content is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Edit the message
        message.edit(content)
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def delete(self, request, pk=None):
        """
        Soft delete a message.
        """
        message = self.get_object()
        
        # Check if the user is the sender
        if message.sender != request.user:
            return Response(
                {'detail': 'You can only delete your own messages.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Delete the message
        message.soft_delete()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Mark a message as read.
        """
        message = self.get_object()
        user = request.user
        
        # Create or update receipt
        receipt, created = MessageReceipt.objects.get_or_create(
            message=message,
            user=user,
            defaults={'is_read': True, 'read_at': timezone.now()}
        )
        
        if not receipt.is_read:
            receipt.mark_as_read()
        
        serializer = MessageReceiptSerializer(receipt)
        return Response(serializer.data)


class TypingIndicatorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing typing indicators.
    """
    serializer_class = TypingIndicatorSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return typing indicators for conversations where the user is a participant.
        """
        user = self.request.user
        return TypingIndicator.objects.filter(conversation__participants=user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def set_typing(self, request):
        """
        Set typing indicator for a conversation.
        """
        conversation_id = request.data.get('conversation')
        is_typing = request.data.get('is_typing', True)
        
        if not conversation_id:
            return Response(
                {'detail': 'Conversation ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user is a participant in the conversation
        try:
            conversation = Conversation.objects.get(id=conversation_id, participants=request.user)
        except Conversation.DoesNotExist:
            return Response(
                {'detail': 'Conversation not found or you are not a participant.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update or create typing indicator
        indicator, created = TypingIndicator.objects.update_or_create(
            conversation=conversation,
            user=request.user,
            defaults={'is_typing': is_typing}
        )
        
        serializer = self.get_serializer(indicator)
        return Response(serializer.data)
