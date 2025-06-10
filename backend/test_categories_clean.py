#!/usr/bin/env python
"""
Clean test of practitioner service categories
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

def main():
    print(f"\n{BLUE}Testing Practitioner Service Categories{RESET}")
    print("="*60)
    
    # Clean up any existing test data
    print(f"\n{YELLOW}Cleaning up test data...{RESET}")
    user = User.objects.filter(email="category_test@example.com").first()
    if user:
        # Delete practitioner and all related data
        if hasattr(user, 'practitioner_profile'):
            PractitionerServiceCategory.objects.filter(
                practitioner=user.practitioner_profile
            ).delete()
            print(f"{GREEN}✓ Cleaned up existing categories{RESET}")
    
    # Login as practitioner@example.com
    print(f"\n{YELLOW}1. Login as existing practitioner{RESET}")
    login_response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={"email": "practitioner@example.com", "password": "ValidPass123!"}
    )
    
    if login_response.status_code != 200:
        print(f"{RED}✗ Login failed: {login_response.text}{RESET}")
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"{GREEN}✓ Login successful{RESET}")
    
    # Get practitioner info
    me_response = requests.get(f"{API_BASE_URL}/practitioners/me", headers=headers)
    if me_response.status_code != 200:
        print(f"{RED}✗ Failed to get practitioner info{RESET}")
        return False
    
    practitioner_data = me_response.json()
    print(f"{GREEN}✓ Practitioner: {practitioner_data.get('display_name', 'N/A')} (ID: {practitioner_data['id']}){RESET}")
    
    # List existing categories
    print(f"\n{YELLOW}2. List existing categories{RESET}")
    response = requests.get(
        f"{API_BASE_URL}/practitioners/me/service-categories",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"{GREEN}✓ Found {data['total']} existing categories{RESET}")
        for cat in data.get('results', []):
            print(f"  - {cat['name']} (ID: {cat['id']})")
    
    # Create new categories
    print(f"\n{YELLOW}3. Create new categories{RESET}")
    categories = [
        {
            "name": "Massage Therapy",
            "description": "Various massage techniques",
            "icon": "spa",
            "color": "#4CAF50"
        },
        {
            "name": "Energy Healing", 
            "description": "Reiki and energy work",
            "icon": "bolt",
            "color": "#9C27B0"
        },
        {
            "name": "Wellness Coaching",
            "description": "Personal wellness coaching", 
            "icon": "psychology",
            "color": "#FF5722"
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
            print(f"{GREEN}✓ Created: {cat['name']} (ID: {cat['id']}){RESET}")
        else:
            print(f"{RED}✗ Failed to create {cat_data['name']}: {response.text}{RESET}")
    
    # Test reordering
    if len(created_ids) >= 2:
        print(f"\n{YELLOW}4. Test category reordering{RESET}")
        # Reverse the order
        reversed_ids = list(reversed(created_ids))
        
        response = requests.put(
            f"{API_BASE_URL}/practitioners/me/service-categories/reorder",
            headers=headers,
            json={"category_ids": reversed_ids}
        )
        
        if response.status_code == 200:
            print(f"{GREEN}✓ Categories reordered successfully{RESET}")
            
            # Verify new order
            response = requests.get(
                f"{API_BASE_URL}/practitioners/me/service-categories",
                headers=headers
            )
            if response.status_code == 200:
                cats = response.json()['results'][:len(created_ids)]
                print("New order:")
                for i, cat in enumerate(cats):
                    print(f"  {i+1}. {cat['name']} (order: {cat['order']})")
        else:
            print(f"{RED}✗ Failed to reorder: {response.text}{RESET}")
    
    # Create a service with category
    if created_ids:
        print(f"\n{YELLOW}5. Create service with practitioner category{RESET}")
        
        # First get service type ID for 'session'
        service_type = ServiceType.objects.get(code='session')
        
        service_data = {
            "name": "Deep Tissue Massage",
            "description": "60-minute deep tissue massage",
            "service_type_id": service_type.id,
            "duration_minutes": 60,
            "price_cents": 12000,  # $120.00
            "practitioner_category_id": created_ids[0],
            "is_active": True
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
            print(f"  Price: ${service.get('price')}")
        else:
            print(f"{RED}✗ Failed to create service: {response.text}{RESET}")
    
    # Final summary
    print(f"\n{YELLOW}6. Final summary{RESET}")
    response = requests.get(
        f"{API_BASE_URL}/practitioners/me/service-categories",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"{GREEN}✓ Total categories: {data['total']}{RESET}")
        print("\nAll categories:")
        for cat in data['results']:
            print(f"  - {cat['name']} ({cat['color']}) - {cat['service_count']} services")
    
    print(f"\n{GREEN}✓ All tests completed successfully!{RESET}")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)