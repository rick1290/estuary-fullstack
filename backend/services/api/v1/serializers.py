"""
Services API serializers for DRF
"""
from rest_framework import serializers
from django.db import transaction
from django.db.models import Count, Avg, Q
from decimal import Decimal
from django.utils.dateparse import parse_datetime
from drf_spectacular.utils import extend_schema_field, OpenApiTypes
from drf_spectacular.types import OpenApiTypes as Types

from services.models import (
    ServiceCategory, Service, ServiceType, ServiceRelationship,
    ServiceSession, ServiceResource, PractitionerServiceCategory,
    ServicePractitioner, Waitlist, ServiceBenefit, SessionAgendaItem
)
from practitioners.models import Practitioner, Schedule
from media.models import Media, MediaEntityType
from users.models import User
from common.models import Modality


class ModalitySerializer(serializers.ModelSerializer):
    """Serializer for modalities"""
    class Meta:
        model = Modality
        fields = ['id', 'name', 'slug', 'description', 'icon', 'is_featured']
        read_only_fields = ['id', 'slug']


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


class SimpleScheduleSerializer(serializers.ModelSerializer):
    """Simple schedule serializer for nested responses"""
    
    class Meta:
        model = Schedule
        fields = ['id', 'name', 'is_default', 'timezone', 'description']


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


class ServiceBenefitSerializer(serializers.ModelSerializer):
    """Serializer for service benefits"""
    
    class Meta:
        model = ServiceBenefit
        fields = [
            'id', 'title', 'description', 'icon', 'order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SessionAgendaItemSerializer(serializers.ModelSerializer):
    """Serializer for session agenda items"""
    
    class Meta:
        model = SessionAgendaItem
        fields = [
            'id', 'title', 'description', 'start_time', 'end_time',
            'order'
        ]
        read_only_fields = ['id']


class ServiceSessionSerializer(serializers.ModelSerializer):
    """Serializer for service sessions (workshops/courses)"""
    room = serializers.SerializerMethodField()
    agenda_items = SessionAgendaItemSerializer(many=True, read_only=True)
    benefits = ServiceBenefitSerializer(many=True, read_only=True)
    participant_count = serializers.IntegerField(source='current_participants', read_only=True)
    waitlist_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceSession
        fields = [
            'id', 'service', 'title', 'description', 'start_time', 'end_time',
            'duration', 'max_participants', 'current_participants',
            'participant_count', 'waitlist_count', 'sequence_number', 
            'room', 'status', 'agenda', 'agenda_items', 'benefits',
            'what_youll_learn', 'address', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'current_participants', 'participant_count', 'room', 'created_at', 'updated_at']
    
    def get_room(self, obj):
        """Get room information for this session"""
        if hasattr(obj, 'livekit_room') and obj.livekit_room:
            room = obj.livekit_room
            return {
                'id': room.id,
                'public_uuid': room.public_uuid,
                'livekit_room_name': room.livekit_room_name,
                'status': room.status,
                'max_participants': room.max_participants,
                'scheduled_start': room.scheduled_start,
                'scheduled_end': room.scheduled_end,
            }
        return None
    
    def get_waitlist_count(self, obj):
        """Get count of waiting users for this session"""
        return obj.waitlist_entries.filter(status='waiting').count()


class ServiceResourceSerializer(serializers.ModelSerializer):
    """Serializer for service resources"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.display_name', read_only=True)
    file = serializers.FileField(write_only=True, required=False, help_text="File to upload")
    
    class Meta:
        model = ServiceResource
        fields = [
            'id', 'title', 'description', 'resource_type', 'attachment_level',
            'content', 'file_url', 'external_url', 'file_name', 'file_size',
            'file_type', 'duration_seconds', 'uploaded_by_name', 'access_level',
            'is_downloadable', 'available_from', 'available_until', 'order',
            'is_featured', 'tags', 'view_count', 'download_count',
            'service', 'service_session', 'booking',  # Add parent relationship fields
            'created_at', 'updated_at', 'file'
        ]
        read_only_fields = [
            'id', 'uploaded_by_name', 'view_count', 'download_count',
            'created_at', 'updated_at', 'file_url', 'file_name', 'file_size', 'file_type'
        ]
    
    def validate(self, attrs):
        """Ensure parent field matches attachment_level"""
        attachment_level = attrs.get('attachment_level')
        service = attrs.get('service')
        service_session = attrs.get('service_session')
        booking = attrs.get('booking')
        
        # Ensure exactly one parent is set based on attachment_level
        if attachment_level == 'service':
            if not service:
                raise serializers.ValidationError(
                    "service field is required when attachment_level is 'service'"
                )
            # Ensure other parent fields are not set
            attrs['service_session'] = None
            attrs['booking'] = None
            
        elif attachment_level == 'session':
            if not service_session:
                raise serializers.ValidationError(
                    "service_session field is required when attachment_level is 'session'"
                )
            # Ensure other parent fields are not set
            attrs['service'] = None
            attrs['booking'] = None
            
        elif attachment_level == 'booking':
            if not booking:
                raise serializers.ValidationError(
                    "booking field is required when attachment_level is 'booking'"
                )
            # Ensure other parent fields are not set
            attrs['service'] = None
            attrs['service_session'] = None
        
        return attrs
    
    def create(self, validated_data):
        # Handle file upload
        file = validated_data.pop('file', None)
        
        # Create the resource
        resource = super().create(validated_data)
        
        # Process file upload if provided
        if file:
            self._handle_file_upload(resource, file)
        
        return resource
    
    def update(self, instance, validated_data):
        # Handle file upload
        file = validated_data.pop('file', None)
        
        # Update the resource
        resource = super().update(instance, validated_data)
        
        # Process file upload if provided
        if file:
            self._handle_file_upload(resource, file)
        
        return resource
    
    def _handle_file_upload(self, resource, file):
        """Handle file upload and set metadata"""
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        import os
        from datetime import datetime
        
        # Generate file path
        now = datetime.now()
        file_extension = os.path.splitext(file.name)[1]
        file_path = f"services/resources/{now.year}/{now.month:02d}/{resource.id}_{file.name}"
        
        # Save file
        saved_path = default_storage.save(file_path, ContentFile(file.read()))
        
        # Update resource with file metadata
        resource.file_url = default_storage.url(saved_path)
        resource.file_name = file.name
        resource.file_size = file.size
        resource.file_type = file.content_type
        
        # Save the updated resource
        resource.save(update_fields=['file_url', 'file_name', 'file_size', 'file_type'])


class ServiceListSerializer(serializers.ModelSerializer):
    """Serializer for service listing"""
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    category = ServiceCategorySerializer(read_only=True)
    modalities = ModalitySerializer(many=True, read_only=True)
    primary_practitioner = SimplePractitionerSerializer(read_only=True)
    service_type_display = serializers.CharField(source='service_type.name', read_only=True)
    service_type_code = serializers.CharField(read_only=True)
    average_rating = serializers.ReadOnlyField()
    total_reviews = serializers.ReadOnlyField()
    total_bookings = serializers.ReadOnlyField()
    duration_display = serializers.CharField(read_only=True)
    primary_image = serializers.SerializerMethodField()
    schedule = SimpleScheduleSerializer(read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'public_uuid', 'name', 'slug', 'short_description', 'price_cents',
            'price', 'duration_minutes', 'duration_display', 'service_type',
            'service_type_display', 'service_type_code', 'category', 'modalities',
            'primary_practitioner', 'max_participants', 'experience_level',
            'location_type', 'schedule', 'is_active', 'is_featured', 'is_public', 'status',
            'average_rating', 'total_reviews', 'total_bookings',
            'primary_image', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'public_uuid', 'slug', 'created_at', 'updated_at']
    
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
    child_relationships = serializers.SerializerMethodField()
    sessions = ServiceSessionSerializer(many=True, read_only=True)
    resources = serializers.SerializerMethodField()
    price_per_session = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    original_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    savings_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    savings_percentage = serializers.FloatField(read_only=True)
    total_sessions = serializers.IntegerField(read_only=True)
    benefits = ServiceBenefitSerializer(many=True, read_only=True)
    agenda_items = SessionAgendaItemSerializer(many=True, read_only=True)
    requirements = serializers.CharField(source='prerequisites', read_only=True)
    waitlist_count = serializers.SerializerMethodField()
    practitioner_relationships = ServicePractitionerSerializer(many=True, read_only=True)
    cancellation_policy = serializers.SerializerMethodField()
    image_url = serializers.CharField(read_only=True)
    includes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        read_only=True,
        help_text="What's included in the service - array of items"
    )
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        read_only=True
    )
    
    class Meta(ServiceListSerializer.Meta):
        fields = ServiceListSerializer.Meta.fields + [
            'description', 'practitioner_category', 'additional_practitioners',
            'min_participants', 'age_min', 'age_max', 'what_youll_learn',
            'prerequisites', 'requirements', 'includes', 'address', 'image',
            'tags', 'languages', 'published_at', 'validity_days',
            'is_transferable', 'is_shareable', 'sessions_included',
            'bonus_sessions', 'max_per_customer', 'available_from',
            'available_until', 'highlight_text', 'terms_conditions',
            'media_attachments', 'child_relationships', 'sessions', 'resources',
            'price_per_session', 'original_price', 'savings_amount',
            'savings_percentage', 'total_sessions', 'benefits', 'agenda_items',
            'waitlist_count', 'practitioner_relationships', 'cancellation_policy', 'image_url'
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
    
    def get_child_relationships(self, obj):
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
    
    def get_waitlist_count(self, obj):
        """Get count of waiting users for this service"""
        return obj.waitlist_entries.filter(status='waiting').count()
    
    def get_cancellation_policy(self, obj):
        """Get cancellation policy from terms_conditions or return default"""
        # Check if cancellation policy is mentioned in terms_conditions
        if obj.terms_conditions and 'cancel' in obj.terms_conditions.lower():
            return obj.terms_conditions
        # Return a default policy or None
        return "Standard cancellation policy applies. Please contact the practitioner for details."


class ServiceCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating services"""
    price = serializers.DecimalField(max_digits=10, decimal_places=2, write_only=True)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    modality_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text="List of modality IDs to associate with this service"
    )
    practitioner_category_id = serializers.IntegerField(required=False, allow_null=True)
    service_type_id = serializers.IntegerField(required=True)
    image = serializers.ImageField(required=False, allow_null=True, help_text="Service cover image")
    includes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        allow_empty=True,
        help_text="What's included in the service - array of items"
    )
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True,
        allow_empty=True
    )
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
    # Sessions are now managed via the dedicated ServiceSession endpoint
    # Remove sessions field to simplify the API
    
    class Meta:
        model = Service
        fields = [
            'id', 'public_uuid', 'name', 'slug', 'description', 'short_description', 'price', 'price_cents',
            'duration_minutes', 'service_type_id', 'category_id', 'modality_ids',
            'practitioner_category_id', 'max_participants', 'min_participants',
            'experience_level', 'age_min', 'age_max', 'location_type',
            'address', 'schedule', 'what_youll_learn', 'prerequisites', 'includes',
            'image', 'tags', 'is_active', 'is_featured',
            'is_public', 'status', 'validity_days', 'is_transferable',
            'is_shareable', 'sessions_included', 'bonus_sessions',
            'max_per_customer', 'available_from', 'available_until',
            'highlight_text', 'terms_conditions', 'additional_practitioner_ids',
            'child_service_configs'
        ]
        read_only_fields = ['id', 'public_uuid', 'price_cents', 'slug']
    
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
        modality_ids = validated_data.pop('modality_ids', [])
        child_service_configs = validated_data.pop('child_service_configs', [])
        # Remove reverse relationships that can't be directly assigned
        validated_data.pop('agenda_items', None)
        validated_data.pop('benefits', None)

        # Set primary practitioner
        practitioner = self.context['request'].user.practitioner_profile
        validated_data['primary_practitioner'] = practitioner

        # Create service
        service = super().create(validated_data)

        # Set modalities
        if modality_ids:
            modalities = Modality.objects.filter(id__in=modality_ids)
            service.modalities.set(modalities)

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
        # Log the incoming data
        print(f"\n=== Service Update Debug ===")
        print(f"Service ID: {instance.id}")
        print(f"Service name: {instance.name}")
        print(f"Validated data keys: {list(validated_data.keys())}")
        print(f"Current image field value: {instance.image}")
        print(f"Current image file exists: {bool(instance.image)}")

        if 'image' in validated_data:
            print(f"\n=== Image Update Debug ===")
            print(f"New image field type: {type(validated_data['image'])}")
            print(f"New image field value: {validated_data['image']}")

            if hasattr(validated_data['image'], 'name'):
                print(f"Image file name: {validated_data['image'].name}")
                print(f"Image file size: {validated_data['image'].size}")

            # Handle empty string as image removal
            if validated_data['image'] == '':
                print("Empty string detected - removing image")
                validated_data['image'] = None

        # Extract relationship data
        additional_practitioner_ids = validated_data.pop('additional_practitioner_ids', None)
        modality_ids = validated_data.pop('modality_ids', None)
        child_service_configs = validated_data.pop('child_service_configs', None)
        # Remove reverse relationships that can't be directly assigned
        validated_data.pop('agenda_items', None)
        validated_data.pop('benefits', None)
        
        # Update service
        print(f"\n=== Before super().update() ===")
        service = super().update(instance, validated_data)
        
        # Force save to ensure image is persisted
        service.save()
        
        # Log after update
        print(f"\n=== After Update ===")
        print(f"Service image field: {service.image}")
        print(f"Service image name: {service.image.name if service.image else 'None'}")
        print(f"Service image file exists: {bool(service.image)}")
        print(f"Service image URL: {service.image_url if hasattr(service, 'image_url') else 'No image_url property'}")
        
        # Check if file was actually saved
        if service.image:
            try:
                print(f"Image file path: {service.image.path}")
                print(f"Image file URL: {service.image.url}")
            except Exception as e:
                print(f"Error accessing image file: {e}")
        
        # Update modalities if provided
        if modality_ids is not None:
            modalities = Modality.objects.filter(id__in=modality_ids)
            service.modalities.set(modalities)

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
        print(f"\n=== Update Debug ===")
        print(f"Service ID: {service.id}")
        print(f"Service type: {service.service_type.code if service.service_type else 'None'}")
        print(f"Is package: {service.is_package}")
        print(f"Is bundle: {service.is_bundle}")
        print(f"child_service_configs provided: {child_service_configs is not None}")
        print(f"child_service_configs value: {child_service_configs}")
        
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
        
        # Sessions are now managed via the dedicated ServiceSession endpoint
        
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