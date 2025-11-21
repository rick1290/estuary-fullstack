"""
Room serializers for DRF API.
"""
from rest_framework import serializers
from django.utils import timezone
from rooms.models import Room, RoomParticipant, RoomToken, RoomRecording
from rooms.livekit.tokens import generate_room_token
# We'll use inline serializers or remove if not needed
import logging

logger = logging.getLogger(__name__)


class RoomSerializer(serializers.ModelSerializer):
    """
    Serializer for Room model.
    """
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    is_active = serializers.ReadOnlyField()
    can_start = serializers.ReadOnlyField()
    duration_minutes = serializers.ReadOnlyField()
    
    class Meta:
        model = Room
        fields = [
            'id', 'public_uuid', 'name', 'room_type', 'status',
            'livekit_room_name', 'created_by', 'created_by_name', 'created_by_email',
            'scheduled_start', 'scheduled_end', 
            'actual_start', 'actual_end',
            'current_participants', 'peak_participants',
            'recording_enabled', 'recording_status',
            'is_active', 'can_start', 'duration_minutes',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'public_uuid', 'livekit_room_name', 'livekit_room_sid',
            'status', 'current_participants', 'peak_participants',
            'recording_status', 'actual_start', 'actual_end',
            'created_at', 'updated_at'
        ]


class RoomDetailSerializer(RoomSerializer):
    """
    Detailed serializer for Room with additional information.
    """
    booking = serializers.SerializerMethodField()
    service_session = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    
    class Meta(RoomSerializer.Meta):
        fields = RoomSerializer.Meta.fields + [
            'booking', 'service_session', 'participants',
            'empty_timeout', 'max_participants',
            'dial_in_number', 'dial_in_pin'
        ]
    
    def get_booking(self, obj):
        if obj.booking:
            from bookings.api.v1.serializers import BookingMinimalSerializer
            return BookingMinimalSerializer(obj.booking).data
        return None
    
    def get_service_session(self, obj):
        if obj.service_session:
            from services.api.v1.serializers import ServiceSessionSerializer
            return ServiceSessionSerializer(obj.service_session).data
        return None
    
    def get_participants(self, obj):
        # Only show participants if room is active or user is the practitioner
        request = self.context.get('request')
        if request and (obj.is_active or obj.created_by == request.user):
            return RoomParticipantSerializer(
                obj.participants.all(), 
                many=True
            ).data
        return []


class RoomTokenRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a room token.
    """
    room_id = serializers.UUIDField(required=True)
    participant_name = serializers.CharField(
        max_length=255, 
        required=False,
        help_text="Override display name for this session"
    )
    
    def validate_room_id(self, value):
        try:
            room = Room.objects.get(public_uuid=value)
            if not room.can_start and room.status == 'pending':
                raise serializers.ValidationError(
                    "Room cannot be joined yet. Please wait until 15 minutes before scheduled start."
                )
            if room.status == 'ended':
                raise serializers.ValidationError("This room has ended.")
            return room
        except Room.DoesNotExist:
            raise serializers.ValidationError("Room not found.")


class RoomTokenResponseSerializer(serializers.Serializer):
    """
    Serializer for room token response.
    """
    token = serializers.CharField()
    room_name = serializers.CharField()
    participant_identity = serializers.CharField()
    expires_at = serializers.DateTimeField()
    permissions = serializers.DictField()
    join_url = serializers.URLField()


class RoomParticipantSerializer(serializers.ModelSerializer):
    """
    Serializer for RoomParticipant model.
    """
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = RoomParticipant
        fields = [
            'id', 'user', 'user_name', 'user_email', 'identity', 'role', 
            'joined_at', 'left_at', 'duration_seconds', 'is_presenter', 
            'is_dial_in', 'connection_quality'
        ]
        read_only_fields = [
            'id', 'identity', 'joined_at', 'left_at', 'duration_seconds'
        ]


class RoomRecordingSerializer(serializers.ModelSerializer):
    """
    Serializer for RoomRecording model.
    """
    duration_formatted = serializers.ReadOnlyField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = RoomRecording
        fields = [
            'id', 'recording_id', 'status', 'started_at', 'ended_at',
            'duration_seconds', 'duration_formatted', 'file_size_bytes',
            'file_format', 'file_url', 'thumbnail_url', 'is_processed',
            'download_url', 'created_at'
        ]
        read_only_fields = fields
    
    def get_download_url(self, obj):
        # Generate a signed URL for downloading the recording
        # This would depend on your storage backend
        if obj.file_url and obj.is_processed:
            return obj.file_url
        return None


class CreateRoomSerializer(serializers.Serializer):
    """
    Serializer for creating ad-hoc rooms (future feature).
    """
    name = serializers.CharField(max_length=255)
    room_type = serializers.ChoiceField(
        choices=['individual', 'group', 'webinar'],
        default='individual'
    )
    scheduled_start = serializers.DateTimeField(required=False)
    scheduled_end = serializers.DateTimeField(required=False)
    max_participants = serializers.IntegerField(
        min_value=1,
        max_value=1000,
        default=100
    )
    recording_enabled = serializers.BooleanField(default=False)

    def validate(self, data):
        if data.get('scheduled_start') and data.get('scheduled_end'):
            if data['scheduled_start'] >= data['scheduled_end']:
                raise serializers.ValidationError(
                    "Scheduled end time must be after start time."
                )
        return data


class StartRecordingSerializer(serializers.Serializer):
    """
    Serializer for starting a room recording.
    """
    layout = serializers.ChoiceField(
        choices=['speaker', 'grid', 'single-speaker'],
        default='speaker',
        help_text="Layout type for the recording"
    )
    file_format = serializers.ChoiceField(
        choices=['mp4', 'webm'],
        default='mp4',
        help_text="Output file format"
    )
    audio_only = serializers.BooleanField(
        default=False,
        help_text="Record audio only (no video)"
    )


class RecordingResponseSerializer(serializers.Serializer):
    """
    Response serializer for recording operations.
    """
    recording_id = serializers.CharField()
    status = serializers.CharField()
    message = serializers.CharField()
    recording = RoomRecordingSerializer(required=False)