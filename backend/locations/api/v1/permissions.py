from rest_framework import permissions
from utils.permissions import IsPractitioner


class IsLocationOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of a location to edit it.
    Allows read-only access for any request.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner of the location
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'practitioner_profile') and 
            obj.practitioner == request.user.practitioner_profile
        )


class CanManageLocation(permissions.BasePermission):
    """
    Permission to check if a practitioner can manage locations.
    This could be extended to check subscription tiers for location limits.
    """
    
    def has_permission(self, request, view):
        # Must be authenticated and a practitioner
        if not request.user.is_authenticated:
            return False
        
        if not hasattr(request.user, 'practitioner_profile'):
            return False
        
        # Could add subscription tier checks here
        # For example: check max_locations from subscription features
        return True
    
    def has_object_permission(self, request, view, obj):
        # Only the location owner can modify it
        return obj.practitioner == request.user.practitioner_profile