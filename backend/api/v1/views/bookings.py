"""
DRF ViewSet for Bookings - Example of how much simpler CRUD can be with DRF
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction, models
from django.utils import timezone
from datetime import timedelta

from bookings.models import Booking
from api.v1.serializers.bookings import (
    BookingSerializer,
    BookingCreateSerializer,
    BookingUpdateSerializer,
    BookingListSerializer
)


class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bookings.
    
    Note how much simpler this is compared to FastAPI:
    - No async/sync wrapping needed
    - Automatic URL routing
    - Built-in pagination
    - Built-in filtering
    - Built-in permissions
    """
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['status', 'payment_status', 'service', 'practitioner', 'location']
    ordering_fields = ['start_time', 'created_at']
    ordering = ['-start_time']
    
    def get_queryset(self):
        """
        Filter bookings based on user role.
        Regular users only see their own bookings.
        """
        user = self.request.user
        
        if user.is_staff:
            return Booking.objects.all()
        
        # Check if user is a practitioner
        try:
            practitioner = user.practitioner
            # Return bookings where user is either customer or practitioner
            return Booking.objects.filter(
                models.Q(user=user) | models.Q(practitioner=practitioner)
            )
        except:
            # Regular user - only their bookings
            return Booking.objects.filter(user=user)
    
    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'create':
            return BookingCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BookingUpdateSerializer
        elif self.action == 'list':
            return BookingListSerializer
        return BookingSerializer
    
    @transaction.atomic
    def create(self, request):
        """
        Create a new booking.
        
        Compare this to the FastAPI version - no async complexity!
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get validated data
        service = serializer.validated_data['service']
        practitioner = serializer.validated_data['practitioner']
        location = serializer.validated_data.get('location')
        start_time = serializer.validated_data['start_datetime']
        
        # Validate practitioner offers this service
        if not (service.primary_practitioner == practitioner or 
                service.additional_practitioners.filter(id=practitioner.id).exists()):
            return Response(
                {"detail": "Practitioner does not offer this service"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate location for in-person services
        if not location and service.location_type == 'in_person':
            return Response(
                {"detail": "Location is required for in-person services"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate end time
        end_time = start_time + timedelta(minutes=service.duration_minutes)
        
        # Check for conflicts
        conflicts = Booking.objects.filter(
            practitioner=practitioner,
            status__in=['confirmed', 'pending_payment'],
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exists()
        
        if conflicts:
            return Response(
                {"detail": "Time slot not available"},
                status=status.HTTP_409_CONFLICT
            )
        
        # Create booking
        booking = Booking.objects.create(
            user=request.user,
            service=service,
            practitioner=practitioner,
            location=location,
            start_time=start_time,
            end_time=end_time,
            price_charged_cents=service.price_cents,
            final_amount_cents=service.price_cents,
            client_notes=serializer.validated_data.get('notes'),
            status='pending_payment',
            payment_status='unpaid'
        )
        
        # Return serialized booking
        output_serializer = BookingSerializer(booking)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a booking."""
        booking = self.get_object()
        
        # Check if user can cancel
        if not (request.user == booking.user or 
                request.user == booking.practitioner.user or
                request.user.is_staff):
            return Response(
                {"detail": "Not authorized to cancel this booking"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not booking.can_be_canceled:
            return Response(
                {"detail": "Booking cannot be cancelled"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cancel the booking
        reason = request.data.get('reason', '')
        cancelled_by = 'client' if request.user == booking.user else 'practitioner'
        
        booking.cancel(reason=reason, canceled_by=cancelled_by)
        
        serializer = BookingSerializer(booking)
        return Response(serializer.data)
    
    @action(detail=False)
    def upcoming(self, request):
        """Get upcoming bookings."""
        queryset = self.get_queryset().filter(
            start_time__gt=timezone.now(),
            status='confirmed'
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False)
    def stats(self, request):
        """Get booking statistics (staff only)."""
        if not request.user.is_staff:
            return Response(
                {"detail": "Not authorized"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        
        # Simple stats - no async needed!
        stats = {
            'total_bookings': queryset.count(),
            'completed_bookings': queryset.filter(status='completed').count(),
            'cancelled_bookings': queryset.filter(status='canceled').count(),
            'total_revenue': queryset.filter(
                payment_status='paid'
            ).aggregate(
                total=models.Sum('credits_allocated')
            )['total'] or 0,
        }
        
        return Response(stats)