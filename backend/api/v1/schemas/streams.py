"""
Streams schemas for FastAPI endpoints
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal
from enum import Enum

from .base import BaseSchema, ListResponse


class StreamTier(str, Enum):
    """Stream subscription tiers"""
    FREE = "free"
    ENTRY = "entry"
    PREMIUM = "premium"


class PostType(str, Enum):
    """Types of stream posts"""
    POST = "post"
    VIDEO = "video" 
    AUDIO = "audio"
    IMAGE = "image"
    GALLERY = "gallery"
    LINK = "link"
    POLL = "poll"


class MediaType(str, Enum):
    """Types of media attachments"""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"


class SubscriptionStatus(str, Enum):
    """Subscription status options"""
    ACTIVE = "active"
    CANCELED = "canceled"
    EXPIRED = "expired"
    PAUSED = "paused"
    PAST_DUE = "past_due"


class TipStatus(str, Enum):
    """Tip payment status"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


# Stream Category schemas
class StreamCategoryResponse(BaseSchema):
    """Stream category response"""
    id: int  # StreamCategory uses BaseModel (integer PK)
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool
    order: int
    
    model_config = ConfigDict(from_attributes=True)


# Stream schemas
class StreamCreate(BaseModel):
    """Create a new stream"""
    title: str = Field(..., min_length=1, max_length=255)
    tagline: Optional[str] = Field(None, max_length=255)
    description: str = Field(..., min_length=1, max_length=5000)
    about: Optional[str] = Field(None, max_length=10000)
    
    # Tier customization
    free_tier_name: str = Field("Free", max_length=50)
    entry_tier_name: str = Field("Entry", max_length=50)
    premium_tier_name: str = Field("Premium", max_length=50)
    
    # Pricing (in dollars, converted to cents)
    entry_tier_price: Decimal = Field(..., gt=0, decimal_places=2)
    premium_tier_price: Decimal = Field(..., gt=0, decimal_places=2)
    
    # Tier descriptions
    free_tier_description: Optional[str] = None
    entry_tier_description: Optional[str] = None
    premium_tier_description: Optional[str] = None
    
    # Tier perks
    free_tier_perks: List[str] = Field(default_factory=list)
    entry_tier_perks: List[str] = Field(default_factory=list)
    premium_tier_perks: List[str] = Field(default_factory=list)
    
    # Categories and tags
    category_ids: List[int] = Field(default_factory=list)  # StreamCategory uses integer PK
    tags: List[str] = Field(default_factory=list)
    
    # Settings
    allow_comments: bool = True
    allow_dms: bool = False
    allow_tips: bool = True
    preview_post_count: int = Field(3, ge=0, le=10)
    watermark_media: bool = True
    
    @field_validator('premium_tier_price')
    def validate_premium_price(cls, v, info):
        """Premium tier must be more expensive than entry"""
        entry_price = info.data.get('entry_tier_price')
        if entry_price and v <= entry_price:
            raise ValueError("Premium tier price must be higher than entry tier price")
        return v


class StreamUpdate(BaseModel):
    """Update stream details"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    tagline: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, min_length=1, max_length=5000)
    about: Optional[str] = Field(None, max_length=10000)
    
    # Tier customization
    free_tier_name: Optional[str] = Field(None, max_length=50)
    entry_tier_name: Optional[str] = Field(None, max_length=50)
    premium_tier_name: Optional[str] = Field(None, max_length=50)
    
    # Tier descriptions
    free_tier_description: Optional[str] = None
    entry_tier_description: Optional[str] = None
    premium_tier_description: Optional[str] = None
    
    # Tier perks
    free_tier_perks: Optional[List[str]] = None
    entry_tier_perks: Optional[List[str]] = None
    premium_tier_perks: Optional[List[str]] = None
    
    # Categories and tags
    category_ids: Optional[List[int]] = None  # StreamCategory uses integer PK
    tags: Optional[List[str]] = None
    
    # Settings
    allow_comments: Optional[bool] = None
    allow_dms: Optional[bool] = None
    allow_tips: Optional[bool] = None
    preview_post_count: Optional[int] = Field(None, ge=0, le=10)
    watermark_media: Optional[bool] = None


class StreamTierInfo(BaseModel):
    """Information about a subscription tier"""
    tier: StreamTier
    name: str
    price_cents: int
    price_display: str
    description: Optional[str] = None
    perks: List[str] = Field(default_factory=list)
    is_current_tier: bool = False
    
    model_config = ConfigDict(from_attributes=True)


class StreamResponse(BaseSchema):
    """Stream response schema"""
    id: int  # Stream uses PublicModel but we expose int ID + public_uuid  
    public_uuid: UUID
    practitioner_id: int  # Practitioner uses integer PK
    practitioner_name: str
    practitioner_image_url: Optional[str] = None
    
    # Stream details
    title: str
    tagline: Optional[str] = None
    description: str
    about: Optional[str] = None
    
    # Media
    cover_image_url: Optional[str] = None
    profile_image_url: Optional[str] = None
    intro_video_url: Optional[str] = None
    
    # Categories and tags
    categories: List[StreamCategoryResponse] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    
    # Tiers
    tiers: List[StreamTierInfo] = Field(default_factory=list)
    
    # Stats
    subscriber_count: int
    free_subscriber_count: int
    paid_subscriber_count: int
    post_count: int
    total_revenue: Decimal
    
    # Settings
    is_active: bool
    is_featured: bool
    is_launched: bool
    allow_comments: bool
    allow_dms: bool
    allow_tips: bool
    preview_post_count: int
    watermark_media: bool
    
    # Dates
    launched_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # User-specific data
    current_subscription: Optional['StreamSubscriptionResponse'] = None
    can_manage: bool = False
    
    model_config = ConfigDict(from_attributes=True)


# Stream Post Media schemas
class StreamPostMediaCreate(BaseModel):
    """Create media for a stream post"""
    media_id: int = Field(..., description="ID of uploaded media")  # Media uses integer PK
    order: int = Field(0, ge=0)
    caption: Optional[str] = Field(None, max_length=1000)
    alt_text: Optional[str] = Field(None, max_length=255)


class StreamPostMediaResponse(BaseSchema):
    """Stream post media response"""
    id: int  # StreamPostMedia uses BaseModel (integer PK)
    media_type: MediaType
    media_url: str
    thumbnail_url: Optional[str] = None
    filename: Optional[str] = None
    file_size: Optional[int] = None
    duration_seconds: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    order: int
    caption: Optional[str] = None
    alt_text: Optional[str] = None
    is_processed: bool
    
    model_config = ConfigDict(from_attributes=True)


# Stream Post schemas
class StreamPostCreate(BaseModel):
    """Create a new stream post"""
    title: Optional[str] = Field(None, max_length=255)
    content: str = Field(..., min_length=1, max_length=50000)
    post_type: PostType = PostType.POST
    tier_level: StreamTier = StreamTier.FREE
    
    # Teaser for lower tiers
    teaser_text: Optional[str] = Field(None, max_length=500)
    blur_preview: bool = True
    
    # Scheduling
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Settings
    allow_comments: bool = True
    allow_tips: bool = True
    
    # Poll specific
    poll_options: Optional[List[str]] = Field(None, min_length=2, max_length=10)
    poll_ends_at: Optional[datetime] = None
    poll_allows_multiple: bool = False
    
    # Tags
    tags: List[str] = Field(default_factory=list, max_length=20)
    
    # Media
    media: List[StreamPostMediaCreate] = Field(default_factory=list, max_length=20)
    
    @field_validator('poll_options')
    def validate_poll_options(cls, v, info):
        """Validate poll options for poll posts"""
        post_type = info.data.get('post_type')
        if post_type == PostType.POLL:
            if not v or len(v) < 2:
                raise ValueError("Poll posts must have at least 2 options")
        return v


class StreamPostUpdate(BaseModel):
    """Update stream post"""
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = Field(None, min_length=1, max_length=50000)
    teaser_text: Optional[str] = Field(None, max_length=500)
    blur_preview: Optional[bool] = None
    expires_at: Optional[datetime] = None
    allow_comments: Optional[bool] = None
    allow_tips: Optional[bool] = None
    tags: Optional[List[str]] = Field(None, max_length=20)
    is_pinned: Optional[bool] = None


class StreamPostResponse(BaseSchema):
    """Stream post response"""
    id: int  # StreamPost uses PublicModel but we expose int ID + public_uuid
    public_uuid: UUID
    stream_id: int  # Stream uses integer for relationships
    stream_title: str
    
    # Content
    title: Optional[str] = None
    content: str
    post_type: PostType
    tier_level: StreamTier
    
    # Access control
    teaser_text: Optional[str] = None
    blur_preview: bool
    has_access: bool = False
    
    # Publishing
    is_published: bool
    published_at: datetime
    is_pinned: bool
    expires_at: Optional[datetime] = None
    
    # Media
    media: List[StreamPostMediaResponse] = Field(default_factory=list)
    
    # Engagement
    view_count: int
    unique_view_count: int
    like_count: int
    comment_count: int
    share_count: int
    
    # Settings
    allow_comments: bool
    allow_tips: bool
    
    # Poll data
    poll_options: Optional[List[Dict[str, Any]]] = None
    poll_ends_at: Optional[datetime] = None
    poll_allows_multiple: bool = False
    poll_user_votes: List[int] = Field(default_factory=list)
    
    # Tags
    tags: List[str] = Field(default_factory=list)
    
    # User actions
    is_liked: bool = False
    can_edit: bool = False
    can_delete: bool = False
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Subscription schemas
class StreamSubscriptionCreate(BaseModel):
    """Create a subscription"""
    tier: StreamTier
    payment_method_id: str = Field(..., description="Stripe payment method ID")


class StreamSubscriptionUpdate(BaseModel):
    """Update subscription"""
    tier: Optional[StreamTier] = None
    notify_new_posts: Optional[bool] = None
    notify_live_streams: Optional[bool] = None


class StreamSubscriptionResponse(BaseSchema):
    """Subscription response"""
    id: UUID
    stream_id: UUID
    stream_title: str
    tier: StreamTier
    tier_display_name: str
    status: SubscriptionStatus
    
    # Billing
    started_at: datetime
    current_period_start: datetime
    current_period_end: datetime
    canceled_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    
    # History
    previous_tier: Optional[StreamTier] = None
    tier_changed_at: Optional[datetime] = None
    
    # Engagement
    last_viewed_at: Optional[datetime] = None
    total_tips: Decimal
    
    # Notifications
    notify_new_posts: bool
    notify_live_streams: bool
    
    # Can manage subscription
    can_cancel: bool = True
    can_upgrade: bool = True
    can_downgrade: bool = True
    
    model_config = ConfigDict(from_attributes=True)


# Comment schemas
class StreamPostCommentCreate(BaseModel):
    """Create a comment"""
    content: str = Field(..., min_length=1, max_length=2000)
    parent_comment_id: Optional[UUID] = None


class StreamPostCommentResponse(BaseSchema):
    """Comment response"""
    id: UUID
    post_id: UUID
    user_id: UUID
    user_name: str
    user_image_url: Optional[str] = None
    
    content: str
    is_pinned: bool
    is_hidden: bool
    like_count: int
    
    # Threading
    parent_comment_id: Optional[UUID] = None
    reply_count: int = 0
    
    # User actions
    is_liked: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_pin: bool = False
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Tip schemas
class StreamTipCreate(BaseModel):
    """Send a tip"""
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    message: Optional[str] = Field(None, max_length=500)
    is_anonymous: bool = False
    payment_method_id: str = Field(..., description="Stripe payment method ID")
    post_id: Optional[UUID] = None


class StreamTipResponse(BaseSchema):
    """Tip response"""
    id: UUID
    public_uuid: UUID
    stream_id: UUID
    post_id: Optional[UUID] = None
    
    # Amount
    amount: Decimal
    message: Optional[str] = None
    is_anonymous: bool
    
    # User info (if not anonymous)
    user_name: Optional[str] = None
    user_image_url: Optional[str] = None
    
    # Status
    status: TipStatus
    
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Analytics schemas
class StreamAnalyticsResponse(BaseModel):
    """Stream analytics data"""
    # Date range
    start_date: date
    end_date: date
    
    # Subscriber metrics
    total_subscribers: int
    new_subscribers: int
    churned_subscribers: int
    subscriber_growth_rate: float
    
    # Tier breakdown
    free_subscribers: int
    entry_subscribers: int  
    premium_subscribers: int
    
    # Content metrics
    posts_published: int
    total_views: int
    unique_viewers: int
    average_engagement_rate: float
    
    # Revenue metrics
    subscription_revenue: Decimal
    tips_revenue: Decimal
    total_revenue: Decimal
    commission_paid: Decimal
    net_revenue: Decimal
    
    # Top performing posts
    top_posts: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Daily breakdown
    daily_stats: List[Dict[str, Any]] = Field(default_factory=list)


# Search and discovery schemas
class StreamSearchFilters(BaseModel):
    """Filters for stream discovery"""
    category_ids: Optional[List[UUID]] = None
    tags: Optional[List[str]] = None
    tier_price_max: Optional[Decimal] = Field(None, ge=0)
    has_free_content: Optional[bool] = None
    is_featured: Optional[bool] = None
    sort_by: str = Field("subscriber_count", pattern="^(subscriber_count|created_at|total_revenue|post_count)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class StreamPostFilters(BaseModel):
    """Filters for stream posts"""
    post_type: Optional[PostType] = None
    tier_level: Optional[StreamTier] = None
    has_media: Optional[bool] = None
    tags: Optional[List[str]] = None
    published_after: Optional[datetime] = None
    published_before: Optional[datetime] = None
    sort_by: str = Field("published_at", pattern="^(published_at|view_count|like_count|comment_count)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


# List responses
class StreamListResponse(ListResponse):
    """Stream list response"""
    results: List[StreamResponse]


class StreamPostListResponse(ListResponse):
    """Stream post list response"""
    results: List[StreamPostResponse]


class StreamSubscriptionListResponse(ListResponse):
    """Subscription list response"""
    results: List[StreamSubscriptionResponse]


class StreamPostCommentListResponse(ListResponse):
    """Comment list response"""
    results: List[StreamPostCommentResponse]


class StreamTipListResponse(ListResponse):
    """Tip list response"""
    results: List[StreamTipResponse]


# Update forward references
StreamResponse.model_rebuild()
StreamSubscriptionResponse.model_rebuild()