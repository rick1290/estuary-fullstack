import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class GoogleMapsClient:
    """
    Client for interacting with Google Maps APIs.
    
    This client handles geocoding, place details, and other Google Maps
    services needed by the backend.
    """
    GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
    DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
    
    @classmethod
    def get_api_key(cls):
        """
        Get the Google Maps API key from settings.
        
        Returns:
            str: The API key
            
        Raises:
            ValueError: If the API key is not configured
        """
        api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
        if not api_key:
            logger.error("Google Maps API key not found in settings")
            raise ValueError("Google Maps API key not found in settings")
        return api_key
    
    @classmethod
    def _make_request(cls, url, params):
        """
        Make a request to a Google Maps API.
        
        Args:
            url (str): API endpoint URL
            params (dict): Request parameters
            
        Returns:
            dict: The API response data
            
        Raises:
            Exception: If the request fails
        """
        # Add API key to parameters
        params['key'] = cls.get_api_key()
        
        try:
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') != 'OK':
                logger.error(f"Google Maps API error: {data.get('status')} - {data.get('error_message', 'No error message')}")
                if data.get('status') == 'ZERO_RESULTS':
                    return {'results': []}
                raise Exception(f"Google Maps API error: {data.get('status')}")
                
            return data
            
        except requests.RequestException as e:
            logger.exception(f"Request to Google Maps API failed: {str(e)}")
            raise Exception(f"Request to Google Maps API failed: {str(e)}")
    
    @classmethod
    def geocode(cls, address=None, components=None, bounds=None, region=None):
        """
        Geocode an address to get coordinates and place information.
        
        Args:
            address (str, optional): The address to geocode
            components (dict, optional): Address components (country, postal_code, etc.)
            bounds (str, optional): Viewport bias in format "lat1,lng1|lat2,lng2"
            region (str, optional): Region bias (e.g., "us")
            
        Returns:
            dict: Geocoding results
        """
        params = {}
        
        if address:
            params['address'] = address
            
        if components:
            # Format components as required by Google: component:value|component:value
            components_str = '|'.join([f"{k}:{v}" for k, v in components.items()])
            params['components'] = components_str
            
        if bounds:
            params['bounds'] = bounds
            
        if region:
            params['region'] = region
            
        if not params:
            raise ValueError("At least one of address or components must be provided")
            
        return cls._make_request(cls.GEOCODING_URL, params)
    
    @classmethod
    def reverse_geocode(cls, lat, lng, result_type=None, location_type=None):
        """
        Reverse geocode coordinates to get address information.
        
        Args:
            lat (float): Latitude
            lng (float): Longitude
            result_type (str, optional): Filter results by type (e.g., "street_address")
            location_type (str, optional): Filter by location type (e.g., "ROOFTOP")
            
        Returns:
            dict: Reverse geocoding results
        """
        params = {
            'latlng': f"{lat},{lng}"
        }
        
        if result_type:
            params['result_type'] = result_type
            
        if location_type:
            params['location_type'] = location_type
            
        return cls._make_request(cls.GEOCODING_URL, params)
    
    @classmethod
    def get_place_details(cls, place_id, fields=None):
        """
        Get details about a place using its place_id.
        
        Args:
            place_id (str): The Google Place ID
            fields (list, optional): List of fields to include in the response
            
        Returns:
            dict: Place details
        """
        params = {
            'place_id': place_id
        }
        
        if fields:
            params['fields'] = ','.join(fields)
            
        return cls._make_request(cls.PLACE_DETAILS_URL, params)
    
    @classmethod
    def calculate_distance(cls, origins, destinations, mode='driving', units='metric'):
        """
        Calculate distance and duration between origins and destinations.
        
        Args:
            origins (list): List of origin addresses or coordinates
            destinations (list): List of destination addresses or coordinates
            mode (str, optional): Travel mode (driving, walking, bicycling, transit)
            units (str, optional): Unit system (metric, imperial)
            
        Returns:
            dict: Distance matrix results
        """
        params = {
            'origins': '|'.join(origins) if isinstance(origins, list) else origins,
            'destinations': '|'.join(destinations) if isinstance(destinations, list) else destinations,
            'mode': mode,
            'units': units
        }
        
        return cls._make_request(cls.DISTANCE_MATRIX_URL, params)
