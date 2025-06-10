"""
Practitioner schemas for the marketplace API
"""
from pydantic import BaseModel, Field, ConfigDict, validator
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime, date, time
from api.v1.schemas.base import BaseORM, TimestampMixin, IDMixin, PaginatedResponse
from api.v1.schemas.services import ServiceResponse


class LocationBase(BaseModel):
    """Basic location information"""
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SpecializationResponse(BaseModel):
    """Specialization response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    content: str


class StyleResponse(BaseModel):
    """Style response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    content: str


class TopicResponse(BaseModel):
    """Topic response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    content: str


class CertificationResponse(BaseModel):
    """Certification response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int  # Changed from str to int
    certificate: Optional[str] = None
    institution: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None


class EducationResponse(BaseModel):
    """Education response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int  # Changed from str to int
    degree: Optional[str] = None
    educational_institute: Optional[str] = None


class PractitionerBase(BaseModel):
    """Base practitioner schema"""
    display_name: Optional[str] = None
    professional_title: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=2000)
    quote: Optional[str] = Field(None, max_length=500)
    profile_image_url: Optional[str] = None
    profile_video_url: Optional[str] = None
    years_of_experience: Optional[int] = Field(None, ge=0)


class PractitionerPublicProfile(PractitionerBase):
    """Public practitioner profile for marketplace listings"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    public_uuid: str
    full_name: str
    is_verified: bool
    is_active: bool
    featured: bool
    
    # Computed fields
    average_rating: float
    total_reviews: int
    total_services: int
    completed_sessions_count: int
    price_range: Dict[str, Optional[Decimal]]
    
    # Location
    primary_location: Optional[LocationBase] = None
    
    # Related data (simplified for public view)
    specializations: List[SpecializationResponse] = []
    styles: List[StyleResponse] = []
    topics: List[TopicResponse] = []
    certifications: List[CertificationResponse] = []
    
    # Availability indicator
    next_available_date: Optional[datetime] = None


class PractitionerPrivateProfile(PractitionerPublicProfile):
    """Private practitioner profile for authenticated practitioners"""
    # Personal info from user model
    email: str
    phone: Optional[str] = None
    
    # Status and onboarding
    practitioner_status: str
    is_onboarded: bool
    onboarding_step: int
    onboarding_completed_at: Optional[datetime] = None
    
    # Business settings
    buffer_time: int = Field(default=15, description="Buffer time between sessions in minutes")
    
    # Additional private data
    educations: List[EducationResponse] = []
    cancellation_rate: float
    
    # Timestamps
    created_at: datetime
    updated_at: datetime


class PractitionerProfileUpdate(BaseModel):
    """Schema for updating practitioner profile"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    professional_title: Optional[str] = Field(None, min_length=1, max_length=255)
    bio: Optional[str] = Field(None, max_length=2000)
    quote: Optional[str] = Field(None, max_length=500)
    profile_image_url: Optional[str] = None
    profile_video_url: Optional[str] = None
    years_of_experience: Optional[int] = Field(None, ge=0)
    buffer_time: Optional[int] = Field(None, ge=0, le=120)
    
    # IDs for many-to-many relationships
    specialization_ids: Optional[List[int]] = None
    style_ids: Optional[List[int]] = None
    topic_ids: Optional[List[int]] = None
    certification_ids: Optional[List[str]] = None
    education_ids: Optional[List[str]] = None


class PractitionerServiceBase(BaseModel):
    """Base schema for practitioner's service"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    price: Decimal = Field(..., decimal_places=2, ge=0)
    duration_minutes: int = Field(..., gt=0)
    
    # Service details
    max_participants: int = Field(default=1, ge=1)
    min_participants: int = Field(default=1, ge=1)
    experience_level: str = Field(default='all_levels')
    age_min: Optional[int] = Field(None, ge=0)
    age_max: Optional[int] = Field(None, ge=0)
    
    # Location and delivery
    location_type: str = Field(default='virtual')
    
    # Content
    what_youll_learn: Optional[str] = None
    prerequisites: Optional[str] = None
    includes: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    
    # Media
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    
    # Status
    is_active: bool = True
    is_public: bool = True


class PractitionerServiceCreate(PractitionerServiceBase):
    """Schema for creating a new service"""
    service_type_id: int
    category_id: Optional[int] = None
    language_ids: Optional[List[int]] = None
    
    @validator('price')
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        return v


class PractitionerServiceUpdate(BaseModel):
    """Schema for updating a service"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    price: Optional[Decimal] = Field(None, decimal_places=2, ge=0)
    duration_minutes: Optional[int] = Field(None, gt=0)
    
    # Service details
    max_participants: Optional[int] = Field(None, ge=1)
    min_participants: Optional[int] = Field(None, ge=1)
    experience_level: Optional[str] = None
    age_min: Optional[int] = Field(None, ge=0)
    age_max: Optional[int] = Field(None, ge=0)
    
    # Location and delivery
    location_type: Optional[str] = None
    
    # Content
    what_youll_learn: Optional[str] = None
    prerequisites: Optional[str] = None
    includes: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    
    # Media
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    
    # Status
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    
    # Relationships
    category_id: Optional[int] = None
    language_ids: Optional[List[int]] = None


class PractitionerServiceResponse(ServiceResponse):
    """Extended service response for practitioner's services"""
    # Additional fields specific to practitioner view
    total_bookings: int = 0
    revenue_share_percentage: Optional[Decimal] = None
    is_primary_practitioner: bool = True


class TimeSlotBase(BaseModel):
    """Base time slot schema"""
    day: int = Field(..., ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    start_time: time
    end_time: time
    
    @validator('end_time')
    def validate_end_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('End time must be after start time')
        return v


class ScheduleTimeSlotCreate(TimeSlotBase):
    """Schema for creating a time slot"""
    pass


class ScheduleTimeSlotUpdate(BaseModel):
    """Schema for updating a time slot"""
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    is_active: Optional[bool] = None


class ScheduleTimeSlotResponse(TimeSlotBase, BaseORM):
    """Time slot response"""
    id: int  # Changed from str to int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ScheduleBase(BaseModel):
    """Base schedule schema"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    timezone: str = Field(default='UTC')
    is_default: bool = False
    is_active: bool = True


class ScheduleCreate(ScheduleBase):
    """Schema for creating a schedule"""
    time_slots: Optional[List[ScheduleTimeSlotCreate]] = []


class ScheduleUpdate(BaseModel):
    """Schema for updating a schedule"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    timezone: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class ScheduleResponse(ScheduleBase, BaseORM):
    """Schedule response"""
    id: int  # Changed from str to int
    time_slots: List[ScheduleTimeSlotResponse] = []
    created_at: datetime
    updated_at: datetime


class AvailabilitySlot(BaseModel):
    """Available time slot for booking"""
    date: date
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    is_available: bool
    
    # Optional booking info if slot is taken
    booking_id: Optional[str] = None
    service_name: Optional[str] = None


class AvailabilityQuery(BaseModel):
    """Query parameters for availability"""
    start_date: date
    end_date: date
    service_id: Optional[int] = None
    duration_minutes: Optional[int] = None
    timezone: str = Field(default='UTC')


class AvailabilityResponse(BaseModel):
    """Availability response"""
    practitioner_id: int
    timezone: str
    available_slots: List[AvailabilitySlot]
    schedules: List[ScheduleResponse]


class EarningsOverview(BaseModel):
    """Practitioner earnings overview"""
    model_config = ConfigDict(from_attributes=True)
    
    # Balances
    pending_balance: Decimal
    available_balance: Decimal
    lifetime_earnings: Decimal
    lifetime_payouts: Decimal
    
    # Recent activity
    last_payout_date: Optional[datetime] = None
    pending_transactions_count: int = 0
    
    # Current period stats
    current_month_earnings: Decimal = Decimal('0.00')
    current_month_sessions: int = 0
    
    # Commission info
    average_commission_rate: Decimal = Decimal('0.00')


class EarningsTransaction(BaseModel):
    """Individual earnings transaction"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    booking_id: int
    service_name: str
    client_name: str
    
    # Financial details
    gross_amount: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    net_amount: Decimal
    
    # Status
    status: str
    available_after: datetime
    
    # Dates
    service_date: datetime
    created_at: datetime
    
    # Payout info
    payout_id: Optional[int] = None
    payout_date: Optional[datetime] = None


class PayoutHistory(BaseModel):
    """Payout history entry"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    amount: Decimal
    currency: str
    status: str
    payment_method: str
    
    # Transaction details
    transaction_count: int
    transaction_fee: Optional[Decimal] = None
    
    # Dates
    created_at: datetime
    payout_date: Optional[datetime] = None
    
    # Additional info
    stripe_transfer_id: Optional[str] = None
    notes: Optional[str] = None


class PractitionerAnalytics(BaseModel):
    """Practitioner performance analytics"""
    # Overview metrics
    total_bookings: int
    completed_sessions: int
    cancellation_rate: float
    no_show_rate: float
    
    # Revenue metrics
    total_revenue: Decimal
    average_session_value: Decimal
    revenue_growth_percentage: float
    
    # Client metrics
    total_clients: int
    repeat_client_rate: float
    average_client_lifetime_value: Decimal
    new_clients_this_month: int
    
    # Service metrics
    most_popular_services: List[Dict[str, Any]]
    service_utilization_rate: float
    average_booking_lead_time_days: float
    
    # Time-based metrics
    busiest_days: List[Dict[str, Any]]
    busiest_hours: List[Dict[str, int]]
    monthly_trends: List[Dict[str, Any]]
    
    # Ratings and reviews
    average_rating: float
    total_reviews: int
    rating_distribution: Dict[str, int]
    recent_reviews: List[Dict[str, Any]]
    
    # Period for analytics
    period_start: date
    period_end: date


class PractitionerListFilters(BaseModel):
    """Filters for practitioner listing"""
    # Location filters
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[int] = Field(None, ge=1, le=100)
    
    # Service filters
    service_type_ids: Optional[List[int]] = None
    category_ids: Optional[List[int]] = None
    specialization_ids: Optional[List[int]] = None
    style_ids: Optional[List[int]] = None
    topic_ids: Optional[List[int]] = None
    
    # Availability filters
    available_on: Optional[date] = None
    available_time: Optional[time] = None
    location_type: Optional[str] = None
    
    # Price filters
    min_price: Optional[Decimal] = Field(None, ge=0)
    max_price: Optional[Decimal] = Field(None, ge=0)
    
    # Other filters
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    min_experience_years: Optional[int] = Field(None, ge=0)
    languages: Optional[List[str]] = None
    is_verified: Optional[bool] = None
    featured_only: bool = False
    
    # Sorting
    sort_by: str = Field(
        default='relevance',
        pattern='^(relevance|rating|price_low|price_high|experience|distance|availability)$'
    )
    
    @validator('max_price')
    def validate_price_range(cls, v, values):
        if v and 'min_price' in values and values['min_price'] and v < values['min_price']:
            raise ValueError('max_price must be greater than min_price')
        return v


class PractitionerListResponse(PaginatedResponse[PractitionerPublicProfile]):
    """Paginated practitioner list response"""
    # Additional metadata
    applied_filters: Dict[str, Any] = {}
    total_available: int = 0