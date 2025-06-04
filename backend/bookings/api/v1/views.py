from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers
from apps.bookings.models import Booking, BookingReminders
from apps.bookings.api.v1.serializers import (
    BookingListSerializer,
    BookingDetailSerializer,
    BookingCreateSerializer,
    BookingUpdateSerializer,
    BookingReminderSerializer
)

# Create a paginated response serializer
class PaginatedBookingListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = BookingListSerializer(many=True)

class BookingViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing bookings.
    """
    queryset = Booking.objects.all().order_by('-start_time')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['practitioner', 'user', 'status', 'service', 'service_session', 'is_group']
    search_fields = ['title', 'description', 'note']
    ordering_fields = ['start_time', 'created_at', 'status']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BookingUpdateSerializer
        elif self.action == 'list':
            return BookingListSerializer
        return BookingDetailSerializer
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='upcoming', description='Filter for upcoming bookings', type=bool),
            OpenApiParameter(name='past', description='Filter for past bookings', type=bool),
            OpenApiParameter(name='status', description='Filter by booking status', type=str),
        ],
        responses={
            200: OpenApiResponse(
                response=PaginatedBookingListSerializer,
                description='List of bookings'
            )
        }
    )
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Additional filtering based on query parameters
        upcoming = request.query_params.get('upcoming')
        past = request.query_params.get('past')
        
        if upcoming == 'true':
            from django.utils import timezone
            queryset = queryset.filter(start_time__gte=timezone.now())
        
        if past == 'true':
            from django.utils import timezone
            queryset = queryset.filter(start_time__lt=timezone.now())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=PaginatedBookingListSerializer,
                description='List of bookings for the current user'
            )
        }
    )
    @action(detail=False, methods=['get'])
    def user_bookings(self, request):
        """
        Return bookings for the current authenticated user.
        """
        user = request.user
        queryset = self.filter_queryset(self.get_queryset().filter(user=user))
        
        # Filter by status if provided
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by upcoming/past
        upcoming = request.query_params.get('upcoming')
        past = request.query_params.get('past')
        
        if upcoming == 'true':
            from django.utils import timezone
            queryset = queryset.filter(start_time__gte=timezone.now())
        
        if past == 'true':
            from django.utils import timezone
            queryset = queryset.filter(start_time__lt=timezone.now())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        responses={
            200: OpenApiResponse(
                response=PaginatedBookingListSerializer,
                description='List of bookings for the practitioner'
            )
        }
    )
    @action(detail=False, methods=['get'])
    def practitioner_bookings(self, request):
        """
        Return bookings for the practitioner associated with the current authenticated user.
        """
        user = request.user
        try:
            practitioner = user.practitioner_profile
            queryset = self.filter_queryset(self.get_queryset().filter(practitioner=practitioner))
            
            # Filter by status if provided
            status_param = request.query_params.get('status')
            if status_param:
                queryset = queryset.filter(status=status_param)
            
            # Filter by upcoming/past
            upcoming = request.query_params.get('upcoming')
            past = request.query_params.get('past')
            
            if upcoming == 'true':
                from django.utils import timezone
                queryset = queryset.filter(start_time__gte=timezone.now())
            
            if past == 'true':
                from django.utils import timezone
                queryset = queryset.filter(start_time__lt=timezone.now())
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            else:
                serializer = self.get_serializer(queryset, many=True)
                return Response(serializer.data)
        except:
            return Response(
                {"error": "User is not associated with a practitioner profile."},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel a booking.
        """
        booking = self.get_object()
        reason = request.data.get('reason', '')
        canceled_by = request.user.email
        
        booking.cancel(reason=reason, canceled_by=canceled_by)
        
        serializer = self.get_serializer(booking)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark a booking as completed.
        """
        booking = self.get_object()
        booking.mark_completed()
        
        serializer = self.get_serializer(booking)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def child_bookings(self, request, pk=None):
        """
        Get all child bookings for a parent booking.
        """
        booking = self.get_object()
        if not booking.is_parent_booking:
            return Response(
                {"error": "This booking is not a parent booking."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        child_bookings = booking.child_bookings.all()
        serializer = BookingListSerializer(child_bookings, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def sessions(self, request, pk=None):
        """
        Get all sessions associated with this booking.
        For course bookings, this returns all sessions the user is registered for.
        """
        booking = self.get_object()
        
        if not booking.is_course_booking:
            return Response(
                {"error": "This endpoint is only available for course bookings."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.services.api.v1.serializers import ServiceSessionSerializer
        sessions = booking.sessions
        serializer = ServiceSessionSerializer(sessions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def session_participants(self, request, pk=None):
        """
        Get all session participants associated with this booking.
        This is particularly useful for course bookings.
        """
        booking = self.get_object()
        
        if not booking.is_course_booking:
            return Response(
                {"error": "This endpoint is only available for course bookings."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.services.api.v1.serializers import SessionParticipantSerializer
        participants = booking.session_participants
        serializer = SessionParticipantSerializer(participants, many=True)
        return Response(serializer.data)


class BookingReminderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing booking reminders.
    """
    queryset = BookingReminders.objects.all()
    serializer_class = BookingReminderSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['booking', 'type', 'sent_at']
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        Get all pending reminders (scheduled but not sent).
        """
        from django.utils import timezone
        queryset = self.get_queryset().filter(
            sent_at__isnull=True,
            scheduled_time__gte=timezone.now()
        )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
