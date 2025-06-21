"""
Management command to create default subscription tiers
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from payments.models import SubscriptionTier, ServiceTypeCommission, TierCommissionAdjustment
from payments.constants import SubscriptionTierCode
from services.models import ServiceType
import os


class Command(BaseCommand):
    help = 'Create default subscription tiers and commission adjustments'

    def handle(self, *args, **options):
        with transaction.atomic():
            # Create subscription tiers
            basic_tier, _ = SubscriptionTier.objects.update_or_create(
                code=SubscriptionTierCode.BASIC,
                defaults={
                    'name': 'Basic',
                    'description': 'Perfect for practitioners just starting out',
                    'monthly_price': 29.00,
                    'annual_price': 290.00,  # ~17% discount
                    'features': [
                        'Up to 20 bookings per month',
                        'Basic scheduling tools',
                        'Client messaging',
                        'Standard support',
                        'Basic analytics'
                    ],
                    'is_active': True,
                    'order': 1,
                    'stripe_product_id': os.getenv('STRIPE_BASIC_PRODUCT_ID', ''),
                    'stripe_monthly_price_id': os.getenv('STRIPE_BASIC_MONTHLY_PRICE_ID', ''),
                    'stripe_annual_price_id': os.getenv('STRIPE_BASIC_ANNUAL_PRICE_ID', ''),
                }
            )
            
            professional_tier, _ = SubscriptionTier.objects.update_or_create(
                code=SubscriptionTierCode.PROFESSIONAL,
                defaults={
                    'name': 'Professional',
                    'description': 'For established practitioners ready to grow',
                    'monthly_price': 79.00,
                    'annual_price': 790.00,  # ~17% discount
                    'features': [
                        'Unlimited bookings',
                        'Advanced scheduling & calendar sync',
                        'Priority client messaging',
                        'Automated reminders',
                        'Advanced analytics',
                        'Custom branding',
                        'Priority support',
                        'Group session management'
                    ],
                    'is_active': True,
                    'order': 2,
                    'stripe_product_id': os.getenv('STRIPE_PROFESSIONAL_PRODUCT_ID', ''),
                    'stripe_monthly_price_id': os.getenv('STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID', ''),
                    'stripe_annual_price_id': os.getenv('STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID', ''),
                }
            )
            
            premium_tier, _ = SubscriptionTier.objects.update_or_create(
                code=SubscriptionTierCode.PREMIUM,
                defaults={
                    'name': 'Premium',
                    'description': 'For high-volume practitioners who need it all',
                    'monthly_price': 149.00,
                    'annual_price': 1490.00,  # ~17% discount
                    'features': [
                        'Everything in Professional',
                        'Multi-practitioner support',
                        'API access',
                        'White-label options',
                        'Dedicated account manager',
                        'Custom integrations',
                        'Advanced reporting',
                        'Bulk import/export',
                        'Priority feature requests'
                    ],
                    'is_active': True,
                    'order': 3,
                    'stripe_product_id': os.getenv('STRIPE_PREMIUM_PRODUCT_ID', ''),
                    'stripe_monthly_price_id': os.getenv('STRIPE_PREMIUM_MONTHLY_PRICE_ID', ''),
                    'stripe_annual_price_id': os.getenv('STRIPE_PREMIUM_ANNUAL_PRICE_ID', ''),
                }
            )
            
            self.stdout.write(self.style.SUCCESS('Successfully created subscription tiers'))
            
            # Create commission adjustments for each tier and service type
            service_types = ServiceType.objects.all()
            
            # Basic tier has standard rates (no adjustment)
            # Professional tier gets 2% discount
            # Premium tier gets 5% discount
            
            tier_adjustments = {
                basic_tier: 0,
                professional_tier: -2.0,
                premium_tier: -5.0
            }
            
            created_adjustments = 0
            for tier, adjustment in tier_adjustments.items():
                if adjustment == 0:
                    continue  # Skip basic tier (no adjustment needed)
                    
                for service_type in service_types:
                    # Get or create the base commission rate
                    commission, _ = ServiceTypeCommission.objects.get_or_create(
                        service_type=service_type,
                        defaults={
                            'base_rate': 15.0,  # Default 15% commission
                            'description': f'Base commission rate for {service_type.name}',
                            'is_active': True
                        }
                    )
                    
                    # Create tier adjustment
                    _, created = TierCommissionAdjustment.objects.update_or_create(
                        tier=tier,
                        service_type_commission=commission,
                        defaults={
                            'adjustment_percentage': adjustment,
                            'is_active': True
                        }
                    )
                    if created:
                        created_adjustments += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created {created_adjustments} commission adjustments'
                )
            )