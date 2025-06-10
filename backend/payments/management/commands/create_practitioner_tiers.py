"""
Create practitioner subscription tiers with the correct pricing structure.

Free Tier: $0/month - 20% commission
Entry Tier: $29/month - 15% commission  
Premium Tier: $99/month - 10% commission
"""
import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal

from payments.models import SubscriptionTier

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Create practitioner subscription tiers with correct pricing'

    def handle(self, *args, **options):
        """Create the three practitioner subscription tiers."""
        
        with transaction.atomic():
            # Create Free tier
            free_tier, created = SubscriptionTier.objects.update_or_create(
                name='Free',
                defaults={
                    'description': 'Get started with basic features and pay as you grow',
                    'monthly_price': Decimal('0.00'),
                    'annual_price': Decimal('0.00'),
                    'features': {
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
                        'max_monthly_bookings': 20,
                        'commission_rate': 20,  # 20% commission
                    },
                    'order': 0,
                    'is_active': True,
                }
            )
            self.stdout.write(
                self.style.SUCCESS(f"{'Created' if created else 'Updated'} Free tier")
            )
            
            # Create Entry tier
            entry_tier, created = SubscriptionTier.objects.update_or_create(
                name='Entry',
                defaults={
                    'description': 'Perfect for growing practices with regular clients',
                    'monthly_price': Decimal('29.00'),
                    'annual_price': Decimal('290.00'),  # 2 months free
                    'features': {
                        'max_services': 20,
                        'community_posts': True,
                        'analytics': True,
                        'priority_support': False,
                        'video_rooms': True,
                        'advanced_scheduling': True,
                        'custom_branding': False,
                        'bulk_operations': True,
                        'api_access': False,
                        'max_locations': 3,
                        'max_staff': 2,
                        'max_monthly_bookings': 200,
                        'commission_rate': 15,  # 15% commission
                    },
                    'order': 1,
                    'is_active': True,
                }
            )
            self.stdout.write(
                self.style.SUCCESS(f"{'Created' if created else 'Updated'} Entry tier")
            )
            
            # Create Premium tier
            premium_tier, created = SubscriptionTier.objects.update_or_create(
                name='Premium',
                defaults={
                    'description': 'For established practitioners who need unlimited everything',
                    'monthly_price': Decimal('99.00'),
                    'annual_price': Decimal('990.00'),  # 2 months free
                    'features': {
                        'max_services': -1,  # Unlimited
                        'community_posts': True,
                        'analytics': True,
                        'priority_support': True,
                        'video_rooms': True,
                        'advanced_scheduling': True,
                        'custom_branding': True,
                        'bulk_operations': True,
                        'api_access': True,
                        'max_locations': -1,  # Unlimited
                        'max_staff': -1,  # Unlimited
                        'max_monthly_bookings': -1,  # Unlimited
                        'commission_rate': 10,  # 10% commission
                    },
                    'order': 2,
                    'is_active': True,
                }
            )
            self.stdout.write(
                self.style.SUCCESS(f"{'Created' if created else 'Updated'} Premium tier")
            )
            
            # Deactivate old tiers if they exist
            old_tiers = SubscriptionTier.objects.exclude(
                name__in=['Free', 'Entry', 'Premium']
            )
            if old_tiers.exists():
                old_tiers.update(is_active=False)
                self.stdout.write(
                    self.style.WARNING(f"Deactivated {old_tiers.count()} old tiers")
                )
            
        self.stdout.write(self.style.SUCCESS("\nSubscription tiers created successfully!"))
        self.stdout.write("\nNext steps:")
        self.stdout.write("1. Run: python manage.py sync_stripe_subscriptions --create-stripe-products")
        self.stdout.write("2. Add the generated Stripe IDs to your .env file")
        self.stdout.write("3. Test the subscription flow with a practitioner account")