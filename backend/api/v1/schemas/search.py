from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, validator
from enum import Enum

from .base import BaseResponse


class SearchType(str, Enum):
    """Types of searches supported"""
    ALL = "all"
    SERVICES = "services"
    PRACTITIONERS = "practitioners"
    LOCATIONS = "locations"


class SortBy(str, Enum):
    """Sorting options for search results"""
    RELEVANCE = "relevance"
    PRICE_LOW_HIGH = "price_low_high"
    PRICE_HIGH_LOW = "price_high_low"
    RATING = "rating"
    REVIEWS = "reviews"
    DISTANCE = "distance"
    AVAILABILITY = "availability"
    POPULARITY = "popularity"


class LocationType(str, Enum):
    """Location types for filtering"""
    VIRTUAL = "virtual"
    IN_PERSON = "in_person"
    HYBRID = "hybrid"


class ExperienceLevel(str, Enum):
    """Experience levels for filtering"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    ALL_LEVELS = "all_levels"


# ============================================================================
# SEARCH REQUEST SCHEMAS
# ============================================================================

class GeoLocation(BaseModel):
    """Geographic location for distance-based search"""
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    
    @validator('latitude')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v
    
    @validator('longitude')
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError('Longitude must be between -180 and 180')
        return v


class PriceRange(BaseModel):
    """Price range filter"""
    min: Optional[Decimal] = Field(None, ge=0, description="Minimum price in dollars")
    max: Optional[Decimal] = Field(None, ge=0, description="Maximum price in dollars")
    
    @validator('max')
    def validate_price_range(cls, v, values):
        if v is not None and 'min' in values and values['min'] is not None:
            if v < values['min']:
                raise ValueError('Maximum price must be greater than minimum price')
        return v


class DateTimeRange(BaseModel):
    """Date/time range for availability filtering"""
    start: datetime = Field(..., description="Start of availability window")
    end: datetime = Field(..., description="End of availability window")
    
    @validator('end')
    def validate_date_range(cls, v, values):
        if 'start' in values and v <= values['start']:
            raise ValueError('End time must be after start time')
        return v


class SearchFilters(BaseModel):
    """Comprehensive search filters"""
    # Price filters
    price_range: Optional[PriceRange] = None
    
    # Rating filters
    min_rating: Optional[float] = Field(None, ge=0, le=5, description="Minimum average rating")
    
    # Availability filters
    availability: Optional[DateTimeRange] = None
    available_now: Optional[bool] = Field(None, description="Only show immediately available")
    
    # Location filters
    location_type: Optional[List[LocationType]] = Field(None, description="Virtual, in-person, or hybrid")
    distance_miles: Optional[float] = Field(None, gt=0, le=100, description="Maximum distance in miles")
    
    # Service-specific filters
    service_types: Optional[List[str]] = Field(None, description="Service type IDs or codes")
    categories: Optional[List[int]] = Field(None, description="Category IDs")
    duration_minutes_min: Optional[int] = Field(None, gt=0, description="Minimum session duration")
    duration_minutes_max: Optional[int] = Field(None, gt=0, description="Maximum session duration")
    max_participants: Optional[int] = Field(None, gt=0, description="Maximum group size")
    experience_level: Optional[List[ExperienceLevel]] = None
    
    # Practitioner-specific filters
    specializations: Optional[List[int]] = Field(None, description="Specialization IDs")
    modalities: Optional[List[int]] = Field(None, description="Modality IDs")
    languages: Optional[List[str]] = Field(None, description="Language codes")
    gender: Optional[List[str]] = Field(None, description="Practitioner gender preferences")
    years_experience_min: Optional[int] = Field(None, ge=0, description="Minimum years of experience")
    
    # Feature filters
    is_featured: Optional[bool] = None
    has_video: Optional[bool] = None
    accepts_insurance: Optional[bool] = None
    offers_packages: Optional[bool] = None
    offers_discounts: Optional[bool] = None
    
    # Age filters
    age_appropriate_for: Optional[int] = Field(None, description="Age of participant")


class UnifiedSearchRequest(BaseModel):
    """Unified search request supporting multiple entity types"""
    query: str = Field(..., min_length=1, max_length=200, description="Search query text")
    search_type: SearchType = Field(SearchType.ALL, description="Type of entities to search")
    filters: Optional[SearchFilters] = None
    location: Optional[GeoLocation] = None
    sort_by: SortBy = Field(SortBy.RELEVANCE, description="Sort order for results")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Results per page")
    
    # User context (for personalization)
    user_id: Optional[str] = Field(None, description="User ID for personalized results")
    session_id: Optional[str] = Field(None, description="Session ID for tracking")
    
    # Search options
    include_unavailable: bool = Field(False, description="Include unavailable items")
    fuzzy_match: bool = Field(True, description="Enable fuzzy matching for typos")
    boost_local: bool = Field(True, description="Boost local results when location provided")


class AutocompleteRequest(BaseModel):
    """Autocomplete/typeahead request"""
    query: str = Field(..., min_length=1, max_length=100, description="Partial search query")
    search_type: SearchType = Field(SearchType.ALL, description="Type of suggestions")
    location: Optional[GeoLocation] = None
    limit: int = Field(10, ge=1, le=20, description="Maximum suggestions")
    include_categories: bool = Field(True, description="Include category suggestions")


class NearbySearchRequest(BaseModel):
    """Geospatial search request"""
    location: GeoLocation = Field(..., description="Center point for search")
    radius_miles: float = Field(10, gt=0, le=50, description="Search radius in miles")
    search_type: SearchType = Field(SearchType.ALL, description="Type of entities")
    filters: Optional[SearchFilters] = None
    sort_by: Literal["distance", "rating", "popularity"] = Field("distance")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class AdvancedServiceSearchRequest(BaseModel):
    """Advanced service-specific search"""
    query: Optional[str] = Field(None, max_length=200, description="Optional text query")
    filters: SearchFilters = Field(..., description="Required filters for advanced search")
    location: Optional[GeoLocation] = None
    sort_by: SortBy = Field(SortBy.RELEVANCE)
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    
    # Advanced options
    boost_new: bool = Field(False, description="Boost recently added services")
    boost_trending: bool = Field(False, description="Boost trending services")
    similar_to_service_id: Optional[str] = Field(None, description="Find similar services")


class AdvancedPractitionerSearchRequest(BaseModel):
    """Advanced practitioner-specific search"""
    query: Optional[str] = Field(None, max_length=200, description="Optional text query")
    filters: SearchFilters = Field(..., description="Required filters")
    location: Optional[GeoLocation] = None
    sort_by: SortBy = Field(SortBy.RELEVANCE)
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    
    # Advanced options
    match_all_specializations: bool = Field(False, description="Must match ALL specializations")
    match_all_modalities: bool = Field(False, description="Must match ALL modalities")


# ============================================================================
# SEARCH RESULT SCHEMAS
# ============================================================================

class SearchScore(BaseModel):
    """Relevance scoring details"""
    total: float = Field(..., description="Total relevance score")
    text_match: float = Field(0, description="Text matching score")
    location_boost: float = Field(0, description="Location proximity boost")
    popularity_boost: float = Field(0, description="Popularity/rating boost")
    recency_boost: float = Field(0, description="Recency boost")
    personalization_boost: float = Field(0, description="Personalization boost")


class ServiceSearchResult(BaseModel):
    """Service search result item"""
    id: str = Field(..., description="Service ID")
    name: str
    short_description: Optional[str] = None
    service_type: str
    category_name: Optional[str] = None
    
    # Practitioner info
    practitioner_id: str
    practitioner_name: str
    practitioner_title: Optional[str] = None
    
    # Pricing
    price: Decimal
    price_display: str = Field(..., description="Formatted price string")
    original_price: Optional[Decimal] = None
    discount_percentage: Optional[float] = None
    
    # Details
    duration_minutes: int
    location_type: str
    experience_level: str
    max_participants: int
    
    # Location (if applicable)
    city: Optional[str] = None
    state: Optional[str] = None
    distance_miles: Optional[float] = None
    
    # Ratings
    average_rating: float
    total_reviews: int
    
    # Availability
    next_available: Optional[datetime] = None
    is_available: bool
    
    # Media
    image_url: Optional[str] = None
    has_video: bool = False
    
    # Tags and features
    tags: List[str] = []
    is_featured: bool = False
    is_new: bool = False
    
    # Search metadata
    score: Optional[SearchScore] = None
    highlights: Dict[str, List[str]] = Field(default_factory=dict, description="Field highlights")
    
    model_config = ConfigDict(from_attributes=True)


class PractitionerSearchResult(BaseModel):
    """Practitioner search result item"""
    id: str = Field(..., description="Practitioner ID")
    display_name: str
    professional_title: Optional[str] = None
    bio_excerpt: Optional[str] = Field(None, description="First 200 chars of bio")
    
    # Experience
    years_experience: Optional[int] = None
    total_sessions: int
    
    # Specializations
    specializations: List[str] = []
    modalities: List[str] = []
    languages: List[str] = []
    
    # Location
    city: Optional[str] = None
    state: Optional[str] = None
    offers_virtual: bool
    offers_in_person: bool
    distance_miles: Optional[float] = None
    
    # Ratings
    average_rating: float
    total_reviews: int
    
    # Pricing
    price_range_min: Optional[Decimal] = None
    price_range_max: Optional[Decimal] = None
    
    # Availability
    next_available: Optional[datetime] = None
    is_available: bool
    
    # Media
    profile_image_url: Optional[str] = None
    has_video: bool = False
    
    # Features
    is_verified: bool
    is_featured: bool
    accepts_insurance: bool = False
    
    # Search metadata
    score: Optional[SearchScore] = None
    highlights: Dict[str, List[str]] = Field(default_factory=dict)
    
    model_config = ConfigDict(from_attributes=True)


class LocationSearchResult(BaseModel):
    """Location search result item"""
    city: str
    state: str
    country: str
    metro_area: Optional[str] = None
    
    # Counts
    total_services: int
    total_practitioners: int
    
    # Popular categories in this location
    top_categories: List[Dict[str, Any]] = []
    
    # Geo
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_miles: Optional[float] = None
    
    # SEO
    slug: str
    url_path: str
    
    model_config = ConfigDict(from_attributes=True)


class SearchResultItem(BaseModel):
    """Unified search result item that can be any entity type"""
    type: Literal["service", "practitioner", "location"]
    data: Dict[str, Any] = Field(..., description="Entity-specific data")
    score: float = Field(..., description="Relevance score")


class FacetValue(BaseModel):
    """Facet value with count"""
    value: str
    label: str
    count: int
    selected: bool = False


class SearchFacet(BaseModel):
    """Search facet for filtering"""
    name: str
    field: str
    type: Literal["terms", "range", "boolean"]
    values: List[FacetValue]


class SearchSuggestion(BaseModel):
    """Search suggestion/correction"""
    text: str
    score: float
    type: Literal["correction", "suggestion", "related"]


class UnifiedSearchResponse(BaseResponse):
    """Unified search response with results and metadata"""
    results: List[SearchResultItem] = Field(default_factory=list)
    
    # Type-specific results (when searching specific types)
    services: List[ServiceSearchResult] = Field(default_factory=list)
    practitioners: List[PractitionerSearchResult] = Field(default_factory=list)
    locations: List[LocationSearchResult] = Field(default_factory=list)
    
    # Metadata
    total_results: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0
    
    # Facets for filtering
    facets: List[SearchFacet] = Field(default_factory=list)
    
    # Search improvements
    suggestions: List[SearchSuggestion] = Field(default_factory=list)
    did_you_mean: Optional[str] = None
    
    # Performance metrics
    search_time_ms: int = Field(0, description="Search execution time in milliseconds")


# ============================================================================
# AUTOCOMPLETE SCHEMAS
# ============================================================================

class AutocompleteSuggestion(BaseModel):
    """Single autocomplete suggestion"""
    text: str
    type: Literal["query", "service", "practitioner", "category", "location"]
    subtitle: Optional[str] = None
    icon: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AutocompleteResponse(BaseResponse):
    """Autocomplete suggestions response"""
    suggestions: List[AutocompleteSuggestion] = Field(default_factory=list)
    query_time_ms: int = 0


# ============================================================================
# TRENDING AND POPULAR SCHEMAS
# ============================================================================

class TrendingItem(BaseModel):
    """Trending search or service"""
    type: Literal["search", "service", "category", "practitioner"]
    text: str
    subtitle: Optional[str] = None
    count: int = Field(..., description="Number of recent searches/views")
    trend: Literal["up", "down", "stable"] = "stable"
    change_percentage: Optional[float] = None


class PopularSearch(BaseModel):
    """Popular search term"""
    query: str
    count: int
    category: Optional[str] = None


class TrendingResponse(BaseResponse):
    """Trending searches and services response"""
    trending_searches: List[PopularSearch] = Field(default_factory=list)
    trending_services: List[ServiceSearchResult] = Field(default_factory=list)
    trending_categories: List[TrendingItem] = Field(default_factory=list)
    trending_practitioners: List[PractitionerSearchResult] = Field(default_factory=list)
    
    # Time period
    period: Literal["day", "week", "month"] = "week"
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# CATEGORY BROWSE SCHEMAS
# ============================================================================

class CategoryWithCount(BaseModel):
    """Category with service count"""
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    service_count: int
    is_featured: bool = False
    subcategories: List['CategoryWithCount'] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)


class CategoryBrowseResponse(BaseResponse):
    """Category browse response"""
    categories: List[CategoryWithCount] = Field(default_factory=list)
    total_categories: int = 0


# ============================================================================
# FILTER OPTIONS SCHEMAS
# ============================================================================

class FilterOption(BaseModel):
    """Single filter option"""
    value: Any
    label: str
    count: int = 0
    is_selected: bool = False


class FilterGroup(BaseModel):
    """Group of related filters"""
    name: str
    field: str
    type: Literal["multi_select", "single_select", "range", "boolean"]
    options: List[FilterOption] = Field(default_factory=list)
    
    # For range filters
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    step: Optional[float] = None


class DynamicFiltersResponse(BaseResponse):
    """Dynamic filter options based on current search context"""
    filters: List[FilterGroup] = Field(default_factory=list)
    
    # Applied filters summary
    applied_filters: Dict[str, List[Any]] = Field(default_factory=dict)
    
    # Result counts if filters were removed
    filter_impacts: Dict[str, int] = Field(
        default_factory=dict, 
        description="Potential results if each filter was removed"
    )


# ============================================================================
# SEARCH SUGGESTIONS SCHEMAS
# ============================================================================

class SearchHistoryItem(BaseModel):
    """User's search history item"""
    query: str
    search_type: SearchType
    timestamp: datetime
    result_count: int


class PersonalizedSuggestion(BaseModel):
    """Personalized search suggestion"""
    text: str
    reason: Literal["history", "similar", "popular", "recommended"]
    subtitle: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SearchSuggestionsResponse(BaseResponse):
    """Personalized search suggestions"""
    recent_searches: List[SearchHistoryItem] = Field(default_factory=list)
    recommended_searches: List[PersonalizedSuggestion] = Field(default_factory=list)
    popular_in_area: List[PopularSearch] = Field(default_factory=list)
    
    # Based on user's history
    categories_of_interest: List[CategoryWithCount] = Field(default_factory=list)
    similar_services: List[ServiceSearchResult] = Field(default_factory=list)


# Update forward references
CategoryWithCount.model_rebuild()