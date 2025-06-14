from rest_framework import permissions


class IsNotificationOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of a notification to view/edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Allow read/write permissions only to the owner of the notification
        return obj.user == request.user


class IsNotificationSettingOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of notification settings to view/edit them.
    """
    
    def has_object_permission(self, request, view, obj):
        # Allow read/write permissions only to the owner of the settings
        return obj.user == request.user


class CanManageNotificationTemplates(permissions.BasePermission):
    """
    Custom permission for managing notification templates.
    Only staff users can create/edit templates.
    """
    
    def has_permission(self, request, view):
        # Allow read access to all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Write permissions only for staff
        return request.user and request.user.is_staff