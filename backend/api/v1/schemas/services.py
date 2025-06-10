"""
Services schemas - Simplified for unified Service model
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from api.v1.schemas.base import BaseORM, TimestampMixin, IDMixin, ListResponse


from enum import Enum


class ServiceTypeEnum(str, Enum):
    """Service type enumeration"""
    SESSION = "session"
    WORKSHOP = "workshop"
    COURSE = "course"
    PACKAGE = "package"
    BUNDLE = "bundle"


class CategoryBase(BaseModel):
    """Basic category info"""
    id: int
    name: str
    slug: str


class PractitionerBase(BaseModel):
    """Basic practitioner info"""
    id: int
    display_name: str
    slug: str


class ServiceBase(BaseModel):
    """Base service schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    service_type: ServiceTypeEnum
    duration_minutes: Optional[int] = Field(None, gt=0)
    price: Decimal = Field(..., decimal_places=2, ge=0)
    is_active: bool = True
    is_public: bool = True
    category_id: Optional[int] = None
    primary_practitioner_id: int
    
    # Bundle-specific fields
    sessions_included: Optional[int] = Field(None, gt=0, description="For bundles only")
    validity_days: Optional[int] = Field(None, gt=0)
    
    # Workshop/Course fields
    max_participants: Optional[int] = Field(None, ge=1)
    min_participants: Optional[int] = Field(None, ge=1)
    
    # Booking constraints
    min_advance_booking_hours: int = Field(default=24, ge=0)
    max_advance_booking_days: int = Field(default=90, ge=1)


class ServiceCreate(ServiceBase):
    """Service creation schema"""
    child_service_ids: Optional[List[int]] = Field(None, description="For packages only")


class ServiceUpdate(BaseModel):
    """Service update schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, gt=0)
    price: Optional[Decimal] = Field(None, decimal_places=2, ge=0)
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    category_id: Optional[int] = None
    sessions_included: Optional[int] = Field(None, gt=0)
    validity_days: Optional[int] = Field(None, gt=0)
    max_participants: Optional[int] = Field(None, ge=1)
    min_participants: Optional[int] = Field(None, ge=1)
    min_advance_booking_hours: Optional[int] = Field(None, ge=0)
    max_advance_booking_days: Optional[int] = Field(None, ge=1)


class ServiceResponse(BaseModel):
    """Service response schema"""
    id: int
    public_uuid: UUID
    name: str
    slug: str
    description: Optional[str] = None
    service_type: str
    category: Optional[CategoryBase] = None
    price_cents: int
    price: Decimal
    duration_minutes: Optional[int] = None
    primary_practitioner: Optional[PractitionerBase] = None
    is_active: bool
    is_public: bool
    booking_count: int = 0
    average_rating: Optional[float] = None
    sessions_included: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ServiceSessionResponse(BaseModel):
    """Service session response (for workshops/courses)"""
    id: int
    start_time: datetime
    end_time: datetime
    sequence_number: Optional[int] = None
    title: Optional[str] = None
    location: Optional[str] = None
    is_virtual: bool = False
    max_participants: Optional[int] = None
    current_participants: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class ChildServiceResponse(BaseModel):
    """Child service in a package"""
    id: int
    name: str
    price: Decimal
    duration_minutes: Optional[int] = None
    quantity: int = 1
    discount_percentage: Optional[Decimal] = None
    
    model_config = ConfigDict(from_attributes=True)


class ServiceDetailResponse(ServiceResponse):
    """Detailed service response"""
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    
    # Additional details
    additional_practitioners: List[PractitionerBase] = Field(default_factory=list)
    benefits: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)
    
    # Bundle/Package details
    child_services: List[ChildServiceResponse] = Field(default_factory=list)
    original_price: Optional[Decimal] = None
    savings_percentage: Optional[Decimal] = None
    
    # Workshop/Course sessions
    sessions: List[ServiceSessionResponse] = Field(default_factory=list)
    
    # Booking info
    validity_days: Optional[int] = None
    is_transferable: bool = False
    is_shareable: bool = False
    max_per_customer: Optional[int] = None
    
    # Terms
    terms_and_conditions: Optional[str] = None
    cancellation_policy: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ServiceListResponse(ListResponse):
    """Service list response"""
    results: List[ServiceResponse]
    page: Optional[int] = None
    total_pages: Optional[int] = None