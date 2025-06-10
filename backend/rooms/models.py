from django.db import models
from django.core.validators import URLValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from utils.models import BaseModel, PublicModel
import uuid
import secrets
from datetime import timedelta
from django.utils import timezone


# Room type choices
ROOM_TYPE_CHOICES = [
    ('individual', 'Individual Session'),
    ('group', 'Group Session'),
    ('webinar', 'Webinar'),
    ('broadcast', 'Broadcast'),
]

# Room status choices
ROOM_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('active', 'Active'),
    ('in_use', 'In Use'),
    ('ended', 'Ended'),
    ('error', 'Error'),
]

# Recording status choices
RECORDING_STATUS_CHOICES = [
    ('none', 'Not Recording'),
    ('starting', 'Starting Recording'),
    ('active', 'Recording Active'),
    ('stopping', 'Stopping Recording'),
    ('stopped', 'Recording Stopped'),
    ('processing', 'Processing'),
    ('ready', 'Recording Ready'),
    ('failed', 'Recording Failed'),
]

# Participant role choices
PARTICIPANT_ROLE_CHOICES = [
    ('host', 'Host'),
    ('participant', 'Participant'),
    ('viewer', 'Viewer'),
    ('moderator', 'Moderator'),
]


class RoomTemplate(BaseModel):
    """
    Templates for creating rooms with predefined settings.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='individual')
    
    # LiveKit room settings
    empty_timeout = models.IntegerField(
        default=300,
        help_text="Seconds to keep room alive when empty (default 5 min)"
    )
    max_participants = models.IntegerField(
        default=100,
        validators=[MinValueValidator(1), MaxValueValidator(1000)],
        help_text="Maximum number of participants allowed"
    )
    
    # Video settings
    video_codec = models.CharField(
        max_length=10,
        default='vp8',
        choices=[('vp8', 'VP8'), ('h264', 'H264'), ('vp9', 'VP9'), ('av1', 'AV1')]
    )
    
    # Audio settings
    audio_codec = models.CharField(
        max_length=10,
        default='opus',
        choices=[('opus', 'Opus'), ('aac', 'AAC')]
    )
    
    # Recording settings
    recording_enabled = models.BooleanField(default=False)
    recording_audio_only = models.BooleanField(default=False)
    recording_output_format = models.CharField(
        max_length=10,
        default='mp4',
        choices=[('mp4', 'MP4'), ('webm', 'WebM'), ('m3u8', 'HLS')]
    )
    
    # Egress/streaming settings
    streaming_enabled = models.BooleanField(default=False)
    rtmp_outputs = models.JSONField(
        default=list,
        blank=True,
        help_text="List of RTMP URLs for streaming"
    )
    
    # SIP/PSTN settings
    sip_enabled = models.BooleanField(default=False)
    sip_trunk_id = models.CharField(max_length=100, blank=True)
    sip_dispatch_rule_id = models.CharField(max_length=100, blank=True)
    
    # Webhook settings
    webhook_url = models.URLField(blank=True, help_text="URL for room event webhooks")
    
    # Default permissions
    default_permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Default permissions for participants"
    )
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['name']
        
    def __str__(self):
        return f"Room Template: {self.name}"
    
    def save(self, *args, **kwargs):
        if self.is_default:
            # Ensure only one default template per room type
            RoomTemplate.objects.filter(
                room_type=self.room_type,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class Room(PublicModel):
    """
    Model representing a LiveKit video room.
    """
    # Core fields
    name = models.CharField(max_length=255, unique=True, db_index=True)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='individual')
    status = models.CharField(max_length=20, choices=ROOM_STATUS_CHOICES, default='pending')
    
    # LiveKit specific fields
    livekit_room_sid = models.CharField(max_length=100, unique=True, blank=True, null=True)
    livekit_room_name = models.CharField(max_length=255, unique=True)
    
    # Template and configuration
    template = models.ForeignKey(
        RoomTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rooms'
    )
    
    # Room settings (can override template)
    empty_timeout = models.IntegerField(
        default=300,
        help_text="Seconds to keep room alive when empty"
    )
    max_participants = models.IntegerField(
        default=100,
        validators=[MinValueValidator(1), MaxValueValidator(1000)]
    )
    
    # Recording settings
    recording_enabled = models.BooleanField(default=False)
    recording_status = models.CharField(
        max_length=20,
        choices=RECORDING_STATUS_CHOICES,
        default='none'
    )
    recording_id = models.CharField(max_length=100, blank=True)
    
    # SIP/PSTN fields
    sip_enabled = models.BooleanField(default=False)
    dial_in_number = models.CharField(max_length=20, blank=True)
    dial_in_pin = models.CharField(max_length=10, blank=True)
    
    # Timing fields
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    
    # Relationships
    booking = models.OneToOneField(
        'bookings.Booking',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='livekit_room'
    )
    service_session = models.OneToOneField(
        'services.ServiceSession',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='livekit_room'
    )
    
    # Participant tracking
    current_participants = models.IntegerField(default=0)
    peak_participants = models.IntegerField(default=0)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Analytics fields
    total_duration_seconds = models.IntegerField(default=0)
    total_participants = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['livekit_room_name']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['booking']),
            models.Index(fields=['service_session']),
            models.Index(fields=['scheduled_start']),
        ]
        
    def __str__(self):
        return f"Room {self.name} ({self.get_room_type_display()})"
    
    def clean(self):
        """Validate that room has either booking or service_session, not both."""
        if self.booking and self.service_session:
            raise ValidationError("Room cannot be linked to both booking and service session")
        if not self.booking and not self.service_session:
            raise ValidationError("Room must be linked to either booking or service session")
    
    def save(self, *args, **kwargs):
        if not self.livekit_room_name:
            # Generate unique LiveKit room name
            self.livekit_room_name = f"{self.room_type}-{uuid.uuid4().hex[:12]}"
        
        if not self.name:
            # Generate human-readable name
            if self.booking:
                self.name = f"{self.booking.service.name} - {self.booking.start_time.strftime('%Y%m%d-%H%M')}"
            elif self.service_session:
                self.name = f"{self.service_session.service.name} Session {self.service_session.sequence_number}"
        
        # Set scheduled times from booking or session
        if not self.scheduled_start:
            if self.booking:
                self.scheduled_start = self.booking.start_time
                self.scheduled_end = self.booking.end_time
            elif self.service_session:
                self.scheduled_start = self.service_session.start_time
                self.scheduled_end = self.service_session.end_time
        
        # Apply template settings if template is set and this is a new room
        if not self.pk and self.template:
            self.empty_timeout = self.template.empty_timeout
            self.max_participants = self.template.max_participants
            self.recording_enabled = self.template.recording_enabled
            self.sip_enabled = self.template.sip_enabled
        
        # Generate dial-in PIN if SIP is enabled and no PIN exists
        if self.sip_enabled and not self.dial_in_pin:
            self.dial_in_pin = ''.join(secrets.choice('0123456789') for _ in range(6))
        
        super().save(*args, **kwargs)
    
    @property
    def is_active(self):
        """Check if room is currently active."""
        return self.status in ['active', 'in_use']
    
    @property
    def can_start(self):
        """Check if room can be started."""
        if self.status not in ['pending', 'ended']:
            return False
        
        # Allow starting 15 minutes before scheduled time
        if self.scheduled_start:
            buffer_time = self.scheduled_start - timedelta(minutes=15)
            return timezone.now() >= buffer_time
        
        return True
    
    @property
    def duration_minutes(self):
        """Get room duration in minutes."""
        if self.actual_start and self.actual_end:
            return int((self.actual_end - self.actual_start).total_seconds() / 60)
        elif self.scheduled_start and self.scheduled_end:
            return int((self.scheduled_end - self.scheduled_start).total_seconds() / 60)
        return 0
    
    def get_join_url(self, participant_name=None):
        """Generate LiveKit join URL for web clients."""
        # This would be configured based on your LiveKit server
        base_url = "https://meet.yourdomain.com"  # Replace with your domain
        url = f"{base_url}/room/{self.livekit_room_name}"
        if participant_name:
            url += f"?name={participant_name}"
        return url


class RoomParticipant(BaseModel):
    """
    Model tracking participants in a room.
    """
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='room_participations')
    
    # LiveKit identity and SID
    identity = models.CharField(max_length=255)
    participant_sid = models.CharField(max_length=100, blank=True)
    
    # Role and permissions
    role = models.CharField(max_length=20, choices=PARTICIPANT_ROLE_CHOICES, default='participant')
    permissions = models.JSONField(default=dict, blank=True)
    
    # Participation tracking
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    
    # Connection info
    connection_quality = models.CharField(max_length=20, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    
    # Flags
    is_presenter = models.BooleanField(default=False)
    is_recording_participant = models.BooleanField(default=False)
    is_dial_in = models.BooleanField(default=False)
    
    # Analytics
    messages_sent = models.IntegerField(default=0)
    video_enabled_duration = models.IntegerField(default=0, help_text="Seconds with video on")
    audio_enabled_duration = models.IntegerField(default=0, help_text="Seconds with audio on")
    screen_share_duration = models.IntegerField(default=0, help_text="Seconds sharing screen")
    
    class Meta:
        ordering = ['-joined_at']
        unique_together = [('room', 'identity')]
        indexes = [
            models.Index(fields=['room', 'user']),
            models.Index(fields=['participant_sid']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} in {self.room.name}"
    
    def save(self, *args, **kwargs):
        if not self.identity:
            # Generate identity from user
            self.identity = f"{self.user.id}-{self.user.get_full_name().replace(' ', '-')}"
        
        # Calculate duration if left
        if self.left_at and self.joined_at:
            self.duration_seconds = int((self.left_at - self.joined_at).total_seconds())
        
        super().save(*args, **kwargs)


class RoomToken(BaseModel):
    """
    Model representing a LiveKit access token for a room.
    """
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='tokens')
    participant = models.ForeignKey(
        RoomParticipant,
        on_delete=models.CASCADE,
        related_name='tokens',
        null=True,
        blank=True
    )
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='room_tokens')
    
    # Token details
    token = models.TextField(unique=True)
    identity = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=PARTICIPANT_ROLE_CHOICES, default='participant')
    
    # Token metadata
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    is_revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    # Permissions granted by this token
    permissions = models.JSONField(default=dict, blank=True)
    
    # Usage tracking
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', 'room']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['is_used', 'is_revoked']),
        ]
        
    def __str__(self):
        return f"Token for {self.user} in {self.room.name}"
    
    @property
    def is_valid(self):
        """Check if token is still valid."""
        if self.is_revoked:
            return False
        if self.expires_at < timezone.now():
            return False
        return True


class RoomRecording(BaseModel):
    """
    Model representing a room recording.
    """
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='recordings')
    
    # LiveKit recording details
    recording_id = models.CharField(max_length=100, unique=True)
    egress_id = models.CharField(max_length=100, unique=True)
    
    # Recording info
    status = models.CharField(max_length=20, choices=RECORDING_STATUS_CHOICES, default='starting')
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    
    # File information
    file_url = models.URLField(blank=True)
    file_size_bytes = models.BigIntegerField(default=0)
    file_format = models.CharField(
        max_length=10,
        choices=[('mp4', 'MP4'), ('webm', 'WebM'), ('m3u8', 'HLS')]
    )
    
    # Storage details
    storage_provider = models.CharField(
        max_length=20,
        default='r2',
        choices=[('r2', 'Cloudflare R2'), ('s3', 'AWS S3'), ('gcs', 'Google Cloud Storage')]
    )
    storage_bucket = models.CharField(max_length=100, blank=True)
    storage_key = models.CharField(max_length=500, blank=True)
    
    # Processing status
    is_processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    thumbnail_url = models.URLField(blank=True)
    
    # Access control
    is_public = models.BooleanField(default=False)
    access_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['recording_id']),
            models.Index(fields=['room', 'status']),
        ]
        
    def __str__(self):
        return f"Recording {self.recording_id} for {self.room.name}"
    
    def save(self, *args, **kwargs):
        # Calculate duration
        if self.ended_at and self.started_at:
            self.duration_seconds = int((self.ended_at - self.started_at).total_seconds())
        super().save(*args, **kwargs)
    
    @property
    def duration_formatted(self):
        """Get formatted duration string."""
        if not self.duration_seconds:
            return "0:00"
        
        hours = self.duration_seconds // 3600
        minutes = (self.duration_seconds % 3600) // 60
        seconds = self.duration_seconds % 60
        
        if hours:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        return f"{minutes}:{seconds:02d}"


# Keep legacy models for backward compatibility during migration
class VideoToken(BaseModel):
    """
    Legacy model - to be migrated to RoomToken.
    """
    ROLE_CHOICES = (
        ('owner', 'Owner'),
        ('participant', 'Participant'),
        ('observer', 'Observer'),
    )
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='video_tokens')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='legacy_tokens')
    token = models.TextField(unique=True)
    booking = models.ForeignKey(
        'bookings.Booking', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='video_tokens'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='participant')
    permissions = models.JSONField(default=dict, blank=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    is_revoked = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'room']),
            models.Index(fields=['token']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['is_used', 'is_revoked']),
        ]
        
    def __str__(self):
        return f"Video Token for {self.user} in {self.room}"


class RoomBookingRelation(BaseModel):
    """
    Legacy model - relationships now handled directly in Room model.
    """
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='booking_relations')
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='room_relations')

    class Meta:
        unique_together = (('room', 'booking'),)
        indexes = [
            models.Index(fields=['room']),
            models.Index(fields=['booking']),
        ]

    def __str__(self):
        return f"Room {self.room} for Booking {str(self.booking.public_uuid)[:8]}..."