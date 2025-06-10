"""
Management command to sync subscription tiers with Stripe products and prices.

This command:
1. Creates Stripe products for each subscription tier
2. Creates monthly and annual prices for each product
3. Updates the database with Stripe IDs
4. Can be run multiple times safely (idempotent)
"""
import os
import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
from decimal import Decimal

import stripe
from payments.models import SubscriptionTier

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync subscription tiers with Stripe products and prices'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-stripe-products',
            action='store_true',
            help='Create products in Stripe (use for initial setup)',
        )
        parser.add_argument(
            '--use-env-ids',
            action='store_true',
            help='Use product/price IDs from environment variables',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        create_products = options.get('create_stripe_products', False)
        use_env_ids = options.get('use_env_ids', False)
        dry_run = options.get('dry_run', False)
        
        if create_products and use_env_ids:
            self.stdout.write(
                self.style.ERROR(
                    "Cannot use both --create-stripe-products and --use-env-ids"
                )
            )
            return
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))
        
        # Ensure subscription tiers exist
        self.ensure_subscription_tiers()
        
        if create_products:
            self.create_stripe_products(dry_run)
        elif use_env_ids:
            self.sync_from_env_ids(dry_run)
        else:
            self.display_current_setup()

    def ensure_subscription_tiers(self):
        """Ensure the three subscription tiers exist in the database."""
        tiers_data = [
            {
                'name': 'Basic',
                'description': 'Perfect for practitioners just starting out',
                'monthly_price': Decimal('29.99'),
                'annual_price': Decimal('299.90'),  # 2 months free
                'features': {
                    'max_services': 5,
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
                },
                'order': 1,
            },
            {
                'name': 'Professional',
                'description': 'For established practitioners growing their practice',
                'monthly_price': Decimal('79.99'),
                'annual_price': Decimal('799.90'),  # 2 months free
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
                    'commission_discount': 5  # 5% off base commission
                },
                'order': 2,
            },
            {
                'name': 'Premium',
                'description': 'For high-volume practitioners who need it all',
                'monthly_price': Decimal('149.99'),
                'annual_price': Decimal('1499.90'),  # 2 months free
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
                    'commission_discount': 10  # 10% off base commission
                },
                'order': 3,
            },
        ]
        
        for tier_data in tiers_data:
            tier, created = SubscriptionTier.objects.update_or_create(
                name=tier_data['name'],
                defaults={
                    'description': tier_data['description'],
                    'monthly_price': tier_data['monthly_price'],
                    'annual_price': tier_data['annual_price'],
                    'features': tier_data['features'],
                    'order': tier_data['order'],
                    'is_active': True,
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created tier: {tier.name}"))
            else:
                self.stdout.write(f"Updated tier: {tier.name}")

    def create_stripe_products(self, dry_run=False):
        """Create Stripe products and prices for each tier."""
        tiers = SubscriptionTier.objects.filter(is_active=True).order_by('order')
        
        for tier in tiers:
            self.stdout.write(f"\nProcessing {tier.name} tier...")
            
            # Create or update Stripe product
            product_data = {
                'name': f'Estuary {tier.name}',
                'description': tier.description,
                'metadata': {
                    'tier_id': str(tier.id),
                    'tier_name': tier.name,
                }
            }
            
            if dry_run:
                self.stdout.write(f"  Would create product: {product_data}")
            else:
                # Check if product already exists
                if tier.stripe_product_id:
                    # Update existing product
                    try:
                        product = stripe.Product.modify(
                            tier.stripe_product_id,
                            **product_data
                        )
                        self.stdout.write(f"  Updated existing product: {product.id}")
                    except stripe.error.InvalidRequestError:
                        # Product doesn't exist, create new one
                        product = stripe.Product.create(**product_data)
                        self.stdout.write(self.style.SUCCESS(f"  Created new product: {product.id}"))
                else:
                    # Create new product
                    product = stripe.Product.create(**product_data)
                    self.stdout.write(self.style.SUCCESS(f"  Created new product: {product.id}"))
                
                # Create monthly price
                monthly_price = stripe.Price.create(
                    product=product.id,
                    unit_amount=int(tier.monthly_price * 100),  # Convert to cents
                    currency='usd',
                    recurring={'interval': 'month'},
                    metadata={
                        'tier_id': str(tier.id),
                        'tier_name': tier.name,
                        'billing_type': 'monthly'
                    }
                )
                self.stdout.write(self.style.SUCCESS(f"  Created monthly price: {monthly_price.id}"))
                
                # Create annual price
                annual_price = stripe.Price.create(
                    product=product.id,
                    unit_amount=int(tier.annual_price * 100),  # Convert to cents
                    currency='usd',
                    recurring={'interval': 'year'},
                    metadata={
                        'tier_id': str(tier.id),
                        'tier_name': tier.name,
                        'billing_type': 'annual'
                    }
                )
                self.stdout.write(self.style.SUCCESS(f"  Created annual price: {annual_price.id}"))
                
                # Update tier with Stripe IDs
                tier.stripe_product_id = product.id
                tier.stripe_monthly_price_id = monthly_price.id
                tier.stripe_annual_price_id = annual_price.id
                tier.save()
                
                # Display environment variables to set
                env_prefix = tier.name.upper()
                self.stdout.write(self.style.WARNING(f"\nAdd these to your .env file:"))
                self.stdout.write(f"STRIPE_{env_prefix}_PRODUCT_ID={product.id}")
                self.stdout.write(f"STRIPE_{env_prefix}_MONTHLY_PRICE_ID={monthly_price.id}")
                self.stdout.write(f"STRIPE_{env_prefix}_ANNUAL_PRICE_ID={annual_price.id}")

    def sync_from_env_ids(self, dry_run=False):
        """Sync subscription tiers with Stripe IDs from environment variables."""
        tier_env_mapping = {
            'Basic': 'BASIC',
            'Professional': 'PROFESSIONAL',
            'Premium': 'PREMIUM',
        }
        
        for tier_name, env_prefix in tier_env_mapping.items():
            try:
                tier = SubscriptionTier.objects.get(name=tier_name)
            except SubscriptionTier.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Tier '{tier_name}' not found in database")
                )
                continue
            
            # Get IDs from environment
            product_id = os.environ.get(f'STRIPE_{env_prefix}_PRODUCT_ID')
            monthly_price_id = os.environ.get(f'STRIPE_{env_prefix}_MONTHLY_PRICE_ID')
            annual_price_id = os.environ.get(f'STRIPE_{env_prefix}_ANNUAL_PRICE_ID')
            
            if not all([product_id, monthly_price_id, annual_price_id]):
                self.stdout.write(
                    self.style.WARNING(
                        f"Missing Stripe IDs for {tier_name} tier in environment"
                    )
                )
                continue
            
            # Verify IDs exist in Stripe
            try:
                product = stripe.Product.retrieve(product_id)
                monthly_price = stripe.Price.retrieve(monthly_price_id)
                annual_price = stripe.Price.retrieve(annual_price_id)
                
                self.stdout.write(f"\n{tier_name} tier:")
                self.stdout.write(f"  Product: {product.name} ({product.id})")
                self.stdout.write(f"  Monthly: ${monthly_price.unit_amount/100:.2f}")
                self.stdout.write(f"  Annual: ${annual_price.unit_amount/100:.2f}")
                
            except stripe.error.InvalidRequestError as e:
                self.stdout.write(
                    self.style.ERROR(f"Invalid Stripe ID for {tier_name}: {str(e)}")
                )
                continue
            
            # Update tier with Stripe IDs
            if not dry_run:
                tier.stripe_product_id = product_id
                tier.stripe_monthly_price_id = monthly_price_id
                tier.stripe_annual_price_id = annual_price_id
                tier.save()
                self.stdout.write(self.style.SUCCESS(f"  Updated {tier_name} tier with Stripe IDs"))

    def display_current_setup(self):
        """Display current subscription tier setup."""
        self.stdout.write("\nCurrent Subscription Tiers:")
        self.stdout.write("-" * 80)
        
        tiers = SubscriptionTier.objects.filter(is_active=True).order_by('order')
        
        for tier in tiers:
            self.stdout.write(f"\n{tier.name} Tier:")
            self.stdout.write(f"  Description: {tier.description}")
            self.stdout.write(f"  Monthly Price: ${tier.monthly_price}")
            self.stdout.write(f"  Annual Price: ${tier.annual_price}")
            
            if tier.stripe_product_id:
                self.stdout.write(f"  Stripe Product ID: {tier.stripe_product_id}")
                self.stdout.write(f"  Monthly Price ID: {tier.stripe_monthly_price_id or 'Not set'}")
                self.stdout.write(f"  Annual Price ID: {tier.stripe_annual_price_id or 'Not set'}")
            else:
                self.stdout.write(self.style.WARNING("  Stripe IDs: Not configured"))
            
            if tier.features:
                self.stdout.write("  Features:")
                for feature, value in tier.features.items():
                    if isinstance(value, bool):
                        display_value = "✓" if value else "✗"
                    elif value == -1:
                        display_value = "Unlimited"
                    else:
                        display_value = str(value)
                    self.stdout.write(f"    - {feature}: {display_value}")
        
        self.stdout.write("\n" + "-" * 80)
        self.stdout.write(
            "\nTo create Stripe products: python manage.py sync_stripe_subscriptions --create-stripe-products"
        )
        self.stdout.write(
            "To sync from env vars: python manage.py sync_stripe_subscriptions --use-env-ids"
        )