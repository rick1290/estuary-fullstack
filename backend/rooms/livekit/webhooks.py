"""
LiveKit webhook handlers for room events.
"""
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.db import transaction
from livekit import api
from livekit.protocol import webhook as webhook_pb2

from rooms.models import Room, RoomParticipant, RoomRecording
from rooms.livekit.client import get_livekit_client

logger = logging.getLogger(__name__)


class LiveKitWebhookHandler:
    """
    Handler for LiveKit webhook events.
    """
    
    def __init__(self):
        self.client = get_livekit_client()
        self.webhook_receiver = self.client.get_webhook_receiver()
    
    def verify_webhook(self, body: bytes, auth_header: str) -> Optional[webhook_pb2.WebhookEvent]:
        """
        Verify webhook signature and parse event.
        
        Args:
            body: Raw request body
            auth_header: Authorization header value
            
        Returns:
            Parsed webhook event or None if invalid
        """
        try:
            event = self.webhook_receiver.receive(body, auth_header)
            return event
        except Exception as e:
            logger.error(f"Failed to verify webhook: {e}")
            return None
    
    @transaction.atomic
    def handle_event(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """
        Handle a verified webhook event.
        
        Args:
            event: Webhook event
            
        Returns:
            Response data
        """
        event_type = event.event
        logger.info(f"Handling LiveKit webhook event: {event_type}")
        
        # Room events
        if event_type == "room_started":
            return self._handle_room_started(event)
        elif event_type == "room_finished":
            return self._handle_room_finished(event)
        
        # Participant events
        elif event_type == "participant_joined":
            return self._handle_participant_joined(event)
        elif event_type == "participant_left":
            return self._handle_participant_left(event)
        
        # Track events
        elif event_type == "track_published":
            return self._handle_track_published(event)
        elif event_type == "track_unpublished":
            return self._handle_track_unpublished(event)
        
        # Recording events
        elif event_type == "egress_started":
            return self._handle_egress_started(event)
        elif event_type == "egress_updated":
            return self._handle_egress_updated(event)
        elif event_type == "egress_ended":
            return self._handle_egress_ended(event)
        
        # SIP events
        elif event_type == "sip_participant_connected":
            return self._handle_sip_participant_connected(event)
        
        else:
            logger.warning(f"Unhandled webhook event type: {event_type}")
            return {"status": "unhandled", "event": event_type}
    
    def _handle_room_started(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle room started event."""
        room_info = event.room
        
        try:
            room = Room.objects.get(livekit_room_name=room_info.name)
            room.status = 'active'
            room.livekit_room_sid = room_info.sid
            room.actual_start = timezone.now()
            room.save(update_fields=['status', 'livekit_room_sid', 'actual_start', 'updated_at'])
            
            logger.info(f"Room {room.name} started")
            return {"status": "success", "room_id": str(room.id)}
            
        except Room.DoesNotExist:
            logger.error(f"Room not found for LiveKit room: {room_info.name}")
            return {"status": "error", "message": "Room not found"}
    
    def _handle_room_finished(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle room finished event."""
        room_info = event.room
        
        try:
            room = Room.objects.get(livekit_room_name=room_info.name)
            room.status = 'ended'
            room.actual_end = timezone.now()
            
            # Calculate total duration
            if room.actual_start:
                room.total_duration_seconds = int(
                    (room.actual_end - room.actual_start).total_seconds()
                )
            
            room.save(update_fields=['status', 'actual_end', 'total_duration_seconds', 'updated_at'])
            
            # Update booking status if applicable
            if room.booking:
                room.booking.status = 'completed'
                room.booking.actual_end_time = timezone.now()
                room.booking.save(update_fields=['status', 'actual_end_time'])
            
            # End all active participant sessions
            active_participants = room.participants.filter(left_at__isnull=True)
            for participant in active_participants:
                participant.left_at = timezone.now()
                participant.save(update_fields=['left_at'])
            
            # Schedule analytics update
            from rooms.tasks import update_room_analytics
            update_room_analytics.delay(room.id)
            
            logger.info(f"Room {room.name} finished")
            return {"status": "success", "room_id": str(room.id)}
            
        except Room.DoesNotExist:
            logger.error(f"Room not found for LiveKit room: {room_info.name}")
            return {"status": "error", "message": "Room not found"}
    
    def _handle_participant_joined(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle participant joined event."""
        participant_info = event.participant
        room_info = event.room
        
        try:
            room = Room.objects.get(livekit_room_name=room_info.name)
            
            # Extract user ID from identity
            user_id = None
            if '-' in participant_info.identity:
                user_id_str = participant_info.identity.split('-')[0]
                try:
                    user_id = int(user_id_str)
                except ValueError:
                    pass
            
            # Create or update participant record
            participant, created = RoomParticipant.objects.update_or_create(
                room=room,
                identity=participant_info.identity,
                defaults={
                    'participant_sid': participant_info.sid,
                    'user_id': user_id,
                    'joined_at': timezone.now()
                }
            )
            
            # Update room participant count
            room.current_participants = room.participants.filter(left_at__isnull=True).count()
            if room.current_participants > room.peak_participants:
                room.peak_participants = room.current_participants
            
            # Update room status if first participant
            if room.current_participants == 1 and room.status == 'active':
                room.status = 'in_use'
            
            room.save(update_fields=['current_participants', 'peak_participants', 'status', 'updated_at'])
            
            logger.info(f"Participant {participant_info.identity} joined room {room.name}")
            return {"status": "success", "participant_id": str(participant.id)}
            
        except Room.DoesNotExist:
            logger.error(f"Room not found for LiveKit room: {room_info.name}")
            return {"status": "error", "message": "Room not found"}
    
    def _handle_participant_left(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle participant left event."""
        participant_info = event.participant
        room_info = event.room
        
        try:
            room = Room.objects.get(livekit_room_name=room_info.name)
            participant = RoomParticipant.objects.get(
                room=room,
                identity=participant_info.identity
            )
            
            # Update participant record
            participant.left_at = timezone.now()
            participant.save(update_fields=['left_at', 'duration_seconds'])
            
            # Update room participant count
            room.current_participants = room.participants.filter(left_at__isnull=True).count()
            room.total_participants = room.participants.count()
            
            # Update room status if no participants
            if room.current_participants == 0 and room.status == 'in_use':
                room.status = 'active'
            
            room.save(update_fields=['current_participants', 'total_participants', 'status', 'updated_at'])
            
            logger.info(f"Participant {participant_info.identity} left room {room.name}")
            return {"status": "success", "participant_id": str(participant.id)}
            
        except (Room.DoesNotExist, RoomParticipant.DoesNotExist) as e:
            logger.error(f"Error handling participant left: {e}")
            return {"status": "error", "message": str(e)}
    
    def _handle_track_published(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle track published event."""
        track_info = event.track
        participant_info = event.participant
        room_info = event.room
        
        try:
            room = Room.objects.get(livekit_room_name=room_info.name)
            participant = RoomParticipant.objects.get(
                room=room,
                identity=participant_info.identity
            )
            
            # Update participant analytics based on track type
            if track_info.type == webhook_pb2.TrackType.VIDEO:
                if track_info.source == webhook_pb2.TrackSource.SCREEN_SHARE:
                    participant.screen_share_duration = 0  # Start tracking
                else:
                    participant.video_enabled_duration = 0  # Start tracking
            elif track_info.type == webhook_pb2.TrackType.AUDIO:
                participant.audio_enabled_duration = 0  # Start tracking
            
            participant.save()
            
            logger.info(f"Track {track_info.type} published by {participant_info.identity}")
            return {"status": "success"}
            
        except (Room.DoesNotExist, RoomParticipant.DoesNotExist) as e:
            logger.error(f"Error handling track published: {e}")
            return {"status": "error", "message": str(e)}
    
    def _handle_track_unpublished(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle track unpublished event."""
        # Similar to track published, update analytics
        return {"status": "success"}
    
    def _handle_egress_started(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle recording started event."""
        egress_info = event.egress_info
        
        try:
            room = Room.objects.get(livekit_room_name=egress_info.room_name)
            
            # Create recording record
            recording = RoomRecording.objects.create(
                room=room,
                recording_id=egress_info.egress_id,
                egress_id=egress_info.egress_id,
                status='active',
                started_at=timezone.now()
            )
            
            # Update room recording status
            room.recording_status = 'active'
            room.recording_id = egress_info.egress_id
            room.save(update_fields=['recording_status', 'recording_id', 'updated_at'])
            
            logger.info(f"Recording started for room {room.name}")
            return {"status": "success", "recording_id": str(recording.id)}
            
        except Room.DoesNotExist:
            logger.error(f"Room not found for recording: {egress_info.room_name}")
            return {"status": "error", "message": "Room not found"}
    
    def _handle_egress_updated(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle recording updated event."""
        egress_info = event.egress_info
        
        try:
            recording = RoomRecording.objects.get(egress_id=egress_info.egress_id)
            
            # Update recording status
            if egress_info.status == webhook_pb2.EgressStatus.EGRESS_COMPLETE:
                recording.status = 'processing'
            elif egress_info.status == webhook_pb2.EgressStatus.EGRESS_FAILED:
                recording.status = 'failed'
            
            recording.save(update_fields=['status', 'updated_at'])
            
            return {"status": "success"}
            
        except RoomRecording.DoesNotExist:
            logger.error(f"Recording not found: {egress_info.egress_id}")
            return {"status": "error", "message": "Recording not found"}
    
    def _handle_egress_ended(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle recording ended event."""
        egress_info = event.egress_info
        
        try:
            recording = RoomRecording.objects.get(egress_id=egress_info.egress_id)
            room = recording.room
            
            # Update recording record
            recording.status = 'ready' if egress_info.status == webhook_pb2.EgressStatus.EGRESS_COMPLETE else 'failed'
            recording.ended_at = timezone.now()
            
            # Extract file info if available
            if egress_info.file_results:
                file_result = egress_info.file_results[0]
                recording.file_url = file_result.location
                recording.file_size_bytes = file_result.size
                recording.duration_seconds = int(file_result.duration / 1_000_000_000)  # Convert from nanoseconds
            
            recording.save()
            
            # Update room recording status
            room.recording_status = 'stopped'
            room.save(update_fields=['recording_status', 'updated_at'])
            
            logger.info(f"Recording ended for room {room.name}")
            return {"status": "success", "recording_id": str(recording.id)}
            
        except RoomRecording.DoesNotExist:
            logger.error(f"Recording not found: {egress_info.egress_id}")
            return {"status": "error", "message": "Recording not found"}
    
    def _handle_sip_participant_connected(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle SIP participant connected event."""
        participant_info = event.participant
        room_info = event.room
        
        try:
            room = Room.objects.get(livekit_room_name=room_info.name)
            
            # Create participant record with SIP flag
            participant, created = RoomParticipant.objects.update_or_create(
                room=room,
                identity=participant_info.identity,
                defaults={
                    'participant_sid': participant_info.sid,
                    'is_dial_in': True,
                    'joined_at': timezone.now()
                }
            )
            
            logger.info(f"SIP participant {participant_info.identity} connected to room {room.name}")
            return {"status": "success", "participant_id": str(participant.id)}
            
        except Room.DoesNotExist:
            logger.error(f"Room not found for SIP participant: {room_info.name}")
            return {"status": "error", "message": "Room not found"}


# Webhook view
@csrf_exempt
@require_POST
def livekit_webhook(request):
    """
    Django view to handle LiveKit webhooks.
    """
    handler = LiveKitWebhookHandler()
    
    # Get authorization header
    auth_header = request.headers.get('Authorization', '')
    
    # Verify and parse webhook
    event = handler.verify_webhook(request.body, auth_header)
    if not event:
        return JsonResponse({"error": "Invalid webhook"}, status=401)
    
    # Handle the event
    try:
        result = handler.handle_event(event)
        return JsonResponse(result)
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        return JsonResponse({"error": str(e)}, status=500)