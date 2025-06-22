"""
Location router for FastAPI
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from django.db import transaction
from django.db.models import Q, Count, Avg, F, Prefetch
from django.contrib.postgres.search import TrigramSimilarity
from asgiref.sync import sync_to_async
import math

from locations.models import Country, State, City, ZipCode, PractitionerLocation
from practitioners.models import Practitioner
from services.models import Service
from integrations.google_maps.client import GoogleMapsClient

from ..schemas.locations import (
    LocationType,
    GeoCoordinates,
    CountryCreate,
    CountryUpdate,
    CountryResponse,
    CountryListResponse,
    StateCreate,
    StateUpdate,
    StateResponse,
    StateListResponse,
    CityCreate,
    CityUpdate,
    CityResponse,
    CitySimple,
    CityListResponse,
    PostalCodeCreate,
    PostalCodeResponse,
    PostalCodeListResponse,
    PractitionerLocationCreate,
    PractitionerLocationUpdate,
    PractitionerLocationResponse,
    PractitionerLocationListResponse,
    LocationSearchRequest,
    LocationSearchResult,
    LocationSearchResponse,
    LocationAutocompleteRequest,
    LocationAutocompleteResult,
    LocationAutocompleteResponse,
    ServiceAreaRequest,
    ServiceAreaResponse,
    GeocodeRequest,
    GeocodeResponse,
    ReverseGeocodeRequest,
    DistanceRequest,
    DistanceResponse,
    PopularLocation,
    PopularLocationsResponse,
)
from ...dependencies import (
    get_db,
    get_current_user,
    get_current_active_user,
    get_pagination_params,
    PaginationParams,
)
from users.models import User

router = APIRouter(tags=["Locations"])


def serialize_city_simple(city: City) -> CitySimple:
    """Serialize city to simple format"""
    return CitySimple(
        id=city.id,
        name=city.name,
        state_code=city.state.code,
        state_name=city.state.name,
        country_code=city.state.country.code,
        seo_url=city.seo_url,
    )


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in miles using Haversine formula"""
    R = 3959  # Earth's radius in miles
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


# Helper functions for complex ORM operations
@sync_to_async
def get_countries_queryset(is_active, search, offset, limit):
    """Get countries with filtering and pagination"""
    queryset = Country.objects.all()
    
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)
    
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) |
            Q(code__icontains=search) |
            Q(code_3__icontains=search)
        )
    
    queryset = queryset.order_by('name')
    
    total = queryset.count()
    countries = list(queryset[offset:offset + limit])
    
    return countries, total


@sync_to_async
def get_country_by_id(country_id):
    """Get country by ID"""
    try:
        return Country.objects.get(id=country_id)
    except Country.DoesNotExist:
        return None


@sync_to_async
def check_country_exists(code, code_3):
    """Check if country with code exists"""
    return Country.objects.filter(Q(code=code) | Q(code_3=code_3)).exists()


@sync_to_async
def create_country(country_data):
    """Create new country"""
    return Country.objects.create(**country_data)


@sync_to_async
def update_country_fields(country, update_data):
    """Update country fields and save"""
    for field, value in update_data.items():
        setattr(country, field, value)
    country.save()
    return country


@sync_to_async
def get_states_queryset(country_id, country_code, is_active, search, offset, limit):
    """Get states with filtering and pagination"""
    queryset = State.objects.select_related('country')
    
    if country_id:
        queryset = queryset.filter(country_id=country_id)
    elif country_code:
        queryset = queryset.filter(country__code=country_code)
    
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)
    
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) |
            Q(code__icontains=search)
        )
    
    queryset = queryset.order_by('country__name', 'name')
    
    total = queryset.count()
    states = list(queryset[offset:offset + limit])
    
    return states, total


@sync_to_async
def get_state_by_id(state_id):
    """Get state by ID"""
    try:
        return State.objects.select_related('country').get(id=state_id)
    except State.DoesNotExist:
        return None


@sync_to_async
def get_cities_queryset(state_id, country_code, metro_area, is_major, is_active, min_population, search, offset, limit):
    """Get cities with filtering and pagination"""
    queryset = City.objects.select_related('state__country')
    
    if state_id:
        queryset = queryset.filter(state_id=state_id)
    
    if country_code:
        queryset = queryset.filter(state__country__code=country_code)
    
    if metro_area:
        queryset = queryset.filter(metro_area=metro_area)
    
    if is_major is not None:
        queryset = queryset.filter(is_major=is_major)
    
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)
    
    if min_population:
        queryset = queryset.filter(population__gte=min_population)
    
    if search:
        queryset = queryset.filter(name__icontains=search)
    
    queryset = queryset.order_by('-is_major', '-population', 'name')
    
    total = queryset.count()
    cities = list(queryset[offset:offset + limit])
    
    return cities, total


@sync_to_async
def get_city_by_id(city_id):
    """Get city by ID"""
    try:
        return City.objects.select_related('state__country').get(id=city_id)
    except City.DoesNotExist:
        return None


@sync_to_async
def search_cities(query, country_code, state_code, include_inactive, limit):
    """Search cities"""
    city_query = City.objects.select_related('state__country').filter(
        Q(name__icontains=query) |
        Q(metro_area__icontains=query)
    )
    
    if country_code:
        city_query = city_query.filter(state__country__code=country_code)
    
    if state_code:
        city_query = city_query.filter(state__code=state_code)
    
    if not include_inactive:
        city_query = city_query.filter(is_active=True)
    
    return list(city_query[:limit])


@sync_to_async
def search_states(query, country_code, include_inactive, limit):
    """Search states"""
    state_query = State.objects.select_related('country').filter(
        Q(name__icontains=query) |
        Q(code__icontains=query)
    )
    
    if country_code:
        state_query = state_query.filter(country__code=country_code)
    
    if not include_inactive:
        state_query = state_query.filter(is_active=True)
    
    return list(state_query[:limit])


@sync_to_async
def search_postal_codes(query, country_code, limit):
    """Search postal codes"""
    postal_query = ZipCode.objects.select_related('city__state', 'country').filter(
        code__startswith=query
    )
    
    if country_code:
        postal_query = postal_query.filter(country__code=country_code)
    
    return list(postal_query[:limit])


@sync_to_async
def autocomplete_cities(query, country_code, limit):
    """Autocomplete cities"""
    cities = City.objects.select_related('state__country').filter(
        Q(name__istartswith=query) |
        Q(name__icontains=query)
    ).filter(is_active=True)
    
    if country_code:
        cities = cities.filter(state__country__code=country_code)
    
    cities = cities.order_by(
        '-is_major',
        '-population',
        'name'
    )[:limit]
    
    return list(cities)


@sync_to_async
def autocomplete_postal_codes(query, country_code, limit):
    """Autocomplete postal codes"""
    postal_codes = ZipCode.objects.select_related('city__state', 'country').filter(
        code__startswith=query
    )
    
    if country_code:
        postal_codes = postal_codes.filter(country__code=country_code)
    
    return list(postal_codes[:limit])


@sync_to_async
def get_popular_cities(country_code, state_code, limit):
    """Get popular cities with counts"""
    queryset = City.objects.select_related('state__country').filter(
        is_active=True,
        is_major=True
    )
    
    if country_code:
        queryset = queryset.filter(state__country__code=country_code)
    
    if state_code:
        queryset = queryset.filter(state__code=state_code)
    
    # Annotate with counts
    queryset = queryset.annotate(
        practitioner_count=Count(
            'practitioner_locations__practitioner',
            distinct=True,
            filter=Q(
                practitioner_locations__practitioner__practitioner_status='active',
                practitioner_locations__practitioner__is_verified=True
            )
        )
    )
    
    # Order by service count and population
    queryset = queryset.order_by('-service_count', '-population')[:limit]
    
    return list(queryset)


@sync_to_async
def get_practitioner_by_id(practitioner_id):
    """Get practitioner by ID"""
    try:
        return Practitioner.objects.get(id=practitioner_id)
    except Practitioner.DoesNotExist:
        return None


@sync_to_async
def get_practitioner_locations(practitioner):
    """Get practitioner locations"""
    locations = PractitionerLocation.objects.filter(
        practitioner=practitioner
    ).select_related('city__state__country', 'state', 'country').order_by('-is_primary', 'created_at')
    return list(locations)


@sync_to_async
def get_location_references(city_id, state_id, country_id):
    """Get city, state, country objects"""
    try:
        city = City.objects.get(id=city_id)
        state = State.objects.get(id=state_id)
        country = Country.objects.get(id=country_id)
        return city, state, country
    except (City.DoesNotExist, State.DoesNotExist, Country.DoesNotExist):
        return None, None, None


@sync_to_async
def create_practitioner_location_with_transaction(practitioner, location_data, city):
    """Create practitioner location with transaction"""
    with transaction.atomic():
        location = PractitionerLocation.objects.create(
            practitioner=practitioner,
            **location_data
        )
        
        # Update city service count
        city.service_count = F('service_count') + 1
        city.save(update_fields=['service_count'])
        
        return location


@sync_to_async
def get_practitioner_location_by_id(location_id):
    """Get practitioner location by ID"""
    try:
        return PractitionerLocation.objects.select_related(
            'practitioner', 'city', 'state', 'country'
        ).get(id=location_id)
    except PractitionerLocation.DoesNotExist:
        return None


@sync_to_async
def update_practitioner_location_fields(location, update_data):
    """Update practitioner location fields"""
    for field, value in update_data.items():
        setattr(location, field, value)
    location.save()
    return location


@sync_to_async
def delete_practitioner_location_with_transaction(location):
    """Delete practitioner location with transaction logic"""
    # Check if this is the only location
    location_count = PractitionerLocation.objects.filter(practitioner=location.practitioner).count()
    if location.is_primary and location_count == 1:
        return False, "Cannot delete the only location"
    
    with transaction.atomic():
        location.city.service_count = F('service_count') - 1
        location.city.save(update_fields=['service_count'])
        
        # If this was primary, make another location primary
        if location.is_primary:
            next_location = PractitionerLocation.objects.filter(
                practitioner=location.practitioner
            ).exclude(id=location.id).first()
            if next_location:
                next_location.is_primary = True
                next_location.save()
        
        location.delete()
    
    return True, None


@sync_to_async
def get_cities_in_service_area(center_lat, center_lon, radius_miles):
    """Get cities within service area"""
    cities = City.objects.filter(
        latitude__isnull=False,
        longitude__isnull=False,
        is_active=True
    ).select_related('state')
    
    cities_in_area = []
    for city in cities:
        distance = calculate_distance(
            center_lat, center_lon,
            float(city.latitude), float(city.longitude)
        )
        
        if distance <= radius_miles:
            cities_in_area.append(city)
    
    return cities_in_area


@sync_to_async
def count_practitioners_in_cities(cities_in_area):
    """Count practitioners in cities"""
    return PractitionerLocation.objects.filter(
        city__in=cities_in_area,
        practitioner__practitioner_status='active',
        practitioner__is_verified=True
    ).values('practitioner').distinct().count()


# Country endpoints
@router.get("/countries", response_model=CountryListResponse)
async def list_countries(
    is_active: Optional[bool] = Query(True),
    search: Optional[str] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    db=Depends(get_db),
):
    """List all countries"""
    countries, total = await get_countries_queryset(
        is_active, search, pagination.offset, pagination.limit
    )
    
    return CountryListResponse(
        results=[CountryResponse.model_validate(country) for country in countries],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/countries/{country_id}", response_model=CountryResponse)
async def get_country(
    country_id: UUID,
    db=Depends(get_db),
):
    """Get country details"""
    country = await get_country_by_id(country_id)
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found"
        )
    
    return CountryResponse.model_validate(country)


@router.post("/countries", response_model=CountryResponse, status_code=status.HTTP_201_CREATED)
async def create_country(
    country_data: CountryCreate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Create a new country (admin only)"""
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Check for duplicates
    if await check_country_exists(country_data.code, country_data.code_3):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Country with this code already exists"
        )
    
    country = await create_country(country_data.model_dump())
    return CountryResponse.model_validate(country)


@router.patch("/countries/{country_id}", response_model=CountryResponse)
async def update_country(
    country_id: UUID,
    country_update: CountryUpdate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Update country (admin only)"""
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    country = await get_country_by_id(country_id)
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country not found"
        )
    
    # Update fields
    update_data = country_update.model_dump(exclude_unset=True)
    country = await update_country_fields(country, update_data)
    
    return CountryResponse.model_validate(country)


# State endpoints
@router.get("/states", response_model=StateListResponse)
async def list_states(
    country_id: Optional[UUID] = None,
    country_code: Optional[str] = Query(None, min_length=2, max_length=2),
    is_active: Optional[bool] = Query(True),
    search: Optional[str] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    db=Depends(get_db),
):
    """List states/provinces"""
    states, total = await get_states_queryset(
        country_id, country_code, is_active, search, pagination.offset, pagination.limit
    )
    
    return StateListResponse(
        results=[StateResponse.model_validate(state) for state in states],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/states/{state_id}", response_model=StateResponse)
async def get_state(
    state_id: UUID,
    db=Depends(get_db),
):
    """Get state details"""
    state = await get_state_by_id(state_id)
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="State not found"
        )
    
    return StateResponse.model_validate(state)


# City endpoints
@router.get("/cities", response_model=CityListResponse)
async def list_cities(
    state_id: Optional[UUID] = None,
    country_code: Optional[str] = Query(None, min_length=2, max_length=2),
    metro_area: Optional[str] = None,
    is_major: Optional[bool] = None,
    is_active: Optional[bool] = Query(True),
    min_population: Optional[int] = None,
    search: Optional[str] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    db=Depends(get_db),
):
    """List cities"""
    cities, total = await get_cities_queryset(
        state_id, country_code, metro_area, is_major, is_active, 
        min_population, search, pagination.offset, pagination.limit
    )
    
    return CityListResponse(
        results=[CityResponse.model_validate(city) for city in cities],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/cities/{city_id}", response_model=CityResponse)
async def get_city(
    city_id: UUID,
    db=Depends(get_db),
):
    """Get city details"""
    city = await get_city_by_id(city_id)
    if not city:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="City not found"
        )
    
    return CityResponse.model_validate(city)


# Location search
@router.post("/search", response_model=LocationSearchResponse)
async def search_locations(
    search_request: LocationSearchRequest,
    db=Depends(get_db),
):
    """Search for locations across all types"""
    results = []
    query = search_request.query.lower()
    
    # Search cities
    if not search_request.location_type or search_request.location_type == LocationType.CITY:
        cities = await search_cities(
            query, search_request.country_code, search_request.state_code,
            search_request.include_inactive, search_request.limit
        )
        
        for city in cities:
            results.append(LocationSearchResult(
                id=city.id,
                name=city.name,
                type=LocationType.CITY,
                display_name=f"{city.name}, {city.state.code}",
                country_code=city.state.country.code,
                state_code=city.state.code,
                coordinates=GeoCoordinates(
                    latitude=city.latitude,
                    longitude=city.longitude
                ) if city.latitude and city.longitude else None,
                population=city.population,
                service_count=city.service_count,
            ))
    
    # Search states
    if not search_request.location_type or search_request.location_type == LocationType.STATE:
        states = await search_states(
            query, search_request.country_code, search_request.include_inactive, search_request.limit
        )
        
        for state in states:
            results.append(LocationSearchResult(
                id=state.id,
                name=state.name,
                type=LocationType.STATE,
                display_name=f"{state.name}, {state.country.code}",
                country_code=state.country.code,
                state_code=state.code,
            ))
    
    # Search postal codes
    if not search_request.location_type or search_request.location_type == LocationType.POSTAL_CODE:
        postal_codes = await search_postal_codes(query, search_request.country_code, search_request.limit)
        
        for postal in postal_codes:
            display_name = postal.code
            if postal.city:
                display_name = f"{postal.code} ({postal.city.name}, {postal.city.state.code})"
            
            results.append(LocationSearchResult(
                id=postal.id,
                name=postal.code,
                type=LocationType.POSTAL_CODE,
                display_name=display_name,
                country_code=postal.country.code,
                state_code=postal.city.state.code if postal.city else None,
                coordinates=GeoCoordinates(
                    latitude=postal.latitude,
                    longitude=postal.longitude
                ) if postal.latitude and postal.longitude else None,
            ))
    
    # Sort by relevance (exact matches first)
    results.sort(key=lambda x: (
        not x.name.lower().startswith(query),
        len(x.name),
        x.name
    ))
    
    return LocationSearchResponse(
        results=results[:search_request.limit],
        query=search_request.query,
        total=len(results),
    )


@router.post("/autocomplete", response_model=LocationAutocompleteResponse)
async def autocomplete_locations(
    request: LocationAutocompleteRequest,
    db=Depends(get_db),
):
    """Autocomplete location search"""
    results = []
    query = request.query.lower()
    
    # Search cities (prioritized)
    if not request.types or LocationType.CITY in request.types:
        cities = await autocomplete_cities(query, request.country_code, request.limit)
        
        for city in cities:
            results.append(LocationAutocompleteResult(
                value=str(city.id),
                label=f"{city.name}, {city.state.code}",
                type=LocationType.CITY,
                metadata={
                    'state_code': city.state.code,
                    'country_code': city.state.country.code,
                    'is_major': city.is_major,
                }
            ))
    
    # Search postal codes
    if not request.types or LocationType.POSTAL_CODE in request.types:
        postal_codes = await autocomplete_postal_codes(query, request.country_code, request.limit - len(results))
        
        for postal in postal_codes:
            label = postal.code
            if postal.city:
                label = f"{postal.code} - {postal.city.name}, {postal.city.state.code}"
            
            results.append(LocationAutocompleteResult(
                value=postal.code,
                label=label,
                type=LocationType.POSTAL_CODE,
                metadata={
                    'city_name': postal.city.name if postal.city else None,
                    'state_code': postal.city.state.code if postal.city else None,
                }
            ))
    
    return LocationAutocompleteResponse(results=results[:request.limit])


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_address(
    request: GeocodeRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Geocode an address to coordinates"""
    # Use Google Maps client for geocoding
    maps_client = GoogleMapsClient()
    
    # Build full address
    address_parts = [request.address]
    if request.city:
        address_parts.append(request.city)
    if request.state:
        address_parts.append(request.state)
    if request.postal_code:
        address_parts.append(request.postal_code)
    if request.country_code:
        address_parts.append(request.country_code)
    
    full_address = ", ".join(address_parts)
    
    try:
        result = maps_client.geocode(full_address)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Address not found"
            )
        
        return GeocodeResponse(
            formatted_address=result['formatted_address'],
            coordinates=GeoCoordinates(
                latitude=Decimal(str(result['latitude'])),
                longitude=Decimal(str(result['longitude']))
            ),
            city=result.get('city'),
            state=result.get('state'),
            postal_code=result.get('postal_code'),
            country_code=result.get('country_code', 'US'),
            confidence_score=result.get('confidence', 0.9),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Geocoding failed: {str(e)}"
        )


@router.post("/reverse-geocode", response_model=GeocodeResponse)
async def reverse_geocode(
    request: ReverseGeocodeRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Reverse geocode coordinates to address"""
    maps_client = GoogleMapsClient()
    
    try:
        result = maps_client.reverse_geocode(
            float(request.latitude),
            float(request.longitude)
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found"
            )
        
        return GeocodeResponse(
            formatted_address=result['formatted_address'],
            coordinates=GeoCoordinates(
                latitude=request.latitude,
                longitude=request.longitude
            ),
            city=result.get('city'),
            state=result.get('state'),
            postal_code=result.get('postal_code'),
            country_code=result.get('country_code', 'US'),
            confidence_score=1.0,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reverse geocoding failed: {str(e)}"
        )


@router.post("/distance", response_model=DistanceResponse)
async def calculate_distance_between_points(
    request: DistanceRequest,
    db=Depends(get_db),
):
    """Calculate distance between two points"""
    distance_miles = calculate_distance(
        float(request.from_location.latitude),
        float(request.from_location.longitude),
        float(request.to_location.latitude),
        float(request.to_location.longitude)
    )
    
    if request.unit == "kilometers":
        distance = Decimal(str(distance_miles * 1.60934))
    else:
        distance = Decimal(str(distance_miles))
    
    # Rough estimate: 30 mph average speed in city
    duration_minutes = int(distance_miles * 2)
    
    return DistanceResponse(
        distance=distance,
        unit=request.unit,
        duration_estimate_minutes=duration_minutes,
    )


@router.get("/popular", response_model=PopularLocationsResponse)
async def get_popular_locations(
    country_code: Optional[str] = Query(None, min_length=2, max_length=2),
    state_code: Optional[str] = Query(None, max_length=10),
    limit: int = Query(20, ge=1, le=50),
    db=Depends(get_db),
):
    """Get popular locations for SEO/discovery"""
    cities = await get_popular_cities(country_code, state_code, limit)
    
    results = []
    for city in cities:
        # Calculate trending score (simple version)
        trending_score = min(100, (city.service_count * 0.5) + (city.practitioner_count * 2))
        
        results.append(PopularLocation(
            city=serialize_city_simple(city),
            service_count=city.service_count,
            practitioner_count=city.practitioner_count,
            average_rating=None,  # TODO: Calculate from reviews
            trending_score=float(trending_score),
        ))
    
    return PopularLocationsResponse(
        locations=results,
        total=len(results),
    )


# Practitioner location endpoints
@router.get("/practitioner/{practitioner_id}/locations", response_model=PractitionerLocationListResponse)
async def list_practitioner_locations(
    practitioner_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """List practitioner's service locations"""
    practitioner = await get_practitioner_by_id(practitioner_id)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practitioner not found"
        )
    
    # Check authorization
    if practitioner.user != current_user and not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these locations"
        )
    
    locations = await get_practitioner_locations(practitioner)
    
    results = []
    for location in locations:
        # Build full address
        full_address = location.address_line1
        if location.address_line2:
            full_address += f", {location.address_line2}"
        full_address += f", {location.city.name}, {location.state.code} {location.postal_code}"
        
        response = PractitionerLocationResponse(
            **location.__dict__,
            practitioner_id=location.practitioner_id,
            city=serialize_city_simple(location.city),
            state=StateResponse.model_validate(location.state),
            country=CountryResponse.model_validate(location.country),
            full_address=full_address,
        )
        results.append(response)
    
    return PractitionerLocationListResponse(
        results=results,
        total=len(results),
        limit=len(results),
        offset=0,
    )


@router.post("/practitioner/{practitioner_id}/locations", response_model=PractitionerLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_practitioner_location(
    practitioner_id: UUID,
    location_data: PractitionerLocationCreate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Create a new practitioner location"""
    practitioner = await get_practitioner_by_id(practitioner_id)
    if not practitioner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practitioner not found"
        )
    
    # Check authorization
    if practitioner.user != current_user and not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add locations for this practitioner"
        )
    
    # Validate city, state, country exist
    city, state, country = await get_location_references(
        location_data.city_id, location_data.state_id, location_data.country_id
    )
    if not all([city, state, country]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid city, state, or country"
        )
    
    # Create location
    location = await create_practitioner_location_with_transaction(
        practitioner, location_data.model_dump(), city
    )
    
    # Build response
    full_address = location.address_line1
    if location.address_line2:
        full_address += f", {location.address_line2}"
    full_address += f", {city.name}, {state.code} {location.postal_code}"
    
    return PractitionerLocationResponse(
        **location.__dict__,
        practitioner_id=location.practitioner_id,
        city=serialize_city_simple(city),
        state=StateResponse.model_validate(state),
        country=CountryResponse.model_validate(country),
        full_address=full_address,
    )


@router.patch("/practitioner/locations/{location_id}", response_model=PractitionerLocationResponse)
async def update_practitioner_location(
    location_id: UUID,
    location_update: PractitionerLocationUpdate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Update practitioner location"""
    location = await get_practitioner_location_by_id(location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Check authorization
    if location.practitioner.user != current_user and not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this location"
        )
    
    # Update fields
    update_data = location_update.model_dump(exclude_unset=True)
    
    # Validate new city/state/country if provided
    if 'city_id' in update_data:
        city = await sync_to_async(City.objects.get)(id=update_data.pop('city_id'))
        if not city:
            raise HTTPException(status_code=400, detail="Invalid city")
        update_data['city'] = city
    
    if 'state_id' in update_data:
        state = await sync_to_async(State.objects.get)(id=update_data.pop('state_id'))
        if not state:
            raise HTTPException(status_code=400, detail="Invalid state")
        update_data['state'] = state
    
    if 'country_id' in update_data:
        country = await sync_to_async(Country.objects.get)(id=update_data.pop('country_id'))
        if not country:
            raise HTTPException(status_code=400, detail="Invalid country")
        update_data['country'] = country
    
    # Update location
    location = await update_practitioner_location_fields(location, update_data)
    
    # Build response
    full_address = location.address_line1
    if location.address_line2:
        full_address += f", {location.address_line2}"
    full_address += f", {location.city.name}, {location.state.code} {location.postal_code}"
    
    return PractitionerLocationResponse(
        **location.__dict__,
        practitioner_id=location.practitioner_id,
        city=serialize_city_simple(location.city),
        state=StateResponse.model_validate(location.state),
        country=CountryResponse.model_validate(location.country),
        full_address=full_address,
    )


@router.delete("/practitioner/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_practitioner_location(
    location_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Delete practitioner location"""
    location = await get_practitioner_location_by_id(location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Check authorization
    if location.practitioner.user != current_user and not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this location"
        )
    
    # Delete with transaction logic
    success, error_message = await delete_practitioner_location_with_transaction(location)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )


@router.post("/service-area", response_model=ServiceAreaResponse)
async def get_service_area_info(
    request: ServiceAreaRequest,
    db=Depends(get_db),
):
    """Get information about a service area"""
    # Find cities within radius
    cities_in_area = await get_cities_in_service_area(
        float(request.center_latitude),
        float(request.center_longitude),
        float(request.radius_miles)
    )
    
    # Calculate totals
    total_population = sum(city.population or 0 for city in cities_in_area)
    
    # Count practitioners in area
    practitioner_count = await count_practitioners_in_cities(cities_in_area)
    
    return ServiceAreaResponse(
        center=GeoCoordinates(
            latitude=request.center_latitude,
            longitude=request.center_longitude
        ),
        radius_miles=request.radius_miles,
        cities_covered=[serialize_city_simple(city) for city in cities_in_area[:20]],
        estimated_population=total_population,
        practitioner_count=practitioner_count,
    )