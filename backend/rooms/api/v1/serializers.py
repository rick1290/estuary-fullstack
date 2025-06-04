from rest_framework import serializers
from apps.rooms.models import Room, VideoToken, RoomBookingRelation
from apps.users.api.v1.serializers import UserBasicSerializer
from apps.bookings.api.v1.serializers import BookingBasicSerializer


class RoomSerializer(serializers.ModelSerializer):
    """
    Serializer for the Room model.
    """
    class Meta:
        model = Room
        fields = [
            'id', 'daily_room_name', 'daily_room_url', 'status',
            'created_at', 'ended_at', 'metadata'
        ]
        read_only_fields = ['id', 'daily_room_name', 'daily_room_url', 'created_at']


class VideoTokenSerializer(serializers.ModelSerializer):
    """
    Serializer for the VideoToken model.
    """
    user_details = UserBasicSerializer(source='user', read_only=True)
    room_details = RoomSerializer(source='room', read_only=True)
    booking_details = BookingBasicSerializer(source='booking', read_only=True)
    
    class Meta:
        model = VideoToken
        fields = [
            'id', 'user', 'room', 'token', 'booking', 'role',
            'permissions', 'expires_at', 'is_used', 'is_revoked',
            'user_details', 'room_details', 'booking_details'
        ]
        read_only_fields = ['id', 'token', 'expires_at']


class VideoTokenCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new VideoToken.
    """
    class Meta:
        model = VideoToken
        fields = ['user', 'room', 'booking', 'role', 'permissions']


class RoomBookingRelationSerializer(serializers.ModelSerializer):
    """
    Serializer for the RoomBookingRelation model.
    """
    room_details = RoomSerializer(source='room', read_only=True)
    booking_details = BookingBasicSerializer(source='booking', read_only=True)
    
    class Meta:
        model = RoomBookingRelation
        fields = [
            'id', 'room', 'booking', 'created_at', 'updated_at',
            'room_details', 'booking_details'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
