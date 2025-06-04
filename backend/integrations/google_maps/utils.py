import logging
from decimal import Decimal
from .client import GoogleMapsClient

logger = logging.getLogger(__name__)

def geocode_location(location):
    """
    Geocode a Location model instance to get coordinates and place ID.
    
    Args:
        location: A Location model instance
        
    Returns:
        bool: True if geocoding was successful, False otherwise
    """
    try:
        # Build address from location components
        address_components = {}
        address = ""
        
        if location.address_line1:
            address += location.address_line1
            if location.address_line2:
                address += f", {location.address_line2}"
                
        if location.city:
            address += f", {location.city}"
            address_components['locality'] = location.city
            
        if location.state:
            address += f", {location.state}"
            address_components['administrative_area_level_1'] = location.state
            
        if location.postal_code:
            address += f", {location.postal_code}"
            address_components['postal_code'] = location.postal_code
            
        if location.country:
            address += f", {location.country}"
            address_components['country'] = location.country
            
        # If we don't have enough address components, use the name as a fallback
        if not address and location.name:
            address = location.name
            
        # If we still don't have an address, we can't geocode
        if not address:
            logger.warning(f"Cannot geocode location {location.id}: No address components provided")
            return False
            
        # Call the geocoding API
        result = GoogleMapsClient.geocode(address=address)
        
        if not result.get('results'):
            logger.warning(f"No geocoding results found for address: {address}")
            return False
            
        # Get the first result
        first_result = result['results'][0]
        
        # Update the location with coordinates and place ID
        location.latitude = Decimal(str(first_result['geometry']['location']['lat']))
        location.longitude = Decimal(str(first_result['geometry']['location']['lng']))
        location.place_id = first_result.get('place_id')
        
        # Save the location
        location.save(update_fields=['latitude', 'longitude', 'place_id'])
        
        return True
        
    except Exception as e:
        logger.exception(f"Error geocoding location {location.id}: {str(e)}")
        return False

def get_location_details(place_id):
    """
    Get detailed information about a location using its Google Place ID.
    
    Args:
        place_id (str): Google Place ID
        
    Returns:
        dict: Location details or None if not found
    """
    try:
        fields = [
            'address_component',
            'adr_address',
            'formatted_address',
            'geometry',
            'name',
            'photo',
            'url',
            'utc_offset',
            'vicinity',
            'website',
        ]
        
        result = GoogleMapsClient.get_place_details(place_id, fields=fields)
        
        if not result.get('result'):
            logger.warning(f"No place details found for place_id: {place_id}")
            return None
            
        return result['result']
        
    except Exception as e:
        logger.exception(f"Error getting place details for {place_id}: {str(e)}")
        return None

def find_nearby_locations(latitude, longitude, radius_km=10, location_type=None):
    """
    Find nearby locations based on coordinates.
    
    This is a placeholder function. Google Places API would be needed for this functionality.
    
    Args:
        latitude (float): Latitude
        longitude (float): Longitude
        radius_km (int): Search radius in kilometers
        location_type (str, optional): Type of location to search for
        
    Returns:
        list: Nearby locations
    """
    # This would require the Places API, which is a separate integration
    # For now, return an empty list
    logger.info(f"find_nearby_locations called with ({latitude}, {longitude}, {radius_km}km)")
    return []

def calculate_distance_between_locations(origin_location, destination_location, mode='driving'):
    """
    Calculate the distance and duration between two Location model instances.
    
    Args:
        origin_location: Origin Location model instance
        destination_location: Destination Location model instance
        mode (str): Travel mode (driving, walking, bicycling, transit)
        
    Returns:
        dict: Distance and duration information or None if calculation failed
    """
    try:
        # Ensure both locations have coordinates
        if not (origin_location.latitude and origin_location.longitude and 
                destination_location.latitude and destination_location.longitude):
            logger.warning("Cannot calculate distance: One or both locations missing coordinates")
            return None
            
        # Format coordinates
        origin = f"{origin_location.latitude},{origin_location.longitude}"
        destination = f"{destination_location.latitude},{destination_location.longitude}"
        
        # Call the Distance Matrix API
        result = GoogleMapsClient.calculate_distance(
            origins=[origin],
            destinations=[destination],
            mode=mode
        )
        
        if not result.get('rows') or not result['rows'][0].get('elements'):
            logger.warning(f"No distance results found between locations")
            return None
            
        # Get the first result
        element = result['rows'][0]['elements'][0]
        
        if element.get('status') != 'OK':
            logger.warning(f"Distance calculation failed: {element.get('status')}")
            return None
            
        return {
            'distance': element['distance'],
            'duration': element['duration']
        }
        
    except Exception as e:
        logger.exception(f"Error calculating distance between locations: {str(e)}")
        return None
