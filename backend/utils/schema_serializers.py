"""
Schema-specific serializers for API documentation and type generation.

This module defines read-only versions of serializers used across the application
to ensure proper type generation in the API schema. These serializers are used
only for documentation purposes and are not used in the actual API views.
"""

from rest_framework import serializers
from apps.users.models import User
from apps.practitioners.models import Practitioner
from apps.services.models import Service, ServiceCategory
from apps.community.models import CommunityFollow, Post, Comment, Like
from apps.bookings.models import Booking


# User serializers
class UserMinimalReadable(serializers.ModelSerializer):
    """Read-only serializer for minimal user information."""
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'profile_picture']
        read_only_fields = fields


# Practitioner serializers
class PractitionerMinimalReadable(serializers.ModelSerializer):
    """Read-only serializer for minimal practitioner information."""
    
    user = UserMinimalReadable(read_only=True)
    
    class Meta:
        model = Practitioner
        fields = ['id', 'user', 'title', 'display_name', 'is_verified']
        read_only_fields = fields


class PractitionerBasicReadable(serializers.ModelSerializer):
    """Read-only serializer for basic practitioner information."""
    
    user = UserMinimalReadable(read_only=True)
    
    class Meta:
        model = Practitioner
        fields = [
            'id', 'user', 'title', 'is_verified', 'average_rating', 
            'display_name', 'profile_image_url'
        ]
        read_only_fields = fields


# Service serializers
class ServiceMinimalReadable(serializers.ModelSerializer):
    """Read-only serializer for minimal service information."""
    
    class Meta:
        model = Service
        fields = ['id', 'name', 'price', 'duration']
        read_only_fields = fields


class ServiceBasicReadable(serializers.ModelSerializer):
    """Read-only serializer for basic service information."""
    
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'price', 'duration', 'location_type',
            'description', 'is_active', 'average_rating'
        ]
        read_only_fields = fields


# Service category serializers
class ServiceCategoryMinimalReadable(serializers.ModelSerializer):
    """Read-only serializer for minimal service category information."""
    
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'slug']
        read_only_fields = fields


class ServiceCategoryBasicReadable(serializers.ModelSerializer):
    """Read-only serializer for basic service category information."""
    
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'slug', 'description', 'icon', 'image_url', 'is_active']
        read_only_fields = fields


# Community serializers
class CommunityFollowReadable(serializers.ModelSerializer):
    """Read-only serializer for community follow information."""
    
    user = UserMinimalReadable(read_only=True)
    practitioner = PractitionerMinimalReadable(read_only=True)
    
    class Meta:
        model = CommunityFollow
        fields = ['id', 'user', 'practitioner', 'created_at']
        read_only_fields = fields


class PostMinimalReadable(serializers.ModelSerializer):
    """Read-only serializer for minimal post information."""
    
    author = UserMinimalReadable(read_only=True)
    
    class Meta:
        model = Post
        fields = ['id', 'author', 'title', 'created_at']
        read_only_fields = fields


class CommentReadable(serializers.ModelSerializer):
    """Read-only serializer for comment information."""
    
    author = UserMinimalReadable(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'author', 'content', 'created_at']
        read_only_fields = fields


class LikeReadable(serializers.ModelSerializer):
    """Read-only serializer for like information."""
    
    user = UserMinimalReadable(read_only=True)
    
    class Meta:
        model = Like
        fields = ['id', 'user', 'created_at']
        read_only_fields = fields


# Booking serializers
class BookingMinimalReadable(serializers.ModelSerializer):
    """Read-only serializer for minimal booking information."""
    
    user = UserMinimalReadable(read_only=True)
    practitioner = PractitionerMinimalReadable(read_only=True)
    service = ServiceMinimalReadable(read_only=True)
    
    class Meta:
        model = Booking
        fields = ['id', 'user', 'practitioner', 'service', 'status', 'start_time', 'end_time']
        read_only_fields = fields
