#!/usr/bin/env python
"""
Setup initial test users for API testing.
Run this before running the main test suite.
"""
import os
import sys
import django

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

TEST_USERS = [
    {
        "email": "admin@estuary.com",
        "password": "admin123",
        "first_name": "Admin",
        "last_name": "User",
        "is_staff": True,
        "is_superuser": True
    },
    {
        "email": "practitioner@estuary.com",
        "password": "practitioner123",
        "first_name": "John",
        "last_name": "Practitioner",
        "is_staff": False,
        "is_superuser": False
    },
    {
        "email": "client@estuary.com",
        "password": "client123",
        "first_name": "Jane",
        "last_name": "Client",
        "is_staff": False,
        "is_superuser": False
    }
]

def create_test_users():
    """Create test users if they don't exist."""
    print("Creating test users...")
    
    with transaction.atomic():
        for user_data in TEST_USERS:
            email = user_data["email"]
            password = user_data.pop("password")
            
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email,
                    **user_data
                }
            )
            
            if created:
                user.set_password(password)
                user.save()
                print(f"✓ Created user: {email}")
            else:
                # Update password for existing user
                user.set_password(password)
                user.save()
                print(f"- Updated password for existing user: {email}")
    
    print("\nTest users ready!")
    print("Credentials:")
    for user in TEST_USERS:
        print(f"  - {user['email']}: {user.get('password', 'admin123')}")

if __name__ == "__main__":
    create_test_users()