"""
Streams router for FastAPI
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta, date
from decimal import Decimal
from django.db import transaction
from django.db.models import Count, Q, Sum, F, Exists, OuterRef, Prefetch
from django.utils import timezone
from django.shortcuts import get_object_or_404
from asgiref.sync import sync_to_async

from streams.models import (
    Stream, StreamPost, StreamPostMedia, StreamSubscription, StreamPostLike,
    StreamPostComment, StreamTip, StreamAnalytics, StreamCategory, StreamPostView
)
from media.models import Media
from users.models import User
from practitioners.models import Practitioner

from ..schemas.streams import (
    # Stream schemas
    StreamCreate, StreamUpdate, StreamResponse, StreamListResponse,
    StreamTierInfo, StreamCategoryResponse,
    # Post schemas
    StreamPostCreate, StreamPostUpdate, StreamPostResponse, StreamPostListResponse,
    StreamPostMediaResponse, StreamPostFilters,
    # Subscription schemas
    StreamSubscriptionCreate, StreamSubscriptionUpdate, StreamSubscriptionResponse,
    StreamSubscriptionListResponse,
    # Comment schemas
    StreamPostCommentCreate, StreamPostCommentResponse, StreamPostCommentListResponse,
    # Tip schemas
    StreamTipCreate, StreamTipResponse, StreamTipListResponse,
    # Analytics schemas
    StreamAnalyticsResponse,
    # Search schemas
    StreamSearchFilters,
    # Enums
    StreamTier, PostType, SubscriptionStatus, TipStatus
)
from api.dependencies import PaginationParams, get_current_user, get_current_practitioner, get_current_superuser
from ..utils import paginate_queryset

from integrations.stripe.client import stripe_client

router = APIRouter()


@sync_to_async
def get_user_subscription_tier(user: Optional[User], stream: Stream) -> Optional[str]:
    """Get user's subscription tier for a stream"""
    if not user:
        return None
    
    subscription = StreamSubscription.objects.filter(
        user=user,
        stream=stream,
        status='active'
    ).first()
    
    return subscription.tier if subscription else None


def serialize_stream_tier_info(stream: Stream, tier: str, current_tier: Optional[str] = None) -> StreamTierInfo:
    """Serialize tier information"""
    return StreamTierInfo(
        tier=tier,
        name=stream.get_tier_name(tier),
        price_cents=stream.get_tier_price_cents(tier),
        price_display=f"${stream.get_tier_price_cents(tier)/100:.2f}" if stream.get_tier_price_cents(tier) > 0 else "Free",
        description=getattr(stream, f'{tier}_tier_description', None),
        perks=getattr(stream, f'{tier}_tier_perks', []),
        is_current_tier=tier == current_tier
    )


async def serialize_stream(stream: Stream, current_user: Optional[User] = None) -> StreamResponse:
    """Serialize stream for API response"""
    # Get categories - sync operation
    @sync_to_async
    def get_categories():
        return [
            StreamCategoryResponse.model_validate(cat) 
            for cat in stream.categories.filter(is_active=True)
        ]
    
    categories = await get_categories()
    
    # Get user's subscription - sync operation  
    @sync_to_async
    def get_user_subscription():
        if not current_user:
            return None, None
        subscription = StreamSubscription.objects.filter(
            user=current_user,
            stream=stream,
            status='active'
        ).first()
        if subscription:
            return StreamSubscriptionResponse.model_validate(subscription), subscription.tier
        return None, None
    
    current_subscription, user_tier = await get_user_subscription()
    
    # Build tier information
    tiers = [
        serialize_stream_tier_info(stream, 'free', user_tier),
        serialize_stream_tier_info(stream, 'entry', user_tier),
        serialize_stream_tier_info(stream, 'premium', user_tier),
    ]
    
    # Check if user can manage stream
    can_manage = current_user and hasattr(current_user, 'practitioner_profile') and \
                current_user.practitioner_profile == stream.practitioner
    
    return StreamResponse(
        id=stream.id,
        public_uuid=stream.public_uuid,
        practitioner_id=stream.practitioner.id,
        practitioner_name=stream.practitioner.display_name,
        practitioner_image_url=getattr(stream.practitioner, 'profile_image_url', None),
        title=stream.title,
        tagline=stream.tagline,
        description=stream.description,
        about=stream.about,
        cover_image_url=stream.cover_image_url,
        profile_image_url=stream.profile_image_url,
        intro_video_url=stream.intro_video_url,
        categories=categories,
        tags=stream.tags,
        tiers=tiers,
        subscriber_count=stream.subscriber_count,
        free_subscriber_count=stream.free_subscriber_count,
        paid_subscriber_count=stream.paid_subscriber_count,
        post_count=stream.post_count,
        total_revenue=Decimal(stream.total_revenue_cents) / 100,
        is_active=stream.is_active,
        is_featured=stream.is_featured,
        is_launched=stream.is_launched,
        allow_comments=stream.allow_comments,
        allow_dms=stream.allow_dms,
        allow_tips=stream.allow_tips,
        preview_post_count=stream.preview_post_count,
        watermark_media=stream.watermark_media,
        launched_at=stream.launched_at,
        created_at=stream.created_at,
        updated_at=stream.updated_at,
        current_subscription=current_subscription,
        can_manage=can_manage
    )


async def serialize_stream_post(post: StreamPost, current_user: Optional[User] = None) -> StreamPostResponse:
    """Serialize stream post for API response"""
    
    # Get user's tier for access control - sync operation
    @sync_to_async
    def get_user_tier():
        if not current_user:
            return 'free'
        subscription = StreamSubscription.objects.filter(
            user=current_user,
            stream=post.stream,
            status='active'
        ).first()
        return subscription.tier if subscription else 'free'
    
    user_tier = await get_user_tier()
    has_access = post.is_accessible_to_tier(user_tier)
    
    # Get media - sync operation
    @sync_to_async
    def get_media():
        return [
            StreamPostMediaResponse.model_validate(m) 
            for m in post.media.all().order_by('order')
        ]
    
    media = await get_media()
    
    # Check if user liked the post - sync operation
    @sync_to_async
    def check_if_liked():
        if not current_user:
            return False
        return StreamPostLike.objects.filter(post=post, user=current_user).exists()
    
    is_liked = await check_if_liked()
    
    # Check permissions
    can_edit = current_user and hasattr(current_user, 'practitioner_profile') and \
              current_user.practitioner_profile == post.stream.practitioner
    can_delete = can_edit
    
    # Get poll user votes if applicable
    poll_user_votes = []
    if post.post_type == 'poll' and current_user and post.poll_options:
        # TODO: Implement poll voting tracking
        pass
    
    return StreamPostResponse(
        id=post.id,
        public_uuid=post.public_uuid,
        stream_id=post.stream_id,
        stream_title=post.stream.title,
        title=post.title,
        content=post.content if has_access else (post.teaser_text or "This content is for subscribers only"),
        post_type=post.post_type,
        tier_level=post.tier_level,
        teaser_text=post.teaser_text,
        blur_preview=post.blur_preview,
        has_access=has_access,
        is_published=post.is_published,
        published_at=post.published_at,
        is_pinned=post.is_pinned,
        expires_at=post.expires_at,
        media=media if has_access else [],
        view_count=post.view_count,
        unique_view_count=post.unique_view_count,
        like_count=post.like_count,
        comment_count=post.comment_count,
        share_count=post.share_count,
        allow_comments=post.allow_comments,
        allow_tips=post.allow_tips,
        poll_options=post.poll_options if has_access else None,
        poll_ends_at=post.poll_ends_at,
        poll_allows_multiple=post.poll_allows_multiple,
        poll_user_votes=poll_user_votes,
        tags=post.tags,
        is_liked=is_liked,
        can_edit=can_edit,
        can_delete=can_delete,
        created_at=post.created_at,
        updated_at=post.updated_at
    )


# =============================================================================
# STREAM DISCOVERY & CATEGORIES
# =============================================================================

@router.get("/categories", response_model=List[StreamCategoryResponse])
async def list_stream_categories():
    """List all active stream categories"""
    categories = await sync_to_async(list)(StreamCategory.objects.filter(is_active=True).order_by('order', 'name'))
    return [StreamCategoryResponse.model_validate(cat) for cat in categories]


@router.get("/discover", response_model=StreamListResponse)
async def discover_streams(
    filters: StreamSearchFilters = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Discover streams with filters"""
    queryset = Stream.objects.filter(is_active=True, launched_at__isnull=False).prefetch_related('categories')
    
    # Apply filters
    if filters.category_ids:
        queryset = queryset.filter(categories__id__in=filters.category_ids)
    
    if filters.tags:
        for tag in filters.tags:
            queryset = queryset.filter(tags__contains=tag)
    
    if filters.tier_price_max is not None:
        max_cents = int(filters.tier_price_max * 100)
        queryset = queryset.filter(entry_tier_price_cents__lte=max_cents)
    
    if filters.has_free_content is True:
        # Streams with free content
        queryset = queryset.filter(
            posts__tier_level='free',
            posts__is_published=True
        ).distinct()
    
    if filters.is_featured is not None:
        queryset = queryset.filter(is_featured=filters.is_featured)
    
    # Sorting
    order_field = filters.sort_by
    if filters.sort_order == 'desc':
        order_field = f'-{order_field}'
    queryset = queryset.order_by(order_field)
    
    # Paginate and serialize
    paginated_result = await paginate_queryset(queryset, pagination, 
                                              lambda stream: serialize_stream(stream, current_user))
    return paginated_result


@router.get("/featured", response_model=StreamListResponse)
async def list_featured_streams(
    pagination: PaginationParams = Depends(),
    current_user: Optional[User] = Depends(get_current_user)
):
    """List featured streams"""
    queryset = Stream.objects.filter(
        is_active=True,
        is_featured=True,
        launched_at__isnull=False
    ).order_by('-subscriber_count')
    
    paginated_result = await paginate_queryset(queryset, pagination,
                                              lambda stream: serialize_stream(stream, current_user))
    return paginated_result


# =============================================================================
# STREAM MANAGEMENT  
# =============================================================================

# Move specific routes before generic /{stream_id} route
@router.get("/my-subscriptions", response_model=StreamSubscriptionListResponse)
async def list_my_subscriptions(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[SubscriptionStatus] = Query(None, alias="status")
):
    """List user's stream subscriptions"""
    queryset = StreamSubscription.objects.filter(user=current_user).select_related('stream')
    
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    queryset = queryset.order_by('-created_at')
    
    return await paginate_queryset(queryset, pagination, StreamSubscriptionResponse)


@router.post("/", response_model=StreamResponse, status_code=status.HTTP_201_CREATED)
async def create_stream(
    stream_data: StreamCreate,
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Create a new stream (one per practitioner)"""
    # Check if practitioner already has a stream
    @sync_to_async
    def check_existing_stream():
        try:
            practitioner.stream
            return True
        except Stream.DoesNotExist:
            return False
    
    if await check_existing_stream():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Practitioner already has a stream"
        )
    
    # Validate categories
    categories = None
    if stream_data.category_ids:
        categories = await sync_to_async(list)(StreamCategory.objects.filter(
            id__in=stream_data.category_ids,
            is_active=True
        ))
        if len(categories) != len(stream_data.category_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more categories not found"
            )
    
    # Create stream
    @sync_to_async
    def create_stream_with_transaction():
        with transaction.atomic():
            stream = Stream.objects.create(
                practitioner=practitioner,
                title=stream_data.title,
                tagline=stream_data.tagline,
                description=stream_data.description,
                about=stream_data.about,
                free_tier_name=stream_data.free_tier_name,
                entry_tier_name=stream_data.entry_tier_name,
                premium_tier_name=stream_data.premium_tier_name,
                entry_tier_price_cents=int(stream_data.entry_tier_price * 100),
                premium_tier_price_cents=int(stream_data.premium_tier_price * 100),
                free_tier_description=stream_data.free_tier_description,
                entry_tier_description=stream_data.entry_tier_description,
                premium_tier_description=stream_data.premium_tier_description,
                free_tier_perks=stream_data.free_tier_perks,
                entry_tier_perks=stream_data.entry_tier_perks,
                premium_tier_perks=stream_data.premium_tier_perks,
                tags=stream_data.tags,
                allow_comments=stream_data.allow_comments,
                allow_dms=stream_data.allow_dms,
                allow_tips=stream_data.allow_tips,
                preview_post_count=stream_data.preview_post_count,
                watermark_media=stream_data.watermark_media
            )
            
            # Add categories
            if categories:
                stream.categories.set(categories)
            
            return stream
    
    stream = await create_stream_with_transaction()
    return await serialize_stream(stream, practitioner.user)


@router.get("/{stream_id}", response_model=StreamResponse)
async def get_stream(
    stream_id: int,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get stream details"""
    stream = await sync_to_async(get_object_or_404)(Stream, id=stream_id, is_active=True)
    return await serialize_stream(stream, current_user)


@router.patch("/{stream_id}", response_model=StreamResponse)
async def update_stream(
    stream_id: int,
    stream_data: StreamUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Update stream details"""
    stream = await sync_to_async(get_object_or_404)(Stream, id=stream_id, practitioner=practitioner)
    
    # Update fields
    update_data = stream_data.model_dump(exclude_unset=True)
    
    # Handle categories separately
    category_ids = update_data.pop('category_ids', None)
    
    @sync_to_async
    def update_stream_with_transaction():
        with transaction.atomic():
            for field, value in update_data.items():
                setattr(stream, field, value)
            stream.save()
            
            # Update categories
            if category_ids is not None:
                if category_ids:
                    categories = StreamCategory.objects.filter(
                        id__in=category_ids,
                        is_active=True
                    )
                    stream.categories.set(categories)
                else:
                    stream.categories.clear()
    
    await update_stream_with_transaction()
    return await serialize_stream(stream, practitioner.user)


@router.post("/{stream_id}/launch")
async def launch_stream(
    stream_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Launch a stream (make it public)"""
    stream = await sync_to_async(get_object_or_404)(Stream, id=stream_id, practitioner=practitioner)
    
    if stream.is_launched:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stream is already launched"
        )
    
    @sync_to_async
    def launch_stream_save():
        stream.launched_at = timezone.now()
        stream.save()
    
    await launch_stream_save()
    return {"message": "Stream launched successfully"}


# =============================================================================
# STREAM POSTS
# =============================================================================

@router.get("/{stream_id}/posts", response_model=StreamPostListResponse)
async def list_stream_posts(
    stream_id: UUID,
    filters: StreamPostFilters = Depends(),
    pagination: PaginationParams = Depends(),
    current_user: Optional[User] = Depends(get_current_user)
):
    """List posts in a stream"""
    stream = await sync_to_async(get_object_or_404)(Stream, id=stream_id, is_active=True)
    
    # Get user's tier for access control
    user_tier = await get_user_subscription_tier(current_user, stream)
    
    # Base queryset
    queryset = StreamPost.objects.filter(
        stream=stream,
        is_published=True
    ).prefetch_related('media')
    
    # Apply access control
    if not user_tier or user_tier == 'free':
        # Show free posts + previews of paid posts
        pass  # All posts are returned but content is filtered in serialization
    
    # Apply filters
    if filters.post_type:
        queryset = queryset.filter(post_type=filters.post_type)
    
    if filters.tier_level:
        queryset = queryset.filter(tier_level=filters.tier_level)
    
    if filters.has_media is True:
        queryset = queryset.filter(media__isnull=False).distinct()
    
    if filters.tags:
        for tag in filters.tags:
            queryset = queryset.filter(tags__contains=tag)
    
    if filters.published_after:
        queryset = queryset.filter(published_at__gte=filters.published_after)
    
    if filters.published_before:
        queryset = queryset.filter(published_at__lte=filters.published_before)
    
    # Sorting
    order_field = filters.sort_by
    if filters.sort_order == 'desc':
        order_field = f'-{order_field}'
    queryset = queryset.order_by('-is_pinned', order_field)
    
    # Paginate and serialize
    paginated_result = await paginate_queryset(queryset, pagination,
                                              lambda post: serialize_stream_post(post, current_user))
    return paginated_result


@router.post("/{stream_id}/posts", response_model=StreamPostResponse, status_code=status.HTTP_201_CREATED)
async def create_stream_post(
    stream_id: UUID,
    post_data: StreamPostCreate,
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Create a new stream post"""
    stream = await sync_to_async(get_object_or_404)(Stream, id=stream_id, practitioner=practitioner)
    
    # Validate media if provided
    media_objects = None
    if post_data.media:
        media_ids = [m.media_id for m in post_data.media]
        media_objects = await sync_to_async(list)(Media.objects.filter(
            id__in=media_ids,
            uploaded_by=practitioner.user
        ))
        if len(media_objects) != len(media_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more media files not found"
            )
    
    # Create post
    @sync_to_async
    def create_post_with_transaction():
        with transaction.atomic():
            post = StreamPost.objects.create(
                stream=stream,
                title=post_data.title,
                content=post_data.content,
                post_type=post_data.post_type,
                tier_level=post_data.tier_level,
                teaser_text=post_data.teaser_text,
                blur_preview=post_data.blur_preview,
                published_at=post_data.published_at or timezone.now(),
                expires_at=post_data.expires_at,
                allow_comments=post_data.allow_comments,
                allow_tips=post_data.allow_tips,
                poll_options=post_data.poll_options,
                poll_ends_at=post_data.poll_ends_at,
                poll_allows_multiple=post_data.poll_allows_multiple,
                tags=post_data.tags
            )
            
            # Add media
            if post_data.media and media_objects:
                media_dict = {m.id: m for m in media_objects}
                for media_data in post_data.media:
                    media_obj = media_dict[media_data.media_id]
                    StreamPostMedia.objects.create(
                        post=post,
                        media_type=media_obj.media_type,
                        media_url=media_obj.url,
                        thumbnail_url=media_obj.thumbnail_url,
                        filename=media_obj.filename,
                        file_size=media_obj.file_size,
                        duration_seconds=media_obj.duration,
                        width=media_obj.width,
                        height=media_obj.height,
                        order=media_data.order,
                        caption=media_data.caption,
                        alt_text=media_data.alt_text,
                        is_processed=True
                    )
            
            # Update stream post count
            stream.post_count = F('post_count') + 1
            stream.save(update_fields=['post_count'])
            
            return post
    
    post = await create_post_with_transaction()
    return await serialize_stream_post(post, practitioner.user)


@router.get("/posts/{post_id}", response_model=StreamPostResponse)
async def get_stream_post(
    post_id: UUID,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get stream post details"""
    post = await sync_to_async(get_object_or_404)(
        StreamPost,
        id=post_id,
        is_published=True,
        stream__is_active=True
    )
    
    # Track view if user is authenticated
    if current_user:
        @sync_to_async
        def track_view():
            # Create view record
            StreamPostView.objects.create(
                post=post,
                user=current_user,
                duration_seconds=0  # TODO: Track actual view duration via frontend
            )
            
            # Update view counts (async in production)
            post.view_count = F('view_count') + 1
            post.save(update_fields=['view_count'])
        
        await track_view()
    
    return await serialize_stream_post(post, current_user)


@router.patch("/posts/{post_id}", response_model=StreamPostResponse)
async def update_stream_post(
    post_id: UUID,
    post_data: StreamPostUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Update stream post"""
    post = await sync_to_async(get_object_or_404)(
        StreamPost,
        id=post_id,
        stream__practitioner=practitioner
    )
    
    # Update fields
    @sync_to_async
    def update_post():
        update_data = post_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(post, field, value)
        post.save()
    
    await update_post()
    return await serialize_stream_post(post, practitioner.user)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stream_post(
    post_id: UUID,
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Delete stream post"""
    post = await sync_to_async(get_object_or_404)(
        StreamPost,
        id=post_id,
        stream__practitioner=practitioner
    )
    
    @sync_to_async
    def delete_post_with_transaction():
        with transaction.atomic():
            # Update stream post count
            stream = post.stream
            stream.post_count = F('post_count') - 1
            stream.save(update_fields=['post_count'])
            
            # Delete post
            post.delete()
    
    await delete_post_with_transaction()


# =============================================================================
# POST INTERACTIONS
# =============================================================================

@router.post("/posts/{post_id}/like")
async def like_stream_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Like or unlike a stream post"""
    post = await sync_to_async(get_object_or_404)(
        StreamPost,
        id=post_id,
        is_published=True,
        stream__is_active=True
    )
    
    # Check if user has access to this post
    user_tier = await get_user_subscription_tier(current_user, post.stream)
    if not post.is_accessible_to_tier(user_tier or 'free'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this post"
        )
    
    @sync_to_async
    def toggle_like():
        like, created = StreamPostLike.objects.get_or_create(
            post=post,
            user=current_user
        )
        
        if not created:
            # Unlike
            like.delete()
            post.like_count = F('like_count') - 1
            action = "unliked"
        else:
            # Like
            post.like_count = F('like_count') + 1
            action = "liked"
        
        post.save(update_fields=['like_count'])
        return action
    
    action = await toggle_like()
    return {"message": f"Post {action}"}


@router.get("/posts/{post_id}/comments", response_model=StreamPostCommentListResponse)
async def list_post_comments(
    post_id: UUID,
    pagination: PaginationParams = Depends(),
    current_user: Optional[User] = Depends(get_current_user)
):
    """List comments on a stream post"""
    post = await sync_to_async(get_object_or_404)(
        StreamPost,
        id=post_id,
        is_published=True,
        stream__is_active=True
    )
    
    # Check access
    user_tier = await get_user_subscription_tier(current_user, post.stream)
    if not post.is_accessible_to_tier(user_tier or 'free'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this post"
        )
    
    queryset = StreamPostComment.objects.filter(
        post=post,
        is_hidden=False,
        parent_comment=None
    ).select_related('user').order_by('-is_pinned', '-created_at')
    
    # Serialize comments
    @sync_to_async
    def serialize_comment(comment):
        return StreamPostCommentResponse(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            user_name=comment.user.get_full_name() or comment.user.email,
            user_image_url=getattr(comment.user, 'profile_image_url', None),
            content=comment.content,
            is_pinned=comment.is_pinned,
            is_hidden=comment.is_hidden,
            like_count=comment.like_count,
            parent_comment_id=comment.parent_comment_id,
            reply_count=comment.replies.filter(is_hidden=False).count(),
            is_liked=False,  # TODO: Track comment likes
            can_edit=current_user and comment.user == current_user,
            can_delete=current_user and (comment.user == current_user or 
                                       current_user.practitioner_profile == post.stream.practitioner),
            can_pin=current_user and hasattr(current_user, 'practitioner_profile') and 
                   current_user.practitioner_profile == post.stream.practitioner,
            created_at=comment.created_at,
            updated_at=comment.updated_at
        )
    
    return await paginate_queryset(queryset, pagination, serialize_comment)


@router.post("/posts/{post_id}/comments", response_model=StreamPostCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_post_comment(
    post_id: UUID,
    comment_data: StreamPostCommentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a comment on a stream post"""
    post = await sync_to_async(get_object_or_404)(
        StreamPost,
        id=post_id,
        is_published=True,
        stream__is_active=True,
        allow_comments=True
    )
    
    # Check access
    user_tier = await get_user_subscription_tier(current_user, post.stream)
    if not post.is_accessible_to_tier(user_tier or 'free'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this post"
        )
    
    # Validate parent comment if provided
    parent_comment = None
    if comment_data.parent_comment_id:
        parent_comment = await sync_to_async(get_object_or_404)(
            StreamPostComment,
            id=comment_data.parent_comment_id,
            post=post,
            is_hidden=False
        )
    
    # Create comment
    @sync_to_async
    def create_comment_with_transaction():
        with transaction.atomic():
            comment = StreamPostComment.objects.create(
                post=post,
                user=current_user,
                content=comment_data.content,
                parent_comment=parent_comment
            )
            
            # Update post comment count
            post.comment_count = F('comment_count') + 1
            post.save(update_fields=['comment_count'])
            
            return comment
    
    comment = await create_comment_with_transaction()
    
    return StreamPostCommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        user_name=comment.user.get_full_name() or comment.user.email,
        user_image_url=getattr(comment.user, 'profile_image_url', None),
        content=comment.content,
        is_pinned=comment.is_pinned,
        is_hidden=comment.is_hidden,
        like_count=comment.like_count,
        parent_comment_id=comment.parent_comment_id,
        reply_count=0,
        can_edit=True,
        can_delete=True,
        can_pin=hasattr(current_user, 'practitioner_profile') and 
               current_user.practitioner_profile == post.stream.practitioner,
        created_at=comment.created_at,
        updated_at=comment.updated_at
    )


# =============================================================================
# SUBSCRIPTIONS
# =============================================================================

@router.post("/{stream_id}/subscribe", response_model=StreamSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def subscribe_to_stream(
    stream_id: UUID,
    subscription_data: StreamSubscriptionCreate,
    current_user: User = Depends(get_current_user)
):
    """Subscribe to a stream"""
    stream = await sync_to_async(get_object_or_404)(Stream, id=stream_id, is_active=True, is_launched=True)
    
    # Check if user already has an active subscription
    existing = await sync_to_async(StreamSubscription.objects.filter(
        user=current_user,
        stream=stream,
        status__in=['active', 'past_due']
    ).first)()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active subscription to this stream"
        )
    
    # Create Stripe subscription for paid tiers
    stripe_subscription_id = None
    if subscription_data.tier != 'free':
        price_cents = stream.get_tier_price_cents(subscription_data.tier)
        
        # Create Stripe subscription
        stripe_subscription = await stripe_client.create_subscription(
            customer_id=current_user.stripe_customer_id,
            price_amount=price_cents,
            currency="usd",
            payment_method=subscription_data.payment_method_id,
            metadata={
                "stream_id": str(stream.id),
                "tier": subscription_data.tier,
                "user_id": str(current_user.id)
            }
        )
        stripe_subscription_id = stripe_subscription.id
    
    # Create subscription
    @sync_to_async
    def create_subscription_with_transaction():
        with transaction.atomic():
            now = timezone.now()
            subscription = StreamSubscription.objects.create(
                user=current_user,
                stream=stream,
                tier=subscription_data.tier,
                status='active',
                started_at=now,
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
                stripe_subscription_id=stripe_subscription_id
            )
            
            # Update stream subscriber counts
            if subscription_data.tier == 'free':
                stream.free_subscriber_count = F('free_subscriber_count') + 1
            else:
                stream.paid_subscriber_count = F('paid_subscriber_count') + 1
            stream.subscriber_count = F('subscriber_count') + 1
            stream.save()
            
            return subscription
    
    subscription = await create_subscription_with_transaction()
    return StreamSubscriptionResponse.model_validate(subscription)


@router.patch("/subscriptions/{subscription_id}", response_model=StreamSubscriptionResponse)
async def update_subscription(
    subscription_id: UUID,
    subscription_data: StreamSubscriptionUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update subscription settings"""
    subscription = await sync_to_async(get_object_or_404)(
        StreamSubscription,
        id=subscription_id,
        user=current_user
    )
    
    # Update fields
    update_data = subscription_data.model_dump(exclude_unset=True)
    
    # Handle tier changes separately (requires Stripe update)
    if 'tier' in update_data:
        new_tier = update_data.pop('tier')
        if new_tier != subscription.tier:
            # TODO: Implement tier changes via Stripe
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Tier changes not yet implemented"
            )
    
    @sync_to_async
    def update_subscription_fields():
        for field, value in update_data.items():
            setattr(subscription, field, value)
        subscription.save()
    
    await update_subscription_fields()
    return StreamSubscriptionResponse.model_validate(subscription)


@router.delete("/subscriptions/{subscription_id}")
async def cancel_subscription(
    subscription_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Cancel a subscription"""
    subscription = await sync_to_async(get_object_or_404)(
        StreamSubscription,
        id=subscription_id,
        user=current_user,
        status='active'
    )
    
    # Cancel Stripe subscription
    if subscription.stripe_subscription_id:
        await stripe_client.cancel_subscription(subscription.stripe_subscription_id)
    
    # Update subscription
    @sync_to_async
    def cancel_subscription_update():
        subscription.status = 'canceled'
        subscription.canceled_at = timezone.now()
        subscription.ends_at = subscription.current_period_end
        subscription.save()
    
    await cancel_subscription_update()
    return {"message": "Subscription canceled"}


# =============================================================================
# TIPS
# =============================================================================

@router.post("/{stream_id}/tip", response_model=StreamTipResponse, status_code=status.HTTP_201_CREATED)
async def send_stream_tip(
    stream_id: UUID,
    tip_data: StreamTipCreate,
    current_user: User = Depends(get_current_user)
):
    """Send a tip to a stream"""
    stream = await sync_to_async(get_object_or_404)(Stream, id=stream_id, is_active=True, allow_tips=True)
    
    # Validate post if provided
    post = None
    if tip_data.post_id:
        post = await sync_to_async(get_object_or_404)(
            StreamPost,
            id=tip_data.post_id,
            stream=stream,
            is_published=True,
            allow_tips=True
        )
    
    # Create Stripe payment intent
    amount_cents = int(tip_data.amount * 100)
    payment_intent = await stripe_client.create_payment_intent(
        amount=amount_cents,
        currency="usd",
        payment_method=tip_data.payment_method_id,
        metadata={
            "type": "stream_tip",
            "stream_id": str(stream.id),
            "post_id": str(post.id) if post else None,
            "user_id": str(current_user.id)
        }
    )
    
    # Calculate commission
    commission_rate = stream.commission_rate
    commission_amount_cents = int(amount_cents * (commission_rate / 100))
    net_amount_cents = amount_cents - commission_amount_cents
    
    # Create tip record
    @sync_to_async
    def create_tip():
        return StreamTip.objects.create(
            user=current_user,
            stream=stream,
            post=post,
            amount_cents=amount_cents,
            message=tip_data.message,
            is_anonymous=tip_data.is_anonymous,
            stripe_payment_intent_id=payment_intent.id,
            commission_rate=commission_rate,
            commission_amount_cents=commission_amount_cents,
            net_amount_cents=net_amount_cents,
            status='pending'
        )
    
    tip = await create_tip()
    return StreamTipResponse.model_validate(tip)


@router.get("/{stream_id}/tips", response_model=StreamTipListResponse)
async def list_stream_tips(
    stream_id: UUID,
    pagination: PaginationParams = Depends(),
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """List tips for a stream (stream owner only)"""
    stream = await sync_to_async(get_object_or_404)(Stream, id=stream_id, practitioner=practitioner)
    
    queryset = StreamTip.objects.filter(
        stream=stream,
        status='completed'
    ).select_related('user', 'post').order_by('-created_at')
    
    return await paginate_queryset(queryset, pagination, StreamTipResponse)


# =============================================================================
# ANALYTICS
# =============================================================================

@router.get("/{stream_id}/analytics", response_model=StreamAnalyticsResponse)
async def get_stream_analytics(
    stream_id: UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Get stream analytics (stream owner only)"""
    stream = await sync_to_async(get_object_or_404)(Stream, id=stream_id, practitioner=practitioner)
    
    # Get analytics data for date range
    @sync_to_async
    def get_analytics_data():
        analytics_data = StreamAnalytics.objects.filter(
            stream=stream,
            date__range=[start_date, end_date]
        ).order_by('date')
        
        # Aggregate metrics
        total_metrics = analytics_data.aggregate(
            new_subscribers=Sum('new_subscribers'),
            churned_subscribers=Sum('churned_subscribers'),
            posts_published=Sum('posts_published'),
            total_views=Sum('total_views'),
            unique_viewers=Sum('unique_viewers'),
            total_likes=Sum('total_likes'),
            total_comments=Sum('total_comments'),
            subscription_revenue_cents=Sum('subscription_revenue_cents'),
            tips_revenue_cents=Sum('tips_revenue_cents'),
            total_revenue_cents=Sum('total_revenue_cents'),
            commission_paid_cents=Sum('commission_paid_cents'),
            net_revenue_cents=Sum('net_revenue_cents')
        )
        
        # Calculate growth rate
        first_day = analytics_data.first()
        last_day = analytics_data.last()
        subscriber_growth_rate = 0.0
        if first_day and last_day and first_day.total_subscribers > 0:
            subscriber_growth_rate = ((last_day.total_subscribers - first_day.total_subscribers) / 
                                    first_day.total_subscribers) * 100
        
        # Get current subscriber breakdown
        current_metrics = analytics_data.last()
        
        return total_metrics, subscriber_growth_rate, current_metrics, list(analytics_data)
    
    total_metrics, subscriber_growth_rate, current_metrics, analytics_list = await get_analytics_data()
    
    return StreamAnalyticsResponse(
        start_date=start_date,
        end_date=end_date,
        total_subscribers=current_metrics.total_subscribers if current_metrics else 0,
        new_subscribers=total_metrics['new_subscribers'] or 0,
        churned_subscribers=total_metrics['churned_subscribers'] or 0,
        subscriber_growth_rate=subscriber_growth_rate,
        free_subscribers=current_metrics.free_subscribers if current_metrics else 0,
        entry_subscribers=current_metrics.entry_subscribers if current_metrics else 0,
        premium_subscribers=current_metrics.premium_subscribers if current_metrics else 0,
        posts_published=total_metrics['posts_published'] or 0,
        total_views=total_metrics['total_views'] or 0,
        unique_viewers=total_metrics['unique_viewers'] or 0,
        average_engagement_rate=0.0,  # TODO: Calculate from views/likes/comments
        subscription_revenue=Decimal(total_metrics['subscription_revenue_cents'] or 0) / 100,
        tips_revenue=Decimal(total_metrics['tips_revenue_cents'] or 0) / 100,
        total_revenue=Decimal(total_metrics['total_revenue_cents'] or 0) / 100,
        commission_paid=Decimal(total_metrics['commission_paid_cents'] or 0) / 100,
        net_revenue=Decimal(total_metrics['net_revenue_cents'] or 0) / 100,
        top_posts=[],  # TODO: Get top performing posts
        daily_stats=[  # Convert to list of dicts
            {
                "date": analytics.date.isoformat(),
                "subscribers": analytics.total_subscribers,
                "views": analytics.total_views,
                "revenue": analytics.total_revenue_cents / 100
            }
            for analytics in analytics_list
        ]
    )