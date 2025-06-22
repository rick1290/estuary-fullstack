from rest_framework import serializers
from django.utils import timezone
from django.db.models import Q, Count
from streams.models import (
    Stream, StreamPost, StreamPostMedia, StreamSubscription,
    StreamPostLike, StreamPostComment, StreamTip,
    LiveStream, StreamSchedule, LiveStreamViewer, LiveStreamAnalytics,
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


class LiveStreamSerializer(BaseSerializer):
    """Serializer for live streaming sessions."""
    stream_title = serializers.CharField(source='stream.title', read_only=True)
    practitioner_name = serializers.CharField(source='practitioner.display_name', read_only=True)
    room_details = serializers.SerializerMethodField()
    can_access = serializers.SerializerMethodField()
    join_url = serializers.SerializerMethodField()
    is_host = serializers.SerializerMethodField()
    viewer_count = serializers.IntegerField(source='current_viewers', read_only=True)
    
    class Meta:
        model = LiveStream
        fields = [
            'id', 'public_uuid', 'stream', 'stream_title', 'room', 'room_details',
            'practitioner', 'practitioner_name',
            'title', 'description', 'status', 'tier_level', 'is_public',
            'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
            'allow_chat', 'allow_reactions', 'record_stream',
            'current_viewers', 'peak_viewers', 'total_viewers', 'unique_viewers',
            'chat_message_count', 'reaction_count',
            'thumbnail_url', 'tags',
            'is_live', 'can_start', 'duration_minutes',
            'can_access', 'join_url', 'is_host', 'viewer_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'public_uuid', 'stream_title', 'practitioner_name', 'room',
            'current_viewers', 'peak_viewers', 'total_viewers', 'unique_viewers',
            'chat_message_count', 'reaction_count',
            'actual_start', 'actual_end', 'is_live', 'can_start', 'duration_minutes',
            'created_at', 'updated_at'
        ]
    
    def get_room_details(self, obj):
        if not obj.room:
            return None
        return {
            'id': obj.room.id,
            'name': obj.room.name,
            'status': obj.room.status,
            'livekit_room_name': obj.room.livekit_room_name
        }
    
    def get_can_access(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.is_public
        
        # Check if user is the practitioner
        if hasattr(request.user, 'practitioner') and request.user.practitioner == obj.practitioner:
            return True
        
        # Check subscription tier
        if obj.is_public:
            return True
        
        subscription = obj.stream.subscriptions.filter(
            user=request.user,
            status='active'
        ).first()
        
        if not subscription:
            return False
        
        return subscription.has_access_to_tier(obj.tier_level)
    
    def get_join_url(self, obj):
        if not self.get_can_access(obj) or not obj.room:
            return None
        
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.room.get_join_url(participant_name=request.user.get_full_name())
        return None
    
    def get_is_host(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'practitioner') and request.user.practitioner == obj.practitioner


class LiveStreamCreateSerializer(BaseSerializer):
    """Serializer for creating live streams."""
    
    class Meta:
        model = LiveStream
        fields = [
            'stream', 'title', 'description', 'tier_level', 'is_public',
            'scheduled_start', 'scheduled_end',
            'allow_chat', 'allow_reactions', 'record_stream',
            'thumbnail_url', 'tags'
        ]
    
    def validate(self, attrs):
        # Ensure scheduled_end is after scheduled_start
        if attrs['scheduled_end'] <= attrs['scheduled_start']:
            raise serializers.ValidationError("Scheduled end must be after scheduled start")
        
        # Ensure stream belongs to the practitioner
        request = self.context.get('request')
        if request and hasattr(request.user, 'practitioner'):
            if attrs['stream'].practitioner != request.user.practitioner:
                raise serializers.ValidationError("You can only create live streams for your own stream")
        
        return attrs
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['practitioner'] = request.user.practitioner
        return super().create(validated_data)


class StreamScheduleSerializer(BaseSerializer):
    """Serializer for stream schedules."""
    stream_title = serializers.CharField(source='stream.title', read_only=True)
    upcoming_streams = serializers.SerializerMethodField()
    
    class Meta:
        model = StreamSchedule
        fields = [
            'id', 'stream', 'stream_title', 'title', 'description',
            'recurrence_rule', 'duration_minutes', 'tier_level',
            'is_active', 'auto_create_days_ahead', 'next_occurrence',
            'upcoming_streams', 'created_at', 'updated_at'
        ]
        read_only_fields = ['stream_title', 'next_occurrence', 'created_at', 'updated_at']
    
    def get_upcoming_streams(self, obj):
        # Get next 5 scheduled live streams from this schedule
        upcoming = obj.stream.live_streams.filter(
            status='scheduled',
            scheduled_start__gte=timezone.now()
        ).order_by('scheduled_start')[:5]
        
        return [{
            'id': stream.id,
            'title': stream.title,
            'scheduled_start': stream.scheduled_start,
            'scheduled_end': stream.scheduled_end
        } for stream in upcoming]


class LiveStreamViewerSerializer(BaseSerializer):
    """Serializer for live stream viewers."""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_avatar = serializers.CharField(source='user.avatar_url', read_only=True)
    
    class Meta:
        model = LiveStreamViewer
        fields = [
            'id', 'live_stream', 'user', 'user_name', 'user_avatar',
            'joined_at', 'left_at', 'duration_seconds',
            'chat_messages_sent', 'reactions_sent',
            'created_at'
        ]
        read_only_fields = ['user_name', 'user_avatar', 'created_at']


class LiveStreamAnalyticsSerializer(BaseSerializer):
    """Serializer for live stream analytics."""
    stream_title = serializers.CharField(source='live_stream.title', read_only=True)
    
    class Meta:
        model = LiveStreamAnalytics
        fields = [
            'id', 'live_stream', 'stream_title',
            'total_viewers', 'unique_viewers', 'peak_concurrent_viewers',
            'average_view_duration_seconds',
            'total_chat_messages', 'total_reactions', 'unique_chatters',
            'free_tier_viewers', 'entry_tier_viewers', 'premium_tier_viewers',
            'non_subscriber_viewers',
            'viewer_countries', 'viewer_devices',
            'tips_received_cents',
            'computed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['stream_title', 'created_at', 'updated_at']


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
    
    class Meta:
        model = StreamPostMedia
        fields = [
            'id', 'media_type', 'media_url', 'thumbnail_url',
            'filename', 'file_size', 'duration_seconds',
            'width', 'height', 'order', 'caption', 'alt_text',
            'is_processed', 'processing_error',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['is_processed', 'processing_error', 'created_at', 'updated_at']


class StreamPostSerializer(BaseSerializer):
    """Serializer for stream posts."""
    stream_title = serializers.CharField(source='stream.title', read_only=True)
    media = StreamPostMediaSerializer(many=True, read_only=True)
    can_access = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    
    class Meta:
        model = StreamPost
        fields = [
            'id', 'public_uuid', 'stream', 'stream_title',
            'title', 'content', 'post_type', 'tier_level',
            'teaser_text', 'blur_preview',
            'is_published', 'published_at', 'is_pinned', 'expires_at',
            'view_count', 'unique_view_count', 'like_count', 'comment_count', 'share_count',
            'allow_comments', 'allow_tips',
            'poll_options', 'poll_ends_at', 'poll_allows_multiple',
            'tags', 'media', 'can_access', 'is_liked',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'public_uuid', 'stream_title',
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