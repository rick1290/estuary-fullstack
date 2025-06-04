"""
Temporal.io workflows for payment processing.

This module defines workflows for processing payments, including:
- Progressive package payouts
- Batch practitioner payouts
- Subscription renewal
"""
import logging
import uuid
from datetime import timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Any

from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ApplicationError
from temporalio.workflow import execute_activity, sleep

# Import activities that will be used by workflows
from .temporal_activities import (
    process_package_completion,
    process_partial_payout,
    process_practitioner_payout,
    process_subscription_renewal,
    send_payout_notification,
    record_transaction_error,
)

logger = logging.getLogger(__name__)

# Define retry policies
standard_retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    maximum_interval=timedelta(minutes=10),
    maximum_attempts=10,
    coefficient=2.0,
)

payment_retry_policy = RetryPolicy(
    initial_interval=timedelta(minutes=5),
    maximum_interval=timedelta(hours=24),
    maximum_attempts=20,
    coefficient=2.0,
)


@workflow.defn
class ProgressivePackagePayoutWorkflow:
    """
    Workflow for processing progressive payouts for package completions.
    
    This workflow monitors package completion and releases credits to practitioners
    as sessions are completed, with a final payout when the package is fully completed.
    """
    
    @workflow.run
    async def run(self, package_completion_id: int) -> Dict[str, Any]:
        """
        Run the progressive package payout workflow.
        
        Args:
            package_completion_id: ID of the PackageCompletionRecord
            
        Returns:
            Dict with workflow results
        """
        workflow.logger.info(f"Starting progressive payout workflow for package {package_completion_id}")
        
        # Get initial package completion status
        package_info = await execute_activity(
            process_package_completion,
            package_completion_id,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=standard_retry_policy,
        )
        
        total_sessions = package_info.get("total_sessions", 0)
        completed_sessions = package_info.get("completed_sessions", 0)
        last_payout_percentage = package_info.get("last_payout_percentage", 0)
        is_completed = package_info.get("is_completed", False)
        
        workflow.logger.info(
            f"Package {package_completion_id}: {completed_sessions}/{total_sessions} sessions completed, "
            f"last payout: {last_payout_percentage}%"
        )
        
        # If the package is already fully completed and paid out, we're done
        if is_completed and last_payout_percentage == 100:
            workflow.logger.info(f"Package {package_completion_id} already fully completed and paid out")
            return {"status": "completed", "package_id": package_completion_id}
        
        # Process partial payout if needed
        if completed_sessions > 0:
            current_percentage = int((completed_sessions / total_sessions) * 100)
            
            # Only process if there's a new percentage to pay out
            if current_percentage > last_payout_percentage:
                workflow.logger.info(
                    f"Processing partial payout for package {package_completion_id}: "
                    f"{current_percentage}% (previously {last_payout_percentage}%)"
                )
                
                payout_result = await execute_activity(
                    process_partial_payout,
                    package_completion_id,
                    current_percentage,
                    start_to_close_timeout=timedelta(minutes=10),
                    retry_policy=payment_retry_policy,
                )
                
                # Send notification to practitioner
                if payout_result.get("success"):
                    await execute_activity(
                        send_payout_notification,
                        payout_result.get("practitioner_id"),
                        f"Partial payout processed: {payout_result.get('amount')} credits for package completion",
                        start_to_close_timeout=timedelta(minutes=5),
                        retry_policy=standard_retry_policy,
                    )
        
        # If package is fully completed, process final payout
        if is_completed and last_payout_percentage < 100:
            workflow.logger.info(f"Processing final payout for package {package_completion_id}")
            
            final_payout_result = await execute_activity(
                process_partial_payout,
                package_completion_id,
                100,  # 100% completion
                start_to_close_timeout=timedelta(minutes=10),
                retry_policy=payment_retry_policy,
            )
            
            # Send notification to practitioner
            if final_payout_result.get("success"):
                await execute_activity(
                    send_payout_notification,
                    final_payout_result.get("practitioner_id"),
                    f"Final payout processed: {final_payout_result.get('amount')} credits for package completion",
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=standard_retry_policy,
                )
            
            return {
                "status": "completed",
                "package_id": package_completion_id,
                "final_payout": final_payout_result
            }
        
        # If package is not yet completed, we'll continue monitoring it
        # Schedule a timer to check again later
        await sleep(timedelta(hours=24))
        
        # Continue as a new workflow to avoid workflow history getting too large
        return await workflow.continue_as_new(package_completion_id)


@workflow.defn
class BatchPractitionerPayoutWorkflow:
    """
    Workflow for processing batch payouts to practitioners.
    
    This workflow collects all ready-for-payout transactions for a practitioner
    and processes them as a batch, handling any payment provider integration.
    """
    
    @workflow.run
    async def run(
        self, 
        practitioner_id: int, 
        min_amount: float = 10.0,
        payment_method: str = "stripe"
    ) -> Dict[str, Any]:
        """
        Run the batch practitioner payout workflow.
        
        Args:
            practitioner_id: ID of the practitioner
            min_amount: Minimum amount required to process a payout
            payment_method: Payment method to use (stripe, manual, etc.)
            
        Returns:
            Dict with workflow results
        """
        workflow.logger.info(f"Starting batch payout workflow for practitioner {practitioner_id}")
        
        # Process the payout
        try:
            payout_result = await execute_activity(
                process_practitioner_payout,
                practitioner_id,
                min_amount,
                payment_method,
                start_to_close_timeout=timedelta(minutes=15),
                retry_policy=payment_retry_policy,
            )
            
            if payout_result.get("success"):
                # Send notification to practitioner
                await execute_activity(
                    send_payout_notification,
                    practitioner_id,
                    f"Payout of {payout_result.get('amount')} credits has been processed",
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=standard_retry_policy,
                )
                
                return {
                    "status": "completed",
                    "practitioner_id": practitioner_id,
                    "payout_id": payout_result.get("payout_id"),
                    "amount": payout_result.get("amount"),
                }
            else:
                # Record the error
                await execute_activity(
                    record_transaction_error,
                    "payout",
                    practitioner_id,
                    payout_result.get("error", "Unknown error"),
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=standard_retry_policy,
                )
                
                return {
                    "status": "failed",
                    "practitioner_id": practitioner_id,
                    "error": payout_result.get("error", "Unknown error"),
                }
                
        except ApplicationError as e:
            workflow.logger.error(f"Error processing payout for practitioner {practitioner_id}: {str(e)}")
            
            # Record the error
            await execute_activity(
                record_transaction_error,
                "payout",
                practitioner_id,
                str(e),
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=standard_retry_policy,
            )
            
            return {
                "status": "error",
                "practitioner_id": practitioner_id,
                "error": str(e),
            }


@workflow.defn
class SubscriptionRenewalWorkflow:
    """
    Workflow for handling practitioner subscription renewals.
    
    This workflow processes subscription renewals, including charging
    the practitioner and updating their subscription status.
    """
    
    @workflow.run
    async def run(self, subscription_id: int) -> Dict[str, Any]:
        """
        Run the subscription renewal workflow.
        
        Args:
            subscription_id: ID of the PractitionerSubscription
            
        Returns:
            Dict with workflow results
        """
        workflow.logger.info(f"Starting subscription renewal workflow for subscription {subscription_id}")
        
        # Process the renewal
        try:
            renewal_result = await execute_activity(
                process_subscription_renewal,
                subscription_id,
                start_to_close_timeout=timedelta(minutes=10),
                retry_policy=payment_retry_policy,
            )
            
            if renewal_result.get("success"):
                # Send notification to practitioner
                await execute_activity(
                    send_payout_notification,
                    renewal_result.get("practitioner_id"),
                    f"Your subscription has been renewed until {renewal_result.get('end_date')}",
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=standard_retry_policy,
                )
                
                return {
                    "status": "completed",
                    "subscription_id": subscription_id,
                    "end_date": renewal_result.get("end_date"),
                }
            else:
                # Record the error
                await execute_activity(
                    record_transaction_error,
                    "subscription_renewal",
                    renewal_result.get("practitioner_id"),
                    renewal_result.get("error", "Unknown error"),
                    start_to_close_timeout=timedelta(minutes=5),
                    retry_policy=standard_retry_policy,
                )
                
                return {
                    "status": "failed",
                    "subscription_id": subscription_id,
                    "error": renewal_result.get("error", "Unknown error"),
                }
                
        except ApplicationError as e:
            workflow.logger.error(f"Error processing subscription renewal {subscription_id}: {str(e)}")
            
            return {
                "status": "error",
                "subscription_id": subscription_id,
                "error": str(e),
            }
