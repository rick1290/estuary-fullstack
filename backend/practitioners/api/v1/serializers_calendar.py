"""
Calendar Events API Serializers

Provides unified view of practitioner's schedule combining:
- ServiceSessions (workshops/courses) with attendee aggregation
- Individual bookings (1-on-1 sessions)
"""
from rest_framework import serializers
from django.db.models import Count, Q
from services.models import ServiceSession, Service
from bookings.models import Booking
from rooms.models import Room
from users.models import User


class CalendarEventAttendeeSerializer(serializers.Serializer):
    """Simplified attendee info for calendar events"""
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    avatar_url = serializers.URLField(required=False, allow_null=True)
    phone_number = serializers.CharField(required=False, allow_null=True)
    booking_status = serializers.CharField()
    booking_id = serializers.IntegerField()
    public_uuid = serializers.UUIDField()


class CalendarEventServiceSerializer(serializers.Serializer):
    """Service info for calendar events"""
    id = serializers.IntegerField()
    name = serializers.CharField()
    service_type_code = serializers.CharField()
    location_type = serializers.CharField()
    duration_minutes = serializers.IntegerField()
    description = serializers.CharField(required=False, allow_null=True)


class CalendarEventRoomSerializer(serializers.Serializer):
    """Room info for calendar events"""
    id = serializers.IntegerField()
    public_uuid = serializers.UUIDField()
    livekit_room_name = serializers.CharField()
    status = serializers.CharField()
    max_participants = serializers.IntegerField(required=False, allow_null=True)


class CalendarEventRecordingSerializer(serializers.Serializer):
    """Recording info for calendar events"""
    id = serializers.IntegerField()
    recording_id = serializers.CharField()
    status = serializers.CharField()
    started_at = serializers.DateTimeField()
    ended_at = serializers.DateTimeField(required=False, allow_null=True)
    duration_seconds = serializers.IntegerField()
    duration_formatted = serializers.CharField()
    file_size_bytes = serializers.IntegerField()
    file_format = serializers.CharField()
    file_url = serializers.URLField()
    thumbnail_url = serializers.URLField(required=False, allow_null=True)
    is_processed = serializers.BooleanField()
    download_url = serializers.URLField(required=False, allow_null=True)
    created_at = serializers.DateTimeField()


class ServiceSessionEventSerializer(serializers.Serializer):
    """
    Calendar event for a ServiceSession (workshop/course class)
    Aggregates all bookings for this session
    """
    event_type = serializers.CharField(default='service_session', read_only=True)

    # ServiceSession info
    service_session_id = serializers.IntegerField()
    service_session_title = serializers.CharField(required=False, allow_null=True)
    sequence_number = serializers.IntegerField(required=False, allow_null=True)

    # Service info
    service = CalendarEventServiceSerializer()

    # Timing
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField(required=False, allow_null=True)
    duration_minutes = serializers.IntegerField()

    # Attendees (aggregated)
    attendee_count = serializers.IntegerField()
    max_participants = serializers.IntegerField(required=False, allow_null=True)
    attendees = CalendarEventAttendeeSerializer(many=True)

    # Room info (for virtual sessions)
    room = CalendarEventRoomSerializer(required=False, allow_null=True)

    # Recordings
    recordings = CalendarEventRecordingSerializer(many=True, required=False)

    # Status
    status = serializers.CharField()  # confirmed, in_progress, completed, cancelled

    # Additional session info
    agenda = serializers.CharField(required=False, allow_null=True)
    what_youll_learn = serializers.CharField(required=False, allow_null=True)


class IndividualBookingEventSerializer(serializers.Serializer):
    """
    Calendar event for an individual booking (1-on-1 session)
    Each booking is its own unique time slot
    """
    event_type = serializers.CharField(default='individual_booking', read_only=True)

    # Booking info
    booking_id = serializers.IntegerField()
    public_uuid = serializers.UUIDField()

    # Service info
    service = CalendarEventServiceSerializer()

    # Timing
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField(required=False, allow_null=True)
    duration_minutes = serializers.IntegerField()

    # Client info (single attendee)
    client = CalendarEventAttendeeSerializer()

    # Room info (for virtual sessions)
    room = CalendarEventRoomSerializer(required=False, allow_null=True)

    # Pricing
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    # Status
    status = serializers.CharField()


class CalendarEventsQuerySerializer(serializers.Serializer):
    """Query parameters for calendar events endpoint"""
    start_date = serializers.DateTimeField(required=False, allow_null=True, help_text="Filter events starting from this date")
    end_date = serializers.DateTimeField(required=False, allow_null=True, help_text="Filter events before this date")
    service_type = serializers.ChoiceField(
        choices=['session', 'workshop', 'course'],
        required=False,
        allow_null=True,
        help_text="Filter by service type"
    )
    status = serializers.ChoiceField(
        choices=['confirmed', 'in_progress', 'completed', 'cancelled', 'canceled'],
        required=False,
        allow_null=True,
        help_text="Filter by booking/session status"
    )
    # New convenience filters
    upcoming = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Filter to upcoming events (start_time >= now, status in [confirmed, in_progress], sorted ascending)"
    )
    past = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Filter to past events (end_time < now OR status=completed, sorted descending)"
    )
    sort = serializers.ChoiceField(
        choices=['asc', 'desc'],
        required=False,
        allow_null=True,
        help_text="Sort order by start_time (asc=soonest first, desc=most recent first). Defaults based on upcoming/past filter."
    )
