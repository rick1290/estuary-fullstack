#!/usr/bin/env python
"""
Setup practitioner subscription for testing.
"""
import os
import sys
import django

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.contrib.auth import get_user_model
from practitioners.models import Practitioner
from payments.models import SubscriptionTier, PractitionerSubscription
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

def setup_subscription():
    """Setup subscription tiers and assign one to the test practitioner."""
    print("Setting up subscription system...")
    
    # 1. Create subscription tiers if they don't exist
    print("\n1. Creating subscription tiers...")
    
    tiers_data = [
        {
            "code": "free",
            "name": "Free",
            "description": "Basic access with limited features",
            "monthly_price": 0,
            "annual_price": 0,
            "commission_percentage": 20,
            "features": {
                "max_services": 2,
                "community_posts": True,
                "analytics": False,
                "priority_support": False,
                "video_rooms": True,
                "advanced_scheduling": False,
                "custom_branding": False,
                "bulk_operations": False,
                "api_access": False,
                "max_locations": 1,
                "max_staff": 0,
                "max_monthly_bookings": 50,
                "commission_discount": 0
            },
            "order": 1,
            "is_active": True
        },
        {
            "code": "entry",
            "name": "Entry",
            "description": "For growing practitioners",
            "monthly_price": 2900,  # $29.00
            "annual_price": 29000,  # $290.00
            "commission_percentage": 15,
            "features": {
                "max_services": 20,
                "community_posts": True,
                "analytics": True,
                "priority_support": False,
                "video_rooms": True,
                "advanced_scheduling": True,
                "custom_branding": False,
                "bulk_operations": True,
                "api_access": False,
                "max_locations": 3,
                "max_staff": 2,
                "max_monthly_bookings": 200,
                "commission_discount": 5
            },
            "order": 2,
            "is_active": True
        },
        {
            "code": "premium",
            "name": "Premium",
            "description": "For established practitioners",
            "monthly_price": 9900,  # $99.00
            "annual_price": 99000,  # $990.00
            "commission_percentage": 10,
            "features": {
                "max_services": -1,  # unlimited
                "community_posts": True,
                "analytics": True,
                "priority_support": True,
                "video_rooms": True,
                "advanced_scheduling": True,
                "custom_branding": True,
                "bulk_operations": True,
                "api_access": True,
                "max_locations": -1,  # unlimited
                "max_staff": -1,  # unlimited
                "max_monthly_bookings": -1,  # unlimited
                "commission_discount": 10
            },
            "order": 3,
            "is_active": True
        }
    ]
    
    created_tiers = {}
    for tier_data in tiers_data:
        tier, created = SubscriptionTier.objects.get_or_create(
            code=tier_data["code"],
            defaults=tier_data
        )
        created_tiers[tier.code] = tier
        if created:
            print(f"  ✓ Created tier: {tier.name} (${tier.monthly_price/100}/mo)")
        else:
            print(f"  - Tier exists: {tier.name}")
    
    # 2. Assign subscription to test practitioner
    print("\n2. Setting up practitioner subscription...")
    
    try:
        practitioner = Practitioner.objects.get(user__email="practitioner@estuary.com")
        
        # Check if subscription exists
        existing = PractitionerSubscription.objects.filter(
            practitioner=practitioner,
            status__in=['active', 'trialing']
        ).first()
        
        if existing:
            print(f"  - Practitioner already has {existing.tier.name} subscription")
        else:
            # Create an entry-level subscription
            entry_tier = created_tiers['entry']
            subscription = PractitionerSubscription.objects.create(
                practitioner=practitioner,
                tier=entry_tier,
                status='active',
                started_at=timezone.now(),
                current_period_start=timezone.now(),
                current_period_end=timezone.now() + timedelta(days=30),
                stripe_subscription_id=f"test_sub_{practitioner.id}",
                stripe_customer_id=f"test_cust_{practitioner.user.id}"
            )
            print(f"  ✓ Created {entry_tier.name} subscription for {practitioner.display_name}")
            print(f"    - Max services: {entry_tier.features['max_services']}")
            print(f"    - Commission: {entry_tier.commission_percentage}%")
            
    except Practitioner.DoesNotExist:
        print("  ✗ Test practitioner not found!")
        print("    Run setup_test_data.py first")
    
    # 3. Show summary
    print("\n3. Summary")
    print("-" * 50)
    print(f"Total tiers: {SubscriptionTier.objects.count()}")
    print(f"Active subscriptions: {PractitionerSubscription.objects.filter(status='active').count()}")
    
    # Show tier comparison
    print("\nTier Comparison:")
    print(f"{'Tier':<10} {'Price':<10} {'Services':<12} {'Commission':<12}")
    print("-" * 45)
    for tier in SubscriptionTier.objects.order_by('order'):
        price = f"${tier.monthly_price/100:.0f}/mo"
        services = tier.features.get('max_services', 0)
        services_str = "Unlimited" if services == -1 else str(services)
        print(f"{tier.name:<10} {price:<10} {services_str:<12} {tier.commission_percentage}%")

if __name__ == "__main__":
    setup_subscription()