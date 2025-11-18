"""
Custom permissions for services API
"""
from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        return obj.user == request.user


class IsPractitionerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow practitioners to create/edit.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to practitioners
        return hasattr(request.user, 'practitioner_profile')


class IsServiceOwner(permissions.BasePermission):
    """
    Custom permission to only allow the primary practitioner of a service to edit it.
    Handles both Service and ServiceSession objects.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the primary practitioner
        if hasattr(request.user, 'practitioner_profile'):
            # Handle ServiceSession - check the service's primary practitioner
            if hasattr(obj, 'service') and hasattr(obj.service, 'primary_practitioner'):
                return obj.service.primary_practitioner == request.user.practitioner_profile
            # Handle Service directly
            elif hasattr(obj, 'primary_practitioner'):
                return obj.primary_practitioner == request.user.practitioner_profile
        return False


class IsPractitionerCategoryOwner(permissions.BasePermission):
    """
    Custom permission for practitioner categories.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to the owner
        if not hasattr(request.user, 'practitioner_profile'):
            return False
        
        # All permissions are only allowed to the category owner
        return obj.practitioner == request.user.practitioner_profile


class CanAccessResource(permissions.BasePermission):
    """
    Permission to check if user can access a resource based on access level.
    """
    def has_object_permission(self, request, view, obj):
        # Public resources are accessible to all
        if obj.access_level == 'public':
            return True
        
        # Registered resources need authentication
        if obj.access_level == 'registered':
            return request.user.is_authenticated
        
        # Enrolled resources need a booking
        if obj.access_level == 'enrolled':
            if not request.user.is_authenticated:
                return False
            
            # Check if user has a booking for the service
            if obj.service:
                return obj.service.bookings.filter(user=request.user).exists()
            elif obj.service_session:
                return obj.service_session.participants.filter(user=request.user).exists()
            elif obj.booking:
                return obj.booking.user == request.user
        
        # Completed resources need a completed booking
        if obj.access_level == 'completed':
            if not request.user.is_authenticated:
                return False
            
            # Check if user has completed the service
            if obj.service:
                return obj.service.bookings.filter(
                    user=request.user,
                    status='completed'
                ).exists()
        
        # Private resources are only for specific booking recipient
        if obj.access_level == 'private':
            if not request.user.is_authenticated:
                return False
            
            if obj.booking:
                return obj.booking.user == request.user
        
        return False