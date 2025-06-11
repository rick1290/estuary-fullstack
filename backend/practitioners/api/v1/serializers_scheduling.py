"""
Scheduling-specific serializers for Practitioners API
"""
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta, date, time
import pytz

from practitioners.models import (
    Schedule, ScheduleTimeSlot, ServiceSchedule,
    ScheduleAvailability, OutOfOffice, SchedulePreference
)
from bookings.models import Booking
from services.models import Service


class ServiceScheduleSerializer(serializers.ModelSerializer):
    """Serializer for service-specific schedules"""
    service_name = serializers.CharField(source='service.name', read_only=True)
    
    class Meta:
        model = ServiceSchedule
        fields = [
            'id', 'service', 'service_name', 'day',
            'start_time', 'end_time', 'is_active'
        ]
        read_only_fields = ['id']
    
    def validate(self, attrs):
        if attrs.get('end_time') and attrs.get('start_time'):
            if attrs['end_time'] <= attrs['start_time']:
                raise serializers.ValidationError("End time must be after start time")
        return attrs


class ScheduleAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for specific availability slots"""
    service_name = serializers.CharField(
        source='service_schedule.service.name',
        read_only=True
    )
    
    class Meta:
        model = ScheduleAvailability
        fields = [
            'id', 'date', 'day', 'start_time', 'end_time',
            'service_schedule', 'service_name', 'is_active'
        ]
        read_only_fields = ['id', 'day']
    
    def validate(self, attrs):
        # Validate time range
        if attrs.get('end_time') and attrs.get('start_time'):
            if attrs['end_time'] <= attrs['start_time']:
                raise serializers.ValidationError("End time must be after start time")
        
        # Set day based on date
        if attrs.get('date'):
            attrs['day'] = attrs['date'].weekday()
        
        return attrs


class BulkScheduleUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating schedule time slots"""
    schedule_id = serializers.IntegerField()
    time_slots = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False
    )
    
    def validate_time_slots(self, value):
        """Validate each time slot"""
        for slot in value:
            if 'day' not in slot:
                raise serializers.ValidationError("Each slot must have a 'day' field")
            if 'start_time' not in slot or 'end_time' not in slot:
                raise serializers.ValidationError(
                    "Each slot must have 'start_time' and 'end_time' fields"
                )
            
            # Parse times
            try:
                start = datetime.strptime(slot['start_time'], '%H:%M').time()
                end = datetime.strptime(slot['end_time'], '%H:%M').time()
            except ValueError:
                raise serializers.ValidationError(
                    "Time must be in HH:MM format"
                )
            
            if end <= start:
                raise serializers.ValidationError(
                    "End time must be after start time"
                )
            
            # Check day is valid
            if not 0 <= slot['day'] <= 6:
                raise serializers.ValidationError(
                    "Day must be between 0 (Monday) and 6 (Sunday)"
                )
        
        return value
    
    def update_schedule(self, practitioner):
        """Update schedule with new time slots"""
        schedule_id = self.validated_data['schedule_id']
        time_slots_data = self.validated_data['time_slots']
        
        try:
            schedule = Schedule.objects.get(
                id=schedule_id,
                practitioner=practitioner
            )
        except Schedule.DoesNotExist:
            raise serializers.ValidationError("Schedule not found")
        
        with transaction.atomic():
            # Delete existing time slots
            schedule.time_slots.all().delete()
            
            # Create new time slots
            for slot_data in time_slots_data:
                ScheduleTimeSlot.objects.create(
                    schedule=schedule,
                    day=slot_data['day'],
                    start_time=datetime.strptime(
                        slot_data['start_time'], '%H:%M'
                    ).time(),
                    end_time=datetime.strptime(
                        slot_data['end_time'], '%H:%M'
                    ).time(),
                    is_active=slot_data.get('is_active', True)
                )
        
        return schedule


class AvailabilityBlockSerializer(serializers.Serializer):
    """Serializer for blocking availability"""
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    reason = serializers.CharField(max_length=255, required=False)
    is_recurring = serializers.BooleanField(default=False)
    recurrence_pattern = serializers.ChoiceField(
        choices=['daily', 'weekly', 'monthly'],
        required=False
    )
    recurrence_end_date = serializers.DateField(required=False)
    
    def validate(self, attrs):
        # Validate datetime range
        if attrs['end_datetime'] <= attrs['start_datetime']:
            raise serializers.ValidationError(
                "End datetime must be after start datetime"
            )
        
        # Validate recurrence
        if attrs.get('is_recurring'):
            if not attrs.get('recurrence_pattern'):
                raise serializers.ValidationError(
                    "Recurrence pattern is required for recurring blocks"
                )
            if not attrs.get('recurrence_end_date'):
                raise serializers.ValidationError(
                    "Recurrence end date is required for recurring blocks"
                )
        
        return attrs


class AvailabilityOverrideSerializer(serializers.Serializer):
    """Serializer for one-time availability overrides"""
    date = serializers.DateField()
    time_slots = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False
    )
    
    def validate_time_slots(self, value):
        """Validate time slot format"""
        for slot in value:
            if 'start_time' not in slot or 'end_time' not in slot:
                raise serializers.ValidationError(
                    "Each slot must have 'start_time' and 'end_time'"
                )
            
            # Validate time format
            try:
                start = datetime.strptime(slot['start_time'], '%H:%M').time()
                end = datetime.strptime(slot['end_time'], '%H:%M').time()
            except ValueError:
                raise serializers.ValidationError(
                    "Time must be in HH:MM format"
                )
            
            if end <= start:
                raise serializers.ValidationError(
                    "End time must be after start time"
                )
        
        return value


class BookingAvailabilitySerializer(serializers.Serializer):
    """Serializer for checking booking availability"""
    practitioner_id = serializers.IntegerField()
    service_id = serializers.IntegerField()
    date = serializers.DateField()
    start_time = serializers.TimeField()
    duration_minutes = serializers.IntegerField(min_value=15)
    timezone = serializers.CharField(default='UTC')
    
    def validate(self, attrs):
        # Validate timezone
        try:
            pytz.timezone(attrs['timezone'])
        except pytz.exceptions.UnknownTimeZoneError:
            raise serializers.ValidationError("Invalid timezone")
        
        # Validate date is not in the past
        if attrs['date'] < date.today():
            raise serializers.ValidationError("Cannot check availability for past dates")
        
        return attrs
    
    def check_availability(self):
        """Check if the requested slot is available"""
        data = self.validated_data
        
        # Get practitioner and service
        from practitioners.models import Practitioner
        
        try:
            practitioner = Practitioner.objects.get(
                id=data['practitioner_id'],
                is_verified=True,
                practitioner_status='active'
            )
        except Practitioner.DoesNotExist:
            return False, "Practitioner not found or not available"
        
        try:
            service = Service.objects.get(
                id=data['service_id'],
                primary_practitioner=practitioner,
                is_active=True
            )
        except Service.DoesNotExist:
            return False, "Service not found or not available"
        
        # Check if slot is within schedule
        # TODO: Implement comprehensive availability checking
        
        # Check for conflicts with existing bookings
        tz = pytz.timezone(data['timezone'])
        start_datetime = tz.localize(
            datetime.combine(data['date'], data['start_time'])
        )
        end_datetime = start_datetime + timedelta(minutes=data['duration_minutes'])
        
        # Add buffer time
        buffer_time = practitioner.buffer_time or 15
        buffer_start = start_datetime - timedelta(minutes=buffer_time)
        buffer_end = end_datetime + timedelta(minutes=buffer_time)
        
        # Check for conflicts
        conflicts = Booking.objects.filter(
            practitioner=practitioner,
            status__in=['pending', 'confirmed', 'in_progress'],
            start_time__lt=buffer_end,
            end_time__gt=buffer_start
        ).exists()
        
        if conflicts:
            return False, "Time slot is not available"
        
        # Check out of office
        out_of_office = OutOfOffice.objects.filter(
            practitioner=practitioner,
            from_date__lte=data['date'],
            to_date__gte=data['date'],
            is_archived=False
        ).exists()
        
        if out_of_office:
            return False, "Practitioner is out of office on this date"
        
        return True, "Slot is available"


class RecurringAvailabilitySerializer(serializers.Serializer):
    """Serializer for setting up recurring availability patterns"""
    schedule_id = serializers.IntegerField()
    pattern_type = serializers.ChoiceField(
        choices=['weekly', 'biweekly', 'monthly']
    )
    days_of_week = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        required=False
    )
    days_of_month = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=31),
        required=False
    )
    time_slots = serializers.ListField(
        child=serializers.DictField()
    )
    effective_date = serializers.DateField()
    end_date = serializers.DateField(required=False)
    
    def validate(self, attrs):
        pattern = attrs['pattern_type']
        
        if pattern in ['weekly', 'biweekly'] and not attrs.get('days_of_week'):
            raise serializers.ValidationError(
                "days_of_week is required for weekly patterns"
            )
        
        if pattern == 'monthly' and not attrs.get('days_of_month'):
            raise serializers.ValidationError(
                "days_of_month is required for monthly patterns"
            )
        
        # Validate time slots
        for slot in attrs['time_slots']:
            if 'start_time' not in slot or 'end_time' not in slot:
                raise serializers.ValidationError(
                    "Each time slot must have start_time and end_time"
                )
        
        return attrs