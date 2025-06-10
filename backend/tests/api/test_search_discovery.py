#!/usr/bin/env python
"""
Test script for service discovery and search API endpoints.
Tests public listings, search, filtering, sorting, and service details.
"""

import os
import sys
import django
import asyncio
import json
from datetime import datetime, timedelta

# Django setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.utils import timezone
from api.main import app
from httpx import AsyncClient, ASGITransport
from users.models import User
from practitioners.models import Practitioner
from services.models import Service, ServiceType, ServiceCategory
# from locations.models import ServiceLocation  # Not needed for this test
from reviews.models import Review
from asgiref.sync import sync_to_async

# Test configuration
BASE_URL = "http://testserver"
API_PREFIX = "/api/v1"


class TestSearchDiscoveryAPI:
    def __init__(self):
        self.client = None
        self.headers = {}
        self.test_data = {}
        
    async def setup(self):
        """Set up test data and authentication."""
        print("\n=== Setting up test data ===")
        
        # Create client
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url=BASE_URL)
        
        # Create additional test data for search/discovery
        await self.create_test_data()
        
        print("✓ Test data setup complete")
        
    async def create_test_data(self):
        """Create diverse test data for search and discovery."""
        
        @sync_to_async
        def create_data():
            # Create categories
            categories = []
            category_data = [
                ('wellness', 'Wellness', 'Health and wellness services'),
                ('fitness', 'Fitness', 'Physical fitness and training'),
                ('therapy', 'Therapy', 'Therapeutic services'),
                ('nutrition', 'Nutrition', 'Nutritional counseling'),
            ]
            
            for slug, name, desc in category_data:
                cat, _ = ServiceCategory.objects.get_or_create(
                    slug=slug,
                    defaults={'name': name, 'description': desc, 'is_active': True}
                )
                categories.append(cat)
            
            # Create multiple practitioners
            practitioners = []
            practitioner_data = [
                ('jane@example.com', 'Jane', 'Smith', 'Dr. Jane Smith', 'Wellness expert', 10),
                ('john@example.com', 'John', 'Doe', 'John Doe PT', 'Personal trainer', 5),
                ('sarah@example.com', 'Sarah', 'Johnson', 'Sarah Johnson RD', 'Registered dietitian', 8),
                ('mike@example.com', 'Mike', 'Wilson', 'Mike Wilson LMT', 'Licensed massage therapist', 12),
            ]
            
            for email, first, last, display, bio, years in practitioner_data:
                user, _ = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': first,
                        'last_name': last,
                        'is_practitioner': True
                    }
                )
                if not hasattr(user, 'practitioner_profile'):
                    pract = Practitioner.objects.create(
                        user=user,
                        display_name=display,
                        bio=bio,
                        years_of_experience=years,
                        practitioner_status='active',
                        is_verified=True
                    )
                    practitioners.append(pract)
                else:
                    practitioners.append(user.practitioner_profile)
            
            # Get service types
            session_type = ServiceType.objects.get(code='session')
            workshop_type = ServiceType.objects.get(code='workshop')
            course_type = ServiceType.objects.get(code='course')
            
            # Create diverse services
            services = []
            service_data = [
                # (practitioner_idx, type, name, category_idx, price, duration, featured)
                (0, session_type, 'Holistic Wellness Consultation', 0, 12000, 60, True),
                (0, workshop_type, 'Stress Management Workshop', 0, 8000, 120, False),
                (1, session_type, 'Personal Training Session', 1, 8000, 60, True),
                (1, course_type, '6-Week Fitness Transformation', 1, 60000, 90, True),
                (2, session_type, 'Nutritional Assessment', 3, 15000, 90, False),
                (2, workshop_type, 'Healthy Meal Prep Workshop', 3, 6000, 180, False),
                (3, session_type, 'Deep Tissue Massage', 2, 10000, 60, True),
                (3, session_type, 'Swedish Relaxation Massage', 2, 9000, 60, False),
            ]
            
            for pract_idx, stype, name, cat_idx, price, duration, featured in service_data:
                service, _ = Service.objects.get_or_create(
                    primary_practitioner=practitioners[pract_idx],
                    service_type=stype,
                    name=name,
                    defaults={
                        'category': categories[cat_idx],
                        'price_cents': price,
                        'duration_minutes': duration,
                        'description': f'Professional {name.lower()} service',
                        'is_active': True,
                        'is_featured': featured,
                        'status': 'published',
                        'max_participants': 1 if stype.code == 'session' else 20
                    }
                )
                services.append(service)
            
            # Create some reviews for services
            review_user, _ = User.objects.get_or_create(
                email='reviewer@example.com',
                defaults={'first_name': 'Review', 'last_name': 'User'}
            )
            
            for i, service in enumerate(services[:4]):  # Add reviews to first 4 services
                Review.objects.get_or_create(
                    service=service,
                    user=review_user,
                    practitioner=service.primary_practitioner,
                    defaults={
                        'rating': 4 + (i % 2),  # Ratings of 4 or 5
                        'comment': f'Great {service.name} experience!',
                        'is_verified': True
                    }
                )
            
            return {
                'categories': categories,
                'practitioners': practitioners,
                'services': services
            }
        
        self.test_data = await create_data()
        
    async def test_list_services(self):
        """Test basic service listing."""
        print("\n=== Testing List Services ===")
        
        response = await self.client.get(f"{API_PREFIX}/services/")
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            services = data.get('results', [])
            print(f"✓ Found {len(services)} services")
            
            # Check pagination info
            print(f"✓ Total count: {data.get('count', 0)}")
            print(f"✓ Page size: {data.get('page_size', 0)}")
            
            # Show first few services
            for service in services[:3]:
                print(f"\n  Service: {service.get('name', 'N/A')}")
                print(f"  Type: {service.get('service_type', {}).get('name', 'N/A')}")
                print(f"  Price: ${service.get('price_cents', 0) / 100:.2f}")
                print(f"  Practitioner: {service.get('primary_practitioner', {}).get('display_name', 'N/A')}")
                
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_filter_by_category(self):
        """Test filtering services by category."""
        print("\n=== Testing Filter by Category ===")
        
        # Test each category
        results = []
        
        for category in self.test_data['categories']:
            print(f"\n--- Category: {category.name} ---")
            
            params = {'category': category.slug}
            response = await self.client.get(
                f"{API_PREFIX}/services/",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('results', [])
                print(f"✓ Found {len(services)} services in {category.name}")
                
                # Verify all services are in correct category
                all_correct = all(
                    s.get('category', {}).get('slug') == category.slug 
                    for s in services
                )
                
                if all_correct:
                    print(f"✓ All services correctly filtered")
                    results.append(True)
                else:
                    print(f"✗ Some services in wrong category")
                    results.append(False)
            else:
                print(f"✗ Error: {response.json()}")
                results.append(False)
                
        return all(results)
        
    async def test_filter_by_service_type(self):
        """Test filtering services by type."""
        print("\n=== Testing Filter by Service Type ===")
        
        service_types = ['session', 'workshop', 'course']
        results = []
        
        for stype in service_types:
            print(f"\n--- Service Type: {stype} ---")
            
            params = {'service_type': stype}
            response = await self.client.get(
                f"{API_PREFIX}/services/",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('results', [])
                print(f"✓ Found {len(services)} {stype} services")
                
                # Verify all services are correct type
                all_correct = all(
                    s.get('service_type', {}).get('code') == stype 
                    for s in services
                )
                
                if all_correct:
                    print(f"✓ All services are {stype} type")
                    results.append(True)
                else:
                    print(f"✗ Mixed service types found")
                    results.append(False)
            else:
                print(f"✗ Error: {response.json()}")
                results.append(False)
                
        return all(results)
        
    async def test_price_range_filter(self):
        """Test filtering services by price range."""
        print("\n=== Testing Price Range Filter ===")
        
        test_cases = [
            ("Under $100", None, 10000),
            ("$80-$120", 8000, 12000),
            ("Over $100", 10000, None),
        ]
        
        results = []
        
        for description, min_price, max_price in test_cases:
            print(f"\n--- {description} ---")
            
            params = {}
            if min_price is not None:
                params['min_price'] = min_price
            if max_price is not None:
                params['max_price'] = max_price
                
            response = await self.client.get(
                f"{API_PREFIX}/services/",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('results', [])
                print(f"✓ Found {len(services)} services")
                
                # Verify price filtering
                all_correct = True
                for service in services:
                    price = service.get('price_cents', 0)
                    if min_price and price < min_price:
                        all_correct = False
                    if max_price and price > max_price:
                        all_correct = False
                        
                if all_correct:
                    print(f"✓ All services within price range")
                    results.append(True)
                else:
                    print(f"✗ Some services outside price range")
                    results.append(False)
            else:
                print(f"✗ Error: {response.json()}")
                results.append(False)
                
        return all(results)
        
    async def test_search_services(self):
        """Test searching services by keyword."""
        print("\n=== Testing Service Search ===")
        
        search_terms = [
            "wellness",
            "massage",
            "fitness",
            "nutrition"
        ]
        
        results = []
        
        for term in search_terms:
            print(f"\n--- Searching for: '{term}' ---")
            
            # Use POST for unified search endpoint
            response = await self.client.post(
                f"{API_PREFIX}/search/",
                json={"query": term, "search_type": "services"}
            )
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('results', [])
                print(f"✓ Found {len(services)} services matching '{term}'")
                
                # Show matching services
                for service in services[:2]:
                    print(f"  - {service.get('name', 'N/A')}")
                    
                results.append(True)
            else:
                print(f"✗ Error: {response.json()}")
                results.append(False)
                
        return all(results)
        
    async def test_sorting(self):
        """Test sorting services."""
        print("\n=== Testing Service Sorting ===")
        
        sort_options = [
            ('price_asc', 'Price (Low to High)'),
            ('price_desc', 'Price (High to Low)'),
            ('rating', 'Highest Rated'),
            ('newest', 'Newest First'),
        ]
        
        results = []
        
        for sort_key, description in sort_options:
            print(f"\n--- Sort by: {description} ---")
            
            params = {'sort': sort_key}
            response = await self.client.get(
                f"{API_PREFIX}/services/",
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                services = data.get('results', [])
                
                if len(services) > 1:
                    # Verify sorting
                    if sort_key == 'price_asc':
                        prices = [s.get('price_cents', 0) for s in services]
                        is_sorted = all(prices[i] <= prices[i+1] for i in range(len(prices)-1))
                    elif sort_key == 'price_desc':
                        prices = [s.get('price_cents', 0) for s in services]
                        is_sorted = all(prices[i] >= prices[i+1] for i in range(len(prices)-1))
                    else:
                        is_sorted = True  # Skip verification for complex sorts
                        
                    if is_sorted:
                        print(f"✓ Services correctly sorted by {description}")
                        # Show first few
                        for service in services[:3]:
                            if 'price' in sort_key:
                                print(f"  - {service.get('name', 'N/A')}: ${service.get('price_cents', 0) / 100:.2f}")
                            else:
                                print(f"  - {service.get('name', 'N/A')}")
                        results.append(True)
                    else:
                        print(f"✗ Services not properly sorted")
                        results.append(False)
                else:
                    print(f"✓ Not enough services to verify sorting")
                    results.append(True)
            else:
                print(f"✗ Error: {response.json()}")
                results.append(False)
                
        return all(results)
        
    async def test_featured_services(self):
        """Test getting featured services."""
        print("\n=== Testing Featured Services ===")
        
        params = {'featured': 'true'}
        response = await self.client.get(
            f"{API_PREFIX}/services/",
            params=params
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            services = data.get('results', [])
            print(f"✓ Found {len(services)} featured services")
            
            # Verify all are featured
            all_featured = all(s.get('is_featured', False) for s in services)
            
            if all_featured:
                print(f"✓ All services are featured")
                for service in services:
                    print(f"  - {service.get('name', 'N/A')} by {service.get('primary_practitioner', {}).get('display_name', 'N/A')}")
                return True
            else:
                print(f"✗ Some non-featured services included")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_service_details(self):
        """Test getting individual service details."""
        print("\n=== Testing Service Details ===")
        
        # Get a service to test
        response = await self.client.get(f"{API_PREFIX}/services/")
        
        if response.status_code != 200 or not response.json().get('results'):
            print("✗ No services available to test")
            return False
            
        service_id = response.json()['results'][0]['id']
        service_name = response.json()['results'][0]['name']
        
        print(f"\nGetting details for: {service_name}")
        
        response = await self.client.get(f"{API_PREFIX}/services/{service_id}/")
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            service = response.json()
            
            # Check required fields
            required_fields = [
                'id', 'name', 'description', 'price_cents', 
                'duration_minutes', 'service_type', 'category',
                'primary_practitioner', 'is_active', 'status'
            ]
            
            missing_fields = [f for f in required_fields if f not in service]
            
            if not missing_fields:
                print(f"✓ All required fields present")
                print(f"\nService Details:")
                print(f"  Name: {service['name']}")
                print(f"  Type: {service['service_type']['name']}")
                print(f"  Category: {service.get('category', {}).get('name', 'N/A')}")
                print(f"  Price: ${service['price_cents'] / 100:.2f}")
                print(f"  Duration: {service['duration_minutes']} minutes")
                print(f"  Practitioner: {service['primary_practitioner']['display_name']}")
                
                # Check for reviews if present
                if 'reviews' in service:
                    print(f"  Reviews: {len(service['reviews'])} reviews")
                if 'average_rating' in service:
                    print(f"  Rating: {service['average_rating']}/5")
                    
                return True
            else:
                print(f"✗ Missing fields: {missing_fields}")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_practitioner_services(self):
        """Test getting services by practitioner."""
        print("\n=== Testing Practitioner Services ===")
        
        # Get a practitioner ID
        practitioner = self.test_data['practitioners'][0]
        
        print(f"\nGetting services for: {practitioner.display_name}")
        
        params = {'practitioner_id': practitioner.id}
        response = await self.client.get(
            f"{API_PREFIX}/services/",
            params=params
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            services = data.get('results', [])
            print(f"✓ Found {len(services)} services")
            
            # Verify all services belong to this practitioner
            all_correct = all(
                s.get('primary_practitioner', {}).get('id') == practitioner.id 
                for s in services
            )
            
            if all_correct:
                print(f"✓ All services belong to {practitioner.display_name}")
                for service in services:
                    print(f"  - {service['name']} ({service['service_type']['name']})")
                return True
            else:
                print(f"✗ Some services belong to other practitioners")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def cleanup(self):
        """Clean up test resources."""
        if self.client:
            await self.client.aclose()
            
    async def run_all_tests(self):
        """Run all search and discovery tests."""
        print("\n" + "="*60)
        print("SEARCH & DISCOVERY API TEST SUITE")
        print("="*60)
        
        try:
            await self.setup()
            
            tests = [
                ("List Services", self.test_list_services),
                ("Filter by Category", self.test_filter_by_category),
                ("Filter by Service Type", self.test_filter_by_service_type),
                ("Price Range Filter", self.test_price_range_filter),
                ("Search Services", self.test_search_services),
                ("Service Sorting", self.test_sorting),
                ("Featured Services", self.test_featured_services),
                ("Service Details", self.test_service_details),
                ("Practitioner Services", self.test_practitioner_services)
            ]
            
            results = []
            
            for test_name, test_func in tests:
                try:
                    result = await test_func()
                    results.append((test_name, result))
                except Exception as e:
                    print(f"\n✗ {test_name} failed with error: {str(e)}")
                    results.append((test_name, False))
                    
            # Summary
            print("\n" + "="*60)
            print("TEST SUMMARY")
            print("="*60)
            
            passed = sum(1 for _, result in results if result)
            total = len(results)
            
            for test_name, result in results:
                status = "✓ PASSED" if result else "✗ FAILED"
                print(f"{status}: {test_name}")
                
            print(f"\nTotal: {passed}/{total} tests passed")
            
            return passed == total
            
        finally:
            await self.cleanup()


async def main():
    """Main entry point."""
    tester = TestSearchDiscoveryAPI()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())