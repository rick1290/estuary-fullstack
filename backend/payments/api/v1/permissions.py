"""
Custom permissions for payments app
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
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsPractitionerOwner(permissions.BasePermission):
    """
    Custom permission to only allow practitioners to access their own data.
    """
    def has_permission(self, request, view):
        # Staff users have full access
        if request.user.is_staff:
            return True
        
        # Regular users must be practitioners
        return hasattr(request.user, 'practitioner_profile')
    
    def has_object_permission(self, request, view, obj):
        # Staff users have full access
        if request.user.is_staff:
            return True
        
        # Check if user is the practitioner
        if hasattr(obj, 'practitioner'):
            return obj.practitioner == request.user.practitioner_profile
        return False


class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow staff to create/update/delete.
    """
    def has_permission(self, request, view):
        # Read permissions are allowed to any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Write permissions are only allowed to staff
        return request.user.is_staff


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Custom permission to allow owners or staff to access.
    """
    def has_object_permission(self, request, view, obj):
        # Staff users have full access
        if request.user.is_staff:
            return True
        
        # Check ownership
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'practitioner'):
            return (
                hasattr(request.user, 'practitioner_profile') and
                obj.practitioner == request.user.practitioner_profile
            )
        return False