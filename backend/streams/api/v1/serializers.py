from rest_framework import serializers
from django.utils import timezone
from django.db.models import Q, Count
from streams.models import (
    Stream, StreamPost, StreamPostMedia, StreamSubscription,
    StreamPostLike, StreamPostComment, StreamTip,
    StreamCategory, StreamAnalytics
)
from rooms.models import Room, RoomRecording
from practitioners.models import Practitioner
from users.models import User
# Use DRF serializers directly for now
class BaseSerializer(serializers.ModelSerializer):
    """Base serializer with common functionality."""
    pass


class StreamCategorySerializer(BaseSerializer):
    """Serializer for stream categories."""
    
    class Meta:
        model = StreamCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon',
            'is_active', 'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class StreamSerializer(BaseSerializer):
    """Serializer for content streams."""
    practitioner_name = serializers.CharField(source='practitioner.display_name', read_only=True)
    practitioner_id = serializers.IntegerField(source='practitioner.id', read_only=True)
    categories = StreamCategorySerializer(many=True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=StreamCategory.objects.all(),
        source='categories',
        write_only=True,
        required=False
    )
    is_subscribed = serializers.SerializerMethodField()
    subscription_tier = serializers.SerializerMethodField()
    
    class Meta:
        model = Stream
        fields = [
            'id', 'public_uuid', 'practitioner', 'practitioner_id', 'practitioner_name',
            'title', 'tagline', 'description', 'about',
            'cover_image_url', 'profile_image_url', 'intro_video_url',
            'categories', 'category_ids', 'tags',
            'free_tier_name', 'entry_tier_name', 'premium_tier_name',
            'entry_tier_price_cents', 'premium_tier_price_cents',
            'free_tier_description', 'entry_tier_description', 'premium_tier_description',
            'free_tier_perks', 'entry_tier_perks', 'premium_tier_perks',
            'is_active', 'is_featured', 'allow_comments', 'allow_dms', 'allow_tips',
            'preview_post_count', 'watermark_media',
            'subscriber_count', 'free_subscriber_count', 'paid_subscriber_count',
            'post_count', 'total_revenue_cents',
            'commission_rate', 'launched_at', 'is_launched',
            'is_subscribed', 'subscription_tier',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'public_uuid', 'practitioner', 'practitioner_id', 'practitioner_name',
            'subscriber_count', 'free_subscriber_count', 'paid_subscriber_count',
            'post_count', 'total_revenue_cents', 'is_launched',
            'created_at', 'updated_at'
        ]
    
    def get_is_subscribed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.subscriptions.filter(user=request.user, status='active').exists()
    
    def get_subscription_tier(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        subscription = obj.subscriptions.filter(user=request.user, status='active').first()
        return subscription.tier if subscription else None


class StreamAnalyticsSerializer(BaseSerializer):
    """Serializer for stream analytics (daily snapshots)."""
    stream_title = serializers.CharField(source='stream.title', read_only=True)
    
    class Meta:
        model = StreamAnalytics
        fields = [
            'id', 'stream', 'stream_title', 'date',
            'total_subscribers', 'free_subscribers', 'entry_subscribers', 'premium_subscribers',
            'new_subscribers', 'churned_subscribers', 'upgraded_subscribers', 'downgraded_subscribers',
            'posts_published', 'total_views', 'unique_viewers', 'total_likes', 'total_comments',
            'subscription_revenue_cents', 'tips_revenue_cents', 'total_revenue_cents',
            'commission_paid_cents', 'net_revenue_cents',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['stream_title', 'created_at', 'updated_at']


class RoomRecordingSerializer(BaseSerializer):
    """Serializer for room recordings."""
    room_name = serializers.CharField(source='room.name', read_only=True)
    live_stream = serializers.SerializerMethodField()
    
    class Meta:
        model = RoomRecording
        fields = [
            'id', 'room', 'room_name', 'recording_id', 'egress_id',
            'status', 'started_at', 'ended_at', 'duration_seconds', 'duration_formatted',
            'file_url', 'file_size_bytes', 'file_format',
            'storage_provider', 'storage_bucket', 'storage_key',
            'is_processed', 'processed_at', 'thumbnail_url',
            'is_public', 'access_expires_at',
            'metadata', 'live_stream',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'room_name', 'recording_id', 'egress_id', 'duration_formatted',
            'created_at', 'updated_at'
        ]
    
    def get_live_stream(self, obj):
        if hasattr(obj.room, 'live_stream'):
            return {
                'id': obj.room.live_stream.id,
                'title': obj.room.live_stream.title,
                'public_uuid': str(obj.room.live_stream.public_uuid)
            }
        return None


# Additional serializers for stream posts, subscriptions, etc.
class StreamPostMediaSerializer(BaseSerializer):
    """Serializer for stream post media."""
    url = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()
    
    class Meta:
        model = StreamPostMedia
        fields = [
            'id', 'file', 'media_type', 'url', 'filename',
            'file_size', 'content_type', 'duration_seconds',
            'width', 'height', 'order', 'caption', 'alt_text',
            'is_processed', 'processing_error',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'url', 'filename', 'file_size', 'content_type',
            'is_processed', 'processing_error', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'file': {'write_only': True}
        }
    
    def get_url(self, obj):
        """Get the file URL."""
        return obj.url
    
    def get_filename(self, obj):
        """Get the filename."""
        return obj.filename


class StreamPostSerializer(BaseSerializer):
    """Serializer for stream posts."""
    stream_title = serializers.CharField(source='stream.title', read_only=True)
    practitioner_name = serializers.CharField(source='stream.practitioner.display_name', read_only=True)
    practitioner_id = serializers.IntegerField(source='stream.practitioner.id', read_only=True)
    practitioner_image = serializers.CharField(source='stream.practitioner.profile_image_url', read_only=True)
    media = StreamPostMediaSerializer(many=True, read_only=True)
    can_access = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    
    class Meta:
        model = StreamPost
        fields = [
            'id', 'public_uuid', 'stream', 'stream_title',
            'practitioner_name', 'practitioner_id', 'practitioner_image',
            'title', 'content', 'post_type', 'tier_level',
            'teaser_text', 'blur_preview',
            'is_published', 'published_at', 'is_pinned', 'expires_at',
            'view_count', 'unique_view_count', 'like_count', 'comment_count', 'share_count',
            'allow_comments', 'allow_tips',
            'poll_options', 'poll_ends_at', 'poll_allows_multiple',
            'tags', 'media', 'can_access', 'is_liked', 'is_saved',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'public_uuid', 'stream_title', 'practitioner_name', 'practitioner_id', 'practitioner_image',
            'view_count', 'unique_view_count', 'like_count', 'comment_count', 'share_count',
            'created_at', 'updated_at'
        ]
    
    def get_can_access(self, obj):
        # Free content is accessible to everyone
        if obj.tier_level == 'free':
            return True
            
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        # Check if user is the stream owner
        if hasattr(request.user, 'practitioner_profile') and obj.stream.practitioner == request.user.practitioner_profile:
            return True
        
        subscription = obj.stream.subscriptions.filter(
            user=request.user,
            status='active'
        ).first()
        
        if not subscription:
            return False
        
        return obj.is_accessible_to_tier(subscription.tier)
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()
    
    def get_is_saved(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.saves.filter(user=request.user).exists()


class StreamPostCommentSerializer(BaseSerializer):
    """Serializer for stream post comments."""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_image = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = StreamPostComment
        fields = [
            'id', 'post', 'user', 'user_name', 'user_image',
            'content', 'parent_comment', 'replies',
            'is_pinned', 'is_hidden', 'is_reported',
            'like_count', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'user', 'user_name', 'user_image', 'replies',
            'is_pinned', 'is_hidden', 'is_reported',
            'like_count', 'created_at', 'updated_at'
        ]
    
    def get_user_image(self, obj):
        """Get user's profile image URL."""
        if hasattr(obj.user, 'profile') and obj.user.profile.avatar:
            return obj.user.profile.avatar.url
        return None
    
    def get_replies(self, obj):
        """Get nested replies if this is a parent comment."""
        if obj.parent_comment is None:
            replies = obj.replies.filter(is_hidden=False)
            return StreamPostCommentSerializer(replies, many=True, context=self.context).data
        return []


class StreamSubscriptionSerializer(BaseSerializer):
    """Serializer for stream subscriptions."""
    stream_title = serializers.CharField(source='stream.title', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = StreamSubscription
        fields = [
            'id', 'user', 'user_name', 'stream', 'stream_title',
            'tier', 'status',
            'started_at', 'current_period_start', 'current_period_end',
            'canceled_at', 'ends_at',
            'stripe_subscription_id', 'stripe_customer_id',
            'previous_tier', 'tier_changed_at',
            'last_viewed_at', 'total_tips_cents',
            'notify_new_posts', 'notify_live_streams',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'user_name', 'stream_title', 'stripe_subscription_id', 'stripe_customer_id',
            'created_at', 'updated_at'
        ]