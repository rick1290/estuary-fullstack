from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.utils import timezone

from apps.rooms.models import Room, VideoToken, RoomBookingRelation
from apps.rooms.api.v1.serializers import (
    RoomSerializer, VideoTokenSerializer, VideoTokenCreateSerializer,
    RoomBookingRelationSerializer
)
from apps.utils.permissions import IsOwnerOrReadOnly, IsPractitionerOrReadOnly


class RoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing video rooms.
    """
    queryset = Room.objects.all().order_by('-created_at')
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'ended_at']
    ordering = ['-created_at']
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='booking_id', description='Filter rooms by booking ID', required=False, type=str),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        List rooms with optional filtering by booking ID.
        """
        booking_id = request.query_params.get('booking_id')
        queryset = self.get_queryset()
        
        if booking_id:
            # Filter rooms by booking ID through RoomBookingRelation
            room_ids = RoomBookingRelation.objects.filter(
                booking_id=booking_id
            ).values_list('room_id', flat=True)
            queryset = queryset.filter(id__in=room_ids)
        
        return super().list(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def tokens(self, request, pk=None):
        """
        Get all tokens for a specific room.
        """
        room = self.get_object()
        tokens = VideoToken.objects.filter(room=room)
        serializer = VideoTokenSerializer(tokens, many=True)
        return Response(serializer.data)


class VideoTokenViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing video tokens.
    """
    queryset = VideoToken.objects.all().order_by('-expires_at')
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'room', 'booking', 'role', 'is_used', 'is_revoked']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VideoTokenCreateSerializer
        return VideoTokenSerializer
    
    def get_queryset(self):
        """
        Filter tokens based on user permissions:
        - Practitioners can see all tokens for their rooms
        - Users can only see their own tokens
        """
        user = self.request.user
        queryset = super().get_queryset()
        
        if hasattr(user, 'practitioner_profile'):
            # Practitioners can see all tokens for their rooms
            practitioner_bookings = user.practitioner_profile.bookings.all()
            return queryset.filter(booking__in=practitioner_bookings)
        
        # Regular users can only see their own tokens
        return queryset.filter(user=user)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get all active tokens for the current user.
        """
        tokens = VideoToken.objects.filter(
            user=request.user,
            is_used=False,
            is_revoked=False,
            expires_at__gt=timezone.now()
        )
        serializer = VideoTokenSerializer(tokens, many=True)
        return Response(serializer.data)


class RoomBookingRelationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing room-booking relations.
    """
    queryset = RoomBookingRelation.objects.all().order_by('-created_at')
    serializer_class = RoomBookingRelationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['room', 'booking']
    
    def get_queryset(self):
        """
        Filter relations based on user permissions:
        - Practitioners can see all relations for their bookings
        - Users can only see relations for their own bookings
        """
        user = self.request.user
        queryset = super().get_queryset()
        
        if hasattr(user, 'practitioner_profile'):
            # Practitioners can see all relations for their bookings
            practitioner_bookings = user.practitioner_profile.bookings.all()
            return queryset.filter(booking__in=practitioner_bookings)
        
        # Regular users can only see relations for their own bookings
        return queryset.filter(booking__user=user)
