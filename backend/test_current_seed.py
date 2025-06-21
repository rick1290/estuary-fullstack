#!/usr/bin/env python
"""
Test script to check current database state and seed some test data
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

print("🔍 Checking current database state...")
print(f"Total users: {User.objects.count()}")
print(f"Admin users: {User.objects.filter(is_superuser=True).count()}")
print(f"Practitioners: {User.objects.filter(is_practitioner=True).count()}")

# Try to import models to see what's available
try:
    from practitioners.models import Practitioner
    print(f"Practitioners (from model): {Practitioner.objects.count()}")
except Exception as e:
    print(f"Could not import Practitioner: {e}")

try:
    from services.models import Service
    print(f"Services: {Service.objects.count()}")
except Exception as e:
    print(f"Could not import Service: {e}")

try:
    from bookings.models import Booking
    print(f"Bookings: {Booking.objects.count()}")
except Exception as e:
    print(f"Could not import Booking: {e}")

# Create a few test users
print("\n🌱 Creating test users...")
try:
    with transaction.atomic():
        for i in range(1, 6):
            user, created = User.objects.get_or_create(
                email=f'testuser{i}@example.com',
                defaults={
                    'first_name': f'Test{i}',
                    'last_name': 'User',
                    'is_active': True
                }
            )
            if created:
                user.set_password('test123')
                user.save()
                print(f"✓ Created {user.email}")
            else:
                print(f"- {user.email} already exists")
                
        # Create test practitioners
        for i in range(1, 4):
            user, created = User.objects.get_or_create(
                email=f'testpractitioner{i}@example.com',
                defaults={
                    'first_name': f'TestPrac{i}',
                    'last_name': 'Professional',
                    'is_active': True,
                    'is_practitioner': True
                }
            )
            if created:
                user.set_password('test123')
                user.save()
                print(f"✓ Created practitioner {user.email}")
            else:
                print(f"- Practitioner {user.email} already exists")
                
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n📊 Final counts:")
print(f"Total users: {User.objects.count()}")
print(f"Test users: {User.objects.filter(email__startswith='testuser').count()}")
print(f"Test practitioners: {User.objects.filter(email__startswith='testpractitioner').count()}")