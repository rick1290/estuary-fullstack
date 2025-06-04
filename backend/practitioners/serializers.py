from rest_framework import serializers
from .models import Practitioner
from apps.users.serializers import UserMinimalSerializer


class PractitionerMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for practitioner information used in other apps."""
    
    user = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = Practitioner
        fields = [
            'user', 'display_name', 'title', 'is_verified', 'average_rating'
        ]
        read_only_fields = fields
