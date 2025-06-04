"""
Temporal workflows for the practitioners domain.

This module defines Temporal workflows for managing practitioner-related processes,
including onboarding, verification, and subscription management.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from temporalio import workflow
from temporalio.common import RetryPolicy

from apps.integrations.temporal.base_workflows import BaseWorkflow
from apps.integrations.temporal.decorators import monitored_workflow

logger = logging.getLogger(__name__)


@workflow.defn
@monitored_workflow(name="PractitionerOnboardingWorkflow")
class PractitionerOnboardingWorkflow(BaseWorkflow):
    """
    Workflow for managing the practitioner onboarding process.
    
    This workflow handles the complete onboarding journey, including:
    - Profile completion
    - Document verification
    - Background check
    - Training completion
    - Subscription setup
    - Service configuration
    """
    
    @workflow.run
    async def run(self, practitioner_id: int) -> Dict[str, Any]:
        """
        Execute the practitioner onboarding workflow.
        
        Args:
            practitioner_id: ID of the practitioner to onboard
            
        Returns:
            Dict with workflow execution results
        """
        workflow.logger.info(f"Starting practitioner onboarding workflow for {practitioner_id}")
        
        # Get practitioner details
        practitioner = await self.execute_activity(
            "get_practitioner_details",
            practitioner_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Track onboarding progress
        onboarding_progress = {
            "practitioner_id": practitioner_id,
            "steps_completed": [],
            "current_step": "profile_completion",
            "started_at": datetime.utcnow().isoformat(),
        }
        
        # Step 1: Profile completion
        profile_result = await self.execute_activity(
            "check_profile_completion",
            practitioner_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        if not profile_result.get("is_complete", False):
            # Send profile completion reminder
            await self.execute_activity(
                "send_profile_completion_reminder",
                practitioner_id,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            # Wait for profile completion (check every day for up to 14 days)
            profile_completed = False
            for _ in range(14):
                await workflow.sleep(timedelta(days=1))
                
                check_result = await self.execute_activity(
                    "check_profile_completion",
                    practitioner_id,
                    start_to_close_timeout=timedelta(seconds=10),
                )
                
                if check_result.get("is_complete", False):
                    profile_completed = True
                    break
            
            if not profile_completed:
                # Profile not completed within timeframe
                await self.execute_activity(
                    "mark_onboarding_stalled",
                    practitioner_id,
                    reason="Profile not completed within 14 days",
                    start_to_close_timeout=timedelta(seconds=10),
                )
                
                return {
                    "practitioner_id": practitioner_id,
                    "status": "stalled",
                    "reason": "Profile not completed within 14 days",
                    "steps_completed": [],
                }
        
        # Mark profile completion step as completed
        onboarding_progress["steps_completed"].append("profile_completion")
        onboarding_progress["current_step"] = "document_verification"
        
        # Update onboarding progress
        await self.execute_activity(
            "update_onboarding_progress",
            practitioner_id,
            onboarding_progress,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Step 2: Document verification
        onboarding_progress["current_step"] = "document_verification"
        
        # Request document verification
        await self.execute_activity(
            "request_document_verification",
            practitioner_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Wait for document verification (check every day for up to 14 days)
        verification_completed = False
        for _ in range(14):
            await workflow.sleep(timedelta(days=1))
            
            check_result = await self.execute_activity(
                "check_document_verification",
                practitioner_id,
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            if check_result.get("is_verified", False):
                verification_completed = True
                break
        
        if not verification_completed:
            # Document verification not completed within timeframe
            await self.execute_activity(
                "mark_onboarding_stalled",
                practitioner_id,
                reason="Document verification not completed within 14 days",
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            return {
                "practitioner_id": practitioner_id,
                "status": "stalled",
                "reason": "Document verification not completed within 14 days",
                "steps_completed": onboarding_progress["steps_completed"],
            }
        
        # Mark document verification step as completed
        onboarding_progress["steps_completed"].append("document_verification")
        onboarding_progress["current_step"] = "background_check"
        
        # Update onboarding progress
        await self.execute_activity(
            "update_onboarding_progress",
            practitioner_id,
            onboarding_progress,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Step 3: Background check
        # Initiate background check
        await self.execute_activity(
            "initiate_background_check",
            practitioner_id,
            start_to_close_timeout=timedelta(minutes=1),
        )
        
        # Wait for background check completion (check every 2 days for up to 30 days)
        background_check_completed = False
        for _ in range(15):
            await workflow.sleep(timedelta(days=2))
            
            check_result = await self.execute_activity(
                "check_background_check_status",
                practitioner_id,
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            if check_result.get("is_complete", False):
                background_check_completed = True
                
                # Check if background check was passed
                if not check_result.get("is_passed", False):
                    # Background check failed
                    await self.execute_activity(
                        "mark_onboarding_rejected",
                        practitioner_id,
                        reason="Background check failed",
                        start_to_close_timeout=timedelta(seconds=10),
                    )
                    
                    return {
                        "practitioner_id": practitioner_id,
                        "status": "rejected",
                        "reason": "Background check failed",
                        "steps_completed": onboarding_progress["steps_completed"],
                    }
                
                break
        
        if not background_check_completed:
            # Background check not completed within timeframe
            await self.execute_activity(
                "mark_onboarding_stalled",
                practitioner_id,
                reason="Background check not completed within 30 days",
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            return {
                "practitioner_id": practitioner_id,
                "status": "stalled",
                "reason": "Background check not completed within 30 days",
                "steps_completed": onboarding_progress["steps_completed"],
            }
        
        # Mark background check step as completed
        onboarding_progress["steps_completed"].append("background_check")
        onboarding_progress["current_step"] = "training_completion"
        
        # Update onboarding progress
        await self.execute_activity(
            "update_onboarding_progress",
            practitioner_id,
            onboarding_progress,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Step 4: Training completion
        # Assign training modules
        await self.execute_activity(
            "assign_training_modules",
            practitioner_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Wait for training completion (check every 3 days for up to 30 days)
        training_completed = False
        for _ in range(10):
            await workflow.sleep(timedelta(days=3))
            
            check_result = await self.execute_activity(
                "check_training_completion",
                practitioner_id,
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            if check_result.get("is_complete", False):
                training_completed = True
                break
        
        if not training_completed:
            # Training not completed within timeframe
            await self.execute_activity(
                "mark_onboarding_stalled",
                practitioner_id,
                reason="Training not completed within 30 days",
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            return {
                "practitioner_id": practitioner_id,
                "status": "stalled",
                "reason": "Training not completed within 30 days",
                "steps_completed": onboarding_progress["steps_completed"],
            }
        
        # Mark training completion step as completed
        onboarding_progress["steps_completed"].append("training_completion")
        onboarding_progress["current_step"] = "subscription_setup"
        
        # Update onboarding progress
        await self.execute_activity(
            "update_onboarding_progress",
            practitioner_id,
            onboarding_progress,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Step 5: Subscription setup
        # Get available subscription tiers
        tiers = await self.execute_activity(
            "get_subscription_tiers",
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Send subscription setup notification
        await self.execute_activity(
            "send_subscription_setup_notification",
            practitioner_id,
            tiers=tiers,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Wait for subscription setup (check every day for up to 7 days)
        subscription_completed = False
        for _ in range(7):
            await workflow.sleep(timedelta(days=1))
            
            check_result = await self.execute_activity(
                "check_subscription_status",
                practitioner_id,
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            if check_result.get("has_subscription", False):
                subscription_completed = True
                break
        
        if not subscription_completed:
            # Subscription not set up within timeframe
            await self.execute_activity(
                "mark_onboarding_stalled",
                practitioner_id,
                reason="Subscription not set up within 7 days",
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            return {
                "practitioner_id": practitioner_id,
                "status": "stalled",
                "reason": "Subscription not set up within 7 days",
                "steps_completed": onboarding_progress["steps_completed"],
            }
        
        # Mark subscription setup step as completed
        onboarding_progress["steps_completed"].append("subscription_setup")
        onboarding_progress["current_step"] = "service_configuration"
        
        # Update onboarding progress
        await self.execute_activity(
            "update_onboarding_progress",
            practitioner_id,
            onboarding_progress,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Step 6: Service configuration
        # Send service configuration notification
        await self.execute_activity(
            "send_service_configuration_notification",
            practitioner_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Wait for service configuration (check every day for up to 7 days)
        service_config_completed = False
        for _ in range(7):
            await workflow.sleep(timedelta(days=1))
            
            check_result = await self.execute_activity(
                "check_service_configuration",
                practitioner_id,
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            if check_result.get("is_configured", False):
                service_config_completed = True
                break
        
        if not service_config_completed:
            # Service configuration not completed within timeframe
            await self.execute_activity(
                "mark_onboarding_stalled",
                practitioner_id,
                reason="Service configuration not completed within 7 days",
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            return {
                "practitioner_id": practitioner_id,
                "status": "stalled",
                "reason": "Service configuration not completed within 7 days",
                "steps_completed": onboarding_progress["steps_completed"],
            }
        
        # Mark service configuration step as completed
        onboarding_progress["steps_completed"].append("service_configuration")
        onboarding_progress["current_step"] = "completed"
        
        # Update onboarding progress
        await self.execute_activity(
            "update_onboarding_progress",
            practitioner_id,
            onboarding_progress,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        # Complete onboarding
        await self.execute_activity(
            "complete_practitioner_onboarding",
            practitioner_id,
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        # Complete the workflow
        workflow.logger.info(f"Completed practitioner onboarding workflow for {practitioner_id}")
        return {
            "practitioner_id": practitioner_id,
            "status": "completed",
            "steps_completed": onboarding_progress["steps_completed"],
            "completed_at": datetime.utcnow().isoformat(),
        }


@workflow.defn
@monitored_workflow(name="SubscriptionRenewalWorkflow")
class SubscriptionRenewalWorkflow(BaseWorkflow):
    """
    Workflow for managing practitioner subscription renewals.
    
    This workflow handles the subscription renewal process, including:
    - Pre-renewal notifications
    - Payment processing
    - Renewal confirmation
    - Failed renewal handling
    """
    
    @workflow.run
    async def run(self, subscription_id: int) -> Dict[str, Any]:
        """
        Execute the subscription renewal workflow.
        
        Args:
            subscription_id: ID of the subscription to renew
            
        Returns:
            Dict with workflow execution results
        """
        workflow.logger.info(f"Starting subscription renewal workflow for {subscription_id}")
        
        # Get subscription details
        subscription = await self.execute_activity(
            "get_subscription_details",
            subscription_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        practitioner_id = subscription.get("practitioner_id")
        end_date = datetime.fromisoformat(subscription.get("end_date"))
        
        # Calculate time until renewal
        now = datetime.utcnow()
        days_until_renewal = (end_date - now).days
        
        # Send renewal reminder 14 days before expiration
        if days_until_renewal >= 14:
            time_until_reminder = (end_date - timedelta(days=14) - now).total_seconds()
            await workflow.sleep(timedelta(seconds=time_until_reminder))
            
            await self.execute_activity(
                "send_subscription_renewal_reminder",
                subscription_id,
                days_remaining=14,
                start_to_close_timeout=timedelta(seconds=30),
            )
        
        # Send renewal reminder 7 days before expiration
        if days_until_renewal >= 7:
            time_until_reminder = (end_date - timedelta(days=7) - now).total_seconds()
            await workflow.sleep(timedelta(seconds=time_until_reminder))
            
            await self.execute_activity(
                "send_subscription_renewal_reminder",
                subscription_id,
                days_remaining=7,
                start_to_close_timeout=timedelta(seconds=30),
            )
        
        # Send renewal reminder 3 days before expiration
        if days_until_renewal >= 3:
            time_until_reminder = (end_date - timedelta(days=3) - now).total_seconds()
            await workflow.sleep(timedelta(seconds=time_until_reminder))
            
            await self.execute_activity(
                "send_subscription_renewal_reminder",
                subscription_id,
                days_remaining=3,
                start_to_close_timeout=timedelta(seconds=30),
            )
        
        # Send renewal reminder 1 day before expiration
        if days_until_renewal >= 1:
            time_until_reminder = (end_date - timedelta(days=1) - now).total_seconds()
            await workflow.sleep(timedelta(seconds=time_until_reminder))
            
            await self.execute_activity(
                "send_subscription_renewal_reminder",
                subscription_id,
                days_remaining=1,
                start_to_close_timeout=timedelta(seconds=30),
            )
        
        # Wait until renewal date
        time_until_renewal = (end_date - now).total_seconds()
        if time_until_renewal > 0:
            await workflow.sleep(timedelta(seconds=time_until_renewal))
        
        # Process renewal
        renewal_result = await self.execute_activity(
            "process_subscription_renewal",
            subscription_id,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                initial_interval=timedelta(seconds=10),
                maximum_interval=timedelta(minutes=1),
                backoff_coefficient=2.0,
            ),
        )
        
        if renewal_result.get("success", False):
            # Renewal successful
            await self.execute_activity(
                "send_renewal_confirmation",
                subscription_id,
                renewal_result=renewal_result,
                start_to_close_timeout=timedelta(seconds=30),
            )
        else:
            # Renewal failed
            await self.execute_activity(
                "handle_failed_renewal",
                subscription_id,
                renewal_result=renewal_result,
                start_to_close_timeout=timedelta(seconds=30),
            )
            
            # Try again in 24 hours for up to 3 days
            for i in range(3):
                await workflow.sleep(timedelta(days=1))
                
                # Check if subscription was manually renewed
                check_result = await self.execute_activity(
                    "check_subscription_status",
                    practitioner_id,
                    start_to_close_timeout=timedelta(seconds=10),
                )
                
                if check_result.get("is_active", False):
                    # Subscription was renewed
                    break
                
                # Try renewal again
                retry_result = await self.execute_activity(
                    "process_subscription_renewal",
                    subscription_id,
                    is_retry=True,
                    retry_count=i+1,
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=RetryPolicy(
                        maximum_attempts=3,
                        initial_interval=timedelta(seconds=10),
                        maximum_interval=timedelta(minutes=1),
                        backoff_coefficient=2.0,
                    ),
                )
                
                if retry_result.get("success", False):
                    # Retry successful
                    await self.execute_activity(
                        "send_renewal_confirmation",
                        subscription_id,
                        renewal_result=retry_result,
                        start_to_close_timeout=timedelta(seconds=30),
                    )
                    break
                else:
                    # Retry failed
                    await self.execute_activity(
                        "handle_failed_renewal",
                        subscription_id,
                        renewal_result=retry_result,
                        is_retry=True,
                        retry_count=i+1,
                        start_to_close_timeout=timedelta(seconds=30),
                    )
            
            # Final check after all retries
            final_check = await self.execute_activity(
                "check_subscription_status",
                practitioner_id,
                start_to_close_timeout=timedelta(seconds=10),
            )
            
            if not final_check.get("is_active", False):
                # Subscription expired
                await self.execute_activity(
                    "handle_subscription_expiration",
                    subscription_id,
                    start_to_close_timeout=timedelta(seconds=30),
                )
        
        # Complete the workflow
        workflow.logger.info(f"Completed subscription renewal workflow for {subscription_id}")
        
        final_status = await self.execute_activity(
            "get_subscription_details",
            subscription_id,
            start_to_close_timeout=timedelta(seconds=10),
        )
        
        return {
            "subscription_id": subscription_id,
            "practitioner_id": practitioner_id,
            "status": final_status.get("status"),
            "renewed_until": final_status.get("end_date"),
            "workflow_completed_at": datetime.utcnow().isoformat(),
        }
