"""
Practitioner Subscriptions router for FastAPI
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from django.db import transaction
from django.db.models import Count, Q, F, Sum
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from asgiref.sync import sync_to_async

from payments.models import (
    SubscriptionTier, PractitionerSubscription, ServiceTypeCommission,
    TierCommissionAdjustment, Order, UserCreditTransaction
)
from services.models import Service, ServiceType
from bookings.models import Booking
from users.models import User, UserPaymentProfile
from practitioners.models import Practitioner, PractitionerOnboardingProgress

from ..schemas.practitioner_subscriptions import (
    # Tier schemas
    SubscriptionTierResponse, SubscriptionTierListResponse,
    SubscriptionTierCreate, SubscriptionTierUpdate,
    SubscriptionTierFeatures,
    # Subscription schemas
    PractitionerSubscriptionCreate, PractitionerSubscriptionUpdate,
    PractitionerSubscriptionUpgrade, PractitionerSubscriptionResponse,
    PractitionerSubscriptionListResponse,
    # Usage schemas
    SubscriptionUsageResponse,
    # Billing schemas
    InvoiceResponse, InvoiceListResponse, PaymentMethodResponse,
    # Analytics schemas
    SubscriptionAnalyticsResponse,
    # Other schemas
    PromoCodeValidation, PromoCodeResponse,
    CommissionAdjustmentResponse,
    # Enums
    PractitionerSubscriptionStatus, SubscriptionInterval
)
from api.dependencies import PaginationParams, get_current_user, get_current_practitioner, get_current_superuser
from api.dependencies_extended import get_or_create_practitioner
from ..utils import paginate_queryset

from integrations.stripe.client import stripe_client

router = APIRouter()


# =============================================================================
# ASYNC HELPER FUNCTIONS FOR DJANGO ORM
# =============================================================================

@sync_to_async
def get_object_or_404_async(model, **kwargs):
    """Async wrapper for get_object_or_404"""
    return get_object_or_404(model, **kwargs)

@sync_to_async
def get_current_subscription_sync(practitioner: Practitioner) -> Optional[PractitionerSubscription]:
    """Get practitioner's current active subscription - sync version"""
    return PractitionerSubscription.objects.filter(
        practitioner=practitioner,
        status__in=['active', 'trialing']
    ).select_related('tier').first()

@sync_to_async
def count_services_sync(practitioner: Practitioner) -> int:
    """Count active services for practitioner"""
    return Service.objects.filter(
        primary_practitioner=practitioner,
        is_active=True
    ).count()

@sync_to_async
def count_bookings_sync(practitioner: Practitioner, start_date: datetime) -> int:
    """Count bookings for practitioner since date"""
    return Booking.objects.filter(
        practitioner=practitioner,
        created_at__gte=start_date
    ).count()

@sync_to_async
def get_or_create_payment_profile_sync(user):
    """Get or create payment profile for user"""
    return UserPaymentProfile.objects.get_or_create(user=user)

@sync_to_async
def save_payment_profile_sync(payment_profile):
    """Save payment profile"""
    return payment_profile.save()

@sync_to_async
def create_subscription_with_onboarding_sync(practitioner, tier, subscription_data, stripe_subscription_id):
    """Create subscription and update onboarding in transaction"""
    with transaction.atomic():
        subscription = PractitionerSubscription.objects.create(
            practitioner=practitioner,
            tier=tier,
            status='active',
            is_annual=subscription_data.is_annual,
            stripe_subscription_id=stripe_subscription_id,
            auto_renew=True
        )
        
        # Update onboarding progress
        onboarding, created = PractitionerOnboardingProgress.objects.get_or_create(
            practitioner=practitioner
        )
        
        # Add subscription_setup to completed steps
        if 'subscription_setup' not in onboarding.steps_completed:
            onboarding.steps_completed.append('subscription_setup')
        
        # Update current step if needed
        if onboarding.current_step == 'subscription_setup':
            onboarding.current_step = 'service_configuration'
        
        onboarding.save()
        
        # Check if all steps are complete
        all_steps = ['profile_completion', 'document_verification', 'background_check', 
                    'training_modules', 'subscription_setup', 'service_configuration']
        
        if all(step in onboarding.steps_completed for step in all_steps):
            onboarding.status = 'completed'
            onboarding.completed_at = timezone.now()
            onboarding.save()
            
            practitioner.is_onboarded = True
            practitioner.onboarding_completed_at = timezone.now()
            practitioner.save()
        
        return subscription

@sync_to_async
def get_or_create_onboarding_progress_sync(practitioner):
    """Get or create onboarding progress"""
    return PractitionerOnboardingProgress.objects.get_or_create(
        practitioner=practitioner
    )

@sync_to_async
def save_onboarding_progress_sync(onboarding):
    """Save onboarding progress"""
    return onboarding.save()

@sync_to_async
def save_practitioner_sync(practitioner):
    """Save practitioner"""
    return practitioner.save()

@sync_to_async
def save_subscription_sync(subscription):
    """Save subscription"""
    return subscription.save()

@sync_to_async
def update_subscription_tier_sync(subscription, new_tier, is_annual):
    """Update subscription tier in transaction"""
    with transaction.atomic():
        subscription.tier = new_tier
        subscription.is_annual = is_annual
        subscription.save()
    return subscription

@sync_to_async
def get_lowest_tier_sync():
    """Get the lowest price tier"""
    return SubscriptionTier.objects.filter(is_active=True).order_by('monthly_price').first()

@sync_to_async
def get_session_service_type_sync():
    """Get session service type"""
    return ServiceType.objects.filter(name="In-Person Session").first()

@sync_to_async
def get_base_commission_sync(service_type):
    """Get base commission for service type"""
    return ServiceTypeCommission.objects.filter(
        service_type=service_type,
        is_active=True
    ).first()

@sync_to_async
def get_tier_adjustment_sync(tier, base_commission):
    """Get tier commission adjustment"""
    return TierCommissionAdjustment.objects.filter(
        tier=tier,
        service_type_commission=base_commission,
        is_active=True
    ).first()

@sync_to_async
def get_next_tier_sync(current_tier):
    """Get next tier up from current"""
    return SubscriptionTier.objects.filter(
        is_active=True,
        monthly_price__gt=current_tier.monthly_price
    ).order_by('monthly_price').first()

@sync_to_async
def get_service_type_commissions_sync():
    """Get all active service type commissions"""
    return list(ServiceTypeCommission.objects.filter(
        is_active=True
    ).select_related('service_type'))

@sync_to_async
def get_tier_commission_adjustment_sync(tier, commission):
    """Get tier commission adjustment"""
    return TierCommissionAdjustment.objects.filter(
        tier=tier,
        service_type_commission=commission,
        is_active=True
    ).first()

@sync_to_async
def create_subscription_tier_sync(tier_data):
    """Create subscription tier"""
    features_dict = tier_data.features.model_dump()
    return SubscriptionTier.objects.create(
        name=tier_data.name,
        description=tier_data.description,
        monthly_price=tier_data.monthly_price,
        annual_price=tier_data.annual_price,
        features=features_dict,
        order=tier_data.order,
        is_active=tier_data.is_active
    )

@sync_to_async
def save_tier_sync(tier):
    """Save tier"""
    return tier.save()

@sync_to_async
def get_all_subscriptions_sync():
    """Get all subscriptions"""
    return list(PractitionerSubscription.objects.all())

@sync_to_async
def get_active_subscriptions_sync():
    """Get active subscriptions"""
    return list(PractitionerSubscription.objects.filter(status__in=['active', 'trialing']))

@sync_to_async
def count_subscriptions_sync():
    """Count all subscriptions"""
    return PractitionerSubscription.objects.count()

@sync_to_async
def count_active_subscriptions_sync():
    """Count active subscriptions"""
    return PractitionerSubscription.objects.filter(status__in=['active', 'trialing']).count()

@sync_to_async
def count_new_subscriptions_sync(month_start):
    """Count new subscriptions this month"""
    return PractitionerSubscription.objects.filter(
        status__in=['active', 'trialing'],
        start_date__gte=month_start
    ).count()

@sync_to_async
def count_churned_subscriptions_sync(month_start):
    """Count churned subscriptions this month"""
    return PractitionerSubscription.objects.filter(
        status='canceled',
        end_date__gte=month_start
    ).count()

@sync_to_async
def get_active_tiers_sync():
    """Get all active tiers"""
    return list(SubscriptionTier.objects.filter(is_active=True))

@sync_to_async
def count_tier_subscriptions_sync(tier):
    """Count subscriptions for a tier"""
    return PractitionerSubscription.objects.filter(
        tier=tier,
        status__in=['active', 'trialing']
    ).count()

@sync_to_async
def get_tier_subscriptions_sync(tier):
    """Get subscriptions for a tier"""
    return list(PractitionerSubscription.objects.filter(
        tier=tier,
        status__in=['active', 'trialing']
    ))


def serialize_tier_features(tier: SubscriptionTier) -> SubscriptionTierFeatures:
    """Extract features from tier's JSON field"""
    features = tier.features or {}
    return SubscriptionTierFeatures(
        max_services=features.get('max_services', 5),
        community_posts=features.get('community_posts', True),
        analytics=features.get('analytics', False),
        priority_support=features.get('priority_support', False),
        video_rooms=features.get('video_rooms', True),
        advanced_scheduling=features.get('advanced_scheduling', True),
        custom_branding=features.get('custom_branding', False),
        bulk_operations=features.get('bulk_operations', False),
        api_access=features.get('api_access', False),
        max_locations=features.get('max_locations', 1),
        max_staff=features.get('max_staff', 0),
        max_monthly_bookings=features.get('max_monthly_bookings', -1),
        commission_discount=Decimal(str(features.get('commission_discount', 0)))
    )


def serialize_subscription_tier(tier: SubscriptionTier) -> SubscriptionTierResponse:
    """Serialize subscription tier for API response"""
    # Calculate annual savings if applicable
    annual_savings = None
    annual_savings_percentage = None
    if tier.annual_price and tier.monthly_price:
        monthly_total = tier.monthly_price * 12
        annual_savings = monthly_total - tier.annual_price
        if monthly_total > 0:
            annual_savings_percentage = float((annual_savings / monthly_total) * 100)
    
    return SubscriptionTierResponse(
        id=tier.id,
        name=tier.name,
        description=tier.description,
        monthly_price=tier.monthly_price,
        annual_price=tier.annual_price,
        features=serialize_tier_features(tier),
        order=tier.order,
        is_active=tier.is_active,
        annual_savings=annual_savings,
        annual_savings_percentage=annual_savings_percentage,
        created_at=tier.created_at,
        updated_at=tier.updated_at
    )




# =============================================================================
# SUBSCRIPTION TIERS
# =============================================================================

@sync_to_async
def get_subscription_tiers_list(include_inactive: bool, pagination: PaginationParams):
    """Get subscription tiers with pagination"""
    queryset = SubscriptionTier.objects.all()
    if not include_inactive:
        queryset = queryset.filter(is_active=True)
    queryset = queryset.order_by('order', 'monthly_price')
    
    # Handle pagination manually
    total = queryset.count()
    items = list(queryset[pagination.offset:pagination.offset + pagination.limit])
    
    return {
        'items': items,
        'total': total
    }

@router.get("/tiers", response_model=SubscriptionTierListResponse)
async def list_subscription_tiers(
    pagination: PaginationParams = Depends(),
    include_inactive: bool = Query(False, description="Include inactive tiers")
):
    """List available subscription tiers"""
    result = await get_subscription_tiers_list(include_inactive, pagination)
    
    # Serialize items
    serialized_items = [serialize_subscription_tier(tier) for tier in result['items']]
    
    return SubscriptionTierListResponse(
        results=serialized_items,
        total=result['total'],
        limit=pagination.limit,
        offset=pagination.offset
    )


@router.get("/tiers/{tier_id}", response_model=SubscriptionTierResponse)
async def get_subscription_tier(tier_id: int):
    """Get subscription tier details"""
    tier = await get_object_or_404_async(SubscriptionTier, id=tier_id, is_active=True)
    return serialize_subscription_tier(tier)


# =============================================================================
# PRACTITIONER SUBSCRIPTIONS
# =============================================================================

@router.get("/current", response_model=Optional[PractitionerSubscriptionResponse])
async def get_current_subscription(
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Get practitioner's current subscription"""
    subscription = await get_current_subscription_sync(practitioner)
    
    if not subscription:
        return None
    
    # Get usage counts
    services_count = await count_services_sync(practitioner)
    
    # Get current month bookings
    current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    bookings_count = await count_bookings_sync(practitioner, current_month_start)
    
    # Calculate next billing
    next_billing_date = subscription.current_period_end
    next_billing_amount = subscription.tier.annual_price if subscription.is_annual else subscription.tier.monthly_price
    
    return PractitionerSubscriptionResponse(
        id=subscription.id,
        practitioner_id=practitioner.id,
        tier=serialize_subscription_tier(subscription.tier),
        status=subscription.status,
        start_date=subscription.start_date,
        end_date=subscription.end_date,
        is_annual=subscription.is_annual,
        auto_renew=subscription.auto_renew,
        current_period_start=subscription.start_date,  # TODO: Add period tracking
        current_period_end=subscription.end_date or timezone.now() + timedelta(days=30),
        stripe_subscription_id=subscription.stripe_subscription_id,
        stripe_customer_id=practitioner.user.payment_profile.stripe_customer_id if hasattr(practitioner.user, 'payment_profile') else None,
        current_services_count=services_count,
        current_bookings_count=bookings_count,
        next_billing_date=next_billing_date,
        next_billing_amount=next_billing_amount,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at
    )


@router.post("/", response_model=PractitionerSubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    subscription_data: PractitionerSubscriptionCreate,
    background_tasks: BackgroundTasks,
    practitioner: Practitioner = Depends(get_or_create_practitioner)
):
    """Create a new practitioner subscription"""
    # Check if practitioner already has an active subscription
    existing = await get_current_subscription_sync(practitioner)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active subscription. Please upgrade or cancel your current subscription first."
        )
    
    # Get tier
    tier = await get_object_or_404_async(SubscriptionTier, id=subscription_data.tier_id, is_active=True)
    
    # Get user from practitioner (already loaded via select_related)
    user = practitioner.user
    
    # Get or create payment profile
    payment_profile, created = await get_or_create_payment_profile_sync(user)
    
    # Create Stripe customer if needed
    if not payment_profile.stripe_customer_id:
        # Create customer using the sync method
        stripe_customer = stripe_client.create_customer(
            user,
            metadata={
                "practitioner_id": str(practitioner.id),
                "user_id": str(user.id)
            }
        )
        payment_profile.stripe_customer_id = stripe_customer.id
        await save_payment_profile_sync(payment_profile)
    
    # Check if payment method is required (non-free tiers)
    requires_payment = tier.monthly_price > 0 or (subscription_data.is_annual and tier.annual_price > 0)
    
    if requires_payment:
        if not subscription_data.payment_method_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment method is required for paid subscription tiers"
            )
        
        # Attach payment method to customer
        await stripe_client.attach_payment_method(
            payment_method_id=subscription_data.payment_method_id,
            customer_id=payment_profile.stripe_customer_id
        )
        
        # Set as default payment method
        await stripe_client.update_customer(
            customer_id=payment_profile.stripe_customer_id,
            invoice_settings={"default_payment_method": subscription_data.payment_method_id}
        )
    
    # Calculate price amount
    price_amount = tier.annual_price if subscription_data.is_annual else tier.monthly_price
    
    # Create Stripe subscription only for paid tiers
    stripe_subscription_id = None
    if requires_payment:
        # Get Stripe price ID from tier
        price_id = None
        if subscription_data.is_annual:
            # Use annual price ID
            price_id = tier.stripe_annual_price_id
            if not price_id:
                # Fall back to environment variable
                env_key = f"STRIPE_{tier.name.upper()}_ANNUAL_PRICE_ID"
                price_id = getattr(settings, env_key, None)
        else:
            # Monthly price
            price_id = tier.stripe_monthly_price_id
            if not price_id:
                # Fall back to environment variable
                env_key = f"STRIPE_{tier.name.upper()}_MONTHLY_PRICE_ID"
                price_id = getattr(settings, env_key, None)
        
        # Create subscription with price ID if available, otherwise use price_data
        if price_id:
            # Use existing price ID
            stripe_subscription = await stripe_client.create_subscription(
                customer_id=payment_profile.stripe_customer_id,
                price_id=price_id,
                metadata={
                    "practitioner_id": str(practitioner.id),
                    "tier_id": str(tier.id),
                    "tier_name": tier.name
                }
            )
        else:
            # Create inline price (fallback)
            price_amount = tier.annual_price if subscription_data.is_annual else tier.monthly_price
            interval = "year" if subscription_data.is_annual else "month"
            
            stripe_subscription = await stripe_client.create_subscription(
                customer_id=payment_profile.stripe_customer_id,
                price_data={
                    "unit_amount": int(price_amount * 100),  # Convert to cents
                    "currency": "usd",
                    "product_data": {
                        "name": f"Estuary {tier.name} Subscription",
                        "description": tier.description
                    },
                    "recurring": {
                        "interval": interval
                    }
                },
                metadata={
                    "practitioner_id": str(practitioner.id),
                    "tier_id": str(tier.id),
                    "tier_name": tier.name
                }
            )
        
        stripe_subscription_id = stripe_subscription.id
    
    # Create local subscription record
    subscription = await create_subscription_with_onboarding_sync(
        practitioner, tier, subscription_data, stripe_subscription_id
    )
    
    # Get usage counts for response
    services_count = await count_services_sync(practitioner)
    bookings_count = 0  # New subscription, no bookings yet this period
    
    return PractitionerSubscriptionResponse(
        id=subscription.id,
        practitioner_id=practitioner.id,
        tier=serialize_subscription_tier(tier),
        status='active',
        start_date=subscription.start_date,
        end_date=subscription.end_date,
        is_annual=subscription.is_annual,
        auto_renew=subscription.auto_renew,
        current_period_start=timezone.now(),
        current_period_end=timezone.now() + timedelta(days=365 if subscription.is_annual else 30),
        stripe_subscription_id=subscription.stripe_subscription_id,
        stripe_customer_id=payment_profile.stripe_customer_id,
        current_services_count=services_count,
        current_bookings_count=bookings_count,
        next_billing_date=timezone.now() + timedelta(days=365 if subscription.is_annual else 30),
        next_billing_amount=price_amount,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at
    )


@router.patch("/current", response_model=PractitionerSubscriptionResponse)
async def update_subscription(
    update_data: PractitionerSubscriptionUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Update subscription settings"""
    subscription = await get_current_subscription_sync(practitioner)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    # Update Stripe subscription if needed
    if update_data.auto_renew is not None and subscription.stripe_subscription_id:
        await stripe_client.update_subscription(
            subscription_id=subscription.stripe_subscription_id,
            cancel_at_period_end=not update_data.auto_renew
        )
    
    # Update payment method if provided
    if update_data.payment_method_id:
        payment_profile = practitioner.user.payment_profile
        await stripe_client.attach_payment_method(
            payment_method_id=update_data.payment_method_id,
            customer_id=payment_profile.stripe_customer_id
        )
        await stripe_client.update_customer(
            customer_id=payment_profile.stripe_customer_id,
            invoice_settings={"default_payment_method": update_data.payment_method_id}
        )
    
    # Update local record
    if update_data.auto_renew is not None:
        subscription.auto_renew = update_data.auto_renew
        await save_subscription_sync(subscription)
    
    # Return updated subscription
    return await get_current_subscription(practitioner)


@router.post("/upgrade", response_model=PractitionerSubscriptionResponse)
async def upgrade_subscription(
    upgrade_data: PractitionerSubscriptionUpgrade,
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Upgrade or downgrade subscription tier"""
    subscription = await get_current_subscription_sync(practitioner)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    # Get new tier
    new_tier = await get_object_or_404_async(SubscriptionTier, id=upgrade_data.new_tier_id, is_active=True)
    
    # Don't allow "upgrade" to same tier
    if new_tier.id == subscription.tier_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already on this subscription tier"
        )
    
    # Determine if this is annual or monthly
    is_annual = upgrade_data.is_annual if upgrade_data.is_annual is not None else subscription.is_annual
    new_price = new_tier.annual_price if is_annual else new_tier.monthly_price
    interval = "year" if is_annual else "month"
    
    # Update Stripe subscription
    if subscription.stripe_subscription_id:
        # Create new price in Stripe
        stripe_price = await stripe_client.create_price(
            unit_amount=int(new_price * 100),
            currency="usd",
            recurring={"interval": interval},
            product_data={
                "name": f"Estuary {new_tier.name} Subscription",
                "description": new_tier.description
            }
        )
        
        # Update subscription with new price
        await stripe_client.update_subscription(
            subscription_id=subscription.stripe_subscription_id,
            price_id=stripe_price.id,
            proration_behavior="create_prorations" if upgrade_data.prorate else "none",
            metadata={
                "tier_id": str(new_tier.id),
                "tier_name": new_tier.name
            }
        )
    
    # Update local subscription
    await update_subscription_tier_sync(subscription, new_tier, is_annual)
    
    # Return updated subscription
    return await get_current_subscription(practitioner)


@router.delete("/current")
async def cancel_subscription(
    reason: Optional[str] = Query(None, description="Cancellation reason"),
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Cancel practitioner subscription"""
    subscription = await get_current_subscription_sync(practitioner)
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    # Cancel Stripe subscription at period end
    if subscription.stripe_subscription_id:
        await stripe_client.cancel_subscription(
            subscription_id=subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
    
    # Update local subscription
    subscription.status = 'canceled'
    subscription.auto_renew = False
    await save_subscription_sync(subscription)
    
    # Store cancellation metadata
    if reason:
        # TODO: Store cancellation reason for analytics
        pass
    
    return {
        "message": "Subscription will be canceled at the end of the current billing period",
        "end_date": subscription.end_date or subscription.start_date + timedelta(days=30)
    }


# =============================================================================
# USAGE & LIMITS
# =============================================================================

@router.get("/usage", response_model=SubscriptionUsageResponse)
async def get_subscription_usage(
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Get current subscription usage and limits"""
    subscription = await get_current_subscription_sync(practitioner)
    
    # Default to free/basic tier if no subscription
    if not subscription:
        # Get the lowest tier as default
        default_tier = await get_lowest_tier_sync()
        if not default_tier:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No subscription tiers configured"
            )
        tier = default_tier
        tier_features = serialize_tier_features(tier)
    else:
        tier = subscription.tier
        tier_features = serialize_tier_features(tier)
    
    # Get current usage
    services_count = await count_services_sync(practitioner)
    
    locations_count = 1  # TODO: Implement multiple locations
    
    # Get current period bookings
    current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    bookings_count = await count_bookings_sync(practitioner, current_month_start)
    
    # Calculate remaining allowances
    services_limit = tier_features.max_services
    services_remaining = -1 if services_limit == -1 else max(0, services_limit - services_count)
    
    locations_limit = tier_features.max_locations
    locations_remaining = max(0, locations_limit - locations_count)
    
    bookings_limit = tier_features.max_monthly_bookings
    bookings_remaining = -1 if bookings_limit == -1 else max(0, bookings_limit - bookings_count)
    
    # Get commission rates
    # Assuming session service type for example
    session_type = await get_session_service_type_sync()
    if session_type:
        base_commission = await get_base_commission_sync(session_type)
        base_rate = base_commission.base_rate if base_commission else Decimal("15.00")
        
        # Get tier adjustment
        tier_adjustment = await get_tier_adjustment_sync(tier, base_commission)
        adjustment_rate = tier_adjustment.adjustment_percentage if tier_adjustment else Decimal("0.00")
        
        effective_rate = base_rate + adjustment_rate
    else:
        base_rate = Decimal("15.00")
        adjustment_rate = Decimal("0.00")
        effective_rate = base_rate
    
    # Suggest upgrade if at limits
    suggested_upgrade = None
    upgrade_reason = None
    if services_remaining == 0:
        # Find next tier up
        next_tier = await get_next_tier_sync(tier)
        if next_tier:
            suggested_upgrade = serialize_subscription_tier(next_tier)
            upgrade_reason = "You've reached your service limit. Upgrade to create more services."
    
    return SubscriptionUsageResponse(
        tier_name=tier.name,
        tier_features=tier_features,
        services_used=services_count,
        services_limit=services_limit,
        services_remaining=services_remaining,
        locations_used=locations_count,
        locations_limit=locations_limit,
        locations_remaining=locations_remaining,
        bookings_used=bookings_count,
        bookings_limit=bookings_limit,
        bookings_remaining=bookings_remaining,
        has_analytics=tier_features.analytics,
        has_priority_support=tier_features.priority_support,
        has_video_rooms=tier_features.video_rooms,
        has_advanced_scheduling=tier_features.advanced_scheduling,
        has_custom_branding=tier_features.custom_branding,
        base_commission_rate=base_rate,
        tier_commission_discount=adjustment_rate,
        effective_commission_rate=effective_rate,
        suggested_upgrade=suggested_upgrade,
        upgrade_reason=upgrade_reason
    )


# =============================================================================
# BILLING & INVOICES
# =============================================================================

@router.get("/invoices", response_model=InvoiceListResponse)
async def list_invoices(
    pagination: PaginationParams = Depends(),
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """List practitioner's subscription invoices"""
    payment_profile = getattr(practitioner.user, 'payment_profile', None)
    if not payment_profile or not payment_profile.stripe_customer_id:
        return InvoiceListResponse(results=[], total=0, limit=pagination.limit, offset=pagination.offset)
    
    # Get invoices from Stripe
    stripe_invoices = await stripe_client.list_invoices(
        customer=payment_profile.stripe_customer_id,
        limit=pagination.limit,
        starting_after=pagination.offset
    )
    
    # Convert to response format
    invoices = []
    for invoice in stripe_invoices.data:
        invoices.append(InvoiceResponse(
            id=invoice.id,
            invoice_number=invoice.number or f"INV-{invoice.id[-8:]}",
            status=invoice.status,
            amount_due=Decimal(invoice.amount_due) / 100,
            amount_paid=Decimal(invoice.amount_paid) / 100,
            currency=invoice.currency.upper(),
            created_at=datetime.fromtimestamp(invoice.created),
            due_date=datetime.fromtimestamp(invoice.due_date) if invoice.due_date else None,
            paid_at=datetime.fromtimestamp(invoice.status_transitions.paid_at) if invoice.status_transitions and invoice.status_transitions.paid_at else None,
            invoice_pdf_url=invoice.invoice_pdf,
            hosted_invoice_url=invoice.hosted_invoice_url,
            line_items=[{
                "description": item.description,
                "amount": Decimal(item.amount) / 100,
                "quantity": item.quantity
            } for item in invoice.lines.data]
        ))
    
    return InvoiceListResponse(
        results=invoices,
        total=len(invoices),  # Stripe doesn't provide total count easily
        limit=pagination.limit,
        offset=pagination.offset
    )


@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def list_payment_methods(
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """List payment methods for subscription billing"""
    payment_profile = getattr(practitioner.user, 'payment_profile', None)
    if not payment_profile or not payment_profile.stripe_customer_id:
        return []
    
    # Get payment methods from Stripe
    payment_methods = await stripe_client.list_payment_methods(
        customer=payment_profile.stripe_customer_id,
        type="card"
    )
    
    # Get default payment method
    customer = await stripe_client.retrieve_customer(payment_profile.stripe_customer_id)
    default_pm_id = customer.invoice_settings.default_payment_method if customer.invoice_settings else None
    
    # Convert to response format
    methods = []
    for pm in payment_methods.data:
        methods.append(PaymentMethodResponse(
            id=pm.id,
            type=pm.type,
            last4=pm.card.last4,
            brand=pm.card.brand,
            exp_month=pm.card.exp_month,
            exp_year=pm.card.exp_year,
            is_default=pm.id == default_pm_id
        ))
    
    return methods


# =============================================================================
# COMMISSION INFORMATION
# =============================================================================

@router.get("/commission-rates", response_model=List[CommissionAdjustmentResponse])
async def get_commission_rates(
    practitioner: Practitioner = Depends(get_current_practitioner)
):
    """Get commission rates for current subscription tier"""
    subscription = await get_current_subscription_sync(practitioner)
    tier = subscription.tier if subscription else None
    
    # Get all service type commissions
    commissions = await get_service_type_commissions_sync()
    
    rates = []
    for commission in commissions:
        base_rate = commission.base_rate
        
        # Get tier adjustment if applicable
        adjustment_rate = Decimal("0.00")
        if tier:
            adjustment = await get_tier_commission_adjustment_sync(tier, commission)
            if adjustment:
                adjustment_rate = adjustment.adjustment_percentage
        
        effective_rate = base_rate + adjustment_rate
        
        rates.append(CommissionAdjustmentResponse(
            service_type=commission.service_type.name,
            base_rate=base_rate,
            tier_adjustment=adjustment_rate,
            effective_rate=effective_rate
        ))
    
    return rates


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.post("/tiers", response_model=SubscriptionTierResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription_tier(
    tier_data: SubscriptionTierCreate,
    current_user: User = Depends(get_current_superuser)
):
    """Create a new subscription tier (admin only)"""
    tier = await create_subscription_tier_sync(tier_data)
    return serialize_subscription_tier(tier)


@router.patch("/tiers/{tier_id}", response_model=SubscriptionTierResponse)
async def update_subscription_tier(
    tier_id: int,
    tier_data: SubscriptionTierUpdate,
    current_user: User = Depends(get_current_superuser)
):
    """Update subscription tier (admin only)"""
    tier = await get_object_or_404_async(SubscriptionTier, id=tier_id)
    
    # Update fields
    update_data = tier_data.model_dump(exclude_unset=True)
    
    # Handle features separately
    if 'features' in update_data:
        features = update_data.pop('features')
        tier.features = features.model_dump() if features else tier.features
    
    # Update other fields
    for field, value in update_data.items():
        setattr(tier, field, value)
    
    await save_tier_sync(tier)
    
    return serialize_subscription_tier(tier)


@router.get("/analytics", response_model=SubscriptionAnalyticsResponse)
async def get_subscription_analytics(
    current_user: User = Depends(get_current_superuser)
):
    """Get platform-wide subscription analytics (admin only)"""
    # Get all subscriptions
    all_subscriptions = await get_all_subscriptions_sync()
    active_subscriptions = await get_active_subscriptions_sync()
    
    # Calculate revenue metrics
    total_revenue = Decimal("0")
    mrr = Decimal("0")
    arr = Decimal("0")
    
    for sub in active_subscriptions:
        if sub.is_annual and sub.tier.annual_price:
            annual_amount = sub.tier.annual_price
            monthly_amount = annual_amount / 12
        else:
            monthly_amount = sub.tier.monthly_price
            annual_amount = monthly_amount * 12
        
        mrr += monthly_amount
        arr += annual_amount
        total_revenue += annual_amount
    
    # Calculate metrics
    total_subscribers = await count_subscriptions_sync()
    active_count = await count_active_subscriptions_sync()
    arpu = mrr / active_count if active_count > 0 else Decimal("0")
    
    # Get new subscribers this month
    month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = await count_new_subscriptions_sync(month_start)
    
    # Get churned this month
    churned_this_month = await count_churned_subscriptions_sync(month_start)
    
    # Tier distribution
    tier_counts = {}
    tier_revenue = {}
    
    active_tiers = await get_active_tiers_sync()
    for tier in active_tiers:
        count = await count_tier_subscriptions_sync(tier)
        tier_counts[tier.name] = count
        
        # Calculate revenue for this tier
        tier_subs = await get_tier_subscriptions_sync(tier)
        revenue = Decimal("0")
        for sub in tier_subs:
            if sub.is_annual and tier.annual_price:
                revenue += tier.annual_price / 12
            else:
                revenue += tier.monthly_price
        tier_revenue[tier.name] = revenue
    
    # Calculate rates
    churn_rate = (churned_this_month / active_count * 100) if active_count > 0 else 0
    retention_rate = 100 - churn_rate
    
    # Commission impact
    # This is a simplified calculation
    total_commission = Decimal("0")  # TODO: Calculate from actual transactions
    avg_commission = Decimal("15.00")  # Default rate
    commission_savings = Decimal("0")  # TODO: Calculate actual savings
    
    return SubscriptionAnalyticsResponse(
        total_subscription_revenue=total_revenue,
        monthly_recurring_revenue=mrr,
        annual_recurring_revenue=arr,
        average_revenue_per_user=arpu,
        total_subscribers=total_subscribers,
        active_subscribers=active_count,
        new_subscribers_this_month=new_this_month,
        churned_subscribers_this_month=churned_this_month,
        subscribers_by_tier=tier_counts,
        revenue_by_tier=tier_revenue,
        month_over_month_growth=0.0,  # TODO: Calculate actual growth
        churn_rate=float(churn_rate),
        retention_rate=float(retention_rate),
        total_commission_collected=total_commission,
        average_commission_rate=avg_commission,
        commission_savings_from_upgrades=commission_savings
    )