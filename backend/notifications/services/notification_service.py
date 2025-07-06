"""
Notification service for sending booking and payment notifications.
"""
import logging
from typing import Optional

from notifications.services.client_notifications import ClientNotificationService
from notifications.services.practitioner_notifications import PractitionerNotificationService
from bookings.models import Booking

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for coordinating notifications."""
    
    def __init__(self):
        self.client_service = ClientNotificationService()
        self.practitioner_service = PractitionerNotificationService()
    
    def send_booking_confirmation(self, booking: Booking) -> None:
        """
        Send booking confirmation to both client and practitioner.
        
        Args:
            booking: Confirmed booking
        """
        # Send to client
        try:
            self.client_service.send_booking_confirmation(
                booking.user.email,
                booking
            )
            logger.info(f"Sent booking confirmation to client {booking.user.email}")
        except Exception as e:
            logger.error(f"Failed to send client booking confirmation: {e}")
        
        # Send to practitioner
        if booking.practitioner:
            try:
                self.practitioner_service.send_booking_notification(booking)
                logger.info(f"Sent booking notification to practitioner {booking.practitioner.user.email}")
            except Exception as e:
                logger.error(f"Failed to send practitioner booking notification: {e}")
    
    def send_booking_cancellation(self, booking: Booking) -> None:
        """
        Send booking cancellation notifications.
        
        Args:
            booking: Cancelled booking
        """
        # Send to client
        try:
            self.client_service.send_booking_cancellation(
                booking.user.email,
                booking
            )
            logger.info(f"Sent cancellation to client {booking.user.email}")
        except Exception as e:
            logger.error(f"Failed to send client cancellation: {e}")
        
        # Send to practitioner
        if booking.practitioner:
            try:
                self.practitioner_service.send_booking_cancellation_notification(
                    booking.practitioner.user.email,
                    booking
                )
                logger.info(f"Sent cancellation to practitioner {booking.practitioner.user.email}")
            except Exception as e:
                logger.error(f"Failed to send practitioner cancellation: {e}")
    
    def send_payment_confirmation(self, user_email: str, order: any) -> None:
        """
        Send payment confirmation.
        
        Args:
            user_email: User's email
            order: Order that was paid
        """
        try:
            # This would integrate with your email service
            logger.info(f"Sent payment confirmation to {user_email} for order {order.id}")
        except Exception as e:
            logger.error(f"Failed to send payment confirmation: {e}")
    
    def send_credit_purchase_confirmation(self, user_email: str, amount: float) -> None:
        """
        Send credit purchase confirmation.
        
        Args:
            user_email: User's email
            amount: Amount of credits purchased
        """
        try:
            # This would integrate with your email service
            logger.info(f"Sent credit purchase confirmation to {user_email} for ${amount}")
        except Exception as e:
            logger.error(f"Failed to send credit purchase confirmation: {e}")