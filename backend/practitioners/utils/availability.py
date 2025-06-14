"""
Utility functions for calculating practitioner availability.
"""
import pytz
import json
from datetime import datetime, time, timedelta, date
from typing import List, Dict, Any, Optional, Tuple
from django.utils import timezone
from django.db.models import Q

from practitioners.models import (
    Practitioner, Schedule, ScheduleTimeSlot, 
    ServiceSchedule, ScheduleAvailability, SchedulePreference
)
from services.models import Service
from bookings.models import Booking


def get_practitioner_availability(
    service_id: str, 
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    days_ahead: int = 30
) -> List[Dict[str, Any]]:
    """
    Calculate availability time slots for a practitioner based on a service.
    
    Args:
        service_id: The ID of the service to check availability for
        start_date: The start date to check availability from (defaults to today)
        end_date: The end date to check availability until (defaults to start_date + days_ahead)
        days_ahead: Number of days ahead to check availability (default 30)
        
    Returns:
        List of available time slots
    """
    try:
        # Get the service and associated practitioner
        service = Service.objects.get(id=service_id)
        
        # Get the primary practitioner for this service using the M2M relationship
        practitioner_relationship = service.practitioner_relationships.filter(is_primary=True).first()
        
        # If no primary practitioner is set, get the first practitioner
        if not practitioner_relationship:
            practitioner_relationship = service.practitioner_relationships.first()
            
        if not practitioner_relationship:
            raise ValueError(f"No practitioners associated with service {service_id}")
            
        practitioner = practitioner_relationship.practitioner
        
        # Set default dates if not provided
        if not start_date:
            start_date = timezone.now().date()
        
        if not end_date:
            end_date = start_date + timedelta(days=days_ahead)
            
        # Get practitioner's schedule preference
        try:
            preference = SchedulePreference.objects.get(practitioner=practitioner)
            
            # Handle timezone (with fallback)
            practitioner_timezone = pytz.UTC
            if hasattr(preference, 'timezone') and preference.timezone:
                try:
                    practitioner_timezone = pytz.timezone(preference.timezone)
                except pytz.exceptions.UnknownTimeZoneError:
                    pass
            
            # Get buffer settings with defaults
            buffer_hours = getattr(preference, 'hours_buffer', 0) or 0
            min_days_buffer = getattr(preference, 'days_buffer_min', 0) or 0
            max_days_buffer = getattr(preference, 'days_buffer_max', 30) or 30
            holidays_on = getattr(preference, 'holidays_on', False) or False
            
            # Check if holidays attribute exists and is not empty
            holidays = []
            if holidays_on and hasattr(preference, 'holidays') and preference.holidays:
                # Handle different ways holidays might be stored
                if isinstance(preference.holidays, list):
                    holidays = preference.holidays
                elif hasattr(preference, 'get_holidays') and callable(getattr(preference, 'get_holidays')):
                    holidays = preference.get_holidays()
                elif isinstance(preference.holidays, str):
                    try:
                        # Try to parse JSON string
                        holidays = json.loads(preference.holidays)
                    except (json.JSONDecodeError, TypeError):
                        holidays = []
        except SchedulePreference.DoesNotExist:
            practitioner_timezone = pytz.UTC
            buffer_hours = 0
            min_days_buffer = 0
            max_days_buffer = 30
            holidays = []
        
        # Apply minimum days buffer
        buffer_start_date = timezone.now().date() + timedelta(days=min_days_buffer)
        if start_date < buffer_start_date:
            start_date = buffer_start_date
            
        # Apply maximum days buffer
        buffer_end_date = timezone.now().date() + timedelta(days=max_days_buffer)
        if end_date > buffer_end_date:
            end_date = buffer_end_date
            
        # Get service duration in minutes (with fallback)
        service_duration = getattr(service, 'duration', 60) or 60
        
        # Get practitioner's buffer time in minutes (with fallback)
        buffer_time = getattr(practitioner, 'buffer_time', 0) or 0
        
        # Calculate total appointment duration including buffer
        total_duration = service_duration + buffer_time
        
        # Get all available time slots
        available_slots = []
        
        # First, check for named schedules
        named_schedules = Schedule.objects.filter(
            practitioner=practitioner,
            is_active=True
        ).prefetch_related('time_slots')
        
        # If no named schedules, fall back to service schedules
        if not named_schedules.exists():
            # Get service schedules for this service
            service_schedules = ServiceSchedule.objects.filter(
                practitioner=practitioner,
                service=service,
                is_active=True
            )
            
            # Get schedule availability for the date range
            schedule_availability = ScheduleAvailability.objects.filter(
                practitioner=practitioner,
                service_schedule__service=service,
                date__gte=start_date,
                date__lte=end_date,
                is_active=True
            )
            
            # Process service schedules
            for current_date in date_range(start_date, end_date):
                # Skip holidays
                if current_date.isoformat() in holidays:
                    continue
                
                # Get day of week (0=Monday, 6=Sunday)
                weekday = current_date.weekday()
                
                # Get availability for this date
                date_availability = schedule_availability.filter(date=current_date)
                
                if date_availability.exists():
                    # Use specific availability for this date
                    for avail in date_availability:
                        slots = generate_time_slots(
                            current_date, 
                            avail.start_time, 
                            avail.end_time, 
                            total_duration, 
                            service_id,
                            practitioner_timezone
                        )
                        available_slots.extend(slots)
                else:
                    # Use regular service schedule for this day
                    day_schedules = service_schedules.filter(day=weekday)
                    
                    for schedule in day_schedules:
                        slots = generate_time_slots(
                            current_date, 
                            schedule.start_time, 
                            schedule.end_time, 
                            total_duration, 
                            service_id,
                            practitioner_timezone
                        )
                        available_slots.extend(slots)
        else:
            # Process named schedules
            for schedule in named_schedules:
                # Handle timezone (with fallback)
                schedule_timezone = pytz.UTC
                if hasattr(schedule, 'timezone') and schedule.timezone:
                    try:
                        schedule_timezone = pytz.timezone(schedule.timezone)
                    except pytz.exceptions.UnknownTimeZoneError:
                        schedule_timezone = practitioner_timezone
                
                for current_date in date_range(start_date, end_date):
                    # Skip holidays
                    if current_date.isoformat() in holidays:
                        continue
                    
                    # Get day of week (0=Monday, 6=Sunday)
                    weekday = current_date.weekday()
                    
                    # Get time slots for this day
                    day_slots = schedule.time_slots.filter(day=weekday, is_active=True)
                    
                    for slot in day_slots:
                        slots = generate_time_slots(
                            current_date, 
                            slot.start_time, 
                            slot.end_time, 
                            total_duration, 
                            service_id,
                            schedule_timezone,
                            schedule.id,
                            schedule.name
                        )
                        available_slots.extend(slots)
        
        # Filter out slots that overlap with existing bookings
        filtered_slots = filter_booked_slots(available_slots, practitioner, service_duration)
        
        # Apply hours buffer (don't show slots within buffer_hours from now)
        if buffer_hours > 0:
            buffer_datetime = timezone.now() + timedelta(hours=buffer_hours)
            filtered_slots = [
                slot for slot in filtered_slots 
                if slot['start_datetime'] > buffer_datetime
            ]
        
        # Sort by start time
        filtered_slots.sort(key=lambda x: x['start_datetime'])
        
        return filtered_slots
    
    except Service.DoesNotExist:
        return []
    except Exception as e:
        print(f"Error calculating availability: {str(e)}")
        return []


def generate_time_slots(
    date_obj: date,
    start_time: time,
    end_time: time,
    duration_minutes: int,
    service_id: str,
    tz: pytz.timezone = pytz.UTC,
    schedule_id: Optional[str] = None,
    schedule_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Generate time slots for a given date and time range.
    
    Args:
        date_obj: The date to generate slots for
        start_time: The start time of the availability window
        end_time: The end time of the availability window
        duration_minutes: The duration of each slot in minutes
        service_id: The ID of the service
        tz: The timezone to use
        schedule_id: Optional ID of the named schedule
        schedule_name: Optional name of the named schedule
        
    Returns:
        List of time slot dictionaries
    """
    slots = []
    
    # Validate inputs
    if not date_obj or not start_time or not end_time:
        print(f"Invalid inputs: date={date_obj}, start_time={start_time}, end_time={end_time}")
        return slots
    
    # Convert times to datetime objects
    try:
        start_datetime = datetime.combine(date_obj, start_time)
        end_datetime = datetime.combine(date_obj, end_time)
        
        # Localize datetimes to the specified timezone
        start_datetime = tz.localize(start_datetime)
        end_datetime = tz.localize(end_datetime)
        
        # Convert to UTC for storage
        start_datetime_utc = start_datetime.astimezone(pytz.UTC)
        end_datetime_utc = end_datetime.astimezone(pytz.UTC)
        
        # Generate slots at 15-minute intervals
        slot_interval = 15  # minutes
        current_time = start_datetime_utc
        
        while current_time + timedelta(minutes=duration_minutes) <= end_datetime_utc:
            slot_end = current_time + timedelta(minutes=duration_minutes)
            
            # Create slot dictionary
            slot = {
                'start_datetime': current_time,
                'end_datetime': slot_end,
                'date': current_time.date(),
                'day': current_time.weekday(),
                'day_name': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][current_time.weekday()],
                'start_time': current_time.time(),
                'end_time': slot_end.time(),
                'is_available': True,
                'service_id': service_id,
                'schedule_id': schedule_id,
                'schedule_name': schedule_name
            }
            
            slots.append(slot)
            
            # Move to next slot
            current_time += timedelta(minutes=slot_interval)
    except Exception as e:
        print(f"Error generating time slots: {str(e)}")
    
    return slots


def filter_booked_slots(
    slots: List[Dict[str, Any]],
    practitioner: Practitioner,
    duration_minutes: int
) -> List[Dict[str, Any]]:
    """
    Filter out slots that overlap with existing bookings.
    
    Args:
        slots: List of time slot dictionaries
        practitioner: The practitioner
        duration_minutes: The duration of the service in minutes
        
    Returns:
        Filtered list of time slot dictionaries
    """
    # Get all bookings for this practitioner
    try:
        from apps.bookings.models import Booking
        
        # Get bookings that overlap with the date range of the slots
        if not slots:
            return []
        
        # Get date range from slots
        start_date = min(slot['date'] for slot in slots)
        end_date = max(slot['date'] for slot in slots)
        
        # Get bookings for this practitioner in this date range
        bookings = Booking.objects.filter(
            practitioner=practitioner,
            start_time__date__gte=start_date,
            start_time__date__lte=end_date,
            status__in=['confirmed', 'pending']
        )
        
        # Create booking time ranges (with buffer)
        booking_ranges = []
        for booking in bookings:
            # Add buffer time before and after booking
            buffer_minutes = getattr(booking, 'buffer_time', 0) or 0
            buffer_before = timedelta(minutes=buffer_minutes)
            buffer_after = timedelta(minutes=buffer_minutes)
            
            # Get booking start and end times
            booking_start = booking.start_time
            if booking_start is None:
                continue
                
            # Calculate booking end time
            booking_end = getattr(booking, 'end_time', None)
            if booking_end is None:
                # Try to get duration from booking or service
                booking_duration = getattr(booking, 'duration', None)
                if booking_duration is None:
                    # Try to get duration from booking.service
                    if hasattr(booking, 'service') and booking.service:
                        booking_duration = getattr(booking.service, 'duration', 60)
                    else:
                        booking_duration = 60  # Default to 1 hour
                
                booking_end = booking_start + timedelta(minutes=booking_duration)
            
            # Apply buffer
            booking_start_with_buffer = booking_start - buffer_before
            booking_end_with_buffer = booking_end + buffer_after
            
            booking_ranges.append((booking_start_with_buffer, booking_end_with_buffer))
        
        # Filter out slots that overlap with bookings
        filtered_slots = []
        for slot in slots:
            slot_start = slot['start_datetime']
            slot_end = slot['end_datetime']
            
            overlaps = False
            for booking_start, booking_end in booking_ranges:
                # Check for overlap
                if (slot_start < booking_end and slot_end > booking_start):
                    overlaps = True
                    break
            
            if not overlaps:
                filtered_slots.append(slot)
        
        return filtered_slots
    except Exception as e:
        print(f"Error filtering booked slots: {str(e)}")
        import traceback
        traceback.print_exc()
        return slots  # Return original slots if there's an error


def date_range(start_date: date, end_date: date) -> List[date]:
    """
    Generate a range of dates from start_date to end_date (inclusive).
    
    Args:
        start_date: The start date
        end_date: The end date
        
    Returns:
        List of dates
    """
    delta = (end_date - start_date).days + 1
    return [start_date + timedelta(days=i) for i in range(delta)]
