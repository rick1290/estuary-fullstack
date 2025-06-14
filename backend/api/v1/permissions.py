"""
Tier-based permission dependencies for practitioner subscriptions
"""
from fastapi import Depends, HTTPException, status
from typing import Optional, Callable
from functools import wraps
from django.db.models import Q
from django.utils import timezone
from asgiref.sync import sync_to_async

from payments.models import PractitionerSubscription, SubscriptionTier
from practitioners.models import Practitioner
from services.models import Service
from bookings.models import Booking

from api.dependencies import get_current_practitioner


class SubscriptionFeatureError(HTTPException):
    """Exception for subscription feature access violations"""
    def __init__(self, feature: str, required_tier: str = None, upgrade_reason: str = None):
        detail = f"Your subscription does not include {feature}."
        if required_tier:
            detail += f" Upgrade to {required_tier} to access this feature."
        elif upgrade_reason:
            detail += f" {upgrade_reason}"
        
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            headers={"X-Feature-Required": feature}
        )


@sync_to_async
def get_practitioner_subscription(practitioner: Practitioner) -> Optional[PractitionerSubscription]:
    """Get practitioner's active subscription"""
    return PractitionerSubscription.objects.filter(
        practitioner=practitioner,
        status__in=['active', 'trialing']
    ).select_related('tier').first()


async def get_subscription_features(practitioner: Practitioner) -> dict:
    """Get features for practitioner's current subscription"""
    subscription = await get_practitioner_subscription(practitioner)
    
    if not subscription:
        # Default to lowest tier features
        @sync_to_async
        def get_default_tier():
            return SubscriptionTier.objects.filter(
                is_active=True
            ).order_by('monthly_price').first()
        
        default_tier = await get_default_tier()
        if default_tier:
            return default_tier.features or {}
        
        # Absolute defaults if no tiers configured
        return {
            'max_services': 2,
            'community_posts': True,
            'analytics': False,
            'priority_support': False,
            'video_rooms': True,
            'advanced_scheduling': False,
            'custom_branding': False,
            'bulk_operations': False,
            'api_access': False,
            'max_locations': 1,
            'max_staff': 0,
            'max_monthly_bookings': 50,
            'commission_discount': 0
        }
    
    return subscription.tier.features or {}


def require_subscription_feature(feature: str, error_message: str = None):
    """Decorator to require a specific subscription feature"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract practitioner from kwargs
            practitioner = kwargs.get('practitioner') or kwargs.get('current_practitioner')
            
            if not practitioner:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Practitioner authentication required"
                )
            
            features = get_subscription_features(practitioner)
            
            if not features.get(feature, False):
                raise SubscriptionFeatureError(
                    feature=feature,
                    upgrade_reason=error_message
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Specific feature dependencies
async def require_analytics(
    practitioner: Practitioner = Depends(get_current_practitioner)
) -> Practitioner:
    """Require analytics feature access"""
    features = get_subscription_features(practitioner)
    
    if not features.get('analytics', False):
        raise SubscriptionFeatureError(
            feature="analytics",
            required_tier="Professional",
            upgrade_reason="Analytics are available in Professional and Premium tiers."
        )
    
    return practitioner


async def require_priority_support(
    practitioner: Practitioner = Depends(get_current_practitioner)
) -> Practitioner:
    """Require priority support access"""
    features = get_subscription_features(practitioner)
    
    if not features.get('priority_support', False):
        raise SubscriptionFeatureError(
            feature="priority support",
            required_tier="Premium",
            upgrade_reason="Priority support is available in the Premium tier."
        )
    
    return practitioner


async def require_custom_branding(
    practitioner: Practitioner = Depends(get_current_practitioner)
) -> Practitioner:
    """Require custom branding access"""
    features = get_subscription_features(practitioner)
    
    if not features.get('custom_branding', False):
        raise SubscriptionFeatureError(
            feature="custom branding",
            required_tier="Premium",
            upgrade_reason="Custom branding is available in the Premium tier."
        )
    
    return practitioner


async def require_api_access(
    practitioner: Practitioner = Depends(get_current_practitioner)
) -> Practitioner:
    """Require API access"""
    features = get_subscription_features(practitioner)
    
    if not features.get('api_access', False):
        raise SubscriptionFeatureError(
            feature="API access",
            required_tier="Premium",
            upgrade_reason="API access is available in the Premium tier."
        )
    
    return practitioner


# Usage limit checks
async def check_service_limit(practitioner: Practitioner) -> Practitioner:
    """Check if practitioner can create more services"""
    from asgiref.sync import sync_to_async
    
    @sync_to_async
    def get_service_count():
        return Service.objects.filter(
            primary_practitioner=practitioner,
            is_active=True
        ).count()
    
    features = await get_subscription_features(practitioner)
    max_services = features.get('max_services', 2)
    
    # -1 means unlimited
    if max_services == -1:
        return practitioner
    
    current_services = await get_service_count()
    
    if current_services >= max_services:
        # Find next tier with higher limit
        current_subscription = await get_practitioner_subscription(practitioner)
        current_tier = current_subscription.tier if current_subscription else None
        
        next_tier = None
        if current_tier:
            next_tier = SubscriptionTier.objects.filter(
                is_active=True,
                monthly_price__gt=current_tier.monthly_price
            ).order_by('monthly_price').first()
        
        raise SubscriptionFeatureError(
            feature="service creation",
            required_tier=next_tier.name if next_tier else "a higher tier",
            upgrade_reason=f"You've reached your limit of {max_services} services."
        )
    
    return practitioner


async def check_location_limit(
    practitioner: Practitioner = Depends(get_current_practitioner)
) -> Practitioner:
    """Check if practitioner can add more locations"""
    features = get_subscription_features(practitioner)
    max_locations = features.get('max_locations', 1)
    
    # For now, just check the limit exists
    # TODO: Implement location counting when multi-location feature is added
    
    if max_locations <= 1:
        raise SubscriptionFeatureError(
            feature="multiple locations",
            upgrade_reason="Multiple locations are available in higher tiers."
        )
    
    return practitioner


async def check_booking_limit(
    practitioner: Practitioner = Depends(get_current_practitioner)
) -> Practitioner:
    """Check if practitioner has reached monthly booking limit"""
    features = get_subscription_features(practitioner)
    max_bookings = features.get('max_monthly_bookings', -1)
    
    # -1 means unlimited
    if max_bookings == -1:
        return practitioner
    
    # Count bookings this month
    current_month_start = timezone.now().replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    
    current_bookings = Booking.objects.filter(
        practitioner=practitioner,
        created_at__gte=current_month_start,
        status__in=['confirmed', 'completed']
    ).count()
    
    if current_bookings >= max_bookings:
        raise SubscriptionFeatureError(
            feature="monthly bookings",
            upgrade_reason=f"You've reached your limit of {max_bookings} bookings this month."
        )
    
    return practitioner


# Tier-specific dependencies
async def require_professional_tier(
    practitioner: Practitioner = Depends(get_current_practitioner)
) -> Practitioner:
    """Require at least Professional tier"""
    subscription = get_practitioner_subscription(practitioner)
    
    if not subscription or subscription.tier.name not in ['Professional', 'Premium']:
        raise SubscriptionFeatureError(
            feature="this action",
            required_tier="Professional",
            upgrade_reason="This feature requires at least a Professional subscription."
        )
    
    return practitioner


async def require_premium_tier(
    practitioner: Practitioner = Depends(get_current_practitioner)
) -> Practitioner:
    """Require Premium tier"""
    subscription = get_practitioner_subscription(practitioner)
    
    if not subscription or subscription.tier.name != 'Premium':
        raise SubscriptionFeatureError(
            feature="this action",
            required_tier="Premium",
            upgrade_reason="This feature requires a Premium subscription."
        )
    
    return practitioner


# Commission rate helpers
def get_effective_commission_rate(practitioner: Practitioner, service_type: str) -> float:
    """Calculate effective commission rate based on tier"""
    from payments.models import ServiceTypeCommission, TierCommissionAdjustment
    
    # Get base commission
    try:
        base_commission = ServiceTypeCommission.objects.get(
            service_type__code=service_type,
            is_active=True
        )
        base_rate = float(base_commission.base_rate)
    except ServiceTypeCommission.DoesNotExist:
        base_rate = 15.0  # Default 15%
    
    # Get tier adjustment
    subscription = get_practitioner_subscription(practitioner)
    if subscription:
        try:
            adjustment = TierCommissionAdjustment.objects.get(
                tier=subscription.tier,
                service_type_commission=base_commission,
                is_active=True
            )
            adjustment_rate = float(adjustment.adjustment_percentage)
        except TierCommissionAdjustment.DoesNotExist:
            adjustment_rate = 0.0
    else:
        adjustment_rate = 0.0
    
    return base_rate + adjustment_rate


# Utility function for checking multiple features
def check_features_available(practitioner: Practitioner, required_features: list) -> dict:
    """Check which features are available for a practitioner"""
    features = get_subscription_features(practitioner)
    
    return {
        feature: features.get(feature, False)
        for feature in required_features
    }