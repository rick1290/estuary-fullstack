"""
LiveKit SIP/PSTN integration for dial-in functionality.
"""
import logging
from typing import Dict, List, Optional, Tuple
from django.conf import settings
from django.db import models
from rooms.models import Room, RoomParticipant
from rooms.livekit.client import get_livekit_client
from rooms.livekit.tokens import get_token_generator

logger = logging.getLogger(__name__)


class SIPManager:
    """
    Manager for SIP/PSTN integration with LiveKit.
    """
    
    def __init__(self):
        self.client = get_livekit_client()
        self.token_generator = get_token_generator()
        
        # SIP configuration from settings
        self.sip_enabled = getattr(settings, 'LIVEKIT_SIP_ENABLED', False)
        self.sip_trunk_id = getattr(settings, 'LIVEKIT_SIP_TRUNK_ID', '')
        self.sip_dispatch_rule_id = getattr(settings, 'LIVEKIT_SIP_DISPATCH_RULE_ID', '')
        self.dial_in_numbers = getattr(settings, 'LIVEKIT_DIAL_IN_NUMBERS', {})
        
    def is_sip_enabled(self) -> bool:
        """Check if SIP is enabled and configured."""
        return self.sip_enabled and self.sip_trunk_id
    
    def get_dial_in_info(self, room: Room) -> Dict[str, str]:
        """
        Get dial-in information for a room.
        
        Args:
            room: Room model instance
            
        Returns:
            Dictionary with dial-in details
        """
        if not room.sip_enabled or not room.dial_in_pin:
            return {}
        
        # Get appropriate dial-in number based on region
        dial_in_number = self._get_regional_number(room)
        
        return {
            'enabled': True,
            'number': dial_in_number,
            'pin': room.dial_in_pin,
            'instructions': self._get_dial_in_instructions(dial_in_number, room.dial_in_pin)
        }
    
    def _get_regional_number(self, room: Room) -> str:
        """
        Get appropriate dial-in number based on room location.
        
        Args:
            room: Room model instance
            
        Returns:
            Phone number string
        """
        # Default to US number
        default_region = 'US'
        
        # Try to determine region from room metadata or booking location
        region = default_region
        if room.booking and room.booking.location:
            # Map country to region
            country = room.booking.location.country_code
            region = self._map_country_to_region(country)
        
        # Get number for region
        if region in self.dial_in_numbers:
            return self.dial_in_numbers[region]
        
        # Fallback to default
        return self.dial_in_numbers.get(default_region, '')
    
    def _map_country_to_region(self, country_code: str) -> str:
        """
        Map country code to dial-in region.
        
        Args:
            country_code: ISO country code
            
        Returns:
            Region identifier
        """
        # Simple mapping - expand as needed
        region_map = {
            'US': 'US',
            'CA': 'US',  # Use US number for Canada
            'GB': 'UK',
            'UK': 'UK',
            'AU': 'AU',
            'NZ': 'AU',  # Use AU number for NZ
            'DE': 'EU',
            'FR': 'EU',
            'ES': 'EU',
            'IT': 'EU',
            'NL': 'EU',
            'BE': 'EU',
        }
        
        return region_map.get(country_code, 'US')
    
    def _get_dial_in_instructions(self, number: str, pin: str) -> str:
        """
        Generate dial-in instructions.
        
        Args:
            number: Phone number
            pin: Room PIN
            
        Returns:
            Instructions text
        """
        return f"""To join by phone:
1. Dial {number}
2. When prompted, enter PIN: {pin}#
3. Press # to join the session

Note: Standard calling rates may apply."""
    
    async def create_dial_out_participant(
        self,
        room: Room,
        phone_number: str,
        participant_name: Optional[str] = None
    ) -> Tuple[bool, str]:
        """
        Create a dial-out to a phone number.
        
        Args:
            room: Room to dial into
            phone_number: Phone number to call
            participant_name: Optional name for participant
            
        Returns:
            Tuple of (success, message/call_id)
        """
        if not self.is_sip_enabled():
            return False, "SIP is not enabled"
        
        if not room.sip_enabled:
            return False, "SIP is not enabled for this room"
        
        try:
            # Generate identity for SIP participant
            identity = f"sip-{phone_number.replace('+', '')}"
            
            # Create SIP participant
            call_id = await self.client.create_sip_participant(
                room_name=room.livekit_room_name,
                sip_trunk_id=self.sip_trunk_id,
                phone_number=phone_number,
                participant_identity=identity,
                participant_name=participant_name or f"Phone: {phone_number[-4:]}",
                pin=room.dial_in_pin
            )
            
            logger.info(f"Created dial-out to {phone_number} for room {room.name}")
            return True, call_id
            
        except Exception as e:
            logger.error(f"Failed to create dial-out: {e}")
            return False, str(e)
    
    def verify_pin(self, room_name: str, pin: str) -> Optional[Room]:
        """
        Verify a PIN for room access.
        
        Args:
            room_name: LiveKit room name
            pin: PIN to verify
            
        Returns:
            Room instance if valid, None otherwise
        """
        try:
            room = Room.objects.get(
                livekit_room_name=room_name,
                dial_in_pin=pin,
                sip_enabled=True,
                status__in=['active', 'in_use']
            )
            return room
        except Room.DoesNotExist:
            return None
    
    def create_sip_dispatch_rule(
        self,
        rule_name: str,
        trunk_id: str,
        host_pattern: str,
        pin_pattern: str = r'\d{6}'
    ) -> Dict[str, str]:
        """
        Create a SIP dispatch rule for routing calls.
        
        Args:
            rule_name: Rule name
            trunk_id: SIP trunk ID
            host_pattern: Host pattern for matching
            pin_pattern: PIN pattern regex
            
        Returns:
            Rule configuration
        """
        # This would integrate with LiveKit's SIP API
        # For now, return a configuration template
        return {
            'name': rule_name,
            'trunk_id': trunk_id,
            'host_pattern': host_pattern,
            'pin_pattern': pin_pattern,
            'room_prefix': 'sip-',
            'participant_prefix': 'phone-'
        }
    
    def get_sip_statistics(self, room: Room) -> Dict[str, int]:
        """
        Get SIP participant statistics for a room.
        
        Args:
            room: Room instance
            
        Returns:
            Statistics dictionary
        """
        sip_participants = room.participants.filter(is_dial_in=True)
        
        return {
            'total_dial_ins': sip_participants.count(),
            'active_dial_ins': sip_participants.filter(left_at__isnull=True).count(),
            'completed_dial_ins': sip_participants.filter(left_at__isnull=False).count(),
            'average_duration': sip_participants.filter(
                duration_seconds__gt=0
            ).aggregate(
                avg_duration=models.Avg('duration_seconds')
            )['avg_duration'] or 0
        }


# Singleton instance
_sip_manager = None


def get_sip_manager() -> SIPManager:
    """
    Get or create SIP manager singleton.
    
    Returns:
        SIPManager instance
    """
    global _sip_manager
    if _sip_manager is None:
        _sip_manager = SIPManager()
    return _sip_manager


# Convenience functions

def enable_sip_for_room(room: Room) -> bool:
    """
    Enable SIP for a room and generate PIN.
    
    Args:
        room: Room instance
        
    Returns:
        True if successful
    """
    manager = get_sip_manager()
    
    if not manager.is_sip_enabled():
        logger.warning("SIP is not enabled in settings")
        return False
    
    if not room.sip_enabled:
        room.sip_enabled = True
        room.save(update_fields=['sip_enabled', 'dial_in_pin', 'updated_at'])
    
    return True


def get_room_dial_in_info(room: Room) -> Dict[str, str]:
    """
    Get dial-in information for a room.
    
    Args:
        room: Room instance
        
    Returns:
        Dial-in information dictionary
    """
    manager = get_sip_manager()
    return manager.get_dial_in_info(room)