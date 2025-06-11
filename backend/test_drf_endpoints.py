#!/usr/bin/env python3
"""
Test script to verify DRF endpoints are working
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1/drf"

# Test user credentials
TEST_USER = {
    "email": f"test_{datetime.now().timestamp()}@example.com",
    "password": "Test123!@#",
    "first_name": "Test",
    "last_name": "User"
}

def print_response(response, endpoint):
    """Pretty print response"""
    print(f"\n{'='*60}")
    print(f"Endpoint: {endpoint}")
    print(f"Status: {response.status_code}")
    print(f"Response:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text[:200])
    print('='*60)

def test_health_check():
    """Test health check endpoint"""
    response = requests.get(f"{BASE_URL}/health/")
    print_response(response, "GET /health/")
    return response.status_code == 200

def test_api_info():
    """Test API info endpoint"""
    response = requests.get(f"{BASE_URL}/info/")
    print_response(response, "GET /info/")
    return response.status_code == 200

def test_auth_register():
    """Test user registration"""
    register_data = {
        **TEST_USER,
        "password_confirm": TEST_USER["password"]
    }
    response = requests.post(f"{BASE_URL}/auth/register/", json=register_data)
    print_response(response, "POST /auth/register/")
    return response.status_code in [200, 201]

def test_auth_login():
    """Test user login"""
    login_data = {
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }
    response = requests.post(f"{BASE_URL}/auth/login/", json=login_data)
    print_response(response, "POST /auth/login/")
    
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token"), data.get("refresh_token")
    return None, None

def test_auth_me(access_token):
    """Test authenticated user endpoint"""
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/auth/me/", headers=headers)
    print_response(response, "GET /auth/me/")
    return response.status_code == 200

def test_services_list():
    """Test services list endpoint"""
    response = requests.get(f"{BASE_URL}/services/")
    print_response(response, "GET /services/")
    return response.status_code == 200

def test_practitioners_list():
    """Test practitioners list endpoint"""
    response = requests.get(f"{BASE_URL}/practitioners/")
    print_response(response, "GET /practitioners/")
    return response.status_code == 200

def test_locations_countries():
    """Test locations countries endpoint"""
    response = requests.get(f"{BASE_URL}/locations/countries/")
    print_response(response, "GET /locations/countries/")
    return response.status_code == 200

def test_reviews_list(access_token):
    """Test reviews list endpoint"""
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/reviews/", headers=headers)
    print_response(response, "GET /reviews/")
    return response.status_code == 200

def test_notifications_list(access_token):
    """Test notifications list endpoint"""
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/notifications/", headers=headers)
    print_response(response, "GET /notifications/")
    return response.status_code == 200

def main():
    """Run all tests"""
    print("Testing DRF Endpoints")
    print("=" * 60)
    
    tests_passed = 0
    tests_total = 0
    
    # Test public endpoints
    public_tests = [
        ("Health Check", test_health_check),
        ("API Info", test_api_info),
        ("Services List", test_services_list),
        ("Practitioners List", test_practitioners_list),
        ("Countries List", test_locations_countries),
    ]
    
    for test_name, test_func in public_tests:
        tests_total += 1
        try:
            if test_func():
                print(f"✓ {test_name} passed")
                tests_passed += 1
            else:
                print(f"✗ {test_name} failed")
        except Exception as e:
            print(f"✗ {test_name} error: {e}")
    
    # Test authentication
    tests_total += 1
    try:
        if test_auth_register():
            print("✓ Registration passed")
            tests_passed += 1
        else:
            print("✗ Registration failed")
    except Exception as e:
        print(f"✗ Registration error: {e}")
    
    # Test login and get tokens
    access_token = None
    tests_total += 1
    try:
        access_token, refresh_token = test_auth_login()
        if access_token:
            print("✓ Login passed")
            tests_passed += 1
        else:
            print("✗ Login failed")
    except Exception as e:
        print(f"✗ Login error: {e}")
    
    # Test authenticated endpoints
    if access_token:
        auth_tests = [
            ("Current User", lambda: test_auth_me(access_token)),
            ("Reviews List", lambda: test_reviews_list(access_token)),
            ("Notifications List", lambda: test_notifications_list(access_token)),
        ]
        
        for test_name, test_func in auth_tests:
            tests_total += 1
            try:
                if test_func():
                    print(f"✓ {test_name} passed")
                    tests_passed += 1
                else:
                    print(f"✗ {test_name} failed")
            except Exception as e:
                print(f"✗ {test_name} error: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print(f"Test Summary: {tests_passed}/{tests_total} passed")
    print("=" * 60)
    
    # Test documentation endpoints
    print("\nDocumentation URLs:")
    print(f"- Swagger UI: {BASE_URL}/docs/")
    print(f"- ReDoc: {BASE_URL}/docs/redoc/")
    print(f"- OpenAPI Schema: {BASE_URL}/docs/schema/")
    print(f"- API Resources: {BASE_URL}/resources/")
    print(f"- API Examples: {BASE_URL}/examples/")
    print(f"- Error Codes: {BASE_URL}/errors/")
    
    return 0 if tests_passed == tests_total else 1

if __name__ == "__main__":
    sys.exit(main())