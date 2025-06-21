"""
Messaging API views
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Max, Count, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from messaging.models import Conversation, Message, MessageReceipt
from messaging.api.v1.serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    SimpleConversationCreateSerializer,
)
from users.models import User
from practitioners.models import Practitioner


@extend_schema_view(
    list=extend_schema(
        tags=['Messaging'],
        summary='List conversations',
        description='Get all conversations for the authenticated user',
        parameters=[
            OpenApiParameter(
                name='unread_only',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Filter to show only conversations with unread messages',
            ),
        ],
    ),
    create=extend_schema(
        tags=['Messaging'],
        summary='Start new conversation',
        description='Create a new conversation with another user',
    ),
    retrieve=extend_schema(
        tags=['Messaging'],
        summary='Get conversation details',
        description='Get details of a specific conversation including recent messages',
    ),
    messages=extend_schema(
        tags=['Messaging'],
        summary='Get conversation messages',
        description='Get paginated messages for a conversation',
        parameters=[
            OpenApiParameter(
                name='before_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Get messages before this message ID (for pagination)',
            ),
        ],
    ),
    send_message=extend_schema(
        tags=['Messaging'],
        summary='Send message',
        description='Send a new message in a conversation',
    ),
    mark_read=extend_schema(
        tags=['Messaging'],
        summary='Mark messages as read',
        description='Mark all messages in a conversation as read',
    ),
)
class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing conversations and messages
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationDetailSerializer
    
    def get_queryset(self):
        """Get conversations for the authenticated user"""
        user = self.request.user
        
        # Base queryset with optimizations
        queryset = Conversation.objects.filter(
            participants=user,
            is_active=True
        ).prefetch_related(
            'participants',
            'participants__practitioner_profile',
            Prefetch(
                'messages',
                queryset=Message.objects.select_related('sender').order_by('-created_at')[:1]
            )
        ).annotate(
            last_message_time=Max('messages__created_at'),
            unread_count=Count(
                'messages__messagereceipts',
                filter=Q(messages__messagereceipts__user=user, messages__messagereceipts__is_read=False)
            )
        ).order_by('-last_message_time')
        
        # Filter by unread if requested
        if self.request.query_params.get('unread_only') == 'true':
            queryset = queryset.filter(unread_count__gt=0)
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return ConversationListSerializer
        elif self.action == 'create':
            return SimpleConversationCreateSerializer
        elif self.action in ['messages', 'send_message']:
            return MessageSerializer
        return super().get_serializer_class()
    
    def create(self, request):
        """Create a new conversation"""
        serializer = SimpleConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        other_user_id = serializer.validated_data['other_user_id']
        
        # Get the other user
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if conversation already exists (direct conversation between two users)
        existing = Conversation.objects.filter(
            conversation_type='direct',
            participants=request.user
        ).filter(
            participants=other_user
        ).annotate(
            participant_count=Count('participants')
        ).filter(
            participant_count=2
        ).first()
        
        if existing:
            # Return existing conversation
            response_serializer = ConversationDetailSerializer(
                existing,
                context={'request': request}
            )
            return Response(response_serializer.data)
        
        # Create new conversation
        conversation = Conversation.objects.create(
            conversation_type='direct',
            title=''
        )
        
        # Add participants
        conversation.participants.add(request.user, other_user)
        
        # Add initial message if provided
        initial_message = serializer.validated_data.get('initial_message')
        if initial_message:
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=initial_message
            )
        
        response_serializer = ConversationDetailSerializer(
            conversation,
            context={'request': request}
        )
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get paginated messages for a conversation"""
        conversation = self.get_object()
        
        # Get messages
        messages = Message.objects.filter(
            conversation=conversation
        ).select_related('sender').order_by('-created_at')
        
        # Filter by before_id if provided (for pagination)
        before_id = request.query_params.get('before_id')
        if before_id:
            messages = messages.filter(id__lt=before_id)
        
        # Limit to 50 messages per request
        messages = messages[:50]
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message in a conversation"""
        conversation = self.get_object()
        
        # Validate message data
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create message
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=serializer.validated_data['content']
        )
        
        response_serializer = MessageSerializer(message)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages in conversation as read"""
        conversation = self.get_object()
        
        # Update message receipts for current user
        MessageReceipt.objects.filter(
            message__conversation=conversation,
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({"status": "Messages marked as read"})


@extend_schema_view(
    unread_count=extend_schema(
        tags=['Messaging'],
        summary='Get unread message count',
        description='Get total count of unread messages across all conversations',
    ),
)
class MessageViewSet(viewsets.GenericViewSet):
    """
    ViewSet for message-related actions
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get total unread message count"""
        count = MessageReceipt.objects.filter(
            user=request.user,
            is_read=False,
            message__conversation__participants=request.user
        ).count()
        
        return Response({"unread_count": count})