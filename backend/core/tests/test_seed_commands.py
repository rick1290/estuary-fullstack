from django.test import TestCase
from django.core.management import call_command
from django.db import connection
from io import StringIO

from users.models import User
from practitioners.models import Practitioner
from services.models import Service
from bookings.models import Booking
from payments.models import Order


class SeedCommandsTestCase(TestCase):
    """Test the database seeding management commands"""

    def test_seed_db_command(self):
        """Test that seed_db command creates expected data"""
        out = StringIO()
        call_command('seed_db', '--users=5', '--practitioners=3', stdout=out)
        
        # Check that data was created
        self.assertGreaterEqual(User.objects.count(), 5)
        self.assertGreaterEqual(Practitioner.objects.count(), 3)
        self.assertGreater(Service.objects.count(), 0)
        self.assertIn('Database seeded successfully', out.getvalue())

    def test_clear_db_command(self):
        """Test that clear_db command removes all data"""
        # First seed some data
        call_command('seed_db', '--users=5', '--practitioners=3', stdout=StringIO())
        
        # Verify data exists
        self.assertGreater(User.objects.count(), 0)
        
        # Clear the database
        out = StringIO()
        call_command('clear_db', '--yes', stdout=out)
        
        # Check that data was cleared (except system data)
        # Note: Some models like ContentType might remain
        self.assertEqual(User.objects.filter(is_practitioner=False).count(), 0)
        self.assertEqual(Practitioner.objects.count(), 0)
        self.assertEqual(Service.objects.count(), 0)
        self.assertEqual(Booking.objects.count(), 0)
        self.assertIn('Database cleared successfully', out.getvalue())

    def test_reset_db_command(self):
        """Test that reset_db command clears and reseeds"""
        # Create some initial data
        User.objects.create_user(email='old@example.com', password='test')
        
        # Run reset command
        out = StringIO()
        call_command('reset_db', '--yes', '--users=5', '--practitioners=3', stdout=out)
        
        # Check that old data is gone
        self.assertFalse(User.objects.filter(email='old@example.com').exists())
        
        # Check that new data was created
        self.assertGreaterEqual(User.objects.count(), 5)
        self.assertGreaterEqual(Practitioner.objects.count(), 3)
        self.assertIn('Database reset complete', out.getvalue())

    def test_seed_creates_relationships(self):
        """Test that seeding creates proper relationships between models"""
        call_command('seed_db', '--users=5', '--practitioners=3', stdout=StringIO())
        
        # Check practitioners have services
        for practitioner in Practitioner.objects.all():
            self.assertGreater(practitioner.primary_services.count(), 0)
        
        # Check some bookings exist
        self.assertGreater(Booking.objects.count(), 0)
        
        # Check bookings have proper relationships
        for booking in Booking.objects.all()[:5]:
            self.assertIsNotNone(booking.user)
            self.assertIsNotNone(booking.practitioner)
            self.assertIsNotNone(booking.service)

    def test_seed_idempotency_for_base_data(self):
        """Test that base data seeding is idempotent"""
        # Run seed twice
        call_command('seed_db', '--users=5', '--practitioners=3', stdout=StringIO())
        
        # Count base data
        from locations.models import Country
        from common.models import Modality
        from services.models import ServiceType
        
        countries_count = Country.objects.count()
        modalities_count = Modality.objects.count()
        service_types_count = ServiceType.objects.count()
        
        # Run seed again
        call_command('seed_db', '--users=5', '--practitioners=3', stdout=StringIO())
        
        # Base data should not be duplicated
        self.assertEqual(Country.objects.count(), countries_count)
        self.assertEqual(Modality.objects.count(), modalities_count)
        self.assertEqual(ServiceType.objects.count(), service_types_count)

    def test_wait_for_db_command(self):
        """Test wait_for_db command"""
        out = StringIO()
        # Should succeed immediately in test environment
        call_command('wait_for_db', '--timeout=5', stdout=out)
        self.assertIn('Database available', out.getvalue())