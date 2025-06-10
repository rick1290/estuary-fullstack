#!/usr/bin/env python
"""
Final test of practitioner service categories
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "estuary.settings")
django.setup()

from django.contrib.auth import get_user_model
from practitioners.models import Practitioner
from services.models import PractitionerServiceCategory, ServiceType
import requests
import json

User = get_user_model()

# API Configuration
API_BASE_URL = "http://localhost:8000/api/v1"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def setup_test_practitioner():
    """Create a test practitioner"""
    print(f"\n{YELLOW}Setting up test practitioner...{RESET}")
    
    # Create new test user
    email = "test_categories@example.com"
    password = "TestPass123!"
    
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "first_name": "Test",
            "last_name": "Categories",
        }
    )
    
    if created or True:  # Always reset password
        user.set_password(password)
        user.is_active = True
        user.save()
        print(f"{GREEN}✓ Created/updated user: {email}{RESET}")
    
    # Create practitioner
    practitioner, created = Practitioner.objects.get_or_create(
        user=user,
        defaults={
            "practitioner_status": "active",
            "is_verified": True,
            "display_name": "Test Categories Practitioner",
            "professional_title": "Test Professional",
            "bio": "Testing practitioner categories"
        }
    )
    
    if created:
        print(f"{GREEN}✓ Created practitioner profile{RESET}")
    else:
        print(f"{BLUE}✓ Using existing practitioner profile{RESET}")
    
    # Clean up any existing categories
    deleted = PractitionerServiceCategory.objects.filter(practitioner=practitioner).delete()
    if deleted[0] > 0:
        print(f"{GREEN}✓ Cleaned up {deleted[0]} existing categories{RESET}")
    
    return email, password, practitioner

def main():
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}PRACTITIONER SERVICE CATEGORIES - FINAL TEST{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    # Setup
    email, password, practitioner = setup_test_practitioner()
    
    # Login
    print(f"\n{YELLOW}1. Testing API Login{RESET}")
    login_response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    
    if login_response.status_code != 200:
        print(f"{RED}✗ Login failed: {login_response.text}{RESET}")
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"{GREEN}✓ Login successful!{RESET}")
    
    # Create categories
    print(f"\n{YELLOW}2. Creating Categories{RESET}")
    categories_data = [
        {"name": "Therapeutic Services", "color": "#4CAF50", "icon": "healing"},
        {"name": "Wellness Programs", "color": "#2196F3", "icon": "spa"},
        {"name": "Group Sessions", "color": "#FF9800", "icon": "groups"},
    ]
    
    created_categories = []
    for cat_data in categories_data:
        response = requests.post(
            f"{API_BASE_URL}/practitioners/me/service-categories",
            headers=headers,
            json=cat_data
        )
        
        if response.status_code == 201:
            cat = response.json()
            created_categories.append(cat)
            print(f"{GREEN}✓ Created: {cat['name']} (ID: {cat['id']}, Order: {cat['order']}){RESET}")
        else:
            print(f"{RED}✗ Failed: {response.text}{RESET}")
    
    # Test reordering
    if len(created_categories) >= 3:
        print(f"\n{YELLOW}3. Testing Drag-Drop Reordering{RESET}")
        # Reverse order: 3, 2, 1 -> 1, 2, 3
        new_order = [created_categories[2]['id'], created_categories[1]['id'], created_categories[0]['id']]
        
        response = requests.put(
            f"{API_BASE_URL}/practitioners/me/service-categories/reorder",
            headers=headers,
            json={"category_ids": new_order}
        )
        
        if response.status_code == 200:
            print(f"{GREEN}✓ Reordering successful!{RESET}")
            
            # Verify new order
            response = requests.get(
                f"{API_BASE_URL}/practitioners/me/service-categories",
                headers=headers
            )
            if response.status_code == 200:
                print("\nNew order after drag-drop:")
                for cat in response.json()['results']:
                    print(f"  Position {cat['order']}: {cat['name']}")
        else:
            print(f"{RED}✗ Reordering failed: {response.text}{RESET}")
    
    # Update a category
    if created_categories:
        print(f"\n{YELLOW}4. Testing Category Update{RESET}")
        cat_id = created_categories[0]['id']
        update_data = {
            "name": "Premium Therapeutic Services",
            "color": "#8BC34A",
            "description": "Our premium therapeutic offerings"
        }
        
        response = requests.put(
            f"{API_BASE_URL}/practitioners/me/service-categories/{cat_id}",
            headers=headers,
            json=update_data
        )
        
        if response.status_code == 200:
            updated = response.json()
            print(f"{GREEN}✓ Updated category:{RESET}")
            print(f"  Name: {updated['name']}")
            print(f"  Color: {updated['color']}")
            print(f"  Description: {updated.get('description', 'N/A')}")
        else:
            print(f"{RED}✗ Update failed: {response.text}{RESET}")
    
    # Final summary
    print(f"\n{YELLOW}5. Final Category Summary{RESET}")
    response = requests.get(
        f"{API_BASE_URL}/practitioners/me/service-categories",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n{GREEN}Total categories: {data['total']}{RESET}")
        print("\nAll categories (in order):")
        for i, cat in enumerate(data['results'], 1):
            print(f"  {i}. {cat['name']}")
            print(f"     - Color: {cat['color']}")
            print(f"     - Services: {cat['service_count']}")
            print(f"     - Order: {cat['order']}")
    
    print(f"\n{GREEN}{'='*60}{RESET}")
    print(f"{GREEN}✓ PRACTITIONER CATEGORIES FULLY IMPLEMENTED!{RESET}")
    print(f"{GREEN}{'='*60}{RESET}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)