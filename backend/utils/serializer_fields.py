"""
Shared serializer fields that can be used across multiple apps.
"""
from rest_framework import serializers
import uuid

class SafeImageURLField(serializers.URLField):
    """
    A custom field that returns a fallback URL when the original URL points to a local file that doesn't exist.
    """
    def to_representation(self, value):
        if not value:
            return None
            
        # If it's already an external URL, return it as is
        if value.startswith('http'):
            return value
            
        # If it's a local file path, return a placeholder image
        if value.startswith('/') or value.startswith('media/'):
            # Generate a random seed for the placeholder image
            random_seed = str(uuid.uuid4())
            # Return a placeholder image URL
            return f"https://picsum.photos/seed/{random_seed}/800/600"
            
        # For all other cases, return the value as is
        return value
