from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.utils import timezone
from datetime import datetime, timedelta
import pytz

from apps.practitioners.models import (
    Schedule, ScheduleTimeSlot, ServiceSchedule, 
    ScheduleAvailability, SchedulePreference
)
from apps.services.models import Service
from apps.practitioners.utils.availability import get_practitioner_availability
from .serializers_scheduling import (
    ScheduleSerializer, ScheduleTimeSlotSerializer,
    ServiceScheduleSerializer, ScheduleAvailabilitySerializer,
    TimeSlotSerializer
)


class ScheduleViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing named schedules.
    
    list:
    Return a list of all schedules for the current practitioner.
    
    retrieve:
    Return the given schedule.
    
    create:
    Create a new schedule (requires practitioner privileges).
    
    update:
    Update a schedule (requires practitioner privileges).
    
    partial_update:
    Partially update a schedule (requires practitioner privileges).
    
    destroy:
    Delete a schedule (requires practitioner privileges).
    """
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter schedules to only show those belonging to the current practitioner.
        """
        if not hasattr(self.request.user, 'practitioner_profile'):
            return Schedule.objects.none()
        
        return Schedule.objects.filter(
            practitioner=self.request.user.practitioner_profile
        ).prefetch_related('time_slots')
    
    def perform_create(self, serializer):
        """
        Set the practitioner to the current user's practitioner profile.
        """
        # If this is the first schedule, make it the default
        is_default = not Schedule.objects.filter(
            practitioner=self.request.user.practitioner_profile
        ).exists()
        
        serializer.save(
            practitioner=self.request.user.practitioner_profile,
            is_default=is_default
        )


class ScheduleTimeSlotViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing schedule time slots.
    
    list:
    Return a list of all time slots for a schedule.
    
    retrieve:
    Return the given time slot.
    
    create:
    Create a new time slot (requires practitioner privileges).
    
    update:
    Update a time slot (requires practitioner privileges).
    
    partial_update:
    Partially update a time slot (requires practitioner privileges).
    
    destroy:
    Delete a time slot (requires practitioner privileges).
    """
    serializer_class = ScheduleTimeSlotSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter time slots to only show those belonging to the current practitioner's schedules.
        """
        if not hasattr(self.request.user, 'practitioner_profile'):
            return ScheduleTimeSlot.objects.none()
        
        return ScheduleTimeSlot.objects.filter(
            schedule__practitioner=self.request.user.practitioner_profile
        )
    
    def perform_create(self, serializer):
        """
        Validate that the schedule belongs to the current practitioner.
        """
        schedule_id = self.request.data.get('schedule')
        try:
            schedule = Schedule.objects.get(
                id=schedule_id,
                practitioner=self.request.user.practitioner_profile
            )
            serializer.save(schedule=schedule)
        except Schedule.DoesNotExist:
            return Response(
                {"error": "Schedule not found or does not belong to you."},
                status=status.HTTP_400_BAD_REQUEST
            )


class AvailabilityViewSet(viewsets.ViewSet):
    """
    API endpoint for retrieving practitioner availability.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='service_id', description='ID of the service to check availability for', required=True, type=str),
            OpenApiParameter(name='start_date', description='Start date (YYYY-MM-DD) to check availability from', required=False, type=str),
            OpenApiParameter(name='end_date', description='End date (YYYY-MM-DD) to check availability until', required=False, type=str),
            OpenApiParameter(name='days_ahead', description='Number of days ahead to check availability', required=False, type=int),
        ],
        responses={200: TimeSlotSerializer(many=True)},
        description='Returns available time slots for a service'
    )
    @action(detail=False, methods=['get'])
    def service_availability(self, request):
        """
        Return available time slots for a service.
        """
        service_id = request.query_params.get('service_id')
        if not service_id:
            return Response(
                {"error": "service_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse date parameters
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        days_ahead_str = request.query_params.get('days_ahead', '30')
        
        try:
            days_ahead = int(days_ahead_str)
        except ValueError:
            days_ahead = 30
        
        start_date = None
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid start_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        end_date = None
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid end_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get available time slots
        available_slots = get_practitioner_availability(
            service_id=service_id,
            start_date=start_date,
            end_date=end_date,
            days_ahead=days_ahead
        )
        
        # Serialize and return the data
        serializer = TimeSlotSerializer(available_slots, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='practitioner_id', description='ID of the practitioner to check availability for', required=True, type=str),
            OpenApiParameter(name='start_date', description='Start date (YYYY-MM-DD) to check availability from', required=False, type=str),
            OpenApiParameter(name='end_date', description='End date (YYYY-MM-DD) to check availability until', required=False, type=str),
            OpenApiParameter(name='days_ahead', description='Number of days ahead to check availability', required=False, type=int),
        ],
        responses={200: ScheduleSerializer(many=True)},
        description='Returns schedules for a practitioner'
    )
    @action(detail=False, methods=['get'])
    def practitioner_schedules(self, request):
        """
        Return schedules for a practitioner.
        """
        practitioner_id = request.query_params.get('practitioner_id')
        if not practitioner_id:
            return Response(
                {"error": "practitioner_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get schedules for this practitioner
        schedules = Schedule.objects.filter(
            practitioner_id=practitioner_id,
            is_active=True
        ).prefetch_related('time_slots')
        
        # Serialize and return the data
        serializer = ScheduleSerializer(schedules, many=True)
        return Response(serializer.data)
