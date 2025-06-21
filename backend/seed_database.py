#!/usr/bin/env python
"""
Working seed script for Estuary backend
Run with: python manage.py shell < seed_database.py
"""

import os
import sys
import django
from datetime import datetime, timedelta, time
from decimal import Decimal
import random
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Now import Django models
from django.contrib.auth import get_user_model
from django.db import transaction
from users.models import UserProfile
from practitioners.models import (
    Practitioner, PractitionerEducation, PractitionerCertification,
    PractitionerModality, PractitionerSpecialization, PractitionerLanguage,
    PractitionerInsurance, PractitionerSocialLink, PractitionerLocation,
    PractitionerSchedule, PractitionerScheduleException
)
from services.models import (
    ServiceCategory, Service, ServiceLocation, ServiceSchedule,
    ServiceModality, ServiceImage, Package, PackageService
)
from bookings.models import Booking, BookingParticipant
from payments.models import Payment, PractitionerEarning, Credit
from reviews.models import Review, ReviewQuestion, ReviewResponse
from locations.models import Country, State, City, ZipCode
from utils.models import Modality, Specialization, Insurance, Language

User = get_user_model()

print("🌱 Starting Estuary database seeding...")

try:
    with transaction.atomic():
        # Create Countries
        print("📍 Creating locations...")
        usa = Country.objects.get_or_create(
            code='US',
            defaults={'name': 'United States', 'phone_code': '+1'}
        )[0]
        
        canada = Country.objects.get_or_create(
            code='CA',
            defaults={'name': 'Canada', 'phone_code': '+1'}
        )[0]

        # Create States
        ca_state = State.objects.get_or_create(
            country=usa,
            code='CA',
            defaults={'name': 'California'}
        )[0]
        
        ny_state = State.objects.get_or_create(
            country=usa,
            code='NY',
            defaults={'name': 'New York'}
        )[0]

        # Create Cities
        sf = City.objects.get_or_create(
            state=ca_state,
            name='San Francisco',
            defaults={'latitude': 37.7749, 'longitude': -122.4194}
        )[0]
        
        la = City.objects.get_or_create(
            state=ca_state,
            name='Los Angeles',
            defaults={'latitude': 34.0522, 'longitude': -118.2437}
        )[0]
        
        nyc = City.objects.get_or_create(
            state=ny_state,
            name='New York City',
            defaults={'latitude': 40.7128, 'longitude': -74.0060}
        )[0]

        # Create Zip Codes
        sf_zip = ZipCode.objects.get_or_create(
            code='94105',
            defaults={'city': sf, 'latitude': 37.7749, 'longitude': -122.4194}
        )[0]

        # Create Languages
        print("🗣️ Creating languages...")
        english = Language.objects.get_or_create(code='en', defaults={'name': 'English'})[0]
        spanish = Language.objects.get_or_create(code='es', defaults={'name': 'Spanish'})[0]
        french = Language.objects.get_or_create(code='fr', defaults={'name': 'French'})[0]

        # Create Modalities
        print("🧘 Creating modalities...")
        modalities = []
        modality_names = [
            'Yoga', 'Meditation', 'Reiki', 'Massage Therapy', 'Acupuncture',
            'Nutrition Counseling', 'Life Coaching', 'Breathwork', 'Sound Healing',
            'Aromatherapy', 'Tai Chi', 'Qigong', 'Pilates', 'Mindfulness'
        ]
        for name in modality_names:
            mod = Modality.objects.get_or_create(
                name=name,
                defaults={'description': f'{name} practice for wellness and healing'}
            )[0]
            modalities.append(mod)

        # Create Specializations
        print("🎯 Creating specializations...")
        specializations = []
        spec_names = [
            'Stress Management', 'Pain Relief', 'Mental Health', 'Weight Management',
            'Athletic Performance', 'Prenatal Care', 'Senior Wellness', 'Chronic Illness',
            'Addiction Recovery', 'Trauma Healing', 'Sleep Improvement', 'Digestive Health'
        ]
        for name in spec_names:
            spec = Specialization.objects.get_or_create(
                name=name,
                defaults={'description': f'Specialized in {name}'}
            )[0]
            specializations.append(spec)

        # Create Insurance Types
        print("🏥 Creating insurance types...")
        insurance_types = []
        insurance_names = ['Blue Cross', 'Aetna', 'Cigna', 'United Healthcare', 'Kaiser']
        for name in insurance_names:
            ins = Insurance.objects.get_or_create(name=name)[0]
            insurance_types.append(ins)

        # Create Service Categories
        print("📚 Creating service categories...")
        categories = {}
        category_data = [
            ('yoga', 'Yoga & Movement', 'Yoga, Pilates, and movement practices'),
            ('meditation', 'Meditation & Mindfulness', 'Meditation and mindfulness practices'),
            ('healing', 'Energy Healing', 'Reiki, sound healing, and energy work'),
            ('therapy', 'Therapeutic Services', 'Massage, acupuncture, and bodywork'),
            ('coaching', 'Coaching & Counseling', 'Life coaching and wellness counseling'),
            ('workshops', 'Workshops & Retreats', 'Group workshops and retreat experiences')
        ]
        
        for slug, name, desc in category_data:
            cat = ServiceCategory.objects.get_or_create(
                slug=slug,
                defaults={'name': name, 'description': desc}
            )[0]
            categories[slug] = cat

        # Create Users
        print("👥 Creating users...")
        
        # Admin user
        admin = User.objects.filter(email='admin@estuary.com').first()
        if not admin:
            admin = User.objects.create_superuser(
                email='admin@estuary.com',
                password='admin123',
                first_name='Admin',
                last_name='User'
            )
            UserProfile.objects.get_or_create(
                user=admin,
                defaults={
                    'bio': 'Platform administrator',
                    'timezone': 'America/Los_Angeles'
                }
            )

        # Regular users (clients)
        clients = []
        client_data = [
            ('sarah.johnson@example.com', 'Sarah', 'Johnson', 'sf'),
            ('michael.chen@example.com', 'Michael', 'Chen', 'la'),
            ('emma.williams@example.com', 'Emma', 'Williams', 'nyc'),
            ('james.davis@example.com', 'James', 'Davis', 'sf'),
            ('olivia.martinez@example.com', 'Olivia', 'Martinez', 'la')
        ]
        
        for email, first, last, city_key in client_data:
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create_user(
                    email=email,
                    password='password123',
                    first_name=first,
                    last_name=last
                )
                profile = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'bio': f'{first} is passionate about wellness and personal growth.',
                        'timezone': 'America/Los_Angeles' if city_key != 'nyc' else 'America/New_York',
                        'phone_number': f'+1415555{random.randint(1000, 9999)}'
                    }
                )[0]
                
                # Add some credits for testing
                Credit.objects.create(
                    user=user,
                    amount=50.00,
                    source='promotion',
                    description='Welcome bonus',
                    expires_at=timezone.now() + timedelta(days=90)
                )
            
            clients.append(user)

        # Create Practitioners
        print("👩‍⚕️ Creating practitioners...")
        practitioners = []
        practitioner_data = [
            {
                'email': 'maya.patel@example.com',
                'first_name': 'Maya',
                'last_name': 'Patel',
                'display_name': 'Maya Patel, RYT-500',
                'bio': 'Certified yoga instructor with 10+ years experience in Vinyasa and Yin yoga. Specializing in stress relief and mindfulness.',
                'city': sf,
                'modalities': ['Yoga', 'Meditation', 'Breathwork'],
                'specializations': ['Stress Management', 'Mental Health'],
                'hourly_rate': 120
            },
            {
                'email': 'david.kim@example.com',
                'first_name': 'David',
                'last_name': 'Kim',
                'display_name': 'Dr. David Kim, LAc',
                'bio': 'Licensed acupuncturist and herbalist. Combining traditional Chinese medicine with modern wellness approaches.',
                'city': la,
                'modalities': ['Acupuncture', 'Reiki', 'Qigong'],
                'specializations': ['Pain Relief', 'Chronic Illness'],
                'hourly_rate': 150
            },
            {
                'email': 'sophia.rodriguez@example.com',
                'first_name': 'Sophia',
                'last_name': 'Rodriguez',
                'display_name': 'Sophia Rodriguez, CHC',
                'bio': 'Certified health coach helping clients achieve sustainable lifestyle changes through nutrition and mindfulness.',
                'city': nyc,
                'modalities': ['Nutrition Counseling', 'Life Coaching', 'Mindfulness'],
                'specializations': ['Weight Management', 'Digestive Health'],
                'hourly_rate': 100
            }
        ]
        
        for prac_data in practitioner_data:
            # Create user
            user = User.objects.filter(email=prac_data['email']).first()
            if not user:
                user = User.objects.create_user(
                    email=prac_data['email'],
                    password='password123',
                    first_name=prac_data['first_name'],
                    last_name=prac_data['last_name']
                )
                user.is_practitioner = True
                user.save()
                
                # Create profile
                UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'bio': prac_data['bio'],
                        'timezone': 'America/Los_Angeles',
                        'phone_number': f'+1415555{random.randint(1000, 9999)}'
                    }
                )
            
            # Create practitioner
            practitioner = Practitioner.objects.filter(user=user).first()
            if not practitioner:
                practitioner = Practitioner.objects.create(
                    user=user,
                    display_name=prac_data['display_name'],
                    bio=prac_data['bio'],
                    hourly_rate=prac_data['hourly_rate'],
                    years_of_experience=random.randint(5, 15),
                    accepts_insurance=random.choice([True, False]),
                    sliding_scale_available=True,
                    free_consultation_available=True,
                    verification_status='verified',
                    stripe_account_id=f'acct_test_{user.id}',
                    commission_rate=5.0
                )
                
                # Add location
                PractitionerLocation.objects.create(
                    practitioner=practitioner,
                    name='Primary Office',
                    address='123 Wellness St',
                    city=prac_data['city'].name,
                    state=prac_data['city'].state.code,
                    zip_code=sf_zip.code,
                    country=usa.code,
                    is_primary=True
                )
                
                # Add modalities
                for mod_name in prac_data['modalities']:
                    mod = next((m for m in modalities if m.name == mod_name), None)
                    if mod:
                        PractitionerModality.objects.create(
                            practitioner=practitioner,
                            modality=mod,
                            years_experience=random.randint(2, 10)
                        )
                
                # Add specializations
                for spec_name in prac_data['specializations']:
                    spec = next((s for s in specializations if s.name == spec_name), None)
                    if spec:
                        PractitionerSpecialization.objects.create(
                            practitioner=practitioner,
                            specialization=spec
                        )
                
                # Add languages
                PractitionerLanguage.objects.create(
                    practitioner=practitioner,
                    language=english,
                    proficiency='native'
                )
                
                # Add schedule (Mon-Fri, 9 AM - 5 PM)
                for day in range(1, 6):  # Monday to Friday
                    PractitionerSchedule.objects.create(
                        practitioner=practitioner,
                        day_of_week=day,
                        start_time=time(9, 0),
                        end_time=time(17, 0),
                        is_available=True
                    )
                
                # Add certifications
                PractitionerCertification.objects.create(
                    practitioner=practitioner,
                    name=f'{prac_data["modalities"][0]} Certification',
                    issuing_organization='International Wellness Association',
                    issue_date=timezone.now().date() - timedelta(days=365*2),
                    expiry_date=timezone.now().date() + timedelta(days=365),
                    is_verified=True
                )
            
            practitioners.append(practitioner)

        # Create Services
        print("🎯 Creating services...")
        services = []
        
        # Services for each practitioner
        for practitioner in practitioners:
            # Create 1-on-1 session
            session = Service.objects.create(
                practitioner=practitioner,
                title=f'Personal Wellness Session with {practitioner.display_name}',
                description=f'One-on-one {practitioner.practitionermodality_set.first().modality.name} session tailored to your needs.',
                service_type='session',
                category=categories['therapy'] if 'Acupuncture' in [m.modality.name for m in practitioner.practitionermodality_set.all()] else categories['yoga'],
                price=practitioner.hourly_rate,
                duration=60,
                max_participants=1,
                is_active=True,
                cancellation_policy='Free cancellation up to 24 hours before the session.'
            )
            
            # Add service location
            prac_location = practitioner.locations.first()
            if prac_location:
                ServiceLocation.objects.create(
                    service=session,
                    name=prac_location.name,
                    address=prac_location.address,
                    city=prac_location.city,
                    state=prac_location.state,
                    zip_code=prac_location.zip_code,
                    country=prac_location.country,
                    is_primary=True
                )
            
            # Add modalities to service
            for prac_mod in practitioner.practitionermodality_set.all()[:2]:
                ServiceModality.objects.create(
                    service=session,
                    modality=prac_mod.modality
                )
            
            services.append(session)
            
            # Create a workshop
            workshop = Service.objects.create(
                practitioner=practitioner,
                title=f'{practitioner.practitionermodality_set.first().modality.name} Workshop: Finding Inner Peace',
                description='Join us for a transformative workshop designed to help you find balance and inner peace.',
                service_type='workshop',
                category=categories['workshops'],
                price=75,
                duration=120,
                max_participants=20,
                is_active=True,
                cancellation_policy='Full refund if cancelled 48 hours before the workshop.'
            )
            
            # Schedule workshop for next Saturday
            next_saturday = timezone.now().date() + timedelta(days=(5 - timezone.now().weekday()) % 7 + 1)
            ServiceSchedule.objects.create(
                service=workshop,
                date=next_saturday,
                start_time=time(10, 0),
                end_time=time(12, 0),
                available_spots=20
            )
            
            services.append(workshop)
            
            # Create a package
            package = Package.objects.create(
                practitioner=practitioner,
                name='Wellness Journey Package',
                description='A comprehensive package including 4 sessions for complete transformation.',
                price=400,
                credits=4,
                validity_days=60,
                is_active=True
            )
            
            # Add service to package
            PackageService.objects.create(
                package=package,
                service=session,
                quantity=4
            )

        # Create Bookings
        print("📅 Creating bookings...")
        
        # Past bookings (completed)
        for i in range(10):
            client = random.choice(clients)
            service = random.choice([s for s in services if s.service_type == 'session'])
            booking_date = timezone.now() - timedelta(days=random.randint(1, 30))
            
            booking = Booking.objects.create(
                user=client,
                service=service,
                practitioner=service.practitioner,
                booking_date=booking_date.date(),
                start_time=booking_date.replace(hour=14, minute=0, second=0, microsecond=0),
                end_time=booking_date.replace(hour=15, minute=0, second=0, microsecond=0),
                status='completed',
                total_amount=service.price,
                payment_status='paid',
                notes='Great session, looking forward to the next one!'
            )
            
            # Create payment
            payment = Payment.objects.create(
                user=client,
                booking=booking,
                amount=service.price,
                payment_method='card',
                status='completed',
                stripe_payment_intent_id=f'pi_test_{booking.id}'
            )
            
            # Create practitioner earning
            commission = service.price * Decimal('0.05')  # 5% commission
            PractitionerEarning.objects.create(
                practitioner=service.practitioner,
                booking=booking,
                gross_amount=service.price,
                commission_amount=commission,
                net_amount=service.price - commission,
                status='available'
            )
            
            # Add review for some completed bookings
            if random.random() > 0.5:
                Review.objects.create(
                    booking=booking,
                    reviewer=client,
                    practitioner=service.practitioner,
                    service=service,
                    rating=random.randint(4, 5),
                    title='Excellent experience!',
                    comment=f'{service.practitioner.user.first_name} is amazing! Very professional and caring.',
                    is_verified=True
                )

        # Future bookings
        for i in range(5):
            client = random.choice(clients)
            service = random.choice(services)
            booking_date = timezone.now() + timedelta(days=random.randint(1, 14))
            
            Booking.objects.create(
                user=client,
                service=service,
                practitioner=service.practitioner,
                booking_date=booking_date.date(),
                start_time=booking_date.replace(hour=10, minute=0, second=0, microsecond=0),
                end_time=booking_date.replace(hour=11, minute=0, second=0, microsecond=0),
                status='confirmed',
                total_amount=service.price,
                payment_status='pending'
            )

        print("✅ Database seeding completed successfully!")
        print("\n📊 Summary:")
        print(f"  - Users: {User.objects.count()}")
        print(f"  - Practitioners: {Practitioner.objects.count()}")
        print(f"  - Services: {Service.objects.count()}")
        print(f"  - Bookings: {Booking.objects.count()}")
        print(f"  - Reviews: {Review.objects.count()}")
        
        print("\n🔑 Test Credentials:")
        print("  Admin: admin@estuary.com / admin123")
        print("  Client: sarah.johnson@example.com / password123")
        print("  Practitioner: maya.patel@example.com / password123")

except Exception as e:
    print(f"❌ Error during seeding: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)