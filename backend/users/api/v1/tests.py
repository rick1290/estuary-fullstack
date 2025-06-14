"""
Test cases for authentication API endpoints
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class AuthenticationAPITestCase(APITestCase):
    """Test cases for authentication endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/v1/drf/auth/register/'
        self.login_url = '/api/v1/drf/auth/login/'
        self.logout_url = '/api/v1/drf/auth/logout/'
        self.refresh_url = '/api/v1/drf/auth/token/refresh/'
        self.me_url = '/api/v1/drf/auth/me/'
        self.change_password_url = '/api/v1/drf/auth/change-password/'
        
        # Test user data
        self.user_data = {
            'email': 'test@example.com',
            'password': 'testpass123!',
            'password_confirm': 'testpass123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        
        self.login_data = {
            'email': 'test@example.com',
            'password': 'testpass123!'
        }
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        response = self.client.post(self.register_url, self.user_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access_token', response.data)
        self.assertIn('refresh_token', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['token_type'], 'bearer')
        
        # Verify user was created
        user = User.objects.get(email=self.user_data['email'])
        self.assertEqual(user.first_name, self.user_data['first_name'])
        self.assertEqual(user.last_name, self.user_data['last_name'])
    
    def test_user_login(self):
        """Test user login endpoint"""
        # Create user first
        User.objects.create_user(
            email=self.login_data['email'],
            password=self.login_data['password'],
            first_name='Test',
            last_name='User'
        )
        
        response = self.client.post(self.login_url, self.login_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', response.data)
        self.assertIn('refresh_token', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['token_type'], 'bearer')
    
    def test_get_current_user(self):
        """Test getting current user profile"""
        # Create and authenticate user
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123!',
            first_name='Test',
            last_name='User'
        )
        
        # Get tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Set authorization header
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)
        self.assertEqual(response.data['first_name'], user.first_name)
        self.assertEqual(response.data['last_name'], user.last_name)
    
    def test_token_refresh(self):
        """Test token refresh endpoint"""
        # Create user
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123!',
            first_name='Test',
            last_name='User'
        )
        
        # Get refresh token
        refresh = RefreshToken.for_user(user)
        refresh_token = str(refresh)
        
        response = self.client.post(self.refresh_url, {
            'refresh': refresh_token
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
    
    def test_logout(self):
        """Test logout endpoint"""
        # Create and authenticate user
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123!',
            first_name='Test',
            last_name='User'
        )
        
        # Get tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Set authorization header
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        response = self.client.post(self.logout_url, {
            'refresh_token': refresh_token
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Logged out successfully')
    
    def test_change_password(self):
        """Test change password endpoint"""
        # Create and authenticate user
        user = User.objects.create_user(
            email='test@example.com',
            password='oldpass123!',
            first_name='Test',
            last_name='User'
        )
        
        # Get tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Set authorization header
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        password_data = {
            'current_password': 'oldpass123!',
            'new_password': 'newpass123!',
            'new_password_confirm': 'newpass123!'
        }
        
        response = self.client.post(self.change_password_url, password_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Password changed successfully')
        
        # Verify password was changed
        user.refresh_from_db()
        self.assertTrue(user.check_password('newpass123!'))
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = self.client.post(self.login_url, {
            'email': 'nonexistent@example.com',
            'password': 'wrongpass'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)