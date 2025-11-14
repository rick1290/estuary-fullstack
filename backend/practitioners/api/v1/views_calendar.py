"""
Calendar Events API Views

Provides unified calendar view for practitioners showing:
- ServiceSessions (workshops/courses) with attendee counts
- Individual bookings (1-on-1 sessions)
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Prefetch
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import timedelta
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from practitioners.models import Practitioner
from services.models import ServiceSession, Service
from bookings.models import Booking
from rooms.models import Room
from .serializers_calendar import (
    ServiceSessionEventSerializer,
    IndividualBookingEventSerializer,
    CalendarEventsQuerySerializer,
)
import logging

logger = logging.getLogger(__name__)


class PractitionerCalendarViewSet(viewsets.ViewSet):
    """
    Calendar Events endpoint for practitioners.

    Returns a unified list of calendar events combining:
    - ServiceSessions (workshops/courses) with aggregated attendees
    - Individual bookings (1-on-1 sessions)

    This provides a "what's on my schedule" view vs raw bookings.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ServiceSessionEventSerializer()},
        description="Get detailed information about a specific ServiceSession with all attendees"
    )
    def retrieve(self, request, pk=None):
        """
        Get detailed information about a specific ServiceSession.

        Returns the session details along with all attendees (bookings for this session).
        """
        user = request.user

        # Get practitioner
        try:
            practitioner = Practitioner.objects.get(user=user)
        except Practitioner.DoesNotExist:
            return Response(
                {'error': 'User is not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the ServiceSession
        service_session = get_object_or_404(
            ServiceSession.objects.select_related(
                'service',
                'service__service_type',
                'room'
            ).prefetch_related(
                Prefetch(
                    'bookings',
                    queryset=Booking.objects.select_related('user').filter(
                        status__in=['confirmed', 'in_progress', 'completed']
                    )
                )
            ),
            pk=pk,
            service__primary_practitioner=practitioner
        )

        # Build attendees list
        attendees = []
        for booking in service_session.bookings.all():
            attendees.append({
                'id': booking.user.id,
                'full_name': booking.user.get_full_name() or booking.user.email,
                'email': booking.user.email,
                'avatar_url': getattr(booking.user, 'avatar_url', None),
                'phone_number': getattr(booking.user, 'phone_number', None),
                'booking_status': booking.status,
                'booking_id': booking.id,
                'public_uuid': booking.public_uuid,
            })

        # Determine overall status
        statuses = [b.status for b in service_session.bookings.all()]
        if 'in_progress' in statuses:
            event_status = 'in_progress'
        elif all(s == 'completed' for s in statuses):
            event_status = 'completed'
        elif 'cancelled' in statuses or 'canceled' in statuses:
            if all(s in ['cancelled', 'canceled'] for s in statuses):
                event_status = 'cancelled'
            else:
                event_status = 'confirmed'
        else:
            event_status = 'confirmed'

        # Build response
        response_data = {
            'event_type': 'service_session',
            'service_session_id': service_session.id,
            'service_session_title': service_session.title,
            'sequence_number': service_session.sequence_number,
            'service': {
                'id': service_session.service.id,
                'name': service_session.service.name,
                'service_type_code': service_session.service.service_type.code if service_session.service.service_type else 'workshop',
                'location_type': service_session.service.location_type,
                'duration_minutes': service_session.duration or service_session.service.duration_minutes,
                'description': service_session.description or service_session.service.description,
            },
            'start_time': service_session.start_time,
            'end_time': service_session.end_time,
            'duration_minutes': service_session.duration or service_session.service.duration_minutes,
            'attendee_count': len(attendees),
            'max_participants': service_session.max_participants,
            'attendees': attendees,
            'room': self._serialize_room(service_session.room) if service_session.room else None,
            'status': event_status,
            'agenda': service_session.agenda,
            'what_youll_learn': service_session.what_youll_learn,
        }

        return Response(response_data)

    @extend_schema(
        parameters=[
            OpenApiParameter('start_date', OpenApiTypes.DATETIME, description='Filter events from this date'),
            OpenApiParameter('end_date', OpenApiTypes.DATETIME, description='Filter events before this date'),
            OpenApiParameter('service_type', OpenApiTypes.STR, enum=['session', 'workshop', 'course']),
            OpenApiParameter('status', OpenApiTypes.STR, enum=['confirmed', 'in_progress', 'completed', 'cancelled']),
        ],
        responses={200: ServiceSessionEventSerializer(many=True)},
        description="Get practitioner's calendar events with aggregated attendees"
    )
    def list(self, request):
        """
        Get all calendar events for the authenticated practitioner.

        Returns ServiceSessions (grouped) + Individual Bookings (ungrouped)
        """
        user = request.user

        # Get practitioner
        try:
            practitioner = Practitioner.objects.get(user=user)
        except Practitioner.DoesNotExist:
            return Response(
                {'error': 'User is not a practitioner'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Parse query parameters
        query_serializer = CalendarEventsQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        start_date = query_serializer.validated_data.get('start_date')
        end_date = query_serializer.validated_data.get('end_date')
        service_type_filter = query_serializer.validated_data.get('service_type')
        status_filter = query_serializer.validated_data.get('status')

        # Collect all events
        events = []

        # 1. Get ServiceSessions (workshops and courses with ServiceSession)
        service_session_events = self._get_service_session_events(
            practitioner, start_date, end_date, service_type_filter, status_filter
        )
        events.extend(service_session_events)

        # 2. Get grouped workshop/course bookings WITHOUT ServiceSession
        grouped_workshop_events = self._get_grouped_workshop_events(
            practitioner, start_date, end_date, service_type_filter, status_filter
        )
        events.extend(grouped_workshop_events)

        # 3. Get Individual Bookings (1-on-1 sessions without ServiceSession)
        individual_booking_events = self._get_individual_booking_events(
            practitioner, start_date, end_date, service_type_filter, status_filter
        )
        events.extend(individual_booking_events)

        # Sort all events by start_time (most recent first based on created_at pattern)
        # Actually, let's sort by start_time for calendar view
        events.sort(key=lambda x: x['start_time'], reverse=True)

        return Response(events)

    def _get_service_session_events(self, practitioner, start_date=None, end_date=None, service_type=None, status_filter=None):
        """
        Get ServiceSession events with aggregated attendee information.

        For workshops: One ServiceSession with multiple bookings
        For courses: Multiple ServiceSessions (one per class) with multiple bookings each
        """
        # Base query for ServiceSessions belonging to practitioner's services
        queryset = ServiceSession.objects.filter(
            service__primary_practitioner=practitioner
        ).select_related(
            'service',
            'livekit_room'
        ).prefetch_related(
            Prefetch(
                'bookings',
                queryset=Booking.objects.select_related('user').filter(
                    status__in=['confirmed', 'in_progress', 'completed']
                )
            )
        )

        # Filter by date range
        if start_date:
            queryset = queryset.filter(start_time__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__lte=end_date)

        # Filter by service type
        if service_type:
            queryset = queryset.filter(service__service_type__code=service_type)

        events = []

        for session in queryset:
            # Get all bookings for this session
            bookings = list(session.bookings.all())

            # Apply status filter if needed
            if status_filter:
                bookings = [b for b in bookings if b.status == status_filter]

            # Skip if no bookings match filter
            if not bookings:
                continue

            # Aggregate attendees
            attendees = []
            for booking in bookings:
                attendees.append({
                    'id': booking.user.id,
                    'full_name': booking.user.get_full_name() or booking.user.email,
                    'email': booking.user.email,
                    'avatar_url': getattr(booking.user, 'avatar_url', None),
                    'phone_number': getattr(booking.user, 'phone_number', None),
                    'booking_status': booking.status,
                    'booking_id': booking.id,
                    'public_uuid': booking.public_uuid,
                })

            # Determine overall status
            # If any booking is in_progress, session is in_progress
            # If all completed, session is completed
            # Otherwise, confirmed
            statuses = [b.status for b in bookings]
            if 'in_progress' in statuses:
                event_status = 'in_progress'
            elif all(s == 'completed' for s in statuses):
                event_status = 'completed'
            elif 'cancelled' in statuses or 'canceled' in statuses:
                # Check if all cancelled
                if all(s in ['cancelled', 'canceled'] for s in statuses):
                    event_status = 'cancelled'
                else:
                    event_status = 'confirmed'  # Mixed status
            else:
                event_status = 'confirmed'

            # Build event
            event = {
                'event_type': 'service_session',
                'service_session_id': session.id,
                'service_session_title': session.title,
                'sequence_number': session.sequence_number,
                'service': {
                    'id': session.service.id,
                    'name': session.service.name,
                    'service_type_code': session.service.service_type.code if session.service.service_type else 'workshop',
                    'location_type': session.service.location_type,
                    'duration_minutes': session.duration or session.service.duration_minutes,
                    'description': session.description or session.service.description,
                },
                'start_time': session.start_time,
                'end_time': session.end_time,
                'duration_minutes': session.duration or session.service.duration_minutes,
                'attendee_count': len(attendees),
                'max_participants': session.max_participants,
                'attendees': attendees,
                'room': self._serialize_room(session.livekit_room) if hasattr(session, 'livekit_room') and session.livekit_room else None,
                'status': event_status,
            }

            events.append(event)

        return events

    def _get_grouped_workshop_events(self, practitioner, start_date=None, end_date=None, service_type=None, status_filter=None):
        """
        Get workshop/course events that DON'T have a ServiceSession.
        Groups them by service and start_time to show as one aggregated event.
        """
        from collections import defaultdict

        # Get workshop/course bookings without service_session
        queryset = Booking.objects.filter(
            service__primary_practitioner=practitioner,
            service_session__isnull=True,
            service__service_type__code__in=['workshop', 'course']
        ).select_related(
            'service',
            'service__service_type',
            'user',
            'room'
        )

        # Filter by date range
        if start_date:
            queryset = queryset.filter(start_time__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__lte=end_date)

        # Filter by service type
        if service_type:
            queryset = queryset.filter(service__service_type__code=service_type)

        # Filter by status
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Group bookings by (service_id, start_time)
        grouped = defaultdict(list)
        for booking in queryset:
            key = (booking.service.id, booking.start_time)
            grouped[key].append(booking)

        events = []
        for (service_id, start_time), bookings in grouped.items():
            if not bookings:
                continue

            first_booking = bookings[0]

            # Aggregate attendees
            attendees = []
            for booking in bookings:
                attendees.append({
                    'id': booking.user.id,
                    'full_name': booking.user.get_full_name() or booking.user.email,
                    'email': booking.user.email,
                    'avatar_url': getattr(booking.user, 'avatar_url', None),
                    'phone_number': getattr(booking.user, 'phone_number', None),
                    'booking_status': booking.status,
                    'booking_id': booking.id,
                    'public_uuid': booking.public_uuid,
                })

            # Determine overall status
            statuses = [b.status for b in bookings]
            if 'in_progress' in statuses:
                event_status = 'in_progress'
            elif all(s == 'completed' for s in statuses):
                event_status = 'completed'
            elif 'cancelled' in statuses or 'canceled' in statuses:
                if all(s in ['cancelled', 'canceled'] for s in statuses):
                    event_status = 'cancelled'
                else:
                    event_status = 'confirmed'
            else:
                event_status = 'confirmed'

            # Build event (similar to service_session event but without service_session_id)
            event = {
                'event_type': 'grouped_booking',  # New type for grouped bookings without ServiceSession
                'service': {
                    'id': first_booking.service.id,
                    'name': first_booking.service.name,
                    'service_type_code': first_booking.service.service_type.code if first_booking.service.service_type else 'workshop',
                    'location_type': first_booking.service.location_type,
                    'duration_minutes': first_booking.duration_minutes or first_booking.service.duration_minutes,
                    'description': first_booking.service.description,
                },
                'start_time': first_booking.start_time,
                'end_time': first_booking.end_time,
                'duration_minutes': first_booking.duration_minutes or first_booking.service.duration_minutes,
                'attendee_count': len(attendees),
                'max_participants': first_booking.service.max_participants,
                'attendees': attendees,
                'room': self._serialize_room(first_booking.room) if hasattr(first_booking, 'room') and first_booking.room else None,
                'status': event_status,
            }

            events.append(event)

        return events

    def _get_individual_booking_events(self, practitioner, start_date=None, end_date=None, service_type=None, status_filter=None):
        """
        Get individual booking events (1-on-1 sessions).

        These are bookings that don't have a service_session (individual appointments).
        Only includes 'session' type bookings - workshops/courses should always have a ServiceSession.
        """
        # Base query for bookings without service_session
        # IMPORTANT: Exclude workshop/course types as they should have ServiceSessions
        queryset = Booking.objects.filter(
            service__primary_practitioner=practitioner,
            service_session__isnull=True,  # Only bookings without group sessions
        ).exclude(
            service__service_type__code__in=['workshop', 'course']  # Workshops/courses should have ServiceSessions
        ).select_related(
            'service',
            'service__service_type',
            'user',
            'livekit_room'
        )

        # Filter by date range
        if start_date:
            queryset = queryset.filter(start_time__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__lte=end_date)

        # Filter by service type
        if service_type:
            queryset = queryset.filter(service__service_type__code=service_type)

        # Filter by status
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        events = []

        for booking in queryset:
            # Build client info
            client = {
                'id': booking.user.id,
                'full_name': booking.user.get_full_name() or booking.user.email,
                'email': booking.user.email,
                'avatar_url': getattr(booking.user, 'avatar_url', None),
                'phone_number': getattr(booking.user, 'phone_number', None),
                'booking_status': booking.status,
                'booking_id': booking.id,
                'public_uuid': booking.public_uuid,
            }

            # Build event
            event = {
                'event_type': 'individual_booking',
                'booking_id': booking.id,
                'public_uuid': booking.public_uuid,
                'service': {
                    'id': booking.service.id,
                    'name': booking.service.name,
                    'service_type_code': booking.service.service_type.code if booking.service.service_type else 'session',
                    'location_type': booking.service.location_type,
                    'duration_minutes': booking.duration_minutes or booking.service.duration_minutes,
                    'description': booking.service.description,
                },
                'start_time': booking.start_time,
                'end_time': booking.end_time,
                'duration_minutes': booking.duration_minutes or booking.service.duration_minutes,
                'client': client,
                'room': self._serialize_room(booking.room) if hasattr(booking, 'room') and booking.room else None,
                'total_amount': str(booking.final_amount) if booking.final_amount else '0.00',
                'status': booking.status,
            }

            events.append(event)

        return events

    def _serialize_room(self, room):
        """Helper to serialize room data"""
        if not room:
            return None

        return {
            'id': room.id,
            'public_uuid': room.public_uuid,
            'livekit_room_name': room.livekit_room_name,
            'status': room.status,
            'max_participants': room.max_participants,
        }
