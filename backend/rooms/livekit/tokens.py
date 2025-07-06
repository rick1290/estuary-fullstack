"""
LiveKit token generation for room access.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from django.conf import settings
from django.utils import timezone
# Use the same import pattern from the working test script
from livekit.api import AccessToken, VideoGrants
import jwt
import time

logger = logging.getLogger(__name__)


class TokenGenerator:
    """
    Generate access tokens for LiveKit rooms.
    """
    
    def __init__(self):
        self.api_key = getattr(settings, 'LIVEKIT_API_KEY', '')
        self.api_secret = getattr(settings, 'LIVEKIT_API_SECRET', '')
        
        if not self.api_key or not self.api_secret:
            raise ValueError("LiveKit API key and secret must be configured")
    
    def create_token(
        self,
        room_name: str,
        identity: str,
        name: Optional[str] = None,
        metadata: Optional[str] = None,
        permissions: Optional[Dict[str, bool]] = None,
        ttl: int = 3600,  # Default 1 hour
        attributes: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Create a LiveKit access token.
        
        Args:
            room_name: Room to grant access to
            identity: Unique identity for the participant
            name: Display name for the participant
            metadata: Optional metadata string
            permissions: Dictionary of permissions
            ttl: Token time-to-live in seconds
            attributes: Optional participant attributes
            
        Returns:
            JWT access token
        """
        try:
            # Try using the SDK first
            token = AccessToken(self.api_key, self.api_secret)
            token.identity = identity
            
            if name:
                token.name = name
            
            if metadata:
                token.metadata = metadata
            
            # Grant video permissions
            grants = VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True
            )
            
            # Apply custom permissions
            if permissions:
                self._apply_permissions(grants, permissions)
            
            # Set video grants on token
            token.video_grants = grants
            
            # Generate and return token
            jwt_token = token.to_jwt()
            
            # Verify the token has video grants
            decoded = jwt.decode(jwt_token, options={"verify_signature": False})
            if 'video' in decoded:
                logger.info(f"Successfully generated token for {identity} in room {room_name}")
                return jwt_token
            else:
                logger.warning("Token missing video claim, using manual generation")
                raise ValueError("Token missing video claim")
                
        except Exception as e:
            logger.error(f"SDK token generation failed: {e}")
            logger.info("Using manual JWT generation")
        
        # Fallback to manual JWT generation
        return self._create_jwt_manually(room_name, identity, name, permissions, ttl)
    
    def create_host_token(
        self,
        room_name: str,
        identity: str,
        name: Optional[str] = None,
        metadata: Optional[str] = None,
        ttl: int = 7200,  # 2 hours for hosts
        attributes: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Create a token with host permissions.
        
        Args:
            room_name: Room to grant access to
            identity: Unique identity for the host
            name: Display name
            metadata: Optional metadata
            ttl: Token TTL in seconds
            attributes: Optional attributes
            
        Returns:
            JWT access token with host permissions
        """
        permissions = {
            'can_publish': True,
            'can_subscribe': True,
            'can_publish_data': True,
            'can_update_metadata': True,
            'can_publish_sources': ['camera', 'microphone', 'screen_share'],
            'hidden': False,
            'recorder': False,
            'room_create': False,
            'room_admin': True,
            'room_record': True,
            'ingress_admin': False
        }
        
        return self.create_token(
            room_name=room_name,
            identity=identity,
            name=name,
            metadata=metadata,
            permissions=permissions,
            ttl=ttl,
            attributes=attributes
        )
    
    def create_participant_token(
        self,
        room_name: str,
        identity: str,
        name: Optional[str] = None,
        metadata: Optional[str] = None,
        can_publish: bool = True,
        ttl: int = 3600,
        attributes: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Create a token with participant permissions.
        
        Args:
            room_name: Room to grant access to
            identity: Unique identity
            name: Display name
            metadata: Optional metadata
            can_publish: Whether participant can publish
            ttl: Token TTL in seconds
            attributes: Optional attributes
            
        Returns:
            JWT access token with participant permissions
        """
        permissions = {
            'can_publish': can_publish,
            'can_subscribe': True,
            'can_publish_data': True,
            'can_update_metadata': False,
            'can_publish_sources': ['camera', 'microphone'] if can_publish else [],
            'hidden': False,
            'recorder': False,
            'room_create': False,
            'room_admin': False,
            'room_record': False,
            'ingress_admin': False
        }
        
        return self.create_token(
            room_name=room_name,
            identity=identity,
            name=name,
            metadata=metadata,
            permissions=permissions,
            ttl=ttl,
            attributes=attributes
        )
    
    def create_viewer_token(
        self,
        room_name: str,
        identity: str,
        name: Optional[str] = None,
        metadata: Optional[str] = None,
        ttl: int = 3600,
        attributes: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Create a token with viewer-only permissions.
        
        Args:
            room_name: Room to grant access to
            identity: Unique identity
            name: Display name
            metadata: Optional metadata
            ttl: Token TTL in seconds
            attributes: Optional attributes
            
        Returns:
            JWT access token with viewer permissions
        """
        permissions = {
            'can_publish': False,
            'can_subscribe': True,
            'can_publish_data': False,
            'can_update_metadata': False,
            'can_publish_sources': [],
            'hidden': False,
            'recorder': False,
            'room_create': False,
            'room_admin': False,
            'room_record': False,
            'ingress_admin': False
        }
        
        return self.create_token(
            room_name=room_name,
            identity=identity,
            name=name,
            metadata=metadata,
            permissions=permissions,
            ttl=ttl,
            attributes=attributes
        )
    
    def create_recording_token(
        self,
        room_name: str,
        identity: str = "recorder",
        ttl: int = 14400  # 4 hours for recordings
    ) -> str:
        """
        Create a token for recording purposes.
        
        Args:
            room_name: Room to record
            identity: Recorder identity
            ttl: Token TTL in seconds
            
        Returns:
            JWT access token for recording
        """
        permissions = {
            'can_publish': False,
            'can_subscribe': True,
            'can_publish_data': False,
            'can_update_metadata': False,
            'can_publish_sources': [],
            'hidden': True,
            'recorder': True,
            'room_create': False,
            'room_admin': False,
            'room_record': True,
            'ingress_admin': False
        }
        
        return self.create_token(
            room_name=room_name,
            identity=identity,
            permissions=permissions,
            ttl=ttl
        )
    
    def create_sip_token(
        self,
        room_name: str,
        identity: str,
        phone_number: str,
        pin: Optional[str] = None,
        ttl: int = 3600
    ) -> str:
        """
        Create a token for SIP/PSTN participants.
        
        Args:
            room_name: Room to join
            identity: SIP participant identity
            phone_number: Phone number
            pin: Optional PIN
            ttl: Token TTL in seconds
            
        Returns:
            JWT access token for SIP participant
        """
        metadata = {
            'sip': True,
            'phone_number': phone_number
        }
        if pin:
            metadata['pin'] = pin
        
        permissions = {
            'can_publish': True,
            'can_subscribe': True,
            'can_publish_data': False,
            'can_update_metadata': False,
            'can_publish_sources': ['microphone'],
            'hidden': False,
            'recorder': False,
            'room_create': False,
            'room_admin': False,
            'room_record': False,
            'ingress_admin': False
        }
        
        return self.create_token(
            room_name=room_name,
            identity=identity,
            name=f"Phone: {phone_number[-4:]}",
            metadata=str(metadata),
            permissions=permissions,
            ttl=ttl
        )
    
    def _apply_permissions(self, grant: VideoGrants, permissions: Dict[str, bool]):
        """
        Apply permissions to a video grant.
        
        Args:
            grant: VideoGrants object
            permissions: Dictionary of permissions
        """
        # Basic permissions
        if 'can_publish' in permissions:
            grant.can_publish = permissions['can_publish']
        if 'can_subscribe' in permissions:
            grant.can_subscribe = permissions['can_subscribe']
        if 'can_publish_data' in permissions:
            grant.can_publish_data = permissions['can_publish_data']
        if 'can_update_metadata' in permissions:
            grant.can_update_metadata = permissions['can_update_metadata']
        
        # Advanced permissions
        if 'can_publish_sources' in permissions:
            grant.can_publish_sources = permissions['can_publish_sources']
        if 'hidden' in permissions:
            grant.hidden = permissions['hidden']
        if 'recorder' in permissions:
            grant.recorder = permissions['recorder']
        if 'room_create' in permissions:
            grant.room_create = permissions['room_create']
        if 'room_admin' in permissions:
            grant.room_admin = permissions['room_admin']
        if 'room_record' in permissions:
            grant.room_record = permissions['room_record']
        if 'ingress_admin' in permissions:
            grant.ingress_admin = permissions['ingress_admin']
    
    def _create_jwt_manually(
        self,
        room_name: str,
        identity: str,
        name: Optional[str] = None,
        permissions: Optional[Dict[str, bool]] = None,
        ttl: int = 3600
    ) -> str:
        """
        Manually create JWT token as a fallback if SDK fails.
        """
        now = int(time.time())
        
        # Base claims
        payload = {
            "iss": self.api_key,
            "sub": identity,
            "iat": now,
            "nbf": now,
            "exp": now + ttl,
        }
        
        # Add name if provided
        if name:
            payload["name"] = name
        
        # Default permissions
        video_grants = {
            "room": room_name,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True,
        }
        
        # Apply custom permissions if provided
        if permissions:
            if 'can_publish' in permissions:
                video_grants['canPublish'] = permissions['can_publish']
            if 'can_subscribe' in permissions:
                video_grants['canSubscribe'] = permissions['can_subscribe']
            if 'can_publish_data' in permissions:
                video_grants['canPublishData'] = permissions['can_publish_data']
            if 'hidden' in permissions:
                video_grants['hidden'] = permissions['hidden']
            if 'recorder' in permissions:
                video_grants['recorder'] = permissions['recorder']
        
        # Add video grants to payload
        payload["video"] = video_grants
        
        # Generate JWT
        return jwt.encode(payload, self.api_secret, algorithm="HS256")
    
    def decode_token(self, token: str) -> Dict:
        """
        Decode a LiveKit token for debugging.
        
        Args:
            token: JWT token
            
        Returns:
            Decoded token payload
        """
        try:
            # Decode without verification for debugging
            return jwt.decode(token, options={"verify_signature": False})
        except Exception as e:
            logger.error(f"Failed to decode token: {e}")
            return {}
    
    def validate_token(self, token: str) -> bool:
        """
        Validate a LiveKit token.
        
        Args:
            token: JWT token
            
        Returns:
            True if valid
        """
        try:
            # Decode and verify signature
            jwt.decode(token, self.api_secret, algorithms=["HS256"])
            return True
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return False
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return False


# Singleton instance
_generator = None


def get_token_generator() -> TokenGenerator:
    """
    Get or create token generator singleton.
    
    Returns:
        TokenGenerator instance
    """
    global _generator
    if _generator is None:
        _generator = TokenGenerator()
    return _generator


# Convenience functions

def create_room_token(
    room: 'Room',
    user: 'User',
    role: str = 'participant',
    ttl: int = 3600
) -> str:
    """
    Create a token for a room and user.
    
    Args:
        room: Room model instance
        user: User model instance
        role: User role (host, participant, viewer)
        ttl: Token TTL in seconds
        
    Returns:
        JWT access token
    """
    generator = get_token_generator()
    
    identity = f"{user.id}-{user.get_full_name().replace(' ', '-')}"
    name = user.get_full_name()
    
    metadata = {
        'user_id': str(user.id),
        'room_id': str(room.id),
        'room_type': room.room_type
    }
    
    if room.booking:
        metadata['booking_id'] = str(room.booking.id)
    elif room.service_session:
        metadata['session_id'] = str(room.service_session.id)
    
    if role == 'host':
        return generator.create_host_token(
            room_name=room.livekit_room_name,
            identity=identity,
            name=name,
            metadata=str(metadata),
            ttl=ttl
        )
    elif role == 'viewer':
        return generator.create_viewer_token(
            room_name=room.livekit_room_name,
            identity=identity,
            name=name,
            metadata=str(metadata),
            ttl=ttl
        )
    else:
        return generator.create_participant_token(
            room_name=room.livekit_room_name,
            identity=identity,
            name=name,
            metadata=str(metadata),
            ttl=ttl
        )


def generate_room_token(
    room_name: str,
    participant_name: str,
    participant_identity: str,
    is_host: bool = False,
    ttl: int = 3600
) -> Dict[str, str]:
    """
    Generate a room token with URL.
    
    Args:
        room_name: LiveKit room name
        participant_name: Display name
        participant_identity: Unique identity
        is_host: Whether this is a host token
        ttl: Token TTL in seconds
        
    Returns:
        Dictionary with token and URL
    """
    generator = get_token_generator()
    
    if is_host:
        token = generator.create_host_token(
            room_name=room_name,
            identity=participant_identity,
            name=participant_name,
            ttl=ttl
        )
    else:
        token = generator.create_participant_token(
            room_name=room_name,
            identity=participant_identity,
            name=participant_name,
            ttl=ttl
        )
    
    # Generate join URL
    livekit_url = getattr(settings, 'LIVEKIT_URL', 'wss://localhost:7880')
    url = f"{livekit_url}?token={token}"
    
    return {
        'token': token,
        'url': url
    }