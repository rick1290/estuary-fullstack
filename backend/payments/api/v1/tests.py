"""
Basic tests for payments API
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from decimal import Decimal

from payments.models import (
    PaymentMethod, Order, UserCreditBalance, 
    SubscriptionTier, PractitionerSubscription
)
from practitioners.models import Practitioner
from services.models import Service, ServiceType

User = get_user_model()


class PaymentAPITestCase(TestCase):
    """Test case for payment API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create test user
        self.user = User.objects.create_user(
            email='testuser@example.com',
            password='testpass123'
        )
        
        # Create test practitioner
        self.practitioner_user = User.objects.create_user(
            email='practitioner@example.com',
            password='testpass123'
        )
        self.practitioner = Practitioner.objects.create(
            user=self.practitioner_user,
            bio='Test practitioner'
        )
        
        # Create service type and service
        self.service_type = ServiceType.objects.create(
            name='Consultation',
            description='Test consultation'
        )
        self.service = Service.objects.create(
            name='Test Service',
            service_type=self.service_type,
            price=Decimal('100.00'),
            duration_minutes=60
        )
        
        # Create subscription tier
        self.tier = SubscriptionTier.objects.create(
            name='Basic',
            monthly_price=Decimal('29.99'),
            annual_price=Decimal('299.99')
        )
    
    def test_credit_balance_endpoint(self):
        """Test getting credit balance"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('payments:credit-balance')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('balance', response.data)
        self.assertEqual(response.data['balance'], '0.00')
    
    def test_payment_methods_list(self):
        """Test listing payment methods"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('payments:paymentmethod-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data['results'], list)
    
    def test_subscription_tiers_list(self):
        """Test listing subscription tiers"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('payments:subscription-tiers')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Basic')
    
    def test_earnings_balance_practitioner_only(self):
        """Test that earnings balance is only accessible by practitioners"""
        # Test with regular user
        self.client.force_authenticate(user=self.user)
        
        url = reverse('payments:earnings-balance')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Test with practitioner
        self.client.force_authenticate(user=self.practitioner_user)
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('available_balance', response.data)
    
    def test_webhook_endpoint_no_auth(self):
        """Test that webhook endpoint doesn't require authentication"""
        url = reverse('payments:stripe-webhook')
        response = self.client.post(url, {}, format='json')
        
        # Should fail due to missing signature, not auth
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Missing signature')