"""
Room creation tasks for bookings.

Ensures all confirmed virtual bookings have LiveKit rooms.
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(name='create-missing-booking-rooms')
def create_missing_booking_rooms():
    """
    Periodic task that finds confirmed bookings without rooms and creates them.

    This is a safety net that catches any bookings where room creation failed
    (signal errors, race conditions, etc.). Runs every 30 minutes.

    Finds bookings that:
    - Have status='confirmed'
    - Are for virtual/online services
    - Don't have a room (livekit_room_id is NULL)
    - Are individual sessions (not workshops/courses)
    - Were created in the last 7 days (don't go too far back)

    Returns:
        dict: Summary of rooms created and errors
    """
    from bookings.models import Booking
    from rooms.services import RoomService
    from rooms.models import Room
    from django.db.models import Exists, OuterRef

    # Find bookings needing rooms
    cutoff_date = timezone.now() - timedelta(days=7)

    # Subquery to check if room exists via RoomBookingRelation
    from rooms.models import RoomBookingRelation
    room_exists = RoomBookingRelation.objects.filter(booking_id=OuterRef('pk'))

    bookings = Booking.objects.annotate(
        has_room=Exists(room_exists)
    ).filter(
        status='confirmed',
        has_room=False,  # No room yet
        service_session__isnull=True,  # Not a workshop/course
        service__location_type__in=['virtual', 'online', 'hybrid'],
        created_at__gte=cutoff_date  # Last 7 days only
    ).exclude(
        # Exclude package/bundle parents
        is_package_purchase=True
    ).exclude(
        is_bundle_purchase=True
    ).select_related('service', 'service__service_type')

    rooms_created = 0
    errors = 0
    error_details = []

    logger.info(f"Found {bookings.count()} confirmed bookings without rooms")

    for booking in bookings:
        try:
            # Double-check room doesn't exist (race condition guard)
            booking.refresh_from_db()
            try:
                if booking.livekit_room:
                    continue  # Room exists, skip
            except Room.DoesNotExist:
                pass  # No room, proceed to create

            # Create room
            room_service = RoomService()
            room = room_service.create_room_for_booking(booking)

            rooms_created += 1
            logger.info(
                f"Created missing room {room.livekit_room_name} for booking {booking.id} "
                f"(service: {booking.service.name}, created: {booking.created_at})"
            )

        except Exception as e:
            errors += 1
            error_msg = f"Booking {booking.id}: {str(e)}"
            error_details.append(error_msg)
            logger.error(f"Failed to create room for booking {booking.id}: {e}")

    result = {
        'rooms_created': rooms_created,
        'errors': errors,
        'checked': bookings.count(),
        'error_details': error_details[:10]  # First 10 errors
    }

    if rooms_created > 0:
        logger.warning(
            f"Created {rooms_created} missing rooms - signal may have issues!"
        )
    else:
        logger.info("No missing rooms - all working correctly!")

    return result
