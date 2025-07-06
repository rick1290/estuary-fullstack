"""
Room API permissions.
"""
from rest_framework import permissions


class IsRoomParticipant(permissions.BasePermission):
    """
    Permission to check if user is a participant in the room.
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if user is involved in the room
        user = request.user
        
        # Room creator
        if obj.created_by == user:
            return True
        
        # Booking participant
        if obj.booking:
            if obj.booking.user == user or obj.booking.practitioner.user == user:
                return True
        
        # Service session participant
        if obj.service_session:
            # Practitioner
            if obj.service_session.service.practitioner.user == user:
                return True
            # Booked participant
            if obj.service_session.bookings.filter(user=user).exists():
                return True
        
        # Active participant
        if obj.participants.filter(user=user, left_at__isnull=True).exists():
            return True
        
        return False


class IsRoomHost(permissions.BasePermission):
    """
    Permission to check if user is the host of the room.
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Room creator is host
        if obj.created_by == user:
            return True
        
        # Practitioner is host for booking
        if obj.booking and obj.booking.practitioner.user == user:
            return True
        
        # Practitioner is host for service session
        if obj.service_session and obj.service_session.service.practitioner.user == user:
            return True
        
        return False


class CanAccessRoomRecording(permissions.BasePermission):
    """
    Permission to check if user can access room recordings.
    """
    
    def has_object_permission(self, request, view, obj):
        # obj here is the recording
        room = obj.room
        user = request.user
        
        # Room host can always access
        if room.created_by == user:
            return True
        
        # Practitioners can access their session recordings
        if room.booking and room.booking.practitioner.user == user:
            return True
        if room.service_session and room.service_session.service.practitioner.user == user:
            return True
        
        # Participants can access if recording is marked as public
        if obj.is_public:
            # Check if user was a participant
            if room.booking and room.booking.user == user:
                return True
            if room.service_session and room.service_session.bookings.filter(user=user).exists():
                return True
        
        return False