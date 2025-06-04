from django.db import models


class Room(models.Model):
    """
    Model representing a video room.
    """
    id = models.UUIDField(primary_key=True)
    daily_room_name = models.TextField()
    daily_room_url = models.TextField()
    status = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    ended_at = models.DateTimeField(blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True)

    class Meta:
        # Using Django's default naming convention (rooms_room)
        pass
        
    def __str__(self):
        return f"Room {self.id} - {self.daily_room_name}"


class VideoToken(models.Model):
    """
    Model representing a video token for a room.
    """
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey('users.User', models.DO_NOTHING)
    room = models.ForeignKey(Room, models.DO_NOTHING)
    token = models.TextField()
    booking = models.ForeignKey('bookings.Booking', models.DO_NOTHING, blank=True, null=True)
    role = models.TextField()
    permissions = models.JSONField(blank=True, null=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(blank=True, null=True)
    is_revoked = models.BooleanField(blank=True, null=True)

    class Meta:
        # Using Django's default naming convention (rooms_videotoken)
        pass
        
    def __str__(self):
        return f"Video Token for {self.user} in {self.room}"


class RoomBookingRelation(models.Model):
    """
    Model representing the relationship between rooms and bookings.
    """
    id = models.UUIDField(primary_key=True)
    room = models.ForeignKey(Room, models.DO_NOTHING)
    booking = models.ForeignKey('bookings.Booking', models.DO_NOTHING)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Using Django's default naming convention (rooms_roombookingrelation)
        unique_together = (('room', 'booking'),)

    def __str__(self):
        return f"Room {self.room} for Booking {self.booking}"
