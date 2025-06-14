"""
DRF Serializers for Bookings
"""
from rest_framework import serializers
from django.db import models
from bookings.models import Booking
from services.models import Service
from practitioners.models import Practitioner
from utils.models import Address
from rooms.models import Room


class BookingSerializer(serializers.ModelSerializer):
    """
    Full booking serializer with all related data.
    
    Note: DRF handles all the field serialization automatically!
    """
    # Add computed fields
    customer_email = serializers.EmailField(source='user.email', read_only=True)
    customer_name = serializers.SerializerMethodField()
    service_name = serializers.CharField(source='service.name', read_only=True)
    practitioner_name = serializers.SerializerMethodField()
    location_name = serializers.CharField(source='location.name', read_only=True, allow_null=True)
    room_name = serializers.CharField(source='room.name', read_only=True, allow_null=True)
    
    # Use properties from model
    price = serializers.DecimalField(source='final_amount', max_digits=10, decimal_places=2, read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    is_cancellable = serializers.BooleanField(source='can_be_canceled', read_only=True)
    can_reschedule = serializers.BooleanField(source='can_be_rescheduled', read_only=True)
    
    # Rename fields to match API schema
    start_datetime = serializers.DateTimeField(source='start_time', read_only=True)
    end_datetime = serializers.DateTimeField(source='end_time', read_only=True)
    confirmation_code = serializers.CharField(source='public_uuid', read_only=True)
    
    class Meta:
        model = Booking
        fields = [
            'id', 'service', 'practitioner', 'location', 'room',
            'start_datetime', 'end_datetime', 'price', 'notes',
            'created_at', 'updated_at', 'status', 'payment_status',
            'customer_email', 'customer_name', 'service_name',
            'practitioner_name', 'location_name', 'room_name',
            'confirmation_code', 'cancelled_at', 'cancelled_by',
            'cancellation_reason', 'is_past', 'is_cancellable',
            'can_reschedule'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_customer_name(self, obj):
        """Get customer full name."""
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
    
    def get_practitioner_name(self, obj):
        """Get practitioner full name."""
        user = obj.practitioner.user
        return f"{user.first_name} {user.last_name}".strip() or user.email


class BookingListSerializer(BookingSerializer):
    """
    Lighter serializer for list views - less data transferred.
    """
    class Meta(BookingSerializer.Meta):
        fields = [
            'id', 'start_datetime', 'end_datetime', 'status',
            'service_name', 'practitioner_name', 'price',
            'confirmation_code', 'is_past'
        ]


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating bookings.
    """
    service = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True)
    )
    practitioner = serializers.PrimaryKeyRelatedField(
        queryset=Practitioner.objects.filter(
            practitioner_status='active',
            is_verified=True
        )
    )
    location = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(),
        required=False,
        allow_null=True
    )
    room = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(),  # Room model doesn't have is_active field
        required=False,
        allow_null=True
    )
    start_datetime = serializers.DateTimeField(source='start_time')
    notes = serializers.CharField(
        source='client_notes',
        required=False,
        allow_blank=True
    )
    
    class Meta:
        model = Booking
        fields = ['service', 'practitioner', 'location', 'room', 'start_datetime', 'notes']
    
    def validate_start_datetime(self, value):
        """Ensure booking is in the future."""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Booking must be in the future")
        return value
    
    def validate(self, attrs):
        """Validate room belongs to location if both provided."""
        room = attrs.get('room')
        location = attrs.get('location')
        
        if room and location and room.location != location:
            raise serializers.ValidationError({
                'room': 'Room must belong to the selected location'
            })
        
        return attrs


class BookingUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating bookings.
    """
    start_datetime = serializers.DateTimeField(source='start_time', required=False)
    room = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(),  # Room model doesn't have is_active field
        required=False,
        allow_null=True
    )
    notes = serializers.CharField(source='client_notes', required=False, allow_blank=True)
    
    class Meta:
        model = Booking
        fields = ['start_datetime', 'room', 'notes', 'status']
    
    def validate_status(self, value):
        """Only staff can change status."""
        if not self.context['request'].user.is_staff:
            raise serializers.ValidationError("Only staff can change booking status")
        return value