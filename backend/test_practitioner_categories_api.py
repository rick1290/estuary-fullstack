#!/usr/bin/env python
"""
Test practitioner service categories via API
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "estuary.settings")
django.setup()

from django.contrib.auth import get_user_model
from practitioners.models import Practitioner
from services.models import PractitionerServiceCategory, Service, ServiceType
import requests
import json
from django.db import transaction

User = get_user_model()

# API Configuration
API_BASE_URL = "http://localhost:8000/api/v1"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def setup_test_data():
    """Create test user and practitioner"""
    print(f"\n{YELLOW}Setting up test data...{RESET}")
    
    # Create user with proper password
    user, created = User.objects.get_or_create(
        email="category_test@example.com",
        defaults={
            "first_name": "Category",
            "last_name": "Test"
        }
    )
    
    if created:
        user.set_password("ValidPass123!")
        user.save()
        print(f"{GREEN}✓ Created test user{RESET}")
    else:
        print(f"{BLUE}✓ Test user already exists{RESET}")
    
    # Create practitioner
    practitioner, created = Practitioner.objects.get_or_create(
        user=user,
        defaults={
            "practitioner_status": "active",
            "is_verified": True,
            "bio": "Test practitioner for category testing",
            "display_name": "Category Test Practitioner",
            "professional_title": "Test Professional"
        }
    )
    
    if created:
        print(f"{GREEN}✓ Created test practitioner{RESET}")
    else:
        print(f"{BLUE}✓ Test practitioner already exists{RESET}")
    
    return user, practitioner

def test_api_endpoints():
    """Test the API endpoints"""
    print(f"\n{BLUE}Testing Practitioner Service Categories API{RESET}")
    print("="*60)
    
    # Login
    print(f"\n{YELLOW}1. Login{RESET}")
    login_response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={"email": "category_test@example.com", "password": "ValidPass123!"}
    )
    
    if login_response.status_code != 200:
        print(f"{RED}✗ Login failed: {login_response.text}{RESET}")
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"{GREEN}✓ Login successful{RESET}")
    
    # List categories (should be empty)
    print(f"\n{YELLOW}2. List categories (initial){RESET}")
    response = requests.get(
        f"{API_BASE_URL}/practitioners/me/service-categories",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"{GREEN}✓ Listed categories: {data['total']} found{RESET}")
    else:
        print(f"{RED}✗ Failed to list: {response.text}{RESET}")
    
    # Create categories
    print(f"\n{YELLOW}3. Create categories{RESET}")
    categories = [
        {
            "name": "Wellness Sessions",
            "description": "One-on-one wellness treatments",
            "icon": "spa",
            "color": "#4CAF50"
        },
        {
            "name": "Group Classes", 
            "description": "Group workshops and classes",
            "icon": "groups",
            "color": "#2196F3"
        },
        {
            "name": "Online Programs",
            "description": "Digital courses and programs", 
            "icon": "computer",
            "color": "#FF9800"
        }
    ]
    
    created_ids = []
    for cat_data in categories:
        response = requests.post(
            f"{API_BASE_URL}/practitioners/me/service-categories",
            headers=headers,
            json=cat_data
        )
        
        if response.status_code == 201:
            cat = response.json()
            created_ids.append(cat['id'])
            print(f"{GREEN}✓ Created: {cat['name']} (ID: {cat['id']}, slug: {cat['slug']}){RESET}")
        else:
            print(f"{RED}✗ Failed to create {cat_data['name']}: {response.text}{RESET}")
    
    # Update a category
    if created_ids:
        print(f"\n{YELLOW}4. Update a category{RESET}")
        update_data = {
            "name": "Premium Wellness Sessions",
            "color": "#8BC34A"
        }
        
        response = requests.put(
            f"{API_BASE_URL}/practitioners/me/service-categories/{created_ids[0]}",
            headers=headers,
            json=update_data
        )
        
        if response.status_code == 200:
            cat = response.json()
            print(f"{GREEN}✓ Updated: {cat['name']} with color {cat['color']}{RESET}")
        else:
            print(f"{RED}✗ Failed to update: {response.text}{RESET}")
    
    # Reorder categories
    if len(created_ids) >= 2:
        print(f"\n{YELLOW}5. Reorder categories{RESET}")
        # Reverse the order
        reversed_ids = list(reversed(created_ids))
        
        response = requests.put(
            f"{API_BASE_URL}/practitioners/me/service-categories/reorder",
            headers=headers,
            json={"category_ids": reversed_ids}
        )
        
        if response.status_code == 200:
            print(f"{GREEN}✓ Reordered categories{RESET}")
            
            # Verify new order
            response = requests.get(
                f"{API_BASE_URL}/practitioners/me/service-categories",
                headers=headers
            )
            if response.status_code == 200:
                cats = response.json()['results']
                print("New order:")
                for i, cat in enumerate(cats):
                    print(f"  {i+1}. {cat['name']} (order: {cat['order']})")
        else:
            print(f"{RED}✗ Failed to reorder: {response.text}{RESET}")
    
    # Create a service with category
    if created_ids:
        print(f"\n{YELLOW}6. Create service with practitioner category{RESET}")
        
        # Get practitioner ID
        me_response = requests.get(f"{API_BASE_URL}/practitioners/me", headers=headers)
        if me_response.status_code == 200:
            practitioner_id = me_response.json()['id']
            
            service_data = {
                "name": "Premium Wellness Consultation",
                "description": "One-on-one premium wellness consultation",
                "service_type": "session",
                "duration_minutes": 60,
                "price": 150.00,
                "practitioner_category_id": created_ids[0],
                "primary_practitioner_id": practitioner_id
            }
            
            response = requests.post(
                f"{API_BASE_URL}/practitioners/me/services",
                headers=headers,
                json=service_data
            )
            
            if response.status_code == 201:
                service = response.json()
                print(f"{GREEN}✓ Created service: {service['name']}{RESET}")
                print(f"  Category ID: {service.get('practitioner_category_id')}")
            else:
                print(f"{RED}✗ Failed to create service: {response.text}{RESET}")
    
    # Delete a category
    if len(created_ids) > 2:
        print(f"\n{YELLOW}7. Delete a category{RESET}")
        response = requests.delete(
            f"{API_BASE_URL}/practitioners/me/service-categories/{created_ids[-1]}",
            headers=headers
        )
        
        if response.status_code == 200:
            print(f"{GREEN}✓ Deleted category{RESET}")
            print(f"  {response.json()['message']}")
        else:
            print(f"{RED}✗ Failed to delete: {response.text}{RESET}")
    
    # Final list
    print(f"\n{YELLOW}8. Final category list{RESET}")
    response = requests.get(
        f"{API_BASE_URL}/practitioners/me/service-categories",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"{GREEN}✓ Total categories: {data['total']}{RESET}")
        for cat in data['results']:
            print(f"  - {cat['name']} ({cat['color']}) - {cat['service_count']} services")
    else:
        print(f"{RED}✗ Failed to list: {response.text}{RESET}")
    
    return True

def test_direct_db():
    """Test direct database operations"""
    print(f"\n{BLUE}Testing Direct Database Operations{RESET}")
    print("="*60)
    
    user, practitioner = setup_test_data()
    
    # Clean up existing categories
    PractitionerServiceCategory.objects.filter(practitioner=practitioner).delete()
    
    # Create categories
    print(f"\n{YELLOW}Creating categories in database...{RESET}")
    categories = []
    for i, (name, color) in enumerate([
        ("Database Test 1", "#FF0000"),
        ("Database Test 2", "#00FF00"),
        ("Database Test 3", "#0000FF")
    ]):
        cat = PractitionerServiceCategory.objects.create(
            practitioner=practitioner,
            name=name,
            description=f"Test category {i+1}",
            color=color,
            order=i,
            icon="test"
        )
        categories.append(cat)
        print(f"{GREEN}✓ Created: {cat.name} (slug: {cat.slug}){RESET}")
    
    # Test unique slug generation
    print(f"\n{YELLOW}Testing unique slug generation...{RESET}")
    cat = PractitionerServiceCategory.objects.create(
        practitioner=practitioner,
        name="Database Test 1",  # Same name as first
        description="Duplicate name test",
        order=99
    )
    print(f"{GREEN}✓ Created with unique slug: {cat.slug}{RESET}")
    
    # List all categories
    print(f"\n{YELLOW}All categories for practitioner:{RESET}")
    all_cats = PractitionerServiceCategory.objects.filter(
        practitioner=practitioner
    ).order_by('order')
    
    for cat in all_cats:
        print(f"  - {cat.name} (slug: {cat.slug}, order: {cat.order})")
    
    print(f"\n{GREEN}✓ Database operations completed successfully!{RESET}")

if __name__ == "__main__":
    # Setup test data
    user, practitioner = setup_test_data()
    
    # Test API endpoints
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}PART 1: API ENDPOINT TESTS{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    api_success = test_api_endpoints()
    
    # Test direct DB operations
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}PART 2: DATABASE OPERATION TESTS{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    test_direct_db()
    
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{GREEN}✓ All tests completed!{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")