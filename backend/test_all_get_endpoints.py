#!/usr/bin/env python
"""
Test all GET endpoints in the Estuary API
Tests both public and authenticated endpoints including /me routes
"""
import asyncio
import aiohttp
import json
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import os

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

async def make_request(session: aiohttp.ClientSession, method: str, endpoint: str, 
                      headers: Optional[Dict] = None, params: Optional[Dict] = None) -> Tuple[int, Dict]:
    """Make an HTTP request and return status code and response data"""
    url = f"{API_BASE_URL}{endpoint}" if not endpoint.startswith("http") else endpoint
    
    try:
        async with session.request(method, url, headers=headers, params=params) as response:
            try:
                data = await response.json()
            except:
                data = {"text": await response.text()}
            return response.status, data
    except Exception as e:
        return 0, {"error": str(e)}

async def test_endpoint(session: aiohttp.ClientSession, method: str, endpoint: str, 
                       description: str, auth_required: bool = False, 
                       params: Optional[Dict] = None, expected_status: int = 200) -> bool:
    """Test a single endpoint"""
    headers = {}
    if auth_required and AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
    
    print(f"\n{BLUE}Testing:{RESET} {method} {endpoint}")
    print(f"  Description: {description}")
    
    status, data = await make_request(session, method, endpoint, headers, params)
    
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

async def login(session: aiohttp.ClientSession, credentials: Dict) -> Optional[str]:
    """Login and get auth token"""
    print(f"\n{YELLOW}Logging in as {credentials['email']}...{RESET}")
    
    status, data = await make_request(session, "POST", "/auth/login", 
                                    headers={"Content-Type": "application/json"},
                                    params=json.dumps(credentials))
    
    if status == 200 and "access_token" in data:
        print(f"{GREEN}✓ Login successful{RESET}")
        return data["access_token"]
    else:
        print(f"{RED}✗ Login failed: {data}{RESET}")
        return None

async def run_all_tests():
    """Run all GET endpoint tests"""
    global AUTH_TOKEN
    
    async with aiohttp.ClientSession() as session:
        print(f"\n{'='*60}")
        print(f"{BLUE}Testing All GET Endpoints - Estuary API{RESET}")
        print(f"{'='*60}")
        
        # Test public endpoints (no auth required)
        print(f"\n{YELLOW}=== PUBLIC ENDPOINTS ==={RESET}")
        
        # Service discovery
        await test_endpoint(session, "GET", "/services", 
                          "List all public services", auth_required=False)
        await test_endpoint(session, "GET", "/services/categories",
                          "List service categories", auth_required=False)
        await test_endpoint(session, "GET", "/services/types",
                          "List service types", auth_required=False)
        
        # Practitioner discovery
        await test_endpoint(session, "GET", "/practitioners",
                          "List all practitioners", auth_required=False)
        await test_endpoint(session, "GET", "/practitioners/specialties",
                          "List practitioner specialties", auth_required=False)
        
        # Location endpoints
        await test_endpoint(session, "GET", "/locations",
                          "List service locations", auth_required=False)
        await test_endpoint(session, "GET", "/locations/countries",
                          "List available countries", auth_required=False)
        
        # Search endpoints
        await test_endpoint(session, "GET", "/search",
                          "Global search", auth_required=False, 
                          params={"q": "wellness"})
        await test_endpoint(session, "GET", "/search/suggestions",
                          "Search suggestions", auth_required=False,
                          params={"q": "mass"})
        
        # Reviews (public)
        await test_endpoint(session, "GET", "/reviews",
                          "List all reviews", auth_required=False)
        
        # Streams (public)
        await test_endpoint(session, "GET", "/streams",
                          "List public streams", auth_required=False)
        await test_endpoint(session, "GET", "/streams/categories",
                          "List stream categories", auth_required=False)
        
        # Auth check endpoints
        await test_endpoint(session, "GET", "/auth/check",
                          "Check auth status", auth_required=False)
        
        # Login as regular user
        print(f"\n{YELLOW}=== AUTHENTICATED USER ENDPOINTS ==={RESET}")
        AUTH_TOKEN = await login(session, TEST_USER)
        
        if AUTH_TOKEN:
            # User profile endpoints
            await test_endpoint(session, "GET", "/users/me",
                              "Get current user profile", auth_required=True)
            await test_endpoint(session, "GET", "/users/me/settings",
                              "Get user settings", auth_required=True)
            
            # User bookings
            await test_endpoint(session, "GET", "/bookings",
                              "List user's bookings", auth_required=True)
            await test_endpoint(session, "GET", "/bookings/upcoming",
                              "List upcoming bookings", auth_required=True)
            await test_endpoint(session, "GET", "/bookings/past",
                              "List past bookings", auth_required=True)
            
            # User payments
            await test_endpoint(session, "GET", "/payments/credits",
                              "Get credit balance", auth_required=True)
            await test_endpoint(session, "GET", "/payments/transactions",
                              "List payment transactions", auth_required=True)
            await test_endpoint(session, "GET", "/payments/methods",
                              "List payment methods", auth_required=True)
            
            # User reviews
            await test_endpoint(session, "GET", "/reviews/me",
                              "List user's reviews", auth_required=True)
            
            # User notifications
            await test_endpoint(session, "GET", "/notifications",
                              "List notifications", auth_required=True)
            await test_endpoint(session, "GET", "/notifications/unread",
                              "List unread notifications", auth_required=True)
            
            # User messages
            await test_endpoint(session, "GET", "/messaging/conversations",
                              "List conversations", auth_required=True)
            
            # User streams/subscriptions
            await test_endpoint(session, "GET", "/streams/subscriptions",
                              "List stream subscriptions", auth_required=True)
        
        # Login as practitioner
        print(f"\n{YELLOW}=== PRACTITIONER ENDPOINTS ==={RESET}")
        AUTH_TOKEN = await login(session, TEST_PRACTITIONER)
        
        if AUTH_TOKEN:
            # Practitioner profile
            await test_endpoint(session, "GET", "/practitioners/me",
                              "Get practitioner profile", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/onboarding",
                              "Get onboarding status", auth_required=True)
            
            # Practitioner services
            await test_endpoint(session, "GET", "/practitioners/me/services",
                              "List practitioner's services", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/services/stats",
                              "Service statistics", auth_required=True)
            
            # Practitioner availability
            await test_endpoint(session, "GET", "/practitioners/me/availability",
                              "Get availability settings", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/schedules",
                              "List schedules", auth_required=True)
            
            # Practitioner bookings
            await test_endpoint(session, "GET", "/practitioners/me/bookings",
                              "List practitioner bookings", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/bookings/upcoming",
                              "Upcoming appointments", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/bookings/calendar",
                              "Calendar view", auth_required=True)
            
            # Practitioner earnings
            await test_endpoint(session, "GET", "/practitioners/me/earnings",
                              "Earnings overview", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/earnings/transactions",
                              "Earnings transactions", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/earnings/payouts",
                              "Payout history", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/earnings/pending",
                              "Pending earnings", auth_required=True)
            
            # Practitioner analytics
            await test_endpoint(session, "GET", "/practitioners/me/analytics",
                              "Analytics dashboard", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/analytics/revenue",
                              "Revenue analytics", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/analytics/clients",
                              "Client analytics", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/analytics/services",
                              "Service performance", auth_required=True)
            
            # Practitioner reviews
            await test_endpoint(session, "GET", "/practitioners/me/reviews",
                              "Practitioner's reviews", auth_required=True)
            await test_endpoint(session, "GET", "/practitioners/me/reviews/stats",
                              "Review statistics", auth_required=True)
            
            # Practitioner subscription
            await test_endpoint(session, "GET", "/practitioners/me/subscription",
                              "Platform subscription", auth_required=True)
            await test_endpoint(session, "GET", "/practitioner-subscriptions/plans",
                              "Available subscription plans", auth_required=True)
            
            # Practitioner streams
            await test_endpoint(session, "GET", "/practitioners/me/streams",
                              "Practitioner's streams", auth_required=True)
            await test_endpoint(session, "GET", "/streams/my-streams",
                              "My content streams", auth_required=True)
            
            # Practitioner media
            await test_endpoint(session, "GET", "/practitioners/me/media",
                              "Media library", auth_required=True)
            
            # Practitioner clients
            await test_endpoint(session, "GET", "/practitioners/me/clients",
                              "Client list", auth_required=True)
            
            # Community features
            await test_endpoint(session, "GET", "/community/posts",
                              "Community posts", auth_required=True)
            await test_endpoint(session, "GET", "/community/following",
                              "Following list", auth_required=True)
            
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
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)