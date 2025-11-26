"""
Scheduling and Availability Views for Practitioners API
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from drf_spectacular.utils import extend_schema, extend_schema_view

from practitioners.models import (
    ServiceSchedule, ScheduleAvailability, OutOfOffice
)
from practitioners.utils.availability import AvailabilityCalculator

from .serializers_scheduling import (
    ServiceScheduleSerializer,
    ScheduleAvailabilitySerializer,
    BulkScheduleUpdateSerializer,
    AvailabilityBlockSerializer,
    AvailabilityOverrideSerializer,
    BookingAvailabilitySerializer,
    RecurringAvailabilitySerializer
)
from .permissions import IsPractitionerOwner


@extend_schema_view(
    list=extend_schema(tags=['Availability']),
    create=extend_schema(tags=['Availability']),
    retrieve=extend_schema(tags=['Availability']),
    update=extend_schema(tags=['Availability']),
    partial_update=extend_schema(tags=['Availability']),
    destroy=extend_schema(tags=['Availability']),
    bulk_update=extend_schema(tags=['Availability']),
    copy_from_default=extend_schema(tags=['Availability'])
)
class ServiceScheduleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing service-specific schedules.
    Allows practitioners to set different schedules for different services.
    """
    serializer_class = ServiceScheduleSerializer
    permission_classes = [IsAuthenticated, IsPractitionerOwner]
    
    def get_queryset(self):
        """Get service schedules for authenticated practitioner"""
        if hasattr(self.request.user, 'practitioner_profile'):
            return ServiceSchedule.objects.filter(
                practitioner=self.request.user.practitioner_profile
            ).select_related('service')
        return ServiceSchedule.objects.none()
    
    def perform_create(self, serializer):
        """Create service schedule for authenticated practitioner"""
        serializer.save(practitioner=self.request.user.practitioner_profile)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update service schedules"""
        practitioner = request.user.practitioner_profile
        service_id = request.data.get('service_id')
        schedules = request.data.get('schedules', [])
        
        if not service_id or not schedules:
            return Response(
                {"detail": "service_id and schedules are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify service belongs to practitioner
        from services.models import Service
        try:
            service = Service.objects.get(
                id=service_id,
                primary_practitioner=practitioner
            )
        except Service.DoesNotExist:
            return Response(
                {"detail": "Service not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            # Delete existing schedules for this service
            ServiceSchedule.objects.filter(
                practitioner=practitioner,
                service=service
            ).delete()
            
            # Create new schedules
            created_schedules = []
            for schedule_data in schedules:
                serializer = ServiceScheduleSerializer(data={
                    **schedule_data,
                    'practitioner': practitioner.id,
                    'service': service.id
                })
                serializer.is_valid(raise_exception=True)
                schedule = serializer.save(
                    practitioner=practitioner,
                    service=service
                )
                created_schedules.append(schedule)
        
        # Return created schedules
        serializer = ServiceScheduleSerializer(created_schedules, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdvancedAvailabilityViewSet(viewsets.ViewSet):
    """
    Advanced availability management for practitioners.
    Handles complex scheduling scenarios.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def check_slot(self, request):
        """Check if a specific time slot is available for booking"""
        serializer = BookingAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        is_available, message = serializer.check_availability()
        
        return Response({
            'available': is_available,
            'message': message,
            'requested_slot': serializer.validated_data
        })
    
    @action(detail=False, methods=['post'], permission_classes=[IsPractitionerOwner])
    def block_time(self, request):
        """Block time slots from being booked"""
        practitioner = request.user.practitioner_profile
        serializer = AvailabilityBlockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        # Create out of office entry
        out_of_office = OutOfOffice.objects.create(
            practitioner=practitioner,
            from_date=data['start_datetime'].date(),
            to_date=data['end_datetime'].date(),
            title=data.get('reason', 'Blocked time')
        )
        
        # TODO: Handle recurring blocks
        if data.get('is_recurring'):
            # Implement recurring block logic
            pass
        
        return Response({
            'message': 'Time blocked successfully',
            'blocked_period': {
                'id': out_of_office.id,
                'from': out_of_office.from_date,
                'to': out_of_office.to_date,
                'title': out_of_office.title
            }
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], permission_classes=[IsPractitionerOwner])
    def override_availability(self, request):
        """Override availability for specific dates"""
        practitioner = request.user.practitioner_profile
        serializer = AvailabilityOverrideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        date = data['date']
        time_slots = data['time_slots']
        
        # Create availability entries for the specific date
        created_slots = []
        
        with transaction.atomic():
            # Remove existing availability for this date
            ScheduleAvailability.objects.filter(
                practitioner=practitioner,
                date=date
            ).delete()
            
            # Create new availability slots
            for slot in time_slots:
                availability = ScheduleAvailability.objects.create(
                    practitioner=practitioner,
                    date=date,
                    day=date.weekday(),
                    start_time=datetime.strptime(
                        slot['start_time'], '%H:%M'
                    ).time(),
                    end_time=datetime.strptime(
                        slot['end_time'], '%H:%M'
                    ).time(),
                    service_schedule=None,  # Override is not tied to specific service
                    is_active=True
                )
                created_slots.append(availability)
        
        return Response({
            'message': 'Availability override created',
            'date': date,
            'slots': ScheduleAvailabilitySerializer(created_slots, many=True).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def calendar_view(self, request):
        """
        Get calendar view of availability and bookings.
        Returns a month view with availability status for each day.
        """
        practitioner_id = request.query_params.get('practitioner_id')
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))
        
        if not practitioner_id:
            practitioner = request.user.practitioner_profile if hasattr(
                request.user, 'practitioner_profile'
            ) else None
            if not practitioner:
                return Response(
                    {"detail": "practitioner_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            from practitioners.models import Practitioner
            try:
                practitioner = Practitioner.objects.get(id=practitioner_id)
            except Practitioner.DoesNotExist:
                return Response(
                    {"detail": "Practitioner not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Calculate calendar data
        calculator = AvailabilityCalculator(practitioner)
        calendar_data = calculator.get_calendar_view(year, month)
        
        return Response(calendar_data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsPractitionerOwner])
    def setup_recurring(self, request):
        """Set up recurring availability patterns"""
        practitioner = request.user.practitioner_profile
        serializer = RecurringAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # TODO: Implement recurring availability setup
        # This would create a pattern that automatically generates
        # availability slots based on the specified recurrence
        
        return Response({
            'message': 'Recurring availability pattern created',
            'pattern': serializer.validated_data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def next_available(self, request):
        """Get next available slots for a practitioner"""
        practitioner_id = request.query_params.get('practitioner_id')
        service_id = request.query_params.get('service_id')
        count = int(request.query_params.get('count', 5))
        
        if not practitioner_id:
            return Response(
                {"detail": "practitioner_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from practitioners.models import Practitioner
        try:
            practitioner = Practitioner.objects.get(id=practitioner_id)
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "Practitioner not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get next available slots
        calculator = AvailabilityCalculator(practitioner)
        next_slots = calculator.get_next_available_slots(
            count=count,
            service_id=service_id
        )
        
        return Response({
            'practitioner_id': practitioner_id,
            'next_available_slots': next_slots
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsPractitionerOwner])
    def utilization_report(self, request):
        """Get utilization report for practitioner's schedule"""
        practitioner = request.user.practitioner_profile
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            # Default to current month
            today = timezone.now().date()
            start_date = today.replace(day=1)
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Calculate utilization metrics
        from bookings.models import Booking
        
        # Total available hours
        calculator = AvailabilityCalculator(practitioner)
        total_available_minutes = calculator.calculate_total_available_minutes(
            start_date, end_date
        )
        
        # Total booked hours
        # Note: start_time is now on ServiceSession, query via service_session
        bookings = Booking.objects.filter(
            practitioner=practitioner,
            service_session__start_time__date__gte=start_date,
            service_session__start_time__date__lte=end_date,
            status__in=['confirmed', 'completed']
        ).select_related('service_session')

        total_booked_minutes = sum(
            (booking.get_end_time() - booking.get_start_time()).total_seconds() / 60
            for booking in bookings
            if booking.get_start_time() and booking.get_end_time()
        )

        # Calculate utilization rate
        utilization_rate = (
            (total_booked_minutes / total_available_minutes * 100)
            if total_available_minutes > 0 else 0
        )

        # Peak hours analysis
        peak_hours = {}
        for booking in bookings:
            start_time = booking.get_start_time()
            if start_time:
                hour = start_time.hour
                peak_hours[hour] = peak_hours.get(hour, 0) + 1
        
        # Sort peak hours
        sorted_peak_hours = sorted(
            peak_hours.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        return Response({
            'period': {
                'start': start_date,
                'end': end_date
            },
            'utilization_rate': round(utilization_rate, 2),
            'total_available_hours': round(total_available_minutes / 60, 2),
            'total_booked_hours': round(total_booked_minutes / 60, 2),
            'total_bookings': bookings.count(),
            'peak_hours': [
                {'hour': hour, 'bookings': count}
                for hour, count in sorted_peak_hours
            ]
        })