"""
Practitioners router for marketplace API
"""
from typing import List, Optional
from datetime import date, time
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from django.db.models import Q, F, Count, Avg, Sum, Min, Max, Prefetch
from django.db import transaction as db_transaction
from django.utils import timezone
from asgiref.sync import sync_to_async

from api.dependencies import get_current_user, get_current_user_optional, PaginationParams, get_pagination_params
from api.v1.schemas.practitioners import (
    PractitionerPublicProfile,
    PractitionerPrivateProfile,
    PractitionerProfileUpdate,
    PractitionerServiceCreate,
    PractitionerServiceUpdate,
    PractitionerServiceResponse,
    PractitionerListFilters,
    PractitionerListResponse,
    ScheduleCreate,
    ScheduleUpdate,
    ScheduleResponse,
    ScheduleTimeSlotCreate,
    AvailabilityQuery,
    AvailabilityResponse,
    EarningsOverview,
    EarningsTransaction,
    PayoutHistory,
    PractitionerAnalytics,
)
from api.v1.schemas.services import (
    PractitionerServiceCategoryCreate,
    PractitionerServiceCategoryUpdate,
    PractitionerServiceCategoryResponse,
    PractitionerServiceCategoryListResponse,
    CategoryReorderRequest,
)
from api.v1.schemas.base import MessageResponse

from practitioners.models import (
    Practitioner,
    Schedule,
    ScheduleTimeSlot,
    SchedulePreference,
)
from services.models import Service, ServiceType, ServiceCategory, PractitionerServiceCategory
from payments.models import (
    PractitionerEarnings,
    EarningsTransaction as EarningsTransactionModel,
    PractitionerPayout,
)
from bookings.models import Booking
from reviews.models import Review
from users.models import User

router = APIRouter(
    tags=["Practitioners"],
)


# ==================== Helper Functions ====================

@sync_to_async
def practitioner_to_dict(practitioner, include_private=False) -> dict:
    """Convert practitioner model to dict with computed fields"""
    from services.models import Service
    from reviews.models import Review
    
    # Basic fields
    data = {
        'id': practitioner.id,
        'public_uuid': str(practitioner.public_uuid),  # Convert UUID to string
        'display_name': practitioner.display_name,
        'professional_title': practitioner.professional_title,
        'bio': practitioner.bio,
        'quote': practitioner.quote,
        'profile_image_url': practitioner.profile_image_url,
        'profile_video_url': practitioner.profile_video_url,
        'years_of_experience': practitioner.years_of_experience,
        'is_verified': practitioner.is_verified,
        'is_active': practitioner.is_active,
        'featured': practitioner.featured,
        'full_name': practitioner.full_name,
        'next_available_date': practitioner.next_available_date,
    }
    
    # Add private fields if requested
    if include_private:
        data['practitioner_status'] = practitioner.practitioner_status
        data['is_onboarded'] = practitioner.is_onboarded
        data['onboarding_step'] = practitioner.onboarding_step
        data['onboarding_completed_at'] = practitioner.onboarding_completed_at
        data['buffer_time'] = practitioner.buffer_time
        data['created_at'] = practitioner.created_at
        data['updated_at'] = practitioner.updated_at
    
    # Computed fields
    reviews = Review.objects.filter(practitioner=practitioner, is_published=True)
    rating_result = reviews.aggregate(avg_rating=Avg('rating'))
    data['average_rating'] = round(rating_result['avg_rating'] or 0, 2)
    data['total_reviews'] = reviews.count()
    
    # Services
    services = Service.objects.filter(primary_practitioner=practitioner, is_active=True)
    data['total_services'] = services.count()
    
    # Price range - note: price is now price_cents
    price_result = services.aggregate(
        min_price=Min('price_cents'),
        max_price=Max('price_cents')
    )
    data['price_range'] = {
        'min': price_result['min_price'] / 100 if price_result['min_price'] else None,
        'max': price_result['max_price'] / 100 if price_result['max_price'] else None
    }
    
    # Sessions count
    data['completed_sessions_count'] = practitioner.bookings.filter(status='completed').count()
    
    # Cancellation rate (for private profile)
    if include_private:
        total_bookings = practitioner.bookings.count()
        if total_bookings > 0:
            canceled_bookings = practitioner.bookings.filter(status='canceled').count()
            data['cancellation_rate'] = round((canceled_bookings / total_bookings) * 100, 2)
        else:
            data['cancellation_rate'] = 0
    
    # Location
    if practitioner.primary_location:
        data['primary_location'] = {
            'city': practitioner.primary_location.city,
            'state': practitioner.primary_location.state,
            'country': practitioner.primary_location.country,
            'latitude': practitioner.primary_location.latitude,
            'longitude': practitioner.primary_location.longitude
        }
    else:
        data['primary_location'] = None
    
    # Many-to-many relationships
    data['specializations'] = [
        {'id': s.id, 'content': s.content} 
        for s in practitioner.specializations.all()
    ]
    data['styles'] = [
        {'id': s.id, 'content': s.content} 
        for s in practitioner.styles.all()
    ]
    data['topics'] = [
        {'id': t.id, 'content': t.content} 
        for t in practitioner.topics.all()
    ]
    data['certifications'] = [
        {
            'id': c.id,  # Now using integer ID
            'certificate': c.certificate,
            'institution': c.institution,
            'issue_date': c.issue_date,
            'expiry_date': c.expiry_date
        }
        for c in practitioner.certifications.all()
    ]
    
    # Educations (for private profile)
    if include_private:
        data['educations'] = [
            {
                'id': e.id,  # Now using integer ID
                'degree': e.degree,
                'educational_institute': e.educational_institute
            }
            for e in practitioner.educations.all()
        ]
    
    return data


@sync_to_async
def get_practitioners_queryset(filters):
    """Get filtered practitioners queryset"""
    # Start with active, verified practitioners
    queryset = Practitioner.objects.filter(
        is_verified=True,
        practitioner_status='active'
    ).select_related(
        'user',
        'primary_location'
    ).prefetch_related(
        'specializations',
        'styles',
        'topics',
        'certifications',
        'services',
        'primary_services',
    )
    
    # Apply filters
    if filters.featured_only:
        queryset = queryset.filter(featured=True)
    
    # Location filters
    if filters.city:
        queryset = queryset.filter(primary_location__city__icontains=filters.city)
    if filters.state:
        queryset = queryset.filter(primary_location__state__icontains=filters.state)
    if filters.country:
        queryset = queryset.filter(primary_location__country__icontains=filters.country)
    
    # Service filters
    if filters.service_type_ids:
        queryset = queryset.filter(
            Q(primary_services__service_type_id__in=filters.service_type_ids) |
            Q(services__service_type_id__in=filters.service_type_ids)
        ).distinct()
    
    if filters.category_ids:
        queryset = queryset.filter(
            Q(primary_services__category_id__in=filters.category_ids) |
            Q(services__category_id__in=filters.category_ids)
        ).distinct()
    
    # Specialization filters
    if filters.specialization_ids:
        queryset = queryset.filter(specializations__id__in=filters.specialization_ids).distinct()
    if filters.style_ids:
        queryset = queryset.filter(styles__id__in=filters.style_ids).distinct()
    if filters.topic_ids:
        queryset = queryset.filter(topics__id__in=filters.topic_ids).distinct()
    
    # Price range filters
    if filters.min_price is not None or filters.max_price is not None:
        price_q = Q()
        if filters.min_price is not None:
            price_q &= Q(primary_services__price_cents__gte=int(filters.min_price * 100))
        if filters.max_price is not None:
            price_q &= Q(primary_services__price_cents__lte=int(filters.max_price * 100))
        queryset = queryset.filter(price_q).distinct()
    
    # Experience filter
    if filters.min_experience_years:
        queryset = queryset.filter(years_of_experience__gte=filters.min_experience_years)
    
    # Location type filter
    if filters.location_type:
        queryset = queryset.filter(
            Q(primary_services__location_type=filters.location_type) |
            Q(services__location_type=filters.location_type)
        ).distinct()
    
    # Rating filter
    if filters.min_rating:
        # Annotate with average rating and filter
        queryset = queryset.annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_published=True))
        ).filter(avg_rating__gte=filters.min_rating)
    
    # Language filter
    if filters.languages:
        queryset = queryset.filter(
            Q(primary_services__languages__code__in=filters.languages) |
            Q(services__languages__code__in=filters.languages)
        ).distinct()
    
    # Sorting
    if filters.sort_by == 'rating':
        queryset = queryset.annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_published=True))
        ).order_by('-avg_rating', '-featured')
    elif filters.sort_by == 'price_low':
        queryset = queryset.annotate(
            min_price=Min('primary_services__price_cents')
        ).order_by('min_price')
    elif filters.sort_by == 'price_high':
        queryset = queryset.annotate(
            max_price=Max('primary_services__price_cents')
        ).order_by('-max_price')
    elif filters.sort_by == 'experience':
        queryset = queryset.order_by('-years_of_experience', '-featured')
    elif filters.sort_by == 'availability':
        queryset = queryset.order_by(F('next_available_date').asc(nulls_last=True), '-featured')
    else:  # relevance or default
        queryset = queryset.order_by('-featured', '-is_verified', '-years_of_experience')
    
    return queryset

@sync_to_async
def get_queryset_count(queryset):
    """Get count of queryset"""
    return queryset.count()

@sync_to_async
def get_queryset_slice(queryset, start, end):
    """Get slice of queryset"""
    return list(queryset[start:end])

@sync_to_async
def get_practitioner_by_id(practitioner_id):
    """Get practitioner by ID with related data"""
    try:
        return Practitioner.objects.select_related(
            'user',
            'primary_location'
        ).prefetch_related(
            'specializations',
            'styles',
            'topics',
            'certifications',
            'services',
            'primary_services',
        ).get(id=practitioner_id, is_verified=True, practitioner_status='active')
    except Practitioner.DoesNotExist:
        return None

@sync_to_async
def get_practitioner_by_user(user):
    """Get practitioner by user"""
    try:
        return Practitioner.objects.select_related(
            'user',
            'primary_location'
        ).prefetch_related(
            'specializations',
            'styles',
            'topics',
            'certifications',
            'educations',
            'services',
            'primary_services',
        ).get(user=user)
    except Practitioner.DoesNotExist:
        return None

@sync_to_async
def update_practitioner_fields(practitioner, update_fields):
    """Update practitioner fields"""
    practitioner.save(update_fields=update_fields)

@sync_to_async
def update_practitioner_relationships(practitioner, update_data):
    """Update practitioner many-to-many relationships"""
    with db_transaction.atomic():
        if update_data.specialization_ids is not None:
            practitioner.specializations.set(update_data.specialization_ids)
        if update_data.style_ids is not None:
            practitioner.styles.set(update_data.style_ids)
        if update_data.topic_ids is not None:
            practitioner.topics.set(update_data.topic_ids)
        if update_data.certification_ids is not None:
            practitioner.certifications.set(update_data.certification_ids)
        if update_data.education_ids is not None:
            practitioner.educations.set(update_data.education_ids)

@sync_to_async
def refresh_practitioner(practitioner):
    """Refresh practitioner from database"""
    practitioner.refresh_from_db()

@sync_to_async
def get_practitioner_services(practitioner, is_active=None, service_type=None):
    """Get practitioner services"""
    # Get services where practitioner is primary
    primary_services = practitioner.primary_services.select_related(
        'service_type',
        'category'
    ).prefetch_related('languages')
    
    # Get services where practitioner is additional
    additional_services = practitioner.services.select_related(
        'service_type',
        'category'
    ).prefetch_related('languages')
    
    # Apply filters
    if is_active is not None:
        primary_services = primary_services.filter(is_active=is_active)
        additional_services = additional_services.filter(is_active=is_active)
    
    if service_type:
        primary_services = primary_services.filter(service_type__code=service_type)
        additional_services = additional_services.filter(service_type__code=service_type)
    
    return list(primary_services), list(additional_services)

@sync_to_async
def get_service_relationship(service, practitioner):
    """Get service-practitioner relationship"""
    return service.practitioner_relationships.filter(practitioner=practitioner).first()

@sync_to_async
def get_service_type(service_type_id):
    """Get service type by ID"""
    try:
        return ServiceType.objects.get(id=service_type_id)
    except ServiceType.DoesNotExist:
        return None

@sync_to_async
def get_service_category(category_id):
    """Get service category by ID"""
    try:
        return ServiceCategory.objects.get(id=category_id)
    except ServiceCategory.DoesNotExist:
        return None

@sync_to_async
def create_service_with_transaction(service_data, practitioner, service_type, category):
    """Create service with transaction"""
    with db_transaction.atomic():
        # Create service
        service = Service.objects.create(
            name=service_data.name,
            description=service_data.description,
            short_description=service_data.short_description,
            price_cents=int(service_data.price * 100),  # Convert to cents
            duration_minutes=service_data.duration_minutes,
            service_type=service_type,
            category=category,
            primary_practitioner=practitioner,
            max_participants=service_data.max_participants,
            min_participants=service_data.min_participants,
            experience_level=service_data.experience_level,
            age_min=service_data.age_min,
            age_max=service_data.age_max,
            location_type=service_data.location_type,
            what_youll_learn=service_data.what_youll_learn,
            prerequisites=service_data.prerequisites,
            includes=service_data.includes,
            tags=service_data.tags,
            image_url=service_data.image_url,
            video_url=service_data.video_url,
            is_active=service_data.is_active,
            is_public=service_data.is_public,
            status='published' if service_data.is_public else 'draft',
            published_at=timezone.now() if service_data.is_public else None,
        )
        
        # Set languages if provided
        if service_data.language_ids:
            service.languages.set(service_data.language_ids)
        
        return service

@sync_to_async
def get_service_by_id_and_practitioner(service_id, practitioner):
    """Get service by ID and practitioner"""
    try:
        return Service.objects.get(id=service_id, primary_practitioner=practitioner)
    except Service.DoesNotExist:
        return None

@sync_to_async
def update_service_fields(service, update_fields):
    """Update service fields"""
    service.save(update_fields=update_fields)

@sync_to_async
def update_service_languages(service, language_ids):
    """Update service languages"""
    service.languages.set(language_ids)

@sync_to_async
def refresh_service(service):
    """Refresh service from database"""
    service.refresh_from_db()

@sync_to_async
def check_future_bookings(service):
    """Check if service has future bookings"""
    return Booking.objects.filter(
        service=service,
        start_time__gte=timezone.now(),
        status__in=['pending', 'confirmed', 'in_progress']
    ).exists()

@sync_to_async
def update_service_status(service, is_active, is_public, status):
    """Update service status"""
    service.is_active = is_active
    service.is_public = is_public
    service.status = status
    service.save(update_fields=['is_active', 'is_public', 'status'])

@sync_to_async
def get_practitioner_schedules(practitioner):
    """Get practitioner schedules"""
    return list(Schedule.objects.filter(
        practitioner=practitioner,
        is_active=True
    ).prefetch_related('time_slots'))

@sync_to_async
def get_schedule_preference(practitioner):
    """Get schedule preference"""
    try:
        return SchedulePreference.objects.get(practitioner=practitioner)
    except SchedulePreference.DoesNotExist:
        return None

@sync_to_async
def get_existing_bookings(practitioner, start_date, end_date):
    """Get existing bookings in date range"""
    return list(Booking.objects.filter(
        practitioner=practitioner,
        start_time__date__gte=start_date,
        start_time__date__lte=end_date,
        status__in=['pending', 'confirmed', 'in_progress']
    ).select_related('service'))

@sync_to_async
def create_schedule_with_slots(schedule_data, practitioner):
    """Create schedule with time slots"""
    with db_transaction.atomic():
        # Create schedule
        schedule = Schedule.objects.create(
            name=schedule_data.name,
            practitioner=practitioner,
            description=schedule_data.description,
            timezone=schedule_data.timezone,
            is_default=schedule_data.is_default,
            is_active=schedule_data.is_active,
        )
        
        # Create time slots
        for slot_data in schedule_data.time_slots:
            ScheduleTimeSlot.objects.create(
                schedule=schedule,
                day=slot_data.day,
                start_time=slot_data.start_time,
                end_time=slot_data.end_time,
                is_active=True,
            )
        
        return schedule

@sync_to_async
def get_or_create_earnings_balance(practitioner):
    """Get or create earnings balance"""
    return PractitionerEarnings.objects.get_or_create(practitioner=practitioner)

@sync_to_async
def get_current_month_earnings(practitioner, current_month_start):
    """Get current month earnings"""
    return EarningsTransactionModel.objects.filter(
        practitioner=practitioner,
        created_at__gte=current_month_start,
        status__in=['pending', 'available', 'paid']
    ).aggregate(
        total=Sum('net_amount_cents'),
        count=Count('id')
    )

@sync_to_async
def get_average_commission(practitioner):
    """Get average commission rate"""
    return EarningsTransactionModel.objects.filter(
        practitioner=practitioner
    ).aggregate(avg=Avg('commission_rate'))['avg'] or Decimal('0.00')

@sync_to_async
def get_pending_transactions_count(practitioner):
    """Get pending transactions count"""
    return EarningsTransactionModel.objects.filter(
        practitioner=practitioner,
        status='pending'
    ).count()

@sync_to_async
def get_earnings_transactions_data(practitioner, status_filter=None, start_date=None, end_date=None, offset=0, limit=20):
    """Get earnings transactions"""
    # Build query
    queryset = EarningsTransactionModel.objects.filter(
        practitioner=practitioner
    ).select_related(
        'booking__service',
        'booking__user',
        'payout'
    ).order_by('-created_at')
    
    # Apply filters
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    if start_date:
        queryset = queryset.filter(created_at__date__gte=start_date)
    
    if end_date:
        queryset = queryset.filter(created_at__date__lte=end_date)
    
    # Paginate
    return list(queryset[offset:offset + limit])

@sync_to_async
def get_payout_history_data(practitioner, status_filter=None, offset=0, limit=20):
    """Get payout history"""
    # Build query
    queryset = PractitionerPayout.objects.filter(
        practitioner=practitioner
    ).order_by('-created_at')
    
    # Apply filters
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    # Paginate
    return list(queryset[offset:offset + limit])

@sync_to_async
def get_analytics_data(practitioner, start_date, end_date):
    """Get analytics data for practitioner"""
    # Get bookings in period
    bookings = Booking.objects.filter(
        practitioner=practitioner,
        created_at__date__gte=start_date,
        created_at__date__lte=end_date
    )
    
    # Calculate metrics
    total_bookings = bookings.count()
    completed_sessions = bookings.filter(status='completed').count()
    cancelled_bookings = bookings.filter(status='canceled').count()
    no_show_bookings = bookings.filter(status='no_show').count()
    
    # Revenue metrics
    revenue_data = bookings.filter(status='completed').aggregate(
        total=Sum('total_amount_cents'),
        avg=Avg('total_amount_cents')
    )
    
    # Client metrics
    unique_clients = bookings.values('user').distinct().count()
    repeat_clients = bookings.values('user').annotate(
        booking_count=Count('id')
    ).filter(booking_count__gt=1).count()
    
    # New clients this month
    current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_clients_this_month = bookings.filter(
        created_at__gte=current_month_start
    ).values('user').distinct().count()
    
    # Service stats
    service_stats = bookings.values(
        'service__id',
        'service__name'
    ).annotate(
        count=Count('id'),
        revenue=Sum('total_amount_cents')
    ).order_by('-count')[:5]
    
    # Time-based metrics
    busiest_days = bookings.values('start_time__week_day').annotate(
        count=Count('id')
    ).order_by('-count')
    
    busiest_hours = bookings.values('start_time__hour').annotate(
        count=Count('id')
    ).order_by('-count')[:5]
    
    return {
        'total_bookings': total_bookings,
        'completed_sessions': completed_sessions,
        'cancelled_bookings': cancelled_bookings,
        'no_show_bookings': no_show_bookings,
        'revenue_data': revenue_data,
        'unique_clients': unique_clients,
        'repeat_clients': repeat_clients,
        'new_clients_this_month': new_clients_this_month,
        'service_stats': list(service_stats),
        'busiest_days': list(busiest_days),
        'busiest_hours': list(busiest_hours),
    }

@sync_to_async
def get_previous_period_revenue(practitioner, prev_start_date, start_date):
    """Get previous period revenue"""
    return Booking.objects.filter(
        practitioner=practitioner,
        created_at__date__gte=prev_start_date,
        created_at__date__lt=start_date,
        status='completed'
    ).aggregate(total=Sum('total_amount_cents'))['total'] or 0

@sync_to_async
def get_reviews_data(practitioner):
    """Get reviews data"""
    reviews = Review.objects.filter(
        practitioner=practitioner,
        is_published=True
    )
    
    rating_distribution = reviews.values('rating').annotate(
        count=Count('id')
    ).order_by('rating')
    
    # Recent reviews
    recent_reviews = reviews.order_by('-created_at')[:5]
    
    return {
        'rating_distribution': list(rating_distribution),
        'recent_reviews': list(recent_reviews)
    }


# ==================== Public Endpoints ====================

@router.get("", response_model=PractitionerListResponse)
async def list_practitioners(
    filters: PractitionerListFilters = Depends(),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    List practitioners with filters for marketplace discovery.
    
    Supports filtering by:
    - Location (city, state, country, or coordinates with radius)
    - Service types and categories
    - Specializations, styles, topics
    - Availability
    - Price range
    - Rating and experience
    - Languages
    - Verification status
    """
    # Get filtered queryset
    queryset = await get_practitioners_queryset(filters)
    
    # Paginate
    total_count = await get_queryset_count(queryset)
    practitioners = await get_queryset_slice(queryset, pagination.offset, pagination.offset + pagination.limit)
    
    # Serialize results
    results = []
    for practitioner in practitioners:
        # Convert to dict with computed fields resolved
        practitioner_data = await practitioner_to_dict(practitioner)
        results.append(PractitionerPublicProfile(**practitioner_data))
    
    # Calculate pagination info
    total_pages = (total_count + pagination.page_size - 1) // pagination.page_size
    
    return PractitionerListResponse(
        results=results,
        count=total_count,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
        total_available=total_count,
        applied_filters=filters.model_dump(exclude_none=True)
    )


# ==================== Authenticated Practitioner Endpoints ====================

@router.get("/me", response_model=PractitionerPrivateProfile)
async def get_my_practitioner_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Get authenticated practitioner's own profile.
    
    Returns complete profile information including private data:
    - All public profile data
    - Contact information
    - Status and onboarding progress
    - Business settings
    - Performance metrics
    """
    practitioner = await get_practitioner_by_user(current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Convert to dict with computed fields and private data
    practitioner_data = await practitioner_to_dict(practitioner, include_private=True)
    
    # Add user fields
    practitioner_data['email'] = current_user.email
    practitioner_data['phone'] = current_user.phone_number
    
    return PractitionerPrivateProfile(**practitioner_data)


@router.patch("/me", response_model=PractitionerPrivateProfile)
async def update_my_practitioner_profile(
    update_data: PractitionerProfileUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Update authenticated practitioner's profile.
    
    Allows updating:
    - Display name and professional title
    - Bio and quote
    - Profile images and videos
    - Years of experience
    - Business settings (buffer time)
    - Specializations, styles, topics
    - Certifications and education
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Update simple fields
    update_fields = []
    for field, value in update_data.model_dump(exclude_none=True, exclude={'specialization_ids', 'style_ids', 'topic_ids', 'certification_ids', 'education_ids'}).items():
        if hasattr(practitioner, field):
            setattr(practitioner, field, value)
            update_fields.append(field)
    
    if update_fields:
        await update_practitioner_fields(practitioner, update_fields)
    
    # Update many-to-many relationships
    await update_practitioner_relationships(practitioner, update_data)
    
    # Refresh and return updated profile
    await refresh_practitioner(practitioner)
    
    # Convert to dict with computed fields and private data
    practitioner_data = await practitioner_to_dict(practitioner, include_private=True)
    
    # Add user fields
    practitioner_data['email'] = current_user.email
    practitioner_data['phone'] = current_user.phone_number
    
    return PractitionerPrivateProfile(**practitioner_data)


# ==================== Service Management Endpoints ====================

@router.get("/me/services", response_model=List[PractitionerServiceResponse])
async def list_my_services(
    is_active: Optional[bool] = Query(None),
    service_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """
    List practitioner's services.
    
    Returns all services where the practitioner is either:
    - Primary practitioner
    - Additional practitioner
    
    Can filter by:
    - Active/inactive status
    - Service type
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Get services
    primary_services, additional_services = await get_practitioner_services(practitioner, is_active, service_type)
    
    # Build response manually for each service
    @sync_to_async
    def build_service_response(service, is_primary=True):
        return {
            'id': service.id,
            'public_uuid': service.public_uuid,
            'name': service.name,
            'slug': service.slug if hasattr(service, 'slug') and service.slug else (service.name.lower().replace(' ', '-') if service.name else 'service'),
            'description': service.description,
            'service_type': service.service_type.code if service.service_type else 'session',
            'category': {
                'id': service.category.id,
                'name': service.category.name,
                'slug': service.category.slug
            } if service.category else None,
            'price_cents': service.price_cents,
            'price': Decimal(service.price_cents) / 100,
            'duration_minutes': service.duration_minutes,
            'primary_practitioner': {
                'id': service.primary_practitioner.id,
                'display_name': service.primary_practitioner.display_name,
                'slug': service.primary_practitioner.slug if hasattr(service.primary_practitioner, 'slug') else service.primary_practitioner.display_name.lower().replace(' ', '-')
            } if service.primary_practitioner else None,
            'is_active': service.is_active,
            'is_public': service.is_public,
            'booking_count': 0,  # TODO: Calculate actual booking count
            'total_bookings': 0,  # TODO: Calculate actual total bookings
            'is_primary_practitioner': is_primary,
            'created_at': service.created_at,
            'updated_at': service.updated_at
        }
    
    # Combine and serialize
    all_services = []
    
    # Add primary services
    for service in primary_services:
        service_data = await build_service_response(service, True)
        all_services.append(PractitionerServiceResponse(**service_data))
    
    # Add additional services
    for service in additional_services:
        # Check if already added as primary
        if not any(s.id == service.id for s in all_services):
            service_data = await build_service_response(service, False)
            # Get revenue share for this practitioner
            relationship = await get_service_relationship(service, practitioner)
            if relationship:
                service_data['revenue_share_percentage'] = relationship.revenue_share_percentage
            all_services.append(PractitionerServiceResponse(**service_data))
    
    return all_services


@router.post("/me/services", response_model=PractitionerServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: PractitionerServiceCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new service offering.
    
    Creates a service with the authenticated practitioner as the primary practitioner.
    Service creation limits are enforced based on subscription tier.
    """
    from api.v1.permissions import check_service_limit
    
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Check service creation limit based on subscription tier
    await check_service_limit(practitioner)
    
    # Verify service type exists
    service_type = await get_service_type(service_data.service_type_id)
    if not service_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid service type"
        )
    
    # Verify category if provided
    category = None
    if service_data.category_id:
        category = await get_service_category(service_data.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category"
            )
    
    service = await create_service_with_transaction(service_data, practitioner, service_type, category)
    
    # Build response manually
    @sync_to_async
    def build_service_response():
        return {
            'id': service.id,
            'public_uuid': service.public_uuid,
            'name': service.name,
            'slug': service.slug if hasattr(service, 'slug') and service.slug else (service.name.lower().replace(' ', '-') if service.name else 'service'),
            'description': service.description,
            'service_type': service.service_type.code if service.service_type else 'session',
            'category': {
                'id': service.category.id,
                'name': service.category.name,
                'slug': service.category.slug
            } if service.category else None,
            'price_cents': service.price_cents,
            'price': Decimal(service.price_cents) / 100,
            'duration_minutes': service.duration_minutes,
            'primary_practitioner': {
                'id': practitioner.id,
                'display_name': practitioner.display_name,
                'slug': practitioner.slug if hasattr(practitioner, 'slug') and practitioner.slug else (practitioner.display_name.lower().replace(' ', '-') if practitioner.display_name else f'practitioner-{practitioner.id}')
            },
            'is_active': service.is_active,
            'is_public': service.is_public,
            'booking_count': 0,
            'total_bookings': 0,
            'is_primary_practitioner': True,
            'created_at': service.created_at,
            'updated_at': service.updated_at
        }
    
    service_data = await build_service_response()
    return PractitionerServiceResponse(**service_data)


@router.patch("/me/services/{service_id}", response_model=PractitionerServiceResponse)
async def update_service(
    service_id: int,
    update_data: PractitionerServiceUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Update a service offering.
    
    Only the primary practitioner can update the service.
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Get service and verify ownership
    service = await get_service_by_id_and_practitioner(service_id, practitioner)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found or you don't have permission to update it"
        )
    
    # Verify category if being updated
    if update_data.category_id is not None:
        category = await get_service_category(update_data.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category"
            )
        service.category = category
    
    # Update fields
    update_fields = []
    for field, value in update_data.model_dump(exclude_none=True, exclude={'language_ids', 'category_id'}).items():
        if hasattr(service, field):
            # Handle price conversion
            if field == 'price':
                setattr(service, 'price_cents', int(value * 100))
                update_fields.append('price_cents')
            else:
                setattr(service, field, value)
                update_fields.append(field)
    
    # Update status and published_at if changing public status
    if update_data.is_public is not None:
        if update_data.is_public and service.status == 'draft':
            service.status = 'published'
            service.published_at = timezone.now()
            update_fields.extend(['status', 'published_at'])
        elif not update_data.is_public and service.status == 'published':
            service.status = 'paused'
            update_fields.append('status')
    
    if update_fields:
        await update_service_fields(service, update_fields)
    
    # Update languages if provided
    if update_data.language_ids is not None:
        await update_service_languages(service, update_data.language_ids)
    
    await refresh_service(service)
    return PractitionerServiceResponse.model_validate(service)


@router.delete("/me/services/{service_id}", response_model=MessageResponse)
async def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Delete (deactivate) a service offering.
    
    Services are not physically deleted but marked as inactive and discontinued.
    Only services with no future bookings can be deleted.
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Get service and verify ownership
    service = await get_service_by_id_and_practitioner(service_id, practitioner)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found or you don't have permission to delete it"
        )
    
    # Check for future bookings
    future_bookings = await check_future_bookings(service)
    
    if future_bookings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete service with future bookings. Please cancel all bookings first."
        )
    
    # Deactivate service
    await update_service_status(service, False, False, 'discontinued')
    
    return MessageResponse(
        message="Service has been successfully deleted",
        success=True
    )


# ==================== Service Categories Endpoints ====================

@router.get("/me/service-categories", response_model=PractitionerServiceCategoryListResponse)
async def list_my_service_categories(
    current_user: User = Depends(get_current_user),
    pagination: PaginationParams = Depends(get_pagination_params),
):
    """
    List practitioner's custom service categories.
    Categories are returned in order (for drag-drop support).
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    @sync_to_async
    def get_categories():
        categories = PractitionerServiceCategory.objects.filter(
            practitioner=practitioner,
            is_active=True
        ).annotate(
            service_count=Count('services')
        ).order_by('order', 'name')
        
        results = []
        for category in categories:
            results.append({
                'id': category.id,
                'practitioner_id': category.practitioner_id,
                'name': category.name,
                'slug': category.slug,
                'description': category.description,
                'icon': category.icon,
                'color': category.color,
                'is_active': category.is_active,
                'order': category.order,
                'service_count': category.service_count,
                'created_at': category.created_at,
                'updated_at': category.updated_at,
            })
        return results
    
    results = await get_categories()
    
    return PractitionerServiceCategoryListResponse(
        results=results,
        total=len(results),
        limit=pagination.page_size,
        offset=0,
        has_more=False
    )


@router.post("/me/service-categories", response_model=PractitionerServiceCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_service_category(
    category_data: PractitionerServiceCategoryCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new custom service category for organizing services.
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    @sync_to_async
    @db_transaction.atomic
    def create_category():
        # Get the next order number
        max_order = PractitionerServiceCategory.objects.filter(
            practitioner=practitioner
        ).aggregate(Max('order'))['order__max'] or 0
        
        category = PractitionerServiceCategory.objects.create(
            practitioner=practitioner,
            name=category_data.name,
            description=category_data.description,
            icon=category_data.icon,
            color=category_data.color,
            is_active=category_data.is_active,
            order=max_order + 1
        )
        
        return {
            'id': category.id,
            'practitioner_id': category.practitioner_id,
            'name': category.name,
            'slug': category.slug,
            'description': category.description,
            'icon': category.icon,
            'color': category.color,
            'is_active': category.is_active,
            'order': category.order,
            'service_count': 0,
            'created_at': category.created_at,
            'updated_at': category.updated_at,
        }
    
    category_response = await create_category()
    return PractitionerServiceCategoryResponse(**category_response)


@router.put("/me/service-categories/reorder", response_model=MessageResponse)
async def reorder_service_categories(
    reorder_data: CategoryReorderRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Reorder service categories by providing an ordered list of category IDs.
    Supports drag-and-drop functionality.
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    @sync_to_async
    @db_transaction.atomic
    def reorder_categories():
        # Verify all category IDs belong to this practitioner
        categories = PractitionerServiceCategory.objects.filter(
            id__in=reorder_data.category_ids,
            practitioner=practitioner
        )
        
        if categories.count() != len(reorder_data.category_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid category IDs provided"
            )
        
        # Update order based on position in the list
        for index, category_id in enumerate(reorder_data.category_ids):
            PractitionerServiceCategory.objects.filter(
                id=category_id,
                practitioner=practitioner
            ).update(order=index)
        
        return True
    
    await reorder_categories()
    
    return MessageResponse(
        message="Categories reordered successfully",
        success=True
    )


@router.put("/me/service-categories/{category_id}", response_model=PractitionerServiceCategoryResponse)
async def update_service_category(
    category_id: int,
    category_data: PractitionerServiceCategoryUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Update a custom service category.
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    @sync_to_async
    @db_transaction.atomic
    def update_category():
        try:
            category = PractitionerServiceCategory.objects.select_for_update().get(
                id=category_id,
                practitioner=practitioner
            )
        except PractitionerServiceCategory.DoesNotExist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Update fields if provided
        if category_data.name is not None:
            category.name = category_data.name
            category.slug = None  # Force regeneration
        if category_data.description is not None:
            category.description = category_data.description
        if category_data.icon is not None:
            category.icon = category_data.icon
        if category_data.color is not None:
            category.color = category_data.color
        if category_data.is_active is not None:
            category.is_active = category_data.is_active
        if category_data.order is not None:
            category.order = category_data.order
        
        category.save()
        
        # Get service count
        service_count = category.services.count()
        
        return {
            'id': category.id,
            'practitioner_id': category.practitioner_id,
            'name': category.name,
            'slug': category.slug,
            'description': category.description,
            'icon': category.icon,
            'color': category.color,
            'is_active': category.is_active,
            'order': category.order,
            'service_count': service_count,
            'created_at': category.created_at,
            'updated_at': category.updated_at,
        }
    
    category_response = await update_category()
    return PractitionerServiceCategoryResponse(**category_response)


@router.delete("/me/service-categories/{category_id}", response_model=MessageResponse)
async def delete_service_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Delete a custom service category.
    Services in this category will have their practitioner_category set to null.
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    @sync_to_async
    @db_transaction.atomic
    def delete_category():
        try:
            category = PractitionerServiceCategory.objects.get(
                id=category_id,
                practitioner=practitioner
            )
        except PractitionerServiceCategory.DoesNotExist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Count services that will be affected
        service_count = category.services.count()
        
        # Delete the category (services will have practitioner_category set to null)
        category.delete()
        
        return service_count
    
    service_count = await delete_category()
    
    return MessageResponse(
        message=f"Category deleted successfully. {service_count} services were uncategorized.",
        success=True
    )


# ==================== Availability Management Endpoints ====================

@router.get("/me/availability", response_model=AvailabilityResponse)
async def get_my_availability(
    query: AvailabilityQuery = Depends(),
    current_user: User = Depends(get_current_user),
):
    """
    Get practitioner's availability for a date range.
    
    Returns:
    - Available time slots based on schedules
    - Existing bookings (blocked slots)
    - Time zone information
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Get practitioner's schedules
    schedules = await get_practitioner_schedules(practitioner)
    
    # Get schedule preference for timezone
    preference = await get_schedule_preference(practitioner)
    timezone_str = preference.timezone if preference else query.timezone
    
    # Get existing bookings in the date range
    existing_bookings = await get_existing_bookings(practitioner, query.start_date, query.end_date)
    
    # Build availability slots
    # TODO: Implement complex availability calculation based on schedules and bookings
    # This is a simplified version
    available_slots = []
    
    # Serialize schedules - now we can use model_validate directly
    schedule_responses = [ScheduleResponse.model_validate(schedule) for schedule in schedules]
    
    return AvailabilityResponse(
        practitioner_id=practitioner.id,
        timezone=timezone_str,
        available_slots=available_slots,
        schedules=schedule_responses
    )


@router.post("/me/availability/schedules", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_data: ScheduleCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new availability schedule.
    
    Practitioners can have multiple named schedules (e.g., "Summer Hours", "Weekend Schedule").
    One schedule can be set as default.
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    schedule = await create_schedule_with_slots(schedule_data, practitioner)
    
    await sync_to_async(schedule.refresh_from_db)()
    
    # Directly validate the model since we're using integer IDs now
    return ScheduleResponse.model_validate(schedule)


# ==================== Earnings and Analytics Endpoints ====================

@router.get("/me/earnings", response_model=EarningsOverview)
async def get_earnings_summary(
    current_user: User = Depends(get_current_user),
):
    """
    Get practitioner's earnings summary.
    
    Returns:
    - Current balances (pending and available)
    - Lifetime earnings and payouts
    - Recent activity summary
    - Commission information
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Get or create earnings balance
    balance, _ = await get_or_create_earnings_balance(practitioner)
    
    # Get current month stats
    current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_month_earnings = await get_current_month_earnings(practitioner, current_month_start)
    
    # Get average commission rate
    avg_commission = await get_average_commission(practitioner)
    
    # Count pending transactions
    pending_count = await get_pending_transactions_count(practitioner)
    
    return EarningsOverview(
        pending_balance=balance.pending_balance,
        available_balance=balance.available_balance,
        lifetime_earnings=balance.lifetime_earnings,
        lifetime_payouts=balance.lifetime_payouts_cents / 100 if balance.lifetime_payouts_cents else Decimal('0.00'),
        last_payout_date=balance.last_payout_date,
        pending_transactions_count=pending_count,
        current_month_earnings=Decimal(current_month_earnings['total'] or 0) / 100,
        current_month_sessions=current_month_earnings['count'] or 0,
        average_commission_rate=avg_commission
    )


@router.get("/me/earnings/transactions", response_model=List[EarningsTransaction])
async def get_earnings_transactions(
    status: Optional[str] = Query(None, regex="^(pending|available|paid|reversed)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed earnings transactions.
    
    Can filter by:
    - Transaction status
    - Date range
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Get transactions
    transactions = await get_earnings_transactions_data(
        practitioner, status, start_date, end_date, 
        pagination.offset, pagination.limit
    )
    
    # Serialize
    results = []
    for txn in transactions:
        results.append(EarningsTransaction(
            id=txn.id,
            booking_id=txn.booking.id,
            service_name=txn.booking.service.name,
            client_name=txn.booking.user.full_name,
            gross_amount=txn.gross_amount,
            commission_rate=txn.commission_rate,
            commission_amount=txn.commission_amount,
            net_amount=txn.net_amount,
            status=txn.status,
            available_after=txn.available_after,
            service_date=txn.booking.start_time,
            created_at=txn.created_at,
            payout_id=txn.payout.id if txn.payout else None,
            payout_date=txn.payout.payout_date if txn.payout else None,
        ))
    
    return results


@router.get("/me/earnings/payouts", response_model=List[PayoutHistory])
async def get_payout_history(
    status: Optional[str] = Query(None, regex="^(pending|processing|completed|failed|canceled)$"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_user),
):
    """
    Get payout history.
    
    Returns list of payouts with their status and details.
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Get payouts
    payouts = await get_payout_history_data(
        practitioner, status, pagination.offset, pagination.limit
    )
    
    # Serialize
    results = []
    for payout in payouts:
        results.append(PayoutHistory(
            id=payout.id,
            amount=payout.credits_payout,
            currency=payout.currency,
            status=payout.status,
            payment_method=payout.payment_method,
            transaction_count=payout.transaction_count,
            transaction_fee=Decimal(payout.transaction_fee_cents) / 100 if payout.transaction_fee_cents else None,
            created_at=payout.created_at,
            payout_date=payout.payout_date,
            stripe_transfer_id=payout.stripe_transfer_id,
            notes=payout.notes,
        ))
    
    return results


@router.get("/me/analytics", response_model=PractitionerAnalytics)
async def get_performance_analytics(
    period_days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
):
    """
    Get performance analytics for the practitioner.
    
    Returns comprehensive analytics including:
    - Booking statistics
    - Revenue metrics
    - Client analytics
    - Service performance
    - Time-based patterns
    - Ratings and reviews
    """
    practitioner = await sync_to_async(Practitioner.objects.get)(user=current_user)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered as a practitioner"
        )
    
    # Calculate date range
    end_date = timezone.now().date()
    start_date = end_date - timezone.timedelta(days=period_days)
    
    # Get analytics data
    analytics_data = await get_analytics_data(practitioner, start_date, end_date)
    
    # Calculate derived metrics
    total_bookings = analytics_data['total_bookings']
    cancelled_bookings = analytics_data['cancelled_bookings']
    no_show_bookings = analytics_data['no_show_bookings']
    
    cancellation_rate = (cancelled_bookings / total_bookings * 100) if total_bookings > 0 else 0
    no_show_rate = (no_show_bookings / total_bookings * 100) if total_bookings > 0 else 0
    
    # Revenue metrics
    revenue_data = analytics_data['revenue_data']
    total_revenue = Decimal(revenue_data['total'] or 0) / 100
    average_session_value = Decimal(revenue_data['avg'] or 0) / 100
    
    # Calculate revenue growth (compare to previous period)
    prev_start_date = start_date - timezone.timedelta(days=period_days)
    prev_revenue = await get_previous_period_revenue(practitioner, prev_start_date, start_date)
    
    revenue_growth_percentage = 0
    if prev_revenue > 0:
        revenue_growth_percentage = ((revenue_data['total'] or 0) - prev_revenue) / prev_revenue * 100
    
    # Client metrics
    unique_clients = analytics_data['unique_clients']
    repeat_clients = analytics_data['repeat_clients']
    repeat_client_rate = (repeat_clients / unique_clients * 100) if unique_clients > 0 else 0
    
    # Service metrics
    most_popular_services = [
        {
            'service_id': stat['service__id'],
            'service_name': stat['service__name'],
            'booking_count': stat['count'],
            'revenue': Decimal(stat['revenue'] or 0) / 100
        }
        for stat in analytics_data['service_stats']
    ]
    
    # Get reviews data
    reviews_data = await get_reviews_data(practitioner)
    
    rating_dist_dict = {str(i): 0 for i in range(1, 6)}
    for item in reviews_data['rating_distribution']:
        rating_dist_dict[str(item['rating'])] = item['count']
    
    # Recent reviews
    recent_reviews_data = [
        {
            'id': review.id,
            'rating': review.rating,
            'comment': review.comment,
            'created_at': review.created_at,
            'client_name': review.user.full_name
        }
        for review in reviews_data['recent_reviews']
    ]
    
    # TODO: Calculate more complex metrics like:
    # - Average client lifetime value
    # - Service utilization rate
    # - Average booking lead time
    # - Monthly trends
    
    return PractitionerAnalytics(
        total_bookings=total_bookings,
        completed_sessions=analytics_data['completed_sessions'],
        cancellation_rate=cancellation_rate,
        no_show_rate=no_show_rate,
        total_revenue=total_revenue,
        average_session_value=average_session_value,
        revenue_growth_percentage=revenue_growth_percentage,
        total_clients=unique_clients,
        repeat_client_rate=repeat_client_rate,
        average_client_lifetime_value=Decimal('0.00'),  # TODO: Implement
        new_clients_this_month=analytics_data['new_clients_this_month'],
        most_popular_services=most_popular_services,
        service_utilization_rate=0.0,  # TODO: Implement
        average_booking_lead_time_days=0.0,  # TODO: Implement
        busiest_days=[],  # TODO: Process busiest_days data
        busiest_hours=[{'hour': h['start_time__hour'], 'count': h['count']} for h in analytics_data['busiest_hours']],
        monthly_trends=[],  # TODO: Implement
        average_rating=practitioner.average_rating,
        total_reviews=practitioner.total_reviews,
        rating_distribution=rating_dist_dict,
        recent_reviews=recent_reviews_data,
        period_start=start_date,
        period_end=end_date
    )


# ==================== Public Practitioner Profile Endpoint ====================

@router.get("/{practitioner_id}", response_model=PractitionerPublicProfile)
async def get_practitioner_profile(
    practitioner_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Get public practitioner profile by ID.
    
    Returns public information about a practitioner including:
    - Basic profile information
    - Specializations and qualifications
    - Service offerings
    - Ratings and reviews summary
    - Availability indicator
    """
    practitioner = await get_practitioner_by_id(practitioner_id)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practitioner not found"
        )
    
    # Convert to dict with computed fields
    practitioner_data = await practitioner_to_dict(practitioner)
    return PractitionerPublicProfile(**practitioner_data)