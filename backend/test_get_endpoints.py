#!/usr/bin/env python
"""
Test all GET endpoints in the Estuary API
Tests both public and authenticated endpoints including /me routes
"""
import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# API Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
AUTH_TOKEN = None  # Will be set after login

# Test user credentials
TEST_USER = {
    "email": "test@example.com",
    "password": "ValidPass123!"
}

TEST_PRACTITIONER = {
    "email": "practitioner@example.com", 
    "password": "ValidPass123!"
}

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

# Track results
results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def make_request(method: str, endpoint: str, 
                 headers: Optional[Dict] = None, 
                 json_data: Optional[Dict] = None,
                 params: Optional[Dict] = None) -> Tuple[int, Dict]:
    """Make an HTTP request and return status code and response data"""
    url = f"{API_BASE_URL}{endpoint}" if not endpoint.startswith("http") else endpoint
    
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

def test_endpoint(method: str, endpoint: str, 
                  description: str, auth_required: bool = False, 
                  params: Optional[Dict] = None, 
                  expected_status: int = 200) -> bool:
    """Test a single endpoint"""
    headers = {}
    if auth_required and AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
    
    print(f"\n{BLUE}Testing:{RESET} {method} {endpoint}")
    print(f"  Description: {description}")
    
    status, data = make_request(method, endpoint, headers, params=params)
    
    if status == expected_status:
        print(f"  {GREEN}✓ Status: {status}{RESET}")
        results["passed"] += 1
        
        # Print sample data for successful requests
        if isinstance(data, dict):
            if "results" in data:
                print(f"  Results count: {len(data.get('results', []))}")
            elif "id" in data:
                print(f"  ID: {data.get('id')}")
        
        return True
    else:
        print(f"  {RED}✗ Status: {status} (expected {expected_status}){RESET}")
        if isinstance(data, dict) and "detail" in data:
            print(f"  Error: {data['detail']}")
        results["failed"] += 1
        results["errors"].append({
            "endpoint": endpoint,
            "status": status,
            "expected": expected_status,
            "error": data
        })
        return False

def login(credentials: Dict) -> Optional[str]:
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

def run_all_tests():
    """Run all GET endpoint tests"""
    global AUTH_TOKEN
    
    print(f"\n{'='*60}")
    print(f"{BLUE}Testing All GET Endpoints - Estuary API{RESET}")
    print(f"{'='*60}")
    
    # Test public endpoints (no auth required)
    print(f"\n{YELLOW}=== PUBLIC ENDPOINTS ==={RESET}")
    
    # Service discovery
    test_endpoint("GET", "/services/", 
                      "List all public services", auth_required=False)
    test_endpoint("GET", "/services/categories",
                      "List service categories", auth_required=False)
    test_endpoint("GET", "/services/types",
                      "List service types", auth_required=False)
    
    # Practitioner discovery
    test_endpoint("GET", "/practitioners",
                      "List all practitioners", auth_required=False)
    
    # Location endpoints
    test_endpoint("GET", "/locations/countries",
                      "List available countries", auth_required=False)
    test_endpoint("GET", "/locations/cities",
                      "List cities", auth_required=False)
    
    # Search endpoints
    test_endpoint("GET", "/search/combined",
                      "Combined search", auth_required=False, 
                      params={"q": "wellness"})
    test_endpoint("GET", "/search/suggestions",
                      "Search suggestions", auth_required=False,
                      params={"q": "mass"})
    
    # Streams (public)
    test_endpoint("GET", "/streams/discover",
                      "Discover public streams", auth_required=False)
    test_endpoint("GET", "/streams/categories",
                      "List stream categories", auth_required=False)
    
    # Auth check endpoints
    test_endpoint("GET", "/auth/me",
                      "Check auth status", auth_required=False,
                      expected_status=401)
    
    # Subscription tiers
    test_endpoint("GET", "/practitioner-subscriptions/tiers",
                      "List subscription tiers", auth_required=False)
    
    # Login as regular user
    print(f"\n{YELLOW}=== AUTHENTICATED USER ENDPOINTS ==={RESET}")
    AUTH_TOKEN = login(TEST_USER)
    
    if AUTH_TOKEN:
        # User profile endpoints
        test_endpoint("GET", "/auth/me",
                          "Get current user profile", auth_required=True)
        test_endpoint("GET", "/users/me",
                          "Get user profile", auth_required=True)
        
        # User bookings
        test_endpoint("GET", "/bookings/",
                          "List user's bookings", auth_required=True)
        test_endpoint("GET", "/bookings/stats",
                          "Booking statistics", auth_required=True)
        
        # User payments
        test_endpoint("GET", "/payments/credits/balance",
                          "Get credit balance", auth_required=True)
        test_endpoint("GET", "/payments/credits/transactions",
                          "List credit transactions", auth_required=True)
        test_endpoint("GET", "/payments/payment-methods",
                          "List payment methods", auth_required=True)
        test_endpoint("GET", "/payments/orders",
                          "List orders", auth_required=True)
        
        # User reviews
        test_endpoint("GET", "/reviews/",
                          "List reviews", auth_required=True)
        
        # User notifications
        test_endpoint("GET", "/notifications/",
                          "List notifications", auth_required=True)
        test_endpoint("GET", "/notifications/unread-count",
                          "Unread notification count", auth_required=True)
        
        # User messages
        test_endpoint("GET", "/messaging/conversations",
                          "List conversations", auth_required=True)
        test_endpoint("GET", "/messaging/unread-count",
                          "Unread message count", auth_required=True)
        
        # User streams/subscriptions
        test_endpoint("GET", "/streams/my-subscriptions",
                          "List stream subscriptions", auth_required=True)
    
    # Login as practitioner
    print(f"\n{YELLOW}=== PRACTITIONER ENDPOINTS ==={RESET}")
    AUTH_TOKEN = login(TEST_PRACTITIONER)
    
    if AUTH_TOKEN:
        # Practitioner profile
        test_endpoint("GET", "/practitioners/me",
                          "Get practitioner profile", auth_required=True)
        test_endpoint("GET", "/practitioners/me/analytics",
                          "Practitioner analytics", auth_required=True)
        
        # Practitioner services
        test_endpoint("GET", "/practitioners/me/services",
                          "List practitioner's services", auth_required=True)
        
        # Practitioner availability
        test_endpoint("GET", "/practitioners/me/availability",
                          "Get availability settings", auth_required=True)
        test_endpoint("GET", "/practitioners/availability/schedules",
                          "List schedules", auth_required=True)
        
        # Practitioner earnings
        test_endpoint("GET", "/practitioners/me/earnings",
                          "Earnings overview", auth_required=True)
        test_endpoint("GET", "/practitioners/me/earnings/transactions",
                          "Earnings transactions", auth_required=True)
        test_endpoint("GET", "/practitioners/me/earnings/payouts",
                          "Payout history", auth_required=True)
        
        # Practitioner analytics
        test_endpoint("GET", "/analytics/practitioner/dashboard",
                          "Analytics dashboard", auth_required=True)
        test_endpoint("GET", "/analytics/practitioner/metrics",
                          "Performance metrics", auth_required=True)
        
        # Practitioner subscription
        test_endpoint("GET", "/practitioner-subscriptions/current",
                          "Current subscription", auth_required=True)
        test_endpoint("GET", "/practitioner-subscriptions/usage",
                          "Subscription usage", auth_required=True)
        
        # Community features
        test_endpoint("GET", "/community/",
                          "Community posts", auth_required=True)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{'='*60}")
    print(f"{GREEN}Passed: {results['passed']}{RESET}")
    print(f"{RED}Failed: {results['failed']}{RESET}")
    
    if results["errors"]:
        print(f"\n{RED}Failed Endpoints:{RESET}")
        for error in results["errors"]:
            print(f"  - {error['endpoint']}: {error['status']} (expected {error['expected']})")
            if isinstance(error['error'], dict) and 'detail' in error['error']:
                print(f"    Error: {error['error']['detail']}")
    
    return results["failed"] == 0

if __name__ == "__main__":
    # Use synchronous version
    test_endpoint = test_endpoint  # Remove await
    success = run_all_tests()
    sys.exit(0 if success else 1)