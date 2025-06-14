from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import time
import logging

from fastapi import APIRouter, Depends, Query, HTTPException, status
from django.db import models
from django.db.models import Q, F, Count, Avg, Min, Max, Case, When, Value, FloatField
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.core.cache import cache
from django.utils import timezone
from geopy.distance import distance as geo_distance
from asgiref.sync import sync_to_async

from api.dependencies import get_db, get_current_user_optional
from api.v1.schemas.search import (
    UnifiedSearchRequest, UnifiedSearchResponse, SearchResultItem,
    ServiceSearchResult, PractitionerSearchResult, LocationSearchResult,
    AutocompleteRequest, AutocompleteResponse, AutocompleteSuggestion,
    NearbySearchRequest, TrendingResponse, TrendingItem, PopularSearch,
    SearchSuggestionsResponse, SearchHistoryItem, PersonalizedSuggestion,
    AdvancedServiceSearchRequest, AdvancedPractitionerSearchRequest,
    CategoryBrowseResponse, CategoryWithCount,
    DynamicFiltersResponse, FilterGroup, FilterOption,
    SearchScore, SearchFacet, FacetValue, SearchType
)

from services.models import Service, ServiceCategory, ServiceType
from practitioners.models import Practitioner
from locations.models import City, State, Country
from reviews.models import Review
from analytics.models import SearchLog, ServiceView
from users.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Search & Discovery"])


# ============================================================================
# UNIFIED SEARCH ENDPOINT
# ============================================================================

@router.post("/", response_model=UnifiedSearchResponse)
async def unified_search(
    request: UnifiedSearchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db=Depends(get_db)
):
    """
    Unified search endpoint supporting services, practitioners, and locations.
    Features:
    - Full-text search with fuzzy matching
    - Relevance scoring and ranking
    - Faceted search with dynamic filters
    - Location-based boosting
    - Personalized results for authenticated users
    - Search analytics tracking
    """
    start_time = time.time()
    
    try:
        # Log search for analytics
        if request.session_id or current_user:
            await sync_to_async(SearchLog.objects.create)(
                user=current_user,
                session_id=request.session_id,
                query=request.query,
                search_type=request.search_type.value,
                filters=request.filters.model_dump() if request.filters else {},
                location={
                    'lat': request.location.latitude,
                    'lng': request.location.longitude
                } if request.location else None,
                ip_address=None  # Set from request context if needed
            )
        
        results = []
        services = []
        practitioners = []
        locations = []
        
        # Perform search based on type
        if request.search_type in [SearchType.ALL, SearchType.SERVICES]:
            services = await search_services(request, current_user)
            if request.search_type == SearchType.ALL:
                results.extend([
                    SearchResultItem(
                        type="service",
                        data=service.model_dump(),
                        score=service.score.total if service.score else 0
                    ) for service in services[:10]  # Limit in unified view
                ])
        
        if request.search_type in [SearchType.ALL, SearchType.PRACTITIONERS]:
            practitioners = await search_practitioners(request, current_user)
            if request.search_type == SearchType.ALL:
                results.extend([
                    SearchResultItem(
                        type="practitioner",
                        data=practitioner.model_dump(),
                        score=practitioner.score.total if practitioner.score else 0
                    ) for practitioner in practitioners[:10]
                ])
        
        if request.search_type in [SearchType.ALL, SearchType.LOCATIONS]:
            locations = await search_locations(request)
            if request.search_type == SearchType.ALL:
                results.extend([
                    SearchResultItem(
                        type="location",
                        data=location.model_dump(),
                        score=1.0  # Locations don't have relevance scores
                    ) for location in locations[:5]
                ])
        
        # Sort unified results by score
        results.sort(key=lambda x: x.score, reverse=True)
        
        # Calculate facets
        facets = await calculate_facets(request, services, practitioners)
        
        # Generate suggestions if no/few results
        suggestions = []
        if len(results) < 5:
            suggestions = await generate_search_suggestions(request.query)
        
        # Calculate pagination
        total_results = len(services) + len(practitioners) + len(locations)
        total_pages = (total_results + request.page_size - 1) // request.page_size
        
        search_time_ms = int((time.time() - start_time) * 1000)
        
        return UnifiedSearchResponse(
            success=True,
            results=results,
            services=services,
            practitioners=practitioners,
            locations=locations,
            total_results=total_results,
            page=request.page,
            page_size=request.page_size,
            total_pages=total_pages,
            facets=facets,
            suggestions=suggestions,
            search_time_ms=search_time_ms
        )
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed"
        )


# ============================================================================
# AUTOCOMPLETE ENDPOINT
# ============================================================================

@router.get("/autocomplete", response_model=AutocompleteResponse)
async def autocomplete(
    request: AutocompleteRequest = Depends(),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Provide autocomplete suggestions based on partial query.
    Returns suggestions from:
    - Previous searches
    - Service names
    - Practitioner names
    - Categories
    - Locations
    """
    start_time = time.time()
    
    # Check cache first
    cache_key = f"autocomplete:{request.query}:{request.search_type.value}"
    cached = cache.get(cache_key)
    if cached:
        return AutocompleteResponse(
            success=True,
            suggestions=cached,
            query_time_ms=1
        )
    
    suggestions = []
    query_lower = request.query.lower()
    
    # Search previous queries (popular searches)
    if request.search_type in [SearchType.ALL]:
        popular = await sync_to_async(list)(SearchLog.objects.filter(
            query__icontains=query_lower
        ).values('query').annotate(
            count=Count('id')
        ).order_by('-count')[:5])
        
        for item in popular:
            suggestions.append(AutocompleteSuggestion(
                text=item['query'],
                type="query",
                subtitle=f"{item['count']} searches",
                metadata={'count': item['count']}
            ))
    
    # Search services
    if request.search_type in [SearchType.ALL, SearchType.SERVICES]:
        services = await sync_to_async(list)(Service.objects.filter(
            Q(name__icontains=query_lower) |
            Q(short_description__icontains=query_lower),
            is_active=True,
            is_public=True
        ).select_related('primary_practitioner')[:5])
        
        for service in services:
            suggestions.append(AutocompleteSuggestion(
                text=service.name,
                type="service",
                subtitle=f"by {service.primary_practitioner.display_name}",
                metadata={
                    'id': str(service.public_uuid),
                    'price': float(service.price)
                }
            ))
    
    # Search practitioners
    if request.search_type in [SearchType.ALL, SearchType.PRACTITIONERS]:
        practitioners = await sync_to_async(list)(Practitioner.objects.filter(
            Q(display_name__icontains=query_lower) |
            Q(professional_title__icontains=query_lower),
            is_verified=True,
            practitioner_status='active'
        )[:5])
        
        for practitioner in practitioners:
            suggestions.append(AutocompleteSuggestion(
                text=practitioner.display_name,
                type="practitioner",
                subtitle=practitioner.professional_title,
                metadata={'id': str(practitioner.public_uuid)}
            ))
    
    # Search categories
    if request.include_categories:
        categories = await sync_to_async(list)(ServiceCategory.objects.filter(
            name__icontains=query_lower,
            is_active=True
        )[:3])
        
        for category in categories:
            suggestions.append(AutocompleteSuggestion(
                text=category.name,
                type="category",
                subtitle="Category",
                icon=category.icon,
                metadata={'id': category.id}
            ))
    
    # Sort by relevance (exact matches first)
    suggestions.sort(
        key=lambda x: (
            not x.text.lower().startswith(query_lower),
            len(x.text)
        )
    )
    
    # Limit results
    suggestions = suggestions[:request.limit]
    
    # Cache for 5 minutes
    cache.set(cache_key, suggestions, 300)
    
    query_time_ms = int((time.time() - start_time) * 1000)
    
    return AutocompleteResponse(
        success=True,
        suggestions=suggestions,
        query_time_ms=query_time_ms
    )


# ============================================================================
# TRENDING ENDPOINT
# ============================================================================

@router.get("/trending", response_model=TrendingResponse)
async def get_trending(
    period: str = Query("week", enum=["day", "week", "month"]),
    location: Optional[str] = Query(None, description="City slug for local trends"),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get trending searches, services, and practitioners.
    Analyzes search logs and view counts to identify trends.
    """
    # Calculate date range
    now = timezone.now()
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(weeks=1)
    else:  # month
        start_date = now - timedelta(days=30)
    
    # Get trending searches
    trending_searches = await sync_to_async(list)(SearchLog.objects.filter(
        created_at__gte=start_date
    ).values('query').annotate(
        count=Count('id')
    ).order_by('-count')[:limit])
    
    popular_searches = [
        PopularSearch(
            query=item['query'],
            count=item['count']
        ) for item in trending_searches
    ]
    
    # Get trending services (by views)
    trending_service_ids = await sync_to_async(list)(ServiceView.objects.filter(
        viewed_at__gte=start_date
    ).values('service_id').annotate(
        count=Count('id')
    ).order_by('-count')[:limit])
    
    service_ids = [item['service_id'] for item in trending_service_ids]
    services = await sync_to_async(list)(Service.objects.filter(
        id__in=service_ids,
        is_active=True,
        is_public=True
    ).select_related('primary_practitioner', 'category'))
    
    # Convert to search results
    trending_services = []
    for service in services:
        view_count = next(
            item['count'] for item in trending_service_ids 
            if item['service_id'] == service.id
        )
        
        result = ServiceSearchResult(
            id=str(service.public_uuid),
            name=service.name,
            short_description=service.short_description,
            service_type=service.service_type.name,
            category_name=service.category.name if service.category else None,
            practitioner_id=str(service.primary_practitioner.public_uuid),
            practitioner_name=service.primary_practitioner.display_name,
            practitioner_title=service.primary_practitioner.professional_title,
            price=service.price,
            price_display=f"${service.price}",
            duration_minutes=service.duration_minutes,
            location_type=service.location_type,
            experience_level=service.experience_level,
            max_participants=service.max_participants,
            average_rating=service.average_rating,
            total_reviews=service.total_reviews,
            is_available=service.is_available(),
            image_url=service.image_url,
            is_featured=service.is_featured,
            is_new=(timezone.now() - service.created_at).days < 30
        )
        result.score = SearchScore(total=view_count, popularity_boost=view_count)
        trending_services.append(result)
    
    # Get trending categories
    category_counts = await sync_to_async(list)(Service.objects.filter(
        is_active=True,
        is_public=True,
        category__isnull=False
    ).values(
        'category__id', 'category__name'
    ).annotate(
        count=Count('id')
    ).order_by('-count')[:5])
    
    trending_categories = [
        TrendingItem(
            type="category",
            text=item['category__name'],
            count=item['count']
        ) for item in category_counts
    ]
    
    return TrendingResponse(
        success=True,
        trending_searches=popular_searches,
        trending_services=trending_services,
        trending_categories=trending_categories,
        period=period,
        generated_at=now
    )


# ============================================================================
# NEARBY SEARCH ENDPOINT
# ============================================================================

@router.post("/nearby", response_model=UnifiedSearchResponse)
async def search_nearby(
    request: NearbySearchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Geospatial search for services and practitioners near a location.
    Uses coordinates to find and rank results by distance.
    """
    start_time = time.time()
    
    results = []
    services = []
    practitioners = []
    
    # Convert to unified search request
    unified_request = UnifiedSearchRequest(
        query="",  # No text query for nearby search
        search_type=request.search_type,
        filters=request.filters,
        location=request.location,
        sort_by="distance",
        page=request.page,
        page_size=request.page_size,
        boost_local=True
    )
    
    # Search based on type
    if request.search_type in [SearchType.ALL, SearchType.SERVICES]:
        # Find services with addresses near location
        nearby_services_qs = Service.objects.filter(
            is_active=True,
            is_public=True,
            location_type__in=['in_person', 'hybrid'],
            address__latitude__isnull=False,
            address__longitude__isnull=False
        ).select_related('primary_practitioner', 'address', 'category')
        
        # Apply filters
        if request.filters:
            nearby_services_qs = apply_service_filters(nearby_services_qs, request.filters)
        
        nearby_services = await sync_to_async(list)(nearby_services_qs)
        
        # Calculate distances and filter by radius
        service_results = []
        for service in nearby_services:
            if service.address and service.address.latitude and service.address.longitude:
                distance_miles = geo_distance(
                    (request.location.latitude, request.location.longitude),
                    (service.address.latitude, service.address.longitude)
                ).miles
                
                if distance_miles <= request.radius_miles:
                    result = ServiceSearchResult(
                        id=str(service.public_uuid),
                        name=service.name,
                        short_description=service.short_description,
                        service_type=service.service_type.name,
                        category_name=service.category.name if service.category else None,
                        practitioner_id=str(service.primary_practitioner.public_uuid),
                        practitioner_name=service.primary_practitioner.display_name,
                        price=service.price,
                        price_display=f"${service.price}",
                        duration_minutes=service.duration_minutes,
                        location_type=service.location_type,
                        experience_level=service.experience_level,
                        max_participants=service.max_participants,
                        city=service.address.city,
                        state=service.address.state_province,
                        distance_miles=round(distance_miles, 1),
                        average_rating=service.average_rating,
                        total_reviews=service.total_reviews,
                        is_available=service.is_available(),
                        image_url=service.image_url
                    )
                    result.score = SearchScore(
                        total=100 - distance_miles,  # Closer = higher score
                        location_boost=100 - distance_miles
                    )
                    service_results.append(result)
        
        # Sort by distance or other criteria
        if request.sort_by == "distance":
            service_results.sort(key=lambda x: x.distance_miles)
        elif request.sort_by == "rating":
            service_results.sort(key=lambda x: x.average_rating, reverse=True)
        elif request.sort_by == "popularity":
            service_results.sort(key=lambda x: x.total_reviews, reverse=True)
        
        services = service_results[:request.page_size]
    
    # Similar logic for practitioners...
    if request.search_type in [SearchType.ALL, SearchType.PRACTITIONERS]:
        # Find practitioners with locations near request
        nearby_practitioners = await sync_to_async(list)(Practitioner.objects.filter(
            is_verified=True,
            practitioner_status='active',
            locations__latitude__isnull=False,
            locations__longitude__isnull=False
        ).prefetch_related('locations', 'specializations', 'modalities').distinct())
        
        practitioner_results = []
        for practitioner in nearby_practitioners:
            # Find closest location
            min_distance = float('inf')
            closest_location = None
            
            for location in await sync_to_async(list)(practitioner.locations.all()):
                if location.latitude and location.longitude:
                    distance_miles = geo_distance(
                        (request.location.latitude, request.location.longitude),
                        (location.latitude, location.longitude)
                    ).miles
                    
                    if distance_miles < min_distance and distance_miles <= request.radius_miles:
                        min_distance = distance_miles
                        closest_location = location
            
            if closest_location:
                result = PractitionerSearchResult(
                    id=str(practitioner.public_uuid),
                    display_name=practitioner.display_name,
                    professional_title=practitioner.professional_title,
                    bio_excerpt=practitioner.bio[:200] if practitioner.bio else None,
                    years_experience=practitioner.years_of_experience,
                    total_sessions=practitioner.completed_sessions_count,
                    specializations=[s.content for s in await sync_to_async(list)(practitioner.specializations.all())],
                    modalities=[m.name for m in await sync_to_async(list)(practitioner.modalities.all())],
                    city=closest_location.city.name if closest_location.city else None,
                    state=closest_location.state.code if closest_location.state else None,
                    offers_virtual=any(loc.is_virtual for loc in await sync_to_async(list)(practitioner.locations.all())),
                    offers_in_person=True,
                    distance_miles=round(min_distance, 1),
                    average_rating=practitioner.average_rating,
                    total_reviews=practitioner.total_reviews,
                    is_available=practitioner.is_active,
                    is_verified=practitioner.is_verified,
                    is_featured=practitioner.featured,
                    profile_image_url=practitioner.profile_image_url
                )
                result.score = SearchScore(
                    total=100 - min_distance,
                    location_boost=100 - min_distance
                )
                practitioner_results.append(result)
        
        # Sort
        if request.sort_by == "distance":
            practitioner_results.sort(key=lambda x: x.distance_miles)
        elif request.sort_by == "rating":
            practitioner_results.sort(key=lambda x: x.average_rating, reverse=True)
        
        practitioners = practitioner_results[:request.page_size]
    
    # Combine results
    if request.search_type == SearchType.ALL:
        results = [
            SearchResultItem(
                type="service",
                data=s.model_dump(),
                score=s.score.total
            ) for s in services[:10]
        ] + [
            SearchResultItem(
                type="practitioner",
                data=p.model_dump(),
                score=p.score.total
            ) for p in practitioners[:10]
        ]
        results.sort(key=lambda x: x.score, reverse=True)
    
    search_time_ms = int((time.time() - start_time) * 1000)
    
    return UnifiedSearchResponse(
        success=True,
        results=results,
        services=services,
        practitioners=practitioners,
        total_results=len(services) + len(practitioners),
        page=request.page,
        page_size=request.page_size,
        search_time_ms=search_time_ms
    )


# ============================================================================
# SEARCH SUGGESTIONS ENDPOINT
# ============================================================================

@router.get("/suggestions", response_model=SearchSuggestionsResponse)
async def get_search_suggestions(
    current_user: User = Depends(get_current_user_optional),
    location: Optional[str] = Query(None, description="User's location")
):
    """
    Get personalized search suggestions based on:
    - User's search history
    - Browsing behavior
    - Popular searches in their area
    - Similar services to what they've viewed
    """
    # Get user's recent searches
    recent_searches = []
    if current_user:
        recent = await sync_to_async(list)(SearchLog.objects.filter(
            user=current_user
        ).order_by('-created_at')[:10])
        
        recent_searches = [
            SearchHistoryItem(
                query=log.query,
                search_type=log.search_type,
                timestamp=log.created_at,
                result_count=log.result_count or 0
            ) for log in recent
        ]
    
    # Get recommended searches
    recommended_searches = []
    
    # Popular searches in general
    popular = await sync_to_async(list)(SearchLog.objects.values('query').annotate(
        count=Count('id')
    ).order_by('-count')[:5])
    
    for item in popular:
        recommended_searches.append(PersonalizedSuggestion(
            text=item['query'],
            reason="popular",
            subtitle=f"Popular search"
        ))
    
    # Get categories of interest
    categories_of_interest = []
    if current_user:
        # Based on viewed services
        viewed_categories = await sync_to_async(list)(ServiceView.objects.filter(
            user=current_user
        ).values(
            'service__category__id',
            'service__category__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:5])
        
        for cat in viewed_categories:
            if cat['service__category__id']:
                categories_of_interest.append(CategoryWithCount(
                    id=cat['service__category__id'],
                    name=cat['service__category__name'],
                    service_count=cat['count']
                ))
    
    # Get similar services
    similar_services = []
    if current_user:
        # Get recently viewed services
        recent_views = await sync_to_async(list)(ServiceView.objects.filter(
            user=current_user
        ).order_by('-viewed_at')[:5])
        
        for view in recent_views:
            # Find similar services (same category, similar price)
            similar = await sync_to_async(list)(Service.objects.filter(
                category=view.service.category,
                is_active=True,
                is_public=True
            ).exclude(
                id=view.service.id
            )[:3])
            
            for service in similar:
                similar_services.append(ServiceSearchResult(
                    id=str(service.public_uuid),
                    name=service.name,
                    short_description=service.short_description,
                    service_type=service.service_type.name,
                    practitioner_id=str(service.primary_practitioner.public_uuid),
                    practitioner_name=service.primary_practitioner.display_name,
                    price=service.price,
                    price_display=f"${service.price}",
                    duration_minutes=service.duration_minutes,
                    location_type=service.location_type,
                    experience_level=service.experience_level,
                    max_participants=service.max_participants,
                    average_rating=service.average_rating,
                    total_reviews=service.total_reviews,
                    is_available=service.is_available()
                ))
    
    return SearchSuggestionsResponse(
        success=True,
        recent_searches=recent_searches,
        recommended_searches=recommended_searches,
        categories_of_interest=categories_of_interest,
        similar_services=similar_services[:10]
    )


# ============================================================================
# ADVANCED SERVICE SEARCH ENDPOINT
# ============================================================================

@router.post("/services", response_model=UnifiedSearchResponse)
async def advanced_service_search(
    request: AdvancedServiceSearchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Advanced service-specific search with detailed filtering options.
    """
    # Convert to unified search request
    unified_request = UnifiedSearchRequest(
        query=request.query or "",
        search_type=SearchType.SERVICES,
        filters=request.filters,
        location=request.location,
        sort_by=request.sort_by,
        page=request.page,
        page_size=request.page_size
    )
    
    # Add advanced options
    if request.boost_new:
        unified_request.boost_local = False  # Custom boosting
    
    services = await search_services(unified_request, current_user, request)
    
    # Find similar services if requested
    if request.similar_to_service_id:
        try:
            reference_service = await sync_to_async(Service.objects.get)(
                public_uuid=request.similar_to_service_id
            )
            # Add similarity boosting logic here
        except Service.DoesNotExist:
            pass
    
    return UnifiedSearchResponse(
        success=True,
        services=services,
        total_results=len(services),
        page=request.page,
        page_size=request.page_size
    )


# ============================================================================
# ADVANCED PRACTITIONER SEARCH ENDPOINT
# ============================================================================

@router.post("/practitioners", response_model=UnifiedSearchResponse)
async def advanced_practitioner_search(
    request: AdvancedPractitionerSearchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Advanced practitioner-specific search with detailed filtering options.
    """
    unified_request = UnifiedSearchRequest(
        query=request.query or "",
        search_type=SearchType.PRACTITIONERS,
        filters=request.filters,
        location=request.location,
        sort_by=request.sort_by,
        page=request.page,
        page_size=request.page_size
    )
    
    practitioners = await search_practitioners(
        unified_request, 
        current_user,
        match_all_specializations=request.match_all_specializations,
        match_all_modalities=request.match_all_modalities
    )
    
    return UnifiedSearchResponse(
        success=True,
        practitioners=practitioners,
        total_results=len(practitioners),
        page=request.page,
        page_size=request.page_size
    )


# ============================================================================
# CATEGORY BROWSE ENDPOINT
# ============================================================================

@router.get("/categories", response_model=CategoryBrowseResponse)
async def browse_categories(
    include_empty: bool = Query(False, description="Include categories with no services"),
    featured_only: bool = Query(False, description="Only show featured categories")
):
    """
    Browse service categories with counts and hierarchy.
    """
    categories_qs = ServiceCategory.objects.filter(is_active=True)
    
    if featured_only:
        categories_qs = categories_qs.filter(is_featured=True)
    
    # Annotate with service counts
    categories_qs = categories_qs.annotate(
        service_count=Count(
            'services',
            filter=Q(services__is_active=True, services__is_public=True)
        )
    )
    
    if not include_empty:
        categories_qs = categories_qs.filter(service_count__gt=0)
    
    categories_list = await sync_to_async(list)(categories_qs.order_by('order', 'name'))
    categories = []
    for category in categories_list:
        categories.append(CategoryWithCount(
            id=category.id,
            name=category.name,
            slug=category.slug if hasattr(category, 'slug') else "",
            description=category.description,
            icon=category.icon,
            service_count=category.service_count,
            is_featured=category.is_featured if hasattr(category, 'is_featured') else False
        ))
    
    return CategoryBrowseResponse(
        success=True,
        categories=categories,
        total_categories=len(categories)
    )


# ============================================================================
# DYNAMIC FILTERS ENDPOINT
# ============================================================================

@router.get("/filters", response_model=DynamicFiltersResponse)
async def get_dynamic_filters(
    search_type: SearchType = Query(SearchType.ALL),
    query: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    applied_filters: Optional[str] = Query(None, description="JSON string of applied filters")
):
    """
    Get available filter options dynamically based on current search context.
    Shows counts for each filter option.
    """
    filters = []
    
    # Parse applied filters
    current_filters = {}
    if applied_filters:
        import json
        try:
            current_filters = json.loads(applied_filters)
        except:
            pass
    
    # Build base queryset
    if search_type in [SearchType.ALL, SearchType.SERVICES]:
        base_qs = Service.objects.filter(is_active=True, is_public=True)
        
        if query:
            base_qs = base_qs.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query)
            )
        
        if category_id:
            base_qs = base_qs.filter(category_id=category_id)
        
        # Price range filter
        price_stats = await sync_to_async(base_qs.aggregate)(
            min_price=Min('price_cents'),
            max_price=Max('price_cents')
        )
        
        if price_stats['min_price'] is not None:
            filters.append(FilterGroup(
                name="Price",
                field="price_range",
                type="range",
                min_value=float(price_stats['min_price']) / 100,
                max_value=float(price_stats['max_price']) / 100,
                step=10.0
            ))
        
        # Service type filter
        service_types = await sync_to_async(list)(base_qs.values(
            'service_type__id', 'service_type__name'
        ).annotate(count=Count('id')).order_by('-count'))
        
        if service_types:
            filters.append(FilterGroup(
                name="Service Type",
                field="service_types",
                type="multi_select",
                options=[
                    FilterOption(
                        value=st['service_type__id'],
                        label=st['service_type__name'],
                        count=st['count']
                    ) for st in service_types
                ]
            ))
        
        # Location type filter
        location_options = []
        for loc_type, label in [('virtual', 'Virtual'), ('in_person', 'In Person'), ('hybrid', 'Hybrid')]:
            count = await sync_to_async(base_qs.filter(location_type=loc_type).count)()
            if count > 0:
                location_options.append(FilterOption(
                    value=loc_type,
                    label=label,
                    count=count
                ))
        
        if location_options:
            filters.append(FilterGroup(
                name="Location Type",
                field="location_type",
                type="multi_select",
                options=location_options
            ))
        
        # Experience level filter
        exp_options = []
        for exp, label in Service.EXPERIENCE_LEVEL_CHOICES:
            count = await sync_to_async(base_qs.filter(experience_level=exp).count)()
            if count > 0:
                exp_options.append(FilterOption(
                    value=exp,
                    label=label,
                    count=count
                ))
        
        if exp_options:
            filters.append(FilterGroup(
                name="Experience Level",
                field="experience_level",
                type="multi_select",
                options=exp_options
            ))
    
    # Calculate filter impacts
    filter_impacts = {}
    for filter_group in filters:
        # Simulate removing this filter
        test_filters = current_filters.copy()
        if filter_group.field in test_filters:
            del test_filters[filter_group.field]
            # Calculate new count
            # This is simplified - implement full logic based on your needs
            filter_impacts[filter_group.field] = await sync_to_async(base_qs.count)()
    
    return DynamicFiltersResponse(
        success=True,
        filters=filters,
        applied_filters=current_filters,
        filter_impacts=filter_impacts
    )


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def search_services(
    request: UnifiedSearchRequest,
    current_user: Optional[User],
    advanced_request: Optional[AdvancedServiceSearchRequest] = None
) -> List[ServiceSearchResult]:
    """
    Search services with filtering, scoring, and ranking.
    """
    # Base queryset
    services_qs = Service.objects.filter(
        is_active=True,
        is_public=True
    ).select_related(
        'primary_practitioner',
        'category',
        'service_type',
        'address'
    ).prefetch_related('languages')
    
    # Text search
    if request.query:
        # Use PostgreSQL full-text search
        search_vector = SearchVector('name', weight='A') + \
                       SearchVector('short_description', weight='B') + \
                       SearchVector('description', weight='C')
        search_query = SearchQuery(request.query)
        
        services_qs = services_qs.annotate(
            search_rank=SearchRank(search_vector, search_query)
        ).filter(search_rank__gte=0.1)
    
    # Apply filters
    if request.filters:
        services_qs = apply_service_filters(services_qs, request.filters)
    
    # Location filtering and boosting
    if request.location:
        # Filter by distance if specified
        if request.filters and request.filters.distance_miles:
            # This would require a more complex geospatial query
            # Simplified version:
            services_qs = services_qs.filter(
                address__latitude__isnull=False,
                address__longitude__isnull=False
            )
    
    # Advanced options
    if advanced_request:
        if advanced_request.boost_new:
            # Boost services created in last 30 days
            services_qs = services_qs.annotate(
                is_new=Case(
                    When(created_at__gte=timezone.now() - timedelta(days=30), then=Value(1)),
                    default=Value(0),
                    output_field=FloatField()
                )
            )
        
        if advanced_request.boost_trending:
            # Would join with analytics data
            pass
    
    # Sorting
    if request.sort_by == "price_low_high":
        services_qs = services_qs.order_by('price_cents')
    elif request.sort_by == "price_high_low":
        services_qs = services_qs.order_by('-price_cents')
    elif request.sort_by == "rating":
        services_qs = services_qs.annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_published=True))
        ).order_by('-avg_rating')
    elif request.sort_by == "reviews":
        services_qs = services_qs.annotate(
            review_count=Count('reviews', filter=Q(reviews__is_published=True))
        ).order_by('-review_count')
    elif request.query:
        services_qs = services_qs.order_by('-search_rank')
    else:
        services_qs = services_qs.order_by('-is_featured', '-created_at')
    
    # Pagination
    offset = (request.page - 1) * request.page_size
    services_qs = services_qs[offset:offset + request.page_size]
    
    # Execute the query
    services = await sync_to_async(list)(services_qs)
    
    # Convert to response objects
    results = []
    for service in services:
        # Calculate distance if location provided
        distance_miles = None
        if request.location and service.address and service.address.latitude:
            distance_miles = geo_distance(
                (request.location.latitude, request.location.longitude),
                (service.address.latitude, service.address.longitude)
            ).miles
        
        # Calculate score
        score = SearchScore(
            total=100,
            text_match=getattr(service, 'search_rank', 0) * 100 if request.query else 0,
            location_boost=50 / (distance_miles + 1) if distance_miles else 0,
            popularity_boost=min(service.total_reviews, 50),
            recency_boost=10 if (timezone.now() - service.created_at).days < 30 else 0
        )
        score.total = sum([
            score.text_match,
            score.location_boost,
            score.popularity_boost,
            score.recency_boost
        ])
        
        result = ServiceSearchResult(
            id=str(service.public_uuid),
            name=service.name,
            short_description=service.short_description,
            service_type=service.service_type.name,
            category_name=service.category.name if service.category else None,
            practitioner_id=str(service.primary_practitioner.public_uuid),
            practitioner_name=service.primary_practitioner.display_name,
            practitioner_title=service.primary_practitioner.professional_title,
            price=service.price,
            price_display=f"${service.price}",
            original_price=service.original_price if service.is_package or service.is_bundle else None,
            discount_percentage=service.savings_percentage if service.is_package or service.is_bundle else None,
            duration_minutes=service.duration_minutes,
            location_type=service.location_type,
            experience_level=service.experience_level,
            max_participants=service.max_participants,
            city=service.address.city if service.address else None,
            state=service.address.state_province if service.address else None,
            distance_miles=round(distance_miles, 1) if distance_miles else None,
            average_rating=service.average_rating,
            total_reviews=service.total_reviews,
            next_available=service.next_available_date,
            is_available=service.is_available(),
            image_url=service.image_url,
            has_video=bool(service.video_url),
            tags=service.tags or [],
            is_featured=service.is_featured,
            is_new=(timezone.now() - service.created_at).days < 30,
            score=score
        )
        
        results.append(result)
    
    return results


async def search_practitioners(
    request: UnifiedSearchRequest,
    current_user: Optional[User],
    match_all_specializations: bool = False,
    match_all_modalities: bool = False
) -> List[PractitionerSearchResult]:
    """
    Search practitioners with filtering and scoring.
    """
    # Base queryset
    practitioners_qs = Practitioner.objects.filter(
        is_verified=True,
        practitioner_status='active'
    ).select_related('user').prefetch_related(
        'specializations',
        'modalities',
        'languages',
        'locations'
    )
    
    # Text search
    if request.query:
        practitioners_qs = practitioners_qs.filter(
            Q(display_name__icontains=request.query) |
            Q(professional_title__icontains=request.query) |
            Q(bio__icontains=request.query)
        )
    
    # Apply filters
    if request.filters:
        # Specializations
        if request.filters.specializations:
            if match_all_specializations:
                for spec_id in request.filters.specializations:
                    practitioners_qs = practitioners_qs.filter(specializations__id=spec_id)
            else:
                practitioners_qs = practitioners_qs.filter(
                    specializations__id__in=request.filters.specializations
                ).distinct()
        
        # Modalities
        if request.filters.modalities:
            if match_all_modalities:
                for mod_id in request.filters.modalities:
                    practitioners_qs = practitioners_qs.filter(modalities__id=mod_id)
            else:
                practitioners_qs = practitioners_qs.filter(
                    modalities__id__in=request.filters.modalities
                ).distinct()
        
        # Languages
        if request.filters.languages:
            practitioners_qs = practitioners_qs.filter(
                languages__code__in=request.filters.languages
            ).distinct()
        
        # Experience
        if request.filters.years_experience_min:
            practitioners_qs = practitioners_qs.filter(
                years_of_experience__gte=request.filters.years_experience_min
            )
        
        # Rating
        if request.filters.min_rating:
            practitioners_qs = practitioners_qs.annotate(
                avg_rating=Avg('reviews__rating', filter=Q(reviews__is_published=True))
            ).filter(avg_rating__gte=request.filters.min_rating)
    
    # Sorting
    if request.sort_by == "rating":
        practitioners_qs = practitioners_qs.annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__is_published=True))
        ).order_by('-avg_rating')
    elif request.sort_by == "reviews":
        practitioners_qs = practitioners_qs.annotate(
            review_count=Count('reviews', filter=Q(reviews__is_published=True))
        ).order_by('-review_count')
    else:
        practitioners_qs = practitioners_qs.order_by('-featured', '-created_at')
    
    # Pagination
    offset = (request.page - 1) * request.page_size
    practitioners_qs = practitioners_qs[offset:offset + request.page_size]
    
    # Execute the query
    practitioners = await sync_to_async(list)(practitioners_qs)
    
    # Convert to response objects
    results = []
    for practitioner in practitioners:
        # Get price range from services
        price_range = await sync_to_async(lambda: practitioner.price_range)()
        
        # Calculate distance if location provided
        distance_miles = None
        if request.location:
            min_distance = float('inf')
            for location in await sync_to_async(list)(practitioner.locations.all()):
                if location.latitude and location.longitude:
                    dist = geo_distance(
                        (request.location.latitude, request.location.longitude),
                        (location.latitude, location.longitude)
                    ).miles
                    min_distance = min(min_distance, dist)
            
            if min_distance < float('inf'):
                distance_miles = min_distance
        
        result = PractitionerSearchResult(
            id=str(practitioner.public_uuid),
            display_name=practitioner.display_name,
            professional_title=practitioner.professional_title,
            bio_excerpt=practitioner.bio[:200] if practitioner.bio else None,
            years_experience=practitioner.years_of_experience,
            total_sessions=practitioner.completed_sessions_count,
            specializations=[s.content for s in await sync_to_async(list)(practitioner.specializations.all())],
            modalities=[m.name for m in await sync_to_async(list)(practitioner.modalities.all())],
            languages=[l.code for l in await sync_to_async(list)(practitioner.languages.all())],
            city=practitioner.primary_location.city.name if practitioner.primary_location and practitioner.primary_location.city else None,
            state=practitioner.primary_location.state.code if practitioner.primary_location and practitioner.primary_location.state else None,
            offers_virtual=any(loc.is_virtual for loc in await sync_to_async(list)(practitioner.locations.all())),
            offers_in_person=any(loc.is_in_person for loc in await sync_to_async(list)(practitioner.locations.all())),
            distance_miles=round(distance_miles, 1) if distance_miles else None,
            average_rating=practitioner.average_rating,
            total_reviews=practitioner.total_reviews,
            price_range_min=price_range['min'],
            price_range_max=price_range['max'],
            next_available=practitioner.next_available_date,
            is_available=practitioner.is_active,
            profile_image_url=practitioner.profile_image_url,
            has_video=bool(practitioner.profile_video_url),
            is_verified=practitioner.is_verified,
            is_featured=practitioner.featured
        )
        
        results.append(result)
    
    return results


async def search_locations(request: UnifiedSearchRequest) -> List[LocationSearchResult]:
    """
    Search locations (cities) with service/practitioner counts.
    """
    # Search cities
    cities_qs = City.objects.filter(
        is_active=True
    ).select_related('state', 'state__country')
    
    if request.query:
        cities_qs = cities_qs.filter(
            Q(name__icontains=request.query) |
            Q(metro_area__icontains=request.query) |
            Q(state__name__icontains=request.query)
        )
    
    # Get cities with service counts
    cities_qs = cities_qs.annotate(
        service_count=Count(
            'practitioner_locations__practitioner__primary_services',
            filter=Q(
                practitioner_locations__practitioner__is_verified=True,
                practitioner_locations__practitioner__practitioner_status='active'
            )
        ),
        practitioner_count=Count(
            'practitioner_locations__practitioner',
            filter=Q(
                practitioner_locations__practitioner__is_verified=True,
                practitioner_locations__practitioner__practitioner_status='active'
            ),
            distinct=True
        )
    ).filter(
        Q(service_count__gt=0) | Q(practitioner_count__gt=0)
    )
    
    # Sort by relevance/count
    cities_qs = cities_qs.order_by('-is_major', '-service_count', '-practitioner_count')
    
    # Limit results
    cities_qs = cities_qs[:20]
    
    # Execute the query
    cities = await sync_to_async(list)(cities_qs)
    
    results = []
    for city in cities:
        # Get top categories
        top_categories = await sync_to_async(list)(ServiceCategory.objects.filter(
            services__address__city=city.name,
            services__address__state_province=city.state.name,
            services__is_active=True
        ).annotate(
            count=Count('services')
        ).order_by('-count')[:3])
        
        result = LocationSearchResult(
            city=city.name,
            state=city.state.code,
            country=city.state.country.code,
            metro_area=city.metro_area,
            total_services=city.service_count,
            total_practitioners=city.practitioner_count,
            top_categories=[
                {'name': cat.name, 'count': cat.count}
                for cat in top_categories
            ],
            latitude=float(city.latitude) if city.latitude else None,
            longitude=float(city.longitude) if city.longitude else None,
            slug=city.slug,
            url_path=city.seo_url
        )
        
        results.append(result)
    
    return results


def apply_service_filters(queryset, filters):
    """
    Apply SearchFilters to a service queryset.
    """
    # Price range
    if filters.price_range:
        if filters.price_range.min is not None:
            queryset = queryset.filter(price_cents__gte=int(filters.price_range.min * 100))
        if filters.price_range.max is not None:
            queryset = queryset.filter(price_cents__lte=int(filters.price_range.max * 100))
    
    # Service types
    if filters.service_types:
        queryset = queryset.filter(
            Q(service_type__id__in=filters.service_types) |
            Q(service_type__code__in=filters.service_types)
        )
    
    # Categories
    if filters.categories:
        queryset = queryset.filter(category_id__in=filters.categories)
    
    # Duration
    if filters.duration_minutes_min:
        queryset = queryset.filter(duration_minutes__gte=filters.duration_minutes_min)
    if filters.duration_minutes_max:
        queryset = queryset.filter(duration_minutes__lte=filters.duration_minutes_max)
    
    # Location type
    if filters.location_type:
        queryset = queryset.filter(location_type__in=[lt.value for lt in filters.location_type])
    
    # Experience level
    if filters.experience_level:
        queryset = queryset.filter(experience_level__in=[el.value for el in filters.experience_level])
    
    # Features
    if filters.is_featured is not None:
        queryset = queryset.filter(is_featured=filters.is_featured)
    
    if filters.has_video is not None:
        if filters.has_video:
            queryset = queryset.exclude(video_url__isnull=True).exclude(video_url='')
        else:
            queryset = queryset.filter(Q(video_url__isnull=True) | Q(video_url=''))
    
    # Age appropriate
    if filters.age_appropriate_for:
        queryset = queryset.filter(
            Q(age_min__lte=filters.age_appropriate_for) | Q(age_min__isnull=True),
            Q(age_max__gte=filters.age_appropriate_for) | Q(age_max__isnull=True)
        )
    
    return queryset


async def calculate_facets(request, services, practitioners):
    """
    Calculate facets for search results.
    """
    facets = []
    
    # Service type facet
    if services:
        service_types = {}
        for service in services:
            if service.service_type:
                key = service.service_type
                if key not in service_types:
                    service_types[key] = 0
                service_types[key] += 1
        
        if service_types:
            facets.append(SearchFacet(
                name="Service Type",
                field="service_type",
                type="terms",
                values=[
                    FacetValue(
                        value=st,
                        label=st,
                        count=count
                    ) for st, count in service_types.items()
                ]
            ))
    
    return facets


async def generate_search_suggestions(query: str) -> List[Dict[str, Any]]:
    """
    Generate search suggestions for queries with few results.
    """
    suggestions = []
    
    # Simple spell correction suggestions
    # In production, use a proper spell checker
    
    # Related searches based on partial matches
    related = await sync_to_async(list)(SearchLog.objects.filter(
        query__icontains=query.split()[0] if query else ""
    ).exclude(
        query=query
    ).values('query').annotate(
        count=Count('id')
    ).order_by('-count')[:3])
    
    for item in related:
        suggestions.append({
            'text': item['query'],
            'type': 'related',
            'score': item['count']
        })
    
    return suggestions