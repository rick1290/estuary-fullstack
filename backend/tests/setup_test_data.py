#!/usr/bin/env python
"""
Setup test data including practitioner profiles.
Run this inside the Docker container.
"""
import os
import sys
import django

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction
from practitioners.models import Practitioner
from services.models import ServiceType, ServiceCategory

User = get_user_model()

def setup_test_data():
    """Setup comprehensive test data."""
    print("Setting up test data...")
    
    with transaction.atomic():
        # 1. Ensure service types exist
        print("\n1. Creating service types...")
        service_types = [
            {"code": "session", "name": "Session", "description": "One-on-one session"},
            {"code": "workshop", "name": "Workshop", "description": "Group workshop"},
            {"code": "course", "name": "Course", "description": "Multi-session course"},
            {"code": "package", "name": "Package", "description": "Package of sessions"},
            {"code": "bundle", "name": "Bundle", "description": "Bundle of different services"}
        ]
        
        for st_data in service_types:
            st, created = ServiceType.objects.get_or_create(
                code=st_data["code"],
                defaults=st_data
            )
            print(f"  {'✓ Created' if created else '- Exists'}: {st.name}")
        
        # 2. Create service categories
        print("\n2. Creating service categories...")
        categories = [
            {"name": "Wellness", "slug": "wellness", "description": "Wellness services"},
            {"name": "Fitness", "slug": "fitness", "description": "Fitness services"},
            {"name": "Therapy", "slug": "therapy", "description": "Therapy services"},
            {"name": "Coaching", "slug": "coaching", "description": "Coaching services"}
        ]
        
        for cat_data in categories:
            cat, created = ServiceCategory.objects.get_or_create(
                slug=cat_data["slug"],
                defaults=cat_data
            )
            print(f"  {'✓ Created' if created else '- Exists'}: {cat.name}")
        
        # 3. Create practitioner profile
        print("\n3. Creating practitioner profile...")
        try:
            practitioner_user = User.objects.get(email="practitioner@estuary.com")
            
            practitioner, created = Practitioner.objects.get_or_create(
                user=practitioner_user,
                defaults={
                    "display_name": "Dr. John Practitioner",
                    "slug": "dr-john-practitioner",
                    "bio": "Experienced wellness practitioner with over 10 years of experience",
                    "credentials": ["PhD in Wellness", "Certified Yoga Instructor", "Licensed Therapist"],
                    "specialties": ["Yoga", "Meditation", "Nutrition", "Stress Management"],
                    "years_of_experience": 10,
                    "languages": ["English", "Spanish"],
                    "timezone": "America/Los_Angeles",
                    "accepts_insurance": False,
                    "sliding_scale_available": True,
                    "phone": "+1 555-123-4567",
                    "status": "active",
                    "is_verified": True,
                    "accepts_new_clients": True
                }
            )
            
            if created:
                print(f"  ✓ Created practitioner profile: {practitioner.display_name}")
            else:
                print(f"  - Practitioner profile already exists: {practitioner.display_name}")
                # Update some fields
                practitioner.status = "active"
                practitioner.is_verified = True
                practitioner.accepts_new_clients = True
                practitioner.save()
                print("    Updated status to active")
            
        except User.DoesNotExist:
            print("  ✗ Practitioner user not found!")
        
        # 4. Create admin practitioner profile (optional)
        print("\n4. Creating admin practitioner profile...")
        try:
            admin_user = User.objects.get(email="admin@estuary.com")
            
            admin_practitioner, created = Practitioner.objects.get_or_create(
                user=admin_user,
                defaults={
                    "display_name": "Admin Practitioner",
                    "slug": "admin-practitioner",
                    "bio": "Test admin practitioner",
                    "years_of_experience": 5,
                    "timezone": "America/Los_Angeles",
                    "status": "active",
                    "is_verified": True
                }
            )
            
            if created:
                print(f"  ✓ Created admin practitioner profile")
            else:
                print(f"  - Admin practitioner profile already exists")
                
        except User.DoesNotExist:
            print("  ✗ Admin user not found!")
    
    print("\n✅ Test data setup complete!")
    
    # Print summary
    print("\nSummary:")
    print(f"- Service types: {ServiceType.objects.count()}")
    print(f"- Service categories: {ServiceCategory.objects.count()}")
    print(f"- Practitioners: {Practitioner.objects.count()}")
    print(f"- Active practitioners: {Practitioner.objects.filter(status='active').count()}")

if __name__ == "__main__":
    setup_test_data()