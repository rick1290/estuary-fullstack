"""
Booking-related workflows for the Estuary platform.
Handles the complete lifecycle of bookings from creation to completion.
"""
from temporalio import workflow
from temporalio.common import RetryPolicy
from datetime import timedelta, datetime
from typing import Dict, Any, Optional
import logging

with workflow.unsafe.imports_passed_through():
    from bookings.models import Booking
    from .activities import (
        validate_booking,
        send_booking_confirmation,
        send_booking_reminder,
        create_room_for_booking,
        check_participant_attendance,
        process_no_show,
        complete_booking,
        calculate_practitioner_earnings,
        send_post_session_survey,
        ACTIVITIES as BOOKING_ACTIVITIES
    )

logger = logging.getLogger(__name__)


@workflow.defn
class BookingLifecycleWorkflow:
    """
    Manages the complete lifecycle of a booking from confirmation to completion.
    
    Steps:
    1. Send confirmation email/SMS
    2. Send reminder 48 hours before
    3. Create LiveKit room 15 minutes before
    4. Monitor attendance
    5. Handle no-shows
    6. Process completion
    7. Calculate earnings
    8. Send follow-up survey
    """
    
    def __init__(self):
        self.booking_id: Optional[str] = None
        self.booking_data: Optional[Dict[str, Any]] = None
    
    @workflow.run
    async def run(self, booking_id: str) -> Dict[str, Any]:
        """
        Execute the booking lifecycle workflow.
        
        Args:
            booking_id: ID of the booking to process
            
        Returns:
            Dict with workflow results
        """
        self.booking_id = booking_id
        workflow.logger.info(f"Starting BookingLifecycleWorkflow for booking {booking_id}")
        
        # Step 1: Validate and get booking data
        self.booking_data = await workflow.execute_activity(
            validate_booking,
            booking_id,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        
        if not self.booking_data:
            return {"status": "failed", "reason": "Booking not found or invalid"}
        
        # Step 2: Send confirmation
        await workflow.execute_activity(
            send_booking_confirmation,
            booking_id,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        
        # Step 3: Wait until 48 hours before session
        session_time = datetime.fromisoformat(self.booking_data['start_time'])
        reminder_time = session_time - timedelta(hours=48)
        
        await workflow.sleep_until(reminder_time)
        
        # Step 4: Send reminder
        await workflow.execute_activity(
            send_booking_reminder,
            booking_id,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        
        # Step 5: Wait until 15 minutes before session
        room_creation_time = session_time - timedelta(minutes=15)
        await workflow.sleep_until(room_creation_time)
        
        # Step 6: Create LiveKit room
        room_data = await workflow.execute_activity(
            create_room_for_booking,
            booking_id,
            start_to_close_timeout=timedelta(minutes=2),
            retry_policy=RetryPolicy(maximum_attempts=3)
        )
        
        # Step 7: Wait for session start time
        await workflow.sleep_until(session_time)
        
        # Step 8: Monitor attendance (check after 15 minutes)
        await workflow.sleep(timedelta(minutes=15))
        
        attendance = await workflow.execute_activity(
            check_participant_attendance,
            booking_id,
            start_to_close_timeout=timedelta(seconds=30)
        )
        
        if not attendance['client_joined']:
            # Handle no-show
            await workflow.execute_activity(
                process_no_show,
                booking_id,
                start_to_close_timeout=timedelta(minutes=5)
            )
            return {"status": "no_show", "booking_id": booking_id}
        
        # Step 9: Wait for session to complete
        session_duration = timedelta(minutes=self.booking_data.get('duration_minutes', 60))
        await workflow.sleep(session_duration)
        
        # Step 10: Complete booking
        await workflow.execute_activity(
            complete_booking,
            booking_id,
            start_to_close_timeout=timedelta(minutes=5)
        )
        
        # Step 11: Calculate earnings
        earnings_data = await workflow.execute_activity(
            calculate_practitioner_earnings,
            booking_id,
            start_to_close_timeout=timedelta(minutes=2)
        )
        
        # Step 12: Send post-session survey (next day)
        await workflow.sleep(timedelta(hours=24))
        
        await workflow.execute_activity(
            send_post_session_survey,
            booking_id,
            start_to_close_timeout=timedelta(minutes=5)
        )
        
        return {
            "status": "completed",
            "booking_id": booking_id,
            "earnings": earnings_data,
            "completed_at": datetime.utcnow().isoformat()
        }


@workflow.defn
class BookingReminderWorkflow:
    """
    Standalone workflow for sending booking reminders.
    Can be used for bulk reminder processing.
    """
    
    @workflow.run
    async def run(self, booking_ids: list[str]) -> Dict[str, Any]:
        """Send reminders for multiple bookings."""
        results = []
        
        for booking_id in booking_ids:
            try:
                await workflow.execute_activity(
                    send_booking_reminder,
                    booking_id,
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=RetryPolicy(maximum_attempts=3)
                )
                results.append({"booking_id": booking_id, "status": "sent"})
            except Exception as e:
                results.append({"booking_id": booking_id, "status": "failed", "error": str(e)})
        
        return {
            "total": len(booking_ids),
            "sent": len([r for r in results if r["status"] == "sent"]),
            "failed": len([r for r in results if r["status"] == "failed"]),
            "results": results
        }


@workflow.defn
class NoShowWorkflow:
    """
    Handles no-show scenarios with retry logic and recovery options.
    """
    
    @workflow.run
    async def run(self, booking_id: str) -> Dict[str, Any]:
        """
        Handle a no-show booking.
        
        Steps:
        1. Send "having trouble?" message with dial-in info
        2. Wait 5 more minutes
        3. If still no show, process cancellation
        4. Offer reschedule options
        """
        workflow.logger.info(f"Processing no-show for booking {booking_id}")
        
        # Step 1: Send recovery message
        await workflow.execute_activity(
            "send_no_show_recovery_message",
            booking_id,
            start_to_close_timeout=timedelta(minutes=2)
        )
        
        # Step 2: Wait 5 more minutes
        await workflow.sleep(timedelta(minutes=5))
        
        # Step 3: Check attendance again
        attendance = await workflow.execute_activity(
            check_participant_attendance,
            booking_id,
            start_to_close_timeout=timedelta(seconds=30)
        )
        
        if attendance['client_joined']:
            # Client joined late
            return {"status": "recovered", "booking_id": booking_id}
        
        # Step 4: Process as no-show
        await workflow.execute_activity(
            process_no_show,
            booking_id,
            start_to_close_timeout=timedelta(minutes=5)
        )
        
        # Step 5: Send reschedule options
        await workflow.execute_activity(
            "send_reschedule_options",
            booking_id,
            start_to_close_timeout=timedelta(minutes=5)
        )
        
        return {
            "status": "no_show_processed",
            "booking_id": booking_id,
            "reschedule_sent": True
        }


# Export all workflows
WORKFLOWS = [
    BookingLifecycleWorkflow,
    BookingReminderWorkflow,
    NoShowWorkflow,
]