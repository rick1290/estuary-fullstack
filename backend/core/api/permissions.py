"""
Base permission classes for DRF
"""
from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Object-level permission to only allow owners to access
    Assumes the object has a 'user' attribute
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if object has user attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to allow owners full access,
    others read-only access
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsPractitioner(permissions.BasePermission):
    """
    User must be a verified practitioner
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            hasattr(request.user, 'practitioner_profile') and
            request.user.practitioner_profile.is_verified
        )


class IsPractitionerOwner(permissions.BasePermission):
    """
    User must be the practitioner who owns the object
    Assumes object has 'practitioner' attribute
    """
    
    def has_object_permission(self, request, view, obj):
        if not hasattr(request.user, 'practitioner_profile'):
            return False
        
        if hasattr(obj, 'practitioner'):
            return obj.practitioner == request.user.practitioner_profile
        
        if hasattr(obj, 'primary_practitioner'):
            return obj.primary_practitioner == request.user.practitioner_profile
            
        return False


class IsOwnerOrPractitioner(permissions.BasePermission):
    """
    Either the owner (user) or practitioner can access
    Used for bookings, reviews, etc.
    """
    
    def has_object_permission(self, request, view, obj):
        # Owner check
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        # Practitioner check
        if hasattr(request.user, 'practitioner_profile'):
            if hasattr(obj, 'practitioner'):
                return obj.practitioner == request.user.practitioner_profile
            if hasattr(obj, 'primary_practitioner'):
                return obj.primary_practitioner == request.user.practitioner_profile
        
        return False


class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Staff users have full access, others read-only
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff


class IsAuthenticatedOrCreateOnly(permissions.BasePermission):
    """
    Unauthenticated users can only create (for registration)
    Authenticated users have full access
    """
    
    def has_permission(self, request, view):
        if request.method == 'POST':
            return True
        return request.user.is_authenticated


class HasActiveSubscription(permissions.BasePermission):
    """
    Practitioner must have an active subscription
    """
    
    def has_permission(self, request, view):
        if not hasattr(request.user, 'practitioner_profile'):
            return False
        
        practitioner = request.user.practitioner_profile
        
        # Check if practitioner has active subscription
        if hasattr(practitioner, 'subscription'):
            return practitioner.subscription.is_active
        
        return False


class CanCreateService(permissions.BasePermission):
    """
    Check if practitioner can create more services
    based on their subscription tier
    """
    
    def has_permission(self, request, view):
        if request.method != 'POST':
            return True
            
        if not hasattr(request.user, 'practitioner_profile'):
            return False
        
        practitioner = request.user.practitioner_profile
        
        # Get subscription tier limits
        if hasattr(practitioner, 'subscription'):
            subscription = practitioner.subscription
            
            # Check service limit
            current_count = practitioner.primary_services.filter(
                is_active=True
            ).count()
            
            return current_count < subscription.tier.max_services
        
        return False


class IsPublicReadOnly(permissions.BasePermission):
    """
    Anyone can read, only authenticated can write
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated