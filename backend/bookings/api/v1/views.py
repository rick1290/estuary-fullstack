"""
Booking viewsets for DRF API
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.viewsets import GenericViewSet
from django.db.models import Q
from django.utils import timezone
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view

from bookings.models import (
    Booking, BookingNote, BookingFactory
)
from datetime import timedelta

from bookings.api.v1.serializers import (
    BookingListSerializer, BookingDetailSerializer,
    BookingCreateSerializer, BookingUpdateSerializer,
    BookingStatusChangeSerializer, BookingScheduleSerializer,
    BookingRescheduleSerializer, BookingNoteSerializer,
    AvailabilityCheckSerializer, AvailableSlotSerializer,
    AvailableDatesRequestSerializer,
    JourneyListResponseSerializer, JourneyDetailSerializer,
)
from bookings.api.v1.filters import BookingFilter
from services.models import Service
from core.api.permissions import IsPractitioner
from practitioners.utils.availability import get_practitioner_availability


@extend_schema_view(
    list=extend_schema(tags=['Bookings']),
    create=extend_schema(tags=['Bookings']),
    retrieve=extend_schema(tags=['Bookings']),
    update=extend_schema(tags=['Bookings']),
    partial_update=extend_schema(tags=['Bookings']),
    destroy=extend_schema(tags=['Bookings']),
    confirm=extend_schema(tags=['Bookings']),
    cancel=extend_schema(tags=['Bookings']),
    complete=extend_schema(tags=['Bookings']),
    no_show=extend_schema(tags=['Bookings']),
    schedule=extend_schema(tags=['Bookings']),
    reschedule=extend_schema(tags=['Bookings']),
    notes=extend_schema(tags=['Bookings']),
    check_availability=extend_schema(tags=['Bookings']),
    available_dates=extend_schema(tags=['Bookings']),
    create_bundle=extend_schema(tags=['Bookings']),
    create_package=extend_schema(tags=['Bookings']),
    create_course=extend_schema(tags=['Bookings']),
    journey=extend_schema(tags=['Bookings'])
)
class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bookings.

    Endpoints:
    - GET /bookings/ - List bookings (filtered by user role)
    - POST /bookings/ - Create a new booking
    - GET /bookings/{uuid}/ - Get booking details
    - PATCH /bookings/{uuid}/ - Update booking details
    - DELETE /bookings/{uuid}/ - Cancel booking
    - POST /bookings/{uuid}/confirm/ - Confirm booking (after payment)
    - POST /bookings/{uuid}/cancel/ - Cancel booking with reason
    - POST /bookings/{uuid}/complete/ - Mark booking as completed
    - POST /bookings/{uuid}/no-show/ - Mark as no-show
    - POST /bookings/{uuid}/schedule/ - Schedule an unscheduled draft booking
    - POST /bookings/{uuid}/reschedule/ - Reschedule booking (creates new booking)
    - POST /bookings/{uuid}/notes/ - Add note to booking
    - POST /bookings/check-availability/ - Check practitioner availability
    """
    lookup_field = 'public_uuid'
    serializer_class = BookingDetailSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = BookingFilter
    search_fields = ['service__name', 'practitioner__user__first_name',
                     'practitioner__user__last_name', 'practitioner__display_name',
                     'client_notes']
    ordering_fields = ['created_at', 'price_charged_cents', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """Get bookings based on user role"""
        user = self.request.user

        # Base queryset with optimized relations
        queryset = Booking.objects.select_related(
            'user', 'practitioner__user', 'service', 'service_session',
            'rescheduled_from', 'order'
        ).prefetch_related(
            'reminders', 'notes__author'
        )

        # Check if filtering by practitioner
        practitioner_filter = self.request.query_params.get('practitioner') or \
                             self.request.query_params.get('practitioner_id')

        # Filter based on user role
        if hasattr(user, 'practitioner_profile') and user.practitioner_profile.is_active:
            # If filtering by practitioner, only show practitioner bookings
            if practitioner_filter:
                queryset = queryset.filter(practitioner=user.practitioner_profile)
            else:
                # Otherwise show both practitioner appointments and own bookings
                queryset = queryset.filter(
                    Q(practitioner=user.practitioner_profile) | Q(user=user)
                )
        else:
            # Regular users see only their bookings
            queryset = queryset.filter(user=user)

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
        elif self.action == 'available_dates':
            return AvailableDatesRequestSerializer
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
    def schedule(self, request, pk=None):
        """Schedule an unscheduled draft booking (sets initial time)"""
        booking = self.get_object()
        serializer = BookingScheduleSerializer(
            data=request.data,
            context={'booking': booking}
        )
        serializer.is_valid(raise_exception=True)

        # Update booking with scheduled times
        try:
            with transaction.atomic():
                start_time = serializer.validated_data['start_time']
                end_time = serializer.validated_data['end_time']
                duration = int((end_time - start_time).total_seconds() / 60)

                # Update existing ServiceSession or create new one
                if booking.service_session:
                    # Update draft ServiceSession with actual times
                    booking.service_session.start_time = start_time
                    booking.service_session.end_time = end_time
                    booking.service_session.duration = duration
                    booking.service_session.current_participants = 1
                    booking.service_session.status = 'scheduled'
                    booking.service_session.save()
                else:
                    # Create new ServiceSession (shouldn't happen with new architecture)
                    from services.models import ServiceSession
                    service_session = ServiceSession.objects.create(
                        service=booking.service,
                        session_type='individual',
                        visibility='private',
                        start_time=start_time,
                        end_time=end_time,
                        duration=duration,
                        max_participants=1,
                        current_participants=1,
                        status='scheduled',
                    )
                    booking.service_session = service_session

                # If payment is complete, confirm the booking
                if booking.payment_status == 'paid':
                    booking.status = 'confirmed'

                booking.save()

                # Trigger room creation if needed (for virtual services)
                if booking.status == 'confirmed' and booking.service.location_type in ['virtual', 'online', 'hybrid']:
                    from rooms.services import RoomService
                    try:
                        room_service = RoomService()
                        # Create room for ServiceSession (not booking directly)
                        if booking.service_session and not hasattr(booking.service_session, 'livekit_room'):
                            room_service.create_room_for_session(booking.service_session)
                        elif booking.service_session and not booking.service_session.livekit_room:
                            room_service.create_room_for_session(booking.service_session)
                    except Exception as e:
                        # Log but don't fail - periodic task will catch this
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Failed to create room for session {booking.service_session.id}: {e}")

            response_serializer = BookingDetailSerializer(
                booking,
                context={'request': request}
            )
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """
        Reschedule booking to new time.

        NEW PARADIGM: Updates the ServiceSession times instead of creating
        a new booking. The booking stays the same, only the session times change.
        """
        booking = self.get_object()
        serializer = BookingRescheduleSerializer(
            data=request.data,
            context={'booking': booking}
        )
        serializer.is_valid(raise_exception=True)

        # Store old start time for reminder handling
        old_start_time_obj = booking.get_start_time()
        old_start_time = old_start_time_obj.isoformat() if old_start_time_obj else None

        # Reschedule booking (updates ServiceSession, returns same booking)
        try:
            booking.reschedule(
                new_start_time=serializer.validated_data['start_time'],
                new_end_time=serializer.validated_data['end_time'],
                rescheduled_by_user=request.user
            )

            # Handle reminder rescheduling
            from bookings.tasks import handle_booking_reschedule
            new_start_time_obj = booking.get_start_time()
            new_start_time = new_start_time_obj.isoformat() if new_start_time_obj else None

            if old_start_time and new_start_time:
                handle_booking_reschedule.delay(
                    booking.id,
                    old_start_time,
                    new_start_time
                )

            # Send reschedule notification
            try:
                from notifications.services import NotificationService
                notification_service = NotificationService()
                notification_service.send_booking_rescheduled(booking, request.user)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to send reschedule notification: {e}")

            response_serializer = BookingDetailSerializer(
                booking,
                context={'request': request}
            )
            return Response(response_serializer.data, status=status.HTTP_200_OK)
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
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def available_dates(self, request):
        """Get dates with availability for the next N days (public endpoint)."""
        serializer = AvailableDatesRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = serializer.validated_data['service']
        start_date = serializer.validated_data.get('start_date') or timezone.now().date()
        days_ahead = serializer.validated_data.get('days_ahead', 30)
        end_date = start_date + timedelta(days=days_ahead)

        slots = get_practitioner_availability(
            service_id=service.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Group by date, return just date + slot count
        dates_with_slots = {}
        for slot in slots:
            d = slot['start_datetime'].date().isoformat()
            dates_with_slots[d] = dates_with_slots.get(d, 0) + 1

        return Response({
            'service_id': service.id,
            'available_dates': [
                {'date': d, 'slot_count': c}
                for d, c in sorted(dates_with_slots.items())
            ],
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        })

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def check_availability(self, request):
        """Check practitioner availability for a service (public endpoint)"""
        serializer = AvailabilityCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        practitioner = serializer.validated_data['practitioner']
        service = serializer.validated_data['service']
        date = serializer.validated_data['date']
        
        # Get available slots
        available_slots = get_practitioner_availability(
            service_id=service.id,
            start_date=date,
            end_date=date,
            days_ahead=1
        )
        
        # Transform slots to match serializer expectations
        formatted_slots = []
        for slot in available_slots:
            formatted_slots.append({
                'start_time': slot['start_datetime'],
                'end_time': slot['end_datetime'],
                'duration_minutes': service.duration_minutes,
                'is_available': slot.get('is_available', True)
            })
        
        # Format response
        slot_serializer = AvailableSlotSerializer(formatted_slots, many=True)
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

    @action(detail=True, methods=['get'], url_path='journey')
    def journey(self, request, pk=None):
        """
        Get all bookings related to this booking's journey.

        For courses: returns all bookings for the same service + same user.
        For packages/bundles: returns all bookings for the same order + same user.
        For individual sessions/workshops: returns just this booking.

        Includes progress information (total, completed, percentage).
        """
        booking = self.get_object()

        # For courses: get all bookings for same service by this user
        if (booking.service and booking.service.service_type and
                booking.service.service_type.code == 'course'):
            related = Booking.objects.filter(
                user=request.user,
                service=booking.service,
                status__in=['draft', 'pending_payment', 'confirmed', 'completed']
            ).select_related(
                'service_session', 'service', 'service__service_type',
                'practitioner__user', 'order'
            ).prefetch_related(
                'notes__author'
            ).order_by(
                'service_session__sequence_number',
                'service_session__start_time'
            )

        # For packages/bundles: get all bookings for same order by this user
        elif booking.order and booking.order.package_metadata:
            related = Booking.objects.filter(
                user=request.user,
                order=booking.order,
                status__in=['draft', 'pending_payment', 'confirmed', 'completed']
            ).select_related(
                'service_session', 'service', 'service__service_type',
                'practitioner__user', 'order'
            ).prefetch_related(
                'notes__author'
            ).order_by(
                'service_session__start_time'
            )

        # For individual sessions/workshops: just return this booking
        else:
            related = Booking.objects.filter(
                pk=booking.pk
            ).select_related(
                'service_session', 'service', 'service__service_type',
                'practitioner__user', 'order'
            ).prefetch_related(
                'notes__author'
            )

        serializer = self.get_serializer(related, many=True)

        total_count = related.count()
        completed_count = related.filter(
            service_session__status='completed'
        ).count()
        progress_percentage = (
            (completed_count / max(total_count, 1)) * 100
        )

        return Response({
            'status': 'success',
            'data': {
                'bookings': serializer.data,
                'journey_type': self._get_journey_type(booking),
                'total_count': total_count,
                'completed_count': completed_count,
                'progress_percentage': round(progress_percentage, 1),
            }
        })

    def _get_journey_type(self, booking):
        """Determine the journey type for a booking."""
        if booking.order and booking.order.package_metadata:
            order_type = booking.order.order_type
            if order_type == 'bundle':
                return 'bundle'
            return 'package'
        if booking.service and booking.service.service_type:
            code = booking.service.service_type.code
            if code in ('session', 'workshop', 'course'):
                return code
        return 'session'


@extend_schema_view(
    list=extend_schema(tags=['Journeys'], responses=JourneyListResponseSerializer),
    retrieve=extend_schema(tags=['Journeys'], responses=JourneyDetailSerializer),
)
class JourneyViewSet(GenericViewSet):
    """
    User journeys — their purchased services grouped with sessions and progress.

    GET /api/v1/journeys/ — List all user journeys
    GET /api/v1/journeys/{booking_uuid}/ — Journey detail (pass any booking UUID from the journey)
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'booking_uuid'
    lookup_url_kwarg = 'booking_uuid'
    serializer_class = JourneyDetailSerializer  # For OpenAPI schema

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).exclude(status='canceled')

    def list(self, request):
        """List user's journeys grouped by service."""
        user = request.user
        bookings = Booking.objects.filter(user=user).exclude(
            status='canceled'
        ).select_related(
            'service', 'service__service_type', 'service__primary_practitioner__user',
            'service_session', 'order'
        ).order_by('service_session__start_time')

        # Group bookings into journeys
        # Sessions/workshops: each booking = its own journey (separate purchases)
        # Courses/packages/bundles: group by service (one enrollment = one journey)
        journeys_map = {}
        for booking in bookings:
            service = booking.service
            if not service:
                continue

            service_type_code = service.service_type.code if service.service_type else 'session'

            # For sessions and workshops, each booking is its own journey
            if service_type_code in ('session', 'workshop'):
                group_key = f'booking-{booking.id}'
            else:
                # Courses, packages, bundles: group by service
                group_key = f'service-{service.id}'

            if group_key not in journeys_map:
                practitioner = service.primary_practitioner
                journeys_map[group_key] = {
                    'journey_id': str(booking.public_uuid),  # First booking's UUID
                    'journey_type': service_type_code,
                    'service_name': service.name,
                    'service_description': (service.description or '')[:200],
                    'service_uuid': str(service.public_uuid),
                    'service_image_url': getattr(service, 'featured_image_url', '') or getattr(service, 'image_url', '') or '',
                    'service_duration_minutes': getattr(service, 'duration_minutes', None),
                    'service_location_type': getattr(service, 'location_type', ''),
                    'practitioner': {
                        'name': practitioner.display_name if practitioner else None,
                        'slug': practitioner.slug if practitioner else None,
                        'public_uuid': str(practitioner.public_uuid) if practitioner and hasattr(practitioner, 'public_uuid') else None,
                        'bio': getattr(practitioner, 'bio', None),
                        'profile_image_url': getattr(practitioner, 'profile_image_url', '') or '',
                        'user_id': practitioner.user_id if practitioner else None,
                    } if practitioner else None,
                    'total_sessions': 0,
                    'completed_sessions': 0,
                    'upcoming_sessions': 0,
                    'needs_scheduling': 0,
                    'next_session_time': None,
                    'next_session_title': None,
                    'progress_percentage': 0.0,
                    'status': 'upcoming',
                }

            journey = journeys_map[group_key]
            journey['total_sessions'] += 1

            ss = booking.service_session
            if ss:
                now = timezone.now()
                is_past = ss.end_time and ss.end_time < now if ss.end_time else (ss.start_time and ss.start_time < now)

                if ss.status == 'completed' or (is_past and ss.status != 'canceled'):
                    # Session is done — either explicitly completed or past its end time
                    journey['completed_sessions'] += 1
                    # Track most recent past session date (for cards when no future sessions)
                    if ss.start_time:
                        if not journey.get('_last_session_time') or ss.start_time > journey['_last_session_time']:
                            journey['_last_session_time'] = ss.start_time
                            journey['_last_session_title'] = ss.title
                elif ss.status == 'canceled':
                    pass  # Don't count canceled sessions
                elif ss.start_time and ss.start_time > now:
                    # Future session
                    journey['upcoming_sessions'] += 1
                    if not journey['next_session_time'] or ss.start_time < journey['next_session_time']:
                        journey['next_session_time'] = ss.start_time
                        journey['next_session_title'] = ss.title
                elif not ss.start_time:
                    journey['needs_scheduling'] += 1

        # Calculate status and progress
        results = []
        for j in journeys_map.values():
            total = j['total_sessions']
            completed = j['completed_sessions']
            j['progress_percentage'] = (completed / max(total, 1)) * 100
            if completed == total and total > 0:
                j['status'] = 'completed'
            elif completed > 0:
                j['status'] = 'active'
            else:
                j['status'] = 'upcoming'

            # If no future sessions, use last past session date for card display
            if not j['next_session_time'] and j.get('_last_session_time'):
                j['next_session_time'] = j['_last_session_time']
                j['next_session_title'] = j.get('_last_session_title')

            # Clean up internal tracking fields
            j.pop('_last_session_time', None)
            j.pop('_last_session_title', None)

            results.append(j)

        # Sort: active first, then upcoming, then completed
        status_order = {'active': 0, 'upcoming': 1, 'completed': 2}
        far_future = timezone.now() + timedelta(days=36500)
        results.sort(key=lambda j: (status_order.get(j['status'], 9), j.get('next_session_time') or far_future))

        serializer = JourneyListResponseSerializer(data={'count': len(results), 'results': results})
        serializer.is_valid()
        return Response(serializer.data)

    def retrieve(self, request, booking_uuid=None):
        """Get journey detail by booking UUID."""
        user = request.user

        # Find the booking
        try:
            booking = Booking.objects.select_related(
                'service', 'service__service_type', 'service__primary_practitioner__user',
                'service_session', 'order'
            ).get(public_uuid=booking_uuid, user=user)
        except Booking.DoesNotExist:
            return Response({'detail': 'Journey not found.'}, status=404)

        service = booking.service
        if not service:
            return Response({'detail': 'Service not found.'}, status=404)

        practitioner = service.primary_practitioner
        service_type_code = service.service_type.code if service.service_type else 'session'

        # For courses/packages/bundles — get ALL related bookings
        if service_type_code in ('course', 'package', 'bundle') or service.is_course or service.is_package or service.is_bundle:
            related = Booking.objects.filter(
                user=user, service=service
            ).exclude(status='canceled').select_related(
                'service_session', 'order'
            ).order_by('service_session__sequence_number', 'service_session__start_time')
        else:
            # Session/workshop — just this booking
            related = [booking]

        # Build sessions list (deduplicate by service_session to avoid showing
        # duplicate bookings for the same session)
        sessions = []
        seen_session_ids = set()
        for b in (related if not isinstance(related, list) else related):
            ss = b.service_session
            # Skip duplicate bookings for the same service session
            if ss and ss.id in seen_session_ids:
                continue
            if ss:
                seen_session_ids.add(ss.id)
            sessions.append({
                'booking_uuid': str(b.public_uuid),
                'booking_status': b.status,
                'title': (ss.title if ss else None) or f'Session {getattr(ss, "sequence_number", "") or ""}',
                'description': ss.description if ss else None,
                'start_time': ss.start_time if ss else None,
                'end_time': ss.end_time if ss else None,
                'status': ss.status if ss else None,
                'sequence_number': ss.sequence_number if ss else None,
                'duration_minutes': ss.duration if ss else None,
                'room_uuid': str(ss.livekit_room.public_uuid) if ss and hasattr(ss, 'livekit_room') and ss.livekit_room else None,
                'client_notes': b.client_notes or '',
                'confirmed_at': b.confirmed_at,
                'completed_at': b.completed_at,
                'agenda': ss.agenda if ss else None,
                'what_youll_learn': getattr(ss, 'what_youll_learn', None) if ss else None,
                'max_participants': ss.max_participants if ss else None,
                'current_participants': ss.current_participants if ss else None,
            })

        total = len(sessions)
        now = timezone.now()
        completed = sum(
            1 for s in sessions
            if s.get('status') == 'completed'
            or (s.get('end_time') and s['end_time'] < now and s.get('status') != 'canceled')
            or (not s.get('end_time') and s.get('start_time') and s['start_time'] < now and s.get('status') != 'canceled')
        )

        # Compute session counts
        upcoming = sum(1 for s in sessions if s.get('status') in ('scheduled', 'in_progress') and s.get('start_time') and s['start_time'] > timezone.now())
        needs_sched = sum(1 for s in sessions if not s.get('start_time'))

        # Date range
        session_dates = [s['start_time'] for s in sessions if s.get('start_time')]
        first_date = min(session_dates) if session_dates else None
        last_date = max(session_dates) if session_dates else None

        data = {
            'journey_id': str(booking.public_uuid),
            'journey_type': service_type_code,
            'service_name': service.name,
            'service_description': service.description or '',
            'service_uuid': str(service.public_uuid),
            'service_price_cents': service.price_cents if hasattr(service, 'price_cents') else None,
            'service_duration_minutes': service.duration_minutes if hasattr(service, 'duration_minutes') else None,
            'service_location_type': getattr(service, 'location_type', ''),
            'service_image_url': getattr(service, 'featured_image_url', '') or getattr(service, 'image_url', '') or '',
            'service_slug': getattr(service, 'slug', ''),
            'practitioner': {
                'name': practitioner.display_name if practitioner else None,
                'slug': practitioner.slug if practitioner else None,
                'public_uuid': str(practitioner.public_uuid) if practitioner and hasattr(practitioner, 'public_uuid') else None,
                'bio': getattr(practitioner, 'bio', None),
                'profile_image_url': getattr(practitioner, 'profile_image_url', '') or '',
                'user_id': practitioner.user_id if practitioner else None,
            } if practitioner else None,
            'sessions': sessions,
            'total_sessions': total,
            'completed_sessions': completed,
            'upcoming_sessions': upcoming,
            'needs_scheduling': needs_sched,
            'progress_percentage': (completed / max(total, 1)) * 100,
            'order_uuid': str(booking.order.public_uuid) if booking.order else None,
            'first_session_date': first_date,
            'last_session_date': last_date,
        }

        serializer = JourneyDetailSerializer(data=data)
        serializer.is_valid()
        return Response(serializer.data)