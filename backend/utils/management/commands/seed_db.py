"""
Management command to seed the database with test data using django-seed.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.conf import settings
import random
import datetime
import uuid
import pytz
from decimal import Decimal
from faker import Faker
from django_seed import Seed
from django_seed.guessers import _timezone_format

# Fix for django-seed compatibility with newer Django versions
# Monkey patch django_seed's _timezone_format function
original_timezone_format = _timezone_format

def patched_timezone_format(value, *args, **kwargs):
    """Patched version that doesn't use is_dst parameter"""
    if timezone.is_aware(value):
        return value
    return timezone.make_aware(value)

# Apply the monkey patch
from django_seed import guessers
guessers._timezone_format = patched_timezone_format

# Import your models
User = get_user_model()
from practitioners.models import Practitioner, Topic, Specialize, Style, Certification, Education, OutOfOffice, Question, SchedulePreference, ServiceSchedule, ScheduleAvailability, Schedule, ScheduleTimeSlot
from users.models import UserFavoritePractitioner
from utils.models import Modality, Language
from services.models import Service, ServiceCategory, ServiceType, ServiceSession, SessionAgendaItem, ServiceBenefit, ServicePractitioner, ServiceRelationship
from bookings.models import Booking
from payments.models import Order, CreditTransaction, PractitionerCreditTransaction, PractitionerPayout
from reviews.models import Review, ReviewQuestion, ReviewAnswer, ReviewVote
from locations.models import State, City, ZipCode, PractitionerLocation
from community.models import Post, PostComment, PostReaction, CommunityTopic, CommunityFollow
from messaging.models import Conversation, Message, MessageReceipt

class Command(BaseCommand):
    help = 'Seed database with sample data using django-seed'

    def add_arguments(self, parser):
        parser.add_argument('--users', type=int, default=10, help='Number of users to create')
        parser.add_argument('--practitioners', type=int, default=5, help='Number of practitioners to create')
        parser.add_argument('--services', type=int, default=20, help='Number of services to create')
        parser.add_argument('--bookings', type=int, default=30, help='Number of bookings to create')
        parser.add_argument('--reviews', type=int, default=15, help='Number of reviews to create')
        parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding')
        parser.add_argument('--only-m2m', action='store_true', help='Only seed many-to-many relationships')
        parser.add_argument('--service_categories', action='store_true', help='Seed service categories')
        parser.add_argument('--payment_data', action='store_true', help='Seed payment data')
        parser.add_argument('--review_answers', action='store_true', help='Create review answers')
        parser.add_argument('--many_to_many', action='store_true', help='Seed many-to-many relationships')
        parser.add_argument('--out_of_office', action='store_true', help='Seed out of office periods')
        parser.add_argument('--practitioner_questions', action='store_true', help='Seed practitioner questions')
        parser.add_argument('--review_votes', action='store_true', help='Seed review votes')
        parser.add_argument('--topics', action='store_true', help='Seed topics')
        parser.add_argument('--specializations', action='store_true', help='Seed specializations')
        parser.add_argument('--styles', action='store_true', help='Seed styles')
        parser.add_argument('--modalities', action='store_true', help='Seed modalities')
        parser.add_argument('--certifications', action='store_true', help='Seed certifications')
        parser.add_argument('--educations', action='store_true', help='Seed educations')
        parser.add_argument('--user_favorites', action='store_true', help='Seed user favorites')
        parser.add_argument('--languages', action='store_true', help='Seed languages')
        parser.add_argument('--scheduling', action='store_true', help='Seed scheduling data (preferences, schedules, availability)')
        parser.add_argument('--locations', action='store_true', help='Seed location data (states, cities, zip codes)')
        parser.add_argument('--practitioner_locations', action='store_true', help='Seed practitioner locations')
        parser.add_argument('--community', action='store_true', help='Seed community data')
        parser.add_argument('--messaging', action='store_true', help='Seed messaging data')
        parser.add_argument('--orders', action='store_true', help='Seed orders')

    def handle(self, *args, **options):
        """Handle the command."""
        # Apply the monkey patch
        from django_seed import guessers
        guessers._timezone_format = patched_timezone_format
        
        # Initialize the seeder
        seeder = Seed.seeder()
        
        # Clear existing data if requested
        if options['clear']:
            self.clear_data()
        
        if options['only_m2m']:
            self.seed_many_to_many_relationships()
        else:
            # Seed users
            self.seed_users(seeder, options['users'])
            
            # Seed practitioners
            self.seed_practitioners(seeder, options['practitioners'])
            
            # Seed service categories
            if options['service_categories']:
                self.seed_service_categories()
            
            # Create service types
            self.create_service_types()
            
            # Seed services
            self.seed_services(seeder, options['services'])
            
            # Seed service relationships for packages and bundles
            self.seed_service_relationships()
            
            # Seed bookings
            self.seed_bookings(seeder, options['bookings'])
            
            # Seed reviews
            self.seed_reviews(seeder, options['reviews'])
            
            # Seed payment data
            if options['payment_data']:
                self.seed_payment_data()
            
            # Create review questions
            self.create_review_questions()
            
            # Create review answers
            if options['review_answers']:
                self.create_review_answers(seeder)
            
            # Seed out of office periods
            if options['out_of_office'] and Practitioner.objects.all():
                self.seed_out_of_office(Practitioner.objects.all())
            
            # Seed practitioner questions
            if options['practitioner_questions']:
                self.seed_questions()
            
            # Seed review votes
            if options['review_votes'] and Review.objects.all() and User.objects.all():
                self.seed_review_votes(Review.objects.all(), User.objects.all())
            
            # Seed many-to-many relationships
            if options['many_to_many']:
                self.seed_many_to_many_relationships()
            
            # Seed topics
            if options['topics']:
                self.seed_topics()
            
            # Seed specializations
            if options['specializations']:
                self.seed_specializations()
            
            # Seed styles
            if options['styles']:
                self.seed_styles()
            
            # Seed modalities
            if options['modalities']:
                self.seed_modalities()
            
            # Seed certifications
            if options['certifications']:
                self.seed_certifications()
            
            # Seed educations
            if options['educations']:
                self.seed_educations()
            
            # Seed languages
            if options['languages']:
                self.seed_languages()
            
            # Seed location data
            if options['locations']:
                try:
                    self.stdout.write('Skipping location data due to known issues...')
                    # self.seed_location_data()
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error seeding location data: {str(e)}"))
            
            # Seed scheduling data
            if options['scheduling'] and Practitioner.objects.all() and Service.objects.all():
                self.seed_scheduling_data()
            
            # Seed practitioner locations
            if options['practitioner_locations']:
                try:
                    self.seed_practitioner_locations(seeder)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error seeding practitioner locations: {str(e)}"))
            
            # Add many-to-many relationships for practitioners
            if Practitioner.objects.all() and options['many_to_many']:
                # Add modalities to practitioners
                modalities = list(Modality.objects.all())
                for practitioner in Practitioner.objects.all():
                    # Add 1-3 random modalities to each practitioner
                    num_modalities = random.randint(1, 3)
                    if modalities and len(modalities) > 0:
                        practitioner_modalities = random.sample(modalities, min(num_modalities, len(modalities)))
                        practitioner.user.modalities.add(*practitioner_modalities)
                self.stdout.write(f'Added modalities to {len(Practitioner.objects.all())} users')
                
                # Add languages to services
                languages = list(Language.objects.all())
                services = Service.objects.all()
                for service in services:
                    # Add 1-2 random languages to each service
                    num_languages = random.randint(1, 2)
                    if languages and len(languages) > 0:
                        service_languages = random.sample(languages, min(num_languages, len(languages)))
                        service.languages.add(*service_languages)
                self.stdout.write(f'Added languages to {services.count()} services')
            
            # Seed user favorites
            if options['user_favorites'] and User.objects.all() and Practitioner.objects.all():
                self.seed_user_favorites()
            
            # Add topics to bookings
            if Booking.objects.all() and options['many_to_many']:
                topics = list(Topic.objects.all())
                for booking in Booking.objects.all():
                    # Add 0-3 random topics to each booking
                    if random.random() < 0.7 and topics:  # 70% chance to add topics
                        num_topics = random.randint(1, 3)
                        booking_topics = random.sample(topics, min(num_topics, len(topics)))
                        booking.topics.add(*booking_topics)
                self.stdout.write(f'Added topics to {Booking.objects.filter(topics__isnull=False).distinct().count()} bookings')
            
            # Seed payment data again to ensure all relationships are properly set up
            if options['payment_data']:
                self.seed_payment_data()
            
            # Add community data
            if options.get('community', False):
                try:
                    self.seed_community_data(seeder)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error seeding community data: {str(e)}"))
            
            # Add messaging data
            if options.get('messaging', False):
                try:
                    self.seed_messaging_data(seeder)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error seeding messaging data: {str(e)}"))
            
            # Add orders
            if options.get('orders', False):
                try:
                    self.seed_orders(seeder)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error seeding orders: {str(e)}"))
        
        self.stdout.write('Successfully seeded database')

    def clear_data(self):
        """Clear existing data."""
        self.stdout.write('Clearing existing data...')
        
        # Models to clear in order (to avoid foreign key constraint issues)
        models_to_clear = [
            Review,
            ReviewAnswer,
            ReviewQuestion,
            ReviewVote,
            Booking,
            ServiceSession,
            SessionAgendaItem,
            ServiceBenefit,
            Service,
            ServiceCategory,
            ServiceType,
            # Transaction,  # Removed undefined model
            Order,
            PractitionerCreditTransaction,
            PractitionerPayout,
            UserFavoritePractitioner,
            Practitioner,
            User
        ]
        
        for model in models_to_clear:
            model_name = model.__name__
            self.stdout.write(f'Clearing {model_name} data...')
            try:
                model.objects.all().delete()
            except Exception as e:
                self.stdout.write(f'Error clearing {model_name} data: {str(e)}')
                
            self.stdout.write('Continuing with next model...')
        
        self.stdout.write('Finished clearing data')

    def seed_users(self, seeder, count):
        """Seed users."""
        self.stdout.write('Seeding users...')
        
        # Get modalities for later use
        modalities = list(Modality.objects.all())
        
        # Create a superuser for easy admin access
        if not User.objects.filter(email='admin@example.com').exists():
            User.objects.create_superuser(
                email='admin@example.com',
                password='admin',
                first_name='Admin',
                last_name='User',
            )
            self.stdout.write('Created superuser admin@example.com with password "admin"')
        
        # Create regular users
        seeder.add_entity(User, count, {
            'email': lambda x: seeder.faker.email(),
            'first_name': lambda x: seeder.faker.first_name(),
            'last_name': lambda x: seeder.faker.last_name(),
            'date_joined': lambda x: timezone.make_aware(seeder.faker.past_datetime(start_date='-180d')),
            'last_login': lambda x: timezone.make_aware(seeder.faker.past_datetime(start_date='-30d')),
            'phone_number': lambda x: seeder.faker.phone_number(),
            'bio': lambda x: seeder.faker.paragraph(),
            'avatar_url': lambda x: f"https://i.pravatar.cc/300?img={seeder.faker.random_int(min=1, max=70)}",
            'gender': lambda x: random.choice(['male', 'female', 'non-binary', 'prefer not to say']),
            'birthdate': lambda x: seeder.faker.date_of_birth(minimum_age=18, maximum_age=80),
            'register_date': lambda x: seeder.faker.date_between(start_date='-1y', end_date='today'),
            'account_status': 'active',
            'is_active': True,
            'is_staff': False,
            'is_superuser': False,
            'timezone': lambda x: random.choice([
                'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 
                'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 
                'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland'
            ]),
        })
        
        inserted_users = seeder.execute()
        
        # Add modalities to some users
        users = User.objects.all()
        modalities = list(Modality.objects.all())
        
        # Only add modalities if there are any available
        if modalities:
            for user in random.sample(list(users), min(len(users), count // 5)):
                user_modalities = random.sample(modalities, random.randint(1, min(3, len(modalities))))
                user.modalities.add(*user_modalities)
        
        self.stdout.write(f'Created {count} users')
        return inserted_users

    def seed_practitioners(self, seeder, count):
        """Seed practitioners."""
        self.stdout.write('Seeding practitioners...')
        
        # Get all users that don't already have a practitioner profile
        existing_practitioner_user_ids = Practitioner.objects.values_list('user_id', flat=True)
        available_users = User.objects.exclude(id__in=existing_practitioner_user_ids).filter(is_staff=False)[:count]
        
        if not available_users:
            self.stdout.write('No available users for creating practitioners. Skipping.')
            return []
        
        practitioner_count = 0
        inserted_practitioners = []
        
        for user in available_users:
            try:
                # Try to create a practitioner for this user
                practitioner = Practitioner.objects.create(
                    user=user,
                    bio=seeder.faker.paragraph(),
                    years_of_experience=random.randint(1, 20),
                    practitioner_status='active',
                    is_verified=random.choice([True, False]),
                    average_rating=seeder.faker.pydecimal(left_digits=1, right_digits=1, positive=True, min_value=3.0, max_value=5.0),
                    total_reviews=random.randint(5, 50),
                    featured=random.choice([True, False]),
                    display_name=f"Dr. {user.first_name} {user.last_name}",
                    title=seeder.faker.job(),
                    description=seeder.faker.paragraph(),
                    quote=seeder.faker.sentence(),
                    profile_image_url=f"https://picsum.photos/seed/{uuid.uuid4()}/300/300",
                    profile_video_url=None,
                    buffer_time=random.randint(10, 30),
                    completed_sessions=random.randint(10, 100),
                    cancellation_rate=seeder.faker.pydecimal(left_digits=2, right_digits=2, positive=True, min_value=0.1, max_value=5),
                    book_times=random.randint(20, 200),
                    min_price=seeder.faker.pydecimal(left_digits=2, right_digits=2, positive=True, min_value=50, max_value=99),
                    max_price=seeder.faker.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=100, max_value=299),
                    total_services=random.randint(1, 10),
                    is_onboarded=True,
                    onboarding_step=5,
                    onboarding_completed_at=timezone.make_aware(seeder.faker.past_datetime(start_date='-90d')),
                )
                inserted_practitioners.append(practitioner)
                practitioner_count += 1
            except IntegrityError:
                self.stdout.write(self.style.WARNING(f'Practitioner already exists for user {user.id}. Skipping.'))
                continue
        
        self.stdout.write(f'Created {practitioner_count} practitioners')
        return inserted_practitioners

    def seed_service_categories(self):
        """Seed service categories."""
        self.stdout.write('Seeding service categories...')
        
        # Create system categories
        system_categories = [
            {'name': 'Wellness', 'description': 'Services focused on overall wellness and health.'},
            {'name': 'Mental Health', 'description': 'Services focused on mental health and wellbeing.'},
            {'name': 'Fitness', 'description': 'Services focused on physical fitness and exercise.'},
            {'name': 'Nutrition', 'description': 'Services focused on diet and nutrition.'},
            {'name': 'Meditation', 'description': 'Services focused on meditation and mindfulness.'},
            {'name': 'Yoga', 'description': 'Services focused on yoga and stretching.'},
            {'name': 'Coaching', 'description': 'Services focused on personal and professional coaching.'},
            {'name': 'Therapy', 'description': 'Services focused on therapy and counseling.'},
        ]
        
        created_count = 0
        for category_data in system_categories:
            # Create slug from name
            slug = category_data['name'].lower().replace(' ', '-')
            
            # Skip if already exists
            if ServiceCategory.objects.filter(slug=slug).exists():
                continue
                
            # Create category
            ServiceCategory.objects.create(
                id=uuid.uuid4(),
                name=category_data['name'],
                slug=slug,
                description=category_data['description'],
                is_system=True
            )
            created_count += 1
            
        # Create practitioner-specific categories
        practitioners = Practitioner.objects.all()
        for practitioner in practitioners:
            # Create 1-3 custom categories for each practitioner
            custom_categories = random.sample([
                'Specialized Sessions',
                'Group Classes',
                'Workshops',
                'One-on-One',
                'Beginner Friendly',
                'Advanced',
                'Seasonal',
                'Featured'
            ], random.randint(1, 3))
            
            for category_name in custom_categories:
                # Create slug from practitioner ID and category name
                slug = f"{practitioner.pk}-{category_name.lower().replace(' ', '-')}"
                
                # Skip if already exists
                if ServiceCategory.objects.filter(slug=slug).exists():
                    continue
                    
                # Create category
                ServiceCategory.objects.create(
                    id=uuid.uuid4(),
                    name=category_name,
                    slug=slug,
                    description=f"Custom {category_name.lower()} services offered by {practitioner.user.first_name}.",
                    practitioner=practitioner,
                    is_system=False
                )
                created_count += 1
                
        self.stdout.write(f'Created {created_count} service categories')
        return ServiceCategory.objects.all()

    def create_service_types(self):
        """Create standard service types if they don't exist."""
        self.stdout.write('Creating service types...')
        
        service_types = [
            {'name': 'session', 'description': 'One-on-one session with a practitioner'},
            {'name': 'workshop', 'description': 'Group workshop led by a practitioner'},
            {'name': 'package', 'description': 'Bundle of multiple sessions'},
            {'name': 'course', 'description': 'Multi-session educational course'},
        ]
        
        created_count = 0
        for type_data in service_types:
            service_type, created = ServiceType.objects.get_or_create(
                name=type_data['name'],
                defaults={'description': type_data['description']}
            )
            if created:
                created_count += 1
        
        self.stdout.write(f'Created {created_count} service types')

    def seed_services(self, seeder, num_services=10):
        """Seed services."""
        self.stdout.write('Seeding services...')
        
        # Get all practitioners
        practitioners = list(Practitioner.objects.all())
        if not practitioners:
            self.stdout.write('No practitioners found, skipping service seeding')
            return []
            
        # Get all service types
        service_types = list(ServiceType.objects.all())
        if not service_types:
            self.stdout.write('No service types found, creating default ones')
            self.create_service_types()
            service_types = list(ServiceType.objects.all())
            
        # Get all service categories
        categories = list(ServiceCategory.objects.filter(is_system=True))
        if not categories:
            self.stdout.write('No service categories found, creating default ones')
            self.seed_service_categories()
            categories = list(ServiceCategory.objects.filter(is_system=True))
            
        # Experience levels
        experience_levels = ['beginner', 'intermediate', 'advanced', 'all_levels']
        
        # Create services manually instead of using the seeder
        services_created = 0
        created_services = []
        
        for i in range(num_services):
            try:
                # Create the service
                service = Service.objects.create(
                    name=seeder.faker.catch_phrase(),
                    description=seeder.faker.paragraph(nb_sentences=5),
                    price=random.choice([None, Decimal(random.randint(1000, 50000)) / 100]),
                    duration=random.choice([30, 45, 60, 90, 120]),
                    service_type=random.choice(service_types),
                    category=random.choice(categories) if categories else None,
                    created_at=timezone.now() - datetime.timedelta(days=random.randint(1, 365)),
                    is_active=random.random() < 0.9,  # 90% chance of being active
                    is_featured=random.random() < 0.2,  # 20% chance of being featured
                    max_participants=random.choice([1, 1, 1, 2, 3, 5, 10, 20]),  # More weight to 1
                    min_participants=1,
                    location_type=random.choice(['virtual', 'in_person', 'hybrid']),
                    tags=random.sample(['meditation', 'yoga', 'therapy', 'coaching', 'wellness', 'mindfulness', 'stress-relief', 'anxiety', 'depression', 'trauma', 'healing', 'spiritual', 'energy', 'breathwork', 'movement'], random.randint(2, 5)) if random.random() < 0.7 else None,
                    image_url=f"https://picsum.photos/seed/{uuid.uuid4()}/800/600",  # Always use picsum.photos
                    experience_level=random.choice(experience_levels),
                    what_youll_learn="\n".join([f"- {seeder.faker.sentence()}" for _ in range(random.randint(3, 6))]) if random.random() < 0.8 else None,
                )
                
                # Create practitioner relationships for the service
                # Randomly select 1-3 practitioners for each service
                num_practitioners = random.randint(1, min(3, len(practitioners)))
                selected_practitioners = random.sample(practitioners, num_practitioners)
                
                # First practitioner is primary
                primary_practitioner = selected_practitioners[0]
                ServicePractitioner.objects.create(
                    practitioner=primary_practitioner,
                    service=service,
                    is_primary=True,
                    role='host' if service.max_participants > 1 else 'provider',
                    revenue_share_percentage=Decimal('100.00')
                )
                
                # Add other practitioners with different roles
                for i, practitioner in enumerate(selected_practitioners[1:], 1):
                    role = random.choice(['co-host', 'assistant', 'guest'])
                    # For multiple practitioners, split the revenue share
                    share = Decimal(str(100.0 / (num_practitioners))).quantize(Decimal('0.01'))
                    ServicePractitioner.objects.create(
                        practitioner=practitioner,
                        service=service,
                        is_primary=False,
                        role=role,
                        revenue_share_percentage=share
                    )
                
                # Add languages to the service
                languages = list(Language.objects.all())
                if languages:
                    # Add 1-3 random languages
                    num_languages = random.randint(1, min(3, len(languages)))
                    for lang in random.sample(languages, num_languages):
                        service.languages.add(lang)
                
                # Create benefits for the service
                # Create 3-5 benefits for each service
                num_benefits = random.randint(3, 5)
                for j in range(num_benefits):
                    ServiceBenefit.objects.create(
                        title=seeder.faker.catch_phrase(),
                        description=seeder.faker.paragraph() if random.random() < 0.6 else None,
                        icon=random.choice(['star', 'heart', 'check', 'thumbs-up', 'certificate', 'medal', 'trophy', 'award', 'badge', 'crown']),
                        order=j,
                        service=service
                    )
                
                # Create service sessions for workshop and course service types
                workshop_type = ServiceType.objects.filter(name='workshop').first()
                course_type = ServiceType.objects.filter(name='course').first()
                
                if service.service_type in [workshop_type, course_type]:
                    # Create 1-5 sessions
                    num_sessions = random.randint(1, 5)
                    for j in range(num_sessions):
                        # Session starts between 1 and 30 days from now
                        start_time = timezone.now() + datetime.timedelta(days=random.randint(1, 30), hours=random.randint(0, 12))
                        # Session duration between 1 and 3 hours
                        duration_hours = random.randint(1, 3)
                        end_time = start_time + timezone.timedelta(hours=duration_hours)
                        
                        session = ServiceSession.objects.create(
                            service=service,
                            title=f"Session {j+1}: {seeder.faker.catch_phrase()}" if j > 0 else None,
                            description=seeder.faker.paragraph() if random.random() < 0.7 else None,
                            start_time=start_time,
                            end_time=end_time,
                            duration=duration_hours * 60,  # Convert to minutes
                            max_participants=service.max_participants,
                            sequence_number=j,
                            price=service.price,
                            status='scheduled',
                            agenda=seeder.faker.paragraph() if random.random() < 0.5 else None,
                            what_youll_learn="\n".join([f"- {seeder.faker.sentence()}" for _ in range(random.randint(2, 4))]) if random.random() < 0.7 else None,
                        )
                        
                        # Create agenda items for some sessions
                        if random.random() < 0.7:
                            # Create 2-5 agenda items
                            num_items = random.randint(2, 5)
                            total_minutes = duration_hours * 60
                            minutes_per_item = total_minutes // num_items
                            
                            for k in range(num_items):
                                item_start = session.start_time + datetime.timedelta(minutes=k * minutes_per_item)
                                item_end = item_start + datetime.timedelta(minutes=minutes_per_item)
                                
                                SessionAgendaItem.objects.create(
                                    session=session,
                                    title=seeder.faker.catch_phrase(),
                                    description=seeder.faker.paragraph() if random.random() < 0.6 else None,
                                    start_time=item_start,
                                    end_time=item_end,
                                    order=k,
                                )
                        
                        # Create benefits for each session
                        if random.random() < 0.6:  # 60% chance of having session-specific benefits
                            # Create 2-4 benefits for each session
                            num_benefits = random.randint(2, 4)
                            for k in range(num_benefits):
                                ServiceBenefit.objects.create(
                                    title=seeder.faker.catch_phrase(),
                                    description=seeder.faker.paragraph() if random.random() < 0.6 else None,
                                    icon=random.choice(['star', 'heart', 'check', 'thumbs-up', 'certificate', 'medal', 'trophy', 'award', 'badge', 'crown']),
                                    order=k,
                                    session=session
                                )
                
                created_services.append(service)
                services_created += 1
                
                if services_created % 5 == 0:
                    self.stdout.write(f'Created {services_created} services so far...')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating service: {str(e)}'))
        
        self.stdout.write(f'Created {services_created} services with benefits and sessions')
        return created_services

    def seed_service_relationships(self, num_relationships=5):
        """Seed service relationships for packages and bundles."""
        self.stdout.write('Seeding service relationships...')
        
        # Get all package and bundle services
        package_services = Service.objects.filter(
            service_type__name__in=['package', 'bundle'],
            is_active=True
        )
        
        # Get all session and workshop services that can be included in packages
        includable_services = Service.objects.filter(
            service_type__name__in=['session', 'workshop'],
            is_active=True
        )
        
        if not package_services or not includable_services:
            self.stdout.write('No package/bundle services or includable services found.')
            return
        
        # Create relationships
        relationships_created = 0
        for package in package_services:
            # Each package should include 2-4 services
            num_children = random.randint(2, 4)
            children = random.sample(list(includable_services), min(num_children, len(includable_services)))
            
            for child in children:
                # Skip if the child is the same as the parent
                if child.id == package.id:
                    continue
                    
                # Create relationship
                quantity = random.randint(1, 5)
                discount_percentage = random.uniform(0, 15)
                
                relationship, created = ServiceRelationship.objects.get_or_create(
                    parent_service=package,
                    child_service=child,
                    defaults={
                        'quantity': quantity,
                        'discount_percentage': discount_percentage,
                        'order': random.randint(1, 10),
                        'is_required': random.choice([True, False])
                    }
                )
                
                if created:
                    relationships_created += 1
                    
        self.stdout.write(f'Created {relationships_created} service relationships')

    def seed_bookings(self, seeder, count):
        """Seed bookings."""
        self.stdout.write('Seeding bookings...')
        
        users = User.objects.filter(is_staff=False)
        services = Service.objects.all()
        
        if not users.exists() or not services.exists():
            self.stdout.write(self.style.WARNING('No users or services found. Skipping bookings.'))
            return []
        
        statuses = ['pending', 'confirmed', 'completed', 'canceled']
        canceled_by_options = ['client', 'practitioner']
        
        # Create bookings manually instead of using the seeder
        bookings_created = 0
        created_bookings = []
        
        for i in range(count):
            try:
                user = users[i % users.count()]
                service = services[i % services.count()]
                
                # Get the primary practitioner for this service through the M2M relationship
                service_practitioner = service.practitioner_relationships.filter(is_primary=True).first()
                if not service_practitioner:
                    service_practitioner = service.practitioner_relationships.first()
                    
                if not service_practitioner:
                    self.stdout.write(f"Skipping booking for service {service.id} - no practitioners found")
                    continue
                    
                practitioner = service_practitioner.practitioner
                status = statuses[i % len(statuses)]
                
                # Set appropriate dates based on status
                if status == 'completed':
                    start_time = timezone.make_aware(seeder.faker.past_datetime(start_date='-30d'))
                    duration = service.duration or 60
                    end_time = start_time + timezone.timedelta(minutes=duration)
                    completed_at = end_time
                else:
                    start_time = timezone.make_aware(seeder.faker.future_datetime(end_date='+30d'))
                    duration = service.duration or 60
                    end_time = start_time + timezone.timedelta(minutes=duration)
                    completed_at = None
                
                # Set cancellation details if status is canceled
                if status == 'canceled':
                    canceled_date = timezone.now() - timezone.timedelta(days=random.randint(1, 10))
                    canceled_by = random.choice(canceled_by_options)
                    cancellation_reason = seeder.faker.paragraph() if random.random() < 0.7 else None
                else:
                    canceled_date = None
                    canceled_by = None
                    cancellation_reason = None
                
                booking = Booking.objects.create(
                    user=user,
                    service=service,
                    practitioner=practitioner,
                    start_time=start_time,
                    end_time=end_time,
                    end_time_expected=end_time,
                    status=status,
                    canceled_date=canceled_date,
                    canceled_by=canceled_by,
                    cancellation_reason=cancellation_reason,
                    note=seeder.faker.paragraph() if random.random() < 0.3 else None,
                    location=seeder.faker.address() if random.random() < 0.5 else None,
                    credit_value=service.price,
                    completed_at=completed_at,
                    is_group=service.service_type.name in ['workshop', 'course'] if service.service_type else False,
                    is_canceled=status == 'canceled',
                    description=seeder.faker.paragraph(),
                    title=f"Booking for {service.name}",
                )
                
                created_bookings.append(booking)
                bookings_created += 1
                
                if bookings_created % 10 == 0:
                    self.stdout.write(f'Created {bookings_created} bookings so far...')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating booking: {str(e)}'))
        
        self.stdout.write(f'Created {bookings_created} bookings')
        return created_bookings

    def seed_reviews(self, seeder, count):
        """Seed reviews."""
        self.stdout.write('Seeding reviews...')
        
        # Create review questions if they don't exist
        self.create_review_questions()
        
        # Get completed bookings to add reviews
        completed_bookings = Booking.objects.filter(status='completed')
        questions = ReviewQuestion.objects.all()
        
        if not completed_bookings.exists():
            self.stdout.write(self.style.WARNING('No completed bookings found. Skipping reviews.'))
            return []
        
        # Create reviews for completed bookings
        for i in range(min(count, completed_bookings.count())):
            booking = completed_bookings[i]
            
            # Create review
            seeder.add_entity(Review, 1, {
                'rating': lambda x: seeder.faker.pydecimal(left_digits=1, right_digits=1, positive=True, min_value=3, max_value=5),
                'comment': lambda x: seeder.faker.paragraph(),
                'practitioner': booking.practitioner,
                'booking': booking,
                'user': booking.user,
                'service': booking.service,
                'is_anonymous': lambda x: seeder.faker.boolean(chance_of_getting_true=20),
                'is_verified': True,
                'is_published': True,
                'helpful_votes': lambda x: seeder.faker.random_int(min=0, max=10),
                'unhelpful_votes': lambda x: seeder.faker.random_int(min=0, max=3),
            })
        
        inserted_reviews = seeder.execute()
        
        # Create review answers
        self.create_review_answers(seeder)
        
        self.stdout.write(f'Created {count} reviews with answers')
        return inserted_reviews

    def seed_payment_data(self):
        """Seed payment data."""
        self.stdout.write('Seeding payment data...')
        
        # Get practitioners
        practitioners = list(Practitioner.objects.all())
        if not practitioners:
            self.stdout.write('No practitioners found, skipping payment data')
            return 0
            
        # Get completed bookings
        completed_bookings = Booking.objects.filter(status='completed')
        if not completed_bookings:
            self.stdout.write('No completed bookings found, skipping payment data')
            return 0
            
        # Create credit transactions for practitioners
        transactions_count = 0
        payouts_count = 0
        
        for practitioner in practitioners:
            # Get this practitioner's completed bookings
            practitioner_bookings = completed_bookings.filter(service__practitioner_relationships__practitioner=practitioner)
            
            # Skip if no completed bookings
            if not practitioner_bookings:
                continue
                
            # Calculate total earnings
            total_earnings = sum(booking.service.price for booking in practitioner_bookings if booking.service.price)
            
            # Create credit transactions
            for booking in practitioner_bookings:
                if not booking.service.price:
                    continue
                
                # Check if transaction already exists for this booking
                if PractitionerCreditTransaction.objects.filter(booking=booking).exists():
                    continue
                    
                # Create transaction
                commission_rate = Decimal('0.2')  # 20% commission
                credits_earned = booking.service.price
                commission = credits_earned * commission_rate
                net_credits = credits_earned - commission
                
                PractitionerCreditTransaction.objects.create(
                    practitioner=practitioner,
                    credits_earned=credits_earned,
                    commission=commission,
                    commission_rate=commission_rate,
                    net_credits=net_credits,
                    payout_status='pending',
                    booking=booking,
                    created_at=booking.end_time or timezone.now(),
                    currency='USD'
                )
                transactions_count += 1
            
            # Create payouts (one per month for the past few months)
            for i in range(1, 4):  # Create 3 monthly payouts
                payout_date = timezone.now() - timezone.timedelta(days=30*i)
                
                # Create payout
                PractitionerPayout.objects.create(
                    practitioner=practitioner,
                    payout_date=payout_date,
                    credits_payout=total_earnings * Decimal('0.8') / Decimal('3'),  # 80% of total earnings divided by 3
                    cash_payout=total_earnings * Decimal('0.8') / Decimal('3'),  # Same as credits
                    commission_collected=total_earnings * Decimal('0.2') / Decimal('3'),  # 20% commission
                    status='completed',
                    payment_method='bank_transfer',
                    created_at=payout_date,
                    currency='USD'
                )
                payouts_count += 1
        
        self.stdout.write(f'Created {transactions_count} practitioner credit transactions and {payouts_count} payouts')
        return transactions_count + payouts_count

    def create_review_questions(self):
        """Create standard review questions if they don't exist."""
        questions = [
            {
                'question': 'How would you rate your overall experience?',
                'question_type': 'rating',
                'applies_to': 'both',
                'is_required': True,
                'order': 1,
            },
            {
                'question': 'Was the practitioner knowledgeable?',
                'question_type': 'rating',
                'applies_to': 'practitioner',
                'is_required': True,
                'order': 2,
            },
            {
                'question': 'How was the quality of the service?',
                'question_type': 'rating',
                'applies_to': 'service',
                'is_required': True,
                'order': 3,
            },
            {
                'question': 'Would you recommend this to others?',
                'question_type': 'boolean',
                'applies_to': 'both',
                'is_required': True,
                'order': 4,
            },
            {
                'question': 'Any additional comments?',
                'question_type': 'text',
                'applies_to': 'both',
                'is_required': False,
                'order': 5,
            },
        ]
        
        for q_data in questions:
            ReviewQuestion.objects.get_or_create(
                question=q_data['question'],
                defaults={
                    'question_type': q_data['question_type'],
                    'applies_to': q_data['applies_to'],
                    'is_required': q_data['is_required'],
                    'order': q_data['order'],
                    'is_active': True,
                }
            )
        
        return ReviewQuestion.objects.all()

    def create_review_answers(self, seeder):
        """Create review answers for existing reviews and questions."""
        # Get all reviews
        reviews = Review.objects.all()
        if not reviews:
            self.stdout.write('No reviews found, skipping review answers')
            return []
            
        # Get all questions
        questions = ReviewQuestion.objects.all()
        if not questions:
            self.stdout.write('No review questions found, skipping review answers')
            return []
            
        # Create answers
        answers = []
        
        for review in reviews:
            # Each review should answer 2-4 questions
            selected_questions = random.sample(list(questions), min(random.randint(2, 4), len(questions)))
            
            for question in selected_questions:
                # Check if answer already exists for this review and question
                if ReviewAnswer.objects.filter(review=review, question=question).exists():
                    continue
                    
                # Create the answer based on question type
                if question.question_type == 'text':
                    text_content = random.choice([
                        'Great experience!',
                        'Very helpful session.',
                        'The practitioner was very knowledgeable.',
                        'I learned a lot from this session.',
                        'Would definitely recommend to others.',
                        'Exactly what I needed.',
                        'Very professional and helpful.',
                        'Exceeded my expectations.',
                        'Good value for the price.',
                        'The practitioner was very attentive.'
                    ])
                    answer = ReviewAnswer.objects.create(
                        review=review,
                        question=question,
                        text_answer=text_content
                    )
                elif question.question_type == 'rating':
                    rating_value = random.randint(3, 5)  # 3-5 star ratings
                    answer = ReviewAnswer.objects.create(
                        review=review,
                        question=question,
                        rating_answer=rating_value
                    )
                elif question.question_type == 'boolean':
                    bool_value = random.choice([True, False])
                    answer = ReviewAnswer.objects.create(
                        review=review,
                        question=question,
                        boolean_answer=bool_value
                    )
                else:
                    continue  # Skip unknown question types
                
                answers.append(answer)
        
        self.stdout.write(f'Created {len(answers)} review answers')
        return answers

    def seed_many_to_many_relationships(self):
        """
        Seed many-to-many relationships between models.
        """
        self.stdout.write('Seeding many-to-many relationships...')
        
        # Get all practitioners
        practitioners = Practitioner.objects.all()
        if not practitioners:
            self.stdout.write('No practitioners found. Skipping many-to-many relationships.')
            return
        
        # Get all topics, specializations, styles, certifications, educations, and modalities
        topics = self.seed_topics()
        specializations = self.seed_specializations()
        styles = self.seed_styles()
        certifications = self.seed_certifications()
        educations = self.seed_educations()
        modalities = self.seed_modalities()
        
        practitioners_count = 0
        
        for practitioner in practitioners:
            # Add random topics
            if topics:
                practitioner.topics.add(*random.sample(topics, min(3, len(topics))))
            
            # Add random specializations
            if specializations:
                practitioner.specializations.add(*random.sample(specializations, min(2, len(specializations))))
            
            # Add random styles
            if styles:
                practitioner.styles.add(*random.sample(styles, min(2, len(styles))))
            
            # Add random certifications
            if certifications:
                practitioner.certifications.add(*random.sample(certifications, min(2, len(certifications))))
            
            # Add random educations
            if educations:
                practitioner.educations.add(*random.sample(educations, min(1, len(educations))))
                
            # Add random modalities
            if modalities:
                practitioner.modalities.add(*random.sample(modalities, min(3, len(modalities))))
                self.stdout.write(f'Added {min(3, len(modalities))} modalities to practitioner {practitioner.id}')
            
            practitioners_count += 1
            
        self.stdout.write(f'Added many-to-many relationships for {practitioners_count} practitioners')
        
        # Add modalities to users
        users = User.objects.all()
        users_with_modalities = 0
        
        for user in random.sample(list(users), min(len(users), 10)):
            if modalities:
                user.modalities.add(*random.sample(modalities, min(2, len(modalities))))
                users_with_modalities += 1
        
        self.stdout.write(f'Added modalities to {users_with_modalities} users')
        
        # Create user favorites
        self.seed_user_favorites()
        
        # Add topics to bookings
        bookings = Booking.objects.all()
        bookings_count = 0
        
        for booking in bookings:
            if topics and random.random() < 0.5:  # 50% chance of having topics
                booking.topics.add(*random.sample(topics, min(3, len(topics))))
                bookings_count += 1
        
        self.stdout.write(f'Added topics to {bookings_count} bookings')
        
        # Create practitioner credit transactions and payouts
        self.seed_payment_data()
        
    def seed_out_of_office(self, practitioners):
        """Seed out of office periods for practitioners."""
        self.stdout.write('Seeding out of office periods...')
        
        out_of_office_count = 0
        
        for practitioner in practitioners:
            # 30% chance of having out of office periods
            if random.random() < 0.3:
                # Create 1-3 out of office periods
                num_periods = random.randint(1, 3)
                
                for _ in range(num_periods):
                    # Generate random date range in the future
                    start_date = timezone.now().date() + datetime.timedelta(days=random.randint(10, 60))
                    end_date = start_date + datetime.timedelta(days=random.randint(1, 14))
                    
                    OutOfOffice.objects.create(
                        id=uuid.uuid4(),
                        created_at=timezone.now(),
                        from_date=start_date,
                        to_date=end_date,
                        title=random.choice([
                            "Vacation", 
                            "Personal Leave", 
                            "Professional Development", 
                            "Conference", 
                            "Family Emergency"
                        ]),
                        updated_at=timezone.now(),
                        practitioner=practitioner,
                        is_archived=False
                    )
                    out_of_office_count += 1
        
        self.stdout.write(f'Created {out_of_office_count} out of office periods')
        return out_of_office_count
    
    def seed_questions(self):
        """Seed questions for practitioners."""
        self.stdout.write('Seeding practitioner questions...')
        
        question_texts = [
            "What inspired you to become a practitioner?",
            "How would you describe your approach to wellness?",
            "What types of clients do you work best with?",
            "What should clients expect in their first session?",
            "How do you measure progress with your clients?",
            "What continuing education have you pursued recently?",
            "What makes your practice unique?",
            "How do you incorporate client feedback into your practice?",
            "What are your specialties or areas of expertise?",
            "How do you stay current with research in your field?"
        ]
        
        questions_count = 0
        
        for i, text in enumerate(question_texts):
            Question.objects.get_or_create(
                id=uuid.uuid4(),
                title=text,
                order=i+1
            )
            questions_count += 1
        
        self.stdout.write(f'Created/verified {questions_count} practitioner questions')
        return questions_count
    
    def seed_review_votes(self, reviews, users):
        """Seed votes for reviews."""
        self.stdout.write('Seeding review votes...')
        
        votes_count = 0
        
        # For each review, add 0-5 votes
        for review in reviews:
            # Skip some reviews
            if random.random() < 0.3:
                continue
                
            # Determine how many votes (0-5)
            num_votes = random.randint(0, 5)
            
            # Get random users who are not the review author
            available_users = [u for u in users if u != review.user]
            
            if len(available_users) < num_votes:
                num_votes = len(available_users)
                
            voters = random.sample(available_users, num_votes)
            
            for voter in voters:
                # Check if vote already exists
                if ReviewVote.objects.filter(review=review, user=voter).exists():
                    continue
                    
                # 80% chance of helpful vote
                is_helpful = random.random() < 0.8
                
                ReviewVote.objects.create(
                    id=uuid.uuid4(),
                    review=review,
                    user=voter,
                    is_helpful=is_helpful,
                    created_at=timezone.now()
                )
                votes_count += 1
                
                # Update the review's helpful_votes count
                if is_helpful:
                    review.helpful_votes += 1
            
            # Save the review if any helpful votes were added
            if review.helpful_votes > 0:
                review.save()
        
        self.stdout.write(f'Created {votes_count} review votes')
        return votes_count

    def seed_topics(self):
        """Seed topics."""
        self.stdout.write('Seeding topics...')
        
        topics = []
        topic_names = ['Wellness', 'Mental Health', 'Fitness', 'Nutrition', 'Meditation', 'Yoga']
        
        for topic_name in topic_names:
            topic, created = Topic.objects.get_or_create(content=topic_name)
            topics.append(topic)
            
        self.stdout.write(f'Created/verified {len(topics)} topics')
        return topics
    
    def seed_specializations(self):
        """Seed specializations."""
        self.stdout.write('Seeding specializations...')
        
        specializations = []
        spec_names = ['Meditation Coach', 'Yoga Instructor', 'Nutritionist', 'Therapist', 'Personal Trainer']
        
        for spec_name in spec_names:
            spec, created = Specialize.objects.get_or_create(content=spec_name)
            specializations.append(spec)
            
        self.stdout.write(f'Created/verified {len(specializations)} specializations')
        return specializations
    
    def seed_styles(self):
        """Seed styles."""
        self.stdout.write('Seeding styles...')
        
        styles = []
        style_names = ['Gentle', 'Intense', 'Holistic', 'Focused']
        
        for style_name in style_names:
            style, created = Style.objects.get_or_create(content=style_name)
            styles.append(style)
            
        self.stdout.write(f'Created/verified {len(styles)} styles')
        return styles
    
    def seed_modalities(self):
        """Seed modalities."""
        self.stdout.write('Seeding modalities...')
        
        modalities = []
        modality_names = ['In-Person', 'Virtual', 'Chat', 'Phone Call', 'Video Call']
        
        for modality_name in modality_names:
            try:
                modality = Modality.objects.get(name=modality_name)
            except Modality.DoesNotExist:
                modality = Modality.objects.create(
                    id=uuid.uuid4(),
                    name=modality_name,
                    description=f"{modality_name} sessions"
                )
            modalities.append(modality)
            
        self.stdout.write(f'Created/verified {len(modalities)} modalities')
        return modalities
    
    def seed_certifications(self):
        """Seed certifications."""
        self.stdout.write('Seeding certifications...')
        
        certifications = []
        cert_infos = [
            ('Yoga Alliance 200-Hour', 'Yoga Alliance'),
            ('Certified Personal Trainer', 'National Academy of Sports Medicine'),
            ('Nutritionist Certification', 'American Fitness Professionals Association'),
            ('Meditation Teacher Training', 'Mindfulness Center'),
            ('Life Coach Certification', 'International Coaching Federation')
        ]
        
        for i, cert_info in enumerate(cert_infos):
            try:
                cert = Certification.objects.get(certificate=cert_info[0], institution=cert_info[1])
            except Certification.DoesNotExist:
                cert = Certification.objects.create(
                    id=uuid.uuid4(),
                    certificate=cert_info[0],
                    institution=cert_info[1],
                    order=i + 1
                )
            certifications.append(cert)
            
        self.stdout.write(f'Created/verified {len(certifications)} certifications')
        return certifications
    
    def seed_educations(self):
        """Seed educations."""
        self.stdout.write('Seeding educations...')
        
        educations = []
        edu_infos = [
            ('Bachelor of Science in Psychology', 'Stanford University'),
            ('Master of Arts in Counseling', 'Columbia University'),
            ('Doctorate in Physical Therapy', 'University of California'),
            ('Bachelor of Science in Nutrition', 'Cornell University'),
            ('Master of Science in Exercise Science', 'University of Michigan')
        ]
        
        for i, edu_info in enumerate(edu_infos):
            try:
                edu = Education.objects.get(degree=edu_info[0], educational_institute=edu_info[1])
            except Education.DoesNotExist:
                edu = Education.objects.create(
                    id=uuid.uuid4(),
                    degree=edu_info[0],
                    educational_institute=edu_info[1],
                    order=i + 1
                )
            educations.append(edu)
            
        self.stdout.write(f'Created/verified {len(educations)} educations')
        return educations
    
    def seed_languages(self):
        """Seed languages."""
        self.stdout.write('Seeding languages...')
        
        languages = []
        language_infos = [
            ('English', 'en', 'English'),
            ('Spanish', 'es', 'Español'),
            ('French', 'fr', 'Français'),
            ('German', 'de', 'Deutsch'),
            ('Chinese', 'zh', '中文'),
            ('Japanese', 'ja', '日本語'),
            ('Korean', 'ko', '한국어'),
            ('Italian', 'it', 'Italiano'),
            ('Portuguese', 'pt', 'Português'),
            ('Russian', 'ru', 'Русский')
        ]
        
        for name, code, native_name in language_infos:
            try:
                language = Language.objects.get(code=code)
            except Language.DoesNotExist:
                language = Language.objects.create(
                    id=uuid.uuid4(),
                    name=name,
                    code=code,
                    native_name=native_name
                )
            languages.append(language)
            
        self.stdout.write(f'Created/verified {len(languages)} languages')
        return languages
        
    def seed_location_data(self):
        """Seed location data using the import_location_data command."""
        from django.core.management import call_command
        
        self.stdout.write('Seeding location data...')
        
        # Call the import_location_data command with the download flag
        call_command('import_location_data', download=True)
        
        # Report the counts
        states_count = State.objects.count()
        cities_count = City.objects.count()
        zip_codes_count = ZipCode.objects.count()
        
        self.stdout.write(self.style.SUCCESS(
            f'Imported {states_count} states, {cities_count} cities, and {zip_codes_count} zip codes'
        ))
        
    def seed_practitioner_locations(self, seeder):
        """Seed practitioner locations."""
        self.stdout.write('Seeding practitioner locations...')
        
        # Make sure we have location data
        if State.objects.count() == 0 or City.objects.count() == 0:
            self.stdout.write(self.style.WARNING('Location data is missing. Please run import_location_data first.'))
            return
        
        practitioners = Practitioner.objects.all()
        locations_created = 0
        
        for practitioner in practitioners:
            try:
                # Get random state and city
                state = State.objects.order_by('?').first()
                if not state:
                    self.stdout.write(self.style.WARNING('No states found in the database. Skipping location creation.'))
                    continue
                
                cities = City.objects.filter(state=state)
                if not cities.exists():
                    self.stdout.write(self.style.WARNING(f'No cities found for state {state.name}. Trying another state.'))
                    continue
                
                city = cities.order_by('?').first()
                
                # Get a random zip code for this city if available
                zip_code = ZipCode.objects.filter(city=city).order_by('?').first()
                zip_code_str = zip_code.code if zip_code else f"{random.randint(10000, 99999)}"
                
                # Determine if this practitioner offers virtual, in-person, or both
                is_virtual = random.random() < 0.8  # 80% chance of offering virtual
                is_in_person = random.random() < 0.6  # 60% chance of offering in-person
                
                # Ensure at least one service type is offered
                if not is_virtual and not is_in_person:
                    is_virtual = True
                
                # Create the practitioner location
                location = PractitionerLocation.objects.create(
                    practitioner=practitioner,
                    address_line1=f"{random.randint(100, 9999)} {seeder.faker.street_name()}",
                    address_line2=seeder.faker.secondary_address() if random.random() < 0.3 else "",
                    city=city,
                    state=state,
                    zip_code=zip_code_str,
                    latitude=city.latitude if hasattr(city, 'latitude') and city.latitude else random.uniform(25, 48),
                    longitude=city.longitude if hasattr(city, 'longitude') and city.longitude else random.uniform(-125, -70),
                    is_primary=True,
                    is_virtual=is_virtual,
                    is_in_person=is_in_person
                )
                
                locations_created += 1
                
                if locations_created % 10 == 0:
                    self.stdout.write(f'Created {locations_created} practitioner locations so far...')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating location for practitioner {practitioner.id}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'Created {locations_created} practitioner locations'))
    
    def seed_scheduling_data(self):
        """Seed scheduling data including preferences, schedules, and availability."""
        self.stdout.write('Seeding scheduling data...')
        
        try:
            # Get all practitioners and services
            practitioners = list(Practitioner.objects.all())
            self.stdout.write(f'Found {len(practitioners)} practitioners')
            
            services = list(Service.objects.filter(is_active=True))
            self.stdout.write(f'Found {len(services)} active services')
            
            if not practitioners:
                self.stdout.write(self.style.WARNING('No practitioners found. Skipping scheduling data.'))
                return
                
            if not services:
                self.stdout.write(self.style.WARNING('No active services found. Skipping scheduling data.'))
                return
            
            # Common US timezones
            us_timezones = [
                'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific', 
                'US/Alaska', 'US/Hawaii', 'America/New_York', 'America/Chicago',
                'America/Denver', 'America/Los_Angeles'
            ]
            
            # 1. Create schedule preferences for each practitioner
            self.stdout.write('Creating schedule preferences...')
            preferences_created = 0
            
            for i, practitioner in enumerate(practitioners):
                self.stdout.write(f'Processing practitioner {i+1}/{len(practitioners)}')
                # Check if preference already exists
                try:
                    SchedulePreference.objects.get(practitioner=practitioner)
                    self.stdout.write(f'Preference already exists for practitioner {practitioner.user_id}')
                except SchedulePreference.DoesNotExist:
                    try:
                        SchedulePreference.objects.create(
                            practitioner=practitioner,
                            timezone=random.choice(us_timezones),
                            holidays='["2025-01-01", "2025-12-25", "2025-07-04", "2025-11-26"]',
                            holidays_on=random.choice([True, False]),
                            hours_buffer=random.choice([0, 1, 2, 4, 12, 24]),
                            days_buffer_min=random.choice([0, 1, 2]),
                            days_buffer_max=random.choice([14, 30, 60, 90]),
                            booking_buffer_on=True,
                            is_active=True
                        )
                        preferences_created += 1
                        self.stdout.write(f'Created preference for practitioner {practitioner.user_id}')
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Error creating preference for practitioner {practitioner.user_id}: {str(e)}'))
            
            self.stdout.write(f'Created {preferences_created} new schedule preferences')
            
            # 2. Create named schedules for each practitioner
            self.stdout.write('Creating named schedules...')
            self.seed_named_schedules(practitioners, us_timezones)
            
            # 3. Create service schedules for each practitioner's services
            self.stdout.write('Creating service schedules...')
            schedules_created = 0
            
            for i, practitioner in enumerate(practitioners):
                self.stdout.write(f'Processing schedules for practitioner {i+1}/{len(practitioners)}')
                # Get services offered by this practitioner
                try:
                    practitioner_services = list(Service.objects.filter(
                        practitioner_relationships__practitioner=practitioner,
                        is_active=True
                    ).distinct())
                    
                    self.stdout.write(f'Found {len(practitioner_services)} services for practitioner {practitioner.user_id}')
                    
                    if not practitioner_services:
                        continue
                        
                    # Create schedules for each service
                    for service in practitioner_services:
                        # Randomly select 2-5 days of the week for this service
                        days_count = random.randint(2, 5)
                        days = random.sample(range(0, 7), days_count)  # 0=Monday, 6=Sunday
                        
                        for day in days:
                            # Morning schedule (8am-12pm)
                            if random.choice([True, False]):
                                start_hour = random.randint(8, 10)
                                end_hour = random.randint(start_hour + 2, 12)
                                try:
                                    ServiceSchedule.objects.create(
                                        practitioner=practitioner,
                                        service=service,
                                        day=day,
                                        start_time=datetime.time(start_hour, 0),
                                        end_time=datetime.time(end_hour, 0),
                                        is_active=True
                                    )
                                    schedules_created += 1
                                except Exception as e:
                                    self.stdout.write(self.style.ERROR(
                                        f'Error creating morning schedule for practitioner {practitioner.user_id}, '
                                        f'service {service.id}, day {day}: {str(e)}'
                                    ))
                            
                            # Afternoon schedule (1pm-5pm)
                            if random.choice([True, False]):
                                start_hour = random.randint(13, 15)
                                end_hour = random.randint(start_hour + 2, 17)
                                try:
                                    ServiceSchedule.objects.create(
                                        practitioner=practitioner,
                                        service=service,
                                        day=day,
                                        start_time=datetime.time(start_hour, 0),
                                        end_time=datetime.time(end_hour, 0),
                                        is_active=True
                                    )
                                    schedules_created += 1
                                except Exception as e:
                                    self.stdout.write(self.style.ERROR(
                                        f'Error creating afternoon schedule for practitioner {practitioner.user_id}, '
                                        f'service {service.id}, day {day}: {str(e)}'
                                    ))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error processing services for practitioner {practitioner.user_id}: {str(e)}'))
            
            self.stdout.write(f'Created {schedules_created} service schedules')
            
            # 3. Generate availability slots for the next 14 days (reduced from 30 for performance)
            self.stdout.write('Creating availability slots...')
            today = timezone.now().date()
            availability_created = 0
            
            # Get all service schedules
            service_schedules = list(ServiceSchedule.objects.filter(is_active=True))
            self.stdout.write(f'Found {len(service_schedules)} active service schedules')
            
            if not service_schedules:
                self.stdout.write(self.style.WARNING('No service schedules found. Skipping availability creation.'))
                return
            
            for days_ahead in range(1, 15):  # Next 14 days (reduced from 30)
                self.stdout.write(f'Processing day {days_ahead}/14')
                target_date = today + datetime.timedelta(days=days_ahead)
                weekday = target_date.weekday()  # 0=Monday, 6=Sunday
                
                # Find schedules for this weekday
                day_schedules = [s for s in service_schedules if s.day == weekday]
                self.stdout.write(f'Found {len(day_schedules)} schedules for day {weekday}')
                
                for schedule in day_schedules:
                    # Create availability for this schedule on this date
                    # Sometimes skip to simulate not all slots being available
                    if random.random() < 0.8:  # 80% chance of creating availability
                        try:
                            ScheduleAvailability.objects.create(
                                practitioner=schedule.practitioner,
                                service_schedule=schedule,
                                date=target_date,
                                day=weekday,
                                start_time=schedule.start_time,
                                end_time=schedule.end_time,
                                is_active=True
                            )
                            availability_created += 1
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(
                                f'Error creating availability for schedule {schedule.id}, '
                                f'date {target_date}: {str(e)}'
                            ))
            
            # Count created objects
            preferences_count = SchedulePreference.objects.count()
            schedules_count = ServiceSchedule.objects.count()
            availability_count = ScheduleAvailability.objects.count()
            
            self.stdout.write(self.style.SUCCESS(
                f'Created {preferences_created} new schedule preferences (total: {preferences_count}), '
                f'{schedules_created} service schedules (total: {schedules_count}), and '
                f'{availability_created} availability slots (total: {availability_count})'
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error seeding scheduling data: {str(e)}'))

    def seed_named_schedules(self, practitioners, timezones):
        """Seed named schedules and time slots for practitioners."""
        self.stdout.write('Seeding named schedules...')
        
        # Sample schedule names
        schedule_names = [
            'Standard Hours', 'Summer Hours', 'Winter Hours', 'Holiday Schedule',
            'Weekday Schedule', 'Weekend Schedule', 'Morning Hours', 'Evening Hours',
            'Flexible Schedule', 'Limited Availability', 'Full Availability'
        ]
        
        schedules_created = 0
        time_slots_created = 0
        
        for i, practitioner in enumerate(practitioners):
            self.stdout.write(f'Creating named schedules for practitioner {i+1}/{len(practitioners)}')
            
            # Create 1-3 named schedules for each practitioner
            num_schedules = random.randint(1, 3)
            
            # Ensure unique names for this practitioner
            practitioner_schedule_names = random.sample(schedule_names, num_schedules)
            
            for j, name in enumerate(practitioner_schedule_names):
                try:
                    # First schedule is default
                    is_default = (j == 0)
                    
                    schedule = Schedule.objects.create(
                        name=name,
                        practitioner=practitioner,
                        is_default=is_default,
                        timezone=random.choice(timezones),
                        description=f"Schedule for {name.lower()} availability",
                        is_active=True
                    )
                    schedules_created += 1
                    
                    # Create time slots for this schedule
                    # Randomly select 3-5 days of the week
                    days_count = random.randint(3, 5)
                    days = random.sample(range(0, 7), days_count)  # 0=Monday, 6=Sunday
                    
                    for day in days:
                        # Morning slot (8am-12pm)
                        if random.choice([True, False, True]):  # 2/3 chance for morning slots
                            start_hour = random.randint(8, 10)
                            end_hour = random.randint(start_hour + 1, 12)
                            try:
                                ScheduleTimeSlot.objects.create(
                                    schedule=schedule,
                                    day=day,
                                    start_time=datetime.time(start_hour, 0),
                                    end_time=datetime.time(end_hour, 0),
                                    is_active=True
                                )
                                time_slots_created += 1
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(
                                    f'Error creating morning time slot for schedule {schedule.id}, day {day}: {str(e)}'
                                ))
                        
                        # Afternoon slot (1pm-5pm)
                        if random.choice([True, False, True]):  # 2/3 chance for afternoon slots
                            start_hour = random.randint(13, 15)
                            end_hour = random.randint(start_hour + 1, 17)
                            try:
                                ScheduleTimeSlot.objects.create(
                                    schedule=schedule,
                                    day=day,
                                    start_time=datetime.time(start_hour, 0),
                                    end_time=datetime.time(end_hour, 0),
                                    is_active=True
                                )
                                time_slots_created += 1
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(
                                    f'Error creating afternoon time slot for schedule {schedule.id}, day {day}: {str(e)}'
                                ))
                        
                        # Evening slot (6pm-9pm)
                        if random.choice([True, False]):  # 50% chance for evening slots
                            start_hour = random.randint(18, 19)
                            end_hour = random.randint(start_hour + 1, 21)
                            try:
                                ScheduleTimeSlot.objects.create(
                                    schedule=schedule,
                                    day=day,
                                    start_time=datetime.time(start_hour, 0),
                                    end_time=datetime.time(end_hour, 0),
                                    is_active=True
                                )
                                time_slots_created += 1
                            except Exception as e:
                                self.stdout.write(self.style.ERROR(
                                    f'Error creating evening time slot for schedule {schedule.id}, day {day}: {str(e)}'
                                ))
                                
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error creating schedule for practitioner {practitioner.user_id}: {str(e)}'))
        
        self.stdout.write(f'Created {schedules_created} named schedules with {time_slots_created} time slots')
        return schedules_created, time_slots_created

    def seed_user_favorites(self):
        """Seed user favorites."""
        self.stdout.write('Seeding user favorites...')
        
        users = User.objects.filter(is_practitioner=False)
        practitioners = Practitioner.objects.all()
        
        if not users or not practitioners:
            self.stdout.write('No users or practitioners found, skipping user favorites')
            return 0
            
        favorites_count = 0
        
        for user in users:
            # 40% chance of having favorites
            if random.random() < 0.4:
                # Get 1-2 random practitioners to favorite
                num_favorites = random.randint(1, min(2, len(practitioners)))
                fav_practitioners = random.sample(list(practitioners), num_favorites)
                
                for practitioner in fav_practitioners:
                    # Skip if already favorited
                    if not UserFavoritePractitioner.objects.filter(user=user, practitioner=practitioner).exists():
                        UserFavoritePractitioner.objects.create(
                            user=user,
                            practitioner=practitioner
                        )
                        favorites_count += 1
        
        self.stdout.write(f'Created {favorites_count} user favorites')
        return favorites_count

    def seed_community_data(self, seeder):
        """Seed community data."""
        self.stdout.write('Seeding community data...')
        
        # Seed community topics
        topics = self.seed_community_topics()
        
        # Seed community posts
        self.seed_community_posts(seeder, topics)
        
        # Seed community post comments
        self.seed_community_post_comments(seeder)
        
        # Seed community post reactions
        self.seed_community_post_reactions(seeder)
        
        # Seed community follows
        self.seed_community_follows(seeder)
        
        self.stdout.write('Finished seeding community data')
        
    def seed_community_topics(self):
        """Seed community topics."""
        self.stdout.write('Seeding community topics...')
        
        topics = []
        topic_names = ['Wellness', 'Mental Health', 'Fitness', 'Nutrition', 'Meditation', 'Yoga']
        
        for topic_name in topic_names:
            topic, created = CommunityTopic.objects.get_or_create(
                name=topic_name,
                defaults={'slug': topic_name.lower().replace(' ', '-')}
            )
            topics.append(topic)
            
        self.stdout.write(f'Created/verified {len(topics)} community topics')
        return topics
    
    def seed_community_posts(self, seeder, topics):
        """Seed community posts."""
        self.stdout.write('Seeding community posts...')
        
        practitioners = Practitioner.objects.all()
        
        if not practitioners:
            self.stdout.write('No practitioners found, skipping community posts')
            return []
        
        posts_created = 0
        created_posts = []
        
        for i in range(20):
            try:
                practitioner = practitioners[i % practitioners.count()]
                
                # Select 1-3 random topics
                selected_topics = random.sample(topics, min(3, len(topics)))
                
                post = Post.objects.create(
                    practitioner=practitioner,
                    title=seeder.faker.catch_phrase(),
                    content=seeder.faker.paragraph(nb_sentences=5),
                    visibility='public',
                    created_at=timezone.now(),
                    is_pinned=random.random() < 0.2,  # 20% chance of being pinned
                    is_featured=random.random() < 0.1  # 10% chance of being featured
                )
                
                # Add topics to the post
                for topic in selected_topics:
                    post.topics.add(topic)
                
                created_posts.append(post)
                posts_created += 1
                
                if posts_created % 5 == 0:
                    self.stdout.write(f'Created {posts_created} community posts so far...')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating community post: {str(e)}'))
        
        self.stdout.write(f'Created {posts_created} community posts')
        return created_posts
    
    def seed_community_post_comments(self, seeder):
        """Seed community post comments."""
        self.stdout.write('Seeding community post comments...')
        
        posts = Post.objects.all()
        users = User.objects.all()
        
        if not posts or not users:
            self.stdout.write('No community posts or users found, skipping comments')
            return []
        
        comments_created = 0
        
        for post in posts:
            # Create 1-5 comments for each post
            num_comments = random.randint(1, 5)
            
            for i in range(num_comments):
                try:
                    user = users.order_by('?').first()
                    
                    comment = PostComment.objects.create(
                        post=post,
                        user=user,
                        content=seeder.faker.paragraph(nb_sentences=2),
                        created_at=timezone.now()
                    )
                    
                    comments_created += 1
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error creating community post comment: {str(e)}'))
        
        self.stdout.write(f'Created {comments_created} community post comments')
        
    def seed_community_post_reactions(self, seeder):
        """Seed community post reactions."""
        self.stdout.write('Seeding community post reactions...')
        
        posts = Post.objects.all()
        users = User.objects.all()
        
        if not posts or not users:
            self.stdout.write('No community posts or users found, skipping reactions')
            return []
        
        reactions_created = 0
        
        for post in posts:
            # Create 1-5 reactions for each post
            num_reactions = random.randint(1, 5)
            
            for i in range(num_reactions):
                try:
                    user = users.order_by('?').first()
                    
                    reaction = PostReaction.objects.create(
                        post=post,
                        user=user,
                        reaction_type=random.choice(['like', 'heart']),
                        created_at=timezone.now()
                    )
                    
                    reactions_created += 1
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error creating community post reaction: {str(e)}'))
        
        self.stdout.write(f'Created {reactions_created} community post reactions')
        
    def seed_community_follows(self, seeder):
        """Seed community follows."""
        self.stdout.write('Seeding community follows...')
        
        practitioners = Practitioner.objects.all()
        users = User.objects.all()
        
        if not practitioners or not users:
            self.stdout.write('No practitioners or users found, skipping community follows')
            return []
        
        follows_created = 0
        
        for user in users:
            # Create 1-3 follows for each user
            num_follows = random.randint(1, 3)
            
            for i in range(num_follows):
                try:
                    practitioner = practitioners.order_by('?').first()
                    
                    follow = CommunityFollow.objects.create(
                        user=user,
                        practitioner=practitioner,
                        created_at=timezone.now()
                    )
                    
                    follows_created += 1
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error creating community follow: {str(e)}'))
        
        self.stdout.write(f'Created {follows_created} community follows')
        
    def seed_messaging_data(self, seeder):
        """Seed messaging data."""
        self.stdout.write('Seeding messaging data...')
        
        users = User.objects.all()
        
        if not users:
            self.stdout.write('No users found, skipping messaging data')
            return []
        
        conversations_created = 0
        messages_created = 0
        
        for i in range(50):
            try:
                user1 = users[i % users.count()]
                user2 = User.objects.order_by('?').first()
                
                if user1 == user2:
                    continue
                
                # Create conversation
                conversation = Conversation.objects.create(
                    created_at=timezone.now(),
                    is_active=True,
                    title=f"Conversation between {user1.email} and {user2.email}"
                )
                
                # Add participants
                conversation.participants.add(user1, user2)
                
                conversations_created += 1
                
                # Create 1-10 messages for each conversation
                num_messages = random.randint(1, 10)
                
                for j in range(num_messages):
                    try:
                        sender = user1 if j % 2 == 0 else user2
                        
                        message = Message.objects.create(
                            conversation=conversation,
                            sender=sender,
                            content=seeder.faker.paragraph(nb_sentences=2),
                            message_type='text',
                            created_at=timezone.now()
                        )
                        
                        messages_created += 1
                        
                        # Create a message receipt for the recipient
                        recipient = user2 if j % 2 == 0 else user1
                        
                        MessageReceipt.objects.create(
                            message=message,
                            user=recipient,
                            is_read=random.choice([True, False]),
                            delivered_at=timezone.now()
                        )
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Error creating message: {str(e)}'))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating conversation: {str(e)}'))
        
        self.stdout.write(f'Created {conversations_created} conversations with {messages_created} messages')

    def seed_orders(self, seeder):
        """Seed orders."""
        self.stdout.write('Seeding orders...')
        
        users = User.objects.all()
        services = Service.objects.all()
        practitioners = Practitioner.objects.all()
        
        if not users or not services or not practitioners:
            self.stdout.write('No users, services, or practitioners found, skipping orders')
            return []
        
        orders_created = 0
        
        for i in range(50):
            try:
                user = users.order_by('?').first()
                service = services.order_by('?').first()
                practitioner = service.practitioner_relationships.filter(is_primary=True).first()
                
                # If no primary practitioner is set, use the first one
                if not practitioner:
                    practitioner = service.practitioner_relationships.first()
                    
                # If still no practitioner, use a random one
                if not practitioner:
                    practitioner = practitioners.order_by('?').first()
                    practitioner_obj = practitioner
                else:
                    practitioner_obj = practitioner.practitioner
                
                # Generate a random amount between $10 and $500
                amount = round(random.uniform(10, 500), 2)
                
                # Choose a random status with weighted probabilities
                status_choices = ['pending', 'processing', 'completed', 'failed', 'refunded']
                status_weights = [0.1, 0.1, 0.6, 0.1, 0.1]  # 60% completed, 10% each for others
                status = random.choices(status_choices, weights=status_weights, k=1)[0]
                
                # Create the order
                order = Order.objects.create(
                    user=user,
                    method='stripe',
                    stripe_payment_intent_id=f'pi_{seeder.faker.uuid4()}',
                    amount=amount,
                    status=status,
                    created_at=timezone.now(),
                    updated_at=timezone.now(),
                    service=service,
                    practitioner=practitioner_obj,
                    stripe_payment_method_id=f'pm_{seeder.faker.uuid4()}',
                    metadata={
                        'source': 'seed_script',
                        'test': True
                    },
                    order_type='direct',
                    currency='USD'
                )
                
                orders_created += 1
                
                if orders_created % 10 == 0:
                    self.stdout.write(f'Created {orders_created} orders so far...')
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating order: {str(e)}'))
        
        self.stdout.write(f'Created {orders_created} orders')
