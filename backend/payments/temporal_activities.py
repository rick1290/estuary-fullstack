"""
Temporal.io activities for payment processing.

This module defines activities that are called by Temporal workflows
for processing payments, payouts, and subscription renewals.
"""
import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any

from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Q

from temporalio import activity

from apps.payments.models import (
    PackageCompletionRecord,
    PractitionerCreditTransaction,
    PractitionerPayout,
    PractitionerSubscription,
    SubscriptionTier
)
from apps.practitioners.models import Practitioner
from apps.messaging.services import NotificationService

logger = logging.getLogger(__name__)


@activity.defn
async def process_package_completion(package_completion_id: int) -> Dict[str, Any]:
    """
    Process a package completion record and return its current status.
    
    Args:
        package_completion_id: ID of the PackageCompletionRecord
        
    Returns:
        Dict with package completion information
    """
    activity.logger.info(f"Processing package completion {package_completion_id}")
    
    try:
        # This needs to run in a sync context since Django ORM is synchronous
        package_completion = await activity.execute_in_thread(
            _get_package_completion_info, package_completion_id
        )
        return package_completion
    except Exception as e:
        activity.logger.error(f"Error processing package completion {package_completion_id}: {str(e)}")
        raise activity.ApplicationError(f"Failed to process package completion: {str(e)}")


def _get_package_completion_info(package_completion_id: int) -> Dict[str, Any]:
    """
    Get information about a package completion record.
    
    Args:
        package_completion_id: ID of the PackageCompletionRecord
        
    Returns:
        Dict with package completion information
    """
    try:
        package_completion = PackageCompletionRecord.objects.get(id=package_completion_id)
        
        # Update the completion status
        package_completion.update_completion_status()
        
        # Return package information
        return {
            "id": package_completion.id,
            "booking_id": package_completion.booking.id,
            "practitioner_id": package_completion.practitioner.id,
            "total_sessions": package_completion.total_sessions,
            "completed_sessions": package_completion.completed_sessions,
            "last_payout_percentage": package_completion.last_payout_percentage,
            "last_payout_date": package_completion.last_payout_date.isoformat() if package_completion.last_payout_date else None,
            "total_credits": float(package_completion.total_credits),
            "total_paid_credits": float(package_completion.total_paid_credits),
            "is_completed": package_completion.is_completed,
        }
    except PackageCompletionRecord.DoesNotExist:
        raise ValueError(f"Package completion record {package_completion_id} not found")
    except Exception as e:
        logger.exception(f"Error getting package completion info: {str(e)}")
        raise


@activity.defn
async def process_partial_payout(
    package_completion_id: int, 
    completion_percentage: int
) -> Dict[str, Any]:
    """
    Process a partial payout for a package completion.
    
    Args:
        package_completion_id: ID of the PackageCompletionRecord
        completion_percentage: Current completion percentage
        
    Returns:
        Dict with payout results
    """
    activity.logger.info(
        f"Processing partial payout for package {package_completion_id} at {completion_percentage}%"
    )
    
    try:
        # This needs to run in a sync context since Django ORM is synchronous
        payout_result = await activity.execute_in_thread(
            _process_partial_payout, package_completion_id, completion_percentage
        )
        return payout_result
    except Exception as e:
        activity.logger.error(f"Error processing partial payout: {str(e)}")
        raise activity.ApplicationError(f"Failed to process partial payout: {str(e)}")


def _process_partial_payout(package_completion_id: int, completion_percentage: int) -> Dict[str, Any]:
    """
    Process a partial payout for a package completion.
    
    Args:
        package_completion_id: ID of the PackageCompletionRecord
        completion_percentage: Current completion percentage
        
    Returns:
        Dict with payout results
    """
    try:
        with transaction.atomic():
            package_completion = PackageCompletionRecord.objects.select_for_update().get(id=package_completion_id)
            
            # Check if this percentage has already been paid out
            if package_completion.last_payout_percentage >= completion_percentage:
                return {
                    "success": True,
                    "package_id": package_completion_id,
                    "practitioner_id": package_completion.practitioner.id,
                    "amount": 0,
                    "message": f"Already paid out {package_completion.last_payout_percentage}%",
                }
            
            # Process the partial payout
            if completion_percentage == 100:
                # Final payout
                transaction = package_completion.process_final_payout()
            else:
                # Partial payout
                transaction = package_completion.process_partial_payout(completion_percentage)
            
            if transaction:
                return {
                    "success": True,
                    "package_id": package_completion_id,
                    "practitioner_id": package_completion.practitioner.id,
                    "amount": float(transaction.net_credits),
                    "transaction_id": transaction.id,
                    "message": f"Processed {completion_percentage}% payout",
                }
            else:
                return {
                    "success": False,
                    "package_id": package_completion_id,
                    "practitioner_id": package_completion.practitioner.id,
                    "error": "No transaction created",
                }
    except PackageCompletionRecord.DoesNotExist:
        raise ValueError(f"Package completion record {package_completion_id} not found")
    except Exception as e:
        logger.exception(f"Error processing partial payout: {str(e)}")
        raise


@activity.defn
async def process_practitioner_payout(
    practitioner_id: int,
    min_amount: float = 10.0,
    payment_method: str = "stripe"
) -> Dict[str, Any]:
    """
    Process a batch payout for a practitioner.
    
    Args:
        practitioner_id: ID of the practitioner
        min_amount: Minimum amount required to process a payout
        payment_method: Payment method to use (stripe, manual, etc.)
        
    Returns:
        Dict with payout results
    """
    activity.logger.info(f"Processing payout for practitioner {practitioner_id}")
    
    try:
        # This needs to run in a sync context since Django ORM is synchronous
        payout_result = await activity.execute_in_thread(
            _process_practitioner_payout, practitioner_id, min_amount, payment_method
        )
        return payout_result
    except Exception as e:
        activity.logger.error(f"Error processing practitioner payout: {str(e)}")
        raise activity.ApplicationError(f"Failed to process practitioner payout: {str(e)}")


def _process_practitioner_payout(
    practitioner_id: int,
    min_amount: float = 10.0,
    payment_method: str = "stripe"
) -> Dict[str, Any]:
    """
    Process a batch payout for a practitioner.
    
    Args:
        practitioner_id: ID of the practitioner
        min_amount: Minimum amount required to process a payout
        payment_method: Payment method to use (stripe, manual, etc.)
        
    Returns:
        Dict with payout results
    """
    try:
        # Get the practitioner
        practitioner = Practitioner.objects.get(id=practitioner_id)
        
        # Get ready transactions
        ready_tx_query = Q(payout_status='ready') | Q(
            payout_status='pending',
            ready_for_payout_date__isnull=False
        )
        
        ready_transactions = PractitionerCreditTransaction.objects.filter(
            ready_tx_query,
            practitioner=practitioner
        )
        
        if not ready_transactions.exists():
            return {
                "success": False,
                "practitioner_id": practitioner_id,
                "error": "No ready transactions found",
            }
        
        # Calculate total credits
        total_credits = ready_transactions.aggregate(Sum('net_credits'))['net_credits__sum'] or 0
        
        # Check minimum amount
        if total_credits < Decimal(str(min_amount)):
            return {
                "success": False,
                "practitioner_id": practitioner_id,
                "error": f"Total credits ({total_credits}) below minimum amount ({min_amount})",
            }
        
        # Create batch payout
        with transaction.atomic():
            batch_id = uuid.uuid4()
            notes = f"Batch payout created on {timezone.now().strftime('%Y-%m-%d')} via Temporal workflow"
            
            payout = PractitionerPayout.create_batch_payout(
                practitioner=practitioner,
                transactions=ready_transactions,
                notes=notes
            )
            
            # Update payout with payment method
            payout.payment_method = payment_method
            payout.save(update_fields=['payment_method'])
            
            # If using Stripe, we would trigger the Stripe payout here
            if payment_method == 'stripe' and hasattr(practitioner, 'stripe_account_id') and practitioner.stripe_account_id:
                # In a real implementation, you would call your Stripe service here
                # For now, we'll just mark it as completed
                payout.status = 'completed'
                payout.processed_at = timezone.now()
                payout.save(update_fields=['status', 'processed_at'])
            
            return {
                "success": True,
                "practitioner_id": practitioner_id,
                "payout_id": payout.id,
                "amount": float(payout.amount),
                "transaction_count": ready_transactions.count(),
            }
    except Practitioner.DoesNotExist:
        raise ValueError(f"Practitioner {practitioner_id} not found")
    except Exception as e:
        logger.exception(f"Error processing practitioner payout: {str(e)}")
        raise


@activity.defn
async def process_subscription_renewal(subscription_id: int) -> Dict[str, Any]:
    """
    Process a subscription renewal.
    
    Args:
        subscription_id: ID of the PractitionerSubscription
        
    Returns:
        Dict with renewal results
    """
    activity.logger.info(f"Processing subscription renewal {subscription_id}")
    
    try:
        # This needs to run in a sync context since Django ORM is synchronous
        renewal_result = await activity.execute_in_thread(
            _process_subscription_renewal, subscription_id
        )
        return renewal_result
    except Exception as e:
        activity.logger.error(f"Error processing subscription renewal: {str(e)}")
        raise activity.ApplicationError(f"Failed to process subscription renewal: {str(e)}")


def _process_subscription_renewal(subscription_id: int) -> Dict[str, Any]:
    """
    Process a subscription renewal.
    
    Args:
        subscription_id: ID of the PractitionerSubscription
        
    Returns:
        Dict with renewal results
    """
    try:
        # Get the subscription
        subscription = PractitionerSubscription.objects.get(id=subscription_id)
        
        # Check if subscription is active and auto-renewal is enabled
        if not subscription.is_active or not subscription.auto_renew:
            return {
                "success": False,
                "subscription_id": subscription_id,
                "practitioner_id": subscription.practitioner.id,
                "error": "Subscription is not active or auto-renewal is disabled",
            }
        
        # Check if subscription is due for renewal
        if subscription.end_date > timezone.now() + timedelta(days=1):
            return {
                "success": False,
                "subscription_id": subscription_id,
                "practitioner_id": subscription.practitioner.id,
                "error": "Subscription is not due for renewal yet",
            }
        
        # Process the renewal
        with transaction.atomic():
            # Calculate the new end date
            if subscription.billing_cycle == 'monthly':
                new_end_date = subscription.end_date + timedelta(days=30)
            else:  # annual
                new_end_date = subscription.end_date + timedelta(days=365)
            
            # Update the subscription
            subscription.start_date = subscription.end_date
            subscription.end_date = new_end_date
            subscription.save(update_fields=['start_date', 'end_date'])
            
            # In a real implementation, you would charge the practitioner here
            # For now, we'll just return success
            
            return {
                "success": True,
                "subscription_id": subscription_id,
                "practitioner_id": subscription.practitioner.id,
                "tier_id": subscription.tier.id,
                "tier_name": subscription.tier.name,
                "start_date": subscription.start_date.isoformat(),
                "end_date": subscription.end_date.isoformat(),
            }
    except PractitionerSubscription.DoesNotExist:
        raise ValueError(f"Subscription {subscription_id} not found")
    except Exception as e:
        logger.exception(f"Error processing subscription renewal: {str(e)}")
        raise


@activity.defn
async def send_payout_notification(
    practitioner_id: int,
    message: str
) -> Dict[str, Any]:
    """
    Send a notification to a practitioner about a payout.
    
    Args:
        practitioner_id: ID of the practitioner
        message: Notification message
        
    Returns:
        Dict with notification results
    """
    activity.logger.info(f"Sending payout notification to practitioner {practitioner_id}")
    
    try:
        # This needs to run in a sync context since Django ORM is synchronous
        notification_result = await activity.execute_in_thread(
            _send_payout_notification, practitioner_id, message
        )
        return notification_result
    except Exception as e:
        activity.logger.error(f"Error sending payout notification: {str(e)}")
        # Don't raise an error here, just return the error
        return {
            "success": False,
            "practitioner_id": practitioner_id,
            "error": str(e),
        }


def _send_payout_notification(practitioner_id: int, message: str) -> Dict[str, Any]:
    """
    Send a notification to a practitioner about a payout.
    
    Args:
        practitioner_id: ID of the practitioner
        message: Notification message
        
    Returns:
        Dict with notification results
    """
    try:
        # Get the practitioner
        practitioner = Practitioner.objects.get(id=practitioner_id)
        
        # Send the notification
        # This is a placeholder - in a real implementation, you would use your notification service
        # NotificationService.send_notification(practitioner.user, "payout", message)
        
        return {
            "success": True,
            "practitioner_id": practitioner_id,
            "message": message,
        }
    except Practitioner.DoesNotExist:
        raise ValueError(f"Practitioner {practitioner_id} not found")
    except Exception as e:
        logger.exception(f"Error sending payout notification: {str(e)}")
        raise


@activity.defn
async def record_transaction_error(
    error_type: str,
    entity_id: int,
    error_message: str
) -> Dict[str, Any]:
    """
    Record an error that occurred during a transaction.
    
    Args:
        error_type: Type of error (payout, subscription_renewal, etc.)
        entity_id: ID of the entity (practitioner, subscription, etc.)
        error_message: Error message
        
    Returns:
        Dict with error recording results
    """
    activity.logger.info(f"Recording {error_type} error for entity {entity_id}")
    
    try:
        # This needs to run in a sync context since Django ORM is synchronous
        error_result = await activity.execute_in_thread(
            _record_transaction_error, error_type, entity_id, error_message
        )
        return error_result
    except Exception as e:
        activity.logger.error(f"Error recording transaction error: {str(e)}")
        # Don't raise an error here, just return the error
        return {
            "success": False,
            "error_type": error_type,
            "entity_id": entity_id,
            "error": str(e),
        }


def _record_transaction_error(error_type: str, entity_id: int, error_message: str) -> Dict[str, Any]:
    """
    Record an error that occurred during a transaction.
    
    Args:
        error_type: Type of error (payout, subscription_renewal, etc.)
        entity_id: ID of the entity (practitioner, subscription, etc.)
        error_message: Error message
        
    Returns:
        Dict with error recording results
    """
    try:
        # In a real implementation, you would record the error in your database
        # For now, we'll just log it
        logger.error(f"{error_type.upper()} ERROR for entity {entity_id}: {error_message}")
        
        return {
            "success": True,
            "error_type": error_type,
            "entity_id": entity_id,
            "error_message": error_message,
        }
    except Exception as e:
        logger.exception(f"Error recording transaction error: {str(e)}")
        raise
