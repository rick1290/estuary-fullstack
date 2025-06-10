"""
Review schemas for FastAPI endpoints
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal

from .base import BaseSchema, ListResponse


class ReviewBase(BaseModel):
    """Base review schema with common fields"""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    title: Optional[str] = Field(None, max_length=200)
    content: str = Field(..., min_length=10, max_length=5000)
    
    @field_validator('content')
    def validate_content(cls, v):
        """Ensure review has meaningful content"""
        if len(v.strip()) < 10:
            raise ValueError("Review content must be at least 10 characters")
        return v.strip()


class ReviewCreate(ReviewBase):
    """Schema for creating a review"""
    booking_id: UUID = Field(..., description="ID of the completed booking")
    would_recommend: bool = Field(True, description="Would recommend to others")
    
    # Optional ratings for different aspects
    professionalism_rating: Optional[int] = Field(None, ge=1, le=5)
    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)
    location_rating: Optional[int] = Field(None, ge=1, le=5)


class ReviewUpdate(BaseModel):
    """Schema for updating a review"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = Field(None, min_length=10, max_length=5000)
    would_recommend: Optional[bool] = None
    
    professionalism_rating: Optional[int] = Field(None, ge=1, le=5)
    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)
    location_rating: Optional[int] = Field(None, ge=1, le=5)


class ReviewerInfo(BaseModel):
    """Information about the reviewer"""
    id: UUID
    first_name: str
    last_initial: str = Field(..., description="Last name initial for privacy")
    profile_image_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReviewResponse(BaseSchema):
    """Practitioner response to a review"""
    content: str
    responded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ReviewCreateResponse(BaseModel):
    """Schema for practitioner response to review"""
    content: str = Field(..., min_length=10, max_length=2000)


class ReviewPublic(BaseSchema):
    """Public review display"""
    id: UUID
    rating: int
    title: Optional[str]
    content: str
    would_recommend: bool
    
    # Aspect ratings
    professionalism_rating: Optional[int]
    communication_rating: Optional[int]
    value_rating: Optional[int]
    location_rating: Optional[int]
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    is_verified: bool
    
    # Related info
    reviewer: ReviewerInfo
    service_name: str
    practitioner_id: UUID
    practitioner_name: str
    
    # Response
    response: Optional[ReviewResponse] = None
    
    # Engagement
    helpful_count: int = 0
    user_found_helpful: Optional[bool] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReviewFilters(BaseModel):
    """Filters for listing reviews"""
    practitioner_id: Optional[UUID] = None
    service_id: Optional[UUID] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    min_rating: Optional[int] = Field(None, ge=1, le=5)
    verified_only: bool = False
    with_response: Optional[bool] = None
    would_recommend: Optional[bool] = None
    sort_by: str = Field("newest", pattern="^(newest|oldest|highest|lowest|helpful)$")


class ReviewStats(BaseModel):
    """Aggregated review statistics"""
    total_reviews: int = 0
    average_rating: float = 0.0
    rating_breakdown: dict[int, int] = Field(
        default_factory=lambda: {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    )
    
    # Aspect averages
    average_professionalism: Optional[float] = None
    average_communication: Optional[float] = None
    average_value: Optional[float] = None
    average_location: Optional[float] = None
    
    # Recommendation stats
    would_recommend_percentage: float = 0.0
    verified_percentage: float = 0.0
    response_rate: float = 0.0
    
    # Recent trend
    recent_average: Optional[float] = Field(None, description="Average of last 10 reviews")
    trending: Optional[str] = Field(None, description="up, down, or stable")
    
    model_config = ConfigDict(from_attributes=True)


class ReviewVote(BaseModel):
    """Schema for voting a review as helpful"""
    helpful: bool = Field(..., description="True if helpful, False if not")


class ReviewReport(BaseModel):
    """Schema for reporting inappropriate reviews"""
    reason: str = Field(..., pattern="^(spam|offensive|fake|other)$")
    details: Optional[str] = Field(None, max_length=500)


class ReviewModeration(BaseModel):
    """Schema for moderating reviews (admin only)"""
    status: str = Field(..., pattern="^(approved|rejected|flagged)$")
    moderation_notes: Optional[str] = Field(None, max_length=500)
    is_verified: Optional[bool] = None


class ReviewListResponse(ListResponse):
    """Response for review list with stats"""
    results: List[ReviewPublic]
    stats: Optional[ReviewStats] = None


class PractitionerReviewStats(BaseModel):
    """Detailed review stats for a practitioner"""
    practitioner_id: UUID
    practitioner_name: str
    stats: ReviewStats
    
    # Top reviews
    featured_reviews: List[ReviewPublic] = Field(
        default_factory=list,
        description="Top helpful reviews"
    )
    
    # Service-specific stats
    service_stats: Optional[dict[str, ReviewStats]] = None
    
    model_config = ConfigDict(from_attributes=True)


class ServiceReviewStats(BaseModel):
    """Review stats for a specific service"""
    service_id: UUID
    service_name: str
    stats: ReviewStats
    
    # Recent reviews
    recent_reviews: List[ReviewPublic] = Field(
        default_factory=list,
        description="Most recent reviews"
    )
    
    model_config = ConfigDict(from_attributes=True)