"""
Temporal activities for the bookings domain.

This module defines Temporal activities for managing bookings,
including retrieving booking details, sending notifications,
and handling booking state changes.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from django.db import transaction
from temporalio import activity

from apps.integrations.temporal.base_activities import django_activity, transactional_activity
from apps.integrations.temporal.decorators import monitored_activity

logger = logging.getLogger(__name__)


@activity.defn
@monitored_activity(name="get_booking_details")
@django_activity
def get_booking_details(booking_id: int) -> Dict[str, Any]:
    """
    Get details for a booking.
    
    Args:
        booking_id: ID of the booking
        
    Returns:
        Dict with booking details
    """
    from apps.bookings.models import Booking
    
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Convert to dict for serialization
        return {
            "id": booking.id,
            "practitioner_id": booking.practitioner_id,
            "client_id": booking.client_id,
            "session_time": booking.session_time.isoformat() if booking.session_time else None,
            "duration_minutes": booking.duration_minutes,
            "service_type_id": booking.service_type_id,
            "status": booking.status,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
            "updated_at": booking.updated_at.isoformat() if booking.updated_at else None,
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found"}


@activity.defn
@monitored_activity(name="send_booking_confirmation")
@django_activity
def send_booking_confirmation(booking_id: int) -> Dict[str, Any]:
    """
    Send booking confirmation to client and practitioner.
    
    Args:
        booking_id: ID of the booking
        
    Returns:
        Dict with notification results
    """
    from apps.bookings.models import Booking
    from apps.notifications.services import NotificationService
    
    try:
        booking = Booking.objects.get(id=booking_id)
        notification_service = NotificationService()
        
        # Send confirmation to client
        client_result = notification_service.send_notification(
            recipient=booking.client,
            notification_type="booking_confirmation",
            context={
                "booking": booking,
                "practitioner_name": booking.practitioner.get_full_name(),
                "session_time": booking.session_time,
                "duration_minutes": booking.duration_minutes,
            }
        )
        
        # Send confirmation to practitioner
        practitioner_result = notification_service.send_notification(
            recipient=booking.practitioner,
            notification_type="new_booking",
            context={
                "booking": booking,
                "client_name": booking.client.get_full_name(),
                "session_time": booking.session_time,
                "duration_minutes": booking.duration_minutes,
            }
        )
        
        # Update booking status
        booking.status = "confirmed"
        booking.save(update_fields=["status", "updated_at"])
        
        return {
            "booking_id": booking_id,
            "client_notification_sent": client_result.get("success", False),
            "practitioner_notification_sent": practitioner_result.get("success", False),
            "success": True
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found", "success": False}
    except Exception as e:
        activity.logger.error(f"Error sending booking confirmation: {str(e)}")
        return {"error": str(e), "success": False}


@activity.defn
@monitored_activity(name="send_session_reminder")
@django_activity
def send_session_reminder(booking_id: int) -> Dict[str, Any]:
    """
    Send session reminder to client.
    
    Args:
        booking_id: ID of the booking
        
    Returns:
        Dict with notification results
    """
    from apps.bookings.models import Booking
    from apps.notifications.services import NotificationService
    
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Only send reminders for confirmed bookings
        if booking.status != "confirmed":
            return {
                "booking_id": booking_id,
                "success": False,
                "reason": f"Booking has status {booking.status}, not sending reminder"
            }
        
        notification_service = NotificationService()
        
        # Send reminder to client
        client_result = notification_service.send_notification(
            recipient=booking.client,
            notification_type="session_reminder",
            context={
                "booking": booking,
                "practitioner_name": booking.practitioner.get_full_name(),
                "session_time": booking.session_time,
                "duration_minutes": booking.duration_minutes,
            }
        )
        
        # Log the reminder
        booking.add_log_entry(
            action="reminder_sent",
            actor=None,  # System action
            details={"notification_id": client_result.get("notification_id")}
        )
        
        return {
            "booking_id": booking_id,
            "notification_sent": client_result.get("success", False),
            "success": True
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found", "success": False}
    except Exception as e:
        activity.logger.error(f"Error sending session reminder: {str(e)}")
        return {"error": str(e), "success": False}


@activity.defn
@monitored_activity(name="get_session_status")
@django_activity
def get_session_status(booking_id: int) -> Dict[str, Any]:
    """
    Get the current status of a session.
    
    Args:
        booking_id: ID of the booking
        
    Returns:
        Dict with session status
    """
    from apps.bookings.models import Booking
    
    try:
        booking = Booking.objects.get(id=booking_id)
        
        return {
            "booking_id": booking_id,
            "status": booking.status,
            "completed_at": booking.completed_at.isoformat() if booking.completed_at else None,
            "success": True
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found", "success": False}


@activity.defn
@monitored_activity(name="send_session_followup")
@django_activity
def send_session_followup(booking_id: int) -> Dict[str, Any]:
    """
    Send session follow-up and feedback request to client.
    
    Args:
        booking_id: ID of the booking
        
    Returns:
        Dict with notification results
    """
    from apps.bookings.models import Booking
    from apps.notifications.services import NotificationService
    
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Only send follow-ups for completed bookings
        if booking.status != "completed":
            return {
                "booking_id": booking_id,
                "success": False,
                "reason": f"Booking has status {booking.status}, not sending follow-up"
            }
        
        notification_service = NotificationService()
        
        # Send follow-up to client
        client_result = notification_service.send_notification(
            recipient=booking.client,
            notification_type="session_followup",
            context={
                "booking": booking,
                "practitioner_name": booking.practitioner.get_full_name(),
                "feedback_url": f"/feedback/{booking.id}/"
            }
        )
        
        # Log the follow-up
        booking.add_log_entry(
            action="followup_sent",
            actor=None,  # System action
            details={"notification_id": client_result.get("notification_id")}
        )
        
        return {
            "booking_id": booking_id,
            "notification_sent": client_result.get("success", False),
            "success": True
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found", "success": False}
    except Exception as e:
        activity.logger.error(f"Error sending session follow-up: {str(e)}")
        return {"error": str(e), "success": False}


@activity.defn
@monitored_activity(name="check_feedback_status")
@django_activity
def check_feedback_status(booking_id: int) -> Dict[str, Any]:
    """
    Check if feedback has been provided for a booking.
    
    Args:
        booking_id: ID of the booking
        
    Returns:
        Dict with feedback status
    """
    from apps.bookings.models import Booking, Feedback
    
    try:
        booking = Booking.objects.get(id=booking_id)
        feedback_provided = Feedback.objects.filter(booking_id=booking_id).exists()
        
        return {
            "booking_id": booking_id,
            "feedback_provided": feedback_provided,
            "success": True
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found", "success": False}


@activity.defn
@monitored_activity(name="send_feedback_reminder")
@django_activity
def send_feedback_reminder(booking_id: int) -> Dict[str, Any]:
    """
    Send feedback reminder to client.
    
    Args:
        booking_id: ID of the booking
        
    Returns:
        Dict with notification results
    """
    from apps.bookings.models import Booking
    from apps.notifications.services import NotificationService
    
    try:
        booking = Booking.objects.get(id=booking_id)
        notification_service = NotificationService()
        
        # Send feedback reminder to client
        client_result = notification_service.send_notification(
            recipient=booking.client,
            notification_type="feedback_reminder",
            context={
                "booking": booking,
                "practitioner_name": booking.practitioner.get_full_name(),
                "feedback_url": f"/feedback/{booking.id}/"
            }
        )
        
        # Log the reminder
        booking.add_log_entry(
            action="feedback_reminder_sent",
            actor=None,  # System action
            details={"notification_id": client_result.get("notification_id")}
        )
        
        return {
            "booking_id": booking_id,
            "notification_sent": client_result.get("success", False),
            "success": True
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found", "success": False}
    except Exception as e:
        activity.logger.error(f"Error sending feedback reminder: {str(e)}")
        return {"error": str(e), "success": False}


@activity.defn
@monitored_activity(name="handle_no_show")
@django_activity
@transactional_activity
def handle_no_show(booking_id: int) -> Dict[str, Any]:
    """
    Handle a no-show booking.
    
    Args:
        booking_id: ID of the booking
        
    Returns:
        Dict with handling results
    """
    from apps.bookings.models import Booking
    from apps.notifications.services import NotificationService
    from apps.payments.services import PaymentService
    
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Only handle no-shows for bookings with that status
        if booking.status != "no_show":
            return {
                "booking_id": booking_id,
                "success": False,
                "reason": f"Booking has status {booking.status}, not handling as no-show"
            }
        
        notification_service = NotificationService()
        payment_service = PaymentService()
        
        # Apply cancellation fee if applicable
        fee_result = payment_service.apply_no_show_fee(booking)
        
        # Notify client
        client_result = notification_service.send_notification(
            recipient=booking.client,
            notification_type="no_show_notification",
            context={
                "booking": booking,
                "practitioner_name": booking.practitioner.get_full_name(),
                "fee_applied": fee_result.get("fee_applied", False),
                "fee_amount": fee_result.get("fee_amount", 0),
            }
        )
        
        # Notify practitioner
        practitioner_result = notification_service.send_notification(
            recipient=booking.practitioner,
            notification_type="client_no_show",
            context={
                "booking": booking,
                "client_name": booking.client.get_full_name(),
                "fee_applied": fee_result.get("fee_applied", False),
                "fee_amount": fee_result.get("fee_amount", 0),
            }
        )
        
        # Log the no-show handling
        booking.add_log_entry(
            action="no_show_handled",
            actor=None,  # System action
            details={
                "fee_applied": fee_result.get("fee_applied", False),
                "fee_amount": fee_result.get("fee_amount", 0),
            }
        )
        
        return {
            "booking_id": booking_id,
            "fee_applied": fee_result.get("fee_applied", False),
            "fee_amount": fee_result.get("fee_amount", 0),
            "client_notification_sent": client_result.get("success", False),
            "practitioner_notification_sent": practitioner_result.get("success", False),
            "success": True
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found", "success": False}
    except Exception as e:
        activity.logger.error(f"Error handling no-show: {str(e)}")
        return {"error": str(e), "success": False}


@activity.defn
@monitored_activity(name="cancel_booking")
@django_activity
@transactional_activity
def cancel_booking(booking_id: int, reason: str = None) -> Dict[str, Any]:
    """
    Cancel a booking.
    
    Args:
        booking_id: ID of the booking
        reason: Reason for cancellation
        
    Returns:
        Dict with cancellation results
    """
    from apps.bookings.models import Booking
    from apps.notifications.services import NotificationService
    from apps.payments.services import PaymentService
    
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Only cancel confirmed bookings
        if booking.status not in ["confirmed", "pending"]:
            return {
                "booking_id": booking_id,
                "success": False,
                "reason": f"Booking has status {booking.status}, cannot cancel"
            }
        
        notification_service = NotificationService()
        payment_service = PaymentService()
        
        # Apply cancellation fee if applicable
        fee_result = payment_service.apply_cancellation_fee(booking)
        
        # Update booking status
        booking.status = "cancelled"
        booking.cancellation_reason = reason
        booking.cancelled_at = datetime.now()
        booking.save(update_fields=["status", "cancellation_reason", "cancelled_at", "updated_at"])
        
        # Notify client
        client_result = notification_service.send_notification(
            recipient=booking.client,
            notification_type="booking_cancelled",
            context={
                "booking": booking,
                "practitioner_name": booking.practitioner.get_full_name(),
                "fee_applied": fee_result.get("fee_applied", False),
                "fee_amount": fee_result.get("fee_amount", 0),
                "reason": reason,
            }
        )
        
        # Notify practitioner
        practitioner_result = notification_service.send_notification(
            recipient=booking.practitioner,
            notification_type="booking_cancelled",
            context={
                "booking": booking,
                "client_name": booking.client.get_full_name(),
                "fee_applied": fee_result.get("fee_applied", False),
                "fee_amount": fee_result.get("fee_amount", 0),
                "reason": reason,
            }
        )
        
        # Log the cancellation
        booking.add_log_entry(
            action="cancelled",
            actor=None,  # System action
            details={
                "reason": reason,
                "fee_applied": fee_result.get("fee_applied", False),
                "fee_amount": fee_result.get("fee_amount", 0),
            }
        )
        
        return {
            "booking_id": booking_id,
            "fee_applied": fee_result.get("fee_applied", False),
            "fee_amount": fee_result.get("fee_amount", 0),
            "client_notification_sent": client_result.get("success", False),
            "practitioner_notification_sent": practitioner_result.get("success", False),
            "success": True
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found", "success": False}
    except Exception as e:
        activity.logger.error(f"Error cancelling booking: {str(e)}")
        return {"error": str(e), "success": False}


@activity.defn
@monitored_activity(name="create_booking")
@django_activity
@transactional_activity
def create_booking(
    practitioner_id: int,
    client_id: int,
    session_time: str,
    duration_minutes: int,
    service_type_id: int,
    is_rescheduled: bool = False,
    original_booking_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Create a new booking.
    
    Args:
        practitioner_id: ID of the practitioner
        client_id: ID of the client
        session_time: Session time (ISO format)
        duration_minutes: Duration in minutes
        service_type_id: ID of the service type
        is_rescheduled: Whether this is a rescheduled booking
        original_booking_id: ID of the original booking (if rescheduled)
        
    Returns:
        Dict with the new booking details
    """
    from django.contrib.auth import get_user_model
    from apps.bookings.models import Booking
    from apps.services.models import ServiceType
    
    User = get_user_model()
    
    try:
        # Parse session time
        session_time_dt = datetime.fromisoformat(session_time)
        
        # Get the practitioner and client
        practitioner = User.objects.get(id=practitioner_id)
        client = User.objects.get(id=client_id)
        
        # Get the service type
        service_type = ServiceType.objects.get(id=service_type_id)
        
        # Create the booking
        booking = Booking.objects.create(
            practitioner=practitioner,
            client=client,
            session_time=session_time_dt,
            duration_minutes=duration_minutes,
            service_type=service_type,
            status="confirmed",
            is_rescheduled=is_rescheduled,
            original_booking_id=original_booking_id,
        )
        
        # Log the creation
        booking.add_log_entry(
            action="created",
            actor=None,  # System action
            details={
                "is_rescheduled": is_rescheduled,
                "original_booking_id": original_booking_id,
            }
        )
        
        return {
            "id": booking.id,
            "practitioner_id": booking.practitioner_id,
            "client_id": booking.client_id,
            "session_time": booking.session_time.isoformat(),
            "duration_minutes": booking.duration_minutes,
            "service_type_id": booking.service_type_id,
            "status": booking.status,
            "is_rescheduled": booking.is_rescheduled,
            "original_booking_id": booking.original_booking_id,
            "success": True
        }
    except User.DoesNotExist as e:
        activity.logger.error(f"User not found: {str(e)}")
        return {"error": f"User not found: {str(e)}", "success": False}
    except ServiceType.DoesNotExist:
        activity.logger.error(f"Service type {service_type_id} not found")
        return {"error": f"Service type {service_type_id} not found", "success": False}
    except Exception as e:
        activity.logger.error(f"Error creating booking: {str(e)}")
        return {"error": str(e), "success": False}


@activity.defn
@monitored_activity(name="send_rescheduling_notification")
@django_activity
def send_rescheduling_notification(
    original_booking_id: int,
    new_booking_id: int
) -> Dict[str, Any]:
    """
    Send notifications about a rescheduled booking.
    
    Args:
        original_booking_id: ID of the original booking
        new_booking_id: ID of the new booking
        
    Returns:
        Dict with notification results
    """
    from apps.bookings.models import Booking
    from apps.notifications.services import NotificationService
    
    try:
        original_booking = Booking.objects.get(id=original_booking_id)
        new_booking = Booking.objects.get(id=new_booking_id)
        notification_service = NotificationService()
        
        # Send notification to client
        client_result = notification_service.send_notification(
            recipient=new_booking.client,
            notification_type="booking_rescheduled",
            context={
                "original_booking": original_booking,
                "new_booking": new_booking,
                "practitioner_name": new_booking.practitioner.get_full_name(),
            }
        )
        
        # Send notification to practitioner
        practitioner_result = notification_service.send_notification(
            recipient=new_booking.practitioner,
            notification_type="booking_rescheduled",
            context={
                "original_booking": original_booking,
                "new_booking": new_booking,
                "client_name": new_booking.client.get_full_name(),
            }
        )
        
        return {
            "original_booking_id": original_booking_id,
            "new_booking_id": new_booking_id,
            "client_notification_sent": client_result.get("success", False),
            "practitioner_notification_sent": practitioner_result.get("success", False),
            "success": True
        }
    except Booking.DoesNotExist as e:
        activity.logger.error(f"Booking not found: {str(e)}")
        return {"error": f"Booking not found: {str(e)}", "success": False}
    except Exception as e:
        activity.logger.error(f"Error sending rescheduling notification: {str(e)}")
        return {"error": str(e), "success": False}


@activity.defn
@monitored_activity(name="get_bookings_in_timeframe")
@django_activity
def get_bookings_in_timeframe(
    start_time: str,
    end_time: str,
) -> List[Dict[str, Any]]:
    """
    Get bookings within a specific time frame.
    
    Args:
        start_time: Start of time window (ISO format)
        end_time: End of time window (ISO format)
        
    Returns:
        List of bookings in the time frame
    """
    from apps.bookings.models import Booking
    
    try:
        # Parse time range
        start_time_dt = datetime.fromisoformat(start_time)
        end_time_dt = datetime.fromisoformat(end_time)
        
        # Get bookings in the time range
        bookings = Booking.objects.filter(
            session_time__gte=start_time_dt,
            session_time__lt=end_time_dt,
            status="confirmed"
        )
        
        # Convert to list of dicts for serialization
        result = []
        for booking in bookings:
            result.append({
                "id": booking.id,
                "practitioner_id": booking.practitioner_id,
                "client_id": booking.client_id,
                "session_time": booking.session_time.isoformat(),
                "duration_minutes": booking.duration_minutes,
                "service_type_id": booking.service_type_id,
                "status": booking.status,
            })
        
        return result
    except Exception as e:
        activity.logger.error(f"Error getting bookings in timeframe: {str(e)}")
        return []


@activity.defn
@monitored_activity(name="send_reminder")
@django_activity
def send_reminder(booking_id: int, reminder_type: str) -> Dict[str, Any]:
    """
    Send a reminder for a booking.
    
    Args:
        booking_id: ID of the booking
        reminder_type: Type of reminder to send
        
    Returns:
        Dict with notification results
    """
    from apps.bookings.models import Booking
    from apps.notifications.services import NotificationService
    
    try:
        booking = Booking.objects.get(id=booking_id)
        notification_service = NotificationService()
        
        # Only send reminders for confirmed bookings
        if booking.status != "confirmed":
            return {
                "booking_id": booking_id,
                "success": False,
                "reason": f"Booking has status {booking.status}, not sending reminder"
            }
        
        # Map reminder types to notification types
        notification_types = {
            "upcoming_session": "session_reminder",
            "day_before": "day_before_reminder",
            "hour_before": "hour_before_reminder",
        }
        
        notification_type = notification_types.get(reminder_type)
        if not notification_type:
            return {
                "booking_id": booking_id,
                "success": False,
                "reason": f"Unknown reminder type: {reminder_type}"
            }
        
        # Send reminder to client
        client_result = notification_service.send_notification(
            recipient=booking.client,
            notification_type=notification_type,
            context={
                "booking": booking,
                "practitioner_name": booking.practitioner.get_full_name(),
                "session_time": booking.session_time,
                "duration_minutes": booking.duration_minutes,
            }
        )
        
        # Log the reminder
        booking.add_log_entry(
            action=f"{reminder_type}_reminder_sent",
            actor=None,  # System action
            details={"notification_id": client_result.get("notification_id")}
        )
        
        return {
            "booking_id": booking_id,
            "reminder_type": reminder_type,
            "notification_sent": client_result.get("success", False),
            "success": True
        }
    except Booking.DoesNotExist:
        activity.logger.error(f"Booking {booking_id} not found")
        return {"error": f"Booking {booking_id} not found", "success": False}
    except Exception as e:
        activity.logger.error(f"Error sending reminder: {str(e)}")
        return {"error": str(e), "success": False}
