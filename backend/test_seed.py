#!/usr/bin/env python
"""
Quick test to verify database and create minimal data
"""

from django.contrib.auth import get_user_model
from practitioners.models import Practitioner
from services.models import ServiceCategory, Service
from locations.models import Country, State, City, ZipCode

User = get_user_model()

print("🧪 Testing database connection and creating minimal data...")

try:
    # Count existing data
    print(f"\n📊 Current data:")
    print(f"  - Users: {User.objects.count()}")
    print(f"  - Practitioners: {Practitioner.objects.count()}")
    print(f"  - Services: {Service.objects.count()}")
    
    # Create test admin if doesn't exist
    admin, created = User.objects.get_or_create(
        email='admin@estuary.com',
        defaults={
            'first_name': 'Admin',
            'last_name': 'User',
            'is_staff': True,
            'is_superuser': True
        }
    )
    if created:
        admin.set_password('admin123')
        admin.save()
        print("\n✅ Created admin user: admin@estuary.com / admin123")
    else:
        print("\n✅ Admin user already exists")
    
    # Create test client
    client, created = User.objects.get_or_create(
        email='testclient@example.com',
        defaults={
            'first_name': 'Test',
            'last_name': 'Client'
        }
    )
    if created:
        client.set_password('password123')
        client.save()
        print("✅ Created client user: testclient@example.com / password123")
    
    # Create test practitioner
    prac_user, created = User.objects.get_or_create(
        email='testprac@example.com',
        defaults={
            'first_name': 'Test',
            'last_name': 'Practitioner',
            'is_practitioner': True
        }
    )
    if created:
        prac_user.set_password('password123')
        prac_user.save()
        
        # Create practitioner profile
        practitioner = Practitioner.objects.create(
            user=prac_user,
            bio='Test practitioner for development',
            hourly_rate=100
        )
        print("✅ Created practitioner: testprac@example.com / password123")
    else:
        practitioner = Practitioner.objects.filter(user=prac_user).first()
    
    # Create a service category if needed
    category, _ = ServiceCategory.objects.get_or_create(
        slug='general',
        defaults={'name': 'General Wellness'}
    )
    
    # Create a test service if practitioner exists
    if practitioner:
        service, created = Service.objects.get_or_create(
            practitioner=practitioner,
            title='Test Wellness Session',
            defaults={
                'description': 'A test service for development',
                'service_type': 'session',
                'category': category,
                'price': 100,
                'duration': 60,
                'is_active': True
            }
        )
        if created:
            print("✅ Created test service")
    
    print("\n📊 Final data count:")
    print(f"  - Users: {User.objects.count()}")
    print(f"  - Practitioners: {Practitioner.objects.count()}")
    print(f"  - Services: {Service.objects.count()}")
    
    print("\n✅ Test completed successfully!")
    print("\n🔑 You can now login to Django admin:")
    print("   URL: http://localhost:8000/admin/")
    print("   Email: admin@estuary.com")
    print("   Password: admin123")
    
except Exception as e:
    print(f"\n❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()