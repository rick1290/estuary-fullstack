"""
Base serializers for DRF
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal

User = get_user_model()


class BaseModelSerializer(serializers.ModelSerializer):
    """
    Base serializer with common functionality
    All model serializers should inherit from this
    """
    
    class Meta:
        abstract = True
        read_only_fields = ('id', 'created_at', 'updated_at', 'deleted_at')


class TimestampedModelSerializer(BaseModelSerializer):
    """
    Serializer for models with timestamp fields
    Ensures consistent datetime formatting
    """
    created_at = serializers.DateTimeField(
        read_only=True,
        format='%Y-%m-%dT%H:%M:%S.%fZ'
    )
    updated_at = serializers.DateTimeField(
        read_only=True,
        format='%Y-%m-%dT%H:%M:%S.%fZ'
    )
    deleted_at = serializers.DateTimeField(
        read_only=True,
        format='%Y-%m-%dT%H:%M:%S.%fZ',
        allow_null=True
    )


class PublicModelSerializer(TimestampedModelSerializer):
    """
    Serializer for models with public UUID
    """
    public_id = serializers.UUIDField(
        source='public_uuid',
        read_only=True
    )
    
    class Meta(TimestampedModelSerializer.Meta):
        abstract = True


class UserSerializer(BaseModelSerializer):
    """
    Consistent user representation across all APIs
    This should be used whenever displaying user information
    """
    full_name = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name',
            'full_name', 'display_name', 'is_active'
        )
        read_only_fields = ('id', 'email', 'is_active')
        
    def get_full_name(self, obj):
        """Get user's full name"""
        return f"{obj.first_name} {obj.last_name}".strip()
    
    def get_display_name(self, obj):
        """Get display name (full name or email)"""
        full_name = self.get_full_name(obj)
        return full_name or obj.email.split('@')[0]


class UserBriefSerializer(serializers.ModelSerializer):
    """
    Minimal user information for lists and references
    """
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'display_name')
        
    def get_display_name(self, obj):
        """Get display name"""
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.email.split('@')[0]


class MoneyField(serializers.Field):
    """
    Custom field for handling money (stored as cents in DB)
    Serializes to string to avoid floating point issues
    """
    def to_representation(self, value):
        """Convert cents to dollars as string"""
        if value is None:
            return None
        return str(Decimal(value) / 100)
    
    def to_internal_value(self, data):
        """Convert dollars to cents"""
        if data is None:
            return None
        try:
            # Convert to Decimal to avoid float issues
            dollars = Decimal(str(data))
            cents = int(dollars * 100)
            return cents
        except (ValueError, TypeError, ArithmeticError):
            raise serializers.ValidationError(
                'Invalid money format. Use string or number like "10.00"'
            )


class AddressField(serializers.Field):
    """
    Custom field for address representation
    """
    def to_representation(self, value):
        """Serialize address object"""
        if not value:
            return None
        
        return {
            'id': value.id,
            'name': value.name,
            'address_line_1': value.address_line_1,
            'address_line_2': value.address_line_2,
            'city': value.city,
            'state_province': value.state_province,
            'postal_code': value.postal_code,
            'country_code': value.country_code,
            'latitude': float(value.latitude) if value.latitude else None,
            'longitude': float(value.longitude) if value.longitude else None,
        }


class ErrorResponseSerializer(serializers.Serializer):
    """
    Standard error response format
    """
    status = serializers.CharField(default='error')
    message = serializers.CharField()
    errors = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField()),
        required=False
    )
    code = serializers.CharField(required=False)


class SuccessResponseSerializer(serializers.Serializer):
    """
    Standard success response format
    """
    status = serializers.CharField(default='success')
    message = serializers.CharField(required=False)
    data = serializers.JSONField(required=False)


class PaginatedResponseSerializer(serializers.Serializer):
    """
    Standard paginated response format
    """
    status = serializers.CharField(default='success')
    data = serializers.DictField(
        child=serializers.JSONField()
    )
    
    def to_representation(self, instance):
        """Ensure data includes pagination info"""
        data = super().to_representation(instance)
        
        # Ensure required pagination fields
        if 'data' in data:
            data['data'].setdefault('results', [])
            data['data'].setdefault('count', 0)
            data['data'].setdefault('next', None)
            data['data'].setdefault('previous', None)
            
        return data