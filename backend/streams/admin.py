from django.contrib import admin
from django.utils.html import format_html
from .models import (
    StreamCategory, Stream, StreamPost, StreamPostMedia,
    StreamSubscription, StreamPostLike, StreamPostComment,
    StreamPostView, StreamTip, StreamAnalytics
)


@admin.register(StreamCategory)
class StreamCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'order']
    list_filter = ['is_active']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


class StreamPostMediaInline(admin.TabularInline):
    model = StreamPostMedia
    extra = 0
    fields = ['media_type', 'media_url', 'order', 'caption']


@admin.register(Stream)
class StreamAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'practitioner', 'subscriber_count', 
        'post_count', 'is_active', 'is_featured'
    ]
    list_filter = ['is_active', 'is_featured', 'categories']
    search_fields = ['title', 'practitioner__user__email']
    filter_horizontal = ['categories']
    readonly_fields = [
        'subscriber_count', 'free_subscriber_count', 
        'paid_subscriber_count', 'post_count', 'total_revenue_cents'
    ]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('practitioner', 'title', 'tagline', 'description', 'about')
        }),
        ('Media', {
            'fields': ('cover_image_url', 'profile_image_url', 'intro_video_url')
        }),
        ('Categories & Tags', {
            'fields': ('categories', 'tags')
        }),
        ('Tier Configuration', {
            'fields': (
                ('free_tier_name', 'free_tier_description', 'free_tier_perks'),
                ('entry_tier_name', 'entry_tier_price_cents', 
                 'entry_tier_description', 'entry_tier_perks'),
                ('premium_tier_name', 'premium_tier_price_cents', 
                 'premium_tier_description', 'premium_tier_perks'),
            )
        }),
        ('Settings', {
            'fields': (
                'is_active', 'is_featured', 'allow_comments', 
                'allow_dms', 'allow_tips', 'preview_post_count',
                'watermark_media', 'commission_rate'
            )
        }),
        ('Stats', {
            'fields': (
                'subscriber_count', 'free_subscriber_count',
                'paid_subscriber_count', 'post_count', 'total_revenue_cents'
            ),
            'classes': ('collapse',)
        }),
        ('Launch', {
            'fields': ('launched_at',)
        }),
    )


@admin.register(StreamPost)
class StreamPostAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'stream', 'post_type', 'tier_level',
        'is_published', 'published_at', 'view_count', 'like_count'
    ]
    list_filter = [
        'post_type', 'tier_level', 'is_published', 
        'is_pinned', 'published_at'
    ]
    search_fields = ['title', 'content', 'stream__title']
    date_hierarchy = 'published_at'
    inlines = [StreamPostMediaInline]
    readonly_fields = [
        'view_count', 'unique_view_count', 'like_count', 
        'comment_count', 'share_count'
    ]


@admin.register(StreamSubscription)
class StreamSubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'stream', 'tier', 'status',
        'current_period_start', 'current_period_end'
    ]
    list_filter = ['tier', 'status', 'started_at']
    search_fields = [
        'user__email', 'stream__title', 
        'stripe_subscription_id'
    ]
    date_hierarchy = 'started_at'
    readonly_fields = ['stripe_subscription_id', 'stripe_customer_id']


@admin.register(StreamTip)
class StreamTipAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'stream', 'amount_display', 
        'status', 'created_at'
    ]
    list_filter = ['status', 'is_anonymous', 'created_at']
    search_fields = ['user__email', 'stream__title', 'message']
    readonly_fields = [
        'stripe_payment_intent_id', 'commission_amount_cents',
        'net_amount_cents'
    ]
    
    def amount_display(self, obj):
        return f"${obj.amount_cents / 100:.2f}"
    amount_display.short_description = 'Amount'


@admin.register(StreamAnalytics)
class StreamAnalyticsAdmin(admin.ModelAdmin):
    list_display = [
        'stream', 'date', 'total_subscribers',
        'posts_published', 'total_revenue_display'
    ]
    list_filter = ['date']
    search_fields = ['stream__title']
    date_hierarchy = 'date'
    
    def total_revenue_display(self, obj):
        return f"${obj.total_revenue_cents / 100:.2f}"
    total_revenue_display.short_description = 'Total Revenue'