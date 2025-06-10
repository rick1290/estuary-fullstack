"""
Temporal activities for practitioner subscription management.

This module defines activities used by practitioner subscription workflows.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from decimal import Decimal

from temporalio import activity
from django.db import transaction
from django.utils import timezone
from django.conf import settings

from payments.models import PractitionerSubscription, SubscriptionTier
from practitioners.models import Practitioner, PractitionerOnboardingProgress
from users.models import User
from notifications.models import NotificationTemplate, Notification
from analytics.models import PractitionerPerformance
from integrations.courier.client import CourierClient
from integrations.stripe.client import StripeClient

logger = logging.getLogger(__name__)


@activity.defn
async def send_subscription_welcome_email(
    practitioner_id: str,
    tier_name: str,
    subscription_id: str
) -> Dict[str, Any]:
    """Send welcome email for new subscription."""
    try:
        practitioner = Practitioner.objects.select_related('user').get(id=practitioner_id)
        
        # Get tier details
        subscription = PractitionerSubscription.objects.select_related('tier').get(
            stripe_subscription_id=subscription_id
        )
        tier = subscription.tier
        
        # Send email via Courier
        courier = CourierClient()
        await courier.send_email(
            recipient_email=practitioner.user.email,
            template_id="subscription-welcome",
            data={
                "practitioner_name": practitioner.user.get_full_name(),
                "tier_name": tier_name,
                "features": tier.features,
                "monthly_price": str(tier.monthly_price),
                "annual_price": str(tier.annual_price) if tier.annual_price else None,
                "is_annual": subscription.is_annual,
                "dashboard_url": f"{settings.FRONTEND_URL}/practitioner/dashboard",
                "support_url": f"{settings.FRONTEND_URL}/support"
            }
        )
        
        # Create notification record
        Notification.objects.create(
            user=practitioner.user,
            type='subscription_welcome',
            title=f'Welcome to Estuary {tier_name}!',
            message=f'Your {tier_name} subscription is now active.',
            metadata={
                'tier_name': tier_name,
                'subscription_id': subscription_id
            }
        )
        
        return {
            "success": True,
            "email_sent": True,
            "practitioner_id": practitioner_id
        }
        
    except Exception as e:
        logger.error(f"Error sending subscription welcome email: {e}")
        raise


@activity.defn
async def update_practitioner_subscription_status(
    practitioner_id: str,
    status: str,
    tier_name: str
) -> Dict[str, Any]:
    """Update practitioner's subscription status."""
    try:
        practitioner = Practitioner.objects.get(id=practitioner_id)
        
        # Update practitioner status if needed
        if status == "active" and practitioner.practitioner_status == "pending":
            practitioner.practitioner_status = "active"
            practitioner.save()
        
        # Log status change
        logger.info(
            f"Updated practitioner {practitioner_id} subscription status: "
            f"{status}, tier: {tier_name}"
        )
        
        return {
            "success": True,
            "practitioner_id": practitioner_id,
            "status": status,
            "tier_name": tier_name
        }
        
    except Exception as e:
        logger.error(f"Error updating practitioner subscription status: {e}")
        raise


@activity.defn
async def check_onboarding_completion(practitioner_id: str) -> Dict[str, Any]:
    """Check if practitioner onboarding is complete."""
    try:
        onboarding = PractitionerOnboardingProgress.objects.get(
            practitioner_id=practitioner_id
        )
        
        return {
            "is_complete": onboarding.is_complete,
            "profile_setup": onboarding.profile_setup,
            "documents_verified": onboarding.documents_verified,
            "background_check": onboarding.background_check_completed,
            "training_completed": onboarding.training_completed,
            "subscription_setup": onboarding.subscription_setup,
            "services_created": onboarding.services_created
        }
        
    except PractitionerOnboardingProgress.DoesNotExist:
        return {
            "is_complete": False,
            "profile_setup": False,
            "documents_verified": False,
            "background_check": False,
            "training_completed": False,
            "subscription_setup": False,
            "services_created": False
        }


@activity.defn
async def trigger_next_onboarding_step(
    practitioner_id: str,
    current_step: str
) -> Dict[str, Any]:
    """Trigger the next step in onboarding after subscription setup."""
    try:
        # The next step after subscription is typically service creation
        if current_step == "subscription_setup":
            # Send notification to create services
            practitioner = Practitioner.objects.select_related('user').get(
                id=practitioner_id
            )
            
            # Send email
            courier = CourierClient()
            await courier.send_email(
                recipient_email=practitioner.user.email,
                template_id="onboarding-create-services",
                data={
                    "practitioner_name": practitioner.user.get_full_name(),
                    "services_url": f"{settings.FRONTEND_URL}/practitioner/services/new"
                }
            )
            
            # Create notification
            Notification.objects.create(
                user=practitioner.user,
                type='onboarding_next_step',
                title='Create Your Services',
                message='Your subscription is active! Now create your service offerings.',
                metadata={
                    'step': 'services_creation',
                    'action_url': f"{settings.FRONTEND_URL}/practitioner/services/new"
                }
            )
        
        return {
            "success": True,
            "next_step_triggered": True,
            "current_step": current_step
        }
        
    except Exception as e:
        logger.error(f"Error triggering next onboarding step: {e}")
        raise


@activity.defn
async def track_subscription_event(
    event_type: str,
    practitioner_id: str,
    **kwargs
) -> Dict[str, Any]:
    """Track subscription analytics event."""
    try:
        # Log to analytics
        metadata = {
            "event_type": event_type,
            "practitioner_id": practitioner_id,
            "timestamp": timezone.now().isoformat(),
            **kwargs
        }
        
        # You could send this to an analytics service like Segment, Mixpanel, etc.
        logger.info(f"Subscription event: {event_type} for practitioner {practitioner_id}")
        
        # Update practitioner performance metrics if needed
        if event_type in ["subscription_created", "tier_changed"]:
            performance, _ = PractitionerPerformance.objects.get_or_create(
                practitioner_id=practitioner_id,
                period_start=timezone.now().replace(day=1, hour=0, minute=0, second=0)
            )
            # Update relevant metrics
            performance.last_updated = timezone.now()
            performance.save()
        
        return {
            "success": True,
            "event_tracked": True,
            "event_type": event_type
        }
        
    except Exception as e:
        logger.error(f"Error tracking subscription event: {e}")
        raise


@activity.defn
async def send_tier_change_notification(
    practitioner_id: str,
    old_tier: str,
    new_tier: str,
    subscription_id: str
) -> Dict[str, Any]:
    """Send notification about tier change."""
    try:
        practitioner = Practitioner.objects.select_related('user').get(id=practitioner_id)
        
        # Determine if upgrade or downgrade
        is_upgrade = False
        tier_order = {"Free": 0, "Basic": 1, "Entry": 2, "Professional": 3, "Premium": 4}
        if tier_order.get(new_tier, 0) > tier_order.get(old_tier, 0):
            is_upgrade = True
        
        # Send email
        courier = CourierClient()
        await courier.send_email(
            recipient_email=practitioner.user.email,
            template_id="subscription-tier-changed",
            data={
                "practitioner_name": practitioner.user.get_full_name(),
                "old_tier": old_tier,
                "new_tier": new_tier,
                "is_upgrade": is_upgrade,
                "features_url": f"{settings.FRONTEND_URL}/pricing",
                "dashboard_url": f"{settings.FRONTEND_URL}/practitioner/subscription"
            }
        )
        
        # Create notification
        title = f"Subscription {'Upgraded' if is_upgrade else 'Changed'} to {new_tier}"
        message = (
            f"Your subscription has been {'upgraded' if is_upgrade else 'changed'} "
            f"from {old_tier} to {new_tier}."
        )
        
        Notification.objects.create(
            user=practitioner.user,
            type='subscription_tier_changed',
            title=title,
            message=message,
            metadata={
                'old_tier': old_tier,
                'new_tier': new_tier,
                'is_upgrade': is_upgrade,
                'subscription_id': subscription_id
            }
        )
        
        return {
            "success": True,
            "notification_sent": True,
            "is_upgrade": is_upgrade
        }
        
    except Exception as e:
        logger.error(f"Error sending tier change notification: {e}")
        raise


@activity.defn
async def update_practitioner_feature_access(
    practitioner_id: str,
    new_tier: str
) -> Dict[str, Any]:
    """Update feature access based on new tier."""
    try:
        # Get the new tier
        tier = SubscriptionTier.objects.get(name=new_tier)
        features = tier.features or {}
        
        # Update any feature-specific settings
        # This is where you'd update database flags, cache, etc.
        # For example:
        # - Update service limits
        # - Enable/disable analytics access
        # - Update commission rates
        
        logger.info(
            f"Updated feature access for practitioner {practitioner_id} "
            f"to tier {new_tier}"
        )
        
        return {
            "success": True,
            "tier": new_tier,
            "features": features
        }
        
    except Exception as e:
        logger.error(f"Error updating feature access: {e}")
        raise


@activity.defn
async def send_subscription_payment_receipt(
    practitioner_id: str,
    invoice_id: str,
    amount: float
) -> Dict[str, Any]:
    """Send payment receipt email."""
    try:
        practitioner = Practitioner.objects.select_related('user').get(id=practitioner_id)
        
        # Get invoice from Stripe
        stripe_client = StripeClient()
        # Note: This would need to be implemented in the Stripe client
        # invoice = await stripe_client.retrieve_invoice(invoice_id)
        
        # Send email
        courier = CourierClient()
        await courier.send_email(
            recipient_email=practitioner.user.email,
            template_id="subscription-payment-receipt",
            data={
                "practitioner_name": practitioner.user.get_full_name(),
                "amount": f"${amount:.2f}",
                "invoice_id": invoice_id,
                "date": timezone.now().strftime("%B %d, %Y"),
                "invoice_url": f"{settings.FRONTEND_URL}/practitioner/invoices/{invoice_id}"
            }
        )
        
        return {
            "success": True,
            "receipt_sent": True,
            "amount": amount
        }
        
    except Exception as e:
        logger.error(f"Error sending payment receipt: {e}")
        raise


@activity.defn
async def send_subscription_payment_failed_notification(
    practitioner_id: str,
    invoice_id: str,
    amount: float,
    attempt_count: int
) -> Dict[str, Any]:
    """Send payment failure notification."""
    try:
        practitioner = Practitioner.objects.select_related('user').get(id=practitioner_id)
        subscription = PractitionerSubscription.objects.filter(
            practitioner=practitioner,
            status__in=['active', 'past_due']
        ).first()
        
        # Send email
        courier = CourierClient()
        await courier.send_email(
            recipient_email=practitioner.user.email,
            template_id="subscription-payment-failed",
            data={
                "practitioner_name": practitioner.user.get_full_name(),
                "amount": f"${amount:.2f}",
                "attempt_number": attempt_count,
                "update_payment_url": f"{settings.FRONTEND_URL}/practitioner/billing",
                "is_final_attempt": attempt_count >= 3
            }
        )
        
        # Create notification
        urgency = "high" if attempt_count >= 3 else "medium"
        Notification.objects.create(
            user=practitioner.user,
            type='subscription_payment_failed',
            title='Subscription Payment Failed',
            message=f'Payment of ${amount:.2f} failed. Please update your payment method.',
            urgency=urgency,
            metadata={
                'invoice_id': invoice_id,
                'amount': amount,
                'attempt_count': attempt_count
            }
        )
        
        return {
            "success": True,
            "notification_sent": True,
            "attempt_count": attempt_count
        }
        
    except Exception as e:
        logger.error(f"Error sending payment failed notification: {e}")
        raise


@activity.defn
async def suspend_subscription(
    practitioner_id: str,
    subscription_id: str
) -> Dict[str, Any]:
    """Suspend a subscription due to payment failure."""
    try:
        with transaction.atomic():
            # Update subscription status
            subscription = PractitionerSubscription.objects.get(
                stripe_subscription_id=subscription_id
            )
            subscription.status = 'suspended'
            subscription.save()
            
            # Update practitioner status
            practitioner = Practitioner.objects.get(id=practitioner_id)
            practitioner.practitioner_status = 'suspended'
            practitioner.save()
            
            # Disable features
            # This would involve updating various flags and permissions
            
            logger.warning(
                f"Suspended subscription {subscription_id} for "
                f"practitioner {practitioner_id}"
            )
        
        return {
            "success": True,
            "subscription_suspended": True,
            "practitioner_id": practitioner_id
        }
        
    except Exception as e:
        logger.error(f"Error suspending subscription: {e}")
        raise


# Trial-related activities

@activity.defn
async def send_trial_ending_reminder(
    practitioner_id: str,
    days_remaining: int,
    trial_end_date: str
) -> Dict[str, Any]:
    """Send reminder that trial is ending soon."""
    try:
        practitioner = Practitioner.objects.select_related('user').get(id=practitioner_id)
        
        # Send email
        courier = CourierClient()
        await courier.send_email(
            recipient_email=practitioner.user.email,
            template_id="trial-ending-reminder",
            data={
                "practitioner_name": practitioner.user.get_full_name(),
                "days_remaining": days_remaining,
                "trial_end_date": trial_end_date,
                "subscribe_url": f"{settings.FRONTEND_URL}/practitioner/subscription/upgrade",
                "pricing_url": f"{settings.FRONTEND_URL}/pricing"
            }
        )
        
        # Create notification
        Notification.objects.create(
            user=practitioner.user,
            type='trial_ending',
            title=f'Trial Ending in {days_remaining} Day{"s" if days_remaining > 1 else ""}',
            message='Subscribe now to continue enjoying all features.',
            urgency='high' if days_remaining <= 1 else 'medium',
            metadata={
                'days_remaining': days_remaining,
                'trial_end_date': trial_end_date
            }
        )
        
        return {
            "success": True,
            "reminder_sent": True,
            "days_remaining": days_remaining
        }
        
    except Exception as e:
        logger.error(f"Error sending trial reminder: {e}")
        raise


@activity.defn
async def check_subscription_status(practitioner_id: str) -> Dict[str, Any]:
    """Check if practitioner has an active subscription."""
    try:
        has_subscription = PractitionerSubscription.objects.filter(
            practitioner_id=practitioner_id,
            status__in=['active', 'trialing']
        ).exists()
        
        return {
            "has_active_subscription": has_subscription,
            "practitioner_id": practitioner_id
        }
        
    except Exception as e:
        logger.error(f"Error checking subscription status: {e}")
        raise