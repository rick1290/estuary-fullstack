from rest_framework import permissions


class IsPractitioner(permissions.BasePermission):
    """Custom permission to only allow practitioners to access views.
    
    This permission is stricter than IsPractitionerOrReadOnly as it requires
    the user to be a practitioner for all operations, including read operations.
    """
    
    def has_permission(self, request, view):
        # All operations require the user to be a practitioner
        return request.user.is_authenticated and hasattr(request.user, 'practitioner_profile')
    
    def has_object_permission(self, request, view, obj):
        # Check if the object belongs to the practitioner
        if hasattr(obj, 'practitioner'):
            return obj.practitioner == request.user.practitioner_profile
        return True


class IsPractitionerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow practitioners to create/edit/delete objects.
    
    Allows read-only access for unauthenticated users and non-practitioners,
    but only practitioners can perform write operations.
    """
    
    def has_permission(self, request, view):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to practitioners
        return request.user.is_authenticated and hasattr(request.user, 'is_practitioner') and request.user.is_practitioner
    
    def has_object_permission(self, request, view, obj):
        # Allow read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Check if the object has a practitioner field
        if hasattr(obj, 'practitioner'):
            return request.user.is_authenticated and hasattr(request.user, 'practitioner_profile') and obj.practitioner == request.user.practitioner_profile
        
        # Check if the object has a service with a practitioner field
        if hasattr(obj, 'service') and hasattr(obj.service, 'practitioner'):
            return request.user.is_authenticated and hasattr(request.user, 'practitioner_profile') and obj.service.practitioner == request.user.practitioner_profile
        
        # Default to checking if the user is a practitioner
        return request.user.is_authenticated and hasattr(request.user, 'is_practitioner') and request.user.is_practitioner


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner of the object
        return obj.user == request.user


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admin users to edit it.
    
    Allows read-only access for authenticated users,
    but only the owner or admin users can perform write operations.
    """
    
    def has_permission(self, request, view):
        # All requests require authentication
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin users can do anything
        if request.user.is_staff:
            return True
        
        # Check if the object has a user field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Default to requiring admin status
        return False


class IsParticipantOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow participants of a conversation to edit it.
    
    Allows read-only access for authenticated users who are participants,
    but only participants can perform write operations.
    """
    
    def has_permission(self, request, view):
        # All requests require authentication
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check if the user is a participant in the conversation
        if hasattr(obj, 'participants'):
            return request.user in obj.participants.all()
        
        # For messages, check if the user is a participant in the conversation
        if hasattr(obj, 'conversation') and hasattr(obj.conversation, 'participants'):
            return request.user in obj.conversation.participants.all()
        
        # Default to requiring ownership
        return obj.user == request.user


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admin users to create/edit/delete objects.
    
    Allows read-only access for authenticated users,
    but only admin users can perform write operations.
    """
    
    def has_permission(self, request, view):
        # Read permissions are allowed to any authenticated request
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Write permissions are only allowed to admin users
        return request.user.is_authenticated and request.user.is_staff
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated request
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Write permissions are only allowed to admin users
        return request.user.is_authenticated and request.user.is_staff
