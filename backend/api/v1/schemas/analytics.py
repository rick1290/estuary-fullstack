"""
Analytics schemas for FastAPI endpoints
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal
from enum import Enum

from .base import BaseSchema, ListResponse


class TimeRange(str, Enum):
    """Time range options for analytics"""
    TODAY = "today"
    YESTERDAY = "yesterday"
    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    LAST_90_DAYS = "last_90_days"
    THIS_MONTH = "this_month"
    LAST_MONTH = "last_month"
    THIS_YEAR = "this_year"
    CUSTOM = "custom"


class MetricType(str, Enum):
    """Types of metrics available"""
    VIEWS = "views"
    BOOKINGS = "bookings"
    REVENUE = "revenue"
    CANCELLATIONS = "cancellations"
    RATINGS = "ratings"
    ENGAGEMENT = "engagement"


class ReportType(str, Enum):
    """Financial report types"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class DateRange(BaseModel):
    """Date range for analytics queries"""
    start_date: date
    end_date: date


class MetricValue(BaseModel):
    """Single metric value with change"""
    value: Decimal
    change_percentage: Optional[float] = None
    change_absolute: Optional[Decimal] = None
    previous_value: Optional[Decimal] = None


class TimeSeriesData(BaseModel):
    """Time series data point"""
    date: date
    value: Decimal
    label: Optional[str] = None


class DashboardCard(BaseModel):
    """Dashboard metric card"""
    title: str
    metric: MetricType
    value: MetricValue
    trend: List[TimeSeriesData] = Field(default_factory=list)
    icon: Optional[str] = None
    color: Optional[str] = None


# Practitioner Analytics Schemas
class PractitionerMetrics(BaseSchema):
    """Practitioner performance metrics"""
    practitioner_id: UUID
    date_range: DateRange
    
    # Key metrics
    total_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    no_show_bookings: int
    
    # Financial metrics
    total_revenue: Decimal
    average_booking_value: Decimal
    refunds_amount: Decimal
    net_revenue: Decimal
    
    # Engagement metrics
    profile_views: int
    service_views: int
    conversion_rate: float  # views to bookings
    
    # Rating metrics
    average_rating: Optional[float] = None
    total_reviews: int
    five_star_reviews: int
    
    # Client metrics
    unique_clients: int
    repeat_clients: int
    client_retention_rate: float
    
    model_config = ConfigDict(from_attributes=True)


class PractitionerDashboard(BaseSchema):
    """Practitioner dashboard data"""
    practitioner_id: UUID
    summary_cards: List[DashboardCard]
    
    # Revenue breakdown
    revenue_by_service: List[Dict[str, Any]]
    revenue_trend: List[TimeSeriesData]
    
    # Booking analytics
    booking_status_breakdown: Dict[str, int]
    bookings_by_day_of_week: List[Dict[str, Any]]
    bookings_by_time_of_day: List[Dict[str, Any]]
    
    # Client analytics
    top_clients: List[Dict[str, Any]]
    client_acquisition_trend: List[TimeSeriesData]
    
    # Service performance
    service_popularity: List[Dict[str, Any]]
    service_ratings: List[Dict[str, Any]]
    
    model_config = ConfigDict(from_attributes=True)


class ServicePerformance(BaseSchema):
    """Service performance analytics"""
    service_id: UUID
    service_name: str
    period: DateRange
    
    # Metrics
    total_views: int
    total_bookings: int
    total_revenue: Decimal
    average_rating: Optional[float] = None
    conversion_rate: float
    
    # Trends
    views_trend: List[TimeSeriesData]
    bookings_trend: List[TimeSeriesData]
    revenue_trend: List[TimeSeriesData]
    
    model_config = ConfigDict(from_attributes=True)


# Admin Analytics Schemas
class PlatformMetrics(BaseSchema):
    """Platform-wide metrics for admin"""
    date_range: DateRange
    
    # User metrics
    total_users: int
    new_users: int
    active_users: int
    user_retention_rate: float
    
    # Practitioner metrics
    total_practitioners: int
    new_practitioners: int
    active_practitioners: int
    
    # Booking metrics
    total_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    booking_completion_rate: float
    
    # Financial metrics
    gross_revenue: Decimal
    platform_fees: Decimal
    practitioner_payouts: Decimal
    refunds_total: Decimal
    net_revenue: Decimal
    
    # Service metrics
    total_services: int
    active_services: int
    average_service_rating: float
    
    model_config = ConfigDict(from_attributes=True)


class AdminDashboard(BaseSchema):
    """Admin dashboard comprehensive data"""
    platform_metrics: PlatformMetrics
    summary_cards: List[DashboardCard]
    
    # Revenue analytics
    revenue_by_category: List[Dict[str, Any]]
    revenue_by_location: List[Dict[str, Any]]
    revenue_trend: List[TimeSeriesData]
    
    # User analytics
    user_growth_trend: List[TimeSeriesData]
    user_activity_heatmap: List[Dict[str, Any]]
    
    # Practitioner analytics
    top_practitioners: List[Dict[str, Any]]
    practitioner_earnings_distribution: Dict[str, Any]
    
    # Service analytics
    top_services: List[Dict[str, Any]]
    service_category_breakdown: List[Dict[str, Any]]
    
    # Geographic analytics
    bookings_by_location: List[Dict[str, Any]]
    revenue_by_location: List[Dict[str, Any]]
    
    model_config = ConfigDict(from_attributes=True)


class FinancialReportSummary(BaseSchema):
    """Financial report summary"""
    report_id: UUID
    report_type: ReportType
    start_date: date
    end_date: date
    
    # Revenue
    gross_revenue: Decimal
    platform_fees: Decimal
    payment_processing_fees: Decimal
    
    # Payouts
    practitioner_payouts: Decimal
    affiliate_commissions: Decimal
    
    # Deductions
    refunds_amount: Decimal
    chargebacks_amount: Decimal
    tax_collected: Decimal
    
    # Net
    net_revenue: Decimal
    profit_margin: float
    
    generated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class SearchAnalyticsSummary(BaseSchema):
    """Search analytics summary"""
    date_range: DateRange
    
    # Search metrics
    total_searches: int
    unique_searchers: int
    searches_with_results: int
    searches_with_clicks: int
    searches_with_bookings: int
    
    # Popular searches
    top_search_terms: List[Dict[str, Any]]
    trending_searches: List[Dict[str, Any]]
    
    # Search behavior
    average_results_per_search: float
    click_through_rate: float
    conversion_rate: float
    
    # Filters usage
    most_used_filters: Dict[str, int]
    location_searches: int
    
    model_config = ConfigDict(from_attributes=True)


class UserEngagementMetrics(BaseSchema):
    """User engagement analytics"""
    user_id: Optional[UUID] = None
    date_range: DateRange
    
    # Session metrics
    total_sessions: int
    average_session_duration: int  # seconds
    pages_per_session: float
    bounce_rate: float
    
    # Activity metrics
    searches_performed: int
    services_viewed: int
    practitioners_viewed: int
    bookings_made: int
    reviews_written: int
    
    # Engagement score
    engagement_score: float  # 0-100
    
    model_config = ConfigDict(from_attributes=True)


# Request/Response schemas
class AnalyticsRequest(BaseModel):
    """Base analytics request"""
    time_range: TimeRange = TimeRange.LAST_30_DAYS
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    metrics: Optional[List[MetricType]] = None
    group_by: Optional[str] = None  # day, week, month
    filters: Optional[Dict[str, Any]] = None


class PractitionerAnalyticsRequest(AnalyticsRequest):
    """Practitioner analytics request"""
    practitioner_id: Optional[UUID] = None  # None for current practitioner
    compare_previous_period: bool = False


class AdminAnalyticsRequest(AnalyticsRequest):
    """Admin analytics request"""
    include_financial: bool = True
    include_geographic: bool = True
    include_demographics: bool = False


class ExportAnalyticsRequest(BaseModel):
    """Export analytics data request"""
    report_type: str = Field(..., description="Type of report to export")
    format: str = Field("csv", pattern="^(csv|excel|pdf)$")
    email_to: Optional[str] = Field(None, description="Email to send report to")
    filters: Optional[Dict[str, Any]] = None


class AnalyticsExportResponse(BaseModel):
    """Response for analytics export"""
    export_id: UUID
    status: str
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    message: str


# Real-time analytics
class RealtimeMetrics(BaseModel):
    """Real-time platform metrics"""
    active_users: int
    active_practitioners: int
    bookings_in_progress: int
    bookings_today: int
    revenue_today: Decimal
    
    # Last hour metrics
    bookings_last_hour: int
    searches_last_hour: int
    new_users_last_hour: int
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)


class MetricAlert(BaseModel):
    """Analytics alert configuration"""
    id: UUID
    name: str
    metric_type: MetricType
    threshold_value: Decimal
    comparison: str = Field(..., pattern="^(greater_than|less_than|equals)$")
    time_window: str = Field(..., pattern="^(hourly|daily|weekly|monthly)$")
    recipients: List[str]  # email addresses
    is_active: bool = True
    last_triggered: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)