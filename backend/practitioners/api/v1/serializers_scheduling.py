from rest_framework import serializers
from django.utils import timezone
from datetime import datetime, time, timedelta

from apps.practitioners.models import (
    Schedule, ScheduleTimeSlot, ServiceSchedule, 
    ScheduleAvailability, SchedulePreference
)


class ScheduleTimeSlotSerializer(serializers.ModelSerializer):
    """Serializer for schedule time slots."""
    
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ScheduleTimeSlot
        fields = ['id', 'day', 'day_name', 'start_time', 'end_time', 'is_active']
    
    def get_day_name(self, obj):
        """Return the name of the day."""
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.day]


class ScheduleSerializer(serializers.ModelSerializer):
    """Serializer for named schedules."""
    
    time_slots = ScheduleTimeSlotSerializer(many=True, read_only=True)
    
    class Meta:
        model = Schedule
        fields = ['id', 'name', 'description', 'is_default', 'timezone', 'is_active', 'time_slots']


class ServiceScheduleSerializer(serializers.ModelSerializer):
    """Serializer for service schedules."""
    
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceSchedule
        fields = ['id', 'day', 'day_name', 'start_time', 'end_time', 'is_active']
    
    def get_day_name(self, obj):
        """Return the name of the day."""
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.day]


class ScheduleAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for schedule availability."""
    
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ScheduleAvailability
        fields = ['id', 'date', 'day', 'day_name', 'start_time', 'end_time', 'is_active']
    
    def get_day_name(self, obj):
        """Return the name of the day."""
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.day]


class TimeSlotSerializer(serializers.Serializer):
    """Serializer for time slots in the availability API."""
    
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    date = serializers.DateField()
    day = serializers.IntegerField()
    day_name = serializers.CharField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    is_available = serializers.BooleanField()
    service_id = serializers.UUIDField()
    schedule_id = serializers.UUIDField(required=False, allow_null=True)
    schedule_name = serializers.CharField(required=False, allow_null=True)
