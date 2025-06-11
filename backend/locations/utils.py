"""
Utility functions for location operations
"""
import math
from typing import Tuple, Optional, List
from decimal import Decimal
from django.db.models import Q, F, Value, DecimalField
from django.db.models.functions import Power, Sqrt, Sin, Cos, ATan2, Radians
from locations.models import City, PractitionerLocation
import pytz
from datetime import datetime


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees).
    Returns distance in miles.
    """
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    # Radius of earth in miles
    r = 3959
    
    return r * c


def get_bounding_box(lat: float, lon: float, distance_miles: float) -> Tuple[float, float, float, float]:
    """
    Get bounding box coordinates for a given center point and radius.
    Returns (min_lat, max_lat, min_lon, max_lon)
    """
    # Earth's radius in miles
    R = 3959
    
    # Convert to radians
    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)
    
    # Angular distance in radians
    angular_distance = distance_miles / R
    
    # Calculate bounds
    min_lat = math.degrees(lat_rad - angular_distance)
    max_lat = math.degrees(lat_rad + angular_distance)
    
    # Longitude bounds (accounting for earth's curvature)
    delta_lon = math.asin(math.sin(angular_distance) / math.cos(lat_rad))
    min_lon = math.degrees(lon_rad - delta_lon)
    max_lon = math.degrees(lon_rad + delta_lon)
    
    return min_lat, max_lat, min_lon, max_lon


def find_nearby_locations(
    latitude: float,
    longitude: float,
    radius_miles: float,
    location_type: Optional[str] = None,
    limit: int = 100
) -> List[PractitionerLocation]:
    """
    Find practitioner locations within a given radius.
    """
    # Get bounding box for initial filtering
    min_lat, max_lat, min_lon, max_lon = get_bounding_box(latitude, longitude, radius_miles)
    
    # Start with locations in bounding box
    queryset = PractitionerLocation.objects.filter(
        latitude__gte=min_lat,
        latitude__lte=max_lat,
        longitude__gte=min_lon,
        longitude__lte=max_lon,
        practitioner__practitioner_status='active'
    )
    
    # Filter by location type
    if location_type == 'in_person':
        queryset = queryset.filter(is_in_person=True)
    elif location_type == 'virtual':
        queryset = queryset.filter(is_virtual=True)
    
    # Calculate distance using database functions
    lat_rad = math.radians(latitude)
    lng_rad = math.radians(longitude)
    
    queryset = queryset.annotate(
        distance_miles=Value(3959.0, output_field=DecimalField()) * 
        ATan2(
            Sqrt(
                Power(Sin((Radians(F('latitude')) - lat_rad) / 2), 2) +
                Cos(lat_rad) * Cos(Radians(F('latitude'))) *
                Power(Sin((Radians(F('longitude')) - lng_rad) / 2), 2)
            ),
            Sqrt(
                1 - (
                    Power(Sin((Radians(F('latitude')) - lat_rad) / 2), 2) +
                    Cos(lat_rad) * Cos(Radians(F('latitude'))) *
                    Power(Sin((Radians(F('longitude')) - lng_rad) / 2), 2)
                )
            )
        ) * 2
    )
    
    # Filter by actual distance and order
    queryset = queryset.filter(distance_miles__lte=radius_miles)
    queryset = queryset.order_by('distance_miles')
    
    # Select related for efficiency
    queryset = queryset.select_related(
        'practitioner', 'city', 'state', 'country'
    )
    
    return list(queryset[:limit])


def get_timezone_for_location(latitude: float, longitude: float) -> str:
    """
    Get timezone for a given location.
    This is a simplified version - in production you might want to use
    a service like Google's Time Zone API.
    """
    # This is a very basic implementation
    # For US locations, we can make rough estimates based on longitude
    if -125 <= longitude <= -115:  # Pacific
        return 'America/Los_Angeles'
    elif -115 < longitude <= -105:  # Mountain
        return 'America/Denver'
    elif -105 < longitude <= -90:   # Central
        return 'America/Chicago'
    elif -90 < longitude <= -70:    # Eastern
        return 'America/New_York'
    else:
        # Default to UTC for locations outside continental US
        return 'UTC'


def format_address(location: PractitionerLocation, include_country: bool = False) -> str:
    """
    Format a location's address for display.
    """
    parts = [location.address_line1]
    
    if location.address_line2:
        parts.append(location.address_line2)
    
    city_state_zip = f"{location.city.name}, {location.state.code} {location.postal_code}"
    parts.append(city_state_zip)
    
    if include_country and location.country:
        parts.append(location.country.name)
    
    return ", ".join(parts)


def get_service_area_stats(
    center_lat: float,
    center_lon: float,
    radius_miles: float
) -> dict:
    """
    Get statistics about a service area.
    """
    # Find cities in area
    min_lat, max_lat, min_lon, max_lon = get_bounding_box(center_lat, center_lon, radius_miles)
    
    cities = City.objects.filter(
        latitude__gte=min_lat,
        latitude__lte=max_lat,
        longitude__gte=min_lon,
        longitude__lte=max_lon,
        is_active=True
    )
    
    # Filter by actual distance
    cities_in_area = []
    total_population = 0
    
    for city in cities:
        if city.latitude and city.longitude:
            distance = calculate_distance(
                center_lat, center_lon,
                float(city.latitude), float(city.longitude)
            )
            if distance <= radius_miles:
                cities_in_area.append(city)
                total_population += city.population or 0
    
    # Count practitioners
    practitioner_count = PractitionerLocation.objects.filter(
        city__in=cities_in_area,
        practitioner__practitioner_status='active'
    ).values('practitioner').distinct().count()
    
    return {
        'cities_count': len(cities_in_area),
        'total_population': total_population,
        'practitioner_count': practitioner_count,
        'major_cities': [c for c in cities_in_area if c.is_major]
    }


def validate_location_business_hours(location: PractitionerLocation, timezone: str = None) -> bool:
    """
    Check if a location is currently open based on business hours.
    This is a placeholder - actual implementation would check stored business hours.
    """
    if not timezone:
        timezone = get_timezone_for_location(
            float(location.latitude),
            float(location.longitude)
        )
    
    tz = pytz.timezone(timezone)
    current_time = datetime.now(tz)
    
    # Placeholder logic - in reality, check against stored hours
    # For now, assume business hours are 9 AM - 5 PM on weekdays
    if current_time.weekday() < 5:  # Monday-Friday
        if 9 <= current_time.hour < 17:
            return True
    
    return False