"""
Booking serializers for DRF API
"""
from rest_framework import serializers
from django.utils import timezone
from django.db import transaction

from bookings.models import (
    Booking, BookingReminder, BookingNote,
    BOOKING_STATUS_CHOICES, PAYMENT_STATUS_CHOICES,
    CANCELED_BY_CHOICES
)
from practitioners.models import Practitioner
from services.models import Service, ServiceSession
from rooms.models import Room
from utils.models import Address
from users.models import User


class BookingUserSerializer(serializers.ModelSerializer):
    """Simplified user serializer for bookings"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    avatar_url = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'avatar_url', 'phone_number']
        read_only_fields = fields


class BookingPractitionerSerializer(serializers.ModelSerializer):
    """Simplified practitioner serializer for bookings"""
    name = serializers.CharField(source='display_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    avatar_url = serializers.CharField(source='user.avatar_url', read_only=True)
    
    class Meta:
        model = Practitioner
        fields = ['id', 'public_uuid', 'name', 'email', 'avatar_url', 'bio']
        read_only_fields = fields


class BookingServiceSerializer(serializers.ModelSerializer):
    """Simplified service serializer for bookings"""
    service_type = serializers.CharField(read_only=True)
    
    class Meta:
        model = Service
        fields = [
            'id', 'public_uuid', 'name', 'description', 'service_type',
            'duration_minutes', 'price_cents', 'location_type',
            'is_package', 'is_bundle', 'is_course'
        ]
        read_only_fields = fields


class BookingRoomSerializer(serializers.ModelSerializer):
    """Simplified room serializer for bookings"""
    room_name = serializers.CharField(source='livekit_room_name', read_only=True)
    
    class Meta:
        model = Room
        fields = ['id', 'public_uuid', 'name', 'room_name', 'status']
        read_only_fields = fields


class BookingAddressSerializer(serializers.ModelSerializer):
    """Address serializer for bookings"""
    class Meta:
        model = Address
        fields = ['id', 'city', 'state_province', 'country_code']


class BookingReminderSerializer(serializers.ModelSerializer):
    """Booking reminder serializer"""
    class Meta:
        model = BookingReminder
        fields = [
            'id', 'reminder_type', 'scheduled_time', 'sent_at',
            'subject', 'message', 'is_sent'
        ]
        read_only_fields = ['id', 'sent_at', 'is_sent']


class BookingNoteSerializer(serializers.ModelSerializer):
    """Booking note serializer"""
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    
    class Meta:
        model = BookingNote
        fields = [
            'id', 'content', 'is_private', 'author_name', 'author_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author_name', 'author_email', 'created_at', 'updated_at']


class BookingListSerializer(serializers.ModelSerializer):
    """Booking list serializer with minimal details"""
    user = BookingUserSerializer(read_only=True)
    practitioner = BookingPractitionerSerializer(read_only=True)
    service = BookingServiceSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    price_charged = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    final_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'public_uuid', 'user', 'practitioner', 'service', 'start_time', 'end_time',
            'status', 'status_display', 'payment_status', 'payment_status_display',
            'price_charged', 'final_amount', 'duration_minutes', 'is_upcoming',
            'created_at', 'updated_at'
        ]


class BookingDetailSerializer(serializers.ModelSerializer):
    """Detailed booking serializer"""
    user = BookingUserSerializer(read_only=True)
    practitioner = BookingPractitionerSerializer(read_only=True)
    service = BookingServiceSerializer(read_only=True)
    room = BookingRoomSerializer(read_only=True)
    location = BookingAddressSerializer(read_only=True)
    reminders = BookingReminderSerializer(many=True, read_only=True)
    notes = BookingNoteSerializer(many=True, read_only=True)
    
    # Computed fields
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    price_charged = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    final_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    can_be_canceled = serializers.BooleanField(read_only=True)
    can_be_rescheduled = serializers.BooleanField(read_only=True)
    
    # Booking type flags
    is_individual_session = serializers.BooleanField(read_only=True)
    is_group_session = serializers.BooleanField(read_only=True)
    is_package_booking = serializers.BooleanField(read_only=True)
    is_course_booking = serializers.BooleanField(read_only=True)
    is_parent_booking = serializers.BooleanField(read_only=True)
    
    # Child bookings (for packages)
    child_bookings = serializers.SerializerMethodField()
    
    # Parent booking reference
    parent_booking_id = serializers.IntegerField(source='parent_booking.id', read_only=True)
    parent_booking_uuid = serializers.CharField(source='parent_booking.public_uuid', read_only=True)
    
    # Rescheduling info
    rescheduled_from_id = serializers.IntegerField(source='rescheduled_from.id', read_only=True)
    rescheduled_from_uuid = serializers.CharField(source='rescheduled_from.public_uuid', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'public_uuid', 'user', 'practitioner', 'service', 'room', 'location',
            'start_time', 'end_time', 'actual_start_time', 'actual_end_time',
            'timezone', 'status', 'status_display', 'payment_status', 'payment_status_display',
            'title', 'description', 'client_notes', 'practitioner_notes',
            'meeting_url', 'meeting_id', 'price_charged', 'discount_amount', 'final_amount',
            'price_charged_cents', 'discount_amount_cents', 'final_amount_cents',
            'service_name_snapshot', 'service_description_snapshot', 'practitioner_name_snapshot',
            'service_duration_snapshot', 'package_name_snapshot', 'package_contents_snapshot',
            'bundle_name_snapshot', 'bundle_sessions_snapshot',
            'completed_at', 'no_show_at', 'canceled_at', 'canceled_by', 'cancellation_reason',
            'confirmed_at', 'started_at', 'status_changed_at',
            'duration_minutes', 'is_upcoming', 'is_active', 'can_be_canceled', 'can_be_rescheduled',
            'is_individual_session', 'is_group_session', 'is_package_booking', 'is_course_booking',
            'is_parent_booking', 'child_bookings', 'parent_booking_id', 'parent_booking_uuid',
            'rescheduled_from_id', 'rescheduled_from_uuid', 'reminders', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'public_uuid', 'actual_start_time', 'actual_end_time',
            'price_charged', 'discount_amount', 'final_amount',
            'service_name_snapshot', 'service_description_snapshot', 'practitioner_name_snapshot',
            'service_duration_snapshot', 'package_name_snapshot', 'package_contents_snapshot',
            'bundle_name_snapshot', 'bundle_sessions_snapshot',
            'completed_at', 'no_show_at', 'canceled_at', 'canceled_by',
            'confirmed_at', 'started_at', 'status_changed_at',
            'created_at', 'updated_at'
        ]
    
    def get_child_bookings(self, obj):
        """Get child bookings for packages"""
        if not obj.is_parent_booking:
            return []
        child_bookings = obj.child_bookings.select_related('service', 'practitioner__user')
        return BookingListSerializer(child_bookings, many=True).data


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bookings"""
    practitioner_id = serializers.IntegerField(write_only=True)
    service_id = serializers.IntegerField(write_only=True)
    location_id = serializers.IntegerField(required=False, allow_null=True)
    service_session_id = serializers.IntegerField(required=False, allow_null=True)
    
    # Optional pricing override
    price_override_cents = serializers.IntegerField(required=False, allow_null=True)
    discount_amount_cents = serializers.IntegerField(default=0)
    
    # Computed fields returned after creation
    booking = BookingDetailSerializer(read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'practitioner_id', 'service_id', 'location_id', 'service_session_id',
            'start_time', 'end_time', 'timezone', 'title', 'description',
            'client_notes', 'price_override_cents', 'discount_amount_cents',
            'booking'
        ]
    
    def validate(self, data):
        """Validate booking creation data"""
        # Validate practitioner exists and is active
        try:
            practitioner = Practitioner.objects.get(
                id=data['practitioner_id'],
                is_active=True
            )
            data['practitioner'] = practitioner
        except Practitioner.DoesNotExist:
            raise serializers.ValidationError("Invalid practitioner")
        
        # Validate service exists and is active
        try:
            service = Service.objects.get(
                id=data['service_id'],
                is_active=True
            )
            data['service'] = service
        except Service.DoesNotExist:
            raise serializers.ValidationError("Invalid service")
        
        # Validate service belongs to practitioner
        if not service.practitioners.filter(id=practitioner.id).exists():
            raise serializers.ValidationError("Service not offered by this practitioner")
        
        # Validate time range
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time")
        
        if data['start_time'] < timezone.now():
            raise serializers.ValidationError("Cannot book in the past")
        
        # Validate duration matches service duration (for individual sessions)
        if service.service_type == 'session':
            expected_duration = service.duration_minutes
            actual_duration = int((data['end_time'] - data['start_time']).total_seconds() / 60)
            if actual_duration != expected_duration:
                raise serializers.ValidationError(
                    f"Booking duration must match service duration ({expected_duration} minutes)"
                )
        
        # Validate location if provided
        if data.get('location_id'):
            try:
                location = Address.objects.get(id=data['location_id'])
                data['location'] = location
            except Address.DoesNotExist:
                raise serializers.ValidationError("Invalid location")
        
        # Validate service session if provided (for workshops/courses)
        if data.get('service_session_id'):
            try:
                session = ServiceSession.objects.get(
                    id=data['service_session_id'],
                    service=service
                )
                data['service_session'] = session
                # Override times with session times
                data['start_time'] = session.start_time
                data['end_time'] = session.end_time
            except ServiceSession.DoesNotExist:
                raise serializers.ValidationError("Invalid service session")
        
        return data
    
    def create(self, validated_data):
        """Create booking with proper initialization"""
        # Extract non-model fields
        practitioner = validated_data.pop('practitioner')
        service = validated_data.pop('service')
        location = validated_data.pop('location', None)
        service_session = validated_data.pop('service_session', None)
        price_override_cents = validated_data.pop('price_override_cents', None)
        
        # Remove write-only fields
        validated_data.pop('practitioner_id', None)
        validated_data.pop('service_id', None)
        validated_data.pop('location_id', None)
        validated_data.pop('service_session_id', None)
        
        # Set pricing
        price_charged_cents = price_override_cents or service.price_cents
        discount_amount_cents = validated_data.get('discount_amount_cents', 0)
        final_amount_cents = price_charged_cents - discount_amount_cents
        
        # Create booking
        with transaction.atomic():
            booking = Booking.objects.create(
                user=self.context['request'].user,
                practitioner=practitioner,
                service=service,
                location=location,
                service_session=service_session,
                price_charged_cents=price_charged_cents,
                discount_amount_cents=discount_amount_cents,
                final_amount_cents=final_amount_cents,
                status='pending_payment',
                payment_status='unpaid',
                **validated_data
            )
            
            # Return the created booking
            self.instance = booking
            return booking
    
    def to_representation(self, instance):
        """Return detailed booking after creation"""
        return {
            'booking': BookingDetailSerializer(instance, context=self.context).data
        }


class BookingUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating booking details"""
    location_id = serializers.IntegerField(required=False, allow_null=True)
    
    class Meta:
        model = Booking
        fields = [
            'title', 'description', 'client_notes', 'location_id',
            'meeting_url', 'meeting_id', 'timezone'
        ]
    
    def validate_location_id(self, value):
        """Validate location if provided"""
        if value:
            try:
                return Address.objects.get(id=value)
            except Address.DoesNotExist:
                raise serializers.ValidationError("Invalid location")
        return None
    
    def update(self, instance, validated_data):
        """Update booking with validation"""
        # Don't allow updates to completed/canceled bookings
        if instance.status in ['completed', 'canceled', 'no_show']:
            raise serializers.ValidationError("Cannot update booking in terminal status")
        
        # Handle location update
        if 'location_id' in validated_data:
            instance.location = validated_data.pop('location_id')
        
        return super().update(instance, validated_data)


class BookingStatusChangeSerializer(serializers.Serializer):
    """Serializer for changing booking status"""
    status = serializers.ChoiceField(choices=BOOKING_STATUS_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True)
    canceled_by = serializers.ChoiceField(choices=CANCELED_BY_CHOICES, required=False)
    
    def validate(self, data):
        """Validate status change"""
        booking = self.context.get('booking')
        new_status = data['status']
        
        # Check if transition is valid
        if not booking.can_transition_to(new_status):
            raise serializers.ValidationError(
                f"Cannot transition from '{booking.status}' to '{new_status}'"
            )
        
        # Require reason for cancellation
        if new_status == 'canceled' and not data.get('reason'):
            raise serializers.ValidationError("Cancellation reason is required")
        
        # Set canceled_by for cancellations
        if new_status == 'canceled' and not data.get('canceled_by'):
            data['canceled_by'] = 'client'  # Default to client cancellation
        
        return data


class BookingRescheduleSerializer(serializers.Serializer):
    """Serializer for rescheduling bookings"""
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate rescheduling data"""
        booking = self.context.get('booking')
        
        # Check if booking can be rescheduled
        if not booking.can_be_rescheduled:
            raise serializers.ValidationError("This booking cannot be rescheduled")
        
        # Validate time range
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time")
        
        if data['start_time'] < timezone.now():
            raise serializers.ValidationError("Cannot reschedule to the past")
        
        # Validate duration matches original
        original_duration = booking.duration_minutes
        new_duration = int((data['end_time'] - data['start_time']).total_seconds() / 60)
        if new_duration != original_duration:
            raise serializers.ValidationError(
                f"New duration must match original duration ({original_duration} minutes)"
            )
        
        # TODO: Check practitioner availability for new time slot
        
        return data


class BookingFilterSerializer(serializers.Serializer):
    """Serializer for booking filters"""
    status = serializers.MultipleChoiceField(
        choices=BOOKING_STATUS_CHOICES,
        required=False
    )
    payment_status = serializers.MultipleChoiceField(
        choices=PAYMENT_STATUS_CHOICES,
        required=False
    )
    practitioner_id = serializers.IntegerField(required=False)
    service_id = serializers.IntegerField(required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    search = serializers.CharField(required=False, allow_blank=True)
    booking_type = serializers.ChoiceField(
        choices=[
            ('individual', 'Individual Session'),
            ('group', 'Group Session'),
            ('package', 'Package'),
            ('course', 'Course'),
            ('bundle', 'Bundle'),
        ],
        required=False
    )
    is_upcoming = serializers.BooleanField(required=False)
    ordering = serializers.ChoiceField(
        choices=[
            'start_time', '-start_time',
            'created_at', '-created_at',
            'price_charged_cents', '-price_charged_cents',
        ],
        default='-start_time',
        required=False
    )


class AvailabilityCheckSerializer(serializers.Serializer):
    """Serializer for checking availability"""
    practitioner_id = serializers.IntegerField()
    service_id = serializers.IntegerField()
    date = serializers.DateField()
    timezone = serializers.CharField(default='UTC')
    
    def validate(self, data):
        """Validate availability check request"""
        # Validate practitioner
        try:
            practitioner = Practitioner.objects.get(
                id=data['practitioner_id'],
                is_active=True
            )
            data['practitioner'] = practitioner
        except Practitioner.DoesNotExist:
            raise serializers.ValidationError("Invalid practitioner")
        
        # Validate service
        try:
            service = Service.objects.get(
                id=data['service_id'],
                is_active=True
            )
            data['service'] = service
        except Service.DoesNotExist:
            raise serializers.ValidationError("Invalid service")
        
        # Validate service belongs to practitioner
        if not service.practitioners.filter(id=practitioner.id).exists():
            raise serializers.ValidationError("Service not offered by this practitioner")
        
        return data


class AvailableSlotSerializer(serializers.Serializer):
    """Serializer for available time slots"""
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField()
    is_available = serializers.BooleanField(default=True)