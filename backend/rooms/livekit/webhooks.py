"""
LiveKit webhook handlers for room events.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.db import transaction
from livekit import api
from livekit.protocol import webhook as webhook_pb2
from livekit.protocol import egress as egress_pb

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
            # LiveKit SDK expects body as string, not bytes
            body_str = body.decode('utf-8') if isinstance(body, bytes) else body
            event = self.webhook_receiver.receive(body_str, auth_header)
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
            now = timezone.now()

            room.status = 'active'
            room.livekit_room_sid = room_info.sid
            room.actual_start = now
            room.save(update_fields=['status', 'livekit_room_sid', 'actual_start', 'updated_at'])

            # NOTE: Don't mark ServiceSession as in_progress here!
            # room_started just means the room exists in LiveKit, not that anyone joined.
            # ServiceSession is marked in_progress in _handle_participant_joined when host joins.
            logger.info(f"Room {room.name} started (room exists in LiveKit)")

            return {"status": "success", "room_id": str(room.id)}

        except Room.DoesNotExist:
            logger.error(f"Room not found for LiveKit room: {room_info.name}")
            return {"status": "error", "message": "Room not found"}
    
    def _handle_room_finished(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle room finished event."""
        room_info = event.room

        try:
            room = Room.objects.get(livekit_room_name=room_info.name)
            now = timezone.now()

            logger.info(f"[ROOM_FINISHED] Room {room.name} (ID={room.id}) received room_finished webhook")

            # Check if the session is actually over
            should_actually_end = False

            if room.service_session:
                session_end_time = room.service_session.end_time
                logger.info(f"[ROOM_FINISHED] Session end_time: {session_end_time}, Current time: {now}")

                grace_period = timedelta(minutes=15)
                if session_end_time and now > (session_end_time + grace_period):
                    should_actually_end = True
                    logger.info(f"[ROOM_FINISHED] Session ended + grace period passed, will end room")
                elif not session_end_time:
                    # No end time set - end the room
                    should_actually_end = True
                    logger.info(f"[ROOM_FINISHED] No session end_time, ending room")
                else:
                    logger.info(f"[ROOM_FINISHED] Session still active (within grace period), NOT ending room")
                    room.status = 'active'
                    room.save(update_fields=['status', 'updated_at'])
                    return {"status": "success", "message": "Room temporarily empty but session active"}
            else:
                # Ad-hoc room with no session - end it
                should_actually_end = True
                logger.info(f"[ROOM_FINISHED] No service_session, ending ad-hoc room")

            if should_actually_end:
                room.status = 'ended'
                room.actual_end = now

                # Calculate total duration
                if room.actual_start:
                    room.total_duration_seconds = int(
                        (room.actual_end - room.actual_start).total_seconds()
                    )

                room.save(update_fields=['status', 'actual_end', 'total_duration_seconds', 'updated_at'])

                # Update ServiceSession status to completed
                if room.service_session:
                    room.service_session.status = 'completed'
                    room.service_session.actual_end_time = now
                    room.service_session.save(update_fields=['status', 'actual_end_time', 'updated_at'])
                    logger.info(f"[ROOM_FINISHED] Marked ServiceSession {room.service_session.id} as completed")

                # End all active participant sessions
                active_participants = room.participants.filter(left_at__isnull=True)
                for participant in active_participants:
                    participant.left_at = now
                    participant.save(update_fields=['left_at'])

                # Schedule analytics update
                from rooms.tasks import update_room_analytics
                update_room_analytics.delay(room.id)

                logger.info(f"[ROOM_FINISHED] Room {room.name} ended permanently")
                return {"status": "success", "room_id": str(room.id)}

        except Room.DoesNotExist:
            logger.error(f"[ROOM_FINISHED] Room not found for LiveKit room: {room_info.name}")
            return {"status": "error", "message": "Room not found"}
    
    def _handle_participant_joined(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle participant joined event."""
        participant_info = event.participant
        room_info = event.room

        logger.info(f"[PARTICIPANT_JOINED] Identity: {participant_info.identity}, SID: {participant_info.sid}, Room: {room_info.name}")

        # Skip egress participants (recording bots)
        if participant_info.identity.startswith('EG_'):
            logger.debug(f"Skipping egress participant: {participant_info.identity}")
            return {"status": "success", "message": "Egress participant ignored"}

        try:
            room = Room.objects.get(livekit_room_name=room_info.name)
            logger.info(f"[PARTICIPANT_JOINED] Found room: ID={room.id}, Name={room.name}, Current participants: {room.current_participants}")

            # Extract user ID from identity (identity is just the user ID as a string)
            user_id = None
            try:
                user_id = int(participant_info.identity)
                logger.info(f"[PARTICIPANT_JOINED] Successfully parsed user_id: {user_id}")
            except ValueError as e:
                logger.warning(f"[PARTICIPANT_JOINED] Failed to parse user_id from identity '{participant_info.identity}': {e}")

            # Skip if we couldn't extract a valid user_id
            if user_id is None:
                logger.warning(f"[PARTICIPANT_JOINED] Could not extract user_id from identity: {participant_info.identity}, SKIPPING")
                return {"status": "success", "message": "Non-user participant ignored"}

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
            logger.info(f"[PARTICIPANT_JOINED] {'Created' if created else 'Updated'} participant record: ID={participant.id}, user_id={user_id}")

            # Update room participant count
            room.current_participants = room.participants.filter(left_at__isnull=True).count()
            if room.current_participants > room.peak_participants:
                room.peak_participants = room.current_participants

            # Update room status if first participant
            if room.current_participants == 1 and room.status == 'active':
                room.status = 'in_use'

            room.save(update_fields=['current_participants', 'peak_participants', 'status', 'updated_at'])
            logger.info(f"[PARTICIPANT_JOINED] Updated room: current_participants={room.current_participants}, status={room.status}")

            # Mark ServiceSession as in_progress when the HOST (practitioner) joins
            # This is when the session truly starts - not when the room is created
            if room.service_session:
                session = room.service_session
                service = session.service
                practitioner = service.primary_practitioner if service else None
                practitioner_user_id = practitioner.user_id if practitioner else None

                logger.info(f"[PARTICIPANT_JOINED] Session check: session_status={session.status}, user_id={user_id}, practitioner_user_id={practitioner_user_id}")

                if session.status == 'scheduled':
                    # Check if this user is the practitioner (host)
                    is_host = (user_id == practitioner_user_id) if practitioner_user_id else False

                    if is_host:
                        now = timezone.now()
                        session.status = 'in_progress'
                        session.actual_start_time = now
                        session.save(update_fields=['status', 'actual_start_time', 'updated_at'])
                        logger.info(f"[PARTICIPANT_JOINED] Host joined - ServiceSession {session.id} marked in_progress")
                    else:
                        logger.info(f"[PARTICIPANT_JOINED] Non-host participant joined, session stays scheduled")

            logger.info(f"Participant {participant_info.identity} joined room {room.name}")
            return {"status": "success", "participant_id": str(participant.id)}

        except Room.DoesNotExist:
            logger.error(f"[PARTICIPANT_JOINED] Room not found for LiveKit room: {room_info.name}")
            return {"status": "error", "message": "Room not found"}
        except Exception as e:
            logger.error(f"[PARTICIPANT_JOINED] Unexpected error: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
    
    def _handle_participant_left(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle participant left event."""
        participant_info = event.participant
        room_info = event.room

        # Skip egress participants (recording bots)
        if participant_info.identity.startswith('EG_'):
            logger.debug(f"Skipping egress participant: {participant_info.identity}")
            return {"status": "success", "message": "Egress participant ignored"}

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
        try:
            track_info = event.track
            participant_info = event.participant
            room_info = event.room
        except AttributeError as e:
            # Some LiveKit SDK versions have issues with track event attributes
            logger.warning(f"Could not access track event attributes: {e}")
            return {"status": "success", "message": "Track event ignored due to SDK compatibility"}

        try:
            room = Room.objects.get(livekit_room_name=room_info.name)
            participant = RoomParticipant.objects.get(
                room=room,
                identity=participant_info.identity
            )

            # Update participant analytics based on track type
            # Access type/source safely - different SDK versions expose these differently
            track_type = None
            track_source = None
            try:
                track_type = track_info.type if hasattr(track_info, 'type') else None
                track_source = track_info.source if hasattr(track_info, 'source') else None
            except Exception:
                pass  # Ignore if we can't get track type/source

            # TrackType enum: AUDIO=1, VIDEO=2
            # TrackSource enum: CAMERA=1, MICROPHONE=2, SCREEN_SHARE=3, SCREEN_SHARE_AUDIO=4
            if track_type == 2:  # VIDEO
                if track_source == 3:  # SCREEN_SHARE
                    participant.screen_share_duration = 0  # Start tracking
                else:
                    participant.video_enabled_duration = 0  # Start tracking
            elif track_type == 1:  # AUDIO
                participant.audio_enabled_duration = 0  # Start tracking

            participant.save()

            logger.info(f"Track type={track_type} published by {participant_info.identity}")
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
            # Update existing recording record (created by start_recording service)
            recording = RoomRecording.objects.get(egress_id=egress_info.egress_id)
            recording.status = 'active'
            recording.save(update_fields=['status', 'updated_at'])

            # Update room recording status
            room = recording.room
            room.recording_status = 'active'
            room.save(update_fields=['recording_status', 'updated_at'])

            logger.info(f"Recording started for room {room.name}")
            return {"status": "success", "recording_id": str(recording.id)}

        except RoomRecording.DoesNotExist:
            logger.warning(f"Recording not found for egress {egress_info.egress_id}, will be created by start_recording service")
            return {"status": "success", "message": "Recording will be created by service"}
    
    def _handle_egress_updated(self, event: webhook_pb2.WebhookEvent) -> Dict[str, Any]:
        """Handle recording updated event."""
        egress_info = event.egress_info

        try:
            recording = RoomRecording.objects.get(egress_id=egress_info.egress_id)

            # Update recording status based on egress status
            if egress_info.status == egress_pb.EGRESS_COMPLETE:
                recording.status = 'processing'
            elif egress_info.status == egress_pb.EGRESS_FAILED:
                recording.status = 'failed'
            elif egress_info.status == egress_pb.EGRESS_ACTIVE:
                recording.status = 'active'
            elif egress_info.status == egress_pb.EGRESS_ENDING:
                recording.status = 'stopping'

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

            # Log egress status for debugging
            logger.info(f"Egress ended with status: {egress_info.status} (EGRESS_COMPLETE={egress_pb.EGRESS_COMPLETE})")

            # Update recording record based on egress status
            recording.status = 'ready' if egress_info.status == egress_pb.EGRESS_COMPLETE else 'failed'
            recording.ended_at = timezone.now()

            # Extract file info if available
            if egress_info.file_results:
                file_result = egress_info.file_results[0]
                logger.info(f"File result: filename={file_result.filename}, size={file_result.size}, duration={file_result.duration}")
                # File URL from LiveKit points to the file in R2
                # We'll verify and get our own URL from R2MediaStorage
                recording.file_size_bytes = file_result.size
                recording.duration_seconds = int(file_result.duration / 1_000_000_000)  # Convert from nanoseconds
            else:
                logger.warning(f"No file_results in egress_info for {egress_info.egress_id}")

            # Check for error message
            if egress_info.error:
                logger.error(f"Egress error: {egress_info.error}")

            recording.save()

            # Update room recording status
            room.recording_status = 'stopped'
            room.save(update_fields=['recording_status', 'updated_at'])

            # Process completed recording (verify in R2, generate URLs, etc.)
            if recording.status == 'ready':
                try:
                    from rooms.services.recording_service import RecordingService
                    recording_service = RecordingService()
                    recording_service.process_completed_recording(recording)
                except Exception as e:
                    logger.error(f"Failed to process completed recording {recording.recording_id}: {e}")

            logger.info(f"Recording ended for room {room.name}, status: {recording.status}")
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