"""
Django management command to test Stripe checkout functionality.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from integrations.stripe.api.services import CheckoutService
from integrations.stripe.api.schemas import CheckoutType
from services.models import Service
from practitioners.models import Practitioner

User = get_user_model()


class Command(BaseCommand):
    help = 'Test Stripe checkout functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            type=str,
            help='Email of the user to test with',
            required=True
        )
        parser.add_argument(
            '--checkout-type',
            type=str,
            choices=['session', 'bundle', 'package'],
            default='session',
            help='Type of checkout to test'
        )

    def handle(self, *args, **options):
        user_email = options['user_email']
        checkout_type = options['checkout_type']
        
        # Get user
        try:
            user = User.objects.get(email=user_email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email {user_email} not found'))
            return
            
        self.stdout.write(self.style.SUCCESS(f'Testing checkout for user: {user.email}'))
        
        # Map command line option to CheckoutType
        type_map = {
            'session': CheckoutType.SINGLE_SESSION,
            'bundle': CheckoutType.BUNDLE,
            'package': CheckoutType.PACKAGE
        }
        checkout_enum = type_map[checkout_type]
        
        # Get a test service based on type
        service = self._get_test_service(checkout_type)
        if not service:
            self.stdout.write(self.style.ERROR(f'No suitable {checkout_type} service found'))
            return
            
        # Get a practitioner
        practitioner = self._get_test_practitioner(service)
        if not practitioner:
            self.stdout.write(self.style.ERROR('No practitioner found'))
            return
            
        # Create checkout service
        checkout_service = CheckoutService(user)
        
        # Prepare items based on checkout type
        if checkout_type == 'session':
            items = [{
                'service_id': service.id,
                'practitioner_id': practitioner.id,
                'start_time': timezone.now() + timedelta(days=7),
                'end_time': timezone.now() + timedelta(days=7, hours=1),
                'quantity': 1
            }]
        else:
            items = [{
                'service_id': service.id,
                'practitioner_id': practitioner.id,
                'quantity': 1
            }]
            
        self.stdout.write(f'Testing {checkout_type} checkout with service: {service.name}')
        
        try:
            # Test price calculation
            self.stdout.write('\n1. Testing price calculation...')
            import asyncio
            
            async def test_pricing():
                return await checkout_service.calculate_pricing(
                    checkout_type=checkout_enum,
                    items=items,
                    use_credits=False
                )
                
            pricing = asyncio.run(test_pricing())
            
            self.stdout.write(self.style.SUCCESS('Price calculation successful:'))
            self.stdout.write(f'  - Subtotal: ${pricing["subtotal_cents"] / 100:.2f}')
            self.stdout.write(f'  - Tax: ${pricing["tax_cents"] / 100:.2f}')
            self.stdout.write(f'  - Total: ${pricing["total_cents"] / 100:.2f}')
            
            # Test checkout session creation
            self.stdout.write('\n2. Testing checkout session creation...')
            
            async def test_checkout():
                return await checkout_service.create_checkout_session(
                    checkout_type=checkout_enum,
                    items=items,
                    save_payment_method=True,
                    use_credits=False
                )
                
            result = asyncio.run(test_checkout())
            
            self.stdout.write(self.style.SUCCESS('Checkout session created:'))
            self.stdout.write(f'  - Order ID: {result["order_id"]}')
            self.stdout.write(f'  - Payment Intent ID: {result["payment_intent_id"]}')
            self.stdout.write(f'  - Client Secret: {result["client_secret"][:20]}...')
            self.stdout.write(f'  - Requires Payment: {result["requires_payment"]}')
            
            # Test status check
            self.stdout.write('\n3. Testing checkout status...')
            
            async def test_status():
                return await checkout_service.get_checkout_status(
                    order_id=result["order_id"]
                )
                
            status = asyncio.run(test_status())
            
            self.stdout.write(self.style.SUCCESS('Checkout status:'))
            self.stdout.write(f'  - Status: {status["status"]}')
            self.stdout.write(f'  - Payment Status: {status["payment_status"]}')
            self.stdout.write(f'  - Created At: {status["created_at"]}')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during checkout: {str(e)}'))
            import traceback
            traceback.print_exc()
            
    def _get_test_service(self, checkout_type):
        """Get a test service based on checkout type."""
        if checkout_type == 'session':
            # Get any individual session service
            return Service.objects.filter(
                is_active=True,
                service_type__code='session'
            ).first()
        elif checkout_type == 'bundle':
            # Get a bundle service
            return Service.objects.filter(
                is_active=True,
                service_type__code='bundle'
            ).first()
        elif checkout_type == 'package':
            # Get a package service
            return Service.objects.filter(
                is_active=True,
                service_type__code='package'
            ).first()
        return None
        
    def _get_test_practitioner(self, service):
        """Get a practitioner for the service."""
        if service.primary_practitioner:
            return service.primary_practitioner
        return Practitioner.objects.filter(is_active=True).first()