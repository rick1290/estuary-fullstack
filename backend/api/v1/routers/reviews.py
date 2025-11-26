"""
Reviews router for FastAPI
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from django.db.models import Avg, Count, Q, F, Exists, OuterRef
from django.db import transaction
from asgiref.sync import sync_to_async

from reviews.models import Review, ReviewVote
from bookings.models import Booking
from services.models import Service
from practitioners.models import Practitioner
from ..schemas.reviews import (
    ReviewCreate,
    ReviewUpdate,
    ReviewPublic,
    ReviewFilters,
    ReviewStats,
    ReviewVote as ReviewVoteSchema,
    ReviewReport,
    ReviewModeration,
    ReviewListResponse,
    PractitionerReviewStats,
    ReviewResponse,
    ServiceReviewStats,
    ReviewCreateResponse,
    ReviewerInfo,
    ReviewResponse as ReviewResponseSchema,
)
from ...dependencies import (
    get_db,
    get_current_user,
    get_current_active_user,
    get_current_superuser,
    get_pagination_params,
    PaginationParams,
)
from users.models import User

router = APIRouter(tags=["Reviews"])


@sync_to_async
def calculate_review_stats(reviews_queryset) -> ReviewStats:
    """Calculate aggregated statistics for a set of reviews"""
    stats = reviews_queryset.aggregate(
        total=Count('id'),
        avg_rating=Avg('rating'),
        avg_professionalism=Avg('professionalism_rating'),
        avg_communication=Avg('communication_rating'),
        avg_value=Avg('value_rating'),
        avg_location=Avg('location_rating'),
        recommend_count=Count('id', filter=Q(would_recommend=True)),
        verified_count=Count('id', filter=Q(is_verified=True)),
        response_count=Count('id', filter=Q(response__isnull=False)),
    )
    
    # Rating breakdown
    rating_breakdown = {}
    for i in range(1, 6):
        count = reviews_queryset.filter(rating=i).count()
        rating_breakdown[i] = count
    
    # Recent trend (last 10 reviews)
    recent_reviews = reviews_queryset.order_by('-created_at')[:10]
    recent_avg = None
    trending = None
    
    if recent_reviews.exists():
        recent_avg = recent_reviews.aggregate(avg=Avg('rating'))['avg']
        overall_avg = stats['avg_rating'] or 0
        
        if recent_avg and overall_avg:
            if recent_avg > overall_avg + 0.2:
                trending = "up"
            elif recent_avg < overall_avg - 0.2:
                trending = "down"
            else:
                trending = "stable"
    
    total = stats['total'] or 0
    
    return ReviewStats(
        total_reviews=total,
        average_rating=round(stats['avg_rating'] or 0, 2),
        rating_breakdown=rating_breakdown,
        average_professionalism=round(stats['avg_professionalism'] or 0, 2) if stats['avg_professionalism'] else None,
        average_communication=round(stats['avg_communication'] or 0, 2) if stats['avg_communication'] else None,
        average_value=round(stats['avg_value'] or 0, 2) if stats['avg_value'] else None,
        average_location=round(stats['avg_location'] or 0, 2) if stats['avg_location'] else None,
        would_recommend_percentage=round((stats['recommend_count'] / total * 100) if total > 0 else 0, 1),
        verified_percentage=round((stats['verified_count'] / total * 100) if total > 0 else 0, 1),
        response_rate=round((stats['response_count'] / total * 100) if total > 0 else 0, 1),
        recent_average=round(recent_avg, 2) if recent_avg else None,
        trending=trending,
    )


@sync_to_async
def serialize_review(review: Review, current_user: Optional[User] = None) -> ReviewPublic:
    """Serialize a review for public display"""
    # Check if current user found this helpful
    user_found_helpful = None
    if current_user:
        user_found_helpful = ReviewVote.objects.filter(
            review=review,
            user=current_user,
            is_helpful=True
        ).exists()
    
    # Get helpful count
    helpful_count = review.votes.filter(is_helpful=True).count()
    
    # Prepare reviewer info
    reviewer_info = ReviewerInfo(
        id=review.user.id,
        first_name=review.user.first_name,
        last_initial=review.user.last_name[0] if review.user.last_name else "",
        profile_image_url=getattr(review.user, 'profile_image_url', None),
    )
    
    # Prepare response if exists
    response = None
    if hasattr(review, 'response') and review.response:
        response = ReviewResponseSchema(
            content=review.response.content,
            responded_at=review.response.created_at,
        )
    
    return ReviewPublic(
        id=review.id,
        rating=review.rating,
        title=review.title,
        content=review.content,
        would_recommend=review.would_recommend,
        professionalism_rating=review.professionalism_rating,
        communication_rating=review.communication_rating,
        value_rating=review.value_rating,
        location_rating=review.location_rating,
        created_at=review.created_at,
        updated_at=review.updated_at,
        is_verified=review.is_verified,
        reviewer=reviewer_info,
        service_name=review.service.name,
        practitioner_id=review.practitioner.id,
        practitioner_name=review.practitioner.display_name,
        response=response,
        helpful_count=helpful_count,
        user_found_helpful=user_found_helpful,
    )


@sync_to_async
def get_filtered_reviews(filters, pagination):
    """Get filtered reviews with pagination"""
    # Base queryset
    queryset = Review.objects.select_related(
        'user', 'practitioner', 'service', 'response'
    ).filter(status='approved')
    
    # Apply filters
    if filters.practitioner_id:
        queryset = queryset.filter(practitioner_id=filters.practitioner_id)
    
    if filters.service_id:
        queryset = queryset.filter(service_id=filters.service_id)
    
    if filters.rating:
        queryset = queryset.filter(rating=filters.rating)
    
    if filters.min_rating:
        queryset = queryset.filter(rating__gte=filters.min_rating)
    
    if filters.verified_only:
        queryset = queryset.filter(is_verified=True)
    
    if filters.with_response is not None:
        if filters.with_response:
            queryset = queryset.filter(response__isnull=False)
        else:
            queryset = queryset.filter(response__isnull=True)
    
    if filters.would_recommend is not None:
        queryset = queryset.filter(would_recommend=filters.would_recommend)
    
    # Sorting
    if filters.sort_by == "newest":
        queryset = queryset.order_by('-created_at')
    elif filters.sort_by == "oldest":
        queryset = queryset.order_by('created_at')
    elif filters.sort_by == "highest":
        queryset = queryset.order_by('-rating', '-created_at')
    elif filters.sort_by == "lowest":
        queryset = queryset.order_by('rating', '-created_at')
    elif filters.sort_by == "helpful":
        queryset = queryset.annotate(
            helpful_count=Count('votes', filter=Q(votes__is_helpful=True))
        ).order_by('-helpful_count', '-created_at')
    
    # Get total count
    total = queryset.count()
    
    # Paginate
    reviews = list(queryset[pagination.offset:pagination.offset + pagination.limit])
    
    return queryset, reviews, total


@router.get("/", response_model=ReviewListResponse)
async def list_reviews(
    filters: ReviewFilters = Depends(),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: Optional[User] = Depends(get_current_user),
    db=Depends(get_db),
):
    """List reviews with filtering and pagination"""
    # Get filtered reviews
    queryset, reviews, total = await get_filtered_reviews(filters, pagination)
    
    # Get stats if filtering by practitioner or service
    stats = None
    if filters.practitioner_id or filters.service_id:
        stats = await calculate_review_stats(queryset)
    
    # Serialize
    results = []
    for review in reviews:
        serialized = await serialize_review(review, current_user)
        results.append(serialized)
    
    return ReviewListResponse(
        results=results,
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
        stats=stats,
    )


@sync_to_async
def get_booking_for_review(booking_id, user):
    """Get booking for review creation"""
    try:
        return Booking.objects.select_related(
            'service', 'practitioner'
        ).get(
            id=booking_id,
            user=user,
        )
    except Booking.DoesNotExist:
        return None


@sync_to_async
def check_existing_review(booking):
    """Check if booking already has a review"""
    return Review.objects.filter(booking=booking).exists()


@sync_to_async
@transaction.atomic
def create_review_db(data):
    """Create review in database"""
    return Review.objects.create(**data)


@router.post("/", response_model=ReviewPublic, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Create a new review for a completed booking"""
    # Verify booking exists and belongs to user
    booking = await get_booking_for_review(review_data.booking_id, current_user)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )
    
    # Check if booking is completed
    if booking.status != 'completed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only review completed bookings",
        )
    
    # Check if booking is recent (within 90 days)
    # Note: end_time is now on ServiceSession, use accessor method
    booking_end_time = booking.get_end_time()
    if booking_end_time and booking_end_time < datetime.now() - timedelta(days=90):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review period has expired (90 days)",
        )
    
    # Check if already reviewed
    if await check_existing_review(booking):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This booking has already been reviewed",
        )
    
    # Create review
    review_data_dict = {
        'user': current_user,
        'booking': booking,
        'service': booking.service,
        'practitioner': booking.practitioner,
        'rating': review_data.rating,
        'title': review_data.title,
        'content': review_data.content,
        'would_recommend': review_data.would_recommend,
        'professionalism_rating': review_data.professionalism_rating,
        'communication_rating': review_data.communication_rating,
        'value_rating': review_data.value_rating,
        'location_rating': review_data.location_rating,
        'status': 'approved',  # Auto-approve for now
    }
    
    review = await create_review_db(review_data_dict)
    
    return await serialize_review(review, current_user)


@sync_to_async
def get_review_by_id(review_id):
    """Get review by ID"""
    try:
        return Review.objects.select_related(
            'user', 'practitioner', 'service', 'response'
        ).get(id=review_id, status='approved')
    except Review.DoesNotExist:
        return None


@router.get("/{review_id}", response_model=ReviewPublic)
async def get_review(
    review_id: UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db=Depends(get_db),
):
    """Get a specific review"""
    review = await get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    return await serialize_review(review, current_user)


@sync_to_async
def get_user_review(review_id, user):
    """Get review owned by user"""
    try:
        return Review.objects.get(id=review_id, user=user)
    except Review.DoesNotExist:
        return None


@sync_to_async
def update_review_db(review, update_data):
    """Update review in database"""
    for field, value in update_data.items():
        setattr(review, field, value)
    review.save()
    return review


@router.patch("/{review_id}", response_model=ReviewPublic)
async def update_review(
    review_id: UUID,
    review_update: ReviewUpdate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Update own review"""
    review = await get_user_review(review_id, current_user)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Can only update within 7 days
    if review.created_at < datetime.now() - timedelta(days=7):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only edit reviews within 7 days of posting",
        )
    
    # Update fields
    update_data = review_update.model_dump(exclude_unset=True)
    review = await update_review_db(review, update_data)
    
    return await serialize_review(review, current_user)


@sync_to_async
def delete_review_db(review):
    """Delete review from database"""
    review.delete()


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Delete own review"""
    review = await get_user_review(review_id, current_user)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Can only delete within 24 hours
    if review.created_at < datetime.now() - timedelta(hours=24):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete reviews within 24 hours of posting",
        )
    
    await delete_review_db(review)


@sync_to_async
def get_review_for_response(review_id):
    """Get review for response creation"""
    try:
        return Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return None


@sync_to_async
def check_practitioner_profile(user):
    """Check if user has practitioner profile"""
    return hasattr(user, 'practitioner_profile')


@sync_to_async
def check_review_has_response(review):
    """Check if review already has response"""
    return hasattr(review, 'response') and review.response


@sync_to_async
@transaction.atomic
def create_response_db(review, practitioner, content):
    """Create review response in database"""
    from reviews.models import ReviewResponse
    ReviewResponse.objects.create(
        review=review,
        practitioner=practitioner,
        content=content,
    )
    review.refresh_from_db()
    return review


@router.post("/{review_id}/response", response_model=ReviewPublic)
async def create_review_response(
    review_id: UUID,
    response_data: ReviewCreateResponse,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Create practitioner response to review"""
    review = await get_review_for_response(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Verify user is the practitioner
    if not await check_practitioner_profile(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only practitioners can respond to reviews",
        )
    
    if review.practitioner != current_user.practitioner_profile:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only respond to your own reviews",
        )
    
    # Check if already responded
    if await check_review_has_response(review):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review already has a response",
        )
    
    # Create response
    review = await create_response_db(
        review,
        current_user.practitioner_profile,
        response_data.content
    )
    
    return await serialize_review(review, current_user)


@sync_to_async
def update_or_create_vote(review, user, is_helpful):
    """Update or create review vote"""
    ReviewVote.objects.update_or_create(
        review=review,
        user=user,
        defaults={'is_helpful': is_helpful},
    )


@router.post("/{review_id}/vote", status_code=status.HTTP_200_OK)
async def vote_review(
    review_id: UUID,
    vote: ReviewVoteSchema,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Vote a review as helpful or not"""
    review = await get_review_by_id(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Can't vote on own review
    if review.user == current_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot vote on your own review",
        )
    
    # Update or create vote
    await update_or_create_vote(review, current_user, vote.helpful)
    
    return {"message": "Vote recorded"}


@sync_to_async
def get_practitioner_by_id(practitioner_id):
    """Get practitioner by ID"""
    try:
        return Practitioner.objects.get(id=practitioner_id)
    except Practitioner.DoesNotExist:
        return None


@sync_to_async
def get_practitioner_reviews_and_stats(practitioner):
    """Get practitioner reviews and calculate stats"""
    # Get all reviews
    reviews = Review.objects.filter(
        practitioner=practitioner,
        status='approved'
    )
    
    # Get featured reviews (most helpful)
    featured_reviews = list(
        reviews.annotate(
            helpful_count=Count('votes', filter=Q(votes__is_helpful=True))
        ).order_by('-helpful_count', '-rating')[:5]
    )
    
    # Get service-specific stats
    service_stats = {}
    services = Service.objects.filter(
        reviews__practitioner=practitioner,
        reviews__status='approved'
    ).distinct()
    
    for service in services:
        service_reviews = reviews.filter(service=service)
        if service_reviews.exists():
            service_stats[service.name] = service_reviews
    
    return reviews, featured_reviews, service_stats


@router.get("/stats/practitioner/{practitioner_id}", response_model=PractitionerReviewStats)
async def get_practitioner_review_stats(
    practitioner_id: UUID,
    db=Depends(get_db),
):
    """Get review statistics for a practitioner"""
    # Verify practitioner exists
    practitioner = await get_practitioner_by_id(practitioner_id)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practitioner not found",
        )
    
    # Get reviews and stats
    reviews, featured_reviews, service_stats_querysets = await get_practitioner_reviews_and_stats(practitioner)
    
    # Calculate overall stats
    stats = await calculate_review_stats(reviews)
    
    # Serialize featured reviews
    featured_serialized = []
    for r in featured_reviews:
        serialized = await serialize_review(r)
        featured_serialized.append(serialized)
    
    # Calculate service-specific stats
    service_stats = {}
    for service_name, service_reviews in service_stats_querysets.items():
        service_stats[service_name] = await calculate_review_stats(service_reviews)
    
    return PractitionerReviewStats(
        practitioner_id=practitioner.id,
        practitioner_name=practitioner.display_name,
        stats=stats,
        featured_reviews=featured_serialized,
        service_stats=service_stats if service_stats else None,
    )


@sync_to_async
def get_service_by_id(service_id):
    """Get service by ID"""
    try:
        return Service.objects.get(id=service_id)
    except Service.DoesNotExist:
        return None


@sync_to_async
def get_service_reviews(service):
    """Get reviews for a service"""
    reviews = Review.objects.filter(
        service=service,
        status='approved'
    )
    recent_reviews = list(reviews.order_by('-created_at')[:10])
    return reviews, recent_reviews


@router.get("/stats/service/{service_id}", response_model=ServiceReviewStats)
async def get_service_review_stats(
    service_id: UUID,
    db=Depends(get_db),
):
    """Get review statistics for a service"""
    # Verify service exists
    service = await get_service_by_id(service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )
    
    # Get reviews
    reviews, recent_reviews = await get_service_reviews(service)
    
    # Calculate stats
    stats = await calculate_review_stats(reviews)
    
    # Serialize recent reviews
    recent_serialized = []
    for r in recent_reviews:
        serialized = await serialize_review(r)
        recent_serialized.append(serialized)
    
    return ServiceReviewStats(
        service_id=service.id,
        service_name=service.name,
        stats=stats,
        recent_reviews=recent_serialized,
    )


@sync_to_async
def update_review_status(review, status, moderation_notes):
    """Update review status and moderation notes"""
    review.status = status
    review.moderation_notes = moderation_notes
    review.save()


@router.post("/{review_id}/report", status_code=status.HTTP_200_OK)
async def report_review(
    review_id: UUID,
    report: ReviewReport,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Report inappropriate review"""
    review = await get_review_for_response(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Update review status
    moderation_notes = f"Reported by user {current_user.id}: {report.reason}"
    if report.details:
        moderation_notes += f" - {report.details}"
    
    await update_review_status(review, 'flagged', moderation_notes)
    
    return {"message": "Review reported for moderation"}


@sync_to_async
def get_moderation_reviews(status, pagination):
    """Get reviews for moderation"""
    queryset = Review.objects.select_related(
        'user', 'practitioner', 'service'
    )
    
    if status:
        queryset = queryset.filter(status=status)
    else:
        queryset = queryset.exclude(status='approved')
    
    queryset = queryset.order_by('-created_at')
    
    # Paginate
    total = queryset.count()
    reviews = list(queryset[pagination.offset:pagination.offset + pagination.limit])
    
    return reviews, total


@router.get("/moderation", response_model=ReviewListResponse)
async def get_reviews_for_moderation(
    status: Optional[str] = Query(None, regex="^(pending|flagged|rejected)$"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_superuser),
    db=Depends(get_db),
):
    """Get reviews pending moderation (admin only)"""
    reviews, total = await get_moderation_reviews(status, pagination)
    
    # Serialize
    results = []
    for review in reviews:
        serialized = await serialize_review(review)
        results.append(serialized)
    
    return ReviewListResponse(
        results=results,
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@sync_to_async
def moderate_review_db(review, moderation):
    """Update review moderation status"""
    review.status = moderation.status
    if moderation.moderation_notes:
        review.moderation_notes = moderation.moderation_notes
    if moderation.is_verified is not None:
        review.is_verified = moderation.is_verified
    
    review.save()
    return review


@router.patch("/{review_id}/moderate", response_model=ReviewPublic)
async def moderate_review(
    review_id: UUID,
    moderation: ReviewModeration,
    current_user: User = Depends(get_current_superuser),
    db=Depends(get_db),
):
    """Moderate a review (admin only)"""
    review = await get_review_for_response(review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    
    # Update review
    review = await moderate_review_db(review, moderation)
    
    return await serialize_review(review)