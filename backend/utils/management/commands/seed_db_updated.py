"""
Updated seed_db command that works with current model structure
Based on original seed_db.py but fixed for current models
"""
import os
import sys
import random
import pytz
from datetime import datetime, timedelta, time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.contrib.sites.models import Site

# Import django-seed and apply monkey patch
from django_seed import Seed
from utils.management.commands.seed_patch import monkey_patch_seeder
monkey_patch_seeder()

# Import all current models
from users.models import User
from practitioners.models import (
    Practitioner, Schedule, ScheduleAvailability, SchedulePreference,
    Certification, Education, OutOfOffice, Question, Topic, Style, Specialize
)
from services.models import (
    Service, ServiceCategory, ServiceLocation, ServiceResource,
    ServicePractitioner, Package, Bundle, ServiceBundle, ServicePackage,
    ServiceSchedule, ServiceImage, ServiceReview
)
from bookings.models import Booking, BookingParticipant, BookingTransaction
from payments.models import (
    Payment, PaymentMethod, PractitionerEarning, 
    UserCreditTransaction, EarningsTransaction, PractitionerPayout,
    CreditBalance, CreditPurchase, SubscriptionTier, CommissionRate
)
from reviews.models import Review, ReviewQuestion, ReviewResponse
from locations.models import Country, State, City, ZipCode, PractitionerLocation
from utils.models import Modality, Language
from messaging.models import Conversation, Message
from notifications.models import Notification, NotificationSetting

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds the database with test data (updated for current models)'

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
            '--services',
            type=int,
            default=50,
            help='Number of services to create'
        )
        parser.add_argument(
            '--bookings',
            type=int,
            default=100,
            help='Number of bookings to create'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('🌱 Starting database seeding...'))
        
        # Store options
        self.num_users = options['users']
        self.num_practitioners = options['practitioners']
        self.num_services = options['services']
        self.num_bookings = options['bookings']
        
        # Initialize seeder
        self.seeder = Seed.seeder()
        
        try:
            with transaction.atomic():
                # 1. Create base data
                self.create_base_data()
                
                # 2. Create users and practitioners
                self.create_users()
                self.create_practitioners()
                
                # 3. Create services
                self.create_services()
                
                # 4. Create bookings and payments
                self.create_bookings()
                
                # 5. Create reviews and messages
                self.create_reviews()
                self.create_messages()
                
                self.stdout.write(self.style.SUCCESS('✅ Database seeded successfully!'))
                self.print_summary()
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
            import traceback
            traceback.print_exc()
            raise

    def create_base_data(self):
        """Create foundational data like countries, languages, modalities, etc."""
        self.stdout.write('📍 Creating base data...')
        
        # Setup site
        site, _ = Site.objects.get_or_create(
            domain='localhost:8000',
            defaults={'name': 'Estuary Local'}
        )
        
        # Countries
        self.usa = Country.objects.get_or_create(
            code='US',
            defaults={
                'name': 'United States',
                'phone_code': '+1',
                'currency_code': 'USD'
            }
        )[0]
        
        self.canada = Country.objects.get_or_create(
            code='CA',
            defaults={
                'name': 'Canada',
                'phone_code': '+1',
                'currency_code': 'CAD'
            }
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
        self.cities = []
        city_data = [
            (self.ca_state, 'San Francisco', 37.7749, -122.4194),
            (self.ca_state, 'Los Angeles', 34.0522, -118.2437),
            (self.ny_state, 'New York City', 40.7128, -74.0060),
        ]
        
        for state, name, lat, lng in city_data:
            city = City.objects.get_or_create(
                state=state,
                name=name,
                defaults={'latitude': lat, 'longitude': lng}
            )[0]
            self.cities.append(city)
            
            # Create zip codes
            ZipCode.objects.get_or_create(
                code=f'{random.randint(10000, 99999)}',
                defaults={
                    'city': city,
                    'latitude': lat,
                    'longitude': lng
                }
            )
        
        # Languages
        self.languages = []
        for code, name in [('en', 'English'), ('es', 'Spanish'), ('fr', 'French')]:
            lang = Language.objects.get_or_create(
                code=code,
                defaults={'name': name}
            )[0]
            self.languages.append(lang)
        
        # Modalities
        self.modalities = []
        modality_names = [
            'Yoga', 'Meditation', 'Reiki', 'Massage Therapy', 'Acupuncture',
            'Nutrition Counseling', 'Life Coaching', 'Breathwork', 'Sound Healing',
            'Aromatherapy', 'Tai Chi', 'Qigong', 'Hypnotherapy', 'Art Therapy'
        ]
        
        for name in modality_names:
            mod = Modality.objects.get_or_create(
                name=name,
                defaults={'description': f'{name} practice and techniques'}
            )[0]
            self.modalities.append(mod)
        
        # Service Categories
        self.categories = []
        category_data = [
            ('yoga-movement', 'Yoga & Movement', 'Physical practices for body and mind'),
            ('meditation-mindfulness', 'Meditation & Mindfulness', 'Mental clarity and peace'),
            ('healing-energy', 'Healing & Energy Work', 'Energy healing and balance'),
            ('therapy-bodywork', 'Therapy & Bodywork', 'Physical therapy and massage'),
            ('coaching-counseling', 'Coaching & Counseling', 'Life guidance and support'),
            ('nutrition-wellness', 'Nutrition & Wellness', 'Dietary and lifestyle guidance')
        ]
        
        for slug, name, desc in category_data:
            cat = ServiceCategory.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'description': desc,
                    'is_active': True
                }
            )[0]
            self.categories.append(cat)
        
        # Subscription Tiers
        tier_data = [
            ('free', 'Free', 0, 0),
            ('basic', 'Basic', 999, 10),  # $9.99, 10% discount
            ('pro', 'Professional', 2999, 20),  # $29.99, 20% discount
            ('premium', 'Premium', 4999, 30),  # $49.99, 30% discount
        ]
        
        self.subscription_tiers = []
        for slug, name, price_cents, discount in tier_data:
            tier = SubscriptionTier.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': name,
                    'price_cents': price_cents,
                    'commission_discount_percent': discount,
                    'features': {
                        'max_services': 10 if slug == 'free' else None,
                        'priority_support': slug in ['pro', 'premium'],
                        'analytics': slug != 'free'
                    }
                }
            )[0]
            self.subscription_tiers.append(tier)
        
        # Commission Rates
        self.commission_rates = []
        rate_data = [
            (0, 999999, 20),  # 0-$9,999.99: 20%
            (1000000, 4999999, 15),  # $10,000-$49,999.99: 15%
            (5000000, None, 10),  # $50,000+: 10%
        ]
        
        for min_cents, max_cents, rate in rate_data:
            comm_rate = CommissionRate.objects.get_or_create(
                min_amount_cents=min_cents,
                max_amount_cents=max_cents,
                defaults={'rate_percent': rate}
            )[0]
            self.commission_rates.append(comm_rate)
        
        self.stdout.write(self.style.SUCCESS('  ✓ Base data created'))

    def create_users(self):
        """Create regular users"""
        self.stdout.write(f'👥 Creating {self.num_users} users...')
        
        # Create superuser
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
            admin.set_password('admin123')
            admin.save()
        
        # Create regular users
        self.users = []
        for i in range(1, self.num_users + 1):
            user = User.objects.create(
                email=f'user{i}@example.com',
                first_name=f'User{i}',
                last_name='Test',
                is_active=True
            )
            user.set_password('testpass123')
            user.save()
            
            # Add credit balance
            CreditBalance.objects.create(
                user=user,
                total_credits=random.randint(5000, 20000),  # $50-$200 in cents
                available_credits=random.randint(2000, 10000)
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
            
            # Add notification settings
            NotificationSetting.objects.create(
                user=user,
                email_enabled=True,
                push_enabled=random.choice([True, False]),
                sms_enabled=random.choice([True, False])
            )
            
            self.users.append(user)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(self.users)} users'))

    def create_practitioners(self):
        """Create practitioners with full profiles"""
        self.stdout.write(f'👩‍⚕️ Creating {self.num_practitioners} practitioners...')
        
        practitioner_types = [
            ('Yoga Instructor', ['Yoga', 'Meditation', 'Breathwork']),
            ('Massage Therapist', ['Massage Therapy', 'Reiki', 'Aromatherapy']),
            ('Life Coach', ['Life Coaching', 'Meditation']),
            ('Acupuncturist', ['Acupuncture', 'Tai Chi', 'Qigong']),
            ('Nutritionist', ['Nutrition Counseling', 'Life Coaching']),
            ('Hypnotherapist', ['Hypnotherapy', 'Meditation']),
            ('Energy Healer', ['Reiki', 'Sound Healing', 'Meditation']),
        ]
        
        self.practitioners = []
        for i in range(1, self.num_practitioners + 1):
            # Create user
            user = User.objects.create(
                email=f'practitioner{i}@example.com',
                first_name=f'Practitioner{i}',
                last_name='Professional',
                is_active=True,
                is_practitioner=True
            )
            user.set_password('testpass123')
            user.save()
            
            # Get practitioner type
            prac_type, modalities = random.choice(practitioner_types)
            
            # Create practitioner profile
            practitioner = Practitioner.objects.create(
                user=user,
                display_name=f'{user.first_name} {user.last_name}',
                professional_title=prac_type,
                bio=f'Experienced {prac_type} with over {random.randint(3, 15)} years of practice. '
                    f'Specializing in holistic wellness and personal transformation.',
                quote=f'"{random.choice(["Healing begins within", "Transform your life", "Find your balance"])}"',
                years_of_experience=random.randint(3, 15),
                is_verified=True,
                practitioner_status='active',
                featured=random.choice([True, False]),
                is_onboarded=True,
                onboarding_completed_at=timezone.now() - timedelta(days=random.randint(30, 365))
            )
            
            # Add location
            location = PractitionerLocation.objects.create(
                practitioner=practitioner,
                name=f'{user.first_name}\'s Wellness Center',
                address_line_1=f'{random.randint(100, 999)} Wellness St',
                city=random.choice(self.cities),
                state=random.choice([self.ca_state, self.ny_state]),
                country=self.usa,
                postal_code=f'{random.randint(10000, 99999)}',
                is_primary=True
            )
            practitioner.primary_location = location
            practitioner.save()
            
            # Add schedule
            schedule = Schedule.objects.create(
                practitioner=practitioner,
                name='Regular Schedule',
                is_active=True
            )
            
            # Add availability (weekdays)
            for day in range(1, 6):  # Mon-Fri
                ScheduleAvailability.objects.create(
                    schedule=schedule,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(17, 0)
                )
            
            # Add certifications
            for j in range(random.randint(1, 3)):
                Certification.objects.create(
                    practitioner=practitioner,
                    name=f'{prac_type} Certification',
                    issuing_organization=f'International {modalities[0]} Association',
                    issue_date=timezone.now().date() - timedelta(days=random.randint(365, 3650)),
                    credential_id=f'CERT-{practitioner.id}-{j}'
                )
            
            # Add education
            Education.objects.create(
                practitioner=practitioner,
                institution='Wellness University',
                degree=f'Bachelor of {random.choice(["Science", "Arts"])} in {prac_type}',
                graduation_year=timezone.now().year - random.randint(5, 20)
            )
            
            # Add topics, styles, specializations
            for topic_name in ['Wellness', 'Health', 'Balance', 'Transformation']:
                topic, _ = Topic.objects.get_or_create(name=topic_name)
                practitioner.topics.add(topic)
            
            for style_name in ['Gentle', 'Traditional', 'Modern', 'Holistic']:
                style, _ = Style.objects.get_or_create(name=style_name)
                practitioner.styles.add(style)
            
            # Add modalities through Specialize
            for mod_name in modalities:
                modality = next((m for m in self.modalities if m.name == mod_name), None)
                if modality:
                    Specialize.objects.create(
                        practitioner=practitioner,
                        modality=modality,
                        years_experience=random.randint(1, 10)
                    )
            
            self.practitioners.append(practitioner)
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(self.practitioners)} practitioners'))

    def create_services(self):
        """Create services for practitioners"""
        self.stdout.write(f'🎯 Creating {self.num_services} services...')
        
        service_templates = [
            ('Individual Session', 60, 1, 'session'),
            ('Group Class', 90, 10, 'class'),
            ('Workshop', 120, 20, 'workshop'),
            ('Retreat', 480, 15, 'retreat'),
            ('Online Course', 0, 100, 'course'),
        ]
        
        self.services = []
        services_per_practitioner = self.num_services // len(self.practitioners)
        
        for practitioner in self.practitioners:
            for i in range(services_per_practitioner):
                template = random.choice(service_templates)
                name_template, duration, max_participants, service_type = template
                
                # Get practitioner's primary modality
                specializations = practitioner.specializations.all()
                if specializations:
                    primary_modality = specializations.first().modality.name
                else:
                    primary_modality = 'Wellness'
                
                service = Service.objects.create(
                    name=f'{primary_modality} {name_template}',
                    short_description=f'{name_template} with {practitioner.display_name}',
                    description=f'Experience transformative {primary_modality.lower()} in this {name_template.lower()}. '
                               f'{practitioner.bio}',
                    price_cents=random.randint(5000, 30000),  # $50-$300
                    duration_minutes=duration,
                    category=random.choice(self.categories),
                    service_type=random.randint(1, 7),  # Based on your service type choices
                    max_participants=max_participants,
                    min_participants=1,
                    experience_level='all_levels',
                    location_type=random.choice(['virtual', 'in_person', 'hybrid']),
                    is_active=True,
                    is_featured=random.choice([True, False]),
                    status='published',
                    primary_practitioner=practitioner
                )
                
                # Link practitioner through ServicePractitioner
                ServicePractitioner.objects.create(
                    service=service,
                    practitioner=practitioner,
                    role='primary',
                    revenue_share_percent=80
                )
                
                # Add service location
                if service.location_type in ['in_person', 'hybrid']:
                    ServiceLocation.objects.create(
                        service=service,
                        name=practitioner.primary_location.name,
                        address_line_1=practitioner.primary_location.address_line_1,
                        city=practitioner.primary_location.city,
                        state=practitioner.primary_location.state,
                        country=practitioner.primary_location.country,
                        postal_code=practitioner.primary_location.postal_code,
                        is_primary=True
                    )
                
                # Add schedules for workshops/classes
                if service_type in ['class', 'workshop']:
                    for j in range(random.randint(1, 5)):
                        future_date = timezone.now().date() + timedelta(days=random.randint(1, 60))
                        ServiceSchedule.objects.create(
                            service=service,
                            start_date=future_date,
                            start_time=time(random.randint(9, 16), 0),
                            end_date=future_date,
                            end_time=time(random.randint(10, 18), 0),
                            max_participants=service.max_participants,
                            is_active=True
                        )
                
                self.services.append(service)
        
        # Create some packages and bundles
        for practitioner in random.sample(self.practitioners, min(5, len(self.practitioners))):
            # Create package
            package = Package.objects.create(
                practitioner=practitioner,
                name=f'{practitioner.display_name}\'s Wellness Package',
                description='A comprehensive wellness journey',
                price_cents=random.randint(20000, 50000),  # $200-$500
                number_of_sessions=random.randint(4, 10),
                validity_days=random.randint(30, 90),
                is_active=True
            )
            
            # Add services to package
            prac_services = [s for s in self.services if s.primary_practitioner == practitioner]
            for service in random.sample(prac_services, min(3, len(prac_services))):
                ServicePackage.objects.create(
                    package=package,
                    service=service
                )
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(self.services)} services'))

    def create_bookings(self):
        """Create bookings with payments"""
        self.stdout.write(f'📅 Creating {self.num_bookings} bookings...')
        
        booking_count = 0
        
        # Create past bookings (70% of total)
        past_bookings = int(self.num_bookings * 0.7)
        for _ in range(past_bookings):
            user = random.choice(self.users)
            service = random.choice(self.services)
            days_ago = random.randint(1, 90)
            booking_date = timezone.now() - timedelta(days=days_ago)
            
            booking = Booking.objects.create(
                customer=user,
                service=service,
                practitioner=service.primary_practitioner,
                booking_date=booking_date.date(),
                booking_time=time(random.randint(9, 16), 0),
                duration_minutes=service.duration_minutes,
                status=random.choice(['completed', 'completed', 'completed', 'cancelled', 'no_show']),
                total_amount_cents=service.price_cents,
                platform_fee_cents=int(service.price_cents * Decimal('0.15')),  # 15% platform fee
                practitioner_earnings_cents=int(service.price_cents * Decimal('0.85')),
                payment_status='paid' if booking_date < timezone.now() else 'pending',
                confirmation_code=f'BOOK{booking_date.strftime("%Y%m%d")}{random.randint(1000, 9999)}'
            )
            
            # Create payment for completed bookings
            if booking.status == 'completed':
                payment = Payment.objects.create(
                    user=user,
                    booking=booking,
                    amount_cents=service.price_cents,
                    payment_method='stripe',
                    stripe_payment_intent_id=f'pi_test_{booking.id}',
                    status='succeeded',
                    description=f'Payment for {service.name}'
                )
                
                # Create earning record
                earning = PractitionerEarning.objects.create(
                    practitioner=service.primary_practitioner,
                    booking=booking,
                    amount_cents=booking.practitioner_earnings_cents,
                    platform_fee_cents=booking.platform_fee_cents,
                    status='available' if days_ago > 7 else 'pending',
                    available_date=booking_date.date() + timedelta(days=7)
                )
                
                # Maybe create a payout for old earnings
                if days_ago > 30 and random.random() > 0.7:
                    PractitionerPayout.objects.create(
                        practitioner=service.primary_practitioner,
                        amount_cents=earning.amount_cents,
                        status='completed',
                        stripe_transfer_id=f'tr_test_{earning.id}',
                        completed_at=booking_date + timedelta(days=14)
                    )
            
            booking_count += 1
        
        # Create future bookings (30% of total)
        future_bookings = self.num_bookings - past_bookings
        for _ in range(future_bookings):
            user = random.choice(self.users)
            service = random.choice(self.services)
            days_ahead = random.randint(1, 60)
            booking_date = timezone.now() + timedelta(days=days_ahead)
            
            Booking.objects.create(
                customer=user,
                service=service,
                practitioner=service.primary_practitioner,
                booking_date=booking_date.date(),
                booking_time=time(random.randint(9, 16), 0),
                duration_minutes=service.duration_minutes,
                status='pending',
                total_amount_cents=service.price_cents,
                platform_fee_cents=int(service.price_cents * Decimal('0.15')),
                practitioner_earnings_cents=int(service.price_cents * Decimal('0.85')),
                payment_status='pending',
                confirmation_code=f'BOOK{booking_date.strftime("%Y%m%d")}{random.randint(1000, 9999)}'
            )
            
            booking_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {booking_count} bookings'))

    def create_reviews(self):
        """Create reviews for completed bookings"""
        self.stdout.write('⭐ Creating reviews...')
        
        review_count = 0
        completed_bookings = Booking.objects.filter(status='completed')
        
        # Review 60% of completed bookings
        for booking in random.sample(list(completed_bookings), int(len(completed_bookings) * 0.6)):
            rating = random.choices([3, 4, 5], weights=[5, 30, 65])[0]  # Most reviews are positive
            
            comments = {
                5: [
                    "Amazing experience! Highly recommend.",
                    "Exactly what I needed. Will book again!",
                    "Professional and transformative session.",
                    "Best practitioner I've worked with!"
                ],
                4: [
                    "Great session, very helpful.",
                    "Good experience overall.",
                    "Professional and knowledgeable.",
                    "Would recommend to others."
                ],
                3: [
                    "It was okay, nothing special.",
                    "Average experience.",
                    "Met expectations.",
                    "Fine, but room for improvement."
                ]
            }
            
            review = Review.objects.create(
                reviewer=booking.customer,
                practitioner=booking.practitioner,
                booking=booking,
                service=booking.service,
                rating=rating,
                comment=random.choice(comments[rating]),
                is_verified=True,
                would_recommend=rating >= 4
            )
            
            # Practitioner might respond to some reviews
            if random.random() > 0.7:
                review.practitioner_response = "Thank you for your feedback! It was wonderful working with you."
                review.practitioner_response_date = timezone.now()
                review.save()
            
            review_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {review_count} reviews'))

    def create_messages(self):
        """Create some conversations and messages"""
        self.stdout.write('💬 Creating messages...')
        
        conversation_count = 0
        
        # Create conversations between users and practitioners
        for _ in range(20):
            user = random.choice(self.users)
            practitioner = random.choice(self.practitioners)
            
            conversation = Conversation.objects.create(
                initiator=user,
                subject=f'Question about {practitioner.professional_title} services'
            )
            conversation.participants.add(user, practitioner.user)
            
            # Create a few messages
            messages = [
                (user, f"Hi, I'm interested in your {practitioner.professional_title} services. Can you tell me more?"),
                (practitioner.user, f"Hello! I'd be happy to help. What specific aspects would you like to know about?"),
                (user, "What's included in a typical session?"),
                (practitioner.user, "Each session is tailored to your needs, but typically includes..."),
            ]
            
            for sender, content in messages[:random.randint(2, 4)]:
                Message.objects.create(
                    conversation=conversation,
                    sender=sender,
                    content=content,
                    is_read=True
                )
            
            conversation_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {conversation_count} conversations'))

    def print_summary(self):
        """Print summary of created data"""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('📊 SEEDING SUMMARY'))
        self.stdout.write('='*50)
        
        self.stdout.write(f'  Users: {User.objects.count()}')
        self.stdout.write(f'  Practitioners: {Practitioner.objects.count()}')
        self.stdout.write(f'  Services: {Service.objects.count()}')
        self.stdout.write(f'  Bookings: {Booking.objects.count()}')
        self.stdout.write(f'  Reviews: {Review.objects.count()}')
        self.stdout.write(f'  Payments: {Payment.objects.count()}')
        self.stdout.write(f'  Conversations: {Conversation.objects.count()}')
        
        self.stdout.write('\n🔑 Test Credentials:')
        self.stdout.write('  Admin: admin@estuary.com / admin123')
        self.stdout.write('  Users: user1@example.com / testpass123')
        self.stdout.write('  Practitioners: practitioner1@example.com / testpass123')
        self.stdout.write(self.style.WARNING('\n  All test users have password: testpass123'))
        self.stdout.write('='*50 + '\n')