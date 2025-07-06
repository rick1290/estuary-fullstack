"""
Booking signals for handling automatic actions on booking events.
"""
import logging

logger = logging.getLogger(__name__)

# Note: Room creation for bookings is handled in rooms/signals.py
# This keeps all room-related logic in one place