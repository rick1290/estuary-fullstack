#!/usr/bin/env python
"""
Test practitioner-specific service categories API
"""
import requests
import json
import sys
from datetime import datetime

# API Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
AUTH_TOKEN = None

# Test practitioner credentials
PRACTITIONER = {
    "email": "practitioner@example.com", 
    "password": "ValidPass123!"
}

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def make_request(method: str, endpoint: str, 
                 headers=None, json_data=None, params=None):
    """Make an HTTP request and return status code and response data"""
    url = f"{API_BASE_URL}{endpoint}"
    
    try:
        response = requests.request(
            method, 
            url, 
            headers=headers, 
            json=json_data,
            params=params
        )
        try:
            data = response.json()
        except:
            data = {"text": response.text}
        return response.status_code, data
    except Exception as e:
        return 0, {"error": str(e)}

def login(credentials):
    """Login and get auth token"""
    print(f"\n{YELLOW}Logging in as {credentials['email']}...{RESET}")
    
    status, data = make_request(
        "POST", 
        "/auth/login", 
        headers={"Content-Type": "application/json"},
        json_data=credentials
    )
    
    if status == 200 and "access_token" in data:
        print(f"{GREEN}✓ Login successful{RESET}")
        return data["access_token"]
    else:
        print(f"{RED}✗ Login failed: {data}{RESET}")
        return None

def test_practitioner_categories():
    """Test practitioner service categories functionality"""
    global AUTH_TOKEN
    
    print(f"\n{'='*60}")
    print(f"{BLUE}Testing Practitioner Service Categories API{RESET}")
    print(f"{'='*60}")
    
    # Login as practitioner
    AUTH_TOKEN = login(PRACTITIONER)
    if not AUTH_TOKEN:
        return False
    
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    
    # Test 1: List categories (should be empty initially)
    print(f"\n{BLUE}1. List practitioner categories{RESET}")
    status, data = make_request("GET", "/practitioners/me/service-categories", headers=headers)
    print(f"Status: {status}")
    if status == 200:
        print(f"{GREEN}✓ Listed categories successfully{RESET}")
        print(f"Total categories: {data.get('total', 0)}")
    else:
        print(f"{RED}✗ Failed to list categories: {data}{RESET}")
        return False
    
    # Test 2: Create categories
    print(f"\n{BLUE}2. Create practitioner categories{RESET}")
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
    
    created_categories = []
    for category_data in categories:
        status, data = make_request(
            "POST", 
            "/practitioners/me/service-categories",
            headers=headers,
            json_data=category_data
        )
        if status == 201:
            print(f"{GREEN}✓ Created category: {category_data['name']}{RESET}")
            created_categories.append(data)
        else:
            print(f"{RED}✗ Failed to create category: {data}{RESET}")
    
    # Test 3: Update a category
    if created_categories:
        print(f"\n{BLUE}3. Update a category{RESET}")
        category_id = created_categories[0]['id']
        update_data = {
            "name": "Premium Wellness Sessions",
            "color": "#8BC34A"
        }
        status, data = make_request(
            "PUT",
            f"/practitioners/me/service-categories/{category_id}",
            headers=headers,
            json_data=update_data
        )
        if status == 200:
            print(f"{GREEN}✓ Updated category successfully{RESET}")
            print(f"New name: {data['name']}")
            print(f"New color: {data['color']}")
        else:
            print(f"{RED}✗ Failed to update category: {data}{RESET}")
    
    # Test 4: Reorder categories
    if len(created_categories) >= 2:
        print(f"\n{BLUE}4. Reorder categories (drag-drop simulation){RESET}")
        # Reverse the order
        category_ids = [cat['id'] for cat in created_categories]
        category_ids.reverse()
        
        status, data = make_request(
            "PUT",
            "/practitioners/me/service-categories/reorder",
            headers=headers,
            json_data={"category_ids": category_ids}
        )
        if status == 200:
            print(f"{GREEN}✓ Reordered categories successfully{RESET}")
            
            # Verify new order
            status, data = make_request("GET", "/practitioners/me/service-categories", headers=headers)
            if status == 200:
                print("New order:")
                for i, cat in enumerate(data['results']):
                    print(f"  {i+1}. {cat['name']} (order: {cat['order']})")
        else:
            print(f"{RED}✗ Failed to reorder categories: {data}{RESET}")
    
    # Test 5: Create a service with practitioner category
    if created_categories:
        print(f"\n{BLUE}5. Create service with practitioner category{RESET}")
        service_data = {
            "name": "Private Wellness Consultation",
            "description": "One-on-one wellness consultation",
            "service_type": "session",
            "duration_minutes": 60,
            "price": 150.00,
            "practitioner_category_id": created_categories[0]['id'],
            "primary_practitioner_id": 1  # Assuming practitioner ID is 1
        }
        
        status, data = make_request(
            "POST",
            "/practitioners/me/services",
            headers=headers,
            json_data=service_data
        )
        if status == 201:
            print(f"{GREEN}✓ Created service with practitioner category{RESET}")
            print(f"Service: {data.get('name')}")
            print(f"Category ID: {data.get('practitioner_category_id')}")
        else:
            print(f"{RED}✗ Failed to create service: {data}{RESET}")
    
    # Test 6: Delete a category
    if len(created_categories) > 2:
        print(f"\n{BLUE}6. Delete a category{RESET}")
        category_id = created_categories[-1]['id']
        status, data = make_request(
            "DELETE",
            f"/practitioners/me/service-categories/{category_id}",
            headers=headers
        )
        if status == 200:
            print(f"{GREEN}✓ Deleted category successfully{RESET}")
            print(f"Message: {data.get('message')}")
        else:
            print(f"{RED}✗ Failed to delete category: {data}{RESET}")
    
    # Test 7: Final list to verify
    print(f"\n{BLUE}7. Final category list{RESET}")
    status, data = make_request("GET", "/practitioners/me/service-categories", headers=headers)
    if status == 200:
        print(f"{GREEN}✓ Final categories:{RESET}")
        for cat in data['results']:
            print(f"  - {cat['name']} ({cat['color']}) - {cat['service_count']} services")
    
    return True

if __name__ == "__main__":
    success = test_practitioner_categories()
    sys.exit(0 if success else 1)