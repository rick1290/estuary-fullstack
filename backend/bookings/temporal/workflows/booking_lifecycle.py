"""
Booking lifecycle workflow for managing the complete lifecycle of a booking.

This workflow handles the entire booking lifecycle, including:
- Initial confirmation
- Pre-session reminders
- Post-session follow-ups
- Feedback collection
- No-show handling
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from temporalio import workflow
from temporalio.common import RetryPolicy

from integrations.temporal.base_workflows import BaseWorkflow
from integrations.temporal.decorators import monitored_workflow

logger = logging.getLogger(__name__)


@workflow.defn
@monitored_workflow(name="BookingLifecycleWorkflow")
class BookingLifecycleWorkflow(BaseWorkflow):
    """
    Workflow for managing the complete lifecycle of a booking.
    
    This workflow handles the entire booking lifecycle, including:
    - Initial confirmation
    - Pre-session reminders
    - Post-session follow-ups
    - Feedback collection
    - No-show handling
    """
    
    @workflow.run
    async def run(self, booking_id: int) -> Dict[str, Any]:
        """
        Execute the booking lifecycle workflow.
        
        Args:
            booking_id: ID of the booking to manage
            
        Returns:
            Dict with workflow execution results
        """
        workflow.logger.info(f"Starting booking lifecycle workflow for booking {booking_id}")
        
        # Import activities
        from bookings.temporal.activities.booking_details import get_booking_details
        from bookings.temporal.activities.notifications import (
            send_booking_confirmation,
            send_session_reminder,
            send_session_followup,
            send_feedback_reminder
        )
        from bookings.temporal.activities.session_management import (
            get_session_status,
            check_feedback_status,
            handle_no_show
        )
        
        # Get booking details
        booking = await self.execute_activity_with_logging(
            get_booking_details,
            booking_id,
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(seconds=10),
                backoff_coefficient=2.0,
            ),
        )
        
        # Send booking confirmation
        await self.execute_activity_with_logging(
            send_booking_confirmation,
            booking_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Schedule pre-session reminder
        if booking.get("session_time"):
            session_time = datetime.fromisoformat(booking["session_time"])
            reminder_time = session_time - timedelta(hours=24)
            
            # Calculate time until reminder
            now = datetime.utcnow()
            if reminder_time > now:
                time_until_reminder = (reminder_time - now).total_seconds()
                await workflow.sleep(timedelta(seconds=time_until_reminder))
                
                # Send reminder
                await self.execute_activity_with_logging(
                    send_session_reminder,
                    booking_id,
                    start_to_close_timeout=timedelta(seconds=30),
                )
        
        # Wait for session to complete
        if booking.get("session_time"):
            session_time = datetime.fromisoformat(booking["session_time"])
            session_duration = timedelta(minutes=booking.get("duration_minutes", 60))
            session_end_time = session_time + session_duration
            
            # Calculate time until session end
            now = datetime.utcnow()
            if session_end_time > now:
                time_until_session_end = (session_end_time - now).total_seconds()
                await workflow.sleep(timedelta(seconds=time_until_session_end))
        
        # Check if session was marked as completed
        session_status = await self.execute_activity_with_logging(
            get_session_status,
            booking_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        if session_status.get("status") == "completed":
            # Send follow-up and feedback request
            await self.execute_activity_with_logging(
                send_session_followup,
                booking_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            # Wait for feedback window
            await workflow.sleep(timedelta(days=3))
            
            # Check if feedback was provided
            feedback_status = await self.execute_activity_with_logging(
                check_feedback_status,
                booking_id,
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            if not feedback_status.get("feedback_provided", False):
                # Send feedback reminder
                await self.execute_activity_with_logging(
                    send_feedback_reminder,
                    booking_id,
                    start_to_close_timeout=timedelta(seconds=30),
                )
        elif session_status.get("status") == "no_show":
            # Handle no-show
            await self.execute_activity_with_logging(
                handle_no_show,
                booking_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        
        # Complete the workflow
        workflow.logger.info(f"Completed booking lifecycle workflow for booking {booking_id}")
        return {"booking_id": booking_id, "status": "completed"}