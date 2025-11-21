"""
DRF Serializers for Practitioners API
"""
from rest_framework import serializers
from django.db import transaction
from django.db.models import Avg, Count, Min, Max, Q
from django.utils import timezone
from decimal import Decimal

from practitioners.models import (
    Practitioner, Specialize, Style, Topic, Certification, Education,
    Schedule, ScheduleTimeSlot, SchedulePreference, OutOfOffice,
    VerificationDocument, PractitionerOnboardingProgress, Question, ClientNote,
    FeatureRequest
)
from locations.models import PractitionerLocation
from services.models import Service, ServiceType
from reviews.models import Review
from payments.models import PractitionerSubscription
from users.models import User
from common.models import Modality


class SpecializationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner specializations"""
    class Meta:
        model = Specialize
        fields = ['id', 'content']
        read_only_fields = ['id']


class StyleSerializer(serializers.ModelSerializer):
    """Serializer for practitioner styles"""
    class Meta:
        model = Style
        fields = ['id', 'content']
        read_only_fields = ['id']


class TopicSerializer(serializers.ModelSerializer):
    """Serializer for practitioner topics"""
    class Meta:
        model = Topic
        fields = ['id', 'content']
        read_only_fields = ['id']


class CertificationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner certifications"""
    class Meta:
        model = Certification
        fields = ['id', 'certificate', 'institution', 'issue_date', 'expiry_date', 'order']
        read_only_fields = ['id']


class EducationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner education"""
    class Meta:
        model = Education
        fields = ['id', 'degree', 'educational_institute', 'order']
        read_only_fields = ['id']


class ModalitySerializer(serializers.ModelSerializer):
    """Serializer for modalities"""
    class Meta:
        model = Modality
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']


class PractitionerLocationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner location"""
    full_address = serializers.ReadOnlyField()
    
    class Meta:
        model = PractitionerLocation
        fields = [
            'id', 'name', 'address_line1', 'address_line2', 
            'city', 'state', 'postal_code', 'country',
            'latitude', 'longitude', 'full_address',
            'is_primary', 'is_virtual', 'is_in_person'
        ]
        read_only_fields = ['id', 'full_address']


class VerificationDocumentSerializer(serializers.ModelSerializer):
    """Serializer for verification documents"""
    class Meta:
        model = VerificationDocument
        fields = [
            'id', 'document_type', 'document_url', 'status',
            'rejection_reason', 'notes', 'expires_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'rejection_reason', 'created_at', 'updated_at']


class PractitionerSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for practitioner subscription status"""
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    
    class Meta:
        model = PractitionerSubscription
        fields = [
            'id', 'tier', 'tier_display', 'status', 'start_date',
            'end_date', 'is_active', 'is_annual'
        ]
        read_only_fields = fields


class PractitionerListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for practitioner listings"""
    full_name = serializers.ReadOnlyField()
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    total_services = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    primary_location = PractitionerLocationSerializer(read_only=True)
    specializations = SpecializationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Practitioner
        fields = [
            'id', 'public_uuid', 'display_name', 'slug', 'professional_title',
            'profile_image_url', 'years_of_experience', 'is_verified',
            'featured', 'full_name', 'average_rating', 'total_reviews',
            'total_services', 'price_range', 'primary_location',
            'specializations', 'next_available_date'
        ]
        read_only_fields = fields
    
    def get_average_rating(self, obj):
        """Calculate average rating from reviews"""
        result = Review.objects.filter(
            practitioner=obj,
            is_published=True
        ).aggregate(avg_rating=Avg('rating'))
        return round(result['avg_rating'] or 0, 2)
    
    def get_total_reviews(self, obj):
        """Count total published reviews"""
        return Review.objects.filter(
            practitioner=obj,
            is_published=True
        ).count()
    
    def get_total_services(self, obj):
        """Count total active services"""
        return obj.primary_services.filter(is_active=True).count()
    
    def get_price_range(self, obj):
        """Get min and max price from active services"""
        result = obj.primary_services.filter(is_active=True).aggregate(
            min_price=Min('price_cents'),
            max_price=Max('price_cents')
        )
        return {
            'min': Decimal(result['min_price']) / 100 if result['min_price'] else None,
            'max': Decimal(result['max_price']) / 100 if result['max_price'] else None
        }


class PractitionerDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for public practitioner profiles"""
    full_name = serializers.ReadOnlyField()
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    total_services = serializers.SerializerMethodField()
    completed_sessions_count = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    
    # Related data
    primary_location = PractitionerLocationSerializer(read_only=True)
    specializations = SpecializationSerializer(many=True, read_only=True)
    styles = StyleSerializer(many=True, read_only=True)
    topics = TopicSerializer(many=True, read_only=True)
    modalities = ModalitySerializer(many=True, read_only=True)
    certifications = CertificationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Practitioner
        fields = [
            'id', 'public_uuid', 'display_name', 'slug', 'professional_title',
            'bio', 'quote', 'profile_image_url', 'profile_video_url',
            'years_of_experience', 'is_verified', 'featured', 'is_active',
            'full_name', 'average_rating', 'total_reviews', 'total_services',
            'completed_sessions_count', 'price_range', 'next_available_date',
            'primary_location', 'specializations', 'styles', 'topics',
            'modalities', 'certifications'
        ]
        read_only_fields = fields
    
    def get_average_rating(self, obj):
        return obj.average_rating
    
    def get_total_reviews(self, obj):
        return obj.total_reviews
    
    def get_total_services(self, obj):
        return obj.total_services
    
    def get_completed_sessions_count(self, obj):
        return obj.completed_sessions_count
    
    def get_price_range(self, obj):
        return obj.price_range


class PractitionerPrivateSerializer(PractitionerDetailSerializer):
    """Private serializer for practitioner's own profile"""
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone_number', read_only=True)
    cancellation_rate = serializers.SerializerMethodField()
    subscription = PractitionerSubscriptionSerializer(read_only=True)
    educations = EducationSerializer(many=True, read_only=True)
    
    class Meta(PractitionerDetailSerializer.Meta):
        fields = PractitionerDetailSerializer.Meta.fields + [
            'email', 'phone', 'practitioner_status', 'is_onboarded',
            'onboarding_step', 'onboarding_completed_at', 'buffer_time',
            'cancellation_rate', 'subscription', 'educations',
            'created_at', 'updated_at'
        ]
    
    def get_cancellation_rate(self, obj):
        return obj.cancellation_rate


class PractitionerUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating practitioner profile"""
    specialization_ids = serializers.PrimaryKeyRelatedField(
        queryset=Specialize.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    style_ids = serializers.PrimaryKeyRelatedField(
        queryset=Style.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    topic_ids = serializers.PrimaryKeyRelatedField(
        queryset=Topic.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    modality_ids = serializers.PrimaryKeyRelatedField(
        queryset=Modality.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    certification_ids = serializers.PrimaryKeyRelatedField(
        queryset=Certification.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    education_ids = serializers.PrimaryKeyRelatedField(
        queryset=Education.objects.all(),
        many=True,
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Practitioner
        fields = [
            'display_name', 'slug', 'professional_title', 'bio', 'quote',
            'profile_image_url', 'profile_video_url', 'years_of_experience',
            'buffer_time', 'specialization_ids', 'style_ids', 'topic_ids',
            'modality_ids', 'certification_ids', 'education_ids'
        ]
    
    def update(self, instance, validated_data):
        # Extract many-to-many fields
        specializations = validated_data.pop('specialization_ids', None)
        styles = validated_data.pop('style_ids', None)
        topics = validated_data.pop('topic_ids', None)
        modalities = validated_data.pop('modality_ids', None)
        certifications = validated_data.pop('certification_ids', None)
        educations = validated_data.pop('education_ids', None)
        
        # Update instance fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update many-to-many relationships
        if specializations is not None:
            instance.specializations.set(specializations)
        if styles is not None:
            instance.styles.set(styles)
        if topics is not None:
            instance.topics.set(topics)
        if modalities is not None:
            instance.modalities.set(modalities)
        if certifications is not None:
            instance.certifications.set(certifications)
        if educations is not None:
            instance.educations.set(educations)
        
        return instance


class PractitionerApplicationSerializer(serializers.ModelSerializer):
    """Serializer for practitioner applications"""
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    class Meta:
        model = Practitioner
        fields = [
            'user', 'display_name', 'professional_title', 'bio',
            'years_of_experience', 'profile_image_url'
        ]
    
    def create(self, validated_data):
        # Check if user already has a practitioner profile
        if Practitioner.objects.filter(user=validated_data['user']).exists():
            raise serializers.ValidationError("You already have a practitioner profile")
        
        # Create practitioner profile with pending status
        practitioner = Practitioner.objects.create(
            **validated_data,
            practitioner_status='pending'
        )
        
        # Create onboarding progress tracking
        PractitionerOnboardingProgress.objects.create(
            practitioner=practitioner,
            status='in_progress',
            current_step='profile_completion'
        )
        
        return practitioner


# Schedule-related serializers
class ScheduleTimeSlotSerializer(serializers.ModelSerializer):
    """Serializer for schedule time slots"""
    class Meta:
        model = ScheduleTimeSlot
        fields = ['id', 'day', 'start_time', 'end_time', 'is_active']
        read_only_fields = ['id']
    
    def validate(self, attrs):
        if attrs.get('end_time') and attrs.get('start_time'):
            if attrs['end_time'] <= attrs['start_time']:
                raise serializers.ValidationError("End time must be after start time")
        return attrs


class ScheduleSerializer(serializers.ModelSerializer):
    """Serializer for practitioner schedules"""
    time_slots = ScheduleTimeSlotSerializer(many=True, read_only=True)
    
    class Meta:
        model = Schedule
        fields = [
            'id', 'name', 'description', 'timezone', 'is_default',
            'is_active', 'time_slots', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ScheduleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating schedules with time slots"""
    time_slots = ScheduleTimeSlotSerializer(many=True, write_only=True, required=False)
    
    class Meta:
        model = Schedule
        fields = [
            'name', 'description', 'timezone', 'is_default',
            'is_active', 'time_slots'
        ]
    
    def create(self, validated_data):
        time_slots_data = validated_data.pop('time_slots', [])
        
        with transaction.atomic():
            schedule = Schedule.objects.create(**validated_data)
            
            # Create time slots
            for slot_data in time_slots_data:
                ScheduleTimeSlot.objects.create(schedule=schedule, **slot_data)
        
        return schedule


class SchedulePreferenceSerializer(serializers.ModelSerializer):
    """Serializer for schedule preferences"""
    class Meta:
        model = SchedulePreference
        fields = [
            'id', 'timezone', 'country', 'holidays', 'respect_holidays',
            'advance_booking_min_hours', 'advance_booking_max_days',
            'is_active', 'auto_accept_bookings'
        ]
        read_only_fields = ['id']


class OutOfOfficeSerializer(serializers.ModelSerializer):
    """Serializer for out of office periods"""
    class Meta:
        model = OutOfOffice
        fields = [
            'id', 'from_date', 'to_date', 'title', 'is_archived',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        if attrs.get('to_date') and attrs.get('from_date'):
            if attrs['to_date'] < attrs['from_date']:
                raise serializers.ValidationError("To date must be after from date")
        return attrs


class OnboardingProgressSerializer(serializers.ModelSerializer):
    """Serializer for onboarding progress"""
    completion_percentage = serializers.SerializerMethodField()
    next_step_description = serializers.ReadOnlyField(source='get_next_step_description')
    
    class Meta:
        model = PractitionerOnboardingProgress
        fields = [
            'id', 'status', 'current_step', 'steps_completed',
            'completion_percentage', 'next_step_description',
            'stall_reason', 'rejection_reason', 'started_at',
            'last_updated', 'completed_at'
        ]
        read_only_fields = fields
    
    def get_completion_percentage(self, obj):
        return obj.calculate_completion_percentage()


# Availability-related serializers
class AvailabilitySlotSerializer(serializers.Serializer):
    """Serializer for available time slots"""
    date = serializers.DateField()
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField()
    is_available = serializers.BooleanField()
    service_types = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    booking_id = serializers.IntegerField(required=False, allow_null=True)
    service_name = serializers.CharField(required=False, allow_null=True)


class AvailabilityQuerySerializer(serializers.Serializer):
    """Serializer for availability queries"""
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    service_id = serializers.IntegerField(required=False, allow_null=True)
    service_type = serializers.CharField(required=False, allow_null=True)
    duration_minutes = serializers.IntegerField(required=False, allow_null=True)
    timezone = serializers.CharField(default='UTC')
    
    def validate(self, attrs):
        if attrs['end_date'] < attrs['start_date']:
            raise serializers.ValidationError("End date must be after start date")
        
        # Limit date range to prevent excessive queries
        date_diff = (attrs['end_date'] - attrs['start_date']).days
        if date_diff > 90:
            raise serializers.ValidationError("Date range cannot exceed 90 days")
        
        return attrs


class PractitionerSearchSerializer(serializers.Serializer):
    """Serializer for practitioner search/filter parameters"""
    # Location filters
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    radius_km = serializers.IntegerField(required=False, min_value=1, max_value=100)
    
    # Service filters
    service_type_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    category_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    specialization_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    style_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    topic_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    modality_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    
    # Availability filters
    available_on = serializers.DateField(required=False, allow_null=True)
    available_time = serializers.TimeField(required=False, allow_null=True)
    location_type = serializers.ChoiceField(
        choices=['virtual', 'in_person', 'hybrid'],
        required=False
    )
    
    # Price filters
    min_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        min_value=0
    )
    max_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        min_value=0
    )
    
    # Other filters
    min_rating = serializers.FloatField(required=False, min_value=0, max_value=5)
    min_experience_years = serializers.IntegerField(required=False, min_value=0)
    languages = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    is_verified = serializers.BooleanField(required=False)
    featured_only = serializers.BooleanField(default=False)
    
    # Sorting
    sort_by = serializers.ChoiceField(
        choices=[
            'relevance', 'rating', 'price_low', 'price_high',
            'experience', 'distance', 'availability'
        ],
        default='relevance'
    )
    
    def validate(self, attrs):
        # Validate price range
        if attrs.get('max_price') and attrs.get('min_price'):
            if attrs['max_price'] < attrs['min_price']:
                raise serializers.ValidationError(
                    "max_price must be greater than min_price"
                )
        
        # Validate location search
        if (attrs.get('latitude') or attrs.get('longitude')) and not attrs.get('radius_km'):
            attrs['radius_km'] = 10  # Default 10km radius
        
        return attrs


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for practitioner FAQ questions and answers"""
    class Meta:
        model = Question
        fields = ['id', 'title', 'answer', 'order']
        read_only_fields = ['id']


class PractitionerClientSerializer(serializers.ModelSerializer):
    """Serializer for practitioner's client list"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    display_name = serializers.CharField(source='profile.display_name', read_only=True)
    avatar_url = serializers.CharField(source='profile.avatar_url', read_only=True)
    
    # Annotated fields from the query
    total_bookings = serializers.IntegerField(read_only=True)
    total_spent = serializers.IntegerField(read_only=True)  # In cents
    total_spent_display = serializers.SerializerMethodField()
    last_booking_date = serializers.DateTimeField(read_only=True)
    next_booking_date = serializers.DateTimeField(read_only=True)
    
    # Session types the client has booked
    session_types = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'display_name', 'avatar_url',
            'phone_number', 'total_bookings', 'total_spent', 'total_spent_display',
            'last_booking_date', 'next_booking_date', 'session_types'
        ]
        read_only_fields = fields
    
    def get_total_spent_display(self, obj):
        """Convert cents to dollar display"""
        if obj.total_spent:
            return f"${obj.total_spent / 100:.2f}"
        return "$0.00"
    
    def get_session_types(self, obj):
        """Get unique service types the client has booked"""
        from bookings.models import Booking
        
        # Get practitioner from context
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'practitioner_profile'):
            return []
        
        practitioner = request.user.practitioner_profile
        
        # Get unique service types
        service_types = Booking.objects.filter(
            user=obj,
            practitioner=practitioner,
            status__in=['completed', 'confirmed']
        ).select_related('service__service_type').values_list(
            'service__service_type__name', flat=True
        ).distinct()
        
        return list(service_types)


class ClientNoteSerializer(serializers.ModelSerializer):
    """Serializer for client notes created by practitioners"""
    practitioner_name = serializers.CharField(source='practitioner.display_name', read_only=True)
    
    class Meta:
        model = ClientNote
        fields = ['id', 'content', 'created_at', 'updated_at', 'practitioner_name']
        read_only_fields = ['id', 'created_at', 'updated_at', 'practitioner_name']
    
    def create(self, validated_data):
        """Create a new client note"""
        # Get practitioner from request user
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'practitioner_profile'):
            raise serializers.ValidationError("You must be a practitioner to create notes")

        validated_data['practitioner'] = request.user.practitioner_profile
        return super().create(validated_data)


class FeatureRequestSerializer(serializers.ModelSerializer):
    """Serializer for feature requests submitted by practitioners"""
    practitioner_name = serializers.CharField(source='practitioner.display_name', read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = FeatureRequest
        fields = [
            'id', 'title', 'description', 'category', 'priority', 'status',
            'votes', 'created_at', 'updated_at', 'practitioner_name', 'can_edit'
        ]
        read_only_fields = ['id', 'status', 'votes', 'created_at', 'updated_at', 'practitioner_name', 'can_edit']

    def get_can_edit(self, obj):
        """Check if the request can be edited (only submitted status can be edited)"""
        return obj.status == 'submitted'

    def create(self, validated_data):
        """Create a new feature request"""
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'practitioner_profile'):
            raise serializers.ValidationError("You must be a practitioner to submit feature requests")

        validated_data['practitioner'] = request.user.practitioner_profile
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Only allow updates if status is 'submitted'"""
        if instance.status != 'submitted':
            raise serializers.ValidationError("You can only edit feature requests that are in 'submitted' status")
        return super().update(instance, validated_data)
