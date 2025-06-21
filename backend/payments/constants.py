"""
Constants for the payments app
"""
from django.db import models


class SubscriptionTierCode(models.TextChoices):
    """
    Fixed subscription tier codes that map to SubscriptionTier records.
    This provides type safety while keeping pricing/features flexible in the database.
    """
    BASIC = 'basic', 'Basic'
    PROFESSIONAL = 'professional', 'Professional' 
    PREMIUM = 'premium', 'Premium'


# Commission rates by service type (in percentage)
DEFAULT_COMMISSION_RATES = {
    'session': 15.0,
    'workshop': 20.0,
    'course': 20.0,
    'package': 15.0,
    'bundle': 10.0,
}

# Commission adjustments by tier (in percentage points)
TIER_COMMISSION_ADJUSTMENTS = {
    SubscriptionTierCode.BASIC: 0.0,        # No adjustment
    SubscriptionTierCode.PROFESSIONAL: -2.0,  # 2% discount
    SubscriptionTierCode.PREMIUM: -5.0,       # 5% discount
}