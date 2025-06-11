from rest_framework import permissions
from bookings.models import Booking


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of a review to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        return obj.user == request.user


class CanCreateReview(permissions.BasePermission):
    """
    Permission to check if user can create a review.
    User must have a completed booking for the practitioner/service.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Extract practitioner/service from request data
        practitioner_uuid = request.data.get('practitioner_uuid')
        service_uuid = request.data.get('service_uuid')
        booking_uuid = request.data.get('booking_uuid')
        
        # If booking UUID is provided, check it exists and is completed
        if booking_uuid:
            return Booking.objects.filter(
                public_uuid=booking_uuid,
                user=request.user,
                status='completed'
            ).exists()
        
        # Otherwise, check for any completed booking with the practitioner/service
        bookings = Booking.objects.filter(
            user=request.user,
            status='completed'
        )
        
        if practitioner_uuid:
            bookings = bookings.filter(practitioner__public_uuid=practitioner_uuid)
        if service_uuid:
            bookings = bookings.filter(service__public_uuid=service_uuid)
        
        return bookings.exists()


class CanRespondToReview(permissions.BasePermission):
    """
    Permission for practitioners to respond to their reviews.
    """
    def has_object_permission(self, request, view, obj):
        # User must be authenticated
        if not request.user.is_authenticated:
            return False
        
        # User must be a practitioner
        if not hasattr(request.user, 'practitioner_profile'):
            return False
        
        # Review must be for this practitioner
        return obj.practitioner == request.user.practitioner_profile


class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Permission for staff-only write access, read-only for others.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff