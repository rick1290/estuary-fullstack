"""
LiveKit API client wrapper for Django integration.
"""
import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
import httpx
from livekit import api
from livekit.api import VideoGrants, AccessToken

logger = logging.getLogger(__name__)


class LiveKitClient:
    """
    Client wrapper for LiveKit API operations.
    """
    
    def __init__(self):
        self.api_key = getattr(settings, 'LIVEKIT_API_KEY', os.environ.get('LIVEKIT_API_KEY'))
        self.api_secret = getattr(settings, 'LIVEKIT_API_SECRET', os.environ.get('LIVEKIT_API_SECRET'))
        self.server_url = getattr(settings, 'LIVEKIT_SERVER_URL', os.environ.get('LIVEKIT_SERVER_URL', 'http://localhost:7880'))
        
        if not self.api_key or not self.api_secret:
            raise ValueError("LiveKit API key and secret must be configured")
        
        # Initialize API client
        self.room_service = api.RoomServiceClient(
            self.server_url,
            self.api_key,
            self.api_secret
        )
        
        self.egress_service = api.EgressServiceClient(
            self.server_url,
            self.api_key,
            self.api_secret
        )
    
    # Room Management
    
    async def create_room(
        self,
        name: str,
        empty_timeout: int = 300,
        max_participants: int = 100,
        metadata: Optional[Dict] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a new LiveKit room.
        
        Args:
            name: Unique room name
            empty_timeout: Seconds to keep room alive when empty
            max_participants: Maximum number of participants
            metadata: Optional metadata dictionary
            **kwargs: Additional room options
            
        Returns:
            Created room object
        """
        try:
            room = await self.room_service.create_room(
                api.CreateRoomRequest(
                    name=name,
                    empty_timeout=empty_timeout,
                    max_participants=max_participants,
                    metadata=str(metadata) if metadata else "",
                    **kwargs
                )
            )
            logger.info(f"Created LiveKit room: {name}")
            return room
        except Exception as e:
            logger.error(f"Failed to create LiveKit room {name}: {e}")
            raise
    
    async def get_room(self, room_name: str) -> Optional[Dict[str, Any]]:
        """
        Get room details by name.
        
        Args:
            room_name: Room name
            
        Returns:
            Room object or None if not found
        """
        try:
            rooms = await self.room_service.list_rooms(api.ListRoomsRequest(names=[room_name]))
            return rooms.rooms[0] if rooms.rooms else None
        except Exception as e:
            logger.error(f"Failed to get room {room_name}: {e}")
            return None
    
    async def list_rooms(self) -> List[Dict[str, Any]]:
        """
        List all active rooms.
        
        Returns:
            List of room objects
        """
        try:
            response = await self.room_service.list_rooms(api.ListRoomsRequest())
            return list(response.rooms)
        except Exception as e:
            logger.error(f"Failed to list rooms: {e}")
            return []
    
    async def update_room_metadata(
        self,
        room_name: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update room metadata.
        
        Args:
            room_name: Room name
            metadata: New metadata dictionary
            
        Returns:
            Updated room object
        """
        try:
            return await self.room_service.update_room_metadata(
                api.UpdateRoomMetadataRequest(
                    room=room_name,
                    metadata=str(metadata)
                )
            )
        except Exception as e:
            logger.error(f"Failed to update room metadata for {room_name}: {e}")
            raise
    
    async def delete_room(self, room_name: str) -> bool:
        """
        Delete a room.
        
        Args:
            room_name: Room name
            
        Returns:
            True if successful
        """
        try:
            await self.room_service.delete_room(api.DeleteRoomRequest(room=room_name))
            logger.info(f"Deleted LiveKit room: {room_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete room {room_name}: {e}")
            return False
    
    # Participant Management
    
    async def list_participants(self, room_name: str) -> List[Dict[str, Any]]:
        """
        List all participants in a room.
        
        Args:
            room_name: Room name
            
        Returns:
            List of participant info objects
        """
        try:
            response = await self.room_service.list_participants(
                api.ListParticipantsRequest(room=room_name)
            )
            return list(response.participants)
        except Exception as e:
            logger.error(f"Failed to list participants for room {room_name}: {e}")
            return []
    
    async def get_participant(
        self,
        room_name: str,
        identity: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get participant info by identity.
        
        Args:
            room_name: Room name
            identity: Participant identity
            
        Returns:
            Participant info or None
        """
        try:
            response = await self.room_service.get_participant(
                api.RoomParticipantIdentity(room=room_name, identity=identity)
            )
            return response
        except Exception as e:
            logger.error(f"Failed to get participant {identity} in room {room_name}: {e}")
            return None
    
    async def remove_participant(
        self,
        room_name: str,
        identity: str
    ) -> bool:
        """
        Remove a participant from a room.
        
        Args:
            room_name: Room name
            identity: Participant identity
            
        Returns:
            True if successful
        """
        try:
            await self.room_service.remove_participant(
                api.RoomParticipantIdentity(room=room_name, identity=identity)
            )
            logger.info(f"Removed participant {identity} from room {room_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove participant {identity} from room {room_name}: {e}")
            return False
    
    async def mute_published_track(
        self,
        room_name: str,
        identity: str,
        track_sid: str,
        muted: bool
    ) -> Dict[str, Any]:
        """
        Mute or unmute a participant's track.
        
        Args:
            room_name: Room name
            identity: Participant identity
            track_sid: Track SID
            muted: Whether to mute
            
        Returns:
            Updated track info
        """
        try:
            return await self.room_service.mute_published_track(
                api.MuteRoomTrackRequest(
                    room=room_name,
                    identity=identity,
                    track_sid=track_sid,
                    muted=muted
                )
            )
        except Exception as e:
            logger.error(f"Failed to mute track {track_sid} for {identity} in room {room_name}: {e}")
            raise
    
    async def update_participant_permissions(
        self,
        room_name: str,
        identity: str,
        permissions: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Update participant permissions.
        
        Args:
            room_name: Room name
            identity: Participant identity
            permissions: Dictionary of permissions
            
        Returns:
            Updated participant info
        """
        try:
            permission = permissions
            return await self.room_service.update_participant(
                api.UpdateParticipantRequest(
                    room=room_name,
                    identity=identity,
                    permission=permission
                )
            )
        except Exception as e:
            logger.error(f"Failed to update permissions for {identity} in room {room_name}: {e}")
            raise
    
    # Recording Management
    
    async def start_room_recording(
        self,
        room_name: str,
        output_filepath: str,
        audio_only: bool = False,
        video_codec: str = "h264",
        preset: str = "HD_30"
    ) -> Dict[str, Any]:
        """
        Start recording a room.
        
        Args:
            room_name: Room name
            output_filepath: S3/GCS/Azure path for output
            audio_only: Whether to record audio only
            video_codec: Video codec to use
            preset: Recording preset
            
        Returns:
            Egress info object
        """
        try:
            request = api.RoomCompositeEgressRequest(
                room_name=room_name,
                audio_only=audio_only,
                video_codec=video_codec,
                preset=preset
            )
            
            # Configure file output
            request.file_outputs.append(
                {"filepath": output_filepath}
            )
            
            response = await self.egress_service.start_room_composite_egress(request)
            logger.info(f"Started recording for room {room_name}, egress ID: {response.egress_id}")
            return response
        except Exception as e:
            logger.error(f"Failed to start recording for room {room_name}: {e}")
            raise
    
    async def stop_egress(self, egress_id: str) -> Dict[str, Any]:
        """
        Stop an egress (recording/streaming).
        
        Args:
            egress_id: Egress ID
            
        Returns:
            Final egress info
        """
        try:
            response = await self.egress_service.stop_egress(
                api.StopEgressRequest(egress_id=egress_id)
            )
            logger.info(f"Stopped egress {egress_id}")
            return response
        except Exception as e:
            logger.error(f"Failed to stop egress {egress_id}: {e}")
            raise
    
    async def list_egress(
        self,
        room_name: Optional[str] = None,
        active_only: bool = False
    ) -> List[Dict[str, Any]]:
        """
        List egress instances.
        
        Args:
            room_name: Optional room name filter
            active_only: Only list active egresses
            
        Returns:
            List of egress info objects
        """
        try:
            request = api.ListEgressRequest()
            if room_name:
                request.room_name = room_name
            if active_only:
                request.active = True
                
            response = await self.egress_service.list_egress(request)
            return list(response.items)
        except Exception as e:
            logger.error(f"Failed to list egress: {e}")
            return []
    
    # SIP/PSTN Management
    
    async def create_sip_participant(
        self,
        room_name: str,
        sip_trunk_id: str,
        phone_number: str,
        participant_identity: Optional[str] = None,
        participant_name: Optional[str] = None,
        pin: Optional[str] = None
    ) -> str:
        """
        Create a SIP participant (dial-out).
        
        Args:
            room_name: Room name
            sip_trunk_id: SIP trunk ID
            phone_number: Phone number to dial
            participant_identity: Optional identity
            participant_name: Optional display name
            pin: Optional PIN for verification
            
        Returns:
            SIP call ID
        """
        try:
            # This would use the SIP API when available
            # For now, this is a placeholder
            logger.info(f"Creating SIP participant for room {room_name}, dialing {phone_number}")
            return f"sip-{room_name}-{phone_number}"
        except Exception as e:
            logger.error(f"Failed to create SIP participant: {e}")
            raise
    
    # Data Messages
    
    async def send_data(
        self,
        room_name: str,
        data: bytes,
        topic: Optional[str] = None,
        destination_identities: Optional[List[str]] = None,
        reliable: bool = True
    ) -> None:
        """
        Send data message to room participants.
        
        Args:
            room_name: Room name
            data: Data bytes to send
            topic: Optional topic
            destination_identities: Optional list of recipient identities
            reliable: Whether to send reliably
        """
        try:
            request = api.SendDataRequest(
                room=room_name,
                data=data,
                reliable=reliable
            )
            
            if topic:
                request.topic = topic
            
            if destination_identities:
                request.destination_identities.extend(destination_identities)
            
            await self.room_service.send_data(request)
            logger.info(f"Sent data message to room {room_name}")
        except Exception as e:
            logger.error(f"Failed to send data to room {room_name}: {e}")
            raise
    
    # Utility Methods
    
    def get_webhook_receiver(self):
        """
        Get webhook receiver for handling LiveKit webhooks.
        
        Returns:
            WebhookReceiver instance
        """
        return api.WebhookReceiver(self.api_key, self.api_secret)
    
    async def health_check(self) -> bool:
        """
        Check if LiveKit server is healthy.
        
        Returns:
            True if healthy
        """
        try:
            # Try to list rooms as a health check
            await self.room_service.list_rooms(api.ListRoomsRequest())
            return True
        except Exception as e:
            logger.error(f"LiveKit health check failed: {e}")
            return False


# Singleton instance
_client = None


def get_livekit_client() -> LiveKitClient:
    """
    Get or create LiveKit client singleton.
    
    Returns:
        LiveKitClient instance
    """
    global _client
    if _client is None:
        _client = LiveKitClient()
    return _client