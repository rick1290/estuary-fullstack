"""
Media API permissions
"""
from rest_framework import permissions


class IsMediaOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of media to view/edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Allow read access to media owner
        if request.method in permissions.SAFE_METHODS:
            return obj.uploaded_by == request.user
        
        # Write permissions are only allowed to the owner
        return obj.uploaded_by == request.user


class CanUploadMedia(permissions.BasePermission):
    """
    Permission to check if user can upload media.
    
    Can be extended to check user quotas, subscription limits, etc.
    """
    
    def has_permission(self, request, view):
        # For now, any authenticated user can upload
        # In the future, this could check:
        # - User's storage quota
        # - Subscription plan limits
        # - Rate limiting
        return request.user and request.user.is_authenticated