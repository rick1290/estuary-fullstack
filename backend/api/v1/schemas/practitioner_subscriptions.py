"""
Practitioner Subscription schemas for FastAPI endpoints
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from decimal import Decimal
from enum import Enum

from .base import BaseSchema, ListResponse


class PractitionerSubscriptionStatus(str, Enum):
    """Subscription status options"""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"
    UNPAID = "unpaid"


class SubscriptionInterval(str, Enum):
    """Billing interval options"""
    MONTHLY = "monthly"
    ANNUAL = "annual"


# Subscription Tier schemas
class SubscriptionTierFeatures(BaseModel):
    """Features included in a subscription tier"""
    max_services: int = Field(..., description="-1 for unlimited")
    community_posts: bool = True
    analytics: bool = False
    priority_support: bool = False
    video_rooms: bool = True
    advanced_scheduling: bool = True
    custom_branding: bool = False
    bulk_operations: bool = False
    api_access: bool = False
    
    # Additional feature limits
    max_locations: int = Field(1, description="Number of business locations")
    max_staff: int = Field(0, description="Number of staff members")
    max_monthly_bookings: int = Field(-1, description="-1 for unlimited")
    commission_discount: Decimal = Field(Decimal("0"), description="Percentage off base commission")


class SubscriptionTierResponse(BaseSchema):
    """Subscription tier details"""
    id: int
    name: str
    description: str
    monthly_price: Decimal
    annual_price: Optional[Decimal] = None
    features: SubscriptionTierFeatures
    order: int
    is_active: bool
    
    # Calculated fields
    annual_savings: Optional[Decimal] = None
    annual_savings_percentage: Optional[float] = None
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Practitioner Subscription schemas
class PractitionerSubscriptionCreate(BaseModel):
    """Create a practitioner subscription"""
    tier_id: int
    is_annual: bool = False
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method ID (required for paid tiers)")
    
    # Optional promo code
    promo_code: Optional[str] = None


class PractitionerSubscriptionUpdate(BaseModel):
    """Update subscription settings"""
    auto_renew: Optional[bool] = None
    payment_method_id: Optional[str] = None


class PractitionerSubscriptionUpgrade(BaseModel):
    """Upgrade/downgrade subscription"""
    new_tier_id: int
    is_annual: Optional[bool] = None
    prorate: bool = Field(True, description="Apply proration for mid-cycle changes")


class PractitionerSubscriptionResponse(BaseSchema):
    """Practitioner subscription details"""
    id: int
    practitioner_id: int
    tier: SubscriptionTierResponse
    status: PractitionerSubscriptionStatus
    
    # Billing details
    start_date: datetime
    end_date: Optional[datetime] = None
    is_annual: bool
    auto_renew: bool
    
    # Current period
    current_period_start: datetime
    current_period_end: datetime
    
    # Stripe info
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    
    # Usage info
    current_services_count: int = 0
    current_bookings_count: int = 0
    
    # Next billing
    next_billing_date: Optional[datetime] = None
    next_billing_amount: Optional[Decimal] = None
    
    # Cancellation info
    canceled_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Usage & Limits schemas
class SubscriptionUsageResponse(BaseModel):
    """Current usage against subscription limits"""
    tier_name: str
    tier_features: SubscriptionTierFeatures
    
    # Service usage
    services_used: int
    services_limit: int
    services_remaining: int
    
    # Location usage
    locations_used: int
    locations_limit: int
    locations_remaining: int
    
    # Booking usage (current period)
    bookings_used: int
    bookings_limit: int
    bookings_remaining: int
    
    # Feature access
    has_analytics: bool
    has_priority_support: bool
    has_video_rooms: bool
    has_advanced_scheduling: bool
    has_custom_branding: bool
    
    # Commission info
    base_commission_rate: Decimal
    tier_commission_discount: Decimal
    effective_commission_rate: Decimal
    
    # Upgrade suggestions
    suggested_upgrade: Optional[SubscriptionTierResponse] = None
    upgrade_reason: Optional[str] = None


# Billing & Invoice schemas
class InvoiceResponse(BaseModel):
    """Invoice details"""
    id: str
    invoice_number: str
    status: str
    amount_due: Decimal
    amount_paid: Decimal
    currency: str = "USD"
    
    # Dates
    created_at: datetime
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    
    # URLs
    invoice_pdf_url: Optional[str] = None
    hosted_invoice_url: Optional[str] = None
    
    # Line items
    line_items: List[Dict[str, Any]] = Field(default_factory=list)


class PaymentMethodResponse(BaseModel):
    """Payment method for subscriptions"""
    id: str
    type: str
    last4: str
    brand: Optional[str] = None
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None
    is_default: bool


# Analytics schemas
class SubscriptionAnalyticsResponse(BaseModel):
    """Subscription-related analytics"""
    # Revenue metrics
    total_subscription_revenue: Decimal
    monthly_recurring_revenue: Decimal
    annual_recurring_revenue: Decimal
    average_revenue_per_user: Decimal
    
    # Subscription metrics
    total_subscribers: int
    active_subscribers: int
    new_subscribers_this_month: int
    churned_subscribers_this_month: int
    
    # Tier distribution
    subscribers_by_tier: Dict[str, int]
    revenue_by_tier: Dict[str, Decimal]
    
    # Growth metrics
    month_over_month_growth: float
    churn_rate: float
    retention_rate: float
    
    # Commission impact
    total_commission_collected: Decimal
    average_commission_rate: Decimal
    commission_savings_from_upgrades: Decimal


# Promo code schemas
class PromoCodeValidation(BaseModel):
    """Validate a promo code"""
    code: str
    tier_id: int


class PromoCodeResponse(BaseModel):
    """Promo code validation result"""
    is_valid: bool
    discount_percentage: Optional[float] = None
    discount_amount: Optional[Decimal] = None
    message: Optional[str] = None
    expires_at: Optional[datetime] = None


# Admin schemas
class SubscriptionTierCreate(BaseModel):
    """Create a subscription tier (admin)"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str
    monthly_price: Decimal = Field(..., gt=0)
    annual_price: Optional[Decimal] = Field(None, gt=0)
    features: SubscriptionTierFeatures
    order: int = 0
    is_active: bool = True


class SubscriptionTierUpdate(BaseModel):
    """Update a subscription tier (admin)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    monthly_price: Optional[Decimal] = Field(None, gt=0)
    annual_price: Optional[Decimal] = Field(None, gt=0)
    features: Optional[SubscriptionTierFeatures] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


# Commission adjustment schemas
class CommissionAdjustmentResponse(BaseModel):
    """Commission adjustment for a tier"""
    service_type: str
    base_rate: Decimal
    tier_adjustment: Decimal
    effective_rate: Decimal


# List responses
class SubscriptionTierListResponse(ListResponse):
    """Subscription tier list response"""
    results: List[SubscriptionTierResponse]


class PractitionerSubscriptionListResponse(ListResponse):
    """Practitioner subscription list response"""
    results: List[PractitionerSubscriptionResponse]


class InvoiceListResponse(ListResponse):
    """Invoice list response"""
    results: List[InvoiceResponse]


# Webhook schemas
class SubscriptionWebhookEvent(BaseModel):
    """Stripe subscription webhook event"""
    event_type: str
    subscription_id: str
    customer_id: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)