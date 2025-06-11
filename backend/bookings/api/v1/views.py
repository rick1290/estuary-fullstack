"""
Booking viewsets for DRF API
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Prefetch
from django.utils import timezone
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend

from bookings.models import (
    Booking, BookingNote, BookingFactory
)
from bookings.api.v1.serializers import (
    BookingListSerializer, BookingDetailSerializer,
    BookingCreateSerializer, BookingUpdateSerializer,
    BookingStatusChangeSerializer, BookingRescheduleSerializer,
    BookingFilterSerializer, BookingNoteSerializer,
    AvailabilityCheckSerializer, AvailableSlotSerializer
)
from services.models import Service
from core.api.permissions import IsPractitioner
from practitioners.utils.availability import get_practitioner_availability


class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bookings.
    
    Endpoints:
    - GET /bookings/ - List bookings (filtered by user role)
    - POST /bookings/ - Create a new booking
    - GET /bookings/{id}/ - Get booking details
    - PATCH /bookings/{id}/ - Update booking details
    - DELETE /bookings/{id}/ - Cancel booking
    - POST /bookings/{id}/confirm/ - Confirm booking (after payment)
    - POST /bookings/{id}/cancel/ - Cancel booking with reason
    - POST /bookings/{id}/complete/ - Mark booking as completed
    - POST /bookings/{id}/no-show/ - Mark as no-show
    - POST /bookings/{id}/reschedule/ - Reschedule booking
    - POST /bookings/{id}/notes/ - Add note to booking
    - POST /bookings/check-availability/ - Check practitioner availability
    """
    serializer_class = BookingDetailSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_status', 'practitioner', 'service']
    search_fields = ['title', 'description', 'service__name', 'practitioner__user__first_name',
                     'practitioner__user__last_name', 'practitioner__display_name']
    ordering_fields = ['start_time', 'created_at', 'price_charged_cents']
    ordering = ['-start_time']
    
    def get_queryset(self):
        """Get bookings based on user role"""
        user = self.request.user
        
        # Base queryset with optimized relations
        queryset = Booking.objects.select_related(
            'user', 'practitioner__user', 'service', 'location',
            'room', 'service_session', 'parent_booking',
            'rescheduled_from', 'payment_transaction'
        ).prefetch_related(
            'reminders', 'notes__author',
            Prefetch('child_bookings', queryset=Booking.objects.select_related(
                'service', 'practitioner__user'
            ))
        )
        
        # Filter based on user role
        if hasattr(user, 'practitioner_profile') and user.practitioner_profile.is_active:
            # Practitioner sees their appointments and their own bookings
            queryset = queryset.filter(
                Q(practitioner=user.practitioner_profile) | Q(user=user)
            )
        else:
            # Regular users see only their bookings
            queryset = queryset.filter(user=user)
        
        # Apply additional filters from query params
        filter_serializer = BookingFilterSerializer(data=self.request.query_params)
        if filter_serializer.is_valid():
            filters = filter_serializer.validated_data
            
            # Status filter
            if 'status' in filters:
                queryset = queryset.filter(status__in=filters['status'])
            
            # Payment status filter
            if 'payment_status' in filters:
                queryset = queryset.filter(payment_status__in=filters['payment_status'])
            
            # Date range filter
            if 'start_date' in filters:
                queryset = queryset.filter(start_time__date__gte=filters['start_date'])
            if 'end_date' in filters:
                queryset = queryset.filter(start_time__date__lte=filters['end_date'])
            
            # Booking type filter
            if 'booking_type' in filters:
                booking_type = filters['booking_type']
                if booking_type == 'individual':
                    queryset = queryset.filter(
                        service_session__isnull=True,
                        is_package_purchase=False,
                        is_bundle_purchase=False,
                        service__is_course=False
                    )
                elif booking_type == 'group':
                    queryset = queryset.filter(service_session__isnull=False)
                elif booking_type == 'package':
                    queryset = queryset.filter(
                        Q(is_package_purchase=True) | Q(service__is_package=True)
                    )
                elif booking_type == 'bundle':
                    queryset = queryset.filter(
                        Q(is_bundle_purchase=True) | Q(service__is_bundle=True)
                    )
                elif booking_type == 'course':
                    queryset = queryset.filter(service__is_course=True)
            
            # Upcoming filter
            if filters.get('is_upcoming'):
                queryset = queryset.filter(
                    start_time__gt=timezone.now(),
                    status='confirmed'
                )
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return BookingListSerializer
        elif self.action == 'create':
            return BookingCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BookingUpdateSerializer
        elif self.action == 'change_status':
            return BookingStatusChangeSerializer
        elif self.action == 'reschedule':
            return BookingRescheduleSerializer
        elif self.action == 'add_note':
            return BookingNoteSerializer
        elif self.action == 'check_availability':
            return AvailabilityCheckSerializer
        return super().get_serializer_class()
    
    def perform_create(self, serializer):
        """Create booking with user context"""
        serializer.save()
    
    def destroy(self, request, *args, **kwargs):  # pylint: disable=unused-argument
        """Override destroy to cancel booking instead of deleting"""
        booking = self.get_object()
        
        # Check if booking can be canceled
        if not booking.can_be_canceled:
            return Response(
                {"detail": "This booking cannot be canceled"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cancel the booking
        booking.cancel(reason="Canceled by user", canceled_by='client')
        
        return Response(
            {"message": "Booking canceled successfully"},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm booking after payment"""
        booking = self.get_object()
        
        # Validate transition
        if not booking.can_transition_to('confirmed'):
            return Response(
                {"detail": f"Cannot confirm booking in status '{booking.status}'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Confirm booking
        with transaction.atomic():
            booking.transition_to('confirmed')
            booking.payment_status = 'paid'
            booking.save()
        
        serializer = BookingDetailSerializer(booking, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel booking with reason"""
        booking = self.get_object()
        serializer = BookingStatusChangeSerializer(
            data={'status': 'canceled', **request.data},
            context={'booking': booking}
        )
        serializer.is_valid(raise_exception=True)
        
        # Cancel booking
        booking.cancel(
            reason=serializer.validated_data.get('reason'),
            canceled_by=serializer.validated_data.get('canceled_by', 'client')
        )
        
        return Response(
            {"message": "Booking canceled successfully"},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsPractitioner])
    def complete(self, request, pk=None):
        """Mark booking as completed (practitioner only)"""
        booking = self.get_object()
        
        # Ensure practitioner owns this booking
        if booking.practitioner.user != request.user:
            return Response(
                {"detail": "You can only complete your own bookings"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Complete booking
        try:
            booking.mark_completed()
            serializer = BookingDetailSerializer(booking, context={'request': request})
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsPractitioner])
    def no_show(self, request, pk=None):
        """Mark booking as no-show (practitioner only)"""
        booking = self.get_object()
        
        # Ensure practitioner owns this booking
        if booking.practitioner.user != request.user:
            return Response(
                {"detail": "You can only mark your own bookings as no-show"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mark as no-show
        try:
            booking.mark_no_show()
            serializer = BookingDetailSerializer(booking, context={'request': request})
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule booking to new time"""
        booking = self.get_object()
        serializer = BookingRescheduleSerializer(
            data=request.data,
            context={'booking': booking}
        )
        serializer.is_valid(raise_exception=True)
        
        # Reschedule booking
        try:
            new_booking = booking.reschedule(
                new_start_time=serializer.validated_data['start_time'],
                new_end_time=serializer.validated_data['end_time']
            )
            
            response_serializer = BookingDetailSerializer(
                new_booking,
                context={'request': request}
            )
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post', 'get'])
    def notes(self, request, pk=None):
        """Get or add notes to booking"""
        booking = self.get_object()
        
        if request.method == 'GET':
            # Get notes (filter private notes for non-practitioners)
            notes = booking.notes.all()
            if not hasattr(request.user, 'practitioner_profile'):
                notes = notes.filter(is_private=False)
            
            serializer = BookingNoteSerializer(notes, many=True)
            return Response(serializer.data)
        
        else:  # POST
            # Add note
            serializer = BookingNoteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Check if user can add private notes
            is_private = serializer.validated_data.get('is_private', False)
            if is_private and not hasattr(request.user, 'practitioner_profile'):
                return Response(
                    {"detail": "Only practitioners can add private notes"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Create note
            note = BookingNote.objects.create(
                booking=booking,
                author=request.user,
                **serializer.validated_data
            )
            
            response_serializer = BookingNoteSerializer(note)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def check_availability(self, request):
        """Check practitioner availability for a service"""
        serializer = AvailabilityCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        practitioner = serializer.validated_data['practitioner']
        service = serializer.validated_data['service']
        date = serializer.validated_data['date']
        
        # Get available slots
        available_slots = get_practitioner_availability(
            practitioner=practitioner,
            date=date,
            service_duration=service.duration_minutes,
            timezone_str=serializer.validated_data['timezone']
        )
        
        # Format response
        slot_serializer = AvailableSlotSerializer(available_slots, many=True)
        return Response({
            'practitioner_id': practitioner.id,
            'service_id': service.id,
            'date': date,
            'timezone': serializer.validated_data['timezone'],
            'duration_minutes': service.duration_minutes,
            'available_slots': slot_serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def create_package(self, request):
        """Create a package booking"""
        # Extract package service ID
        service_id = request.data.get('service_id')
        if not service_id:
            return Response(
                {"detail": "service_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = Service.objects.get(id=service_id, is_active=True)
            if not service.is_package:
                return Response(
                    {"detail": "Service must be a package type"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Service.DoesNotExist:
            return Response(
                {"detail": "Invalid service"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create package booking
        try:
            with transaction.atomic():
                booking = BookingFactory.create_package_booking(
                    user=request.user,
                    package_service=service,
                    status='pending_payment'
                )
                
                serializer = BookingDetailSerializer(booking, context={'request': request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def create_bundle(self, request):
        """Create a bundle booking"""
        # Extract bundle service ID
        service_id = request.data.get('service_id')
        if not service_id:
            return Response(
                {"detail": "service_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = Service.objects.get(id=service_id, is_active=True)
            if not service.is_bundle:
                return Response(
                    {"detail": "Service must be a bundle type"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Service.DoesNotExist:
            return Response(
                {"detail": "Invalid service"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create bundle booking
        try:
            with transaction.atomic():
                booking = BookingFactory.create_bundle_booking(
                    user=request.user,
                    bundle_service=service,
                    status='pending_payment'
                )
                
                serializer = BookingDetailSerializer(booking, context={'request': request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def create_course(self, request):
        """Create a course booking"""
        # Extract course service ID
        service_id = request.data.get('service_id')
        if not service_id:
            return Response(
                {"detail": "service_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = Service.objects.get(id=service_id, is_active=True)
            if not service.is_course:
                return Response(
                    {"detail": "Service must be a course type"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Service.DoesNotExist:
            return Response(
                {"detail": "Invalid service"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create course booking
        try:
            with transaction.atomic():
                booking = BookingFactory.create_course_booking(
                    user=request.user,
                    course=service,
                    status='pending_payment'
                )
                
                serializer = BookingDetailSerializer(booking, context={'request': request})
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )