"""
Tests for Practitioners API
"""
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from decimal import Decimal
from datetime import date, time, datetime, timedelta
from django.utils import timezone

from practitioners.models import (
    Practitioner, Specialize, Style, Topic,
    Certification, Education, Schedule, ScheduleTimeSlot
)
from services.models import Service, ServiceType, ServiceCategory
from locations.models import PractitionerLocation
from payments.models import PractitionerSubscription

User = get_user_model()


class PractitionerAPITestCase(APITestCase):
    """Base test case with common setup for practitioner tests"""
    
    def setUp(self):
        # Create test users
        self.user = User.objects.create_user(
            email='user@example.com',
            password='testpass123',
            first_name='John',
            last_name='Doe'
        )
        
        self.practitioner_user = User.objects.create_user(
            email='practitioner@example.com',
            password='testpass123',
            first_name='Jane',
            last_name='Smith'
        )
        
        # Create test practitioner
        self.practitioner = Practitioner.objects.create(
            user=self.practitioner_user,
            display_name='Dr. Jane Smith',
            professional_title='Clinical Psychologist',
            bio='Experienced therapist specializing in anxiety and depression.',
            years_of_experience=10,
            is_verified=True,
            practitioner_status='active'
        )
        
        # Create test data
        self.specialization = Specialize.objects.create(content='Anxiety Disorders')
        self.style = Style.objects.create(content='Cognitive Behavioral Therapy')
        self.topic = Topic.objects.create(content='Mental Health')
        
        # Add relationships
        self.practitioner.specializations.add(self.specialization)
        self.practitioner.styles.add(self.style)
        self.practitioner.topics.add(self.topic)
        
        # Create service type and category
        self.service_type = ServiceType.objects.create(
            name='Therapy Session',
            code='session'
        )
        
        self.category = ServiceCategory.objects.create(
            name='Mental Health',
            slug='mental-health'
        )
        
        # Create a service
        self.service = Service.objects.create(
            name='Individual Therapy Session',
            description='One-on-one therapy session',
            price_cents=15000,  # $150.00
            duration_minutes=60,
            service_type=self.service_type,
            category=self.category,
            primary_practitioner=self.practitioner,
            is_active=True,
            is_public=True
        )


class PractitionerListTestCase(PractitionerAPITestCase):
    """Test practitioner listing and search"""
    
    def test_list_practitioners(self):
        """Test listing all active practitioners"""
        url = reverse('practitioner-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        practitioner_data = response.data['results'][0]
        self.assertEqual(practitioner_data['display_name'], 'Dr. Jane Smith')
        self.assertEqual(practitioner_data['professional_title'], 'Clinical Psychologist')
        self.assertTrue(practitioner_data['is_verified'])
    
    def test_filter_by_specialization(self):
        """Test filtering practitioners by specialization"""
        url = reverse('practitioner-list')
        response = self.client.get(url, {'specialization': self.specialization.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_filter_by_service_type(self):
        """Test filtering practitioners by service type"""
        url = reverse('practitioner-list')
        response = self.client.get(url, {'service_type': self.service_type.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_search_practitioners(self):
        """Test searching practitioners"""
        url = reverse('practitioner-search')
        response = self.client.get(url, {'search': 'Jane'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_inactive_practitioners_not_listed(self):
        """Test that inactive practitioners are not listed"""
        # Create inactive practitioner
        inactive_user = User.objects.create_user(
            email='inactive@example.com',
            password='testpass123'
        )
        Practitioner.objects.create(
            user=inactive_user,
            practitioner_status='inactive',
            is_verified=True
        )
        
        url = reverse('practitioner-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)  # Only active practitioner


class PractitionerDetailTestCase(PractitionerAPITestCase):
    """Test practitioner profile retrieval"""
    
    def test_get_public_profile(self):
        """Test getting public practitioner profile"""
        url = reverse('practitioner-detail', kwargs={'pk': self.practitioner.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'Dr. Jane Smith')
        self.assertIn('specializations', response.data)
        self.assertNotIn('email', response.data)  # Private field
    
    def test_get_own_profile(self):
        """Test practitioner getting their own profile"""
        self.client.force_authenticate(user=self.practitioner_user)
        url = reverse('practitioner-my-profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['display_name'], 'Dr. Jane Smith')
        self.assertIn('email', response.data)  # Private field included
        self.assertIn('practitioner_status', response.data)


class PractitionerApplicationTestCase(PractitionerAPITestCase):
    """Test practitioner application process"""
    
    def test_apply_to_become_practitioner(self):
        """Test applying to become a practitioner"""
        new_user = User.objects.create_user(
            email='newpractitioner@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=new_user)
        
        url = reverse('practitioner-apply')
        data = {
            'display_name': 'Dr. New Practitioner',
            'professional_title': 'Therapist',
            'bio': 'New therapist looking to join the platform',
            'years_of_experience': 5
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['display_name'], 'Dr. New Practitioner')
        self.assertEqual(response.data['practitioner_status'], 'pending')
        
        # Verify practitioner was created
        self.assertTrue(
            Practitioner.objects.filter(user=new_user).exists()
        )
    
    def test_cannot_apply_twice(self):
        """Test that users cannot apply to be practitioners twice"""
        self.client.force_authenticate(user=self.practitioner_user)
        
        url = reverse('practitioner-apply')
        data = {
            'display_name': 'Another Profile',
            'professional_title': 'Therapist',
            'bio': 'Trying to create another profile',
            'years_of_experience': 5
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PractitionerUpdateTestCase(PractitionerAPITestCase):
    """Test practitioner profile updates"""
    
    def test_update_own_profile(self):
        """Test updating own practitioner profile"""
        self.client.force_authenticate(user=self.practitioner_user)
        
        url = reverse('practitioner-detail', kwargs={'pk': self.practitioner.id})
        data = {
            'bio': 'Updated bio with more experience',
            'years_of_experience': 12
        }
        
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.practitioner.refresh_from_db()
        self.assertEqual(self.practitioner.bio, 'Updated bio with more experience')
        self.assertEqual(self.practitioner.years_of_experience, 12)
    
    def test_cannot_update_others_profile(self):
        """Test that practitioners cannot update others' profiles"""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('practitioner-detail', kwargs={'pk': self.practitioner.id})
        data = {
            'bio': 'Trying to update someone else\'s profile'
        }
        
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_specializations(self):
        """Test updating practitioner specializations"""
        self.client.force_authenticate(user=self.practitioner_user)
        
        new_specialization = Specialize.objects.create(content='Depression')
        
        url = reverse('practitioner-detail', kwargs={'pk': self.practitioner.id})
        data = {
            'specialization_ids': [self.specialization.id, new_specialization.id]
        }
        
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.practitioner.specializations.count(), 2)


class ScheduleTestCase(PractitionerAPITestCase):
    """Test schedule management"""
    
    def test_create_schedule(self):
        """Test creating a new schedule"""
        self.client.force_authenticate(user=self.practitioner_user)
        
        url = reverse('schedule-list')
        data = {
            'name': 'Regular Hours',
            'description': 'My regular working hours',
            'timezone': 'America/New_York',
            'is_default': True,
            'time_slots': [
                {
                    'day': 1,  # Tuesday
                    'start_time': '09:00',
                    'end_time': '17:00'
                },
                {
                    'day': 3,  # Thursday
                    'start_time': '09:00',
                    'end_time': '17:00'
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Regular Hours')
        
        # Verify schedule was created with time slots
        schedule = Schedule.objects.get(id=response.data['id'])
        self.assertEqual(schedule.time_slots.count(), 2)
    
    def test_list_own_schedules(self):
        """Test listing own schedules"""
        self.client.force_authenticate(user=self.practitioner_user)
        
        # Create a schedule
        schedule = Schedule.objects.create(
            name='Test Schedule',
            practitioner=self.practitioner
        )
        
        url = reverse('schedule-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Test Schedule')
    
    def test_set_default_schedule(self):
        """Test setting a schedule as default"""
        self.client.force_authenticate(user=self.practitioner_user)
        
        # Create two schedules
        schedule1 = Schedule.objects.create(
            name='Schedule 1',
            practitioner=self.practitioner,
            is_default=True
        )
        schedule2 = Schedule.objects.create(
            name='Schedule 2',
            practitioner=self.practitioner,
            is_default=False
        )
        
        # Set schedule2 as default
        url = reverse('schedule-set-default', kwargs={'pk': schedule2.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify default status
        schedule1.refresh_from_db()
        schedule2.refresh_from_db()
        self.assertFalse(schedule1.is_default)
        self.assertTrue(schedule2.is_default)


class AvailabilityTestCase(PractitionerAPITestCase):
    """Test availability checking"""
    
    def setUp(self):
        super().setUp()
        
        # Create a schedule with time slots
        self.schedule = Schedule.objects.create(
            name='Test Schedule',
            practitioner=self.practitioner,
            is_default=True
        )
        
        # Add Monday 9 AM - 5 PM
        ScheduleTimeSlot.objects.create(
            schedule=self.schedule,
            day=0,  # Monday
            start_time=time(9, 0),
            end_time=time(17, 0)
        )
    
    def test_check_availability(self):
        """Test checking practitioner availability"""
        # Get next Monday
        today = timezone.now().date()
        days_ahead = 7 - today.weekday()  # Monday is 0
        next_monday = today + timedelta(days=days_ahead)
        
        url = reverse('availability-check')
        params = {
            'practitioner_id': self.practitioner.id,
            'start_date': next_monday.isoformat(),
            'end_date': next_monday.isoformat(),
            'timezone': 'UTC'
        }
        
        response = self.client.get(url, params)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('available_slots', response.data)
        self.assertEqual(response.data['practitioner_id'], self.practitioner.id)
    
    def test_check_slot_availability(self):
        """Test checking if a specific slot is available"""
        next_monday = timezone.now().date() + timedelta(days=7)
        
        url = reverse('availability-check-slot')
        data = {
            'practitioner_id': self.practitioner.id,
            'service_id': self.service.id,
            'date': next_monday.isoformat(),
            'start_time': '10:00',
            'duration_minutes': 60,
            'timezone': 'UTC'
        }
        
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('available', response.data)
        self.assertIn('message', response.data)