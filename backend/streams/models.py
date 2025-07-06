from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from utils.models import BaseModel, PublicModel
import uuid

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
    
    # Direct file storage
    file = models.FileField(
        upload_to='streams/posts/%Y/%m/%d/',
        max_length=500,
        help_text="File stored in CloudFlare R2"
    )
    
    # Media info
    media_type = models.CharField(max_length=20, choices=[
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('document', 'Document'),
    ])
    
    # Cached metadata (populated on save)
    file_size = models.PositiveBigIntegerField(default=0)
    content_type = models.CharField(max_length=100, blank=True)
    duration_seconds = models.IntegerField(blank=True, null=True)
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    
    # Organization
    order = models.PositiveIntegerField(default=0)
    caption = models.TextField(blank=True, null=True)
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    
    # Processing status (for future video encoding, etc)
    is_processed = models.BooleanField(default=True)  # Default True for simple uploads
    processing_error = models.TextField(blank=True, null=True)
    
    @property
    def url(self):
        """Get the file URL."""
        return self.file.url if self.file else None
    
    @property
    def filename(self):
        """Get the filename."""
        return self.file.name.split('/')[-1] if self.file else None
    
    def save(self, *args, **kwargs):
        """Auto-populate metadata on save."""
        if self.file and not self.file_size:
            self.file_size = self.file.size
        
        # Auto-detect media type from content type if not set
        if self.file and not self.media_type:
            # This will be set from the view based on content_type
            pass
            
        super().save(*args, **kwargs)
    
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


class StreamPostSave(BaseModel):
    """Saved/bookmarked stream posts"""
    post = models.ForeignKey(
        StreamPost,
        on_delete=models.CASCADE,
        related_name='saves'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='saved_stream_posts'
    )
    
    class Meta:
        unique_together = ['post', 'user']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['post']),
        ]
    
    def __str__(self):
        return f"{self.user} saved {self.post}"


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


