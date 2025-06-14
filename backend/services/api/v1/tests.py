"""
Tests for Services API
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from services.models import (
    ServiceCategory, ServiceType, Service, PractitionerServiceCategory
)
from practitioners.models import Practitioner

User = get_user_model()


class ServiceCategoryAPITest(APITestCase):
    """Test service category endpoints"""
    
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            email='admin@test.com',
            password='testpass123'
        )
        self.category = ServiceCategory.objects.create(
            name='Wellness',
            slug='wellness',
            description='Wellness services',
            is_active=True
        )
    
    def test_list_categories(self):
        """Test listing service categories"""
        url = reverse('services:category-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_retrieve_category(self):
        """Test retrieving a single category"""
        url = reverse('services:category-detail', kwargs={'slug': self.category.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Wellness')
    
    def test_create_category_requires_admin(self):
        """Test that creating categories requires admin permissions"""
        url = reverse('services:category-list')
        data = {
            'name': 'Fitness',
            'description': 'Fitness services'
        }
        
        # Without authentication
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # With admin authentication
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ServiceCategory.objects.count(), 2)


class ServiceAPITest(APITestCase):
    """Test service endpoints"""
    
    def setUp(self):
        # Create users
        self.user = User.objects.create_user(
            email='user@test.com',
            password='testpass123'
        )
        self.practitioner_user = User.objects.create_user(
            email='practitioner@test.com',
            password='testpass123'
        )
        
        # Create practitioner
        self.practitioner = Practitioner.objects.create(
            user=self.practitioner_user,
            display_name='Test Practitioner',
            bio='Test bio',
            is_verified=True,
            practitioner_status='active'
        )
        
        # Create category and service type
        self.category = ServiceCategory.objects.create(
            name='Wellness',
            slug='wellness'
        )
        self.service_type = ServiceType.objects.create(
            name='Session',
            code='session'
        )
        
        # Create service
        self.service = Service.objects.create(
            name='Test Service',
            description='Test description',
            price_cents=5000,  # $50
            duration_minutes=60,
            service_type=self.service_type,
            category=self.category,
            primary_practitioner=self.practitioner,
            is_active=True,
            is_public=True,
            status='published'
        )
    
    def test_list_services(self):
        """Test listing services"""
        url = reverse('services:service-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_services_by_category(self):
        """Test filtering services by category"""
        url = reverse('services:service-list')
        response = self.client.get(url, {'category': 'wellness'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        response = self.client.get(url, {'category': 'nonexistent'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_search_services(self):
        """Test searching services"""
        url = reverse('services:service-search')
        response = self.client.get(url, {'q': 'Test'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
    
    def test_retrieve_service(self):
        """Test retrieving a single service"""
        url = reverse('services:service-detail', kwargs={'pk': self.service.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Service')
        self.assertEqual(float(response.data['price']), 50.00)
    
    def test_create_service_requires_practitioner(self):
        """Test that creating services requires practitioner permissions"""
        url = reverse('services:service-list')
        data = {
            'name': 'New Service',
            'description': 'New description',
            'price': 75.00,
            'duration_minutes': 90,
            'service_type_id': self.service_type.id,
            'category_id': self.category.id
        }
        
        # Without authentication
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # With regular user authentication
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # With practitioner authentication
        self.client.force_authenticate(user=self.practitioner_user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Service.objects.count(), 2)


class PractitionerServiceCategoryAPITest(APITestCase):
    """Test practitioner service category endpoints"""
    
    def setUp(self):
        self.practitioner_user = User.objects.create_user(
            email='practitioner@test.com',
            password='testpass123'
        )
        self.practitioner = Practitioner.objects.create(
            user=self.practitioner_user,
            display_name='Test Practitioner'
        )
        self.client.force_authenticate(user=self.practitioner_user)
        
        self.category = PractitionerServiceCategory.objects.create(
            practitioner=self.practitioner,
            name='My Category',
            description='Custom category'
        )
    
    def test_list_practitioner_categories(self):
        """Test listing practitioner's own categories"""
        url = reverse('services:practitioner-category-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_create_practitioner_category(self):
        """Test creating a custom category"""
        url = reverse('services:practitioner-category-list')
        data = {
            'name': 'New Category',
            'description': 'New custom category',
            'color': '#FF0000'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PractitionerServiceCategory.objects.count(), 2)
    
    def test_reorder_categories(self):
        """Test reordering categories"""
        # Create additional categories
        cat2 = PractitionerServiceCategory.objects.create(
            practitioner=self.practitioner,
            name='Category 2'
        )
        cat3 = PractitionerServiceCategory.objects.create(
            practitioner=self.practitioner,
            name='Category 3'
        )
        
        url = reverse('services:practitioner-category-reorder')
        data = {
            'category_ids': [cat3.id, self.category.id, cat2.id]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify order
        cat3.refresh_from_db()
        self.category.refresh_from_db()
        cat2.refresh_from_db()
        self.assertEqual(cat3.order, 0)
        self.assertEqual(self.category.order, 1)
        self.assertEqual(cat2.order, 2)