import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class DailyAPIClient:
    """
    Client for interacting with the Daily.co API.
    
    This client handles all communication with the Daily.co API,
    including authentication, request formatting, and response parsing.
    """
    BASE_URL = "https://api.daily.co/v1"
    
    @classmethod
    def get_api_key(cls):
        """
        Get the Daily.co API key from settings.
        
        Returns:
            str: The API key
            
        Raises:
            ValueError: If the API key is not configured
        """
        api_key = getattr(settings, 'DAILY_API_KEY', None)
        if not api_key:
            logger.error("Daily.co API key not found in settings")
            raise ValueError("Daily.co API key not found in settings")
        return api_key
    
    @classmethod
    def _make_request(cls, method, endpoint, data=None):
        """
        Make a request to the Daily.co API.
        
        Args:
            method (str): HTTP method (GET, POST, etc.)
            endpoint (str): API endpoint
            data (dict, optional): Request data
            
        Returns:
            dict: The API response data
            
        Raises:
            Exception: If the request fails
        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cls.get_api_key()}"
        }
        
        url = f"{cls.BASE_URL}/{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            if response.status_code not in (200, 201, 204):
                logger.error(f"Daily.co API error: {response.text}")
                raise Exception(f"Daily.co API error: {response.status_code} - {response.text}")
                
            return response.json() if response.content else {}
            
        except requests.RequestException as e:
            logger.exception(f"Request to Daily.co API failed: {str(e)}")
            raise Exception(f"Request to Daily.co API failed: {str(e)}")
    
    @classmethod
    def create_room(cls, room_name, properties=None):
        """
        Create a room via the Daily.co API.
        
        Args:
            room_name (str): Name for the room
            properties (dict, optional): Room properties
            
        Returns:
            dict: The API response data
        """
        data = {
            "name": room_name,
            "properties": properties or {}
        }
        
        return cls._make_request("POST", "rooms", data)
    
    @classmethod
    def get_room(cls, room_name):
        """
        Get information about a room.
        
        Args:
            room_name (str): Name of the room
            
        Returns:
            dict: The API response data
        """
        return cls._make_request("GET", f"rooms/{room_name}")
    
    @classmethod
    def delete_room(cls, room_name):
        """
        Delete a room.
        
        Args:
            room_name (str): Name of the room
            
        Returns:
            dict: The API response data
        """
        return cls._make_request("DELETE", f"rooms/{room_name}")
    
    @classmethod
    def create_meeting_token(cls, room_name, properties=None):
        """
        Create a meeting token via the Daily.co API.
        
        Args:
            room_name (str): Name of the room to create a token for
            properties (dict, optional): Token properties
            
        Returns:
            dict: The API response data
        """
        data = {
            "properties": {
                "room_name": room_name,
                **(properties or {})
            }
        }
        
        return cls._make_request("POST", "meeting-tokens", data)
