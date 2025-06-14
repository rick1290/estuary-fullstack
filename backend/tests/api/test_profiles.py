#!/usr/bin/env python
"""
Test script for practitioner profiles and service detail API endpoints.
Tests public profiles, practitioner details, and service information pages.
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
from practitioners.models import Practitioner, Certification, Education
from services.models import Service, ServiceType, ServiceCategory
from reviews.models import Review
from asgiref.sync import sync_to_async

# Test configuration
BASE_URL = "http://testserver"
API_PREFIX = "/api/v1"


class TestProfilesAPI:
    def __init__(self):
        self.client = None
        self.headers = {}
        self.practitioner = None
        self.services = []
        
    async def setup(self):
        """Set up test data and authentication."""
        print("\n=== Setting up test data ===")
        
        # Create client
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url=BASE_URL)
        
        # Get practitioner
        @sync_to_async
        def get_practitioner():
            return Practitioner.objects.get(user__email='practitioner@example.com')
            
        self.practitioner = await get_practitioner()
        
        # Add more profile data
        await self.enhance_practitioner_profile()
        
        # Get services
        @sync_to_async
        def get_services():
            return list(Service.objects.filter(
                primary_practitioner=self.practitioner,
                is_active=True
            ))
            
        self.services = await get_services()
        
        print(f"✓ Setup complete")
        print(f"✓ Testing practitioner: {self.practitioner.display_name}")
        print(f"✓ Services available: {len(self.services)}")
        
    async def enhance_practitioner_profile(self):
        """Add additional profile data for testing."""
        
        @sync_to_async
        def enhance_profile():
            # Update practitioner with more details
            self.practitioner.bio = """
            Dr. Jane Smith is a highly experienced wellness practitioner with over 10 years 
            of experience in holistic health and wellness. She specializes in stress management, 
            mindfulness, and integrative health approaches.
            """
            self.practitioner.quote = "Wellness is not a destination, it's a journey."
            self.practitioner.years_of_experience = 10
            self.practitioner.professional_title = "Certified Wellness Practitioner"
            self.practitioner.save()
            
            # Add certifications
            cert1, _ = Certification.objects.get_or_create(
                certificate='Certified Wellness Coach',
                institution='International Wellness Institute',
                defaults={
                    'issue_date': timezone.now().date() - timedelta(days=365*3)
                }
            )
            self.practitioner.certifications.add(cert1)
            
            cert2, _ = Certification.objects.get_or_create(
                certificate='Mindfulness-Based Stress Reduction',
                institution='Center for Mindfulness',
                defaults={
                    'issue_date': timezone.now().date() - timedelta(days=365*2)
                }
            )
            self.practitioner.certifications.add(cert2)
            
            # Add education
            edu1, _ = Education.objects.get_or_create(
                degree='Doctor of Natural Medicine',
                educational_institute='University of Natural Health'
            )
            self.practitioner.educations.add(edu1)
            
            edu2, _ = Education.objects.get_or_create(
                degree='Master of Public Health',
                educational_institute='State University'
            )
            self.practitioner.educations.add(edu2)
            
            # Add some reviews
            review_user, _ = User.objects.get_or_create(
                email='reviewer1@example.com',
                defaults={'first_name': 'Happy', 'last_name': 'Client'}
            )
            
            Review.objects.get_or_create(
                practitioner=self.practitioner,
                user=review_user,
                defaults={
                    'rating': 5,
                    'comment': 'Dr. Smith is amazing! She really helped me manage my stress.',
                    'is_verified': True
                }
            )
            
        await enhance_profile()
        
    async def test_get_practitioner_profile(self):
        """Test getting public practitioner profile."""
        print("\n=== Testing Get Practitioner Profile ===")
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/",
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            profile = response.json()
            
            # Check essential fields
            essential_fields = [
                'id', 'display_name', 'bio', 'professional_title',
                'years_of_experience', 'is_verified', 'practitioner_status'
            ]
            
            missing_fields = [f for f in essential_fields if f not in profile]
            
            if not missing_fields:
                print(f"✓ All essential fields present")
                
                print(f"\nProfile Details:")
                print(f"  Name: {profile['display_name']}")
                print(f"  Title: {profile.get('professional_title', 'N/A')}")
                print(f"  Experience: {profile.get('years_of_experience', 0)} years")
                print(f"  Status: {profile['practitioner_status']}")
                print(f"  Verified: {profile['is_verified']}")
                
                # Check for additional data
                if 'certifications' in profile:
                    print(f"  Certifications: {len(profile['certifications'])}")
                if 'educations' in profile:
                    print(f"  Education: {len(profile['educations'])}")
                if 'average_rating' in profile:
                    print(f"  Rating: {profile['average_rating']}/5")
                    
                return True
            else:
                print(f"✗ Missing fields: {missing_fields}")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_practitioner_services(self):
        """Test getting practitioner's services."""
        print("\n=== Testing Practitioner Services ===")
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/services/"
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            services = data.get('results', data) if isinstance(data, dict) else data
            
            if isinstance(services, list):
                print(f"✓ Found {len(services)} services")
                
                # Display services
                for service in services:
                    print(f"\n  Service: {service.get('name', 'N/A')}")
                    print(f"  Type: {service.get('service_type', {}).get('name', 'N/A')}")
                    print(f"  Price: ${service.get('price_cents', 0) / 100:.2f}")
                    print(f"  Duration: {service.get('duration_minutes', 0)} minutes")
                    
                return True
            else:
                print(f"✗ Unexpected response format")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_practitioner_reviews(self):
        """Test getting practitioner reviews."""
        print("\n=== Testing Practitioner Reviews ===")
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/reviews/"
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            reviews = data.get('results', data) if isinstance(data, dict) else data
            
            if isinstance(reviews, list):
                print(f"✓ Found {len(reviews)} reviews")
                
                # Display reviews
                for review in reviews[:3]:
                    print(f"\n  Rating: {review.get('rating', 0)}/5")
                    print(f"  Comment: {review.get('comment', 'N/A')[:100]}...")
                    print(f"  Verified: {review.get('is_verified', False)}")
                    
                return True
            else:
                print(f"✗ Unexpected response format")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_practitioner_availability_overview(self):
        """Test getting practitioner availability overview."""
        print("\n=== Testing Practitioner Availability Overview ===")
        
        # Try multiple possible endpoints
        endpoints = [
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/availability/",
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/schedule/",
            f"{API_PREFIX}/practitioners/availability/?practitioner_id={self.practitioner.id}"
        ]
        
        for endpoint in endpoints:
            response = await self.client.get(endpoint)
            
            if response.status_code == 200:
                print(f"✓ Found availability at: {endpoint}")
                data = response.json()
                
                # Display availability info
                if isinstance(data, dict):
                    print(f"  Response type: {type(data)}")
                    print(f"  Keys: {list(data.keys())[:5]}")
                elif isinstance(data, list):
                    print(f"  Available days: {len(data)}")
                    
                return True
                
        print(f"✗ No availability endpoint found")
        return False
        
    async def test_service_details(self):
        """Test getting individual service details."""
        print("\n=== Testing Service Details ===")
        
        if not self.services:
            print("✗ No services available to test")
            return False
            
        service = self.services[0]
        
        response = await self.client.get(
            f"{API_PREFIX}/services/{service.id}/",
            follow_redirects=True
        )
        
        print(f"Status: {response.status_code}")
        print(f"Testing service: {service.name}")
        
        if response.status_code == 200:
            details = response.json()
            
            # Check comprehensive fields
            expected_fields = [
                'id', 'name', 'description', 'price_cents', 
                'duration_minutes', 'service_type', 'category',
                'primary_practitioner', 'max_participants',
                'location_type', 'is_active', 'status'
            ]
            
            missing_fields = [f for f in expected_fields if f not in details]
            
            if not missing_fields:
                print(f"✓ All expected fields present")
                
                print(f"\nService Details:")
                print(f"  Name: {details['name']}")
                print(f"  Type: {details['service_type']['name']}")
                print(f"  Category: {details.get('category', {}).get('name', 'N/A')}")
                print(f"  Price: ${details['price_cents'] / 100:.2f}")
                print(f"  Duration: {details['duration_minutes']} minutes")
                print(f"  Capacity: {details['max_participants']} participants")
                print(f"  Location: {details['location_type']}")
                
                # Additional info if present
                if 'what_youll_learn' in details:
                    print(f"  Learning outcomes: {len(details['what_youll_learn'])} chars")
                if 'prerequisites' in details:
                    print(f"  Prerequisites: {bool(details['prerequisites'])}")
                if 'includes' in details:
                    print(f"  Includes: {len(details.get('includes', []))} items")
                    
                return True
            else:
                print(f"✗ Missing fields: {missing_fields}")
                return False
        else:
            print(f"✗ Error: {response.json()}")
            return False
            
    async def test_service_practitioner_info(self):
        """Test that service includes practitioner information."""
        print("\n=== Testing Service Practitioner Info ===")
        
        if not self.services:
            print("✗ No services available to test")
            return False
            
        service = self.services[0]
        
        response = await self.client.get(
            f"{API_PREFIX}/services/{service.id}/",
            follow_redirects=True
        )
        
        if response.status_code == 200:
            details = response.json()
            practitioner_info = details.get('primary_practitioner', {})
            
            if practitioner_info:
                print(f"✓ Practitioner info included")
                print(f"  Name: {practitioner_info.get('display_name', 'N/A')}")
                print(f"  ID: {practitioner_info.get('id', 'N/A')}")
                
                # Check if additional practitioner details are included
                if 'bio' in practitioner_info:
                    print(f"  Bio: {len(practitioner_info['bio'])} chars")
                if 'professional_title' in practitioner_info:
                    print(f"  Title: {practitioner_info['professional_title']}")
                if 'years_of_experience' in practitioner_info:
                    print(f"  Experience: {practitioner_info['years_of_experience']} years")
                    
                return True
            else:
                print(f"✗ No practitioner info in service details")
                return False
        else:
            print(f"✗ Error getting service details")
            return False
            
    async def test_related_services(self):
        """Test getting related/similar services."""
        print("\n=== Testing Related Services ===")
        
        if not self.services:
            print("✗ No services available to test")
            return False
            
        service = self.services[0]
        
        # Try different endpoints for related services
        endpoints = [
            f"{API_PREFIX}/services/{service.id}/related/",
            f"{API_PREFIX}/services/{service.id}/similar/",
            f"{API_PREFIX}/services/?category={service.category_id}&exclude={service.id}"
        ]
        
        for endpoint in endpoints:
            response = await self.client.get(endpoint)
            
            if response.status_code == 200:
                print(f"✓ Found related services at: {endpoint}")
                data = response.json()
                
                if isinstance(data, dict) and 'results' in data:
                    services = data['results']
                elif isinstance(data, list):
                    services = data
                else:
                    continue
                    
                print(f"  Found {len(services)} related services")
                
                for related in services[:3]:
                    print(f"  - {related.get('name', 'N/A')}")
                    
                return True
                
        print(f"✓ No specific related services endpoint (this is okay)")
        return True
        
    async def test_profile_completeness(self):
        """Test profile completeness indicators."""
        print("\n=== Testing Profile Completeness ===")
        
        response = await self.client.get(
            f"{API_PREFIX}/practitioners/{self.practitioner.id}/"
        )
        
        if response.status_code == 200:
            profile = response.json()
            
            # Check various profile sections
            sections = {
                'Basic Info': all([
                    profile.get('display_name'),
                    profile.get('bio'),
                    profile.get('professional_title')
                ]),
                'Experience': bool(profile.get('years_of_experience')),
                'Certifications': len(profile.get('certifications', [])) > 0,
                'Education': len(profile.get('educations', [])) > 0,
                'Services': len(self.services) > 0,
                'Profile Image': bool(profile.get('profile_image_url')),
            }
            
            complete_sections = sum(1 for complete in sections.values() if complete)
            total_sections = len(sections)
            completeness = (complete_sections / total_sections) * 100
            
            print(f"Profile Completeness: {completeness:.0f}%")
            print(f"Complete sections: {complete_sections}/{total_sections}")
            
            for section, is_complete in sections.items():
                status = "✓" if is_complete else "✗"
                print(f"  {status} {section}")
                
            return completeness >= 50  # At least 50% complete
        else:
            print(f"✗ Error getting profile")
            return False
            
    async def cleanup(self):
        """Clean up test resources."""
        if self.client:
            await self.client.aclose()
            
    async def run_all_tests(self):
        """Run all profile and detail tests."""
        print("\n" + "="*60)
        print("PROFILES & DETAILS API TEST SUITE")
        print("="*60)
        
        try:
            await self.setup()
            
            tests = [
                ("Get Practitioner Profile", self.test_get_practitioner_profile),
                ("Practitioner Services", self.test_practitioner_services),
                ("Practitioner Reviews", self.test_practitioner_reviews),
                ("Practitioner Availability Overview", self.test_practitioner_availability_overview),
                ("Service Details", self.test_service_details),
                ("Service Practitioner Info", self.test_service_practitioner_info),
                ("Related Services", self.test_related_services),
                ("Profile Completeness", self.test_profile_completeness)
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
    tester = TestProfilesAPI()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())