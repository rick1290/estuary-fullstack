"""
Booking schemas
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Literal
from decimal import Decimal
from datetime import datetime, date, time
from api.v1.schemas.base import BaseORM, TimestampMixin, IDMixin


class BookingBase(BaseModel):
    """Base booking schema"""
    service_id: int
    practitioner_id: int
    location_id: int
    room_id: Optional[int] = None
    start_datetime: datetime
    end_datetime: datetime
    price: Decimal = Field(..., decimal_places=2, ge=0)
    notes: Optional[str] = None
    
    @field_validator('end_datetime')
    def validate_end_after_start(cls, v, info):
        if 'start_datetime' in info.data and v <= info.data['start_datetime']:
            raise ValueError('end_datetime must be after start_datetime')
        return v


class BookingCreate(BaseModel):
    """Booking creation schema"""
    service_id: int
    practitioner_id: int
    location_id: int
    room_id: Optional[int] = None
    start_datetime: datetime
    notes: Optional[str] = None
    # Price calculated from service
    # End datetime calculated from service duration


class BookingUpdate(BaseModel):
    """Booking update schema"""
    start_datetime: Optional[datetime] = None
    room_id: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[Literal["pending", "confirmed", "cancelled", "completed", "no_show"]] = None


class BookingCancel(BaseModel):
    """Booking cancellation schema"""
    reason: Optional[str] = None
    cancelled_by: Literal["customer", "practitioner", "admin", "system"]


class BookingResponse(BookingBase, BaseORM, IDMixin, TimestampMixin):
    """Booking response schema"""
    customer_id: int
    customer_email: str
    customer_name: str
    service_name: str
    practitioner_name: str
    location_name: str
    room_name: Optional[str] = None
    status: str
    payment_status: str
    confirmation_code: str
    cancelled_at: Optional[datetime] = None
    cancelled_by: Optional[str] = None
    cancellation_reason: Optional[str] = None
    
    # Computed fields
    is_past: bool = False
    is_cancellable: bool = True
    can_reschedule: bool = True


class BookingListResponse(BaseModel):
    """Booking list response"""
    results: List[BookingResponse]
    count: int
    page: int
    page_size: int
    total_pages: int


class BookingAvailabilityQuery(BaseModel):
    """Query for booking availability"""
    service_id: int
    practitioner_id: Optional[int] = None
    location_id: Optional[int] = None
    date: date
    duration_minutes: Optional[int] = None  # Override service duration


class TimeSlot(BaseModel):
    """Available time slot"""
    start_time: time
    end_time: time
    practitioner_id: int
    practitioner_name: str
    room_id: Optional[int] = None
    room_name: Optional[str] = None


class BookingAvailabilityResponse(BaseModel):
    """Booking availability response"""
    date: date
    service_id: int
    service_name: str
    location_id: Optional[int] = None
    available_slots: List[TimeSlot]


class BookingStatsResponse(BaseModel):
    """Booking statistics"""
    total_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    no_show_bookings: int
    total_revenue: Decimal
    average_booking_value: Decimal
    most_popular_service: Optional[str] = None
    most_popular_practitioner: Optional[str] = None