"""
Temporal workflows for the bookings domain.

This module defines Temporal workflows for managing the booking lifecycle,
including creation, confirmation, reminders, and follow-ups.
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
        from .temporal_activities import get_booking_details
        
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
        
        # Import activities
        from .temporal_activities import send_booking_confirmation
        
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
                
                # Import and send reminder
                from .temporal_activities import send_session_reminder
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
        from .temporal_activities import get_session_status
        session_status = await self.execute_activity_with_logging(
            get_session_status,
            booking_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        if session_status.get("status") == "completed":
            # Send follow-up and feedback request
            from .temporal_activities import send_session_followup
            await self.execute_activity_with_logging(
                send_session_followup,
                booking_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            # Wait for feedback window
            await workflow.sleep(timedelta(days=3))
            
            # Check if feedback was provided
            from .temporal_activities import check_feedback_status
            feedback_status = await self.execute_activity_with_logging(
                check_feedback_status,
                booking_id,
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            if not feedback_status.get("feedback_provided", False):
                # Send feedback reminder
                from .temporal_activities import send_feedback_reminder
                await self.execute_activity_with_logging(
                    send_feedback_reminder,
                    booking_id,
                    start_to_close_timeout=timedelta(seconds=30),
                )
        elif session_status.get("status") == "no_show":
            # Handle no-show
            from .temporal_activities import handle_no_show
            await self.execute_activity_with_logging(
                handle_no_show,
                booking_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        
        # Complete the workflow
        workflow.logger.info(f"Completed booking lifecycle workflow for booking {booking_id}")
        return {"booking_id": booking_id, "status": "completed"}


@workflow.defn
@monitored_workflow(name="ReschedulingWorkflow")
class ReschedulingWorkflow(BaseWorkflow):
    """
    Workflow for handling booking rescheduling.
    
    This workflow manages the rescheduling process, including:
    - Cancellation of the original booking
    - Creation of the new booking
    - Notifications to all parties
    """
    
    @workflow.run
    async def run(
        self, 
        original_booking_id: int, 
        new_session_time: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute the rescheduling workflow.
        
        Args:
            original_booking_id: ID of the original booking
            new_session_time: New session time (ISO format)
            reason: Optional reason for rescheduling
            
        Returns:
            Dict with workflow execution results
        """
        workflow.logger.info(f"Starting rescheduling workflow for booking {original_booking_id}")
        
        # Get original booking details
        from .temporal_activities import get_booking_details
        original_booking = await self.execute_activity_with_logging(
            get_booking_details,
            original_booking_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Cancel the original booking
        from .temporal_activities import cancel_booking
        await self.execute_activity_with_logging(
            cancel_booking,
            original_booking_id,
            reason or "Rescheduled",
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Create a new booking
        from .temporal_activities import create_booking
        new_booking = await self.execute_activity_with_logging(
            create_booking,
            original_booking.get("practitioner_id"),
            original_booking.get("client_id"),
            new_session_time,
            original_booking.get("duration_minutes"),
            original_booking.get("service_type_id"),
            True,  # is_rescheduled
            original_booking_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Send rescheduling notifications
        from .temporal_activities import send_rescheduling_notification
        await self.execute_activity_with_logging(
            send_rescheduling_notification,
            original_booking_id,
            new_booking.get("id"),
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Complete the workflow
        workflow.logger.info(
            f"Completed rescheduling workflow: {original_booking_id} -> {new_booking.get('id')}"
        )
        return {
            "original_booking_id": original_booking_id,
            "new_booking_id": new_booking.get("id"),
            "status": "completed"
        }


@workflow.defn
@monitored_workflow(name="BatchReminderWorkflow")
class BatchReminderWorkflow(BaseWorkflow):
    """
    Workflow for sending batch reminders for upcoming sessions.
    
    This workflow sends reminders for all sessions scheduled within a specific time window.
    """
    
    @workflow.run
    async def run(
        self,
        start_time: str,
        end_time: str,
        reminder_type: str = "upcoming_session"
    ) -> Dict[str, Any]:
        """
        Execute the batch reminder workflow.
        
        Args:
            start_time: Start of time window (ISO format)
            end_time: End of time window (ISO format)
            reminder_type: Type of reminder to send
            
        Returns:
            Dict with workflow execution results
        """
        workflow.logger.info(f"Starting batch reminder workflow for {reminder_type}")
        
        # Get bookings in the time window
        from .temporal_activities import get_bookings_in_timeframe
        bookings = await self.execute_activity_with_logging(
            get_bookings_in_timeframe,
            start_time,
            end_time,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Send reminders for each booking
        results = []
        for booking in bookings:
            from .temporal_activities import send_reminder
            result = await self.execute_activity_with_logging(
                send_reminder,
                booking.get("id"),
                reminder_type,
                start_to_close_timeout=timedelta(seconds=30),
            )
            results.append(result)
        
        # Complete the workflow
        workflow.logger.info(
            f"Completed batch reminder workflow: sent {len(results)} reminders"
        )
        return {
            "reminder_type": reminder_type,
            "booking_count": len(results),
            "successful_count": sum(1 for r in results if r.get("success", False)),
            "status": "completed"
        }
