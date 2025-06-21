#!/usr/bin/env python
"""
Minimal seed script for Estuary backend - Creates just essential data
Run with: python manage.py shell < seed_minimal.py
"""

import os
import django
from datetime import datetime, timedelta, time
from decimal import Decimal
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Import models
from django.contrib.auth import get_user_model
from django.db import transaction
from users.models import UserProfile
from practitioners.models import Practitioner, PractitionerLocation, PractitionerSchedule
from services.models import ServiceCategory, Service
from bookings.models import Booking
from payments.models import Payment, PractitionerEarning
from locations.models import Country, State, City, ZipCode
from utils.models import Language

User = get_user_model()

print("🌱 Starting minimal database seeding...")

try:
    with transaction.atomic():
        # Create basic location data
        usa = Country.objects.get_or_create(
            code='US',
            defaults={'name': 'United States', 'phone_code': '+1'}
        )[0]
        
        ca_state = State.objects.get_or_create(
            country=usa,
            code='CA',
            defaults={'name': 'California'}
        )[0]
        
        sf = City.objects.get_or_create(
            state=ca_state,
            name='San Francisco',
            defaults={'latitude': 37.7749, 'longitude': -122.4194}
        )[0]
        
        sf_zip = ZipCode.objects.get_or_create(
            code='94105',
            defaults={'city': sf, 'latitude': 37.7749, 'longitude': -122.4194}
        )[0]
        
        # Create language
        english = Language.objects.get_or_create(
            code='en',
            defaults={'name': 'English'}
        )[0]
        
        # Create service categories
        yoga_cat = ServiceCategory.objects.get_or_create(
            slug='yoga',
            defaults={
                'name': 'Yoga & Movement',
                'description': 'Yoga and movement practices'
            }
        )[0]
        
        # Create admin user
        admin = User.objects.filter(email='admin@estuary.com').first()
        if not admin:
            admin = User.objects.create_superuser(
                email='admin@estuary.com',
                password='admin123',
                first_name='Admin',
                last_name='User'
            )
            print("✅ Created admin user")
        
        # Create one client
        client = User.objects.filter(email='client@example.com').first()
        if not client:
            client = User.objects.create_user(
                email='client@example.com',
                password='password123',
                first_name='John',
                last_name='Doe'
            )
            UserProfile.objects.get_or_create(
                user=client,
                defaults={
                    'bio': 'Wellness enthusiast',
                    'timezone': 'America/Los_Angeles'
                }
            )
            print("✅ Created client user")
        
        # Create one practitioner
        prac_user = User.objects.filter(email='practitioner@example.com').first()
        if not prac_user:
            prac_user = User.objects.create_user(
                email='practitioner@example.com',
                password='password123',
                first_name='Jane',
                last_name='Smith'
            )
            prac_user.is_practitioner = True
            prac_user.save()
            
            UserProfile.objects.get_or_create(
                user=prac_user,
                defaults={
                    'bio': 'Experienced yoga instructor',
                    'timezone': 'America/Los_Angeles'
                }
            )
            
            practitioner = Practitioner.objects.create(
                user=prac_user,
                display_name='Jane Smith, RYT-200',
                bio='Certified yoga instructor specializing in Vinyasa flow.',
                hourly_rate=80,
                years_of_experience=5,
                verification_status='verified',
                commission_rate=5.0
            )
            
            # Add location
            PractitionerLocation.objects.create(
                practitioner=practitioner,
                name='Yoga Studio',
                address='123 Main St',
                city='San Francisco',
                state='CA',
                zip_code='94105',
                country='US',
                is_primary=True
            )
            
            # Add basic schedule (Mon-Fri 9-5)
            for day in range(1, 6):
                PractitionerSchedule.objects.create(
                    practitioner=practitioner,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(17, 0),
                    is_available=True
                )
            
            print("✅ Created practitioner")
        else:
            practitioner = Practitioner.objects.get(user=prac_user)
        
        # Create two services
        session = Service.objects.filter(
            practitioner=practitioner,
            service_type='session'
        ).first()
        
        if not session:
            session = Service.objects.create(
                practitioner=practitioner,
                title='Private Yoga Session',
                description='One-on-one yoga session tailored to your needs.',
                service_type='session',
                category=yoga_cat,
                price=80,
                duration=60,
                max_participants=1,
                is_active=True
            )
            print("✅ Created session service")
        
        workshop = Service.objects.filter(
            practitioner=practitioner,
            service_type='workshop'
        ).first()
        
        if not workshop:
            workshop = Service.objects.create(
                practitioner=practitioner,
                title='Beginner Yoga Workshop',
                description='Introduction to yoga fundamentals.',
                service_type='workshop',
                category=yoga_cat,
                price=45,
                duration=90,
                max_participants=15,
                is_active=True
            )
            print("✅ Created workshop service")
        
        # Create one completed booking
        past_booking = Booking.objects.filter(
            user=client,
            status='completed'
        ).first()
        
        if not past_booking:
            booking_date = timezone.now() - timedelta(days=7)
            past_booking = Booking.objects.create(
                user=client,
                service=session,
                practitioner=practitioner,
                booking_date=booking_date.date(),
                start_time=booking_date.replace(hour=10, minute=0, second=0, microsecond=0),
                end_time=booking_date.replace(hour=11, minute=0, second=0, microsecond=0),
                status='completed',
                total_amount=session.price,
                payment_status='paid'
            )
            
            # Create payment
            Payment.objects.create(
                user=client,
                booking=past_booking,
                amount=session.price,
                payment_method='card',
                status='completed',
                stripe_payment_intent_id=f'pi_test_{past_booking.id}'
            )
            
            # Create earning
            commission = session.price * Decimal('0.05')
            PractitionerEarning.objects.create(
                practitioner=practitioner,
                booking=past_booking,
                gross_amount=session.price,
                commission_amount=commission,
                net_amount=session.price - commission,
                status='available'
            )
            print("✅ Created completed booking with payment")
        
        # Create one future booking
        future_booking = Booking.objects.filter(
            user=client,
            status='confirmed',
            booking_date__gte=timezone.now().date()
        ).first()
        
        if not future_booking:
            booking_date = timezone.now() + timedelta(days=3)
            future_booking = Booking.objects.create(
                user=client,
                service=workshop,
                practitioner=practitioner,
                booking_date=booking_date.date(),
                start_time=booking_date.replace(hour=14, minute=0, second=0, microsecond=0),
                end_time=booking_date.replace(hour=15, minute=30, second=0, microsecond=0),
                status='confirmed',
                total_amount=workshop.price,
                payment_status='pending'
            )
            print("✅ Created future booking")
        
        print("\n🎉 Minimal seeding completed!")
        print("\n📊 Summary:")
        print(f"  - Users: {User.objects.count()}")
        print(f"  - Practitioners: {Practitioner.objects.count()}")
        print(f"  - Services: {Service.objects.count()}")
        print(f"  - Bookings: {Booking.objects.count()}")
        
        print("\n🔑 Test Credentials:")
        print("  Admin: admin@estuary.com / admin123")
        print("  Client: client@example.com / password123")
        print("  Practitioner: practitioner@example.com / password123")

except Exception as e:
    print(f"❌ Error during seeding: {str(e)}")
    import traceback
    traceback.print_exc()