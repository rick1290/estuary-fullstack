from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Sum, Max
from django.db.models import Q
from django.core.validators import FileExtensionValidator
from apps.practitioners.models import (
    Practitioner, Specialize, Style, Topic, 
    PractitionerOnboardingProgress, Education, 
    Certification, Question, VerificationDocument
)
from apps.users.models import User
from apps.common.models import Modality
from apps.utils.serializer_fields import SafeImageURLField
from drf_spectacular.utils import extend_schema_field, inline_serializer
from apps.locations.models import PractitionerLocation
from apps.locations.api.v1.serializers import PractitionerLocationSerializer

class PractitionerUserSerializer(serializers.ModelSerializer):
    """Serializer for basic user information in practitioner context."""
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'profile_picture']
        read_only_fields = ['id', 'email']


# Explicitly define readable versions for schema generation
class PractitionerUserReadable(PractitionerUserSerializer):
    """Read-only serializer for minimal user information in practitioner context."""
    
    class Meta(PractitionerUserSerializer.Meta):
        read_only_fields = fields = ['id', 'first_name', 'last_name', 'email', 'profile_picture']


class SpecializeSerializer(serializers.ModelSerializer):
    """Serializer for practitioner specializations."""
    
    class Meta:
        model = Specialize
        fields = ['id', 'content']


class StyleSerializer(serializers.ModelSerializer):
    """Serializer for practitioner styles."""
    
    class Meta:
        model = Style
        fields = ['id', 'content']


class TopicSerializer(serializers.ModelSerializer):
    """Serializer for practitioner topics."""
    
    class Meta:
        model = Topic
        fields = ['id', 'content']


class ModalitySerializer(serializers.ModelSerializer):
    """Serializer for practitioner modalities."""
    
    class Meta:
        model = Modality
        fields = ['id', 'name', 'description']


class EducationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner education."""
    
    class Meta:
        model = Education
        fields = ['id', 'degree', 'educational_institute', 'order']


class CertificationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner certifications."""
    
    class Meta:
        model = Certification
        fields = ['id', 'certificate', 'institution', 'order']
        read_only_fields = ['id']


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for practitioner questions."""
    
    class Meta:
        model = Question
        fields = ['id', 'title', 'order']


class BasicPractitionerSerializer(serializers.ModelSerializer):
    """Minimal serializer for practitioner information in other contexts like bookings."""
    
    user = PractitionerUserSerializer(read_only=True)
    
    class Meta:
        model = Practitioner
        fields = [
            'user', 'title', 'is_verified', 'average_rating', 'display_name'
        ]


# Alias for BasicPractitionerSerializer to maintain consistent naming across the project
PractitionerBasicSerializer = BasicPractitionerSerializer

# Explicitly define readable versions for schema generation
class PractitionerBasicReadable(BasicPractitionerSerializer):
    """Read-only serializer for basic practitioner information."""
    
    user = PractitionerUserReadable(read_only=True)
    
    class Meta(BasicPractitionerSerializer.Meta):
        read_only_fields = fields = ['user', 'title', 'is_verified', 'average_rating', 'display_name']


class PractitionerProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating practitioner profile."""
    user = PractitionerUserSerializer(required=False)
    specializations = serializers.PrimaryKeyRelatedField(many=True, queryset=Specialize.objects.all(), required=False)
    styles = serializers.PrimaryKeyRelatedField(many=True, queryset=Style.objects.all(), required=False)
    topics = serializers.PrimaryKeyRelatedField(many=True, queryset=Topic.objects.all(), required=False)
    modalities = serializers.PrimaryKeyRelatedField(many=True, queryset=Modality.objects.all(), required=False)
    
    class Meta:
        model = Practitioner
        fields = [
            'user',
            'display_name',
            'title',
            'bio',
            'description',
            'quote',
            'years_of_experience',
            'specializations',
            'styles',
            'topics',
            'modalities',
            'buffer_time',
        ]

class PractitionerMediaSerializer(serializers.ModelSerializer):
    """Serializer for practitioner media uploads."""
    profile_image = serializers.ImageField(required=False)
    profile_video = serializers.FileField(
        required=False,
        validators=[FileExtensionValidator(allowed_extensions=['mp4', 'mov', 'avi'])]
    )
    
    class Meta:
        model = Practitioner
        fields = ['profile_image', 'profile_video']

class PractitionerEducationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner education."""
    class Meta:
        model = Education
        fields = [
            'id',
            'degree',
            'educational_institute',
            'order'
        ]

class PractitionerCertificationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner certifications."""
    document = serializers.FileField(required=False, write_only=True)
    
    class Meta:
        model = Certification
        fields = [
            'id',
            'certificate',
            'institution',
            'order',
            'document'
        ]

class VerificationDocumentSerializer(serializers.ModelSerializer):
    """Serializer for verification documents."""
    document = serializers.FileField()
    
    class Meta:
        model = VerificationDocument
        fields = ['id', 'document_type', 'document', 'status', 'expires_at']
        read_only_fields = ['uploaded_at', 'status']

class PractitionerApplicationSerializer(serializers.ModelSerializer):
    """Serializer for creating a practitioner application from an existing user."""
    
    class Meta:
        model = Practitioner
        fields = [
            'title',            # Professional title (e.g., 'Life Coach', 'Therapist')
            'bio',              # Short bio for listings
            'description',       # Full profile description
            'display_name',      # Professional display name
            'years_of_experience'
        ]
    
    def create(self, validated_data):
        # Get the current user from the context
        user = self.context['request'].user
        
        # Create the practitioner profile
        practitioner = Practitioner.objects.create(
            user=user,
            **validated_data
        )
        
        # Create the onboarding progress record
        PractitionerOnboardingProgress.objects.create(
            practitioner=practitioner,
            status='in_progress',
            current_step='profile_setup',
            steps_completed=[]
        )
        
        return practitioner


class PractitionerBasicWritable(serializers.ModelSerializer):
    """Writable serializer for updating practitioner information during onboarding."""
    
    class Meta:
        model = Practitioner
        fields = [
            # Basic Info
            'title',
            'bio',
            'description',
            'quote',
            'display_name',
            'years_of_experience',
            
            # Profile Media
            'profile_image_url',
            'profile_video_url',
            
            # Professional Details
            'specializations',
            'styles',
            'topics',
            'modalities',
            'certifications',
            'educations',
            
            # Scheduling
            'buffer_time',
            'book_times',
            'availability',
            
            # Business Details
            'min_price',
            'max_price',
            'services',
            'categories',
            
            # Status Fields (read-only)
            'is_verified',
            'practitioner_status',
            'average_rating',
            'total_reviews'
        ]
        read_only_fields = ['is_verified', 'practitioner_status', 'average_rating', 'total_reviews']
        extra_kwargs = {
            # Optional profile fields
            'profile_image_url': {'required': False},
            'profile_video_url': {'required': False},
            'quote': {'required': False},
            'description': {'required': False},
            
            # Optional scheduling fields
            'buffer_time': {'required': False},
            'book_times': {'required': False},
            'availability': {'required': False},
            
            # Optional business fields
            'min_price': {'required': False},
            'max_price': {'required': False},
            
            # Optional relationships
            'specializations': {'required': False},
            'styles': {'required': False},
            'topics': {'required': False},
            'modalities': {'required': False},
            'certifications': {'required': False},
            'educations': {'required': False},
            'services': {'required': False},
            'categories': {'required': False}
        }
        
    def update(self, instance, validated_data):
        # Update many-to-many relationships if provided
        m2m_fields = ['specializations', 'styles', 'topics', 'modalities', 
                     'certifications', 'educations', 'services', 'categories']
        
        for field in m2m_fields:
            if field in validated_data:
                setattr(instance, field, validated_data.pop(field))
        
        # Update the remaining fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class PractitionerListSerializer(serializers.ModelSerializer):
    """Serializer for listing practitioners."""
    
    user = PractitionerUserSerializer(read_only=True)
    specializations = SpecializeSerializer(many=True, read_only=True)
    modalities = ModalitySerializer(many=True, read_only=True)
    average_rating_float = serializers.FloatField(source='average_rating', read_only=True)
    profile_image_url = SafeImageURLField(allow_null=True)
    locations = serializers.SerializerMethodField()
    
    class Meta:
        model = Practitioner
        fields = [
            'id', 'user', 'title', 'bio', 'average_rating', 'average_rating_float', 'total_reviews', 
            'is_verified', 'featured', 'specializations', 'modalities', 'min_price',
            'max_price', 'display_name', 'profile_image_url', 'locations'
        ]
    
    @extend_schema_field(PractitionerLocationSerializer(many=True))
    def get_locations(self, obj):
        """Get locations for this practitioner."""
        locations = obj.locations.all()
        return PractitionerLocationSerializer(locations, many=True).data


class ClientServiceHistorySerializer(serializers.Serializer):
    """Serializer for a client's history with a particular service."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    times_booked = serializers.IntegerField()
    last_booked = serializers.DateTimeField()


class ClientBookingSnapshotSerializer(serializers.Serializer):
    """Serializer for a snapshot of a client's booking (used for next/last booking)."""
    id = serializers.IntegerField()
    service = serializers.SerializerMethodField()
    date = serializers.DateTimeField(source='start_time')
    status = serializers.CharField()

    def get_service(self, obj):
        return {
            'id': obj.service.id,
            'name': obj.service.name
        }


class ClientStatsSerializer(serializers.Serializer):
    """Serializer for client booking statistics."""
    total_bookings = serializers.IntegerField()
    total_completed = serializers.IntegerField()
    total_cancelled = serializers.IntegerField()
    lifetime_value = serializers.DecimalField(max_digits=10, decimal_places=2)


class ClientListSerializer(serializers.Serializer):
    """Serializer for client list view."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    stats = serializers.SerializerMethodField()
    next_booking = serializers.SerializerMethodField()
    last_booking = serializers.SerializerMethodField()
    services_history = serializers.SerializerMethodField()

    def get_stats(self, user):
        bookings = user.bookings.all()
        return {
            'total_bookings': bookings.count(),
            'total_completed': bookings.filter(status='completed').count(),
            'total_cancelled': bookings.filter(status='cancelled').count(),
            'lifetime_value': bookings.aggregate(total=Sum('total_price'))['total'] or 0
        }

    def get_next_booking(self, user):
        now = timezone.now()
        next_booking = user.bookings.filter(
            start_time__gte=now
        ).order_by('start_time').first()
        
        if next_booking:
            return ClientBookingSnapshotSerializer(next_booking).data
        return None

    def get_last_booking(self, user):
        now = timezone.now()
        last_booking = user.bookings.filter(
            start_time__lt=now
        ).order_by('-start_time').first()
        
        if last_booking:
            return ClientBookingSnapshotSerializer(last_booking).data
        return None

    def get_services_history(self, user):
        services = user.bookings.values(
            'service__id',
            'service__name'
        ).annotate(
            times_booked=Count('id'),
            last_booked=Max('start_time')
        ).order_by('-times_booked')

        return [
            {
                'id': service['service__id'],
                'name': service['service__name'],
                'times_booked': service['times_booked'],
                'last_booked': service['last_booked']
            }
            for service in services
        ]


class ClientListResponseSerializer(serializers.Serializer):
    """Wrapper serializer that includes meta information."""
    clients = ClientListSerializer(many=True)
    meta = serializers.SerializerMethodField()

    def get_meta(self, users):
        now = timezone.now()
        three_months_ago = now - timedelta(days=90)
        one_month_ago = now - timedelta(days=30)

        active_clients = users.filter(
            bookings__start_time__gte=three_months_ago
        ).distinct().count()

        new_clients = users.filter(
            bookings__start_time__gte=one_month_ago,
            bookings__start_time__lt=now
        ).distinct().count()

        return {
            'total_clients': users.count(),
            'active_clients': active_clients,
            'new_clients': new_clients
        }


class PractitionerDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed practitioner information."""
    
    user = PractitionerUserSerializer(read_only=True)
    specializations = SpecializeSerializer(many=True, read_only=True)
    styles = StyleSerializer(many=True, read_only=True)
    topics = TopicSerializer(many=True, read_only=True)
    modalities = ModalitySerializer(many=True, read_only=True)
    average_rating_float = serializers.FloatField(source='average_rating', read_only=True)
    profile_image_url = SafeImageURLField(allow_null=True)
    locations = serializers.SerializerMethodField()
    
    class Meta:
        model = Practitioner
        fields = [
            'id', 'user', 'title', 'bio', 'description', 'quote', 
            'profile_image_url', 'profile_video_url',
            'average_rating', 'average_rating_float', 'total_reviews', 'years_of_experience',
            'is_verified', 'featured', 'practitioner_status',
            'specializations', 'styles', 'topics', 'modalities', 'buffer_time',
            'next_available_date', 'completed_sessions',
            'cancellation_rate', 'book_times',
            'min_price', 'max_price', 'total_services', 'display_name',
            'locations'
        ]
    
    @extend_schema_field(PractitionerLocationSerializer(many=True))
    def get_locations(self, obj):
        """Get locations for this practitioner."""
        locations = obj.locations.all()
        return PractitionerLocationSerializer(locations, many=True).data


class ServiceBasicSerializer(serializers.Serializer):
    """Basic serializer for service information to avoid circular imports."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    duration = serializers.IntegerField(allow_null=True)
    location_type = serializers.CharField()
    is_active = serializers.BooleanField()
    image_url = serializers.URLField(allow_null=True)
    description = serializers.CharField(allow_null=True)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, allow_null=True)
    total_reviews = serializers.IntegerField(default=0)
    upcoming_sessions = serializers.ListField(child=serializers.DictField(), required=False)
    service_type = serializers.DictField(required=False)
    category = serializers.DictField(required=False)
    child_services = serializers.ListField(child=serializers.DictField(), required=False)


class ServiceCategoryBasicSerializer(serializers.Serializer):
    """Basic serializer for service category information to avoid circular imports."""
    id = serializers.UUIDField()
    name = serializers.CharField()
    slug = serializers.SlugField()
    description = serializers.CharField(allow_null=True)
    icon = serializers.CharField(allow_null=True)
    image_url = serializers.URLField(allow_null=True)
    is_active = serializers.BooleanField()


class PractitionerProfileSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for practitioner profiles with all related data."""
    
    user = PractitionerUserSerializer(read_only=True)
    specializations = SpecializeSerializer(many=True, read_only=True)
    styles = StyleSerializer(many=True, read_only=True)
    topics = TopicSerializer(many=True, read_only=True)
    modalities = ModalitySerializer(many=True, read_only=True)
    certifications = CertificationSerializer(many=True, read_only=True)
    educations = EducationSerializer(many=True, read_only=True)
    questions = QuestionSerializer(many=True, read_only=True)
    services = serializers.SerializerMethodField()
    services_by_category = serializers.SerializerMethodField()
    services_by_type = serializers.SerializerMethodField()
    service_categories = serializers.SerializerMethodField()
    average_rating_float = serializers.FloatField(source='average_rating', read_only=True)
    locations = serializers.SerializerMethodField()
    
    class Meta:
        model = Practitioner
        fields = [
            'id', 'user', 'title', 'bio', 'description', 'quote', 
            'profile_image_url', 'profile_video_url',
            'average_rating', 'average_rating_float', 'total_reviews', 'years_of_experience',
            'is_verified', 'featured', 'practitioner_status',
            'specializations', 'styles', 'topics', 'modalities', 
            'certifications', 'educations', 'questions',
            'buffer_time', 'next_available_date', 'completed_sessions',
            'cancellation_rate', 'book_times',
            'min_price', 'max_price', 'total_services', 'display_name',
            'services', 'services_by_category', 'services_by_type', 'service_categories',
            'locations'
        ]
    
    @extend_schema_field(PractitionerLocationSerializer(many=True))
    def get_locations(self, obj):
        """Get locations for this practitioner."""
        locations = obj.locations.all()
        return PractitionerLocationSerializer(locations, many=True).data
    
    @extend_schema_field(inline_serializer(
        name='ServiceBasicSerializerList',
        fields={
            'id': serializers.IntegerField(),
            'name': serializers.CharField(),
            'price': serializers.DecimalField(max_digits=10, decimal_places=2),
            'duration': serializers.IntegerField(),
            'location_type': serializers.CharField(),
            'is_active': serializers.BooleanField(),
            'image_url': serializers.URLField(),
            'description': serializers.CharField(),
            'average_rating': serializers.DecimalField(max_digits=3, decimal_places=2),
            'total_reviews': serializers.IntegerField(),
            'service_type': serializers.DictField(),
            'category': serializers.DictField(),
        },
        many=True
    ))
    def get_services(self, obj):
        """Get all services for this practitioner."""
        from apps.services.models import Service, ServiceType, ServiceSession, ServiceRelationship
        from django.utils import timezone
        from collections import defaultdict
        
        # Get services through the M2M relationship only
        services = Service.objects.filter(
            practitioner_relationships__practitioner=obj,
            is_active=True
        ).select_related('service_type', 'category').distinct()
        
        # Get upcoming sessions for workshops and courses
        now = timezone.now()
        upcoming_sessions = ServiceSession.objects.filter(
            service__in=services,
            start_time__gte=now
        ).order_by('start_time').select_related('service')
        
        # Create a mapping of service IDs to their upcoming sessions
        service_sessions = defaultdict(list)
        for session in upcoming_sessions:
            service_sessions[session.service_id].append({
                'id': session.id,
                'start_time': session.start_time,
                'end_time': session.end_time,
                'location': session.location,
                'max_participants': session.max_participants,
                'current_participants': session.current_participants
            })
        
        # Get child services for packages and bundles
        package_services = [s for s in services if s.service_type and s.service_type.name in ['package', 'bundle']]
        package_relationships = ServiceRelationship.objects.filter(
            parent_service__in=package_services
        ).select_related('child_service', 'child_service__service_type', 'child_service__category')
        
        # Create a mapping of parent service IDs to their child services
        service_children = defaultdict(list)
        for rel in package_relationships:
            child = rel.child_service
            service_children[rel.parent_service_id].append({
                'id': child.id,
                'name': child.name,
                'price': child.price,
                'duration': child.duration,
                'location_type': child.location_type,
                'description': child.description,
                'service_type': {
                    'id': child.service_type.id if child.service_type else None,
                    'name': child.service_type.name if child.service_type else None
                },
                'category': {
                    'id': child.category.id if child.category else None,
                    'name': child.category.name if child.category else None
                },
                'quantity': rel.quantity,
                'discount_percentage': rel.discount_percentage
            })
        
        # Prepare service data
        service_data = []
        for service in services:
            data = {
                'id': service.id,
                'name': service.name,
                'price': service.price,
                'duration': service.duration,
                'location_type': service.location_type,
                'is_active': service.is_active,
                'image_url': service.image_url,
                'description': service.description,
                'average_rating': service.average_rating,
                'total_reviews': service.total_reviews,
            }
            
            # Add service type information
            if service.service_type:
                data['service_type'] = {
                    'id': service.service_type.id,
                    'name': service.service_type.name,
                    'description': service.service_type.description,
                    'code': service.service_type.code
                }
                
                # Add upcoming sessions for all service types
                data['upcoming_sessions'] = service_sessions.get(service.id, [])
                
                # Add child services for packages and bundles
                if service.service_type.name in ['package', 'bundle'] and service.id in service_children:
                    data['child_services'] = service_children[service.id]
            
            # Add category information
            if service.category:
                data['category'] = {
                    'id': service.category.id,
                    'name': service.category.name,
                    'slug': service.category.slug,
                    'description': service.category.description,
                    'icon': service.category.icon,
                    'image_url': service.category.image_url
                }
            
            service_data.append(data)
            
        return ServiceBasicSerializer(service_data, many=True).data
    
    @extend_schema_field(inline_serializer(
        name='ServicesByCategoryList',
        fields={
            'category': serializers.DictField(),
            'services': serializers.ListField(child=serializers.DictField()),
        },
        many=True
    ))
    def get_services_by_category(self, obj):
        """Group services by category for this practitioner."""
        from apps.services.models import Service, ServiceCategory
        from collections import defaultdict
        
        # Get services through the M2M relationship only
        services = Service.objects.filter(
            practitioner_relationships__practitioner=obj,
            is_active=True
        ).select_related('category').distinct()
        
        # Group services by category
        services_by_category = defaultdict(list)
        
        # Add services with categories
        for service in services:
            if service.category:
                category_id = str(service.category.id)  # Convert UUID to string
                category_name = service.category.name
                
                services_by_category[category_id].append({
                    'id': service.id,
                    'name': service.name,
                    'price': service.price,
                    'duration': service.duration,
                    'location_type': service.location_type,
                    'is_active': service.is_active,
                    'image_url': service.image_url,
                    'description': service.description,
                    'average_rating': service.average_rating,
                    'total_reviews': service.total_reviews,
                    'category': {
                        'id': category_id,
                        'name': category_name
                    }
                })
        
        # Format the result as a list of categories with their services
        result = []
        for category_id, services in services_by_category.items():
            # Get the category object
            try:
                category = ServiceCategory.objects.get(id=category_id)
                result.append({
                    'category': {
                        'id': str(category.id),
                        'name': category.name,
                        'slug': category.slug,
                        'description': category.description,
                        'icon': category.icon,
                        'image_url': category.image_url,
                        'parent': str(category.parent.id) if category.parent else None
                    },
                    'services': ServiceBasicSerializer(services, many=True).data
                })
            except ServiceCategory.DoesNotExist:
                # If category doesn't exist anymore, still include the services
                result.append({
                    'category': {
                        'id': category_id,
                        'name': 'Unknown Category'
                    },
                    'services': ServiceBasicSerializer(services, many=True).data
                })
        
        return result
    
    @extend_schema_field(inline_serializer(
        name='ServicesByTypeList',
        fields={
            'service_type': inline_serializer(
                name='ServiceTypeDetail',
                fields={
                    'id': serializers.IntegerField(),
                    'name': serializers.CharField(),
                    'description': serializers.CharField(allow_null=True, required=False),
                    'code': serializers.CharField(required=False),
                }
            ),
            'services': serializers.ListField(child=serializers.DictField()),
        },
        many=True
    ))
    def get_services_by_type(self, obj):
        """Group services by type for this practitioner."""
        from apps.services.models import Service, ServiceType, ServiceSession
        from collections import defaultdict
        from django.utils import timezone
        
        # Get services through the M2M relationship only
        services = Service.objects.filter(
            practitioner_relationships__practitioner=obj,
            is_active=True
        ).select_related('service_type').distinct()
        
        # Get upcoming sessions for workshops and courses
        now = timezone.now()
        upcoming_sessions = ServiceSession.objects.filter(
            service__in=services,
            start_time__gte=now
        ).order_by('start_time').select_related('service')
        
        # Create a mapping of service IDs to their upcoming sessions
        service_sessions = defaultdict(list)
        for session in upcoming_sessions:
            service_sessions[session.service_id].append({
                'id': session.id,
                'start_time': session.start_time,
                'end_time': session.end_time,
                'location': session.location,
                'max_participants': session.max_participants,
                'current_participants': session.current_participants
            })
        
        # Group services by type
        services_by_type = defaultdict(list)
        
        # Add services with types
        for service in services:
            if service.service_type:
                type_id = service.service_type.id
                type_name = service.service_type.name
                
                service_data = {
                    'id': service.id,
                    'name': service.name,
                    'price': service.price,
                    'duration': service.duration,
                    'location_type': service.location_type,
                    'is_active': service.is_active,
                    'image_url': service.image_url,
                    'description': service.description,
                    'average_rating': service.average_rating,
                    'total_reviews': service.total_reviews,
                }
                
                # Add upcoming sessions if this is a workshop or course
                if type_name in ['workshop', 'course'] and service.id in service_sessions:
                    service_data['upcoming_sessions'] = service_sessions[service.id]
                
                services_by_type[type_id].append(service_data)
        
        # Format the result as a list of types with their services
        result = []
        for type_id, services in services_by_type.items():
            # Get the type object
            try:
                service_type = ServiceType.objects.get(id=type_id)
                result.append({
                    'service_type': {
                        'id': service_type.id,
                        'name': service_type.name,
                        'description': service_type.description,
                        'code': service_type.code
                    },
                    'services': ServiceBasicSerializer(services, many=True).data
                })
            except ServiceType.DoesNotExist:
                # If type doesn't exist anymore, still include the services
                result.append({
                    'service_type': {
                        'id': type_id,
                        'name': 'Unknown Type'
                    },
                    'services': ServiceBasicSerializer(services, many=True).data
                })
        
        # Add a default empty list if there are no services
        if not result:
            # Return at least one item with a default type to prevent frontend errors
            result.append({
                'service_type': {
                    'id': 0,
                    'name': 'session',
                    'description': '',
                    'code': 'session'
                },
                'services': []
            })
        
        return result
    
    @extend_schema_field(inline_serializer(
        name='ServiceCategoryList',
        fields={
            'id': serializers.UUIDField(),
            'name': serializers.CharField(),
            'slug': serializers.SlugField(),
            'description': serializers.CharField(),
            'icon': serializers.CharField(),
            'image_url': serializers.URLField(),
            'is_active': serializers.BooleanField(),
            'parent': serializers.UUIDField(),
        },
        many=True
    ))
    def get_service_categories(self, obj):
        """Get all service categories created by this practitioner."""
        from apps.services.models import ServiceCategory
        
        categories = ServiceCategory.objects.filter(
            practitioner=obj,
            is_active=True
        )
        
        # Create a list of basic category data
        category_data = []
        for category in categories:
            category_data.append({
                'id': category.id,
                'name': category.name,
                'slug': category.slug,
                'description': category.description,
                'icon': category.icon,
                'image_url': category.image_url,
                'is_active': category.is_active,
                'parent': category.parent.id if category.parent else None
            })
        
        return ServiceCategoryBasicSerializer(category_data, many=True).data


class PractitionerOnboardingProgressSerializer(serializers.ModelSerializer):
    """
    Serializer for the PractitionerOnboardingProgress model.
    Shows onboarding progress for practitioners.
    """
    completion_percentage = serializers.SerializerMethodField()
    next_step_description = serializers.SerializerMethodField()
    
    class Meta:
        model = PractitionerOnboardingProgress
        fields = [
            'id', 
            'status', 
            'current_step', 
            'steps_completed', 
            'completion_percentage',
            'next_step_description',
            'started_at',
            'last_updated',
            'completed_at'
        ]
        read_only_fields = fields
    
    def get_completion_percentage(self, obj):
        """
        Get the completion percentage for the onboarding progress.
        """
        return obj.calculate_completion_percentage()
    
    def get_next_step_description(self, obj):
        """
        Get a user-friendly description of the next step.
        """
        return obj.get_next_step_description()
