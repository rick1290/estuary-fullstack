"""
Management command to seed the database with test data using django-seed.
Fixed version to work with newer Django versions.
"""
from django.core.management.base import BaseCommand
from django_seed import Seed
from django.db import transaction
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

# Import your models
from apps.users.models import User, UserFavorite
from apps.practitioners.models import Practitioner
from apps.services.models import Service, ServiceCategory, ServiceSession
from apps.bookings.models import Booking
from apps.reviews.models import Review, ReviewQuestion, ReviewAnswer
from apps.payments.models import Order, CreditTransaction, PaymentMethod

# Fix for django-seed compatibility with newer Django versions
# Patch the timezone_format function to not use is_dst parameter
def patched_timezone_format(value):
    """
    Patch for django-seed's _timezone_format function to work with newer Django versions
    that don't accept the is_dst parameter.
    """
    if timezone.is_aware(value):
        return value
    return timezone.make_aware(value, timezone.get_current_timezone())

# Monkey patch the Faker instance to use our patched timezone function
from django_seed.seeder import Seeder
original_faker = Seeder.faker

def patched_faker(cls, locale=None):
    """Get the original faker but patch date/time methods to use our timezone function"""
    faker_instance = original_faker(locale)
    
    # Store original date_time method
    original_date_time = faker_instance.date_time
    
    # Override date_time to use our patched timezone format
    def patched_date_time(*args, **kwargs):
        dt = original_date_time(*args, **kwargs)
        return patched_timezone_format(dt)
    
    faker_instance.date_time = patched_date_time
    
    # Do the same for other datetime methods if needed
    return faker_instance

# Apply the monkey patch
Seeder.faker = classmethod(patched_faker)

class Command(BaseCommand):
    help = 'Seed database with sample data using django-seed'

    def add_arguments(self, parser):
        parser.add_argument('--users', type=int, default=10, help='Number of users to create')
        parser.add_argument('--practitioners', type=int, default=5, help='Number of practitioners to create')
        parser.add_argument('--services', type=int, default=20, help='Number of services to create')
        parser.add_argument('--bookings', type=int, default=30, help='Number of bookings to create')
        parser.add_argument('--reviews', type=int, default=15, help='Number of reviews to create')
        parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding')

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            self.clear_data()
            self.stdout.write(self.style.SUCCESS('Successfully cleared data'))

        seeder = Seed.seeder()
        
        # Seed users
        self.seed_users(seeder, options['users'])
        
        # Seed practitioners
        self.seed_practitioners(seeder, options['practitioners'])
        
        # Seed service categories
        self.seed_service_categories(seeder)
        
        # Seed services
        self.seed_services(seeder, options['services'])
        
        # Seed bookings
        self.seed_bookings(seeder, options['bookings'])
        
        # Seed reviews
        self.seed_reviews(seeder, options['reviews'])
        
        # Seed payment data
        self.seed_payment_data(seeder)
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded database'))

    def clear_data(self):
        """Clear existing data from the database."""
        # Clear in reverse order of dependencies
        ReviewAnswer.objects.all().delete()
        Review.objects.all().delete()
        Booking.objects.all().delete()
        ServiceSession.objects.all().delete()
        Service.objects.all().delete()
        ServiceCategory.objects.all().delete()
        CreditTransaction.objects.all().delete()
        Order.objects.all().delete()
        PaymentMethod.objects.all().delete()
        UserFavorite.objects.all().delete()
        Practitioner.objects.all().delete()
        User.objects.all().delete()

    def seed_users(self, seeder, count):
        """Seed users."""
        self.stdout.write('Seeding users...')
        
        # Create a superuser for easy admin access
        User = get_user_model()
        if not User.objects.filter(email='admin@example.com').exists():
            User.objects.create_superuser(
                email='admin@example.com',
                password='adminpassword',
                first_name='Admin',
                last_name='User'
            )
            self.stdout.write('Created superuser: admin@example.com / adminpassword')
        
        # Seed regular users
        seeder.add_entity(User, count, {
            'is_staff': False,
            'is_superuser': False,
            'is_active': True,
            'email': lambda x: seeder.faker.email(),
            'first_name': lambda x: seeder.faker.first_name(),
            'last_name': lambda x: seeder.faker.last_name(),
        })
        
        inserted_users = seeder.execute()
        self.stdout.write(f'Created {count} users')
        return inserted_users

    def seed_practitioners(self, seeder, count):
        """Seed practitioners."""
        self.stdout.write('Seeding practitioners...')
        
        # Get some users to convert to practitioners
        users = User.objects.filter(is_staff=False)[:count]
        
        for user in users:
            # Create practitioner profile for user
            seeder.add_entity(Practitioner, 1, {
                'user': user,
                'display_name': lambda x: f"Dr. {user.first_name} {user.last_name}",
                'bio': lambda x: seeder.faker.paragraph(),
                'years_of_experience': lambda x: seeder.faker.random_int(min=1, max=20),
                'practitioner_status': 'active',
                'is_verified': True,
                'average_rating': lambda x: seeder.faker.pydecimal(left_digits=1, right_digits=1, positive=True, min_value=3, max_value=5),
                'rating_count': lambda x: seeder.faker.random_int(min=5, max=50),
            })
        
        inserted_practitioners = seeder.execute()
        self.stdout.write(f'Created {count} practitioners')
        return inserted_practitioners

    def seed_service_categories(self, seeder):
        """Seed service categories."""
        self.stdout.write('Seeding service categories...')
        
        # Create parent categories
        categories = [
            {'name': 'Therapy', 'description': 'Mental health services'},
            {'name': 'Coaching', 'description': 'Personal and professional coaching'},
            {'name': 'Wellness', 'description': 'General wellness services'},
            {'name': 'Alternative Medicine', 'description': 'Alternative healing practices'},
        ]
        
        parent_categories = []
        for category_data in categories:
            category, created = ServiceCategory.objects.get_or_create(
                name=category_data['name'],
                defaults={
                    'description': category_data['description'],
                    'is_active': True,
                }
            )
            parent_categories.append(category)
            
            # Create child categories for each parent
            for i in range(2):
                child_name = f"{category_data['name']} Specialty {i+1}"
                ServiceCategory.objects.get_or_create(
                    name=child_name,
                    defaults={
                        'parent': category,
                        'description': f"Specialized {category_data['name'].lower()} services",
                        'is_active': True,
                    }
                )
        
        self.stdout.write(f'Created {len(categories)} parent categories and {len(categories) * 2} child categories')
        return parent_categories

    def seed_services(self, seeder, count):
        """Seed services."""
        self.stdout.write('Seeding services...')
        
        practitioners = Practitioner.objects.all()
        categories = ServiceCategory.objects.all()
        
        if not practitioners.exists() or not categories.exists():
            self.stdout.write(self.style.WARNING('No practitioners or categories found. Skipping services.'))
            return []
        
        service_types = ['session', 'workshop', 'package', 'course']
        
        for i in range(count):
            practitioner = practitioners[i % practitioners.count()]
            category = categories[i % categories.count()]
            service_type = service_types[i % len(service_types)]
            
            seeder.add_entity(Service, 1, {
                'name': lambda x: f"{seeder.faker.word().capitalize()} {service_type.capitalize()}",
                'description': lambda x: seeder.faker.paragraph(),
                'price': lambda x: seeder.faker.pydecimal(left_digits=2, right_digits=2, positive=True, min_value=50, max_value=200),
                'duration': lambda x: seeder.faker.random_int(min=30, max=120),
                'practitioner': practitioner,
                'category': category,
                'is_active': True,
                'is_featured': lambda x: seeder.faker.boolean(chance_of_getting_true=25),
                'service_type': service_type,
            })
        
        inserted_services = seeder.execute()
        self.stdout.write(f'Created {count} services')
        
        # Create service sessions for workshops and courses
        self.seed_service_sessions(seeder)
        
        return inserted_services

    def seed_service_sessions(self, seeder):
        """Seed service sessions for workshops and courses."""
        self.stdout.write('Seeding service sessions...')
        
        # Get workshop and course services
        group_services = Service.objects.filter(service_type__in=['workshop', 'course'])
        
        session_count = 0
        for service in group_services:
            # Create 1 session for workshops, 3-5 for courses
            num_sessions = 1 if service.service_type == 'workshop' else seeder.faker.random_int(min=3, max=5)
            
            for i in range(num_sessions):
                # Start date in the future
                start_date = seeder.faker.future_datetime(end_date='+30d')
                
                seeder.add_entity(ServiceSession, 1, {
                    'service': service,
                    'start_time': start_date,
                    'end_time': lambda x: start_date.replace(hour=start_date.hour + 1),
                    'max_participants': lambda x: seeder.faker.random_int(min=5, max=20),
                    'current_participants': 0,
                    'status': 'scheduled',
                    'location_details': lambda x: seeder.faker.address(),
                })
                session_count += 1
        
        seeder.execute()
        self.stdout.write(f'Created {session_count} service sessions')

    def seed_bookings(self, seeder, count):
        """Seed bookings."""
        self.stdout.write('Seeding bookings...')
        
        users = User.objects.filter(is_staff=False)
        services = Service.objects.all()
        
        if not users.exists() or not services.exists():
            self.stdout.write(self.style.WARNING('No users or services found. Skipping bookings.'))
            return []
        
        statuses = ['confirmed', 'completed', 'cancelled', 'pending']
        
        for i in range(count):
            user = users[i % users.count()]
            service = services[i % services.count()]
            practitioner = service.practitioner
            status = statuses[i % len(statuses)]
            
            # Booking date in the past for completed, future for others
            if status == 'completed':
                booking_date = seeder.faker.past_datetime(start_date='-30d')
            else:
                booking_date = seeder.faker.future_datetime(end_date='+30d')
            
            seeder.add_entity(Booking, 1, {
                'user': user,
                'service': service,
                'practitioner': practitioner,
                'booking_date': booking_date,
                'status': status,
                'duration': service.duration,
                'price': service.price,
                'notes': lambda x: seeder.faker.paragraph() if seeder.faker.boolean(chance_of_getting_true=30) else '',
            })
        
        inserted_bookings = seeder.execute()
        self.stdout.write(f'Created {count} bookings')
        return inserted_bookings

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
        """Create answers for each review."""
        reviews = Review.objects.all()
        questions = ReviewQuestion.objects.all()
        
        for review in reviews:
            for question in questions:
                # Skip questions that don't apply to this review
                if question.applies_to == 'practitioner' and not review.practitioner:
                    continue
                if question.applies_to == 'service' and not review.service:
                    continue
                
                # Create appropriate answer based on question type
                if question.question_type == 'rating':
                    rating = seeder.faker.random_int(min=3, max=5)
                    ReviewAnswer.objects.create(
                        review=review,
                        question=question,
                        rating_answer=rating
                    )
                elif question.question_type == 'boolean':
                    ReviewAnswer.objects.create(
                        review=review,
                        question=question,
                        boolean_answer=seeder.faker.boolean(chance_of_getting_true=80)
                    )
                elif question.question_type == 'text':
                    if seeder.faker.boolean(chance_of_getting_true=70):
                        ReviewAnswer.objects.create(
                            review=review,
                            question=question,
                            text_answer=seeder.faker.paragraph()
                        )

    def seed_payment_data(self, seeder):
        """Seed payment data."""
        self.stdout.write('Seeding payment data...')
        
        # Create orders for completed and confirmed bookings
        bookings = Booking.objects.filter(status__in=['completed', 'confirmed'])
        
        if not bookings.exists():
            self.stdout.write(self.style.WARNING('No suitable bookings found. Skipping payment data.'))
            return
        
        order_count = 0
        for booking in bookings:
            # Create order
            order_status = 'completed' if booking.status == 'completed' else 'pending'
            
            seeder.add_entity(Order, 1, {
                'user': booking.user,
                'method': 'credit_card',
                'amount': booking.price,
                'status': order_status,
                'created_at': booking.booking_date - timezone.timedelta(days=1),
                'service': booking.service,
                'practitioner': booking.practitioner,
                'order_type': 'booking',
            })
            order_count += 1
        
        inserted_orders = seeder.execute()
        self.stdout.write(f'Created {order_count} orders')
        
        # Create payment methods for users
        self.seed_payment_methods(seeder)
        
        # Create credit transactions
        self.seed_credit_transactions(seeder)
        
        return inserted_orders

    def seed_payment_methods(self, seeder):
        """Seed payment methods for users."""
        users = User.objects.filter(is_staff=False)
        
        payment_method_count = 0
        for user in users:
            # Add 1-2 payment methods per user
            num_methods = seeder.faker.random_int(min=1, max=2)
            
            for i in range(num_methods):
                is_default = (i == 0)  # First one is default
                
                seeder.add_entity(PaymentMethod, 1, {
                    'user': user,
                    'created_at': seeder.faker.past_datetime(start_date='-60d'),
                    'stripe_payment_id': lambda x: f"pm_{seeder.faker.uuid4()}",
                    'brand': lambda x: seeder.faker.random_element(elements=('visa', 'mastercard', 'amex')),
                    'last4': lambda x: seeder.faker.numerify(text='####'),
                    'exp_month': lambda x: seeder.faker.random_int(min=1, max=12),
                    'exp_year': lambda x: seeder.faker.random_int(min=2025, max=2030),
                    'is_default': is_default,
                    'is_deleted': False,
                })
                payment_method_count += 1
        
        seeder.execute()
        self.stdout.write(f'Created {payment_method_count} payment methods')

    def seed_credit_transactions(self, seeder):
        """Seed credit transactions."""
        orders = Order.objects.filter(status='completed')
        users = User.objects.filter(is_staff=False)
        
        transaction_count = 0
        
        # Create transactions for completed orders
        for order in orders:
            # Create purchase transaction
            seeder.add_entity(CreditTransaction, 1, {
                'user': order.user,
                'amount': order.amount,
                'created_at': order.created_at,
                'service': order.service,
                'practitioner': order.practitioner,
                'order': order,
                'transaction_type': 'purchase',
            })
            transaction_count += 1
            
            # Create consumption transaction
            seeder.add_entity(CreditTransaction, 1, {
                'user': order.user,
                'amount': -order.amount,  # Negative for consumption
                'created_at': order.created_at + timezone.timedelta(days=1),
                'service': order.service,
                'practitioner': order.practitioner,
                'order': order,
                'transaction_type': 'consumption',
            })
            transaction_count += 1
        
        # Add some random credit purchases
        for user in users:
            if seeder.faker.boolean(chance_of_getting_true=50):
                amount = seeder.faker.pydecimal(left_digits=2, right_digits=2, positive=True, min_value=50, max_value=200)
                
                seeder.add_entity(CreditTransaction, 1, {
                    'user': user,
                    'amount': amount,
                    'created_at': seeder.faker.past_datetime(start_date='-30d'),
                    'transaction_type': 'purchase',
                })
                transaction_count += 1
        
        seeder.execute()
        self.stdout.write(f'Created {transaction_count} credit transactions')
