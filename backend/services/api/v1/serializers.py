from rest_framework import serializers
from apps.services.models import (
    Service, ServiceType, ServiceSession, ServiceRelationship,
    ServiceCategory, ServicePractitioner, Location, SessionParticipant,
    ServiceBenefit, SessionAgendaItem
)
from drf_spectacular.utils import extend_schema_field
import os
import uuid
from django.conf import settings
from apps.utils.serializer_fields import SafeImageURLField


class PractitionerBasicSerializer(serializers.Serializer):
    """
    Basic serializer for practitioner information used in service serializers.
    This avoids circular imports with the full practitioner serializers.
    """
    id = serializers.UUIDField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    is_verified = serializers.BooleanField(read_only=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    profile_image_url = SafeImageURLField(read_only=True)


class ServiceBasicSerializer(serializers.ModelSerializer):
    """
    Basic serializer for service information.
    Used for nested representations in other serializers.
    """
    
    image_url = SafeImageURLField(allow_null=True)
    
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'price', 'duration', 'location_type',
            'is_active', 'image_url'
        ]


class ServiceRelationshipSerializer(serializers.ModelSerializer):
    """Serializer for service relationships (for courses, packages, bundles)."""
    
    child_service_details = ServiceBasicSerializer(source='child_service', read_only=True)
    discounted_price = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceRelationship
        fields = [
            'id', 'child_service', 'child_service_details', 'order', 
            'quantity', 'discount_percentage', 'is_required',
            'description_override', 'discounted_price'
        ]

    @extend_schema_field(serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True))
    def get_discounted_price(self, obj):
        """Get the discounted price for this relationship."""
        return obj.get_discounted_price()


class ServiceTypeSerializer(serializers.ModelSerializer):
    """Serializer for service types."""
    
    class Meta:
        model = ServiceType
        fields = ['id', 'name', 'description']


class ServiceCategorySerializer(serializers.ModelSerializer):
    """Serializer for service categories."""
    
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'slug', 'description', 'parent', 'icon', 'image_url', 'is_active']
        read_only_fields = ['slug']


class ServiceSessionSerializer(serializers.ModelSerializer):
    """Serializer for service sessions (workshops/courses)."""
    
    available_spots = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceSession
        fields = [
            'id', 'service', 'title', 'description', 'start_time', 'end_time',
            'max_participants', 'current_participants', 'available_spots',
            'sequence_number', 'price', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['current_participants', 'created_at', 'updated_at']
    
    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_available_spots(self, obj):
        if obj.max_participants:
            return max(0, obj.max_participants - obj.current_participants)
        return None


class ServiceBenefitSerializer(serializers.ModelSerializer):
    """Serializer for service benefits."""
    
    class Meta:
        model = ServiceBenefit
        fields = ['id', 'title', 'description', 'icon', 'order']


class LocationSerializer(serializers.ModelSerializer):
    """Serializer for service locations."""
    
    formatted_address = serializers.SerializerMethodField()
    
    class Meta:
        model = Location
        fields = [
            'id', 'name', 'address_line1', 'address_line2', 'city', 
            'state', 'postal_code', 'country', 'latitude', 'longitude',
            'place_id', 'formatted_address'
        ]
        # Explicitly mark all fields as nullable for OpenAPI schema
        extra_kwargs = {
            'id': {'allow_null': True},
            'name': {'allow_null': True},
            'address_line1': {'allow_null': True},
            'address_line2': {'allow_null': True},
            'city': {'allow_null': True},
            'state': {'allow_null': True},
            'postal_code': {'allow_null': True},
            'country': {'allow_null': True},
            'latitude': {'allow_null': True},
            'longitude': {'allow_null': True},
            'place_id': {'allow_null': True},
        }
    
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_formatted_address(self, obj):
        """Get formatted address for this location."""
        if obj:
            return obj.formatted_address()
        return None


class SessionAgendaItemSerializer(serializers.ModelSerializer):
    """Serializer for session agenda items."""
    
    class Meta:
        model = SessionAgendaItem
        fields = ['id', 'title', 'description', 'start_time', 'end_time', 'order']


class ServiceListSerializer(serializers.ModelSerializer):
    """Serializer for listing services."""
    
    service_type = ServiceTypeSerializer(read_only=True)
    category = ServiceCategorySerializer(read_only=True)
    primary_practitioner = serializers.SerializerMethodField()
    image_url = SafeImageURLField(allow_null=True)
    
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'price', 'duration',
            'service_type', 'category', 'is_featured',
            'max_participants', 'min_participants', 'location_type',
            'image_url', 'average_rating', 'total_reviews', 'total_bookings',
            'primary_practitioner'
        ]
    
    @extend_schema_field(PractitionerBasicSerializer())
    def get_primary_practitioner(self, obj):
        # First try to get the primary practitioner
        primary = obj.practitioner_relationships.filter(is_primary=True).first()
        if primary:
            return PractitionerBasicSerializer(primary.practitioner).data
            
        # If no primary is set, fall back to the first practitioner
        first = obj.practitioner_relationships.first()
        if first:
            return PractitionerBasicSerializer(first.practitioner).data
            
        return None


class EnhancedServiceSessionSerializer(ServiceSessionSerializer):
    """Enhanced serializer for service sessions with additional details."""
    
    benefits = ServiceBenefitSerializer(many=True, read_only=True)
    agenda_items = SessionAgendaItemSerializer(many=True, read_only=True)
    location = LocationSerializer(read_only=True, allow_null=True)
    
    class Meta(ServiceSessionSerializer.Meta):
        fields = ServiceSessionSerializer.Meta.fields + [
            'agenda', 'what_youll_learn', 'benefits', 'agenda_items', 'location'
        ]


class ServiceDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed service information."""
    
    service_type = ServiceTypeSerializer(read_only=True)
    category = ServiceCategorySerializer(read_only=True)
    primary_practitioner = serializers.SerializerMethodField()
    practitioners = serializers.SerializerMethodField()
    sessions = EnhancedServiceSessionSerializer(many=True, read_only=True)
    child_relationships = ServiceRelationshipSerializer(many=True, read_only=True)
    agenda_items = SessionAgendaItemSerializer(many=True, read_only=True)
    is_course = serializers.BooleanField(read_only=True)
    is_package = serializers.BooleanField(read_only=True)
    total_package_price = serializers.SerializerMethodField()
    image_url = SafeImageURLField(allow_null=True)
    
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'price', 'duration',
            'service_type', 'category', 'is_active', 'is_featured',
            'max_participants', 'min_participants', 'location_type',
            'tags', 'image_url', 'average_rating',
            'total_reviews', 'total_bookings', 'primary_practitioner', 'practitioners',
            'sessions', 'child_relationships', 'is_course', 'is_package',
            'total_package_price', 'agenda_items'
        ]
        
    @extend_schema_field(serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True))
    def get_total_package_price(self, obj):
        """Get the total price of this package/course."""
        if obj.is_course or obj.is_package:
            return obj.get_total_package_price()
        return None
    
    @extend_schema_field(PractitionerBasicSerializer())
    def get_primary_practitioner(self, obj):
        # First try to get the primary practitioner
        primary = obj.practitioner_relationships.filter(is_primary=True).first()
        if primary:
            return PractitionerBasicSerializer(primary.practitioner).data
            
        # If no primary is set, fall back to the first practitioner
        first = obj.practitioner_relationships.first()
        if first:
            return PractitionerBasicSerializer(first.practitioner).data
            
        return None
    
    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_practitioners(self, obj):
        practitioners_data = []
        for rel in obj.practitioner_relationships.all():
            practitioner_data = PractitionerBasicSerializer(rel.practitioner).data
            practitioner_data['is_primary'] = rel.is_primary
            # Include any additional relationship data if available
            if hasattr(rel, 'role'):
                practitioner_data['role'] = rel.role
            practitioners_data.append(practitioner_data)
        return practitioners_data


class ServiceSerializer(serializers.ModelSerializer):
    """Simple serializer for service information used by other apps."""
    
    service_type = ServiceTypeSerializer(read_only=True)
    category = ServiceCategorySerializer(read_only=True)
    primary_practitioner = serializers.SerializerMethodField()
    image_url = SafeImageURLField(allow_null=True)
    
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'price', 'duration',
            'service_type', 'category', 'location_type',
            'is_active', 'is_featured', 'primary_practitioner', 'image_url'
        ]
    
    @extend_schema_field(PractitionerBasicSerializer())
    def get_primary_practitioner(self, obj):
        # First try to get the primary practitioner
        primary = obj.practitioner_relationships.filter(is_primary=True).first()
        if primary:
            return PractitionerBasicSerializer(primary.practitioner).data
            
        # If no primary is set, fall back to the first practitioner
        first = obj.practitioner_relationships.first()
        if first:
            return PractitionerBasicSerializer(first.practitioner).data
            
        return None


class ServiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating services."""
    
    class Meta:
        model = Service
        fields = [
            'name', 'description', 'price', 'duration',
            'service_type', 'category', 'is_featured', 'is_active',
            'max_participants', 'min_participants', 'location_type',
            'location', 'tags', 'image_url'
        ]
        
    def validate(self, data):
        """
        Validate service data:
        - Check if service_type is valid
        - Check if category is valid
        - Validate min/max participants
        """
        # Validate service type
        service_type = data.get('service_type')
        if service_type and not ServiceType.objects.filter(id=service_type.id).exists():
            raise serializers.ValidationError({"service_type": "Invalid service type"})
            
        # Validate category
        category = data.get('category')
        if category and not ServiceCategory.objects.filter(id=category.id).exists():
            raise serializers.ValidationError({"category": "Invalid category"})
            
        # Validate min/max participants
        min_participants = data.get('min_participants')
        max_participants = data.get('max_participants')
        if min_participants is not None and max_participants is not None:
            if min_participants > max_participants:
                raise serializers.ValidationError(
                    {"min_participants": "Minimum participants cannot be greater than maximum participants"}
                )
                
        return data


class ServiceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating services."""
    
    class Meta:
        model = Service
        fields = [
            'name', 'description', 'price', 'duration',
            'service_type', 'category', 'is_featured', 'is_active',
            'max_participants', 'min_participants', 'location_type',
            'location', 'tags', 'image_url', 'experience_level',
            'what_youll_learn'
        ]
        
    def validate(self, data):
        """
        Validate service data:
        - Check if service_type is valid
        - Check if category is valid
        - Validate min/max participants
        """
        # Validate service type
        service_type = data.get('service_type')
        if service_type and not ServiceType.objects.filter(id=service_type.id).exists():
            raise serializers.ValidationError({"service_type": "Invalid service type"})
            
        # Validate category
        category = data.get('category')
        if category and not ServiceCategory.objects.filter(id=category.id).exists():
            raise serializers.ValidationError({"category": "Invalid category"})
            
        # Validate min/max participants
        min_participants = data.get('min_participants')
        max_participants = data.get('max_participants')
        if min_participants is not None and max_participants is not None:
            if min_participants > max_participants:
                raise serializers.ValidationError(
                    {"min_participants": "Minimum participants cannot be greater than maximum participants"}
                )
                
        return data


class SessionParticipantSerializer(serializers.ModelSerializer):
    """Serializer for session participants."""
    
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = SessionParticipant
        fields = [
            'id', 'session', 'user', 'booking', 'attendance_status',
            'check_in_time', 'check_out_time'
        ]
        
    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'name': f"{obj.user.first_name} {obj.user.last_name}",
            'email': obj.user.email
        }


class EnhancedServiceDetailSerializer(ServiceDetailSerializer):
    """Enhanced serializer for detailed service information with additional related data."""
    
    benefits = ServiceBenefitSerializer(many=True, read_only=True)
    location = LocationSerializer(read_only=True, allow_null=True)
    sessions = EnhancedServiceSessionSerializer(many=True, read_only=True)
    languages = serializers.SerializerMethodField()
    waitlist_count = serializers.SerializerMethodField()
    parent_category_details = serializers.SerializerMethodField()
    image_url = SafeImageURLField(allow_null=True)
    
    class Meta(ServiceDetailSerializer.Meta):
        fields = ServiceDetailSerializer.Meta.fields + [
            'benefits', 'location', 'experience_level', 'languages',
            'what_youll_learn', 'waitlist_count', 'parent_category_details'
        ]
    
    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_languages(self, obj):
        if not obj.languages.exists():
            return []
        return [{'id': lang.id, 'name': lang.name, 'code': lang.code} for lang in obj.languages.all()]
    
    @extend_schema_field(serializers.IntegerField())
    def get_waitlist_count(self, obj):
        return obj.waitlist_entries.filter(status='waiting').count()
    
    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_parent_category_details(self, obj):
        if obj.category and obj.category.parent:
            return {
                'id': obj.category.parent.id,
                'name': obj.category.parent.name,
                'slug': obj.category.parent.slug,
                'icon': obj.category.parent.icon,
                'image_url': obj.category.parent.image_url
            }
        return None
