"""
Messaging API views
"""
import logging

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
from users.models import User, UserFavoritePractitioner
from practitioners.models import Practitioner
from bookings.models import Booking

logger = logging.getLogger(__name__)


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
                queryset=Message.objects.select_related('sender').order_by('-created_at')
            )
        ).annotate(
            last_message_time=Max('messages__created_at'),
            unread_count=Count(
                'messages__receipts',
                filter=Q(messages__receipts__user=user, messages__receipts__is_read=False)
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
        
        # Check messaging permissions if user is a practitioner
        if hasattr(request.user, 'practitioner_profile'):
            practitioner = request.user.practitioner_profile
            
            # Get messaging permissions
            tier = 'basic'
            if hasattr(practitioner, 'current_subscription') and practitioner.current_subscription:
                tier = practitioner.current_subscription.tier.code if practitioner.current_subscription.tier else 'basic'
            
            permissions = {
                'basic': {'can_message_clients': True, 'can_message_favorites': False, 'can_message_subscribers': False},
                'professional': {'can_message_clients': True, 'can_message_favorites': True, 'can_message_subscribers': True},
                'premium': {'can_message_clients': True, 'can_message_favorites': True, 'can_message_subscribers': True}
            }.get(tier, {'can_message_clients': True, 'can_message_favorites': False, 'can_message_subscribers': False})
            
            # Check if practitioner can message this user
            can_message = False
            
            # Check client relationship
            if permissions['can_message_clients']:
                can_message = Booking.objects.filter(
                    practitioner=practitioner,
                    user=other_user,
                    status__in=['confirmed', 'completed']
                ).exists()
            
            # Check favorite relationship
            if not can_message and permissions['can_message_favorites']:
                try:
                    can_message = UserFavoritePractitioner.objects.filter(
                        practitioner=practitioner,
                        user=other_user
                    ).exists()
                except Exception:
                    pass
            
            if not can_message:
                return Response(
                    {"detail": "You don't have permission to message this user. Only clients and favorited users can be messaged based on your subscription tier."},
                    status=status.HTTP_403_FORBIDDEN
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
        ).select_related('sender').order_by('created_at')
        
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
        
        # Send WebSocket notification
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            if channel_layer:
                group_name = f"chat_{conversation.id}"
                
                # Prepare message data for WebSocket
                message_data = {
                    'id': str(message.id),
                    'conversation_id': str(conversation.id),
                    'sender': {
                        'id': message.sender.id,
                        'first_name': message.sender.first_name,
                        'last_name': message.sender.last_name,
                        'email': message.sender.email,
                    },
                    'content': message.content,
                    'message_type': message.message_type,
                    'created_at': message.created_at.isoformat(),
                }
                
                logger.info(f"Sending WebSocket message to group {group_name}: {message_data}")
                
                # Send to WebSocket group
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        'type': 'chat_message',
                        'data': message_data
                    }
                )
                logger.info(f"WebSocket message sent successfully to group {group_name}")
            else:
                logger.warning("Channel layer is not configured. WebSocket notification not sent.")
        except Exception as e:
            logger.error(f"Error sending WebSocket notification: {e}")
            # Don't fail the request if WebSocket notification fails
        
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


@extend_schema_view(
    eligible_contacts=extend_schema(
        tags=['Messaging'],
        summary='Get eligible messaging contacts',
        description='Get list of users/clients that the practitioner can message based on their subscription tier and relationships',
    ),
    can_message=extend_schema(
        tags=['Messaging'],
        summary='Check messaging permission',
        description='Check if the practitioner can message a specific user',
        parameters=[
            OpenApiParameter(
                name='user_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='User ID to check messaging permission for',
                required=True,
            ),
        ],
    ),
)
class PractitionerMessagingViewSet(viewsets.GenericViewSet):
    """
    ViewSet for practitioner-specific messaging functionality
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_practitioner(self):
        """Get the practitioner profile for the authenticated user"""
        if not hasattr(self.request.user, 'practitioner_profile'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only practitioners can access this endpoint")
        return self.request.user.practitioner_profile
    
    def get_subscription_tier(self, practitioner):
        """Get the practitioner's current subscription tier"""
        if hasattr(practitioner, 'current_subscription') and practitioner.current_subscription:
            return practitioner.current_subscription.tier.code if practitioner.current_subscription.tier else 'basic'
        return 'basic'
    
    def get_messaging_permissions(self, practitioner):
        """Get messaging permissions based on subscription tier"""
        tier = self.get_subscription_tier(practitioner)
        
        permissions = {
            'basic': {
                'can_message_clients': True,          # Users with completed bookings
                'can_message_favorites': False,       # Users who favorited practitioner
                'can_message_subscribers': False,     # Stream subscribers
                'message_limit_per_day': 50,          # Daily message limit
            },
            'professional': {
                'can_message_clients': True,
                'can_message_favorites': True,        # Can message users who favorited them
                'can_message_subscribers': True,      # Can message stream subscribers
                'message_limit_per_day': 200,
            },
            'premium': {
                'can_message_clients': True,
                'can_message_favorites': True,
                'can_message_subscribers': True,
                'message_limit_per_day': 1000,        # High limit for premium users
            }
        }
        
        return permissions.get(tier, permissions['basic'])
    
    def get_eligible_users(self, practitioner, permissions):
        """Get list of users the practitioner can message"""
        eligible_users = set()
        
        logger.info(f"Getting eligible users for practitioner: {practitioner} (ID: {practitioner.id})")
        logger.info(f"Permissions: {permissions}")
        
        # 1. Clients (users with completed or confirmed bookings)
        if permissions['can_message_clients']:
            client_bookings = Booking.objects.filter(
                practitioner=practitioner,
                status__in=['confirmed', 'completed']
            ).select_related('user').distinct()
            
            logger.info(f"Found {client_bookings.count()} client bookings")
            
            for booking in client_bookings:
                eligible_users.add(booking.user)
                logger.info(f"Added client: {booking.user.email}")
        
        # 2. Users who favorited this practitioner
        if permissions['can_message_favorites']:
            try:
                favorites = UserFavoritePractitioner.objects.filter(
                    practitioner=practitioner
                ).select_related('user')
                
                logger.info(f"Found {favorites.count()} users who favorited practitioner")
                
                for favorite in favorites:
                    eligible_users.add(favorite.user)
                    logger.info(f"Added favorite user: {favorite.user.email}")
            except Exception as e:
                # Handle case where UserFavoritePractitioner model might be in different app
                logger.error(f"Error querying UserFavoritePractitioner: {e}")
                pass
        
        # 3. Stream subscribers (if streams app exists)
        if permissions['can_message_subscribers']:
            try:
                from streams.models import StreamSubscription, Stream
                # Debug: Log the query
                logger.info(f"Querying StreamSubscription with practitioner={practitioner}")
                
                # First check if practitioner has a stream
                try:
                    stream = Stream.objects.get(practitioner=practitioner)
                    logger.info(f"Found stream: {stream.id}")
                    
                    # Then get active subscriptions for that stream
                    subscriptions = StreamSubscription.objects.filter(
                        stream=stream,
                        status='active'
                    ).select_related('user')
                    
                    logger.info(f"Found {subscriptions.count()} active subscriptions")
                    
                    for subscription in subscriptions:
                        eligible_users.add(subscription.user)
                except Stream.DoesNotExist:
                    logger.info("Practitioner has no stream")
                    
            except ImportError as e:
                # Streams app doesn't exist yet
                logger.info(f"Could not import StreamSubscription: {e}")
            except Exception as e:
                # Log any other errors
                logger.error(f"Error querying StreamSubscription: {e}")
                # Don't raise, just continue without stream subscribers
                pass
        
        logger.info(f"Total eligible users: {len(eligible_users)}")
        for user in eligible_users:
            logger.info(f"Eligible user: {user.email}")
        
        return list(eligible_users)
    
    @action(detail=False, methods=['get'])
    def eligible_contacts(self, request):
        """Get list of users that the practitioner can message"""
        practitioner = self.get_practitioner()
        permissions = self.get_messaging_permissions(practitioner)
        eligible_users = self.get_eligible_users(practitioner, permissions)
        
        # Serialize user data
        contacts = []
        for user in eligible_users:
            # Determine relationship type
            relationship_types = []
            
            # Check if client
            if Booking.objects.filter(
                practitioner=practitioner,
                user=user,
                status__in=['confirmed', 'completed']
            ).exists():
                relationship_types.append('client')
            
            # Check if favorited
            try:
                if UserFavoritePractitioner.objects.filter(practitioner=practitioner, user=user).exists():
                    relationship_types.append('favorite')
            except Exception:
                pass
            
            # Check for existing conversation
            existing_conversation = Conversation.objects.filter(
                conversation_type='direct',
                participants=practitioner.user
            ).filter(
                participants=user
            ).annotate(
                participant_count=Count('participants')
            ).filter(
                participant_count=2
            ).first()
            
            contacts.append({
                'id': user.id,
                'email': user.email,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                'avatar_url': getattr(user.profile, 'avatar_url', None) if hasattr(user, 'profile') else None,
                'relationship_types': relationship_types,
                'conversation_id': existing_conversation.id if existing_conversation else None,
                'last_message_at': existing_conversation.messages.first().created_at if existing_conversation and existing_conversation.messages.exists() else None,
            })
        
        # Sort by last message time, then by name
        contacts.sort(key=lambda x: (
            x['last_message_at'] is None,  # Put conversations with messages first
            -(x['last_message_at'].timestamp() if x['last_message_at'] else 0),
            x['full_name'].lower()
        ))
        
        return Response({
            'contacts': contacts,
            'permissions': permissions,
            'subscription_tier': self.get_subscription_tier(practitioner)
        })
    
    @action(detail=False, methods=['get'])
    def can_message(self, request):
        """Check if practitioner can message a specific user"""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {"detail": "user_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        practitioner = self.get_practitioner()
        permissions = self.get_messaging_permissions(practitioner)
        eligible_users = self.get_eligible_users(practitioner, permissions)
        
        can_message = target_user in eligible_users
        
        # Determine why they can/can't message
        reasons = []
        if can_message:
            if Booking.objects.filter(
                practitioner=practitioner,
                user=target_user,
                status__in=['confirmed', 'completed']
            ).exists():
                reasons.append('client')
            
            try:
                if UserFavoritePractitioner.objects.filter(practitioner=practitioner, user=target_user).exists():
                    reasons.append('favorite')
            except Exception:
                pass
        else:
            reasons.append('no_relationship')
        
        return Response({
            'can_message': can_message,
            'reasons': reasons,
            'subscription_tier': self.get_subscription_tier(practitioner),
            'permissions': permissions
        })