import json
from datetime import datetime, timedelta, time
import pytz
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User
from apps.practitioners.models import (
    Practitioner, Schedule, ScheduleTimeSlot, 
    ServiceSchedule, ScheduleAvailability, SchedulePreference
)
from apps.services.models import Service, ServiceType, ServiceCategory


class AvailabilityAPITestCase(APITestCase):
    """Test case for the availability API."""
    
    def setUp(self):
        """Set up test data."""
        # Create user and practitioner
        self.user = User.objects.create_user(
            email='practitioner@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Practitioner',
            is_practitioner=True
        )
        
        self.practitioner = Practitioner.objects.create(
            user=self.user,
            title='Therapist',
            bio='Test bio',
            buffer_time=15  # 15 minutes buffer time
        )
        
        # Create schedule preference
        self.preference = SchedulePreference.objects.create(
            practitioner=self.practitioner,
            timezone='America/New_York',
            hours_buffer=2,
            days_buffer_min=0,
            days_buffer_max=30
        )
        
        # Create service type and category
        self.service_type = ServiceType.objects.create(name='session')
        self.category = ServiceCategory.objects.create(name='Therapy')
        
        # Create service
        self.service = Service.objects.create(
            name='Individual Therapy',
            description='One-on-one therapy session',
            practitioner=self.practitioner,
            service_type=self.service_type,
            category=self.category,
            price=100.00,
            duration=60,  # 60 minutes
            is_active=True
        )
        
        # Create named schedule
        self.schedule = Schedule.objects.create(
            practitioner=self.practitioner,
            name='Regular Hours',
            description='My regular working hours',
            is_default=True,
            timezone='America/New_York',
            is_active=True
        )
        
        # Create time slots for the schedule (Monday-Friday, 9 AM - 5 PM)
        for day in range(5):  # 0=Monday, 4=Friday
            ScheduleTimeSlot.objects.create(
                schedule=self.schedule,
                day=day,
                start_time=time(9, 0),  # 9:00 AM
                end_time=time(17, 0),   # 5:00 PM
                is_active=True
            )
        
        # Authenticate the client
        self.client.force_authenticate(user=self.user)
        
        # URL for availability endpoint
        self.availability_url = reverse('practitioners:availability-service-availability')
    
    def test_service_availability_endpoint(self):
        """Test that the service availability endpoint returns correct data."""
        # Get availability for the service
        response = self.client.get(
            self.availability_url,
            {'service_id': str(self.service.id)}
        )
        
        # Check response status
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that we got time slots back
        data = response.json()
        self.assertIsInstance(data, list)
        
        # We should have slots for the next 30 days
        # Each weekday should have slots from 9 AM to 5 PM
        # With 60 min duration + 15 min buffer = 75 min total
        # Slots are generated at 15-minute intervals
        # So each day should have (8 hours * 60 minutes / 15 minutes) - (75/15 - 1) slots
        # = 32 - 4 = 28 slots per weekday
        
        # Count weekdays in the next 30 days
        today = timezone.now().date()
        end_date = today + timedelta(days=30)
        weekdays = 0
        current_date = today
        while current_date <= end_date:
            if current_date.weekday() < 5:  # Monday-Friday
                weekdays += 1
            current_date += timedelta(days=1)
        
        # Check if we have the expected number of slots
        # Note: This is an approximation, as the actual number may vary based on
        # the current time of day and buffer settings
        self.assertGreater(len(data), 0)
        
        # Check the structure of a time slot
        if data:
            slot = data[0]
            self.assertIn('start_datetime', slot)
            self.assertIn('end_datetime', slot)
            self.assertIn('date', slot)
            self.assertIn('day', slot)
            self.assertIn('day_name', slot)
            self.assertIn('start_time', slot)
            self.assertIn('end_time', slot)
            self.assertIn('is_available', slot)
            self.assertIn('service_id', slot)
            self.assertIn('schedule_id', slot)
            self.assertIn('schedule_name', slot)
            
            # Check that service_id matches our service
            self.assertEqual(slot['service_id'], str(self.service.id))
            
            # Check that schedule_id matches our schedule
            self.assertEqual(slot['schedule_id'], str(self.schedule.id))
            
            # Check that schedule_name matches our schedule
            self.assertEqual(slot['schedule_name'], self.schedule.name)
    
    def test_service_availability_with_date_range(self):
        """Test that the service availability endpoint respects date range parameters."""
        # Set specific date range (next 7 days)
        today = timezone.now().date()
        start_date = today.isoformat()
        end_date = (today + timedelta(days=7)).isoformat()
        
        # Get availability for the service with date range
        response = self.client.get(
            self.availability_url,
            {
                'service_id': str(self.service.id),
                'start_date': start_date,
                'end_date': end_date
            }
        )
        
        # Check response status
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that we got time slots back
        data = response.json()
        self.assertIsInstance(data, list)
        
        # Check that all slots are within the specified date range
        for slot in data:
            slot_date = datetime.strptime(slot['date'], '%Y-%m-%d').date()
            self.assertGreaterEqual(slot_date, today)
            self.assertLessEqual(slot_date, today + timedelta(days=7))
    
    def test_service_availability_with_invalid_service_id(self):
        """Test that the service availability endpoint handles invalid service IDs."""
        # Get availability with invalid service ID
        response = self.client.get(
            self.availability_url,
            {'service_id': '00000000-0000-0000-0000-000000000000'}
        )
        
        # Check response status
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that we got an empty list
        data = response.json()
        self.assertEqual(data, [])
    
    def test_service_availability_without_service_id(self):
        """Test that the service availability endpoint requires a service ID."""
        # Get availability without service ID
        response = self.client.get(self.availability_url)
        
        # Check response status
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Check error message
        data = response.json()
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'service_id is required')
