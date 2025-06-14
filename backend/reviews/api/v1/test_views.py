"""
Tests for Review API endpoints
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from reviews.models import Review, ReviewQuestion, ReviewVote, ReviewReport
from practitioners.models import Practitioner
from services.models import Service
from bookings.models import Booking

User = get_user_model()


class ReviewAPITestCase(TestCase):
    """Test case for review API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create test users
        self.user = User.objects.create_user(
            email='client@example.com',
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
        self.other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            first_name='Bob',
            last_name='Johnson'
        )
        
        # Create practitioner
        self.practitioner = Practitioner.objects.create(
            user=self.practitioner_user,
            display_name='Jane Smith',
            professional_title='Therapist',
            is_verified=True,
            practitioner_status='active'
        )
        
        # Create service
        self.service = Service.objects.create(
            name='Therapy Session',
            description='One hour therapy session',
            duration_minutes=60,
            price=Decimal('100.00'),
            service_type='session'
        )
        
        # Create completed booking
        self.booking = Booking.objects.create(
            user=self.user,
            practitioner=self.practitioner,
            service=self.service,
            start_time=datetime.now() - timedelta(days=1),
            end_time=datetime.now() - timedelta(days=1, hours=-1),
            status='completed',
            payment_status='paid',
            amount=Decimal('100.00')
        )
        
        # Create review questions
        self.question1 = ReviewQuestion.objects.create(
            question='How was your overall experience?',
            question_type='rating',
            order=1,
            applies_to='both'
        )
        self.question2 = ReviewQuestion.objects.create(
            question='Any additional comments?',
            question_type='text',
            order=2,
            applies_to='both',
            is_required=False
        )
        
        # API endpoints
        self.list_url = '/api/v1/drf/reviews/'
        self.questions_url = '/api/v1/drf/reviews/review-questions/'
    
    def test_list_reviews(self):
        """Test listing reviews"""
        # Create a review
        review = Review.objects.create(
            user=self.user,
            practitioner=self.practitioner,
            service=self.service,
            booking=self.booking,
            rating=Decimal('4.5'),
            comment='Great session!'
        )
        
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['rating'], '4.50')
    
    def test_create_review(self):
        """Test creating a review"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'booking_uuid': str(self.booking.public_uuid),
            'rating': '5.0',
            'comment': 'Excellent service!',
            'answers': [
                {
                    'question_id': self.question1.id,
                    'rating_answer': 5
                },
                {
                    'question_id': self.question2.id,
                    'text_answer': 'Very professional and helpful'
                }
            ]
        }
        
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify review was created
        review = Review.objects.get(booking=self.booking)
        self.assertEqual(review.rating, Decimal('5.0'))
        self.assertEqual(review.comment, 'Excellent service!')
        self.assertEqual(review.answers.count(), 2)
    
    def test_cannot_review_without_booking(self):
        """Test that users cannot review without a completed booking"""
        self.client.force_authenticate(user=self.other_user)
        
        data = {
            'practitioner_uuid': str(self.practitioner.public_uuid),
            'service_uuid': str(self.service.public_uuid),
            'rating': '5.0',
            'comment': 'Great!'
        }
        
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_cannot_review_twice(self):
        """Test that users cannot review the same booking twice"""
        self.client.force_authenticate(user=self.user)
        
        # Create first review
        Review.objects.create(
            user=self.user,
            practitioner=self.practitioner,
            service=self.service,
            booking=self.booking,
            rating=Decimal('4.0'),
            comment='Good'
        )
        
        # Try to create second review
        data = {
            'booking_uuid': str(self.booking.public_uuid),
            'rating': '5.0',
            'comment': 'Even better!'
        }
        
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_practitioner_response(self):
        """Test practitioner can respond to reviews"""
        # Create review
        review = Review.objects.create(
            user=self.user,
            practitioner=self.practitioner,
            service=self.service,
            booking=self.booking,
            rating=Decimal('4.0'),
            comment='Good session'
        )
        
        # Authenticate as practitioner
        self.client.force_authenticate(user=self.practitioner_user)
        
        response_url = f'{self.list_url}{review.public_uuid}/respond/'
        data = {
            'response_text': 'Thank you for your feedback!'
        }
        
        response = self.client.post(response_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify response was saved
        review.refresh_from_db()
        self.assertEqual(review.response_text, 'Thank you for your feedback!')
        self.assertIsNotNone(review.response_date)
    
    def test_vote_review(self):
        """Test voting on reviews"""
        # Create review
        review = Review.objects.create(
            user=self.user,
            practitioner=self.practitioner,
            service=self.service,
            booking=self.booking,
            rating=Decimal('5.0'),
            comment='Amazing!'
        )
        
        # Authenticate as another user
        self.client.force_authenticate(user=self.other_user)
        
        vote_url = f'{self.list_url}{review.public_uuid}/vote/'
        data = {'is_helpful': True}
        
        response = self.client.post(vote_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify vote was created
        self.assertTrue(
            ReviewVote.objects.filter(
                review=review,
                user=self.other_user,
                is_helpful=True
            ).exists()
        )
        
        # Verify vote count updated
        review.refresh_from_db()
        self.assertEqual(review.helpful_votes, 1)
    
    def test_report_review(self):
        """Test reporting inappropriate reviews"""
        # Create review
        review = Review.objects.create(
            user=self.user,
            practitioner=self.practitioner,
            service=self.service,
            booking=self.booking,
            rating=Decimal('1.0'),
            comment='Terrible!'
        )
        
        # Authenticate as another user
        self.client.force_authenticate(user=self.other_user)
        
        report_url = f'{self.list_url}{review.public_uuid}/report/'
        data = {
            'reason': 'inappropriate',
            'details': 'Contains offensive language'
        }
        
        response = self.client.post(report_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify report was created
        self.assertTrue(
            ReviewReport.objects.filter(
                review=review,
                user=self.other_user,
                reason='inappropriate'
            ).exists()
        )
    
    def test_filter_reviews(self):
        """Test filtering reviews"""
        # Create multiple reviews
        review1 = Review.objects.create(
            user=self.user,
            practitioner=self.practitioner,
            service=self.service,
            rating=Decimal('5.0'),
            comment='Excellent!'
        )
        review2 = Review.objects.create(
            user=self.other_user,
            practitioner=self.practitioner,
            rating=Decimal('3.0'),
            comment='Average'
        )
        
        # Filter by practitioner
        response = self.client.get(
            self.list_url,
            {'practitioner': str(self.practitioner.public_uuid)}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Filter by rating
        response = self.client.get(
            self.list_url,
            {'min_rating': 4}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['rating'], '5.00')
    
    def test_review_statistics(self):
        """Test review statistics endpoint"""
        # Create multiple reviews
        for i in range(5):
            Review.objects.create(
                user=self.user,
                practitioner=self.practitioner,
                rating=Decimal(str(5 - i)),
                comment=f'Review {i}'
            )
        
        stats_url = f'{self.list_url}statistics/'
        response = self.client.get(
            stats_url,
            {'practitioner': str(self.practitioner.public_uuid)}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_reviews'], 5)
        self.assertEqual(response.data['average_rating'], '3.00')
        self.assertEqual(response.data['rating_distribution']['5'], 1)
        self.assertEqual(response.data['rating_distribution']['1'], 1)