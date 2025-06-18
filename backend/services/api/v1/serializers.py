"""
Services API serializers for DRF
"""
from rest_framework import serializers
from django.db import transaction
from django.db.models import Count, Avg, Q
from decimal import Decimal

from services.models import (
    ServiceCategory, Service, ServiceType, ServiceRelationship,
    ServiceSession, ServiceResource, PractitionerServiceCategory,
    ServicePractitioner, Waitlist
)
from practitioners.models import Practitioner
from media.models import Media, MediaEntityType
from users.models import User


class ServiceCategorySerializer(serializers.ModelSerializer):
    """Serializer for service categories"""
    service_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 
            'is_active', 'is_featured', 'order', 'service_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at']
    
    def get_service_count(self, obj):
        """Get count of active services in this category"""
        return obj.services.filter(is_active=True, is_public=True).count()


class PractitionerServiceCategorySerializer(serializers.ModelSerializer):
    """Serializer for practitioner-specific service categories"""
    service_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PractitionerServiceCategory
        fields = [
            'id', 'practitioner', 'name', 'slug', 'description',
            'icon', 'color', 'is_active', 'order', 'service_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'practitioner', 'created_at', 'updated_at']
    
    def get_service_count(self, obj):
        """Get count of active services in this practitioner category"""
        return obj.services.filter(is_active=True).count()
    
    def create(self, validated_data):
        """Add practitioner from context on creation"""
        practitioner = self.context['request'].user.practitioner_profile
        validated_data['practitioner'] = practitioner
        return super().create(validated_data)


class ServiceTypeSerializer(serializers.ModelSerializer):
    """Serializer for service types"""
    
    class Meta:
        model = ServiceType
        fields = ['id', 'name', 'code', 'description', 'is_active', 'order']
        read_only_fields = ['code']


class MediaAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for media attachments"""
    
    class Meta:
        model = Media
        fields = [
            'id', 'url', 'thumbnail_url', 'filename', 'file_size',
            'content_type', 'media_type', 'title', 'description',
            'alt_text', 'is_primary', 'display_order', 'width',
            'height', 'duration', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SimplePractitionerSerializer(serializers.ModelSerializer):
    """Simple practitioner serializer for nested responses"""
    display_name = serializers.CharField(read_only=True)
    slug = serializers.CharField(read_only=True)
    profile_image_url = serializers.URLField(read_only=True)
    
    class Meta:
        model = Practitioner
        fields = ['id', 'display_name', 'slug', 'profile_image_url']


class ServicePractitionerSerializer(serializers.ModelSerializer):
    """Serializer for service-practitioner relationships"""
    practitioner = SimplePractitionerSerializer(read_only=True)
    practitioner_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = ServicePractitioner
        fields = [
            'id', 'practitioner', 'practitioner_id', 'is_primary',
            'role', 'revenue_share_percentage', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ServiceRelationshipSerializer(serializers.ModelSerializer):
    """Serializer for parent-child service relationships"""
    child_service = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceRelationship
        fields = [
            'id', 'child_service', 'quantity', 'order',
            'discount_percentage', 'is_required', 'description_override',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_child_service(self, obj):
        """Get child service details"""
        if obj.child_service:
            return {
                'id': obj.child_service.id,
                'name': obj.child_service.name,
                'price': obj.child_service.price,
                'duration_minutes': obj.child_service.duration_minutes,
                'service_type': obj.child_service.service_type.code if obj.child_service.service_type else None
            }
        return None


class ServiceSessionSerializer(serializers.ModelSerializer):
    """Serializer for service sessions (workshops/courses)"""
    room_url = serializers.CharField(source='room.room_url', read_only=True)
    
    class Meta:
        model = ServiceSession
        fields = [
            'id', 'title', 'description', 'start_time', 'end_time',
            'duration', 'max_participants', 'current_participants',
            'sequence_number', 'room_url', 'status', 'agenda',
            'what_youll_learn', 'address', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_participants', 'room_url', 'created_at', 'updated_at']


class ServiceResourceSerializer(serializers.ModelSerializer):
    """Serializer for service resources"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.display_name', read_only=True)
    
    class Meta:
        model = ServiceResource
        fields = [
            'id', 'title', 'description', 'resource_type', 'attachment_level',
            'content', 'file_url', 'external_url', 'file_name', 'file_size',
            'file_type', 'duration_seconds', 'uploaded_by_name', 'access_level',
            'is_downloadable', 'available_from', 'available_until', 'order',
            'is_featured', 'tags', 'view_count', 'download_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'uploaded_by_name', 'view_count', 'download_count',
            'created_at', 'updated_at'
        ]


class ServiceListSerializer(serializers.ModelSerializer):
    """Serializer for service listing"""
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    category = ServiceCategorySerializer(read_only=True)
    primary_practitioner = SimplePractitionerSerializer(read_only=True)
    service_type_display = serializers.CharField(source='service_type.name', read_only=True)
    service_type_code = serializers.CharField(read_only=True)
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    total_bookings = serializers.SerializerMethodField()
    duration_display = serializers.CharField(read_only=True)
    primary_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Service
        fields = [
            'id', 'public_uuid', 'name', 'short_description', 'price_cents',
            'price', 'duration_minutes', 'duration_display', 'service_type',
            'service_type_display', 'service_type_code', 'category', 
            'primary_practitioner', 'max_participants', 'experience_level', 
            'location_type', 'is_active', 'is_featured', 'is_public', 'status',
            'average_rating', 'total_reviews', 'total_bookings',
            'primary_image', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'public_uuid', 'created_at', 'updated_at']
    
    def get_average_rating(self, obj):
        return obj.average_rating
    
    def get_total_reviews(self, obj):
        return obj.total_reviews
    
    def get_total_bookings(self, obj):
        return obj.total_bookings
    
    def get_primary_image(self, obj):
        """Get primary image for the service"""
        primary_media = Media.objects.filter(
            entity_type=MediaEntityType.SERVICE,
            entity_id=obj.id,
            is_primary=True,
            media_type='image'
        ).first()
        
        if primary_media:
            return MediaAttachmentSerializer(primary_media).data
        return None


class ServiceDetailSerializer(ServiceListSerializer):
    """Detailed serializer for single service view"""
    practitioner_category = PractitionerServiceCategorySerializer(read_only=True)
    additional_practitioners = serializers.SerializerMethodField()
    media_attachments = serializers.SerializerMethodField()
    child_services = serializers.SerializerMethodField()
    sessions = ServiceSessionSerializer(many=True, read_only=True)
    resources = serializers.SerializerMethodField()
    price_per_session = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    savings_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    savings_percentage = serializers.FloatField(read_only=True)
    total_sessions = serializers.IntegerField(read_only=True)
    
    class Meta(ServiceListSerializer.Meta):
        fields = ServiceListSerializer.Meta.fields + [
            'description', 'practitioner_category', 'additional_practitioners',
            'min_participants', 'age_min', 'age_max', 'what_youll_learn',
            'prerequisites', 'includes', 'address', 'image',
            'tags', 'languages', 'published_at', 'validity_days',
            'is_transferable', 'is_shareable', 'sessions_included',
            'bonus_sessions', 'max_per_customer', 'available_from',
            'available_until', 'highlight_text', 'terms_conditions',
            'media_attachments', 'child_services', 'sessions', 'resources',
            'price_per_session', 'original_price', 'savings_amount',
            'savings_percentage', 'total_sessions'
        ]
    
    def get_additional_practitioners(self, obj):
        """Get additional practitioners for the service"""
        practitioners = obj.additional_practitioners.all()
        return SimplePractitionerSerializer(practitioners, many=True).data
    
    def get_media_attachments(self, obj):
        """Get all media attachments for the service"""
        media = Media.objects.filter(
            entity_type=MediaEntityType.SERVICE,
            entity_id=obj.id
        ).order_by('display_order', '-created_at')
        return MediaAttachmentSerializer(media, many=True).data
    
    def get_child_services(self, obj):
        """Get child services for packages/bundles"""
        if obj.is_package or obj.is_bundle:
            relationships = obj.child_relationships.all().order_by('order')
            return ServiceRelationshipSerializer(relationships, many=True).data
        return []
    
    def get_resources(self, obj):
        """Get public resources for the service"""
        resources = obj.resources.filter(
            access_level__in=['public', 'registered']
        ).order_by('order', '-created_at')
        return ServiceResourceSerializer(resources, many=True).data


class ServiceCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating services"""
    price = serializers.DecimalField(max_digits=10, decimal_places=2, write_only=True)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    practitioner_category_id = serializers.IntegerField(required=False, allow_null=True)
    service_type_id = serializers.IntegerField(required=True)
    additional_practitioner_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    child_service_configs = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True,
        help_text="List of dicts with child_service_id, quantity, discount_percentage, etc."
    )
    
    class Meta:
        model = Service
        fields = [
            'id', 'public_uuid', 'name', 'description', 'short_description', 'price', 'price_cents',
            'duration_minutes', 'service_type_id', 'category_id',
            'practitioner_category_id', 'max_participants', 'min_participants',
            'experience_level', 'age_min', 'age_max', 'location_type',
            'address', 'what_youll_learn', 'prerequisites', 'includes',
            'image', 'tags', 'is_active', 'is_featured',
            'is_public', 'status', 'validity_days', 'is_transferable',
            'is_shareable', 'sessions_included', 'bonus_sessions',
            'max_per_customer', 'available_from', 'available_until',
            'highlight_text', 'terms_conditions', 'additional_practitioner_ids',
            'child_service_configs'
        ]
        read_only_fields = ['id', 'public_uuid', 'price_cents']
    
    def validate_price(self, value):
        """Ensure price is positive"""
        if value < 0:
            raise serializers.ValidationError("Price must be non-negative")
        return value
    
    def validate(self, attrs):
        """Validate service data"""
        # Convert price to cents
        if 'price' in attrs:
            attrs['price_cents'] = int(attrs.pop('price') * 100)
        
        # Validate service type
        if 'service_type_id' in attrs:
            try:
                attrs['service_type'] = ServiceType.objects.get(id=attrs.pop('service_type_id'))
            except ServiceType.DoesNotExist:
                raise serializers.ValidationError({"service_type_id": "Invalid service type"})
        
        # Validate category
        if 'category_id' in attrs:
            category_id = attrs.pop('category_id')
            if category_id:
                try:
                    attrs['category'] = ServiceCategory.objects.get(id=category_id)
                except ServiceCategory.DoesNotExist:
                    raise serializers.ValidationError({"category_id": "Invalid category"})
        
        # Validate practitioner category
        if 'practitioner_category_id' in attrs:
            prac_cat_id = attrs.pop('practitioner_category_id')
            if prac_cat_id:
                practitioner = self.context['request'].user.practitioner_profile
                try:
                    attrs['practitioner_category'] = PractitionerServiceCategory.objects.get(
                        id=prac_cat_id,
                        practitioner=practitioner
                    )
                except PractitionerServiceCategory.DoesNotExist:
                    raise serializers.ValidationError({"practitioner_category_id": "Invalid practitioner category"})
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """Create service with relationships"""
        # Extract relationship data
        additional_practitioner_ids = validated_data.pop('additional_practitioner_ids', [])
        child_service_configs = validated_data.pop('child_service_configs', [])
        
        # Set primary practitioner
        practitioner = self.context['request'].user.practitioner_profile
        validated_data['primary_practitioner'] = practitioner
        
        # Create service
        service = super().create(validated_data)
        
        # Create primary practitioner relationship
        ServicePractitioner.objects.create(
            service=service,
            practitioner=practitioner,
            is_primary=True,
            revenue_share_percentage=100.0
        )
        
        # Add additional practitioners
        for prac_id in additional_practitioner_ids:
            try:
                practitioner = Practitioner.objects.get(id=prac_id)
                ServicePractitioner.objects.create(
                    service=service,
                    practitioner=practitioner,
                    is_primary=False
                )
            except Practitioner.DoesNotExist:
                pass
        
        # Add child services for packages/bundles
        if service.is_package or service.is_bundle:
            for config in child_service_configs:
                try:
                    child_service = Service.objects.get(id=config['child_service_id'])
                    ServiceRelationship.objects.create(
                        parent_service=service,
                        child_service=child_service,
                        quantity=config.get('quantity', 1),
                        order=config.get('order', 0),
                        discount_percentage=config.get('discount_percentage', 0),
                        is_required=config.get('is_required', True),
                        description_override=config.get('description_override')
                    )
                except Service.DoesNotExist:
                    pass
        
        return service
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """Update service with relationships"""
        # Extract relationship data
        additional_practitioner_ids = validated_data.pop('additional_practitioner_ids', None)
        child_service_configs = validated_data.pop('child_service_configs', None)
        
        # Update service
        service = super().update(instance, validated_data)
        
        # Update additional practitioners if provided
        if additional_practitioner_ids is not None:
            # Remove existing non-primary practitioners
            service.practitioner_relationships.filter(is_primary=False).delete()
            
            # Add new practitioners
            for prac_id in additional_practitioner_ids:
                try:
                    practitioner = Practitioner.objects.get(id=prac_id)
                    ServicePractitioner.objects.create(
                        service=service,
                        practitioner=practitioner,
                        is_primary=False
                    )
                except Practitioner.DoesNotExist:
                    pass
        
        # Update child services if provided
        if child_service_configs is not None and (service.is_package or service.is_bundle):
            # Remove existing relationships
            service.child_relationships.all().delete()
            
            # Add new relationships
            for config in child_service_configs:
                try:
                    child_service = Service.objects.get(id=config['child_service_id'])
                    ServiceRelationship.objects.create(
                        parent_service=service,
                        child_service=child_service,
                        quantity=config.get('quantity', 1),
                        order=config.get('order', 0),
                        discount_percentage=config.get('discount_percentage', 0),
                        is_required=config.get('is_required', True),
                        description_override=config.get('description_override')
                    )
                except Service.DoesNotExist:
                    pass
        
        return service


class PackageSerializer(ServiceDetailSerializer):
    """Specialized serializer for packages"""
    
    class Meta(ServiceDetailSerializer.Meta):
        pass
    
    def to_representation(self, instance):
        """Only return packages"""
        if not instance.is_package:
            return None
        return super().to_representation(instance)


class BundleSerializer(ServiceDetailSerializer):
    """Specialized serializer for bundles"""
    
    class Meta(ServiceDetailSerializer.Meta):
        pass
    
    def to_representation(self, instance):
        """Only return bundles"""
        if not instance.is_bundle:
            return None
        return super().to_representation(instance)


class WaitlistSerializer(serializers.ModelSerializer):
    """Serializer for waitlist entries"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    session_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Waitlist
        fields = [
            'id', 'service', 'service_session', 'user', 'user_name',
            'service_name', 'session_info', 'joined_at', 'position',
            'status', 'notified_at', 'notification_count', 'notes'
        ]
        read_only_fields = [
            'id', 'user', 'joined_at', 'position', 'notified_at',
            'notification_count'
        ]
    
    def get_session_info(self, obj):
        """Get session information if applicable"""
        if obj.service_session:
            return {
                'id': obj.service_session.id,
                'start_time': obj.service_session.start_time,
                'title': obj.service_session.title or obj.service_session.service.name
            }
        return None


class ServiceSearchSerializer(serializers.Serializer):
    """Serializer for service search parameters"""
    q = serializers.CharField(required=False, help_text="Search query")
    category = serializers.CharField(required=False, help_text="Category slug")
    service_type = serializers.CharField(required=False, help_text="Service type code")
    practitioner = serializers.IntegerField(required=False, help_text="Practitioner ID")
    location_type = serializers.ChoiceField(
        choices=['virtual', 'in_person', 'hybrid'],
        required=False
    )
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    min_duration = serializers.IntegerField(required=False)
    max_duration = serializers.IntegerField(required=False)
    experience_level = serializers.ChoiceField(
        choices=['beginner', 'intermediate', 'advanced', 'all_levels'],
        required=False
    )
    is_featured = serializers.BooleanField(required=False)
    has_availability = serializers.BooleanField(required=False)
    sort_by = serializers.ChoiceField(
        choices=['created_at', '-created_at', 'price', '-price', 'rating', '-rating', 'popularity'],
        default='-created_at'
    )
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)