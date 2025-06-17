import random
from decimal import Decimal
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from faker import Faker

# Import all models
from users.models import User, UserProfile, UserSocialLinks, UserPaymentProfile, UserFavoritePractitioner
from practitioners.models import (
    Practitioner, SchedulePreference, Schedule, ScheduleTimeSlot,
    Specialize, Style, Topic, Question, Certification, Education
)
from services.models import (
    ServiceCategory, ServiceType, Service, ServiceSession, 
    PractitionerServiceCategory
)
from bookings.models import Booking, BookingReminder
from payments.models import (
    Order, UserCreditTransaction, PaymentMethod, PractitionerEarnings,
    EarningsTransaction, SubscriptionTier, PractitionerSubscription,
    ServiceTypeCommission, UserCreditBalance
)
from locations.models import Country, State, City, ZipCode, PractitionerLocation
from common.models import Modality
from utils.models import Address, Language

fake = Faker()


class Command(BaseCommand):
    help = 'Seed the database with realistic test data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=20,
            help='Number of regular users to create',
        )
        parser.add_argument(
            '--practitioners',
            type=int,
            default=10,
            help='Number of practitioners to create',
        )

    def handle(self, *args, **options):
        self.stdout.write('Starting database seeding...')
        
        with transaction.atomic():
            # Create base data
            self.create_countries_and_locations()
            self.create_languages()
            self.create_modalities()
            self.create_practitioner_attributes()
            self.create_service_categories_and_types()
            self.create_subscription_tiers()
            
            # Create users and practitioners
            users = self.create_users(options['users'])
            practitioners = self.create_practitioners(options['practitioners'])
            
            # Create services and bookings
            services = self.create_services(practitioners)
            self.create_bookings(users, services)
            
            # Create financial data
            self.create_payment_methods(users)
            self.create_transactions_and_earnings(users, practitioners)
            
            self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))

    def create_countries_and_locations(self):
        self.stdout.write('Creating countries and locations...')
        
        # Create countries
        countries_data = [
            {'name': 'United States', 'code': 'US', 'code_3': 'USA', 'phone_code': '+1', 'currency_code': 'USD'},
            {'name': 'Canada', 'code': 'CA', 'code_3': 'CAN', 'phone_code': '+1', 'currency_code': 'CAD'},
            {'name': 'United Kingdom', 'code': 'GB', 'code_3': 'GBR', 'phone_code': '+44', 'currency_code': 'GBP'},
        ]
        
        countries = []
        for data in countries_data:
            country, _ = Country.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            countries.append(country)
        
        # Create states for US
        us = countries[0]
        states_data = [
            {'name': 'California', 'code': 'CA'},
            {'name': 'New York', 'code': 'NY'},
            {'name': 'Texas', 'code': 'TX'},
            {'name': 'Florida', 'code': 'FL'},
            {'name': 'Illinois', 'code': 'IL'},
        ]
        
        states = []
        for data in states_data:
            state, _ = State.objects.get_or_create(
                country=us,
                code=data['code'],
                defaults={'name': data['name']}
            )
            states.append(state)
        
        # Create cities
        cities_data = [
            {'state': states[0], 'name': 'San Francisco', 'population': 873965, 'latitude': 37.7749, 'longitude': -122.4194, 'is_major': True},
            {'state': states[0], 'name': 'Los Angeles', 'population': 3990456, 'latitude': 34.0522, 'longitude': -118.2437, 'is_major': True},
            {'state': states[1], 'name': 'New York City', 'population': 8336817, 'latitude': 40.7128, 'longitude': -74.0060, 'is_major': True},
            {'state': states[2], 'name': 'Austin', 'population': 978908, 'latitude': 30.2672, 'longitude': -97.7431, 'is_major': True},
            {'state': states[3], 'name': 'Miami', 'population': 467963, 'latitude': 25.7617, 'longitude': -80.1918, 'is_major': True},
        ]
        
        for data in cities_data:
            City.objects.get_or_create(
                state=data['state'],
                name=data['name'],
                defaults={
                    'population': data['population'],
                    'latitude': data['latitude'],
                    'longitude': data['longitude'],
                    'is_major': data['is_major'],
                    'metro_area': f"{data['name']} Metro Area"
                }
            )

    def create_languages(self):
        self.stdout.write('Creating languages...')
        
        languages_data = [
            {'name': 'English', 'code': 'en', 'native_name': 'English'},
            {'name': 'Spanish', 'code': 'es', 'native_name': 'Español'},
            {'name': 'French', 'code': 'fr', 'native_name': 'Français'},
            {'name': 'Mandarin', 'code': 'zh', 'native_name': '中文'},
            {'name': 'Arabic', 'code': 'ar', 'native_name': 'العربية', 'is_rtl': True},
        ]
        
        for data in languages_data:
            Language.objects.get_or_create(
                code=data['code'],
                defaults=data
            )

    def create_modalities(self):
        self.stdout.write('Creating modalities...')
        
        modalities_data = [
            {'name': 'Yoga', 'category': 'Movement', 'description': 'Ancient practice combining physical postures, breathing, and meditation'},
            {'name': 'Meditation', 'category': 'Mindfulness', 'description': 'Practice of focused attention and awareness'},
            {'name': 'Massage Therapy', 'category': 'Bodywork', 'description': 'Manual manipulation of soft tissues'},
            {'name': 'Acupuncture', 'category': 'Traditional Medicine', 'description': 'Traditional Chinese medicine using thin needles'},
            {'name': 'Life Coaching', 'category': 'Coaching', 'description': 'Personal development and goal achievement'},
            {'name': 'Nutrition Counseling', 'category': 'Health', 'description': 'Dietary guidance and meal planning'},
            {'name': 'Reiki', 'category': 'Energy Work', 'description': 'Japanese energy healing technique'},
            {'name': 'Pilates', 'category': 'Movement', 'description': 'Low-impact exercise focusing on core strength'},
        ]
        
        for i, data in enumerate(modalities_data):
            Modality.objects.get_or_create(
                name=data['name'],
                defaults={
                    'category': data['category'],
                    'description': data['description'],
                    'order': i
                }
            )

    def create_practitioner_attributes(self):
        self.stdout.write('Creating practitioner attributes...')
        
        # Specializations
        specializations = [
            'Stress Management', 'Pain Relief', 'Sports Performance',
            'Prenatal Care', 'Mental Health', 'Weight Management',
            'Chronic Conditions', 'Injury Recovery'
        ]
        for spec in specializations:
            Specialize.objects.get_or_create(content=spec)
        
        # Styles
        styles = [
            'Gentle', 'Therapeutic', 'Deep Tissue', 'Energizing',
            'Restorative', 'Traditional', 'Modern', 'Holistic'
        ]
        for style in styles:
            Style.objects.get_or_create(content=style)
        
        # Topics
        topics = [
            'Anxiety', 'Depression', 'Back Pain', 'Flexibility',
            'Strength', 'Balance', 'Mindfulness', 'Nutrition'
        ]
        for topic in topics:
            Topic.objects.get_or_create(content=topic)
        
        # Questions
        questions = [
            'What brought you here today?',
            'What are your main health goals?',
            'Do you have any injuries or conditions I should know about?',
            'How would you describe your stress level?',
            'What is your experience level with this modality?'
        ]
        for i, question in enumerate(questions):
            Question.objects.get_or_create(
                title=question,
                defaults={'order': i}
            )

    def create_service_categories_and_types(self):
        self.stdout.write('Creating service categories and types...')
        
        # Categories
        categories_data = [
            {'name': 'Wellness', 'description': 'General wellness and health services'},
            {'name': 'Fitness', 'description': 'Physical fitness and exercise'},
            {'name': 'Therapy', 'description': 'Therapeutic and healing services'},
            {'name': 'Coaching', 'description': 'Personal and professional coaching'},
        ]
        
        for data in categories_data:
            ServiceCategory.objects.get_or_create(
                name=data['name'],
                defaults={'description': data['description']}
            )
        
        # Service Types
        types_data = [
            {'name': 'Individual Session', 'code': 'session'},
            {'name': 'Workshop', 'code': 'workshop'},
            {'name': 'Course', 'code': 'course'},
            {'name': 'Package', 'code': 'package'},
            {'name': 'Bundle', 'code': 'bundle'},
        ]
        
        for i, data in enumerate(types_data):
            ServiceType.objects.get_or_create(
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'order': i
                }
            )
        
        # Create commission rates for service types
        service_types = ServiceType.objects.all()
        commission_rates = {
            'session': 15.0,
            'workshop': 12.0,
            'course': 10.0,
            'package': 12.0,
            'bundle': 13.0,
        }
        
        for service_type in service_types:
            ServiceTypeCommission.objects.get_or_create(
                service_type=service_type,
                defaults={
                    'base_rate': commission_rates.get(service_type.code, 15.0),
                    'description': f'Base commission rate for {service_type.name}'
                }
            )

    def create_subscription_tiers(self):
        self.stdout.write('Creating subscription tiers...')
        
        tiers_data = [
            {
                'name': 'Basic',
                'monthly_price': Decimal('29.99'),
                'annual_price': Decimal('299.99'),
                'features': ['Up to 50 bookings/month', 'Basic analytics', 'Email support'],
                'order': 1
            },
            {
                'name': 'Professional',
                'monthly_price': Decimal('79.99'),
                'annual_price': Decimal('799.99'),
                'features': ['Unlimited bookings', 'Advanced analytics', 'Priority support', 'Custom branding'],
                'order': 2
            },
            {
                'name': 'Enterprise',
                'monthly_price': Decimal('149.99'),
                'annual_price': Decimal('1499.99'),
                'features': ['Everything in Professional', 'API access', 'Dedicated account manager', 'Custom integrations'],
                'order': 3
            },
        ]
        
        for data in tiers_data:
            SubscriptionTier.objects.get_or_create(
                name=data['name'],
                defaults=data
            )

    def create_users(self, count):
        self.stdout.write(f'Creating {count} users...')
        
        users = []
        for i in range(count):
            email = fake.email()
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': fake.first_name(),
                    'last_name': fake.last_name(),
                    'phone_number': fake.phone_number()[:17],
                    'phone_number_verified': random.choice([True, False]),
                    'timezone': random.choice(['America/New_York', 'America/Los_Angeles', 'America/Chicago', 'UTC']),
                    'is_active': True,
                    'is_practitioner': False,
                }
            )
            
            if created:
                user.set_password('testpass123')
                user.save()
                
                # Create profile
                UserProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'bio': fake.text(max_nb_chars=500),
                        'gender': random.choice(['male', 'female', 'non_binary', 'prefer_not_to_say']),
                        'birthdate': fake.date_of_birth(minimum_age=18, maximum_age=80),
                    }
                )
                
                # Create payment profile
                UserPaymentProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'stripe_customer_id': f'cus_{fake.uuid4()[:14]}',
                        'default_currency': 'USD',
                    }
                )
                
                # Initialize credit balance
                UserCreditBalance.objects.get_or_create(
                    user=user,
                    defaults={'balance_cents': random.randint(0, 50000)}
                )
            
            users.append(user)
        
        return users

    def create_practitioners(self, count):
        self.stdout.write(f'Creating {count} practitioners...')
        
        practitioners = []
        modalities = list(Modality.objects.all())
        specializations = list(Specialize.objects.all())
        styles = list(Style.objects.all())
        topics = list(Topic.objects.all())
        cities = list(City.objects.all())
        
        for i in range(count):
            email = fake.email()
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': fake.first_name(),
                    'last_name': fake.last_name(),
                    'phone_number': fake.phone_number()[:17],
                    'phone_number_verified': True,
                    'timezone': random.choice(['America/New_York', 'America/Los_Angeles', 'America/Chicago']),
                    'is_active': True,
                    'is_practitioner': True,
                }
            )
            
            if created:
                user.set_password('testpass123')
                user.save()
                
                # Create practitioner profile
                practitioner = Practitioner.objects.create(
                    user=user,
                    is_verified=random.choice([True, True, True, False]),  # 75% verified
                    practitioner_status=random.choice(['active', 'active', 'active', 'pending']),  # 75% active
                    featured=random.choice([True, False, False, False]),  # 25% featured
                    display_name=f"{user.first_name} {user.last_name}",
                    professional_title=random.choice([
                        'Certified Yoga Instructor',
                        'Licensed Massage Therapist',
                        'Certified Life Coach',
                        'Registered Dietitian',
                        'Licensed Acupuncturist',
                        'Certified Personal Trainer',
                    ]),
                    bio=fake.text(max_nb_chars=1000),
                    quote=fake.sentence(nb_words=15),
                    years_of_experience=random.randint(1, 20),
                    buffer_time=random.choice([15, 30, 45]),
                    is_onboarded=True,
                    onboarding_completed_at=timezone.now() - timedelta(days=random.randint(30, 365)),
                )
                
                # Add modalities
                practitioner.modalities.set(random.sample(modalities, k=random.randint(1, 3)))
                practitioner.specializations.set(random.sample(specializations, k=random.randint(2, 4)))
                practitioner.styles.set(random.sample(styles, k=random.randint(1, 3)))
                practitioner.topics.set(random.sample(topics, k=random.randint(2, 5)))
                
                # Create location
                city = random.choice(cities)
                location = PractitionerLocation.objects.create(
                    practitioner=practitioner,
                    name=f"{user.first_name}'s Practice",
                    address_line1=fake.street_address(),
                    city=city,
                    state=city.state,
                    postal_code=fake.postcode(),
                    country=city.state.country,
                    latitude=city.latitude + Decimal(random.uniform(-0.1, 0.1)),
                    longitude=city.longitude + Decimal(random.uniform(-0.1, 0.1)),
                    is_primary=True,
                    is_virtual=random.choice([True, True, False]),  # 67% offer virtual
                    is_in_person=True,
                )
                
                practitioner.primary_location = location
                practitioner.save()
                
                # Create schedule preference
                SchedulePreference.objects.create(
                    practitioner=practitioner,
                    timezone=user.timezone,
                    country=city.state.country,
                    advance_booking_min_hours=random.choice([24, 48, 72]),
                    advance_booking_max_days=random.choice([30, 60, 90]),
                    auto_accept_bookings=random.choice([True, False]),
                )
                
                # Create default schedule
                schedule = Schedule.objects.create(
                    name='Regular Hours',
                    practitioner=practitioner,
                    is_default=True,
                    timezone=user.timezone,
                    description='My regular availability',
                )
                
                # Create time slots (weekdays)
                for day in range(5):  # Monday to Friday
                    # Morning slot
                    if random.choice([True, True, False]):  # 67% chance
                        ScheduleTimeSlot.objects.create(
                            schedule=schedule,
                            day=day,
                            start_time=datetime.strptime('09:00', '%H:%M').time(),
                            end_time=datetime.strptime('12:00', '%H:%M').time(),
                        )
                    
                    # Afternoon slot
                    if random.choice([True, True, False]):  # 67% chance
                        ScheduleTimeSlot.objects.create(
                            schedule=schedule,
                            day=day,
                            start_time=datetime.strptime('14:00', '%H:%M').time(),
                            end_time=datetime.strptime('18:00', '%H:%M').time(),
                        )
                
                # Weekend availability (lower chance)
                for day in [5, 6]:  # Saturday and Sunday
                    if random.choice([True, False, False]):  # 33% chance
                        ScheduleTimeSlot.objects.create(
                            schedule=schedule,
                            day=day,
                            start_time=datetime.strptime('10:00', '%H:%M').time(),
                            end_time=datetime.strptime('14:00', '%H:%M').time(),
                        )
                
                # Create subscription
                tier = random.choice(SubscriptionTier.objects.all())
                PractitionerSubscription.objects.create(
                    practitioner=practitioner,
                    tier=tier,
                    status='active',
                    is_annual=random.choice([True, False]),
                )
                
                # Initialize earnings
                PractitionerEarnings.objects.create(
                    practitioner=practitioner,
                    pending_balance_cents=random.randint(0, 100000),
                    available_balance_cents=random.randint(0, 50000),
                    lifetime_earnings_cents=random.randint(50000, 500000),
                    lifetime_payouts_cents=random.randint(10000, 200000),
                )
                
                # Create some certifications
                for j in range(random.randint(1, 3)):
                    cert = Certification.objects.create(
                        certificate=random.choice([
                            'Yoga Alliance RYT-200',
                            'NCTMB Certification',
                            'ICF Professional Coach',
                            'CPR Certification',
                            'First Aid Certification',
                        ]),
                        institution=fake.company(),
                        issue_date=fake.date_between(start_date='-10y', end_date='-1y'),
                        order=j
                    )
                    practitioner.certifications.add(cert)
                
                # Create education
                for j in range(random.randint(1, 2)):
                    edu = Education.objects.create(
                        degree=random.choice([
                            'Bachelor of Science',
                            'Master of Arts',
                            'Certificate Program',
                            'Professional Training',
                        ]),
                        educational_institute=fake.company() + ' University',
                        order=j
                    )
                    practitioner.educations.add(edu)
                
                practitioners.append(practitioner)
        
        return practitioners

    def create_services(self, practitioners):
        self.stdout.write('Creating services...')
        
        services = []
        categories = list(ServiceCategory.objects.all())
        service_types = ServiceType.objects.all()
        languages = list(Language.objects.all())
        
        service_names = {
            'session': [
                'Private Yoga Session',
                'Deep Tissue Massage',
                'Life Coaching Session',
                'Acupuncture Treatment',
                'Nutrition Consultation',
                'Meditation Session',
                'Reiki Healing',
                'Personal Training',
            ],
            'workshop': [
                'Stress Management Workshop',
                'Beginner Yoga Workshop',
                'Mindfulness Meditation Workshop',
                'Nutrition Basics Workshop',
                'Self-Care Workshop',
            ],
            'course': [
                '8-Week Yoga Foundation Course',
                'Mindfulness-Based Stress Reduction',
                '12-Week Fitness Transformation',
                'Holistic Health Course',
            ],
            'package': [
                '5-Session Massage Package',
                '10-Session Yoga Package',
                'Monthly Wellness Package',
            ],
            'bundle': [
                '10-Session Bundle (Save 20%)',
                '20-Session Bundle (Save 30%)',
                'Quarterly Wellness Bundle',
            ],
        }
        
        for practitioner in practitioners:
            # Create custom categories for practitioner
            for i in range(random.randint(1, 3)):
                PractitionerServiceCategory.objects.create(
                    practitioner=practitioner,
                    name=random.choice(['Beginner Friendly', 'Advanced Practice', 'Therapeutic', 'Group Sessions']),
                    description=fake.sentence(),
                    order=i
                )
            
            practitioner_categories = list(practitioner.service_categories.all())
            
            # Create 3-8 services per practitioner
            for _ in range(random.randint(3, 8)):
                service_type = random.choice(service_types)
                
                # Base price based on service type
                base_prices = {
                    'session': (5000, 20000),  # $50-$200
                    'workshop': (10000, 50000),  # $100-$500
                    'course': (50000, 200000),  # $500-$2000
                    'package': (40000, 150000),  # $400-$1500
                    'bundle': (30000, 100000),  # $300-$1000
                }
                
                price_range = base_prices.get(service_type.code, (5000, 20000))
                price_cents = random.randint(*price_range)
                
                # Duration based on service type
                duration_ranges = {
                    'session': (30, 90),
                    'workshop': (120, 240),
                    'course': (60, 120),  # Per session
                    'package': (60, 90),
                    'bundle': (60, 60),
                }
                
                duration = random.randint(*duration_ranges.get(service_type.code, (60, 90)))
                
                service = Service.objects.create(
                    name=random.choice(service_names.get(service_type.code, ['General Service'])),
                    description=fake.text(max_nb_chars=500),
                    short_description=fake.text(max_nb_chars=200),
                    price_cents=price_cents,
                    duration_minutes=duration,
                    service_type=service_type,
                    category=random.choice(categories),
                    practitioner_category=random.choice(practitioner_categories) if practitioner_categories and random.choice([True, False]) else None,
                    primary_practitioner=practitioner,
                    max_participants=1 if service_type.code == 'session' else random.randint(5, 20),
                    experience_level=random.choice(['beginner', 'intermediate', 'advanced', 'all_levels']),
                    location_type=random.choice(['virtual', 'in_person', 'hybrid']),
                    what_youll_learn=fake.text(max_nb_chars=300),
                    is_active=True,
                    is_featured=random.choice([True, False, False, False]),  # 25% featured
                    status='published',
                    published_at=timezone.now() - timedelta(days=random.randint(30, 365)),
                )
                
                # Add languages
                service.languages.set(random.sample(languages, k=random.randint(1, 2)))
                
                # For packages and bundles, set additional fields
                if service_type.code == 'package':
                    service.validity_days = random.choice([90, 180, 365])
                    service.save()
                elif service_type.code == 'bundle':
                    service.sessions_included = random.choice([5, 10, 20])
                    service.bonus_sessions = random.choice([0, 1, 2])
                    service.validity_days = random.choice([60, 90, 120])
                    service.save()
                
                # Create sessions for workshops and courses
                if service_type.code in ['workshop', 'course']:
                    num_sessions = 1 if service_type.code == 'workshop' else random.randint(4, 12)
                    
                    for session_num in range(num_sessions):
                        start_date = timezone.now() + timedelta(days=random.randint(7, 60))
                        start_time = start_date.replace(
                            hour=random.choice([9, 10, 14, 15, 16]),
                            minute=0,
                            second=0,
                            microsecond=0
                        )
                        
                        ServiceSession.objects.create(
                            service=service,
                            title=f"{service.name} - Session {session_num + 1}",
                            description=fake.text(max_nb_chars=200),
                            start_time=start_time,
                            end_time=start_time + timedelta(minutes=duration),
                            duration=duration,
                            max_participants=service.max_participants,
                            sequence_number=session_num + 1,
                            status='scheduled',
                        )
                
                services.append(service)
        
        return services

    def create_bookings(self, users, services):
        self.stdout.write('Creating bookings...')
        
        # Filter services for individual sessions
        session_services = [s for s in services if s.service_type.code == 'session']
        
        # Create past bookings
        for _ in range(100):
            user = random.choice(users)
            service = random.choice(session_services)
            
            # Random date in the past 6 months
            days_ago = random.randint(1, 180)
            start_time = timezone.now() - timedelta(days=days_ago)
            start_time = start_time.replace(
                hour=random.choice([9, 10, 11, 14, 15, 16, 17]),
                minute=random.choice([0, 30]),
                second=0,
                microsecond=0
            )
            end_time = start_time + timedelta(minutes=service.duration_minutes)
            
            booking = Booking.objects.create(
                user=user,
                practitioner=service.primary_practitioner,
                service=service,
                start_time=start_time,
                end_time=end_time,
                actual_start_time=start_time,
                actual_end_time=end_time,
                status='completed',
                payment_status='paid',
                price_charged_cents=service.price_cents,
                final_amount_cents=service.price_cents,
                completed_at=end_time,
                confirmed_at=start_time - timedelta(days=1),
            )
            
            # Create earnings transaction
            commission_rate = Decimal('15.0')  # 15% commission
            commission_cents = int((commission_rate / 100) * booking.price_charged_cents)
            net_cents = booking.price_charged_cents - commission_cents
            
            EarningsTransaction.objects.create(
                practitioner=booking.practitioner,
                booking=booking,
                gross_amount_cents=booking.price_charged_cents,
                commission_rate=commission_rate,
                commission_amount_cents=commission_cents,
                net_amount_cents=net_cents,
                status='paid',  # Past bookings are already paid out
                available_after=booking.completed_at + timedelta(hours=48),
                transaction_type='booking_completion',
            )
        
        # Create future bookings
        for _ in range(50):
            user = random.choice(users)
            service = random.choice(session_services)
            
            # Random date in the next 2 months
            days_ahead = random.randint(1, 60)
            start_time = timezone.now() + timedelta(days=days_ahead)
            start_time = start_time.replace(
                hour=random.choice([9, 10, 11, 14, 15, 16, 17]),
                minute=random.choice([0, 30]),
                second=0,
                microsecond=0
            )
            end_time = start_time + timedelta(minutes=service.duration_minutes)
            
            Booking.objects.create(
                user=user,
                practitioner=service.primary_practitioner,
                service=service,
                start_time=start_time,
                end_time=end_time,
                status='confirmed',
                payment_status='paid',
                price_charged_cents=service.price_cents,
                final_amount_cents=service.price_cents,
                confirmed_at=timezone.now(),
            )
        
        # Create some canceled bookings
        for _ in range(20):
            user = random.choice(users)
            service = random.choice(session_services)
            
            days_ahead = random.randint(1, 30)
            start_time = timezone.now() + timedelta(days=days_ahead)
            start_time = start_time.replace(
                hour=random.choice([9, 10, 11, 14, 15, 16, 17]),
                minute=random.choice([0, 30]),
                second=0,
                microsecond=0
            )
            end_time = start_time + timedelta(minutes=service.duration_minutes)
            
            Booking.objects.create(
                user=user,
                practitioner=service.primary_practitioner,
                service=service,
                start_time=start_time,
                end_time=end_time,
                status='canceled',
                payment_status='refunded',
                price_charged_cents=service.price_cents,
                final_amount_cents=0,
                canceled_at=timezone.now() - timedelta(days=random.randint(1, 10)),
                canceled_by=random.choice(['client', 'practitioner']),
                cancellation_reason=random.choice([
                    'Schedule conflict',
                    'Feeling unwell',
                    'Emergency came up',
                    'Weather conditions',
                ]),
            )

    def create_payment_methods(self, users):
        self.stdout.write('Creating payment methods...')
        
        card_brands = ['visa', 'mastercard', 'amex', 'discover']
        
        for user in users[:10]:  # Create payment methods for first 10 users
            num_cards = random.randint(1, 3)
            for i in range(num_cards):
                PaymentMethod.objects.create(
                    user=user,
                    stripe_payment_method_id=f'pm_{fake.uuid4()[:24]}',
                    brand=random.choice(card_brands),
                    last4=fake.credit_card_number()[-4:],
                    exp_month=random.randint(1, 12),
                    exp_year=random.randint(2024, 2030),
                    is_default=i == 0,
                )

    def create_transactions_and_earnings(self, users, practitioners):
        self.stdout.write('Creating transactions and earnings...')
        
        # Create credit purchases for users
        for user in random.sample(users, k=min(15, len(users))):
            # Purchase credits
            amount_cents = random.choice([5000, 10000, 20000, 50000])  # $50, $100, $200, $500
            
            order = Order.objects.create(
                user=user,
                payment_method='stripe',
                stripe_payment_intent_id=f'pi_{fake.uuid4()[:24]}',
                subtotal_amount_cents=amount_cents,
                total_amount_cents=amount_cents,
                status='completed',
                order_type='credit',
            )
            
            UserCreditTransaction.objects.create(
                user=user,
                amount_cents=amount_cents,
                transaction_type='purchase',
                order=order,
                description=f'Purchased ${amount_cents/100:.2f} credits',
            )
        
        # Create some user favorites
        for user in random.sample(users, k=min(10, len(users))):
            favorite_practitioners = random.sample(practitioners, k=random.randint(1, 3))
            for practitioner in favorite_practitioners:
                UserFavoritePractitioner.objects.get_or_create(
                    user=user,
                    practitioner=practitioner
                )
        
        self.stdout.write(self.style.SUCCESS('Test data generation complete!'))