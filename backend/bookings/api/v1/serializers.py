from rest_framework import serializers
from apps.bookings.models import Booking, BookingReminders
from apps.practitioners.api.v1.serializers import BasicPractitionerSerializer
from apps.users.models import User
from apps.services.api.v1.serializers import ServiceSerializer
from apps.services.models import ServiceSession
from drf_spectacular.utils import extend_schema_field


class BookingUserSerializer(serializers.ModelSerializer):
    """Serializer for basic user information in bookings."""
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'display_name', 'profile_picture']
    
    @extend_schema_field(serializers.CharField())
    def get_display_name(self, obj: User) -> str:
        if hasattr(obj, 'practitioner_profile') and obj.practitioner_profile.display_name:
            return obj.practitioner_profile.display_name
        return f"{obj.first_name} {obj.last_name}" if obj.first_name and obj.last_name else obj.email


class BookingServiceSessionSerializer(serializers.ModelSerializer):
    """Serializer for service sessions in bookings."""
    
    class Meta:
        model = ServiceSession
        fields = ['id', 'start_time', 'end_time', 'max_participants', 'current_participants']


class BasicBookingSerializer(serializers.ModelSerializer):
    """Basic serializer for booking information."""
    
    class Meta:
        model = Booking
        fields = [
            'id', 'start_time', 'end_time_expected', 'status',
            'title', 'location', 'is_group'
        ]


# Create an alias for BasicBookingSerializer to maintain compatibility
# with code that imports BookingBasicSerializer
BookingBasicSerializer = BasicBookingSerializer


class BookingListSerializer(serializers.ModelSerializer):
    """Serializer for listing bookings with essential information."""
    practitioner = BasicPractitionerSerializer(read_only=True)
    user = BookingUserSerializer(read_only=True)
    service_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Booking
        fields = [
            'id', 'practitioner', 'user', 'start_time', 'end_time_expected',
            'status', 'title', 'location', 'service_name', 'is_group',
            'is_canceled', 'created_at'
        ]
    
    @extend_schema_field(serializers.CharField())
    def get_service_name(self, obj: Booking) -> str:
        return obj.service.name if obj.service else None


class BookingReminderSerializer(serializers.ModelSerializer):
    """Serializer for booking reminders."""
    booking = BasicBookingSerializer(read_only=True)
    
    class Meta:
        model = BookingReminders
        fields = ['id', 'booking', 'type', 'scheduled_time', 'sent_at', 'created_at']


class BookingDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for booking information."""
    practitioner = BasicPractitionerSerializer(read_only=True)
    user = BookingUserSerializer(read_only=True)
    service = ServiceSerializer(read_only=True)
    service_session = BookingServiceSessionSerializer(read_only=True)
    parent_booking = BasicBookingSerializer(read_only=True)
    child_bookings = BasicBookingSerializer(many=True, read_only=True)
    reminders = BookingReminderSerializer(many=True, read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'practitioner', 'user', 'start_time', 'end_time_expected', 'end_time',
            'status', 'is_canceled', 'cancellation_reason', 'description',
            'created_at', 'updated_at', 'is_rescheduled', 'service', 'note',
            'location', 'title', 'credit_value', 'completed_at', 'practitioner_note',
            'canceled_by', 'canceled_date', 'cancel_reason', 'is_group',
            'parent_booking', 'child_bookings', 'service_session', 'reminders'
        ]
        read_only_fields = ['created_at', 'updated_at']


class BookingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bookings."""
    
    class Meta:
        model = Booking
        fields = [
            'practitioner', 'user', 'start_time', 'end_time_expected',
            'description', 'service', 'note', 'location', 'title',
            'parent_booking', 'service_session', 'is_group'
        ]
    
    def validate(self, data: dict) -> dict:
        """
        Validate booking data:
        - Check if practitioner is available at the requested time
        - Check if service session has available spots
        """
        start_time = data.get('start_time')
        end_time = data.get('end_time_expected')
        practitioner = data.get('practitioner')
        service_session = data.get('service_session')
        
        if practitioner and start_time and end_time:
            # Check for overlapping bookings for the practitioner
            overlapping_bookings = Booking.objects.filter(
                practitioner=practitioner,
                start_time__lt=end_time,
                end_time_expected__gt=start_time,
                status__in=['pending', 'confirmed']
            ).exclude(is_canceled=True)
            
            if overlapping_bookings.exists():
                raise serializers.ValidationError(
                    "The practitioner is not available during the requested time."
                )
        
        if service_session:
            # Check if service session has available spots
            if service_session.current_participants >= service_session.max_participants:
                raise serializers.ValidationError(
                    "This session is already full. Please choose another session."
                )
        
        return data


class BookingUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating bookings."""
    
    class Meta:
        model = Booking
        fields = [
            'start_time', 'end_time_expected', 'status', 'description',
            'note', 'location', 'title', 'practitioner_note', 'cancellation_reason'
        ]
