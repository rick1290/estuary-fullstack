"""
Temporal activities for the practitioners domain.

This module defines Temporal activities for managing practitioner-related processes,
including onboarding, verification, and subscription management.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from temporalio import activity

from apps.integrations.temporal.base_activities import django_activity, transactional_activity
from apps.integrations.temporal.decorators import monitored_activity

logger = logging.getLogger(__name__)


# Practitioner Details Activities

@activity.defn
@monitored_activity(name="get_practitioner_details")
@django_activity
def get_practitioner_details(practitioner_id: int) -> Dict[str, Any]:
    """
    Get details for a practitioner.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with practitioner details
    """
    from apps.practitioners.models import Practitioner
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    return {
        "id": practitioner.id,
        "user_id": practitioner.user.id,
        "email": practitioner.user.email,
        "first_name": practitioner.user.first_name,
        "last_name": practitioner.user.last_name,
        "status": practitioner.status,
        "created_at": practitioner.created_at.isoformat(),
    }


# Onboarding Progress Activities

@activity.defn
@monitored_activity(name="update_onboarding_progress")
@transactional_activity
def update_onboarding_progress(practitioner_id: int, progress_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update the onboarding progress for a practitioner.
    
    Args:
        practitioner_id: ID of the practitioner
        progress_data: Dict with progress information
        
    Returns:
        Dict with updated progress
    """
    from apps.practitioners.models import Practitioner, PractitionerOnboardingProgress
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Get or create onboarding progress
    try:
        progress = PractitionerOnboardingProgress.objects.get(practitioner=practitioner)
    except PractitionerOnboardingProgress.DoesNotExist:
        progress = PractitionerOnboardingProgress(practitioner=practitioner)
    
    # Update progress
    progress.current_step = progress_data.get("current_step")
    progress.steps_completed = progress_data.get("steps_completed", [])
    progress.last_updated = datetime.utcnow()
    progress.save()
    
    return {
        "practitioner_id": practitioner_id,
        "current_step": progress.current_step,
        "steps_completed": progress.steps_completed,
        "last_updated": progress.last_updated.isoformat(),
    }


@activity.defn
@monitored_activity(name="mark_onboarding_stalled")
@transactional_activity
def mark_onboarding_stalled(practitioner_id: int, reason: str) -> Dict[str, Any]:
    """
    Mark the onboarding process as stalled.
    
    Args:
        practitioner_id: ID of the practitioner
        reason: Reason for stalling
        
    Returns:
        Dict with stall information
    """
    from apps.practitioners.models import Practitioner, PractitionerOnboardingProgress
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Get or create onboarding progress
    try:
        progress = PractitionerOnboardingProgress.objects.get(practitioner=practitioner)
    except PractitionerOnboardingProgress.DoesNotExist:
        progress = PractitionerOnboardingProgress(practitioner=practitioner)
    
    # Update progress
    progress.status = "stalled"
    progress.stall_reason = reason
    progress.last_updated = datetime.utcnow()
    progress.save()
    
    # Send notification to admin
    _send_admin_notification(
        subject=f"Practitioner onboarding stalled: {practitioner.user.email}",
        message=f"Practitioner onboarding has stalled for {practitioner.user.email}. Reason: {reason}",
    )
    
    return {
        "practitioner_id": practitioner_id,
        "status": "stalled",
        "reason": reason,
        "last_updated": progress.last_updated.isoformat(),
    }


@activity.defn
@monitored_activity(name="mark_onboarding_rejected")
@transactional_activity
def mark_onboarding_rejected(practitioner_id: int, reason: str) -> Dict[str, Any]:
    """
    Mark the onboarding process as rejected.
    
    Args:
        practitioner_id: ID of the practitioner
        reason: Reason for rejection
        
    Returns:
        Dict with rejection information
    """
    from apps.practitioners.models import Practitioner, PractitionerOnboardingProgress
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Get or create onboarding progress
    try:
        progress = PractitionerOnboardingProgress.objects.get(practitioner=practitioner)
    except PractitionerOnboardingProgress.DoesNotExist:
        progress = PractitionerOnboardingProgress(practitioner=practitioner)
    
    # Update progress
    progress.status = "rejected"
    progress.rejection_reason = reason
    progress.last_updated = datetime.utcnow()
    progress.save()
    
    # Update practitioner status
    practitioner.status = "rejected"
    practitioner.save()
    
    # Send notification to practitioner
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Your application has been rejected",
        message=f"We regret to inform you that your application has been rejected. Reason: {reason}",
    )
    
    return {
        "practitioner_id": practitioner_id,
        "status": "rejected",
        "reason": reason,
        "last_updated": progress.last_updated.isoformat(),
    }


# Profile Completion Activities

@activity.defn
@monitored_activity(name="check_profile_completion")
@django_activity
def check_profile_completion(practitioner_id: int) -> Dict[str, Any]:
    """
    Check if the practitioner's profile is complete.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with completion status
    """
    from apps.practitioners.models import Practitioner, PractitionerProfile
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    try:
        profile = PractitionerProfile.objects.get(practitioner=practitioner)
        
        # Check required fields
        required_fields = [
            profile.bio,
            profile.specialties,
            profile.education,
            profile.experience,
            profile.profile_image,
        ]
        
        is_complete = all(required_fields)
        
        missing_fields = []
        if not profile.bio:
            missing_fields.append("bio")
        if not profile.specialties:
            missing_fields.append("specialties")
        if not profile.education:
            missing_fields.append("education")
        if not profile.experience:
            missing_fields.append("experience")
        if not profile.profile_image:
            missing_fields.append("profile_image")
        
        return {
            "practitioner_id": practitioner_id,
            "is_complete": is_complete,
            "missing_fields": missing_fields,
        }
    except PractitionerProfile.DoesNotExist:
        return {
            "practitioner_id": practitioner_id,
            "is_complete": False,
            "missing_fields": ["profile_not_created"],
        }


@activity.defn
@monitored_activity(name="send_profile_completion_reminder")
@django_activity
def send_profile_completion_reminder(practitioner_id: int) -> Dict[str, Any]:
    """
    Send a reminder to complete the profile.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with reminder information
    """
    from apps.practitioners.models import Practitioner
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Check profile completion
    completion_status = check_profile_completion(practitioner_id)
    
    # Prepare message
    missing_fields = completion_status.get("missing_fields", [])
    if "profile_not_created" in missing_fields:
        message = "Please complete your profile to continue the onboarding process."
    else:
        message = (
            "Please complete the following fields in your profile to continue the onboarding process: "
            f"{', '.join(missing_fields)}"
        )
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Complete your profile",
        message=message,
    )
    
    return {
        "practitioner_id": practitioner_id,
        "reminder_sent": True,
        "missing_fields": missing_fields,
        "sent_at": datetime.utcnow().isoformat(),
    }


# Document Verification Activities

@activity.defn
@monitored_activity(name="request_document_verification")
@django_activity
def request_document_verification(practitioner_id: int) -> Dict[str, Any]:
    """
    Request document verification from the practitioner.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with request information
    """
    from apps.practitioners.models import Practitioner, PractitionerVerification
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Create or update verification record
    try:
        verification = PractitionerVerification.objects.get(practitioner=practitioner)
    except PractitionerVerification.DoesNotExist:
        verification = PractitionerVerification(practitioner=practitioner)
    
    verification.documents_requested_at = datetime.utcnow()
    verification.status = "pending"
    verification.save()
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Document verification required",
        message=(
            "Please upload the following documents to verify your identity and credentials:\n"
            "1. Government-issued ID\n"
            "2. Professional certifications\n"
            "3. Proof of insurance (if applicable)"
        ),
    )
    
    return {
        "practitioner_id": practitioner_id,
        "request_sent": True,
        "requested_at": verification.documents_requested_at.isoformat(),
    }


@activity.defn
@monitored_activity(name="check_document_verification")
@django_activity
def check_document_verification(practitioner_id: int) -> Dict[str, Any]:
    """
    Check if the practitioner's documents have been verified.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with verification status
    """
    from apps.practitioners.models import Practitioner, PractitionerVerification
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    try:
        verification = PractitionerVerification.objects.get(practitioner=practitioner)
        
        is_verified = verification.status == "verified"
        
        return {
            "practitioner_id": practitioner_id,
            "is_verified": is_verified,
            "status": verification.status,
            "verified_at": verification.verified_at.isoformat() if verification.verified_at else None,
        }
    except PractitionerVerification.DoesNotExist:
        return {
            "practitioner_id": practitioner_id,
            "is_verified": False,
            "status": "not_requested",
            "verified_at": None,
        }


# Background Check Activities

@activity.defn
@monitored_activity(name="initiate_background_check")
@transactional_activity
def initiate_background_check(practitioner_id: int) -> Dict[str, Any]:
    """
    Initiate a background check for the practitioner.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with background check information
    """
    from apps.practitioners.models import Practitioner, PractitionerBackgroundCheck
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Create or update background check record
    try:
        background_check = PractitionerBackgroundCheck.objects.get(practitioner=practitioner)
    except PractitionerBackgroundCheck.DoesNotExist:
        background_check = PractitionerBackgroundCheck(practitioner=practitioner)
    
    background_check.initiated_at = datetime.utcnow()
    background_check.status = "pending"
    background_check.save()
    
    # TODO: Integrate with background check provider
    # This would typically involve calling an external API
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Background check initiated",
        message=(
            "We have initiated a background check as part of your onboarding process. "
            "You will be notified once it is complete."
        ),
    )
    
    return {
        "practitioner_id": practitioner_id,
        "background_check_id": background_check.id,
        "status": background_check.status,
        "initiated_at": background_check.initiated_at.isoformat(),
    }


@activity.defn
@monitored_activity(name="check_background_check_status")
@django_activity
def check_background_check_status(practitioner_id: int) -> Dict[str, Any]:
    """
    Check the status of the practitioner's background check.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with background check status
    """
    from apps.practitioners.models import Practitioner, PractitionerBackgroundCheck
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    try:
        background_check = PractitionerBackgroundCheck.objects.get(practitioner=practitioner)
        
        is_complete = background_check.status in ["approved", "rejected"]
        is_passed = background_check.status == "approved"
        
        return {
            "practitioner_id": practitioner_id,
            "background_check_id": background_check.id,
            "is_complete": is_complete,
            "is_passed": is_passed,
            "status": background_check.status,
            "completed_at": background_check.completed_at.isoformat() if background_check.completed_at else None,
        }
    except PractitionerBackgroundCheck.DoesNotExist:
        return {
            "practitioner_id": practitioner_id,
            "is_complete": False,
            "is_passed": False,
            "status": "not_initiated",
            "completed_at": None,
        }

# Training Activities

@activity.defn
@monitored_activity(name="assign_training_modules")
@transactional_activity
def assign_training_modules(practitioner_id: int) -> Dict[str, Any]:
    """
    Assign training modules to the practitioner.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with training module information
    """
    from apps.practitioners.models import Practitioner, PractitionerTraining
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Define training modules
    training_modules = [
        {
            "id": "platform_intro",
            "name": "Platform Introduction",
            "description": "Introduction to the Estuary platform",
            "estimated_duration": 30,  # minutes
        },
        {
            "id": "session_management",
            "name": "Session Management",
            "description": "How to manage sessions with clients",
            "estimated_duration": 45,  # minutes
        },
        {
            "id": "client_communication",
            "name": "Client Communication",
            "description": "Best practices for client communication",
            "estimated_duration": 60,  # minutes
        },
        {
            "id": "payment_processing",
            "name": "Payment Processing",
            "description": "Understanding payment processing and payouts",
            "estimated_duration": 30,  # minutes
        },
    ]
    
    # Create or update training record
    try:
        training = PractitionerTraining.objects.get(practitioner=practitioner)
    except PractitionerTraining.DoesNotExist:
        training = PractitionerTraining(practitioner=practitioner)
    
    training.assigned_modules = training_modules
    training.assigned_at = datetime.utcnow()
    training.status = "assigned"
    training.save()
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Training modules assigned",
        message=(
            "Training modules have been assigned to you as part of your onboarding process. "
            "Please complete them at your earliest convenience."
        ),
    )
    
    return {
        "practitioner_id": practitioner_id,
        "training_id": training.id,
        "modules": training_modules,
        "assigned_at": training.assigned_at.isoformat(),
    }


@activity.defn
@monitored_activity(name="check_training_completion")
@django_activity
def check_training_completion(practitioner_id: int) -> Dict[str, Any]:
    """
    Check if the practitioner has completed the assigned training modules.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with training completion status
    """
    from apps.practitioners.models import Practitioner, PractitionerTraining
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    try:
        training = PractitionerTraining.objects.get(practitioner=practitioner)
        
        is_complete = training.status == "completed"
        
        return {
            "practitioner_id": practitioner_id,
            "training_id": training.id,
            "is_complete": is_complete,
            "status": training.status,
            "completed_at": training.completed_at.isoformat() if training.completed_at else None,
            "completed_modules": training.completed_modules if hasattr(training, "completed_modules") else [],
            "remaining_modules": (
                [m for m in training.assigned_modules if m["id"] not in [cm["id"] for cm in training.completed_modules]]
                if hasattr(training, "completed_modules") and hasattr(training, "assigned_modules")
                else training.assigned_modules
            ),
        }
    except PractitionerTraining.DoesNotExist:
        return {
            "practitioner_id": practitioner_id,
            "is_complete": False,
            "status": "not_assigned",
            "completed_at": None,
            "completed_modules": [],
            "remaining_modules": [],
        }


# Subscription Activities

@activity.defn
@monitored_activity(name="get_subscription_tiers")
@django_activity
def get_subscription_tiers() -> List[Dict[str, Any]]:
    """
    Get available subscription tiers.
    
    Returns:
        List of subscription tiers
    """
    from apps.payments.models import SubscriptionTier
    
    tiers = SubscriptionTier.objects.filter(is_active=True).order_by('price')
    
    return [
        {
            "id": tier.id,
            "name": tier.name,
            "description": tier.description,
            "price": float(tier.price),
            "billing_frequency": tier.billing_frequency,
            "features": tier.features,
        }
        for tier in tiers
    ]


@activity.defn
@monitored_activity(name="send_subscription_setup_notification")
@django_activity
def send_subscription_setup_notification(practitioner_id: int, tiers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Send notification to set up subscription.
    
    Args:
        practitioner_id: ID of the practitioner
        tiers: Available subscription tiers
        
    Returns:
        Dict with notification information
    """
    from apps.practitioners.models import Practitioner
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Prepare message
    tier_descriptions = "\n".join([
        f"- {tier['name']}: ${tier['price']}/{tier['billing_frequency']} - {tier['description']}"
        for tier in tiers
    ])
    
    message = (
        "Please select a subscription tier to continue your onboarding process:\n\n"
        f"{tier_descriptions}\n\n"
        "You can select a tier from your practitioner dashboard."
    )
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Select a subscription tier",
        message=message,
    )
    
    return {
        "practitioner_id": practitioner_id,
        "notification_sent": True,
        "sent_at": datetime.utcnow().isoformat(),
    }


@activity.defn
@monitored_activity(name="check_subscription_status")
@django_activity
def check_subscription_status(practitioner_id: int) -> Dict[str, Any]:
    """
    Check if the practitioner has an active subscription.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with subscription status
    """
    from apps.practitioners.models import Practitioner
    from apps.payments.models import PractitionerSubscription
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    try:
        subscription = PractitionerSubscription.objects.get(
            practitioner=practitioner,
            status__in=["active", "trial"],
            end_date__gt=datetime.utcnow(),
        )
        
        return {
            "practitioner_id": practitioner_id,
            "subscription_id": subscription.id,
            "has_subscription": True,
            "is_active": True,
            "tier_id": subscription.tier.id,
            "tier_name": subscription.tier.name,
            "status": subscription.status,
            "start_date": subscription.start_date.isoformat(),
            "end_date": subscription.end_date.isoformat(),
        }
    except PractitionerSubscription.DoesNotExist:
        return {
            "practitioner_id": practitioner_id,
            "has_subscription": False,
            "is_active": False,
        }


# Service Configuration Activities

@activity.defn
@monitored_activity(name="send_service_configuration_notification")
@django_activity
def send_service_configuration_notification(practitioner_id: int) -> Dict[str, Any]:
    """
    Send notification to configure services.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with notification information
    """
    from apps.practitioners.models import Practitioner
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Configure your services",
        message=(
            "Please configure your services to complete your onboarding process. "
            "This includes setting up your service types, durations, and pricing."
        ),
    )
    
    return {
        "practitioner_id": practitioner_id,
        "notification_sent": True,
        "sent_at": datetime.utcnow().isoformat(),
    }


@activity.defn
@monitored_activity(name="check_service_configuration")
@django_activity
def check_service_configuration(practitioner_id: int) -> Dict[str, Any]:
    """
    Check if the practitioner has configured services.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with service configuration status
    """
    from apps.practitioners.models import Practitioner, PractitionerService
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Check if practitioner has configured services
    services = PractitionerService.objects.filter(practitioner=practitioner, is_active=True)
    
    is_configured = services.exists()
    
    return {
        "practitioner_id": practitioner_id,
        "is_configured": is_configured,
        "service_count": services.count(),
        "services": [
            {
                "id": service.id,
                "name": service.name,
                "description": service.description,
                "duration": service.duration,
                "price": float(service.price),
            }
            for service in services
        ] if is_configured else [],
    }


# Onboarding Completion Activity

@activity.defn
@monitored_activity(name="complete_practitioner_onboarding")
@transactional_activity
def complete_practitioner_onboarding(practitioner_id: int) -> Dict[str, Any]:
    """
    Complete the practitioner onboarding process.
    
    Args:
        practitioner_id: ID of the practitioner
        
    Returns:
        Dict with completion information
    """
    from apps.practitioners.models import Practitioner, PractitionerOnboardingProgress
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    # Update practitioner status
    practitioner.status = "active"
    practitioner.save()
    
    # Update onboarding progress
    try:
        progress = PractitionerOnboardingProgress.objects.get(practitioner=practitioner)
    except PractitionerOnboardingProgress.DoesNotExist:
        progress = PractitionerOnboardingProgress(practitioner=practitioner)
    
    progress.status = "completed"
    progress.current_step = "completed"
    progress.completed_at = datetime.utcnow()
    progress.save()
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Onboarding completed",
        message=(
            "Congratulations! You have completed the onboarding process. "
            "You can now start accepting bookings and providing services to clients."
        ),
    )
    
    return {
        "practitioner_id": practitioner_id,
        "status": "completed",
        "completed_at": progress.completed_at.isoformat(),
    }


# Subscription Renewal Activities

@activity.defn
@monitored_activity(name="get_subscription_details")
@django_activity
def get_subscription_details(subscription_id: int) -> Dict[str, Any]:
    """
    Get details for a subscription.
    
    Args:
        subscription_id: ID of the subscription
        
    Returns:
        Dict with subscription details
    """
    from apps.payments.models import PractitionerSubscription
    
    subscription = PractitionerSubscription.objects.get(id=subscription_id)
    
    return {
        "subscription_id": subscription.id,
        "practitioner_id": subscription.practitioner.id,
        "tier_id": subscription.tier.id,
        "tier_name": subscription.tier.name,
        "status": subscription.status,
        "start_date": subscription.start_date.isoformat(),
        "end_date": subscription.end_date.isoformat(),
        "auto_renew": subscription.auto_renew,
        "price": float(subscription.tier.price),
        "billing_frequency": subscription.tier.billing_frequency,
    }


@activity.defn
@monitored_activity(name="send_subscription_renewal_reminder")
@django_activity
def send_subscription_renewal_reminder(subscription_id: int, days_remaining: int) -> Dict[str, Any]:
    """
    Send a reminder about subscription renewal.
    
    Args:
        subscription_id: ID of the subscription
        days_remaining: Number of days remaining until renewal
        
    Returns:
        Dict with reminder information
    """
    from apps.payments.models import PractitionerSubscription
    
    subscription = PractitionerSubscription.objects.get(id=subscription_id)
    practitioner_id = subscription.practitioner.id
    
    # Prepare message
    if subscription.auto_renew:
        message = (
            f"Your subscription will automatically renew in {days_remaining} days. "
            f"You will be charged ${float(subscription.tier.price)} for your {subscription.tier.name} plan. "
            "If you wish to cancel or change your subscription, please do so before the renewal date."
        )
    else:
        message = (
            f"Your subscription will expire in {days_remaining} days. "
            "Please renew your subscription to continue using the platform without interruption."
        )
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject=f"Subscription renewal in {days_remaining} days",
        message=message,
    )
    
    return {
        "subscription_id": subscription_id,
        "practitioner_id": practitioner_id,
        "days_remaining": days_remaining,
        "reminder_sent": True,
        "sent_at": datetime.utcnow().isoformat(),
    }


@activity.defn
@monitored_activity(name="process_subscription_renewal")
@transactional_activity
def process_subscription_renewal(
    subscription_id: int, 
    is_retry: bool = False, 
    retry_count: int = 0
) -> Dict[str, Any]:
    """
    Process subscription renewal.
    
    Args:
        subscription_id: ID of the subscription
        is_retry: Whether this is a retry attempt
        retry_count: Number of retry attempts
        
    Returns:
        Dict with renewal information
    """
    from apps.payments.models import PractitionerSubscription
    from apps.payments.services import SubscriptionService
    
    subscription = PractitionerSubscription.objects.get(id=subscription_id)
    practitioner_id = subscription.practitioner.id
    
    # Skip if subscription is not set to auto-renew
    if not subscription.auto_renew:
        return {
            "subscription_id": subscription_id,
            "practitioner_id": practitioner_id,
            "success": False,
            "error": "Subscription is not set to auto-renew",
            "processed_at": datetime.utcnow().isoformat(),
        }
    
    # Process renewal
    try:
        service = SubscriptionService()
        result = service.renew_subscription(subscription)
        
        if result.get("success"):
            return {
                "subscription_id": subscription_id,
                "practitioner_id": practitioner_id,
                "success": True,
                "new_end_date": result.get("new_end_date").isoformat(),
                "amount_charged": float(result.get("amount_charged")),
                "processed_at": datetime.utcnow().isoformat(),
            }
        else:
            return {
                "subscription_id": subscription_id,
                "practitioner_id": practitioner_id,
                "success": False,
                "error": result.get("error"),
                "processed_at": datetime.utcnow().isoformat(),
            }
    except Exception as e:
        return {
            "subscription_id": subscription_id,
            "practitioner_id": practitioner_id,
            "success": False,
            "error": str(e),
            "processed_at": datetime.utcnow().isoformat(),
        }


@activity.defn
@monitored_activity(name="send_renewal_confirmation")
@django_activity
def send_renewal_confirmation(subscription_id: int, renewal_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send confirmation of subscription renewal.
    
    Args:
        subscription_id: ID of the subscription
        renewal_result: Result of the renewal process
        
    Returns:
        Dict with confirmation information
    """
    from apps.payments.models import PractitionerSubscription
    
    subscription = PractitionerSubscription.objects.get(id=subscription_id)
    practitioner_id = subscription.practitioner.id
    
    # Prepare message
    message = (
        "Your subscription has been successfully renewed. "
        f"You have been charged ${renewal_result.get('amount_charged')} for your {subscription.tier.name} plan. "
        f"Your subscription is now valid until {renewal_result.get('new_end_date')}."
    )
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Subscription renewed",
        message=message,
    )
    
    return {
        "subscription_id": subscription_id,
        "practitioner_id": practitioner_id,
        "confirmation_sent": True,
        "sent_at": datetime.utcnow().isoformat(),
    }


@activity.defn
@monitored_activity(name="handle_failed_renewal")
@django_activity
def handle_failed_renewal(
    subscription_id: int, 
    renewal_result: Dict[str, Any],
    is_retry: bool = False,
    retry_count: int = 0
) -> Dict[str, Any]:
    """
    Handle failed subscription renewal.
    
    Args:
        subscription_id: ID of the subscription
        renewal_result: Result of the renewal process
        is_retry: Whether this is a retry attempt
        retry_count: Number of retry attempts
        
    Returns:
        Dict with handling information
    """
    from apps.payments.models import PractitionerSubscription
    
    subscription = PractitionerSubscription.objects.get(id=subscription_id)
    practitioner_id = subscription.practitioner.id
    
    # Prepare message
    error = renewal_result.get("error", "Unknown error")
    
    if is_retry:
        message = (
            f"We were unable to renew your subscription (Attempt {retry_count} of 3). "
            f"Error: {error}. "
            "Please update your payment information to ensure your subscription continues."
        )
    else:
        message = (
            "We were unable to renew your subscription. "
            f"Error: {error}. "
            "We will try again in 24 hours. "
            "Please update your payment information to ensure your subscription continues."
        )
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Subscription renewal failed",
        message=message,
    )
    
    return {
        "subscription_id": subscription_id,
        "practitioner_id": practitioner_id,
        "notification_sent": True,
        "is_retry": is_retry,
        "retry_count": retry_count,
        "sent_at": datetime.utcnow().isoformat(),
    }


@activity.defn
@monitored_activity(name="handle_subscription_expiration")
@transactional_activity
def handle_subscription_expiration(subscription_id: int) -> Dict[str, Any]:
    """
    Handle subscription expiration.
    
    Args:
        subscription_id: ID of the subscription
        
    Returns:
        Dict with handling information
    """
    from apps.payments.models import PractitionerSubscription
    
    subscription = PractitionerSubscription.objects.get(id=subscription_id)
    practitioner_id = subscription.practitioner.id
    
    # Update subscription status
    subscription.status = "expired"
    subscription.save()
    
    # Send notification
    _send_practitioner_notification(
        practitioner_id=practitioner_id,
        subject="Subscription expired",
        message=(
            "Your subscription has expired. "
            "Please renew your subscription to continue using the platform."
        ),
    )
    
    return {
        "subscription_id": subscription_id,
        "practitioner_id": practitioner_id,
        "status": "expired",
        "handled_at": datetime.utcnow().isoformat(),
    }


# Helper Functions

def _send_practitioner_notification(practitioner_id: int, subject: str, message: str) -> None:
    """
    Send a notification to a practitioner.
    
    Args:
        practitioner_id: ID of the practitioner
        subject: Notification subject
        message: Notification message
    """
    from apps.practitioners.models import Practitioner
    from apps.notifications.services import NotificationService
    
    practitioner = Practitioner.objects.get(id=practitioner_id)
    
    notification_service = NotificationService()
    notification_service.send_notification(
        recipient=practitioner.user,
        subject=subject,
        message=message,
        notification_type="practitioner_onboarding",
    )


def _send_admin_notification(subject: str, message: str) -> None:
    """
    Send a notification to admins.
    
    Args:
        subject: Notification subject
        message: Notification message
    """
    from django.contrib.auth.models import User
    from apps.notifications.services import NotificationService
    
    # Get admin users
    admins = User.objects.filter(is_staff=True, is_active=True)
    
    notification_service = NotificationService()
    for admin in admins:
        notification_service.send_notification(
            recipient=admin,
            subject=subject,
            message=message,
            notification_type="admin_alert",
        )
