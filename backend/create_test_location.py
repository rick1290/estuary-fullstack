#!/usr/bin/env python3
"""
Create test locations (Address) in the database
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estuary.settings')
django.setup()

from utils.models import Address

# Create multiple test locations
locations_data = [
    {
        'name': 'Test Wellness Center',
        'address_line_1': '123 Test Street',
        'city': 'San Francisco',
        'state_province': 'California',
        'state_province_code': 'CA',
        'postal_code': '94102',
        'country_code': 'US',
        'latitude': 37.7749,
        'longitude': -122.4194,
        'timezone': 'America/Los_Angeles',
        'is_verified': True,
        'location_type': 'clinic'
    },
    {
        'name': 'Virtual Sessions',
        'address_line_1': 'Online',
        'city': 'Virtual',
        'state_province': 'Online',
        'state_province_code': 'VR',
        'postal_code': '00000',
        'country_code': 'US',
        'latitude': 0.0,
        'longitude': 0.0,
        'timezone': 'UTC',
        'is_verified': True,
        'location_type': 'virtual'
    },
    {
        'name': 'Downtown Yoga Studio',
        'address_line_1': '456 Market Street',
        'city': 'San Francisco',
        'state_province': 'California',
        'state_province_code': 'CA',
        'postal_code': '94103',
        'country_code': 'US',
        'latitude': 37.7897,
        'longitude': -122.3972,
        'timezone': 'America/Los_Angeles',
        'is_verified': True,
        'location_type': 'studio'
    }
]

for i, location_data in enumerate(locations_data, 1):
    location, created = Address.objects.get_or_create(
        id=i,
        defaults=location_data
    )
    
    if created:
        print(f"✅ Created test location with ID {location.id}")
    else:
        print(f"✅ Test location already exists with ID {location.id}")
    
    print(f"   Name: {location.name}")
    print(f"   Address: {location.address_line_1}, {location.city}, {location.state_province_code}")
    print()