from django.db import models
from django.core.validators import URLValidator
from utils.models import BaseModel
import uuid


class Room(BaseModel):
    """
    Model representing a video room.
    """
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('error', 'Error'),
    )
    
    daily_room_name = models.CharField(max_length=255, unique=True)
    daily_room_url = models.URLField(validators=[URLValidator()])
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    ended_at = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['daily_room_name']),
            models.Index(fields=['status', 'created_at']),
        ]
        
    def __str__(self):
        return f"Room {str(self.id)[:8]}... - {self.daily_room_name}"


class VideoToken(BaseModel):
    """
    Model representing a video token for a room.
    """
    ROLE_CHOICES = (
        ('owner', 'Owner'),
        ('participant', 'Participant'),
        ('observer', 'Observer'),
    )
    
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='video_tokens')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='tokens')
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
    Model representing the relationship between rooms and bookings.
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
