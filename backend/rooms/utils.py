import uuid
import requests
import logging
from django.conf import settings
from django.utils import timezone
from .models import Room, VideoToken

logger = logging.getLogger(__name__)

# Daily.co API client
class DailyAPIClient:
    """
    Client for interacting with the Daily.co API.
    """
    BASE_URL = "https://api.daily.co/v1"
    
    @classmethod
    def get_api_key(cls):
        """Get the Daily.co API key from settings."""
        api_key = getattr(settings, 'DAILY_API_KEY', None)
        if not api_key:
            logger.error("Daily.co API key not found in settings")
            raise ValueError("Daily.co API key not found in settings")
        return api_key
    
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
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cls.get_api_key()}"
        }
        
        data = {
            "name": room_name,
            "properties": properties or {}
        }
        
        response = requests.post(
            f"{cls.BASE_URL}/rooms",
            json=data,
            headers=headers
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to create Daily.co room: {response.text}")
            raise Exception(f"Failed to create Daily.co room: {response.status_code}")
            
        return response.json()
    
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
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {cls.get_api_key()}"
        }
        
        data = {
            "properties": {
                "room_name": room_name,
                **(properties or {})
            }
        }
        
        response = requests.post(
            f"{cls.BASE_URL}/meeting-tokens",
            json=data,
            headers=headers
        )
        
        if response.status_code != 200:
            logger.error(f"Failed to create Daily.co token: {response.text}")
            raise Exception(f"Failed to create Daily.co token: {response.status_code}")
            
        return response.json()


# Room management functions
def create_daily_room(room_name=None, exp=None, metadata=None):
    """
    Create a Daily.co room and save it to the database.
    
    Args:
        room_name (str, optional): Name for the room. If not provided, a UUID will be generated.
        exp (int, optional): Expiration time in seconds from now. If not provided, room won't expire.
        metadata (dict, optional): Additional metadata for the room.
        
    Returns:
        Room: The created Room object
    """
    try:
        # Generate room name if not provided
        if not room_name:
            room_name = f"room-{uuid.uuid4()}"
            
        # Set up room properties
        properties = {
            "start_audio_off": True,
            "start_video_off": False,
            "enable_chat": True,
            "enable_knocking": True,
            "enable_screenshare": True,
            "enable_recording": "cloud",
        }
        
        # Add expiration if provided
        if exp:
            properties["exp"] = int(timezone.now().timestamp()) + exp
            
        # Add metadata if provided
        if metadata:
            properties["metadata"] = metadata
            
        # Create room via API
        room_data = DailyAPIClient.create_room(room_name, properties)
        
        # Create Room object
        room = Room.objects.create(
            id=uuid.uuid4(),
            daily_room_name=room_data["name"],
            daily_room_url=room_data["url"],
            status="active",
            created_at=timezone.now(),
            metadata=metadata or {}
        )
        
        return room
        
    except Exception as e:
        logger.exception(f"Error creating Daily.co room: {str(e)}")
        raise

def create_daily_token(room, user, exp=86400, owner=False):
    """
    Create a Daily.co token for a user to join a room.
    
    Args:
        room (Room): The Room object
        user (User): The User object
        exp (int, optional): Token expiration in seconds. Default is 24 hours.
        owner (bool, optional): Whether the user is the room owner. Default is False.
        
    Returns:
        str: The generated token
    """
    try:
        # Set up token properties
        properties = {
            "room_name": room.daily_room_name,
            "user_name": f"{user.first_name} {user.last_name}".strip() or user.email,
            "user_id": str(user.id),
            "exp": int(timezone.now().timestamp()) + exp
        }
        
        # Add owner property if needed
        if owner:
            properties["is_owner"] = True
            
        # Create token via API
        token_data = DailyAPIClient.create_meeting_token(room.daily_room_name, properties)
        
        # Create VideoToken object
        video_token = VideoToken.objects.create(
            user=user,
            room=room,
            token=token_data["token"],
            role="owner" if owner else "participant",
            permissions={"is_owner": owner},
            expires_at=timezone.now() + timezone.timedelta(seconds=exp),
            is_used=False,
            is_revoked=False
        )
        
        return token_data["token"]
        
    except Exception as e:
        logger.exception(f"Error creating Daily.co token: {str(e)}")
        raise
