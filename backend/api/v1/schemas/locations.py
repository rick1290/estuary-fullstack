"""
Location schemas for FastAPI endpoints
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from decimal import Decimal
from uuid import UUID

from .base import BaseSchema, ListResponse
from enum import Enum


class LocationType(str, Enum):
    """Location type constants"""
    COUNTRY = "country"
    STATE = "state"
    CITY = "city"
    POSTAL_CODE = "postal_code"
    ADDRESS = "address"


class GeoCoordinates(BaseModel):
    """Geographic coordinates"""
    latitude: Decimal = Field(..., ge=-90, le=90, decimal_places=6)
    longitude: Decimal = Field(..., ge=-180, le=180, decimal_places=6)
    
    model_config = ConfigDict(from_attributes=True)


class CountryBase(BaseModel):
    """Base country schema"""
    name: str = Field(..., max_length=100)
    code: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2 code")
    code_3: str = Field(..., min_length=3, max_length=3, description="ISO 3166-1 alpha-3 code")
    numeric_code: Optional[str] = Field(None, max_length=3)
    phone_code: Optional[str] = Field(None, max_length=10)
    currency_code: Optional[str] = Field(None, max_length=3)
    is_active: bool = True


class CountryCreate(CountryBase):
    """Schema for creating a country"""
    pass


class CountryUpdate(BaseModel):
    """Schema for updating a country"""
    name: Optional[str] = Field(None, max_length=100)
    phone_code: Optional[str] = Field(None, max_length=10)
    currency_code: Optional[str] = Field(None, max_length=3)
    is_active: Optional[bool] = None


class CountryResponse(CountryBase, BaseSchema):
    """Country response schema"""
    slug: str
    
    model_config = ConfigDict(from_attributes=True)


class StateBase(BaseModel):
    """Base state/province schema"""
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=10, description="State/province code")
    country_id: UUID
    is_active: bool = True
    meta_title: Optional[str] = Field(None, max_length=200)
    meta_description: Optional[str] = None


class StateCreate(StateBase):
    """Schema for creating a state"""
    pass


class StateUpdate(BaseModel):
    """Schema for updating a state"""
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=10)
    is_active: Optional[bool] = None
    meta_title: Optional[str] = Field(None, max_length=200)
    meta_description: Optional[str] = None


class StateResponse(StateBase, BaseSchema):
    """State response schema"""
    slug: str
    country: CountryResponse
    
    model_config = ConfigDict(from_attributes=True)


class CityBase(BaseModel):
    """Base city schema"""
    name: str = Field(..., max_length=100)
    state_id: UUID
    population: Optional[int] = None
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90, decimal_places=6)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180, decimal_places=6)
    metro_area: Optional[str] = Field(None, max_length=100)
    is_major: bool = False
    is_active: bool = True
    meta_title: Optional[str] = Field(None, max_length=200)
    meta_description: Optional[str] = None


class CityCreate(CityBase):
    """Schema for creating a city"""
    pass


class CityUpdate(BaseModel):
    """Schema for updating a city"""
    name: Optional[str] = Field(None, max_length=100)
    population: Optional[int] = None
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90, decimal_places=6)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180, decimal_places=6)
    metro_area: Optional[str] = Field(None, max_length=100)
    is_major: Optional[bool] = None
    is_active: Optional[bool] = None
    meta_title: Optional[str] = Field(None, max_length=200)
    meta_description: Optional[str] = None


class CityResponse(CityBase, BaseSchema):
    """City response schema"""
    slug: str
    state: StateResponse
    service_count: int = 0
    seo_url: str
    
    model_config = ConfigDict(from_attributes=True)


class CitySimple(BaseSchema):
    """Simplified city response"""
    id: UUID
    name: str
    state_code: str
    state_name: str
    country_code: str
    seo_url: str
    
    model_config = ConfigDict(from_attributes=True)


class PostalCodeBase(BaseModel):
    """Base postal code schema"""
    code: str = Field(..., max_length=20)
    city_id: Optional[UUID] = None
    country_id: UUID
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90, decimal_places=6)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180, decimal_places=6)


class PostalCodeCreate(PostalCodeBase):
    """Schema for creating a postal code"""
    pass


class PostalCodeResponse(PostalCodeBase, BaseSchema):
    """Postal code response schema"""
    city: Optional[CitySimple] = None
    country: CountryResponse
    
    model_config = ConfigDict(from_attributes=True)


class PractitionerLocationBase(BaseModel):
    """Base practitioner location schema"""
    name: Optional[str] = Field(None, max_length=255, description="Location name (e.g., 'Downtown Office')")
    address_line1: str = Field(..., max_length=255)
    address_line2: Optional[str] = Field(None, max_length=255)
    city_id: UUID
    state_id: UUID
    postal_code: str = Field(..., max_length=20)
    country_id: UUID
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90, decimal_places=6)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180, decimal_places=6)
    is_primary: bool = False
    is_virtual: bool = False
    is_in_person: bool = True
    service_radius_miles: Optional[Decimal] = Field(None, ge=0, le=500, decimal_places=1)


class PractitionerLocationCreate(PractitionerLocationBase):
    """Schema for creating a practitioner location"""
    pass


class PractitionerLocationUpdate(BaseModel):
    """Schema for updating a practitioner location"""
    name: Optional[str] = Field(None, max_length=255)
    address_line1: Optional[str] = Field(None, max_length=255)
    address_line2: Optional[str] = Field(None, max_length=255)
    city_id: Optional[UUID] = None
    state_id: Optional[UUID] = None
    postal_code: Optional[str] = Field(None, max_length=20)
    country_id: Optional[UUID] = None
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90, decimal_places=6)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180, decimal_places=6)
    is_primary: Optional[bool] = None
    is_virtual: Optional[bool] = None
    is_in_person: Optional[bool] = None
    service_radius_miles: Optional[Decimal] = Field(None, ge=0, le=500, decimal_places=1)


class PractitionerLocationResponse(PractitionerLocationBase, BaseSchema):
    """Practitioner location response schema"""
    practitioner_id: UUID
    city: CitySimple
    state: StateResponse
    country: CountryResponse
    full_address: str
    
    model_config = ConfigDict(from_attributes=True)


# Location search schemas
class LocationSearchRequest(BaseModel):
    """Location search request"""
    query: str = Field(..., min_length=2, max_length=100)
    location_type: Optional[LocationType] = None
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    state_code: Optional[str] = Field(None, max_length=10)
    include_inactive: bool = False
    limit: int = Field(20, ge=1, le=100)


class LocationSearchResult(BaseModel):
    """Single location search result"""
    id: UUID
    name: str
    type: LocationType
    display_name: str
    country_code: str
    state_code: Optional[str] = None
    coordinates: Optional[GeoCoordinates] = None
    population: Optional[int] = None
    service_count: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class LocationSearchResponse(BaseModel):
    """Location search response"""
    results: List[LocationSearchResult]
    query: str
    total: int


# Autocomplete schemas
class LocationAutocompleteRequest(BaseModel):
    """Location autocomplete request"""
    query: str = Field(..., min_length=1, max_length=50)
    types: Optional[List[LocationType]] = None
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    limit: int = Field(10, ge=1, le=20)


class LocationAutocompleteResult(BaseModel):
    """Autocomplete result"""
    value: str  # The ID or code
    label: str  # Display text
    type: LocationType
    metadata: Optional[Dict[str, Any]] = None


class LocationAutocompleteResponse(BaseModel):
    """Autocomplete response"""
    results: List[LocationAutocompleteResult]


# Service area schemas
class ServiceAreaRequest(BaseModel):
    """Request for service areas"""
    center_latitude: Decimal = Field(..., ge=-90, le=90, decimal_places=6)
    center_longitude: Decimal = Field(..., ge=-180, le=180, decimal_places=6)
    radius_miles: Decimal = Field(..., ge=0, le=100, decimal_places=1)


class ServiceAreaResponse(BaseModel):
    """Service area response"""
    center: GeoCoordinates
    radius_miles: Decimal
    cities_covered: List[CitySimple]
    estimated_population: int
    practitioner_count: int


# Geocoding schemas
class GeocodeRequest(BaseModel):
    """Geocoding request"""
    address: str = Field(..., min_length=5, max_length=500)
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)


class GeocodeResponse(BaseModel):
    """Geocoding response"""
    formatted_address: str
    coordinates: GeoCoordinates
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country_code: str
    confidence_score: float = Field(..., ge=0, le=1)


class ReverseGeocodeRequest(BaseModel):
    """Reverse geocoding request"""
    latitude: Decimal = Field(..., ge=-90, le=90, decimal_places=6)
    longitude: Decimal = Field(..., ge=-180, le=180, decimal_places=6)


# Distance calculation
class DistanceRequest(BaseModel):
    """Distance calculation request"""
    from_location: GeoCoordinates
    to_location: GeoCoordinates
    unit: str = Field("miles", pattern="^(miles|kilometers)$")


class DistanceResponse(BaseModel):
    """Distance calculation response"""
    distance: Decimal
    unit: str
    duration_estimate_minutes: Optional[int] = None


# Popular locations
class PopularLocation(BaseModel):
    """Popular location for SEO/discovery"""
    city: CitySimple
    service_count: int
    practitioner_count: int
    average_rating: Optional[float] = None
    trending_score: float = Field(..., ge=0, le=100)
    
    model_config = ConfigDict(from_attributes=True)


class PopularLocationsResponse(BaseModel):
    """Popular locations response"""
    locations: List[PopularLocation]
    total: int


# List responses
class CountryListResponse(ListResponse):
    """Country list response"""
    results: List[CountryResponse]


class StateListResponse(ListResponse):
    """State list response"""
    results: List[StateResponse]


class CityListResponse(ListResponse):
    """City list response"""
    results: List[CityResponse]


class PostalCodeListResponse(ListResponse):
    """Postal code list response"""
    results: List[PostalCodeResponse]


class PractitionerLocationListResponse(ListResponse):
    """Practitioner location list response"""
    results: List[PractitionerLocationResponse]