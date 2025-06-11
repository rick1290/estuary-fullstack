from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q, F, Count, Sum
from django.shortcuts import get_object_or_404

from streams.models import (
    Stream, StreamPost, StreamSubscription,
    LiveStream, StreamSchedule, LiveStreamViewer, LiveStreamAnalytics,
    StreamCategory, StreamAnalytics
)
from rooms.models import Room, RoomTemplate, RoomToken, RoomRecording
from rooms.livekit.tokens import generate_room_token
from .serializers import (
    StreamSerializer, StreamPostSerializer, StreamSubscriptionSerializer,
    LiveStreamSerializer, LiveStreamCreateSerializer, StreamScheduleSerializer,
    LiveStreamViewerSerializer, LiveStreamAnalyticsSerializer,
    StreamCategorySerializer, StreamAnalyticsSerializer,
    RoomRecordingSerializer
)
from .permissions import IsPractitionerOwner, IsStreamOwner, CanAccessStream


class StreamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing content streams.
    """
    serializer_class = StreamSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'is_featured', 'practitioner', 'categories']
    search_fields = ['title', 'tagline', 'description', 'practitioner__display_name']
    ordering_fields = ['created_at', 'subscriber_count', 'post_count']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = Stream.objects.select_related('practitioner').prefetch_related('categories')
        
        # Filter by launched status
        if self.request.query_params.get('launched_only') == 'true':
            queryset = queryset.filter(launched_at__isnull=False, launched_at__lte=timezone.now())
        
        # Filter by subscription status for authenticated users
        if self.request.user.is_authenticated:
            subscribed = self.request.query_params.get('subscribed')
            if subscribed == 'true':
                queryset = queryset.filter(
                    subscriptions__user=self.request.user,
                    subscriptions__status='active'
                )
            elif subscribed == 'false':
                queryset = queryset.exclude(
                    subscriptions__user=self.request.user,
                    subscriptions__status='active'
                )
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsPractitionerOwner()]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsStreamOwner])
    def launch(self, request, pk=None):
        """Launch a stream, making it publicly visible."""
        stream = self.get_object()
        
        if stream.is_launched:
            return Response(
                {'error': 'Stream is already launched'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stream.launched_at = timezone.now()
        stream.save()
        
        return Response({
            'message': 'Stream launched successfully',
            'launched_at': stream.launched_at
        })
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a stream."""
        stream = self.get_object()
        
        # Check permissions
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timezone.timedelta(days=days)
        
        analytics = stream.analytics.filter(
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        serializer = StreamAnalyticsSerializer(analytics, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def live_streams(self, request, pk=None):
        """Get live streams for a content stream."""
        stream = self.get_object()
        
        queryset = stream.live_streams.select_related('room', 'practitioner')
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by date range
        if request.query_params.get('upcoming') == 'true':
            queryset = queryset.filter(
                scheduled_start__gte=timezone.now(),
                status='scheduled'
            )
        
        queryset = queryset.order_by('-scheduled_start')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = LiveStreamSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = LiveStreamSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class LiveStreamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing live streaming sessions.
    """
    serializer_class = LiveStreamSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'stream', 'practitioner', 'tier_level', 'is_public']
    search_fields = ['title', 'description', 'tags']
    ordering_fields = ['scheduled_start', 'created_at', 'current_viewers']
    ordering = ['-scheduled_start']
    
    def get_queryset(self):
        queryset = LiveStream.objects.select_related(
            'stream', 'practitioner', 'room'
        ).prefetch_related('viewers')
        
        # Filter by time
        time_filter = self.request.query_params.get('time_filter')
        if time_filter == 'live':
            queryset = queryset.filter(status='live')
        elif time_filter == 'upcoming':
            queryset = queryset.filter(
                status='scheduled',
                scheduled_start__gte=timezone.now()
            )
        elif time_filter == 'past':
            queryset = queryset.filter(status='ended')
        
        # Filter by accessibility for user
        if self.request.user.is_authenticated:
            accessible = self.request.query_params.get('accessible')
            if accessible == 'true':
                # Complex query to check accessibility
                user_subscriptions = StreamSubscription.objects.filter(
                    user=self.request.user,
                    status='active'
                ).values_list('stream_id', 'tier')
                
                accessible_conditions = Q(is_public=True)
                for stream_id, tier in user_subscriptions:
                    if tier == 'premium':
                        accessible_conditions |= Q(stream_id=stream_id)
                    elif tier == 'entry':
                        accessible_conditions |= Q(stream_id=stream_id, tier_level__in=['free', 'entry'])
                    elif tier == 'free':
                        accessible_conditions |= Q(stream_id=stream_id, tier_level='free')
                
                queryset = queryset.filter(accessible_conditions)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsPractitionerOwner()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LiveStreamCreateSerializer
        return LiveStreamSerializer
    
    def perform_create(self, serializer):
        live_stream = serializer.save()
        
        # Create associated LiveKit room
        room_template = RoomTemplate.objects.filter(
            room_type='broadcast',
            is_active=True,
            is_default=True
        ).first()
        
        room = Room.objects.create(
            name=f"Live: {live_stream.title}",
            room_type='broadcast',
            template=room_template,
            scheduled_start=live_stream.scheduled_start,
            scheduled_end=live_stream.scheduled_end,
            recording_enabled=live_stream.record_stream
        )
        
        live_stream.room = room
        live_stream.save()
        
        # TODO: Schedule temporal workflow for stream reminders
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def go_live(self, request, pk=None):
        """Start a live stream."""
        live_stream = self.get_object()
        
        # Check permissions
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == live_stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        if not live_stream.can_start:
            return Response(
                {'error': 'Stream cannot be started yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if live_stream.status != 'scheduled':
            return Response(
                {'error': f'Stream is already {live_stream.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create LiveKit room if not exists
        if not live_stream.room:
            room_template = RoomTemplate.objects.filter(
                room_type='broadcast',
                is_active=True,
                is_default=True
            ).first()
            
            room = Room.objects.create(
                name=f"Live: {live_stream.title}",
                room_type='broadcast',
                template=room_template,
                scheduled_start=live_stream.scheduled_start,
                scheduled_end=live_stream.scheduled_end,
                recording_enabled=live_stream.record_stream
            )
            live_stream.room = room
        
        # Start the room in LiveKit
        # Note: For now, we'll skip the actual LiveKit API call since it requires async
        # In production, this would be handled by a background task or async view
        try:
            # Mark room as created in LiveKit
            live_stream.room.livekit_room_sid = f"RM_{live_stream.room.livekit_room_name}"
            
            live_stream.room.status = 'active'
            live_stream.room.actual_start = timezone.now()
            live_stream.room.save()
        except Exception as e:
            return Response(
                {'error': f'Failed to create room: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Update live stream status
        live_stream.status = 'live'
        live_stream.actual_start = timezone.now()
        live_stream.save()
        
        # Generate host token
        token = generate_room_token(
            room_name=live_stream.room.livekit_room_name,
            participant_name=request.user.get_full_name(),
            participant_identity=f"host-{request.user.id}",
            is_host=True
        )
        
        # Save token
        RoomToken.objects.create(
            room=live_stream.room,
            user=request.user,
            token=token['token'],
            identity=f"host-{request.user.id}",
            role='host',
            expires_at=timezone.now() + timezone.timedelta(hours=24)
        )
        
        return Response({
            'message': 'Stream is now live',
            'room': {
                'name': live_stream.room.livekit_room_name,
                'token': token['token'],
                'url': token['url']
            }
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def end_stream(self, request, pk=None):
        """End a live stream."""
        live_stream = self.get_object()
        
        # Check permissions
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == live_stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        if live_stream.status != 'live':
            return Response(
                {'error': 'Stream is not live'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # End the room in LiveKit
        if live_stream.room:
            # Note: For now, we'll skip the actual LiveKit API call since it requires async
            # In production, this would be handled by a background task or async view
            
            live_stream.room.status = 'ended'
            live_stream.room.actual_end = timezone.now()
            live_stream.room.save()
        
        # Update live stream status
        live_stream.status = 'ended'
        live_stream.actual_end = timezone.now()
        live_stream.save()
        
        # Update viewer records
        live_stream.viewers.filter(left_at__isnull=True).update(left_at=timezone.now())
        
        # Trigger analytics computation
        # TODO: Schedule temporal workflow for analytics
        
        return Response({
            'message': 'Stream ended successfully',
            'duration_minutes': live_stream.duration_minutes
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def join(self, request, pk=None):
        """Join a live stream as a viewer."""
        live_stream = self.get_object()
        
        # Check if user can access
        can_access = False
        if live_stream.is_public:
            can_access = True
        else:
            subscription = live_stream.stream.subscriptions.filter(
                user=request.user,
                status='active'
            ).first()
            if subscription and subscription.has_access_to_tier(live_stream.tier_level):
                can_access = True
        
        if not can_access:
            return Response(
                {'error': 'You do not have access to this stream'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if live_stream.status != 'live':
            return Response(
                {'error': 'Stream is not live'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create viewer record
        viewer, created = LiveStreamViewer.objects.get_or_create(
            live_stream=live_stream,
            user=request.user,
            left_at__isnull=True,
            defaults={
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            }
        )
        
        # Update viewer count
        if created:
            live_stream.current_viewers = F('current_viewers') + 1
            live_stream.total_viewers = F('total_viewers') + 1
            live_stream.save()
            
            # Update peak viewers if necessary
            if live_stream.current_viewers > live_stream.peak_viewers:
                live_stream.peak_viewers = live_stream.current_viewers
                live_stream.save()
        
        # Generate viewer token
        token = generate_room_token(
            room_name=live_stream.room.livekit_room_name,
            participant_name=request.user.get_full_name(),
            participant_identity=f"viewer-{request.user.id}",
            is_host=False
        )
        
        # Save token
        RoomToken.objects.create(
            room=live_stream.room,
            user=request.user,
            token=token['token'],
            identity=f"viewer-{request.user.id}",
            role='viewer',
            expires_at=timezone.now() + timezone.timedelta(hours=4)
        )
        
        return Response({
            'room': {
                'name': live_stream.room.livekit_room_name,
                'token': token['token'],
                'url': token['url']
            },
            'stream': {
                'title': live_stream.title,
                'current_viewers': live_stream.current_viewers
            }
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def leave(self, request, pk=None):
        """Leave a live stream."""
        live_stream = self.get_object()
        
        # Update viewer record
        viewer = LiveStreamViewer.objects.filter(
            live_stream=live_stream,
            user=request.user,
            left_at__isnull=True
        ).first()
        
        if viewer:
            viewer.left_at = timezone.now()
            viewer.save()
            
            # Update viewer count
            live_stream.current_viewers = F('current_viewers') - 1
            live_stream.save()
        
        return Response({'message': 'Left stream successfully'})
    
    @action(detail=True, methods=['get'])
    def viewers(self, request, pk=None):
        """Get current viewers of a live stream."""
        live_stream = self.get_object()
        
        # Check permissions (only host can see viewer list)
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == live_stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        viewers = live_stream.viewers.filter(
            left_at__isnull=True
        ).select_related('user')
        
        serializer = LiveStreamViewerSerializer(viewers, many=True)
        return Response({
            'count': viewers.count(),
            'viewers': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a live stream."""
        live_stream = self.get_object()
        
        # Check permissions
        if not (request.user.is_staff or 
                (hasattr(request.user, 'practitioner') and 
                 request.user.practitioner == live_stream.practitioner)):
            return Response(status=status.HTTP_403_FORBIDDEN)
        
        # Get or create analytics
        analytics, created = LiveStreamAnalytics.objects.get_or_create(
            live_stream=live_stream
        )
        
        if live_stream.status == 'ended' and not analytics.computed_at:
            # Compute analytics
            viewers = live_stream.viewers.all()
            
            analytics.total_viewers = viewers.count()
            analytics.unique_viewers = viewers.values('user').distinct().count()
            analytics.peak_concurrent_viewers = live_stream.peak_viewers
            
            # Calculate average view duration
            durations = viewers.exclude(duration_seconds=0).values_list('duration_seconds', flat=True)
            if durations:
                analytics.average_view_duration_seconds = sum(durations) / len(durations)
            
            # Engagement metrics
            analytics.total_chat_messages = viewers.aggregate(
                total=Count('chat_messages_sent')
            )['total'] or 0
            analytics.total_reactions = viewers.aggregate(
                total=Count('reactions_sent')
            )['total'] or 0
            analytics.unique_chatters = viewers.filter(
                chat_messages_sent__gt=0
            ).count()
            
            # Viewer breakdown by tier
            for viewer in viewers.select_related('user'):
                subscription = live_stream.stream.subscriptions.filter(
                    user=viewer.user,
                    status='active'
                ).first()
                
                if not subscription:
                    analytics.non_subscriber_viewers += 1
                elif subscription.tier == 'free':
                    analytics.free_tier_viewers += 1
                elif subscription.tier == 'entry':
                    analytics.entry_tier_viewers += 1
                elif subscription.tier == 'premium':
                    analytics.premium_tier_viewers += 1
            
            analytics.computed_at = timezone.now()
            analytics.save()
        
        serializer = LiveStreamAnalyticsSerializer(analytics)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def recordings(self, request, pk=None):
        """Get recordings for a live stream."""
        live_stream = self.get_object()
        
        if not live_stream.room:
            return Response({'recordings': []})
        
        recordings = live_stream.room.recordings.all()
        serializer = RoomRecordingSerializer(recordings, many=True)
        return Response({'recordings': serializer.data})


class StreamScheduleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing stream schedules.
    """
    serializer_class = StreamScheduleSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['stream', 'is_active', 'tier_level']
    ordering_fields = ['created_at', 'next_occurrence']
    ordering = ['next_occurrence']
    
    def get_queryset(self):
        queryset = StreamSchedule.objects.select_related('stream__practitioner')
        
        # Filter by practitioner if specified
        practitioner_id = self.request.query_params.get('practitioner')
        if practitioner_id:
            queryset = queryset.filter(stream__practitioner_id=practitioner_id)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsStreamOwner()]
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsStreamOwner])
    def generate_streams(self, request, pk=None):
        """Generate scheduled live streams from this schedule."""
        schedule = self.get_object()
        
        # TODO: Implement recurrence rule parsing and stream generation
        # This would typically be done by a background task
        
        return Response({
            'message': 'Stream generation scheduled',
            'schedule_id': schedule.id
        })


class StreamCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for stream categories (read-only).
    """
    queryset = StreamCategory.objects.filter(is_active=True).order_by('order', 'name')
    serializer_class = StreamCategorySerializer
    permission_classes = [AllowAny]
    
    @action(detail=True, methods=['get'])
    def streams(self, request, pk=None):
        """Get streams in this category."""
        category = self.get_object()
        streams = category.streams.filter(
            is_active=True,
            launched_at__isnull=False
        ).select_related('practitioner')
        
        page = self.paginate_queryset(streams)
        if page is not None:
            serializer = StreamSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = StreamSerializer(streams, many=True, context={'request': request})
        return Response(serializer.data)