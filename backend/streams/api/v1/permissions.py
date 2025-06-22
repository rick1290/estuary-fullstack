from rest_framework import permissions
from streams.models import Stream, StreamSubscription


class IsPractitionerOwner(permissions.BasePermission):
    """
    Permission to check if user is a practitioner and owns the resource.
    """
    
    def has_permission(self, request, view):
        # User must be authenticated and have a practitioner profile
        return (
            request.user.is_authenticated and
            hasattr(request.user, 'practitioner_profile') and
            request.user.practitioner_profile is not None
        )
    
    def has_object_permission(self, request, view, obj):
        # Check if the practitioner owns the object
        if hasattr(obj, 'practitioner'):
            return obj.practitioner == request.user.practitioner_profile
        elif hasattr(obj, 'stream'):
            return obj.stream.practitioner == request.user.practitioner_profile
        return False


class IsStreamOwner(permissions.BasePermission):
    """
    Permission to check if user owns the stream.
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Admin can access everything
        if request.user.is_staff:
            return True
        
        # Check if user has practitioner profile
        if not hasattr(request.user, 'practitioner_profile'):
            return False
        
        # Check ownership based on object type
        if isinstance(obj, Stream):
            return obj.practitioner == request.user.practitioner_profile
        elif hasattr(obj, 'stream'):
            return obj.stream.practitioner == request.user.practitioner_profile
        
        return False


class CanAccessStream(permissions.BasePermission):
    """
    Permission to check if user can access stream content based on subscription.
    """
    
    def has_object_permission(self, request, view, obj):
        # Allow read access to basic info
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if not request.user.is_authenticated:
            return False
        
        # Owner can always access
        if hasattr(request.user, 'practitioner_profile') and request.user.practitioner_profile:
            if hasattr(obj, 'practitioner') and obj.practitioner == request.user.practitioner_profile:
                return True
            elif hasattr(obj, 'stream') and obj.stream.practitioner == request.user.practitioner_profile:
                return True
        
        # Check subscription for content access
        if hasattr(obj, 'stream'):
            stream = obj.stream
        elif isinstance(obj, Stream):
            stream = obj
        else:
            return False
        
        # Check if content is public
        if hasattr(obj, 'is_public') and obj.is_public:
            return True
        
        # Check subscription
        subscription = StreamSubscription.objects.filter(
            user=request.user,
            stream=stream,
            status='active'
        ).first()
        
        if not subscription:
            return False
        
        # Check tier access
        if hasattr(obj, 'tier_level'):
            return subscription.has_access_to_tier(obj.tier_level)
        
        return True


class IsSubscriber(permissions.BasePermission):
    """
    Permission to check if user is subscribed to a stream.
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Get the stream
        if hasattr(obj, 'stream'):
            stream = obj.stream
        elif isinstance(obj, Stream):
            stream = obj
        else:
            return False
        
        # Check subscription
        return StreamSubscription.objects.filter(
            user=request.user,
            stream=stream,
            status='active'
        ).exists()