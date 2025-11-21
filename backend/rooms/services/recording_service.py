"""
Recording service for managing LiveKit room recordings.
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from django.db import transaction
from django.conf import settings
from django.utils import timezone

from rooms.models import Room, RoomRecording
from integrations.cloudflare_r2.storage import R2MediaStorage

logger = logging.getLogger(__name__)


class RecordingService:
    """Service for managing room recordings with LiveKit and R2 storage."""

    def __init__(self):
        self.r2_storage = R2MediaStorage()

    @transaction.atomic
    def start_recording(
        self,
        room: Room,
        layout: str = 'speaker',
        file_format: str = 'mp4',
        audio_only: bool = False
    ) -> RoomRecording:
        """
        Start recording a room.

        Args:
            room: Room instance to record
            layout: Layout type ('speaker', 'grid', 'single-speaker')
            file_format: Output format ('mp4', 'webm')
            audio_only: Whether to record audio only

        Returns:
            RoomRecording instance

        Raises:
            ValueError: If room is not active or recording already in progress
        """
        # Validate room state
        if not room.is_active:
            raise ValueError(f"Room {room.livekit_room_name} is not active")

        # Check if recording already in progress
        active_recording = room.recordings.filter(
            status__in=['starting', 'active']
        ).first()

        if active_recording:
            raise ValueError(f"Recording already in progress for room {room.livekit_room_name}")

        # Generate file path in R2
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        file_key = f"recordings/{room.id}/{timestamp}.{file_format}"

        logger.info(f"Starting recording for room {room.livekit_room_name} -> {file_key}")

        # Import here to avoid circular imports
        from rooms.livekit.client import get_livekit_client
        import asyncio
        import concurrent.futures

        # Start egress via LiveKit
        try:
            def run_in_new_loop():
                """Run coroutine in a new event loop in a separate thread."""
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                livekit_client = None
                try:
                    # Create client inside the loop
                    from rooms.livekit.client import get_livekit_client
                    livekit_client = get_livekit_client()

                    async def async_start():
                        return await livekit_client.start_room_composite_egress(
                            room_name=room.livekit_room_name,
                            file_key=file_key,
                            layout=layout,
                            audio_only=audio_only,
                            file_format=file_format
                        )

                    result = new_loop.run_until_complete(async_start())
                    return result
                finally:
                    try:
                        # Close the aiohttp session if it exists
                        if livekit_client and hasattr(livekit_client, '_lk_api') and livekit_client._lk_api:
                            if hasattr(livekit_client._lk_api, '_session') and livekit_client._lk_api._session:
                                new_loop.run_until_complete(livekit_client._lk_api._session.close())

                        # Cancel any pending tasks
                        pending = asyncio.all_tasks(new_loop)
                        for task in pending:
                            task.cancel()
                        # Run the loop once more to handle cancellations
                        if pending:
                            new_loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
                    finally:
                        new_loop.close()

            with concurrent.futures.ThreadPoolExecutor() as executor:
                egress_info = executor.submit(run_in_new_loop).result()

            # Create recording record
            recording = RoomRecording.objects.create(
                room=room,
                recording_id=egress_info.egress_id,
                egress_id=egress_info.egress_id,
                status='starting',
                started_at=timezone.now(),
                file_format=file_format,
                storage_provider='r2',
                storage_bucket=settings.CLOUDFLARE_R2_STORAGE_BUCKET_NAME,
                storage_key=file_key,
                metadata={
                    'layout': layout,
                    'audio_only': audio_only,
                    'room_name': room.livekit_room_name,
                    'room_type': room.room_type,
                }
            )

            # Update room recording status
            room.recording_status = 'starting'
            room.recording_id = egress_info.egress_id
            room.save(update_fields=['recording_status', 'recording_id'])

            logger.info(f"Recording started: {recording.recording_id}")
            return recording

        except Exception as e:
            import traceback
            logger.error(f"Failed to start recording for room {room.livekit_room_name}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    @transaction.atomic
    def stop_recording(self, room: Room) -> Optional[RoomRecording]:
        """
        Stop active recording for a room.

        Args:
            room: Room instance

        Returns:
            RoomRecording instance if stopped, None if no active recording
        """
        # Find active recording
        recording = room.recordings.filter(
            status__in=['starting', 'active']
        ).first()

        if not recording:
            logger.warning(f"No active recording found for room {room.livekit_room_name}")
            return None

        logger.info(f"Stopping recording {recording.egress_id} for room {room.livekit_room_name}")

        # Import here to avoid circular imports
        from rooms.livekit.client import get_livekit_client
        import asyncio
        import concurrent.futures

        try:
            def run_in_new_loop():
                """Run coroutine in a new event loop in a separate thread."""
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                livekit_client = None
                try:
                    # Create client inside the loop
                    from rooms.livekit.client import get_livekit_client
                    livekit_client = get_livekit_client()

                    async def async_stop():
                        return await livekit_client.stop_egress(recording.egress_id)

                    result = new_loop.run_until_complete(async_stop())
                    return result
                finally:
                    try:
                        # Close the aiohttp session if it exists
                        if livekit_client and hasattr(livekit_client, '_lk_api') and livekit_client._lk_api:
                            if hasattr(livekit_client._lk_api, '_session') and livekit_client._lk_api._session:
                                new_loop.run_until_complete(livekit_client._lk_api._session.close())

                        # Cancel any pending tasks
                        pending = asyncio.all_tasks(new_loop)
                        for task in pending:
                            task.cancel()
                        # Run the loop once more to handle cancellations
                        if pending:
                            new_loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
                    finally:
                        new_loop.close()

            with concurrent.futures.ThreadPoolExecutor() as executor:
                executor.submit(run_in_new_loop).result()

            # Update recording status
            recording.status = 'stopping'
            recording.save(update_fields=['status'])

            # Update room status
            room.recording_status = 'stopping'
            room.save(update_fields=['recording_status'])

            logger.info(f"Recording stopped: {recording.recording_id}")
            return recording

        except Exception as e:
            logger.error(f"Failed to stop recording {recording.egress_id}: {e}")
            raise

    def get_recording_status(self, recording_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status of a recording.

        Args:
            recording_id: Recording/egress ID

        Returns:
            Dict with recording status info
        """
        try:
            recording = RoomRecording.objects.get(recording_id=recording_id)
            return {
                'recording_id': recording.recording_id,
                'status': recording.status,
                'started_at': recording.started_at,
                'ended_at': recording.ended_at,
                'duration_seconds': recording.duration_seconds,
                'file_url': recording.file_url,
                'file_size_bytes': recording.file_size_bytes,
            }
        except RoomRecording.DoesNotExist:
            logger.error(f"Recording not found: {recording_id}")
            return None

    @transaction.atomic
    def process_completed_recording(self, recording: RoomRecording) -> None:
        """
        Process a completed recording (called from webhook).

        Args:
            recording: RoomRecording instance that just completed
        """
        logger.info(f"Processing completed recording: {recording.recording_id}")

        # Verify file exists in R2
        if self.r2_storage.file_exists(recording.storage_key):
            # Get file info
            file_info = self.r2_storage.get_file_info(recording.storage_key)

            if file_info:
                recording.file_size_bytes = file_info.get('size', 0)
                recording.is_processed = True
                recording.processed_at = timezone.now()

                # Generate public URL
                recording.file_url = self.r2_storage.get_public_url(recording.storage_key)

                recording.save(update_fields=[
                    'file_size_bytes',
                    'is_processed',
                    'processed_at',
                    'file_url'
                ])

                logger.info(f"Recording processed successfully: {recording.recording_id}")

                # Trigger thumbnail generation (optional)
                # self._schedule_thumbnail_generation(recording)
        else:
            logger.error(f"Recording file not found in R2: {recording.storage_key}")
            recording.status = 'failed'
            recording.save(update_fields=['status'])

    def generate_signed_url(
        self,
        recording: RoomRecording,
        expires_in: int = 3600
    ) -> str:
        """
        Generate a signed URL for accessing a recording.

        Args:
            recording: RoomRecording instance
            expires_in: URL expiration time in seconds (default: 1 hour)

        Returns:
            Signed URL string
        """
        if not recording.storage_key:
            raise ValueError("Recording has no storage key")

        # For now, return public URL
        # TODO: Implement signed URLs if recordings need to be private
        return self.r2_storage.get_public_url(recording.storage_key)

    def list_room_recordings(self, room: Room) -> list:
        """
        List all recordings for a room.

        Args:
            room: Room instance

        Returns:
            List of RoomRecording instances
        """
        return list(room.recordings.filter(status='ready').order_by('-started_at'))

    def delete_recording(self, recording: RoomRecording) -> bool:
        """
        Delete a recording from storage and database.

        Args:
            recording: RoomRecording instance

        Returns:
            True if successful
        """
        logger.info(f"Deleting recording: {recording.recording_id}")

        # Delete from R2
        if recording.storage_key:
            self.r2_storage.delete(recording.storage_key)

        # Delete thumbnail if exists
        if recording.thumbnail_url and 'thumbnail' in recording.metadata:
            thumbnail_key = recording.metadata.get('thumbnail_key')
            if thumbnail_key:
                self.r2_storage.delete(thumbnail_key)

        # Delete database record
        recording.delete()

        logger.info(f"Recording deleted: {recording.recording_id}")
        return True

    def _schedule_thumbnail_generation(self, recording: RoomRecording) -> None:
        """
        Schedule async task to generate thumbnail.

        Args:
            recording: RoomRecording instance
        """
        # Import task here to avoid circular imports
        try:
            from rooms.tasks import generate_recording_thumbnail
            generate_recording_thumbnail.delay(recording.id)
        except ImportError:
            logger.warning("Recording thumbnail task not available")
