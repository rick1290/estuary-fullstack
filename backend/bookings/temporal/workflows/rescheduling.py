"""
Rescheduling workflow for handling booking rescheduling.

This workflow manages the rescheduling process, including:
- Cancellation of the original booking
- Creation of the new booking
- Notifications to all parties
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Any

from temporalio import workflow
from temporalio.common import RetryPolicy

from integrations.temporal.base_workflows import BaseWorkflow
from integrations.temporal.decorators import monitored_workflow

logger = logging.getLogger(__name__)


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
        
        # Import activities
        from bookings.temporal.activities.booking_details import get_booking_details
        from bookings.temporal.activities.booking_management import (
            cancel_booking,
            create_booking
        )
        from bookings.temporal.activities.notifications import send_rescheduling_notification
        
        # Get original booking details
        original_booking = await self.execute_activity_with_logging(
            get_booking_details,
            original_booking_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Cancel the original booking
        await self.execute_activity_with_logging(
            cancel_booking,
            original_booking_id,
            reason or "Rescheduled",
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Create a new booking
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