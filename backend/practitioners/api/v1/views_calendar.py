"""
Calendar Events API Views

Provides unified calendar view for practitioners showing all ServiceSessions.

After migration, ALL bookings have service_session (including 1-on-1 sessions),
so the calendar API simply queries ServiceSessions with their associated bookings.

Each event shows:
- Session details (time, duration, location)
- All attendees/bookings for that session
- Room information for virtual sessions
- Aggregated status across all bookings
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
from rooms.api.v1.serializers import RoomRecordingSerializer
from .serializers_calendar import (
    ServiceSessionEventSerializer,
    CalendarEventsQuerySerializer,
)
import logging

logger = logging.getLogger(__name__)


class PractitionerCalendarViewSet(viewsets.ViewSet):
    """
    Calendar Events endpoint for practitioners.

    Returns all ServiceSessions (events) with their associated bookings/attendees.
    Works for all service types:
    - Workshops: Group sessions with multiple attendees
    - Courses: Multiple class sessions with multiple attendees
    - 1-on-1 Sessions: Individual sessions with single attendee

    This provides a "what's on my schedule" view organized by time slots.
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
                'livekit_room'
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

        # Get recordings if room exists
        recordings = []
        if hasattr(service_session, 'livekit_room') and service_session.livekit_room:
            recordings_qs = service_session.livekit_room.recordings.filter(is_processed=True).order_by('-started_at')
            recordings = RoomRecordingSerializer(recordings_qs, many=True).data

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
            'room': self._serialize_room(service_session.livekit_room) if hasattr(service_session, 'livekit_room') and service_session.livekit_room else None,
            'recordings': recordings,
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

        Returns all ServiceSessions with their associated bookings/attendees.
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

        # Get all ServiceSession events
        # NOTE: After migration, ALL bookings have service_session (including 1-on-1 sessions)
        # So we only need to query ServiceSessions to get the full calendar
        events = self._get_service_session_events(
            practitioner, start_date, end_date, service_type_filter, status_filter
        )

        # Sort all events by start_time (most recent first)
        # Handle None start_time for unscheduled sessions (put them at the end)
        from datetime import datetime, timezone as dt_timezone
        events.sort(
            key=lambda x: x['start_time'] if x['start_time'] is not None else datetime.min.replace(tzinfo=dt_timezone.utc),
            reverse=True
        )

        return Response(events)

    def _get_service_session_events(self, practitioner, start_date=None, end_date=None, service_type=None, status_filter=None):
        """
        Get ServiceSession events with aggregated attendee information.

        Returns all ServiceSessions for this practitioner with their bookings:
        - Workshops: One ServiceSession with multiple bookings
        - Courses: Multiple ServiceSessions (one per class) with multiple bookings each
        - 1-on-1 Sessions: Individual ServiceSessions with single booking each
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

            # Get recordings if room exists
            recordings = []
            if hasattr(session, 'livekit_room') and session.livekit_room:
                recordings_qs = session.livekit_room.recordings.filter(is_processed=True).order_by('-started_at')
                recordings = RoomRecordingSerializer(recordings_qs, many=True).data

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
                'recordings': recordings,
                'status': event_status,
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
