"""
Room API permissions.
"""
from rest_framework import permissions


class IsRoomParticipant(permissions.BasePermission):
    """
    Permission to check if user is a participant in the room.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user

        # Room creator
        if obj.created_by == user:
            return True

        # Service session participant
        if obj.service_session:
            service = obj.service_session.service
            if service:
                # Practitioner
                practitioner = service.primary_practitioner
                if practitioner and practitioner.user == user:
                    return True
                # Booked participant
                if obj.service_session.bookings.filter(user=user, status='confirmed').exists():
                    return True

        # Active participant (already in the room)
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

        # Practitioner is host for service session
        if obj.service_session:
            service = obj.service_session.service
            if service:
                practitioner = service.primary_practitioner
                if practitioner and practitioner.user == user:
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

        # Practitioner can access their session recordings
        if room.service_session:
            service = room.service_session.service
            if service:
                practitioner = service.primary_practitioner
                if practitioner and practitioner.user == user:
                    return True

        # Participants can access if recording is marked as public
        if obj.is_public:
            if room.service_session and room.service_session.bookings.filter(user=user, status='confirmed').exists():
                return True

        return False
