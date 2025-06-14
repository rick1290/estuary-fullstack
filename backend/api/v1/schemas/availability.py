"""
Availability management schemas for practitioners.
"""
from datetime import date, time, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from decimal import Decimal
import pytz

from .base import BaseResponse


# Enums and Constants
from enum import Enum


class DayOfWeek(str, Enum):
    """Day of week enumeration."""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class AvailabilityStatus(str, Enum):
    """Availability status enumeration."""
    AVAILABLE = "available"
    BUSY = "busy"
    BLOCKED = "blocked"
    VACATION = "vacation"
    HOLIDAY = "holiday"


class ExceptionType(str, Enum):
    """Exception type enumeration."""
    VACATION = "vacation"
    HOLIDAY = "holiday"
    PERSONAL = "personal"
    TRAINING = "training"
    OTHER = "other"


# Request Schemas
class TimeSlotCreate(BaseModel):
    """Schema for creating a time slot."""
    day: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    start_time: time = Field(..., description="Start time of availability")
    end_time: time = Field(..., description="End time of availability")
    is_active: bool = Field(default=True, description="Whether this time slot is active")

    @validator('end_time')
    def validate_end_time(cls, v, values):
        """Ensure end time is after start time."""
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('End time must be after start time')
        return v


class TimeSlotUpdate(BaseModel):
    """Schema for updating a time slot."""
    day: Optional[int] = Field(None, ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    start_time: Optional[time] = Field(None, description="Start time of availability")
    end_time: Optional[time] = Field(None, description="End time of availability")
    is_active: Optional[bool] = Field(None, description="Whether this time slot is active")


class ScheduleCreate(BaseModel):
    """Schema for creating a recurring schedule."""
    name: str = Field(..., max_length=100, description="Name of this schedule")
    description: Optional[str] = Field(None, description="Description of this schedule")
    timezone: str = Field(default="UTC", description="Timezone for this schedule")
    is_default: bool = Field(default=False, description="Whether this is the default schedule")
    is_active: bool = Field(default=True, description="Whether this schedule is active")
    time_slots: List[TimeSlotCreate] = Field(default=[], description="Time slots for this schedule")

    @validator('timezone')
    def validate_timezone(cls, v):
        """Validate timezone string."""
        if v not in pytz.all_timezones:
            raise ValueError(f'Invalid timezone: {v}')
        return v


class ScheduleUpdate(BaseModel):
    """Schema for updating a schedule."""
    name: Optional[str] = Field(None, max_length=100, description="Name of this schedule")
    description: Optional[str] = Field(None, description="Description of this schedule")
    timezone: Optional[str] = Field(None, description="Timezone for this schedule")
    is_default: Optional[bool] = Field(None, description="Whether this is the default schedule")
    is_active: Optional[bool] = Field(None, description="Whether this schedule is active")


class BulkScheduleCreate(BaseModel):
    """Schema for bulk creating/updating schedules."""
    schedules: List[ScheduleCreate] = Field(..., description="List of schedules to create")
    replace_existing: bool = Field(default=False, description="Whether to replace all existing schedules")


class AvailabilityExceptionCreate(BaseModel):
    """Schema for creating availability exceptions."""
    exception_type: ExceptionType = Field(..., description="Type of exception")
    start_date: date = Field(..., description="Start date of exception")
    end_date: date = Field(..., description="End date of exception")
    start_time: Optional[time] = Field(None, description="Start time (for partial day exceptions)")
    end_time: Optional[time] = Field(None, description="End time (for partial day exceptions)")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for exception")
    is_recurring: bool = Field(default=False, description="Whether this exception recurs annually")
    affects_all_services: bool = Field(default=True, description="Whether this affects all services")
    affected_service_ids: Optional[List[str]] = Field(None, description="Specific services affected")

    @validator('end_date')
    def validate_end_date(cls, v, values):
        """Ensure end date is not before start date."""
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date cannot be before start date')
        return v


class AvailabilityCheckRequest(BaseModel):
    """Schema for checking availability."""
    service_id: str = Field(..., description="Service ID to check availability for")
    start_datetime: datetime = Field(..., description="Start datetime to check")
    end_datetime: Optional[datetime] = Field(None, description="End datetime (calculated from service duration if not provided)")
    timezone: Optional[str] = Field("UTC", description="Timezone for the request")

    @validator('timezone')
    def validate_timezone(cls, v):
        """Validate timezone string."""
        if v and v not in pytz.all_timezones:
            raise ValueError(f'Invalid timezone: {v}')
        return v


class WorkingHoursCreate(BaseModel):
    """Schema for setting default working hours."""
    timezone: str = Field(..., description="Timezone for working hours")
    monday: Optional[Dict[str, time]] = Field(None, description="Monday working hours")
    tuesday: Optional[Dict[str, time]] = Field(None, description="Tuesday working hours")
    wednesday: Optional[Dict[str, time]] = Field(None, description="Wednesday working hours")
    thursday: Optional[Dict[str, time]] = Field(None, description="Thursday working hours")
    friday: Optional[Dict[str, time]] = Field(None, description="Friday working hours")
    saturday: Optional[Dict[str, time]] = Field(None, description="Saturday working hours")
    sunday: Optional[Dict[str, time]] = Field(None, description="Sunday working hours")
    buffer_time_minutes: int = Field(default=15, ge=0, description="Buffer time between appointments")
    advance_booking_hours: int = Field(default=24, ge=0, description="Minimum hours before booking")
    advance_booking_days: int = Field(default=30, ge=1, description="Maximum days for advance booking")

    @validator('timezone')
    def validate_timezone(cls, v):
        """Validate timezone string."""
        if v not in pytz.all_timezones:
            raise ValueError(f'Invalid timezone: {v}')
        return v

    @validator('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    def validate_working_hours(cls, v):
        """Validate working hours format."""
        if v is not None:
            if 'start' not in v or 'end' not in v:
                raise ValueError('Working hours must have start and end times')
            if v['end'] <= v['start']:
                raise ValueError('End time must be after start time')
        return v


class TimeSlotQuery(BaseModel):
    """Schema for querying available time slots."""
    service_id: str = Field(..., description="Service ID to get slots for")
    start_date: Optional[date] = Field(None, description="Start date for availability")
    end_date: Optional[date] = Field(None, description="End date for availability")
    days_ahead: int = Field(default=30, ge=1, le=365, description="Number of days ahead to check")
    timezone: Optional[str] = Field("UTC", description="Timezone for the response")
    include_buffer: bool = Field(default=True, description="Include buffer time in calculations")
    group_by_date: bool = Field(default=False, description="Group results by date")

    @validator('timezone')
    def validate_timezone(cls, v):
        """Validate timezone string."""
        if v and v not in pytz.all_timezones:
            raise ValueError(f'Invalid timezone: {v}')
        return v


# Response Schemas
class TimeSlotResponse(BaseModel):
    """Schema for time slot response."""
    id: str
    day: int
    day_name: str
    start_time: time
    end_time: time
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ScheduleResponse(BaseModel):
    """Schema for schedule response."""
    id: str
    name: str
    description: Optional[str]
    timezone: str
    is_default: bool
    is_active: bool
    time_slots: List[TimeSlotResponse]
    created_at: datetime
    updated_at: datetime


class ScheduleListResponse(BaseResponse):
    """Schema for schedule list response."""
    schedules: List[ScheduleResponse]
    total: int


class AvailabilityExceptionResponse(BaseModel):
    """Schema for availability exception response."""
    id: str
    exception_type: ExceptionType
    start_date: date
    end_date: date
    start_time: Optional[time]
    end_time: Optional[time]
    reason: Optional[str]
    is_recurring: bool
    affects_all_services: bool
    affected_service_ids: Optional[List[str]]
    created_at: datetime
    updated_at: datetime


class AvailabilityExceptionListResponse(BaseResponse):
    """Schema for availability exception list response."""
    exceptions: List[AvailabilityExceptionResponse]
    total: int


class AvailableSlot(BaseModel):
    """Schema for an available time slot."""
    start_datetime: datetime
    end_datetime: datetime
    date: date
    day: int
    day_name: str
    start_time: time
    end_time: time
    is_available: bool
    service_id: str
    schedule_id: Optional[str]
    schedule_name: Optional[str]
    timezone: str


class AvailableSlotsResponse(BaseResponse):
    """Schema for available slots response."""
    slots: List[AvailableSlot]
    total: int
    timezone: str
    start_date: date
    end_date: date


class AvailableSlotsByDate(BaseModel):
    """Schema for available slots grouped by date."""
    date: date
    day_name: str
    slots: List[AvailableSlot]
    total_slots: int


class AvailableSlotsGroupedResponse(BaseResponse):
    """Schema for available slots grouped by date response."""
    dates: List[AvailableSlotsByDate]
    total_dates: int
    total_slots: int
    timezone: str
    start_date: date
    end_date: date


class AvailabilityCheckResponse(BaseResponse):
    """Schema for availability check response."""
    is_available: bool
    reason: Optional[str] = None
    conflicts: Optional[List[Dict[str, Any]]] = None
    suggested_times: Optional[List[AvailableSlot]] = None


class WorkingHoursResponse(BaseModel):
    """Schema for working hours response."""
    timezone: str
    monday: Optional[Dict[str, time]]
    tuesday: Optional[Dict[str, time]]
    wednesday: Optional[Dict[str, time]]
    thursday: Optional[Dict[str, time]]
    friday: Optional[Dict[str, time]]
    saturday: Optional[Dict[str, time]]
    sunday: Optional[Dict[str, time]]
    buffer_time_minutes: int
    advance_booking_hours: int
    advance_booking_days: int
    created_at: datetime
    updated_at: datetime


class BulkScheduleResponse(BaseResponse):
    """Schema for bulk schedule operation response."""
    created: List[ScheduleResponse]
    updated: List[ScheduleResponse]
    deleted: List[str]
    errors: Optional[List[Dict[str, str]]] = None