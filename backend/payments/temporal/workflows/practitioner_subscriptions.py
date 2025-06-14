"""
Temporal workflows for practitioner subscription management.

This module defines workflows for managing practitioner subscription events,
including creation, updates, cancellations, and payment events.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from temporalio import workflow
from temporalio.common import RetryPolicy

from integrations.temporal.base_workflows import BaseWorkflow
from integrations.temporal.decorators import monitored_workflow

logger = logging.getLogger(__name__)


@workflow.defn
@monitored_workflow(name="PractitionerSubscriptionWorkflow")
class PractitionerSubscriptionWorkflow(BaseWorkflow):
    """
    Workflow for handling practitioner subscription lifecycle events.
    
    This workflow processes various subscription events triggered by Stripe webhooks:
    - Subscription created
    - Subscription updated (tier changes)
    - Subscription canceled
    - Payment succeeded
    - Payment failed
    """
    
    @workflow.run
    async def run(self, practitioner_id: str, event_type: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the practitioner subscription workflow based on event type.
        
        Args:
            practitioner_id: ID of the practitioner
            event_type: Type of subscription event
            metadata: Event-specific metadata
            
        Returns:
            Dict with workflow execution results
        """
        workflow.logger.info(
            f"Starting subscription workflow for practitioner {practitioner_id}, "
            f"event: {event_type}"
        )
        
        # Route to appropriate handler based on event type
        if event_type == "created":
            return await self.handle_subscription_created(practitioner_id, metadata)
        elif event_type == "tier_changed":
            return await self.handle_tier_changed(practitioner_id, metadata)
        elif event_type == "canceled":
            return await self.handle_subscription_canceled(practitioner_id, metadata)
        elif event_type == "payment_succeeded":
            return await self.handle_payment_succeeded(practitioner_id, metadata)
        elif event_type == "payment_failed":
            return await self.handle_payment_failed(practitioner_id, metadata)
        else:
            workflow.logger.warning(f"Unknown event type: {event_type}")
            return {
                "practitioner_id": practitioner_id,
                "event_type": event_type,
                "status": "ignored",
                "reason": f"Unknown event type: {event_type}"
            }
    
    async def handle_subscription_created(
        self, 
        practitioner_id: str, 
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle new subscription creation."""
        tier_name = metadata.get("tier_name", "Unknown")
        subscription_id = metadata.get("subscription_id")
        
        # Send welcome email for new subscription
        await self.execute_activity(
            "send_subscription_welcome_email",
            practitioner_id=practitioner_id,
            tier_name=tier_name,
            subscription_id=subscription_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Update practitioner status if needed
        await self.execute_activity(
            "update_practitioner_subscription_status",
            practitioner_id=practitioner_id,
            status="active",
            tier_name=tier_name,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Check if onboarding is complete
        onboarding_status = await self.execute_activity(
            "check_onboarding_completion",
            practitioner_id=practitioner_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        if not onboarding_status.get("is_complete", False):
            # Trigger next onboarding step
            await self.execute_activity(
                "trigger_next_onboarding_step",
                practitioner_id=practitioner_id,
                current_step="subscription_setup",
                start_to_close_timeout=timedelta(seconds=10),
            )
        
        # Log analytics event
        await self.execute_activity(
            "track_subscription_event",
            event_type="subscription_created",
            practitioner_id=practitioner_id,
            tier_name=tier_name,
            metadata=metadata,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        return {
            "practitioner_id": practitioner_id,
            "event_type": "created",
            "status": "completed",
            "tier_name": tier_name,
            "subscription_id": subscription_id,
            "completed_at": datetime.utcnow().isoformat()
        }
    
    async def handle_tier_changed(
        self, 
        practitioner_id: str, 
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle subscription tier change (upgrade/downgrade)."""
        old_tier = metadata.get("old_tier", "Unknown")
        new_tier = metadata.get("new_tier", "Unknown")
        subscription_id = metadata.get("subscription_id")
        
        # Send tier change notification
        await self.execute_activity(
            "send_tier_change_notification",
            practitioner_id=practitioner_id,
            old_tier=old_tier,
            new_tier=new_tier,
            subscription_id=subscription_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Update feature access
        await self.execute_activity(
            "update_practitioner_feature_access",
            practitioner_id=practitioner_id,
            new_tier=new_tier,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Handle tier-specific actions
        if new_tier == "Premium" and old_tier != "Premium":
            # Enable premium features
            await self.execute_activity(
                "enable_premium_features",
                practitioner_id=practitioner_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        elif old_tier == "Premium" and new_tier != "Premium":
            # Disable premium features
            await self.execute_activity(
                "disable_premium_features",
                practitioner_id=practitioner_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        
        # Log analytics event
        await self.execute_activity(
            "track_subscription_event",
            event_type="tier_changed",
            practitioner_id=practitioner_id,
            old_tier=old_tier,
            new_tier=new_tier,
            metadata=metadata,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        return {
            "practitioner_id": practitioner_id,
            "event_type": "tier_changed",
            "status": "completed",
            "old_tier": old_tier,
            "new_tier": new_tier,
            "subscription_id": subscription_id,
            "completed_at": datetime.utcnow().isoformat()
        }
    
    async def handle_subscription_canceled(
        self, 
        practitioner_id: str, 
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle subscription cancellation."""
        tier_name = metadata.get("tier_name", "Unknown")
        subscription_id = metadata.get("subscription_id")
        end_date = metadata.get("end_date")
        
        # Send cancellation confirmation
        await self.execute_activity(
            "send_subscription_cancellation_confirmation",
            practitioner_id=practitioner_id,
            tier_name=tier_name,
            end_date=end_date,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Schedule feature access removal for end date
        if end_date:
            # Calculate delay until end date
            end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            delay = (end_datetime - datetime.utcnow()).total_seconds()
            
            if delay > 0:
                # Wait until subscription end date
                await workflow.sleep(timedelta(seconds=delay))
            
            # Remove feature access
            await self.execute_activity(
                "remove_subscription_features",
                practitioner_id=practitioner_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            # Send expiration notification
            await self.execute_activity(
                "send_subscription_expired_notification",
                practitioner_id=practitioner_id,
                tier_name=tier_name,
                start_to_close_timeout=timedelta(seconds=30),
            )
        
        # Log analytics event
        await self.execute_activity(
            "track_subscription_event",
            event_type="subscription_canceled",
            practitioner_id=practitioner_id,
            tier_name=tier_name,
            end_date=end_date,
            metadata=metadata,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        return {
            "practitioner_id": practitioner_id,
            "event_type": "canceled",
            "status": "completed",
            "tier_name": tier_name,
            "subscription_id": subscription_id,
            "end_date": end_date,
            "completed_at": datetime.utcnow().isoformat()
        }
    
    async def handle_payment_succeeded(
        self, 
        practitioner_id: str, 
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle successful subscription payment."""
        invoice_id = metadata.get("invoice_id")
        amount = metadata.get("amount", 0)
        subscription_id = metadata.get("subscription_id")
        
        # Send payment receipt
        await self.execute_activity(
            "send_subscription_payment_receipt",
            practitioner_id=practitioner_id,
            invoice_id=invoice_id,
            amount=amount,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Update subscription status if it was past due
        await self.execute_activity(
            "update_subscription_payment_status",
            practitioner_id=practitioner_id,
            subscription_id=subscription_id,
            status="active",
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Log analytics event
        await self.execute_activity(
            "track_subscription_event",
            event_type="payment_succeeded",
            practitioner_id=practitioner_id,
            amount=amount,
            invoice_id=invoice_id,
            metadata=metadata,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        return {
            "practitioner_id": practitioner_id,
            "event_type": "payment_succeeded",
            "status": "completed",
            "invoice_id": invoice_id,
            "amount": amount,
            "subscription_id": subscription_id,
            "completed_at": datetime.utcnow().isoformat()
        }
    
    async def handle_payment_failed(
        self, 
        practitioner_id: str, 
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle failed subscription payment."""
        invoice_id = metadata.get("invoice_id")
        amount = metadata.get("amount", 0)
        subscription_id = metadata.get("subscription_id")
        attempt_count = metadata.get("attempt_count", 1)
        
        # Send payment failure notification
        await self.execute_activity(
            "send_subscription_payment_failed_notification",
            practitioner_id=practitioner_id,
            invoice_id=invoice_id,
            amount=amount,
            attempt_count=attempt_count,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Update subscription status
        await self.execute_activity(
            "update_subscription_payment_status",
            practitioner_id=practitioner_id,
            subscription_id=subscription_id,
            status="past_due",
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # If this is the 3rd attempt, schedule grace period actions
        if attempt_count >= 3:
            # Send final warning
            await self.execute_activity(
                "send_subscription_final_warning",
                practitioner_id=practitioner_id,
                subscription_id=subscription_id,
                grace_period_days=7,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            # Wait for grace period (7 days)
            await workflow.sleep(timedelta(days=7))
            
            # Check if payment was made
            payment_status = await self.execute_activity(
                "check_subscription_payment_status",
                subscription_id=subscription_id,
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            if not payment_status.get("is_paid", False):
                # Suspend subscription
                await self.execute_activity(
                    "suspend_subscription",
                    practitioner_id=practitioner_id,
                    subscription_id=subscription_id,
                    start_to_close_timeout=timedelta(seconds=30),
                )
                
                # Send suspension notification
                await self.execute_activity(
                    "send_subscription_suspended_notification",
                    practitioner_id=practitioner_id,
                    subscription_id=subscription_id,
                    start_to_close_timeout=timedelta(seconds=30),
                )
        
        # Log analytics event
        await self.execute_activity(
            "track_subscription_event",
            event_type="payment_failed",
            practitioner_id=practitioner_id,
            amount=amount,
            invoice_id=invoice_id,
            attempt_count=attempt_count,
            metadata=metadata,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        return {
            "practitioner_id": practitioner_id,
            "event_type": "payment_failed",
            "status": "completed",
            "invoice_id": invoice_id,
            "amount": amount,
            "subscription_id": subscription_id,
            "attempt_count": attempt_count,
            "completed_at": datetime.utcnow().isoformat()
        }


@workflow.defn
@monitored_workflow(name="SubscriptionTrialReminderWorkflow")
class SubscriptionTrialReminderWorkflow(BaseWorkflow):
    """
    Workflow for managing trial subscription reminders.
    
    Sends reminders at specific intervals before trial expiration.
    """
    
    @workflow.run
    async def run(self, practitioner_id: str, trial_end_date: str) -> Dict[str, Any]:
        """
        Execute trial reminder workflow.
        
        Args:
            practitioner_id: ID of the practitioner
            trial_end_date: ISO format date when trial ends
            
        Returns:
            Dict with workflow execution results
        """
        workflow.logger.info(
            f"Starting trial reminder workflow for practitioner {practitioner_id}"
        )
        
        # Parse trial end date
        trial_end = datetime.fromisoformat(trial_end_date.replace('Z', '+00:00'))
        
        # Calculate days until trial ends
        now = datetime.utcnow()
        days_until_end = (trial_end - now).days
        
        # Send reminders at specific intervals
        reminder_days = [7, 3, 1]  # Days before trial end
        
        for days_before in reminder_days:
            if days_until_end >= days_before:
                # Calculate when to send reminder
                reminder_time = trial_end - timedelta(days=days_before)
                delay = (reminder_time - datetime.utcnow()).total_seconds()
                
                if delay > 0:
                    await workflow.sleep(timedelta(seconds=delay))
                    
                    # Send trial reminder
                    await self.execute_activity(
                        "send_trial_ending_reminder",
                        practitioner_id=practitioner_id,
                        days_remaining=days_before,
                        trial_end_date=trial_end_date,
                        start_to_close_timeout=timedelta(seconds=30),
                    )
        
        # Wait until trial ends
        final_delay = (trial_end - datetime.utcnow()).total_seconds()
        if final_delay > 0:
            await workflow.sleep(timedelta(seconds=final_delay))
        
        # Check if subscription was created
        subscription_status = await self.execute_activity(
            "check_subscription_status",
            practitioner_id=practitioner_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        if not subscription_status.get("has_active_subscription", False):
            # Send trial expired notification
            await self.execute_activity(
                "send_trial_expired_notification",
                practitioner_id=practitioner_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            # Disable trial features
            await self.execute_activity(
                "disable_trial_features",
                practitioner_id=practitioner_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
        
        return {
            "practitioner_id": practitioner_id,
            "trial_end_date": trial_end_date,
            "subscription_created": subscription_status.get("has_active_subscription", False),
            "completed_at": datetime.utcnow().isoformat()
        }