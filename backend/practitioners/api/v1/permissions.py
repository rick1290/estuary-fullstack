"""
Custom permissions for Practitioners API
"""
from rest_framework import permissions


class IsPractitionerOwner(permissions.BasePermission):
    """
    Permission to only allow practitioners to edit their own profile.
    """
    
    def has_permission(self, request, view):
        # Must be authenticated
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Check if the object is a Practitioner
        from practitioners.models import Practitioner, Schedule, OutOfOffice
        
        if isinstance(obj, Practitioner):
            return obj.user == request.user
        elif isinstance(obj, (Schedule, OutOfOffice)):
            return obj.practitioner.user == request.user
        
        # For other objects, check if they have a practitioner attribute
        if hasattr(obj, 'practitioner'):
            return obj.practitioner.user == request.user
        
        return False


class IsPractitionerOrReadOnly(permissions.BasePermission):
    """
    Permission to allow practitioners to edit their own content,
    but allow anyone to read.
    """
    
    def has_permission(self, request, view):
        # Allow read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for authenticated practitioners
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'practitioner_profile')
        )
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for the practitioner who owns the object
        from practitioners.models import Practitioner
        
        if isinstance(obj, Practitioner):
            return obj.user == request.user
        elif hasattr(obj, 'practitioner'):
            return obj.practitioner.user == request.user
        elif hasattr(obj, 'primary_practitioner'):
            return obj.primary_practitioner.user == request.user
        
        return False


class IsVerifiedPractitioner(permissions.BasePermission):
    """
    Permission to only allow verified practitioners.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'practitioner_profile') and
            request.user.practitioner_profile.is_verified
        )


class CanManageServices(permissions.BasePermission):
    """
    Permission to check if practitioner can manage services.
    Takes into account subscription limits.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if not hasattr(request.user, 'practitioner_profile'):
            return False
        
        practitioner = request.user.practitioner_profile
        
        # Check if practitioner is active and verified
        if not practitioner.is_verified or practitioner.practitioner_status != 'active':
            return False
        
        # For creating new services, check subscription limits
        if request.method == 'POST' and view.action == 'create':
            # Get current service count
            from services.models import Service
            current_count = Service.objects.filter(
                primary_practitioner=practitioner,
                is_active=True
            ).count()
            
            # Check subscription tier limits
            # TODO: Implement subscription tier checking
            # For now, allow up to 10 services
            if current_count >= 10:
                return False
        
        return True