from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from utils.models import BaseModel, PublicModel
import uuid
from datetime import timedelta

# Tier choices - fixed backend values
TIER_CHOICES = [
    ('free', 'Free'),
    ('entry', 'Entry'),
    ('premium', 'Premium'),
]

# Post type choices
POST_TYPE_CHOICES = [
    ('post', 'Text Post'),
    ('video', 'Video'),
    ('audio', 'Audio'),
    ('image', 'Image'),
    ('gallery', 'Image Gallery'),
    ('link', 'External Link'),
    ('poll', 'Poll'),
]

# Subscription status choices
SUBSCRIPTION_STATUS_CHOICES = [
    ('active', 'Active'),
    ('canceled', 'Canceled'),
    ('expired', 'Expired'),
    ('paused', 'Paused'),
    ('past_due', 'Past Due'),
]


class StreamCategory(BaseModel):
    """Categories for organizing streams"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = 'Stream Category'
        verbose_name_plural = 'Stream Categories'
        ordering = ['order', 'name']
    
    def __str__(self):
        return self.name


class Stream(PublicModel):
    """
    A practitioner's content stream (like OnlyFans/Patreon).
    One stream per practitioner.
    """
    # Core relationship
    practitioner = models.OneToOneField(
        'practitioners.Practitioner',
        on_delete=models.CASCADE,
        related_name='stream'
    )
    
    # Stream info
    title = models.CharField(max_length=255)
    tagline = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField()
    about = models.TextField(blank=True, null=True, help_text="Detailed about section")
    
    # Media
    cover_image_url = models.URLField(blank=True, null=True)
    profile_image_url = models.URLField(blank=True, null=True)
    intro_video_url = models.URLField(blank=True, null=True)
    
    # Categories and tags
    categories = models.ManyToManyField(StreamCategory, related_name='streams', blank=True)
    tags = models.JSONField(default=list, blank=True)
    
    # Tier naming (frontend display)
    free_tier_name = models.CharField(max_length=50, default="Free")
    entry_tier_name = models.CharField(max_length=50, default="Entry")
    premium_tier_name = models.CharField(max_length=50, default="Premium")
    
    # Tier pricing (in cents)
    entry_tier_price_cents = models.IntegerField(
        validators=[MinValueValidator(100)],  # Minimum $1
        help_text="Monthly price in cents for entry tier"
    )
    premium_tier_price_cents = models.IntegerField(
        validators=[MinValueValidator(100)],
        help_text="Monthly price in cents for premium tier"
    )
    
    # Tier descriptions
    free_tier_description = models.TextField(blank=True, null=True)
    entry_tier_description = models.TextField(blank=True, null=True)
    premium_tier_description = models.TextField(blank=True, null=True)
    
    # Tier perks (what each tier includes)
    free_tier_perks = models.JSONField(default=list, blank=True)
    entry_tier_perks = models.JSONField(default=list, blank=True)
    premium_tier_perks = models.JSONField(default=list, blank=True)
    
    # Settings
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    allow_comments = models.BooleanField(default=True)
    allow_dms = models.BooleanField(default=False)
    allow_tips = models.BooleanField(default=True)
    
    # Content settings
    preview_post_count = models.PositiveIntegerField(
        default=3,
        help_text="Number of posts non-subscribers can preview"
    )
    watermark_media = models.BooleanField(
        default=True,
        help_text="Add watermark to media for lower tiers"
    )
    
    # Stats (denormalized for performance)
    subscriber_count = models.PositiveIntegerField(default=0)
    free_subscriber_count = models.PositiveIntegerField(default=0)
    paid_subscriber_count = models.PositiveIntegerField(default=0)
    post_count = models.PositiveIntegerField(default=0)
    total_revenue_cents = models.BigIntegerField(default=0)
    
    # Monetization
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20.00,
        help_text="Platform commission percentage"
    )
    
    # Stripe integration fields
    stripe_product_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Stripe Product ID for this stream"
    )
    stripe_entry_price_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Stripe Price ID for entry tier monthly subscription"
    )
    stripe_premium_price_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Stripe Price ID for premium tier monthly subscription"
    )
    
    # Launch date
    launched_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Stream'
        verbose_name_plural = 'Streams'
        indexes = [
            models.Index(fields=['is_active', 'is_featured']),
            models.Index(fields=['practitioner']),
        ]
    
    def __str__(self):
        return f"{self.practitioner.display_name}'s Stream: {self.title}"
    
    @property
    def is_launched(self):
        """Check if stream has been launched"""
        return self.launched_at is not None and self.launched_at <= timezone.now()
    
    def get_tier_price_cents(self, tier):
        """Get price for a specific tier"""
        if tier == 'free':
            return 0
        elif tier == 'entry':
            return self.entry_tier_price_cents
        elif tier == 'premium':
            return self.premium_tier_price_cents
        return 0
    
    def get_tier_name(self, tier):
        """Get display name for a specific tier"""
        if tier == 'free':
            return self.free_tier_name
        elif tier == 'entry':
            return self.entry_tier_name
        elif tier == 'premium':
            return self.premium_tier_name
        return tier


class StreamPost(PublicModel):
    """Individual content post in a stream"""
    stream = models.ForeignKey(
        Stream,
        on_delete=models.CASCADE,
        related_name='posts'
    )
    
    # Content
    title = models.CharField(max_length=255, blank=True, null=True)
    content = models.TextField(help_text="Main text content with rich formatting")
    post_type = models.CharField(max_length=20, choices=POST_TYPE_CHOICES)
    
    # Access control
    tier_level = models.CharField(
        max_length=20,
        choices=TIER_CHOICES,
        help_text="Minimum tier required to view this post"
    )
    
    # Teaser for lower tiers
    teaser_text = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Preview text shown to users below required tier"
    )
    blur_preview = models.BooleanField(
        default=True,
        help_text="Show blurred preview to lower tiers"
    )
    
    # Scheduling and visibility
    is_published = models.BooleanField(default=True)
    published_at = models.DateTimeField(default=timezone.now)
    is_pinned = models.BooleanField(default=False)
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When post becomes unavailable"
    )
    
    # Engagement stats
    view_count = models.PositiveIntegerField(default=0)
    unique_view_count = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    share_count = models.PositiveIntegerField(default=0)
    
    # Settings
    allow_comments = models.BooleanField(default=True)
    allow_tips = models.BooleanField(default=True)
    
    # Poll specific fields
    poll_options = models.JSONField(
        blank=True,
        null=True,
        help_text="List of poll options with votes"
    )
    poll_ends_at = models.DateTimeField(blank=True, null=True)
    poll_allows_multiple = models.BooleanField(default=False)
    
    # Tags
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        verbose_name = 'Stream Post'
        verbose_name_plural = 'Stream Posts'
        ordering = ['-is_pinned', '-published_at']
        indexes = [
            models.Index(fields=['stream', 'is_published', '-published_at']),
            models.Index(fields=['tier_level']),
            models.Index(fields=['post_type']),
            models.Index(fields=['published_at']),
        ]
    
    def __str__(self):
        return f"{self.stream.title} - {self.title or f'Post {self.id}'}"
    
    def is_accessible_to_tier(self, user_tier):
        """Check if post is accessible to a given tier"""
        tier_hierarchy = {'free': 0, 'entry': 1, 'premium': 2}
        required_level = tier_hierarchy.get(self.tier_level, 0)
        user_level = tier_hierarchy.get(user_tier, 0)
        return user_level >= required_level


class StreamPostMedia(BaseModel):
    """Media attachments for stream posts"""
    post = models.ForeignKey(
        StreamPost,
        on_delete=models.CASCADE,
        related_name='media'
    )
    
    # Media info
    media_type = models.CharField(max_length=20, choices=[
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('document', 'Document'),
    ])
    media_url = models.URLField()
    thumbnail_url = models.URLField(blank=True, null=True)
    
    # Metadata
    filename = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.IntegerField(blank=True, null=True)
    duration_seconds = models.IntegerField(blank=True, null=True)
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    
    # Organization
    order = models.PositiveIntegerField(default=0)
    caption = models.TextField(blank=True, null=True)
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    
    # Processing status
    is_processed = models.BooleanField(default=False)
    processing_error = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['post', 'media_type']),
        ]
    
    def __str__(self):
        return f"{self.media_type} for {self.post}"


class StreamSubscription(BaseModel):
    """User subscription to a stream"""
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='stream_subscriptions'
    )
    stream = models.ForeignKey(
        Stream,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    
    # Subscription details
    tier = models.CharField(max_length=20, choices=TIER_CHOICES)
    status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='active'
    )
    
    # Billing periods
    started_at = models.DateTimeField(default=timezone.now)
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    canceled_at = models.DateTimeField(blank=True, null=True)
    ends_at = models.DateTimeField(blank=True, null=True)
    
    # Payment info
    stripe_subscription_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_price_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="The Stripe Price ID this subscription is using"
    )
    price_cents = models.IntegerField(
        default=0,
        help_text="The actual price being paid monthly (captures price at subscription time)"
    )
    
    # Subscription history
    previous_tier = models.CharField(
        max_length=20,
        choices=TIER_CHOICES,
        blank=True,
        null=True
    )
    tier_changed_at = models.DateTimeField(blank=True, null=True)
    
    # Engagement tracking
    last_viewed_at = models.DateTimeField(blank=True, null=True)
    total_tips_cents = models.IntegerField(default=0)
    
    # Notifications
    notify_new_posts = models.BooleanField(default=True)
    notify_live_streams = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Stream Subscription'
        verbose_name_plural = 'Stream Subscriptions'
        unique_together = ['user', 'stream']
        indexes = [
            models.Index(fields=['stream', 'tier', 'status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['current_period_end']),
            models.Index(fields=['stripe_subscription_id']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.stream.title} ({self.tier})"
    
    def has_access_to_tier(self, required_tier):
        """Check if subscription has access to a specific tier"""
        if self.status != 'active':
            return False
        tier_hierarchy = {'free': 0, 'entry': 1, 'premium': 2}
        user_level = tier_hierarchy.get(self.tier, 0)
        required_level = tier_hierarchy.get(required_tier, 0)
        return user_level >= required_level


class StreamPostLike(BaseModel):
    """Track post likes"""
    post = models.ForeignKey(
        StreamPost,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='stream_post_likes'
    )
    
    class Meta:
        unique_together = ['post', 'user']
        indexes = [
            models.Index(fields=['post', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user} likes {self.post}"


class StreamPostComment(BaseModel):
    """Comments on stream posts"""
    post = models.ForeignKey(
        StreamPost,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='stream_comments'
    )
    
    # Comment content
    content = models.TextField()
    
    # Threading
    parent_comment = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    
    # Moderation
    is_pinned = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=False)
    is_reported = models.BooleanField(default=False)
    
    # Engagement
    like_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['post', 'is_hidden', '-created_at']),
            models.Index(fields=['parent_comment']),
        ]
    
    def __str__(self):
        return f"Comment by {self.user} on {self.post}"


class StreamPostView(BaseModel):
    """Track post views for analytics"""
    post = models.ForeignKey(
        StreamPost,
        on_delete=models.CASCADE,
        related_name='views'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    # View details
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    referrer = models.URLField(blank=True, null=True)
    
    # View duration
    duration_seconds = models.IntegerField(default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=['post', 'user']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"View of {self.post} by {self.user or 'Anonymous'}"


class StreamTip(PublicModel):
    """Tips/donations on streams or posts"""
    # Who and where
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='stream_tips_sent'
    )
    stream = models.ForeignKey(
        Stream,
        on_delete=models.CASCADE,
        related_name='tips'
    )
    post = models.ForeignKey(
        StreamPost,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tips'
    )
    
    # Amount
    amount_cents = models.IntegerField(validators=[MinValueValidator(100)])
    
    # Message
    message = models.TextField(blank=True, null=True)
    is_anonymous = models.BooleanField(default=False)
    
    # Payment
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ], default='pending')
    
    # Commission
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Platform commission percentage at time of tip"
    )
    commission_amount_cents = models.IntegerField()
    net_amount_cents = models.IntegerField()
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stream', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"${self.amount_cents/100} tip from {self.user}"


class StreamAnalytics(BaseModel):
    """Daily analytics snapshots for streams"""
    stream = models.ForeignKey(
        Stream,
        on_delete=models.CASCADE,
        related_name='analytics'
    )
    date = models.DateField()
    
    # Subscriber metrics
    total_subscribers = models.IntegerField(default=0)
    free_subscribers = models.IntegerField(default=0)
    entry_subscribers = models.IntegerField(default=0)
    premium_subscribers = models.IntegerField(default=0)
    
    # Growth metrics
    new_subscribers = models.IntegerField(default=0)
    churned_subscribers = models.IntegerField(default=0)
    upgraded_subscribers = models.IntegerField(default=0)
    downgraded_subscribers = models.IntegerField(default=0)
    
    # Content metrics
    posts_published = models.IntegerField(default=0)
    total_views = models.IntegerField(default=0)
    unique_viewers = models.IntegerField(default=0)
    total_likes = models.IntegerField(default=0)
    total_comments = models.IntegerField(default=0)
    
    # Revenue metrics (in cents)
    subscription_revenue_cents = models.IntegerField(default=0)
    tips_revenue_cents = models.IntegerField(default=0)
    total_revenue_cents = models.IntegerField(default=0)
    commission_paid_cents = models.IntegerField(default=0)
    net_revenue_cents = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['stream', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['stream', '-date']),
        ]
    
    def __str__(self):
        return f"{self.stream.title} - {self.date}"


# Live streaming models
LIVE_STREAM_STATUS_CHOICES = [
    ('scheduled', 'Scheduled'),
    ('live', 'Live'),
    ('ended', 'Ended'),
    ('cancelled', 'Cancelled'),
]


class LiveStream(PublicModel):
    """
    Model for live streaming sessions using LiveKit.
    Connects streams (content) with rooms (video infrastructure).
    """
    # Core relationships
    stream = models.ForeignKey(
        Stream,
        on_delete=models.CASCADE,
        related_name='live_streams'
    )
    room = models.OneToOneField(
        'rooms.Room',
        on_delete=models.CASCADE,
        related_name='live_stream',
        null=True,
        blank=True
    )
    practitioner = models.ForeignKey(
        'practitioners.Practitioner',
        on_delete=models.CASCADE,
        related_name='live_streams'
    )
    
    # Stream info
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=LIVE_STREAM_STATUS_CHOICES,
        default='scheduled'
    )
    
    # Access control
    tier_level = models.CharField(
        max_length=20,
        choices=TIER_CHOICES,
        default='free',
        help_text="Minimum tier required to view this live stream"
    )
    is_public = models.BooleanField(
        default=False,
        help_text="Whether non-subscribers can view"
    )
    
    # Scheduling
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    
    # Stream settings
    allow_chat = models.BooleanField(default=True)
    allow_reactions = models.BooleanField(default=True)
    record_stream = models.BooleanField(default=True)
    
    # Viewer metrics
    current_viewers = models.IntegerField(default=0)
    peak_viewers = models.IntegerField(default=0)
    total_viewers = models.IntegerField(default=0)
    unique_viewers = models.IntegerField(default=0)
    
    # Engagement metrics
    chat_message_count = models.IntegerField(default=0)
    reaction_count = models.IntegerField(default=0)
    
    # Metadata
    thumbnail_url = models.URLField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ['-scheduled_start']
        indexes = [
            models.Index(fields=['stream', 'status']),
            models.Index(fields=['practitioner', 'status']),
            models.Index(fields=['scheduled_start']),
            models.Index(fields=['status', '-scheduled_start']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"
    
    @property
    def is_live(self):
        return self.status == 'live'
    
    @property
    def can_start(self):
        """Check if stream can be started."""
        if self.status != 'scheduled':
            return False
        # Allow starting 15 minutes before scheduled time
        buffer_time = self.scheduled_start - timedelta(minutes=15)
        return timezone.now() >= buffer_time
    
    @property
    def duration_minutes(self):
        """Get stream duration in minutes."""
        if self.actual_start and self.actual_end:
            return int((self.actual_end - self.actual_start).total_seconds() / 60)
        elif self.scheduled_start and self.scheduled_end:
            return int((self.scheduled_end - self.scheduled_start).total_seconds() / 60)
        return 0


class StreamSchedule(BaseModel):
    """
    Recurring schedule for live streams.
    """
    stream = models.ForeignKey(
        Stream,
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    
    # Schedule info
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Recurrence pattern
    recurrence_rule = models.CharField(
        max_length=500,
        help_text="RRULE format for recurrence"
    )
    duration_minutes = models.IntegerField(default=60)
    
    # Access control
    tier_level = models.CharField(
        max_length=20,
        choices=TIER_CHOICES,
        default='free'
    )
    
    # Settings
    is_active = models.BooleanField(default=True)
    auto_create_days_ahead = models.IntegerField(
        default=7,
        help_text="Days ahead to auto-create scheduled streams"
    )
    
    # Next occurrence tracking
    next_occurrence = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['stream', 'title']
        indexes = [
            models.Index(fields=['stream', 'is_active']),
            models.Index(fields=['next_occurrence']),
        ]
    
    def __str__(self):
        return f"{self.stream.title} - {self.title}"


class LiveStreamViewer(BaseModel):
    """
    Track live stream viewers and their engagement.
    """
    live_stream = models.ForeignKey(
        LiveStream,
        on_delete=models.CASCADE,
        related_name='viewers'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='live_stream_views'
    )
    
    # Viewing session
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    
    # Engagement
    chat_messages_sent = models.IntegerField(default=0)
    reactions_sent = models.IntegerField(default=0)
    
    # Connection info
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['live_stream', 'user', 'joined_at']
        indexes = [
            models.Index(fields=['live_stream', 'joined_at']),
            models.Index(fields=['user', 'joined_at']),
        ]
    
    def __str__(self):
        return f"{self.user} viewing {self.live_stream}"
    
    def save(self, *args, **kwargs):
        # Calculate duration if left
        if self.left_at and self.joined_at:
            self.duration_seconds = int((self.left_at - self.joined_at).total_seconds())
        super().save(*args, **kwargs)


class LiveStreamAnalytics(BaseModel):
    """
    Analytics for individual live streams.
    """
    live_stream = models.OneToOneField(
        LiveStream,
        on_delete=models.CASCADE,
        related_name='analytics'
    )
    
    # Viewer metrics
    total_viewers = models.IntegerField(default=0)
    unique_viewers = models.IntegerField(default=0)
    peak_concurrent_viewers = models.IntegerField(default=0)
    average_view_duration_seconds = models.IntegerField(default=0)
    
    # Engagement metrics
    total_chat_messages = models.IntegerField(default=0)
    total_reactions = models.IntegerField(default=0)
    unique_chatters = models.IntegerField(default=0)
    
    # Viewer breakdown by tier
    free_tier_viewers = models.IntegerField(default=0)
    entry_tier_viewers = models.IntegerField(default=0)
    premium_tier_viewers = models.IntegerField(default=0)
    non_subscriber_viewers = models.IntegerField(default=0)
    
    # Geographic data (simplified)
    viewer_countries = models.JSONField(
        default=dict,
        blank=True,
        help_text="Country code -> viewer count mapping"
    )
    
    # Device/platform data
    viewer_devices = models.JSONField(
        default=dict,
        blank=True,
        help_text="Device type -> viewer count mapping"
    )
    
    # Revenue generated
    tips_received_cents = models.IntegerField(default=0)
    
    # Computed at stream end
    computed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['live_stream']),
        ]
    
    def __str__(self):
        return f"Analytics for {self.live_stream.title}"