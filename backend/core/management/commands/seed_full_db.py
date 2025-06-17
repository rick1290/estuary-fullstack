"""
Full database seeding command for Estuary
Works with the actual model structure
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta, time
from decimal import Decimal
import random
import json

# Import all the models we need
from users.models import User
from practitioners.models import (
    Practitioner, Schedule, Certification, Education,
    ScheduleAvailability, Topic, Style, Specialize
)
from services.models import Service, ServiceCategory
from locations.models import Country, State, City, ZipCode, PractitionerLocation
from bookings.models import Booking
from payments.models import Payment, PractitionerEarning, CreditBalance, PaymentMethod
from reviews.models import Review
from utils.models import Language, Modality

class Command(BaseCommand):
    help = 'Seeds the database with comprehensive test data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=20,
            help='Number of regular users to create'
        )
        parser.add_argument(
            '--practitioners',
            type=int,
            default=10,
            help='Number of practitioners to create'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data first'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🌱 Starting database seeding...'))
        
        try:
            with transaction.atomic():
                # Create base data
                self.create_base_data()
                
                # Create users
                self.create_users(options['users'], options['practitioners'])
                
                # Create services
                self.create_services()
                
                # Create bookings
                self.create_bookings()
                
                self.stdout.write(self.style.SUCCESS('✅ Database seeded successfully!'))
                self.show_summary()
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
            raise

    def create_base_data(self):
        """Create base data like countries, languages, etc."""
        self.stdout.write('📍 Creating base data...')
        
        # Countries
        self.usa = Country.objects.get_or_create(
            code='US',
            defaults={'name': 'United States', 'phone_code': '+1'}
        )[0]
        
        # States
        self.ca_state = State.objects.get_or_create(
            country=self.usa,
            code='CA',
            defaults={'name': 'California'}
        )[0]
        
        self.ny_state = State.objects.get_or_create(
            country=self.usa,
            code='NY', 
            defaults={'name': 'New York'}
        )[0]
        
        # Cities
        self.sf = City.objects.get_or_create(
            state=self.ca_state,
            name='San Francisco',
            defaults={'latitude': 37.7749, 'longitude': -122.4194}
        )[0]
        
        self.la = City.objects.get_or_create(
            state=self.ca_state,
            name='Los Angeles',
            defaults={'latitude': 34.0522, 'longitude': -118.2437}
        )[0]
        
        self.nyc = City.objects.get_or_create(
            state=self.ny_state,
            name='New York City',
            defaults={'latitude': 40.7128, 'longitude': -74.0060}
        )[0]
        
        # Languages
        self.english = Language.objects.get_or_create(
            code='en',
            defaults={'name': 'English'}
        )[0]
        
        self.spanish = Language.objects.get_or_create(
            code='es',
            defaults={'name': 'Spanish'}
        )[0]
        
        # Modalities
        modality_names = [
            'Yoga', 'Meditation', 'Reiki', 'Massage Therapy',
            'Acupuncture', 'Nutrition', 'Life Coaching', 'Breathwork'
        ]
        self.modalities = []
        for name in modality_names:
            mod, _ = Modality.objects.get_or_create(
                name=name,
                defaults={'description': f'{name} therapy and practice'}
            )
            self.modalities.append(mod)
        
        # Service Categories
        categories = [
            ('wellness', 'Wellness & Health'),
            ('therapy', 'Therapy & Healing'),
            ('fitness', 'Fitness & Movement'),
            ('mindfulness', 'Mindfulness & Meditation'),
            ('coaching', 'Coaching & Development')
        ]
        self.categories = {}
        for slug, name in categories:
            cat, _ = ServiceCategory.objects.get_or_create(
                slug=slug,
                defaults={'name': name}
            )
            self.categories[slug] = cat

    def create_users(self, num_users, num_practitioners):
        """Create regular users and practitioners"""
        self.stdout.write(f'👥 Creating {num_users} users and {num_practitioners} practitioners...')
        
        # Create admin
        admin, created = User.objects.get_or_create(
            email='admin@estuary.com',
            defaults={
                'first_name': 'Admin',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True,
                'is_active': True
            }
        )
        if created:
            admin.set_password('adminpass123')
            admin.save()
            self.stdout.write(self.style.SUCCESS('  ✓ Created admin user'))
        
        # Create regular users
        self.users = []
        for i in range(1, num_users + 1):
            user, created = User.objects.get_or_create(
                email=f'user{i}@example.com',
                defaults={
                    'first_name': f'User{i}',
                    'last_name': f'Test',
                    'is_active': True
                }
            )
            if created:
                user.set_password('testpass123')
                user.save()
                
                # Add credit balance
                CreditBalance.objects.create(
                    user=user,
                    total_credits=random.randint(50, 200) * 100,  # cents
                    available_credits=random.randint(50, 200) * 100
                )
                
                # Add payment method
                PaymentMethod.objects.create(
                    user=user,
                    stripe_payment_method_id=f'pm_test_{user.id}',
                    payment_type='card',
                    last4='4242',
                    brand='visa',
                    is_default=True
                )
                
            self.users.append(user)
        
        self.stdout.write(f'  ✓ Created {len(self.users)} users')
        
        # Create practitioners
        self.practitioners = []
        practitioner_data = [
            ('Yoga Instructor', ['Yoga', 'Meditation']),
            ('Massage Therapist', ['Massage Therapy', 'Reiki']),
            ('Life Coach', ['Life Coaching', 'Breathwork']),
            ('Acupuncturist', ['Acupuncture']),
            ('Nutritionist', ['Nutrition']),
        ]
        
        for i in range(1, num_practitioners + 1):
            user, created = User.objects.get_or_create(
                email=f'practitioner{i}@example.com',
                defaults={
                    'first_name': f'Practitioner{i}',
                    'last_name': 'Professional',
                    'is_active': True,
                    'is_practitioner': True
                }
            )
            if created:
                user.set_password('testpass123')
                user.save()
            
            # Get practitioner data
            title, modalities = practitioner_data[(i-1) % len(practitioner_data)]
            
            # Create practitioner profile
            practitioner, created = Practitioner.objects.get_or_create(
                user=user,
                defaults={
                    'display_name': f'{user.first_name} {user.last_name}, {title}',
                    'professional_title': title,
                    'bio': f'Experienced {title} with {random.randint(3, 15)} years of practice.',
                    'years_of_experience': random.randint(3, 15),
                    'is_verified': True,
                    'practitioner_status': 'active',
                    'is_onboarded': True
                }
            )
            
            if created:
                # Add location
                PractitionerLocation.objects.create(
                    practitioner=practitioner,
                    name=f'{user.first_name}\'s Practice',
                    address_line_1='123 Wellness St',
                    city=random.choice([self.sf, self.la, self.nyc]),
                    state=random.choice([self.ca_state, self.ny_state]),
                    country=self.usa,
                    postal_code='12345',
                    is_primary=True
                )
                
                # Add schedule
                schedule = Schedule.objects.create(
                    practitioner=practitioner,
                    name='Regular Hours'
                )
                
                # Add availability (Mon-Fri 9-5)
                for day in range(1, 6):  # Monday to Friday
                    ScheduleAvailability.objects.create(
                        schedule=schedule,
                        day_of_week=day,
                        start_time=time(9, 0),
                        end_time=time(17, 0)
                    )
                
                # Add certifications
                Certification.objects.create(
                    practitioner=practitioner,
                    name=f'Certified {title}',
                    issuing_organization='International Wellness Association',
                    issue_date=timezone.now().date() - timedelta(days=365*2),
                    credential_id=f'CERT-{practitioner.id}-001'
                )
            
            self.practitioners.append(practitioner)
        
        self.stdout.write(f'  ✓ Created {len(self.practitioners)} practitioners')

    def create_services(self):
        """Create services for practitioners"""
        self.stdout.write('🎯 Creating services...')
        
        self.services = []
        service_types = [
            (1, 'Virtual Session', 60, 'virtual'),
            (2, 'Virtual Workshop', 90, 'virtual'),
            (3, 'Online Course', 120, 'virtual'),
            (6, 'In-Person Session', 60, 'in_person'),
            (7, 'In-Person Workshop', 120, 'in_person'),
        ]
        
        for practitioner in self.practitioners:
            # Create 2-3 services per practitioner
            num_services = random.randint(2, 3)
            for i in range(num_services):
                service_type = random.choice(service_types)
                
                service, created = Service.objects.get_or_create(
                    name=f'{practitioner.professional_title} - {service_type[1]}',
                    primary_practitioner=practitioner,
                    defaults={
                        'service_type': service_type[0],
                        'price_cents': random.randint(50, 200) * 100,  # $50-$200
                        'duration_minutes': service_type[2],
                        'max_participants': 1 if 'Session' in service_type[1] else random.randint(5, 20),
                        'location_type': service_type[3],
                        'is_active': True,
                        'status': 'published',
                        'short_description': f'Experience transformative {service_type[1].lower()} with {practitioner.display_name}'
                    }
                )
                
                if created:
                    self.services.append(service)
        
        self.stdout.write(f'  ✓ Created {len(self.services)} services')

    def create_bookings(self):
        """Create bookings with payments"""
        self.stdout.write('📅 Creating bookings...')
        
        num_bookings = 0
        
        # Create past bookings (completed)
        for _ in range(30):
            user = random.choice(self.users)
            service = random.choice(self.services)
            booking_date = timezone.now() - timedelta(days=random.randint(1, 60))
            
            booking = Booking.objects.create(
                customer=user,
                service=service,
                practitioner=service.primary_practitioner,
                booking_date=booking_date.date(),
                booking_time=booking_date.time(),
                status='completed' if booking_date < timezone.now() - timedelta(days=1) else 'confirmed',
                total_amount_cents=service.price_cents,
                platform_fee_cents=int(service.price_cents * Decimal('0.05')),
                practitioner_earnings_cents=int(service.price_cents * Decimal('0.95')),
                notes='Great session!'
            )
            
            # Create payment for completed bookings
            if booking.status == 'completed':
                payment = Payment.objects.create(
                    user=user,
                    booking=booking,
                    amount_cents=service.price_cents,
                    payment_method='stripe',
                    stripe_payment_intent_id=f'pi_test_{booking.id}',
                    status='succeeded'
                )
                
                # Create earning record
                PractitionerEarning.objects.create(
                    practitioner=service.primary_practitioner,
                    booking=booking,
                    amount_cents=booking.practitioner_earnings_cents,
                    status='pending'
                )
                
                # Maybe add a review
                if random.random() > 0.5:
                    Review.objects.create(
                        reviewer=user,
                        practitioner=service.primary_practitioner,
                        booking=booking,
                        service=service,
                        rating=random.randint(4, 5),
                        comment=random.choice([
                            'Excellent experience!',
                            'Very professional and helpful.',
                            'Highly recommended!',
                            'Great session, will book again.'
                        ])
                    )
            
            num_bookings += 1
        
        # Create future bookings
        for _ in range(20):
            user = random.choice(self.users)
            service = random.choice(self.services)
            booking_date = timezone.now() + timedelta(days=random.randint(1, 30))
            
            Booking.objects.create(
                customer=user,
                service=service,
                practitioner=service.primary_practitioner,
                booking_date=booking_date.date(),
                booking_time=booking_date.time(),
                status='pending',
                total_amount_cents=service.price_cents,
                platform_fee_cents=int(service.price_cents * Decimal('0.05')),
                practitioner_earnings_cents=int(service.price_cents * Decimal('0.95'))
            )
            
            num_bookings += 1
        
        self.stdout.write(f'  ✓ Created {num_bookings} bookings')

    def show_summary(self):
        """Show summary of created data"""
        self.stdout.write('\n📊 Summary:')
        self.stdout.write(f'  - Users: {User.objects.count()}')
        self.stdout.write(f'  - Practitioners: {Practitioner.objects.count()}')
        self.stdout.write(f'  - Services: {Service.objects.count()}')
        self.stdout.write(f'  - Bookings: {Booking.objects.count()}')
        self.stdout.write(f'  - Reviews: {Review.objects.count()}')
        
        self.stdout.write('\n🔑 Test Credentials:')
        self.stdout.write('  Admin: admin@estuary.com / adminpass123')
        self.stdout.write('  Users: user1@example.com / testpass123')
        self.stdout.write('  Practitioners: practitioner1@example.com / testpass123')
        self.stdout.write(self.style.WARNING('\n  All test users have password: testpass123'))