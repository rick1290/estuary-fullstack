import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from payments.models import (
    SubscriptionTier,
    ServiceTypeCommission,
    TierCommissionAdjustment,
    ExternalServiceFee
)
from services.models import ServiceType

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Set up initial commission rates and subscription tiers for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset existing data before creating new records',
        )

    def handle(self, *args, **options):
        reset = options.get('reset', False)
        
        if reset:
            self.reset_data()
            
        self.setup_subscription_tiers()
        self.setup_service_type_commissions()
        self.setup_tier_adjustments()
        self.setup_external_fees()
        
        self.stdout.write(self.style.SUCCESS('Commission system setup completed'))

    def reset_data(self):
        """Reset existing commission system data."""
        self.stdout.write('Resetting existing commission system data...')
        
        with transaction.atomic():
            ExternalServiceFee.objects.all().delete()
            TierCommissionAdjustment.objects.all().delete()
            ServiceTypeCommission.objects.all().delete()
            SubscriptionTier.objects.all().delete()
            
        self.stdout.write(self.style.SUCCESS('Reset completed'))

    def setup_subscription_tiers(self):
        """Set up subscription tiers."""
        self.stdout.write('Setting up subscription tiers...')
        
        tiers = [
            {
                'name': 'Basic',
                'description': 'Entry-level tier for new practitioners',
                'monthly_price': Decimal('29.99'),
                'annual_price': Decimal('299.90'),
                'features': {
                    'max_services': 5,
                    'community_posts': True,
                    'analytics': False,
                    'priority_support': False,
                },
                'order': 1,
                'is_active': True,
            },
            {
                'name': 'Professional',
                'description': 'For established practitioners with a growing client base',
                'monthly_price': Decimal('59.99'),
                'annual_price': Decimal('599.90'),
                'features': {
                    'max_services': 15,
                    'community_posts': True,
                    'analytics': True,
                    'priority_support': False,
                },
                'order': 2,
                'is_active': True,
            },
            {
                'name': 'Premium',
                'description': 'For high-volume practitioners with established practices',
                'monthly_price': Decimal('99.99'),
                'annual_price': Decimal('999.90'),
                'features': {
                    'max_services': -1,  # Unlimited
                    'community_posts': True,
                    'analytics': True,
                    'priority_support': True,
                },
                'order': 3,
                'is_active': True,
            },
        ]
        
        created_count = 0
        for tier_data in tiers:
            tier, created = SubscriptionTier.objects.update_or_create(
                name=tier_data['name'],
                defaults=tier_data
            )
            if created:
                created_count += 1
                self.stdout.write(f'  Created tier: {tier.name}')
            else:
                self.stdout.write(f'  Updated tier: {tier.name}')
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} subscription tiers'))

    def setup_service_type_commissions(self):
        """Set up service type commissions."""
        self.stdout.write('Setting up service type commissions...')
        
        # Get or create service types
        service_types = self.get_or_create_service_types()
        
        commissions = [
            {
                'service_type_name': 'In-Person Session',
                'base_rate': Decimal('15.00'),
                'description': 'Standard commission for in-person sessions',
            },
            {
                'service_type_name': 'Online Session',
                'base_rate': Decimal('12.00'),
                'description': 'Reduced commission for online sessions',
            },
            {
                'service_type_name': 'Workshop',
                'base_rate': Decimal('20.00'),
                'description': 'Higher commission for workshops due to platform marketing',
            },
            {
                'service_type_name': 'Course',
                'base_rate': Decimal('18.00'),
                'description': 'Commission for multi-session courses',
            },
            {
                'service_type_name': 'Package',
                'base_rate': Decimal('15.00'),
                'description': 'Commission for service packages',
            },
        ]
        
        created_count = 0
        for commission_data in commissions:
            service_type_name = commission_data.pop('service_type_name')
            
            # Find the service type
            service_type = next((st for st in service_types if st.name == service_type_name), None)
            if not service_type:
                self.stdout.write(self.style.WARNING(f'  Service type not found: {service_type_name}'))
                continue
                
            commission, created = ServiceTypeCommission.objects.update_or_create(
                service_type=service_type,
                defaults={
                    **commission_data,
                    'is_active': True,
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'  Created commission for {service_type.name}: {commission.base_rate}%')
            else:
                self.stdout.write(f'  Updated commission for {service_type.name}: {commission.base_rate}%')
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} service type commissions'))

    def setup_tier_adjustments(self):
        """Set up tier-specific commission adjustments."""
        self.stdout.write('Setting up tier commission adjustments...')
        
        # Get tiers and commissions
        tiers = SubscriptionTier.objects.filter(is_active=True)
        commissions = ServiceTypeCommission.objects.filter(is_active=True)
        
        if not tiers or not commissions:
            self.stdout.write(self.style.WARNING('  No tiers or commissions found, skipping adjustments'))
            return
            
        # Define adjustments
        adjustments = [
            # Professional tier adjustments
            {
                'tier_name': 'Professional',
                'service_type_name': 'In-Person Session',
                'adjustment_percentage': Decimal('-2.00'),
            },
            {
                'tier_name': 'Professional',
                'service_type_name': 'Online Session',
                'adjustment_percentage': Decimal('-2.00'),
            },
            {
                'tier_name': 'Professional',
                'service_type_name': 'Workshop',
                'adjustment_percentage': Decimal('-3.00'),
            },
            
            # Premium tier adjustments
            {
                'tier_name': 'Premium',
                'service_type_name': 'In-Person Session',
                'adjustment_percentage': Decimal('-5.00'),
            },
            {
                'tier_name': 'Premium',
                'service_type_name': 'Online Session',
                'adjustment_percentage': Decimal('-4.00'),
            },
            {
                'tier_name': 'Premium',
                'service_type_name': 'Workshop',
                'adjustment_percentage': Decimal('-7.00'),
            },
            {
                'tier_name': 'Premium',
                'service_type_name': 'Course',
                'adjustment_percentage': Decimal('-5.00'),
            },
            {
                'tier_name': 'Premium',
                'service_type_name': 'Package',
                'adjustment_percentage': Decimal('-5.00'),
            },
        ]
        
        created_count = 0
        for adjustment_data in adjustments:
            tier_name = adjustment_data.pop('tier_name')
            service_type_name = adjustment_data.pop('service_type_name')
            
            # Find the tier
            tier = next((t for t in tiers if t.name == tier_name), None)
            if not tier:
                self.stdout.write(self.style.WARNING(f'  Tier not found: {tier_name}'))
                continue
                
            # Find the commission
            commission = next(
                (c for c in commissions if c.service_type.name == service_type_name), 
                None
            )
            if not commission:
                self.stdout.write(self.style.WARNING(f'  Commission not found for: {service_type_name}'))
                continue
                
            adjustment, created = TierCommissionAdjustment.objects.update_or_create(
                tier=tier,
                service_type_commission=commission,
                defaults={
                    **adjustment_data,
                    'is_active': True,
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    f'  Created adjustment for {tier.name} / {service_type_name}: {adjustment.adjustment_percentage}%'
                )
            else:
                self.stdout.write(
                    f'  Updated adjustment for {tier.name} / {service_type_name}: {adjustment.adjustment_percentage}%'
                )
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} tier commission adjustments'))

    def setup_external_fees(self):
        """Set up external service fees."""
        self.stdout.write('Setting up external service fees...')
        
        fees = [
            {
                'name': 'Stripe Payment Processing',
                'description': 'Stripe fee for payment processing',
                'fee_type': 'percentage',
                'amount': Decimal('2.9'),
                'is_practitioner_responsible': False,
            },
            {
                'name': 'Daily.co Video Service',
                'description': 'Fee for video conferencing service',
                'fee_type': 'fixed',
                'amount': Decimal('0.50'),
                'is_practitioner_responsible': True,
                'service_type_name': 'Online Session',
            },
        ]
        
        # Get service types
        service_types = list(ServiceType.objects.all())
        
        created_count = 0
        for fee_data in fees:
            service_type_name = fee_data.pop('service_type_name', None)
            service_type = None
            
            if service_type_name:
                # Find the service type
                service_type = next((st for st in service_types if st.name == service_type_name), None)
                if not service_type:
                    self.stdout.write(self.style.WARNING(f'  Service type not found: {service_type_name}'))
                    continue
            
            fee, created = ExternalServiceFee.objects.update_or_create(
                name=fee_data['name'],
                defaults={
                    **fee_data,
                    'service_type': service_type,
                    'is_active': True,
                }
            )
            
            if created:
                created_count += 1
                service_type_text = f" for {service_type.name}" if service_type else ""
                self.stdout.write(f'  Created fee: {fee.name}{service_type_text}')
            else:
                service_type_text = f" for {service_type.name}" if service_type else ""
                self.stdout.write(f'  Updated fee: {fee.name}{service_type_text}')
        
        self.stdout.write(self.style.SUCCESS(f'Created {created_count} external service fees'))

    def get_or_create_service_types(self):
        """Get or create service types for testing."""
        service_type_names = [
            'In-Person Session',
            'Online Session',
            'Workshop',
            'Course',
            'Package',
        ]
        
        service_types = []
        for name in service_type_names:
            # First try to get the service type by name
            try:
                service_type = ServiceType.objects.get(name=name)
                self.stdout.write(f'  Found existing service type: {name}')
                service_types.append(service_type)
            except ServiceType.DoesNotExist:
                # Only create if it doesn't exist
                try:
                    service_type = ServiceType.objects.create(
                        name=name,
                        description=f'Description for {name}',
                        code=name.lower().replace(' ', '_')
                    )
                    self.stdout.write(f'  Created service type: {name}')
                    service_types.append(service_type)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  Error creating service type {name}: {str(e)}'))
            
        return service_types
